# Playbooks

Task procedures, scoped by the approved project contract and [applicability](../architecture/applicability.md). Apply relevant steps; explain N/A and blocked checks instead of installing unused capabilities. Commands/paths are new-app defaults unless the contract preserves equivalents.

| Task | Playbook |
|---|---|
| Inspect without installing (Doctor) | [adopt-project.md#doctor](adopt-project.md#doctor) |
| Apply an explicitly approved incorporation plan (Adopt) | [adopt-project.md#adopt](adopt-project.md#adopt) |
| Run approved checks without repairs (Verify) | [adopt-project.md#verify](adopt-project.md#verify) |
| Review/update a copied kit manually | [update-kit.md](update-kit.md) |
| Create an explicitly approved new app | [bootstrap-project.md](bootstrap-project.md) |
| Build a new feature ("create feature X") | [add-feature.md](add-feature.md) |
| Add a page or route | [add-page.md](add-page.md) |
| Add an HTTP endpoint, webhook, or cron job | [add-api-endpoint.md](add-api-endpoint.md) |
| Add or change tables or columns | [change-database-schema.md](change-database-schema.md) |
| Add a UI component | [add-ui-component.md](add-ui-component.md) |
| Add translations or a new language | [add-translations-or-locale.md](add-translations-or-locale.md) |
| Fix a bug | [fix-bug.md](fix-bug.md) |
| Refactor without changing behavior | [refactor.md](refactor.md) |
| Upgrade dependencies | [upgrade-dependencies.md](upgrade-dependencies.md) |
| Review a change (your own or someone else's) | [code-review.md](code-review.md) |
| Prepare for production launch | [pre-launch-checklist.md](pre-launch-checklist.md) |

Playbook format: **Use when → Inputs → Steps → Verify → Done when**. When you add a playbook, keep that format and add it to this table and to the routing table in `AGENTS.md`.
