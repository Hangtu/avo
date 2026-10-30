<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Runo — reglas del proyecto

App personal de hábitos, organización y timer, con presión configurable y recompensas en minutos de ocio. Un solo usuario, español de México. El objetivo es ayudar a actuar y volver a la vida, no maximizar adicción o tiempo dentro de la app.

**Alcance vigente:** `plan.md` v1.1, con las aclaraciones aprobadas por el dueño. No recuperar reglas obsoletas del historial de conversación.

## 1. Lectura y fuentes de verdad

Al iniciar una sesión:
1. **`STATUS.md`**: siguiente acción, IDs, evidencia y pendientes.
2. **`plan.md`**: al menos §2 (principios), §16 (decisiones), §17 (alcance/IDs) y las secciones de comportamiento/datos relevantes al ID.
3. **`node_modules/next/dist/docs/`**: guía pertinente antes de usar o cambiar una API de Next. La documentación debe coincidir con la versión instalada.

Si la petición es análisis o documentación, hacer eso; no interpretar automáticamente una conversación como permiso para implementar, desplegar o ampliar el alcance.

| Archivo | Responsabilidad |
|---|---|
| `plan.md` | Qué se construye y cómo debe comportarse; decisiones del producto |
| `STATUS.md` | Qué existe y se probó realmente; única lista de aceptación, siguiente acción y bitácora |
| `AGENTS.md` | Reglas de trabajo y recordatorios para no violar el contrato |
| `first-app-context.md` | Contexto original del dueño; histórico, no editar |

Si estos documentos discrepan, no escoger la regla más cómoda: comprobar la última decisión explícita, señalar el conflicto y sincronizar los afectados.

## 2. Protocolo de trabajo y handoff

- Un ID a la vez, **un solo 🟡 global**. Seguir la siguiente acción de `STATUS.md`; si una dependencia obliga a cambiarla, registrar el motivo.
- Los IDs no se renombran. Una función prometida en el plan debe tener un ID y un criterio verificable.
- No confundir ⬜ pendiente, 🟡 en curso, 🧪 implementado con prueba técnica pero pendiente móvil y ✅ verificado según su criterio.
- Funciones puras pueden verificarse con tests automatizados. Instalación, tiempos percibidos, wake lock, gestos y soporte móvil requieren evidencia del dispositivo. Nunca inventar una prueba del dueño.
- Registrar comandos/resultados, límites y archivos relevantes. Compilar no prueba por sí solo el flujo, la persistencia o las alarmas.
- Al cerrar o detenerse: actualizar fila, contadores, bitácora y **una siguiente acción concreta**. Si hay bloqueo, dejar su causa y salida; no ocultarlo ni mantener cinco frentes abiertos.
- Una aclaración aprobada se integra en los documentos afectados de inmediato. Los nuevos hallazgos van a `STATUS.md` antes de asumir un cambio de producto.
- El dueño no mantiene los checklists. El agente escribe; el dueño prueba con pasos breves y comenta en lenguaje normal.
- Revisar el diff existente, incluido lo staged, antes de editar. No deshacer trabajo ajeno, limpiar datos de usuario, commitear, publicar ni contratar servicios sin autorización.
- **HTTPS es una dependencia de validación móvil, no una condición para escribir código local.** Mantener A0 visible sin frenar trabajo local verificable.

## 3. Contrato del producto que no se debe perder

