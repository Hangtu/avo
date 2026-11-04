# Playbook: Add Translations or a New Locale

## A. Adding or changing messages

1. Add keys under the right namespace (I18N-3) in the **default locale** file first, then in every other `messages/<locale>.json`.
2. Use ICU for variables, plurals and selects (I18N-4); use `t.rich` for inline markup (I18N-5).
3. If you can't produce a quality translation, add the default-locale text, and list the untranslated keys in the PR under "Needs translation".
4. Remove keys that are no longer used, from **all** locales.
5. Run `pnpm i18n:check` and `pnpm typecheck` (keys are typed).

## B. Adding a new locale (e.g., `fr`)

1. **Ask first.** Confirm the locale code (BCP 47), its script, its text direction, and who will review the translations.
2. Add the code to `locales` in `src/i18n/routing.ts`.
3. Create `messages/fr.json` with **every** key of the default locale (`pnpm i18n:check` must pass).
4. **Fonts:** make sure the `next/font` subsets cover the script (e.g., `latin-ext`, `cyrillic`, `arabic`).
5. **RTL locales** (ar, he, fa, ur):
   - `getLocaleDirection` returns `"rtl"`;
   - check the layout for logical properties (CSS-6);
   - mirror directional icons.
6. **Locale switcher:** add the language name written in its own language (I18N-13).
7. **SEO:** hreflang alternates and sitemap entries derive from `routing.locales` automatically. Verify them on one page and in `/sitemap.xml`. Add localized metadata (`Metadata.*` keys).
8. **Formats:** check date, number and currency formats in the new locale on key screens.
9. **Legal pages:** provide localized privacy/terms pages, or decide explicitly to link the default-language version.
10. **Tests:** add the locale to the E2E smoke test (renders, `lang` attribute correct, axe clean).

## Verify

`pnpm verify`, `pnpm build`, `pnpm test:e2e`; browse the new locale at mobile and desktop widths.

## Done when

Every page works in the new locale, with correct `lang`/`dir`, localized metadata, hreflang and sitemap entries.
