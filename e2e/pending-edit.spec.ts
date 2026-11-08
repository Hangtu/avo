import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("guest can edit a pending and cancel later changes without losing other actions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Ajustes", exact: true })).toBeEnabled({
    timeout: 20_000,
  });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await page.getByRole("button", { name: /^Pendientes/ }).click();

  await page.getByRole("button", { name: "Agregar un pendiente", exact: true }).click();
  await page.getByLabel("¿Qué quieres hacer?").fill("Revisar la cita");
  await page.getByLabel("Minutos", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();

  let pending = page.getByRole("listitem").filter({ hasText: "Revisar la cita" });
  await expect(pending).toContainText("20 min");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const menuTrigger = pending.getByRole("button", { name: "Más opciones", exact: true });
  await menuTrigger.focus();
  await page.keyboard.press("Enter");
  const editMenuItem = page.getByRole("menuitem", { name: "Editar", exact: true });
  await expect(editMenuItem).toBeVisible();
  await expect(editMenuItem).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Editar pendiente", exact: true })).toBeVisible();

  const title = page.getByLabel("¿Qué quieres hacer?");
  const minutes = page.getByLabel("Minutos", { exact: true });
  await expect(title).toBeFocused();
  await expect(title).toHaveValue("Revisar la cita");
  await expect(minutes).toHaveValue("20");
  const accessibility = await new AxeBuilder({ page })
    .include('section[aria-labelledby="pending-title"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await title.fill("Revisar cita del pediatra");
  await minutes.fill("15");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();

  pending = page.getByRole("listitem").filter({ hasText: "Revisar cita del pediatra" });
  await expect(pending).toContainText("15 min");
  await expect(pending.getByRole("button", { name: "Más opciones", exact: true })).toBeFocused();
  await expect(page.getByText("Listo, actualicé el pendiente.", { exact: true })).toBeVisible();

  await pending.getByRole("button", { name: "Más opciones", exact: true }).click();
  await page.getByRole("menuitem", { name: "Editar", exact: true }).click();
  await title.fill("Este cambio no debe guardarse");
  await minutes.fill("40");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(pending.getByRole("button", { name: "Más opciones", exact: true })).toBeFocused();
  await expect(pending).toContainText("Revisar cita del pediatra");
  await expect(pending).toContainText("15 min");
  await expect(title).toHaveCount(0);

  await pending.getByRole("button", { name: "Más opciones", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Ya lo hice ✅", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Quitar", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
});
