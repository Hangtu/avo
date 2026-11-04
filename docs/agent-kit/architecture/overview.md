# Architecture Overview

> **Read when:** starting work or changing multiple layers. Start with the approved project contract and [applicability](applicability.md).

## One foundation, selected capabilities

The preferred new-project shape is one Next.js App Router application with server-first components and feature-oriented responsibilities. It can begin as static content without a database, auth, proxy, or locale segment.

```text
Browser → Next.js routes/layouts
               ↓
      feature/UI composition
               ↓ when needed
 server-only data/business functions
               ↓ when selected
 persistence, identity, external adapters
```

An existing application's approved paths/tools may differ. Preserve valid boundaries and improve a selected area incrementally; do not enforce the tree through a wholesale move.

## Request paths

- **Static/public page:** server-rendered content with appropriate metadata, sitemap coverage, and accessible UI. No shared data cache is necessary for literal static content.
- **Private data:** a server-only operation obtains the authenticated actor and scopes access; transport/layout/proxy checks are not authorization.
- **UI write:** validate at the action boundary, enforce access in the mutation, return safe errors/DTOs, invalidate only caches that exist.
- **External HTTP:** explicit authentication/signature and validation at the boundary, shared business/data functions, consistent HTTP errors.
- **Languages:** default Next navigation for one language; next-intl routing/catalogs when selected.

Do not create a layer that merely passes through hypothetical future work.

## Default decisions and scope

[ADR 0009](decisions/0009-adaptive-adoption.md) governs applicability of the earlier decisions.

| Area | Preference | Scope |
|---|---|---|
| Framework | App Router, Server Components; explicit Cache Components when enabled | New Next apps; preserve supported existing rendering until migration is approved |
| Structure | Feature-oriented, one-way imports | Meaningful capabilities, not every visual fragment |
| Data | PostgreSQL + Drizzle | Persistence selected |
| Identity | Better Auth | Auth selected; confirm provider/storage requirements |
| UI | Tailwind + Base UI shadcn primitives | Add used primitives only; preserve approved existing UI |
| Languages | next-intl | i18n selected |
| Writes / HTTP | Consistent actions / route-handler boundaries | Actual mutations or external consumers |
| Knowledge | Project contract + task-routed reference library | Every adoption |

See [tech stack](tech-stack.md), [structure](project-structure.md), and [reference feature](reference-feature.md). The latter deliberately shows a fuller authenticated/localized case.

## Quality baseline

UI targets WCAG 2.2 AA and responsive behavior; public pages target good Core Web Vitals and appropriate discoverability. Data operations validate inputs and enforce explicit access. Logs/errors/caches do not leak secrets or personal data.

These are requirements to verify on touched behavior, not claims that documentation adoption has made an entire existing app compliant. Automated checks, manual accessibility, and production measurements are separate evidence.
