# State Management

> **Read when:** deciding where data/UI state belongs. URL libraries, theme/locale providers, and auth storage are selected capabilities, not dependencies to install for every app.
> **Related:** [data-fetching-and-caching.md](../backend/data-fetching-and-caching.md), [forms.md](forms.md), [react-components.md](react-components.md).

Most "state management" problems in Next.js disappear when server data stays on the server. **Default to no client state library.**

## Decision tree

Ask these questions in order and stop at the first "yes".

| # | Question | Where it lives | Tool |
|---|---|---|---|
| 1 | Can it be computed from other state or props? | Nowhere: derive it during render | plain code |
| 2 | Is it data from the database or an API? | Server | Server Components + data layer; mutate with Server Actions + cache invalidation |
| 3 | Should it survive reload, be shareable, or work with Back/Forward? (filters, search, sort, pagination, tabs, selected item, open modal with deep link) | URL | `searchParams` on the server; `nuqs` on the client |
| 4 | Is it input inside a form? | The form | React Hook Form, or native form + `useActionState`; see [forms.md](forms.md) |
| 5 | Is it UI state used by one component or a small subtree (open/closed, hover, step)? | That component | `useState` / `useReducer`, colocated |
| 6 | Is it a user preference that affects the first render (theme, locale)? | Cookie (+ DB when signed in) | `next-themes`, next-intl locale cookie |
| 7 | Is it client UI state shared by distant components (sidebar, command palette)? | A small client provider | React Context |
| 8 | Is it high-frequency or complex client state shared app-wide (editor, canvas)? | Client store | Zustand, **only with an ADR** |
| 9 | Must the client poll, paginate infinitely, or cache server data independently of navigation? | Client cache | TanStack Query, **only with an ADR** |

## Rules

- **STATE-1 (MUST NOT)** Copy server data into client state (`useState(props.projects)`, global stores) "to have it on the client". Render it from props; refresh with cache invalidation after mutations.
- **STATE-2 (MUST NOT)** Fetch initial data in `useEffect`. Fetch in Server Components.
- **STATE-3 (MUST)** Put any state the user would expect to bookmark or share in the URL. Validate URL params like any external input (Zod or nuqs parsers). Invalid values fall back to defaults; they never crash the page.
- **STATE-4 (MUST)** Use the approved URL-state strategy with validated parsers. Native Next navigation is sufficient for simple links/filters. When nuqs is selected and server rendering depends on changes, use `shallow: false` and appropriate transition feedback.
- **STATE-5 (MUST)** Colocate state in the lowest common parent that needs it. Lift it only when a sibling truly needs it.
- **STATE-6 (MUST)** Show pending states with the built-in React tools: `useActionState` (form result and pending), `useFormStatus` (submit button), `useTransition` (navigation or action pending), `useOptimistic` (instant feedback before the server confirms).
- **STATE-7 (MUST NOT)** Store SSR-relevant preferences (theme, locale) only in `localStorage`. The server can't read it, so the page flashes. Use a cookie.
- **STATE-8 (MUST NOT)** Put secrets, tokens, or another user's data in client state, `localStorage`, or `sessionStorage`. Auth sessions use httpOnly cookies managed by Better Auth.
- **STATE-9 (SHOULD)** Model complex local state transitions with `useReducer` and a discriminated union of actions, not several interdependent `useState` calls.

## URL state example (server reads, client writes)

```tsx
// src/features/projects/search-params.ts (shared parsers, isomorphic)
import { createLoader, parseAsInteger, parseAsStringLiteral } from "nuqs/server";

export const PROJECT_SORTS = ["createdAt", "name"] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export const projectSearchParams = {
  page: parseAsInteger.withDefault(1),
  sortBy: parseAsStringLiteral(PROJECT_SORTS).withDefault("createdAt"),
};
export const loadProjectSearchParams = createLoader(projectSearchParams);
```

```tsx
// page.tsx (server)
export default async function ProjectsPage({ searchParams }: PageProps<"/[locale]/projects">) {
  const { page, sortBy } = await loadProjectSearchParams(searchParams);
  const projects = await listProjects({ page, sortBy }); // auth-aware data-layer query
  …
}
```

```tsx
// sort-select.tsx (client)
"use client";
import { useQueryStates } from "nuqs";
import { useTransition } from "react";

import { projectSearchParams } from "../search-params";

export function SortSelect() {
  const [isPending, startTransition] = useTransition();
  const [{ sortBy }, setParams] = useQueryStates(projectSearchParams, { shallow: false, startTransition });
  …
}
```

## Optimistic UI example

```tsx
"use client";
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  todos,
  (current, newTodo: Todo) => [...current, newTodo],
);

function handleAdd(formData: FormData) {
  startTransition(async () => {
    addOptimisticTodo({ id: crypto.randomUUID(), title: String(formData.get("title")), isPending: true });
    const result = await createTodoAction(formData);
    if (!result.ok) toast.error(t(`Errors.${result.code}`));
  });
}
```
