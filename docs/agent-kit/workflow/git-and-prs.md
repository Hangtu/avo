# Git, Commits and Pull Requests

> **Read when:** branching, committing, opening or reviewing a PR.
> **Scope:** use the approved project's Git/release policy. Hooks, previews, hosting, and branch protection are selected/configured controls, not automatically installed by adoption. Commits/pushes/PRs require authorization.

## Branching (trunk-based)

- **GIT-1 (MUST)** Keep the default branch usable according to its context: kit checks for this repository; deployability for applications. A merge deploys production only when the approved release pipeline makes that true.
- **GIT-2 (MUST)** Work on short-lived branches (a few days at most), named `<type>/<short-kebab-description>`, e.g. `feat/project-sharing`, `fix/login-redirect-loop`.
- **GIT-3 (MUST NOT)** Push directly to `main`, force-push shared branches, or rewrite published history. Undo with `git revert`.

## Commits: Conventional Commits

```
<type>(<scope>): <subject>

<body: why, not what>

<footer: BREAKING CHANGE: …, Refs: #123>
```

| Type | Use for |
|---|---|
| `feat` | New user-facing behavior |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code change with no behavior change |
| `test` | Tests only |
| `docs` | Docs only |
| `style` | Formatting only |
| `build` | Dependencies, build config |
| `ci` | CI config |
| `chore` | Anything else |
| `revert` | Reverts a commit |

- **GIT-10 (MUST)** Write the subject in the imperative mood, lowercase, with no period, ≤ 72 characters: `feat(projects): add archive action`.
- **GIT-11 (MUST)** The scope is the feature folder name (`projects`, `auth`), or an area (`db`, `i18n`, `seo`, `deps`).
- **GIT-12 (MUST)** Make commits atomic: one logical change, and each commit passes checks. Don't mix a refactor with a feature.
- **GIT-13 (MUST)** Commit the schema change and its generated migration together.
- **GIT-14 (MUST NOT)** Commit secrets, `.env*` files (except `.env.example`), build output, or large binaries.

## Pull requests

- **GIT-20 (MUST)** Each PR has one concern. Aim for under ~400 changed lines (excluding generated files); split bigger work into stacked PRs or feature-flagged slices.
- **GIT-21 (MUST)** Fill in the PR template: summary, linked spec or issue, screenshots for UI, how it was tested, the checklist.
- **GIT-22 (MUST)** Applicable CI is green before approval; report known baseline failures explicitly. Test app changes on the approved preview environment when available. Kit/docs changes do not require a Vercel deployment.
- **GIT-23 (MUST)** At least one **human** approval before merging. AI reviews are welcome but don't count as approval.
- **GIT-24 (MUST)** Squash-merge with a Conventional Commit title, then delete the branch.
- **GIT-25 (SHOULD)** Open a draft PR early for visibility on large work.

## Reviewing

- Use [code-review.md](../playbooks/code-review.md). Label comments `blocker:`, `major:`, `minor:` or `nit:`, and cite the rule ID (e.g. `SEC-4`).
- Review for correctness, security and maintainability first. Leave formatting to the tools.

## Branch protection (repo settings)

- Require a PR, approval, resolved conversations, and the actual configured status-check names. This kit uses `Kit checks (Node 22)` / `Kit checks (Node 26)`; consumer apps use their own checks. Renaming workflows requires reviewing branch-protection settings separately.
- Linear history; no force pushes; no deletions on `main`.
- Enable secret scanning with push protection, and Dependabot alerts.
