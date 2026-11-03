import type { Metadata } from "next";
import Link from "next/link";

import { LocalDataDeletion } from "@/app/_components/local-data-deletion";
import { SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Eliminación de datos | Avo",
  description: "Borra tus datos locales o solicita la eliminación de tu cuenta y tus datos de Avo.",
};

const deletionEmailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Eliminar mis datos de Avo")}`;

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
          Eliminación de datos
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Tú decides qué conservar. Borrar los datos de este navegador y eliminar tu cuenta de Avo son acciones
          distintas; aquí te explicamos cómo solicitar cada una.
        </p>
      </header>

      <article className="mt-7 space-y-6 text-sm leading-7">
        <LocalDataDeletion />

        <section>
          <h2 className="text-xl font-semibold">Eliminar tu cuenta y datos en servidores</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5">
            <li>
              Escribe a{" "}
              <a className="font-semibold underline underline-offset-4" href={deletionEmailHref}>
                {SUPPORT_EMAIL}
              </a>{" "}
              con el asunto «Eliminar mis datos de Avo».
            </li>
            <li>
              Indica si entraste con Google o Facebook y el correo asociado, si lo tienes. Si puedes, escribe desde
              ese correo. Incluye si quieres eliminar también una copia en la nube guardada en una versión anterior.
            </li>
            <li>
              La solicitud se revisa de forma manual. Te pediremos solo lo necesario para verificar que eres titular
              de los datos y te confirmaremos el resultado conforme a los plazos legales aplicables. No envíes
              contraseñas, claves de acceso ni documentos sensibles en el primer mensaje.
            </li>
          </ol>
          <p className="mt-2">
            Si ya no tienes acceso al correo o al proveedor, explícalo en tu solicitud. No eliminamos datos de otra
            persona sin verificar la titularidad. Cerrar sesión o borrar los datos del navegador no elimina tu cuenta
            ni las copias que existan en servidores.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Desconectar Google o Facebook</h2>
          <p className="mt-2">
            Puedes retirar el acceso de Avo desde la configuración de aplicaciones conectadas de tu cuenta de Google
            o Facebook. Esto no elimina tu cuenta del proveedor ni sustituye la solicitud de eliminación de los
            datos que Avo ya recibió.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Qué se elimina y qué puede conservarse</h2>
          <p className="mt-2">
            La eliminación de la cuenta comprende el perfil, los vínculos de acceso y los datos asociados que Avo
            conserve en sus servidores. No borra automáticamente las copias locales en tus dispositivos: debes
            retirarlas desde cada navegador. La eliminación es irreversible y no desinstala la app.
          </p>
          <p className="mt-2">
            La información que deba conservarse por obligaciones legales y los respaldos técnicos pueden permanecer
            durante los periodos correspondientes; no se usan para restablecer una cuenta eliminada. Para cualquier
            duda o solicitud de privacidad, escribe a {SUPPORT_EMAIL}.
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
