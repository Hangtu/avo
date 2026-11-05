# Avo — plan vigente

App personal local-first de hábitos, pendientes y timer; español de México con ES/EN. Ayuda a actuar y volver a la vida, no a maximizar uso.

**Marca visible:** Avo, el aguacate administrador del tiempo. Se conservan las claves y bases locales `runo` para proteger los datos. El dominio previsto de producción es `https://avo.frutit.app/`; el dominio legado desplegado sigue siendo `https://runo-mu.vercel.app` hasta que el nuevo se configure y verifique. E4 autoriza login opcional Google/Facebook y recuperación selectiva; no autoriza migraciones reales, contratación ni publicación sin permiso específico.

## Contrato de producto

- Hoy: una carta principal y una alternativa asomada; sin dashboard durante el timer.
- Franjas de hasta 3 tareas y una abierta. Tres cambios diarios; correcciones neutrales con confirmación y salida disponible.
- Timer local: una sesión activa, pausa persistente, cero no completa ni paga. Al cambiar de espacio no compartir ejecución.
- Audio apagado al inicio; presión normal 1, techo 2; sin castigos, rachas ni LLM. ES/EN, ayuda contextual, accesibilidad y una mano.
- Invitado funciona sin login/red con Dexie. Una cuenta pertenece a una persona; los espacios y sus datos no se mezclan.

## E4: decisiones confirmadas

- Neon guarda solo definiciones duraderas, preferencias portables y el estado final/histórico de pendientes de una vez. No sincronizar ticks, sesiones, pausas, eventos, ledger/RC, resultados diarios de rutinas recurrentes ni permisos del dispositivo.
- Google y Facebook comparten la identidad interna según el correo que entrega el proveedor: mismo correo = misma cuenta; correo distinto = cuenta distinta. En el MVP Avo no verifica el buzón: el inicio de sesión del proveedor es prueba suficiente (ADR 0001, 2026-11-03). Un correo ausente impide ese flujo; la verificación propia/prueba de control queda para una versión posterior.
- Incorporar datos del invitado solo con consentimiento y resumen; cancelar/rechazar conserva ambos lados. Reintentos no duplican ni reabren un pendiente completado.
- Cuenta nueva vacía hasta recuperar o aceptar la incorporación. No distribuir las rutinas personales de `owner`. Logout revoca sesión y aísla la caché; borrado de cuenta nunca borra otra cuenta ni datos invitados.

## Estado y pasos pendientes

No hay tarea activa; ninguna inicia automáticamente. Las tareas locales 011–013 completaron su alcance. El dueño confirma que `development` y `prod` son bases Neon distintas con el mismo esquema. La salida de `db:verify:prod` compartida por el dueño (2026-11-05) confirma el esquema requerido completo, cinco migraciones aplicadas y `runo_rate_limits`; el estado de `development` es confirmación del dueño, no una consulta independiente de este saneamiento. Según esa confirmación, la activación de 0004 ya no es un pendiente. Esto no acredita despliegue, OAuth, recuperación entre navegadores, eliminación de cuenta ni aceptación en dispositivo. La revisión PostgreSQL de la tarea 012 también quedó validada localmente (6/6 casos con PostgreSQL 17.11); sus pruebas no sustituyen la aceptación real. Código y límites de la conexión en [`docs/cloud/2026-11-02-selective-account-sync.md`](./docs/cloud/2026-11-02-selective-account-sync.md); decisiones de auth en [`docs/cloud/2026-11-02-e4-auth-and-spaces.md`](./docs/cloud/2026-11-02-e4-auth-and-spaces.md); evidencia y siguiente paso en [`tasks/`](./tasks/README.md).

