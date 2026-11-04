# React Components

> **Read when:** creating or changing any component, page, or layout.
> **Scope:** App Router UI under the approved contract. Translation examples require i18n; Base UI examples require that primitive choice. Monolingual copy/navigation are valid without i18n.
> **Related:** [styling.md](styling.md), [state-management.md](state-management.md), [forms.md](forms.md), [accessibility.md](../quality/accessibility.md), [data-fetching-and-caching.md](../backend/data-fetching-and-caching.md).

## Server vs Client Components

Components are **Server Components by default**. They run only on the server, can `await` data directly, and send zero JavaScript to the browser. Client Components (`"use client"`) are for interactivity only.

- **RC-1 (MUST)** Add `"use client"` only when the component needs state, effects, event handlers, browser APIs, or a client-only library. Put it on the **smallest leaf** possible, never on a page or layout.
- **RC-2 (MUST)** Keep data fetching in Server Components (or the data layer they call). Never `fetch` your own Route Handlers from a Server Component; call the data function directly.
- **RC-3 (MUST)** Props passed from Server to Client Components must be serializable: plain objects, arrays, strings, numbers, booleans, `Date`, `Map`/`Set`, promises, and Server Actions. No class instances, no functions (except Server Actions), no DB rows with secrets.
- **RC-4 (MUST)** To render server content inside an interactive wrapper, pass it as `children` or a slot prop. Don't convert it to a Client Component:

  ```tsx
  // ✅ The server-rendered list stays on the server; only the panel is interactive.
  <CollapsiblePanel title={t("filters")}>
    <ProjectList projects={projects} />
  </CollapsiblePanel>
  ```

- **RC-5 (MUST)** Code under `src/server/**` and `src/features/*/server/**` is server-only (`import "server-only"`). Client Components must never import ordinary server modules. They may import explicitly exported Server Actions from `"use server"` files; otherwise pass data as props.
- **RC-6 (SHOULD)** To stream slow data into a Client Component, start the query in the Server Component and pass the **promise**. Unwrap it with `use()` inside `<Suspense>`:

  ```tsx
  // page.tsx (server)
  const statsPromise = getProjectStats(projectId); // no await
  return (
    <Suspense fallback={<StatsSkeleton />}>
      <StatsChart statsPromise={statsPromise} />
    </Suspense>
  );

  // stats-chart.tsx (client)
  "use client";
  export function StatsChart({ statsPromise }: { statsPromise: Promise<ProjectStats> }) {
    const stats = use(statsPromise);
    …
  }
  ```

## Component anatomy

Write every component file in this order: imports → types → component → private helpers.

```tsx
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { Project } from "../types";

type ProjectCardProps = {
  project: Project;
  className?: string;
};

export function ProjectCard({ project, className }: ProjectCardProps) {
  const t = useTranslations("Projects.card");

  return (
    <article className={cn("rounded-lg border p-4", className)}>
      <h3 className="font-medium">{project.name}</h3>
      {project.status === "archived" ? <Badge variant="secondary">{t("archived")}</Badge> : null}
    </article>
  );
}
```

- **RC-10 (MUST)** Use named function declarations: `export function ProjectCard(...)`. No `React.FC`, no anonymous default exports. Pages and layouts are the only default exports (`export default async function ProjectsPage(...)`).
- **RC-11 (MUST)** Type props with a `type <Component>Props` and destructure them in the signature. No `any`, no untyped props.
- **RC-12 (MUST)** Reusable visual components accept `className` and merge it last with `cn()`, so callers can adjust layout (margins, width) without forking the component.
- **RC-13 (SHOULD)** Primitives that wrap a native element extend its props: `type ButtonProps = React.ComponentProps<"button"> & {...}` and spread the rest onto the element.
- **RC-14 (MUST)** In React 19, `ref` is a normal prop. Don't use `forwardRef` in new code.
- **RC-15 (MUST NOT)** Define components inside other components (they remount on every render). Define them at module level.
- **RC-16 (MUST)** When i18n is active, put user-facing text in the selected catalogs and use their translation API; see [i18n.md](../discoverability/i18n.md). Otherwise coherent monolingual copy is valid.
- **RC-17 (MUST)** Use the approved navigation strategy: `@/i18n/navigation` with next-intl routing, normal `next/link` and `next/navigation` without i18n, or the preserved equivalent. Apply lint restrictions only within that strategy.

## Props design

