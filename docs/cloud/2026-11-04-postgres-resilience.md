# PostgreSQL resilience follow-up — 2026-11-04

Owner-approved follow-up to [hardening 011](2026-11-04-security-hardening.md).
Work/evidence: [completed task 012](../../tasks/completed/012-postgres-resilience.md). This work
does not authorize Neon access, application migrations, new integrations, OAuth,
commit/push or deployment. The owner separately approved one disposable local
PostgreSQL container/image for the real suite. Neon Auth is explicitly out of scope.

## Pool and SQL budgets

- `lib/db/client.ts` observes idle `error` once per pool, including an existing
  HMR pool. The WeakSet lives with the global resource, not request data. Logs
  contain a fixed message only, never error objects, SQL, credentials or row values.
- New pools wait at most 5 seconds for a connection. Existing HMR pools retain
  constructor options until dev restarts; the new error listener still attaches.
- `boundedTransaction` sets PostgreSQL **statement_timeout = 4000 ms** and
  **lock_timeout = 1000 ms** via `set_config(..., true)` inside the same transaction,
  before any work. Settings reset on commit/rollback; no pooled session SET.
- The limits cover limiter, account repository and Better Auth adapter operations
  (plus the user-create domain hook). OAuth HTTP requests are not wrapped in a
  SQL transaction. Adapter identity/schema-check registration is preserved.
- Account reads/writes retry at most twice for aborted 40001/40P01 transactions.
  Ambiguous connection errors and timeouts are not blindly replayed. Adapter
  operations are bounded but do not acquire automatic ambiguous-write retries.

These are **per-statement**, not an end-to-end HTTP deadline or instantaneous
cancellation of an in-flight SQL statement when a browser aborts. Connection /
PgBouncer waits and multiple statements add up; cold-start and batch latency
still need measurement in an authorized environment. Keep the existing 15-second
client abort, durable outbox and idempotent receipts. Do not claim a global
15-second transaction SLA from these settings.

## Rate limiter writes and maintenance

`ON CONFLICT ... DO UPDATE ... WHERE` now updates only an expired or non-saturated
counter. A denied conflict locks but does not update the heap tuple. Its retry
expiry is read under the same transaction lock. No new count version is created
for repeated denials; this does **not** mean zero WAL (row locking has a cost).

Denied requests never run cleanup. Accepted traffic prunes at most 100 expired
keys **once per minute per store instance**, using indexed expiry selection,
ordered keys, SKIP LOCKED and the outer expiry recheck. Local cleanup pacing is
not the quota authority: counters/decisions stay shared in PostgreSQL. No cron,
server timer, unawaited promise or separate paid service is added. With no traffic,
physical deletion waits; this is still not a hard wall-clock retention SLA.

Security budgets require BEGIN / SET LOCAL / COMMIT control round trips. Reducing
heap updates and cleanup frequency does not by itself prove fewer total SQL
statements or lower cost. Measure query count, time, locks and WAL before claiming
an improvement or changing compute. No Neon stats or plans were collected here.

## Migration connection boundary

- `drizzle.config.ts` is credential-free for generate/check.
- `db:migrate` explicitly uses `drizzle.migrate.config.ts`, which requires
  DATABASE_URL_UNPOOLED and shares `directMigrationUrl` with the prod config.
- `db:studio` uses that direct config as an administrative tool too.
- CI still requires its protected environment and separate migration permission;
  its npm migration command now reaches the same direct-only validation.
- Validation rejects missing/pooled URLs, non-Postgres schemes, missing databases
  and query-string target overrides. It never prints supplied credentials.
  There is no fallback to DATABASE_URL or a guessed localhost target.

No application/Neon migration was applied or edited. Existing migration 0004
remains generated, unapplied to those environments by this work and required
before auth/account can run. The suite applied 0000–0004 only to its approved
empty disposable local fixture.

## Consistent, conditional account snapshots

Reads use **REPEATABLE READ**. Lazy domain-owner creation handles concurrent
conflicts by restarting the transaction rather than mixing visibility snapshots.
Warm reads still do not lock the identity row behind a push.

