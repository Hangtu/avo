# Definition of Done

> **Read when:** finishing a task or reviewing a change.
> **Scope:** the active contract and touched behavior. Mark irrelevant items not applicable with a reason; do not claim whole-project compliance from a scoped adoption.

## Intent and structure
- [ ] Acceptance criteria are met; no unrequested migration, feature, or cleanup.
- [ ] Responsibilities and imports follow the approved structure; only necessary files exist.
- [ ] Consequential decisions have ADRs; routine changes do not require one.
- [ ] Existing instructions, configuration, and user work are preserved.
- [ ] The requested operation boundary was respected: Doctor delivered a report without incorporation; Verify ran only approved checks and did not repair source/configuration.

## Verification
- [ ] Check execution stayed within the requested operation's authorization; report commands/results, blocked prerequisites, and not-run checks explicitly.
- [ ] Doctor executed no project scripts/checks; static inspection is not runtime verification. Missing execution authorization is not permission to run checks to complete this list.
- [ ] When authorized, kit work uses `node scripts/verify-kit.mjs`; app work uses its approved checks, not the kit checker as a substitute.
- [ ] New logic has behavior-focused tests. A bug fix includes an executed failing regression before the fix.
- [ ] Changed critical journeys have appropriate E2E coverage; build results are recorded for application changes.
- [ ] Existing failures/debt are distinguished from new regressions; no tests/thresholds were weakened.

## UI and accessibility — when UI changes
- [ ] Relevant loading/empty/error/success/permission states work.
- [ ] Semantics, names/labels, keyboard, visible focus, contrast, and responsive layout were reviewed.
- [ ] Axe scans find no unresolved violations on affected pages; manual review is recorded separately.
- [ ] Selected languages/themes/viewports work; do not invent unused dark-mode or locale requirements.

## Security and privacy — for the surfaces that exist
- [ ] External inputs are validated at their boundaries.
- [ ] Private data operations authenticate and authorize on the server, including other-user/tenant tests.
- [ ] Public access is deliberate; abuse-prone operations have appropriate protections.
- [ ] No secrets/PII leak to clients, logs, URLs, caches, analytics, or error messages.

## Public discoverability — indexable content
- [ ] Appropriate title, description, canonical, social metadata, sitemap, and truthful structured data where relevant.
- [ ] Hreflang/localized metadata only when i18n is active; no fabricated schemas/reviews.
- [ ] Private areas have an appropriate noindex policy. Indexing controls are not access controls.

## Conditional capabilities
- [ ] With i18n: strings/formatters/navigation follow the selected locale strategy and keys exist in every locale.
- [ ] With persistence: queries are scoped/limited/indexed appropriately; generated migrations are reviewed and compatible.
- [ ] With caching: scope/lifetime/invalidation are explicit; no private data in shared caches.
- [ ] With analytics/external providers: approved purpose/privacy and no real external calls in deterministic tests.

## Performance and continuity
- [ ] No unnecessary client JS/providers; appropriate images/fonts; no avoidable waterfalls.
- [ ] Performance changes have comparable before/after evidence; field metrics are not inferred from a local build.
- [ ] Specs, changed conventions, env-variable names, contract decisions, and next steps are current.
- [ ] For consumer incorporation/updates: reviewed source URL/commit, actual date, manual-review policy, and local overrides are recorded; unresolved/failed work is not called verified.
- [ ] The final report states exactly what was verified, what was not, and remaining risks.
