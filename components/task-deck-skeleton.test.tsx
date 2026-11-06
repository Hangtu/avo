import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { TaskDeckSkeleton } from "./task-deck-skeleton";
import { RunoHome } from "./runo-home";
import { StartupLoadingProvider } from "./startup-loading-provider";
import es from "@/messages/es.json";
import en from "@/messages/en.json";

for (const locale of ["es", "en"] as const) {
  const messages = locale === "es" ? es : en;
  const render = (children: ReactNode) =>
    renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Mexico_City">
        {children}
      </NextIntlClientProvider>,
    );

  describe(`task-card loading in ${locale}`, () => {
    it("renders a restrained real-card frame with one screen-reader loading status", () => {
      const html = render(<TaskDeckSkeleton />);
      expect(html.match(/role="status"/g)).toHaveLength(1);
      expect(html).toContain('class="sr-only"');
      expect(html).toContain(messages.home.loading);
      expect(html).toContain('data-deck-role="front"');
      expect(html).toContain('data-deck-role="back"');
      expect(html.match(/data-slot="skeleton"/g)).toHaveLength(8);
      expect(html.match(/<section /g)).toHaveLength(2);
      expect(html.match(/aria-hidden="true"/g)).toHaveLength(3);
      expect(html).not.toContain("<button");
      expect(html).not.toContain("<a ");
    });

    it("reserves the frame before the threshold without gating ready children", () => {
      const html = render(
        <StartupLoadingProvider>
          <p>Ready content</p>
          <TaskDeckSkeleton />
        </StartupLoadingProvider>,
      );
      expect(html).toContain("<p>Ready content</p>");
      expect(html).toContain("visibility:hidden");
      expect(html).toContain('data-deck-role="front"');
      expect(html.match(/aria-hidden="true"/g)).toHaveLength(4);
    });

    it("uses the same card skeleton while the home view initializes", () => {
      const html = render(<RunoHome />);
      expect(html).toContain('data-deck-role="front"');
      expect(html).toContain('data-deck-role="back"');
      expect(html).toContain('class="sr-only"');
      expect(html).toContain(messages.home.loading);
      expect(html).not.toContain(`<p class="text-sm text-muted">${messages.home.loading}</p>`);
    });
  });
}
