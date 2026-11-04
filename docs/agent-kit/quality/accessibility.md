# Accessibility (a11y)

> **Read when:** building or changing any UI. Accessibility is a requirement, not a polish step.
> **Target:** WCAG 2.2 Level AA. This is also the legal baseline in many markets (EU: European Accessibility Act via EN 301 549; US: ADA).
> **Enforced by:** ESLint `jsx-a11y`, Testing Library role queries, axe checks in Playwright, the PR checklist, manual keyboard and screen-reader checks.

## Golden rules

- **A11Y-1 (MUST)** Use native semantic HTML first. A `<button>` for actions, an `<a>` (via `Link`) for navigation, `<label>` for inputs, `<ul>/<li>` for lists, `<table>` for tabular data. Never put `onClick` on a `div` or `span`.
- **A11Y-2 (MUST)** Use ARIA only when no native element exists, and follow the WAI-ARIA Authoring Practices pattern exactly. No ARIA is better than wrong ARIA.
- **A11Y-3 (MUST)** Build complex widgets (dialog, menu, popover, combobox, tabs, tooltip, select) from our shadcn/ui components, which handle focus, keyboard, and ARIA. Never hand-roll them.
- **A11Y-4 (MUST)** Everything must work with a keyboard alone, in a logical order, with a visible focus indicator.

## Page structure

- **A11Y-10 (MUST)** Set `<html lang={locale} dir={direction}>` from the active locale. Mark inline text in another language with `lang` (e.g., the language names in the locale switcher).
- **A11Y-11 (MUST)** Use landmarks: one `<header>`, one `<main id="main-content">`, one `<footer>`, and `<nav aria-label="…">` for each navigation region (label them when there is more than one).
- **A11Y-12 (MUST)** Make a "Skip to main content" link the first focusable element; it becomes visible on focus.
- **A11Y-13 (MUST)** Give each page exactly one `<h1>` and keep heading levels in order (no jumps from h2 to h4). Choose heading level by structure, not size; style with classes.
- **A11Y-14 (MUST)** Give each page a unique, descriptive `<title>` (via metadata; see [seo.md](../discoverability/seo.md)).

## Text alternatives and media

- **A11Y-20 (MUST)** Give meaningful images a short `alt` that conveys their purpose. Decorative images get `alt=""`. Never use a file name as `alt`.
- **A11Y-21 (MUST)** Icons next to visible text get `aria-hidden="true"`. Icon-only buttons and links get an accessible name: a translated `aria-label`, or visually hidden text (`sr-only`).
- **A11Y-22 (MUST)** Video has captions; audio has a transcript. No media autoplays with sound. Anything that moves for more than 5 seconds can be paused.

## Color, contrast and visual design

- **A11Y-30 (MUST)** Meet contrast ratios: normal text 4.5:1, large text (≥ 24px, or ≥ 18.66px bold) 3:1, UI component boundaries and focus indicators 3:1. Design tokens are chosen to pass in **both** light and dark themes; don't introduce one-off colors.
- **A11Y-31 (MUST NOT)** Use color as the only signal (errors, status, links in text, chart series). Add text, icons, or patterns.
- **A11Y-32 (MUST)** Keep focus visible: use `focus-visible:` ring styles. Never remove outlines (`outline-none`) without an equal or better replacement.
- **A11Y-33 (MUST)** Keep the focused element from being hidden behind sticky headers or footers (WCAG 2.4.11). Use `scroll-padding-top` matching the header height.
- **A11Y-34 (MUST)** Content reflows at 320 CSS px width and 400% zoom without horizontal scrolling (except tables, maps, code). Use `rem` for font sizes. Never disable zoom in the viewport meta.
- **A11Y-35 (MUST)** Respect `prefers-reduced-motion`: animations use the `motion-safe:` variant, or are removed with `motion-reduce:`. Nothing flashes more than 3 times per second.

## Interaction

