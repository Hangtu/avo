import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("guest selects several moments and saves edits/copies together", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ajustes", exact: true })).toBeEnabled({
    timeout: 20_000,
  });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await page.getByRole("button", { name: "Hábitos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tus hábitos", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Nuevo hábito", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Leer 20 minutos");
  await page.getByRole("button", { name: "Mañana", exact: true }).click();
  await page.getByRole("button", { name: "Tarde", exact: true }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  let matchingRows = page.getByRole("listitem").filter({ hasText: "Leer 20 minutos" });
  await expect(matchingRows).toHaveCount(2);
  await expect(matchingRows.filter({ hasText: "05:00" })).toHaveCount(1);
  await expect(matchingRows.filter({ hasText: "12:00" })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const morningRow = matchingRows.filter({ hasText: "05:00" });
  await morningRow.getByRole("button", { name: "Leer 20 minutos: Más opciones", exact: true }).click();
  await page.getByRole("menuitem", { name: "Editar hábito", exact: true }).click();
  await page.getByRole("button", { name: "Noche", exact: true }).click();
  await expect(
    page.getByText("Este hábito conservará su historial en Mañana.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Se agregará 1 copia al guardar.", { exact: true })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "19:00" })).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page })
    .include('section[aria-labelledby="tasks-title"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole("button", { name: "← Volver", exact: true }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Leer 20 minutos" })).toHaveCount(2);
  await expect(page.getByRole("listitem").filter({ hasText: "19:00" })).toHaveCount(0);

  const reopenedMorning = page.getByRole("listitem").filter({ hasText: "Leer 20 minutos" }).filter({
    hasText: "05:00",
  });
  await reopenedMorning.getByRole("button", { name: "Leer 20 minutos: Más opciones", exact: true }).click();
  await page.getByRole("menuitem", { name: "Editar hábito", exact: true }).click();
  await page.getByRole("button", { name: "Noche", exact: true }).click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  matchingRows = page.getByRole("listitem").filter({ hasText: "Leer 20 minutos" });
  await expect(matchingRows).toHaveCount(3);
  await expect(matchingRows.filter({ hasText: "05:00" })).toHaveCount(1);
  await expect(matchingRows.filter({ hasText: "12:00" })).toHaveCount(1);
  await expect(matchingRows.filter({ hasText: "19:00" })).toHaveCount(1);

  await page.getByRole("button", { name: "Nuevo hábito", exact: true }).click();
  const anyTime = page.getByRole("button", { name: "Cualquier hora", exact: true });
  const chooseHours = page.getByRole("button", { name: "Elegir horas", exact: true });
  await expect(anyTime).toHaveAttribute("aria-pressed", "true");
  await chooseHours.click();
  await expect(page.getByLabel("De", { exact: true })).toBeVisible();
  await expect(anyTime).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Noche", exact: true }).click();
  await expect(page.getByLabel("De", { exact: true })).toHaveCount(0);
  await expect(chooseHours).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Noche", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await anyTime.click();
  await expect(anyTime).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Noche", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "← Volver", exact: true }).click();
});

test("keeps an exact-time habit and gives copies only their selected time window", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ajustes", exact: true })).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Hábitos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tus hábitos", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nuevo hábito", exact: true }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Lectura exacta");
  await page.getByRole("switch", { name: "Hora exacta", exact: true }).click();
  await page.getByLabel("Hora", { exact: true }).fill("18:30");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  const exactHabit = page.getByRole("listitem").filter({ hasText: "Lectura exacta" });
  await expect(exactHabit).toHaveCount(1);
  await expect(exactHabit).toContainText("18:30");
  await exactHabit.getByRole("button", { name: "Lectura exacta: Más opciones", exact: true }).click();
  await page.getByRole("menuitem", { name: "Editar hábito", exact: true }).click();
  await page.getByRole("button", { name: "Mañana", exact: true }).click();
  await expect(
    page.getByText("Este hábito conservará su historial en Hora exacta.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();

  const rows = page.getByRole("listitem").filter({ hasText: "Lectura exacta" });
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "18:30" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "05:00" })).toHaveCount(1);
});
