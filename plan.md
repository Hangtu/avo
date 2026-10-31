# Runo — plan de producto y MVP

> **Runo te ayuda a recordar, elegir con menos esfuerzo y empezar una tarea adecuada al momento. Te acompaña con tiempo visible, presión configurable y recompensas, sin castigarte por atender tu vida.**

**Versión del alcance:** 1.5 — franjas de hasta tres, tres cambios diarios, bloqueo de foco con salidas explícitas, descanso gratuito, sesión rápida sin RC, pendientes de una sola vez e interfaz bilingüe español/inglés; Runo Coins pasa a la segunda capa.
**Estado de ejecución y siguiente acción:** [`STATUS.md`](./STATUS.md). Este plan describe el producto; no certifica funcionalidades construidas.
**Instrucciones para agentes:** [`AGENTS.md`](./AGENTS.md).

**Resumen:** una carta visible · franjas de hasta tres · tres cambios voluntarios al día · bloqueo de foco con salidas explícitas · descanso gratuito · pausas persistentes · sesión rápida fuera de la lista · pendientes de una sola vez · interfaz ES/EN · El Reloj · sin LLM en el MVP.

---

## 1. Entendimiento del problema, no diagnóstico

El contexto original describe dificultades para **recordar, iniciar, distribuir el tiempo y mantener el interés**. No corresponde reducirlas a una sola causa ni afirmar qué mecanismos clínicos explican la experiencia del usuario.

| Necesidad expresada | Respuesta de diseño que vamos a probar |
|---|---|
| A veces olvido qué hacer | Plantilla semanal, propuesta del momento y recordatorios con límites técnicos explícitos |
| Recuerdo algo, pero no empiezo | Una carta concreta y una acción clara para arrancar |
| Las rutinas y apps me aburren | Ritmo de juego ligero, presión visual y pequeñas variaciones locales |
| Quiero elegir sin una rutina rígida | Propuesta automática con cambios y correcciones accesibles |
| Tengo un bebé | Pausar, retomar y cerrar sin penalización; duraciones adaptables |
| Me sirve la presión | Firmeza configurable, aplicada a acciones y compromisos, no al valor personal |
| Quiero saber qué me cuesta | Eventos observables, sin confundir ausencia o cambios de tarea con procrastinación |

Estas son **hipótesis de producto a validar con uso**, no diagnósticos ni promesas de tratar el TDAH. No asumimos que todo bloque deba durar menos de diez minutos, que decidir siempre sea un problema o que sepamos cuándo se abandonaría la app.

Los cuatro trabajos de Runo son: **recordar y orientar · facilitar el arranque · sostener el interés · adaptarse a la vida real**.

## 2. Los siete principios

1. **Entrada rápida.** Objetivo de 2 s y umbral de aceptación menor de 5 s hasta un estado utilizable, medidos según §12. Sin login ni onboarding obligatorio repetido. Un asalto existente se restaura primero.
2. **Una tarea en foco.** Durante el asalto no hay listas ni dashboards. Mientras hay una sesión activa no se puede iniciar otra tarea; pausa, no aplica, terminar por hoy y silencio siguen accesibles.
3. **La app propone; tú conservas el control.** Menos decisiones por defecto, con salidas explícitas: pausa, no aplica y terminar por hoy. El bloqueo no convierte la app en una trampa.
4. **La realidad tiene prioridad.** El bebé, una interrupción o un cambio de planes permiten pausar y cerrar sin descuentos, deuda ni mensajes de culpa.
5. **Audio opt-in.** Silencio inicial, preferencia persistente y ningún aviso que ignore el mute. La vibración es opcional donde exista soporte.
6. **Variación ligera.** El bucle sigue siendo reconocible. El MVP tiene un solo ambiente y variación textual local; las demás experiencias son posteriores.
7. **Retomar debe ser fácil.** Pausa reanuda el restante exacto y no cuenta el tiempo pausado. Escalones cortos cuando tengan sentido, sin obligación de reducir todo a un minuto ni declarar completa una tarea que solo se empezó.

## 3. Modelo mental

| Concepto | Significado | Alcance |
|---|---|---|
| **Mazo** | Plantillas de tareas: duración, días, prioridad y horario opcional | MVP |
| **Ocurrencia** | Una tarea pendiente para una fecha concreta; evita duplicados y pagos repetidos | MVP, concepto interno |
| **Franja (Hand)** | Bloque de hasta tres cartas; varias por día, ordenadas; no es un máximo de tareas del día | MVP |
| **Tirada** | Propuesta de una sola carta elegible | MVP |
| **Asalto** | Sesión de una tarea o de un escalón, con timer y pausa | MVP |
| **Sesión rápida** | Timer one-off con nombre y minutos desde Hoy o el día cerrado, fuera del Mazo y sin RC; no altera el día | MVP (B13) |
| **Pendiente** | To-do de una sola vez, sin días ni franja, que se guarda hasta completarlo; con timer y sin RC | MVP (B14) |
| **Escalón** | Primer paso corto opcional; no equivale automáticamente a terminar la tarea | MVP |
| **Descanso** | Pausa gratuita de 10 min tras completar; saltable, no paga RC y no bloquea la siguiente tarea | MVP |
| **Ancla ligera** | Tarea con hora fija que recibe prioridad con la app visible | MVP |
| **Ambiente / Vigía** | Identidad visual y señal de avance del tiempo | El Reloj en MVP |
| **Runo Coins (RC)** | Saldo de recompensa: 1 RC representa 1 minuto de ocio | Segunda capa |
| **El Jefe** | Tratamiento especial para una tarea difícil, basado en datos suficientes | Fase 2 |
| **El Parte** | Revisión breve de patrones y propuestas de ajuste | Fase 4; no condiciona editar tareas |

## 4. El flujo de uso

### 4.1 Apertura y franja

Si existe una sesión activa —corriendo, pausada o esperando confirmación—, la app la abre en su estado real. No muestra la lista de franjas, no inicia otra y no reanuda sola.

Sin sesión activa, la app muestra el día local y la **franja actual**: un bloque de hasta tres tareas elegibles para ese momento, ordenadas por prioridad. La app arma las franjas que hagan falta; no crea franjas vacías ni rellena con duplicados. Puede haber varias franjas en un mismo día y varias en la misma mañana, tarde o noche.

```text
Lunes 21 de octubre · Franja actual
3 tareas · N pendientes hoy

[ lista de hasta 3 cartas ]
```

- Cada franja muestra hasta tres tareas. Si solo hay una o dos, se muestran esas.
- El orden dentro de la franja es libre: puedes empezar por la que te apetezca.
- La franja actual no se cierra hasta resolver sus cartas: completadas, «ya la hice», «no aplica» o cambiadas por «Otra». No se salta a la siguiente con pendientes; «Terminar por hoy» es la salida explícita.
- Al resolver la franja, se propone la siguiente. Nunca arranca sola.
- No existe un máximo diario de tres tareas. Tampoco una cuota obligatoria de franjas.
- Si no hay tareas elegibles, se comunica sin presión y se permite salir o configurar. No se proponen tareas completadas o fuera de horario para ocupar la pantalla.
- Una tarea con hora fija puede presentarse fuera de la franja actual: pausa y guarda la sesión anterior antes de mostrarse (D1).

### 4.2 Tirada y tres cambios

La carta muestra **qué hacer y duración** antes de comenzar. Hay una acción principal «Empezar» y una secundaria «Otra», con contador de cambios.

