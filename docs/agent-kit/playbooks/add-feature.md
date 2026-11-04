# Playbook: Add a Feature

> **Use when:** adding a capability with its own UI, data, or rules. A visual section can be a feature without a server layer.

## 1. Establish scope

Read the approved project contract, product brief, and relevant existing examples. Determine the acceptance criteria, touched surfaces, and capability changes.

- Small/static change: a short plan in conversation is enough.
- Multi-part feature or risky data/security/integration change: use [the spec template](../templates/feature-spec.md), omit irrelevant sections, and wait for approval unless already authorized.
- Inactive/unknown capability needed? Propose activation and its dependencies/risks first. Do not install the full stack.

Use the contract's actual specs/glossary paths; do not create parallel documents under library example paths.

## 2. Choose the smallest appropriate structure

| Need | Create/use |
|---|---|
| Static/visual section | Component(s), page composition, UI/accessibility checks |
| Repeated domain behavior | Feature folder and public interface |
| External inputs | Zod schema (or preserved validator) and behavior tests |
| Data reads | Server-only queries with explicit public/private policy |
| Data writes | Mutations with data-layer authorization; thin action/API boundary |
| Shared cached reads | Tags/lifetime/invalidation only for actual cache scopes |
| Interactive form | Native form first; React Hook Form for complex field behavior |
| Multiple languages | Existing catalogs and localized navigation |
| External consumers | Reviewed HTTP contract, authentication/signatures, idempotency |

Do not create empty constants/types/hooks/server/cache-tags files. The full [projects reference](../architecture/reference-feature.md) is for an authenticated DB-backed, localized feature, not a template for every section.

## 3. Implement a vertical slice

Start with one observable path and tests at its public boundary, then extend. Use server-first components and the project's tokens/primitives. Add client boundaries only where interactive. Handle states relevant to the actual data/interaction.

Keep routes thin, but simple static markup does not require a speculative feature service. Extract meaningful composition/responsibility boundaries, not files for file count.

For private data, authenticate and authorize in the data layer; public reads/submissions need an explicit policy, not a fake signed-in user. Keep transport error handling consistent with the approved project's action/API boundaries.

## 4. Apply cross-cutting quality

- **UI:** [accessibility](../quality/accessibility.md), keyboard/focus, labels, contrast, responsive layout.
- **Indexable pages:** [page playbook](add-page.md) and [SEO](../discoverability/seo.md); private areas get noindex instead.
- **i18n active:** all selected locales, formatters, and locale navigation. Otherwise normal Next navigation and coherent monolingual copy.
- **Analytics:** only previously approved events/providers; no personal data.
- **Persistence/cache/API:** relevant server standards, not unused infrastructure.

## 5. Verify, review, and leave state

Run focused tests, the contract's full checks, build/affected E2E where relevant, and manual UI review. Existing failures remain visible and separate from new regressions.

Review both standards and requirements using [code review](code-review.md). Update the spec/issue status, glossary if terminology changed, and project context if capabilities or conventions changed. Report checks, limitations, deferred work, and the next step.

Complete the applicable [Definition of Done](../workflow/definition-of-done.md). Do not commit/push unless authorized.
