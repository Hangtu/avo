# Runo — plan vigente

> Resumen operativo (2026-11-01). La especificación completa v1.11 está en [`docs/archive/2026-11-01/plan-v1.11.md`](./docs/archive/2026-11-01/plan-v1.11.md); este archivo manda para el trabajo diario.

## Qué es

App personal de hábitos, pendientes y timer con presión configurable. Un solo usuario, español de México. Busca ayudar a actuar y volver a la vida, no maximizar tiempo dentro de la app.

## Cómo se comporta

- **Hoy:** una carta principal («Ahora») y una alternativa asomada; al tocarla se vuelve principal. Nunca un dashboard durante el timer.
- **Franjas:** hasta 3 tareas, varias por día, solo una abierta. Se resuelve antes de avanzar (hecha, ya la hice, hoy no o cambiada). Se reevalúa al abrir/volver y cada hora; conserva al menos dos visibles y lo empezado.
- **Missed:** si la ventana de una tarea termina y sigue sin resolver, permanece viva ese día con la etiqueta «Aún puedes» y su turno visible. Puede empezar tarde, con el timer normal. Dentro de la misma prioridad se ordena antes que la ventana activa y que una tarea sin hora; no se marca sola como «Hoy no» ni pasa al día siguiente.
- **Cierre:** «Terminar por hoy» abre una revisión neutral de lo no resuelto, separada en «Aún puedes» y «Quedó para después», con Empezar, Ya está hecho y Hoy no. Cerrar sin resolver deja las ocurrencias pendientes, sin castigo.
- **Cambios:** 3 por fecha local, compartidos entre franjas. Elegir entre las visibles es libre; sin alternativa no se gasta. Al agotarse desaparece «Otra», pero las correcciones siguen.
- **Correcciones:** «Ya la hice» y «Hoy no» son neutrales, piden confirmación y no gastan cambios. «Hoy no» muestra una frase local de aliento. Cancelar siempre conserva la tarea.
- **Timer:** una sola sesión activa (corriendo o pausada). Pausa explícita persistente; volver no reanuda solo. Reloj de pared, sin acumular intervalos. Cerrar sin pausar deja correr el reloj. Cero no completa ni paga: confirma. Un pendiente de una vez puede cerrarse y quedarse en su lista.
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

## Técnica

- Next 16.4.3, React 19.3, TypeScript y Tailwind v4; App Router y Server Components por defecto.
- IndexedDB/Dexie es la fuente local; no se lee en SSR. Dominio puro con reloj/semilla explícitos.
- Neon + Drizzle solo en servidor (E1–E3): copia manual con passcode, sin login ni sync. `DATABASE_URL` pooled; migraciones por URL directa.
- Offline con service worker y assets cacheados. `.ics`, push y sync no están en el MVP.
- Privacidad: sin LLM ni analítica de terceros en el MVP.

## Límites

No ampliar por iniciativa propia a: RC visibles, LLM, sync bidireccional, cuentas, rachas o castigos, `.ics`/push, dashboards, motor 2D ni nivel 3/Elian. E4 necesita una decisión explícita.