- Hay **tres cambios voluntarios por fecha local**, compartidos por todas las franjas y persistentes al recargar. El valor inicial es 3; el ajuste en Ajustes queda para después del primer corte.
- **Elegir entre las tres cartas visibles es libre y no consume cambios.** «Otra» solo reemplaza una carta por otra que no está en la franja actual.
- «Otra» aplaza esa carta fuera de la franja y ofrece una alternativa elegible. La tarjeta que entra ocupa su lugar y también debe resolverse; la cambiada queda pendiente y puede volver en una franja posterior. No se cuenta como fallo.
- Si no hay alternativa, «Otra» no se ofrece ni consume un cambio.
- Cuando el saldo llega a cero, **«Otra» desaparece**. Un texto secundario informa que ya se usaron los tres cambios, sin regaño.
- **«Ya la hice», «Hoy no aplica», pausa, vida real y corrección de configuración no consumen cambios.** Permanecen accesibles aunque se hayan agotado.
- «Ya la hice» cierra la ocurrencia sin crear tiempo de trabajo ni pagar RC retroactivos. «Hoy no aplica» la excluye solo de esa fecha. Ambas acciones son neutrales y se registran por separado.

La selección filtra primero por días, estado y horario; después prioriza anclas vencidas todavía aplicables, prioridad, diversidad y desempate determinista. No sacrifica elegibilidad por peso. El Jefe no interviene en el MVP.

### 4.3 Asalto, bloqueo, pausa y resultados

El centro de la pantalla es el timer, acompañado del título y el Vigía. Se puede finalizar antes, pausar, silenciar o terminar por hoy sin navegar a otra pantalla. Una cuenta **3-2-1** cancelable precede al timer.

| Situación | Comportamiento |
|---|---|
| Empezar | Cuenta 3-2-1 cancelable; después guarda sesión, variante, duración y recompensa acordadas antes de correr el timer |
| Bloqueo de tarea | Mientras hay una sesión activa no se puede iniciar otra tarea. Pausar no libera el bloqueo |
| Pausar | Congela el restante y persiste el estado; admite motivo opcional y atajo «El bebé» |
| Volver a una pausa | Muestra «Continuar»; nunca reanuda sola. Al continuar se retoma el restante exacto |
| Ocultar o cerrar sin pausar | El reloj sigue transcurriendo; al volver se recalcula, sin inferir qué hizo el usuario fuera |
| Llegar a cero | Pasa a «¿Terminaste?». No completa la tarea ni paga automáticamente. Aviso visual y campana solo si el audio está activado |
| «Terminé» antes de cero | Confirma el resultado sin esperar al cero; la recompensa acordada no cambia |
| «Sí, terminé» | Confirma el resultado y aplica las reglas de recompensa de §6 |
| «No terminé» | La tarjeta se queda en el centro; no vuelve la lista. Ofrece «Reintentar 5 min», «Pausar», «No aplica» o «Terminar por hoy» |
| «No aplica» | Resuelve la ocurrencia para esa fecha sin trabajo ni pago; no es un fallo |
| «Terminar por hoy» | Cierra el día, conserva lo ganado y deja pendientes las tareas no resueltas |

No hay botón «Casi» ni «Dejar pendiente» dentro de una sesión activa de una tarea diaria: serían salidas que evitan el bloqueo. Un pendiente de una vez sí puede cerrar su timer con «Dejarlo para después»; eso no lo borra de su lista. La pausa cubre la vida real y «Terminar por hoy» es la salida explícita. Si el tiempo ya venció y el usuario quiere seguir, **«Reintentar 5 min»** añade un tramo sin nueva recompensa.

El progreso registrado es **tiempo del timer y resultados declarados**, no una medición de atención efectiva. La app no verifica físicamente que se realizó una actividad.

### 4.4 Escalones, descanso y cierre del día

- Cada tarea tiene una versión completa y, opcionalmente, **un primer paso corto definido con una acción concreta**.
- No hay un selector universal que convierta cualquier tarea en 1/5/10/25 minutos. Se respeta la duración que configura el usuario.
- Ejemplo: «Lavar ropa» → escalón «Meter la ropa a la lavadora, 1 min». Terminar ese paso **no** marca como terminadas las demás partes de la tarea.
- Un escalón completado guarda el avance y puede pagar su recompensa limitada (§6). Repetirlo no permite cobrar de nuevo.
- Preparar un vaso o un cepillo no equivale a tomar un suplemento o completar la higiene. No se acortan ni reinventan procedimientos médicos.
- Al completar una tarea se ofrece un **descanso gratuito de 10 min**: saltable, sin RC, sin bloquear la siguiente tarea y sin autoinicio. Si empiezas otra tarea, el descanso termina. No es una sesión ni genera ledger.

**«Terminé por hoy» conserva lo ganado; no paga lo pendiente.** Si hay una sesión activa, se cierra como abandonada y la ocurrencia queda pendiente; si hay un descanso, termina. No hay resumen obligatorio ni pérdida de saldo por cerrar temprano.

### 4.5 Sesión rápida

En **Hoy** o después de cerrar el día, la cabecera ofrece **Tarea rápida** junto a **＋ Pendiente**: un timer one-off para algo que no estaba en la lista, como pagar cuentas o resolver un pendiente inmediato. Se abre en un panel sobre la vista actual. También está disponible cuando hay una tarea asignada; no la reemplaza ni la marca como hecha, solo permite resolver algo fuera de la lista y volver.

- Pide un nombre y minutos enteros; no usa categoría, prioridad, días, franja ni escalón.
- **No es una tarea del Mazo** y no entra a ninguna franja, ocurrencia diaria o cola de propuestas. Internamente conserva su sesión/ocurrencia para sobrevivir una recarga, pero no aparece en Tareas.
- **No paga RC** ni genera ledger. Es tiempo de foco, no una recompensa económica; así no se puede usar para producir minutos de ocio sin límite.
- No cambia el estado del día abierto ni cerrado. Al terminar o abandonar, vuelve a la pantalla desde donde empezó (Hoy o día cerrado) y permite otra sesión rápida.
- Solo puede haber una sesión activa a la vez, igual que con las tareas. Pausa, «El bebé», «No aplica» y la confirmación de término funcionan con el mismo timer.
- Arranca directo al confirmar el formulario, sin la cuenta 3-2-1 de las tareas; el formulario ya es la confirmación.
- **No es la lista de pendientes.** La sesión rápida es un timer inmediato que no se guarda; un pendiente es algo que quieres recordar y hacer después. Pueden compartir el mismo motor de timer y la regla de no pagar RC.

### 4.6 Pendientes de una sola vez

Además de las tareas recurrentes, Runo mantiene una **lista de pendientes** para cosas que no se repiten: pagar las cuentas del banco, cancelar una suscripción, comprar pilas o mandar un correo. No son tareas del Mazo y no tienen día, franja, prioridad ni escalón.

