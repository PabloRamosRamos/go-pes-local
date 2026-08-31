---
name: go-pes-performance
description: Diagnostica y corrige problemas de performance en GO-PES v2 (Google Apps Script + Sheets) con un test de timing GAS-puro. Úsala cuando el usuario reporte que la app va lenta, que guardar/registrar demora, que buscar o listar tarda, que se traba con varios usuarios, o que quiere optimizar, medir tiempos, revisar cache/índices o evaluar migrar a base de datos. Mide primero (Perf.js), identifica el cuello de botella y aplica el fix mínimo. NO usar para features nuevas (go-pes-feature), rediseño visual (go-pes-rediseno-visual) ni bugs de color (go-pes-colores).
---

# go-pes-performance — Diagnóstico y optimización de performance

Skill de **medir antes de tocar** para GO-PES v2. Regla de oro del proyecto: la Fase 1 es lectura y no se optimiza a ciegas. En una app GAS + Sheets el tiempo casi nunca se va en "la base de datos" en abstracto, sino en operaciones concretas y medibles. Esta skill trae el instrumento (`Perf.js`) para ubicarlas.

> Reglas compartidas del proyecto: ver `references/reglas-go-pes.md` (copia bundleada del maestro `skills/reglas-go-pes.md`). Aplican íntegras: leer la función completa antes de tocarla, no renombrar públicas, `Styles.html`/`ThemeDark.html` intocables, scope mínimo, reportar qué cambió, avisar riesgos, y **PROD = datos reales de vecinos**.

> Si el server ya es rápido pero la interfaz **se siente** lenta (parpadeo, la vista tarda en aparecer, cascada de llamadas), el problema es de **velocidad percibida**: usa `go-pes-ui-rapida`.

## Cuándo se activa

- "la app está lenta", "guardar demora", "el ingreso tarda", "buscar es lento", "se traba con varios usuarios".
- "optimizar performance", "medir tiempos", "por qué es lento", "cuello de botella".
- "revisar cache / índices / TTL", "reducir llamadas a Sheets".
- "¿conviene migrar a una base de datos?" → esta skill mide primero para responderlo con datos, no por intuición.

## Cuándo NO usarla

- Implementar un módulo/feature nuevo → `go-pes-feature`.
- Cambiar apariencia/layout sin backend → `go-pes-rediseno-visual`.
- Tocar colores/branding o el bug visual de fondo → `go-pes-colores`.
- Correr o escribir la batería de tests → `go-pes-tests` (esta skill la invoca en la fase de verificación).

## Se compone con

- `go-pes-tests` → correr `goPesRunAllTests()` antes y después del fix (0 fallos).
- `go-pes-deploy` → llevar el fix DEV → PROD con `push-dev.ps1` / `push-prod.ps1`.
- `go-pes-esquema-datos` → si el fix toca índices, hojas o vistas derivadas.
- `go-pes-ui-rapida` → si el problema es velocidad **percibida**, no del server.

## Principio rector (por qué guardar es lento en GAS + Sheets)

Un "guardar" lento rara vez es la escritura de la fila (eso es barato). Los costos dominantes, en orden de probabilidad:

1. **Reconstrucción de vistas derivadas** — reescribir `VW_*` y `MASTER_DATOS` completas en cada guardado (`goPesRefrescarVistasYMaster`, `recalcularFicha`, `reconstruirEstructurasDesdeRaw_`). Reescribir hojas enteras es lo más caro que existe en Apps Script.
2. **I/O contra Sheets** — múltiples `getValues()`/`setValues()`/`appendRow()`, cada uno un viaje de ida y vuelta.
3. **Serialización** — `serializeForClient_` sobre datasets grandes.
4. **Contención** — `LockService` cuando varios operadores escriben a la vez.
5. **Carga del frontend** — payload inicial pesado (costo de arranque, no de cada acción).

Migrar a una BD ataca sobre todo (2) y (4); pero si el problema es (1), se arregla en el código actual (rebuild incremental o diferido) sin migrar y sin riesgo para PROD.

## Reglas aprendidas (no las reaprendas rompiendo algo)

Conocimiento acumulado del proyecto; el `references/checklist-backend.md` las convierte en checklist accionable con anti-patrones.

