# 0004. Use Better Auth for authentication

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

We need email/password and social sign-in, sessions, email verification and password reset. Later we will likely need organizations, roles, 2FA and passkeys. We want user data in our own Postgres, with no per-user vendor pricing.

## Decision

- Use Better Auth with the Drizzle adapter. Its tables are generated into `src/server/db/schema/auth.ts`.
- Mount it at `src/app/api/auth/[...all]/route.ts`.
- Read sessions on the server through `src/server/auth/session.ts` (`getCurrentUser`, `requireUser`).
- Add capabilities through Better Auth plugins (organization, admin, two-factor, passkey) as needed, with an ADR when the permission model changes.

## Consequences

- **Positive:**
  - Self-hosted; data in our DB.
  - Typed client and server APIs.
  - Built-in rate limiting.
  - Plugin ecosystem.
- **Negative:**
  - We own auth operations: email delivery, secret rotation, security patching.
  - Its schema changes on upgrade must be regenerated and migrated.

## Alternatives considered

| Option | Why not |
|---|---|
| Auth.js / NextAuth | Now maintained under Better Auth; fewer features |
| Clerk / Auth0 | Fast, but vendor lock-in and per-user cost |
| Supabase Auth | Tied to Supabase platform choice |
| Custom auth | High risk, no benefit |

## Enforcement

- [auth.md](../../backend/auth.md).
- Code review: AUTH rules.
