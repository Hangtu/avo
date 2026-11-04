# Dependencies and Supply Chain

> **Read when:** adding, removing or upgrading any package, or reviewing a Dependabot PR.
> **Scope:** pnpm settings are the new-app preference. Preserve an approved existing package manager and equivalent locked-install controls. Kit scripts use built-in Node modules and install nothing.

## Before adding a dependency (agents: ask first)

Answer these questions in the PR description:

1. **Need:** can the platform (Web APIs, Node, React, Next.js) or an existing dependency do it? Is it fewer than ~30 lines to write ourselves?
2. **Health:** actively maintained (release in the last ~6 months), widely used, issues answered, TypeScript types included.
3. **Cost:** install only when there is a real consumer; bundle size if it ships to the client (≤ 30 KB gzipped, or lazy-loaded), install footprint, install scripts.
4. **Security:** no known advisories; publisher reputation; provenance or trusted publishing if available.
5. **License:** MIT, Apache-2.0, BSD, ISC or similar permissive. **No** GPL/AGPL/SSPL or unlicensed code without legal approval.
6. **Stack fit:** not on the "Not in the stack" list in [tech-stack.md](../architecture/tech-stack.md).

## Rules

- **DEP-1 (MUST)** Use the approved package manager and compatible versions, preserving the generated lockfile. New apps prefer pnpm; explicit reviewed version ranges/pins are valid for reproducibility. Do not silently install latest majors or hand-edit locks. Commit only when authorized.
- **DEP-2 (MUST)** CI installs with `pnpm install --frozen-lockfile`. Never hand-edit the lockfile.
- **DEP-3 (MUST)** Keep pnpm's supply-chain protections in `pnpm-workspace.yaml`:
  - a **minimum release age** of at least 1 day (we use 3), so freshly published, possibly compromised versions aren't installed;
  - dependency **build scripts blocked by default**, allowing only reviewed packages (`pnpm approve-builds`).
- **DEP-4 (MUST)** Runtime deps go in `dependencies`; tooling goes in `devDependencies`. Remove deps the moment they're unused (knip reports them).
- **DEP-5 (MUST)** Dependabot opens grouped weekly PRs with a cooldown (patch 3 days, minor 7 days, major 14 days). Security updates bypass the cooldown. Review the changelog of every major before merging.
- **DEP-6 (MUST)** Major upgrades of core packages (Next.js, React, TypeScript, Tailwind, Drizzle, Better Auth, next-intl, Zod, ESLint) follow [upgrade-dependencies.md](../playbooks/upgrade-dependencies.md) and record compatibility evidence/exact versions in the project contract; update [tech-stack.md](../architecture/tech-stack.md) when the supported preference changes.
- **DEP-7 (MUST)** GitHub Actions use major-version tags kept current by Dependabot (`github-actions` ecosystem). Teams with stricter supply-chain needs pin full commit SHAs.
- **DEP-8 (MUST NOT)** Copy code from the internet or another project without checking its license, and without noting the source in a comment.
- **DEP-9 (MUST)** Critical framework security releases are applied within 48 hours (SEC-50).
