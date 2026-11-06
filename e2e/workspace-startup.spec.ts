import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SHIMMER_SWEEP_MS = 2_000;
const SHIMMER_SWEEPS = 2;

function barPresentation(element: Element) {
  const base = getComputedStyle(element);
  const band = getComputedStyle(element, "::after");
  return {
    baseAnimation: base.animationName,
    animation: band.animationName,
    duration: band.animationDuration,
    iterations: band.animationIterationCount,
    gradient: band.backgroundImage,
    content: band.content,
    playState: band.animationPlayState,
    overflow: base.overflowX,
  };
}

function cardFrameMetrics(element: Element) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const content = element.querySelector(".peek-front");
  return {
    left: rect.left,
    top: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
    surface: style.backgroundColor,
    border: style.borderColor,
    radius: style.borderRadius,
    padding: content ? getComputedStyle(content).padding : null,
  };
}

// A reload must not depend on assets or registrations from an earlier build.
test.use({ serviceWorkers: "block" });

async function holdSession(page: Page) {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/get-session**", async (route) => {
    await ready;
    await route.fulfill({ status: 200, json: null });
  });
  await page.route("**/api/account/me", (route) =>
    route.fulfill({ status: 401, json: { error: "unauthorized" } }),
  );
  return release;
}

for (const variant of [
  { name: "light desktop", colorScheme: "light", viewport: { width: 1280, height: 900 } },
  { name: "dark mobile", colorScheme: "dark", viewport: { width: 390, height: 844 } },
] as const) {
  test(`shows the app frame without a splash on entry and reload in ${variant.name}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({
      colorScheme: variant.colorScheme,
      reducedMotion: variant.name === "dark mobile" ? "reduce" : "no-preference",
    });
    await page.setViewportSize(variant.viewport);
    for (const visit of ["entry", "reload"]) {
      const release = await holdSession(page);
      let placeholderFrame: ReturnType<typeof cardFrameMetrics> | null = null;
      try {
        if (visit === "entry") await page.goto("/");
        else await page.reload();
        await page.evaluate((theme) => {
          document.documentElement.dataset.theme = theme;
        }, variant.colorScheme);

        await expect(
          page.getByRole("heading", { level: 1, name: "Retoma donde te quedaste." }),
        ).toBeVisible();
        await expect(page.getByText("Abriendo tu espacio…", { exact: true })).toHaveCount(0);
        await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "true");
        const skeleton = page.getByRole("status", { name: "Preparando tu día…", exact: true });
        await expect(skeleton).toBeVisible();
        await expect(skeleton.locator('[data-slot="skeleton"]')).toHaveCount(8);
        await expect(skeleton.locator("[data-deck-role]")).toHaveCount(2);
        await page.evaluate(() => document.fonts.ready);
        placeholderFrame = await skeleton.locator('[data-deck-role="front"]').evaluate(cardFrameMetrics);
        const dockTop = await page
          .getByRole("navigation")
          .evaluate((element) => element.getBoundingClientRect().top);
        const frontBottom = await skeleton
          .locator('[data-deck-role="front"]')
          .evaluate((element) => element.getBoundingClientRect().bottom);
        expect(frontBottom).toBeLessThanOrEqual(dockTop);
        const overflow = await skeleton.evaluate(
          (element, dockTop) => element.getBoundingClientRect().bottom - dockTop,
          dockTop,
        );
        if (overflow > 0) await page.evaluate((distance) => window.scrollBy(0, distance + 16), overflow);
        expect(
          await skeleton.evaluate((element) => element.getBoundingClientRect().bottom),
        ).toBeLessThanOrEqual(dockTop);
        const animations = await skeleton.evaluate(
          (element) => element.getAnimations({ subtree: true }).length,
        );
        const presentation = await skeleton
          .locator('[data-slot="skeleton"]')
          .first()
          .evaluate(barPresentation);
        expect(presentation.baseAnimation).toBe("none");
        if (variant.name === "dark mobile") {
          expect(animations).toBe(0);
          expect(presentation.animation).toBe("none");
          expect(presentation.content).toBe("none");
        } else {
          expect(animations).toBeGreaterThan(0);
          expect(presentation.animation).not.toBe("none");
          expect(presentation.duration).toBe(`${SHIMMER_SWEEP_MS / 1_000}s`);
          expect(presentation.iterations).toBe(String(SHIMMER_SWEEPS));
          expect(presentation.gradient).toContain("linear-gradient");
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
          true,
        );
        for (const name of ["Hoy", "Hábitos", "Pendientes", "Ajustes"]) {
          await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
        }
        if (visit === "entry") {
          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            .analyze();
          expect(results.violations).toEqual([]);
          await page.screenshot({ path: testInfo.outputPath("startup-frame.png") });
        }
      } finally {
        release();
      }
      await expect(page.getByRole("button", { name: "Ajustes", exact: true })).toBeEnabled();
      await expect(page.getByRole("status", { name: "Preparando tu día…", exact: true })).toHaveCount(0);
      const readyCard = page.locator('section[data-deck-role="front"]');
      await expect(readyCard).toBeVisible();
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, variant.colorScheme);
      expect(await readyCard.evaluate(cardFrameMetrics)).toEqual(placeholderFrame);
      if (visit === "entry") {
        await page.screenshot({ path: testInfo.outputPath("ready-card.png") });
      }
    }
  });

  test(`sweeps a quiet highlight without changing layout in ${variant.name}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: variant.colorScheme, reducedMotion: "no-preference" });
    await page.setViewportSize(variant.viewport);
    const release = await holdSession(page);
    try {
      await page.goto("/");
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, variant.colorScheme);
      const skeleton = page.getByRole("status", { name: "Preparando tu día…", exact: true });
      await expect(skeleton).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const dockTop = await page
        .getByRole("navigation")
        .evaluate((element) => element.getBoundingClientRect().top);
      const overflow = await skeleton.evaluate(
        (element, dockTop) => element.getBoundingClientRect().bottom - dockTop,
        dockTop,
      );
      if (overflow > 0) await page.evaluate((distance) => window.scrollBy(0, distance + 16), overflow);
      const front = skeleton.locator('[data-deck-role="front"]');
      const before = await front.evaluate(cardFrameMetrics);
      const bar = skeleton.locator('[data-slot="skeleton"]').first();
      const presentation = await bar.evaluate(barPresentation);
      expect(presentation.baseAnimation).toBe("none");
      expect(presentation.gradient).toContain("linear-gradient");
      expect(presentation.overflow).toBe("hidden");
      const samples = await bar.evaluate((element, duration) => {
        const animation = element.getAnimations({ subtree: true })[0];
        if (!animation) throw new Error("Expected an active loading highlight");
        animation.pause();
        const positions = [0, duration / 2, duration - 1].map((currentTime) => {
          animation.currentTime = currentTime;
          return new DOMMatrixReadOnly(getComputedStyle(element, "::after").transform).m41;
        });
        const timing = animation.effect?.getComputedTiming();
        return {
          positions,
          duration: timing?.duration,
          iterations: timing?.iterations,
          activeDuration: timing?.activeDuration,
        };
      }, SHIMMER_SWEEP_MS);
      expect(samples.duration).toBe(SHIMMER_SWEEP_MS);
      expect(samples.iterations).toBe(SHIMMER_SWEEPS);
      expect(samples.activeDuration).toBe(SHIMMER_SWEEP_MS * SHIMMER_SWEEPS);
      expect(samples.positions[0]).toBeLessThan(0);
      expect(samples.positions[1]).toBeGreaterThan(samples.positions[0]);
      expect(samples.positions[2]).toBeGreaterThan(samples.positions[1]);
      expect(samples.positions[2]).toBeGreaterThan(0);
      await skeleton.evaluate((element, currentTime) => {
        for (const animation of element.getAnimations({ subtree: true })) {
          animation.pause();
          animation.currentTime = currentTime;
        }
      }, SHIMMER_SWEEP_MS / 2);
      expect(await front.evaluate(cardFrameMetrics)).toEqual(before);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath("shimmer-midpoint.png") });
      const finished = await bar.evaluate((element) => {
        element.getAnimations({ subtree: true })[0].finish();
        return {
          active: element.getAnimations({ subtree: true }).length,
          position: new DOMMatrixReadOnly(getComputedStyle(element, "::after").transform).m41,
        };
      });
      expect(finished.active).toBe(0);
      expect(finished.position).toBe(samples.positions[0]);
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(await skeleton.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
      const reduced = await bar.evaluate(barPresentation);
      expect(reduced.baseAnimation).toBe("none");
      expect(reduced.animation).toBe("none");
      expect(reduced.content).toBe("none");
      expect(await front.evaluate(cardFrameMetrics)).toEqual(before);
    } finally {
      release();
    }
    await expect(page.getByRole("button", { name: /^Comenzar/ })).toBeVisible();
  });
}

