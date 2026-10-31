# Runo

App personal de hábitos y sesiones de enfoque, local-first y sin login.
El MVP se está construyendo por partes: el bloque B (bucle completo), A1/A2 (PWA/offline),
C1–C6 (ledger, monedero, contraste, Vigía, audio y voz), D1 (ancla), D2
(fallbacks de plataforma), D3 (una mano y tema cálido) y la validación local
de D4 (12/16 criterios) están listos técnicamente, con **Liquid Focus** y la
carta **Ahora** como base; sonido, voz, tema y visibilidad del Monedero viven en Ajustes. El origen HTTPS es **https://runo-mu.vercel.app**.
Falta la instalación/prueba en teléfono y el cierre móvil de G01/G02/G03/G13.

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
La instalación y la validación móvil se hacen desde el origen HTTPS desplegado.

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
`npm run build` genera también `public/sw.js`; al instalar descubre los assets reales
del HTML (chunks, CSS y fuentes) para tolerar las rutas de Vercel. El service worker
se registra solo en producción; `next dev` no lo activa.

## Probar en el teléfono

Origen estable: **https://runo-mu.vercel.app**

1. Ábrelo en el navegador del teléfono.
2. Añádelo a inicio / instálalo y ábrelo standalone.
3. Cierra la app, activa modo avión y vuelve a abrirla.
4. Comprueba que aparecen tus tareas y que una sesión o saldo ya guardados siguen ahí.

No hay datos de uso en el servidor: IndexedDB vive en el teléfono.

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

El bucle B está completo, A1/A2 cubren PWA/offline, C1/C2 acreditan y canjean RC, C3
documenta contraste real con WCAG/WebAIM, C4 añade el Vigía, C5 el audio opt-in, C6
la voz local, D1 el ancla visible, D2 los fallbacks de plataforma, D3 la
accesibilidad de una mano/tema y D4 la validación local. El origen HTTPS
**https://runo-mu.vercel.app** ya está desplegado. Todavía faltan la instalación
en teléfono y las pruebas móviles de G01/G02/G03/G13: consultar siempre `STATUS.md` en lugar de
asumir que los tests unitarios significan que el MVP ya está listo para uso.
