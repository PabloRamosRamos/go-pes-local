> **Relación con otros documentos:** complementa a [`performance-plan-agresivo.md`](performance-plan-agresivo.md) (plan por módulos) y [`performance-implementacion-pendiente.md`](performance-implementacion-pendiente.md) (estado de fases). Este documento aporta el diagnóstico transversal D1–D6. Pendiente: consolidar los tres en un solo plan.
> **Nota 2026-07-13:** el hallazgo de D2 sobre `invalidateRequestIndexes_()` duplicada en `Repository.js` ya fue corregido (definición única fusionada; llamadas dobles en `appendRowObject_`/`appendRowObjects_` deduplicadas el 2026-07-14).
> **Nota 2026-07-14:** D1 (caches Dashboard/Alertas que nunca acertaban entre ejecuciones) y D3 (logAccess síncrono en doGet) quedaron **resueltos** con el bloque P1: `CacheService` script/user cache, endpoint unificado `getInicioBootstrapData()`, prefetch condicional y `goPesLogAppOpened` post-render. Pendientes de este plan: D2 (sobrecosto por append), D4 (lock global), D5 (payload de boot 1,2 MB), D6 (doble clonación en lecturas).

# Plan de mejora agresivo de rendimiento — GO-PES v2

**Fecha:** 2026-07-10
**Versión base:** 2.1.905 · build `47d37d5`
**Síntoma reportado:** la app demora mucho en procesar y realizar acciones.
**Continuidad:** este plan retoma donde quedó la optimización de 2026-06-23 (Fases 0 y 1, commit `f8890c1`: índices lazy + fix de caché de catálogos, con mejoras medidas de -28% a -81%). Las fases aquí numeradas continúan esa serie.

---

## 1. Diagnóstico — por qué está lenta (evidencia en código)

### D1. Los caches de Dashboard y Alertas NUNCA aciertan entre llamadas — el hallazgo más importante

`Dashboard.js` (línea ~74) y `Alertas.js` (línea ~511) guardan sus resultados en `GO_PES_RUNTIME[cacheKey]` con TTL de 3 y 5 minutos. Pero en Apps Script **cada llamada `google.script.run` es una ejecución nueva con memoria global vacía**: `GO_PES_RUNTIME` muere al terminar cada request. El TTL es código muerto; el cache solo acierta dentro de una misma ejecución.

Consecuencia: **cada apertura del módulo Inicio recalcula el dashboard desde cero leyendo ~16 hojas completas** (`getSheetData_` × 16 en `Dashboard.js`), más las alertas (9 lecturas en `Alertas.js`). Con hojas de miles de filas, eso son varios segundos por visita, siempre.

El proyecto ya tiene el patrón correcto implementado: `Catalogs.js` usa `CacheService` con TTL 300s (`getCatalogCacheJson_`/`putCatalogCacheJson_`). Dashboard y Alertas simplemente no lo usan.

### D2. Cada escritura paga sobrecosto fijo evitable

`appendRowObject_` (Repository.js) hace, **por cada fila escrita**: `ensureSheetWithHeaders_` (verificación de hoja) + lectura de headers vía `getRange(1,1,1,lastCol).getValues()` + `appendRow`. Son 3+ llamadas a la API de Sheets (~200–400 ms c/u) por append. Además invalida los índices **dos veces** (líneas duplicadas `invalidateRequestIndexes_()`).

Una acción como `guardarIngreso` encadena appends a `RAW_Formulario_Ingreso`, `MAE_Casos` (upsert), `FACT_Avance_Hitos` y logs → **1.5–3 s solo en escrituras**, sin contar validaciones ni lecturas previas. Nótese que `GO_PES_RUNTIME.headersBySheet` ya existe como slot de cache pero `appendRowObject_` no lo usa.

### D3. Logging síncrono en el camino crítico

`logAccess_` y los appends a `LOG_Procesamiento`/`LOG_Acciones_Usuario` escriben a hoja de forma síncrona dentro de la request del usuario. Cada log añade ~300–500 ms a la acción que el usuario está esperando. `doGet` mismo hace `logAccess_('OPEN_APP')` antes de servir la página.

### D4. Lock global de documento serializa a todos los usuarios

