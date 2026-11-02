# Runo — plan vigente

> Resumen operativo (2026-11-01). La especificación completa v1.11 está en [`docs/archive/2026-11-01/plan-v1.11.md`](./docs/archive/2026-11-01/plan-v1.11.md); este archivo manda para el trabajo diario.

## Qué es

App personal de hábitos, pendientes y timer con presión configurable. Una persona por cuenta, español de México. Busca ayudar a actuar y volver a la vida, no maximizar tiempo dentro de la app.

- **Invitado:** la app abre sin cuenta, guarda en el navegador y muestra dos hábitos de ejemplo.
- **Cuenta:** el login es opcional. Al entrar, los datos de la cuenta se cargan en el dispositivo y se sincronizan entre móvil y desktop.
- **Privacidad:** los datos del invitado se quedan en el navegador hasta que la persona inicia sesión; al entrar se usan los de la cuenta o se suben los del dispositivo.
- **Primera cuenta real:** empieza como usuario nuevo, con los dos hábitos de ejemplo. Los datos actuales de testing no se migran.
- **Landing:** no hay una página separada; la misma app es la entrada, con dos hábitos de ejemplo y un acceso discreto para entrar.

## Cómo se comporta

- **Hoy:** una carta principal («Ahora») y una alternativa asomada; al tocarla se vuelve principal. Nunca un dashboard durante el timer.
- **Franjas:** hasta 3 tareas, varias por día, solo una abierta. Se resuelve antes de avanzar (hecha, ya la hice, hoy no o cambiada). Se reevalúa al abrir/volver y cada hora; conserva al menos dos visibles y lo empezado.
- **Missed:** si la ventana de una tarea termina y sigue sin resolver, permanece viva ese día con la etiqueta «Aún puedes» y su turno visible. Puede empezar tarde, con el timer normal. Dentro de la misma prioridad se ordena antes que la ventana activa y que una tarea sin hora; no se marca sola como «Hoy no» ni pasa al día siguiente.
- **Cierre:** «Terminar por hoy» abre una revisión neutral de lo no resuelto, separada en «Aún puedes» y «Quedó para después», con Empezar, Ya está hecho y Hoy no. Cerrar sin resolver deja las ocurrencias pendientes, sin castigo.
- **Cambios:** 3 por fecha local, compartidos entre franjas. Elegir entre las visibles es libre; sin alternativa no se gasta. Al agotarse desaparece «Otra», pero las correcciones siguen.
- **Correcciones:** «Ya la hice» y «Hoy no» son neutrales, piden confirmación y no gastan cambios. «Hoy no» muestra una frase local de aliento. Cancelar siempre conserva la tarea.
- **Timer:** una sola sesión activa (corriendo o pausada). Pausa explícita persistente; volver no reanuda solo. «Terminé» y «Hoy no» piden confirmación; «Pausar» cubre la vida real, sin botón «El bebé». Reloj de pared, sin acumular intervalos. Cerrar sin pausar deja correr el reloj. Cero no completa ni paga: confirma. Un pendiente de una vez puede cerrarse y quedarse en su lista.
- **Escalón:** primer paso opcional y parcial; no completa la tarea ni se cobra dos veces.
- **Horarios y ancla:** se filtra por días/franja antes de priorizar. Un ancla visible pausa la sesión anterior, se presenta una vez y no inicia timer ni mueve citas.
- **Audio:** apagado al inicio; mute persistente; ruido marrón/rosa, lluvia, olas y tic-tac; siempre feedback visual. Vibración y wake lock con fallback; no prometer avisos con la app cerrada.
- **Presión:** techo 2, tono normal 1; 5–10 frases locales sin LLM; duro solo a pedido o con motivo. Sin castigos ni rachas.
- **Descanso:** 10 min gratis al completar, saltable. RC (1 RC = 1 min) quedan para la segunda capa y no se muestran en el MVP.
- **Sesión rápida:** nombre + minutos desde Hoy o día cerrado; no es tarea, no entra a franja, no paga RC y no altera el día.
- **Pendientes:** lista aparte para cosas de una vez; 25 min iniciales; timer directo; no entra a franjas ni paga RC.
- **Editor:** cualquier día; duración y al menos un día obligatorios; franja/hora, prioridad y escalón opcionales; orden visual por arrastre dentro de cada sección.
- **Lenguaje y ayuda:** textos cotidianos; instrucciones en iconos `i`; ES/EN desde Ajustes, sin rutas de locale.
- **Dock:** cuatro accesos (Hoy, Hábitos, Pendientes, Ajustes) y contador discreto de pendientes abiertos.
- **Cuenta:** invitado local; login opcional con Google o Facebook; una persona por cuenta; los datos se sincronizan entre dispositivos; cerrar sesión vuelve al espacio de invitado.

