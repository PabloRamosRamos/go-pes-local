# Rendimiento — GO-PES v2 (plan consolidado)

**Propósito:** documento único de rendimiento del proyecto. Consolida (2026-08) tres docs previos —`plan-rendimiento-agresivo.md` (diagnóstico transversal D1–D6 + fases), `performance-plan-agresivo.md` (optimizaciones con código) y `performance-analisis-modulos.md` (análisis por módulo)— hoy en `archive/`. El estado por fases activo vive en [`performance-implementacion-pendiente.md`](performance-implementacion-pendiente.md).

**Base:** v2.1.905 · síntoma reportado: "la app demora en procesar y realizar acciones". Para operar estas reglas al programar, usa las skills `go-pes-performance` (backend/datos) y `go-pes-ui-rapida` (velocidad percibida).

---

## Estado actual (qué está hecho y qué falta)

| Hallazgo | Estado |
|----------|--------|
| **D1** — caches de Dashboard/Alertas nunca acertaban entre ejecuciones (vivían en `GO_PES_RUNTIME`) | ✅ **Resuelto** — migrados a `CacheService` (script/user), endpoint unificado `getInicioBootstrapData()`, prefetch condicional |
| **D2** — sobrecosto fijo por escritura (headers releídos, doble invalidación de índices) | ✅ **Resuelto** — `ensureSheetWithHeaders_` memoizada, `GO_PES_RUNTIME.headersBySheet`, invalidación solo-datos |
| **D3** — logging síncrono en el camino crítico (`logAccess_` en `doGet`) | ✅ **Resuelto** — log de apertura diferido post-render (`goPesLogAppOpened`) |
| **D4** — lock global de documento serializa a todos los usuarios | 🔄 **Pendiente** |
| **D5** — payload de boot ~1.24 MB + módulos servidos a todos | 🔄 **Pendiente** (Manual y módulos por rol bajo demanda) |
| **D6** — doble clonación en cada lectura (`getSheetData_`) | 🔄 **Pendiente** |
| **Índices lazy** (los 9 prioritarios) | ✅ **Implementados** en `Repository_Indexes.js` |

---

## Diagnóstico (D1–D6)

- **D1.** `Dashboard.js` y `Alertas.js` guardaban resultados en `GO_PES_RUNTIME` con TTL, pero en Apps Script cada `google.script.run` es una ejecución nueva con memoria global vacía: el TTL era código muerto. El patrón correcto (`CacheService`) ya existía en `Catalogs.js`.
- **D2.** `appendRowObject_` pagaba, por fila, `ensureSheetWithHeaders_` + lectura de headers + `appendRow` (3+ llamadas API), más doble `invalidateRequestIndexes_()`.
- **D3.** `logAccess_` y appends a `LOG_*` escribían síncronos dentro de la request del usuario; `doGet` logueaba antes de servir la página.
- **D4.** Escrituras con `LockService.getDocumentLock()` compartido entre todos los usuarios: dos operadores guardando en paralelo se serializan.
- **D5.** `Index.html` incluye todo inline (~1.24 MB): `Scripts_Beneficios` (252 KB), `Styles` (240 KB), `Manual` (122 KB), `Scripts_Admin` (116 KB) se sirven a todos aunque casi nunca se abran.
- **D6.** `getSheetData_` ejecuta `cloneRowObjects_` dos veces por lectura (costo de CPU ×16 lecturas del dashboard).

---

## Plan por fases

Cada fase es deployable por separado, con medición antes/después y `goPesRunAllTests()` en DEV antes de PROD. Orden = ratio impacto/riesgo.

| Fase | Qué | Esfuerzo | Impacto | Estado |
|------|-----|----------|---------|--------|
| 2.0 | Medir línea base (`Diagnostics.js`, p50/p95 de 8 endpoints) | ½ día | — | infra lista |
| 2.1 | `CacheService` real para dashboard/alertas/panel | 1–2 d | Muy alto | ✅ hecho |
| 2.2 | Cache warmer (trigger cada 5 min precalienta dashboard) | ½ día | Alto | 🔄 pendiente |
| 2.3 | Dieta de escrituras (headers cacheados, logs diferidos, ventana de lock) | 1–2 d | Alto | ✅ parcial (D2/D3), D4 pendiente |
| 2.4 | Boot en 1 round-trip (`getInicioBootstrapData`) | 1 día | Medio-alto | ✅ hecho |
| 2.5 | Dieta de payload (Manual + módulos por rol bajo demanda) | 2–3 d | Alto (1ª carga) | 🔄 pendiente |
| 2.6 | Lecturas estructuralmente más baratas (D6, batchGet, lecturas selectivas) | 2–4 d | Alto (futuro) | 🔄 pendiente |

