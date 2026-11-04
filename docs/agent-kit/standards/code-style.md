# Code Style

> **Read when:** writing or reviewing any TypeScript/TSX code.
> **Scope:** preferred conventions for application TypeScript. Preserve approved existing equivalents; kit CLI scripts use Node/console and their own checks. Formatting/lint/dead-code tools enforce only configured rules, not every statement below.

Formatting is fully automated: **never format by hand and never argue about formatting.** This doc covers what tools can't decide for you.

## Formatting and imports

- **STYLE-1 (MUST)** Use the project's configured formatter and command (`pnpm format` in new apps). Config changes require approval; an ADR is needed only for a consequential convention/tool decision.
- **STYLE-2 (MUST)** Import with the `@/` alias across top-level folders (`@/components/ui/button`, `@/server/db`). Use relative imports only **within the same feature or folder** (`./project-card`, `../schemas`). Never go up more than one level (`../../`).
- **STYLE-3 (MUST)** Use `import type { … }` for type-only imports.
- **STYLE-4 (MUST)** Use named exports. Default exports are allowed only where a framework requires them: Next.js special files (`page.tsx`, `layout.tsx`, `route.ts`…) and config files.
- **STYLE-5 (MUST NOT)** Introduce indiscriminate barrels that mix client/server modules or create cycles. A deliberate server-only DB schema aggregate is allowed; keep its runtime boundary and type-only imports explicit.
- **STYLE-6 (MUST NOT)** Leave side effects at module top level (network calls, timers, mutations), except deliberate singletons such as the DB client or logger.

## Functions

- **STYLE-10 (MUST)** Each function does one thing. If its name needs "and", split it.
- **STYLE-11 (MUST)** Use `function` declarations for components and top-level functions; use arrow functions for callbacks and inline handlers.
- **STYLE-12 (MUST)** Use guard clauses and early returns instead of nested `if`/`else`. Max 2 levels of nesting inside a function body; at most one level of ternary (no nested ternaries).
- **STYLE-13 (MUST)** More than 2 parameters, or any boolean parameter → use a single object parameter:

  ```ts
  // ❌ createInvite(projectId, email, true, "admin")
  // ✅
  createInvite({ projectId, email, sendEmail: true, role: "admin" });
  ```

- **STYLE-14 (SHOULD)** Prefer pure functions: same input → same output, no hidden I/O. Push I/O (DB, network, time, randomness) to the edges and pass results in.
- **STYLE-15 (MUST)** Don't mutate arguments. Return new values (`{ ...obj, name }`, `array.toSorted()`, `array.with()`).

## Async

- **STYLE-20 (MUST)** Every promise is awaited, returned, or explicitly handled (lint: `no-floating-promises`). Fire-and-forget work after a response uses `after()` from `next/server`, never an un-awaited promise.
- **STYLE-21 (MUST)** Run independent async work in parallel with `Promise.all`, not one `await` after another (avoid waterfalls).
- **STYLE-22 (MUST)** Every outbound `fetch` to a third party has a timeout: `fetch(url, { signal: AbortSignal.timeout(10_000) })`.
- **STYLE-23 (MUST NOT)** Pass async functions where a sync callback is expected (`array.forEach(async …)`, event props expecting `void`) unless handled (lint: `no-misused-promises`).

## Values and types

- **STYLE-30 (MUST)** `const` by default, `let` only when reassigned, never `var`. Always `===`.
- **STYLE-31 (MUST)** No magic numbers or strings: name them (`const MAX_MEMBERS = 25`). Exceptions: `0`, `1`, `-1`, `""`, and obvious values like `100` for percent.
- **STYLE-32 (MUST)** Use `??` for defaults (not `||`, which also replaces `0` and `""`) and `?.` for optional access.
- **STYLE-33 (SHOULD)** Use `undefined` for "not provided" and `null` for "explicitly empty" (DB nulls). Don't use both for the same field.
- **STYLE-34 (MUST)** Use `satisfies` to type-check config objects without widening them:

  ```ts
  export const navigationConfig = [
    { href: "/projects", labelKey: "projects" },
  ] as const satisfies readonly NavItem[];
  ```

- **STYLE-35 (MUST)** Use locale/time-zone-aware formatting: next-intl when selected, otherwise the approved native Intl strategy. Never rely on ambient locale for server/client output or format dates/currencies by hand.
- **STYLE-36 (MUST)** Store and transmit time in UTC (`Date` / ISO-8601). Convert to the user's time zone only when displaying.

## Classes

- **STYLE-40 (SHOULD NOT)** Write classes. Use plain functions and objects. Allowed exceptions: custom `Error` subclasses (`AppError`), and wrappers around stateful third-party SDK clients.

## Comments and documentation

- **STYLE-50 (MUST)** Comments explain **why**, not what. If code needs a "what" comment, rename or extract until it doesn't.
- **STYLE-51 (MUST)** Add TSDoc (`/** … */`) to exported functions in `src/lib/**` and `src/server/**` when behavior is not obvious from the name and types: side effects, thrown errors, units, caching.
- **STYLE-52 (MUST NOT)** Commit commented-out code. Git history keeps it.
- **STYLE-53 (MUST)** TODOs follow `// TODO(#123): explanation` and reference an issue. A TODO without an issue is not allowed.
- **STYLE-54 (MUST)** When you disable a lint rule, disable one specific rule on one line and say why:

  ```ts
  // eslint-disable-next-line react/no-danger -- JSON-LD is serialized with escapeJsonForHtml()
  ```

## Logging and debugging

- **STYLE-60 (MUST NOT)** Commit `console.log`, `debugger`, or ad-hoc debug output. Use the logger (`@/server/logger`) on the server; see [observability.md](../operations/observability.md).

## Size limits (soft)

These are signals to split code, not hard laws. Exceeding them requires a reason.

| Unit | Soft limit |
|---|---|
| File | ~250 lines |
| React component | ~150 lines |
| Function | ~40 lines |
| Function parameters | 2 positional (then use an object) |
| JSX nesting depth | ~5 levels (extract components) |

## Dead code

- **STYLE-70 (MUST)** Delete unused code, exports, files and dependencies (knip reports them in `pnpm verify`). Don't keep code "for later".
- **STYLE-71 (MUST NOT)** Add speculative abstractions: no generic helpers, options, or layers before there are at least two real uses. Duplication is cheaper than the wrong abstraction. Extract on the **third** occurrence.
