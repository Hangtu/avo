import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const canonicalPath = (path: string) => new RegExp(`^https?://[^/]+${path === "/" ? "/?" : path}$`);

async function expectSocialPreview(
  page: Page,
  path: string,
  title: string,
  description: string,
  alt: string,
) {
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", title);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", description);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonicalPath(path));
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Avo");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "es_MX");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    canonicalPath("/og/avo-share.png"),
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", alt);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", title);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", description);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    canonicalPath("/og/avo-share.png"),
  );
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute("content", alt);
}

test.describe("legal pages", () => {
  test("privacy page publishes a title, description, and canonical URL", async ({ page }) => {
    const response = await page.goto("/privacy");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Aviso de privacidad" })).toBeVisible();
    await expect(page).toHaveTitle("Aviso de privacidad | Avo");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonicalPath("/privacy"));
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Avo/);
    await expectSocialPreview(
      page,
      "/privacy",
      "Aviso de privacidad | Avo",
      "Cómo Avo usa y protege tus datos, y cómo solicitar su eliminación.",
      "Avo, un aguacate sonriente con reloj, junto a la frase «Retoma donde te quedaste».",
    );
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
    await expectSocialPreview(
      page,
      "/data-deletion",
      "Eliminación de datos | Avo",
      "Borra tus datos locales o solicita la eliminación de tu cuenta y tus datos de Avo.",
      "Avo, un aguacate sonriente con reloj, junto a la frase «Retoma donde te quedaste».",
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
    await expectSocialPreview(
      page,
      "/",
      "Avo",
      "Hábitos, pendientes y tiempo para ti.",
      "Avo, un aguacate sonriente con reloj, junto a la frase «Retoma donde te quedaste».",
    );

    await context.close();
  });

  test("serves a compact social preview image", async ({ request }) => {
    const response = await request.get("/og/avo-share.png");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\/png/);
    expect((await response.body()).byteLength).toBeLessThan(5 * 1024 * 1024);
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
