# Agent Workflow

> **Read when:** starting work and before reporting completion.

## Start with the contract

Read the active project-context path if one exists. Choose the requested [Doctor / Adopt / Verify operation](../playbooks/adopt-project.md); these do not change project mode. Doctor and explicitly authorized Verify work without installation/approval of a contract. Missing context never triggers bootstrap or authorizes incorporation.

This repo's contract is [kit mode](../project-context.md). For a consumer, the approved contract supplies real paths, tools, capabilities, and verification commands. Library defaults do not override preserved project choices. See [applicability](../architecture/applicability.md).

User instructions and host safety constraints remain binding. Conflicts between local instructions, the approved contract, docs, and code must be surfaced, not silently resolved by whichever file the agent read last.

## The loop

The loop below is for approved implementation work. Doctor stops at its report; Verify stops at evidence and never repairs. An approved contract or diagnostic finding does not authorize a transition into implementation. A user can explicitly approve a sequence, including before/after checks.

1. **Orient.** Load task-relevant docs and inspect the closest safe existing example. Distinguish evidence from assumptions. Check installed versions and version-matched docs for uncertain APIs.
2. **Clarify.** Ask about decisions, not facts you can inspect. Batch at most five initial questions, each with a recommendation; ask a further focused round only for blockers.
3. **Plan proportionally.**
   - Trivial/static edits: act within the approved scope and verify the affected surface.
   - Small behavior changes: state acceptance criteria, files, and tests.
   - Multi-part features or risky changes: create a spec using [the template](../templates/feature-spec.md), omit irrelevant sections, and wait for approval unless the user already authorized that plan.
4. **Implement in vertical slices.** One observable behavior, its tests, then the next. Keep the code compiling; create only needed layers. Bugs start with an executed reproduction and a failing regression test before the fix.
5. **Verify.** Use the contract's focused checks during work and full agreed checks before completion. Run affected E2E and manual UI checks where relevant. Record pre-existing failures separately; do not weaken checks.
6. **Review on two axes.** Does it meet standards? Does it implement the requested behavior without extra scope? Use [code review](../playbooks/code-review.md).
7. **Report evidence and next steps.** Never claim success from inspection alone.

## Verification contexts

- Kit: `node scripts/verify-kit.mjs` and `git diff --check`.
- Approved new app: `pnpm verify`, build, affected E2E, manual UI review.
- Existing app: exact approved commands and baseline; report missing tooling instead of inventing scripts.
- UI: applicable locales, supported viewports/themes, keyboard/focus, contrast, and meaningful content states. Axe alone is not a WCAG conformance claim.

A diagnosis is read-only: do not run unknown package scripts, installs, or databases just to gather a baseline. Review commands and obtain approval first. A later implementation plan may authorize its listed verification steps.

## Boundaries

**Always:** scoped changes, tests for changed behavior, protected existing work, updated owning docs, honest evidence.

**Ask first:** dependencies, security/auth policy, destructive data changes, CI/build/lint/TS configuration, large migrations/deletion, external/paid operations, and commits/pushes/PRs. A request to implement a plan covers its named steps, not unrelated actions.

**Never:** secrets/PII in artifacts or logs; bypasses or weakened checks; hand-edited lockfiles/applied migrations; destructive non-local DB commands; fake production success; overwriting project instructions during adoption.

Small verified increments do not imply permission to commit each one.

## When blocked

After three unsuccessful attempts at the same problem, stop and state the symptom, falsifiable hypotheses, what ran, and what access/decision is needed. Do not make speculative fixes without a reproducible feedback loop.

## Keeping knowledge useful

- **AGENT-1 (MUST)** Update the owning doc when a convention, command, or dependency changes.
- **AGENT-2 (MUST)** Record consequential, difficult-to-reverse trade-offs as ADRs. Routine files/components need no ADR.
- **AGENT-3 (MUST)** Keep specs/issues and project context aligned with approved scope and actual results. Consumer provenance uses the reviewed source commit and actual incorporation date; [manual updates](../playbooks/update-kit.md) preserve local overrides and do not imply an app migration.

For handoff: record the working revision, scope, approved decisions, last checks, blockers, and next concrete action in durable project artifacts. Link specs/ADRs rather than copying them. A temporary summary is transport, not the source of truth. Redact sensitive content.

## Multiple agents and optional tools

One agent edits a given file at a time. Independent review contexts can assess standards and requirements separately; reviewers report findings instead of editing unless asked.

Browser tooling, version-specific docs tools, and subagents are optional host capabilities, not requirements for reading this kit. If unavailable, describe the alternative/manual check and its limits. Never claim a slash command or MCP integration works merely because the model name is supported.
