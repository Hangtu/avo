# Runo

App personal de hábitos y sesiones de enfoque, local-first y sin login.
El MVP se está construyendo por partes: B1 muestra la franja actual, B2 ofrece tres
cambios diarios, B3 conecta el timer con 3-2-1 y vencimiento, B4 resuelve resultados,
B5 cierra la franja y el día, B8 agrega el editor, B9 usa el paso corto, B10 pausa,
B11 descansa y B12 consolida el bloqueo. La restauración/medianoche y la instalación
móvil siguen pendientes.

## Antes de trabajar

- [AGENTS.md](./AGENTS.md): instrucciones para agentes.
- [STATUS.md](./STATUS.md): estado real, siguiente ID y evidencia.
- [plan.md](./plan.md): contrato de producto y alcance.

## Desarrollo

Desde la raíz del repositorio (el directorio interior `runo/runo`):

```bash
npm ci
npm run dev
```

Abrir la URL indicada por Next. No hace falta HTTPS para desarrollar en localhost.
Instalación y validación móvil requieren un origen HTTPS estable todavía pendiente.

## Verificación

```bash
npm test
npm run test:watch
npm run typecheck
npm run lint
npm run build
```

Vitest ejecuta pruebas de dominio y persistencia en Node. `fake-indexeddb`
solo se carga desde el setup de tests: sus resultados no certifican soporte móvil.
Las pruebas no requieren red, cuentas ni claves de API.

Para probar el build de producción: `npm run build` y luego `npm run start`.
El funcionamiento offline necesita además el service worker previsto en A2;
IndexedDB por sí solo no permite cargar la app en modo avión.

## Diseño

Dirección minimalista editorial: Lexend self-hosted con `next/font`, papel cálido,
tinta oscura, un acento bermellón y reglas finas sin sombras. Referencias y reglas en
[`plan.md` §10](./plan.md#10-diseño-accesibilidad-e-investigación-pendiente) y
[`docs/design/references/`](./docs/design/references/README.md).

## Datos

La capa de datos usa IndexedDB por origen mediante Dexie, con esquema versionado.
Cerrar una conexión no borra sus registros; borrar el almacenamiento del navegador sí.
No hay backup ni sincronización entre dispositivos en el MVP.

## Mapa de implementación

- `lib/domain/`: contratos, validaciones, calendario local, selección pura de cartas y armado de la franja.
- `app/_components/`: interfaz cliente; `runo-home.tsx` es la apertura por franjas y `session-view.tsx` el timer.
- `lib/db/`: esquema Dexie, repositorio, semilla transaccional y eventos append-only.
- `tests/`: setup y fixtures; cada test usa una DB aleatoria con prefijo seguro.

El dominio no depende de React. Reloj y semilla se pasan explícitamente al motor.
El repositorio fija snapshots al iniciar y exige un `actionId` estable para reintentar
una edición sin sobrescribir cambios posteriores. La semilla se ejecuta explícitamente,
no al importar módulos ni durante un render de servidor.

B1 conecta la capa de datos a la apertura por franjas, B2 a los cambios, B3 al timer,
B4 a los resultados, B5 al cierre de franja/día, B8 al editor, B9 al escalón, B10 a la
pausa, B11 al descanso y B12 al bloqueo. Todavía faltan restauración/medianoche,
pruebas móviles e instalación: consultar siempre `STATUS.md` en lugar de asumir que
los tests unitarios significan que el MVP ya está listo para uso.
