# Runbook de operación

**Propósito:** guía de diagnóstico para incidentes recurrentes en GO-PES v2 (soporte y operación). Para cada síntoma: dónde mirar y qué revisar. Los fixes de código siguen el flujo de la skill `go-pes-bug`.

---

## Dónde mirar primero
- **Panel de ejecuciones** (editor de Apps Script → Ejecuciones): función, duración, error por request.
- **`clasp logs` / `clasp logs --watch`**: correlaciona la acción del usuario con la ejecución.
- **Hoja `LOG_Procesamiento`**: filtrar `nivel = 'ERROR'`/`'CRITICAL'` en las últimas 24 h.
- **Diagnóstico de latencia**: `enableDiagnostics()` (superuser) activa trazas `GO_PES_DIAG`; `disableDiagnostics()` al terminar.

## Incidentes recurrentes

### "Las alertas no aparecen / no disparan"
- Causa típica: filtrado por un campo inexistente. Las evaluaciones deben usar **`codigo_hito`** (ej. `PRE_04`), **nunca `hito_key`** (bug histórico: filtro por campo inexistente → `[]` silencioso). Ver `alertas.md` + `avance-hitos.md`.
- Revisar: `Alertas.js` (umbrales en `getDefaultAlertasConfig_`), cache de alertas (`getUserCache`, TTL 5 min) — un cambio reciente puede tardar hasta 5 min o requerir invalidación.

### "La ficha no carga / error de 0 s al abrir"
- Causa típica: carrera de visibilidad post-guardado. `guardarIngreso` hace `flush()` antes de liberar el lock y `obtenerFicha` **reintenta una vez** (sleep 500 ms + invalidación de cache) si el `solicitud_id` aún no aparece.
- Revisar: que no haya un `route('ficha')` redundante ocultando el loader con la ficha en vuelo.

### "Se registró un hito/ingreso duplicado"
- Causa típica: doble envío en acciones > 2 s. Debe existir **guard anti doble envío** (`APP.state.*Submitting` / botón deshabilitado); la validación backend de duplicados es la red de seguridad.
- Limpieza de datos: `goPesVerificarTodosDuplicados()` inventaría; `goPesAnalizarCasosDuplicados()` / `goPesLimpiarCasosDuplicados()` (`ZZ_*Duplicados.js`) limpian. **Verificar antes de limpiar**, y en DEV antes que PROD.

### "Un usuario no puede acceder"
- Revisar `DIM_Usuarios`: que el usuario exista, `activo_flag = true`, y `modulos_permitidos` correcto. El acceso es interno (no por dominio Google). Mensaje al usuario: "Tu usuario no tiene acceso habilitado" (ver `mensajes-normalizados.md`).

### "Una acción de PIN falla / 'PIN no configurado'"
- Los 3 contextos (`admin_reset`, `user_deactivate`, `evento_abierto`) se configuran una vez por entorno: `goPesConfigurePinDeSeguridad(context, pin)` (superuser). Verificar con `goPesIsPinConfigured(context)`. Rate limit: 3 intentos/hora — reset de emergencia con `goPesResetPinRateLimit(context, email)`. Ver `seguridad.md`.

### "El dashboard muestra datos viejos"
- El dashboard usa cache persistente (`CacheService`, TTL 3 min). Tras guardar, puede tardar hasta 3 min o requerir invalidación (`invalidateDashboardCache_`). El botón "Actualizar" del dashboard debe hacer bypass del cache.

### "La app va lenta"
- Ver `performance.md`. Medir con el protocolo (panel de ejecuciones, nº de llamadas a Sheets, round-trips). Skills: `go-pes-performance` (server), `go-pes-ui-rapida` (percibida).

## Escalar / rollback
- Deploy con problemas: rollback editando el deployment activo a la versión anterior (ver `deploy.md` → Rollback). Datos intactos (solo vuelve el código).
- Corrupción de datos: STOP, restaurar desde backup (`deploy.md` → Backup), investigar causa, fix en DEV, redeploy.
