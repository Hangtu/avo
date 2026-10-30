# STATUS — Runo

> **Fuente única del estado de ejecución.** La especificación está en [`plan.md`](./plan.md) y las reglas para agentes en [`AGENTS.md`](./AGENTS.md).
> Los documentos aprobados no equivalen a código construido ni a pruebas superadas.

**Última actualización:** 2026-10-30
**Alcance vigente:** `plan.md` v1.2 — franjas de hasta tres, tres cambios diarios, bloqueo de foco con salidas explícitas y descanso gratuito; Runo Coins pasa a la segunda capa.
**Fase:** MVP / Fase 1 — primer corte por franjas. B1 ✅, B2 ✅, B3 🧪, B4 ✅, B5 ✅, B8 ✅, B9 ✅, B10 ✅, B11 ✅ y B12 ✅; restauración B6 siguiente; instalación pendiente.
**Bloque activo:** B — El bucle. **Ítem en curso:** ninguno; siguiente B6.

## Siguiente acción

**B6 · Restauración y fecha local.**

Verificar y completar que reabrir restaura corriendo/pausada/confirmación; que una sesión que cruza medianoche conserva su ocurrencia y no duplica tareas ni créditos; y que el día/lista siguiente no arrastra pendientes como duplicados. Cubrir también la restauración de una sesión `short` y su continuación.

**Después:** B7 navegación mínima, C1/C2 (RC) y A1/A2 para el teléfono.

**Completados en este avance:** A7, A3–A6, B1, B2, B3, B4, B5, B8, B9, B10, B11 y B12. 158 tests pasan en entorno local, UTC y America/Mexico_City; typecheck, lint y build pasan. B1/B2/B3/B4/B5/B8/B9/B10/B11/B12 se verificaron en Chrome headless sobre build de producción; el wake lock real sigue pendiente de dispositivo. La dirección visual minimalista y Lexend ya están aplicadas; la medición formal de contraste sigue en C3. No hay criterio G01–G16 dado por superado.

**Pendiente externo A0:** elegir un origen HTTPS estable y probar en el teléfono. Vercel es una opción, no una decisión ejecutada. No se ha desplegado ni confirmado una URL. Esto es necesario para validar instalación/offline en el móvil, **pero no bloquea desarrollar y probar en local**. No contratar ni publicar servicios sin autorización.

## Estado de un vistazo

| Bloque | Ítems | Implementados con evidencia técnica (🧪 o ✅) | Verificados según criterio (✅) | Estado |
|---|---|---|---|---|
| **A · Cimiento** | 8 | 5 | 5 | Datos/lógica verificados técnicamente; A0–A2 pendientes |
| **B · El bucle** | 12 | 10 | 9 | B1 ✅, B2 ✅, B3 🧪 (wake lock móvil), B4 ✅, B5 ✅, B8 ✅, B9 ✅, B10 ✅, B11 ✅, B12 ✅; B6 siguiente |
| **C · Economía y piel** | 6 | 0 | 0 | C1/C2 en segunda capa; resto pendiente |
| **D · Ancla y pulido** | 4 | 0 | 0 | Pendiente |
| **Total** | **30** | **15** | **14** | 15 ítems con evidencia; 14 verificados según criterio |

**Validación de salida:** 0 de 16 criterios. **Prueba de uso:** no iniciada.

## Reglas de seguimiento

| Estado | Significado |
|---|---|
| ⬜ | No iniciado |
| 🟡 | En curso; trabajo aún incompleto |
| 🧪 | Implementado y con verificación técnica registrada; falta validación manual/móvil aplicable |
| ✅ | Cumple su criterio con evidencia adecuada: automatizada para lógica pura, móvil cuando depende del dispositivo |
| ⛔ | Bloqueado; registrar dependencia o decisión y cómo desbloquear |
| ➖ | Fuera del MVP; no se incluye en el total de ítems |

1. **Un solo 🟡 en todo el proyecto.** Puede haber varios pendientes de prueba móvil (🧪), pero no se presentan como validados.
2. **Sin evidencia no hay 🧪 ni ✅.** Registrar comando, resultado, comportamiento y, si aplica, dispositivo/navegador. Una compilación no prueba todo el producto.
3. **No falsear pruebas del teléfono.** Si el agente no puede hacerlas, anotar «pendiente del dueño» con pasos concretos. Las funciones puras no necesitan una prueba móvil ficticia para cerrarse.
4. **IDs estables.** Se conservan A0–A6, B1–B7, C1–C5 y D1–D4 del plan anterior; se añaden A7, B8–B12 y C6 para cubrir huecos. No renombrarlos ni reutilizarlos.
5. Al terminar o detener un ítem: actualizar fila, contadores, siguiente acción y bitácora. Si queda bloqueado, explicar por qué.
6. Una corrección explícitamente aprobada se integra de inmediato en los tres documentos afectados. Un hallazgo sin decisión se registra en «Descubrimientos y decisiones pendientes»; no se implementa en silencio como nuevo alcance.
7. Probar lógica y persistencia en cada cambio relevante, comprobar el flujo en navegador cuando exista UI y reservar la validación móvil para lo que depende del hardware/plataforma. No esperar al final para probar todo.

