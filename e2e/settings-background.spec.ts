import { expect, test } from "@playwright/test";

const viewports = [
  { name: "tall", width: 997, height: 1298 },
  { name: "short", width: 1025, height: 345 },
  { name: "mobile", width: 390, height: 844 },
];

for (const viewport of viewports) {
  for (const theme of ["dark", "light"] as const) {
    test(`Settings background stays continuous in ${theme} ${viewport.name} view`, async ({
      browser,
    }, testInfo) => {
      // Avoid inherited PWA caches and wait out opacity-only screen transitions.
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme,
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      try {
        const page = await context.newPage();
        await page.goto("/");
        await page.getByRole("button", { name: "Ajustes", exact: true }).click({ timeout: 20_000 });
        const settings = page.getByRole("region", { name: "Ajustes", exact: true });
        await expect(settings).toBeVisible();
        await expect(settings.locator("..")).toHaveCSS("opacity", "1");
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

        const background = await page.locator("body").evaluate((element) => {
          const style = getComputedStyle(element);
          return { repeat: style.backgroundRepeat, attachment: style.backgroundAttachment };
        });
        expect(background.repeat.split(",").every((value) => value.trim() === "no-repeat")).toBe(true);
        expect(background.attachment.split(",").every((value) => value.trim() === "fixed")).toBe(true);

        const screenshot = await page.screenshot({
          path: testInfo.outputPath("settings-bottom.png"),
          animations: "disabled",
        });
        // Inspect rendered pixels, not only the CSS property: a repeated canvas
        // produces a sharp horizontal jump in both unobstructed side gutters.
        const largestJump = await page.evaluate(async (png) => {
          const image = new Image();
          image.src = `data:image/png;base64,${png}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let max = 0;
          for (const x of [4, canvas.width - 5]) {
            for (let y = 2; y < canvas.height - 2; y++) {
              for (let channel = 0; channel < 3; channel++) {
                const pixel = (y * canvas.width + x) * 4 + channel;
                max = Math.max(max, Math.abs(data[pixel] - data[pixel - canvas.width * 4]));
              }
            }
          }
          return max;
        }, screenshot.toString("base64"));
        expect(largestJump, "background gutters should not have a sharp horizontal seam").toBeLessThan(10);
      } finally {
        await context.close();
      }
    });
  }
}
