import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountStage,
  logAccountFailure,
  safeErrorSignals,
  withAccountDiagnostics,
} from "./account-diagnostics";

vi.mock("server-only", () => ({}));
afterEach(() => vi.restoreAllMocks());

function recordedEvents() {
  return vi.mocked(console.error).mock.calls.map(([line]) => JSON.parse(line as string));
}

async function failedResponse(error: unknown): Promise<Response> {
  logAccountFailure(error);
  return Response.json({ error: "temporarily_unavailable" }, { status: 503 });
}

describe("safe account diagnostics", () => {
  it("extracts nested PostgreSQL/network codes, including AggregateError children", () => {
    const refused = Object.assign(new Error("private host"), { code: "ECONNREFUSED" });
    const aggregate = new AggregateError([refused], "private network details");
    const wrapped = new Error("private SQL/params", { cause: aggregate });
    expect(safeErrorSignals(wrapped)).toEqual({
      errorKind: "Error",
      errorCodes: ["ECONNREFUSED"],
      errorSignals: [],
    });
    const pg = Object.assign(new Error("private relation"), { code: "42P01" });
    expect(safeErrorSignals(new Error("query with secret", { cause: pg })).errorCodes).toEqual(["42P01"]);
  });

  it("identifies exact installed pg timeout signatures without outputting messages", () => {
    expect(safeErrorSignals(new Error("timeout exceeded when trying to connect"))).toEqual({
      errorKind: "Error",
      errorCodes: [],
      errorSignals: ["pool_connect_timeout"],
    });
    const timeout = new Error("Connection terminated due to connection timeout", {
      cause: Object.assign(new Error("private address"), { code: "ETIMEDOUT" }),
    });
    expect(safeErrorSignals(timeout)).toMatchObject({
      errorCodes: ["ETIMEDOUT"],
      errorSignals: ["connection_timeout"],
    });
    expect(
      safeErrorSignals(new Error("secret: timeout exceeded when trying to connect")).errorSignals,
    ).toEqual([]);
  });

  it("does not serialize names, arbitrary codes, messages, stacks or data properties", () => {
    const secret = "synthetic-secret@example.test";
    const error = Object.assign(new TypeError(secret), {
      name: secret,
      code: secret,
      detail: secret,
      query: secret,
      params: [secret],
    });
    const result = safeErrorSignals(error);
    expect(result).toEqual({ errorKind: "TypeError", errorCodes: [], errorSignals: [] });
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(safeErrorSignals(secret).errorKind).toBe("non_error");
    expect(safeErrorSignals(null).errorKind).toBe("non_error");
  });

  it("bounds cyclic/deep/aggregate errors and never invokes getters or toJSON", () => {
    const getter = vi.fn(() => {
      throw new Error("must not run");
    });
    const hostile = Object.defineProperties(
      {},
      {
        code: { get: getter },
        cause: { get: getter },
        message: { get: getter },
        errors: { get: getter },
        toJSON: { value: getter },
      },
    );
    expect(safeErrorSignals(hostile).errorCodes).toEqual([]);
    expect(getter).not.toHaveBeenCalled();
    const cyclic = { code: "23505", cause: null as unknown };
    cyclic.cause = cyclic;
    expect(safeErrorSignals(cyclic).errorCodes).toEqual(["23505"]);
    let deep: unknown = { code: "42P01" };
    for (let index = 0; index < 100; index++) deep = { cause: deep };
    expect(safeErrorSignals(deep).errorCodes).toEqual([]);
    const aggregate = new AggregateError(Array.from({ length: 100 }, () => ({ code: "ECONNRESET" })));
    expect(safeErrorSignals(aggregate).errorCodes).toEqual(["ECONNRESET"]);
    const proxy = Proxy.revocable({}, {});
    proxy.revoke();
    expect(safeErrorSignals(proxy.proxy)).toEqual({
      errorKind: "non_error",
      errorCodes: [],
      errorSignals: [],
    });
  });

  it("logs the deepest failed stage once with monotonic timing and the response ID", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let clock = 100;
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    const error = Object.assign(new Error("synthetic private SQL"), { code: "55P03" });
    const response = await withAccountDiagnostics("account.data.get", async () => {
      try {
        clock = 110;
        await accountStage("account.read", async () => {
          clock = 120;
          await accountStage("account.tasks", async () => {
            clock = 145;
            throw error;
          });
        });
        throw new Error("unreachable");
      } catch (caught) {
        expect(caught).toBe(error);
        clock = 150;
        return failedResponse(caught);
      }
    });
    expect(recordedEvents()).toEqual([
      expect.objectContaining({
        event: "account_request_failed",
        requestId: response.headers.get("x-request-id"),
        operation: "account.data.get",
        stage: "account.tasks",
        stagePath: ["account.read", "account.tasks"],
        durationMs: 50,
        stageDurationMs: 25,
        errorCodes: ["55P03"],
      }),
    ]);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "temporarily_unavailable" });
  });

  it("isolates overlapping requests, including identical thrown error objects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("shared synthetic error");
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const read = withAccountDiagnostics("account.data.get", async () => {
      try {
        await accountStage("account.read", async () => {
          await gate;
          throw error;
        });
        throw new Error("unreachable");
      } catch (caught) {
        return failedResponse(caught);
      }
    });
    const write = await withAccountDiagnostics("account.data.post", async () => {
      try {
        await accountStage("account.write", async () => {
          throw error;
        });
        throw new Error("unreachable");
      } catch (caught) {
        return failedResponse(caught);
      }
    });
    release();
    const get = await read;
    expect(get.headers.get("x-request-id")).not.toBe(write.headers.get("x-request-id"));
    expect(recordedEvents()).toEqual([
      expect.objectContaining({
        operation: "account.data.post",
        stage: "account.write",
        requestId: write.headers.get("x-request-id"),
      }),
      expect.objectContaining({
        operation: "account.data.get",
        stage: "account.read",
        requestId: get.headers.get("x-request-id"),
      }),
    ]);
  });

  it("does not attribute a later failure to a recovered/retried error, even if reused", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("reused synthetic error");
    const response = await withAccountDiagnostics("account.data.get", async () => {
      await accountStage("account.owner", async () => {
        throw error;
      }).catch(() => {});
      try {
        await accountStage("account.preferences", async () => {
          throw error;
        });
        throw new Error("unreachable");
      } catch (caught) {
        return failedResponse(caught);
      }
    });
    expect(response.status).toBe(503);
    expect(recordedEvents()[0].stage).toBe("account.preferences");
  });

  it("leaves unscoped operations and successful requests free of error logs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await accountStage("account.read", async () => 42)).toBe(42);
    const response = await withAccountDiagnostics(
      "account.me.get",
      async () => new Response(null, { status: 304 }),
    );
    expect(response.status).toBe(304);
    expect(response.headers.get("x-request-id")).toMatch(/^[a-f\d-]{36}$/);
    expect(console.error).not.toHaveBeenCalled();
  });
});
