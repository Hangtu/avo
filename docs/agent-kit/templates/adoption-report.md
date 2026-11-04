# Project Assessment and Adoption Report

- **Operation:** doctor | adopt | verify (select the requested operation)
- **Target:** repository/package and inspected scope; no secret/private remote URLs
- **Target revision:** commit plus relevant uncommitted changes; evidence must identify the inspected snapshot
- **Project mode:** kit | new | existing | undecided (not the requested operation)
- **Compatibility:** supported | limited | not assessed
- **Evidence coverage:** files/paths inspected, declared versus installed versions, tests actually run
- **Not inspected / unknown:** explicit gaps
- **Changes made:** none for Doctor; only approved changes for Adopt; expected generated artifacts for Verify

This is a scoped assessment, not a health score or an exhaustive audit. Do not manufacture findings to fill the report.

## Findings

Use one card per material finding. Decisions about adoption belong in the separate table below.

### F-01 — <specific observation>

- **Finding status:** confirmed | to-verify | contextual-recommendation
- **Priority:** P0 | P1 | P2 | P3, with an urgency reason; label provisional priority for unverified risk
- **Evidence:** file:line at the inspected revision, relevant call chain, or exact command/result; identify static analysis versus runtime observation
- **Impact:** affected behavior/users/data and why it matters; distinguish demonstrated impact from a possible consequence
- **Confidence:** high | medium | low, with the evidence gap/reason; no invented percentages
- **Next action:** smallest correction or the concrete check needed before proposing one
- **Effort (optional):** small | medium | large | unknown; estimate only with enough scope, never invent hours

### Status and priority rules

- **confirmed:** evidence supports the stated defect. Static analysis can confirm a defect; it does not prove unexecuted browser or performance behavior.
- **to-verify:** a hypothesis or incomplete trace. State what would confirm/refute it. High confidence alone does not make it confirmed.
- **contextual-recommendation:** an optional design trade-off, not a correctness violation.

Priority is urgency, not a global project score:
- **P0:** immediate critical exposure/impact supported by evidence and the actual access policy; not every auth-related observation.
- **P1:** important correctness, security, or accessibility issue to address next.
- **P2:** bounded maintainability or measured optimization work.
- **P3:** optional/contextual improvement.

Trace authorization through the data layer before alleging a private endpoint is unprotected. A route without a visible session check may call a correctly authorized mutation. A Client Component is not, by itself, evidence of a performance regression. Do not claim keyboard behavior without sufficient static/runtime evidence; request an approved browser check when needed.

## Preserve / no change

List inspected areas you would keep, with reasons. **No change recommended within the inspected scope** is a valid conclusion. An approved different ORM, auth provider, or folder layout is not a defect. Uninspected areas remain unknown, not implicitly healthy.

## Adoption decisions

Disposition is independent from finding status/priority. A confirmed issue can be explicitly deferred; a preservation decision needs no defect or urgency label.

| Classification | Area | Evidence / finding ID | Proposed decision / reason |
|---|---|---|---|
| Apply | | | |
| Preserve | | | |
| Defer | | | |
| Not applicable now | | | |
| Confirm | | | |

Include only relevant rows. An inactive capability is not proof that an existing attack surface is absent.

## Questions

Ask at most five initial decision questions with recommendations. Inspect facts yourself. Ask another focused round only for blockers.

## Baseline and verification

| Check / surface | Baseline evidence | Current evidence | Result / limitation |
|---|---|---|---|
| <check> | <revision, command/result or not run> | <revision, command/result or not run> | passed / failed / blocked / not-run |

Doctor lists possible checks without running unknown scripts. Verify runs only reviewed, approved commands; report caches/build/test artifacts and any unexpected source changes. Lack of baseline or execution is not a passing result.

## Incorporation plan for approval — only if adoption is requested

List exact files/sections, preserved configuration, selected contract path, source commit, first normalization area, and any dependency/tool changes. Separate documentation incorporation, app setup, approved checks, and later migrations/services.

**Approval requested:** specify the operation, target revision, and steps being authorized. Show the report in conversation; do not persist it into the target or start incorporation from a Doctor-only request.

## Next step and stop

Doctor stops after the report. Adopt applies only its approved plan. Verify reports evidence without repairs. An already-approved project contract does not authorize a new operation. Re-adoption and updates preserve the same contract/integration instead of creating parallel policies.