- **RC-20 (MUST)** Prefer composition (children, slots) over configuration (many boolean props). More than ~3 boolean props usually means a variant (`cva`) or composition is needed.
- **RC-21 (MUST)** Pass the minimum data needed: `projectName`, or a narrow DTO, not the full user/session object.
- **RC-22 (SHOULD NOT)** Pass props through more than 2 levels of components that don't use them. Use composition first; use context only for truly cross-cutting client state.
- **RC-23 (MUST)** Callback props are named `onX` and receive domain values, not DOM events, when possible: `onSelect(projectId)`, not `onClick(event)`.

## Hooks, effects and the React Compiler

When the approved configuration enables React Compiler, it memoizes automatically. Preserve existing compiler settings until a change is approved; do not add manual memoization without a measured need.

- **RC-30 (MUST NOT)** Add `useMemo`, `useCallback` or `React.memo` by default. Add them only for a measured problem, with a comment explaining the measurement.
- **RC-31 (MUST)** Follow the Rules of React (lint enforced): hooks at top level only; no mutation of props, state or values during render; render must be pure.
- **RC-32 (MUST)** Derive values during render instead of syncing them into state:

  ```tsx
  // ❌ const [fullName, setFullName] = useState(""); useEffect(() => setFullName(`${first} ${last}`), [first, last]);
  // ✅
  const fullName = `${first} ${last}`;
  ```

- **RC-33 (MUST)** Use `useEffect` only to synchronize with something **outside** React (subscriptions, browser APIs, third-party widgets), always with cleanup. Never use it to fetch data, react to events, or reset state when props change (use a `key` instead).
- **RC-34 (SHOULD)** Use `useEffectEvent` for non-reactive logic called from an effect, instead of disabling the exhaustive-deps rule.
- **RC-35 (MUST)** Extract reusable stateful logic into a custom hook (`use-<name>.ts`). A hook used by one feature lives in `features/<feature>/hooks/`; one used by several lives in `src/hooks/`.

## Rendering rules

- **RC-40 (MUST)** Give list items stable, unique keys from data (`project.id`). Never use the array index for lists that can change order or length.
- **RC-41 (MUST)** Never render a number with `&&`: `{count > 0 && …}` or a ternary, never `{count && …}` (it renders `0`).
- **RC-42 (MUST)** Prefer `condition ? <A /> : null` or early returns for readability. Extract complex conditionals into variables or sub-components.
- **RC-43 (MUST)** Never compute non-deterministic values during render (`Date.now()`, `Math.random()`, `crypto.randomUUID()`) in components that render on both server and client. They cause hydration mismatches. Use `useId()` for element IDs.
- **RC-44 (MUST NOT)** Use `dangerouslySetInnerHTML`. The only exception is the JSON-LD component (`@/components/shared/json-ld`), which escapes its content. Sanitized rich text (e.g., from a CMS) requires an ADR.

## Loading, errors and empty states

- **RC-50 (MUST)** Every data-driven UI handles four states: **loading** (skeleton matching the final layout, so nothing shifts), **empty** (helpful message plus next action), **error** (friendly message plus retry), and **success**.
- **RC-51 (MUST)** Wrap independently-loading regions in their own `<Suspense>` so a slow region doesn't block the page. Use `loading.tsx` for route-level loading.
- **RC-52 (MUST)** Each major route segment (`(app)`, `(marketing)`) has an `error.tsx` boundary; see [error-handling.md](error-handling.md).

## Client Components checklist

Before adding `"use client"`, confirm:

1. It needs interactivity (state, effects, handlers, browser APIs). If not, keep it a Server Component.
2. It is the smallest possible leaf: interactive button or form, not the whole card or page.
3. It imports no ordinary `server/` modules or secrets. Explicit Server Action imports are allowed; only approved `NEXT_PUBLIC_*` env values may reach the client.
4. Heavy client-only libraries (charts, editors, maps) are loaded with `next/dynamic` when not needed for the first paint.

## Outdated patterns: never use

| Don't | Use instead |
|---|---|
| `pages/` directory, `getServerSideProps`, `getStaticProps` | App Router, Server Components |
| `next/router` in new App Router code | `next/navigation`, or the selected locale-aware adapter |
| `useEffect` + `fetch` for initial data | Server Components + data layer |
| `forwardRef` | `ref` as a prop (React 19) |
| `React.FC`, `PropTypes`, `defaultProps` | Typed props + default values in destructuring |
| `<Context.Provider value>` | `<Context value>` (React 19) |
| Class components | Function components |
| Manual `useMemo`/`useCallback` everywhere | React Compiler |