- **Pestaña propia «Pendientes»**, separada de Hoy y Tareas. Se puede abrir desde el dock y desde el enlace de escritorio. Un botón **＋ Pendiente** en Hoy permite agregar sin perder el hilo.
- El formulario pide **título y minutos enteros**; el valor inicial es 25 y hay atajos 5/15/25/30. No se guarda como tarea.
- Cada pendiente se muestra como tarjeta con **Empezar**, **Ya lo hice** y **Quitar**. «Quitar» pide confirmación; «Ya lo hice» cierra sin timer, sin trabajo registrado y sin RC.
- El timer se abre directo, sin 3-2-1. Se puede pausar, usar «El bebé» y terminar antes con **Terminé**. Al llegar a cero no se completa solo: pregunta si terminaste; si no, el pendiente sigue en la lista. «Reintentar 5 min» añade un tramo; «Dejarlo para después» cierra la sesión sin borrar el pendiente.
- Al completar, el pendiente desaparece de la lista. La siguiente tarjeta queda visible, pero **no arranca sola**. Solo hay una sesión activa en toda la app, compartida con las tareas diarias.
- **No paga RC ni escribe ledger**, no ofrece descanso y no altera el día abierto ni cerrado. Funciona también después de «Terminar por hoy».
- Persiste en IndexedDB y sobrevive una recarga. En esta versión no tiene fecha límite, recordatorio, historial visible ni edición; se puede quitar y volver a agregar. El orden inicial es el más reciente arriba.
- Un pendiente completado o quitado deja de aparecer. No se mezcla con las tres cartas ni consume los tres cambios diarios.
- **No es una segunda economía**: es una lista de cosas por hacer, no una fuente de minutos de ocio.

## 5. Días, franjas horarias y anclas

### En el MVP

- Las tareas pueden repetirse en días específicos. Proyecto A los lunes y Proyecto B los martes funcionan con el mismo editor que los hábitos.
- Cada tarea admite una **franja opcional** de inicio y fin, en hora local. Desayuno puede limitarse a la mañana sin un calendario visual.
- Las franjas del MVP están dentro de un mismo día. El editor valida inicio < fin y, si existe hora fija, que esté dentro de la franja.
- Sin franja, la tarea es elegible durante ese día. La prioridad no la convierte en una obligación permanente.
- Una **hora fija** indica cuándo presentar una ancla ligera. Se comprueba al llegar la hora y también al volver a la app, no solo por coincidencia exacta de minuto.
- El aviso se presenta **una vez por ocurrencia**, con la app visible. Si hay otra sesión activa, se pausa y guarda antes de mostrar la urgente. La ancla puede estar fuera de la franja actual y no consume cambios.
- El usuario decide empezar, dejar pendiente o indicar que no aplica. El timer urgente no se inicia solo. Después se ofrece retomar la sesión anterior, sin reanudarla automáticamente.
- Si ya pasó la franja válida, no se fuerza como si el horario siguiera disponible. Queda pendiente de una decisión explícita.

**Ejemplo editable:** «Prepararme para el gym», 18:00, 30 min, con franja 18:00–18:30. Es un ejemplo de preparación, no una afirmación sobre la hora real del gym.

**Atender al bebé no cambia una cita externa.** Runo no reagenda automáticamente +15 min ni mueve horarios del calendario. El usuario puede cambiar su planificación explícitamente.

### Después del MVP

Anclas con preparación y recordatorios externos, exportación `.ics` y ventanas protegidas por categoría, como el bloque personal de 18:00 a 20:00. Un aviso de calendario o push no equivale a tomar control del teléfono ni a interrumpir otras apps. Limitaciones en §12.

## 6. Runo Coins: economía de la segunda capa

**Primer corte:** el bucle por franjas, el timer, las pausas, el bloqueo de foco y el descanso gratuito no requieren ledger ni monedero. Los RC de esta sección se implementan en la **segunda capa**, antes de la validación completa del MVP. Hasta entonces no se muestra saldo ni se promete una recompensa en RC.

**1 RC = 1 minuto de ocio que el usuario decide canjear en lo que quiera.** Es una representación de recompensa, no permiso para descansar, alimentarse, dormir o atender necesidades básicas. La app no bloquea otras aplicaciones ni exige ganarse el descanso.

### Regla de ganancia

Para eliminar ambigüedad, el MVP usa una regla sencilla, sin multiplicadores:

- La versión completa tiene una recompensa fija igual a sus **minutos configurados**. Una carta de 15 min ofrece 15 RC, aunque se termine antes.
- **Presentación de la recompensa (2026-10-30):** la tarjeta, el timer y el ancla no muestran la sigla RC. Al terminar se comunica una sola vez como «Ganaste X min para ti»; el detalle de RC vive en Monedero. El ledger, el tope y la idempotencia no cambian.
- Un escalón tiene una recompensa fija igual a sus minutos, siempre inferior al total de la tarea. Ejemplo: 1 RC por el primer paso de la ropa.
- La recompensa se muestra y se congela al iniciar. El primer asalto de una ocurrencia fija también el tope de la tarea completa, aunque se empiece por un escalón. Editar la plantilla después no cambia ese acuerdo, una sesión en curso ni pagos anteriores.
- **Tope por ocurrencia:** la recompensa de la versión completa fijada al empezar. Si ya se pagó un escalón, al completar el resto se acredita únicamente la diferencia.
- Ejemplo: ropa completa 15 RC → escalón terminado +1 RC → tarea completa después +14 RC → total 15 RC, no 16.
- Tiempo agotado, abandono, pausa y «Ya la hice» no pagan. Completar un escalón configurado sí paga ese paso, sin declarar completa toda la tarea.
- Confirmar el mismo resultado otra vez, recargar o pulsar dos veces no vuelve a pagar. La actualización de ocurrencia, evento y ledger debe ser transaccional e idempotente.
- La prioridad ordena tareas, **no multiplica RC**. Bonos del Jefe o progresión se evaluarán en fase 2; no existen todavía.
- Las **sesiones rápidas** y los **pendientes de una vez** no generan RC ni movimientos del ledger. No son tareas del Mazo y no alteran la economía.

### Saldo y canje

- El ledger es la fuente del saldo. Se muestra, por ejemplo, **«1 h 45 min · 105 RC»**.
- El canje del MVP es manual: indicar minutos y confirmar. No necesita catálogo ni temporizador de ocio.
- Solo se canjean enteros positivos hasta el saldo disponible. Cancelar o repetir una solicitud no duplica el débito.
- No hay deuda, préstamos, intereses, saldo negativo ni penalizaciones. Tampoco se construyen como requisito futuro.

## 7. Ambientes y novedad

**El Reloj es el único ambiente del MVP:** tipografía legible, paleta tranquila, tiempo central y una señal visual de progreso. El Vigía es CSS/SVG; no necesita un motor de juego ni estimaciones inventadas de líneas o porcentajes de esfuerzo.

La novedad inicial viene de propuestas adecuadas al momento y unas pocas frases locales variadas (§8), no de añadir siete juegos antes de validar el bucle.

Después del MVP se pueden explorar Lluvia, Pit Lane, Vigilancia, El Entrenador, La Deuda y Sin Señal como tratamientos del mismo flujo. «La Deuda» sería solo una identidad visual, no deuda económica real.

**Progresión posterior:** usar días de uso acumulados, no una racha punitiva. Un día sin uso no resta progreso ni bloquea de nuevo lo conseguido. Los hitos y el orden de ambientes se validarán entonces; los antiguos umbrales de 3/5/10/21 días no son requisitos del MVP ni conclusiones de investigación.

## 8. Voz y presión configurable

**Regla del usuario:** «No tiene caso hablar fuerte si lo estamos haciendo bien».

| Nivel | Uso |
|---|---|
| **0 · Silencio textual** | Se elige o se activa para una interrupción de vida real; solo información funcional |
| **1 · Firme / reconocimiento** | Tono efectivo normal: breve, directo, reconoce el avance |
| **2 · Duro** | Disponible como intensidad máxima inicial; solo ante una dificultad declarada por el usuario o al pedir un empujón |
| **3 · Intenso, reservado** | Fuera del MVP; exige habilitación explícita, gradualidad y señales interpretables. Nunca se activa por calendario o cambios usados |

