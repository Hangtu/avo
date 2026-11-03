# Incidente: pendiente no recuperado después de limpiar datos del navegador

**Fecha:** 2026-11-02. Investigación local sobre `86920d6`, sin cambios al código de la aplicación, consultas a Neon, OAuth real, migraciones ni deploy. El dueño reporta que inició sesión en producción, creó «Buro», limpió cookies/caché y, después de volver a entrar, encontró la lista vacía. La captura muestra el pendiente y el aviso «Listo, lo agregué»; por sí sola no acredita persistencia remota.

> **Seguimiento:** después de este diagnóstico, el dueño autorizó implementar las conexiones. La corrección local y sus límites están en [`2026-11-02-selective-account-sync.md`](./2026-11-02-selective-account-sync.md). Este reporte conserva la evidencia del checkout `86920d6`; no describe un despliegue posterior ni afirma que se haya corregido producción.

## Causa encontrada en el código

El login existe, pero el flujo de pendientes solo persiste en IndexedDB. No hay envío a Neon ni recuperación al iniciar sesión:

1. `app/_components/pending-view.tsx`: tanto `load` como `submit` abren `openDatabase()`; `submit` llama `createPending` y muestra éxito después de la transacción local. No consulta la sesión ni ejecuta una petición o Server Action para guardar el pendiente.
2. `lib/db/repository.ts`: `createPending` ejecuta una transacción Dexie sobre `db.pendings` y `listPendings` lee esa misma tabla local.
3. `lib/db/database.ts`: el nombre activo inicial es `runo`, el espacio invitado. Existen primitivas para seleccionar una base por cuenta, pero no hay llamadas de la aplicación a `setActiveUserDatabase`, `setActiveDatabaseName` ni `openDatabaseForSpace`. La sesión mostrada no selecciona un espacio de cuenta.
4. `app/_components/account-control.tsx` y `account-greeting.tsx`: consumen la sesión para login/logout y presentación. No implementan guardado, bootstrap ni cambio de espacio.
5. Las únicas rutas API de aplicación son el handler Better Auth y `GET /api/account/me`, que devuelve identidad; no hay una ruta de lectura/escritura de pendientes. El esquema `runo_pendings` y los fixtures de PostgreSQL no conectan por sí solos el formulario con Neon.

**Conclusión:** en este flujo no se intenta un INSERT remoto. No se atribuye el incidente a un fallo de credenciales, conexión o migración: no se inspeccionaron esos estados en producción. Inicializar tablas, por sí solo, no resuelve la ausencia de guardado/recuperación. Esta carencia ya estaba descrita en E4.2/E4.5 del plan; el login no acredita que estén implementadas.

También queda expuesto un límite de aislamiento: la UI autenticada sigue leyendo/escribiendo el espacio invitado del perfil del navegador. No presentar las primitivas de espacios como aislamiento integrado de cuentas.

## Reproducción local

Script: `/tmp/avo-pending-persistence-diagnostic.cjs`; resultado: `/tmp/avo-pending-persistence-diagnostic.log`.

Chromium headless en contexto descartable contra el build local existente con `next start` en `127.0.0.1:3117`. Conexión PostgreSQL sintética a loopback, credenciales OAuth vacías, sesión interceptada con identidad sintética estable, tráfico externo y service workers bloqueados. El pendiente se creó mediante el formulario real; no se insertó como fixture.

| Acción | Resultado observado |
|---|---|
| Crear pendiente con UI «Sesión iniciada» | Existe en IndexedDB `runo`; no se crea una base de cuenta. |
| Recargar | El pendiente sigue visible. |
| Borrar solo cookies, mostrar UI sin sesión y restablecer la misma sesión simulada | El pendiente sigue visible. |
| Borrar caché HTTP y Cache Storage | El pendiente sigue visible. |
| Navegar fuera para cerrar conexiones, borrar IndexedDB y volver con la misma identidad autenticada | Lista vacía, sin recuperación. |

Las únicas peticiones API fueron seis `GET /api/auth/get-session`; cero guardados/descargas de pendientes, Server Actions o peticiones de mutación. Sin errores JavaScript ni peticiones externas inesperadas. Servidor temporal y navegador cerrados; no se tocó el navegador del dueño ni el servidor dev existente.

**Matiz del reporte:** borrar cookies o caché exclusivamente no debería borrar IndexedDB. La reproducción explica la pérdida si la limpieza incluyó almacenamiento/datos del sitio. Si no fue así, confirmar mismo origen exacto (dominio/protocolo/puerto) y perfil: IndexedDB pertenece al origen y no se comparte entre el dominio legado y el nuevo. No se comprobó qué opciones se usaron en la limpieza real.

**Recuperación:** si queda una copia local en el origen/perfil original, preservar e inspeccionar antes de limpiar o incorporar nada. Si se eliminó IndexedDB y no hay otra copia, este flujo no produjo un respaldo remoto del cual recuperar el pendiente. No se afirma haber buscado o descartado copias en Neon ni en otros dispositivos.

## Verificación y límites

- `npm test`: **317/317**, 30 archivos, con fake IndexedDB/PGlite y conexión remota sustituida por URL sintética de loopback.
- `npm run typecheck`, `npm run lint` y `npm run db:check`: pasan; DB check comprueba metadata, no consulta Neon.
- No se cambió runtime ni se generó un build nuevo: el smoke usa el build de producción local ya disponible. No se interrumpió el servidor de desarrollo existente.
- No acredita la versión desplegada, las filas de producción, OAuth real, PWA/offline ni dispositivo. La observación de producción es la reportada por el dueño; la causa se verifica en el checkout y en el build local.

## Corrección necesaria (no implementada en esta investigación)

Mantener E4.1 como único ID en curso; esta investigación no cierra ni reordena fases por sí sola.

1. Completar E4.2/E4.3: seleccionar y aislar espacios desde la sesión verificada, cerrar conexiones al cambiar y obtener datos duraderos por cuenta con bootstrap autenticado. No adoptar automáticamente datos invitados ni `owner`.
2. Completar E4.4/E4.5: incorporación con consentimiento, escritura local y outbox atómicas, API autenticada con dueño derivado de sesión, reintentos idempotentes y revisiones/conflictos. Conservar invitado sin red; no subir timer/sesiones/eventos ni resultados recurrentes.
3. Diferenciar en UI guardado local, pendiente de envío y confirmado por servidor. Mientras no exista recuperación, advertir explícitamente que iniciar sesión no respalda los pendientes y que limpiar datos del sitio puede eliminarlos.
4. Prueba de aceptación: cuenta A crea y recibe confirmación remota; otro contexto vacío con A recupera el pendiente. Repetir después de borrar almacenamiento local; B/invitado no ven datos de A. Cubrir offline/reintentos sin duplicados y finalización estable sin reabrir pendientes. Validación Neon/OAuth real y deploy solo con autorización específica.
