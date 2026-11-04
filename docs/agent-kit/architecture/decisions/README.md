# Architecture Decision Records (ADRs)

An ADR records one significant technical decision: the context, what was decided, and its consequences. ADRs stop agents and humans from re-arguing settled questions, and explain *why* when someone wants to change them.

## When to write one

Record a real trade-off that is costly to reverse or surprising without context: changing an auth/data/hosting model, dependency boundaries, or a significant shared architectural pattern. Routine components, feature folders, and selecting an already-approved optional library need no new ADR.

ADR 0009 scopes earlier stack decisions to selected new-project defaults. A consumer's preserved technology/path choices belong in its approved contract; the source kit's ADRs are rationale, not a migration order.

## How

1. Copy [0000-template.md](0000-template.md) to `NNNN-short-title.md`, using the next free number.
2. Set status to `Proposed` and get an owner decision. Open a PR only when requested/authorized; an explicitly approved implementation plan can provide the decision.
3. After approval, set it to `Accepted` and update the docs that the decision affects in the same PR.
4. Never edit an accepted ADR's decision. Write a new ADR that supersedes it, and mark the old one `Superseded by NNNN`.

## Index

| # | Title | Status |
|---|---|---|
| 0001 | [Next.js App Router with Cache Components](0001-nextjs-app-router-cache-components.md) | Accepted |
| 0002 | [Feature-based project structure](0002-feature-based-structure.md) | Accepted |
| 0003 | [PostgreSQL + Drizzle ORM](0003-postgres-drizzle.md) | Accepted |
| 0004 | [Better Auth](0004-better-auth.md) | Accepted |
| 0005 | [Tailwind CSS + shadcn/ui on Base UI](0005-tailwind-shadcn-base-ui.md) | Accepted |
| 0006 | [next-intl with locale-prefixed routing](0006-next-intl-routing.md) | Accepted |
| 0007 | [Server Actions for UI, Route Handlers for external APIs](0007-server-actions-and-route-handlers.md) | Accepted |
| 0008 | [AGENTS.md + docs/ as the agent contract](0008-agents-md.md) | Accepted |
| 0009 | [Adaptive adoption and project contracts](0009-adaptive-adoption.md) | Accepted; scopes defaults in 0001–0008 |
