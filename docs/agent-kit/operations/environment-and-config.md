# Environment and Configuration

> **Read when:** adding/reading actual env inputs, site settings, or flags.
> **Scope:** declare only selected integrations. A landing needs no DATABASE_URL/auth secrets. Preserve the approved validator and secret manager; the T3/Vercel example is optional.

## Env vars

- **ENV-1 (MUST)** Centralize and validate external env inputs in the approved env module (new default: `@/env`, Zod or T3 + Zod). Framework/config entry points may read their documented build/runtime vars. Missing required values fail clearly; do not require unused integrations.
- **ENV-2 (MUST)** Declare server-only vars in `server`, and browser-visible vars (`NEXT_PUBLIC_*`) in `client`. Anything in `client` is **public**: never put secrets there.
- **ENV-3 (MUST)** Every var is listed in `.env.example` with a comment and a safe placeholder, in the same change that adds it.
- **ENV-4 (MUST)** Local values go in `.env.local` (gitignored). Deployed values live in Vercel project settings, per environment (Development / Preview / Production). Pull them locally with `vercel env pull .env.local`.
- **ENV-5 (MUST)** Names follow NAME conventions: `SCREAMING_SNAKE_CASE`, provider prefix (`RESEND_API_KEY`), and the unit in the name where relevant (`SESSION_TTL_SECONDS`).
- **ENV-6 (MUST)** Optional integrations are optional in the schema, and code checks for them (`if (env.RESEND_API_KEY)`), so a fresh clone runs with only the required vars.

## Minimal public site example

```ts
// src/env.ts — monolingual public site; no secret integrations
import { z } from "zod";

export const env = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
}).parse({ NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL });
```

## Expanded example — only with selected DB/auth/provider requirements

Do not paste this schema into a landing. Remove unselected variables, provider presets, and bypass flags. A validation bypass is permitted only in reviewed tooling/tests that never start the app or access services, not to get a build green.

```ts
// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    CRON_SECRET: z.string().min(32).optional(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  extends: [vercel()],
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true", // only for lint/test jobs that don't need real values
});
```

> Verify `createEnv` options against the installed `@t3-oss/env-nextjs` version at bootstrap.

## Variables by capability

| Variable | Scope | Purpose |
|---|---|---|
| `DATABASE_URL` | server, database active | Pooled Postgres connection string |
| `BETTER_AUTH_SECRET` | server, Better Auth active | ≥ 32 random bytes (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | server, Better Auth active | App origin (optional on Vercel when derived from the system env) |
| `NEXT_PUBLIC_SITE_URL` | client | Canonical production origin, e.g. `https://example.com` (used for canonical URLs and sitemaps) |

## Site configuration

- `src/config/site.ts`: name, production URL (from env), default OG image, social profiles, contact email, AI-crawler policy. These are non-secret, typed constants.
- `src/config/routes.ts`: public routes, app route prefixes (used by the proxy for optimistic redirects).
- `src/config/navigation.ts`: menus and hrefs; label keys when i18n is active, coherent copy otherwise.

## Feature flags

- MVP: typed booleans in `src/config/flags.ts`, read from env (`FLAG_<NAME>` → `z.stringbool()`).
- When you need per-user rollout or experiments, adopt the Vercel Flags SDK (`flags`) with a provider adapter (e.g., Statsig, PostHog), with an ADR. Flags are evaluated on the server and passed down as props.
- Remove a flag within two releases of a full rollout.
