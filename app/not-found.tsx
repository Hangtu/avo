import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Avo</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Esta página no existe</h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        Puede que el enlace haya cambiado o que la página se haya movido.
      </p>
      <p lang="en" className="mt-2 text-sm leading-7 text-muted">
        This page does not exist. The link may have changed or the page may have moved.
      </p>
      <Link href="/" className="mt-8 min-h-11 text-sm font-semibold underline underline-offset-4">
        Volver a Avo · Back to Avo
      </Link>
    </main>
  );
}
