# Playbook: Add a UI Component

> **Use when:** you need a UI element that doesn't exist yet. Read the approved component/design/navigation choices first; Base UI is the new-work preference, not a migration requirement.

## Decide where it comes from (in order)

1. **Already exists?** Search `src/components/ui`, `src/components/shared`, and the feature's `components/`. Reuse or extend with a variant.
2. **shadcn has it?** `pnpm dlx shadcn@latest add <name>` (Base UI version, generated into `src/components/ui/`). Browse it with the shadcn MCP or ui.shadcn.com.
3. **Composite of primitives?** Build it from `components/ui`:
   - used by one feature → `src/features/<feature>/components/`;
   - used by 2+ → `src/components/shared/`.
4. **Truly new primitive?** Build it on Base UI primitives (`@base-ui/react`), styled like the shadcn components, in `src/components/ui/`. Never hand-roll focus or ARIA logic for dialogs, menus, popovers, comboboxes or tabs.

## Steps

1. Server Component unless it needs interactivity (RC-1).
2. Props:
   - typed `<Name>Props`;
   - extend the native element props for primitives;
   - accept `className` and merge it with `cn()` (RC-11…13).
3. Variations go through `cva` variants, not boolean props (CSS-4).
4. Styling:
   - semantic tokens only; no arbitrary values (CSS-1, CSS-2);
   - logical properties (CSS-6);
   - all interaction states (CSS-9);
   - reduced motion (CSS-10).
5. Accessibility:
   - semantic element;
   - accessible name;
   - keyboard support;
   - visible focus;
   - 24×24 target size (A11Y-*).
6. With i18n, text comes from catalogs/translated props. Otherwise coherent monolingual copy is valid (RC-16); shared primitives take labels/content through props.
7. Test interactive behavior with Testing Library role queries (TEST-3).

## Verify

Run the contract's checks; render in selected themes/locales/viewports with keyboard/focus/contrast review and an axe scan. Do not add a theme/i18n provider only to satisfy this example.

## Done when

It's reusable at the right level, accessible, themed by tokens, and covered by tests if interactive.
