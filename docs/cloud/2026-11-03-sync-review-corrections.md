# E4.2 — correcciones de la revisión de sync

**2026-11-03.** El dueño autorizó corregir los hallazgos del feedback. E4.2 conserva el único foco; no se cierran los criterios reales OAuth/Neon/F01. Se preservó el staging previo: los cambios de esta corrección quedan en el working tree, sin commit, migración remota ni deploy.

## Correcciones

### Selección, timer y formularios

- La selección inicial espera a que Better Auth termine su consulta, con salida recuperable si tarda. La respuesta inicial `null` mientras carga no se interpreta como invitado. `/api/account/me` sigue siendo la prueba de identidad del espacio; las etiquetas usan esa identidad verificada, no una sesión cliente desfasada.
- `enterSpace` es idempotente: entrar de nuevo al mismo nombre **no pausa ni bloquea** su timer. Solo cambiar realmente de espacio o cerrar/bloquear la cuenta pausa el anterior. Las selecciones obsoletas no activan una DB ni revierten un bloqueo; la apertura local y la consulta HTTP tienen límites independientes.
- Se retiró `I18nProvider key={revision}`. Los consumidores recargan sus datos/preferencias por revisión sin desmontar toda la app: se conserva el texto de un pendiente sin enviar, el editor, la navegación y el timer. Los cambios que ya se fusionaron localmente también se publican en la UI si una petición posterior de ese pase falla.
- SSR entrega un shell público con marca, explicación, vínculos legales y texto sin JavaScript, sin montar componentes operativos antes de seleccionar el espacio.
- Apertura IndexedDB acotada a 8 s; `blocked` informa que se cierren otras pestañas, sin recomendar borrar datos. Se cierran aperturas tardías/canceladas. El error permite volver a intentar o elegir invitado.
- «Continuar sin cuenta» tiene regreso explícito: verificar la sesión existente. No abre cachés por elegir un ID, email o proveedor ni requiere repetir OAuth si la sesión del servidor aún es válida.
- El bloqueo conserva una copia en memoria si localStorage falla y se comunica también por BroadcastChannel. Ese canal solo puede **bloquear**, nunca autorizar una cuenta. La revocación fallida sigue siendo visible/reintentable.

### Preferencias

- Nuevo `updateSettings(db, patch)`: lectura, patch, validación, escritura y outbox en **una sola transacción**. Todos los escritores UI —idioma, orden, tema, tono, ajustes y audio de sesión— usan patches; no leen un snapshot para reemplazar campos ajenos.
- Persistencia serializada por espacio, con versiones por campo. Un fallo conserva el valor para reintentar en memoria; un éxito posterior del mismo campo impide reintentar su valor viejo sobre el nuevo. No se escribe una preferencia pendiente bajo otro espacio activo.
- El idioma cambia inmediatamente. Si IndexedDB falla, se informa que no se guardó y se puede reintentar. El espejo localStorage se escribe después del guardado duradero, no como una falsa confirmación.
- El orden visual se actualiza inmediatamente usando una referencia a la última composición; los dos arrastres rápidos se persisten en orden, sin efectos dentro de un updater React. Un fallo tiene aviso/reintento, no se ignora.
- Merge de tres vías para preferencias: cambios de campos distintos se combinan usando la revisión base conocida. Dos valores distintos para el mismo campo continúan requiriendo una elección explícita; **no se añadió LWW general**.

### Operaciones rechazadas y lecturas inválidas

- Se conserva la atomicidad del lote SQL. Ante 400/413/422 permanentes, el cliente divide el lote para identificar la operación rechazada; los elementos sanos siguen enviándose. Red/5xx/401/409/403 no se convierten en descartes de datos.
- La operación problemática queda persistida como `rejected`, junto con su valor y motivo. Ajustes permite reintentar o conservarla `local-only`, siempre indicando que **no está respaldada**. No hay eliminación silenciosa ni vuelta automática a revisión 0. Reintentar renueva el ID de operación, no su revisión base.
- Un rechazo de una petición vieja no marca como rechazada una edición posterior. Un payload local inválido/grande se aísla antes de bloquear la preparación del lote.
- Filas SQL incompatibles se reportan individualmente en `issues`; no se borra ni repara la fila del servidor ni se sustituye una copia local. La UI avisa y los registros válidos siguen siendo recuperables. IDs inválidos se identifican con un hash estable, no bloquean el protocolo de avisos.
- La copia de conflictos explica la finalización terminal. Elegir la versión remota usa su título/fecha si ya está confirmada; una finalización solo local no se deshace al elegir una versión abierta de la cuenta.

### Robustez y costo