**No confundir intensidad máxima con tono permanente.** El techo inicial es 2 y el tono efectivo normal es 1. «Otra», «No aplica», pausas o ausencia de la app no prueban bajo rendimiento.

### Dentro del MVP

Un banco pequeño de **5–10 frases locales**, sin IA, para apertura, propuesta y cierre. La elección es determinista y evita repetir inmediatamente la misma frase. No añade sonidos ni interrumpe el timer con mensajes.

Ejemplos de intención, no de culpabilización:
- «Una cosa a la vez. Empieza por esta.»
- «Dijiste que esto te importa. Haz el primer paso.»
- «Hecho. Tú decides si vas por otra franja.»

El modo duro se pide o se vincula a un motivo explícito como «Me distraje», nunca se deduce solo de un evento neutro. Siempre se puede bajar o silenciar.

### Fuera del MVP

Dossier personal, referencias más específicas a metas y Elian, y generación opcional con LLM. La referencia a Elian sigue **reservada**, orientada a lo que el usuario quiere construir, no a cuestionar su valor como padre. No se automatizan insultos, descalificaciones laborales ni vergüenza familiar.

Si se incorpora un LLM: servidor, clave privada, contexto mínimo autorizado, generación cacheada y respaldo local. El bucle jamás depende de la API.

## 9. Registro y análisis futuro

Desde el primer día se guardan eventos con fecha, tarea/ocurrencia/sesión cuando corresponda, acción, variante y motivo explícito si existe. También se registra qué carta se ofreció; sin exposición no puede interpretarse un rechazo.

En la carta Ahora, `offered` se registra cuando una carta es la visible, no cuando solo forma parte de la franja. Su identidad es franja + ocurrencia: volver a la misma carta dentro de la misma franja no crea otra exposición, y una carta de una franja posterior sí. Un `started` normal incluye `handId`; el ancla es la excepción acotada.

**Vocabulario canónico para implementación:** `offered`, `started`, `paused`, `resumed`, `timer_expired`, `completed`, `partial`, `abandoned`, `swapped`, `already_done`, `not_applicable`, `life_real`, `hand_closed`, `redeemed`, `task_created`, `task_updated`, `task_archived`, `anchor_presented`.

- Cambiar, interrumpir por el bebé y no poder realizar una tarea son eventos distintos, no un único contador de fallos.
- Las franjas y versiones elegidas forman parte del contexto necesario para comparar.
- No se interpreta tiempo fuera de la app como distracción ni el tiempo del timer como atención medida.
- Una futura puntuación de fricción será una **heurística explicable**, con muestra y límites, no un diagnóstico ni una explicación causal garantizada.
- El Parte podrá proponer un ajuste semanal, pero no es necesario para agregar o editar tareas.
- El MVP guarda los datos; no necesita dashboards, heatmaps, chat ni análisis con IA.

## 10. Diseño, accesibilidad e investigación pendiente

El research solicitado en el contexto original **no se considera realizado**. Las preferencias siguientes son decisiones iniciales de diseño, no un tratamiento ni una selección «aprobada para TDAH».

### Dirección visual: minimalismo editorial

La referencia aprobada por el dueño es **super minimalista**: tipografía grande, mucho aire, pocos elementos, líneas finas y un solo acento. Las imágenes de referencia viven en `docs/design/references/`:

- [`tura-dark-typography.png`](./docs/design/references/tura-dark-typography.png): estudio oscuro, navegación mínima, una sola pieza tipográfica central.
- [`minimalism-light-editorial.png`](./docs/design/references/minimalism-light-editorial.png): composición clara, tipografía enorme, reglas finas y un único acento rojo.

Son dirección de tono, no assets para copiar. La app no reproduce logotipos, textos ni composiciones de las referencias.

**Reglas de la dirección visual:**

- **Una jerarquía clara:** una acción principal por tarjeta o vista; el resto son enlaces o controles secundarios discretos.
- **Profundidad suave:** superficies de vidrio con fallback sólido, sombra ambiental y gradientes cálidos; las secciones no se anidan como tarjetas dentro de tarjetas.
- **Un solo acento** (índigo en la base Liquid) para un marcador pequeño, el foco o una acción puntual; las acciones principales pueden ser tinta o el color primario. El resto es papel, vidrio, tinta y gris. No usar el acento en todo.
- **Tipografía protagonista:** títulos grandes y breves; etiquetas pequeñas en mayúsculas con tracking; cuerpo legible; números tabulares para el timer.
- **Mucho espacio en blanco** y un ancho de lectura corto; la pantalla debe respirar incluso en móvil.
- **El timer es la pieza central** durante el asalto. La franja es una lista serena; el editor es una vista secundaria tranquila, no un dashboard.
- **Esquinas suaves (16–32 px)** en tarjetas y controles; los bordes de control siguen siendo visibles y no dependen solo del color.
- **Modo noche cálido desde D3.** La imagen TURA alimenta el tema nocturno: papel claro de día y una noche cálida de bajo brillo. Entra automáticamente de 20:00 a 07:00 y una elección manual de claro u oscuro siempre gana; no se fuerza contra la preferencia del usuario.

### Tipografía

**Lexend es la fuente base de la app**, self-hosted con `next/font` (sin request a Google en el navegador). Es una decisión aprobada, no una candidata pendiente. Atkinson Hyperlegible queda solo como alternativa si la prueba de lectura de C3 muestra una razón concreta. No se añade un selector de fuentes ni familias de acento en el MVP.

- Cuerpo de 18–20 px; títulos de 40–64 px en escritorio y 32–40 px en móvil; timer responsivo de 64–112 px, sin desbordes.
- Interlineado de 1.5–1.7, alineación izquierda, jerarquía clara y pocos elementos simultáneos.
- Números tabulares en timer, cuenta 3-2-1 y descanso para evitar saltos de ancho.
- Objetivo de contraste de 7:1 para texto de cuerpo, medido en la paleta de papel cálido. El acento bermellón se usa sobre todo en foco/estado no textual; si se usa como fondo de texto, debe superar contraste con el texto que contenga.
- Controles de al menos 44 × 44 px, foco visible, etiquetas comprensibles, compatibilidad con lector de pantalla y zoom al 200 % sin pérdida funcional.
- `prefers-reduced-motion` también aplica al **timer y al Vigía**. El avance debe poder entenderse sin animación, color ni sonido.
- Modo noche cálido automático de 20:00 a 07:00, con cambio manual persistente; no se fuerza contra una elección del usuario. Su variante visual puede inspirarse en TURA; D3 lo implementa y D4 registra la validación móvil.
- Feedback visual siempre disponible. Vibración breve solo si la API funciona; su ausencia no bloquea ni cuenta como fallo en iOS.
- Español de México, tuteo directo y sin caricaturizar el habla. En tiempos, números exactos: «faltan 7 min», no «ahorita».

**Paleta implementada:** papel `#F4F1EA`, tinta `#171512`, gris `#544E47`, línea `#D8D2C6` (solo separadores decorativos), control `#8C8275` (bordes de campos/controles) y acento bermellón `#C43D2E`. Los ratios se midieron en C3; el acento no se usa como texto de cuerpo.

**Base elegida después de la exploración (Liquid Focus, 2026-10-30):** fondo ambiental `#EFF6F5`, tinta `#17252A`, superficies de vidrio con fallback sólido, muted `#3B5457`, acento `#4F6BFF`, primario `#3948C8` y timer circular. En móvil la navegación principal baja a un dock de vidrio; en escritorio queda arriba. Modo noche `#0C161B`/`#EAF7F6`/`#8EA2FF`. Lexend se mantiene; el vidrio nunca es la única capa de legibilidad.