async function pauseStartupClock(page: Page) {
  await page.clock.install({ time: new Date("2026-11-05T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-05T12:00:01Z"));
}

test("reveals the skeleton at 150 ms without moving the reserved frame", async ({ page }) => {
  await pauseStartupClock(page);
  const release = await holdSession(page);
  try {
    await page.goto("/");
    await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(8);
    await page.evaluate(() => document.fonts.ready);
    const reserved = page.locator('[role="status"]');
    await expect(reserved).toHaveCount(1);
    const before = await reserved.evaluate((element) => element.getBoundingClientRect().toJSON());
    const bar = reserved.locator('[data-slot="skeleton"]').first();
    expect((await bar.evaluate(barPresentation)).playState).toBe("paused");
    await page.clock.runFor(149);
    await expect(reserved).toBeHidden();
    await page.clock.runFor(1);
    await expect(page.getByRole("status", { name: "Preparando tu día…", exact: true })).toBeVisible();
    expect((await bar.evaluate(barPresentation)).playState).toBe("running");
    expect(await reserved.evaluate((element) => element.getBoundingClientRect().toJSON())).toEqual(before);
  } finally {
    await page.clock.resume();
    release();
  }
  await expect(page.getByRole("button", { name: /^Comenzar/ })).toBeVisible();
});

test("shows ready content before the reveal threshold without waiting for the skeleton", async ({ page }) => {
  await pauseStartupClock(page);
  const release = await holdSession(page);
  release();
  try {
    await page.goto("/");
    await page.clock.runFor(149);
    await expect(page.getByRole("button", { name: /^Comenzar/ })).toBeVisible();
    await expect(page.getByRole("status", { name: "Preparando tu día…", exact: true })).toHaveCount(0);
    await page.clock.runFor(200);
    await expect(page.getByRole("status", { name: "Preparando tu día…", exact: true })).toHaveCount(0);
  } finally {
    await page.clock.resume();
  }
});

test("keeps slow-start recovery available without the routine opening splash", async ({ page }) => {
  await page.clock.install();
  const release = await holdSession(page);
  try {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Ajustes", exact: true })).toBeDisabled();
    await page.clock.fastForward(5_100);
    await expect(page.getByRole("status")).toHaveText("Esto está tardando un poco más de lo normal.");
    await expect(page.getByRole("button", { name: "Volver a intentar", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Continuar sin cuenta", exact: true })).toBeEnabled();
    await expect(page.getByText("Abriendo tu espacio…", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Volver a intentar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Ajustes", exact: true })).toBeEnabled();
  } finally {
    release();
  }
});

test("keeps storage-error recovery and retries when storage becomes available", async ({ page }) => {
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = () => {
      throw new DOMException("Storage blocked for this test", "SecurityError");
    };
    window.addEventListener(
      "restore-test-storage",
      () => {
        IDBFactory.prototype.open = open;
      },
      { once: true },
    );
  });
  const release = await holdSession(page);
  release();
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "No pude abrir tu espacio. Puedes volver a intentar o continuar como invitado.",
  );
  await expect(page.getByRole("button", { name: "Continuar sin cuenta", exact: true })).toBeEnabled();
  await page.evaluate(() => window.dispatchEvent(new Event("restore-test-storage")));
  await page.getByRole("button", { name: "Volver a intentar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ajustes", exact: true })).toBeEnabled();
});
