---
name: go-pes-seguridad
description: >-
  Cubre autorización y seguridad en GO-PES v2 (Google Apps Script): guards de rol
  por función pública, acceso por módulo, y PINs de operaciones sensibles con rate
  limiting. Úsala para "proteger esta función", "quién puede ejecutar", "falta el
  guard de rol", "auditar permisos", "configurar un PIN", "operación sensible",
  "rate limiting", "función mutante sin auth". NO es el flujo general de un módulo
  (eso es go-pes-feature, que ya incorpora el guard básico) ni un bug funcional
  (go-pes-bug).
---

# go-pes-seguridad — Autorización y PINs

Skill para el control de acceso de GO-PES v2. El sistema **no** confía en el dominio de Google (WebApp access es `ANYONE` por diseño): la autorización es interna, vía `DIM_Usuarios` y los roles `visor < operador < coordinador < superuser`.

**Lee primero `references/reglas-go-pes.md`.**

## Guards de rol (primera línea de toda función pública)
- Cada función pública (sin `_`) **empieza** con `requireRole_([roles])` o `requireModuleAccess_(moduleKey, [roles])` (`Auth.js`). El usuario actual: `getUsuarioActual()`.
- **Funciones mutantes** (escriben/borran/reconstruyen): el guard es obligatorio y con el rol mínimo correcto. Hallazgos históricos cerrados: `recalcularFicha()` (rebuild global → coordinador/superuser), `goPesRefrescarVistasYMaster()` protegida, Historial restringido a superuser.
- **Auditoría de guards:** grep de todas las `function <publica>(` y confirma que la 1ª sentencia es un guard. Una pública sin guard es un hallazgo.

## PINs de operaciones sensibles (`SecurityPins.js`)
Operaciones destructivas/críticas exigen un PIN por contexto, hasheado en `PropertiesService` (nunca en código), con rate limiting (3 intentos/usuario/hora vía `CacheService`) y log de intentos fallidos en `LOG_Procesamiento`.

- Contextos: `admin_reset` (limpieza de datos), `user_deactivate` (desactivar usuarios), `evento_abierto` (eventos con inscripción abierta).
- API: validar con `goPesValidatePin_(context, pin, actorEmail)`; setup con `goPesConfigurePinDeSeguridad(context, pin)`; consultar con `goPesIsPinConfigured(context)`; resetear rate limit (emergencia) con `goPesResetPinRateLimit(context, email)`.
- Al agregar una operación sensible nueva: define su contexto, valida el PIN antes de ejecutar, y documenta que hay que correr el setup una vez tras el deploy.

## Reglas
- **Nunca hardcodees credenciales/PINs** en el código: van en `PropertiesService`.
- La cuenta Gmail de DEV y `access: ANYONE` son **exclusiones intencionales** documentadas — no las "arregles" sin instrucción.
- Todo cambio de seguridad se prueba en DEV y se cubre con tests (`goPesTestSecurity_()` en `Audith.js`) antes de PROD.

## Fase 1 primero
Como todo cambio no trivial: inventaría funciones/permisos afectados y riesgos, y **espera aprobación** antes de tocar código.

## Skills relacionadas
- `go-pes-feature` — el flujo de módulo ya incorpora el guard básico; esta skill profundiza en auditoría y PINs.
- `go-pes-tests` — suite `goPesTestSecurity_()`.
- `go-pes-bug`, `go-pes-deploy`.
