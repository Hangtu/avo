# 029 — Align the project with Node 26

id: 029
updated: 2026-11-08

## Goal

Make local development, package constraints, dependency checks and CI consistently
use Node 26.13.0 / npm 11.20.0 with Node 26 TypeScript definitions. Preserve the
existing security controls and application dependencies, and demonstrate a clean
isolated installation, checks, production build and public browser journeys.

## Out of scope

- Production/Vercel settings, deployment, commit/push/PR or remote CI execution.
- Neon/OAuth access, database inspection/migration/seed or personal-data changes.
- Changing Next, React, Drizzle, pg, Better Auth or Cache Components/PPR behavior.
- Upgrading unrelated dependencies or weakening integrity, audit or script policy.
- Reinstalling the owner's working node_modules or overwriting the dev .next cache.
- Treating this alignment as a fix for production 42P01 or the silent CLI failure.

## Next step

No remaining alignment step. Source/CI/toolchain policy and isolated clean
installation are verified. The owner subsequently confirmed that everything
works; investigation 028 closed on owner-reported functional acceptance, not
independent production schema verification. Owner working node_modules and .next
were preserved by the agent.

## Checklist

- [x] Read project/task contract, installed Next installation guide and dependency/security rules; inspect working/staged changes.
- [x] Park task 028 with its production investigation evidence intact; establish one active task and a local work branch.
- [x] Verify Node 26 types registry version, dependency and SHA-512 provenance without installation.
- [x] Add and execute failing regressions for approved Node/npm and manifest/lock runtime consistency.
- [x] Align .node-version, engines, packageManager, Node types, dependency guard and CI npm pins.
- [x] Regenerate lockfile with npm only; review the complete diff and preserve all unrelated package versions/integrities.
- [x] Update current setup/contract docs without rewriting historical evidence.
- [x] Run a clean npm ci with ignore-scripts, verify no lock drift and run the audit gate.
- [x] Run dependency/task-policy regressions, tests, typecheck, lint, format and db:check with synthetic configuration.
- [x] Build production and run public browser journeys in an isolated repo copy.
- [x] Review final diff, checkpoint results, complete task/board and run check:tasks.

## Files

- `.node-version`, `package.json`, `package-lock.json` — approved runtime/npm/types and npm-generated dependency graph.
- `scripts/check-dependencies.mjs`, `scripts/check-dependencies.test.mjs` — enforce versions without relaxing script/SRI/registry controls.
- `.github/workflows/app-ci.yml`, `.github/workflows/production-migrations.yml` — same npm pin, Node from .node-version, unchanged production approvals/triggers.
- `README.md`, `docs/agent-kit/project-context.md` — current project-specific setup/contract, not an update of the pinned reference library.
- `tasks/completed/028-investigate-migration-cli-failure.md` — investigation evidence and explicit owner-reported functional acceptance.

## Decisions

- 2026-11-08 — Owner approved the stated Node 26.13.0 / npm 11.20.0 / Node 26 types
  scope, including dependency/CI policy changes and isolated checks; no deployment,
  production access or publication is authorized.
- 2026-11-08 — Use the existing local Node/npm binaries; do not replace the user's
  global toolchain. CI already reads .node-version; preserve action SHAs and
  production migration gates.
- 2026-11-08 — Upgrade only Node declaration types and their required undici-types
  dependency. npm must generate the lockfile; reject unrelated dependency drift.
- 2026-11-08 — Runtime engine accepts Node 26 patches; .node-version fixes the
  reproducible local/CI baseline at 26.13.0. The guard must reject other majors,
  mismatched pins and manifest/lock engine drift.

## Validation

