import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Avo",
  description: "Aviso de privacidad de Avo y opciones para ejercer tus derechos sobre datos personales.",
};

const controllerName = process.env.NEXT_PUBLIC_PRIVACY_CONTROLLER_NAME?.trim();
const controllerAddress = process.env.NEXT_PUBLIC_PRIVACY_CONTROLLER_ADDRESS?.trim();
const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim();
const privacyDetailsComplete = Boolean(controllerName && controllerAddress && privacyEmail);

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-10 sm:px-8">
      <header className="border-b border-line pb-6">
        <Link href="/" className="text-sm font-semibold underline underline-offset-4">
          Avo
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Privacidad
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Aviso de privacidad
        </h1>
        <p className="mt-3 text-sm text-muted">Última actualización: 2 de noviembre de 2026.</p>
      </header>

      {!privacyDetailsComplete ? (
        <aside className="mt-6 rounded-2xl border border-accent/50 bg-surface-2 p-4 text-sm leading-6">
          <p className="font-semibold">Antes de publicar este aviso</p>
          <p className="mt-1">
            Completa el nombre legal, domicilio y correo de contacto del responsable en las
            variables <code>NEXT_PUBLIC_PRIVACY_CONTROLLER_NAME</code>, <code>NEXT_PUBLIC_PRIVACY_CONTROLLER_ADDRESS</code> y
            <code> NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL</code>. Mientras falte alguno, este texto es un borrador y no debe
            presentarse como aviso legal final.
          </p>
        </aside>
      ) : null}

      <article className="mt-8 space-y-8 text-sm leading-7">
        <section>
          <h2 className="text-xl font-semibold">1. Responsable y contacto</h2>
          <p className="mt-2">
            El responsable del tratamiento de datos personales de Avo es{" "}
            <strong>{controllerName || "[FALTA NOMBRE LEGAL O DENOMINACIÓN]"}</strong>, con domicilio en{" "}
            <strong>{controllerAddress || "[FALTA DOMICILIO COMPLETO]"}</strong>.
            {" "}Para consultas y solicitudes de privacidad: {privacyEmail ? (
              <a className="font-semibold underline underline-offset-4" href={`mailto:${privacyEmail}`}>
                {privacyEmail}
              </a>
            ) : (
              <strong>[FALTA CORREO DE CONTACTO]</strong>
            )}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Datos y finalidades</h2>
          <p className="mt-2">
            Avo es una aplicación personal de hábitos, pendientes y sesiones de enfoque. No requiere crear una cuenta ni
            proporcionar nombre, teléfono o correo para usar sus funciones locales. Los datos que tú escribas pueden
            incluir nombres y categorías de hábitos o pendientes, horarios, duración, progreso y resultados de sesiones,
            preferencias de la aplicación y, si usas esa función, movimientos del monedero. Se usan para mostrar y guardar
            tus hábitos, organizar el día y operar las funciones que solicitas.
          </p>
          <p className="mt-2">
            La aplicación no incorpora inicio de sesión de Facebook/Meta, Facebook Pixel, SDK de Meta ni llamadas a la
            Graph API. No recibe datos de tu perfil de Facebook mediante esas integraciones y no vende datos personales
            ni los usa para publicidad dirigida.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Dónde se guardan y cuándo salen del dispositivo</h2>
          <p className="mt-2">
            Por diseño, tus datos principales se guardan localmente en el almacenamiento del navegador (IndexedDB y
            preferencias del navegador). No hay sincronización automática. Solo si tú configuras y solicitas una copia
            desde Ajustes, la aplicación envía una instantánea de tus datos a la base de datos de Avo administrada en
            Neon. La copia permanece allí hasta que la elimines desde Ajustes → Copia en la nube.
          </p>
          <p className="mt-2">
            El sitio se sirve mediante Vercel. Como cualquier servicio web, los proveedores de alojamiento pueden procesar
            datos técnicos de conexión necesarios para entregar y proteger el servicio; sus propias políticas y periodos
            de retención también pueden aplicar. La copia opcional en Neon puede procesarse fuera de México según la
            configuración regional de los proveedores. Antes de ofrecer Avo a terceros, el responsable debe confirmar las
            ubicaciones, transferencias y condiciones vigentes de esos proveedores.
          </p>
          <p className="mt-2">
            Si conectas la copia en la nube, Avo utiliza una cookie de sesión protegida, de duración limitada, para
            autorizar esa función. No se usa para publicidad. El navegador también mantiene preferencias locales, como
            idioma y tema.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Conservación y eliminación</h2>
          <p className="mt-2">
            Los datos locales permanecen en ese navegador hasta que los elimines o borres los datos del sitio. Para borrar
            la base local y las preferencias de este navegador, visita la{" "}
            <Link className="font-semibold underline underline-offset-4" href="/data-deletion">
              página de eliminación de datos
            </Link>.
            {" "}El almacenamiento de cada navegador, perfil u origen es independiente. Si guardaste una copia en la nube,
            elimínala también desde Ajustes → Copia en la nube; borrar los datos locales no borra la copia remota.
          </p>
          <p className="mt-2">
            Las solicitudes se atienden conforme a la legislación aplicable. Los registros técnicos o copias de respaldo
            que mantengan los proveedores pueden sujetarse a sus propios ciclos de retención y a obligaciones legales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Derechos y solicitudes</h2>
          <p className="mt-2">
            Si la legislación mexicana aplica, puedes ejercer los derechos de acceso, rectificación, cancelación y
            oposición (ARCO), así como revocar el consentimiento cuando proceda y solicitar la limitación del uso o
            divulgación. Presenta la solicitud al contacto del apartado 1 e indica qué derecho ejerces y cómo podemos
            verificar de manera razonable que los datos te corresponden. No envíes contraseñas ni información sensible
            innecesaria. Responderemos dentro de los plazos legales aplicables.
          </p>
          <p className="mt-2">
            Cuando el Reglamento General de Protección de Datos de la Unión Europea (GDPR/RGPD) resulte aplicable,
            también podrás ejercer los derechos que reconoce, incluidos acceso, rectificación, supresión, limitación,
            portabilidad y oposición, y presentar una reclamación ante la autoridad de control competente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Seguridad y cambios</h2>
          <p className="mt-2">
            Avo aplica medidas técnicas razonables, como HTTPS para las comunicaciones y acceso protegido a la copia
            opcional en la nube. Ninguna transmisión o almacenamiento puede garantizarse como absolutamente seguro.
            Evita escribir datos sensibles que no sean necesarios para tus hábitos o pendientes.
          </p>
          <p className="mt-2">
            Este aviso puede actualizarse si cambian Avo, sus proveedores o la legislación. La versión vigente se
            publicará en esta URL con su fecha de actualización.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Marco de referencia</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              México: Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), en su
              texto vigente. {" "}
              <a
                className="font-semibold underline underline-offset-4"
                href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Consultar texto oficial en la Cámara de Diputados
              </a>.
            </li>
            <li>
              Unión Europea, cuando resulte aplicable: Reglamento (UE) 2016/679 (GDPR/RGPD). {" "}
              <a
                className="font-semibold underline underline-offset-4"
                href="https://eur-lex.europa.eu/eli/reg/2016/679/oj"
                target="_blank"
                rel="noreferrer"
              >
                Consultar texto oficial en EUR-Lex
              </a>.
            </li>
          </ul>
        </section>

        <p className="border-t border-line pt-5 text-xs text-muted">
          Este documento es un borrador informativo preparado según las funciones actuales de Avo; no sustituye la
          revisión de un profesional del derecho ni determina por sí mismo qué normas aplican a cada operación.
        </p>
      </article>

      <nav aria-label="Enlaces legales" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-sm">
        <Link className="font-semibold underline underline-offset-4" href="/data-deletion">
          Eliminación de datos
        </Link>
        <Link className="font-semibold underline underline-offset-4" href="/">
          Volver a Avo
        </Link>
      </nav>
    </main>
  );
}
