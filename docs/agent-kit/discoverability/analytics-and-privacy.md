# Analytics and Privacy

> **Read when:** adding tracking, cookies, third-party scripts, collecting personal data, or building account/data features.
> **Not legal advice:** confirm requirements for your markets with legal counsel before launch.

## Defaults

| Need | Default tool | Consent needed? |
|---|---|---|
| Traffic and page views | Vercel Web Analytics (cookieless, no personal identifiers) | Generally no; verify for your markets |
| Real-user performance | Vercel Speed Insights | Generally no |
| Product analytics (funnels, retention) | PostHog or similar, **only with an ADR** | **Yes** in the EU/UK if it uses cookies or identifiers |
| Error tracking | Sentry, with PII scrubbing | Legitimate interest; disclose in the privacy policy |
| Marketing pixels (ads) | Avoid in the MVP | **Yes**: explicit opt-in |

## Rules

- **PRIV-1 (MUST)** Collect the minimum personal data needed for the feature. Every new personal-data field is listed in the spec with its purpose and retention.
- **PRIV-2 (MUST)** No non-essential cookies, local storage identifiers, or tracking scripts before consent where the law requires it (EU/UK ePrivacy + GDPR). If any such tool is added, add a consent manager first. Essential cookies (session, locale, theme, CSRF) don't need consent.
- **PRIV-3 (MUST)** Honor the **Global Privacy Control** (`Sec-GPC: 1`) signal as an opt-out of sale/sharing. Several US states (e.g., California, Colorado) require it.
- **PRIV-4 (MUST)** Analytics events follow `object_action` snake_case naming (`project_created`), are defined in the feature spec, and contain **no** personal data: no emails, names, free text, or full URLs with tokens. Use internal IDs only when necessary.
- **PRIV-5 (MUST)** Personal data never appears in logs, URLs, error tracking payloads, or cache keys (SEC-12). Configure scrubbing in the error tracker.
- **PRIV-6 (MUST)** Users can export their data (machine-readable JSON) and delete their account. Deletion removes or anonymizes personal data within 30 days, including backups per the retention schedule.
- **PRIV-7 (MUST)** Public legal pages exist before launch, localized, linked in the footer:
  - privacy policy;
  - terms of service;
  - cookie notice;
  - imprint (where required);
  - accessibility statement (EU).
- **PRIV-8 (MUST)** Keep a simple record of processing (`docs/product/data-inventory.md`): what personal data, why, where it is stored, which processors (Vercel, DB host, email provider…), and retention.
- **PRIV-9 (MUST)** If the app uses AI to generate content shown to users, or users chat with a bot, disclose it: label AI-generated content and tell users they are interacting with an AI system (EU AI Act transparency obligations apply from August 2026).
- **PRIV-10 (SHOULD)** Default to EU data residency if most users are in the EU (DB region, Vercel function region).
