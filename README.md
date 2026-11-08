# Avo

App personal local-first de hábitos, pendientes y timer; ES/EN, Next.js 16.4.3, React 19.3, Dexie, Tailwind v4 y Neon/Drizzle del lado servidor. El objetivo es ayudar a actuar y volver a la vida, no maximizar el uso.

- Sin cuenta, los datos operativos permanecen en IndexedDB.
- Implementados espacios por cuenta, guardado selectivo con outbox durable y recuperación desde PostgreSQL: hábitos, pendientes/finalización y preferencias. Sesiones/timer/resultados recurrentes permanecen locales. La UI distingue guardado local y respaldo confirmado; invitado solo se incorpora con consentimiento. Ver [alcance, evidencia y límites](./docs/cloud/2026-11-02-selective-account-sync.md). Aún no está validado con Facebook real, recuperación en otro navegador ni el entorno desplegado. Google ya se validó localmente contra Neon `development` (sesión real y sync de pendientes); no se desplegó por este trabajo.
- El respaldo manual E3 fue retirado: ya no hay rutas `/api/cloud/*`, clave compartida ni seed remoto de dueño fijo. Los datos existentes y las claves técnicas `runo` se conservan; los snapshots locales y fixtures de migración no habilitan respaldo ni sync remoto.
- El código de cuenta ahora requiere el esquema 0000–0004. La migración aditiva 0004 está generada, **no aplicada** por este trabajo; auth/cuenta fallan cerrados hasta activarla con autorización. Hay dos ramas Neon (`development` y `prod`) con su entorno cada una: `.env` (desarrollo) y `.env.prod` (producción). Se migran con `npm run db:migrate` y `npm run db:migrate:prod` (este último lee solo `DATABASE_URL_UNPOOLED` de `.env.prod` y rechaza la URL pooled). Verificado el 2026-11-03: `prod` y `development` tienen las 4 migraciones y el esquema completo (`0003` se aplicó en `development` con autorización). Dexie v5 añade cola/revisiones locales sin borrar ni renombrar datos.
- `/privacy` y `/data-deletion` tienen texto MVP y contacto fijo `support@frutit.app`; no se publicaron en este trabajo. El botón local borra solo el espacio invitado y sus preferencias; cuenta/servidores se solicitan por correo. Antes de producción, confirmar responsable legal/domicilio y probar la atención y eliminación segura por cuenta.

## Fuente de verdad

- [`AGENTS.md`](./AGENTS.md): reglas de trabajo, operaciones y límites de permiso.
- [`docs/agent-kit/project-context.md`](./docs/agent-kit/project-context.md): contrato del proyecto y biblioteca de estándares adoptada (commit fijo; actualización manual).
- [`tasks/README.md`](./tasks/README.md): tablero de trabajo; la tarea activa guarda Goal, Out of scope, Next step y evidencia.
- [`STATUS.md` histórico](./tasks/archive/2026-11-03-status.md): bitácora anterior, conservada solo como archivo.
- [`plan.md`](./plan.md): contrato y pendientes E4.
- [`docs/cloud/2026-11-02-e4-auth-and-spaces.md`](./docs/cloud/2026-11-02-e4-auth-and-spaces.md): decisiones de auth/migración.
- [`docs/cloud/github-actions-migrations.md`](./docs/cloud/github-actions-migrations.md): flujo protegido para migraciones de producción desde GitHub Actions.
- [`docs/cloud/2026-11-02-selective-account-sync.md`](./docs/cloud/2026-11-02-selective-account-sync.md): protocolo, guardado/recuperación, aislamiento y pasos de activación.
- [`docs/cloud/2026-11-03-sync-review-corrections.md`](./docs/cloud/2026-11-03-sync-review-corrections.md): correcciones de timer/UI, preferencias, recuperación de cola, pruebas actuales y límites.

## Desarrollo

Toolchain aprobada: **Node 26.13.0** y **npm 11.20.0**. `.node-version` fija la
versión reproducible de desarrollo/CI; `engines.node` admite solo la rama 26 y
los tipos de TypeScript usan `@types/node` 26. Activa esa versión con tu gestor
(por ejemplo, `nvm use 26.13.0`) antes de instalar. La CI lee `.node-version` e
instala npm 11.20.0 explícitamente; no depende del npm incluido por defecto.

