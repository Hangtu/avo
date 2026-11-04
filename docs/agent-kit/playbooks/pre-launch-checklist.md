# Playbook: Pre-Launch Checklist

> **Use when:** preparing the first production launch, or a major public release. Work through it on the production-like deployment.

## Infrastructure
- [ ] Custom domain on Vercel with HTTPS; `www` ↔ apex redirect decided; HSTS active.
- [ ] Production env vars set; secrets unique to production; `NEXT_PUBLIC_SITE_URL` = the production origin.
- [ ] Production DB: point-in-time recovery on, backups verified (a restore was tested once), app role least-privilege.
- [ ] Migrations applied by CI; rollback tested on a preview deployment (Instant Rollback).
- [ ] Vercel Firewall rules and rate limits for auth and API routes; BotID or similar on public forms if needed.

## Quality
- [ ] `pnpm verify`, `pnpm build`, `pnpm test:e2e` green on `main`.
- [ ] Lighthouse (mobile) on key public pages: Performance ≥ 90, Accessibility 100, SEO 100, Best Practices ≥ 95.
- [ ] Manual keyboard and screen-reader pass on the core journeys.
- [ ] Every locale reviewed by someone fluent; no missing keys.
- [ ] 404, 500 and offline/error states look right and are localized.

## Security
- [ ] Security headers verified (securityheaders.com or Mozilla Observatory); CSP enforced or in report-only with a date to enforce.
- [ ] Next.js/React on the latest security release; `pnpm audit --prod` reviewed.
- [ ] Auth flows: email verification, password reset, session revocation, rate limiting tested.
- [ ] No debug routes, test accounts, or seed data in production.
- [ ] Secret scanning and Dependabot alerts enabled on the repo.

## SEO & discoverability
- [ ] Google Search Console and Bing Webmaster Tools verified; sitemap submitted.
- [ ] `robots.txt` correct for production (not the preview noindex); AI crawler policy confirmed.
- [ ] Canonical URLs use the production domain; hreflang validated on sample pages.
- [ ] Structured data passes the Rich Results Test; OG images render in social preview debuggers.
- [ ] `llms.txt` lists the key pages; favicon, `manifest`, and apple-touch icon present.

## Legal & privacy
- [ ] Privacy policy, terms, cookie notice, imprint (if required), accessibility statement: published, localized, linked in the footer.
- [ ] Consent banner present **if** any non-essential cookies or trackers exist; GPC honored.
- [ ] Data inventory (`docs/product/data-inventory.md`) complete; processors listed in the privacy policy.
- [ ] Account export and deletion work end to end.
- [ ] Transactional email: SPF, DKIM and DMARC set for the sending domain; templates localized.

## Operations
- [ ] Error tracking receives events from production, with release and source maps; alerts routed to a watched channel.
- [ ] Uptime monitor on `/api/health`; Speed Insights and Web Analytics enabled.
- [ ] Incident basics: who's on call for launch week, how to roll back, where the status updates go.