**Editor por día (2026-10-30):** la configuración de tareas usa una tira Lun–Dom con contadores, una lista filtrada por el día elegido y un grupo separado «Sin día». Crear desde un día prellena ese día; editar conserva el contexto. La lista se agrupa en Mañana (05:00–11:59), Tarde (12:00–18:59), Noche (19:00–04:59) y Sin hora; se ordena por hora y usa filas compactas. El formulario ofrece un selector de tipos existentes con opción «+ Nuevo tipo», días con estado visible y momentos Mañana/Tarde/Noche/Cualquier hora/Elegir horas; las horas exactas siguen disponibles. En una tarea nueva se pueden seleccionar varios momentos: se crean tareas separadas, una por momento, cada una con su propia ocurrencia y pago. Al editar, una copia puede crearse desde «Copiar a otro momento».

**Correcciones del editor (2026-10-30):** un preset de momento solo se marca cuando coinciden sus dos extremos; un rango específico como 18:00–18:30 se muestra como Elegir horas, con De/A y el horario efectivo visibles. La tira de días se reparte en una cuadrícula adaptable: 7 columnas cuando cabe, 4 en móvil y 2 en anchos muy estrechos, sin scroll horizontal y conservando objetivos de toque de al menos 44 px; las filas permiten dos líneas para el nombre. Los bloques Mañana, Tarde, Noche, Sin hora, Sin día y Guardadas aparte usan encabezados plegables nativos (`details`/`summary`), muestran su contador y un chevron, inician abiertos y conservan su estado mientras se cambia de día o se abre y cierra el formulario. El formulario conserva un borrador de sesión al cambiar de vista y oculta la lista mientras se edita. Las altas de varios momentos se guardan en una sola transacción, con IDs estables para reintentos. Una carta pendiente que deja de ser elegible se oculta sin rellenar el hueco; un acuerdo ya iniciado conserva su snapshot, salvo que la tarea se archive.

**Carta Ahora (2026-10-30):** la franja se presenta de una tarjeta a la vez: título, duración, `Empezar`, `Ver otra` y `⋯`. Las otras cartas de la misma franja se recorren con `Ver otra`; el paso corto, el cambio por otra tarea y las correcciones viven en `⋯`. No se muestran RC, categorías, pendientes ni contadores de cambios en la primera vista. Sonido, voz y tema viven en **Ajustes**; el Monedero está oculto de la navegación por defecto y se puede habilitar allí. Tras «No lo hice», una frase de empuje con emoji aparece sin un botón adicional.

**Ayuda contextual (2026-10-30):** las instrucciones secundarias no ocupan un párrafo permanente. Viven en un icono `i` junto al texto relevante, con tooltip al pasar el cursor, enfocar o tocar. El tooltip se oculta al salir el cursor, al perder el foco, al desplazar la página, con Escape o al tocar fuera; en táctil, un toque abre y otro cierra. Se coloca dentro del viewport y no depende solo de hover. Los estados, validaciones, acciones y límites esenciales siguen siendo texto visible; la ayuda no reemplaza información necesaria para decidir. `Tarea rápida` y `＋ Pendiente` comparten la cabecera de Hoy.

**Lenguaje llano (2026-10-30):** los textos de interfaz usan palabras cotidianas y se entienden sin conocer el modelo interno. No se usan «tres cartas», «franja», «mazo», «elegible», «sesión», «ancla», «ledger» ni «bloque» como vocabulario principal; los términos de la economía se explican en la ayuda contextual. Los estados, errores y acciones también evitan jerga técnica.

**Idioma (2026-10-30):** la interfaz está en **español e inglés**. El español es el idioma inicial y se cambia desde **Ajustes**; la preferencia se guarda localmente. Se usa `next-intl` con catálogos estáticos `messages/es.json` y `messages/en.json`; ambos se incluyen en el build para que el cambio funcione offline. No se usan rutas `/es` ni `/en` por ahora: la PWA conserva `/`, su `start_url` y su shell. Se localizan textos, voz, errores visibles, `aria-label`, ayudas y metadatos del cliente. Los títulos de tareas, categorías y demás datos del usuario no se traducen. Las claves deben existir y coincidir en ambos catálogos.

**Paleta de noche (D3):** fondo `#1B1815`, tinta `#F3EEE5`, superficie `#24201B`, gris `#C4BBAD`, línea `#463F35` (decorativa), control `#9A8F80` y acento `#E0705F`. La tinta, el gris y el control miden 15.30:1, 9.31:1 y 5.57:1 sobre el fondo; la línea y la superficie son decorativas. La selección usa tinta oscura sobre el acento (5.77:1).

### C3 — medición de contraste (2026-10-30)

**Fuentes consultadas realmente:**

