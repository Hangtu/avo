# Playbook: Fix a Bug

## Inputs

A bug report: ideally the [bug template](../templates/bug-report.md) with steps, expected vs actual behavior, environment, and logs/screenshots. If you can't reproduce from the report, ask for the missing details.

## Steps

1. **Reproduce** locally (or with the exact failing input). Write down the minimal reproduction.
2. **Build an executed failing feedback loop first.** Prefer a regression test at a public boundary that reproduces the actual bug, not necessarily the smallest isolated unit. Minimize the case; state hypotheses and change one variable at a time. If reproduction is blocked, report that before speculative fixes.
3. **Find the root cause**, not the symptom. Ask "why" until you reach the actual defect. Check:
   - recent changes (`git log -p` on the involved files);
   - logs and error tracking;
   - assumptions about nulls, time zones, locales, auth state, caching (stale `"use cache"` data, missing `updateTag`).
4. **Fix minimally.** Change only what the root cause requires. Unrelated cleanups go in a separate change.
5. **Check for siblings.** Search for the same pattern elsewhere (same query shape, same helper misuse). Fix them, or list them in the report.
6. **Run** the new test (now passing) and the full suite.

## Verify

Run the contract's checks and original reproduction, now passing. Kit: `node scripts/verify-kit.mjs`. For UI, review selected locales/themes and manual accessibility. Redact captured output and remove temporary debugging instrumentation.

## Report

Include:
- the root cause in one or two sentences;
- the fix;
- the regression test name;
- any similar spots found;
- whether data was affected (and whether a backfill is needed; if so, ask first).
