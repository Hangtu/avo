# Security

> **Read when:** any change to auth, data access, input handling, file uploads, external calls, headers, dependencies, or logging. Every PR is reviewed against this doc.
> **Baseline:** OWASP Top 10 / ASVS principles and version-matched Next.js security guidance. No certification or exhaustive audit is implied.
> **Scope:** controls apply to attack surfaces that exist, regardless of capability labels. Library/provider examples are conditional preferences, not permission to migrate an existing stack.

## Lessons this doc is built on

- Proxy/middleware checks have been bypassed (CVE-2025-29927, CVE-2026-64642). **Authorization lives in the data layer.**
- Server Functions are public endpoints that deserialize attacker input ("React2Shell", CVE-2025-55182). **Validate everything, and patch fast.**
- `"use cache"` keys and tags are stored in plain text and shared across users. **Never cache user-specific data in shared caches, and never put secrets in cache keys.**
- npm supply-chain worms (2025–2026) stole tokens through install scripts and freshly published versions. **Lockfile, minimum release age, no unapproved install scripts.**

## OWASP Top 10:2025 → our controls

| Risk | Controls (rule IDs) |
|---|---|
| A01 Broken Access Control | Auth-aware data layer, authorization in `WHERE`, 404 for invisible resources, deny by default (AUTH-1, AUTH-20…25, DB-24) |
| A02 Security Misconfiguration | Security headers + CSP, env validation, no debug output in prod, least-privilege DB roles (SEC-20…26) |
| A03 Software Supply Chain Failures | pnpm lockfile + `minimumReleaseAge` + approved build scripts, Dependabot with cooldown, action pinning ([dependencies.md](../operations/dependencies.md)) |
| A04 Cryptographic Failures | HTTPS only (HSTS), Better Auth password hashing, no custom crypto, secrets ≥ 32 bytes |
| A05 Injection | Drizzle parameterized queries, `sql` tag only, React escaping, no `dangerouslySetInnerHTML` (DB-25, RC-44) |
| A06 Insecure Design | Specs include abuse cases; rate limits; threat review for new features |
| A07 Authentication Failures | Better Auth, rate limiting, email verification, generic errors, 2FA/passkeys (AUTH-*) |
| A08 Software or Data Integrity Failures | Webhook signature verification, idempotency, CI-only deploys, signed dependencies/provenance where available |
| A09 Logging & Alerting Failures | Structured security events, error tracking, alerts ([observability.md](../operations/observability.md)) |
| A10 Mishandling of Exceptional Conditions | `createAction`/`withApiHandler` boundaries, no swallowed errors, generic client errors ([error-handling.md](../standards/error-handling.md)) |

## Rules

### Input and output

- **SEC-1 (MUST)** Validate every external input with the approved runtime validator (Zod for new work) at the boundary: actions, route handlers, `params`, `searchParams`, cookies you read, webhook bodies, third-party responses, env vars.
- **SEC-2 (MUST)** Use allowlists, not blocklists: `z.enum`, `z.strictObject`, explicit `select` of columns, explicit DTOs.
- **SEC-3 (MUST NOT)** Render user-controlled HTML. React escapes text by default; keep it that way. Markdown or rich text from users is rendered through a sanitizer, approved by ADR.
- **SEC-4 (MUST)** Redirects and links built from user input are validated as same-site relative paths (`/` but not `//`), or checked against an allowlist of hosts.
- **SEC-5 (MUST)** Server-side fetches to user-provided URLs (link previews, webhooks-out, imports) go through an SSRF guard: `https` only, an allowlist or block of private/loopback/link-local IP ranges after DNS resolution, a timeout, and a size limit.

### Data exposure

- **SEC-10 (MUST)** Server-only code imports `server-only`. Secrets come only from `env` (server schema) and are never read in client components. Only `NEXT_PUBLIC_*` values reach the browser.
- **SEC-11 (MUST)** Return minimal DTOs to Client Components. Never pass full DB rows, sessions, or user objects with sensitive fields as props.
- **SEC-12 (MUST NOT)** Put secrets, tokens or personal data in URLs, cache keys/tags, logs, analytics events, error messages, or client storage.
- **SEC-13 (MUST)** Don't hardcode secrets in source. Read them from env at runtime (CVE-2025-55183 exposed function source code).

