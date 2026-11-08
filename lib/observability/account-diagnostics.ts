import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export type AccountOperation = "account.data.get" | "account.data.post" | "account.me.get";
export type AccountStage =
  | "rate_limit.ip"
  | "rate_limit.account"
  | "rate_limit.consume"
  | "rate_limit.cleanup"
  | "session.read"
  | "account.read"
  | "account.owner"
  | "account.snapshot_version"
  | "account.tasks"
  | "account.pendings"
  | "account.preferences"
  | "account.write"
  | "request.parse";

type FailureStage = {
  path: readonly AccountStage[];
  scopes: readonly symbol[];
  durationMs: number;
};
type DiagnosticRequest = {
  id: string;
  operation: AccountOperation;
  startedAt: number;
  failures: Map<unknown, FailureStage>;
};
type Scope = {
  request: DiagnosticRequest;
  path: readonly AccountStage[];
  scopes: readonly symbol[];
};
const storage = new AsyncLocalStorage<Scope>();
const MAX_ERROR_NODES = 8;
const MAX_STAGE_FAILURES = 32;

// Explicit codes only: even an error's name/code/message can contain user data.
const SAFE_CODES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "22001",
  "22003",
  "22007",
  "22008",
  "22P02",
  "23502",
  "23503",
  "23505",
  "23514",
  "25006",
  "25P02",
  "28P01",
  "28000",
  "40001",
  "40P01",
  "42501",
  "42601",
  "42703",
  "42804",
  "42883",
  "42P01",
  "42P10",
  "53000",
  "53100",
  "53200",
  "53300",
  "53400",
  "54000",
  "55P03",
  "57014",
  "57P01",
  "57P02",
  "57P03",
  "58000",
  "XX000",
  "XX001",
  "XX002",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_SSL_CERTIFICATE_VERIFY_FAILED",
]);
const SAFE_MESSAGES = new Map([
  ["timeout exceeded when trying to connect", "pool_connect_timeout"],
  ["Connection terminated due to connection timeout", "connection_timeout"],
  ["Connection terminated unexpectedly", "connection_terminated"],
  ["Connection terminated", "connection_terminated"],
  ["Cannot use a pool after calling end on the pool", "pool_closed"],
]);

/** Read data properties only; diagnostic extraction must not invoke error getters. */
function field(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  try {
    return Object.getOwnPropertyDescriptor(value, key)?.value;
  } catch {
    return undefined;
  }
}

/** Bounded cause/aggregate traversal. Never serialize raw errors, messages or stacks. */
export function safeErrorSignals(error: unknown): {
  errorKind: string;
  errorCodes: string[];
  errorSignals: string[];
} {
  const errorCodes = new Set<string>();
  const errorSignals = new Set<string>();
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  let errorKind = "non_error";
  for (let visited = 0; queue.length && visited < MAX_ERROR_NODES; visited++) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const code = field(current, "code");
    if (typeof code === "string" && SAFE_CODES.has(code)) errorCodes.add(code);
    const message = field(current, "message");
    if (typeof message === "string") {
      const signal = SAFE_MESSAGES.get(message);
      if (signal) errorSignals.add(signal);
    }
    queue.push(field(current, "cause"));
    const errors = field(current, "errors");
    // An own length is enough to traverse AggregateError arrays without invoking getters.
    const length = field(errors, "length");
    if (typeof length === "number" && Number.isSafeInteger(length) && length >= 0) {
      for (let index = 0; index < Math.min(length, MAX_ERROR_NODES); index++) {
        queue.push(field(errors, String(index)));
      }
    }
  }
  // Never trust error.name (libraries and untrusted throws can override it).
  try {
    if (error instanceof TypeError) errorKind = "TypeError";
    else if (error instanceof RangeError) errorKind = "RangeError";
    else if (error instanceof AggregateError) errorKind = "AggregateError";
    else if (error instanceof Error) errorKind = "Error";
  } catch {
    // Hostile/revoked proxies are unknown, never a reason to break the error response.
    errorKind = "non_error";
  }
  return { errorKind, errorCodes: [...errorCodes], errorSignals: [...errorSignals] };
}

/** New server-owned ID per response; incoming request IDs/headers are never logged. */
export async function withAccountDiagnostics(
  operation: AccountOperation,
  work: () => Promise<Response>,
): Promise<Response> {
  const request: DiagnosticRequest = {
    id: randomUUID(),
    operation,
    startedAt: performance.now(),
    failures: new Map(),
  };
  return storage.run({ request, path: [], scopes: [] }, async () => {
    const response = await work();
    response.headers.set("X-Request-Id", request.id);
    return response;
  });
}

/** Annotates and rethrows unchanged; recovered/retried errors cannot taint later failures. */
export async function accountStage<T>(stage: AccountStage, work: () => Promise<T>): Promise<T> {
  const scope = storage.getStore();
  if (!scope) return work();
  const path = [...scope.path, stage];
  const token = Symbol(stage);
  const scopes = [...scope.scopes, token];
  const startedAt = performance.now();
  return storage.run({ request: scope.request, path, scopes }, async () => {
    try {
      return await work();
    } catch (error) {
      const failures = scope.request.failures;
      const previous = failures.get(error);
      if (!previous?.scopes.includes(token) && (previous || failures.size < MAX_STAGE_FAILURES)) {
        failures.set(error, {
          path,
          scopes,
          durationMs: Math.round(performance.now() - startedAt),
        });
      }
      throw error;
    }
  });
}

/** One JSON event at the HTTP boundary; no per-query or successful-request logging. */
export function logAccountFailure(error: unknown): void {
  const scope = storage.getStore();
  const failure = scope?.request.failures.get(error);
  console.error(
    JSON.stringify({
      level: "error",
      event: "account_request_failed",
      time: new Date().toISOString(),
      requestId: scope?.request.id,
      operation: scope?.request.operation,
      stage: failure?.path.at(-1) ?? "request",
      stagePath: failure?.path ?? [],
      durationMs: scope ? Math.round(performance.now() - scope.request.startedAt) : undefined,
      stageDurationMs: failure?.durationMs,
      ...safeErrorSignals(error),
    }),
  );
}
