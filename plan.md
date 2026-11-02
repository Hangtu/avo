# Runo — plan vigente

> Plan operativo actualizado el 2026-11-02. La especificación anterior v1.11 está en [`docs/archive/2026-11-01/plan-v1.11.md`](./docs/archive/2026-11-01/plan-v1.11.md); este archivo manda para el trabajo diario. E4-D1/D2/D3 están confirmadas y el dueño autorizó comenzar la implementación. E4.1 tiene decisión técnica; E4.2 prepara esquema/espacios, sin login ni sync habilitados. La evidencia y siguiente acción están en `STATUS.md`.

## Qué es

App personal de hábitos, pendientes y timer con presión configurable, en español de México y con ES/EN. Busca ayudar a actuar y volver a la vida, no maximizar tiempo dentro de la app.

Se conserva el uso **sin cuenta, en el navegador**. El nuevo alcance permite **iniciar sesión con Google o Facebook** para guardar y recuperar los datos duraderos de cada persona en Neon. Son espacios personales separados, no funciones de colaboración.

## Cómo se comporta

- **Hoy:** una carta principal («Ahora») y una alternativa asomada; al tocarla se vuelve principal. Nunca un dashboard durante el timer.
- **Franjas:** hasta 3 tareas, varias por día, solo una abierta. Se resuelve antes de avanzar (hecha, ya la hice, hoy no o cambiada). Se reevalúa al abrir/volver y cada hora; conserva al menos dos visibles y lo empezado.
- **Missed:** si la ventana de una tarea termina y sigue sin resolver, permanece viva ese día con la etiqueta «Aún puedes» y su turno visible. Puede empezar tarde, con el timer normal. Dentro de la misma prioridad se ordena antes que la ventana activa y que una tarea sin hora; no se marca sola como «Hoy no» ni pasa al día siguiente.
- **Cierre:** «Terminar por hoy» abre una revisión neutral de lo no resuelto, separada en «Aún puedes» y «Quedó para después», con Empezar, Ya está hecho y Hoy no. Cerrar sin resolver deja las ocurrencias pendientes, sin castigo.
- **Cambios:** 3 por fecha local, compartidos entre franjas. Elegir entre las visibles es libre; sin alternativa no se gasta. Al agotarse desaparece «Otra», pero las correcciones siguen.
- **Correcciones:** «Ya la hice» y «Hoy no» son neutrales, piden confirmación y no gastan cambios. «Hoy no» muestra una frase local de aliento. Cancelar siempre conserva la tarea.
- **Timer:** una sola sesión activa (corriendo o pausada) dentro del espacio local en uso. No hay continuidad ni bloqueo global del timer entre dispositivos. Pausa explícita persistente; volver no reanuda solo. «Terminé» y «Hoy no» piden confirmación; «Pausar» cubre la vida real, sin botón «El bebé». Reloj de pared, sin acumular intervalos. Cerrar sin pausar deja correr el reloj. Cero no completa ni paga: confirma. Un pendiente de una vez puede cerrarse y quedarse en su lista.
- **Escalón:** primer paso opcional y parcial; no completa la tarea ni se cobra dos veces.
- **Horarios y ancla:** se filtra por días/franja antes de priorizar. Un ancla visible pausa la sesión anterior, se presenta una vez y no inicia timer ni mueve citas.
- **Audio:** apagado al inicio; mute persistente; ruido marrón/rosa, lluvia, olas y tic-tac; siempre feedback visual. Vibración y wake lock con fallback; no prometer avisos con la app cerrada.
- **Presión:** techo 2, tono normal 1; 5–10 frases locales sin LLM; duro solo a pedido o con motivo. Sin castigos ni rachas.
- **Descanso:** 10 min gratis al completar, saltable. RC (1 RC = 1 min) quedan para la segunda capa y no se muestran en el MVP.
- **Sesión rápida:** nombre + minutos desde Hoy o día cerrado; no es tarea, no entra a franja, no paga RC y no altera el día.
- **Pendientes:** lista aparte para cosas de una vez; 25 min iniciales; timer directo; no entra a franjas ni paga RC. E4 añade el guardado del estado final y un histórico sencillo de completados (E4.5.1), no del timer.
- **Editor:** cualquier día; duración y al menos un día obligatorios; franja/hora, prioridad y escalón opcionales; orden visual por arrastre dentro de cada sección.
- **Lenguaje y ayuda:** textos cotidianos; instrucciones en iconos `i`; ES/EN desde Ajustes, sin rutas de locale.
- **Dock:** cuatro accesos (Hoy, Hábitos, Pendientes, Ajustes) y contador discreto de pendientes abiertos.

