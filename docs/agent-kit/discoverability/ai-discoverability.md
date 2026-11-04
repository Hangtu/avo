# AI Discoverability (LLMs, AI search, agents)

> **Read when:** working on public content, `robots.ts`, `llms.txt`, or anything that affects how ChatGPT, Claude, Perplexity, Gemini, Copilot, and coding agents read and cite the site.
> **Principle:** Google states that AI Overviews and AI Mode need **no special optimization** beyond good SEO. Most "GEO" advice is unproven. We do the evidence-backed basics well, plus a few cheap, low-risk extras.

## Evidence-backed (MUST)

- **GEO-1 (MUST)** Server-render all meaningful content (SEO-20). Many AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot) don't execute JavaScript.
- **GEO-2 (MUST)** Don't block **search and user-triggered** AI agents in `robots.txt`, the WAF, or bot protection. Decide on **training** crawlers separately (policy below).
- **GEO-3 (MUST)** Keep structured data accurate and matched to visible content (SEO-30): `Organization` with `sameAs`, `Article` with author and dates, `BreadcrumbList`.
- **GEO-4 (MUST)** Keep content fresh and dated, with accurate sitemap `lastModified`. Ping IndexNow on publish (SEO-43); it feeds Bing/Copilot and others.
- **GEO-5 (MUST)** Make claims verifiable: cite sources, include concrete data, name the author, and show credentials where relevant.

## Low-cost extras (SHOULD)

- **GEO-10 (SHOULD)** Serve `/llms.txt` (`src/app/llms.txt/route.ts`), generated from `siteConfig` and `publicRoutes`: an H1 with the site name, a one-paragraph summary, and sections linking to key pages with one-line descriptions. Cache it with `"use cache"`. Google ignores it, and AI search barely fetches it, but **coding agents do read it**. It is cheap and harmless.
- **GEO-11 (SHOULD)** For docs or knowledge content, offer Markdown versions of pages: a `.md` route, or `Accept: text/markdown` content negotiation through a rewrite to a route handler, linked with `<link rel="alternate" type="text/markdown">`. Agents such as Claude Code and OpenCode request Markdown.
- **GEO-12 (SHOULD)** Write answer-first: each page and section opens with a direct, self-contained answer or summary, then the details. Use clear headings, short paragraphs, lists and tables. This is also good for humans and featured snippets.
- **GEO-13 (SHOULD)** Use consistent entity names everywhere: product, company and people named identically across the site, structured data, and social profiles (`sameAs`).

## Crawler policy (`src/app/robots.ts`)

Default policy, adjustable per product in `src/config/site.ts` (`aiCrawlerPolicy`):

| Category | User agents | Default |
|---|---|---|
| Search engines | Googlebot, Bingbot, Applebot, DuckDuckBot | Allow |
| AI **search** indexing | OAI-SearchBot, Claude-SearchBot, PerplexityBot, Amzn-SearchBot, MistralAI-Index | **Allow** (this is how you get cited) |
| AI **user-triggered** fetch | ChatGPT-User, Claude-User, Perplexity-User, MistralAI-User, DuckAssistBot | **Allow** |
| AI **training** | GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, meta-externalagent, Amazonbot, CCBot, Bytespider, MistralAI-Training | Product decision; **default allow** for marketing sites (more model awareness), **disallow** if content is the product |

- Disallow `/api/` and private areas for all agents.
- Add Cloudflare's Content Signals line to express preferences (not enforcement): `Content-Signal: search=yes, ai-input=yes, ai-train=<yes|no>`.
- Revisit this list every quarter. Vendors add and rename bots, and IETF AI-preference standards (AIPREF) are still drafts.

## Measuring

- Track referrals from `chatgpt.com` (`utm_source=chatgpt.com`), `perplexity.ai`, `claude.ai`, `gemini.google.com` and `copilot.microsoft.com` in analytics.
- Bing Webmaster Tools' AI Performance report shows Copilot citations. In Google Search Console, AI Overview/AI Mode traffic is included in "Web".

## Don'ts

- Don't serve different content to bots than to users (cloaking).
- Don't publish thin, AI-generated pages at scale. Search engines treat that as spam.
- Don't keep `llms.txt` or Markdown versions out of sync with the HTML. Generate them from the same source.
