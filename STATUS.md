# STATUS — Runo

> Resumen al 2026-11-02. Historial y detalle completo en [`docs/archive/2026-11-01/STATUS-completo.md`](./docs/archive/2026-11-01/STATUS-completo.md).

## Ahora

- **E4.1 (Auth base) 🟡:** Better Auth + Drizzle instalados; tablas `runo_auth_*`, rutas y UI de cuenta listos; migraciones aplicadas en Neon dev (3 migraciones, 16 tablas). Facebook está configurado en local y el dueño confirmó el login (captura del 2026-11-02). UI actualizada: acceso de cuenta solo en Ajustes, saludo con nombre en Hoy fuera del timer y confirmación modal al cerrar sesión. Pendiente revisión del estado autenticado/modal con el dueño, persistencia/logout, `/api/account/me` con sesión y configurar/probar Google. No publicar login ni sync. Plan en [`plan.md`](./plan.md).
- **E4.2 (Identidad local) ⬜ en espera:** seed de 2 hábitos para instalaciones nuevas, bases separadas invitado/cuenta, import/export de snapshot y tests locales; carga desde cuenta y bootstrap esperan el cierre de E4.1.
- **E4 (cuentas + sync) ⬜:** la primera cuenta empieza como usuario nuevo, con 2 hábitos; los datos actuales son testing y no se migran. Conflicto: gana la nube.
- **B16 (segunda carta asomada) 🧪:** implementado y verificado localmente; falta la revisión visual del dueño.
- **B19 (confirmaciones de sesión) 🧪:** «Terminé» y «Hoy no» piden confirmación; se retiró «El bebé». Verificado en build de producción: no aparece «El bebé», ambos botones abren el modal y cancelar conserva la sesión. Falta la revisión del dueño.
- **B18 (sonidos para el timer) 🧪:** ruido rosa, lluvia y olas agregados junto a ruido suave y tic-tac; audio sintetizado localmente, apagado por defecto y con volumen bajo. Evidencia y límites en [`docs/reviews/2026-11-01-sonidos.md`](./docs/reviews/2026-11-01-sonidos.md). Falta probarlos en teléfono.
- **B17 (missed y cierre con revisión) 🧪:** implementado y verificado localmente; falta la revisión visual del dueño. Criterio: una tarea con ventana terminada sigue viva hoy, se etiqueta «Aún puedes» con su turno visible, puede empezar tarde y se ordena antes que la ventana activa dentro de su prioridad; «Terminar por hoy» revisa lo no resuelto sin cambiar estados por su cuenta.
- **Sin commit ni deploy:** los cambios viven en el working tree. Producción (`https://runo-mu.vercel.app`) sigue con la carta única de E3.
- **Últimos ajustes:** confirmaciones de «Ya está hecho», «Hoy no» (con frase local), «Ya lo hice» y «Quitar»; contador de Pendientes elevado en el dock; «Hoy no aplica» tachado y con distintivo ámbar; tareas missed con etiqueta naranja «Aún puedes»; revisión de cierre; confirmaciones directas en «Ya está hecho», «Hoy no» y pendiente hecho; tres sonidos nuevos: ruido rosa, lluvia y olas; «Terminé» y «Hoy no» con confirmación y sin «El bebé»; E4.1: login de Facebook probado; acceso de cuenta en Ajustes, saludo autenticado en Hoy y modal de confirmación al cerrar sesión. Pendientes: revisión visual, sesión y Google. E4.2 local con 2 seeds, bases separadas e import/export; Ajustes aclara «Tono de los mensajes» y que no es voz hablada; Avo, el aguacate administrador del tiempo, reemplaza el logo anterior en favicon, iconos PWA y encabezado; sus variantes conservan la transparencia. Runo sigue siendo el nombre de la app; el saludo de Hoy muestra solo el nombre de pila.

## Hecho

