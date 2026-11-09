# E4 — conexión selectiva de cuentas implementada localmente

**Fecha:** 2026-11-02. El dueño autorizó completar el código pendiente de conexión después del incidente de «Buro». E4.1 conserva revisiones externas pendientes; **E4.2 es el único ID en curso**. No se ejecutó ninguna operación sobre Neon, migración remota, seed, commit ni deploy. No interpretar este documento como validación de producción ni cierre de todos los criterios E4/F01.

> **Revisión posterior (2026-11-03):** corregidos selección/remount, carreras de preferencias, cola rechazada, apertura IDB y robustez. [Evidencia actual y límites](./2026-11-03-sync-review-corrections.md). Los números de pruebas de abajo corresponden al corte inicial; el corte corregido tiene 392 tests/36 archivos.

> **UI local vigente (2026-11-09, tareas 031–032):** el respaldo confirmado ya no muestra un aviso rutinario. Ajustes no ofrece «Continuar sin cuenta» ni «Revisar datos del invitado»; conserva «Cerrar sesión», y «Reintentar conexión» aparece solo si una cuenta seleccionada está en estado de error. Los avisos, reintentos locales y acciones por conflicto/cambio rechazado se conservan. Esto no altera auth, datos, aislamiento ni reintentos automáticos; la evidencia histórica de abajo no prueba el estado desplegado.

## Flujo implementado

1. `AccountWorkspace` selecciona el espacio usando `/api/account/me`, con sesión consultada en servidor sin cookie cache. Ningún componente operativo monta antes de seleccionar el espacio. Una cuenta nueva empieza vacía, sin seed personal ni adopción de `owner` o del invitado.
2. Invitado conserva IndexedDB `runo` y las claves históricas. Cada cuenta usa `runo-user-<ID interno codificado>`; idioma, orden, borradores y secciones del editor quedan separados. Un cambio cierra conexiones, bloquea aperturas tardías y pausa localmente la ejecución anterior.
3. Los cambios de hábitos, pendientes y preferencias se escriben **en la misma transacción Dexie que la outbox**. Un fallo de cuota/cola revierte también la modificación de dominio. Las lecturas/defaults no generan una mutación remota.
4. El worker por cuenta hace bootstrap inicial/pulls condicionales, fusiona sin reemplazar la DB y envía la cola con IDs de operación y revisiones. Los cambios locales disparan push sin descargar de nuevo la cuenta. Solo envía lotes con cambios duraderos; observa la outbox y reintenta al reconectar, recuperar foco/visibilidad, manualmente o en una comprobación periódica. La cola sobrevive a cerrar/reabrir el navegador; un error conserva los cambios.
5. La UI distingue guardado local, envío pendiente, respaldo confirmado, expiración y fallo. «Listo, guardado en este navegador» no afirma respaldo remoto. **No limpiar datos del sitio con cambios por enviar o conflictos pendientes.**

### API / autorización

`GET` y `POST /api/account/data`, sin respuestas cacheables (`private, no-store`, `Vary: Cookie, X-Avo-Account`). El service worker sigue excluyendo `/api/`.

- Cada petición verifica la sesión en la DB (`disableCookieCache: true`). El dueño se deriva de esa identidad, nunca de email, un proveedor, un ID del cuerpo ni el selector IndexedDB.
- `X-Avo-Account` es una precondición adicional, **no autorización**: si la cookie ahora pertenece a B, una petición de la cola A recibe 409 antes de leer/escribir dominio. Sin sesión devuelve 401.
- En producción POST requiere el origen exacto `BETTER_AUTH_URL`; en desarrollo API/Better Auth pueden aceptar orígenes completos de `AVO_DEV_AUTH_ORIGINS`. Rechaza cross-site, exige JSON y valida campos/tipos/límites antes de SQL. El lector acota el cuerpo real a 512 KiB aunque no haya Content-Length; hasta 40 entidades por lote, empaquetadas también por bytes.
- Unicidad del vínculo por `runo_users.auth_user_id`. Se admite la fila del viejo hook con el mismo ID interno de auth; no se adopta el dueño fijo. Incluso un vínculo preexistente hacia `owner` se rechaza.
- Better Auth mantiene origen/CSRF propios; se desactivó la vinculación implícita por email y la actualización de perfil durante linking. **La UI de vinculación explícita, verificación independiente de correo y pruebas reales Google/Facebook de E4.3.1 siguen pendientes**, no se sustituyen por una fusión por texto.

