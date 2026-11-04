import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import PrivacyPage from "@/app/privacy/page";
import DataDeletionPage from "@/app/data-deletion/page";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import { SUPPORT_EMAIL } from "@/lib/legal";

function renderPage(Page: ComponentType, locale: "es" | "en" = "es") {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "es" ? es : en}
      timeZone="America/Mexico_City"
    >
      <Page />
    </NextIntlClientProvider>,
  );
}

describe("public legal pages", () => {
  it("keeps the owner's fixed support address", () => {
    expect(SUPPORT_EMAIL).toBe("support@frutit.app");
  });

  it.each([
    ["privacy", PrivacyPage, "/data-deletion"],
    ["data deletion", DataDeletionPage, "/privacy"],
  ] as const)("renders %s without setup placeholders or a draft notice", (_name, Page, otherPage) => {
    const html = renderPage(Page);
    expect(html).toContain(`href="mailto:${SUPPORT_EMAIL}`);
    expect(html).toContain(`href="${otherPage}"`);
    expect(html).not.toMatch(
      /\[FALTA|PENDIENTE DE CONFIGURAR|borrador|Antes de publicar|NEXT_PUBLIC_PRIVACY/,
    );
  });

  it("describes optional social sign-in and preserves privacy responsibilities", () => {
    const html = renderPage(PrivacyPage);
    expect(html).toContain("Si eliges iniciar sesión con Google o Facebook");
    expect(html).toContain("No recibimos tu contraseña");
    expect(html).toContain("Esto no limita tus derechos ni nuestras obligaciones");
    expect(html).not.toMatch(/no (usa Facebook Login|incorpora inicio de sesión de Facebook)/);
  });

  it("offers a manual verified deletion request, not an obsolete settings action", () => {
    const html = renderPage(DataDeletionPage);
    expect(html).toContain(`href="mailto:${SUPPORT_EMAIL}?subject=Eliminar%20mis%20datos%20de%20Avo"`);
    expect(html).toContain("La solicitud se revisa de forma manual");
    expect(html).toContain("verificar que eres titular");
    expect(html).toContain("Cerrar sesión o borrar los datos del navegador no elimina tu cuenta");
    expect(html).not.toMatch(/Ajustes → Copia en la nube|Conecta con tu clave/);
  });

  it.each(["es", "en"] as const)(
    "states guest-only local deletion in %s without executing it during SSR",
    (locale) => {
      const html = renderPage(DataDeletionPage, locale);
      const copy = (locale === "es" ? es : en).dataDeletion;
      expect(html).toContain(copy.localTitle);
      expect(html).toContain(copy.localCopy.replaceAll("'", "&#x27;"));
      expect(html).toContain(copy.startButton);
      expect(html).not.toContain(copy.confirmButton);
      expect(html).not.toContain(copy.done);
    },
  );
});