### Ritual de sesión

El agente mantiene este archivo. El dueño prueba y comenta en lenguaje normal; no tiene que escribir reportes ni mover checkboxes.

| Momento | Acción del agente |
|---|---|
| Inicio | Leer este archivo, el alcance aplicable de `plan.md` y las guías de Next necesarias; confirmar un ID |
| Trabajo | Implementar ese ID y verificar sus criterios; no abrir otros frentes |
| Prueba móvil pendiente | Dar una URL y pasos breves reales cuando estén disponibles; no afirmar que se ejecutaron |
| Cierre | Registrar evidencia o limitación y dejar una única siguiente acción |

Preguntas breves de uso, cuando corresponda: **¿abre rápido? ¿te ayudó a arrancar? ¿volverías a abrirla?**

## Bloque A — Cimiento

**Dependencias:** empezar por A7 y A3; A4–A6 usan esos contratos. A1–A2 se validan en móvil cuando A0 esté resuelto. No es obligatorio ejecutar los IDs en orden numérico.

| ID | Qué | Terminado cuando… | Estado | Evidencia |
|---|---|---|---|---|
| **A0** | Origen HTTPS estable para el teléfono | Se registra la URL autorizada y se abre desde el dispositivo objetivo; el origen permanece estable entre versiones | ⬜ | Sin URL ni despliegue confirmado |
| **A1** | PWA instalable | Manifest/iconos correctos; instalada desde A0, abre standalone y con identidad Runo en el teléfono probado | ⬜ | — |
| **A2** | Shell y assets offline | Tras primera carga/preparación, un arranque en frío en modo avión abre el bucle y sus recursos; actualización no borra la DB | ⬜ | — |
| **A3** | Contratos + IndexedDB | Existen Task, Occurrence, Day, Hand, Session, Event, Ledger y Settings; esquema versionado; persistencia, unicidad tarea/fecha, snapshots y escrituras atómicas probados | ✅ | Dexie 4.4.7; esquema v2 y repositorio. Suite total 65/65, typecheck/lint exit 0. Tests con fake-indexeddb: reapertura, índices únicos, snapshots, concurrencia entre conexiones y rollback. Persistencia móvil pendiente en G03. |
| **A4** | Semilla del Mazo | Se crean diez plantillas una vez; tres cuidados/suplementos quedan sin programación hasta configurar; reinicios/actualizaciones no duplican ni pisan ediciones | ✅ | `lib/db/seed.ts`; 7 tests específicos, 72/72 totales. Inicialización concurrente, reapertura y preservación de ediciones/archivos/preferencias probadas con fake-indexeddb. Lint/typecheck pasan. |
| **A5** | Registro de eventos | Eventos canónicos de §9 con exposición, contexto y motivos diferenciados; reintentos no duplican resultados ni confunden vida real con cambio voluntario | ✅ | `lib/db/events.ts`; suite 104/104. 18 tipos canónicos, reintentos concurrentes, contextos JSON y rechazo de conflicto/ciclos probados. CRUD e inicio registran dentro de su transacción. Las acciones futuras de UI deben usar esta API. |
| **A6** | Motor puro de elegibilidad y selección | Tests con reloj/semilla cubren días, franjas, anclas aplicables, prioridad y desempate; excluye realizadas/no aplicables y no rellena con duplicados | ✅ | `lib/domain/selection.ts`; suite 128/128, repetida en UTC y America/Mexico_City. Días/proyectos, franjas [inicio,fin), hora fija, terminales/parciales, categorías, semilla estable y deduplicación probados. Repositorio rechaza inicios nuevos fuera de horario. |
| **A7** | Baseline y pruebas automatizadas | Resultados reales de lint/build registrados, runner y comando de tests disponibles y ejecutables; errores preexistentes identificados sin confundirlos con pruebas de features | ✅ | Baseline `npm run lint` y `npm run build`: exit 0. Vitest 4.1.12: 17/17 tests de calendario; `npm run typecheck` y lint exit 0. Scripts y guía en README. |

**A6:** entradas explícitas de tareas/ocurrencias, fecha/hora y semilla; no usa React, DB o `Date.now()` oculto. Las tareas con horarios futuros no se consumen antes por tener prioridad alta.

## Bloque B — El bucle