**Notas de fases pendientes:**
- **2.5** — riesgo principal: los parciales JS comparten scope (IIFE + globales); condicionar la inclusión por rol puede lanzar `ReferenceError` si hay referencias cruzadas. Requiere grep de símbolos cruzados y prueba por rol (visor/operador/superuser). **`Styles.html` es intocable**: su auditoría de CSS muerto necesita aprobación explícita y push dedicado reversible.
- **2.6.2** — `Sheets.Spreadsheets.Values.batchGet` traería las ~16 lecturas del dashboard en 1 llamada, pero **añade scope OAuth + servicio avanzado** → requiere aprobación (regla: no agregar dependencias sin aprobar) y puede forzar re-autorización de usuarios.

---

## Índices recomendados (los 9 de mayor ROI)

Implementados en `Repository_Indexes.js` (`build*Index_` + `getOrgsFiltered_`/`getCasosFiltered_`).

| # | Índice | Tabla | Módulos | Prioridad |
|---|--------|-------|---------|-----------|
| 1 | `hitosByOrgId` | FACT_AVANCE_HITOS | Organizaciones, Avance, Dashboard, Beneficios | 🔴 1 |
| 2 | `orgsByUv` | MAE_ORGANIZACIONES | Dashboard, Búsqueda, Reportes | 🔴 2 |
| 3 | `hitosBySolicitudId` | FACT_AVANCE_HITOS | Organizaciones, Ficha, Avance (grupos) | 🔴 3 |
| 4 | `sociosByOrgId` | FACT_SOCIOS | Organizaciones, Socios | 🟡 4 |
| 5 | `orgById` | MAE_ORGANIZACIONES | Socios, Beneficios, Avance | 🟡 5 |
| 6 | `casosByNombreNorm` | MAE_CASOS | Búsqueda | 🟡 6 |
| 7 | `estadosByOrgId` | FACT_AVANCE_ESTADO | Avance | 🟢 7 |
| 8 | `beneficiosByOrgId` | FACT_BENEFICIOS_ORG | Beneficios | 🟢 8 |
| 9 | `catalogoHitosByCodigo` | CAT_HITOS_AVANCE | Avance (join timeline) | 🟢 9 |

Memoria estimada ~5–10 MB por ejecución (dentro de límites GAS).

## Optimizaciones de diseño (detalle en archive)

Los tres patrones y su código completo están en `archive/performance-plan-agresivo.md`:
1. **Índices in-memory** (índices invertidos, ya implementados) — impacto alto.
2. **Lazy loading de tablas** (queries con LIMIT / lecturas selectivas) — impacto medio.
3. **Batch writes con queue** (`appendRowObjects_`/`setValues` en importaciones masivas) — impacto crítico en operaciones >20 filas.

Análisis por módulo (Inicio, Organizaciones, Avance, Búsqueda, Ficha, Socios, Beneficios) con tiempos antes/después: en `archive/performance-analisis-modulos.md`. Meta global: sesión típica de ~45 s → ~10 s (−75%).

---

## Qué NO hacer (descartado conscientemente)

- **No migrar** a otra plataforma/BD (Firestore, Cloud SQL): rompe el modelo "spreadsheet = BD", requisito operativo del municipio.
- **No** agregar frameworks/bundlers frontend (prohibido; el beneficio real está en el servidor).
- **No** usar `PropertiesService` como cache de datos (límite 9 KB/propiedad); `CacheService` es la herramienta.
- **No** paralelizar `google.script.run` masivamente: cada llamada abre una ejecución GAS con overhead fijo. La dirección correcta es **consolidar** (endpoints compuestos), no multiplicar.

## Advertencias de producción
- Cache (2.1/2.2): una invalidación sin conectar deja el dashboard hasta 3 min desactualizado tras guardar; el botón "Actualizar" debe hacer bypass del cache.
- Dieta de escrituras (2.3): cambia el orden datos→logs; una ejecución interrumpida podría perder un log (los datos se escriben primero).
- Payload por rol (2.5): es el cambio con más superficie de regresión; hacerlo en pushes pequeños (uno por parcial).