### Qué llega a PostgreSQL

- Definiciones de hábitos, incluyendo archivo/restauración.
- Pendientes de una vez, incluyendo `completedAt` y `deletedAt`.
- Preferencias duraderas: audio elegido, sonido, tono, tema, monedero, idioma y orden visual.
- Recibos técnicos de idempotencia en `runo_metadata`, con prefijo `sync:v1:`; no son un historial del timer.

**No se suben** sesiones, ticks, pausas, ocurrencias/resultados recurrentes, eventos, franjas, días, ledger/RC, borradores ni permisos del dispositivo. Las tablas legacy se conservan, pero la API no las expone ni muta. El protocolo rechaza entidades runtime y campos extra.

### Revisiones, reintentos y conflictos

- SQL transaccional; bloqueo por identidad autenticada para serializar escrituras/recibos entre instancias. Todas las entidades se filtran por dueño.
- Cada operación tiene un UUID y un recibo ligado a hash del payload. Repetir una operación devuelve su resultado; reutilizar el UUID con otro contenido se rechaza. Un fallo posterior revierte el lote completo.
- La outbox coalesce cambios por entidad. Un acuse en vuelo no borra una edición local posterior. Un bootstrap no borra runtime ni sobreescribe cambios pendientes.
- Una revisión incompatible conserva ambas versiones y detiene esa entidad. Ajustes ofrece «Conservar mi versión» / «Usar versión de la cuenta», con detalle de ambas. Resolver vuelve a usar la revisión conocida; otra carrera puede pedir nueva resolución.
- Un pendiente completado es terminal: la primera finalización confirmada conserva **entrada, título y fecha**. No se reabre por reintentar, importar o descargar una versión anterior. Otro espacio vacío recupera ese estado final aunque la lista activa lo oculte.

### Incorporación del invitado

**Estado local actual (2026-11-09, tarea 032):** el dueño retiró el acceso desde Ajustes. Se eliminaron ese botón y su pantalla/handlers de revisión e incorporación; no se borraron datos ni se sustituyó por incorporación automática. El módulo de dominio y sus pruebas de consentimiento/aislamiento siguen conservados. El criterio de aceptación de importación real en la tarea 003 debe conciliarse con esta decisión antes de intentarlo; no autoriza reponer otra entrada de UI.

**Diseño original (2026-11-02, ya no accesible desde Ajustes):** solo desde Ajustes, después de mostrar resumen y obtener confirmación. Cancelar no escribe ni importa. Se vuelve a comprobar que el origen no cambió desde la revisión.

IDs deterministas por origen/entidad evitan duplicados y colisiones con IDs de la cuenta. No se pisan filas ya incorporadas ni preferencias de cuenta ya modificadas. Una copia de recuperación del conjunto consentido y las filas/outbox se guardan juntas; los recibos de revisión son inmutables. La definición/preferencia/runtime original del invitado no se borra. No se incorporan sesiones, resultados ni RC.

### Offline, caducidad y logout

- Solo el último espacio local previamente verificado y no bloqueado puede continuar offline. Ese marcador no permite operar en servidor ni elegir arbitrariamente otra caché. Sin sesión válida no se envía la cola.
- Logout bloquea la copia inmediatamente, pausa ejecución y comunica el bloqueo a otras pestañas. La caché no se borra: requiere volver a autenticar esa cuenta para recuperarla. No se transfieren sus tareas/colas al invitado o B.
- Se solicita la revocación con Better Auth. Mientras esa petición está pendiente se bloquea un nuevo login, también entre pestañas, para evitar una respuesta antigua de logout sobre una sesión nueva. La petición tiene timeout; si falla, el bloqueo permanece y se informa **que la revocación remota no pudo confirmarse**, con reintento explícito.
- IndexedDB no está cifrado frente a alguien con acceso al perfil del navegador. Tampoco se promete borrado a distancia de un navegador desconectado. La eliminación remota verificada por cuenta sigue siendo F01/E4.6 pendiente; no se añadió una ruta de borrado insegura.

## Esquema / compatibilidad

