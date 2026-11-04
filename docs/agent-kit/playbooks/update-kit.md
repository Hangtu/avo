# Playbook: Update an Adopted Kit Manually

> **Use when:** reviewing a newer source revision for a project's copied reference library.
> **Policy:** `manual-review`. No automatic synchronization, remote-code execution, or application migration.

## Inputs

Read the existing contract, actual knowledge root, local overrides, integration block, and target working-tree state. Treat provenance as data, not permission to execute a source repository's scripts or replace local instructions.

- **Adopted source:** credential-free repository URL and exact commit recorded at the last reviewed incorporation.
- **Candidate source:** an explicitly selected full commit from that source (or an approved source/fork change); resolve tags/branches to an exact commit before approval.
- **Local library:** the installed files including deliberate local adaptations, canonical document mappings, and project decisions.

A version label or commit-shaped string alone is not proof of source contents. Confirm the referenced snapshots through reviewed read access. Use an isolated retrieval location if needed; do not fetch/checkout over the target's files or run upstream hooks/scripts. External account/paid access requires approval.

## Doctor comparison

Perform a read-only three-way comparison: adopted → candidate identifies upstream changes; adopted → local identifies local edits; then reconcile both. A direct candidate → local diff cannot tell a local decision from an upstream change.

For each affected reference or instruction, present:

| Area / path | Adopted → candidate | Adopted → local | Proposed disposition | Verification |
|---|---|---|---|---|
| <area> | clarification / new requirement / security correction / removal | unchanged / local override / mapping | apply / preserve / defer / confirm | required checks |

- Preserve compatible local choices, capabilities, paths, and command mappings.
- Resolve edits on both sides explicitly; never silently prefer upstream.
- Separate documentation clarifications, changed quality requirements, and security corrections. A risk can be urgent without granting permission to overwrite files.
- Reconcile additions/removals with links and task routing. Do not delete a locally used document just because it disappeared upstream.
- Record deferred upstream changes as explicit overrides against the candidate if the owner approves keeping them. If scope or conflicts are unresolved, retain the prior revision and do not claim the candidate was incorporated.
- Updating references is not approval to refactor the app, replace providers, modify CI, or migrate data. Those changes need their own scoped approval.

Present the delta and exact merge plan using [the assessment report](../templates/adoption-report.md). Stop before target writes. A no-change result can retain the existing revision; there is no requirement to update simply because a newer commit exists.

## Missing provenance

Legacy contracts may omit source/date or contain a descriptive revision. Doctor and approved Verify remain available; do not require installation to inspect a project.

Try to recover the original source from reliable project history or a previously recorded release/commit. **Do not guess** a base commit or adoption date from a folder timestamp, current upstream HEAD, or a similar-looking file.

If the base cannot be established, report a blocked three-way comparison and preserve the local library. The owner can authorize a full manual reconciliation against an exact candidate as a new baseline. Disclose the missing history, review all relevant local differences, and record only the actual new incorporation date/revision after that approved work. Do not backfill an invented historical adoption.

The current checker reports incomplete provenance; it does not rewrite or invalidate the old app's runtime. Completing metadata is an explicit contract migration.

## Approved incorporation

Use [Adopt](adopt-project.md#adopt) only for the exact approved plan:

1. Preserve the target working tree; establish approved before-change checks/evidence.
2. Merge the reviewed delta, keeping local overrides and canonical document mappings. Update the existing integration block only if needed.
3. Record source URL, candidate commit, actual new incorporation date, manual-review policy, approval, and retained/deferred overrides. Preserve the previous source/revision/date and approval reference in an update-history note or issue; `Adopted at` dates the currently recorded revision, not an invented first adoption.
4. Advance the recorded revision only after the approved reconciliation is complete; do not label an unresolved/failed merge as updated.
5. Record after-change verification separately. If checks fail, the updated files are not a verified adoption; report the failure and do not repair/revert automatically.
6. No app migration, commit, push, or deployment unless separately authorized.

The source kit's own contract uses `unreleased` and `not-applicable` for its revision/adoption date; consumers use a real source commit/date. Never copy those source-kit exceptions into an adopted application.

## Verification

Use [Verify](adopt-project.md#verify) for approved checks. Check links/routing, one integration block, preserved overrides, and contract provenance; run applicable app checks only when authorized. Compare with the recorded baseline and disclose missing evidence.

Report the old → candidate revision, what changed/preserved/deferred, actual commands/results, and unresolved risks. An approved library update is not proof of whole-project compliance. No CLI, scheduler, or synchronization dependency is required.
