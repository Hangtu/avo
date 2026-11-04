# 005 — E4.3.1 identity linking matrix

id: 005
updated: 2026-11-04

## Goal

Prove the MVP identity rule with real OAuth: one account per provider-delivered
email, in both sign-in orders, with a missing email and with a changed email.
Record the observed behavior and any provider-specific limitation.

## Out of scope

- Adding mailbox verification or a proof-of-control flow.
- Merging accounts that do not share the provider-delivered email.

## Next step

With real Google and Facebook credentials, sign in in both orders. Repeat with a
provider account that omits the email and with a changed email. Confirm one
account per provider-delivered email, record the matrix here, and open a new
task if a fix is needed.

## Checklist

- [ ] Google then Facebook with the same email.
- [ ] Facebook then Google with the same email.
- [ ] Provider that omits the email (`email_not_found` notice).
- [ ] Changed email in the provider.
- [ ] Record the matrix and close.

## Files

- `lib/auth.ts` — linking policy and trusted providers.
- `lib/auth.test.ts` — synthetic provider configuration.
- `docs/decisions/0001-identity-linking-by-provider-email.md` — accepted policy.
- `components/auth-error-notice.tsx` — callback error notice.

## Decisions

- 2026-11-03 — The provider sign-in is the proof; no mailbox verification in the MVP (ADR 0001).