| ID | Qué | Terminado cuando… | Estado | Evidencia |
|---|---|---|---|---|
| **B1** | Apertura y franja actual | Si hay sesión activa, se abre primero; si no, propone hasta tres elegibles de la franja actual, sin rellenar ni crear franjas vacías; muestra pendientes del día y no lee IndexedDB durante SSR | ✅ | `app/_components/runo-home.tsx` + `lib/domain/franja.ts`; 133/133 tests. Chrome headless sobre `npm run build` + `start`: a las 08:00 America/Mexico_City mostró 3 (café, cepillo, desayuno); a las 12:09, 2 elegibles y 5 pendientes sin rellenar; con las ocurrencias cerradas mostró el estado vacío sin inventar tarjetas. Sesión pausada sintética: precedencia mostrada. Sin dispositivo. |
| **B2** | Tirada y tres cambios diarios | Tres «Otra» por fecha local, compartidos entre franjas y persistentes; elegir entre las visibles es libre; sin alternativa no se gasta; al agotarse desaparece, pero las correcciones siguen accesibles | ✅ | `swapFranjaTask` + `Day.swapsUsed` + `Hand.deferredOccurrenceIds`; 158/158 tests. Chrome headless producción: 3 botones «Otra»; café cambiado por baño; bajó a 2 cambios; sin alternativa el botón desapareció; al cerrar la franja, el café diferido volvió en la franja 2. `swapped` una vez, sin ledger. |
| **B3** | Timer, 3-2-1 y pantalla encendida | Cuenta 3-2-1 cancelable; reloj de pared sin deriva por intervalos; wake lock intentado y recuperado al volver donde se soporte; rechazo no rompe el timer; vencimiento va a confirmación | 🧪 | `session-view.tsx`, `use-wake-lock.ts` y `expireSession`. 158/158 tests, typecheck/lint/build pasan. Chrome headless producción: «Empezar» mostró 3-2-1 cancelable; café 05:00; al avanzar el reloj de pared venció y persistió «Tiempo cumplido» tras recargar. El rechazo/ausencia de wake lock no rompió el timer. Falta probar wake lock y pantalla encendida en dispositivo real. |
| **B4** | Resultado y correcciones | «Sí, terminé» y «No terminé» producen estados/eventos distintos; «No terminé» deja la tarjeta en foco con reintentar/no aplica; no hay «Casi»; no se completa por tiempo agotado ni se exigen formularios | ✅ | `completeSession`, `markOccurrenceNotApplicable` y `retrySession`; 158/158 tests. Chrome headless producción: café completado antes de tiempo y fuera de la franja; cepillo vence, «No terminé» → «Reintentar 5 min» → 05:00 → segundo vencimiento → «No aplica» → fuera de la franja; desayuno vence y «Sí, terminé» → fuera. Sin RC/ledger. «Terminar por hoy» se agregó en B5. |
| **B5** | Cierre de franja / terminar por hoy | No se pasa a la siguiente franja hasta resolver las cartas actuales; se pueden hacer más de tres tareas en el día; cerrar conserva lo ganado sin pagar pendientes ni perder progreso | ✅ | `ensureFranja`/`closeDay`, `Hand` persistente y `Day.closedAt`. 158/158 tests. Chrome headless producción: tras completar una carta, la franja 1 conservó las otras dos sin rellenar; al resolver las tres apareció la franja 2; «Terminar por hoy» mostró día cerrado y sobrevivió recarga. Con sesión abierta, la abandonó y conservó el tiempo como parcial; sin ledger. |
| **B6** | Restauración y fecha local | Reabrir restaura corriendo/pausada/confirmación según corresponda; sesión que cruza medianoche conserva su ocurrencia y no duplica tareas ni créditos | ⬜ | — |
| **B7** | Flujo y navegación mínimos | Bucle sin callejones; foco de una carta durante el trabajo; configuración accesible sin un dashboard obligatorio ni capas de modales | ⬜ | — |
| **B8** | Editor básico de tareas | Agregar, editar y archivar cualquier día; duración, días, franja/hora, prioridad y escalón validados; Proyecto A lunes/B martes funciona; no altera historial o sesión activa | ✅ | `task-editor.tsx` + repositorio existente. 158/158 tests. Chrome headless producción: «Tareas» abre el editor; creó «Tomar creatina» Lun/Mar 2 min Alta; la editó con franja 06:00–12:00, hora fija 08:00 y paso «Servir el agua» 1 min; se guardó; se archivó y apareció en Archivadas; al volver, la franja siguió igual. La tarea persistió con días, ventana, hora, escalón y `archivedAt`. Editar no toca el snapshot de una sesión (prueba de repositorio). |
| **B9** | Escalón y progreso parcial | Paso corto opcional y concreto; completarlo no declara completa la tarea; permite continuar el resto y no permite cobrar el mismo paso repetidamente | ✅ | `startSession`/`completeSession` con variante short, `shortStepCompleted` y `remainingMin`. 158/158 tests. Chrome headless: cepillo ofreció «Paso 1 min»; el timer mostró «Preparar el cepillo» 01:00; al completarlo la tarea quedó parcial, con «2 min restantes · paso hecho»; «Continuar 2 min» abrió 02:00; completar la tarea ofreció descanso. Datos: shortStepCompleted true, dos sesiones completed (short/full), sin ledger; el paso no se volvió a ofrecer. |
| **B10** | Pausa / reanudación explícitas | Pausa guarda restante, incluida vida real; una pausada sigue bloqueando otra tarea; cerrar/reabrir mantiene la pausa; continuar retoma el restante exacto sin contar el tiempo pausado | ✅ | `pauseSession`/`resumeSession` y UI con «Pausar»/«El bebé». 158/158 tests. Chrome headless producción: café pausado en 05:00, 10 min después y tras recargar seguía en 05:00; «Continuar» retomó 05:00 y un minuto después mostró 04:00; «El bebé» registró `paused` + `life_real`. Una pausada rechaza `startSession` de otra tarea. |
| **B11** | Descanso gratuito | Tras completar, ofrece 10 min gratis y saltable; no paga RC, no bloquea la siguiente tarea, no se autoinicia y termina si empieza otra tarea | ✅ | `break-card.tsx`; UI efímera, sin sesión ni ledger. Chrome headless producción: al completar apareció la oferta; el descanso no inició solo; al empezar corrió 10:00; al avanzar el reloj terminó sin iniciar otra tarea; la franja siguió visible y «Empezar» funcionó durante el descanso, terminándolo. 158/158 tests, typecheck/lint/build pasan. |
| **B12** | Bloqueo de tarea y franja | Con sesión activa no se inicia otra tarea; pausar no libera; «no aplica» o «terminar por hoy» son las salidas explícitas; no se pasa a la siguiente franja con pendientes | ✅ | `startSession` rechaza mientras hay sesión corriendo, pausada o esperando confirmación; `ensureFranja` mantiene la franja abierta. 158/158 tests. Chrome headless producción: corriendo, pausada y esperando confirmación no ofrecieron «Empezar»; «No aplica» devolvió la franja. La franja sin relleno ya se verificó en B5. |

