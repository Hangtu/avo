# Feature Specs

Specs for multi-part features and risky changes, at the contract's actual spec path. Small/static tasks can use a short conversational plan and acceptance criteria. Create appropriately scoped specs from [the template](../templates/feature-spec.md); a spec need not correspond to an application feature folder.

## Lifecycle

`Draft` (agent or human writes it) → `Approved` (a human agrees with scope and acceptance criteria) → `In progress` → `Implemented` (matches what shipped).

## Rules

- Write a proportionate spec **before** implementation when the task needs one ([add-feature.md](../playbooks/add-feature.md)). User approval of a specific plan need not be requested a second time.
- Keep it current: when behavior or scope changes, update the spec in the same PR (AGENT-3).
- A spec describes **what and why**, plus the key technical decisions (data model, access rules). The code is the source of truth for the details.

## Index

| Spec | Status |
|---|---|
| [Adaptive adoption MVP](adaptive-adoption-mvp.md) | Implemented (kit); app scenarios pending |
| [Actionable reports, operations, and updates](doctor-operations-and-updates.md) | Implemented (kit); real operation/update exercises pending |
| [Repository presentation and community essentials](repository-presentation.md) | Implemented (local); GitHub settings pending |
