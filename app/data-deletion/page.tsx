import type { Metadata } from "next";
import Link from "next/link";

import { LocalDataDeletion } from "@/app/_components/local-data-deletion";

export const metadata: Metadata = {
  title: "Eliminación de datos | Avo",
  description: "Instrucciones para eliminar los datos locales y la copia opcional en la nube de Avo.",
};

const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim();

export default function DataDeletionPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-10 sm:px-8">
      <header className="border-b border-line pb-6">
        <Link href="/" className="text-sm font-semibold underline underline-offset-4">
          Avo
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Tus datos
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Eliminación de datos de usuario
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Avo no usa Facebook Login ni recibe datos de perfil de Facebook/Meta. Esta página explica cómo borrar los
          datos que tú guardaste en Avo.
        </p>
      </header>

      <article className="mt-7 space-y-6 text-sm leading-7">
        <LocalDataDeletion />

        <section>
          <h2 className="text-xl font-semibold">Borrar la copia opcional en la nube</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>Abre Avo y entra a Ajustes → Copia en la nube.</li>
            <li>Conecta con tu clave de la nube si todavía no está conectada.</li>
            <li>Elige «Eliminar copia en la nube» y confirma. Se elimina la copia activa del servidor y se cierra esa sesión.</li>
          </ol>
          <p className="mt-2">
            Borrar los datos del navegador no elimina la copia remota. Si ya no tienes la clave o necesitas ayuda con
            otra solicitud de privacidad, contacta al responsable: {privacyEmail ? (
              <a className="font-semibold underline underline-offset-4" href={`mailto:${privacyEmail}`}>
                {privacyEmail}
              </a>
            ) : (
              <strong>[CORREO DE CONTACTO PENDIENTE DE CONFIGURAR]</strong>
            )}
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Qué significa eliminar</h2>
          <p className="mt-2">
            La acción remota elimina los datos activos de Avo asociados a la copia. Los registros técnicos o copias de
            respaldo que mantengan los proveedores de alojamiento pueden seguir sus propios periodos de retención y las
            obligaciones legales aplicables. La eliminación no desinstala Avo ni borra datos guardados fuera de Avo.
          </p>
        </section>
      </article>

      <nav aria-label="Enlaces legales" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-sm">
        <Link className="font-semibold underline underline-offset-4" href="/privacy">
          Aviso de privacidad
        </Link>
        <Link className="font-semibold underline underline-offset-4" href="/">
          Volver a Avo
        </Link>
      </nav>
    </main>
  );
}
