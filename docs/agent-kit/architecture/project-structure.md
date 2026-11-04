# Project Structure

> **Read when:** creating any new file or folder, or when unsure where code belongs.
> **Enforced by:** the target's tested import restrictions, `server-only`, and code review. Base Next ESLint alone does not enforce the entire matrix.
> **Scope:** default responsibilities for approved new apps. Existing paths are mapped in the project contract; this tree does not authorize a migration. See [applicability](applicability.md).

## Start small

A monolingual landing can use `src/app/{layout,page,globals.css}`, meaningful section components, public assets, public metadata/sitemap, and E2E smoke coverage. See [reference-landing.md](reference-landing.md). No server, DB, auth, catalog, proxy, or empty feature files are required.

## The expanded tree — create only selected responsibilities

```text
.
├── AGENTS.md                      # Entry point for AI agents (and humans)
├── README.md
├── docs/                          # All project knowledge: rules, playbooks, specs, ADRs
├── messages/                      # i18n catalogs: en.json, es.json, … (one per locale)
├── public/                        # Static files served as-is (favicons, robots-free assets)
├── e2e/                           # Playwright tests: <journey>.spec.ts
├── drizzle/                       # Generated SQL migrations (never edit applied ones)
├── scripts/                       # One-off/dev scripts run with tsx (seed, i18n check)
└── src/
    ├── app/                       # ROUTING ONLY: pages, layouts, route handlers, metadata files
    │   ├── [locale]/              # Only with i18n; otherwise root layout/pages live directly in app
    │   │   ├── layout.tsx         # <html lang dir>, fonts, providers
    │   │   ├── not-found.tsx
    │   │   ├── (marketing)/       # Public, indexable pages (home, pricing, blog, legal)
    │   │   ├── (auth)/            # Sign-in, sign-up, reset password (noindex)
    │   │   └── (app)/             # Authenticated product area (noindex)
    │   ├── api/
    │   │   ├── auth/[...all]/route.ts   # Better Auth handler
    │   │   ├── health/route.ts
    │   │   └── v1/<resource>/route.ts   # Public / external REST API (versioned)
    │   ├── llms.txt/route.ts      # LLM-readable site summary
    │   ├── robots.ts
    │   ├── sitemap.ts
    │   ├── manifest.ts
    │   └── global-error.tsx
    ├── features/                  # Vertical slices: one folder per domain capability
    │   └── <feature>/             # e.g. projects, billing, account
    │       ├── components/        # Feature UI (server by default; client leaves marked)
    │       ├── hooks/             # Client hooks used only by this feature
    │       ├── server/            # SERVER-ONLY
    │       │   ├── queries.ts     # Reads: auth-aware data access layer, returns DTOs
    │       │   ├── mutations.ts   # Writes: DB changes + authorization
    │       │   ├── actions.ts     # "use server" Server Actions (thin: createAction → mutations)
    │       │   └── cache-tags.ts  # Cache tag builders for this feature
    │       ├── schemas.ts         # Zod schemas (shared by client and server)
    │       ├── search-params.ts   # nuqs parsers for this feature's URL state (if any)
    │       ├── types.ts           # DTO and domain types
    │       ├── constants.ts
    │       └── utils.ts           # Pure helpers for this feature
    ├── components/
    │   ├── ui/                    # shadcn/ui primitives (generated, owned by us)
    │   ├── layout/                # Site/app chrome: header, footer, sidebar, nav
    │   └── shared/                # Reusable composites used by 2+ features
    ├── server/                    # SERVER-ONLY shared infrastructure
    │   ├── db/
    │   │   ├── index.ts           # Drizzle client
    │   │   └── schema/            # Tables, one file per domain + auth.ts (generated)
    │   ├── auth/
    │   │   ├── auth.ts            # betterAuth() instance
    │   │   └── session.ts         # getCurrentUser(), requireUser()
    │   ├── action.ts              # createAction()
    │   ├── api.ts                 # withApiHandler(), problem()
    │   ├── logger.ts
    │   └── rate-limit.ts
    ├── lib/                       # Isomorphic, framework-light helpers (safe for client)
    │   ├── utils.ts               # cn()
    │   ├── errors.ts              # AppError, ErrorCode
    │   ├── action-result.ts       # ActionResult type
    │   ├── forms.ts               # applyActionErrors()
    │   ├── monitoring.ts          # captureException()
    │   └── seo/                   # buildPageMetadata(), JSON-LD builders
    ├── hooks/                     # Shared client hooks
    ├── i18n/
    │   ├── routing.ts             # locales, defaultLocale, localePrefix
    │   ├── navigation.ts          # locale-aware Link, redirect, useRouter, usePathname, getPathname
    │   └── request.ts             # getRequestConfig (loads messages)
    ├── config/
    │   ├── site.ts                # name, URL, socials, default OG image
    │   ├── routes.ts              # public routes list (feeds sitemap and llms.txt)
    │   └── navigation.ts          # nav menus
    ├── types/                     # Global type augmentation (next-intl AppConfig, etc.)
    ├── env.ts                     # Validated environment variables
    ├── proxy.ts                   # i18n routing + optimistic auth redirects ONLY
    ├── instrumentation.ts         # Server observability bootstrap
    └── instrumentation-client.ts  # Client observability bootstrap
```

