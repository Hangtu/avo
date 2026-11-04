# Application CI

> **Applies when:** an approved target application needs CI. This is a recipe, not this kit's root workflow.

## Before installing

Read the project contract. Existing CI is preserved and merged only with approval. Do not copy the kit's root `ci.yml` over an application workflow or treat skipped/missing scripts as green.

For a new pnpm app, require:
- A real app manifest and committed generated lockfile.
- An explicit exact `packageManager: pnpm@<installed version>` field, written during bootstrap. Do not assume a generator/pnpm command adds it.
- A runtime version file and the approved scripts.
- Reviewed build scripts and a frozen install in CI.

## Minimal monolingual app

Adapt names to the contract before installing under the target's `.github/workflows/`:

```yaml
name: app-ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: app-ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm verify

  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    needs: quality
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      # Playwright webServer must run the production build and start commands.
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

This has no database, auth secrets, i18n command, or env-validation bypass. Set required non-secret build values such as the canonical site URL according to the app's env schema. Secrets come from CI environments, not this document.

## Add only selected capabilities

| Capability | Additional setup |
|---|---|
| database | Isolated Postgres service or reviewed test DB; test-only credentials; apply migrations before tests that require persistence |
| auth | Test-only secret/origin, local user fixtures, isolated auth state, anonymous and other-user/tenant rejection tests |
| i18n | Message check in verify; smoke routes for each selected locale |
| external-api | Contract/signature/origin/idempotency tests relevant to consumers |
| analytics / providers | Explicit privacy approval; tests avoid real external traffic |
| shared-cache | Rendering and invalidation tests; no cross-user data exposure |

For a Postgres-backed app, include a service with a health check, wire its URL to quality tests if needed and to E2E, and run the migration command before starting the app. Never reference a production database. Use [deployment.md](deployment.md) for production migration/release policy.

Existing package managers and test frameworks use their equivalent locked install and commands. Replacing them is a separate decision, not a prerequisite to documentation adoption.