```bash
node --version # v26.13.0
npm --version # 11.20.0
npm run check:dependencies # valida Node/npm, lock/SRI y política antes de instalar
npm ci --ignore-scripts
test -f .env || cp .env.example .env # no sobrescribas tu configuración
npm run dev
```

Abre <http://localhost:3000>. Para acceso por LAN, configura `AVO_DEV_HOSTS` en tu `.env` con hostnames/IPs exactos, separados por comas, sin esquema, puerto ni comodines (ejemplo `AVO_DEV_HOSTS="192.0.2.10"`, reemplazado por tu IP). Reinicia `next dev`. Ya no hay una IP hardcodeada ni fallback LAN: vacío permite solo los hosts de desarrollo de Next. Se ignora en producción. Esto solo habilita recursos/HMR, no configura OAuth ni HTTPS; tu `.env` privada no fue modificada.

Detén `next dev` antes de reinstalar dependencias. Si aparece `Cannot find module .../@tailwindcss/turbopack/dist/index.js` pero `node -p "require.resolve('@tailwindcss/turbopack')"` funciona, puede ser la caché persistente de Turbopack. Con el servidor detenido, conserva la caché fuera del proyecto y vuelve a iniciar:

```bash
mv .next/dev/cache/turbopack "$(mktemp -d /tmp/avo-dev-cache.XXXXXX)/turbopack"
npm run dev
```

Solo se regenera caché de compilación; no borres IndexedDB ni datos del sitio. Si el módulo tampoco se resuelve con Node, ejecuta `npm ci` con el servidor detenido.

Nunca publiques secretos. `DATABASE_URL` es para runtime; `DATABASE_URL_UNPOOLED` para Drizzle. Desarrollo usa `.env` (`npm run db:migrate`); producción usa `.env.prod` (`npm run db:migrate:prod`), que exige conexión directa y rechaza hosts `-pooler`. Ambos archivos están ignorados por git (`.env*` salvo `.env.example`). Verificación de solo lectura: `npm run db:health` / `db:health:prod` (conexión) y `npm run db:verify` / `db:verify:prod` (tablas, columnas requeridas, migraciones y conteos). Estos comandos usan un cliente Drizzle de inspección separado y solo necesitan la URL PostgreSQL del archivo seleccionado; no cargan `lib/env.ts` ni requieren `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` o credenciales OAuth. No ejecutes `db:migrate`, operaciones Neon ni deploy sin confirmar destino, recuperación y autorización.

Para el servidor actual configura `DATABASE_URL`, `BETTER_AUTH_SECRET` (generado con `openssl rand -base64 32`) y `BETTER_AUTH_URL` (origen HTTPS exacto en producción, sin rutas). Añade el par ID/secreto de cada proveedor que habilites y registra sus callbacks exactos en Google/Meta. Better Auth confía automáticamente en el origen de su base URL: ya no configuramos una lista adicional de orígenes ni variables `RUNO_*`. Retira las variables antiguas de Vercel; este cambio no modifica la configuración remota. La zona inicial sigue siendo `America/Mexico_City`.

Para auth/sync por LAN en desarrollo, `AVO_DEV_AUTH_ORIGINS` permite orígenes completos explícitos (ejemplo `http://192.168.68.109:3000`); API y Better Auth comparten esa lista. Solo se usa con `NODE_ENV=development`: producción la ignora. `allowedDevOrigins` de Next autoriza HMR/recursos, no sesiones. Esto no registra callbacks ni evita restricciones HTTPS del proveedor; no prueba OAuth real desde un teléfono.

## Verificación

```bash
npm run check:tasks
npm run format:check
npm run lint
npm run typecheck
npm test
# npm run test:postgres # aparte: solo un PostgreSQL local desechable autorizado
npm run db:check
npm run build
npm run test:e2e # requiere `npm run build` previo; viajes públicos
```

`npm run verify` encadena política/pruebas de dependencias, formato, lint, tipos, tests, `db:check` y el guard del tablero (`check:tasks`), sin build. El build y `test:e2e` sustituyen o consumen `.next`: no los ejecutes mientras el dueño usa `next dev`; usa una copia aislada. La CI (`app-ci.yml`) corre los mismos checks con credenciales sintéticas.