1. **Una carta en foco**, no un dashboard durante el timer. Pausa, salida y mute siguen accesibles; configuración y monedero son vistas secundarias permitidas.
2. **Franjas de hasta tres cartas, no tres tareas por día.** Varias franjas por día; solo una abierta. No se pasa a la siguiente hasta resolver la actual (completada, ya la hice, no aplica o cambiada). Menos de tres si no hay elegibles; no rellenar con duplicados.
3. **Tres «Otra» por fecha local**, compartidos entre franjas. Elegir entre las cartas visibles es libre y no consume cambios. «Otra» reemplaza una carta por otra que no está en la franja. Al agotarse, desaparece; no hay consumo si no existe alternativa.
4. **Correcciones neutrales:** «Ya la hice», «Hoy no aplica», vida real, pausa y edición no consumen cambios ni prueban procrastinación. Nunca bloquear toda salida por agotar cambios. En una sesión activa no hay «dejar pendiente»: pausa, no aplica o terminar por hoy.
5. **Editor cualquier día:** agregar, editar y archivar con duración, días, franja/hora opcionales, prioridad y escalón. No depende del Parte ni de llegar al domingo.
6. **Pausa explícita persistente:** congela el restante; volver no reanuda solo. Cerrar sin pausar deja transcurrir el reloj. Una pausa sigue bloqueando el inicio de otra tarea. Cero no completa ni paga: pide confirmación. No hay «Casi» ni «Dejar pendiente» en sesión activa.
7. **Escalón opcional, no universal:** primer paso concreto y parcial. Preparar materiales no completa higiene, suplementación o cuidados. No inventar dosis ni frecuencias médicas.
8. **Horarios pertinentes:** filtrar por días/franjas antes de ordenar por prioridad. Una ancla visible pausa y guarda la sesión anterior, se presenta una vez y no inicia un timer ni mueve citas automáticamente.
9. **Audio apagado al inicio**, mute persistente también para campanas/anclas; siempre feedback visual. Vibración es mejora opcional, no requisito universal.
10. **Presión con control:** techo inicial 2, tono efectivo normal 1. En MVP, 5–10 frases locales sin LLM; duro solo solicitado o con motivo explícito. No escalar por cambios, ausencias o vida real. Nivel 3/Elian reservados para después, sin descalificaciones personales o familiares.
11. **Sin rachas punitivas.** No implementar castigos y después construir una función para perdonarlos. Progreso posterior acumulativo; el MVP no necesita desbloqueos.
12. **Rendimiento:** objetivo 2 s, aceptación <5 s en condiciones de `plan.md` §12. Registrar arranque/reapertura, no prometer cero latencia o medir solo en dev.

## 4. Economía: una sola interpretación

- **Primer corte sin RC:** la recompensa es el descanso gratuito de 10 min. C1/C2 (ledger, saldo y canje) se implementan en la segunda capa, antes de la validación completa del MVP. No mostrar saldo ni prometer RC antes de esa capa.
- **1 RC representa 1 minuto de ocio**, no permiso para cubrir necesidades básicas ni una restricción sobre otras apps.
- En la segunda capa: recompensa completa fija = minutos configurados; escalón fijo = sus minutos. La prioridad no multiplica RC.
- Se muestra y congela el acuerdo al iniciar; el primer asalto, incluso un escalón, fija el tope completo de la ocurrencia. Editar la plantilla después no aumenta ese tope. Tardar más o extender el timer no paga más; terminar antes puede confirmar la recompensa acordada.
- Tope por ocurrencia: premio de la versión completa. Si se pagó 1 RC por el paso corto de una tarea de 15, al completarla quedan 14; no 15 adicionales.
- Cero en el timer, abandono, pausa y «Ya la hice» no pagan por sí solos. Cerrar el día conserva lo ganado y no paga pendientes.
- Créditos/débitos idempotentes y transaccionales; doble toque, reintentos o recargas no duplican movimientos. El ledger es la fuente del saldo.
- Canje manual de enteros positivos hasta el saldo. Sin deuda, préstamos, saldo negativo, multiplicadores ni catálogo obligatorio.

## 5. Contratos técnicos