- Una sola serialización canónica para comparaciones y hash de recibos: reordenar claves, también anidadas, no cambia la identidad del payload.
- Mutex por espacio en el documento; recibos y bloqueo SQL de identidad siguen protegiendo otras pestañas/instancias.
- Un cambio de outbox hace **push**, no bootstrap completo. Selección inicial, reconexión, foco/visibilidad, reintento explícito y poll hacen pull condicional con ETag privado. El ETag solo se guarda en IndexedDB tras fusionar correctamente; descartar la DB elimina también esa precondición y permite restaurar todo.
- GET con ETag autentica y verifica la cuenta antes de 304, conserva `private, no-store` y `Vary`. No es caché compartida. Un 304 no reescribe metadata; las filas `syncRecords` idénticas tampoco se reescriben.
- **Límite explícito:** el servidor aún consulta/valida el snapshot para calcular el ETag; no es un cursor incremental ni se afirma que elimine el costo SQL. Se mantiene el tope de 10 mil hábitos y 10 mil pendientes por snapshot.
- `AVO_DEV_AUTH_ORIGINS` acepta orígenes completos explícitos solo con `NODE_ENV=development`; API y Better Auth usan la misma fuente. Producción ignora esa variable y sigue aceptando solo el origen base. La lista HMR de Next no concede permisos de auth; no se desactivaron CSRF ni controles de origen.
- Límites de títulos/categorías compartidos entre dominio y protocolo, sin truncar datos. No cambian dependencias, flags Next, migraciones SQL ni la versión Dexie.

## Evidencia local

- **392 tests / 36 archivos**: regresiones de patch atómico y rollback, cola serial/reintento, merges de preferencias, lote rechazado con vecino sano, revisión faltante sin recreación, copias locales ante fila inválida, hashes canónicos, mutex/ETag/push-only, entrada idempotente y cambio A→B, bloqueo de upgrade, timeout/cancelación, lista LAN dev/prod, límites y mensajes cross-tab sin autorización.
- Typecheck, lint, DB check, diff-check y build de producción local en copia aislada. Pruebas SQL con PGlite e IndexedDB falso; no Neon. La suite se repite también en UTC y America/Mexico_City.
- Chromium sobre el build aislado: timer invitado continúa al recargar; timer A continúa tras un 409/reverificación A; un cambio remoto no borra el texto sin enviar, incluso si el push posterior falla; una sesión inicial demorada produce una sola selección y el regreso desde invitado verifica la sesión existente.
- Casos de robustez UI: shell sin JavaScript; fallo de cuota al cambiar idioma con respuesta inmediata/aviso/reintento; dos arrastres reales rápidos con cada apertura IDB demorada 3 s y orden final compuesto C/B/A; upgrade v4 retenido por otra pestaña con recuperación y pendiente preservado; rechazo permanente con vecino sano, elección local-only y reintento explícito; logout en otra pestaña con lecturas/escrituras del marcador localStorage denegadas.
- Se repite el smoke previo: guardado/recuperación en contexto vacío y tras limpiar IndexedDB/caché, A/invitado/B, incorporación consentida no destructiva, idioma portable, logout fallido/reintento y **PWA instalada/controlada que recarga offline y envía al reconectar**.
- Scripts/logs locales: `/tmp/avo-sync-feedback-fixed.{cjs,log}`, `/tmp/avo-sync-feedback-robustness.{cjs,log}`, `/tmp/avo-sync-browser-current-smoke.{cjs,log}`. Build `/tmp/avo-sync-feedback-build.log`; checks `/tmp/avo-sync-feedback-checks.log`. Los smokes esperan estados/elementos concretos, no `networkidle`; las peticiones especulativas de la shell no son una señal de preparación del timer. No son un runner CI alojado.

## Correcciones posteriores (revisión de código, mismo E4.2)

**2026-11-03, segunda pasada.** Se aplicaron los hallazgos de una revisión de código sobre las correcciones anteriores. Siguen sin commit, sin migración remota y sin deploy; el índice staged previo se preserva y estos cambios quedan en el working tree.

