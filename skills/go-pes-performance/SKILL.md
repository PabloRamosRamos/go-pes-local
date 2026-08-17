---
name: go-pes-performance
description: >-
  Optimiza el rendimiento de GO-PES v2 (Google Apps Script): tiempos de carga,
  writes caros, cache que no acierta, arranque lento, doble envío. Úsala para
  "va lento", "tarda mucho en cargar", "optimizar performance", "el guardado
  demora", "cachear", "reducir llamadas a Sheets", "arranque más rápido". Conoce
  las reglas aprendidas del proyecto (GO_PES_RUNTIME es por-ejecución,
  CacheService para cache real, índices lazy, endpoints compuestos). NO es para
  bugs de comportamiento (go-pes-bug) ni features nuevas (go-pes-feature).
---

# go-pes-performance — Rendimiento y cache

Skill para acelerar GO-PES v2 sin romper correctitud. En Apps Script cada llamada `google.script.run` es una **ejecución nueva** con su propio arranque, auth y estado; el costo dominante son las **llamadas a la API de Sheets** y los round-trips cliente↔servidor.

**Lee primero `references/reglas-go-pes.md`.** Material de apoyo de esta skill:
- `references/protocolo-medicion.md` — cómo medir el server antes de tocar (obligatorio).
- `references/checklist-backend.md` — checklist accionable + anti-patrones prohibidos.

> Si el server ya es rápido pero la interfaz **se siente** lenta (parpadeo, la vista tarda en aparecer, cascada de llamadas), el problema es de **velocidad percibida**: usa `go-pes-ui-rapida`.

## Reglas aprendidas (no las reaprendas rompiendo algo)

1. **`GO_PES_RUNTIME` muere al terminar la ejecución.** Sirve como memo *dentro* de un request (evitar releer una hoja varias veces), **no** como cache entre llamadas. Para cache persistente real usa `CacheService` (`getScriptCache()` para datos compartidos, `getUserCache()` para datos por usuario), con TTL y key fija. Precedentes: Dashboard (`CacheService.getScriptCache()`, `invalidateDashboardCache_()`), Alertas (`getUserCache()`, `invalidateAlertasCache_()`).
2. **No enganches la invalidación de cache a rutas que los logs recorren.** Los writes de log también tocan hojas; si atas la invalidación a cada escritura de hoja, matas el cache en cada acción. Usa **TTL + invalidación explícita** en los puntos que de verdad cambian el dato.
3. **Writes solo vía los helpers de `Repository.js`** (`appendRowObject_`, upserts, `ensureSheetWithHeaders_` memoizado). No releas headers ni handles por append; usa la invalidación acotada `invalidateSheetDataCache_` (solo filas) vs la completa `invalidateSheetRuntimeCache_` (estructura).
4. **Índices lazy globales** (`Repository_Indexes.js`): para lecturas frecuentes y filtradas usa/rehúsa los índices (`getOrgsFiltered_`, `getCasosFiltered_`, `buildHitosByOrgIdIndex_`, …) en vez de recorrer hojas completas. `invalidateAllIndexes_()` tras cambios estructurales.
5. **Arranque en 1 round-trip:** prefiere **endpoints compuestos** (`getInicioBootstrapData()` reúne dashboard + panel + alertas en una ejecución) en vez de 3 llamadas `google.script.run`. Difiere logs no críticos fuera de `doGet` (no escribir en el spreadsheet antes de servir la página).
6. **Sin tiempos fijos.** Prohibidos `setTimeout`/sleeps arbitrarios y mínimos de splash: cierra en cuanto el dato está listo.
7. **Guard anti doble envío** en acciones > 2 s: bloquea reenvíos en vuelo (`APP.state.*Submitting` / botón deshabilitado). La validación backend de duplicados queda como red de seguridad, no como primera defensa.
8. **Loaders acotados al área de acción** (nunca fullscreen salvo splash): usa solo las 3 formas estándar (`showModuleLoading`, `showModalLoading`, alias de compat).

## Flujo
1. **Mide primero** (Fase 1 lectura, NO tocar código): identifica el request lento por los logs de ejecución, cuenta sus llamadas a Sheets y sus round-trips. Sigue `references/protocolo-medicion.md`. Presenta el diagnóstico con números **antes** de proponer cambios y espera aprobación.
2. Aplica la regla que corresponda (arriba) recorriendo `references/checklist-backend.md`; **scope mínimo**.
3. **Re-mide** para probar la mejora (mismo protocolo, antes/después) y verifica que la correctitud no se degrada: `goPesRunAllTests()` en 0 fallos, con cache frío y caliente.

## Skills relacionadas
- `go-pes-bug` — si la lentitud esconde un bug (carrera, doble envío que falla).
- `go-pes-esquema-datos` — si el cuello es el diseño de hojas/índices.
- `go-pes-tests`, `go-pes-deploy`.
