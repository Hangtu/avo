<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Runo — reglas de trabajo

App personal (un usuario, español de México) de hábitos, pendientes y timer con presión configurable. El objetivo es ayudar a actuar y volver a la vida, no maximizar uso.

## Fuentes de verdad

1. `STATUS.md`: qué existe, evidencia y **siguiente acción**.
2. `plan.md`: qué se construye y cómo se comporta. El detalle v1.11 está en `docs/archive/2026-11-01/plan-v1.11.md`.
3. `node_modules/next/dist/docs/`: guía de la versión instalada antes de tocar APIs de Next.
4. `docs/cloud/` y la documentación de Neon: capa remota. No inventar endpoints ni conexiones.

Si la petición es de análisis o documentación, hacer eso; no implementar sin permiso.

## Protocolo

- Un ID a la vez y un solo 🟡 global. Seguir la siguiente acción de `STATUS.md`; registrar si cambia.
- No renombrar IDs. Toda función prometida necesita ID y criterio verificable.
- No inventar pruebas. Lógica pura → tests; instalación, tiempos, wake lock, audio, gestos y móvil → dispositivo.
- Al cerrar o pausar: actualizar `STATUS.md` (estado, bitácora y una siguiente acción concreta). No dejar varios frentes abiertos.
- Revisar el diff (incluido staged) antes de editar. No deshacer trabajo ajeno, no limpiar datos del usuario y no commitear, publicar ni contratar servicios sin autorización.
- El dueño no mantiene checklists: el agente escribe; el dueño prueba y comenta. No inventar su evidencia.
- HTTPS es dependencia de la validación móvil, no del trabajo local.

## Contrato que no se pierde

- Una carta en foco con una alternativa asomada; sin dashboard durante el timer.
- Franjas de hasta 3, una abierta; 3 cambios por día; correcciones neutrales con confirmación y salida siempre disponible.
- Pausa persistente y una sola sesión activa. Cero no completa ni paga.
- Audio apagado al inicio; presión normal 1, techo 2; sin castigos; lenguaje llano; ayuda contextual; ES/EN.
- Local-first con Dexie. Neon/Drizzle solo en servidor y sin sync. Sin LLM ni analítica de terceros en el MVP.
- No ampliar a RC visibles, sync, cuentas, rachas, `.ics`, push, dashboards ni motor 2D sin decisión explícita.

## Implementación

- `app/` para rutas y layouts, `app/_components/` para UI no ruteable, `lib/` para dominio, selección y datos.
- Server Components por defecto; `'use client'` solo donde haga falta interacción o APIs del dispositivo. Nada de IndexedDB o `window` en SSR.
- Respetar `cacheComponents` y `partialPrefetching`; leer la guía antes de cambiar flags o añadir librerías.
- Tailwind v4 con tokens en variables y `@theme`; no agregar configuración v3.
- Eventos tipados con el vocabulario del dominio. Distinguir exposición, cambio, vida real, resultado parcial y hecho fuera de la app.
- Neon/Drizzle solo en servidor: `DATABASE_URL`, `RUNO_PASSCODE` y `RUNO_SESSION_SECRET` nunca en el cliente. Migraciones generadas, revisadas y aplicadas primero en desarrollo; no `push` a producción.
- Respetar los bloques gestionados por Next en este archivo.

## Verificación

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; producción con `npm run start`.
- Probar UI en navegador y PWA/offline sobre build de producción, no solo dev.
- Respetar `prefers-reduced-motion`; foco visible, contraste, etiquetas, zoom y una mano.
- Registrar comando, resultado y límite. Compilar no prueba el flujo.

## Archivos

| Archivo | Uso |
|---|---|
| `plan.md` | Resumen vigente del producto y el comportamiento |
| `STATUS.md` | Estado real, evidencia, pendientes y siguiente acción |
| `AGENTS.md` | Estas reglas |
| `docs/archive/2026-11-01/` | Especificación e historial completos; histórico, no editar |
| `first-app-context.md` | Contexto original; histórico, no editar |
