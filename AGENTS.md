<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Runo — reglas de trabajo

App local-first de hábitos, pendientes y timer (ES/EN, español de México). Busca ayudar a actuar y volver a la vida.

## Fuentes y flujo

- `STATUS.md`: estado real, evidencia y siguiente acción; `plan.md`: contrato y criterios; `docs/cloud/`: decisiones técnicas.
- Un solo ID 🟡 global. No renombrar IDs. Al pausar/cerrar, actualizar `STATUS.md` con estado, bitácora breve y siguiente acción concreta.
- Preservar trabajo ajeno; revisar diff/staged antes de editar. No limpiar datos ni ejecutar migraciones, seed, operaciones remotas, commit, deploy o contratación sin autorización específica.
- No inventar evidencia: tests no prueban Neon, OAuth, navegador ni móvil. El dueño revisa UI/dispositivo; registrar límites.

## Contrato

- Una carta en foco y una alternativa; sin dashboard durante timer. Franjas de hasta 3, una abierta, tres cambios al día y correcciones neutrales confirmables.
- Pausa persistente; una sola sesión en el espacio local; cero no completa ni paga. Audio apagado, presión normal 1/techo 2, sin castigos.
- Invitado Dexie sin cuenta/red. Cuenta opcional; datos personales aislados. Solo persistir definiciones/preferencias duraderas y finalización de pendientes de una vez; timer, sesiones/eventos y resultados de rutinas recurrentes quedan locales.
- Google/Facebook no se fusionan por texto de email; exigir prueba de control. Sin LLM ni analítica de terceros.

## Implementación y verificación

- `app/` rutas/UI, `lib/` dominio/datos; Server Components por defecto. Nada de IndexedDB/`window` en SSR; client components solo cuando hagan falta.
- Neon/Drizzle y secretos solo en servidor. Mantener Cache Components/Partial Prefetching; leer guía instalada antes de cambiar APIs/flags o dependencias de Next. Tailwind v4.
- Lógica pura → tests; ejecutar `npm test`, `npm run typecheck`, `npm run lint`, `npm run db:check`, `npm run build`. Probar PWA/offline en build de producción y dispositivo real.