| Date | Check / scope | Result | Evidence or limitation |
|---|---|---|---|
| 2026-11-08 | Initial working/index review | Passed | No staged changes. Existing unstaged task 028/board checkpoint preserved; local branch chore/node-26-alignment created. |
| 2026-11-08 | Available runtime and types registry metadata | Passed | Node 26.13.0 / npm 11.20.0 installed. Registry lists @types/node 26.6.6 with SHA-512 SRI and undici-types ~8.9.0; only those approved type packages may change. |
| 2026-11-08 | Framework guide | Read | Installed Next 16.4.3 installation guide requires Node >=20.9; no Next API/flag/dependency changes planned. Installed Next engine accepts Node 26; hosting support remains a separate future deployment check. |
| 2026-11-08 | Policy regression red/green | Passed | New Node/npm/runtime/engine cases failed before implementation (3/4 failed), then all 4 passed with the approved policy; existing script/SRI/registry rejection cases retained. |
| 2026-11-08 | npm-only lock regeneration and diff | Passed | Isolated npm 11.20.0 package-lock-only regeneration changed only root engines/types, @types/node 20.19.43 → 26.6.6 and undici-types 6.21.0 → 8.9.0. All other lock entries and runtime dependencies unchanged. |
| 2026-11-08 | Clean isolated installation | Passed | `/tmp/avo-node26-check-hqwN8I/repo`: npm ci --ignore-scripts installed 515 packages; SHA-256 matches the reviewed source lock. Owner node_modules/.next untouched; no private env files copied. |
| 2026-11-08 | Native audit gate | Passed with existing debt | 0 high/critical, 12 moderate advisories unchanged (esbuild/Drizzle tooling and minimatch/ESLint chains); retained existing 2026-11-18 review and no forced remediation. |
| 2026-11-08 | First isolated verify | Failed at final task guard | Dependency tests, format, lint, typecheck, all 550 tests and db:check passed. Guard caught task 028's backticked private .env.prod description as a required file; private env correctly absent from isolated copy. Changed description only, not guard rules. |
| 2026-11-08 | First type provenance assertion | Failed (test assertion too strict) | @types/node has scripts: {}, not an absent scripts field; no lifecycle script was present. Recheck actual script keys instead of field absence. |
| 2026-11-08 | Installed type package review | Passed | @types/node 26.6.6 / undici-types 8.9.0 are MIT declaration packages with no script keys. Registry SRI matched the lock. Next 16.4.3, ORM 0.45.4, Kit 0.31.11, pg 8.23.1 and Better Auth/adapter 1.7.15 unchanged. |
| 2026-11-08 | Final isolated npm run verify | Passed | Dependency guard, 4/4 policy tests, format, lint, typecheck with actual Node 26 definitions, 550/550 tests in 54 files, db:check and 26-task guard all passed. No private env files or real credentials used. |
| 2026-11-08 | Task guard regression suite | Passed | 41/41 tests. Private-env task description fixed without weakening the guard or adding private files to the copy. |
| 2026-11-08 | Isolated production build | Passed | Next 16.4.3 build, TypeScript, all 13 static pages and generated service worker. Cache Components and Partial Prefetching remain enabled. |
| 2026-11-08 | Public Chromium E2E after build | Passed | 31/31. Intentionally absent synthetic loopback DB produced ECONNREFUSED on account probes, not a production failure. Raw synthetic log: /tmp/avo-node26-check-hqwN8I/evidence/e2e.log. |
| 2026-11-08 | Final source/CI/security diff | Passed | Only four npm pin lines changed across workflows; action SHAs, audit gate, environment approvals, migration triggers/secrets and dependency script blocking preserved. npm 11.11 remains only as a negative test/current historical evidence. |
| 2026-11-08 | Publication/production/owner install | Not run | No commit, push, deploy, Vercel settings, Neon/OAuth access or migration. Owner working node_modules/.next not replaced; refreshing that install requires stopping dev and npm ci --ignore-scripts. |

## Log

- 2026-11-08 — Saved the complete owner-approved alignment plan before source edits.
  Task 028 moved to backlog with its production recovery prerequisite intact.
- 2026-11-08 — Updated only the approved pins/types/policy/CI/docs. Policy red/green
  passed; clean install and audit passed. Fresh-copy verification exposed a task
  documentation reference to an ignored private env file; removed that false
  Files requirement rather than copying credentials or weakening the guard.
  Initial provenance check also rejected an empty scripts object; correcting the
  diagnostic assertion, not the package/security policy.
- 2026-11-08 — Final clean-copy verify, task regressions, production build and
  31 Chromium journeys passed on Node 26.13.0 / npm 11.20.0 with the actual new
  declaration packages. Reviewed lock/package/CI diffs and retained all security
  gates. No runtime app changes were necessary. Closing alignment; task 028
  remained in backlog at that checkpoint; production was neither inspected nor
  repaired by the agent.
- 2026-11-08 — Owner subsequently confirmed "todo funciona perfectamente" after
  an explicit question distinguishing Node alignment and production functionality.
  Recorded owner acceptance; task 028 closed with evidence limits and optional
  diagnostics findings preserved. No new production operations or publication.
