# Data Inventory (record of processing)

> Keep this current whenever a feature collects or shares personal data (PRIV-8). It feeds the privacy policy.

| Data | Purpose | Legal basis | Stored in | Retention | Shared with (processor) |
|---|---|---|---|---|---|
| Email, name | Account, sign-in, transactional email | Contract | Postgres `users` | Until account deletion + 30 days | DB host, email provider |
| Session records (IP, user agent) | Security, session management | Legitimate interest | Postgres `sessions` | Session lifetime + 30 days | DB host |
| Error reports (no PII) | Debugging | Legitimate interest | Error tracker | 90 days | Error-tracking provider |
| Page views (cookieless, aggregated) | Analytics | Legitimate interest | Vercel Web Analytics | Provider default | Vercel |

## Processors
| Provider | Purpose | Region | DPA signed |
|---|---|---|---|
| Vercel | Hosting, analytics | FILL | FILL |
| FILL (DB host) | Database | FILL | FILL |
| FILL (email) | Transactional email | FILL | FILL |
