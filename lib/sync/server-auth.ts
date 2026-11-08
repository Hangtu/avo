import "server-only";

import { unstable_rethrow } from "next/navigation";
import { auth } from "@/lib/auth";
import { authOrigins } from "@/lib/auth-origins";
import { DomainError } from "@/lib/domain/validation";
import { accountStage, logAccountFailure } from "@/lib/observability/account-diagnostics";
import { ProtocolError } from "./protocol";
import { ACCOUNT_LIMITS, enforceRateLimit, rateLimitIp, RateLimitError } from "@/lib/security/rate-limit";

export class AccountHttpError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
/** Limits even anonymous session probes before hitting the session database. */
export async function accountSession(
  request: Request,
  intent: "probe" | "read" | "write",
): Promise<typeof auth.$Infer.Session> {
  await accountStage("rate_limit.ip", () =>
    enforceRateLimit(`account:ip:${rateLimitIp(request)}`, ACCOUNT_LIMITS.ip),
  );
  const session = await accountStage("session.read", () =>
    auth.api.getSession({
      headers: request.headers,
      query: { disableCookieCache: true },
    }),
  );
  if (!session) throw new AccountHttpError(401, "unauthorized");
  await accountStage("rate_limit.account", () =>
    enforceRateLimit(`account:${intent}:${session.user.id}`, ACCOUNT_LIMITS[intent]),
  );
  return session;
}

export async function verifiedAccount(request: Request, mutation = false): Promise<string> {
  if (mutation) {
    if (
      !authOrigins().includes(request.headers.get("origin") ?? "") ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      throw new AccountHttpError(403, "invalid_origin");
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      throw new AccountHttpError(415, "json_required");
    }
  }
  const session = await accountSession(request, mutation ? "write" : "read");
  // An expected ID prevents an A outbox request being applied under B's cookies.
  if (request.headers.get("x-avo-account") !== session.user.id)
    throw new AccountHttpError(409, "account_changed");
  return session.user.id;
}
export const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, X-Avo-Account, X-Avo-Sync-Version",
};

/** One generic, non-cacheable error boundary for both account routes. */
export function accountFailure(error: unknown): Response {
  // PPR/request-time bailouts are framework control flow, not persistence outages.
  unstable_rethrow(error);
  if (error instanceof RateLimitError)
    return Response.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { ...privateHeaders, "Retry-After": String(error.retryAfter) },
      },
    );
  if (error instanceof AccountHttpError)
    return Response.json({ error: error.code }, { status: error.status, headers: privateHeaders });
  if (error instanceof ProtocolError || error instanceof DomainError || error instanceof SyntaxError) {
    const code =
      error instanceof ProtocolError &&
      ["record_missing", "operation_reused", "snapshot_too_large"].includes(error.message)
        ? error.message
        : "invalid_request";
    return Response.json({ error: code }, { status: 400, headers: privateHeaders });
  }
  logAccountFailure(error);
  return Response.json({ error: "temporarily_unavailable" }, { status: 503, headers: privateHeaders });
}