## Técnica

- Next 16.4.3, React 19.3, TypeScript y Tailwind v4; App Router y Server Components por defecto.
- IndexedDB/Dexie es la fuente local; no se lee en SSR. Dominio puro con reloj/semilla explícitos.
- **Implementado (E1–E3):** Neon + Drizzle solo en servidor, copia manual con passcode, sin login social ni restauración. `DATABASE_URL` pooled; migraciones por URL directa.
- **E4 en implementación:** Better Auth 1.7.15 + adaptador Drizzle para cuenta opcional, Google/Facebook vinculados mediante correo verificado y prueba de control. E4.2 añade primitivas locales/esquema; la migración no se aplicó a Neon. Login, recuperación y sync selectivo siguen pendientes. Incluye estado final/histórico de pendientes; excluye timer y eventos de ejecución. Decisión y límites en [`docs/cloud/2026-11-02-e4-auth-and-spaces.md`](./docs/cloud/2026-11-02-e4-auth-and-spaces.md).
- Offline con service worker y assets cacheados. `.ics` y push no están en el MVP.
- Privacidad: sin LLM ni analítica de terceros en el MVP. Autenticación no implica permisos de publicidad, contactos ni publicación en redes.

## E4 · Cuenta opcional y persistencia selectiva por usuario

### 1. Alcance acordado y límite de esta entrega

El dueño decidió ampliar el MVP a Google/Facebook y recuperación entre dispositivos, manteniendo IndexedDB/Dexie, y después pidió **comenzar la implementación**. Se autoriza trabajo local por el orden de IDs, no deploy, contratación/configuración de servicios ni migración de datos reales sin autorización específica. E4.2 está iniciado con librerías, esquema, migración revisada y primitivas de espacios; no habilita OAuth ni sync.

Contrato del nuevo modelo:

1. Sin login, Runo funciona como hoy: los datos se guardan localmente y no se envían como datos de usuario a Neon.
2. Con login, el navegador sigue leyendo y escribiendo localmente para responder rápido y funcionar offline. Los datos duraderos se guardan en la cuenta y se recuperan al entrar desde otro navegador/dispositivo.
3. La primera incorporación de datos invitados requiere confirmación e importa únicamente el conjunto permitido de datos duraderos, **no una copia de toda IndexedDB**. Las entradas posteriores recuperan y reconcilian; no vuelven a subir todo ni reemplazan la cuenta a ciegas.
4. Guardar cambios de una rutina o quitarla puede provocar una escritura remota. Un tick, empezar, pausar, reanudar o terminar una rutina no la provoca. **Completar un pendiente de una vez sí guarda su estado final**, una sola vez, para retirarlo de abiertos y conservar su histórico.
5. No tener cuenta, cancelar el login o fallar la red nunca impide usar el modo local ni borra datos.
6. Una sola base y tablas compartidas con filas separadas por `user_id`; **no una base o un juego de tablas por persona**. Tener esa columna no basta: identidad, claves, relaciones y consultas deben aislar cada cuenta.
7. Google y Facebook son métodos de acceso a la **misma cuenta** cuando se acredita el mismo correo y el control de las identidades (E4-D3 / E4.3.1), no dos espacios independientes. El `user_id` interno permanece estable.

**Consecuencia del alcance base:** completar una rutina recurrente, «Hoy no», cambios de franja y cerrar el día solo afectan ese navegador/espacio local. En otro dispositivo la rutina puede seguir pendiente. No se recuperan el timer, la pausa, el historial diario de rutinas ni el saldo desde la cuenta. La excepción confirmada es el estado final y el histórico de **pendientes de una vez** (E4-D2 / E4.5.1).

### 2. Qué existe de verdad y qué falta

