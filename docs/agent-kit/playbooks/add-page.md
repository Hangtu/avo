# Playbook: Add a Page

> **Use when:** adding a route. Read the project contract first; locale/auth groups are conditional.

1. **Classify.** Is the page intended for public indexing, private users, or neither? Do not infer indexing solely from absence of authentication.
2. **Choose the actual route.** Monolingual default: `src/app/(marketing)/<path>/page.tsx` or simply `src/app/<path>/page.tsx`. With i18n, use the selected locale segment. Create route groups only when their layouts/policies earn them.
3. **Compose server-first.** Keep data/business operations out of route files. Simple static markup is valid; extract meaningful sections, not speculative server layers. Use one main landmark and a clear heading hierarchy.
4. **Metadata.** Indexable content needs descriptive title/description, canonical, social metadata, and sitemap coverage. Use static `metadata` for static values, `generateMetadata` when dynamic, and a helper where reused. Private areas need an appropriate noindex policy; noindex is not access control.
5. **Data/params.** Validate external params/search input. Handle missing content with real status semantics. With Cache Components, request-dependent work belongs under Suspense; cache shared reads only when justified.
6. **States and accessibility.** Relevant loading/empty/error/success states, error recovery, keyboard/focus, labels, contrast, responsive layout. Static pages do not need fake loading/data states.
7. **Languages.** With i18n, selected catalog keys, localized metadata/navigation, and real hreflang equivalents. Otherwise use monolingual copy and normal Next navigation.
8. **Discovery/navigation.** Link from existing content/menu. Add truthful structured data only where applicable. `llms.txt` is an optional extra, not a launch blocker.
9. **Tests/review.** Browser smoke for content/navigation and axe; indexable pages assert metadata/canonical/sitemap, and locale alternates only when active. Review manual accessibility separately.

Run the contract's checks, production build, and affected E2E. Report actual evidence and unexecuted checks. See [SEO](../discoverability/seo.md), [accessibility](../quality/accessibility.md), and [Definition of Done](../workflow/definition-of-done.md).