| ID | Pendiente verificable |
|---|---|
| **E4.1** | Google local confirmado con login real (2026-11-03); faltan sesión/logout reales y la prueba de Google en el entorno desplegado. Better Auth y Facebook local existen. |
| **E4.2** | Conexión de espacios, API autenticada y bootstrap selectivo implementados/probados localmente. El dueño confirma que `development` y `prod` son bases distintas con el mismo esquema; la salida de `db:verify:prod` del 2026-11-05 reporta esquema completo y 5 migraciones. En `development` hubo un sync real de Google (2 pendientes/3 recibos); faltan revisión de UI y aceptación real de recuperación/importación/estado terminal, agrupadas en la tarea 003. |
| **E4.3** | Implementado: sesión consultada en DB, dueño interno y precondición de cuenta; invitado usable offline. Falta verificación integrada en el entorno autorizado (tarea 004). |
| **E4.3.1** | Reingresar y vincular con Google y Facebook en ambos órdenes. Decisión del dueño (2026-11-03): el MVP **no verifica correos**; mismo correo entregado por el proveedor = misma cuenta, y un correo distinto = otra cuenta. Queda cubrir correo ausente (p. ej. Facebook sin permiso) y cambio de correo en el proveedor. |
| **E4.4** | Implementadas recuperación e incorporación con resumen/consentimiento, copia de recuperación y origen conservado. Cubiertas cancelación/reintentos/conflictos locales; falta aceptación real de importación, incluida en la tarea 003. |
| **E4.5** | Outbox atómica, recibos canónicos, rechazos aislados, patches/merge de preferencias y versiones explícitas probados localmente; cero mutaciones runtime. Ya hubo un sync real de Google en `development`, pero no cubre toda la aceptación. Antes de producción falta decidir ventana offline, retención y límite de recibos; se registra con F01 en la tarea 007. |
| **E4.5.1** | Implementado/probado en SQL local: finalización terminal con entrada/título/fecha estables, sin duplicar/reabrir, recuperable en caché vacía. Falta aceptación real en un segundo navegador/dispositivo (tarea 003). |
| **E4.6** | A/invitado/B, expiración y logout aislados/probados con cuentas sintéticas, incluso otra pestaña y fallo de revocación. Falta sesión/isolation real (tarea 004) y eliminación verificada por cuenta (tarea 007); nunca reenviar colas ajenas. |
| **E4.7** | Retiro local autorizado del respaldo E3: rutas/UI, clave compartida y seed remoto eliminados; `owner` y sus datos preservados. Falta verificar la ausencia de rutas/variables en el release autorizado (tarea 004); no implica recuperación ni sync E4. |
| **F01** | Aviso y eliminación MVP actualizados para OAuth/proveedores, contacto fijo `support@frutit.app` y borrado local de invitado acotado. Confirmar responsable/domicilio, atención del correo, retención y eliminación segura por cuenta antes de publicar. |
| **E4.8** | Regresión local ampliada a 392 tests y Chromium sobre build de producción, incluidas carreras UI/timer y PWA offline. Falta recuperación en otro navegador, Facebook real, Safari y dispositivo físico (tareas 003/005/006). Ver correcciones 2026-11-03. |

La tarea 012 completó resiliencia PostgreSQL y eficiencia de sync, incluidos los seis casos multi-conexión en una base local desechable autorizada. No se activa otra tarea automáticamente. E4.2 sigue pausada en `tasks/`, sin cerrar sus criterios. Al retomarla seguirá como único ID E4 en curso; los avances de código en los demás IDs no cierran sus criterios externos. La promoción del código seguirá el flujo `development` → `prod` después de la aceptación y requiere autorización de despliegue separada; la paridad de esquema no valida el release. Producción, Meta, credenciales y datos reales requieren autorización específica.

## Fuera de alcance

Sync de ejecución o en tiempo real, colaboración/cuentas compartidas, cuentas por contraseña, RC visibles/remotos, LLM, analítica de terceros, rachas/castigos, `.ics`, push, dashboards y motor 2D. No afirmar que build/tests prueban OAuth, Neon o móvil.