**B3/B6/B10:** cerrar sin pausar no equivale a pausar. No se infiere distracción de la visibilidad. Si el tiempo ya venció, se restaura en confirmación; si se deja parcial, queda pendiente y puede continuarse. Si el restante es cero, «Reintentar 5 min» añade un tramo sin nuevo premio. Una sesión pausada sigue bloqueando el inicio de otra tarea.

**B9/C1:** la prueba conjunta de 1 RC por el primer paso y 14 al completar una tarea de 15 queda para la segunda capa; el primer corte no muestra RC.

## Bloque C — Economía y piel

**C1/C2 son la segunda capa:** se implementan después del bucle por franjas y antes de la validación completa del MVP. El primer corte no muestra saldo ni promete RC; la recompensa es el descanso gratuito B11.

| ID | Qué | Terminado cuando… | Estado | Evidencia |
|---|---|---|---|---|
| **C1** | Ledger y ganancia fija | RC enteros, premio visible y tope completo fijados desde el primer asalto; editar después no los aumenta; diferencia tras escalón; doble confirmación/reintento sin doble crédito; saldo durable | ⬜ | Segunda capa; no bloquea el primer corte |
| **C2** | Monedero y canje manual | Se muestran tiempo y RC; débito entero positivo hasta saldo disponible, confirmación idempotente; no deuda, préstamos ni bloqueo del descanso | ⬜ | Segunda capa; no bloquea el primer corte |
| **C3** | El Reloj + accesibilidad contrastada | Tokens y lectura probados, contraste medido, fuentes de accesibilidad realmente consultadas anotadas en `plan.md` §10; no se afirma validación clínica de una fuente | ⬜ | — |
| **C4** | Vigía y movimiento reducido | Avance sincronizado con timer/pausa; modo reducido respeta la preferencia también durante el asalto y comunica progreso sin depender de movimiento/color | ⬜ | — |
| **C5** | Audio opt-in | Ruido marrón/tic-tac opcionales; campana también respeta mute; preferencia persistente y arranque sin sonido no solicitado; falla de audio tiene fallback visual | ⬜ | — |
| **C6** | Voz local y presión configurable | Banco de 5–10 frases sin LLM; tono normal 1 y techo inicial 2; duro solo por petición/motivo explícito; silencio disponible y cambios/vida real no causan escalada | ⬜ | — |

**Sin multiplicadores:** en la segunda capa, la versión completa ofrece RC iguales a sus minutos configurados; un escalón cobra sus minutos y se descuenta del tope de la ocurrencia. Tardar más no paga más; el timer no paga por sí mismo. En el primer corte no se muestran RC.

## Bloque D — Ancla y pulido

| ID | Qué | Terminado cuando… | Estado | Evidencia |
|---|---|---|---|---|
| **D1** | Ancla ligera visible | Se presenta una vez por ocurrencia al llegar su hora o volver dentro de su franja; antes pausa y guarda otra sesión; no inicia sola, no consume cambios ni mueve citas; lo vencido no se fuerza como vigente | ⬜ | — |
| **D2** | Feedback y fallbacks de plataforma | Feedback visual siempre; vibración solo donde funcione, sin fallar en iPhone si no existe; no se promete sonido o wake lock con la app cerrada | ⬜ | — |
| **D3** | Una mano y preferencias visuales | Controles alcanzables y ≥44 px, zoom 200 % funcional, tema cálido automático/manual persistente, foco/etiquetas legibles en el dispositivo objetivo | ⬜ | — |
| **D4** | Validación de salida | Se verifican y documentan los 16 criterios siguientes; se conocen las limitaciones y se deja lista la semana de prueba, sin afirmar utilidad ya validada | ⬜ | — |

**Límite de D1:** el MVP no garantiza avisos con el teléfono bloqueado o la app cerrada. `.ics` es fase 2 y depende del calendario/permisos; no es un takeover del sistema ni una alarma garantizada.

## Validación de salida del MVP

