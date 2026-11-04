# 0009. Adopt standards through an approved project contract

- **Status:** Accepted
- **Deciders:** repository owner, by approval of the adaptive-adoption proposal

## Context

The kit's original full-stack bootstrap and unconditional rules imposed SaaS infrastructure on simple pages and conflicted with compatible existing applications. Missing manifests also made kit maintenance indistinguishable from app initialization.

## Decision

Diagnose first, record evidence and applicability, obtain approval, then incorporate non-destructively. Keep one small project contract and a task-routed reference library. Mode is explicitly kit/new/existing; package.json is not a bootstrap trigger.

Universal safety and quality requirements remain binding. Stack-specific recipes and ADRs 0001–0008 describe new-project defaults or selected capabilities, not automatic migrations of a consumer app. This decision supersedes their blanket applicability, not their underlying technical rationale.

No generator CLI or profile framework. Two onboarding flows share the same standards. Create feature files and specs proportionally; ADRs describe expensive or surprising trade-offs rather than routine folders.

Kit validation uses built-in Node scripts/tests, with no dependency manifest. Root CI checks the kit; applications adopt their own capability-aware CI after approval.

## Consequences

- A monolingual landing can omit auth, DB, translations, analytics, and unused providers.
- Existing tools/paths can remain, but authorization defects cannot be dismissed as preferences.
- A library/context boundary must be maintained and tested; documentation checks do not prove generated-app runtime behavior.
- Re-adoption merges the same integration instead of introducing competing policies.

## Alternatives considered

| Option | Why not |
|---|---|
| Full-stack installation everywhere | Adds unrelated infrastructure and migration risk |
| Independent landing/web-app/SaaS frameworks | Duplicates standards and makes evolution harder |
| Copy selected paragraphs automatically | Loses context and creates policy drift |
| Automatic legacy migration | Too much risk and scope for this MVP |

## Enforcement

[Adoption](../../playbooks/adopt-project.md), [applicability](../applicability.md), project-contract validation, regression tests, and `node scripts/verify-kit.mjs`. See [the implementation spec](../../specs/adaptive-adoption-mvp.md).
