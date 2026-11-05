# 007 — F01 legal and account deletion

id: 007
updated: 2026-11-05

## Goal

Make the privacy and deletion pages publishable: confirm the legal controller
name and address, the support mailbox owner, the retention window for account
data and receipts, the sync offline-retry window/receipt limit (E4.5), and a
safe account-deletion procedure.

## Out of scope

- Publishing before the owner approves the legal text.
- Deleting real accounts without verified ownership.
- Adding a self-service deletion endpoint; that needs a separately approved task.

## Next step

Confirm controller identity/address, support-mailbox monitoring, account/receipt
retention and the sync retry window/receipt limit. Then document and rehearse the
approved manual deletion procedure with a disposable account; the current page
offers an email request, not a self-service endpoint. Publish only after owner
approval of the final text and contact channel.

## Checklist

- [ ] Controller name and legal address configured.
- [ ] Support mailbox monitored and documented.
- [ ] Account/receipt retention and sync offline-retry window/receipt limit decided (E4.5).
- [ ] Approved manual deletion procedure documented and tested with a disposable account; no real account is touched.
- [ ] Owner approves the final legal text.
- [ ] Publish with separate authorization.

## Files

- `components/privacy-content.tsx` — privacy notice.
- `components/data-deletion-content.tsx` — deletion instructions.
- `lib/legal.ts` — support contact.
- `.env.example` — controller env names.
