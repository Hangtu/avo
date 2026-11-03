"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import { defaultLocale, messages, timeZone } from "@/lib/i18n/config";

/**
 * Public shell only: brand, explanation, legal links and the pre-selection
 * status. It never reads the database or storage, so it cannot race the
 * space-bound provider for `document.lang`/title or open another space's DB.
 */
export function ShellI18nProvider({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale={defaultLocale} messages={messages[defaultLocale]} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
