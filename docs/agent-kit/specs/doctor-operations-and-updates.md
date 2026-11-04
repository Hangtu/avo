# Spec: Actionable reports, explicit operations, and manual kit updates

- **Status:** Implemented
- **Approval:** the user explicitly requested the three proposed improvements.
- **Project contract:** [kit context](../project-context.md)
- **Baseline:** `8a3bdc53dc4bfd788cc854478a095631b33f5cb3`; 28 kit tests passing before changes.

## Objective and scope

Extend the existing adoption MVP without a CLI, skills installation, automatic synchronization, or new dependencies. Make findings actionable, distinguish the requested operation from project mode, and retain reliable provenance for manually reviewed updates.

## Acceptance criteria

1. The report separates disposition from finding status/priority; includes evidence, impact, confidence, and next action; allows explicit preservation and no-change conclusions. Effort estimates are optional and never invented.
2. README exposes Doctor, Adopt, and Verify as independent entry points in the same playbook. Doctor stops after a read-only report; an approved contract is not authorization to adopt. Verify runs only approved checks, never repairs; expected build/test artifacts are disclosed.
3. Project `Mode` remains kit/new/existing/undecided. Operation is per request, not another persistent mode or implicit state transition.
4. Consumer contracts record a credential-free source URL, exact commit ID, real adoption date, and manual-review policy. Proposed contracts can remain pending; the source kit explicitly has no adoption date/self-referential commit.
5. Updates compare the last adopted source, candidate source, and local library. Local overrides are preserved; changed requirements and application migrations need explicit approval. Missing legacy provenance is reported, never guessed.
6. Provenance validation is deterministic/offline and tested for missing fields, unsafe URLs, moving revisions, invalid dates, and unsupported update policies. It does not claim to prove that a commit exists or a user actually approved it.
7. Existing reference relocation and baseline tests still pass. Application/bootstrap/agent-evaluation scenarios remain pending and are not replaced by structural assertions.

## Implementation plan

- Update the report template and the existing adoption playbook; add one manual-update playbook.
- Link operation entry points and update guidance from README, AGENTS, workflow, and indexes.
- Extend the existing Markdown context format/validator and fixtures; preserve field names and project-mode semantics.
- Add regression tests before behavior changes, then run the kit verifier and self-review.

## Verification

- `node scripts/verify-kit.mjs` and `git diff --check`.
- Attempt `pnpm verify` as required by the inherited instructions; report unavailable tooling rather than installing it.
- No application changes, deployments, external-service calls, commits, or pushes authorized by this task.

## Implementation evidence

- Added explicit Doctor/Adopt/Verify entry points and stop boundaries in the existing shared playbook; no new persistent project modes or installed skills.
- Extended the report with independent decisions and findings, explicit no-change outcomes, priority/status/evidence/impact/confidence/next action, and optional effort.
- Added manual three-way update guidance and offline provenance validation. Consumer fixtures contain fictional commit/date metadata for syntax testing, not real adoption evidence.
- Observed failing tests for missing provenance, moving revisions, invalid dates, unsafe source URLs, and missing operation/report/update contracts before implementation.
- Local Node.js v25.8.0: `node scripts/verify-kit.mjs` passes all 46 tests; `git diff --check` passes.
- `pnpm verify` was attempted but pnpm is unavailable. The kit intentionally uses the dependency-free Node verifier; no tool was installed to bypass that limitation.
- Application runtime, real three-way update execution, agent judgments/permission behavior, and remote CI were not exercised. The scenarios in [kit validation](../quality/kit-validation.md) remain pending.
