# E4.1 / E4.2 — autenticación elegida y primer corte de datos

**Fecha:** 2026-11-02. El dueño autorizó comenzar la implementación. Este registro cierra las decisiones técnicas de E4.1 y documenta el trabajo E4.2. Después se integró `main`, que ya contiene la base de Better Auth, rutas/UI y una prueba local de Facebook confirmada por el dueño; esta nota se actualiza para distinguirlo de la recuperación, el aislamiento UI y el sync aún no implementados. Mandan los criterios de `plan.md`; no se autoriza deploy ni operación sobre datos reales por este documento.

## 1. Decisión de E4.1

Usar **Better Auth 1.7.15 autohospedado en el servidor Next**, con **`@better-auth/drizzle-adapter` 1.7.15** y Postgres/Neon. La ruta, la configuración básica, controles UI y `/api/account/me` ya están en `main`; los paquetes son dependencias runtime y permanecen fijados en `package.json`/lockfile. Esto no implementa la selección/aislamiento de espacios, recuperación ni sync. IndexedDB sigue siendo la capa operativa; el invitado no necesita auth ni red.

- La documentación oficial incluye integración Next App Router, adaptador Drizzle/PG y proveedores Google/Facebook. Los peer dependencies admiten las versiones instaladas de Next 16.4.3, React 19.3 y Drizzle 0.45.4. Esto prueba compatibilidad declarada, **no callbacks reales**.
- No elegir Neon Auth gestionado para este corte: su lista oficial de proveedores sociales consultada no incluye Facebook. Que Neon use Better Auth no implica que exponga todos los proveedores de la biblioteca autohospedada.
- No implementar el protocolo OAuth: intercambios, validación del proveedor y protecciones del flujo quedan en Better Auth. No usar tokens enviados por una UI como autorización de filas.
- No contratar un servicio de auth. La biblioteca/adaptador son software abierto; no cobran por usuario como dependencia. Sí se consume cómputo de Vercel, almacenamiento/conexiones de Neon y, para la verificación indicada abajo, entrega de correo. No prometer capacidad gratis ilimitada ni congelar precios/quotas de terceros.
- Con el árbol integrado, `npm audit --omit=dev` informa 4 moderadas en la cadena opcional `drizzle-kit` → `@esbuild-kit/*`/`esbuild` (esbuild <=0.24.2; petición cruzada desde páginas al servidor de desarrollo). Evaluar el peer de Kit y alternativas antes de publicar; no degradar Kit ni ocultar hallazgos moviendo dependencias a dev. No se ejecutó `audit fix --force`.

### Correo, identidad y vinculación

