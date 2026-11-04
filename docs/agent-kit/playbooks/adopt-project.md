# Playbook: Doctor, Adopt, and Verify

> **Use when:** inspecting a project, incorporating this kit, or verifying an agreed scope.
> **Default:** Doctor. A diagnosis does not imply installation. These are request operations, not skills, commands, or persistent project modes.

## Choose the operation

| Operation | Purpose | Permission boundary |
|---|---|---|
| Doctor | Inspect and explain applicability/risks | No target writes, installs, application scripts, or service mutations |
| Adopt | Apply an explicit approved incorporation plan | Only listed writes/configuration/setup; no implied migrations |
| Verify | Compare evidence against an agreed baseline | Reviewed approved checks; no repairs or source/config edits |

Project `Mode` remains `kit`, `new`, `existing`, or `undecided`. Operation is selected for the current request, not stored as another mode/state machine. Doctor and Verify can be requested without adopting the kit or creating a project contract. An approved contract is context, not blanket authorization.

User approval can explicitly cover a sequence (for example baseline checks → incorporation → checks). Otherwise stop at the requested operation's boundary; never infer the next operation from the presence of a report or contract.

## Doctor

**Inputs:** target repository/package, inspection scope, and available instructions/source references. No approved adoption contract is required.

**Allowed:** read-only inspection and a report in conversation. Do not save the report into the target, install packages, execute unknown/project application scripts, connect to databases, provision services, or open secret env files.

### Inspect and distinguish facts

1. Identify source and target, working-tree state, and user intent. Read target AGENTS/CLAUDE/workspace instructions first.
2. Distinguish kit maintenance, a new application, and an existing application from intent and actual source, not package.json presence alone.
3. Read manifests/lockfile metadata, runtime/config files, routes, representative UI/data/mutation code, tests, docs, and CI. Use `.env.example` for names only.
4. Inspect public indexing, private-data authorization, persistence, forms, languages, URL state, cache scope, external consumers, and privacy. Trace relevant call chains; a missing route-level auth check alone is not a defect.
5. Identify actual paths, safe patterns to preserve, verification commands, and existing evidence of failures. Separate observed facts, assumptions, and unknowns.
6. State compatibility and sampling limits. Primary scope is Next.js App Router; Pages Router/other frameworks/unverified versions get a limited assessment, not a rewrite.

### Report, ask, and stop

Use [the assessment template](../templates/adoption-report.md). Separate findings (status/priority/evidence/impact/confidence/next action) from apply/preserve/defer decisions. Prefer “no change recommended” to a speculative migration. Do not turn static observations into unmeasured runtime/performance claims.

Ask at most five initial decision questions with recommendations. If adoption is requested, show a proposed capability/paths/file-by-file plan; resolve unknown capability decisions before approving that contract. If only diagnosis is requested, do not require incorporation to finish the assessment.

A test/browser check needed to confirm a hypothesis is a proposed Verify step, not permission to run or fix anything during Doctor.

**Stop:** deliver the report, questions, and optional plan, then wait. Doctor never automatically proceeds to Adopt or Verify.

## Adopt

**Inputs:** an explicit approved plan identifying the target snapshot, scope, contract/library paths, and allowed writes/setup/checks. Diagnosis findings alone or an already-approved contract are insufficient.

**Allowed:** apply only that plan. Dependency, security/auth, configuration, DB, external-service, and Git operations require their own listed authorization. Changed target state or new conflicts require review before expanding scope.

### Preserve and incorporate

1. Check that the approved plan still matches the target and uncommitted work. If baseline checks are authorized, run the Verify protocol **before** changes; record failures or ask about proceeding with a disclosed limited baseline.
2. Agree the knowledge root: new apps can use `docs/`; existing apps default to an unused `docs/agent-kit/`, or reuse their previous location.
3. Use a reviewed exact source commit, not a moving branch/tag. Copy the reference library with its relative tree intact. Copy the source kit’s `LICENSE` (at its repository root) as `<knowledge-root>/LICENSE` so the MIT notice travels with the material; keep the application's license at its repository root and do not relicense application code. If third-party notices are consolidated elsewhere, record that approved destination in the contract. Source-kit context/specs are reference material, not facts about the target.
4. Create/update the target contract from [the template](../templates/project-context.md). Record credential-free source URL, full commit ID, actual incorporation date, `manual-review` policy, approval, capabilities, actual paths/tools/checks, and deferred work. Do not mark incorporation complete or advance provenance before the approved merge is in place.
5. Preserve existing README, AGENTS/CLAUDE, indexes, configs, hooks, CI, manifests, and lockfiles. Merge only approved sections. Never copy this source kit's root CI into an application.
6. Add/update exactly one integration block in the existing instruction entry point:

```markdown
<!-- agent-kit:adoption:start -->
## Engineering kit
Project contract: <repository-relative path to approved project-context.md>.
Read the contract first, then applicable reference docs and the requested operation. Preserve existing instructions and report unresolved conflicts before acting.
<!-- agent-kit:adoption:end -->
```

7. Reconcile conflicting instructions explicitly. Update links/root examples for the knowledge root; preserve canonical glossary/spec/ADR paths. Multiple integration blocks are a conflict, not a reason to append another.
8. New-app bootstrap requires explicit approval of scaffolding/install/config steps. Existing apps retain their stack; normalize only the approved area, with characterization tests before structural changes.
9. Re-adoption presents only the delta and preserves the same contract/block. To change the adopted source revision, follow [manual updates](update-kit.md), including three-way review of local overrides.

**Stop:** report the approved diff, provenance, baseline, and unresolved risks. Run after-change Verify only if authorized as part of the plan; otherwise request those checks and leave verification explicitly pending. No commits, deployments, or migrations are implied.

## Verify

**Inputs:** reviewed approved commands/checks, target scope/snapshot, baseline evidence (or an explicit absence), and expected outputs. A project contract may provide commands but does not itself authorize execution.

**Allowed:** execute only the agreed controls and report results. Expected build caches, test reports, and isolated test fixtures may be produced when disclosed/approved. No repairs, source/config/instruction edits, formatter/linter fix flags, snapshot updates, installs, or production-data operations.

### Compare evidence, not assumptions

1. Inspect command definitions and prerequisites before execution. Missing tooling/services require an approval/request or a blocked result, never an automatic install.
2. Record the target revision and relevant working-tree state; use comparable baseline conditions. If no baseline was executed, report that; a new green check is not proof of no regression.
3. Run focused/full checks according to scope. Keep existing failures separate from new regressions; do not lower thresholds, delete tests, or retry into a misleading green.
4. Review outputs and the diff for unexpected source changes. If a supposedly non-fixing check changes source, stop and report the exact files; do not silently revert user work.
5. Report per-check passed/failed/blocked/not-run, commands, results, expected artifacts, and gaps. Separate static contract checks, build/E2E, manual accessibility, and production measurements.

For incorporation/update work, also review reference links, one integration block/contract, local overrides, and capability decisions. Passing library checks does not make the whole application compliant.

**Stop:** deliver evidence and recommended follow-up only. Fixes or adoption require a separately approved plan; Verify never automatically becomes Adopt.

See [applicability](../architecture/applicability.md) and [agent workflow](../workflow/agent-workflow.md).
