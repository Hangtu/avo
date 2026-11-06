import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("una rutina muestra un solo paso por vez y deshacerla conserva los hábitos e historial", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ajustes", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Hábitos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tus hábitos", exact: true })).toBeVisible();

  const prepare = page.getByRole("listitem").filter({ hasText: "Cepillarme los dientes" });
  await prepare.getByRole("button", { name: "Cepillarme los dientes: Más opciones", exact: true }).click();
  await page.getByRole("menuitem", { name: "Convertir en rutina", exact: true }).click();
  await page.getByLabel("Nombre de la rutina", { exact: true }).fill("Mañana");
  await page.getByRole("checkbox", { name: /Bañarme/ }).check();
  const order = page.getByRole("list", { name: "Orden de los pasos", exact: true });
  const steps = order.getByRole("listitem");
  await expect(steps).toHaveCount(2);
  const showerGrip = steps.nth(1).getByRole("button", { name: "Arrastrar para ordenar", exact: true });
  const prepareGrip = steps.nth(0).getByRole("button", { name: "Arrastrar para ordenar", exact: true });
  await showerGrip.dragTo(prepareGrip, { steps: 10 });
  await expect(steps.nth(0)).toContainText("Bañarme");
  await order.getByRole("button", { name: "Opciones de orden para Bañarme", exact: true }).click();
  await page.getByRole("menuitem", { name: "Bajar Bañarme", exact: true }).click();
  await expect(steps.nth(0)).toContainText("Cepillarme los dientes");
  const editorAxe = await new AxeBuilder({ page })
    .include("form")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(editorAxe.violations).toEqual([]);
  await page.getByRole("button", { name: "Guardar rutina", exact: true }).click();

  const routine = page.getByRole("region", { name: "Rutina: Mañana", exact: true });
  await expect(routine).toBeVisible();
  await expect(routine.getByRole("listitem")).toHaveCount(2);
  await expect(routine).toContainText("Paso 1 de 2");

  const habitsAxe = await new AxeBuilder({ page })
    .include('section[aria-labelledby="tasks-title"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(habitsAxe.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole("button", { name: "Hoy", exact: true }).click();
  const firstStep = "Rutina «Mañana» · paso 1 de 2";
  await expect(page.locator(".first-eyebrow").filter({ hasText: firstStep })).toBeVisible();
  const todayAxe = await new AxeBuilder({ page })
    .include(".peek-layout")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(todayAxe.violations).toEqual([]);

  await page.getByRole("button", { name: "Más opciones", exact: true }).click();
  await page.getByRole("menuitem", { name: "Ya está hecho ✅", exact: true }).click();
  await page.getByRole("button", { name: "Sí, ya está hecha", exact: true }).click();
  await expect(
    page.locator(".first-eyebrow").filter({ hasText: "Rutina «Mañana» · paso 2 de 2" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Más opciones", exact: true }).click();
  await page.getByRole("menuitem", { name: "Hoy no ❌", exact: true }).click();
  await page.getByRole("button", { name: "Sí, hoy no", exact: true }).click();

  await page.getByRole("button", { name: "Hábitos", exact: true }).click();
  const savedRoutine = page.getByRole("region", { name: "Rutina: Mañana", exact: true });
  await savedRoutine.getByRole("button", { name: "Deshacer rutina", exact: true }).click();
  await expect(page.getByRole("region", { name: "Rutina: Mañana", exact: true })).toHaveCount(0);
  const completedHabit = page.getByRole("listitem").filter({ hasText: "Cepillarme los dientes" });
  const skippedHabit = page.getByRole("listitem").filter({ hasText: "Bañarme" });
  await expect(completedHabit).toContainText("Hecho hoy");
  await expect(skippedHabit).toContainText("Hoy no aplica");
});

test("la creación y presentación de rutinas también funciona en inglés", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ajustes", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await page.getByRole("combobox", { name: "Idioma", exact: true }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Habits", exact: true }).click();

  const prepare = page.getByRole("listitem").filter({ hasText: "Cepillarme los dientes" });
  await prepare.getByRole("button", { name: "Cepillarme los dientes: More options", exact: true }).click();
  await page.getByRole("menuitem", { name: "Turn into a routine", exact: true }).click();
  await page.getByLabel("Routine name", { exact: true }).fill("Morning");
  await page.getByRole("checkbox", { name: /Bañarme/ }).check();
  await page.getByRole("button", { name: "Save routine", exact: true }).click();

  await expect(page.getByRole("region", { name: "Routine: Morning", exact: true })).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .include('section[aria-labelledby="tasks-title"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(
    page.locator(".first-eyebrow").filter({ hasText: "Routine “Morning” · step 1 of 2" }),
  ).toBeVisible();
});