- [W3C, Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/), Recomendación del 5 de octubre de 2023: SC 1.4.3 (4.5:1 normal / 3:1 texto grande), 1.4.4 (200 % sin pérdida), 1.4.6 (7:1 / 4.5:1 grande), 1.4.11 (3:1 para componentes y estados no textuales), 2.4.7 (foco visible), 2.5.5 (44 × 44 px, AAA) y 2.5.8 (24 × 24 px, AA).
- [WebAIM, Contrast and Color Accessibility](https://webaim.org/articles/contrast/) (consultado el 2026-10-30): 4.5:1 y 3:1, texto grande 18 pt o 14 pt en negrita, y no redondear ratios.
- [MDN, prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) (consultado el 2026-10-30) para el trabajo posterior de C4.
- [Google Fonts, Lexend](https://fonts.google.com/specimen/Lexend) (referencia aportada por el dueño): espécimen de la fuente base; no es evidencia clínica.

**Método:** fórmula de luminancia relativa y contraste de WCAG sobre los tokens sRGB. No es una auditoría formal ni una prueba con usuarios.

| Par | Ratio medido | Uso previsto | Lectura |
|---|---:|---|---|
| tinta / papel | 16.15:1 | texto principal | supera 7:1 |
| gris / papel | 7.28:1 | texto secundario | supera 7:1 |
| gris / superficie | 7.55:1 | texto secundario | supera 7:1 |
| control / papel | 3.35:1 | bordes de campos y controles | supera 3:1 no textual |
| control / superficie | 3.47:1 | controles sobre superficie | supera 3:1 no textual |
| acento / papel | 4.59:1 | foco y bordes de estado, no cuerpo | supera 3:1 no textual; no usar como cuerpo |
| papel / tinta en botón | 16.15:1 | texto de acción principal | supera 7:1 |
| blanco / acento | 5.18:1 | selección de texto | supera 4.5:1 |
| línea / papel | 1.33:1 | separadores decorativos | no se usa para identificar controles |

**Resultado y límites:** los textos principales y secundarios superan 7:1; los bordes de control superan 3:1; el acento se reserva para foco/estado y no para cuerpo. El Reloj usa números tabulares en tinta, no depende solo de color, y mantiene el audio apagado por defecto. La lectura se revisó visualmente a 390 px y 1280 px; **no** hubo estudio con usuarios ni validación clínica. D3 añade zoom, una mano y modo noche; la validación en el dispositivo objetivo queda en D4. Las fuentes anteriores son estándares y referencias de accesibilidad, no diagnóstico ni tratamiento del TDAH.

**Trabajo de C3:** completado en cuanto a tokens, contraste medido, fuentes consultadas y revisión visual local; no presentar esta medición como auditoría formal ni como validación clínica.

## 11. Reglas para poder volver

| Riesgo | Respuesta |
|---|---|
| Interrupción familiar o día difícil | Pausa o cierre sin perder saldo ni recibir presión |
| Tarea demasiado grande | Escalón opcional y concreto; el resto sigue pendiente |
| Plantilla equivocada | Editor accesible cualquier día; cambios futuros sin reescribir el pasado |
| Se agotaron los cambios | Siguen disponibles pausa, salida, «Ya la hice», «No aplica» y configuración. El bloqueo no impide pausar, no aplicar ni terminar por hoy |
| No puedo con la tarea | «Reintentar 5 min», pausar, «No aplica» o «Terminar por hoy»; no se pierde el progreso ni se inventa una falla |
| Un día sin usar la app | Reentrada neutral; no se borra el progreso acumulado |
| Aburrimiento | Pequeña variación local en MVP; ambientes posteriores según pruebas |
| Cerrar se vuelve otro trámite | «Terminé por hoy», saldo conservado y ningún resumen obligatorio |

El MVP **no necesita un sistema de rachas ni un botón de Día blindado** para cumplir esto. No implementar una penalización es más simple que crear otra mecánica para perdonarla.

## 12. Arquitectura y límites técnicos

**Stack existente:** Next.js 16.4.3, App Router, React 19.3, TypeScript y Tailwind v4. La documentación de la versión instalada en `node_modules/next/dist/docs/` tiene prioridad sobre ejemplos recordados.

### Base local-first

- IndexedDB mediante Dexie, sin cuentas, login, nube de datos ni backend para el bucle del MVP.
- Shell prerenderizable y datos locales en cliente. No acceder a `window`, IndexedDB o fecha local del usuario desde un render de servidor que produzca diferencias de hidratación.
- `cacheComponents` y `partialPrefetching` ya están habilitados. Leer su documentación antes de usar APIs de petición o cambiar esta configuración; no añadir dependencias o flags experimentales por inercia.
- Motor de selección puro, con reloj y semilla como argumentos, testeable sin React ni IndexedDB.
- Esquema de DB versionado, semilla idempotente y escrituras de resultados/ledger atómicas. Reintentos y React Strict Mode no deben duplicar tareas o pagos. Solo una sesión puede estar activa a la vez: corriendo o pausada. Una pausa no libera el bloqueo de tarea.
- El **descanso** es una cuenta regresiva visual de 10 min: no es una sesión, no se persiste como ocurrencia, no paga RC y no bloquea la siguiente tarea.
- `first-app-context.md` se conserva como fuente histórica. Los datos de uso y metas personales no se envían a un LLM ni a analítica de terceros en el MVP.

### Timer, pausa y cambio de fecha

- Se calcula con **reloj de pared**, guardando el inicio del tramo y el restante al iniciarlo. `setInterval` puede refrescar la pantalla, nunca ser la fuente acumulativa del tiempo.
- La pausa guarda el restante y el tiempo acumulado. Al reanudar se abre otro tramo; no se cuenta el tiempo pausado.
- Sin pausa explícita, el reloj sigue al cerrar la app. Si venció, se restaura en confirmación, no como tarea terminada ni con tiempo negativo.
- Ocurrencias y cambios se asocian a una **fecha local**, no a la fecha UTC del servidor. Una sesión que cruza medianoche conserva su ocurrencia original. No se pierde ni se paga de nuevo al crear el siguiente día.
- No se arrastran automáticamente pendientes de días anteriores ni se generan duplicados para compensarlos. Quedan registrados; los siguientes días crean sus propias ocurrencias.

### PWA y soporte real

- Manifest e iconos para instalación. HTTPS es necesario en el teléfono para service workers; `localhost` tiene una excepción de contexto seguro. Una IP HTTP en la red local no sirve para esa validación.
- **HTTPS no bloquea programar ni hacer pruebas locales.** A0 habilita la validación móvil antes de liberar; no exige contratar un proveedor antes de escribir código.
- Elegir un origen HTTPS estable para las pruebas y el uso, porque IndexedDB es por origen. Cambiar entre URLs de preview no sincroniza los datos.
- Abrir offline desde un arranque en frío requiere un **service worker y assets previamente cacheados**. IndexedDB, el manifest o `useOffline` por sí solos no lo proporcionan. Probar con `npm run build` + `npm run start`, no dar por válida una prueba solo en dev.
- `wakeLock` se intenta durante una sesión visible y se recupera al volver si hay soporte. Puede rechazarse o liberarse; no garantiza ejecución ni sonido con pantalla bloqueada.
- Vibración y audio tienen restricciones de soporte, permisos y gesto del usuario. Siempre debe existir fallback visual silencioso.
- Una `.ics` puede ayudar con alarmas del calendario, pero su importación y avisos dependen de ajustes, permisos y sistema operativo. No garantiza que suene ni permite un takeover con el teléfono bloqueado.
- Push y un posible envoltorio nativo son evaluaciones posteriores, no promesas de interrupción garantizada. El MVP no sustituye alarmas externas para compromisos críticos con la app cerrada.

### Rendimiento y conservación de datos

Objetivo: estado utilizable en **2 s**; criterio de liberación: **menos de 5 s** en el teléfono objetivo, tras la primera carga y con assets preparados. Registrar por separado arranque en frío de la PWA, reapertura y restauración de sesión, con dispositivo/navegador y observación. No exigir red para el bucle ni prometer «cero latencia».

Los datos sobreviven cierres normales, pero **no son un backup**: borrar almacenamiento, cambiar de origen o ciertas políticas del navegador pueden eliminarlos. Las actualizaciones no deben vaciar la DB. Exportación/backup y sync se valoran después; no se promete recuperación que aún no existe.

## 13. Contrato de datos para el MVP

Los tipos viven en `lib/domain/types.ts`, las validaciones en `lib/domain/validation.ts` y el esquema/repositorio en `lib/db/`. Este es su contrato de responsabilidades; el estado de verificación se registra únicamente en `STATUS.md`:

| Entidad | Datos y responsabilidad |
|---|---|
| **Task** | ID, título, días, duración completa en minutos, prioridad 1–3, categoría, franja opcional, hora fija opcional, escalón opcional y archivado. La franja horaria sirve para filtrar y ordenar; el editor puede ofrecer presets de mañana/tarde/noche. Ninguna dosis ni frecuencia médica generada por la app |
| **Occurrence** | Identidad única por tarea + fecha local, estado, progreso, tope de recompensa, RC ya acreditados y marca de presentación de ancla. En MVP hay una ocurrencia por tarea/fecha; más de una diaria queda fuera |
| **Day** | Fecha local, contador persistente de cambios voluntarios (0–3) y `closedAt` para «Terminar por hoy». El valor inicial de cambios es 3; el ajuste en Ajustes queda para después del primer corte |
| **Hand** | ID, fecha, número de franja, hasta tres IDs de ocurrencia y estado abierto/cerrado. Solo una franja puede estar abierta a la vez; la siguiente se crea al cerrar la actual |
| **Session** | Ocurrencia, franja si aplica, variante, snapshot de tarea/duración/recompensa, estado, restante del tramo, inicio del tramo y tiempo acumulado. Una sola sesión activa (corriendo o pausada); una pausada bloquea iniciar otra tarea; una anterior puede quedar pausada por un ancla. La sesión rápida usa un snapshot sintético sin Task, no tiene franja y fija recompensa 0; la sesión de un pendiente añade `pendingId` y usa una ocurrencia sintética por sesión |
| **Pending** | ID, título, minutos enteros, creación, actualización, completado y borrado lógico. No tiene días, franja, ocurrencia diaria, prioridad ni recompensa; se lista aparte y se completa con o sin timer |
| **Event** | ID y acción idempotente, tipo canónico (§9), timestamp, referencias pertinentes y contexto/motivo explícito |
| **Ledger** | Movimiento entero de RC, motivo, timestamp y origen único del crédito o canje; fuente del saldo |
| **Settings** | Audio apagado inicialmente, perfil de sonido, intensidad máxima 0–2 del MVP, tema automático/manual y visibilidad del Monedero (apagado por defecto); preferencias persistentes. El máximo de cambios (3) y el descanso (10 min) son fijos en el primer corte; su ajuste queda para después |

**Estados de ocurrencia:** pendiente, en progreso, parcial, completada, ya realizada fuera de la app o no aplica. Los últimos tres la excluyen de nuevas propuestas para esa fecha.

**Estados de sesión:** corriendo, pausada, esperando confirmación, completada, parcial o abandonada. Completar un escalón cierra su sesión, pero la ocurrencia queda parcial. «Terminar por hoy» cierra una sesión abierta como abandonada y deja la ocurrencia pendiente.

Las duraciones se validan como minutos enteros positivos; un escalón debe ser menor que la duración completa. Una tarea sin días programados permanece en el Mazo pero no entra en la selección automática.

Se guarda el historial al archivar una tarea. Editar una plantilla afecta propuestas aún no iniciadas y ocurrencias futuras, no modifica retrospectivamente sesiones, acuerdos de ocurrencias ya empezadas, ocurrencias cerradas o el ledger. No se repite un cuidado registrado como realizado ni se crea otra ocurrencia para rellenar una franja.

## 14. Fases del producto

### Fase 1 — Primer corte usable

Alcance detallado en §17: datos locales, franjas de hasta tres, tres cambios, cierre de franja, timer persistente, 3-2-1, pausas, bloqueo de tarea/franja, descanso gratuito, ancla visible, sesión rápida, pendientes de una vez, El Reloj y voz local. **Sin ledger ni monedero:** la recompensa de este corte es el descanso.

Se puede probar en localhost cuando estén B1, B3, B4, B10, B11 y B12. La instalación y el offline (A1/A2) se validan antes de la prueba móvil. No se declara el MVP completo hasta completar la segunda capa económica y la validación de salida.

### Fase 1.5 — Economía RC

C1/C2: ledger, recompensa fija, tope por ocurrencia, saldo y canje manual. Se implementa **después del bucle** y antes de la validación completa del MVP. Hasta entonces la app no muestra RC ni promete una recompensa económica.

Se libera cuando pasa la validación funcional de `STATUS.md`; después se realiza **una semana de prueba de uso**, con interrupciones permitidas. Los errores se corrigen durante esa semana. No se exige una racha perfecta para conservar progreso ni se declara validado el producto por haber escrito código.

### Fase 2 — Planificación y acompañamiento ampliados

Anclas externas y exportación `.ics` con límites explícitos, ventanas protegidas por categoría, El Jefe con datos suficientes, evaluación de bonos y temporizador de canje. Presión más personalizada solo con control explícito. No incluye préstamos ni castigos por vida real.

### Fase 3 — Ambientes

Más identidades del mismo bucle, pruebas de novedad y progresión acumulativa sin perder desbloqueos. No siete motores de juego independientes.

### Fase 4 — Inteligencia opcional

Parte, sugerencias de fricción, Dossier y LLM con consentimiento, privacidad y respaldo local. No hace falta para configurar proyectos, leer una carta o usar el timer.

**Fuera del MVP:** LLM, Dossier, nivel 3, múltiples ambientes, Jefe, rachas/desbloqueos, Parte, `.ics`, push, ventanas protegidas por categoría, temporizador de ocio, múltiples ocurrencias diarias de una misma tarea, cuentas, sync, dashboards y motor 2D.

## 15. Cómo evaluaremos si ayuda

No optimizar tiempo dentro de la app ni adicción. Queremos facilitar acciones reales y permitir volver a la vida fuera de la pantalla.

Durante la prueba se observa:
1. Si se recuerda y empieza lo que el usuario considera importante.
2. Cuánto tarda en arrancar después de una propuesta, sin confundir una interrupción con rechazo.
3. Resultados completos y parciales según el tipo de tarea, no solo cantidad bruta de cartas.
4. Si pausar y volver resulta fácil.
5. Si el horario propone cosas pertinentes y no oculta compromisos.
6. Si la presión ayuda o genera rechazo, y si las recompensas resultan comprensibles.
7. Si el usuario quiere volver a usarla sin sentir otra obligación.

Las preguntas breves son: **«¿Abre rápido? ¿Te ayudó a arrancar? ¿Volverías a abrirla?»**. No se obliga al dueño a llenar reportes ni mantener el checklist técnico.

## 16. Decisiones confirmadas

Estas decisiones incluyen las aclaraciones aprobadas en la revisión de alineación. No deben reemplazarse por reglas anteriores del historial.

| Tema | Decisión vigente |
|---|---|
| Nombre e idioma | Runo; español de México, directo y legible |
| Foco | Una carta visible durante el trabajo, con controles esenciales accesibles |
| Mano / franja | Franja de hasta tres; varias por día; solo una abierta; no se pasa a la siguiente hasta resolver la actual |
| Cambios | Tres «Otra» por fecha local, compartidos entre franjas; elegir dentro de la franja es libre; desaparece al agotarse |
| Correcciones | «Ya la hice», «No aplica», vida real y edición no consumen cambios ni provocan presión. En una tarea diaria en sesión activa no hay «dejar pendiente»: pausa, no aplica o terminar por hoy. En un pendiente de una vez, cerrar y dejarlo en la lista es una salida válida |
| Configuración | Agregar, editar y archivar cualquier día; el Parte no es requisito |
| Planificación | Días y franjas opcionales; proyectos A/B son tareas configurables desde MVP |
| Pausa | Persistente; una pausada sigue bloqueando otra tarea; reanudación explícita; cerrar sin pausar deja transcurrir el reloj |
| Urgencia | Con app visible, guardar/pausar antes de presentar la ancla; sin inicio ni reprogramación automáticos |
| Escalones | Opcionales, concretos y parciales; ninguna obligación universal de un minuto |
| Moneda (segunda capa) | 1 RC = 1 min; recompensa fija por variante, con tope por ocurrencia (§6) |
| Economía | RC en segunda capa; descanso gratuito en el primer corte; sin multiplicadores, deuda o préstamos |
| Descanso | 10 min gratis tras completar, saltable, sin RC y sin bloquear la siguiente tarea |
| Sesión rápida | Nombre + minutos desde Hoy o el día cerrado, incluso con una tarea asignada; no es tarea, no entra a franja, no paga RC, no altera el día; una a la vez y persiste para recargar |
| Idioma | Español inicial e inglés, selector en Ajustes y preferencia local; sin rutas de locale; catálogos estáticos y vocabulario ES/EN en todo el UI |
| Pendientes | To-dos de una sola vez con pestaña propia, captura desde Hoy, 25 min iniciales, timer y sin RC; no son tareas recurrentes ni entran a franjas; completados desaparecen |
| Tono inicial | Techo 2, tono efectivo normal 1; modo duro solicitado o con motivo explícito; no por usar cambios |
| Elian / nivel 3 | Reservados para una fase posterior, con habilitación explícita y sin descalificación personal |
| Dirección visual | Minimalismo editorial evolucionado a **Liquid Focus**: Lexend, fondo ambiental, vidrio con fallback, índigo, una acción principal y dock móvil; referencias en `docs/design/references/` |
| Variación del MVP | El Reloj y 5–10 frases locales; audio apagado inicialmente |
| Datos | Local-first, sin login ni envío de datos personales a un LLM en MVP |
| Recordatorios externos | `.ics` después, sin promesa de alarma o takeover garantizados |
| Rendimiento | Objetivo 2 s; liberación <5 s en las condiciones y mediciones de §12 |
| Investigación | C3 midió contraste y consultó WCAG 2.2/WebAIM; D3 implementa zoom, una mano y tema; validación móvil en D4; no validación clínica |
| Validación | Evidencia técnica y móvil diferenciadas; una semana de prueba sin exigir racha perfecta |

## 17. Alcance ejecutable del MVP

### 17.1 Piezas y trazabilidad

Los IDs y el estado viven en `STATUS.md`. Esta tabla asegura que cada requisito tiene trabajo asignado.

| Pieza | IDs de seguimiento | Resultado esperado |
|---|---|---|
| Pruebas y contratos | A7, A3 | Runner de pruebas, modelo versionado e invariantes de persistencia |
| Acceso e instalación | A0, A1 | Origen HTTPS estable e instalación real |
| Arranque offline | A2 | Abrir en frío con assets cacheados, sin necesitar servidor para el bucle |
| Mazo y configuración | A4, B8 | Diez plantillas iniciales, editor accesible y soporte de proyectos por días |
| Registro y selección | A5, A6 | Eventos diferenciados y propuestas elegibles, testeables con reloj/semilla |
| Franjas y tirada | B1, B2, B5 | Franjas de hasta tres, tres cambios diarios, cierre por franja y sin salto con pendientes |
| Asalto y recuperación | B3, B4, B6, B10 | Timer con 3-2-1, confirmación, pausa/reanudación y restauración |
| Bloqueo y descanso | B11, B12 | Bloqueo de tarea/franja con salidas explícitas y descanso gratuito |
| Escalones | B9 | Paso corto opcional, progreso parcial y sin falsear la tarea completa |
| Sesión rápida | B13 | Timer one-off desde Hoy o el día cerrado, fuera del Mazo/franja y sin RC |
| Pendientes de una vez | B14 | Lista persistente separada de las tareas recurrentes, con captura rápida, timer y sin RC |
| Interfaz ES/EN | B15 | Catálogos `es.json`/`en.json`, selector en Ajustes, voz/errores/aria localizados y preferencia offline |
| Economía | C1, C2 | Segunda capa: recompensas fijas e idempotentes, saldo durable y canje manual |
| Identidad y acompañamiento | C3, C4, C5, C6 | El Reloj accesible, Vigía, audio opt-in y voz local |
| Horario y plataforma | D1, D2, D3 | Ancla visible con pausa segura, fallback visual y uso de una mano |
| Validación de salida | B7, D4 | Flujo mínimo completo y criterios de liberación verificados |

### 17.2 Semilla del Mazo

Son **plantillas editables**, no recomendaciones de salud ni una imposición de tiempos. Las duraciones son ejemplos iniciales; el usuario puede cambiarlas cualquier día.

| Carta | Días / horario inicial de ejemplo | Completa | Escalón opcional | Prioridad |
|---|---|---|---|---|
| Creatina + Vitamina D | Según rutina configurada por el usuario* | 2 min | — | 3 |
| Darle las vitaminas a Elian | Según rutina configurada por el usuario* | 3 min | — | 3 |
| Cepillarme los dientes | Diario | 3 min | Preparar el cepillo, 1 min; no completa la higiene | 3 |
| Hacerme un café | Diario, franja sugerida editable 06:00–12:00 | 5 min | — | 3 |
| Bañarme | Diario | 15 min | Preparar ropa/toalla, 1 min | 2 |
| Desayuno | Diario, franja sugerida editable 06:00–12:00 | 15 min | Preparar ingredientes, 1 min | 2 |
| Sacar mocos a Elian | Solo según necesidad/rutina configurada* | 3 min | — | 2 |
| Lavar ropa | Lunes | 15 min | Meter ropa a la lavadora, 1 min | 2 |
| Aseo de la casa | Lunes | 30 min | Recoger cinco cosas, 1 min | 2 |
| Prepararme para el gym | Lun–vie, hora 18:00, franja 18:00–18:30 | 30 min | Preparar ropa del gym, 1 min | 3 |

\* Las tres plantillas de suplementos/cuidados se crean **sin días programados hasta que el usuario configure su rutina**. La app no inventa dosis ni frecuencia y no bloquea el primer uso para pedir esa configuración. No se vuelven a sugerir para una fecha una vez registradas como realizadas. Los timers son ayudas de organización, no instrucciones sobre cómo realizar un cuidado.

La app filtra por horario y ordena por prioridad. El café y el desayuno quedan en la mañana; el gym conserva su hora fija de ejemplo. Las tareas sin hora siguen siendo elegibles durante el día y pueden aparecer en la franja que corresponda. Ninguna franja se rellena con tareas incompatibles con el momento.

Proyecto A los lunes y Proyecto B los martes son **casos de prueba del editor y del motor**, no proyectos reales inventados en el Mazo del usuario. La semilla de diez plantillas se crea una sola vez; las actualizaciones no la recrean ni sobrescriben las ediciones.

### 17.3 Orden de construcción y validación

1. **A · Cimiento:** A7 (pruebas y baseline), A3 (contratos/DB), A4–A6 (semilla/eventos/selección). A1–A2 (instalación y shell offline) se hacen antes de la validación móvil y no bloquean el bucle local. A0 se resuelve antes de la primera validación móvil.
2. **B · Bucle:** apertura por franjas, tres cambios, timer/3-2-1, bloqueo de tarea/franja, pausa, cierre de franja, descanso, editor, sesión rápida, pendientes de una vez e interfaz ES/EN. No cerrar el bloque sin cubrir todos sus IDs.
3. **C · Economía y piel:** primero C1/C2 (segunda capa) y luego accesibilidad/El Reloj, Vigía, audio y banco local de frases. Coordinar B9 con C1 para probar el tope de recompensa.
4. **D · Horario y pulido:** ancla con interrupción segura, fallbacks, una mano y validación de salida.

Se trabaja un ID a la vez. Las pruebas técnicas pueden avanzar mientras una validación en teléfono está pendiente; no se declara hecha esa validación ni se oculta el pendiente. No desplegar ni escoger servicios de pago sin autorización.

### 17.4 Qué significa terminado

La **lista única de criterios de liberación**, sus resultados y la prueba de uso viven en [`STATUS.md`, sección «Validación de salida del MVP»](./STATUS.md#validación-de-salida-del-mvp). No mantener otro checklist paralelo aquí.

Un MVP listo para probar exige los requisitos funcionales, sus pruebas aplicables y la validación móvil; no basta contar tareas ni marcar ocho criterios demasiado generales. La semana de uso valida utilidad y permite ajustar hipótesis, no certificar un efecto clínico.

## 18. Regla de entrega

**Primero un bucle pequeño que se pueda usar de verdad.** Las mejoras se eligen a partir de lo que ocurra al usarlo, no por completar toda la visión antes de entregar.

No construir una experiencia adictiva como objetivo en sí mismo: construir una herramienta a la que sea fácil volver, que ayude a actuar y permita salir sin culpa.
