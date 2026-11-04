# Reference: A Monolingual Landing

> **Use when:** a public static page needs UI, SEO, and accessibility but no accounts or persistence.
> **Scope:** an illustrative responsibility map, not a generated or runtime-tested application.

## Minimal shape

```text
src/app/
  layout.tsx                html lang, font, metadataBase, global styles
  page.tsx                  static metadata and section composition
  globals.css               tokens and base styles
  sitemap.ts                actual indexable URLs
  robots.ts                 intended crawl policy
src/components/layout/      header/footer, only when needed
src/features/marketing/
  components/               meaningful sections, no empty server directory
public/                     actual brand/content assets
e2e/
  home.spec.ts              production-build smoke and axe
```

Do not create `messages`, `i18n`, auth/DB clients, providers, cache tags, an external API, or unused form tooling. One static page may keep simple markup in the route until extraction earns a responsibility.

## Page pattern

The root layout supplies `metadataBase` from the validated real site URL and `<html lang="en">` (use the approved language). The following is an example of static metadata, not production product copy:

```tsx
import type { Metadata } from "next";

import { LandingContent } from "@/features/marketing/components/landing-content";

export const metadata: Metadata = {
  title: "Product overview",
  description: "Learn what the product does, who it helps, and how to get started.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Product overview",
    description: "Learn what the product does, who it helps, and how to get started.",
    url: "/",
  },
};

export default function HomePage() {
  return <LandingContent />;
}
```

Use actual approved copy, canonical domain, social image, and truthful entities before shipping. Shared root social metadata can supply the image. No fake company, ratings, stock testimonials, or unresolved production domain.

`LandingContent` is a Server Component with one main landmark, meaningful headings, real anchor links, appropriate image alt text, and the project's tokens. Normal `next/link` is valid. Native controls handle simple interactions; add client components only when necessary.

## Verification

- Build and the app's verify checks.
- Browser smoke: intended content and heading, navigation, title/description/canonical/social tags, sitemap, and axe.
- Manual keyboard/focus, contrast, supported widths, and reduced-motion checks when animation exists.
- Test pure logic when added; do not create a passing empty unit suite.

For a contact form, propose `forms` activation and its validation/abuse/privacy requirements. For several languages, propose i18n and the URL/metadata migration explicitly. For accounts/persistence, add only those approved capabilities without rebuilding the landing.
