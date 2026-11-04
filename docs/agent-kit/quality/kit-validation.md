# Kit Validation

> **Read when:** changing this kit, its instructions, adoption behavior, or validation scripts.

## Local and CI checks

```bash
node scripts/verify-kit.mjs
```

Requires Node.js 22+ and no third-party dependencies. The command syntax-checks kit scripts, checks local Markdown targets/heading anchors and duplicate normative rule IDs, validates the active/context-template structure, and runs Node's built-in tests. Root CI runs it on the declared runtime matrix.

Tests exercise approved landing, authenticated-app, and existing-project **contract fixtures**, invalid/unknown states, reference errors, and the regression where docs-only CI tried to run an app pipeline. Provenance checks cover credential-free HTTPS sources, exact commit syntax, valid adoption dates, manual-review policy, and explicit source-kit exceptions. Operation/report tests guard documented entry points, boundaries, fields, and the three-way update procedure. Presentation checks verify the license holder/text, self-contained accessible SVGs, PNG dimensions/limits, community files, and issue-form presence.

The checker is read-only. Test cases create and clean isolated temporary fixtures. Neither checker nor tests install dependencies, execute project commands from a contract, scan secret env files, or access a database/network.

## Limits

- This is a small Markdown contract checker, not a complete CommonMark/YAML parser or a semantic audit of every instruction.
- Remote URLs, framework APIs, rendered UI, actual accessibility, real authorization, deployment configuration, and agent behavior are not proved by these tests.
- Fictional contract fixtures (including their commit IDs/dates) are not real adoptions or evidence of a successful bootstrap. Provenance syntax checks do not contact source hosts, prove a commit exists, or prove approval actually happened.
- Operation/report guards validate documentation structure, not model judgment, correct severity assignments, or an agent's actual permission compliance. Manual three-way merge/conflict resolution is not automated by these tests.
- Presentation tests validate file structure and asset dimensions, not visual quality, GitHub’s Markdown rendering, issue-form schema acceptance, badge availability, or remote repository settings. Inspect the rendered README/social preview and GitHub settings manually.
- For relocated libraries, review links and the merged entry point against the target tree; kit-mode checks do not validate the entire consumer repo.
- Test workflow configuration in GitHub as well as locally; do not report a remote run as green without evidence.

## Application validation scenarios

These are release acceptance exercises, **not currently automated by kit CI**. Record the kit revision, exact tool/package versions, commands, outcomes, manual checks, and required intervention. Do not mark a scenario passed without executing it.

| Scenario | Required evidence | Initial status |
|---|---|---|
| New monolingual landing | Approved contract; no DB/auth/i18n/analytics installed unnecessarily; verify/build/E2E; metadata/sitemap; keyboard/focus/responsive/contrast review | Not executed |
| New app with accounts and persistence | Approved auth/DB choices; migrations on local DB; anonymous/other-user access tests; private noindex; verify/build/E2E and UI review | Not executed |
| Existing inconsistent App Router app | Read-only report; evidence-backed findings versus hypotheses; explicit preservation; approved boundaries; baseline comparison; one area normalized; instructions/config preserved; re-adoption produces no duplicate block or contract | Not executed |
| Standalone Doctor / Verify | No installation/contract prerequisite; Doctor stops at report; only approved Verify checks run; no source repairs or implicit transition | Not executed |
| Manual kit update with local overrides | Known adopted/candidate/local snapshots; conflicting edits reviewed; local decisions preserved; no app migration; provenance/history updated only after approved incorporation | Not executed |

Add an i18n scenario before advertising that combination as runtime-tested. A successful landing does not validate every possible capability combination.

## Maintaining the checks

Write a failing regression test before fixing a contract/CI bug. Prefer validating observable contract behavior over asserting prose wording. Keep the supported Markdown syntax explicit and add fixtures for parsing changes.

Update [the implementation spec](../specs/adaptive-adoption-mvp.md) and this evidence description when adding real bootstrap automation. Never replace an unexecuted scenario with a passing structural assertion.
