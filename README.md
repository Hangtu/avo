# Runo

App personal local-first de hábitos, pendientes y timer; ES/EN, Next.js 16.4.3, React 19.3, Dexie, Tailwind v4 y Neon/Drizzle del lado servidor. El objetivo es ayudar a actuar y volver a la vida, no maximizar el uso.

- Sin cuenta, los datos operativos permanecen en IndexedDB.
- Better Auth tiene rutas/UI básicas; Facebook se confirmó en local. Google, sesión/logout verificados, espacios de cuenta, recuperación y sync selectivo siguen pendientes.
- `0003_account_spaces.sql` es una migración local no aplicada a Neon. No desplegar código que la requiere sobre un esquema anterior.
- Los borradores `/privacy` y `/data-deletion` no están publicados; el borrado local actual es global, no por cuenta.

## Fuente de verdad

- [`AGENTS.md`](./AGENTS.md): reglas de trabajo.
- [`STATUS.md`](./STATUS.md): estado, evidencia y siguiente paso.
- [`plan.md`](./plan.md): contrato y pendientes E4.
- [`docs/cloud/2026-11-02-e4-auth-and-spaces.md`](./docs/cloud/2026-11-02-e4-auth-and-spaces.md): decisiones de auth/migración.

## Desarrollo

```bash
npm ci
test -f .env.local || cp .env.example .env.local # no sobrescribas tu configuración
npm run dev
```

Nunca publiques secretos. `DATABASE_URL` es para runtime; `DATABASE_URL_UNPOOLED` para Drizzle. No ejecutes `db:migrate`, `db:seed`, operaciones Neon ni deploy sin confirmar destino, recuperación y autorización.

## Verificación

```bash
npm test
npm run typecheck
npm run lint
npm run db:check
npm run build
npm run start
```

Las pruebas locales usan Vitest/fake IndexedDB y PGlite; no certifican Neon, OAuth, navegador o móvil. Para build local se puede usar un `DATABASE_URL` ficticio solo si Next lo exige; eso no valida una conexión. Better Auth usa variables servidoras descritas en `.env.example`. El audit runtime informa 4 moderadas de Drizzle Kit/esbuild: revisar antes de publicar, sin `audit fix --force`.

Producción existente: <https://runo-mu.vercel.app>. No representa la rama ni el esquema local; no desplegar en este trabajo.