**Lista única de aceptación.** Antes de liberar, los ítems funcionales anteriores deben cumplir sus criterios técnicos y las pruebas móviles aplicables. D4 se cierra al registrar estos resultados, no por el número de checkboxes de implementación.

Para cada prueba registrar en su evidencia: versión/commit si existe, dispositivo y navegador, pasos, resultado y limitación. **No afirmar iOS y Android probados si solo se probó uno.** Los ítems puramente técnicos se pueden cerrar con tests; los comportamientos de plataforma necesitan su prueba real.

**Corte 1 usable en local:** G02, G04–G08 y G11–G16. G01/G03 requieren A0–A2 (origen, instalación y offline); G09/G10 se cierran con C1/C2 en la segunda capa. La lista completa se cierra antes de liberar.

- [ ] **G01 · Instalación:** origen HTTPS estable autorizado, icono Runo y apertura standalone en el teléfono objetivo. (A0, A1)
- [ ] **G02 · Entrada:** estado utilizable en <5 s tras preparación inicial, con objetivo de 2 s; registrar arranque en frío y reapertura/restauración por separado. (B1, B6)
- [ ] **G03 · Offline/persistencia:** modo avión con arranque en frío, lectura/escritura local y sesión/saldo conservados; verificar en build de producción. (A2, A3)
- [ ] **G04 · Configuración:** semilla no duplicada, editor accesible cualquier día, proyectos por días y filtros de franja correctos; archivar no borra historial. (A4, A6, B8)
- [ ] **G05 · Franjas y agencia:** franjas de hasta tres; no se pasa a la siguiente hasta resolver la actual; tres cambios totales por día; elegir dentro de la franja es libre; «Ya la hice», «No aplica», vida real y salida siguen disponibles. (B1, B2, B5, B7)
- [ ] **G06 · Timer/resultados:** iniciar con 3-2-1, terminar antes y llegar a cero funcionan; cero pide confirmación sin pagar ni completar; «No terminé» deja la tarjeta en foco y no inicia otra tarea. (B3, B4, B12)
- [ ] **G07 · Pausa/retorno:** vida real congela tiempo, volver no reanuda solo; una pausa sigue bloqueando otra tarea; cerrar sin pausar deja correr; medianoche no pierde la sesión ni duplica ocurrencias. (B6, B10, B12)
- [ ] **G08 · Escalones:** primer paso deja la tarea parcial, retoma el resto y no falsea como completos cuidados/higiene por preparar materiales. (B9)
- [ ] **G09 · Créditos:** premio fijo, ejemplo 1+14=15, doble toque/reapertura sin doble pago y cerrar el día no descuenta ni paga pendientes. (C1, B5)
- [ ] **G10 · Canje:** minutos enteros válidos, débito único y saldo no negativo; cancelar no descuenta. (C2)
- [ ] **G11 · Horario urgente:** presenta una vez con app visible, pausa/guarda antes de interrumpir, respeta franja y permite volver; ninguna cita se mueve sin decisión del usuario. (D1)
- [ ] **G12 · Silencio y soporte:** audio inicialmente apagado, mute persistente también para avisos y feedback visual cuando audio/vibración/wake lock no estén disponibles. (C5, D2)
- [ ] **G13 · Accesibilidad:** contraste medido, tamaños/zoom/foco/etiquetas/una mano y movimiento reducido también en el timer; preferencias de tema respetadas y fuentes consultadas documentadas. (C3, C4, D3)
- [ ] **G14 · Acompañamiento y registro:** frases locales controlables sin IA ni culpa; eventos separan cambios, realizados fuera, no aplica y vida real; no se envían esos datos a un LLM. (A5, C6)
- [ ] **G15 · Bloqueo y salidas:** con sesión activa no se inicia otra tarea; pausar no libera; «no aplica» y «terminar por hoy» funcionan; no se salta de franja con pendientes; el bloqueo no impide pausar ni cerrar el día. (B4, B5, B10, B12)
- [ ] **G16 · Descanso:** tras completar se ofrece 10 min gratis y saltable; no paga RC, no bloquea la siguiente tarea, no se autoinicia y termina si empieza otra. (B11)

### Prueba de uso posterior a la liberación

| Campo | Estado |
|---|---|
| Inicio de la semana de prueba | No iniciada |
| Observaciones del dueño | Pendientes |
| Ajustes a las hipótesis | Pendientes |
| Decisión de continuar con fase 2 | Pendiente de la prueba |

Una semana de observación, **no siete días perfectos como condición para no perder progreso**. Corregir errores durante la prueba. No mantener una racha punitiva ni pedir reportes diarios obligatorios.

## Última verificación técnica — 2026-10-30

