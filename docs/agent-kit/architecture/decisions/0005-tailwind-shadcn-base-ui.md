# 0005. Use Tailwind CSS + shadcn/ui on Base UI

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

We need a consistent, accessible design system that agents can extend without inventing styles, with zero runtime CSS cost and easy theming (light/dark, brand). The shadcn CLI 4 defaults to the `base-nova` preset on **Base UI**: unstyled, accessible primitives with stable 1.x releases, maintained by the teams behind Radix, Floating UI and MUI.

## Decision

- Tailwind CSS v4 with CSS-first configuration. Design tokens are CSS variables in `src/app/globals.css` (`@theme`).
- shadcn/ui components generated into `src/components/ui/` with `--base base` (Base UI). We own and may adapt them.
- Variants with `cva`, class merging with `cn()` (`clsx` + `tailwind-merge`).
- No Radix imports. Use Base UI's `render` prop instead of `asChild`.

## Consequences

- **Positive:**
  - One styling approach.
  - Accessible behavior (focus, keyboard, ARIA) built in.
  - Small CSS; tokens shared across components.
- **Negative:**
  - Much online example code (and agent memory) is Radix-based: `asChild`, `data-[state=open]`. Agents must use the generated components and Base UI APIs instead.

## Alternatives considered

| Option | Why not |
|---|---|
| shadcn/ui on Radix | Viable, but Base UI is the CLI default and more actively developed |
| MUI / Chakra / Mantine | Runtime styling or heavy theming; harder to own |
| CSS Modules / Sass | No shared token system; more decisions per component |

## Enforcement

- [styling.md](../../standards/styling.md).
- ESLint: `no-restricted-imports` for `@radix-ui/*`.
