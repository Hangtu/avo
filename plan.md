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

Una sola fase 🟡 global. El detalle técnico de auth/migraciones está en [`docs/cloud/2026-11-02-e4-auth-and-spaces.md`](./docs/cloud/2026-11-02-e4-auth-and-spaces.md); estado/evidencia en [`STATUS.md`](./STATUS.md).

| ID | Pendiente verificable |
|---|---|
| **E4.1 🟡** | Revisar sesión/logout con sesión real y configurar/probar Google. Better Auth y Facebook local ya existen; esto no prueba recuperación de datos. |
| **E4.2** | Conectar sesión con espacios locales; snapshot/bootstrap autenticados; probar aislamiento/recuperación. Validar `0003_account_spaces.sql` en Neon dev identificado, con autorización y punto de recuperación. |
| **E4.3** | Autorizar datos solo desde sesión verificada; invitado sigue utilizable sin auth/red. |
| **E4.3.1** | Vincular/reingresar con Google y Facebook en ambos órdenes; cubrir email ausente/no verificado, cambio de email y falta de prueba de control sin crear fusiones/cuentas inseguras. |
| **E4.4** | Recuperación e incorporación con consentimiento; cancelación, conflictos y reintentos no pierden ni duplican datos. |
| **E4.5** | Outbox durable, revisiones y resolución explícita de conflictos; tráfico del timer recurrente: cero mutaciones remotas. |
| **E4.5.1** | Completar pendiente único conserva una entrada estable con título/fecha; reintentos no duplican ni reabren; otro dispositivo la recupera. |
| **E4.6** | Cambio A/invitado/B, expiración, logout y eliminación no cruzan datos ni reenvían colas ajenas. |
| **E4.7** | Retiro local autorizado del respaldo E3: rutas/UI, clave compartida y seed remoto eliminados; `owner` y sus datos preservados. Falta verificar la ausencia de rutas/variables en el despliegue autorizado; no implica recuperación ni sync E4. |
| **F01** | Aviso y eliminación MVP actualizados para OAuth/proveedores, contacto fijo `support@frutit.app` y borrado local de invitado acotado. Confirmar responsable/domicilio, atención del correo, retención y eliminación segura por cuenta antes de publicar. |
| **E4.8** | Regresión integrada de auth, importación, offline/conflictos, seguridad y PWA con evidencia real de navegador/dispositivo. |

Después de E4.1, seguir el orden de la tabla, un ID en curso. No desplegar código que requiera 0003 antes de validar/aplicar esa migración en desarrollo. Producción, Meta, credenciales y datos reales requieren autorización.

## Fuera de alcance

Sync de ejecución o en tiempo real, colaboración/cuentas compartidas, cuentas por contraseña, RC visibles/remotos, LLM, analítica de terceros, rachas/castigos, `.ics`, push, dashboards y motor 2D. No afirmar que build/tests prueban OAuth, Neon o móvil.
