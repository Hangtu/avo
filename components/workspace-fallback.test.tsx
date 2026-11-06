import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { WorkspaceFallback } from "./workspace-fallback";
import es from "@/messages/es.json";
import en from "@/messages/en.json";

function renderFallback(locale: "es" | "en") {
  const messages = locale === "es" ? es : en;
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Mexico_City">
      <WorkspaceFallback retry={() => {}} />
    </NextIntlClientProvider>,
  );
}

describe("public workspace frame before selection", () => {
  it.each(["es", "en"] as const)("renders app chrome without an opening splash in %s", (locale) => {
    const messages = locale === "es" ? es : en;
    const html = renderFallback(locale);
    expect(html).toContain(messages.header.tagline);
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain(messages.sync.opening);
    expect(html).not.toContain('role="status"');
    expect(html.match(/disabled=""/g)).toHaveLength(6);
    for (const key of ["today", "tasks", "pending", "settings"] as const) {
      expect(html).toContain(`aria-label="${messages.nav[key]}"`);
    }
  });

  it.each(["es", "en"] as const)("retains the no-JavaScript explanation and legal links in %s", (locale) => {
    const messages = locale === "es" ? es : en;
    const html = renderFallback(locale);
    expect(html).toContain("<noscript>");
    expect(html).toContain(messages.sync.javascriptRequired);
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/data-deletion"');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });
});
