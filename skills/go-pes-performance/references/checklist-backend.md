# Checklist de rendimiento — backend/datos (GO-PES v2)

Recórrelo tras medir (ver `protocolo-medicion.md`). Cada ítem está anclado a primitivas reales del repo.

## Cache
- [ ] El cache que debe sobrevivir entre llamadas usa **`CacheService`**, no `GO_PES_RUNTIME` (que muere por ejecución). `getScriptCache()` para datos compartidos; `getUserCache()` para datos por usuario. Precedentes: Dashboard (`invalidateDashboardCache_`), Alertas (`invalidateAlertasCache_`).
- [ ] `GO_PES_RUNTIME` se usa solo como **memo dentro de un request** (no releer la misma hoja/headers dos veces): `ensuredSheets`, `headersBySheet`, `rowsBySheet`.
- [ ] La invalidación es **TTL + explícita en el punto que cambia el dato**, y **NO** está enganchada a rutas que los logs recorren (los writes de log tocan hojas y matarían el cache en cada acción).
- [ ] Un write de filas usa la invalidación acotada `invalidateSheetDataCache_` (solo `rowsBySheet`), no la completa `invalidateSheetRuntimeCache_` (estructura), salvo cambio de headers/handle.

## Llamadas a Sheets
- [ ] Los writes pasan por los helpers de `Repository.js` (`appendRowObject_`, upserts) — no releen headers ni handle por append.
- [ ] Sin lecturas repetidas de la misma hoja dentro de un request (usa el memo o un índice).
- [ ] Lecturas frecuentes y filtradas usan los **índices lazy** de `Repository_Indexes.js` (`getOrgsFiltered_`, `getCasosFiltered_`, `buildHitosByOrgIdIndex_`, …) en vez de recorrer la hoja completa. `invalidateAllIndexes_()` tras cambios estructurales.

## Round-trips (arranque y vistas)
- [ ] El arranque y cada vista completan con **el mínimo de round-trips**: prefiere un **endpoint compuesto** (`getInicioBootstrapData()` = dashboard + panel + alertas en una ejecución) en vez de varias llamadas `api()`.
- [ ] Los logs no críticos se **difieren** fuera de `doGet` (no escribir en el spreadsheet antes de servir la página); el cliente los registra tras el primer render.

## Escrituras y concurrencia
- [ ] Escrituras con `try/catch`; `SpreadsheetApp.flush()` antes de liberar locks cuando una lectura inmediata depende del write.
- [ ] Acciones > 2 s tienen **guard anti doble envío** (`APP.state.*Submitting` / botón deshabilitado); la validación backend de duplicados es la red de seguridad, no la primera defensa.

## Anti-patrones prohibidos
- ❌ Guardar un TTL en `GO_PES_RUNTIME` y esperar que acierte entre llamadas.
- ❌ Enganchar invalidación de cache a `invalidateRequestIndexes_`/rutas que también escriben logs.
- ❌ `Utilities.sleep()` / tiempos fijos "para que alcance a…".
- ❌ Releer una hoja completa dentro de un bucle.
- ❌ Un cache más agresivo que sirve datos obsoletos (rompe correctitud — no es mejora).

## Cierre
- [ ] Re-medido antes/después (frío y caliente).
- [ ] `goPesRunAllTests()` en 0 fallos.
- [ ] Reporte con números y archivos/líneas tocadas.