Las escrituras usan `LockService.getDocumentLock().waitLock(30000)`. El lock de documento es compartido entre **todos** los usuarios de la webapp: si dos operadores guardan a la vez, el segundo espera al primero completo (incluidos sus logs). El lock se adquiere antes de validar el payload y se libera después de todo, ampliando la ventana de serialización.

### D5. Boot del cliente: payload de 1.24 MB + múltiples round-trips

`Index.html` incluye **todo** inline en cada carga: 1.241.113 bytes de parciales, donde destacan `Scripts_Beneficios` (252 KB), `Styles` (240 KB), `Manual` (122 KB), `Scripts_Admin` (116 KB), `Scripts` (105 KB). El Manual y el módulo Admin se sirven a todos los usuarios en cada carga aunque casi nunca se abran. A eso se suman los data URIs de `Assets.js` (108 KB) inyectados en el template.

Tras el parse, `init()` dispara `getDashboardData` + `getInicioPanelData` (prefetch paralelo) + catálogos + `getAlertasUsuario` — 3–4 round-trips de servidor donde cada uno paga el problema D1.

### D6. Doble clonación en cada lectura de datos

`getSheetData_` ejecuta `cloneRowObjects_` dos veces por lectura (al guardar en runtime y al devolver). Para una hoja de 5.000 filas × 30 columnas son ~300.000 `Object.assign` extra por llamada — costo puro de CPU que se multiplica por las 16 lecturas del dashboard.

---

## 2. Objetivos medibles

| Métrica | Hoy (estimado) | Meta |
|---|---|---|
| Abrir módulo Inicio (dashboard listo) | 4–8 s | **< 1.5 s** (cache caliente < 0.5 s) |
| Guardar ingreso / seguimiento / socio | 3–6 s | **< 2 s** |
| Carga inicial de la app (splash → interactiva) | 6–10 s | **< 4 s** |
| Payload HTML inicial | 1.24 MB | **< 700 KB** |

Los valores "hoy" deben confirmarse en Fase 2.0 con la instrumentación existente antes de tocar nada.

---

## 3. Plan por fases

> Cada fase es deployable por separado, con medición antes/después y test suite completa (`goPesRunAllTests`) en DEV antes de PROD. Orden = ratio impacto/riesgo.

### FASE 2.0 — Medir línea base (½ día, riesgo nulo)

Ya existe la infraestructura (`Diagnostics.js` + `goPesDiagPayloadSize_`, instrumentados 7 endpoints en Fase 0 anterior). Acciones:

1. Activar trazas en DEV y PROD por 2–3 días de uso real.
2. Registrar p50/p95 de: `getDashboardData`, `getInicioPanelData`, `getAlertasUsuario`, `guardarIngreso`, `guardarSeguimiento`, `obtenerFicha`, `buscarVecino`, `getSociosModuloClient`.
3. Registrar filas/columnas reales de las hojas grandes (MAE_Casos, FACT_*, MASTER_DATOS) — el costo crece linealmente con esto.

**Criterio de salida:** tabla de línea base en `docs/` contra la cual se mide todo lo demás.

### FASE 2.1 — Cache compartido real para Dashboard, Alertas y Panel de Inicio (1–2 días, impacto MUY ALTO, riesgo bajo)

Corrige D1 reutilizando el patrón ya probado de `Catalogs.js`:

1. Reemplazar `GO_PES_RUNTIME[cacheKey]` por `CacheService.getScriptCache()` en `getDashboardData` (JSON, TTL 180 s) y `getAlertasUsuario` (TTL 300 s; la clave ya es por usuario). Ojo con el límite de 100 KB por entrada de CacheService: si el JSON del dashboard lo supera, fragmentar (patrón chunking) o recortar el payload.
2. Invalidación: los puntos ya existen (`invalidateDashboardCache` en Dashboard.js, y Alertas ya invalida dashboard). Redirigirlos a `CacheService.remove()`. Conectarlos a los writes relevantes (guardar ingreso/hito/beneficio).
3. Mismo tratamiento para `getInicioPanelData`.

**Impacto esperado:** módulo Inicio pasa de recalcular 16+ lecturas de hoja a 1 lectura de cache en la mayoría de las visitas. Es el mayor s/esfuerzo del plan.
**Riesgo:** datos hasta 3 min desactualizados tras un cambio si falla una invalidación — aceptable para un dashboard; documentarlo.

