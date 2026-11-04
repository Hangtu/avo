"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { defaultLocale, intlLocales, isLocale, messages, timeZone, type Locale } from "@/lib/i18n/config";

import { activeStorageKey, currentDatabaseName, openDatabase } from "@/lib/db/database";
import { SPACE_STORAGE_KEYS } from "@/lib/db/local-space";
import {
  preferenceWriteState,
  retryPreferenceWrites,
  subscribePreferenceWrites,
  writePreferences,
} from "@/lib/sync/preference-writer";

interface LocaleContextValue {
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function I18nProvider({ children, revision = 0 }: { children: ReactNode; revision?: number }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [storageKey] = useState(() => activeStorageKey(SPACE_STORAGE_KEYS.locale));
  const [databaseName] = useState(currentDatabaseName);
  const optimistic = useRef<Locale | null>(null);
  const [localeDirty, setLocaleDirty] = useState(false);
  const [writeState, setWriteState] = useState(() => preferenceWriteState(databaseName));

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(storageKey);
    } catch {}
    // localStorage is browser-only; read it after mount instead of during SSR.
    if (!optimistic.current && isLocale(stored)) setLocaleState(stored);
  }, [storageKey, revision]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const state = preferenceWriteState(databaseName);
      setWriteState(state);
      if (state.pending || state.failed) return;
      optimistic.current = null;
      setLocaleDirty(false);
      void openDatabase(databaseName)
        .then(async (db) => {
          try {
            const stored = (await db.settings.get("preferences"))?.locale;
            if (!cancelled && !optimistic.current && isLocale(stored)) {
              setLocaleState(stored);
              try {
                localStorage.setItem(storageKey, stored);
              } catch {}
            }
          } finally {
            db.close();
          }
        })
        .catch(() => {});
    };
    load();
    const unsubscribe = subscribePreferenceWrites(databaseName, load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [databaseName, storageKey, revision]);

  useEffect(() => {
    document.documentElement.lang = intlLocales[locale];
    document.documentElement.dataset.locale = locale;
    document.title = messages[locale].meta.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) {
      description.content = messages[locale].meta.description;
    }
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      optimistic.current = next;
      setLocaleDirty(true);
      setLocaleState(next);
      void writePreferences(databaseName, { locale: next })
        .then(() => {
          try {
            window.localStorage.setItem(storageKey, next);
          } catch {}
        })
        .catch(() => {});
    },
    [databaseName, storageKey],
  );

  return (
    <LocaleContext.Provider value={{ setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone={timeZone}>
        {writeState.failed > 0 && localeDirty ? (
          <div role="alert" className="mx-auto max-w-3xl px-5 pt-4 text-sm leading-6">
            <p>{messages[locale].sync.localeSaveError}</p>
            <button
              type="button"
              className="min-h-11 underline"
              onClick={() => void retryPreferenceWrites(databaseName).catch(() => {})}
            >
              {messages[locale].sync.retryLocal}
            </button>
          </div>
        ) : null}
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
