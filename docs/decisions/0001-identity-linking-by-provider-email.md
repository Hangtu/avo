# 0001. Link identities by the email the provider delivers

- **Status:** Accepted
- **Date:** 2026-11-03
- **Deciders:** Owner (product decision), implementation review

## Context

Avo allows optional Google and Facebook sign-in. The MVP has no mailbox
verification of its own: there is no transactional email provider, no
verification token, and no support process to prove control of an address.
Better Auth's default implicit linking is disabled when an email is unverified,
which would create two accounts for the same person depending on which provider
they used first. See [`plan.md`](../../plan.md) (E4) and
[`docs/cloud/2026-11-02-e4-auth-and-spaces.md`](../cloud/2026-11-02-e4-auth-and-spaces.md).

## Decision

We will treat the sign-in performed by the provider as the proof of identity for
the MVP:

- implicit linking stays enabled (`disableImplicitLinking: false`);
- Facebook is listed in `trustedProviders` because this library version does not
  assert a verified email for Facebook;
- a user created by a provider is stored with `emailVerified: true` to record
  that a provider authenticated the person and delivered that address — **not**
  that Avo verified the mailbox;
- the same provider-delivered email links to the same internal account in either
  sign-in order; a different email creates a different account.

## Consequences

- **Positive:** one person keeps one account across Google and Facebook without
  building an email-verification system the MVP does not have.
- **Negative / trade-offs:** an attacker who controls a provider account with
  someone else's address inherits that identity. A provider that changes or
  omits the email changes the outcome. This is weaker than proof-of-control and
  must be revisited before the app stores anything more sensitive.
- **Follow-up work:** define email verification / proof of control before a
  public launch (E4.3.1). Cover the matrix with real OAuth: both orders, a
  provider that omits the email (`email_not_found`), and a changed email. Keep
  the `?error=` notice on `/`.

## Alternatives considered

| Option | Why not |
|---|---|
| Verify the mailbox ourselves before linking | No email provider, token store, or support process in the MVP; would block sign-in entirely. |
| Keep Better Auth's strict default (no implicit linking) | Creates duplicate accounts for the same person depending on provider order; the owner explicitly rejected this. |
| Merge accounts by matching email without a provider assertion | Same risk with less evidence; the provider assertion is at least an authenticated event. |

## Enforcement

`lib/auth.ts` encodes the policy; `lib/auth.test.ts` exercises the provider
configuration with synthetic credentials. Real OAuth remains an external check
recorded in `STATUS.md`, not something local tests prove.