| Comando | Resultado observado |
|---|---|
| `npm test` | 158/158 tests, 7 archivos |
| `TZ=UTC npm test` | 158/158 |
| `TZ=America/Mexico_City npm test` | 158/158 |
| `npm run typecheck` | Exit 0, tipos de Next y TypeScript |
| `npm run lint` | Exit 0, sin errores ni warnings |
| `npm run build` | Exit 0, compilación y prerender de la página nueva |
| Chrome headless / diseño | 390 px y 1280 px: franja y editor con Lexend, papel/tinta/bermellón, reglas finas y sin sombras; sin desbordes visibles. No es prueba en dispositivo. |
| `git diff --check` | Exit 0 |
| Chrome headless / build producción | B1/B2/B3/B4/B5/B8/B9/B10/B11/B12: franjas sin relleno, precedencia de sesión, 3-2-1 cancelable, café 05:00, vencimiento, «Sí, terminé» antes y al cero, «No terminé» → «Reintentar 5 min» → 05:00 y «No aplica», pausa 05:00 persistida 10 min y recarga, «El bebé» con `paused` + `life_real`, franja 1 sin relleno y franja 2 tras resolver las tres, «Terminar por hoy» persistente y cierre con sesión abierta; sin «Empezar» durante running/paused/awaiting y retorno a la franja tras «No aplica»; descanso ofrecido tras completar, 10:00, fin sin autoinicio y terminación al empezar otra tarea; «Otra» cambia una carta, descuenta el contador, se oculta sin alternativa y la tarea diferida vuelve en la franja siguiente; el editor crea, edita días/franja/hora/franja fija/escalón, archiva y persiste; el paso corto corre 01:00, deja la tarea parcial y «Continuar 2 min» retoma el resto, con descanso solo tras la tarea completa. Sin dispositivo real; wake lock no verificado. |
| Navegador / dispositivo / instalación | Navegador headless sí; dispositivo, PWA e instalación no |

Pruebas de DB con fake-indexeddb, no almacenamiento de un teléfono. Las protecciones de esquema/snapshots no equivalen a tener implementados el pago y canje de C1/C2. El servidor de producción se arrancó solo para la comprobación local y se detuvo después; no se publicó una URL.

## Bitácora

Más reciente arriba. Registrar cambios comprobables y decisiones, sin inventar implementación o pruebas.