- **A11Y-40 (MUST)** Make interactive targets at least **24×24 CSS px** (WCAG 2.5.8), or space them so 24px circles don't overlap. Aim for **44×44** for primary touch actions.
- **A11Y-41 (MUST)** Every drag-and-drop interaction has a single-pointer alternative, such as buttons or a menu (WCAG 2.5.7).
- **A11Y-42 (MUST)** Never use positive `tabIndex`. Use `tabIndex={-1}` only to focus something programmatically.
- **A11Y-43 (MUST)** When a dialog opens, move focus into it, trap focus while it is open, close it with Escape, and return focus to the trigger when it closes. Our dialog components do all of this. Don't override it.
- **A11Y-44 (MUST)** Content that appears on hover or focus (tooltips, popovers) can be dismissed with Escape, stays visible while the pointer is over it, and never contains essential information that is unavailable otherwise.
- **A11Y-45 (MUST)** After client-side changes that aren't navigations (item added, filter applied, async result), announce them with a polite live region or a toast. Our toast component (sonner) does this.
- **A11Y-46 (MUST)** Write link text that makes sense out of context. No "click here" or "read more" without an accessible name that says *what*. Avoid `target="_blank"`. If it is unavoidable, say so in the accessible name ("opens in a new tab").
- **A11Y-47 (MUST)** Warn users before a session timeout, and let them extend it where possible.

## Forms

See [forms.md](../standards/forms.md) for the implementation. Requirements:

- **A11Y-50 (MUST)** Visible labels, programmatically associated with their inputs. Group related inputs in `<fieldset>` with a `<legend>`.
- **A11Y-51 (MUST)** Errors are described in text, linked to the field (`aria-invalid` + `aria-describedby`), and focus moves to the first error on submit.
- **A11Y-52 (MUST)** Use `autocomplete` attributes for personal data (WCAG 1.3.5).
- **A11Y-53 (MUST)** Don't ask for the same information twice in one flow. Pre-fill it or offer to reuse it (WCAG 3.3.7).
- **A11Y-54 (MUST)** Authentication requires no cognitive test (no puzzles, no "type the characters"). Allow paste and password managers; support passkeys and magic links where offered (WCAG 3.3.8).
- **A11Y-55 (MUST)** Help and contact links appear in the same place on every page that has them (WCAG 3.2.6).

## Data display

- **A11Y-60 (MUST)** Tables have `<caption>` (it may be visually hidden) and `<th scope="col|row">`. Don't use tables for layout.
- **A11Y-61 (MUST)** Charts have a text alternative: a summary sentence plus an accessible data table or list.
- **A11Y-62 (MUST)** Loading regions use `aria-busy="true"` while loading. Skeletons are hidden from assistive technology (`aria-hidden`), and the loaded content is announced when relevant.

## Testing (required for every UI change)

1. **Automated (CI):**
   - ESLint `jsx-a11y` passes.
   - Component tests query by role and name (`getByRole("button", { name: … })`). If you can't find an element by role, it's probably inaccessible.
   - Playwright runs an axe scan on every page in the E2E suite, with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`. **Zero violations allowed**; exceptions need an issue link and an expiry date.
2. **Manual, keyboard pass (every UI PR):** Tab through the whole flow and check:
   - focus is always visible
   - the order is logical
   - everything is operable
   - Escape closes overlays
   - there are no keyboard traps
3. **Manual, zoom pass (new layouts):** at 200% and 400% zoom, and at 320px width, nothing is cut off or overlapping.
4. **Manual, screen reader smoke test (new components and critical flows):** VoiceOver (macOS/iOS) or NVDA (Windows). Check that names, roles, states and announcements make sense.

Automated tools find only part of the problems. Steps 2 to 4 are not optional for new UI.

## Quick checklist (copy into PRs with UI changes)

- [ ] Semantic elements; no clickable `div`s
- [ ] One `h1`; heading levels in order; landmarks present
- [ ] All images have appropriate `alt`; icon-only buttons have names
- [ ] Contrast passes in light **and** dark mode
- [ ] Keyboard: everything reachable and operable; visible focus; no traps
- [ ] Targets ≥ 24×24 px
- [ ] Form labels, errors linked to fields, autocomplete set
- [ ] Reduced motion respected
- [ ] Works at 320px width and 200% zoom
- [ ] axe scan: 0 violations
