# Naming Conventions

> **Read when:** creating or renaming anything: files, folders, components, functions, types, routes, DB objects, env vars, i18n keys, cache tags, analytics events, branches.
> **Enforced by:** ESLint (`@typescript-eslint/naming-convention`, filename-case rule), code review.

Predictable names let the next person (or agent) **find** existing code instead of re-creating it. When in doubt, search the codebase for a similar thing and copy its naming.

## Principles

- **NAME-1 (MUST)** Write identifiers, file names, comments, commit messages and DB objects in **English**. User-facing text lives in `messages/*.json`, never in identifiers.
- **NAME-2 (MUST)** Use the vocabulary from [`docs/product/glossary.md`](../product/glossary.md). One concept = one word everywhere: DB, code, UI, URLs. Never mix synonyms (`client`/`customer`, `remove`/`delete`, `org`/`team`).
- **NAME-3 (MUST)** Be descriptive, not short. Abbreviate only universal terms: `id`, `url`, `api`, `db`, `ui`, `i18n`, `seo`, `min`, `max`.
- **NAME-4 (MUST)** Treat acronyms as words: `userId`, `apiUrl`, `HtmlRenderer`, not `userID`, `APIURL`.
- **NAME-5 (SHOULD)** Put units in numeric names: `timeoutMs`, `maxSizeBytes`, `priceCents`, `ttlSeconds`.
- **NAME-6 (MUST NOT)** Use meaningless names: `data2`, `info`, `obj`, `temp`, `stuff`, `helper`, `manager`, `misc`, `handle` (alone). Exception: `data` as the payload field of a result object.
- **NAME-7 (MUST NOT)** Use negated booleans: `isHidden`, not `isNotVisible`.

## Casing reference

| Thing | Convention | Example |
|---|---|---|
| Folders | kebab-case | `user-settings/` |
| Files (`.ts`, `.tsx`, `.css`, `.md`) | kebab-case | `project-card.tsx`, `use-debounced-value.ts` |
| Next.js special files | exactly as Next.js requires | `page.tsx`, `layout.tsx`, `route.ts`, `not-found.tsx`, `opengraph-image.tsx` |
| Route groups | lowercase in parentheses | `(marketing)`, `(app)`, `(auth)` |
| Dynamic segments | camelCase in brackets; `Id` suffix for IDs | `[projectId]`, `[slug]`, `[...segments]` |
| React components | PascalCase noun phrase | `ProjectCard`, `CreateProjectForm` |
| Component props type | `<Component>Props` | `ProjectCardProps` |
| Hooks | `use` + PascalCase | `useDebouncedValue` |
| Functions, variables | camelCase | `listProjectsByOwner`, `totalCount` |
| Booleans | `is` / `has` / `can` / `should` prefix | `isLoading`, `hasAccess`, `canEdit` |
| Module-level constants (primitives, frozen lists) | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE_BYTES`, `PROJECT_STATUSES` |
| Config objects | camelCase + `Config` | `siteConfig`, `navigationConfig` |
| Types and interfaces | PascalCase, no `I`/`T` prefix | `Project`, `CreateProjectInput` |
| Generic parameters | `T` or `T` + name | `T`, `TItem`, `TError` |
| Zod schemas | camelCase + `Schema` | `createProjectSchema` |
| Types inferred from Zod | PascalCase, no suffix | `CreateProjectInput` |
| DB row types | PascalCase + `Row` | `ProjectRow` |
| Server Actions | verb + noun + `Action` | `createProjectAction`, `archiveProjectAction` |
| Data-layer mutations (`server/mutations.ts`) | verb + noun | `createProject`, `archiveProject` |
| Event handlers (inside a component) | `handle` + event | `handleSubmit`, `handleNameChange` |
| Callback props | `on` + event | `onSelect`, `onOpenChange` |
| CSS custom properties | kebab-case | `--color-brand`, `--radius-card` |
| Design tokens / Tailwind theme keys | semantic kebab-case | `bg-primary`, `text-muted-foreground` |
| DB tables | snake_case, **plural** | `projects`, `project_members` |
| DB columns | snake_case, singular | `owner_id`, `created_at`, `is_archived` |
| Drizzle table objects (TS) | camelCase, plural | `projects`, `projectMembers` |
| DB enums | snake_case type, snake_case values | `project_status`: `active`, `archived` |
| DB indexes / constraints | `<table>_<cols>_<suffix>` (Postgres style) | `projects_owner_id_idx`, `users_email_key`, `projects_owner_id_fkey` |
| Env vars | SCREAMING_SNAKE_CASE, provider prefix | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` |
| URL paths | lowercase kebab-case, plural nouns | `/projects/[projectId]/settings` |
| Query params and JSON fields | camelCase | `?sortBy=createdAt&page=2`, `{ "createdAt": "…" }` |
| REST endpoints | `/api/v1/<plural-resource>` | `/api/v1/projects/{projectId}/members` |
| i18n namespaces | PascalCase (feature or shared area) | `Common`, `Projects`, `Validation` |
| i18n keys | camelCase, grouped by UI area | `Projects.form.nameLabel` |
| Cache tags | `<entity>`, `<entity>:<id>`, `<entity>:<scope>:<id>` | `projects`, `project:0193…`, `projects:owner:0193…` |
| Analytics events | snake_case `<object>_<past-tense verb>` | `project_created`, `checkout_completed` |
| Git branches | `<type>/<short-kebab-description>` | `feat/project-sharing`, `fix/login-redirect-loop` |
| Unit / integration tests | `<file>.test.ts(x)` next to the source | `project-card.test.tsx` |
| E2E tests | `e2e/<journey>.spec.ts` | `e2e/create-project.spec.ts` |