## Técnica

- Next 16.4.3, React 19.3, TypeScript y Tailwind v4; App Router y Server Components por defecto.
- IndexedDB/Dexie es la fuente local; no se lee en SSR. Dominio puro con reloj/semilla explícitos.
- Neon + Drizzle solo en servidor. E1–E3: copia manual con passcode. E4: Better Auth + sync multiusuario.
- `DATABASE_URL` pooled; migraciones por URL directa.
- Offline con service worker y assets cacheados. `.ics` y push quedan fuera del MVP.
- Privacidad: sin LLM ni analítica de terceros en el MVP.

## Plan E4 · Cuentas y sync

**Estado:** aprobado el 2026-11-01. E4.1 está implementado en dev y Facebook login funciona en local; Google y las pruebas de sesión/logout siguen pendientes. E4.2 tiene su base local implementada.

**Orden:** E4.1 → E4.2 → E4.3 → E4.4. Un solo ID en curso; cada fase termina con `npm test`, `typecheck`, `lint`, `build` y evidencia en `STATUS.md`.

### Decisiones cerradas

- Better Auth self-hosted con Google y Facebook.
- Login opcional; la app sigue usable sin cuenta.
- Una persona por cuenta; sin cuentas compartidas.
- Primera instalación y cuenta nueva: **2 hábitos de ejemplo**: «Cepillarme los dientes» y «Bañarme».
- Al iniciar sesión en una cuenta nueva, los datos del invitado se suben automáticamente; para la primera cuenta real del dueño se usa un perfil limpio y no se migran los datos de testing.
- Al iniciar sesión en una cuenta existente, se descargan los datos de la cuenta.
- Si el invitado tiene cambios y la cuenta también, se pregunta; por defecto gana la cuenta.
- La copia local de la cuenta se conserva para poder seguir sin internet después de un login exitoso. La app no debe bloquear el arranque esperando validar la sesión: abre la copia local y sincroniza cuando vuelva la red.
- Cerrar sesión vuelve al invitado; la copia de la cuenta queda oculta y se puede borrar desde Ajustes.
- Sync v1: snapshot completo con revisión. Si dos dispositivos cambiaron, **gana la nube**: el dispositivo descarga la versión web y avisa. No hay merge ni pregunta.
- El passcode de E3 se retira al cerrar E4.2, cuando el login ya puede cargar los datos de la cuenta; hasta entonces queda como puente interno.
- Los datos actuales de `owner` y del navegador son de testing: no se migran. La cuenta del dueño se crea desde un perfil limpio con los dos ejemplos.

### E4.1 · Auth base

**Objetivo:** Google y Facebook funcionan; la app sigue local sin cuenta; las APIs exigen sesión.

