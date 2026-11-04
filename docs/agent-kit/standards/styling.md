# Styling (Tailwind CSS v4 + shadcn/ui on Base UI)

> **Read when:** writing any className, CSS, design token, or UI component.
> **Scope:** Tailwind v4/Base UI recipe for selected new work. Existing approved design systems are preserved. Add only used primitives/helpers; dark tokens are required only for supported themes.
> **Enforced by:** Prettier class sorting, ESLint (`no-restricted-imports` for Radix), code review. Optional: `eslint-plugin-better-tailwindcss` to flag unknown or conflicting classes, once it supports the installed ESLint major.

## Where styles live

| What | Where |
|---|---|
| Design tokens (colors, radius, fonts, shadows, breakpoints) | CSS variables in `src/app/globals.css`, exposed through `@theme inline` |
| Base element styles (body, headings, focus) | `@layer base` in `globals.css` |
| Reusable custom utilities | `@utility` in `globals.css` |
| Component styles | Tailwind classes in the component |
| Component variants | `cva()` in the component file |

There is **no** `tailwind.config.js`. Tailwind v4 is configured in CSS.

## Rules

- **CSS-1 (MUST)** Use **semantic tokens**, never raw palette values or hex codes, in components: `bg-background`, `text-foreground`, `bg-primary text-primary-foreground`, `text-muted-foreground`, `border-border`, `bg-destructive`, `ring-ring`. To add a color, add a token pair (light + dark) to `globals.css`.
- **CSS-2 (MUST NOT)** Use arbitrary values (`w-[437px]`, `text-[#ff0000]`, `mt-[13px]`) when a scale value or token exists. If a value repeats, make it a token. One-off arbitrary values need a comment explaining why.
- **CSS-3 (MUST)** When conditional/consumer classes need merging, use the project's `cn()` helper (`clsx` + `tailwind-merge` by default). Plain static class strings need no helper. Never build partial Tailwind class names dynamically (`` `text-${color}-500` ``); map values to complete classes.
- **CSS-4 (SHOULD)** For reusable components with real variation, use `cva` and typed variant props (`variant`, `size`) rather than scattered boolean logic. A single static section needs no variant abstraction:

  ```tsx
  const badgeVariants = cva("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", {
    variants: {
      tone: {
        neutral: "bg-secondary text-secondary-foreground",
        success: "bg-success text-success-foreground",
        danger: "bg-destructive text-white",
      },
    },
    defaultVariants: { tone: "neutral" },
  });

  type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

  export function Badge({ className, tone, ...props }: BadgeProps) {
    return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
  }
  ```

- **CSS-5 (MUST)** Design mobile-first: base classes are for small screens; add `sm:`, `md:`, `lg:` for larger ones. Use container queries (`@container`, `@md:`) for components whose layout depends on their container, not the viewport.
- **CSS-6 (MUST)** Use logical properties so RTL locales work: `ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`/`text-end`, `border-s`/`border-e`, `rounded-s`/`rounded-e`. Not `ml-*`, `mr-*`, `left-*`, `text-left`.
- **CSS-7 (MUST)** Use `dark:` variants only through tokens. Tokens already switch in `.dark`, so components rarely need `dark:` at all.
- **CSS-8 (MUST)** Use `gap-*` for spacing between siblings in flex/grid (not margins on children). Use `size-*` when width equals height.
- **CSS-9 (MUST)** Every interactive element has hover, `focus-visible`, active and disabled styles. Never remove focus outlines without a visible replacement (`focus-visible:ring-2 ring-ring`).
- **CSS-10 (MUST)** Wrap animations in `motion-safe:`, or disable them with `motion-reduce:`. Prefer CSS transitions and `tw-animate-css` utilities. Add a JS animation library only with an ADR.
- **CSS-11 (MUST)** Use the z-index scale tokens (`z-dropdown`, `z-sticky`, `z-overlay`, `z-modal`, `z-toast`) defined in `globals.css`, never arbitrary `z-[999]`.
- **CSS-12 (MUST)** Sort classes with Prettier (automatic). Keep class lists readable; extract a component or a `cva` variant when one exceeds ~2 lines.
- **CSS-13 (MUST NOT)** Use inline `style={{}}`, except for truly dynamic values (computed positions, CSS variables set from data: `style={{ "--progress": `${pct}%` }}`).
- **CSS-14 (MUST NOT)** Write global CSS for component styling, or CSS Modules, Sass, or CSS-in-JS.

## shadcn/ui + Base UI rules

- **CSS-20 (MUST)** Add primitives with `pnpm dlx shadcn@latest add <component>`. Never paste component code from blogs or other registries; most of it is Radix-based.
- **CSS-21 (MUST)** Use the Base UI API exposed by our components:
  - Use the `render` prop to swap the element (e.g., a button that renders a link), not `asChild`.
  - Style states with Base UI's data attributes (`data-open:`, `data-closed:`, `data-disabled:`, `data-starting-style:`, `data-ending-style:`), not Radix's `data-[state=open]:`.
- **CSS-22 (MUST NOT)** Introduce Radix imports into a Base UI-selected component system. Preserve an approved existing Radix system until migration is authorized; configure restrictions to match that decision.
- **CSS-23 (SHOULD)** Keep edits to `src/components/ui/*` minimal and intentional (tokens, variants). Put app-specific compositions in `components/shared` or the feature. Note customizations at the top of the file, so a later `shadcn add --overwrite` doesn't silently lose them.
- **CSS-24 (MUST NOT)** Re-implement focus management, keyboard handling, or ARIA on top of Base UI components. They already handle it.

## Tokens (shape of `globals.css`)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  /* …generated by shadcn init; add brand tokens here in pairs… */
  --success: oklch(0.6 0.15 150);
  --success-foreground: oklch(0.985 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* …every token redefined… */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --radius-lg: var(--radius);
  --font-sans: var(--font-geist-sans);
}

/* z-index scale: Tailwind has no z-index theme namespace, so define named utilities */
@utility z-sticky { z-index: 40; }
@utility z-dropdown { z-index: 50; }
@utility z-overlay { z-index: 60; }
@utility z-modal { z-index: 70; }
@utility z-toast { z-index: 80; }

@layer base {
  * { @apply border-border outline-ring/50; }
  html { scroll-padding-top: 5rem; } /* keeps focused elements clear of the sticky header (WCAG 2.4.11) */
  body { @apply bg-background text-foreground antialiased; }
}
```

> The exact token list comes from `shadcn init`. Extend it; don't replace it. Check every new color pair for 4.5:1 text contrast in **both** themes.

## Fonts and icons

- Load fonts with `next/font` (self-hosted, no layout shift), as variable fonts exposed as CSS variables (`--font-sans`). At most 2 families. Include subsets for every supported locale's script.
- Icons come from `lucide-react`. Size them with `size-4`/`size-5`, and add `aria-hidden="true"` when next to text (see [accessibility.md](../quality/accessibility.md)).
