import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const canonicalPath = (path: string) => new RegExp(`^https?://[^/]+${path}$`);

test.describe("legal pages", () => {
  test("privacy page publishes a title, description, and canonical URL", async ({ page }) => {
    const response = await page.goto("/privacy");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Aviso de privacidad" })).toBeVisible();
    await expect(page).toHaveTitle("Aviso de privacidad | Avo");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalPath("/privacy"));
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Avo/);
  });

  test("data-deletion page explains local deletion and the support channel", async ({ page }) => {
    const response = await page.goto("/data-deletion");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Eliminación de datos" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Borrar datos locales de invitado" })).toBeVisible();
    await expect(page.getByRole("link", { name: "support@frutit.app" })).toHaveAttribute(
      "href",
      /^mailto:support@frutit\.app/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      canonicalPath("/data-deletion"),
    );
  });

  for (const path of ["/privacy", "/data-deletion"]) {
    test(`${path} has no automatically detectable WCAG A/AA violations`, async ({ page }) => {
      await page.goto(path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("public shell", () => {
  test("serves the public landing without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    const response = await page.goto("/");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Retoma donde te quedaste." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/privacy");
    await expect(page.getByRole("link", { name: "Eliminación de datos" })).toHaveAttribute(
      "href",
      "/data-deletion",
    );

    await context.close();
  });

  test("keeps guest account guidance in Settings and the dark backdrop fixed while scrolling", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1025, height: 345 });
    const response = await page.goto("/");

    expect(response?.status()).toBe(200);
    const settingsButton = page.getByRole("button", { name: "Ajustes", exact: true });
    await expect(settingsButton).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Al iniciar sesión, podrás respaldar/)).toHaveCount(0);
    await expect(
      page.getByText("Guardado solo en este navegador. Sin cuenta, no hay respaldo en la nube.", {
        exact: true,
      }),
    ).toHaveCount(0);

    await settingsButton.click();
    await expect(page.getByRole("heading", { level: 2, name: "Ajustes" })).toBeVisible();
    await expect(
      page.getByText(/Al iniciar sesión, podrás respaldar tus hábitos y pendientes/),
    ).toBeVisible();
    await expect(
      page.getByText("Guardado solo en este navegador. Sin cuenta, no hay respaldo en la nube.", {
        exact: true,
      }),
    ).toHaveCount(0);

    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    const background = await page.locator("body").evaluate((element) => ({
      attachment: getComputedStyle(element).backgroundAttachment,
      scrollY: window.scrollY,
    }));
    expect(background.attachment.split(",").every((attachment) => attachment.trim() === "fixed")).toBe(true);
    expect(background.scrollY).toBeGreaterThan(0);
    const screenshot = testInfo.outputPath("settings-bottom.png");
    await page.screenshot({ path: screenshot });
    console.log(`Settings bottom screenshot: ${screenshot}`);
  });

  test("renders the not-found page for unknown routes", async ({ page }) => {
    const response = await page.goto("/esta-pagina-no-existe");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Volver a Avo/ })).toBeVisible();
  });

  test("sends the baseline security headers and hides the framework banner", async ({ page }) => {
    const response = await page.goto("/privacy");
    const headers = response?.headers() ?? {};

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
    expect(headers["content-security-policy-report-only"]).toContain("default-src 'self'");
    expect(headers["content-security-policy-report-only"]).toContain("script-src 'self'");
    expect(headers["content-security-policy-report-only"]).not.toMatch(/unsafe-inline|unsafe-eval|nonce-/);
    expect(headers["content-security-policy"]).toBeUndefined();
  });

  test("reports an inline script violation without blocking the public page", async ({ page }) => {
    await page.goto("/privacy");
    await page.evaluate(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        if (event.effectiveDirective === "script-src-elem" && event.disposition === "report")
          document.documentElement.dataset.cspObserved = "report";
      });
      const probe = document.createElement("script");
      probe.textContent = "document.documentElement.dataset.cspProbe = 'ran'";
      document.body.appendChild(probe);
    });
    await expect(page.locator("html")).toHaveAttribute("data-csp-probe", "ran");
    await expect(page.locator("html")).toHaveAttribute("data-csp-observed", "report");
  });

  test("describes the public pages in robots.txt and sitemap.xml", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const robotsBody = await robots.text();
    expect(robotsBody).toContain("Disallow: /api/");
    expect(robotsBody).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain("/privacy");
    expect(sitemapBody).toContain("/data-deletion");
  });

  test("serves an installable manifest", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      name: "Avo",
      short_name: "Avo",
      lang: "es-MX",
      start_url: "/",
    });
  });
});
