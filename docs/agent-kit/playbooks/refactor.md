# Playbook: Refactor

> **Use when:** improving structure without changing behavior. **Ask first** if the refactor touches more than ~10 files or wasn't requested.

## Steps

1. **State the goal** in one sentence: what gets better (duplication removed, boundary fixed, file split, naming aligned with the docs).
2. **Lock in behavior.** Make sure tests cover the code you'll touch. If they don't, add characterization tests first. Keep them separately reviewable; commit only when authorized.
3. **Small steps.** Separate moves/renames, structural changes, and cleanup. Each step passes the contract's checks and preserves behavior; separate commits are optional and require authorization.
4. **No behavior changes.** Don't fix bugs, change UI, or alter APIs in the same change. Note them for follow-up instead.
5. **Follow applicable standards and the approved migration boundary.** Preserve compatible existing decisions; do not modernize unrelated areas. If a convention changes, update its owning doc (AGENT-1) within the approved scope.
6. **Mind the public contracts.** Exported names used across features, URLs, API responses, DB schema, i18n keys and analytics event names change only with a migration plan.

## Verify

Run the contract's checks, build/affected E2E for app changes, and relevant before/after performance checks. Kit work uses `node scripts/verify-kit.mjs`. Record baseline debt and new regressions separately; do not claim a whole legacy repo compliant.

## Done when

Same behavior, better structure, all checks green, and the diff is easy to review (moves separated from edits).