- [x] Agregar `better-auth` y el adaptador Drizzle.
- [x] Crear tablas `runo_auth_*` y perfil 1:1 en `runo_users` (`id`, zona horaria, createdAt). Better Auth guarda email, nombre, imagen y verificación; no duplicar credenciales en el perfil.
- [x] Generar y revisar la migración `drizzle/0002_dry_lethal_legion.sql`.
- [x] Aplicar las migraciones en Neon dev y verificar las 4 tablas (3 migraciones aplicadas el 2026-11-02).
- [x] Configurar `lib/auth.ts`, `lib/auth-client.ts` y `app/api/auth/[...all]/route.ts`.
- [x] Configurar credenciales de Facebook en local; login probado por el dueño el 2026-11-02.
- [ ] Configurar Google en local y configurar ambos proveedores en preview/producción.
- [x] UI de cuenta: iniciar sesión solo desde Ajustes; Hoy muestra un saludo discreto con el nombre de la sesión (sin correo y fuera del timer); Ajustes refleja sesión activa o estado invitado, ofrece proveedores y pide confirmación antes de cerrar sesión. Nunca bloquear el arranque.
- [x] Proteger la ruta de cuenta `/api/account/me` con sesión; `/api/sync` nacerá autenticada en E4.2/E4.3.
- [x] Mantener el passcode de E3 solo como puente interno hasta E4.2; no exponerlo en la UI nueva.
- [ ] Tests de sesión: sin sesión 401; con sesión 200; logout limpia cookie. Pendiente comprobar persistencia, respuesta autenticada y cierre con una sesión real.

**Criterio:** se entra con Google y Facebook; la app invitada sigue funcionando; una API sin sesión no devuelve datos.

### E4.2 · Identidad local y datos iniciales

**Objetivo:** cada cuenta tiene su espacio local; el invitado no ve datos de la cuenta; el primer login no pierde datos.

- [ ] Cambiar el seed de instalaciones nuevas a 2 hábitos; no tocar datos existentes.
- [x] Separar bases locales: `runo` para invitado y `runo-user-<id>` para cuenta mediante el alcance de `openDatabase`.
- [x] Implementar importación/exportación de snapshot local con validación y transacción.
- [ ] Implementar snapshot inverso desde tablas normalizadas y `GET /api/account/snapshot` autenticado para el primer login.
- [ ] Implementar `POST /api/account/bootstrap` autenticado, idempotente y solo para cuentas sin snapshot, para subir los datos del invitado a una cuenta nueva.
- [ ] Flujo de primer login:
  - [ ] Cuenta nueva + invitado con datos → subir invitado a la cuenta.
  - [ ] Cuenta existente + invitado solo con los 2 ejemplos → descargar cuenta.
  - [ ] Cuenta existente + invitado con cambios → preguntar (cuenta por defecto).
  - [ ] Cuenta existente + dispositivo nuevo → descargar cuenta.
- [ ] Logout: volver a `runo`; conservar `runo-user-<id>` oculta; opción «Borrar datos de este dispositivo».
- [ ] Retirar el passcode y las variables `RUNO_PASSCODE`, `RUNO_SESSION_SECRET` y `RUNO_OWNER_ID` del flujo normal.
- [ ] No migrar los datos de testing: crear la primera cuenta del dueño desde un perfil limpio con los dos ejemplos.
- [x] Tests de aislamiento, importación y exportación locales.
- [ ] Tests de snapshot inverso y logout con sesión real.

**Criterio:** al entrar en desktop se ven los datos creados en móvil; el invitado no ve la cuenta; la primera cuenta real empieza con los dos ejemplos y sin datos de testing.

### E4.3 · Sync v1

**Objetivo:** los cambios viajan entre dispositivos sin sorpresas; sin merge automático.

- [ ] Añadir `runo_sync_state` por usuario: `revision`, `last_device_id`, `updated_at`.
- [ ] Reutilizar el snapshot inverso de E4.2.
- [ ] `GET /api/sync`: snapshot + revisión.
- [ ] `POST /api/sync`: reemplazo transaccional si `baseRevision` coincide; 409 si no.
- [ ] Cliente: detectar cambios con Dexie, debounce 2–3 s, hash para no subir snapshots idénticos.
- [ ] Sincronizar al abrir, volver a la app, recuperar conexión, terminar sesión y cerrar día.
- [ ] UI de estado: «Sincronizado», «Sincronizando», «Sin conexión», «Conflicto».
- [ ] Conflicto: gana la nube; descargar la versión web, reemplazar la copia local y mostrar un aviso. No preguntar y no fusionar.
- [ ] Service worker: red-only para `/api/*`; nunca cachear auth ni sync.
- [ ] Tests de revisión, 409 e importación.