| Pieza actual | Evidencia en el repositorio | Qué se reutiliza / qué falta |
|---|---|---|
| Dominio y persistencia local | `lib/domain/`, `lib/db/database.ts`, `lib/db/local-space.ts`, `lib/db/repository.ts` | Primitivas de DB/claves por espacio probadas localmente; la UI todavía abre `runo` como invitado. Falta selección autenticada y ciclo de cambio de cuenta. |
| Modelo remoto | `lib/db/schema.ts`, `lib/db/auth-schema.ts`, `drizzle/`, E1/E2 en `STATUS.md` | E4.2 define identidades/sesiones auth, vínculo de usuario y claves/FKs de dueño. `0002_account_spaces.sql` probada en PostgreSQL/WASM local, aún no en Neon. |
| Acceso E3 | `lib/cloud/auth.ts`, `app/api/cloud/auth/route.ts` | Passcode único y cookie para `RUNO_OWNER_ID` o `owner`. **No es autenticación multiusuario**. |
| Copia E3 | `lib/db/backup.ts`, `lib/cloud/snapshot.ts`, `lib/cloud/repository.ts` | Exporta también sesiones, eventos, ocurrencias y ledger; reemplaza todo el espejo del dueño. Sus validaciones sirven como referencia, no como protocolo E4. |
| Lectura remota | `GET` en `app/api/cloud/backup/route.ts` | Solo devuelve fecha y conteos; **no devuelve las rutinas para restaurarlas**. |
| UI de copia | `app/_components/cloud-backup.tsx` | El componente existe, pero el `settings-view.tsx` actual no lo importa ni lo renderiza. No asumir que la copia/borrado remoto está accesible desde Ajustes en este árbol. |
| Privacidad F01 | `app/privacy/`, `app/data-deletion/`, borrado local y `DELETE` de copia | Trabajo local sin deploy ni prueba de borrado autenticado real. El aviso declara que no hay OAuth; deberá cambiar antes de habilitar los proveedores. |

**No está integrado todavía:** Google/Facebook login, autorización por cuenta, restauración de contenidos, aislamiento/cambio de cuentas en UI, cola de cambios offline ni resolución de conflictos. Las primitivas de E4.2 no equivalen a esos flujos. No es solo sustituir el passcode.

### 3. Matriz de persistencia

Esta matriz define la proyección E4. Que una tabla ya exista en Neon no significa que deba recibir escrituras del nuevo flujo. E4-D1/D2/D3 están confirmadas; los detalles técnicos de E4.1 están en el registro de auth/espacios enlazado arriba.

| Datos / acción | En el navegador | En la cuenta de Neon | Disparador remoto |
|---|---|---|---|
| Identidad de cuenta | Referencia al espacio local; sin secretos OAuth en IndexedDB | ID interno, correo de cuenta verificado y vínculos Google/Facebook; mínimos datos necesarios | Login y vinculación autorizada; nunca por simple coincidencia de texto |
| Rutinas (`tasks`) | Definición completa | Título, categoría, duración, días, franja/hora, prioridad, escalón y archivo/reactivación | Crear, guardar una edición, archivar o reactivar |
| Pendientes de una vez (`pendings`) | Contenido y estado local | Alta, retirada explícita y estado final de completado con su fecha | Crear, quitar o completar. La finalización es idempotente; no agregar un editor nuevo |
| Histórico de pendientes completados (E4.5.1) | Listado local, también disponible sin login | Registro final con ID, título y fecha de completado; recuperable en otros dispositivos | La misma escritura de finalización, no un log adicional de cada acción |
| Preferencias portables | Copia local | Idioma ES/EN, tema elegido, tono 0–2, sonido elegido y mapa tipado ID de rutina → posición finita del editor | Cambio explícito guardado; idioma/orden deben pasar del almacenamiento UI a la transacción durable antes de sincronizar |
| Permisos y controles del dispositivo | Sí | No: audio activado/mute, visibilidad local del Monedero, permisos, wake lock, vibración, borradores y secciones abiertas | Ninguno; audio apagado al iniciar en un dispositivo nuevo |
| Ejecución de rutina | `occurrences`, `days`, `hands`, `sessions`, eventos y ledger locales | No: tick, inicio, pausa, reanudación, expiración, completado, parcial, «Ya la hice», «Hoy no», cambios/cierre y RC | Ninguno, tampoco durante la importación inicial |
| Coordinación de datos duraderos | Cola local, revisiones y recibos de importación por cuenta | Versiones, recibos idempotentes y marcas mínimas de eliminación | Solo importación, lectura/reconciliación o cambios duraderos; no analítica |

**No sincronizar filas completas por conveniencia.** Por ejemplo, una actualización del nombre de una rutina no debe arrastrar su progreso; una preferencia portable no debe activar audio en otro equipo. El orden se vuelve un dato durable tipado, no un volcado de `localStorage`. Los eventos locales existentes no se usan como cola de red: mezclan actividad del timer con ediciones de configuración.

### 4. Identidad y aislamiento

**E4.2 / E4.3** deben resolver lo siguiente antes de aceptar datos de cuentas:

- ID interno de Runo independiente de Google/Facebook. Un vínculo se identifica por proveedor + ID estable del proveedor, no por nombre ni correo. Facebook puede no proporcionar correo. En E4.2, garantizar unicidad de la identidad de proveedor y del correo verificado de cuenta según la normalización elegida; crear/vincular en transacción para que dos callbacks simultáneos no creen cuentas duplicadas.
- Una solución mantenida de autenticación, compatible con la versión instalada de Next y ambos proveedores. Elegir biblioteca/servicio leyendo su documentación vigente; Neon como base no instala OAuth automáticamente. No desarrollar un protocolo OAuth propio ni contratar servicios en este paso.
- Callbacks, comprobaciones de proveedor y protecciones `state`/`nonce`/PKCE cuando correspondan, mediante la solución elegida. Credenciales solo en servidor; cookie de sesión protegida; validación y revocación del lado servidor. Permisos mínimos de identificación, sin Pixel, contactos ni publicaciones.
- El servidor obtiene `user_id` de la sesión verificada; no acepta el dueño propuesto por el cliente. Lectura, edición, restauración y eliminación filtran por esa identidad. Las referencias a otras filas también deben pertenecerle.
- El esquema E3 tenía PK globales de texto y IDs deterministas como `seed:coffee`. **Añadir filtros no elimina esas colisiones.** E4.2 define claves/FKs compuestas por usuario + ID, preservando IDs locales e incorporando dueño en `hand_items`. Migración revisada y probada localmente; pendiente validación en Neon de desarrollo.
- Espacios locales independientes: invitado mantiene `runo`; cuenta usa `runo:account:v1:<ID interno codificado>`, incluidos runtime/metadata y claves de preferencias/borradores. Las primitivas existen; falta integrar selección autenticada, cola y ciclo seguro de UI. Nunca mostrar la caché de A como invitado o como B.
- **E4.3.1 · Una cuenta, dos métodos de acceso:** E4-D3 confirma una sola cuenta para el mismo correo. El correo verificado es atributo de la cuenta, no su PK ni el identificador del proveedor. Definir una normalización conservadora; no deducir equivalencia por alias, puntos, nombre visible o parecidos.
- Si un proveedor nuevo entrega un correo ya asociado, no devolver datos ni crear otra cuenta automáticamente: pedir entrar con el método ya vinculado y confirmar la vinculación con autenticación reciente, demostrando control de ambas identidades. Tras completarla, cualquiera de los métodos abre el mismo `user_id`, caché y cola; no se importan dos veces los datos.
- Si falta el correo o no hay evidencia confiable de verificación, no usarlo para asociar cuentas. E4.1 decide verificación independiente de correo para alta nueva mediante mecanismos de Better Auth y entrega SMTP configurada; sin ese transporte, bloquear el alta insegura y ofrecer invitado/Google. Desde una cuenta verificada se puede vincular explícitamente acreditando ambos controles. La inscripción/verificación pendiente no puede crear datos de dominio ni reservar una cuenta operativa con un método no probado. No afirmar que Facebook siempre entrega correo verificado; verificar ambos órdenes en E4.3.1 antes de cerrarlo.
- Un cambio de correo en un proveedor ya vinculado no mueve los datos a otra cuenta ni altera el `user_id`. Dos cuentas internas preexistentes no se fusionan por coincidencia de correo; detener la vinculación y preservar ambas hasta resolver su titularidad explícitamente.
- No compartir cachés HTTP, service worker o Cache Components con datos privados entre usuarios. Respuestas personales no se guardan en la caché pública de la PWA.

### 5. Entrada, importación y recuperación

**E4.4** implementa los flujos siguientes, con escritura local transaccional y sin destruir el origen:

| Situación | Comportamiento esperado |
|---|---|
| Usar sin cuenta | Abrir el espacio invitado y seguir como hoy. No escrituras de datos personales en Neon. |
| Cancelar/fallar OAuth | Volver al mismo espacio local, sin modificaciones ni importación parcial. |
| Invitado con datos + cuenta vacía | Mostrar la propuesta de incorporación de E4-D1 y su resumen; importar la proyección durable solo al aceptar. Conservar el origen hasta recibir confirmación del servidor; reintentar sin duplicar. Rechazar deja los datos invitados intactos. |
| Cuenta con datos + navegador sin datos propios | Descargar a la partición de esa cuenta. No sembrar primero las diez rutinas ni subir valores predeterminados sobre lo existente. |
| Invitado con datos + cuenta con datos | Aplicar E4-D1: revisión de incorporación, nunca reemplazo silencioso. No deduplicar por título; dos rutinas con el mismo nombre pueden ser intencionales. |
| Reingreso en un navegador ya asociado | Abrir la partición correcta y reconciliar cambios pendientes. Google/Facebook ya vinculados abren ese mismo espacio. No reimportar el invitado ni perder ediciones offline por una descarga. |
| Login con otra cuenta | Cerrar el espacio anterior y abrir el suyo; nunca enviarle la cola/caché de la cuenta anterior. Un conjunto invitado ya importado no se adjudica automáticamente a una segunda cuenta. |
| Sin red | Un login nuevo requiere conexión. Se puede seguir en el espacio de cuenta ya activo, si no hubo logout explícito, sin afirmar que la sesión de servidor sigue vigente. Después de logout no se reabre esa caché solo por elegir un nombre de cuenta. |