1. **`GO_PES_RUNTIME` muere al terminar la ejecución.** Sirve como memo *dentro* de un request (evitar releer una hoja varias veces), **no** como cache entre llamadas. Para cache persistente real usa `CacheService` (`getScriptCache()` para datos compartidos, `getUserCache()` para datos por usuario), con TTL y key fija. Precedentes: Dashboard (`invalidateDashboardCache_()`), Alertas (`invalidateAlertasCache_()`).
2. **No enganches la invalidación de cache a rutas que los logs recorren.** Los writes de log también tocan hojas; si atas la invalidación a cada escritura de hoja, matas el cache en cada acción. Usa **TTL + invalidación explícita** en los puntos que de verdad cambian el dato.
3. **Writes solo vía los helpers de `Repository.js`** (`appendRowObject_`, upserts, `ensureSheetWithHeaders_` memoizado). No releas headers ni handles por append; usa la invalidación acotada `invalidateSheetDataCache_` (solo filas) vs la completa `invalidateSheetRuntimeCache_` (estructura).
4. **Índices lazy globales** (`Repository_Indexes.js`): para lecturas frecuentes y filtradas usa/rehúsa los índices (`getOrgsFiltered_`, `getCasosFiltered_`, `buildHitosByOrgIdIndex_`, …) en vez de recorrer hojas completas. `invalidateAllIndexes_()` tras cambios estructurales.
5. **Arranque en 1 round-trip:** prefiere **endpoints compuestos** (`getInicioBootstrapData()` reúne dashboard + panel + alertas en una ejecución) en vez de 3 llamadas `google.script.run`. Difiere logs no críticos fuera de `doGet` (no escribir en el spreadsheet antes de servir la página).
6. **Sin tiempos fijos.** Prohibidos `setTimeout`/sleeps arbitrarios y mínimos de splash: cierra en cuanto el dato está listo.
7. **Guard anti doble envío** en acciones > 2 s: bloquea reenvíos en vuelo (`APP.state.*Submitting` / botón deshabilitado). La validación backend de duplicados queda como red de seguridad, no como primera defensa.
8. **Loaders acotados al área de acción** (nunca fullscreen salvo splash): usa solo las 3 formas estándar (`showModuleLoading`, `showModalLoading`, alias de compat).

---

## Fase 1 — Lectura (NO editar)

1. Confirmar el síntoma con el usuario: ¿qué operación se siente lenta? (cargar / **guardar** / buscar / concurrencia).
2. Ubicar la ruta de código del síntoma. Para "guardar", buscar la función pública que dispara el guardado desde el frontend:
   - `grep` en `Scripts_NuevoIngreso.html` / `Scripts_Ficha.html` las llamadas `google.script.run.<fn>(...)`.
   - Leer esa función pública **completa** en el backend (`NuevoIngreso.js` / `Services.js`) y mapear sus fases: validación → escritura → índices → **refresco de vistas/master** → serialización.
   - Anotar qué funciones de rebuild invoca y qué hojas toca.
3. Revisar la capa de cache e índices existente: `GO_PES_RUNTIME` (Repository.js), `Repository_Indexes.js`, TTLs. Ver qué se cachea y qué se invalida en cada guardado.
4. **Presentar el mapa de la ruta + hipótesis de dónde está el tiempo. No tocar código hasta aprobación.**

## Fase 2 — Medir (con `Perf.js`, y con los logs)

El instrumento vive en `references/Perf.js`. Copiarlo al proyecto como `Perf.js` (junto a `Audith.js`), pushear a **DEV** y correr:

**a) Profiler read-only de hojas (seguro en cualquier entorno):**

```
goPesPerfProbe()
```

Cronometra la lectura de cada hoja y las ordena de más lenta a más rápida. Marca con ▸ las derivadas (`VW_*`, `MASTER_*`). Sirve para ver qué hojas pesan.

**b) Profiler del rebuild de vistas (ESCRIBE — correr en DEV):**

```
goPesPerfProbeRebuild()          // libre en DEV
goPesPerfProbeRebuild("REBUILD") // exige token fuera de DEV; solo en ventana de baja carga
```

Cronometra `goPesRefrescarVistasYMaster` y afines. Es la medición que confirma o descarta la hipótesis (1).

**c) Instrumentar el guardado real (la medición definitiva):**

Seguir `references/instrumentar-guardado.md`: envolver la función pública de guardado con `goPesPerfStart_` / `goPesPerfMark_` / `goPesPerfFinish_`, pushear a DEV, hacer **un** guardado real y leer el desglose por fase. Revertir la instrumentación al terminar.

