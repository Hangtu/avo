# Deployment and CI/CD

> **Read when:** changing CI, environments, release/migration policy, or hosting.
> **Scope:** preserve the approved target pipeline/host. Vercel is a new-app preference, not a condition of adoption.

## Kit versus app

This repository's root workflow runs `node scripts/verify-kit.mjs` without an application manifest or database. It does not build, test, or deploy a generated app.

For a target application, use [application-ci.md](application-ci.md) after the contract and configuration changes are approved. Do not overwrite existing workflows or silently skip missing checks.

## Application environments

Keep local/test/preview/production data and secrets isolated. Use only selected services: a static landing needs neither a Postgres service nor auth variables. Existing hosting/package managers can remain.

For Vercel, review Git integration and branch protection separately: a workflow diagram does not make Vercel wait for GitHub checks. Configure the actual deployment gate before claiming CI blocks production release.

## Rules

- **DEPLOY-1 (MUST)** CI gates application changes with a locked install, type/lint/format checks, applicable tests, production build, and affected critical-journey E2E/accessibility scans. Include i18n/DB/service setup only when selected. The contract records exact commands and baseline failures.
- **DEPLOY-2 (MUST)** For persistence, production migrations run from an approved protected release pipeline before incompatible new code serves traffic. Previews use isolated test/preview DBs. Never migrate production from a laptop as an adoption side effect.
- **DEPLOY-3 (MUST)** Use backward-compatible schema changes so old code remains viable during rollout/rollback. Prefer expand → migrate → contract; a down migration is not a substitute for a safe application rollback.
- **DEPLOY-4 (MUST)** Record/pin a supported runtime consistently in manifest, runtime version file, CI, and host.
- **DEPLOY-5 (MUST)** Secrets are separated by environment; previews/tests never use production credentials or data.
- **DEPLOY-6 (MUST)** After release, smoke-test actual critical surfaces: home/health, sign-in only with auth, data paths only with persistence. On regression, use the approved rollback plan first.
- **DEPLOY-7 (SHOULD)** Protect previews containing sensitive/unreleased content and apply appropriate abuse controls using the selected platform.
- **DEPLOY-8 (MUST)** Scheduled jobs authenticate and are idempotent. Vercel Cron is a recipe when that host is selected, not mandatory infrastructure.

## Release and rollback

Record the deployed revision, monitoring/release identifiers, checks, migration order, traffic cutover, and rollback owner. A merge is a production release only when the approved pipeline actually makes it one.

Do not install provider integrations, add secrets, or deploy while merely incorporating documentation. Each is an explicit operational step.

## Hosting portability

A Node deployment can use a reviewed standalone build/container. Depending on actual capabilities, consider CDN, image optimization, logs, cache consistency across instances, workers/cron, and secret management. A shared cache handler is needed only when there is a cross-instance shared cache to coordinate.

Record a hosting migration as a consequential decision and test it; no generic deployment recipe proves portability.
