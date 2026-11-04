# Observability (logs, errors, traces, metrics)

> **Read when:** handling errors or adding operational monitoring.
> **Scope:** add only signals/providers justified by the active contract. A static landing needs no database health check, audit table, Sentry, or Vercel analytics by default. Preserve approved equivalents and obtain privacy/service approval.

## Stack

| Signal | Tool | Where configured |
|---|---|---|
| Server logs | `@/server/logger` (JSON lines to stdout) → Vercel logs (log drain optional) | `src/server/logger.ts` |
| Errors (server + client) | Sentry (`@sentry/nextjs`) | `src/instrumentation.ts`, `src/instrumentation-client.ts`, `withSentryConfig` |
| Traces | OpenTelemetry via `@vercel/otel` (`registerOTel`) | `src/instrumentation.ts` |
| Web Vitals / traffic | Vercel Speed Insights + Web Analytics | root layout |
| Uptime | External monitor hitting `/api/health` | provider dashboard |

## Logger contract

```ts
// src/server/logger.ts (sketch; the real file is created at bootstrap)
import "server-only";

type Level = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown> & { error?: unknown };

function write(level: Level, event: string, context: Context = {}) {
  const { error, ...rest } = context;
  const entry = {
    level, event, time: new Date().toISOString(), ...rest,
    ...(error instanceof Error ? { error: { name: error.name, message: error.message, stack: error.stack } } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export const logger = {
  debug: (event: string, context?: Context) => { if (process.env.NODE_ENV !== "production") write("debug", event, context); },
  info: (event: string, context?: Context) => write("info", event, context),
  warn: (event: string, context?: Context) => write("warn", event, context),
  error: (event: string, context?: Context) => write("error", event, context),
};
```

## Rules

- **OBS-1 (MUST)** Log events as snake_case names with structured context: `logger.info("project_created", { projectId })`. Don't use free-text sentences or string interpolation.
- **OBS-2 (MUST)** Never log secrets, tokens, passwords, cookies, authorization headers, full request bodies, or personal data (email, name, IP, free text). Log internal IDs instead.
- **OBS-3 (MUST)** Log unexpected errors **once**, at the boundary (`createAction`, `withApiHandler`, error boundaries), with the error object and operation context. Don't log and rethrow at every layer.
- **OBS-4 (MUST)** Levels:
  - `error`: needs attention (alerting);
  - `warn`: unusual but handled (retries, degraded third party);
  - `info`: business and security events (sign-in, role change, payment);
  - `debug`: development only.
- **OBS-5 (MUST)** Configure the error tracker with the release (git SHA), the environment, PII scrubbing (`sendDefaultPii: false`), and source maps uploaded privately. `captureException` from `@/lib/monitoring` is the only client-side reporting call.
- **OBS-6 (MUST)** Record security-relevant events (sign-in success/failure bursts, password/email change, role/permission change, account deletion, API key creation) in an `audit_events` table: actor, action, target, timestamp, and no secrets. Write them via `after()`.
- **OBS-7 (MUST)** When a health endpoint is required, report actual service readiness without sensitive details. A DB probe belongs only to a selected persistence dependency; static-only deployments need no artificial DB client.
- **OBS-8 (SHOULD)** Alert on: error rate spikes, 5xx rate > 1% for 5 minutes, failed cron jobs, health check failures, and a Core Web Vitals regression. Alerts go to a channel someone watches.
- **OBS-9 (SHOULD)** Add custom spans (OpenTelemetry) around slow or critical operations (external APIs, heavy queries) when debugging performance.
