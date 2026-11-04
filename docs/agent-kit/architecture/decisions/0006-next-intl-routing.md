# 0006. Use next-intl with locale-prefixed routing

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

The product must support several languages and rank in search for each one. Search engines need a distinct URL per language, plus hreflang annotations. UI copy must never be hardcoded.

## Decision

- Use next-intl. All pages live under `src/app/[locale]/`, and `[locale]/layout.tsx` is the root layout.
- Use `localePrefix: "as-needed"`: the default locale has no prefix (`/pricing`); other locales are prefixed (`/es/pricing`).
- `src/i18n/request.ts` reads the locale with `next/root-params`, which is compatible with Cache Components.
- Messages live in `messages/<locale>.json`. The default locale's file is the source of truth for keys, which are type-checked through `AppConfig`.
- Navigation uses only `@/i18n/navigation`.
- Localized pathnames (`/es/precios`) are optional, adopted per page with an ADR when SEO research justifies them.

## Consequences

- **Positive:**
  - SEO-correct URLs and hreflang.
  - Typed keys.
  - Works with static prerendering.
- **Negative:**
  - Route Handlers and Server Actions don't get root params. They receive the locale explicitly, or return codes that the client translates.
  - Every new string needs entries in every locale (checked in CI).

## Enforcement

- [i18n.md](../../discoverability/i18n.md).
- `pnpm i18n:check`.
- ESLint: blocks `next/link` and `next/navigation` imports for navigation.
