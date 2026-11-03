# STATUS — Avo

## En curso

- **E4.1 🟡 — auth base:** Better Auth, rutas y UI de cuenta provienen de `main`; el dueño confirmó Facebook local. Falta revisar sesión/logout con sesión real y configurar/probar Google. Login no equivale a recuperación/sync.
- **E4.2 bloqueado:** están las primitivas de espacios y `drizzle/0003_account_spaces.sql`, probada localmente, no en Neon. No conecta aún la sesión a la DB de cuenta ni tiene bootstrap/restauración. Project ID/entorno de Runo y autorización de migración pendientes.
- **F01 ⛔:** páginas de privacidad/eliminación con texto MVP y contacto fijo `support@frutit.app`, no publicadas. Borrado local acotado a invitado; cuentas/servidores por solicitud manual verificada. Faltan nombre/razón social y domicilio del responsable (variables locales sin configurar), confirmar atención del correo y probar eliminación remota por cuenta antes de producción.

## Último cambio

- **2026-11-02 — feedback UI/legal:** contenido de Google/Facebook centrado; `/privacy` y `/data-deletion` simplificadas, sin placeholders ni avisos de borrador. Correo fijo compartido, OAuth/proveedores descritos, uso responsable sin renunciar a derechos de privacidad y eliminación de cuenta por correo, sin instrucciones a una sección de nube ausente. El botón local declara alcance invitado y usa claves explícitas, no `Storage.clear()`. Cobertura SSR ES/EN y limpieza acotada: 296 tests pasan; typecheck, lint, DB check y build pasan. Sin tocar datos reales, credenciales, migraciones ni deploy.
- **2026-11-02 — arranque dev:** reproducido el 500 de `app/globals.css` aunque `@tailwindcss/turbopack` estaba instalado y cargaba con Node. Se aisló a la caché persistente de Turbopack: sin ella respondió 200; se conservó la anterior en `/tmp/avo-dev-cache-backup.DMGdZV/turbopack` y se regeneró con la caché habilitada, también tras otro reinicio. `next.config.ts` permite únicamente la IP LAN `192.168.68.109` adicional para recursos dev/HMR; README documenta recuperación y cambio de IP. Sin cambiar dependencias, Cache Components ni Partial Prefetching; sin borrar datos, migrar ni desplegar.
- **2026-11-02:** conflictos resueltos e integración local de `Hangtu/facebook-legal-request-mx` sobre `main`; migración renumerada a 0003, login y mascota Avo preservados, documentación condensada. La marca visible cambió de Runo a Avo; se conservan URL, DB y claves técnicas `runo` para no romper datos. `npm test` pasa 288/288; typecheck, lint, DB check, build y diff-check pasan. El HTML del build verifica title, applicationName y manifest Avo. Sin migración remota, push ni deploy.

## Verificado

- Feedback UI/legal: Chromium aislado sobre `next start` de producción, con DB local ficticia y sesión simulada sin consultar Neon. A 1280 y 390 px, los grupos icono/texto de Google/Facebook quedan centrados (desviación <1 px); ambas páginas responden 200 con contacto correcto, sin placeholders, desbordamiento horizontal ni errores JS. Capturas en `/tmp/avo-{settings,privacy,data-deletion}-{1280,390}.png`. Prueba con fixtures en otro contexto aislado: cancelar conserva datos; confirmar borra solo DB/preferencias invitadas y preserva DB de cuenta y otras claves. Servidor temporal cerrado. No prueba OAuth, soporte por correo, borrado remoto, PWA/offline ni teléfono real; el dueño revisa UI/dispositivo.
- `npm test`: **296/296**, 26 archivos; `npm run typecheck`, `npm run lint`, `npm run db:check`, `npm run build` y `git diff --check` pasan para el feedback UI/legal. DB check/build sin conexión remota.
- Recuperación dev: `/` devuelve 200 por loopback y LAN con título Avo; CSS 200 con utilidades Tailwind compiladas. Recursos dev aceptan el Origin LAN (200) y bloquean un Origin no permitido (403); HMR LAN acepta WebSocket (101) y rechaza el no permitido. Se repitieron `npm test` (288/288), typecheck, lint, DB check y build; DB check/build con URL local ficticia, build sin credenciales OAuth y con secreto descartable. No prueba UI/dispositivo, login ni PWA/offline.
- Merge local conserva auth, rutas/UI y Avo de `main`, añade privacidad, aislamiento preliminar y migración 0003. Sin operación remota.
- `npm test`: **288/288**, 25 archivos; también `TZ=UTC` y `TZ=America/Mexico_City`. `npm run typecheck`, `npm run lint`, `npm run db:check`, `git diff --check` y `npm run build` pasan.
- Build con `DATABASE_URL` local ficticia, secreto Better Auth descartable y telemetría desactivada; no conecta a Neon. `next start` local: `/`, `/privacy`, `/data-deletion` 200; `/api/auth/get-session` 200/null; `/api/account/me` 401 sin sesión. No prueba login, UI hidratada, Neon, PWA ni móvil.
- `npm audit --omit=dev`: 4 moderadas de la cadena opcional Drizzle Kit/esbuild; revisar antes de publicación. No se aplicaron fixes forzados.
- B16/B17/B18/B19 cuentan con evidencia técnica local anterior; falta revisión visual/dispositivo. Sin evidencia móvil de G01/G02/G03/G13, audio, wake lock, vibración ni zoom.

## Siguiente

1. El dueño revisa los botones centrados y las páginas `/privacy` y `/data-deletion`. Para F01, aportar nombre/razón social y domicilio del responsable, confirmar atención de `support@frutit.app` y validar eliminación remota segura. E4.1 sigue siendo el único ID en curso: revisar Facebook en Ajustes/Hoy, persistencia/logout con sesión real y después Google.
2. Retomar E4.2: identificar Project ID y rama Neon dev, obtener permiso y recuperación antes de inspeccionar/aplicar 0003. `.pi/mcp.json` está `enabled:false`, `readonly=true`; el MCP disponible apuntó a Invitto, no Runo. No consultar ni migrar ese proyecto.
3. Seguir los IDs restantes en [`plan.md`](./plan.md), sin desplegar ni publicar hasta completar los bloqueos E4/F01.

## Límites

Las migraciones 0000–0002 constan como aplicadas en desarrollo en el historial de `main`; verificar la rama antes de operar y no asumir producción igual. No asociar ni borrar el `owner` de testing. No desplegar `0003` sin autorización. HTTPS/despliegue y prueba en teléfono siguen pendientes.