| Fecha | ID | Qué pasó |
|---|---|---|
| 2026-10-30 | Diseño | Aprobadas las referencias minimalistas del dueño y Lexend como fuente base. Copiadas a `docs/design/references/`; `plan.md` §10 y §16 actualizados; tokens de papel/tinta/bermellón, foco, selección y Lexend vía `next/font`; shell, franja, timer, descanso y editor aplanados a reglas finas, sin sombras ni radios y con acciones tipográficas. 158/158 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless a 390/1280 px sin desbordes visibles; medición formal de contraste y prueba en dispositivo siguen en C3/D3. |
| 2026-10-30 | B9 | Escalón: la franja ofrece «Paso 1 min» cuando existe; `startSession`/`completeSession` usan la variante short, dejan la ocurrencia parcial con `shortStepCompleted`, calculan minutos restantes y permiten continuar el resto con el tiempo pendiente. El paso no se repite y no hay ledger. 158/158 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless: cepillo 01:00 → parcial 2 min restantes → «Continuar 2 min» 02:00 → tarea completa con descanso. B6 siguiente. |
| 2026-10-30 | B8 | Editor de tareas: lista activas/archivadas, alta, edición y archivo con días, duración, prioridad, franja, hora fija y escalón. La UI y el repositorio validan; editar no cambia snapshots de sesión y archivar conserva historial. 158/158 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless: creó «Tomar creatina» Lun/Mar, la editó con franja/hora/escalón, la archivó y la tarea persistió; volver al día mantuvo la franja. B9 siguiente. |
| 2026-10-30 | B2 | Cambios de franja: `swapFranjaTask` reemplaza una carta, incrementa `Day.swapsUsed` (máx. 3), agrega la original a `Hand.deferredOccurrenceIds` y registra `swapped`. Sin alternativa o con sesión activa no gasta. `ensureFranja` expone `swapsRemaining`/`canSwap`; la UI oculta «Otra» cuando no aplica. 158/158 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless: café→baño, contador 2, sin alternativa, café diferido volvió en franja 2. B8 siguiente. |
| 2026-10-30 | B11 | Descanso gratuito en `break-card.tsx`: oferta tras completar, sin autoinicio, 10:00, saltable, franja visible y `Empezar` activo durante el descanso; al iniciar una tarea el descanso termina. Sin sesión ni ledger. 158/158 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless: oferta, 10:00, fin a los 10 min, «Seguir» y terminación al iniciar tarea. B2 siguiente. |
| 2026-10-30 | B12 | Bloqueo consolidado: `startSession` rechaza otra tarea con sesión corriendo, pausada o esperando confirmación; la UI no muestra «Empezar» en esos estados; «No aplica» y «Terminar por hoy» son las salidas; la franja no se rellena (B5). 158/158 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless: running/paused/awaiting sin «Empezar»; «No aplica» devuelve la franja. B11 siguiente. |
| 2026-10-30 | B5 | Franja persistente en `Hand`: no se rellena al resolver una carta; al resolver las tres se cierra, emite `hand_closed` y crea la siguiente con ordinal nuevo. `closeDay` marca `Day.closedAt`, cierra la franja y abandona una sesión abierta conservando el tiempo como parcial, sin ledger. UI: «Terminar por hoy» en franja y sesión, vista de día cerrado. 158/158 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless: franja 1 → franja 2, cierre persistente y cierre con sesión abierta. B12 siguiente. |
| 2026-10-30 | B10 | Pausa/reanudación: `pauseSession` congela el restante, emite `paused` y `life_real` con «El bebé», y `resumeSession` retoma exactamente. `startSession` rechaza otra tarea mientras hay una sesión activa (incluida pausada). 143/143 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless: 05:00 pausado persistió 10 min y recarga; continuar retomó 05:00; un minuto después 04:00; eventos `paused`/`life_real` verificados. B5 siguiente. |
| 2026-10-30 | B4 | Resultado y correcciones: `completeSession` cierra sesión/ocurrencia sin RC; `markOccurrenceNotApplicable` resuelve sin fallo; `retrySession` añade 5 min con actionId idempotente y sin nuevo acuerdo. UI: «Terminé» antes de cero, «Sí, terminé» al cero, «No terminé» → reintentar/no aplica. 138/138 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless: las tres rutas resueltas desaparecen de la franja. Pausar/terminar por hoy quedan en B10/B5. |
| 2026-10-30 | B3 | Timer conectado a `startSession`: 3-2-1 cancelable, reloj de pared por `startedAt`/restante, wake lock con detección y liberación, y `expireSession` idempotente hacia confirmación. 133/133 tests en local, UTC y Mexico_City; typecheck/lint/build pasan. Chrome headless producción: cancelar 3-2-1 vuelve a la franja; café corre 05:00; avanzar el reloj de pared vence y el estado persiste tras recargar. Wake lock real pendiente de dispositivo; B4 siguiente. |
| 2026-10-30 | B1 + v1.2 | Aprobadas franjas de hasta 3, 3 cambios/día, bloqueo de tarea/franja, descanso gratuito, 3-2-1, RC en segunda capa y «Casi» fuera. `plan.md` y `AGENTS.md` actualizados; `STATUS.md` a 30 IDs y 16 criterios. B1 implementado con `runo-home.tsx` y `franja.ts`: 131/131 tests, typecheck/lint/build pasan; Chrome headless sobre build de producción mostró 3 tarjetas a las 08:00, 2 a las 12:09 y precedencia de sesión pausada. Sin dispositivo ni prueba de uso; siguiente B3. |
| 2026-10-30 | A6 | Motor puro y guardia de inicio por horario implementados. 128/128 tests en local, UTC y America/Mexico_City; typecheck, lint, build y diff-check pasan. Cierre de este avance con A7/A3–A6 verificados técnicamente; siguiente A1. Sin interfaz o validación móvil todavía. |
| 2026-10-30 | A5 | Registro append-only con JSON canónico y una entrada por acción/tipo; reintentos preservan historia y no repiten ediciones. CRUD e inicio integrados en transacciones. 104/104 tests, lint/typecheck pasan; UI pendiente. |
| 2026-10-30 | A4 | Semilla transaccional de diez plantillas, tres sin programación de cuidados/suplementos, sin duplicar ni pisar datos. 72/72 tests, lint/typecheck pasan. Corregido nombre de helper de tests para no parecer un hook React; no se deshabilitaron reglas de lint. |
| 2026-10-30 | A3 | Contratos, validaciones y Dexie v1 implementados. 65 tests totales pasan, typecheck/lint exit 0. Inicio de sesión atómico, snapshots, ocurrencia única y slot único de timer. No hay todavía flujo visual ni pruebas móviles. |
| 2026-10-30 | A7 | Lint/build iniciales pasan. Añadidos Vitest y fake-indexeddb solo para tests, scripts test/watch/typecheck, primeras 17 pruebas reales de fechas/horas y README de desarrollo. A3 es el siguiente trabajo. No hay prueba móvil ni interfaz nueva. |
| 2026-10-30 | Documentación | Aprobadas e integradas las aclaraciones de alineación en `plan.md` v1.1, `AGENTS.md` y este archivo. Se añaden A7, B8–B10 y C6, se amplían criterios a 14 y se separan verificación técnica/móvil. A0 deja de bloquear el trabajo local. Verificación documental: `git diff --check` sin errores; 28 IDs únicos, todos trazados al plan, y 14 criterios sin marcar. No se implementó código ni se ejecutaron tests del producto en esta sesión. |
| 2026-10-29 | Documentación | Primera versión del plan y seguimiento, con decisiones iniciales y consultas a las guías de Next. La revisión v1.1 sustituye las reglas que entraban en contradicción con el contexto. |

## Descubrimientos y decisiones pendientes

### Decisiones de diseño (2026-10-30)

- **Minimalismo editorial aprobado.** Tipografía grande, mucho aire, reglas finas, sin sombras ni tarjetas anidadas, un solo acento bermellón para un marcador/foco puntual. Referencias del dueño en `docs/design/references/`.
- **Lexend es la fuente base**, self-hosted con `next/font`; Atkinson queda solo como alternativa si C3 encuentra una razón de lectura. Tokens: papel `#F4F1EA`, tinta `#171512`, gris `#544E47`, línea `#D8D2C6`, acento `#C43D2E`.
- **La app arranca en papel claro.** La referencia TURA alimenta el modo noche posterior; no se añade tema oscuro nuevo antes de C3/D3.