**Confirmación de incorporación (E4-D1):** texto propuesto: «Hay rutinas guardadas solo en este dispositivo. ¿Quieres agregarlas a tu cuenta?». Mostrar resumen de rutinas, pendientes abiertos y completados que se incorporarían, cuenta destino y cualquier conflicto, antes de confirmar. Permitir agregar lo seleccionado o conservarlo solo en el dispositivo; cancelar no cambia ninguno de los lados. No repetir la pregunta en cada apertura tras rechazarla; permitir volver a la acción de incorporación sin forzarla.

La primera importación incluye los pendientes completados como **registros finales de su histórico**, nunca como abiertos ni como sesiones/eventos. Los quitados no reaparecen como pendientes nuevos. Incluye las rutinas vigentes y los marcadores necesarios para no resembrar las archivadas; aplicar una retirada sobre una fila online exige identidad/linaje conocido o la resolución de E4-D1, no solo un título o ID coincidente.

La importación lleva identidad del conjunto local, cuenta destino y recibo idempotente. Si la respuesta se pierde después de guardar, el reintento debe devolver el mismo resultado. Guardar un punto de recuperación local antes de migrar el antiguo `runo`; no borrar o renombrar destructivamente la DB para “empezar limpio”. La copia de origen queda marcada para no importarla de nuevo a otra cuenta por accidente.

La lectura remota incluye solo la proyección durable y su revisión, incluido el histórico final de pendientes, no el histórico de ejecución de E3. Una descarga no inicia sesiones, no reproduce eventos, no entrega RC y no altera el snapshot de una sesión local en curso. Al cambiar de identidad con timer activo, pedir pausar y conservarlo en su espacio de origen; cancelar mantiene el estado. La pausa permanece local y nunca se reanuda automáticamente.

### 6. Escrituras selectivas y funcionamiento offline

**E4.5** conserva IndexedDB como punto de operación y a Neon como versión confirmada de los datos duraderos de la cuenta. Una edición aún no enviada es un cambio pendiente, no algo que deba perder frente al servidor.

1. Guardar la edición durable y una operación en cola **en la misma transacción local**, asociada a la cuenta. Si falla el guardado, no declarar éxito.
2. Enviar después del guardado explícito o de la finalización confirmada de un pendiente de una vez, agrupando cambios compatibles. No por tecla, render, tick o cambio intermedio del timer. Una edición sin diferencia real no genera una operación nueva.
3. Aplicar en servidor por entidad y cuenta, con identificador de operación estable, validación, transacción y revisión base. Repetir una petición o perder su respuesta no duplica datos.
4. Retirar la operación local solo tras confirmación. Mostrar estados discretos: «Guardado en este dispositivo», «Pendiente de guardar en tu cuenta», «Guardado en tu cuenta» o error accionable; no interrumpir el timer.
5. Al volver la conexión o reabrir la app, reintentar con espera progresiva y la misma cuenta autenticada. No prometer envíos con la app cerrada ni convertir operaciones de A en operaciones de B.
6. Leer al entrar y reconciliar al reabrir/volver al foco o recuperar conexión, con comprobación de revisión y solicitudes agrupadas. Son lecturas necesarias para detectar cambios de otro equipo; **“solo peticiones por cambios” se aplica a las escrituras**, no significa cero lecturas. Sin polling periódico ni tiempo real en este corte.

**Conflictos (propuesta):** revisión asignada por el servidor, no “gana el reloj del teléfono”. Cambios sobre entidades distintas se aplican por separado. Dos ediciones incompatibles de la misma entidad conservan ambas alternativas y requieren elegir; no sobreescribir silenciosamente. Un conflicto bloquea esa entidad, no toda la app. Descargar y reemplazar la DB local completa no es reconciliación.

**Eliminaciones y estados finales:** guardar una marca de eliminación o archivo con revisión para que un equipo offline no resucite una rutina al volver. Una edición obsoleta no revierte una eliminación; restaurar requiere acción explícita. Del mismo modo, una versión abierta vieja no reabre un pendiente ya completado. No purgar estas marcas durante E4 sin definir cómo se invalidan las colas antiguas y se fuerza una recarga segura. Los detalles de retención de contenido personal se revisan en F01.