1. Better Auth identifica cada método mediante `(providerId, accountId)`; la identidad interna no es el correo. `runo_users.auth_user_id` relaciona de forma única la identidad autenticada con el usuario de dominio. Las filas antiguas quedan con ese vínculo en `NULL`.
2. Normalización de correo: recortar espacios exteriores y minúsculas; no quitar puntos, resolver alias `+`, comparar nombres ni asumir equivalencia de proveedores. Índice único adicional sobre `lower(btrim(email))` para evitar carreras por diferencias de presentación. Este índice **no autoriza** ni fusiona cuentas.
3. E4.3 debe desactivar vinculación implícita (`disableImplicitLinking: true`), dejar vacía la confianza forzada de proveedores y evitar cambios automáticos de perfil/correo al vincular. Un mismo email exige entrar con el método existente y consentir el vínculo.
4. Para vincular/desvincular: sesión reciente de **5 minutos**, control del nuevo proveedor y confirmación explícita. La biblioteca ofrece vinculación explícita; Runo debe proteger tanto el inicio como el callback de una vinculación pendiente y no permitir retirar el último método utilizable. Las identidades ya vinculadas se resuelven por su ID estable aunque cambie su email.
5. **Facebook no garantiza verificación de email.** Se inspeccionó el código de la versión fijada: el flujo Graph usa `profile.email_verified ?? false`; Limited Login devuelve `emailVerified: false`. No convertir la mera presencia de `email` en `true`, ni usar el atributo histórico `verified` del perfil como prueba de control del correo.
6. Google puede aportar `email_verified`. Si el proveedor no acredita el correo de un alta nueva, E4.3/E4.3.1 necesitan una **verificación independiente de correo**, con entrega mediante transporte SMTP configurado en servidor y mecanismos de verificación de Better Auth. No añadir cuentas por contraseña ni tratar un correo escrito en un formulario como identidad ya verificada.
7. La inscripción pendiente no puede reservar una cuenta operativa con un método atacante: conservar prueba temporal del OAuth y desafío, ligados al mismo navegador/identidad y con caducidad, sin crear datos de dominio ni vincular el correo existente. El código/enlace será de un solo uso, de vida corta (10 minutos), con límite de intentos y frecuencia; no guardar el código en claro. Tras verificar: alta solo si no existe esa cuenta; si existe, exigir control reciente del método original antes de vincular. Probar esta integración con la biblioteca en E4.3.1, no sustituirla por una implementación OAuth propia.
8. **Sin transporte de verificación configurado o si falta el correo:** no habilitar el alta Facebook-only insegura. Dar salida a invitado o Google y permitir vincular Facebook desde una cuenta ya verificada, probando ambos controles. Vincular un proveedor sin email/diferente requiere una excepción explícita solo para ese flujo autenticado; no habilitar unión automática por email. No declarar completo E4.3.1 sin verificar el alta Facebook primero, incluida esta alternativa. La entrega/configuración de correo y las credenciales de proveedores son dependencias reales, no están creadas por instalar paquetes.
9. Recuperación MVP: acceso por un método vinculado; pérdida de un método permite usar el otro. Sin control de un método y sin verificación probada, no ofrecer una recuperación por email textual ni una fusión administrativa automática. La UI debe dar una salida neutral, sin enumerar cuentas ajenas.

### Sesiones y Next

Contrato a implementar en E4.3, **no configuración ya activa**:

- Sesiones revocables en servidor: 7 días de vigencia, actualización como máximo diaria; frescura reforzada de 5 minutos para vinculación/eliminación. Sin caché de sesión en cookie que oculte una revocación.
- Cookie HttpOnly, Secure sobre HTTPS y SameSite compatible con el retorno OAuth. Origen/base URL fijo por entorno y allowlist exacta; no confiar en cualquier `*.vercel.app` ni en cabeceras reenviadas sin configurar su confianza.
- Activar cifrado de tokens OAuth (`encryptOAuthTokens`) cuando se guarden; secretos solo en servidor y sin tokens en la caché local o logs. No pedir contactos, anuncios, publicación, Drive ni acceso offline del proveedor por conveniencia.
- Consultas autenticadas y DTO mínimos detrás de una capa de acceso servidor. Siempre obtener `user_id` del vínculo de la sesión verificada, nunca de un payload.
- Mantener `cacheComponents` y `partialPrefetching`. La guía instalada exige acceso de sesión a tiempo de petición dentro de un límite `Suspense` si se renderiza en servidor; no poner la sesión en el layout estático ni en una caché compartida. Respuestas personales/API con `no-store` y fuera del caché público del service worker.
- No consultar sesión por tick ni activar polling de auth/dominio. Sí puede haber lecturas/renovaciones de sesión durante login, foco o reconexión: el contrato de cero mutaciones del timer se refiere al dominio, no prohíbe mantenimiento de seguridad.

### Orígenes y callbacks propuestos

La ruta estándar de Better Auth será `/api/auth`; **aún no existe** en este corte.

| Entorno | Origen fijo | Callback Google / Facebook |
|---|---|---|
| Local Google | `http://localhost:3000` | `/api/auth/callback/google` |
| Local Facebook | Origen HTTPS de desarrollo registrado y autorizado | `/api/auth/callback/facebook` |
| Desarrollo integrado | Host HTTPS estable de desarrollo, por confirmar | `/api/auth/callback/google` y `/api/auth/callback/facebook` |
| Producción, después de autorización | `https://runo-mu.vercel.app` | `/api/auth/callback/google` y `/api/auth/callback/facebook` |

