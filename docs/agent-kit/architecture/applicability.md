# Applicability and Project Contracts

> **Read when:** adopting the kit, choosing which rules apply, or resolving a conflict with existing code.

## Three kinds of guidance

- **Universal requirements:** protect secrets, validate untrusted inputs, enforce private-data authorization, preserve behavior, and report verification honestly.
- **Conditional requirements:** mandatory when the relevant surface exists. Accessibility governs UI; SEO governs indexable public pages; i18n governs selected multi-language behavior.
- **Preferences and recipes:** the preferred libraries, paths, helpers, and snippets for new apps. An approved existing implementation can satisfy the same requirement differently.

`MUST` and `SHOULD` express strength **within the applicable scope**, not a requirement to install that scope. Documentation examples never activate a capability.

## Resolve applicability

1. Read the approved [project contract](../project-context.md) (or its relocated path).
2. Identify what the current task touches, not merely what dependencies happen to be installed.
3. Load the relevant standards; adapt recipe paths and tools to the approved contract.
4. If a required capability is inactive or unknown, propose the contract change before adding infrastructure.
5. Surface unresolved conflicts. Do not silently override project decisions or downgrade safety requirements.

For this repository, mode `kit` means maintain documentation and checks, not build an app. For target projects, mode `new` or `existing` and status `approved` must be explicit. A package.json can describe tooling or one package in a workspace; its existence alone is not evidence of an initialized app. Doctor/Adopt/Verify are operations per request, not additional project modes. Doctor and approved Verify do not require adopting this library.

## Capability map

| Capability | When active | Relevant guidance |
|---|---|---|
| ui | The app renders a user interface | React, styling, accessibility, performance |
| public-pages | Content is intended to be publicly indexed | SEO, sitemap, appropriate structured data |
| forms | Users submit or mutate data | Validation, accessible errors, actions, abuse controls |
| database | The product needs persisted data | DB boundary, schema, queries, migrations |
| auth | Identity or private access is required | Session lifecycle, authorization, isolation tests |
| i18n | Multiple languages are required | Catalogs, localized navigation, hreflang |
| url-state | Filters/navigation need shareable URL state | URL parsers; nuqs when justified |
| analytics | Product measurement is approved | Privacy, consent, events, selected providers |
| shared-cache | Shared data benefits from cross-request caching | Cache lifetime, keys/tags, invalidation |
| external-api | External consumers, webhooks, or jobs use HTTP | API contracts, credentials/signatures, idempotency |

These are onboarding decisions, not runtime feature flags or an exhaustive product taxonomy. Keep the standard table keys for validation; record additional product-specific capabilities in the contract's conventions/product links. Email, uploads, payments, and tenancy require their own requirements and review; no generic SaaS preset enables them.

`inactive` means not needed in the agreed scope, not forbidden forever. `unknown` means not inspected/decided, not absent. Approved contracts resolve all listed states, while allowing an explicitly approved limited adoption outside the kit's primary compatibility scope.

## Paths and existing tools

The contract owns paths for routes, feature code, data access, specs, ADRs, glossary, and checks. This library's literal `src/`, `messages/`, `drizzle/`, and `docs/specs/` examples are defaults.

For a monolingual app:
- Keep `src/app/layout.tsx`; no `[locale]`, locale middleware, message checker, or next-intl provider.
- Use `next/link` and `next/navigation`; accessible monolingual copy is valid.
- Use metadata exports for static metadata; `generateMetadata` only when dynamic values require it.
- Public content still needs meaningful titles/descriptions, canonical URLs, social metadata, sitemap coverage, and truthful structured data when relevant.

For an existing app:
- Preserve working libraries, package manager, design primitives, route shape, and error/mutation boundaries unless a migration is approved.
- A preference mismatch is not a blocker; a security defect is.
- Do not lower strictness, delete tests, or blanket-ignore legacy paths to conceal a failing baseline.
- Record debt and agree a first touched area. Use characterization tests before structural changes.
- Adopt compatible standards without claiming the untouched codebase is compliant.

## Provenance and changes to standards

Consumer contracts identify the reviewed source repository, exact commit, real incorporation date, and manual-review policy. The source kit uses explicit unreleased/not-applicable values rather than a self-referential commit/date. Pending/legacy provenance must not be silently filled.

Use [manual three-way review](../playbooks/update-kit.md) for changes to the copied library. Preserve local overrides and distinguish changed reference guidance from authorized application migrations.

## Verification and authority

The approved project contract resolves stack/path preferences, not permission to bypass security, user instructions, or host safety constraints. Existing local instruction files must be reconciled during adoption.

Commands are discovered from the target repository, not copied from examples. `pnpm verify` is the convention for new apps; `node scripts/verify-kit.mjs` checks this kit only.

Automated checks, manual UI review, and production/field measurements are different evidence. Report their status separately. Never infer WCAG conformance from axe alone or production readiness from a Markdown checker.
