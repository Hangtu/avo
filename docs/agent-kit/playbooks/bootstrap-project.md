# Playbook: Bootstrap an Approved New App

> **Use when:** the approved project contract explicitly selects mode `new` and the user authorized scaffolding, dependency installation, and configuration.
> **Not for:** maintaining this kit or migrating an existing app. Start with [adoption](adopt-project.md) when intent/context is missing.

## 0. Confirm the smallest scope

Read the actual project contract. Resolve the product name, language, intended public/private routes, production domain, capabilities, and providers. Ask only unresolved questions, with recommendations; do not ask every landing owner for sign-in methods and a database.

Default to one language and no auth, DB, analytics, URL-state provider, or shared cache unless required. Record any future domain as unresolved; do not publish `example.com` as the product canonical.

The user's approved plan must name the target directory and tool/config changes. A dirty target or unexpected app code is a reason to stop and preserve it, not to overwrite it.

## 1. Check tools and choose a compatible baseline

- Inspect the runtime and package manager. Do not silently install global tools.
- Select a supported Next.js App Router baseline and compatible React/TypeScript/lint versions using [tech-stack.md](../architecture/tech-stack.md) and installed/version-matched docs.
- Record the exact generator and pnpm versions in the contract. Install approved compatible versions; a moving `latest` tag is not a reproducibility guarantee.
- Set pnpm supply-chain policy **before** the first install, including the staging generator environment. Respect the release-age policy and review build scripts; a CLI invocation is also external code execution.

See [dependencies.md](../operations/dependencies.md). Do not reuse historical version claims as proof of a tested bootstrap.

## 2. Scaffold in a separate staging directory

Inspect the approved generator's `--help` first. Use a valid package-directory name such as `app`, not `.bootstrap` as a package name. Substitute the approved version and staging path before execution:

```bash
pnpm create next-app@<approved-version> <staging-directory>/app --ts --tailwind \
  --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Use supported noninteractive flags only after checking the installed generator. Enable React Compiler/Cache Components deliberately after checking version support; do not invent flags or assume a snippet overrides the generator's schema.

Compare generated files with the target before moving them. Preserve the kit's library, the approved contract, existing instructions, user files, and any configured supply-chain policy. Merge conflicts explicitly. Remove only the staging directory you created after the merge is verified.

If the generator emits a `nextjs-agent-rules` block, copy that complete block verbatim into the single `agent-kit:nextjs-rules` slot in the chosen instruction file. Update that slot, never append another block. If no block or different delimiters are emitted, report it; do not fabricate framework instructions. Keep future generator updates confined to that block.

## 3. Record runtime and package manager explicitly

In the actual application manifest, set:
- `engines.node` to the approved supported runtime range;
- `packageManager` to `pnpm@<exact installed version>` — write this explicitly, do not assume pnpm/generator wrote it;
- the application package name.

Set `.node-version` consistently. Keep `pnpm-workspace.yaml` protections and review `pnpm ignored-builds` / `pnpm approve-builds` for the installed major. Install to generate the lockfile; never hand-edit it. Commit only when requested.

## 4. Add only selected dependencies

The generator supplies Next/React/TypeScript/Tailwind/ESLint. Add formatter and actual test tooling to the approved app, not to this docs-only kit.

| Need | Preferred additions | Do not create when absent |
|---|---|---|
| External input/env validation | `zod`; `@t3-oss/env-nextjs` if used | Empty env/provider configuration |
| UI primitives | shadcn CLI with Base UI; only rendered primitives | A catalog of unused components |
| Complex forms | `react-hook-form`, `@hookform/resolvers` | Form provider on a static page |
| Persistence | `drizzle-orm`, `pg`, `server-only`; dev `drizzle-kit`, `@types/pg`, migration tooling | DB client, migrations, DB env |
| Identity | `better-auth` and selected adapter/storage | Session/proxy/sign-in scaffolding |
| Multiple languages | `next-intl`, message checker tooling | `[locale]`, catalogs, locale provider |
| Shareable URL state | `nuqs` | Root URL-state provider without consumers |
| Themes/toasts | `next-themes` / `sonner` if rendered | Unused providers |
| Analytics/monitoring | Approved provider only, after privacy review | Vercel analytics or external traffic by default |
| Unit/component logic tests | Vitest, appropriate React plugin/environment/Testing Library | Empty suite or pass-with-no-tests bypass |
| DB integration tests | PGlite with migrations, or approved real Postgres tests | DB service for a static landing |
| Browser smoke/critical journeys | Playwright + axe | Authentication setup for a public-only site |

Use the installed shadcn CLI's documented Base UI options; inspect help before copying a preset command. Mirror its API rather than importing a different primitive package by accident.

## 5. Create the minimum structure

For a monolingual landing, start from [the landing reference](../architecture/reference-landing.md): root layout, home page, meaningful section components, globals/tokens, public assets, and a browser smoke test. Add site configuration and SEO artifacts for actual public content.

Do not create empty `features/*/server`, `server/db`, `server/auth`, `messages`, `i18n`, `(auth)`, `(app)`, or tag files.

Use [project-structure.md](../architecture/project-structure.md) as a responsibility map. It is not a mandatory directory checklist.

## 6. Configure rendering and public quality

Keep the generator's valid Next configuration. Add reviewed security settings according to [security.md](../quality/security.md); evaluate CSP/static rendering, domain-wide HSTS, permissions, and OAuth/embedding requirements instead of pasting a universal header bundle.

- Keep server rendering by default; small client leaves only for interactivity.
- If Cache Components are enabled, follow [data/caching](../backend/data-fetching-and-caching.md) for request-dependent UI. Literal static content does not need cache tags.
- Monolingual: keep `src/app/layout.tsx`, `next/link`, and `next/navigation`. Use coherent local copy; no message checker or locale middleware.
- Indexable pages: validated site URL, metadata/static metadata exports, canonical, social image, sitemap, robots policy, and truthful structured data where relevant. Hreflang only with selected locales.
- Build accessible landmarks, headings, keyboard/focus behavior, labels, contrast, and responsive styles. Use the project's tokens and actual primitives.

## 7. Configure quality tooling from actual generator output

Read [TypeScript](../standards/typescript.md), [code style](../standards/code-style.md), and [testing](../quality/testing.md). Merge reviewed additions instead of replacing configs with unverified boilerplate.

- Strict TypeScript and type-aware lint for supported installed versions.
- Prettier with Tailwind plugin if used; ignore generated/build artifacts, not arbitrary failing source.
- `server-only` boundaries where server code exists; import restrictions must permit same-feature imports, type-only schema imports, and explicitly allowed action imports from client components.
- Restrict `next/link`/navigation only when i18n is active, with the i18n adapter itself permitted.
- Keep real dependency-direction checks; do not claim the base Next ESLint preset enforces feature boundaries. Add/test narrow rules for the actual tree or make the manual review gap explicit in the contract.
- Add hooks, commitlint, and dead-code tooling only when configured, exercised, and approved; do not activate the source kit's hook recipe unchanged.

For dead-code checks, remove unused packages/helpers rather than broadly ignoring them. For a static landing with no unit logic, use real browser smoke coverage; do not install an empty Vitest suite or use a no-tests pass flag. Add unit tooling with the first relevant behavior.

## 8. Add capability-specific implementation

Execute only applicable rows:

| Capability | Implementation |
|---|---|
| i18n | [i18n setup](../discoverability/i18n.md), selected catalogs/locales, navigation, checker; locale layout only here |
| database | [DB setup](../backend/database.md), validated env, local/test migrations |
| auth | [auth setup](../backend/auth.md), selected providers, data-layer authorization, anonymous/other-user tests |
| forms | [forms](../standards/forms.md) and [actions](../backend/server-actions.md); public actions must not import unavailable auth infrastructure |
| external-api | [API boundaries](../backend/api-routes.md), actual consumers, origin/signature checks |
| shared-cache | Scope/lifetime/tags only for cached reads; invalidate actual caches |

Add only providers with rendered consumers. For auth without i18n, use normal Next navigation. A recipe showing both capabilities is not a requirement to enable both. Prefer the existing approved implementation in an adopted app.

## 9. Scripts, tests, and CI

For a new app, create a `verify` script combining the **actual installed checks**. Base example:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "next typegen && tsc --noEmit",
    "lint": "eslint --max-warnings=0 .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test:e2e": "playwright test",
    "verify": "pnpm typecheck && pnpm lint && pnpm format:check"
  }
}
```

Check that the installed Next version supports `next typegen`; keep generated defaults where needed. Add `test`, `i18n:check`, dead-code, and DB scripts only when their tools/files exist. Include all selected quality checks in verify; do not omit a failing test suite to fit this base example.

Playwright runs a production build/start through `webServer`. Write a smoke test for the home page's content/heading, metadata/canonical, navigation, and axe scan. Add authenticated setup and user-isolation journeys only for actual auth. Manual keyboard/focus/contrast checks remain required.

Install/merge [application CI](../operations/application-ci.md), never the source kit's root workflow. No app job may depend on a nonexistent manifest field or script.

## 10. Finish with evidence

- Keep env values local and gitignored; `.env.example` lists only applicable variables without secrets. Ignore build/test/auth-state artifacts.
- Replace the source-kit README only in an approved new target app, with product setup and real commands. Preserve existing product READMEs during adoption.
- Update the project contract with exact versions, decisions, commands, and actual results.
- Run `pnpm verify`, `pnpm build`, `pnpm test:e2e`, and manual UI checks. Report blockers honestly; do not call the bootstrap validated until they pass.
- Record the scenario evidence in the [validation checklist](../quality/kit-validation.md#application-validation-scenarios), including generator differences and manual intervention.
- Do not commit, deploy, provision, or migrate production unless separately authorized.
