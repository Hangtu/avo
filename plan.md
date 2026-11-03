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
- Google y Facebook deben abrir la misma identidad interna solo mediante vinculación segura. No fusionar por coincidencia de email; exigir prueba de control. Email ausente/no verificado no autoriza alta ni unión insegura.
- Incorporar datos del invitado solo con consentimiento y resumen; cancelar/rechazar conserva ambos lados. Reintentos no duplican ni reabren un pendiente completado.
- Cuenta nueva vacía hasta recuperar o aceptar la incorporación. No distribuir las rutinas personales de `owner`. Logout revoca sesión y aísla la caché; borrado de cuenta nunca borra otra cuenta ni datos invitados.

## Estado y pasos pendientes

Un solo ID en curso. El dueño autorizó completar las conexiones tras el incidente de pendientes: E4.1 queda pausada con sus revisiones reales pendientes y E4.2 concentra el trabajo. Código y límites de la conexión en [`docs/cloud/2026-11-02-selective-account-sync.md`](./docs/cloud/2026-11-02-selective-account-sync.md); decisiones de auth en [`docs/cloud/2026-11-02-e4-auth-and-spaces.md`](./docs/cloud/2026-11-02-e4-auth-and-spaces.md); evidencia en [`STATUS.md`](./STATUS.md).

| ID | Pendiente verificable |
|---|---|
| **E4.1** | Google local confirmado con login real (2026-11-03); faltan sesión/logout reales y la prueba de Google en el entorno desplegado. Better Auth y Facebook local existen. |
| **E4.2 🟡** | Conexión de espacios, API autenticada y bootstrap selectivo implementados/probados localmente. `development` y `prod` tienen las 4 migraciones y el esquema requerido completo (verificado con `db:verify[:prod]`). La sesión real de Google ya sincronizó 2 pendientes/3 recibos en `development`; falta la recuperación en otro navegador y el punto de recuperación. |
| **E4.3** | Implementado: sesión consultada en DB, dueño interno y precondición de cuenta; invitado usable offline. Falta verificación integrada en el entorno autorizado. |
| **E4.3.1** | Reingresar y vincular con Google y Facebook en ambos órdenes. Decisión del dueño (2026-11-03): el MVP **no verifica correos**; mismo correo entregado por el proveedor = misma cuenta, y un correo distinto = otra cuenta. Queda cubrir correo ausente (p. ej. Facebook sin permiso) y cambio de correo en el proveedor. |
| **E4.4** | Implementadas recuperación e incorporación con resumen/consentimiento, copia de recuperación y origen conservado. Cubiertas cancelación/reintentos/conflictos locales; falta aceptación con cuenta real. |
| **E4.5** | Outbox atómica, recibos canónicos, rechazos aislados, patches/merge de preferencias y versiones explícitas probados localmente; cero mutaciones runtime. Falta Neon real y decidir ventana offline/retención/límite de recibos antes de producción. |
| **E4.5.1** | Implementado/probado en SQL local: finalización terminal con entrada/título/fecha estables, sin duplicar/reabrir, recuperable en caché vacía. Falta otro dispositivo con cuenta real. |
| **E4.6** | A/invitado/B, expiración y logout aislados/probados con cuentas sintéticas, incluso otra pestaña y fallo de revocación. Falta sesión real y eliminación verificada por cuenta; nunca reenviar colas ajenas. |
| **E4.7** | Retiro local autorizado del respaldo E3: rutas/UI, clave compartida y seed remoto eliminados; `owner` y sus datos preservados. Falta verificar la ausencia de rutas/variables en el despliegue autorizado; no implica recuperación ni sync E4. |
| **F01** | Aviso y eliminación MVP actualizados para OAuth/proveedores, contacto fijo `support@frutit.app` y borrado local de invitado acotado. Confirmar responsable/domicilio, atención del correo, retención y eliminación segura por cuenta antes de publicar. |
| **E4.8** | Regresión local ampliada a 392 tests y Chromium sobre build de producción, incluidas carreras UI/timer y PWA offline. Falta recuperación en otro navegador, Facebook real, Safari, dispositivo físico y entorno desplegado. Ver correcciones 2026-11-03. |

E4.2 permanece como único ID en curso; los avances de código en los demás IDs no cierran sus criterios externos. No desplegar código que requiera 0003 antes de validar/aplicar esa migración en desarrollo y confirmar el destino autorizado. Producción, Meta, credenciales y datos reales requieren autorización específica.

## Fuera de alcance

Sync de ejecución o en tiempo real, colaboración/cuentas compartidas, cuentas por contraseña, RC visibles/remotos, LLM, analítica de terceros, rachas/castigos, `.ics`, push, dashboards y motor 2D. No afirmar que build/tests prueban OAuth, Neon o móvil.