**Criterio:** un cambio en móvil aparece en desktop; editar offline y reconectar sincroniza; si hay conflicto, gana la nube y el dispositivo queda actualizado con un aviso.

### E4.4 · Preview, producción y migración

**Objetivo:** login y sync estables en Vercel Preview y producción, sin mezclar entornos.

- [ ] Aplicar migraciones en Neon de desarrollo; no tocar producción sin backup.
- [ ] Vercel Preview con dominio estable (branch alias o subdominio propio), no URL efímera.
- [ ] Registrar redirect URIs de Google y Facebook para local, preview y producción.
- [ ] Configurar `BETTER_AUTH_URL` y secretos distintos por entorno.
- [ ] Revisar Vercel Authentication: no debe bloquear callbacks de testers externos.
- [ ] Facebook: app Live, privacidad, eliminación de datos y dominios verificados.
- [ ] Verificar que los datos de testing (`owner` y navegador) no se mezclen con la cuenta nueva; no migrarlos.
- [ ] Pruebas manuales: Google, Facebook, logout, segundo dispositivo, offline, conflicto con nube ganadora.
- [ ] Actualizar `STATUS.md`, `AGENTS.md`, `docs/cloud/` y este plan.
- [ ] Decidir commit, deploy y variables antes de publicar.

**Criterio:** login funciona en preview y producción; cada cuenta ve solo sus datos; no hay passcode; migraciones aplicadas primero en dev; los datos de testing no se migran.

## Qué significa «conflicto»

Dos dispositivos cambiaron la misma cuenta desde la última sincronización. Por ejemplo: editas una tarea en el móvil sin internet y también la editas en desktop.

- El servidor incrementa una **revisión** cada vez que recibe datos.
- Cada dispositivo dice «vengo de la revisión 7».
- Si el servidor está en 8, responde **409**.
- La política es **web-first**: el dispositivo descarga la versión de la nube, reemplaza su copia local y muestra «Se cargó la versión más reciente». No pregunta ni fusiona.
- Esto puede descartar cambios locales que no se hayan subido; es la decisión de producto.
- No es colaboración en tiempo real. Si no editas en dos dispositivos a la vez, los conflictos serán raros.

## Fuera de alcance de E4

- Sync en tiempo real entre dispositivos.
- Merge automático de conflictos.
- Cuentas compartidas, organizaciones o equipos.
- Sync con la app cerrada.
- Push, `.ics` o analítica.
- Cifrado de extremo a extremo.
- Borrado remoto automático por inactividad.

## Riesgos

- El snapshot completo puede ser más pesado con muchos eventos; se puede compactar después.
- Los conflictos de dos escritores no se fusionan en v1.
- Facebook tiene más configuración operativa que Google.
- Vercel Preview con URLs efímeras y protección puede romper OAuth.
- La copia local de la cuenta en un dispositivo compartido debe poder borrarse.
- El retiro del passcode y la limpieza de datos de testing necesitan una ventana controlada.
- La política web-first puede descartar cambios locales no sincronizados.

## Seguimiento

| ID | Estado | Evidencia |
|---|---|---|
| Plan E4 | ✅ aprobado | 2026-11-01 |
| E4.1 Auth base | 🟡 en curso | Facebook configurado y login confirmado en local (2026-11-02); quedan persistencia/logout, `/api/account/me` autenticado y Google. |
| E4.2 Identidad local | ⬜ en espera | 2 seeds, bases separadas, import/export y tests locales; bootstrap/auth espera el cierre de E4.1. |
| E4.3 Sync v1 | ⬜ pendiente | — |
| E4.4 Preview/producción | ⬜ pendiente | — |

## Límites

No ampliar por iniciativa propia a: RC visibles, LLM, rachas o castigos, `.ics`/push, dashboards, motor 2D ni nivel 3/Elian. E4 (cuentas y sync) ya está aprobado; no agregar organizaciones, cuentas compartidas ni sync en tiempo real sin una decisión nueva.