Las pruebas locales usan Vitest/fake IndexedDB y PGlite; no certifican Neon, OAuth, navegador o móvil. Los E2E cubren solo superficies públicas (`/` sin JS, legales, 404, cabeceras, robots/sitemap, manifest) y axe sobre las páginas legales; no cubren una cuenta autenticada. Para build local se puede usar un `DATABASE_URL` ficticio solo si Next lo exige; eso no valida una conexión. Better Auth usa variables servidoras descritas en `.env.example`. El audit del lockfile completo informa 12 moderadas (esbuild/Drizzle Kit y minimatch/ESLint), 0 altas/críticas. Hay razones y fecha de revisión (2026-11-18) en el [registro de hardening](./docs/cloud/2026-11-04-security-hardening.md); no usar `audit fix --force`.

El dominio previsto para producción es <https://avo.frutit.app/>. Aún no se ha configurado ni verificado. El despliegue existente permanece en <https://runo-mu.vercel.app>; no se ha cambiado Vercel, DNS ni OAuth. Para Better Auth, `BETTER_AUTH_URL` debe usar el origen `https://avo.frutit.app` (sin ruta); los callbacks de proveedores deberán actualizarse al mismo dominio cuando se configure. `NEXT_PUBLIC_SITE_URL` fija el origen canónico de metadata, robots y sitemap; en Vercel se usa el host de producción como respaldo.

`lib/env.ts` valida el entorno al arrancar: `DATABASE_URL` y `BETTER_AUTH_SECRET` son obligatorias, `BETTER_AUTH_URL` es obligatoria (HTTPS) en producción, y cada par de credenciales OAuth debe configurarse completo. Un valor faltante falla con un mensaje accionable en vez de en la primera petición.

## Hardening y activación

Los cambios M1/M3/M4/B1/B3 están descritos con sus límites en el [registro de seguridad](./docs/cloud/2026-11-04-security-hardening.md). El [seguimiento de resiliencia PostgreSQL](./docs/cloud/2026-11-04-postgres-resilience.md) documenta listener del pool, límites SQL locales, limpieza espaciada, conexión directa de migración, snapshots consistentes/ETag agregado y backoff/polling en primer plano.

`db:generate` y `db:check` no cargan credenciales. `db:migrate`/`db:studio` usan `drizzle.migrate.config.ts` y exigen `DATABASE_URL_UNPOOLED` directa, igual que el config de producción: no hay fallback a pooled ni localhost. Esto no autoriza ejecutar esas operaciones. La suite real `test:postgres` exige un destino local vacío y separado con confirmación explícita; nunca usa `.env` ni las credenciales de la aplicación.

- **Antes de ejecutar el código de auth/cuenta**, autoriza/revisa/aplica por separado la migración aditiva `0004_security_rate_limits.sql` en el destino confirmado, con recuperación. No se aplicó a Neon en este trabajo: sin tabla, los endpoints fallan cerrados con 503. Los contadores son compartidos/atómicos en PostgreSQL, no memoria por instancia.
- Las nuevas escrituras de vínculos no guardan tokens OAuth; los tokens históricos y backups requieren limpieza autorizada aparte. La política de vinculación por correo no cambió.
- Node está fijado a 26.13.0 y npm a 11.20.0; el guard rechaza otros majors de Node y desajustes de runtime/manifest/lock. `.npmrc` y CI desactivan todos los scripts de dependencias. **Cero rebuilds aprobados**; no omitir los paquetes opcionales de binarios. CI audita el lockfile antes de exponer credenciales de migración. `npm run check:dependencies` y `npm run test:dependencies` validan esta política.
- La CSP es **report-only**: informa en consola/eventos del navegador, no bloquea XSS ni envía telemetría. Falta medir tema, motion, PWA/offline y OAuth real antes de enforcement; no se desactivó Cache Components/Partial Prefetching.
- La IP solo se toma del encabezado que Vercel sobrescribe cuando `VERCEL=1`; otros hosts usan un bucket compartido hasta revisar su proxy. No establecer esa variable manualmente como atajo.

## Licencia

[MIT](./LICENSE) © 2026 frutit.app.