Registrar URLs completas y exactas en cada consola; no usar previews efímeros como callbacks públicos. La documentación de Better Auth muestra localhost para Facebook, pero no sustituye los requisitos HTTPS/modo desarrollo y revisión que imponga Meta a la app concreta. No se creó un túnel ni se configuró una consola. Usar credenciales/secretos distintos por entorno; las claves E3 no son secretos OAuth. Los requisitos de aviso y eliminación de Meta siguen en F01.

## 2. Proyección, semillas y salida: decisiones cerradas

- **Preferencias portables:** `locale` (`es`/`en`), tema elegido (`auto`/`light`/`dark`), `maxTone` (0–2), sonido elegido y `taskOrder` (mapa tipado ID de rutina → posición numérica finita). El orden corresponde al editor actual, no altera el motor de prioridad de Hoy. Validar referencias y valores al importar; no subir un objeto arbitrario de localStorage. Una revisión de preferencias por cuenta; no sincronizar valores predeterminados por el simple hecho de abrir un dispositivo.
- **Locales del dispositivo:** audio activado/mute, `showWallet` oculto del MVP, permisos, controles del timer, borradores y secciones abiertas. Recuperar preferencias no activa audio. La zona operativa existente permanece separada en `runo_users.time_zone`; no se añade un selector ni se cambia automáticamente por viajar.
- **Histórico de pendientes:** conservar los campos duraderos ya existentes (ID, título, duración, creación/actualización, `completedAt`/`deletedAt`) y la revisión. La vista expone título y fecha, de más reciente a más antiguo. Primera finalización aceptada fija la fecha canónica; un reintento o un estado abierto obsoleto no la modifica ni duplica el registro. No se guarda sesión ni cronología de ejecución.
- **Cuenta nueva vacía:** no llamar a la semilla personal del dueño. Primero recuperar la cuenta y, si hay datos invitados, proponer la incorporación con confirmación. Ningún ejemplo se incorpora automáticamente a una cuenta. No modificar las diez rutinas ni la marca de semilla de los navegadores existentes.
- **Logout:** revocar la sesión servidor, detener tareas/envíos y cerrar conexiones/observadores del espacio antes de pasar a invitado. Conservar la caché de cuenta separada, bloqueada para la UI hasta nueva autenticación; ofrecer retirar solo esa copia. Informar de cambios sin enviar y no descartarlos sin permiso.
- **Offline/caducidad:** el último espacio activo puede seguir funcionando localmente si no hubo logout explícito; no afirmar que su sesión sigue vigente ni enviar hasta validarla para la misma cuenta. Un logout no permite reabrirlo offline solo por seleccionar el usuario. La detección de revocación/eliminación requiere red; no se promete borrado a distancia de un navegador desconectado.
- El particionado no cifra IndexedDB frente a alguien con acceso al perfil del navegador. La UI, bloqueos de caché, cambio entre pestañas y flujo de eliminación aún deben implementarse/verificarse en E4.3/E4.6.

## 3. Código preparatorio de E4.2

### Esquema remoto y migración