- MVP local-first: Hoy por franjas, timer/3-2-1, pausa persistente, descanso, escalón, sesión rápida, pendientes de una vez, editor por día, ES/EN y offline.
- Economía: ledger, saldo y canje implementados y probados, pero ocultos del MVP visible (segunda capa).
- Nube: E1 esquema, E2 migración y semilla en Neon, E3 copia manual con passcode. E4.1 tiene código y migraciones aplicadas en dev; Facebook login está probado en local, falta validar sesión/logout y probar Google. E4.2 local iniciado; la carga desde cuenta y el sync siguen pendientes. Los datos actuales son de testing y no se migrarán a la cuenta nueva.
- Calidad: **268/268 tests** en local, UTC y America/Mexico_City; `typecheck`, `lint`, `build` y `diff --check` pasan.
- UI: `npm run build` + `next start -p 3100` y Chrome headless/CDP a 390×900 con perfil invitado; Hoy no muestra control de cuenta; Ajustes muestra estado invitado, proveedores y «Tono de los mensajes». Al abrir la ayuda, confirma que no es audio ni habla/lee menús. El dueño confirmó Facebook login por separado; falta revisar visualmente el estado autenticado.
- «Hoy no aplica»: título tachado y distintivo ámbar con icono; verificado en build de producción en claro/oscuro y UI clásica/liquid con una fila de muestra, no con datos reales.
- Sonidos: 5 opciones en Ajustes; `Settings`, validación, esquema y migración alineados. `typecheck`, `lint`, `build` y tests pasan. No se verificó audio audible ni el volumen en un dispositivo real.
- E4.1: `better-auth` + adaptador Drizzle, tablas `runo_auth_*`, `/api/auth/[...all]`, `/api/account/me`, UI de acceso solo en Ajustes, saludo autenticado en Hoy (oculto durante el timer), confirmación de cierre con `ConfirmDialog` y service worker sin caché para `/api/*`. Migraciones `0001` y `0002` aplicadas en Neon dev: 16 tablas, 3 migraciones. `/api/auth/get-session` 200/null y `/api/account/me` 401 sin sesión; build sin schema mismatch. Facebook login local confirmado por el dueño; `268/268` tests, `typecheck`, `lint` y `build` pasan. Chrome headless confirmó el estado invitado: sin control en Hoy y botones en Ajustes; falta la revisión visual autenticada y completar persistencia/logout, `/api/account/me` con sesión y Google.
- E4.2 local: seed de 2 hábitos, `runo` invitado vs `runo-user-<id>`, `importLocalSnapshot` transaccional y tests de aislamiento/import/export. Landing fresca verificada con «Cepillarme los dientes» y «Bañarme». Falta conectar auth/sesión y bootstrap de cuenta.
- Missed: verificado con datos sembrados a las 19:xx en build de producción: café y desayuno de la mañana aparecen con «Aún puedes» y su turno, el café arranca tarde, la revisión de cierre los separa y «Hoy no» los quita sin gastar cambios. Falta la revisión del dueño.
- **12/16 criterios de salida:** faltan G01/G02/G03/G13, que dependen de teléfono.

## Siguiente

1. Con Facebook conectado, revisar en navegador el saludo con nombre en Hoy y en Ajustes «Sesión iniciada»; probar abrir/cancelar/confirmar el modal de cierre. Luego validar persistencia/logout, `/api/account/me` con sesión y configurar/probar Google.
2. Completar E4.2 auth: snapshot inverso, bootstrap, flujo de primer login y logout con sesión real.
3. Reiniciar `npm run dev` y revisar en `http://localhost:3000`: B16, B17, las confirmaciones, el contador del dock, «Hoy no aplica» tachado en ámbar, el flujo missed/cierre, los 5 sonidos y B19.
4. Decidir commit y deploy (no hechos).
5. Probar en teléfono `https://runo-mu.vercel.app`: instalar, abrir standalone, reabrir en modo avión y cubrir G01/G02/G03/G13, C5 (audio real), D2 (vibración/iPhone) y D3 (accesibilidad/zoom).

## Pendientes conocidos

- Sin evidencia de teléfono: instalación/PWA, offline real, wake lock, audio audible, vibración, zoom y safe areas.
- Semana de prueba de uso: no iniciada.
- Recargar/reiniciar el dev de `:3000` para ver los últimos cambios de cuenta; saludo autenticado y confirmación modal de cierre aún requieren revisión visual del dueño.
- La migración `drizzle/0001_zippy_sentinel.sql` agrega los sonidos nuevos al enum `runo_sound`; falta aplicarla en Neon de desarrollo. No aplicarla ni desplegarla sin autorización.
- La migración `drizzle/0002_dry_lethal_legion.sql` crea las tablas de Better Auth; ya está aplicada en la rama de desarrollo (3 migraciones). No asumir que producción está migrada.
- Google no está configurado en `.env.local`; Facebook sí y el login local ya fue confirmado. Preview/producción siguen sin credenciales OAuth configuradas.
- La base dev conserva el `owner` de testing con 10 tareas; no se usa para la cuenta nueva y no se migra. No borrarlo sin autorización.
- E4.1 tiene código, UI y tablas en dev; Facebook funciona en local. Faltan validaciones de sesión/logout y Google. E4.2 tiene la parte local; la parte de cuenta y E4.3 sync no están implementadas. No publicar login ni sync hasta cerrar E4.1–E4.4.
- `127.0.0.1` no hidrata el dev (Next solo acepta su hostname inicial); para aislar datos usar `localhost` con un perfil desechable.

## Reglas de evidencia

⬜ pendiente · 🟡 en curso · 🧪 verificado técnicamente, falta móvil · ✅ criterio cumplido · ⛔ bloqueado.

No inventar pruebas del dueño. Una compilación no prueba el flujo. Registrar comandos, resultados y límites.
