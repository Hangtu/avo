"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Segment error boundary. Copy is duplicated in ES/EN on purpose: this screen
 * must render even when the i18n provider is the thing that failed.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only safe identifier to log; never log messages or stacks.
    console.error("Avo render error", error.digest ?? "sin digest");
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Avo</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Algo se atascó</h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        Tu información local sigue en este dispositivo. Intenta de nuevo; si el problema continúa, vuelve a
        abrir Avo más tarde.
      </p>
      <p lang="en" className="mt-2 text-sm leading-7 text-muted">
        Something got stuck. Your local data is still on this device. Try again, or come back later.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-full bg-accent px-6 text-sm font-semibold text-background"
        >
          Reintentar · Try again
        </button>
        <Link href="/" className="min-h-11 text-sm font-semibold underline underline-offset-4">
          Volver a Avo · Back to Avo
        </Link>
      </div>
    </main>
  );
}