- **Tema previo al paint por espacio:** el script bloqueante leía la clave histórica del invitado. Ahora resuelve la clave scopeada desde el marcador local de acceso; una cuenta nunca pinta el tema de otra y el invitado conserva su clave. El valor durable sigue en IndexedDB y el espejo es solo cosmético. Si una cuenta aún no tiene espejo, se usa `auto` sin leer la clave del invitado.
- **Un solo proveedor de idioma con datos:** el provider del layout ya no abre IndexedDB, no escribe `lang`/título y no compite con el provider del espacio; el shell público usa el idioma por defecto. El aviso de cierre de sesión no confirmado se movió dentro del espacio para traducirse con el idioma elegido.
- **Audio de sesión:** recarga por revisión y parchea solo `audioEnabled` o `sound`; ya no reenvía un snapshot que podía revertir el sonido confirmado en otro dispositivo.
- **Identificadores fuera de contexto seguro:** UUID v4 con reserva RFC 4122 y nombres de espacio bloqueado sin `crypto.randomUUID`; la importación del invitado usa un digest determinista y puro en lugar de `crypto.subtle`. Cubre la prueba por LAN en `http://` documentada para `AVO_DEV_AUTH_ORIGINS`.
- **Escrituras de preferencias:** se revalida el espacio después de abrir IndexedDB, no solo antes.
- **Costo del GET:** `ORDER BY` fijo en hábitos y pendientes para que el hash canónico/ETag sea estable; el GET ya no toma el bloqueo de identidad en la ruta caliente (solo cuando debe crear/vincular) y las escrituras conservan el bloqueo. `snapshot_too_large` se reporta con su propio código.

**Evidencia:** 410 tests / 40 archivos (incluye ejecutar el script de arranque real contra almacenamiento sintético, el tema scopeado, el orden canónico, los identificadores sin contexto seguro, el mapeo de errores del callback y la limpieza del `?error=`); `typecheck`, `lint`, `db:check` y `git diff --check` pasan. Además (2026-11-03): `0003` aplicada en `development` con autorización; primera sesión real de Google en local con sync a Neon `development` (2 pendientes, 3 recibos); 10 checks de UI anónima en Chromium headless contra `next dev`; `/api/account/me` y `/api/account/data` 401 anónimo con `private, no-store`, POST de origen ajeno 403. No se ejecutó build nuevo (para no sustituir el `.next` del dev) ni deploy; sin Facebook real, recuperación en otro navegador, `prod`, Safari ni dispositivo.

**Vinculación decidida — patrón 1 sin verificación propia (2026-11-03):** el dueño fijó la política del MVP: si el proveedor autenticó a la persona, es prueba suficiente. No verificamos correos ni cuentas. `disableImplicitLinking: false` + `trustedProviders: ["facebook"]` (Facebook nunca afirma correo verificado en `better-auth@1.7.15`) y `databaseHooks.user.create.before` marca como verificado al usuario local creado por un proveedor con correo: así el mismo correo vincula en **los dos órdenes** (Google→Facebook y Facebook→Google) sin usar la opción deprecada `requireLocalEmailVerified`, que rompería el vínculo inverso al actualizar Better Auth. Ese `emailVerified` local significa “un proveedor autenticó a esta persona y dio este correo”, no “Avo verificó el buzón”. Un correo **distinto** sigue creando otra cuenta. Se añadió `errorCallbackURL` y un aviso en `/` que traduce el `?error=` del callback; sin eso, Better Auth redirigía a `/error`, que no existe, y el fallo quedaba invisible.

**Único fallo restante del flujo:** si el proveedor no entrega correo (p. ej. Facebook sin permiso de email), Better Auth responde `email_not_found` y el aviso lo explica; se resuelve pidiendo el permiso o con un flujo de correo de reemplazo. **Cuentas creadas antes de este cambio por Facebook** conservan `email_verified = false` y pueden seguir sin vincular hasta recrearse; no se tocó ninguna fila. La matriz con OAuth real (ambos órdenes, correo ausente, correo distinto) queda para E4.3.1.

## Límites y siguiente paso

Sin Facebook real, recuperación en otro navegador, entorno desplegado, conexión/pooling/concurrencia de Neon, teléfono físico ni Safari. Google real en local ya sincronizó 2 pendientes y 3 recibos en `development` (2026-11-03). La UI sigue requiriendo revisión del dueño. Un rollback/restauración administrativa del servidor requiere un procedimiento de reconciliación autorizado: no se presume que las revisiones puedan reiniciarse silenciosamente.

**Retención de recibos:** el dueño de producto, con F01/E4.5, debe fijar ventana de reintentos offline, retención y límite operativo antes de producción. No se inventó una caducidad ni se purgaron recibos o datos personales: hacerlo sin decidir la ventana cambia la garantía de idempotencia. Sigue siendo bloqueo de salida, no un criterio cerrado por estos tests.

Después de revisar las correcciones locales: correr la app con `.env` y OAuth real, y repetir creación→confirmación→limpieza→recuperación en otro navegador. `development` y `prod` ya tienen las 4 migraciones y el esquema completo (`0003` se aplicó en `development` con autorización). El deploy a `prod` requiere autorización específica aparte. Mantener E4.2 como único ID en curso; los criterios OAuth/vinculación/correo, F01 y dispositivo permanecen abiertos.