### FASE 2.2 — Cache warmer: dashboard precalculado por trigger (½ día, impacto ALTO, riesgo bajo)

Agresivo pero simple: un trigger temporal cada 5 minutos ejecuta `getDashboardData` (variantes de filtro más usadas, p. ej. sin filtros) y deja el cache caliente. El primer usuario de la mañana ya no paga el cálculo completo. Reutiliza el patrón del trigger existente (`goPesSetupFormacionAutoCloseTrigger_`). Ejecutar el warmer como superuser vía trigger evita el guard de módulo — usar la función interna `_`, no el endpoint público.

### FASE 2.3 — Dieta de escrituras (1–2 días, impacto ALTO en "guardar", riesgo medio)

Corrige D2, D3 y D4:

1. **Headers cacheados:** `appendRowObject_` debe leer headers desde `GO_PES_RUNTIME.headersBySheet` (el slot ya existe) y solo ir a la hoja en el primer uso por ejecución. Elimina 1 llamada API por append.
2. **Eliminar la doble invalidación** de índices (línea duplicada en `appendRowObject_`).
3. **Logs diferidos:** acumular los registros de `LOG_*` en memoria durante la request y hacer un único `appendRowObjects_` (batch, ya existe) al final, después de liberar el lock — o justo antes de retornar. Los logs salen del camino crítico percibido.
4. **Reducir la ventana del lock:** adquirir `waitLock` después de validar el payload y liberarlo antes de escribir logs. Evaluar `getScriptLock()` vs `getDocumentLock()` (equivalentes aquí, pero documentar la elección).
5. **Batch de appends multi-hoja:** donde una acción escribe N filas a la misma hoja (importarSocios, migraciones), usar siempre `appendRowObjects_`/`setValues` — verificar que no queden bucles de `appendRow` unitario.

**Impacto esperado:** guardar pasa de 3–6 s a ~1.5–2.5 s. **Riesgo:** el orden de escritura logs-vs-datos cambia; si una ejecución muere a mitad, podría perderse un log (aceptable — los datos se escriben primero; documentar).

### FASE 2.4 — Boot en un solo round-trip (1 día, impacto MEDIO-ALTO, riesgo bajo)

1. Nuevo endpoint `getInicioBootPayload()` que devuelva en una sola respuesta: dashboard + panel inicio + alertas del usuario (todo desde el cache de Fase 2.1). Reemplaza los 3 prefetches paralelos de `init()`.
2. Como cada uno hoy paga su propia ejecución GAS (~300–700 ms de overhead fijo por llamada incluso con cache), consolidar ahorra 2 ejecuciones completas.
3. Mantener los endpoints individuales para refresco parcial (no romper API pública — regla del proyecto).

### FASE 2.5 — Dieta del payload inicial (2–3 días, impacto ALTO en primera carga, riesgo medio)

Corrige D5. Orden agresivo:

1. **Manual bajo demanda** (−137 KB, riesgo mínimo): sacar `include('Manual')` e `include('ManualProcedimientos')` de `Index.html`; cargar su HTML vía `google.script.run` → `include()` la primera vez que el usuario abre el manual, e inyectarlo en el DOM.
2. **Módulos por rol** (−370 KB para operadores): `Scripts_Admin` (116 KB) solo sirve a superusers y `Scripts_Beneficios` (252 KB) solo a quien tiene el módulo. En `doGet` ya se conoce `permissions.modules`; incluir condicionalmente los parciales en el template (`<? if (permissions...) { ?>`). Los operadores —la mayoría— dejan de descargar y parsear ~30% del JS.
3. **Calendario y FlowchartConfig bajo demanda** (−24 KB): mismos mecanismos.
4. **Auditoría de `Styles.html`** (240 KB): medir CSS no utilizado con DevTools Coverage sobre un recorrido completo de la app. ⚠️ **`Styles.html` es intocable por regla del proyecto** — esta subfase requiere aprobación explícita y se limita a eliminar bloques con 0% de uso verificado en claro Y oscuro, en un push dedicado y reversible. Si no se aprueba, omitirla; los puntos 1–3 no la necesitan.