| Tema | Regla |
|---|---|
| Stack | Next 16.4.3 / React 19.3 / TypeScript / Tailwind v4 ya existentes; no migrar por memoria o conveniencia |
| Datos | IndexedDB con Dexie, esquema versionado, local-first; sin login, backend de datos ni sync en MVP |
| Dominio | Task, Occurrence, Day, Hand, Session, Event, Ledger y Settings; responsabilidades en `plan.md` §13 |
| Unicidad | Una ocurrencia por tarea/fecha local en MVP; no repetir realizadas para llenar franjas. Una sola sesión activa (corriendo o pausada) |
| Timer | Reloj de pared por tramos y restante persistente. Un intervalo refresca UI, no acumula el tiempo como fuente de verdad |
| Pausa y fecha | Guardar restante/tiempo acumulado; no contar pausas. Cruzar medianoche no cambia la ocurrencia de la sesión ni duplica pagos |
| Motor | Función pura con reloj/fecha/semilla explícitos; sin DB, React o reloj oculto |
| Recompensas | Snapshot del acuerdo y tope por ocurrencia; persistir resultado/evento/ledger de forma atómica |
| Offline | Service worker + assets cacheados para arranque en frío; IndexedDB/manifest/`useOffline` solos no bastan |
| Plataforma | Wake lock y vibración con detección y fallback visual. No garantizar avisos cuando la app está cerrada |
| Calendario | `.ics` fuera del MVP y sujeto a importación/permisos; nunca prometer takeover o alarma infalible |
| Privacidad | No enviar eventos/metas personales a LLM o analítica de terceros en MVP. Datos locales no equivalen a backup |

### Next y organización

- `app/` para rutas/layouts, `app/_components/` para UI no ruteable y `lib/` para dominio, DB, selección y lógica.
- Server Components por defecto, límites `'use client'` donde se necesiten interacción/APIs de dispositivo. No leer IndexedDB/`window` durante SSR ni generar fechas locales que rompan hidratación.
- La configuración ya habilita `cacheComponents` y `partialPrefetching`. Mantener una base prerenderizable y consultar la guía pertinente antes de introducir APIs de petición, cambiar flags o añadir librerías.
- Tailwind v4 usa el loader `@tailwindcss/turbopack` configurado. Tokens con variables/`@theme`, no una configuración v3 añadida por costumbre.
- Eventos tipados con vocabulario canónico de `plan.md` §9. Distinguir exposición, cambio, vida real, resultado parcial y realizado fuera de la app.
- Respetar los bloques gestionados por Next en este archivo. Las reglas de Runo permanecen fuera de sus marcadores.

## 6. Verificación y límites de evidencia

- Probar dominio/DB/motor/economía con casos normales, límites, reintentos, sesiones pausadas, fecha local, doble confirmación, bloqueo de tarea/franja y descanso.
- Verificación disponible desde A7: `npm test` (Vitest run), `npm run test:watch`, `npm run typecheck` (Next typegen + TypeScript), `npm run lint` y `npm run build`; producción con `npm run start`. El setup de tests usa fake-indexeddb únicamente en Node, nunca en producción.
- Verificar UI en navegador cuando exista; usar el servidor de desarrollo ya activo si lo hay, no matar procesos sin motivo. El bloqueo es de Runo, no del teléfono: no prometer que impide usar otras apps.
- Probar instalación/offline también en **build de producción**, no solo en `next dev`. Registrar origen HTTPS estable porque los datos se aíslan por origen.
- Aplicar `prefers-reduced-motion` también al timer/Vigía, foco visible, contraste medido, etiquetas, zoom y controles de una mano.
- La investigación de accesibilidad sigue pendiente hasta C3. Fuentes/tamaños son decisiones a probar, no evidencia clínica sobre TDAH. No presentar hipótesis de memoria, motivación o crianza como diagnósticos.
- No ampliar por iniciativa propia a LLM, Dossier, nivel 3, Jefe, Parte, ambientes, rachas, `.ics`/push, ventanas protegidas, temporizador de canje, múltiples ocurrencias diarias, cuentas/sync, dashboards o motor 2D.
- La lista de aceptación vive **solo en `STATUS.md`**. La semana de prueba viene después de liberar, permite interrupciones y no exige una racha perfecta.
