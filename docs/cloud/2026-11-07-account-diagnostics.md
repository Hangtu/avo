# Private account failure diagnostics

Task: [023](../../tasks/completed/023-account-failure-diagnostics.md).

## Purpose and activation

Unexpected failures in `GET /api/account/data`, `POST /api/account/data` and
`GET /api/account/me` emit one structured `account_request_failed` JSON event at
the account HTTP boundary. There is no feature flag, database migration, new
environment variable, external telemetry service or diagnostic endpoint.

The code must be deployed separately before these events exist in production.
After deployment, normal account traffic records failures automatically; no
manual reproduction, health-check script or user-data query is required to
produce the diagnostic event. This change diagnoses failures, not repairs them.
It cannot retroactively recover the cause of an older generic log entry.

## Correlation

Every handled account response (including 200, 304, expected rejections and 503)
has a server-generated UUID in `X-Request-Id`. Incoming request IDs are ignored.
For an unexpected 503, search the server runtime logs for
`event = account_request_failed` and the matching `requestId`. Logs alone can
also be filtered by operation/stage without asking the user for a new request.

Bodies, statuses, private/no-store headers, ETags, ownership checks and rate-limit
budgets remain unchanged. Expected 400/401/403/409/413/415/429 responses do not
produce outage events; `Retry-After` is preserved. Next.js framework control flow
(including PPR/request-time bailouts) is rethrown with the installed
`unstable_rethrow` API instead of being misreported as a persistence outage.
Only handled route responses receive the header (not framework-generated 405s,
framework rethrows or startup failures).

Illustrative event, **not evidence from production**:

```json
{
  "level": "error",
  "event": "account_request_failed",
  "time": "2026-11-07T12:00:00.000Z",
  "requestId": "00000000-0000-4000-8000-000000000000",
  "operation": "account.data.get",
  "stage": "rate_limit.consume",
  "stagePath": ["rate_limit.ip", "rate_limit.consume"],
  "durationMs": 31,
  "stageDurationMs": 24,
  "errorKind": "Error",
  "errorCodes": ["42P01"],
  "errorSignals": []
}
```

This example establishes that the limiter's consumption transaction encountered
an undefined relation; it does **not** establish that a particular migration is
missing or which database the deployment is using. Those are separate facts.

## Fields and stages

- `requestId`: random response/log correlation only, not an account identifier.
- `operation`: fixed `account.data.get`, `account.data.post` or `account.me.get`.
- `durationMs`: monotonic elapsed request-boundary time until logging.
- `stageDurationMs`: monotonic elapsed time in the innermost failing stage.
- `stage` / `stagePath`: innermost failure and its enclosing stages. Examples:
  - `rate_limit.ip` / `rate_limit.account`: before-session and account budgets.
  - Nested `rate_limit.consume` / `rate_limit.cleanup`: quota transaction versus
    accepted-request maintenance; a cleanup failure remains fail-closed.
  - `session.read`: Better Auth session lookup.
  - `account.read`: read transaction, including transaction acquisition/commit.
  - Nested `account.owner`, `account.snapshot_version`, `account.tasks`,
    `account.pendings`, `account.preferences`: linking, ETag aggregates and rows.
  - `account.write`: existing mutation transaction; no additional writes/retries.
  - `request.parse`: streamed POST body parsing.
  - `request`: an unexpected boundary error outside an annotated stage.
- `errorKind`: fixed native category (`Error`, `TypeError`, `RangeError`,
  `AggregateError`, `non_error`); never arbitrary `error.name`.
- `errorCodes`: explicit allowlist of PostgreSQL SQLSTATE and Node connection/TLS
  codes, extracted from up to eight cause/aggregate nodes. Examples:
  `42P01` undefined relation, `42703` undefined column, `42501` insufficient
  privilege, `55P03` lock unavailable, `57014` query cancelled, `53300` too many
  connections, `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`. A code is evidence of
  that reported condition, not an inferred root cause; e.g. `57014` alone does
  not distinguish statement timeout from another cancellation.
- `errorSignals`: fixed labels for exact installed `pg`/`pg-pool` messages that
  lack codes: `pool_connect_timeout`, `connection_timeout`,
  `connection_terminated`, `pool_closed`. No fuzzy substring classification.

`errorCodes: []` and `errorSignals: []` mean **no recognized technical signal**, not
that PostgreSQL was healthy. Unknown values are not guessed or copied into logs.
The stage still narrows the failing operation. Whole-transaction failures can
remain at `account.read`/`account.write`; write queries are not individually traced.

## Privacy and behavior boundaries

Only fixed enums/allowlisted technical signals, random IDs and timing enter the
event. No request URL/query, headers, cookies, session/account IDs, user data,
provider credentials, SQL, parameters, raw error messages, details or stacks.
Error getters and `toJSON` are not called; traversal is cycle-aware and bounded.

AsyncLocalStorage isolates overlapping requests. Stages rethrow the same error
and do not add retries, change transaction budgets or log on success. Errors
recovered within a request do not overwrite the final failure's attribution.
There is no per-query logging or durable diagnostic store. Existing provider or
platform logging outside this account event is not redesigned by this change.

Module initialization failures, function kills/platform timeouts, process crashes
and responses generated before the handler runs may bypass this event; inspect
platform logs for those. There is no new alerting integration or claim that the
underlying production incident has been identified/fixed.

## Automated validation

- Route tests inject failures in IP limiter, session, account limiter, reads,
  writes and probe; verify ID correlation, no sensitive output and unchanged
  expected errors/private caching/ETag behavior and framework control-flow rethrows.
- Diagnostic unit tests cover nested/aggregate causes, exact timeout signals,
  unknown/hostile errors, bounded traversal, monotonic timing, concurrent requests
  and recovered/reused error attribution.
- Isolated PGlite integration tests use actual SQL errors to distinguish owner,
  snapshot and individual collection failures, missing limiter storage, and
  cleanup rejection. Schema perturbations/triggers exist only inside the
  disposable in-memory test database; no project migrations are modified.
- Full project checks/build use synthetic configuration. An automated isolated
  `next start` smoke against a loopback fake PostgreSQL transport confirmed one
  correlated `503` event at `rate_limit.ip → rate_limit.consume` with the actual
  `ECONNRESET` code and no private input in the event. Transport termination can
  be reported as a system code rather than a message-derived signal; neither is
  inferred from the injected failure.
- These checks do not prove deployed code, production database connectivity,
  Neon, OAuth or a real device.