- `lib/db/auth-schema.ts`: refleja las cuatro tablas Better Auth ya creadas por `0002_dry_lethal_legion.sql` en `main`; conserva sus columnas e índices y añade en `0003_account_spaces.sql` unicidad conservadora del correo normalizado. Campos contrastados con `getAuthTables` de la versión instalada.
- `runo_users.auth_user_id` es nullable y único, con FK restrictiva. Crear una identidad no adopta `owner`; el borrado de auth no puede saltarse la limpieza del dominio. `main` contiene ya el endpoint/auth básico y configuró Facebook local; credenciales/callbacks públicos, vinculación segura y persistencia de datos siguen pendientes.
- PK de dominio `(user_id, id)` para rutinas, pendientes, franjas, ocurrencias, sesiones, eventos y ledger; `hand_items` añade dueño y PK `(user_id, hand_id, occurrence_id)`. Las FKs de dominio incluyen al dueño. Días/metadata conservan sus claves compuestas.
- Revisiones iniciales en rutinas, pendientes y preferencias; idioma y orden tipado en preferencias. Esto **no implementa outbox, conflictos ni sync**. El flujo E3 aún reemplaza snapshots; no usarlo para E4.
- Se corrigió el borrado de `hand_items` del repositorio E3: ahora filtra su `user_id`, no un `hand_id` global que podría coincidir en B. El mapeo de snapshot añade dueño tanto a activas como diferidas.
- Los IDs de eventos siguen siendo etiquetas históricas sin FKs; no autorizan joins. `occurrences.task_id` sigue sin FK por sus IDs sintéticos. Estas excepciones no convierten runtime en datos sincronizables.
- Referencias opcionales `sessions.hand_id` y `ledger.occurrence_id`: pasan a `NO ACTION` en su FK compuesta. Antes de borrar solo el destino se debe limpiar explícitamente la referencia; `SET NULL` compuesto borraría también `user_id`. La copia/eliminación E3 ya elimina hijos primero y se prueba así.

`drizzle/0003_account_spaces.sql` se generó después de la migración `0002_dry_lethal_legion.sql` de Better Auth que ya forma parte de `main`; **0003 no se aplicó a Neon**. Revisión necesaria respecto de la salida de Kit:

1. Resolver las siete PK inline desde `pg_constraint`, limitándose al esquema/tablas/columnas esperadas y abortando ante drift. Kit dejó placeholders que por sí solos producirían dos PK.
2. Añadir `hand_items.user_id` nullable, rellenar desde su franja conservando filas y exigir NOT NULL **antes** de crear su nueva PK. La salida original creaba la PK antes de la columna y añadía NOT NULL sin backfill.
3. Bloquear las tablas afectadas durante el backfill. Si un join legacy cruza dueños, abortar: no corregirlo asignándolo ni borrándolo.
4. Ejecutar todo transaccionalmente; un error devuelve esquema y datos anteriores. No hay DELETE/TRUNCATE ni importación del dueño.

### Espacios locales

- `lib/db/local-space.ts` y `openDatabaseForSpace`: invitado conserva exactamente `runo` y las claves previas; cuenta conserva el nombre Dexie existente de `main`, `runo-user-<ID interno codificado>`. El encoding distingue separadores/porcentajes y no usa email/proveedor; las claves nuevas de preferencias se aíslan por cuenta.
- Cada DB contiene sus propias tablas de dominio/runtime/metadata; no hay singleton global de cuenta. Abrir un espacio no importa ni siembra.
- Preferencias/borradores con claves de espacio; limpieza por lista explícita de claves Runo, nunca `Storage.clear()` ni barrer un prefijo amplio.
- **Compatibilidad sin migración destructiva:** no se mueve/renombra la DB invitada ni cambia su versión 4. Por ello no hace falta copiarla para este corte. E4.4 deberá crear el punto de recuperación/recibo antes de cualquier incorporación o transformación posterior.
- Son primitivas preparatorias, **la UI todavía usa el invitado**. El selector autenticado, cierre seguro de conexiones al cambiar cuenta, bloqueo tras logout y sustitución del borrado global del borrador F01 siguen pendientes. No afirmar aislamiento de UI entre usuarios ya implementado.

## 4. Evidencia local y límite

