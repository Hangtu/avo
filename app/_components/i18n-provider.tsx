"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import {
  defaultLocale,
  intlLocales,
  isLocale,
  localeStorageKey,
  messages,
  timeZone,
  type Locale,
} from "@/lib/i18n/config";

interface LocaleContextValue {
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem(localeStorageKey);
    // localStorage is browser-only; read it after mount instead of during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLocale(stored)) setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = intlLocales[locale];
    document.documentElement.dataset.locale = locale;
    document.title = messages[locale].meta.title;
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (description) {
      description.content = messages[locale].meta.description;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(localeStorageKey, next);
  }, []);

  return (
    <LocaleContext.Provider value={{ setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone={timeZone}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useChangeLocale(): (locale: Locale) => void {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("Falta el proveedor de idioma.");
  return value.setLocale;
}