### Headers and browser security

Set in `next.config.ts` (`headers()`) and, for the nonce-based CSP, in `proxy.ts`:

- **SEC-20 (MUST)** Enforce HTTPS and an appropriate HSTS policy in production. Review domain/subdomain ownership before enabling `includeSubDomains` or preload; never apply a universal domain policy blindly during adoption.
- **SEC-21 (MUST)** `Content-Security-Policy` with per-request nonces (`script-src 'self' 'nonce-…' 'strict-dynamic'`), `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`. Start with `Content-Security-Policy-Report-Only` in preview, then enforce. Note that a nonce-based CSP makes pages dynamic. If most pages must stay static, use a hash-based CSP or Next's SRI support instead, and record the choice in an ADR.
- **SEC-22 (MUST)** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` (open only what a feature needs), `Cross-Origin-Opener-Policy: same-origin`.
- **SEC-23 (MUST)** `poweredByHeader: false` in `next.config.ts`.
- **SEC-24 (MUST)** Keep `images.remotePatterns` minimal and specific (exact hosts and path prefixes). Leave `dangerouslyAllowSVG` off.
- **SEC-25 (MUST)** Cookies set by our code are `httpOnly`, `secure`, `sameSite: "lax"` (or `"strict"`), with the narrowest `path`.
- **SEC-26 (MUST)** Production has no source maps exposed publicly (upload them to error tracking only), no debug endpoints, and no verbose errors.

### Abuse protection

- **SEC-30 (MUST)** Rate-limit by user and IP: auth (Better Auth built-in), sign-up, password reset, invitations, contact forms, email sending, exports, AI calls, public APIs. Use `@/server/rate-limit`, backed by Redis (e.g., Upstash) or Vercel WAF rules.
- **SEC-31 (SHOULD)** Protect high-value public forms from bots with invisible checks (Vercel BotID or a privacy-friendly challenge), never cognitive puzzles (WCAG 3.3.8).
- **SEC-32 (MUST)** File uploads:
  - validate type by content (magic bytes), not just extension;
  - enforce size limits;
  - store outside the app, in object storage, via presigned URLs;
  - serve from a separate domain or with `Content-Disposition: attachment`;
  - never execute or render uploaded HTML/SVG inline.

### Secrets and environments

- **SEC-40 (MUST)** Secrets live in the approved per-environment secret manager and gitignored local env files, not source/docs. `.env.example` documents names and safe non-secret example values for actual integrations only.
- **SEC-41 (MUST)** Rotate secrets on suspected exposure, after team member offboarding, and after any critical framework advisory that says so.
- **SEC-42 (MUST)** Enable GitHub secret scanning with push protection. Optionally, add a local pre-commit secret scanner (e.g., gitleaks) to `lefthook.yml`.

### Dependencies and patching

- **SEC-50 (MUST)** Apply Next.js/React security releases within **48 hours** for critical, 7 days for high. Next.js publishes monthly security releases; subscribe to the advisories.
- **SEC-51 (MUST)** Follow [dependencies.md](../operations/dependencies.md): ask before adding packages, keep pnpm's supply-chain settings, and review Dependabot PRs.

### AI features (if the product calls LLMs)

- **SEC-60 (MUST)** Treat model output as untrusted input: validate structured output with Zod, never execute it, never render it as HTML, and never let it choose URLs or SQL.
- **SEC-61 (MUST)** Defend against prompt injection: keep system instructions server-side, separate user content from instructions, restrict tool permissions to the user's own data, and require confirmation for destructive tool actions.
- **SEC-62 (MUST)** Rate-limit and cap tokens per user. Don't send secrets or other users' data to the model. Label AI-generated content where the law requires it (EU AI Act transparency obligations).

## Security review checklist (PRs touching risky areas)

- [ ] Who can call this? Is that checked **in the data layer**?
- [ ] Is every input validated? What happens with unexpected types, huge payloads, or repeated calls?
- [ ] Could one user see or change another user's/tenant's data (IDOR)? Is there a test for it?
- [ ] Do responses, logs, errors or caches contain anything sensitive?
- [ ] Are new external calls protected by timeouts and SSRF rules?
- [ ] Is a rate limit needed?
- [ ] Do new dependencies follow the dependency policy?