- Antes de integrar `main`, `npm test`, `TZ=UTC npm test` y `TZ=America/Mexico_City npm test` dieron 279/279 cada uno, 22 archivos. Incluyeron esquema, claves y separación Dexie con fake IndexedDB; PostgreSQL/WASM local con PGlite 0.5.14 ejecutando migraciones reales. No son el resultado de la integración final; el merge se vuelve a verificar.
- En PostgreSQL local: conservar todas las columnas legacy y joins; mismos IDs de todas las entidades en A/B; reemplazar/borrar A mediante el repositorio real sin tocar B/legacy; rechazo de FKs cruzadas y duplicados de correo/proveedor; no adopción de `owner`; rollback de datos/esquema tras joins legacy incompatibles o fallo al final del SQL.
- `npm run typecheck`, `npm run lint`, `npm run db:check`, `git diff --check`: pasan. Kit check valida metadata, no ejecuta el SQL; por eso también existe la prueba PostgreSQL.
- Tras integrar `main`: `DATABASE_URL` apuntando a `127.0.0.1` ficticio, `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` de build descartables y `NEXT_TELEMETRY_DISABLED=1 npm run build` pasó con Next 16.4.3 y generó `public/sw.js`, sin conexión a Neon. `next start` local devolvió `/`, `/privacy`, `/data-deletion` 200, `/api/auth/get-session` 200/null y `/api/account/me` 401 sin sesión. El proceso de prueba se cerró. Smoke HTTP, no login real, UI hidratada, Neon, PWA ni móvil.
- PGlite no valida conexión/pooling/concurrencia de Neon ni una migración real en rama identificada. Fake IndexedDB no prueba bloqueo de UI, navegador ni PWA. Ninguna de estas pruebas acredita login Google/Facebook, entrega de correo, linking, logout o eliminación de cuentas.
- **E4.2 permanece en curso** hasta validar la migración/recuperación en una rama Neon de desarrollo identificada y autorizada. No ejecutar migraciones ni el seed del dueño contra una URL deducida como desarrollo.

## 5. Antes de tocar Neon

**Bloqueo detectado solo por metadatos:** `describe_project({})` del conector disponible devuelve **Invitto**, no el proyecto Runo descrito por E1/E2. No se listaron ramas/tablas ni se consultaron datos de esa aplicación. No usar ese contexto para esta migración; hace falta acceso al proyecto Runo y una rama de desarrollo confirmada. La consulta no modificó recursos.

1. Identificar proyecto/rama/DB correctos y confirmar que es desarrollo; el endpoint no demuestra la rama. Revisar el journal real: `0000`–`0002` constan como aplicadas en dev en `STATUS.md`; verificarlo en la rama y revisar `0003_account_spaces.sql` antes de cualquier operación.
2. Obtener autorización para esa operación y disponer de punto de recuperación probado (rama/backup), fuera de datos personales de pruebas destructivas. No crear servicios/rama con costo ni tocar producción por inferencia.
3. Revisar nombres/columnas/PK/FKs y joins legacy con consultas solo lectura; detenerse si difieren. Revisar el SQL completo y hacer respaldo/recuperación según el entorno autorizado.
4. Usar migraciones Drizzle por conexión directa en transacción; nunca `push`. No ejecutar `db:seed` multiusuario: carga ejemplos personales y `owner`.
5. Repetir escenarios sintéticos A/B, comprobar datos preexistentes y recuperación. Solo entonces cerrar E4.2 y pasar a E4.3, un ID a la vez.
6. No desplegar el código que depende de `hand_items.user_id` y las claves nuevas sobre una base antigua. OAuth público requiere además E4.7 y F01, no solo compilar.

## Fuentes consultadas

Documentación oficial consultada el 2026-11-02; cuando las páginas siguen `main`, contrastar APIs con el paquete fijado antes de usarlas.

- Guía instalada `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`; guías instaladas de Server/Client Components y Route Handlers.
- https://www.better-auth.com/docs/integrations/next
- https://www.better-auth.com/docs/adapters/drizzle
- https://www.better-auth.com/docs/concepts/users-accounts
- https://www.better-auth.com/docs/concepts/session-management
- https://www.better-auth.com/docs/authentication/google
- https://www.better-auth.com/docs/authentication/facebook
- https://www.better-auth.com/docs/reference/options
- https://github.com/better-auth/better-auth/blob/v1.7.15/packages/core/src/social-providers/facebook.ts
- https://github.com/better-auth/better-auth/blob/v1.7.15/packages/core/src/social-providers/google.ts
- https://neon.com/docs/auth/roadmap
- https://neon.com/docs/guides/nextauth-neon-auth-better-auth-postgres
- https://www.npmjs.com/package/better-auth/v/1.7.15 (versión/peer dependencies comprobados con npm)
