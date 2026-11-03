# Producción: migraciones de Neon desde GitHub Actions

## Comportamiento

`.github/workflows/production-migrations.yml` valida cambios de migración en PR. Al llegar un archivo SQL de migración a `main`, puede aplicar las migraciones Drizzle pendientes después de las verificaciones automáticas y una aprobación humana en el entorno protegido de GitHub. El job de producción permanece **deshabilitado** hasta que `ENABLE_PRODUCTION_MIGRATIONS=true` se configure explícitamente en el entorno GitHub, una vez conciliado/validado el historial actual. La migración corre en un runner de GitHub; la laptop no necesita recibir la credencial de producción.

- En cada PR que toque migraciones, configuración o dependencias del workflow: `npm ci`, tests, typecheck, lint, `db:check` y build con credenciales **sintéticas**. PRs y forks nunca reciben el secreto de producción.
- Después del merge a `main` de un archivo `drizzle/*.sql`, las verificaciones vuelven a correr. Hasta que se active `ENABLE_PRODUCTION_MIGRATIONS`, el job de producción se omite de forma segura. Una vez activado, queda esperando aprobación del entorno `production-migrations`.
- Un cambio que solo modifique el workflow, el paquete o el journal no inicia una migración de producción; el trigger de producción se limita a `drizzle/*.sql`.
- Solo después de la aprobación se entrega `NEON_PRODUCTION_MIGRATION_URL` al runner y se ejecuta `npm run db:migrate` con la URL directa. El workflow no incluye `drizzle-kit push`.
- Un grupo de concurrencia evita que dos migraciones de producción corran a la vez y no cancela la que esté ejecutándose. GitHub conserva como máximo un job pendiente por grupo; coordina los merges y aprobaciones si se acumulan varios cambios de migración.
- La app de Vercel despliega por su mecanismo independiente. El workflow **no despliega código** ni modifica variables de Vercel.
- El workflow no se activa por cada cambio de aplicación: requiere cambios bajo `drizzle/*.sql`, `drizzle/meta/**`, `drizzle.config.ts`, dependencias o el propio workflow.

La aprobación debe ocurrir **después de revisar la migración SQL, el cambio de esquema, su compatibilidad con la app anterior y el plan de recuperación**. Una migración SQL es código privilegiado: no aprobarla automáticamente ni aprobar una revisión que no hayas revisado.

## Configuración necesaria en GitHub

1. En el repositorio, abre **Settings → Environments** y crea `production-migrations`.
2. Configura **Required reviewers** (idealmente alguien distinto de quien inicia/publica el cambio, si el equipo y el plan de GitHub lo permiten) y limita las ramas de deploy a `main`.
3. Dentro de los secretos de *ese entorno*, crea `NEON_PRODUCTION_MIGRATION_URL` con la conexión **directa** a la base/rama de producción autorizada. No uses la URL pooled de runtime ni la de desarrollo. No pongas la URL en el YAML, en Git ni en logs.
4. Deja sin configurar (o en `false`) la variable de entorno GitHub `ENABLE_PRODUCTION_MIGRATIONS`. No la pongas a `true` hasta resolver la migración pendiente `0003` y autorizar el flujo inicial según la sección siguiente. Cuando el historial/esquema de producción se haya conciliado y la migración inicial se haya aplicado por un proceso explícitamente autorizado, cambia esta variable del entorno a `true`; las futuras migraciones SQL podrán ejecutarse automáticamente tras aprobación.
5. Protege `main`: PR requerido y resultado de verificación exitoso. Limita quién puede cambiar/aprobar workflows y quién puede aprobar el entorno de migración. Activa MFA/passkeys en las cuentas con acceso.
6. Confirma por separado que Vercel **Production** usa la URL pooled correcta para `DATABASE_URL`. GitHub Actions no lee ni cambia los secretos de Vercel.

Los *Required reviewers* de GitHub Environments dependen de la visibilidad del repositorio y el plan de GitHub. Si el plan no permite una aprobación efectiva, no tratar un simple botón “Run” o una revisión del mismo usuario como equivalente: detenerse y decidir otro control antes de habilitar producción.

## Primera activación y migraciones existentes

El workflow intencionalmente **no** tiene `workflow_dispatch` y el trigger de producción solo observa cambios en `drizzle/*.sql`. Agregar o cambiar los archivos de workflow no activa por sí solo una migración. Además, `ENABLE_PRODUCTION_MIGRATIONS` queda deshabilitado inicialmente: configura la conexión y las aprobaciones, pero no actives la variable ni apruebes un job hasta resolver `0003_account_spaces.sql`. Aunque `0003` no se ejecute al instalar Actions, Drizzle aplicaría **todas** las migraciones pendientes al correr `db:migrate` en el futuro. Esa migración sigue pendiente de identificar/validar el esquema y la rama Neon correctos, recuperación y autorización según `STATUS.md` y el registro E4.

Antes de aplicar `0003` o preparar la primera migración nueva en producción:

1. Identificar la rama y base reales con acceso Neon autorizado; no deducirlas del nombre de la URL.
2. Confirmar el historial Drizzle aplicado y comparar el esquema real con los archivos/migraciones.
3. Probar la migración completa en desarrollo sobre el historial/esquema correcto y datos sintéticos representativos. Probar recuperación/rollback en ese entorno.
4. Revisar cualquier migración ya aplicada como inmutable; crear una migración nueva para corregir esquema.
5. Autorizar explícitamente el cambio y verificar respaldo/restauración según las capacidades reales de Neon antes de aprobar la migración de producción.

Para que una migración **nueva** se aplique automáticamente en el futuro, primero debe estar habilitada `ENABLE_PRODUCTION_MIGRATIONS`. Después se añade su archivo SQL revisado y el snapshot/journal que genere Drizzle en el mismo PR que el cambio del esquema; al integrar el PR a `main`, el workflow valida y espera la aprobación protegida antes de aplicarla. Si la variable sigue deshabilitada, el workflow valida y omite producción; no ejecuta migraciones pendientes. Una migración no debe borrarse ni editarse después de aplicarse en una base.

## Seguridad y límites

- La credencial se almacena como secreto de entorno de GitHub y solo se entrega al job de migración aprobado; nunca al job de PR ni a la laptop.
- La credencial sigue siendo de larga duración si Neon la emite así: el runner temporal no vuelve temporal la contraseña. Restringir quién puede modificar/aprobar workflows, secretos y entornos; rotarla si se expone.
- Usar una credencial de migración separada de la credencial `DATABASE_URL` de Vercel. Investigar/validar los permisos mínimos que Neon y Drizzle soportan para este esquema antes de restringir DDL; no asumir que el rol pooled actual puede migrar.
- En caso de error, no repetir a ciegas ni modificar el SQL aplicado. Detener nuevos deploys, inspeccionar el log sin divulgar secretos y seguir el plan de recuperación aprobado.
- La base Dexie/IndexedDB de los dispositivos es independiente: una migración Neon no actualiza datos locales.
- El workflow verifica el proyecto con build y fixtures locales; **no** conecta a Neon en CI, no valida la rama real, no prueba restauración, OAuth ni dispositivos y no sustituye la aprobación.