**Criterio de tráfico:** después de vaciar la cola durable, una prueba de iniciar → pausar → reanudar → terminar rutina recurrente produce cero mutaciones del dominio a Neon. Guardar un cambio real de título produce solo la mutación durable correspondiente, sin sesiones/eventos/ledger en el payload. Completar un pendiente de una vez produce una única finalización lógica con fecha estable, reutilizando el mismo identificador ante reintentos. En modo invitado todas esas acciones producen cero escrituras de datos de usuario.

#### E4.5.1 · Histórico de pendientes completados

- Al confirmar que un pendiente terminó, quitarlo de abiertos y conservar su estado final con ID, título y fecha de completado. Mantener los metadatos duraderos que ya requiere el pendiente, no reconstruir su ejecución a partir de eventos.
- Usar una sola finalización lógica por pendiente: reintentos, una respuesta perdida o dos dispositivos completándolo no crean dos entradas ni cambian la fecha en cada reenvío. Conservar la versión final confirmada al reconciliar; no reabrirlo por recibir una versión antigua.
- Sin cuenta, el histórico queda en el espacio local. Con cuenta, se guarda mediante la misma cola y se recupera en otro dispositivo. Si se completó offline, indicar que está guardado solo en el dispositivo hasta recibir confirmación.
- Acceso sencillo a «Completados» dentro de Pendientes, con título y fecha, más recientes primero, en ES/EN. No dashboard, estadísticas, rachas ni historial de pausas, tiempo transcurrido o intentos.
- Quitar una entrada de la lista de abiertos por haberla completado no borra su histórico. La conservación y eliminación del histórico forman parte de F01 y del borrado de datos de la cuenta; no prometer retención ilimitada.

### 7. Cerrar sesión, caducidad y eliminar datos

**E4.6**, coordinado con **F01**:

- Cerrar sesión invalida la sesión de servidor, detiene envíos y cambia al espacio invitado separado. No borra la cuenta de Neon ni copia sus datos al invitado. Decisión MVP: mantener su caché separada y bloqueada para UI hasta el siguiente acceso autenticado; advertirlo en dispositivos compartidos y ofrecer retirar únicamente esa copia local. La separación de espacios no equivale a cifrar datos contra alguien con acceso al almacenamiento del navegador.
- Si hay cambios sin enviar, mostrar ese hecho antes de salir. Nunca descartarlos ni afirmar que quedaron online. La cola permanece en el espacio de origen salvo descarte explícito y confirmado.
- Si caduca la autenticación, permitir trabajo local y bloquear envíos hasta autenticar **la misma cuenta**. No degradar automáticamente su información a invitado.
- Diferenciar «borrar este espacio local», «eliminar datos de la cuenta» y «cerrar sesión». Confirmar alcance, mantener cancelación y no usar borrados globales de almacenamiento para limpiar una cuenta. No borrar datos de invitado, otra cuenta u otras claves del origen.
- La eliminación de cuenta es autorizada por sesión y confirmación reforzada según la solución de auth; elimina solo sus datos e identidades, revoca sesiones y detiene las colas de esa cuenta. Un dispositivo con una cola vieja no puede recrear automáticamente la cuenta ni sus datos al reconectar.
- F01 debe describir los datos reales de Google/Facebook, el correo de cuenta y los vínculos de acceso, el histórico final de pendientes, finalidades, proveedores/encargados, transferencias, retención, derechos y medios de solicitud. Completar los datos del responsable y verificar los requisitos de eliminación de Meta; una URL de instrucciones no se presenta como callback técnico si Meta exige uno. No afirmar cumplimiento legal universal por citar LFPDPPP o RGPD.

### 8. Transición de E3 sin perder datos

**E4.7**:

- Preservar el `owner` y su copia legacy. No asignarlos al primer login ni a todos los usuarios. Solo migrarlos con correspondencia explícita y verificada al dueño correcto y autorización para operar sobre esos datos.
- El snapshot E3 incluye sesiones, eventos y ledger que E4 no guardará. No borrarlos, volcarlos a otra cuenta ni eliminar tablas “sobrantes” automáticamente. Los pendientes completados sí pueden pasar como estados finales al histórico de E4.5.1, sin reproducir eventos. Determinar qué datos duraderos se importan y cómo se conserva el resto antes de ejecutar la transición.
- Retirar la clave compartida y deshabilitar las rutas E3 de reemplazo/borrado global antes de abrir el modelo multiusuario. No mantener una puerta alternativa que use siempre `RUNO_OWNER_ID` junto al login nuevo.
- Reutilizar validaciones útiles del dominio, no `replaceRemoteSnapshot` como mecanismo habitual. Ninguna edición del usuario vuelve a copiar todas las tablas.
- Migraciones Drizzle generadas y revisadas, aplicadas primero a una rama Neon de desarrollo identificada, con prueba de rollback/recuperación. No asumir por una URL qué rama es ni reutilizar la semilla del dueño como semilla general.
- Las diez rutinas de ejemplo contienen nombres y referencias personales del dueño. E4.1 decide cuenta nueva vacía, recuperación antes de inicializar e incorporación del invitado solo tras confirmar; no distribuir la semilla del dueño ni agregar ejemplos automáticamente. Mantener intactos los datos ya existentes.