A private v2 ETag is derived from the account owner and three SQL aggregate rows:
count and sum(revision) for tasks, pendings and settings. It is computed inside
the same MVCC snapshot as any returned payload, **after session/account checks**.
A matching ETag returns 304 without selecting titles, definitions or preferences.
This avoids payload egress/validation/hash work but still scans narrow revision
values on PostgreSQL; it is not an O(1) lookup and adds an aggregate query on misses.

The first metadata-token implementation was replaced before activation: an old
in-flight writer would not invalidate a new token during rolling deployment.
Existing writers already increment revisions and use tombstones, so the aggregate
works with those writers and adds no schema, trigger, token record or migration.
No-op mutations, conflicts, idempotent receipts and rate counters do not invalidate
it. Future administrative repairs must increment revisions; physical delete/recreate
workflows must revisit the validator (counts/sums are not a general content hash).

## Foreground sync and backoff

- Both Retry-After forms are parsed, clamped to 1 second–15 minutes, with a
  1-minute fallback for missing/invalid values on 429. The outbox/idempotency key
  remains queued; 429 is not a permanent rejection.
- A tested scheduler coalesces wakes and serializes runs. Manual retry, focus and
  visibility changes do not bypass the cooldown. A workspace ref keeps a scoped
  monotonic-clock deadline across auth recheck/effect recreation.
- Hidden/offline work schedules no polling/network timers. Visibility/online/focus
  resumes a fresh pull, respecting cooldown. A request already in flight may finish;
  offline UI still reports offline instead of waiting forever in syncing.
- Guest work stays local; no new subscriptions/service or execution/timer sync.

The scheduler tests use fake clocks, not a mobile browser. Real-device and
account/OAuth acceptance remain the owner's review.

## Explicit real-PostgreSQL suite

`npm test` remains synthetic/PGlite and never infers an application DATABASE_URL.
`npm run test:postgres` is a separate, explicit six-case suite for independent
connections: shared quotas/no-op denial, concurrent expiry reset, skip-locked
cleanup, actual SQL/lock timeouts and rollback, read/write snapshot interleaving,
and lazy owner creation races.

The suite requires **both** AVO_ALLOW_LOCAL_POSTGRES_TESTS=1 and
AVO_TEST_DATABASE_URL, with a plain loopback host, role `avo_test`, database
`avo_test_*` and no query overrides. The owner must confirm the port is not an SSH
or proxy tunnel. It refuses any pre-existing non-system tables rather than
wiping them. Migrations run only inside that explicitly approved fresh test DB;
no data is copied from Neon. Fixtures remain until the owner disposes of that DB.
There is no automatic destructive teardown or hidden skip/fallback to PGlite.

After starting an approved disposable local server, example (replace the synthetic
password/port with that server's configuration):

```bash
AVO_ALLOW_LOCAL_POSTGRES_TESTS=1 \
AVO_TEST_DATABASE_URL='postgresql://avo_test:SYNTHETIC_PASSWORD@127.0.0.1:65432/avo_test_resilience' \
npm run test:postgres
```

### Real-session verification completed

After the owner's explicit approval, **6/6 cases passed on the first run** with
official **PostgreSQL 17.11, arm64**, via OrbStack's local Docker engine. Four
separate backend PIDs were asserted. The cases exercised 40 simultaneous quota
requests, 20 concurrent resets, unchanged tuple xmin on saturated denial,
skip-locked pruning, actual SQLSTATE 57014/55P03 cancellation, local setting reset,
interleaved read/write snapshots and concurrent lazy owner creation.

The target was a fresh empty `avo_test_resilience` database, role `avo_test`,
published only at `127.0.0.1:65432`. PGDATA was a 512 MiB tmpfs; no host bind mounts
or application credentials/data were used. Image: `postgres:17-alpine`, resolved
to `postgres@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b`.

Container `avo-pg-012-6c952cffd115` and its disposable credential were removed
after verifying exact ID/image, owner nonce labels, loopback binding and private
artifact-root ownership. All 12 pre-existing running containers were left alone;
OrbStack remains running and the image cached. No code fixes were needed.

This proves local PostgreSQL behavior, **not** a live Neon/PgBouncer deployment,
OAuth, physical device or production performance. Normal checks/build/public
E2E evidence belongs in task 012.
