# Performance

> **Read when:** building pages, adding client-side code or dependencies, adding images/fonts/third-party scripts, or writing queries.
> **Targets (p75, real users, mobile):** LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1. Use the approved RUM/field source; Vercel tooling is optional. Local lab scores are not field evidence.

## Budgets

| Budget | Limit | How to check |
|---|---|---|
| First-load JS per public route | ≤ 150 KB gzipped | `pnpm analyze` (`next build --analyze`) |
| Any single new client dependency | ≤ 30 KB gzipped, or lazy-load it | bundle analyzer, bundlephobia |
| LCP image | Preloaded, correctly sized, AVIF/WebP | Lighthouse / Speed Insights |
| Server response for dynamic pages | Static shell instant; data hole ≤ 500ms p75 | Vercel observability |
| DB queries per request | ≤ ~5, none sequential if independent | logs / tracing |

## Rules

- **PERF-1 (MUST)** Server Components by default; `"use client"` only on interactive leaves ([react-components.md](../standards/react-components.md)). Client JS is the biggest cost.
- **PERF-2 (MUST)** Choose rendering/cache scope deliberately. Literal static content needs no data cache. When shared caching/Cache Components are enabled, follow lifetime/invalidation and request-dependent Suspense rules ([data-fetching-and-caching.md](../backend/data-fetching-and-caching.md)).
- **PERF-3 (MUST)** Use `next/image` for every image, with explicit `width`/`height` (or `fill` + a sized parent) and a correct `sizes`. Add `preload` (or `loading="eager"` + `fetchPriority="high"`) **only** to the LCP image. Never use `priority`; it is deprecated.
- **PERF-4 (MUST)** Load fonts with `next/font`: variable fonts, `display: "swap"`, only the subsets you need. No `<link>` to Google Fonts.
- **PERF-5 (MUST)** Prevent layout shift:
  - reserve space for images, embeds, ads and async content;
  - use skeletons that match the final size;
  - never insert content above existing content after load.
- **PERF-6 (MUST)** Lazy-load heavy client-only components that aren't needed for first paint (charts, editors, maps, emoji pickers) with `next/dynamic`.
- **PERF-7 (MUST)** Load third-party scripts with `next/script` and `strategy="lazyOnload"` (or `afterInteractive` when required). Each new third-party script needs justification in the PR; prefer server-side integrations.
- **PERF-8 (MUST)** Keep the main thread free for INP: no long synchronous work in event handlers. Wrap non-urgent updates in `startTransition`, debounce input-driven work, and virtualize lists longer than ~100 items.
- **PERF-9 (MUST)** No request waterfalls: parallelize independent reads (`Promise.all`), and avoid N+1 queries (DB-22).
- **PERF-10 (MUST)** Every query on a growing table is backed by an index and has a `limit` (DB-5, DB-26).
- **PERF-11 (SHOULD)** Import only what you use (`import { format } from "date-fns"`). Avoid libraries that pull in large polyfills or locales.
- **PERF-12 (SHOULD)** Prefer CSS over JavaScript for animations and interactions (`:hover`, `details/summary`, CSS transitions, View Transitions).
- **PERF-13 (MUST)** Big list pages paginate on the server; never send thousands of rows to the client to filter there.

## Checking

Measure a baseline before changing performance-sensitive code; remeasure under comparable conditions and retain only justified changes. Use the installed Next version's supported analyzer/config, not an assumed CLI flag. Record actual commands and deviations in the contract.

1. Before a PR that adds dependencies or client components, run `pnpm analyze` and compare the route sizes.
2. For new public pages, run Lighthouse (mobile) on the preview deployment: Performance ≥ 90, SEO = 100, Accessibility = 100, Best Practices ≥ 95.
3. After release, watch Speed Insights. A regression of any Core Web Vital past its threshold is a bug.