## Function verbs

Use one verb per meaning, so a name tells you what a function does and what it returns.

| Prefix | Meaning | Returns | Example |
|---|---|---|---|
| `get…` | Read one thing | the value, or `null` if not found | `getProjectById(id)` |
| `list…` | Read many | an array (maybe empty) | `listProjectsByOwner(ownerId)` |
| `require…` | Read, and stop if missing or not allowed | the value; otherwise throws or redirects | `requireUser()` |
| `create…` / `update…` / `delete…` | Mutations | the affected entity, or `void` | `createProject(input)` |
| `is…` / `has…` / `can…` / `should…` | Predicates | `boolean` | `canEditProject(user, project)` |
| `to…` | Pure conversion between shapes | the converted value | `toProjectDto(row)` |
| `parse…` | Turn unknown input into a validated value | value, or a result/error | `parseSortParam(raw)` |
| `format…` | Value → display string | `string` | `formatFileSize(bytes)` |
| `build…` | Assemble an object (metadata, URL, query) | object | `buildPageMetadata(...)` |
| `handle…` | Event handler inside a component | `void` | `handleSubmit` |
| `use…` | React hooks **only** | anything | `useMediaQuery` |
| `with…` | Wrappers / higher-order functions | function | `withRetry(fn)` |

## Files and folders

- **NAME-10 (MUST)** Use kebab-case for every file and folder except Next.js reserved names and dynamic segments.
- **NAME-11 (MUST)** Name a file after its main export: `ProjectCard` → `project-card.tsx`; `useMediaQuery` → `use-media-query.ts`.
- **NAME-12 (MUST)** One exported component per file. Small private sub-components used only in that file are allowed.
- **NAME-13 (MUST)** Use the standard file names inside a feature (see [project-structure.md](../architecture/project-structure.md)): `schemas.ts`, `types.ts`, `constants.ts`, `utils.ts`, `server/queries.ts`, `server/mutations.ts`, `server/actions.ts`, `server/cache-tags.ts`, `components/`, `hooks/`.
- **NAME-14 (MUST NOT)** Create `index.ts` files that re-export other files ("barrel files"). Import from the file that defines the thing.

## TypeScript names

- **NAME-20 (MUST)** Use string-literal unions plus an `as const` array instead of TypeScript `enum`:

  ```ts
  export const PROJECT_STATUSES = ["active", "archived"] as const;
  export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
  ```

- **NAME-21 (MUST)** Name types by layer:
  - `ProjectRow`: the database row (`typeof projects.$inferSelect`), used only on the server.
  - `Project`: the safe object returned by the data layer to the UI (the DTO).
  - `CreateProjectInput`: validated input (`z.infer<typeof createProjectSchema>`).
- **NAME-22 (SHOULD)** Name generic parameters descriptively when there is more than one: `<TData, TError>`.

## Routes and URLs

- **NAME-30 (MUST)** Use lowercase kebab-case nouns, plural for collections: `/projects`, `/projects/[projectId]`, `/blog/[slug]`. No verbs, except the conventional `new` and `edit` pages (`/projects/new`).
- **NAME-31 (MUST)** Public, indexable pages use human-readable slugs, never raw IDs, when a slug exists: `/blog/how-to-plan-a-trip`, not `/blog/8f3a…`.
- **NAME-32 (MUST)** No trailing slashes, no uppercase, no file extensions, no `_` in URLs.

## Database

- **NAME-40 (MUST)** Primary key `id`. Foreign keys `<singular_table>_id` (`project_id`).
- **NAME-41 (MUST)** Timestamps end in `_at` (`created_at`, `deleted_at`). Date-only columns end in `_on` (`starts_on`). Booleans start with `is_` or `has_`.
- **NAME-42 (MUST)** Money columns state their unit: `price_cents` (integer) with a `currency` column (ISO 4217).

## i18n keys

- **NAME-50 (MUST)** Keys describe **purpose**, not wording: `Projects.list.emptyTitle`, not `Projects.noProjectsYetText`. The wording can change; the key stays.
- **NAME-51 (MUST NOT)** Build keys by string concatenation. If you need a key per value, use a typed map or an ICU `select` message.

## Examples

```ts
// ✅ DO
export function listProjectsByOwner(ownerId: string): Promise<Project[]> { … }
const isArchived = project.status === "archived";
const MAX_PROJECTS_PER_USER = 50;
function handleDeleteClick() { … }
<ProjectCard project={project} onSelect={handleSelect} />

// ❌ DON'T
export function getData(id: string) { … }   // vague verb + noun
const flag = project.status === "archived"; // boolean without is/has/can
const maxProjects = 50;                      // module constant not SCREAMING_SNAKE_CASE
function deleteClick() { … }                 // handler without handle prefix
<ProjectCard proj={p} selectCallback={cb} /> // abbreviations, wrong callback name
```
