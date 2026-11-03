> **Actualización 2026-11-01:** E4 usará **Better Auth self-hosted** con Google/Facebook y sync multiusuario. La recomendación de “Neon Auth si se agregan cuentas” en §7 queda superada; la cuenta nueva empieza limpia y los datos de E3 son de testing, no se migran. Ver [`plan.md`](../../plan.md).

# Runo en la nube — plan de Neon + Drizzle

> **Actualización de alcance (2026-11-02):** este documento conserva el diseño y la evidencia de E1–E3. El nuevo contrato de E4 está en [`plan.md`](../../plan.md#e4--cuenta-opcional-y-persistencia-selectiva-por-usuario) y sustituye las propuestas generales de restauración/sync e importación completa de este documento. `main` contiene la base de login Better Auth y la UI; E4.2 añade primitivas de espacios/esquema, pero aún no restaura ni sincroniza los datos de cuenta. `0003_account_spaces.sql` no se aplicó a Neon. Decisión/evidencia en [`registro E4`](./2026-11-02-e4-auth-and-spaces.md). Esta guía es histórica: `CloudBackup` no está montado hoy en Ajustes. No reutilizar la clave de un solo dueño como acceso multiusuario.

**Fecha:** 2026-10-31  
**Fase:** E1 · preparación de la capa de datos  
**Estado:** esquema, cliente server-only y migración aplicados. **E2:** proyecto Neon, migración y semilla cargados. **E3:** copia manual desde Ajustes, protegida por passcode y cookie HttpOnly; la app sigue leyendo y escribiendo IndexedDB y no hay sync ni restauración.

## 1. Decisión

Usaremos **Neon Postgres** como base remota y **Drizzle** como dueño del esquema y de las migraciones. La conexión a Neon será **exclusiva del servidor** mediante `pg` + `attachDatabasePool` en Vercel Fluid. El navegador no recibirá `DATABASE_URL` ni consultará Postgres directamente.

La app seguirá siendo local-first durante E1. El reemplazo de Dexie por una API remota no se hace en este paso: primero se valida la base y después se elige explícitamente cómo se sincroniza.

## 2. Por qué esta arquitectura

- **Vercel Fluid:** Neon recomienda TCP con `pg` y `attachDatabasePool` para reutilizar conexiones y cerrar las ociosas antes de suspender la función.
- **Migraciones:** se ejecutan con la URL directa (sin `-pooler`). La app usa la URL pooled.
- **Drizzle:** mantiene el esquema como código, genera SQL revisable y evita migraciones ad-hoc.
- **Server-only:** no usamos Data API ni exponemos la base al cliente. La seguridad se resuelve en el servidor, no confiando en RLS desde el navegador.
- **Single user:** el MVP no tiene login. El esquema ya lleva `user_id` y el primer usuario será `RUNO_OWNER_ID` (`owner` por defecto), para no tener que rediseñar todas las tablas cuando llegue el acceso.

## 3. Modelo de datos

Todas las tablas usan el prefijo `runo_` para poder convivir con otros proyectos en una base compartida.

| Tabla | Propósito | Invariantes principales |
|---|---|---|
| `runo_users` | Identidad del único usuario y su zona horaria | `id` text; una fila inicial |
| `runo_settings` | Audio, sonido, tono, tema y visibilidad del Monedero | PK `user_id`; `max_tone` 0–2 |
| `runo_tasks` | Plantillas recurrentes | Duración > 0; prioridad 1–3; días 0–6; ventana y hora fija coherentes; escalón menor que la tarea |
| `runo_pendings` | To-dos de una sola vez | Duración > 0; borrado lógico; completado lógico |
| `runo_days` | Estado diario | PK `(user_id,date)`; cambios 0–3; `closed_at` |
| `runo_hands` | Franjas | `ordinal` único por usuario/fecha; estado abierto/cerrado |
| `runo_hand_items` | Cartas activas y diferidas de cada franja | PK franja/ocurrencia; posición 1–3 solo para activas; una posición activa por franja |
| `runo_occurrences` | Ocurrencia de una tarea para una fecha local | Única por `(user_id,task_id,date)`; estados del dominio; acuerdo JSONB; progreso |
| `runo_sessions` | Asaltos, sesión rápida y pendientes | Una sola sesión `running` por usuario; snapshot de tarea; `quick`/`pending_id`; FKs a ocurrencia y franja |
| `runo_events` | Registro append-only | Único por `(user_id,action_id,type)`; contexto JSONB; sin FKs para conservar auditoría |
| `runo_ledger` | Fuente del saldo | Único por `(user_id,source_key)`; `delta_rc <> 0`; motivo canónico |
| `runo_metadata` | Marcadores de semilla/migración | PK `(user_id,key)`; valor JSONB |

### Decisiones finas

- **IDs de texto:** se conservan IDs actuales (`seed:*`, `hand:date:ordinal`, `task@date`, etc.) para que la importación no cambie identidades ni rompa el ledger.
- **`runo_occurrences.task_id` sin FK:** las sesiones rápidas y los pendientes usan IDs sintéticos que no existen en `runo_tasks`. El snapshot completo vive en `runo_sessions.task_snapshot`; documentar esa excepción evita una FK imposible.
- **Snapshots JSONB:** `agreement` y `task_snapshot` conservan exactamente el acuerdo y la tarea al iniciar; editar la plantilla después no altera el pago.
- **`hand_items` normalizado:** evita arrays de IDs sin integridad. Una ocurrencia puede reaparecer en otra franja; por eso la PK es franja + ocurrencia y no ocurrencia sola.
- **Sesiones:** el índice único parcial solo impone una sesión `running`; una sesión pausada puede coexistir con el ancla, como ya permite el dominio.
- **Fechas:** `date` local sin zona; `timestamp with time zone` para instantes técnicos. La fecha de la ocurrencia nunca se deriva de UTC.
- **Eventos/ledger:** son append-only. Sus índices únicos preservan la idempotencia por `actionId`/`sourceKey`.

## 4. Fases

### E1 · Esquema y herramientas (este corte)

- `lib/db/schema.ts`
- `lib/db/client.ts` server-only
- `drizzle.config.ts`
- migración `drizzle/0000_*.sql`
- scripts `db:generate`, `db:migrate`, `db:check`, `db:seed`, `db:health`, `db:verify`, `db:studio`
- `.env.example`
- prueba estática del esquema

**No incluye:** conexión real, tablas creadas, datos migrados ni cambios de comportamiento de la app.

### E2 · Proyecto y migración (aplicado 2026-10-31)

1. Crear el proyecto `runo` en Neon, región `aws-us-east-1` (cerca de Vercel), Postgres 17.
2. Guardar la URL **pooled** en `DATABASE_URL` y la **directa** en `DATABASE_URL_UNPOOLED`.
3. Ejecutar `npm run db:migrate` contra la URL directa.
4. Ejecutar `npm run db:seed` para crear `owner`, preferencias y las diez plantillas.
5. Verificar con `npm run db:health` y `npm run db:verify`.
6. Confirmar el nombre de la rama en Neon; esta sesión no pudo inferirlo desde la URL.

**Resultado:** migración aplicada, 12 tablas, 1 usuario `owner`, 1 fila de preferencias, 10 plantillas y 1 migración registrada. La segunda ejecución del seed mantuvo los conteos. No se pudo verificar el nombre de rama desde el connection string; no asumir que es producción o desarrollo sin mirar Neon.

### E3 · Acceso y respaldo (aplicado 2026-10-31)

- Añadir una compuerta de un solo usuario (`RUNO_PASSCODE` + cookie HttpOnly firmada con `RUNO_SESSION_SECRET`).
- Implementar **copia manual unidireccional** desde IndexedDB hacia Neon en Ajustes. La app local sigue siendo la fuente y no hay dos escritores.
- Reemplazar el espejo del dueño en una sola transacción, con confirmación explícita.
- No implementar restauración remota ni sync todavía.

**Resultado:** `POST /api/cloud/auth`, `GET /api/cloud/backup` y `POST /api/cloud/backup`; la UI exige passcode, confirma el reemplazo y muestra la última copia. La restauración y el sync quedan para E4.

### E4 · Restauración/sync real (solo si se necesita multi-dispositivo)

- Restauración explícita desde el espejo remoto hacia IndexedDB, con confirmación y validación.
- API server-side para las mutaciones, con la misma idempotencia (`actionId`, `sourceKey`) y transacciones.
- IndexedDB como caché/outbox offline; política explícita de conflicto y reconciliación.
- No dos fuentes de verdad. No resolver conflictos de ledger a mano.

## 5. Seguridad y privacidad

- `DATABASE_URL` solo en el servidor y en Vercel; nunca en `NEXT_PUBLIC_*`.
- `lib/db/client.ts` importa `server-only`.
- Migraciones con URL directa; no usar `drizzle-kit push` en producción.
- La copia usa passcode y cookie firmada; no reutilizar esa compuerta como autenticación multiusuario.
- No habilitar Data API ni acceso Postgres desde el navegador.
- Antes de un endpoint público: passcode/cookie o Neon Auth; no depender de RLS en un cliente no autenticado.
- No enviar eventos, títulos, categorías ni metas a LLM/analítica.
- La rama de producción no se toca sin backup/validación en `development`.

## 6. Operación

| Tema | Decisión |
|---|---|
| Runtime | `pg` + Drizzle + `attachDatabasePool`; pool pequeño (5) porque es un solo usuario |
| Migraciones | Drizzle Kit, URL directa, SQL versionado en git |
| Semilla | Idempotente; no sobrescribe ediciones |
| Entornos | `development` y `production` como ramas de Neon; URL distinta por entorno |
| Región | `aws-us-east-1` por cercanía a Vercel |
| Scale-to-zero | Aceptable para uso personal; vigilar el arranque en frío |
| Plan | Free para preparación; valorar pago si la disponibilidad pasa a ser requisito |
| Backup | Instant restore/branches de Neon + export JSON; no prometer recuperación hasta probarla |
| Observabilidad | `pg_stat_statements`, logs de Vercel y verificación de conexiones |

## 7. Riesgos y decisiones abiertas

1. **¿Backup o base canónica?** Recomendación: E3 backup unidireccional; E4 solo si hay multi-dispositivo. Evita una sincronización bidireccional prematura.
2. **¿Passcode o Neon Auth?** Recomendación: passcode/cookie para un solo usuario; Neon Auth si se agregan cuentas reales.
3. **¿Qué pasa con IndexedDB?** Se conserva como caché/offline; no se borra automáticamente al conectar Neon.
4. **Datos existentes:** importar tareas, pendientes, ocurrencias, días, franjas, sesiones, eventos, ledger, settings y metadata; preservar IDs y timestamps. No importar dos veces.
5. **Plan de Neon:** free es suficiente para preparar; la producción con disponibilidad estricta requiere una decisión de costo.
6. **Privacidad:** al subir datos personales al servidor cambia el modelo de amenaza; la compuerta de acceso es obligatoria antes de usar la URL pública.

## 8. Comandos

```bash
cp .env.example .env.local   # completar credenciales
npm run db:generate         # generar SQL desde schema (no conecta)
npm run db:check            # revisar migraciones
npm run db:migrate          # aplicar con DATABASE_URL_UNPOOLED
npm run db:seed             # dueño + preferencias + plantillas idempotentes
npm run db:health           # confirma una lectura contra Neon
npm run db:verify           # tablas, migraciones, dueño y conteos
npm run db:studio           # inspección local
```

## 9. Referencias consultadas

- https://neon.com/docs/ai/agent-skills
- https://neon.com/docs/guides/drizzle.md
- https://neon.com/docs/guides/drizzle-migrations.md
- https://neon.com/docs/guides/vercel-connection-methods.md
- https://neon.com/docs/connect/choose-connection.md
- https://neon.com/docs/get-started/production-checklist.md
