# Playbook: Code Review

> **Use when:** reviewing a PR, or self-reviewing your own diff before reporting "done". Any agent can run this as a reviewer: read the diff, don't edit, report findings.

## Procedure

1. **Context:** read the PR description, linked spec or issue, and acceptance criteria.
2. **Diff:** `git diff main...HEAD` (or the PR diff). For each changed file, open enough surrounding code to understand it.
3. **Check two axes independently:** standards and requested acceptance criteria. Within applicable categories below, cite the rule/source and evidence. Distinguish hard violations from maintainability heuristics; a different approved library is not a defect.
4. **Run only reviewed, approved checks** permitted by the requested operation (kit: `node scripts/verify-kit.mjs`; app: agreed checks/build/affected E2E). Doctor executes no project scripts/checks; without execution authorization, report checks as not-run and request permission. Record existing failures, missing tooling, and manual-review gaps separately.
5. **Report** in the format at the end. Approve only with zero blockers and zero majors.

## Checklist by category

| Category | Look for | Rules |
|---|---|---|
| **Correctness** | Meets acceptance criteria; edge cases (empty, null, long, concurrent, double submit); error paths handled | ERR-*, ACT-8 |
| **Security** | Auth + authorization in the data layer; Zod validation; no IDOR; no secrets/PII leaks; rate limits; safe redirects; SSRF | SEC-*, AUTH-*, DATA-2 |
| **Data** | Migration reviewed and backward compatible; indexes; no N+1; transactions; limits | DB-* |
| **Caching** | Shared caches never hold per-user data; tags defined and invalidated; `<Suspense>` placement | DATA-4…9 |
| **Architecture** | Files in the right place; no cross-feature imports; thin routes; server-only respected; consequential boundary changes recorded; no speculative layers | ARCH-*, STYLE-5 |
| **React** | Server-first; small client leaves; no effects for derived state; keys; all UI states | RC-*, STATE-* |
| **Types** | No `any`/`!`/unsafe `as`; discriminated unions; types derived from schemas/DB | TS-* |
| **Accessibility** | Semantics, names, keyboard, focus, contrast, target size, forms | A11Y-*, FORM-* |
| **i18n** (when active) | Keys in selected locales; ICU; formatters; locale navigation; logical CSS | I18N-*, CSS-6 |
| **SEO** (public pages) | Metadata, canonical, hreflang, sitemap, JSON-LD, noindex for private pages | SEO-*, GEO-* |
| **Performance** | Client JS added?; images/fonts; waterfalls; heavy deps lazy-loaded | PERF-* |
| **Tests** | Tests exist for new logic, a regression test for fixes, behavior-focused, deterministic | TEST-* |
| **Naming & style** | Names follow conventions; comments explain why; no dead code | NAME-*, STYLE-* |
| **Docs** | Spec, ADR, `.env.example` and changed conventions updated | AGENT-1…3 |

## Severity

- **blocker:** security hole, data loss/corruption risk, broken build or tests, violates a MUST in security, auth or data rules.
- **major:** violates another applicable MUST, missing tests for new logic, accessibility failure, or incomplete selected i18n. Do not invent an i18n requirement for a monolingual app.
- **minor:** SHOULD-level issue, maintainability concern.
- **nit:** taste; optional.

## Report format

```markdown
**Verdict:** approve | request changes
**Summary:** <1–3 lines>
**Standards:** <applicable rules and findings; separate baseline debt>
**Requirements:** <missing/incorrect behavior or scope creep>

| # | Severity | File:line | Rule | Finding | Suggested fix |
|---|---|---|---|---|---|
| 1 | blocker | src/features/projects/server/mutations.ts:42 | AUTH-21 | Update doesn't scope by ownerId, so any user can archive any project | Resolve the server-owned actor, scope the WHERE by its ID, and check row count |

**Verified:** <commands run + results>
```
