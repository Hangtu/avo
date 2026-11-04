# Data Fetching and Caching

> **Read when:** reading data for a page or component, caching anything, or invalidating after a mutation.
> **Scope:** the cache/streaming recipe assumes Cache Components is enabled in the approved configuration. Do not enable it implicitly during adoption. Public reads do not need sessions; literal static content needs no shared cache/tags.

## Mental model

Each page is a **static shell** plus **dynamic holes**:

- The **static shell** is everything that doesn't depend on the request: layout, headings, nav, marketing copy, and cached data. It is prerendered at build time and served instantly.
- The **dynamic holes** depend on the request: cookies, session, `searchParams`, uncached DB reads. Each one must sit inside a `<Suspense>` boundary with a skeleton fallback. The build **fails** if request data is read outside `<Suspense>`. That error is a feature: it tells you where to put a boundary.

## Rules

- **DATA-1 (MUST)** Read data in Server Components by calling the feature's `server/queries.ts` functions. Never `fetch` your own API routes from the server, and never fetch initial data in Client Components.
- **DATA-2 (MUST)** Give each query an explicit public/private policy. Private functions resolve and authorize the verified actor themselves (`requireActor()` in the session reference); callers never supply an arbitrary user ID as authority. Public published-content queries need no session.
- **DATA-3 (MUST)** Return DTOs: explicit, minimal objects (`toProject(row)`). Never return raw rows that could include secrets (password hashes, tokens, internal flags).
- **DATA-4 (MUST)** Put each piece of request-dependent UI in its own component, wrapped in `<Suspense fallback={<Skeleton…/>}>`. Await `params` and `searchParams` **inside** that component, not at the top of the page, unless the whole page is dynamic.
- **DATA-5 (MUST)** Avoid waterfalls. Start independent queries together (`Promise.all`), or start a promise in the parent and `use()` it in a child.
- **DATA-6 (MUST)** Never cache per-user or permission-dependent data with plain `"use cache"`. Shared caches are reused across users. User-specific data is either dynamic (default) or uses `"use cache: private"` with a short `cacheLife`.
- **DATA-7 (MUST)** Every `"use cache"` scope declares `cacheLife(...)` **and** at least one `cacheTag(...)`, so it can be invalidated. Cache keys and tags are stored in plain text: use IDs, never secrets or PII.
- **DATA-8 (MUST)** A mutation invalidates the actual cached reads it affects; do not invent tags for uncached private reads:
  - in Server Actions, `updateTag(tag)` (the user immediately sees their own write);
  - in Route Handlers and webhooks, `revalidateTag(tag, "max")` (stale-while-revalidate), or `revalidateTag(tag, { expire: 0 })` when content must update immediately.
- **DATA-9 (MUST)** When shared caching exists, define tags once per relevant feature in `server/cache-tags.ts`. Never create the file or tag strings without cached consumers.
- **DATA-10 (MUST)** Use React `cache()` to dedupe the same per-request read across components (e.g., `getCurrentUser`). It is per-request memoization, not a cross-request cache.
- **DATA-11 (MUST NOT)** Use `unstable_cache`, `export const revalidate`, `export const dynamic`, `export const runtime`, or `fetch(..., { next: { revalidate } })` in new code.
- **DATA-12 (SHOULD)** Use `after()` (from `next/server`) for work that shouldn't delay the response: analytics, audit logs, cache warming.
- **DATA-13 (MUST)** Paginate every list that can grow, with a hard maximum page size (e.g., 100). Prefer cursor (keyset) pagination for large or infinite lists.

## Which strategy?

| Data | Strategy | Example |
|---|---|---|
| Literal static content | Static server output; no data cache or tags | landing copy |
| Shared fetched content, rarely changes (blog, plans) | `"use cache"` + `cacheLife("days")` or `"max"` + tag | `listPublishedPosts(locale)` |
| Same for everyone, changes on writes (catalog, public profiles) | `"use cache"` + `cacheLife("hours")` + tag, invalidated in mutations | `getPublicProfile(slug)` |
| Per user / per permission | Dynamic inside `<Suspense>` (no cache) | `listProjects()` |
| Per user, expensive, tolerates staleness | `"use cache: private"` + `cacheLife("minutes")` | dashboard aggregates |
| Must be live | Dynamic + client refresh (`router.refresh()`), or polling with an ADR | notifications |

## Patterns

### Cache tags (one file per feature)

```ts
// src/features/projects/server/cache-tags.ts
import "server-only";

export const projectTags = {
  all: () => "projects",
  byOwner: (ownerId: string) => `projects:owner:${ownerId}`,
  byId: (projectId: string) => `project:${projectId}`,
};
```

### Cached shared data

```ts
// src/features/blog/server/queries.ts
import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export async function listPublishedPosts(locale: Locale): Promise<PostSummary[]> {
  "use cache";
  cacheLife("days");
  cacheTag(postTags.all());

  const rows = await db.select(postSummaryColumns).from(posts)
    .where(and(eq(posts.locale, locale), eq(posts.status, "published")))
    .orderBy(desc(posts.publishedAt))
    .limit(50);
  return rows.map(toPostSummary);
}
```

Arguments are part of the cache key. A cached function can't read `cookies()`, `headers()` or `searchParams`; pass the values it needs as arguments.

### Dynamic per-user data with a static shell

```tsx
// src/app/[locale]/(app)/projects/page.tsx
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { ProjectListSection } from "@/features/projects/components/project-list-section";
import { ProjectListSkeleton } from "@/features/projects/components/project-list-skeleton";

export default async function ProjectsPage({ searchParams }: PageProps<"/[locale]/projects">) {
  const t = await getTranslations("Projects.page"); // static: part of the shell
  return (
    <>
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectListSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}
```

```tsx
// src/features/projects/components/project-list-section.tsx (Server Component)
export async function ProjectListSection({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser(); // page-only redirect; import from the selected session helper
  const { page, sortBy } = await loadProjectSearchParams(searchParams);
  const projects = await listProjects({ page, sortBy }); // independently authorizes, dynamic
  return projects.length > 0 ? <ProjectList projects={projects} /> : <ProjectsEmptyState />;
}
```

### Invalidation after a write

```ts
// inside a createAction handler
const project = await createProject(input); // from ./mutations
updateTag(projectTags.byOwner(user.id));
return { id: project.id };
```