**Riesgo principal:** los parciales JS comparten scope (IIFE + funciones globales). Al condicionar la inclusión, cualquier referencia cruzada a funciones de un parcial ausente (p. ej. `Scripts.html` llamando algo de `Scripts_Beneficios`) lanzará ReferenceError. Requiere grep de símbolos cruzados antes de cada exclusión y prueba manual por rol (visor, operador, superuser) en DEV.

### FASE 2.6 — Lecturas estructuralmente más baratas (2–4 días, impacto ALTO a futuro, riesgo medio-alto)

Para cuando los datos crezcan; postergarla si 2.1–2.5 dejan la app dentro de las metas:

1. **Eliminar la doble clonación** en `getSheetData_` (D6): clonar solo al devolver, o devolver objetos congelados (`Object.freeze`) y clonar únicamente en los puntos que mutan filas. Requiere auditar quién muta los objetos devueltos — riesgo de efectos sutiles; hacerlo con la suite de 262 tests como red.
2. **Advanced Sheets Service (batchGet):** el dashboard lee ~16 hojas en 16 llamadas `getRange().getValues()`. `Sheets.Spreadsheets.Values.batchGet` las trae en **una** llamada HTTP. Prototipo detrás de un flag en `CFG_Parametros` para comparar A/B. Añade un scope OAuth y una dependencia del servicio avanzado — requiere aprobación explícita (regla del proyecto: no agregar dependencias sin aprobación).
3. **Lecturas selectivas:** para acciones que solo necesitan 1 fila (obtenerFicha parcial, validaciones), evaluar `TextFinder` o índice clave→número de fila persistido en CacheService, en lugar de `getSheetData_` completo.

---

## 4. Qué NO hacer (descartado conscientemente)

- **No migrar a otra plataforma / base de datos** (Firestore, Cloud SQL): rompe el modelo "spreadsheet = BD" que es requisito operativo del municipio.
- **No agregar frameworks ni bundlers frontend**: prohibido por reglas del proyecto y el beneficio real está en el servidor.
- **No usar `PropertiesService` como cache de datos**: límite 9 KB/propiedad y cuotas de escritura; `CacheService` es la herramienta correcta.
- **No paralelizar `google.script.run` masivamente desde el cliente**: cada llamada abre una ejecución GAS con overhead fijo; la dirección correcta es consolidar (Fase 2.4), no multiplicar.

---

## 5. Secuencia recomendada y estimación

| Fase | Esfuerzo | Impacto | Riesgo | Depende de |
|---|---|---|---|---|
| 2.0 Línea base | ½ día | — | Nulo | — |
| 2.1 CacheService dashboard/alertas | 1–2 días | Muy alto | Bajo | 2.0 |
| 2.2 Cache warmer | ½ día | Alto | Bajo | 2.1 |
| 2.3 Dieta de escrituras | 1–2 días | Alto | Medio | 2.0 |
| 2.4 Boot en 1 round-trip | 1 día | Medio-alto | Bajo | 2.1 |
| 2.5 Dieta de payload | 2–3 días | Alto (1ª carga) | Medio | — |
| 2.6 Lecturas estructurales | 2–4 días | Alto (futuro) | Medio-alto | 2.0–2.4 |

Total del núcleo (2.0–2.4): **~5 días** de trabajo efectivo para atacar directamente el síntoma reportado ("procesar/realizar acciones"). 2.5 y 2.6 son la cola agresiva.

**Regla de cierre por fase:** medir contra línea base → `goPesRunAllTests` en DEV → prueba manual de los 3 roles → push a PROD con resumen de cambio y cómo probarlo (regla del proyecto) → medir en PROD.

---

## 6. Advertencias de producción

- Fase 2.1/2.2: si una invalidación de cache queda sin conectar, un usuario puede ver el dashboard hasta 3 min desactualizado tras guardar. Mitigación: botón "Actualizar" del dashboard debe hacer bypass del cache.
- Fase 2.3: cambia el orden datos→logs; una ejecución interrumpida podría dejar acción sin log. Los datos nunca quedan detrás de los logs.
- Fase 2.5: riesgo de ReferenceError por símbolos cruzados entre parciales excluidos por rol — es el cambio con más superficie de regresión visual/funcional; hacerlo en pushes pequeños (uno por parcial).
- Fase 2.6.2: nuevo scope OAuth (`spreadsheets` via advanced service) puede forzar re-autorización de todos los usuarios en el próximo acceso — avisar al equipo antes del push.
