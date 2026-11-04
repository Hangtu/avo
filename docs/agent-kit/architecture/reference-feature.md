# Reference Feature: `projects`

> **Read when:** building an authenticated DB-backed feature with selected i18n/form tooling. This is an expanded recipe, not a mandatory feature scaffold.
> For static content start with [reference-landing.md](reference-landing.md). Omit files/capabilities without consumers. Ordinary private dynamic reads do not require cache tags; add them only for an actual cached projection.

A signed-in user can list, create and archive their own projects.

## Files

```text
src/server/db/schema/projects.ts                 # table (see database.md)
src/features/projects/
├── constants.ts
├── types.ts
├── schemas.ts
├── search-params.ts
├── utils.ts                                     # toProject() mapper (pure)
├── server/
│   ├── cache-tags.ts
│   ├── queries.ts
│   ├── mutations.ts
│   ├── mutations.test.ts
│   └── actions.ts
└── components/
    ├── project-list-section.tsx                 # async Server Component (dynamic hole)
    ├── project-list.tsx                         # Server Component
    ├── project-list-skeleton.tsx
    ├── projects-empty-state.tsx
    ├── create-project-form.tsx                  # "use client"
    └── archive-project-button.tsx               # "use client"
src/app/[locale]/(app)/projects/page.tsx
src/app/[locale]/(app)/projects/new/page.tsx
messages/en.json, messages/es.json               # "Projects" namespace
e2e/projects.spec.ts
```

## Shared definitions

```ts
// constants.ts
export const PROJECT_NAME_MAX_LENGTH = 80;
export const PROJECTS_PAGE_SIZE = 20;
```

```ts
// types.ts: the DTO the UI receives (never the raw row)
import type { PROJECT_STATUSES } from "@/server/db/schema";

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: Date;
};
```

> Type-only imports from `@/server/db/schema` are fine in isomorphic files: `import type` is erased at build time.

```ts
// schemas.ts
import { z } from "zod";

import { PROJECT_NAME_MAX_LENGTH } from "./constants";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, { error: "required" }).max(PROJECT_NAME_MAX_LENGTH, { error: "projectNameTooLong" }),
  description: z.string().trim().max(500, { error: "descriptionTooLong" }).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const archiveProjectSchema = z.object({ projectId: z.uuid() });
```

```ts
// utils.ts
import type { ProjectRow } from "@/server/db/schema";

import type { Project } from "./types";

export function toProject(row: Pick<ProjectRow, "id" | "name" | "description" | "status" | "createdAt">): Project {
  return { id: row.id, name: row.name, description: row.description, status: row.status, createdAt: row.createdAt };
}
```

## Server

```ts
// server/queries.ts
import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { requireActor } from "@/server/auth/session";

import { PROJECTS_PAGE_SIZE } from "../constants";
import type { ProjectSort } from "../search-params";
import type { Project } from "../types";
import { toProject } from "../utils";

const projectColumns = {
  id: projects.id, name: projects.name, description: projects.description,
  status: projects.status, createdAt: projects.createdAt,
};

/** Projects of the signed-in user. Auth-aware: never pass a user ID in. Dynamic. */
export async function listProjects({ page, sortBy }: { page: number; sortBy: ProjectSort }): Promise<Project[]> {
  const user = await requireActor();
  const rows = await db
    .select(projectColumns)
    .from(projects)
    .where(and(eq(projects.ownerId, user.id), eq(projects.status, "active")))
    .orderBy(sortBy === "name" ? asc(projects.name) : desc(projects.createdAt))
    .limit(PROJECTS_PAGE_SIZE)
    .offset((page - 1) * PROJECTS_PAGE_SIZE);
  return rows.map(toProject);
}
```

`server/cache-tags.ts`, `server/mutations.ts` (`createProject`, `archiveProject`) and `server/actions.ts` (`createProjectAction`, `archiveProjectAction`) are exactly as shown in [data-fetching-and-caching.md](../backend/data-fetching-and-caching.md) and [server-actions.md](../backend/server-actions.md). `createProject`:

```ts
// In server/mutations.ts; import requireActor from "@/server/auth/session".
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const user = await requireActor();
  const [row] = await db.insert(projects).values({ ...input, ownerId: user.id }).returning({
    id: projects.id, name: projects.name, description: projects.description,
    status: projects.status, createdAt: projects.createdAt,
  });
  if (!row) throw new AppError("internalError");
  return toProject(row);
}
```

## Pages

```tsx
// src/app/[locale]/(app)/projects/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { ProjectListSection } from "@/features/projects/components/project-list-section";
import { ProjectListSkeleton } from "@/features/projects/components/project-list-skeleton";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Projects.page" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ProjectsPage({ searchParams }: PageProps<"/[locale]/projects">) {
  const t = await getTranslations("Projects.page");
  return (
    <main id="main-content" className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button render={<Link href="/projects/new" />}>{t("create")}</Button>
      </header>
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectListSection searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
```

The `<main>` landmark belongs to whichever layout or page owns the content area. Keep exactly one per page.

## Client components

`create-project-form.tsx` is the interactive-form reference in [forms.md](../standards/forms.md).

```tsx
// archive-project-button.tsx
"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { archiveProjectAction } from "../server/actions";

export function ArchiveProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const t = useTranslations("Projects.archive");
  const tErrors = useTranslations("Errors");
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await archiveProjectAction({ projectId });
      if (result.ok) toast.success(t("done", { name: projectName }));
      else toast.error(tErrors(result.code));
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending} aria-label={t("label", { name: projectName })}>
      {t("button")}
    </Button>
  );
}
```

## Messages

```json
{
  "Projects": {
    "page": { "title": "Projects", "create": "New project" },
    "list": { "emptyTitle": "No projects yet", "emptyDescription": "Create your first project to get started." },
    "form": { "nameLabel": "Project name", "submit": "Create project", "submitting": "Creating…", "created": "Project created" },
    "archive": { "button": "Archive", "label": "Archive {name}", "done": "{name} archived" }
  }
}
```

## Tests

- `schemas.test.ts`: validation keys (see [testing.md](../quality/testing.md)).
- `server/mutations.test.ts`: create, plus "can't archive another user's project".
- `e2e/projects.spec.ts`: create → appears in the list → archive → disappears, with an axe scan on each page.