## What goes where

| You are adding… | Put it in… |
|---|---|
| A page or layout | `src/app/.../page.tsx`; add `[locale]`/groups only when selected |
| UI used by one feature | `src/features/<feature>/components/` |
| UI used by 2+ features | `src/components/shared/` |
| A basic primitive (button, dialog, input) | `src/components/ui/`, via `pnpm dlx shadcn@latest add` |
| Header, footer, sidebar | `src/components/layout/` |
| A DB read | `src/features/<feature>/server/queries.ts` |
| A DB write | `src/features/<feature>/server/mutations.ts` |
| A form/button mutation endpoint | `src/features/<feature>/server/actions.ts` |
| An endpoint for external clients or webhooks | `src/app/api/…/route.ts`; it calls feature `server/` functions |
| A table | `src/server/db/schema/<domain>.ts` (+ migration) |
| Input validation | `src/features/<feature>/schemas.ts` |
| A pure helper used by one feature | `src/features/<feature>/utils.ts` |
| A pure helper used everywhere | `src/lib/<name>.ts` |
| A server-only integration (email, payments, storage) | `src/server/<provider>.ts` (adapter) |
| A translation | `messages/<locale>.json`, under the feature's namespace |
| An env var | `src/env.ts` + `.env.example` |
| A site-wide constant (name, URLs, socials) | `src/config/site.ts` |

## Dependency rules (import direction)

```text
app  ──►  features  ──►  components, hooks, lib, server, i18n, config, types
                         components ──► lib, hooks, i18n, config, types
                         server     ──► lib, config, types, i18n (page-navigation adapter only)
                         lib        ──► lib, config, types        (no server, no React-specific state)
```

| From ↓ may import → | app | features (same) | features (other) | components | hooks | server | lib | i18n | config |
|---|---|---|---|---|---|---|---|---|---|
| **app** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **features/x** | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **components** | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **hooks** | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ |
| **server** | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | page adapter only | ✓ |
| **lib** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |

## Rules

- **ARCH-1 (MUST)** Keep `src/app/` thin: routing, params, metadata, and composing feature components. No business logic, no DB queries, no complex JSX in route files.
- **ARCH-2 (MUST NOT)** Import one feature from another. If two features need the same thing, move it down to `components/shared`, `lib`, or `server`, or compose the two features in the page (`app/`).
- **ARCH-3 (MUST)** Start every file in `src/server/**` and `src/features/*/server/**` with `import "server-only";`. The only exception is `actions.ts`, which starts with `"use server";`. Client Components may import exported Server Actions from `"use server"` files, but no ordinary server modules.
- **ARCH-4 (MUST)** Runtime DB access belongs only in server-only data functions, not components/routes. Erased type-only schema imports are allowed in DTO/mapping files; import restrictions must distinguish them from runtime imports.
- **ARCH-5 (MUST)** Keep `src/lib/**` isomorphic: no Node-only APIs, no secrets, no DB. If it needs the server, it belongs in `src/server/`.
- **ARCH-6 (MUST)** Use `proxy.ts` only for i18n routing and **optimistic** redirects (cookie presence). It is never the security boundary; the data layer is.
- **ARCH-7 (MUST)** Record consequential boundary/dependency/deployment decisions as ADRs. Routine feature folders and approved existing path mappings need no ADR; this tree is a responsibility map, not a file-count checklist.
- **ARCH-8 (SHOULD)** Create a new feature folder when a capability has its own data, UI and rules (projects, billing, members). Small cross-cutting UI belongs in `components/shared`.

## Growing beyond MVP

- When `messages/<locale>.json` exceeds ~1,500 lines, split it into `messages/<locale>/<namespace>.json` and merge the files in `src/i18n/request.ts`.
- When a second deployable app (admin, mobile API, worker) appears, migrate to a pnpm workspace (`apps/*`, `packages/*`) with an ADR. Feature folders move largely unchanged.