### Decisiones v1.2 (2026-10-30)

- **La franja es el bloque.** Hasta tres tareas; varias por día; solo una abierta; no se salta a la siguiente hasta resolver la actual.
- **Tres cambios al día.** Elegir dentro de la franja es libre; «Otra» reemplaza una carta por otra que no está en la franja.
- **Bloqueo de tarea y franja.** Una sesión activa impide iniciar otra; una pausa no libera; «no aplica» y «terminar por hoy» son las salidas explícitas. No hay «dejar pendiente» en sesión activa.
- **Descanso gratuito.** 10 min después de completar, saltable, sin RC y sin bloquear la siguiente tarea.
- **RC en segunda capa.** El primer corte usa el descanso como recompensa; C1/C2 se implementan después del bucle. «Casi» sale de los botones principales.
- **A1/A2 después de B1.** La instalación y el offline se hacen antes de la validación móvil; no bloquean el bucle local.

### Resueltos en la revisión v1.1

- **Tres cartas son una franja, no todo el día.** Varias franjas; solo una abierta; si no hay tres elegibles, no se rellena.
- **Menos decisiones no significa perder control.** Editor diario y correcciones neutrales; no se cuenta «Otra» como prueba de bajo rendimiento.
- **Faltaban tareas de seguimiento.** Editor, escalones, pausa y voz local ya tienen IDs explícitos; no se da por hecho que estaban incluidos en una semilla o timer.
- **Economía definida, no en el primer corte.** Premio fijo, tope por ocurrencia y canje manual sin deuda; pasan a la segunda capa.
- **Las promesas clínicas y de plataforma se retiraron.** Accesibilidad por contrastar; vibración progresiva, wake lock no garantizado y `.ics` sin promesa de alarma o takeover.

### Pendientes reales

- **A0:** origen HTTPS autorizado y dispositivo/navegador objetivo. No se ha elegido proveedor ni se ha desplegado.
- **C3:** investigación de accesibilidad, medición formal de contraste y prueba de lectura pendientes; Lexend y la paleta ya están implementadas, pero no se afirma que estén validadas clínicamente.
- **Plataformas/UI:** B1, B2, B3, B4, B5, B8, B9, B10, B11 y B12 se verificaron en Chrome headless, no en un teléfono. Faltan B6, B7, instalación, shell offline y pruebas en iOS/Android. La persistencia se probó con fake-indexeddb y en un perfil de Chrome headless, no en el dispositivo objetivo. Tampoco hay prueba de uso iniciada.

### Contexto técnico consultado, no evidencia de implementación

- Documentación de la versión instalada en `node_modules/next/dist/docs/`. Se consultaron `ai-agents.md`, `offline-support.md`, `progressive-web-apps.md` y secciones de `upgrading/version-16.md` y `02-project-structure.md`. No significa que toda la documentación se haya leído o que una API esté implementada.
- `next.config.ts` ya contiene `cacheComponents: true`, `partialPrefetching: true` y el loader `@tailwindcss/turbopack`. Mantener una base prerenderizable y acceder a datos del dispositivo en cliente; consultar guías antes de introducir nuevas APIs.
- `params`/`searchParams` son asíncronos donde corresponda; `proxy` sustituye a `middleware`; la verificación de lint se hace con ESLint, no `next lint`.
- `LayoutProps<"/">` es un tipo generado de rutas. Tailwind v4 está configurado sin `postcss.config` en este scaffold.
- `experimental.agentFeedback` está habilitado en la configuración actual. No se ha cambiado; respetar los bloques gestionados que Next añada a `AGENTS.md`.
- El MCP de Next en `/_next/mcp` es una opción de inspección del dev server, no una herramienta verificada/configurada aquí. No es requisito para empezar.

## Fuera del MVP

**➖** LLM/DeepSeek, Dossier, nivel 3, Jefe, Parte, rotación de ambientes, rachas/desbloqueos, `.ics`/push, ventanas protegidas por categoría, temporizador de canje de ocio, múltiples ocurrencias diarias de una tarea, cuentas/sync, dashboards y motor 2D. Referencia: `plan.md` §14. El descanso gratuito de 10 min sí está en el primer corte.

## Entorno y comandos

Todos los comandos desde `/Users/hangtu/Documents/runo/runo` (raíz Git; el directorio padre también se llama `runo`).

| Qué | Comando o dato |
|---|---|
| Dev | `npm run dev` |
| Lint | `npm run lint` |
| Tipos | `npm run typecheck` (`next typegen` + `tsc --noEmit`) |
| Build | `npm run build` |
| Producción local | `npm run start`, después del build |
| Tests | `npm test` (Vitest run) · `npm run test:watch` (watch) |
| Versiones observadas | Node v25.8.0 · Next 16.4.3 · React 19.3.0 |
| Repo | `github.com/Hangtu/runo` |
| Despliegue y dispositivo objetivo | Pendientes, no confirmados |

Los comandos anteriores describen el entorno, **no resultados de ejecución**. El agente debe registrar qué ejecutó y qué pasó en la fila correspondiente.
