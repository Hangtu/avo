# Testing

> **Read when:** writing any code (tests are part of the change), fixing a bug, or touching test config.
> **Tools:** preferred app tools are Vitest/Testing Library, PGlite when DB tests exist, MSW when HTTP mocks exist, and Playwright + axe for browser journeys. Preserve approved equivalents. Kit work uses [kit validation](kit-validation.md), not app packages.
> **Scope:** test behavior at agreed public boundaries in small slices. Only selected capabilities need their associated setup; no empty suites or fixed test-type quotas.

## What to test where

| Layer | Test type | Tool | Location |
|---|---|---|---|
| Zod schemas, pure utils, permission functions (`canEditProject`) | Unit | Vitest | `*.test.ts` next to the file |
| `queries.ts` / `mutations.ts` (real SQL, authorization) | Integration | Vitest + PGlite + migrations | `server/*.test.ts` |
| Server Actions (validation, auth, error mapping) | Integration | Vitest, session mocked at `@/server/auth/session` | `server/actions.test.ts` |
| Client Components with logic (forms, interactive widgets) | Component | Vitest + Testing Library (jsdom) | `components/*.test.tsx` |
| Async Server Components, pages, full journeys | E2E | Playwright | `e2e/*.spec.ts` |
| Accessibility of every page | E2E | `@axe-core/playwright` | inside each E2E spec |
| Third-party APIs | Mocked | MSW 3 (`http`/`HttpResponse` from `msw/http`, `setupServer` from `msw/node`) | per test |

## Rules

- **TEST-1 (MUST)** New logic ships with tests in the same PR. Bug fixes start with a **failing** regression test.
- **TEST-2 (MUST)** Test behavior through public interfaces (inputs → outputs, rendered UI → user actions), not implementation details. Don't assert on internal state, private functions, or CSS classes.
- **TEST-3 (MUST)** In component tests, query by role and accessible name first (`getByRole("button", { name: "Save" })`), then by label or text. `getByTestId` is a last resort.
- **TEST-4 (MUST)** Use `userEvent` (not `fireEvent`) for interactions.
- **TEST-5 (MUST)** Run data-layer tests against real Postgres semantics (PGlite with all migrations applied), not a mocked `db`. Each test starts from a clean state (transaction rollback, or truncation in `beforeEach`).
- **TEST-6 (MUST)** Mock only at system boundaries: HTTP (MSW), time (`vi.useFakeTimers` / `vi.setSystemTime`), randomness, the session helper. Never mock the module under test or our own data layer in integration tests.
- **TEST-7 (MUST)** Build test data with factory functions (`buildProject({ name: "x" })`) in `src/test/factories/`, with sensible defaults. Never use production data.
- **TEST-8 (MUST)** Every test is independent and deterministic: no reliance on order, real network, the current date, or shared mutable state. A flaky test is a bug; fix it or delete it with an issue, and never retry it into passing.
- **TEST-9 (MUST)** E2E covers actual critical journeys. Auth, payment, locale-switching, and public SEO cases apply only when those capabilities exist. Scan visited UI pages with axe and resolve violations; manual keyboard/focus/contrast review remains separate.
- **TEST-10 (MUST)** Test names describe behavior: `it("returns notFound when the project belongs to another user")`. Structure: Arrange → Act → Assert.
- **TEST-11 (MUST NOT)** Commit `.only` or `.skip`, or lower coverage thresholds to pass CI.
- **TEST-12 (SHOULD)** Coverage is a signal, not a goal: ≥ 80% lines on `src/features/*/server/**` and `src/lib/**`. UI coverage is driven by E2E journeys.

## Examples

```ts
// src/features/projects/schemas.test.ts
import { describe, expect, it } from "vitest";
import { createProjectSchema } from "./schemas";

describe("createProjectSchema", () => {
  it("trims the name and rejects empty names with the 'required' key", () => {
    const result = createProjectSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("required");
  });
});
```

```ts
// src/features/projects/server/mutations.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireActor } from "@/server/auth/session";
import { createTestUser, resetDatabase } from "@/test/db";
import { archiveProject, createProject } from "./mutations";

vi.mock("@/server/auth/session", () => ({ requireActor: vi.fn() }));

describe("archiveProject", () => {
  beforeEach(resetDatabase);

  it("rejects archiving another user's project with notFound", async () => {
    const owner = await createTestUser();
    const stranger = await createTestUser();
    // The test setup mocks only the session boundary, not the data layer.
    vi.mocked(requireActor).mockResolvedValue(owner);
    const project = await createProject({ name: "Mine" });
    vi.mocked(requireActor).mockResolvedValue(stranger);

    await expect(archiveProject({ projectId: project.id }))
      .rejects.toMatchObject({ code: "notFound" });
  });
});
```

```ts
// e2e/create-project.spec.ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("signed-in user creates a project", async ({ page }) => {
  await page.goto("/projects/new");
  await page.getByLabel("Project name").fill("Launch plan");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: "Launch plan" })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

## Commands

| Command | Runs |
|---|---|
| `pnpm test` | All Vitest tests once (CI mode) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright against a production build (`pnpm build && pnpm start`, managed by Playwright's `webServer`) |
| `pnpm test:e2e --ui` | Playwright UI mode for debugging |

When auth is selected, a Playwright **setup project** signs in once and saves `storageState` (`e2e/.auth/user.json`, gitignored). Specs reuse it.

Version-sensitive notes (verify with installed tools; these are not bootstrap evidence):
- axe has no `wcag22a` tag. `wcag22aa` covers the WCAG 2.2 AA rules axe can check automatically (e.g., target size).
- Component tests run in jsdom, matching the Next.js testing guide. Vitest's Browser Mode (`@vitest/browser-playwright`, `*.browser.test.tsx` in a separate `test.projects` entry) can be adopted with an ADR for components that need real browser layout.
- Async Server Components can't be rendered by Testing Library; cover them with E2E tests.