**Complemento sin instrumentar:** cuando no puedas tocar el código aún, mide desde afuera con `references/protocolo-medicion.md` (panel de ejecuciones + `clasp logs`): función, duración, nº de llamadas a Sheets y round-trips. Deja la **línea base** escrita antes de proponer cambios.

**Cómo leer los resultados:** `Perf.js` emite en Cloud Logging (`clasp logs`) una tabla legible y un bloque JSON delimitado por `===PERF-JSON=== … ===END-PERF-JSON===` para que Claude Code lo parsee sin ambigüedad. Cada función además retorna el objeto (visible en el editor de Apps Script).

## Fase 3 — Diagnosticar (árbol de decisión)

Con los tiempos medidos, decidir dónde está el cuello de botella:

- **Domina el refresco de vistas/master** (fase `refrescar_vistas*` >> resto) → la causa es reescribir hojas completas. Fix: rebuild **incremental** (solo filas afectadas) o **diferido** (guardar rápido; reconstruir bajo demanda o con trigger por tiempo). Es el mayor impacto/menor riesgo.
- **Dominan lecturas/escrituras repetidas de Sheets** → **batch**: leer una vez a memoria, operar, escribir una vez; usar los índices de `Repository_Indexes.js` en vez de reescanear.
- **Domina la serialización** → recortar el payload a lo que el cliente realmente usa.
- **Solo se degrada con varios usuarios** → contención de `LockService`; acá una BD real (concurrencia) es la opción de fondo — medir antes de decidir migrar.

## Fase 4 — Fix mínimo

Recorre `references/checklist-backend.md` (ítems anclados a primitivas reales del repo + anti-patrones prohibidos) al aplicar el cambio.

- Un solo cambio, el de mayor impacto según la medición. Scope mínimo (regla del proyecto).
- No renombrar funciones públicas. Los fallbacks del sistema son intencionales.
- Si el fix difiere el rebuild, dejar una vía explícita para reconstruir (menú/bajo demanda) y documentarla.
- Reportar exactamente qué archivo y línea cambió y por qué.

## Fase 5 — Verificar

- Re-correr `goPesPerfProbe()` / la instrumentación y comparar **antes vs. después** (adjuntar los dos bloques JSON). Prueba **cache frío** y **caliente** por separado.
- Correr `goPesRunAllTests()` → 0 fallos (delegar en `go-pes-tests`). Confirma que la invalidación de cache sigue disparando cuando el dato cambia (un cache que sirve datos viejos es un bug, no una mejora).
- Verificar manualmente la operación afectada en DEV.

## Fase 6 — Deploy

- Delegar en `go-pes-deploy` (DEV → PROD). Acompañar el push con resumen de qué cambió y cómo probarlo.
- **Advertir explícitamente** cualquier riesgo sobre PROD antes de ejecutar.
- Quitar `Perf.js` del deploy a PROD, o dejarlo solo si sus públicas están tras guard de superuser (lo están) y no se registran en menús de usuario.

---

## Cómo ejecutar con Claude Code (el loop)

1. CC copia `references/Perf.js` → `Perf.js` en el proyecto.
2. Usuario corre `.\push-dev.ps1` (o `clasp -u dev push`).
3. Se ejecuta la función desde el **editor de Apps Script** (Ejecutar → `goPesPerfProbe`) o desde el menú si se registra. Alternativa avanzada: `clasp run goPesPerfProbe` (requiere API Ejecutable habilitada).
4. CC lee la salida con `clasp logs` y parsea el bloque `===PERF-JSON===`.
5. CC interpreta con el árbol de Fase 3 y propone el fix mínimo.

## Seguridad

- `goPesPerfProbe()` es **read-only** → seguro en PROD.
- `goPesPerfProbeRebuild()` y la instrumentación del guardado **escriben** → correr en **DEV**; en PROD solo con token y en ventana de baja carga.
- Ambas públicas validan **superuser**.

## Archivos de referencia

- `references/Perf.js` — módulo GAS del test de timing (profilers + micro-timer).
- `references/instrumentar-guardado.md` — plantilla y procedimiento para medir la ruta de guardado real.
- `references/protocolo-medicion.md` — medir desde afuera (panel de ejecuciones + `clasp logs`) cuando aún no se instrumenta.
- `references/checklist-backend.md` — checklist accionable de fix + anti-patrones prohibidos.
- `references/reglas-go-pes.md` — reglas y convenciones compartidas (sincronizar desde el maestro antes de empaquetar).
