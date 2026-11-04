# 0001. Use Next.js App Router with Cache Components

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

We need fast, SEO-friendly public pages and an authenticated app in one codebase, deployed on Vercel. Next.js 16.4 recommends Cache Components for every app; it is the default in create-next-app and will be the framework default in Next.js 17.

## Decision

- Use the App Router with React Server Components.
- Enable `cacheComponents: true` and `partialPrefetching: true`.
- Enable `reactCompiler: true`.
- Cache explicitly with `"use cache"`, `cacheLife` and `cacheTag`. Invalidate with `updateTag` (Server Actions) or `revalidateTag(tag, "max")` (elsewhere).
- Put dynamic, per-request data inside `<Suspense>`.

## Consequences

- **Positive:**
  - Static shells are prerendered and dynamic parts stream in.
  - Caching is explicit and visible in code.
  - Less client JavaScript; no manual memoization.
- **Negative:**
  - Reading request data (`cookies()`, `headers()`, session) outside `<Suspense>` fails the build. Developers must understand the static/dynamic boundary.
  - Some libraries need explicit locale/params passing (see ADR 0006).

## Alternatives considered

| Option | Why not |
|---|---|
| Previous caching model (`revalidate` exports, `unstable_cache`) | Deprecated direction; implicit caching caused surprises |
| Remix / React Router, Astro, SvelteKit | Smaller ecosystem for this stack; team knows Next.js |

## Enforcement

- Next.js build errors on uncached data outside `<Suspense>`.
- [data-fetching-and-caching.md](../../backend/data-fetching-and-caching.md).
- The "Outdated patterns" table in [tech-stack.md](../tech-stack.md).