### 9. Decisiones confirmadas por el dueño

**Confirmadas el 2026-11-02.** D1/D2/D3 cerraron las dudas de producto; posteriormente el dueño autorizó comenzar la implementación. E4.1 tiene decisión técnica documentada; no hay autorización de deploy, contratación ni operaciones sobre datos reales.

| ID | Tema | Decisión confirmada |
|---|---|---|
| **E4-D1** | Datos del invitado y de la cuenta | Preguntar si quiere agregar las rutinas no sincronizadas, mostrar resumen y cualquier conflicto. Incorporar solo tras aceptar; nunca reemplazar todo automáticamente. Rechazar o cancelar conserva el origen. Flujo y criterios en E4.4. |
| **E4-D2** | Pendientes de una sola vez | Guardar solo el estado final de completado y su fecha; retirarlo de abiertos en los otros dispositivos al reconciliar y conservar un histórico sencillo de completados (E4.5.1). Sin pausas ni log del timer. Los completados de rutinas recurrentes siguen locales. |
| **E4-D3** | Google y Facebook | Ambos acceden a la misma cuenta asociada al correo verificado. Vinculación segura en E4.3.1: probar control de las identidades, usar el mismo `user_id` y no fusionar por mera coincidencia de texto ni dar acceso a un correo no verificado. |

**E4.1 cerrado como diseño:** Better Auth 1.7.15 autohospedado + adaptador Drizzle; vinculación explícita y verificación independiente del correo cuando el proveedor no la prueba; callbacks/orígenes por entorno y dependencias de credenciales/entrega de correo documentados; preferencias/histórico, caché al salir y cuenta vacía definidos. Ver [`registro técnico`](./docs/cloud/2026-11-02-e4-auth-and-spaces.md). No confundir una decisión con evidencia de OAuth: credenciales, transporte de verificación, implementación y pruebas reales siguen en E4.3/E4.3.1. No contratar ni habilitar servicios sin autorización.

### 10. Orden de construcción e IDs verificables

E4 conserva su ID de restauración/sync. Los sub-IDs separan el trabajo nuevo; **un solo ID en curso**, sin confundir este plan con funciones ya terminadas.

| ID | Entregable | Criterio verificable de cierre |
|---|---|---|
| **E4.1** | Contrato y decisión técnica de auth | D1/D2/D3 confirmadas; cerrar proyección, salida/semilla y solución compatible con Google/Facebook, vinculación segura y Next, documentada con fuentes vigentes. Sin cambios de runtime en esta etapa. |
| **E4.2** | Esquema multiusuario y espacios locales | Migración revisada/probada en desarrollo; A y B pueden tener el mismo ID `seed:*` sin colisión o referencia cruzada. Migrar `runo` preserva datos; leer, escribir o borrar en A no toca B/invitado. |
| **E4.3** | Login opcional Google/Facebook y autorización | Login, cancelación, expiración y logout de ambos proveedores; el servidor rechaza acceso a filas ajenas aunque se alteren IDs/payloads. El invitado sigue operando offline sin credenciales. No abrir públicamente hasta E4.7 y F01. |
| **E4.3.1** | Una cuenta por correo verificado y vinculación de proveedores | Vincular Google/Facebook, en cualquiera de los dos órdenes, y reingresar por el otro método conserva el mismo `user_id` y datos, sin cuenta paralela. Correo ausente/no verificado, coincidencia sin prueba de control, cambio de correo y vinculación concurrente no filtran ni fusionan cuentas ajenas. |
| **E4.4** | Importación y recuperación | Confirmar o rechazar la incorporación con cuenta vacía/existente conserva ambos lados; mostrar y resolver conflictos antes de aplicar. Una respuesta perdida no duplica rutinas ni completados. Navegador limpio recupera datos duraderos y el histórico final de pendientes, no timer/eventos/RC. |
| **E4.5** | Cola durable, conflictos y red selectiva | Una edición offline aparece una sola vez al reconectar; reintentos y dos dispositivos no pisan datos ni resucitan eliminados. Timer de rutina: cero mutaciones; completar un pendiente: una finalización lógica, sin ejecución adjunta. |
| **E4.5.1** | Histórico de pendientes completados | Completar quita de abiertos y añade una sola entrada con título/fecha en «Completados»; reintentos/offline/dos dispositivos no duplican ni reabren. Otro navegador de la misma cuenta recupera la entrada y el invitado conserva su histórico local separado. |
| **E4.6** | Ciclo de identidad y eliminación por cuenta | Cambiar A → invitado → B y caducar sesión no filtran datos ni reenvían colas equivocadas. Logout no borra cuenta. Borrar A no afecta B y una cola vieja no republica sus datos. |
| **E4.7** | Salida segura de la copia compartida E3 | Acceso legacy deshabilitado para usuarios nuevos; datos `owner` preservados o migrados solo a su identidad verificada. Ningún endpoint de usuarios depende del dueño fijo. No limpieza masiva de datos. |
| **F01** | Aviso y eliminación ajustados al modelo real | Identidad/contacto del responsable completos, flujos y retención descritos, requisitos vigentes de proveedores revisados y eliminación por cuenta probada sin afectar otra cuenta. No publicar el borrador que declara ausencia de OAuth como si describiera E4. |
| **E4.8** | Validación integral y autorización de salida | Evidencia de los escenarios siguientes, build de producción y pruebas OAuth/PWA reales; documentación alineada. Commit/deploy y operaciones de producción solo con autorización. |

