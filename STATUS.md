# STATUS — Runo

> Resumen al 2026-11-01. Historial y detalle completo en [`docs/archive/2026-11-01/STATUS-completo.md`](./docs/archive/2026-11-01/STATUS-completo.md).

## Ahora

- **B16 (segunda carta asomada) 🧪:** implementado y verificado localmente; falta la revisión visual del dueño.
- **B17 (missed y cierre con revisión) 🧪:** implementado y verificado localmente; falta la revisión visual del dueño. Criterio: una tarea con ventana terminada sigue viva hoy, se etiqueta «Aún puedes» con su turno visible, puede empezar tarde y se ordena antes que la ventana activa dentro de su prioridad; «Terminar por hoy» revisa lo no resuelto sin cambiar estados por su cuenta.
- **Sin commit ni deploy:** los cambios viven en el working tree. Producción (`https://runo-mu.vercel.app`) sigue con la carta única de E3.
- **Últimos ajustes:** confirmaciones de «Ya está hecho», «Hoy no» (con frase local), «Ya lo hice» y «Quitar»; contador de Pendientes elevado en el dock; «Hoy no aplica» tachado y con distintivo ámbar; tareas missed con etiqueta naranja «Aún puedes»; revisión de cierre; confirmaciones directas en «Ya está hecho», «Hoy no» y pendiente hecho.

## Hecho

- MVP local-first: Hoy por franjas, timer/3-2-1, pausa persistente, descanso, escalón, sesión rápida, pendientes de una vez, editor por día, ES/EN y offline.
- Economía: ledger, saldo y canje implementados y probados, pero ocultos del MVP visible (segunda capa).
- Nube: E1 esquema, E2 migración y semilla en Neon, E3 copia manual con passcode; sin sync. E4 no iniciada.
- Calidad: **253/253 tests** en local, UTC y America/Mexico_City; `typecheck`, `lint`, `build` y `diff --check` pasan.
- UI verificada en Chrome headless sobre dev y build de producción, sin errores de consola.
- «Hoy no aplica»: título tachado y distintivo ámbar con icono; verificado en build de producción en claro/oscuro y UI clásica/liquid con una fila de muestra, no con datos reales.
- Missed: verificado con datos sembrados a las 19:xx en build de producción: café y desayuno de la mañana aparecen con «Aún puedes» y su turno, el café arranca tarde, la revisión de cierre los separa y «Hoy no» los quita sin gastar cambios. Falta la revisión del dueño.
- **12/16 criterios de salida:** faltan G01/G02/G03/G13, que dependen de teléfono.

## Siguiente

1. Reiniciar `npm run dev` y revisar en `http://localhost:3000`: B16, B17, las confirmaciones, el contador del dock, «Hoy no aplica» tachado en ámbar y el flujo missed/cierre.
2. Decidir commit y deploy (no hechos).
3. Probar en teléfono `https://runo-mu.vercel.app`: instalar, abrir standalone, reabrir en modo avión y cubrir G01/G02/G03/G13, C5 (audio real), D2 (vibración/iPhone) y D3 (accesibilidad/zoom).

## Pendientes conocidos

- Sin evidencia de teléfono: instalación/PWA, offline real, wake lock, audio audible, vibración, zoom y safe areas.
- Semana de prueba de uso: no iniciada.
- El dev actual de `:3000` no recargó el CSS editado por herramienta; reiniciar `npm run dev` para ver el cambio. Ya está validado en el build de producción.
- `127.0.0.1` no hidrata el dev (Next solo acepta su hostname inicial); para aislar datos usar `localhost` con un perfil desechable.

## Reglas de evidencia

⬜ pendiente · 🟡 en curso · 🧪 verificado técnicamente, falta móvil · ✅ criterio cumplido · ⛔ bloqueado.

No inventar pruebas del dueño. Una compilación no prueba el flujo. Registrar comandos, resultados y límites.
