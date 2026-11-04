# Project Context

- **Status:** proposed
- **Mode:** undecided
- **Kit source:** https://github.com/Hangtu/agentic-nextjs-template
- **Kit revision:** pending
- **Adopted at:** pending
- **Update policy:** manual-review
- **Knowledge root:** docs/agent-kit
- **Approval:** pending

Status is `proposed` or `approved`. Mode is `kit`, `new`, `existing`, or `undecided` while diagnosing. Doctor/Adopt/Verify are request operations, not project modes; an approved contract is not permission for a new operation. Paths are relative to the target repository, not to this document. This is a decision record, not an executable configuration.

## Kit provenance and updates

Keep header values plain (no inline backticks). The owner approves the proposed plan in conversation before target writes; pending provenance does not authorize incorporation. Store these final values only after the approved library merge is in place:
- Record the reviewed source repository URL over HTTPS, without credentials, query, or fragment. Forks are valid when explicitly chosen; the field is not a fetch/execution instruction.
- Record the full source commit ID (40 or 64 hex characters), not a tag, branch, short ID, or guessed revision. Confirm actual source contents; syntax validation alone cannot do this.
- Set the real `YYYY-MM-DD` incorporation date of the currently recorded revision only when the approved library merge is in place. Keep prior revision/date values in update history. Proposed contracts may keep `pending`; do not fabricate a past or first-adoption date.
- Keep `manual-review` as the update policy. Compare adopted source, candidate source, and local overrides through [the update playbook](../playbooks/update-kit.md). Updating references does not authorize an app migration.

For the source kit itself only, mode `kit` uses `Kit revision: unreleased` and `Adopted at: not-applicable`, rather than inventing a self-referential source commit/date. Do not copy these exceptions into a consumer. Older contracts with missing provenance remain inspectable; report gaps and explicitly migrate metadata rather than guessing it.

## Product and compatibility

Link the product brief; record observed framework/runtime versions and the supported, limited, or unsupported assessment. Identify evidence and unknowns separately. Do not record secrets or real user data.

## Capabilities

| Capability | State | Decision / evidence |
|---|---|---|
| ui | unknown | Inspect routes and components |
| public-pages | unknown | Confirm intended indexing, not just authentication absence |
| forms | unknown | Inspect submission/mutation paths |
| database | unknown | Inspect persistence requirements and adapters |
| auth | unknown | Inspect identity and private-data boundaries |
| i18n | unknown | Inspect languages and confirm requirements |
| url-state | unknown | Inspect shareable state requirements |
| analytics | unknown | Confirm measurement and privacy decisions |
| shared-cache | unknown | Inspect rendering configuration and actual cache use |
| external-api | unknown | Inspect consumers, webhooks, and jobs |

States: `active`, `inactive`, `unknown`. Resolve unknowns before approval; active does not mean the implementation is already correct.

## Conventions

Record actual paths for routes, feature/UI code, server/data access, specs, ADRs, glossary, and the instruction entry point. Record tools to preserve, new-project defaults selected, allowed migration scope, and the safe example to mirror. Do not duplicate existing product/architecture docs.

## Verification

| Check | Command | Baseline / result |
|---|---|---|
| Repository checks | Not yet inspected | Not run |

List exact approved commands for typecheck, lint, format, tests, build, E2E, and manual UI review. If unavailable or failing, record why, evidence, and a follow-up; do not invent a passing command. Reviewing a package script is not permission to execute unknown scripts during diagnosis.

## Deferred work

Link risks, baseline failures, migration tasks, and owner decisions. Identify serious security issues explicitly rather than excusing them as legacy preferences.

## Current work

Link the spec/issue; record the current revision, last verification, blockers, and the next concrete step. Handoffs reference this state and existing artifacts rather than replacing them with a temporary chat summary.