E4.2 → E4.3 → E4.3.1 → E4.4 → E4.5 → E4.5.1 → E4.6 → E4.7 → F01 → E4.8 se ejecutan después de cerrar E4.1. Los sub-IDs nuevos no renombraron las fases existentes. F01 queda pausado mientras cambia el contrato; se conserva su trabajo, no se reescribe como completado.

### 11. Verificación de E4.8

El agente prepara pruebas y registra comando, resultado y límite; el dueño prueba y comenta, sin mantener una checklist aparte.

- **Lógica pura y persistencia local:** proyección permitida/excluida, confirmación/rechazo de importación, espacios separados, operaciones atómicas, deduplicación, revisiones, conflictos, eliminación, orden y preferencias. Incluir completados previos del invitado, historial final con fecha estable, colisión al completar desde dos equipos, mismos IDs de semilla para dos usuarios y errores a mitad de migración.
- **Integración en Neon de desarrollo:** autorización de cada lectura/escritura/borrado, FKs del mismo dueño, usuario falsificado, operaciones repetidas, concurrencia, cuenta eliminada y cola vieja. Verificar que dos proveedores vinculados resuelvan el mismo usuario; un email no verificado/reasignado o dos callbacks simultáneos no secuestran ni duplican cuentas. No usar datos personales reales para pruebas destructivas ni llamar integración a un mock.
- **Navegador sobre build de producción:** invitado; login cancelado; vincular Google/Facebook y acceder al mismo espacio; rechazar una vinculación insegura; aceptar/rechazar datos locales y revisar conflictos; segundo perfil limpio; edición y finalización offline; histórico «Completados» sin duplicados; reconexión; sesión expirada; cambio de cuenta; logout con cola; borrar caché vs cuenta; payloads y tráfico del timer. Un error de auth no debe romper el modo invitado.
- **Dispositivo/PWA real:** callback de ambos proveedores desde navegador y standalone, retorno a la app, reconexión y reapertura offline; registrar límites de cada plataforma. No certificarlo con tests unitarios o solo headless.
- **Regresión:** `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` y `npm run start`; mantener B16/B17/B18/B19 y G01/G02/G03/G13 como evidencia separada. Compilar no prueba OAuth ni recuperación.

## Límites

La autorización posterior permite **implementar** E4 por IDs: cuentas opcionales y sincronización bidireccional **solo de datos duraderos**, incluyendo estado final/histórico de pendientes (E4-D2 / E4.5.1) y Google/Facebook en una misma cuenta con vinculación segura (E4-D3 / E4.3.1). No autoriza commit/deploy, contratación/configuración de servicios ni migrar datos reales sin permiso específico. No amplía a sincronización de sesiones/resultados diarios de rutinas recurrentes, tiempo real, colaboración, cuentas por contraseña, RC visibles o remotos, LLM, rachas o castigos, `.ics`/push, dashboards, motor 2D ni nivel 3/Elian. No fusionar cuentas por coincidencia de correo sin prueba de control.
