# Glosario de Avo

Vocabulario del producto y del código. Un concepto, una palabra. Las reglas de
nombres están en [`docs/agent-kit/standards/naming.md`](../agent-kit/standards/naming.md).

| Término | Significado | En código |
|---|---|---|
| **Avo** | Marca visible y nombre de la app. | `siteName`, textos de UI |
| **Runo** | Nombre técnico legado de la app (bases IndexedDB, claves de almacenamiento, ramas Neon). Se conserva para no romper datos existentes; **no** es la marca visible. | `runo`, `runo-…`, `RunoDatabase` |
| **Espacio** | Ámbito de datos local: invitado o una cuenta concreta. Los espacios no se mezclan. | `space`, `databaseNameForUser`, `GUEST_SPACE` |
| **Invitado** | Espacio local sin cuenta ni red. Es el modo por defecto. | `guest`, `GUEST_SPACE` |
| **Cuenta** | Identidad opcional (Google/Facebook) con datos aislados y recuperación selectiva. | `account`, `accountId` |
| **Carta** | La tarea principal que se muestra en Hoy; hay una alternativa asomada. | `card`, `TaskDeck` |
| **Franja** | Ventana de hasta tres tareas con una abierta. Es el término de producto; se conserva en identificadores por vocabulario de dominio. | `Franja`, `franja`, `ensureFranja` |
| **Pendiente** | Elemento sin hora fija que se puede completar una vez. | `Pending`, `pending` |
| **Ocurrencia** | Instancia de una tarea en una fecha concreta. | `Occurrence`, `occurrenceId` |
| **Ancla** | Tarea con hora fija que reclama atención al llegar su ventana. | `Anchor`, `findDueAnchor`, `anchor` |
| **Mano** | Oferta de hasta tres tareas que se presenta junta. | `Hand`, `handId` |
| **Sesión** | Ejecución de una tarea (completa o primer paso) con timer. | `Session`, `sessionId` |
| **RC** | Unidad de recompensa interna; cero no completa ni paga. | `Rc`, `rewardCapRc` |
| **Incorporación** | Adopción consentida de datos del invitado a una cuenta. | `guest-import`, `incorporate` |
| **Revisión** | Versión monotónica de una entidad para resolver conflictos. | `revision`, `baseRevision` |
| **Recibo** | Registro idempotente de una mutación aplicada. | `receipt`, `operationId` |
| **Corrección neutral** | Cambio de una tarea ya registrada que no castiga ni reabre el día. | `neutral`, `correction` |

## Convenciones

- Los identificadores, archivos, comentarios y commits se escriben en **inglés**
  (NAME-1). Los términos de esta tabla son la excepción deliberada de dominio:
  `franja` y `runo` describen conceptos del producto o claves persistidas y se
  mantienen tal cual.
- El texto de cara al usuario vive en `messages/es.json` y `messages/en.json`,
  nunca en identificadores (NAME-1, RC-16).
- No introduzcas sinónimos nuevos: si necesitas otro término, actualiza esta
  tabla y el contrato antes de usarlo en código.
