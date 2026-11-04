# 0007. Server Actions for UI mutations, Route Handlers for external APIs

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

The app's own UI needs typed mutations with minimal boilerplate. External clients, webhooks and integrations need stable HTTP contracts. Server Actions are public POST endpoints, so they need the same security as APIs.

## Decision

- **Reads:** Server Components call the feature's `server/queries.ts` directly. We do not build an internal REST API for our own UI.
- **UI mutations:** Server Actions in `features/<f>/server/actions.ts`, built with `createAction()` from `@/server/action`. It authenticates, validates with Zod, catches and logs errors, and returns `ActionResult`.
- **External/HTTP:** Route Handlers under `src/app/api/v1/…`, wrapped with `withApiHandler()`. They return JSON, or RFC 9457 problem details on error.
- Both call the same `mutations.ts` and `queries.ts`. Business rules and authorization live there, not in the transport layer.
- We don't use tRPC/oRPC/GraphQL unless an ADR justifies it, e.g. a mobile client.

## Consequences

- **Positive:**
  - One place for rules.
  - Typed end-to-end for the UI.
  - Stable, versioned contracts for third parties.
- **Negative:**
  - Two thin transport wrappers to maintain.
  - Actions are not cacheable for reads (by design).

## Enforcement

- [server-actions.md](../../backend/server-actions.md).
- [api-routes.md](../../backend/api-routes.md).
- Code review.
