# Spec: Adaptive adoption MVP

- **Status:** Implemented (kit scope; application validation remains pending)
- **Owner:** kit maintainers
- **Approval:** the user approved the diagnostic-first proposal and requested implementation.
- **Scope:** this documentation kit, not an application bootstrap or a migration of a consumer project.

## Objective

Make this Next.js standards kit useful both for a new application and for an existing, inconsistent application. An agent diagnoses first, agrees on applicability and permissions, then incorporates the kit without replacing valid architecture or overwriting project instructions.

## In scope

- README onboarding and a read-only adoption playbook.
- A small project contract recording capabilities, actual paths, verification commands, approval, and deferred work.
- Universal safety/quality requirements, conditional technical recipes, and explicit new-project defaults.
- Incremental adoption, baseline failures, non-destructive merges, and repeatable re-adoption.
- Proportional feature planning and a minimal monolingual landing path.
- Dependency-free checks and regression tests for the kit; separate generated-app CI instructions.
- Correct the previously identified unsafe JSON-LD instruction and contradictory reference contracts.

## Out of scope

- A scaffolding CLI, automatic migration engine, profiles framework, or installed third-party skills.
- Changing a consumer application's stack, authentication, database, or production infrastructure.
- Claiming that documentation checks prove a generated app builds, is WCAG-conformant, or is production-ready.

## Acceptance criteria

1. Reading README directs an agent to inspect before copying, and requires approval before writes, installs, configuration changes, or migrations.
2. Existing AGENTS/CLAUDE files, docs, lockfiles, and CI are merged or preserved, never blindly replaced. Re-adoption updates the same contract and integration block.
3. Kit maintenance is distinct from application work; a missing or present package.json alone never triggers bootstrap.
4. New apps use the preferred stack only for approved capabilities. A monolingual landing needs neither auth, DB, locale routes, analytics, nor unused providers.
5. Existing compatible implementations can remain. Unknown facts are not treated as inactive capabilities, and security findings are not excused as preferences.
6. SEO applies to indexable public content; accessibility applies to UI; auth, DB, i18n, caching, and API rules apply to their actual responsibilities.
7. Feature files and specs scale with the task. ADRs record consequential trade-offs, not every folder or routine component.
8. Tests cover broken references, duplicate rule IDs, context states, and the docs-only CI regression. The checker is read-only and needs no npm installation.
9. A scenario checklist covers a landing, an authenticated app, and an existing application. Record unexecuted bootstrap/browser checks honestly.

## Verification

- `node scripts/verify-kit.mjs`: syntax checks, documentation/context validation, Node built-in tests.
- `pnpm verify`: attempt as required by the current contract; report unavailable tooling rather than installing globally or claiming success.
- Self-review the complete diff and run `git diff --check`.
- Full generated-app bootstrap, build, E2E, and manual UI checks remain separate evidence, not inferred from kit tests.

## Implementation slices

1. Add regression tests and the adoption contract/playbook.
2. Align the entry point, architecture, workflow, feature/page recipes, and conditional bootstrap.
3. Separate kit and application CI, correct reference inconsistencies, run checks, and record remaining validation work.

## Implementation evidence

- Working tree based on `1a3c408`; no commit/push or consumer-app migration performed.
- Local runtime: Node.js v25.8.0. `node scripts/verify-kit.mjs` passes: 28 tests, 79 Markdown files, 234 local references, and 377 unique normative rule IDs.
- Regression failures were observed before fixing docs-only CI, bootstrap detection, JSON-LD escaping, mutation/query reference contracts, CRLF handling, external contract symlinks, and Unicode documentation paths.
- `git diff --check` passes. Ruby's YAML safe loader accepts root CI, Dependabot, and the optional hook recipe (syntax evidence, not a GitHub execution).
- `pnpm verify` was attempted and could not start: pnpm is not installed. This kit intentionally has no app manifest; its runnable check is the Node entry point.
- The Node 22/26 CI matrix is configured, not remotely executed in this session. No generated-app build/E2E, full framework-snippet typecheck, or manual application UI/accessibility review was executed.

## Next validation step

Run the three application/adoption scenarios in [kit validation](../quality/kit-validation.md#application-validation-scenarios) in isolated target projects and record actual package versions and outcomes. Do not initialize a consumer app in this source-kit worktree or mark those scenarios passed from the contract fixtures.
