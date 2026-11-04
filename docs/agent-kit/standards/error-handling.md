# Error Handling

> **Read when:** writing code that can fail (data access, actions, route handlers, external calls) or building error UI.
> **Related:** [server-actions.md](../backend/server-actions.md), [api-routes.md](../backend/api-routes.md), [observability.md](../operations/observability.md).

## Two kinds of errors

| Kind | Examples | How it travels | Who handles it |
|---|---|---|---|
| **Expected** (part of the domain) | invalid input, not signed in, no permission, not found, duplicate name, rate limited | **Returned as a value**: `ActionResult` from actions, HTTP status + problem JSON from APIs, `notFound()`/`redirect()` in pages | The UI shows a specific, translated message |
| **Unexpected** (bugs, infrastructure) | DB down, null where impossible, third-party 500, programming error | **Thrown**, then caught at the boundary (`createAction`, route handler wrapper, `error.tsx`) | Logged and reported with context; the user sees a generic message plus a reference ID |

## Building blocks

These live in the codebase (created during bootstrap). Read them before use.

| Module | Purpose |
|---|---|
| `@/lib/errors` | `ERROR_CODES`, `type ErrorCode`, `class AppError` (expected error with a `code`), `isAppError()` |
| `@/lib/action-result` | `type ActionResult<T>`: `{ ok: true, data }` or `{ ok: false, code, messageKey?, fieldErrors? }` |
| `@/server/action` | `createAction()`: validates, authenticates, catches, logs, and converts errors to `ActionResult` |
| `@/server/api` | `withApiHandler()` / `problem()`: the same thing for Route Handlers (RFC 9457 problem JSON) |
| `@/server/logger` | Structured logger |

Error codes are camelCase and double as i18n keys in the `Errors` namespace: `validationFailed`, `unauthenticated`, `forbidden`, `notFound`, `conflict`, `rateLimited`, `internalError`.

## Rules

- **ERR-1 (MUST)** Model expected failures as values. Data-layer functions may `throw new AppError("notFound")`; `createAction` and `withApiHandler` convert `AppError` into results or HTTP responses. Never let an expected error surface as a 500.
- **ERR-2 (MUST NOT)** Swallow errors. An empty `catch {}` or `catch (e) { return null }` without logging is forbidden. Catch an error only to **handle** it (recover, translate, or add context) and rethrow otherwise.
- **ERR-3 (MUST)** When rethrowing, keep the original as `cause`: `throw new AppError("internalError", { cause: error })`.
- **ERR-4 (MUST NOT)** Expose internals to users or API clients: no stack traces, SQL, raw upstream error messages, file paths, or library errors. Return a code; log the details server-side.
- **ERR-5 (MUST)** In pages and layouts, use framework helpers for navigation outcomes: `notFound()` for missing or inaccessible resources (prefer 404 over 403 when existence itself is sensitive), and `redirect()` to the sign-in page for anonymous users.
- **ERR-6 (MUST)** Never catch Next.js navigation errors by accident. Code in `try/catch` that may call `redirect()`, `notFound()`, or dynamic APIs must call `unstable_rethrow(error)` first in the `catch` block (`createAction` already does this).
- **ERR-7 (MUST)** Every route group has an `error.tsx` (Client Component) that shows a translated message, a "Try again" button, and the `error.digest` as a support reference. `src/app/global-error.tsx` handles root-layout failures and must render its own `<html>` and `<body>`.
- **ERR-8 (MUST)** Provide `not-found.tsx` for the localized area, with helpful navigation (home, search) and `noindex`.
- **ERR-9 (MUST)** Log unexpected errors once, at the boundary, with context (operation name, entity IDs, request ID), never with secrets or personal data; see [observability.md](../operations/observability.md).
- **ERR-10 (MUST)** Every outbound call has a timeout (`AbortSignal.timeout(ms)`). Retry only idempotent operations, with exponential backoff, at most 3 attempts.
- **ERR-11 (SHOULD)** Wrap each third-party SDK in a small adapter (`src/server/<provider>.ts`) that converts its errors into `AppError` codes, so the rest of the app doesn't depend on vendor error shapes.
- **ERR-12 (MUST)** In the UI: field errors appear inline, form-level errors in a `role="alert"` region, and background-action failures as a toast. Always offer a next step (retry, go back, contact support).
- **ERR-13 (MUST)** Use exhaustive `switch` over error codes and discriminated unions. Lint (`switch-exhaustiveness-check`) makes a new code a compile-time TODO everywhere.

## Example: data layer + action

```ts
// src/features/projects/server/queries.ts
import "server-only";
import { AppError } from "@/lib/errors";

export async function getProject(projectId: string): Promise<Project> {
  const user = await requireUser();
  const row = await db.query.projects.findFirst({ where: … });
  if (!row || row.ownerId !== user.id) throw new AppError("notFound"); // no existence leak
  return toProject(row);
}
```

```ts
// In a page: convert to a 404
const project = await getProject(projectId).catch((error: unknown) => {
  if (isAppError(error) && error.code === "notFound") notFound();
  throw error;
});
```

## Example: error boundary

```tsx
// src/app/[locale]/(app)/error.tsx
"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { captureException } from "@/lib/monitoring";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Errors.boundary");

  useEffect(() => {
    captureException(error); // thin wrapper around the error-tracking SDK
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      {error.digest ? <p className="text-muted-foreground text-xs">{t("reference", { id: error.digest })}</p> : null}
      <Button onClick={reset}>{t("retry")}</Button>
    </div>
  );
}
```
