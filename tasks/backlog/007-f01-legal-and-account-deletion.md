# 007 — F01 legal and account deletion

id: 007
updated: 2026-11-04

## Goal

Make the privacy and deletion pages publishable: confirm the legal controller
name and address, the support mailbox owner, the retention window for account
data and receipts, and a safe remote account-deletion procedure.

## Out of scope

- Publishing before the owner approves the legal text.
- Deleting real accounts without verified ownership.

## Next step

Collect the controller name, legal address, support-mailbox owner and retention
window. Then test remote account deletion with a disposable account. Publish only
after the owner approves the final text and the contact channel.

## Checklist

- [ ] Controller name and legal address configured.
- [ ] Support mailbox monitored and documented.
- [ ] Retention window for account data and receipts decided.
- [ ] Remote deletion tested with a disposable account.
- [ ] Owner approves the final legal text.
- [ ] Publish with separate authorization.

## Files

- `components/privacy-content.tsx` — privacy notice.
- `components/data-deletion-content.tsx` — deletion instructions.
- `lib/legal.ts` — support contact.
- `.env.example` — controller env names.
