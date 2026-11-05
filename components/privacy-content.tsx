import Link from "next/link";

import { SUPPORT_EMAIL } from "@/lib/legal";
import { publicEnv } from "@/lib/public-env";

const controllerName = publicEnv.NEXT_PUBLIC_PRIVACY_CONTROLLER_NAME;
const controllerAddress = publicEnv.NEXT_PUBLIC_PRIVACY_CONTROLLER_ADDRESS;

export function PrivacyContent() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-10 sm:px-8">
      <header className="border-b border-line pb-6">
        <Link href="/" className="text-sm font-semibold underline underline-offset-4">
          Avo
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Tus datos</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Aviso de privacidad</h1>
        <p className="mt-3 text-sm text-muted">Última actualización: 2 de noviembre de 2026.</p>
      </header>

      <article className="mt-7 space-y-6 text-sm leading-7">
        <section>
          <h2 className="text-xl font-semibold">Contacto</h2>
          {controllerName ? (
            <p className="mt-2">Responsable del tratamiento de datos: {controllerName}.</p>
          ) : null}
          {controllerAddress ? <p className="mt-2">Domicilio: {controllerAddress}.</p> : null}
          <p className="mt-2">
            Para consultas sobre Avo o tus datos personales, escribe a{" "}
            <a className="font-semibold underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Qué datos usamos y para qué</h2>
          <p className="mt-2">
            Puedes usar Avo sin cuenta. Tus hábitos, pendientes, preferencias y sesiones de enfoque se guardan
            en tu navegador para organizar tu día y operar el timer.
          </p>
          <p className="mt-2">
            Si eliges iniciar sesión con Google o Facebook, recibimos los datos que autorices, como nombre,
            correo, imagen de perfil e identificador de tu cuenta. Conservamos los identificadores necesarios
            para reconocer tu cuenta y datos técnicos de sesión, como IP y tipo de navegador. Los tokens del
            proveedor se usan durante el inicio de sesión; las nuevas escrituras de cuenta no los conservan.
            No recibimos tu contraseña de Google ni de Facebook.
          </p>
          <p className="mt-2">
            Usamos estos datos para ofrecer las funciones que solicitas, mantener tu sesión, proteger el
            servicio y atender solicitudes de soporte. No vendemos tus datos ni usamos publicidad dirigida,
            analítica de terceros o modelos de inteligencia artificial.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Almacenamiento y proveedores</h2>
          <p className="mt-2">
            Los datos de uso se guardan principalmente en este dispositivo. Iniciar sesión no activa por sí
            solo la sincronización ni garantiza recuperar datos de otro navegador. Si guardaste una copia en
            la nube en una versión anterior, esa copia es independiente y puede seguir almacenada hasta que
            solicites su eliminación.
          </p>
          <p className="mt-2">
            Usamos Vercel para alojar la app y Neon para almacenar datos de cuenta y copias remotas
            existentes. Estos proveedores pueden procesar datos técnicos y almacenar información fuera de tu
            país. Google y Meta procesan el inicio de sesión según sus propias políticas. Avo usa cookies de
            sesión y almacenamiento del navegador para funciones necesarias, no para seguimiento publicitario.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Conservación, derechos y eliminación</h2>
          <p className="mt-2">
            Los datos locales permanecen hasta que los borres o el navegador los elimine. Los datos de cuenta
            se conservan mientras sean necesarios para prestar el servicio o cumplir obligaciones legales.
            Puedes solicitar acceso, corrección, eliminación u oposición al uso de tus datos, y revocar tu
            consentimiento cuando proceda, escribiendo a {SUPPORT_EMAIL}. Verificaremos de forma razonable que
            la solicitud te corresponde y responderemos conforme a los plazos legales aplicables.
          </p>
          <p className="mt-2">
            Consulta la{" "}
            <Link className="font-semibold underline underline-offset-4" href="/data-deletion">
              página de eliminación de datos
            </Link>{" "}
            para borrar tu copia local o solicitar la eliminación de tu cuenta. Borrar una no borra la otra.
            Los respaldos técnicos pueden permanecer hasta que se renueven según los ciclos de los proveedores
            o las obligaciones legales aplicables.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Uso responsable</h2>
          <p className="mt-2">
            Avo es una herramienta de organización personal, no un servicio médico, psicológico ni de
            emergencia. Tú decides cómo usarla y eres responsable de la información que guardas y de tus
            decisiones. Evita ingresar datos sensibles o datos de otras personas sin autorización. No
            garantizamos resultados específicos ni disponibilidad ininterrumpida. Esto no limita tus derechos
            ni nuestras obligaciones legales en materia de protección de datos.
          </p>
          <p className="mt-2">
            Si actualizamos este aviso, publicaremos la nueva versión en esta página con su fecha de
            actualización.
          </p>
        </section>
      </article>

      <nav
        aria-label="Enlaces legales"
        className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-sm"
      >
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