- Dexie **v5** añade `outbox` y `syncRecords`, sin renombrar DBs ni borrar entidades. La actualización de una caché de cuenta v4 pone solo sus definiciones/preferencias existentes en cola; invitado no se adopta. Runtime se conserva. Probar versiones anteriores no equivale a migrar datos del dueño.
- **No hay nueva migración Drizzle.** El código requiere el esquema ya definido por **0000–0003**, especialmente `auth_user_id`, PK compuestas, revisiones y preferencias ampliadas. Verificado el 2026-11-03 con `npm run db:verify`/`db:verify:prod`: `prod` y `development` tienen 4 migraciones y el esquema completo (`0003` se aplicó en `development` con autorización, conservando los conteos previos).
- No desplegar el hook/auth ni las rutas nuevas sobre un esquema anterior. Confirmar historial, destino y recuperación; validar primero en `development` (`npm run db:migrate`) y solo después en `prod` (`npm run db:migrate:prod`, con `.env.prod` y conexión directa). No usar un conector que apunte a Invitto.
- No se cambiaron secretos, dependencias, dominios, callbacks, Cache Components, Partial Prefetching ni la configuración Next del repositorio.

## Evidencia local

- **358/358 tests**, 34 archivos, también con `TZ=UTC` y `TZ=America/Mexico_City`. Log `/tmp/avo-sync-final-checks.log`. Cobertura de transacción local/outbox, reapertura, fallo de cuota/red, aislamiento A/B/legacy, actualización v4→v5, bootstrap tras descartar almacenamiento local, SQL/recibos/conflictos/rollback, finalización terminal, cero mutaciones runtime, incorporación/cancelación/recuperación y controles HTTP.
- `npm run typecheck`, `npm run lint`, `npm run db:check`, `npm run build` y `git diff --check`: pasan. PGlite ejecuta las migraciones SQL reales sobre datos sintéticos, no Neon. Kit check valida metadata.
- Build con URL de DB a loopback/puerto inválido y credenciales descartables; en una copia de validación separada para conservar el `next dev` y `.next` del dueño. Solo esa copia ajusta root/tracing para compartir dependencias locales. Turbopack, Cache Components y Partial Prefetching permanecen habilitados. Log `/tmp/avo-sync-build.log`.
- Chromium a 390×844 contra ese build: formulario→envío→confirmación; segundo contexto vacío; borrar IndexedDB/caché→recuperar; logout en otra pestaña abierta en Hábitos; A/invitado/B sin colas cruzadas; reanudación de la cola A; importación con cancelación y preservación del origen; idioma recuperado en otro contexto y no filtrado al invitado; logout remoto fallido con bloqueo/aviso/reintento.
- **PWA en build de producción local:** service worker instalado/controlando, recarga offline, pendiente conservado y envío al reconectar. API/auth interceptados con datos sintéticos y tráfico externo bloqueado. Sin errores JS. El endpoint compilado real, sin interceptar, también rechaza GET anónimo (401/no-store) y POST de origen ajeno (403), sin consultar datos remotos.
- Script/log `/tmp/avo-sync-browser-smoke.{cjs,log}`; captura `/tmp/avo-sync-pending-backed-up.png`. Servidor temporal y contextos cerrados. Estos artefactos son locales, no una prueba CI alojada.

**Límites:** no acredita Facebook real, recuperación en otro navegador, versión/filas desplegadas, conexión/pooling/concurrencia en Neon ni dispositivo físico/Safari. Google real en local ya sincronizó contra `development` (2026-11-03). Quedan revisión UI del dueño, retención de recibos/datos y eliminación segura F01, además de los criterios de vinculación/correo de E4.3.1. No cerrar E4 completo ni publicar por tests/build solamente.

## Siguiente acción

Con autorización específica: comprobar el historial/esquema y el punto de recuperación de la rama `development`. Validar allí las migraciones necesarias y el mismo escenario con sesión real. Después autorizar por separado la migración de `prod` (`npm run db:migrate:prod`) y el deploy. Aceptación final: crear «Buro», esperar «Respaldado en tu cuenta», limpiar el almacenamiento en un contexto descartable y volver con la misma identidad; debe reaparecer, sin aparecer en B/invitado ni subir ejecución del timer.
