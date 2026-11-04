# Playbook: Add an API Endpoint, Webhook, or Cron Job

> **Use when:** external clients, third parties or schedulers need an HTTP endpoint. For our own UI, use Server Components (reads) and Server Actions (writes) instead; see [ADR 0007](../architecture/decisions/0007-server-actions-and-route-handlers.md).

## Inputs

- Consumer (mobile app, partner, provider webhook, cron) and authentication method (session, API key, signature, `CRON_SECRET`).
- Request/response contract, error cases, rate limit.

## Steps

1. **Path.**
   - `src/app/api/v1/<plural-resource>/route.ts` (or `[resourceId]/route.ts`);
   - `src/app/api/webhooks/<provider>/route.ts`;
   - `src/app/api/cron/<job>/route.ts`.
2. **Schemas.** Reuse or extend the feature's `schemas.ts`. Use `z.strictObject` for write bodies; query params use `z.coerce` with limits.
3. **Logic.** Implement or reuse functions in `src/features/<feature>/server/queries.ts` / `mutations.ts`. The route file stays thin (API-4).
4. **Handler.** Export `GET`/`POST`/… wrapped in `withApiHandler("<feature>.<operation>", …)`.
   1. Authenticate first (return `problem("unauthenticated")`).
   2. Validate.
   3. Call the data layer.
   4. Return JSON with the correct status (API-5…8).
5. **Webhooks.**
   - Verify the signature against the raw body, and reject stale timestamps.
   - Store the event ID (unique) for idempotency.
   - Respond `2xx` fast; use `after()` for slow work.
   - Invalidate caches with `revalidateTag(tag, "max")`.
6. **Cron.** Check `Authorization: Bearer ${env.CRON_SECRET}`, make the job idempotent, and register it in `vercel.json`.
7. **Rate limit.** Apply `@/server/rate-limit` for public endpoints (API-9).
8. **Security.**
   - CORS stays closed unless documented (API-11).
   - Cookie-authenticated state changes verify `Origin` (API-12).
9. **Docs.** Update the OpenAPI spec for public endpoints; add new env vars to `src/env.ts` and `.env.example`.
10. **Tests.**
    - integration tests for the handler: 2xx, 400/422, 401, 403/404, 429;
    - webhook signature failure and duplicate event.

## Verify

`pnpm verify`; exercise the endpoint locally (e.g., `curl` with and without auth) and paste the results in the report.

## Done when

The contract is documented, every error path returns problem JSON, auth and rate limits are tested, and the checks pass.
