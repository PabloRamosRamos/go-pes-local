---
name: go-pes-dashboard-cache
description: >-
  Codifica el patrón de frescura y cacheo del dashboard de KPIs de GO-PES (app
  Apps Script de solo lectura): precálculo por trigger time-driven, servido desde
  CacheService con respaldo durable en Script Property, fail-safe al último dato
  bueno, sello de frescura ("actualizado hace X"), TTL/invalidación de dashboard
  operativo y LockService contra ejecuciones solapadas. Úsala SIEMPRE que se
  implemente o ajuste el cacheo, el refresco o los triggers del dashboard:
  "cachear los KPIs", "trigger que precalcula", "refrescar el dashboard cada N
  minutos", "el dashboard lee el Spreadsheet en cada request", "que no se rompa
  si el trigger falla", "mostrar actualizado hace X", "sello de frescura", "TTL
  del dashboard", "invalidar el cache del dashboard", "dos triggers coinciden",
  "LockService en el refresco", aunque no se nombre la palabra "skill". Es el
  complemento de frescura de `go-pes-appsscript-dashboard` (que cubre la construcción
  general del dashboard). NO es para escribir en el Spreadsheet ni para el
  dashboard interno container-bound de GO-PES (Dashboard.js).
---

# go-pes-dashboard-cache — Patrón de frescura del dashboard de KPIs

El dashboard de KPIs es una app Apps Script de **solo lectura** que consume el
Spreadsheet de PROD. Leer hojas completas tarda segundos y consume cuota; además
las globales de GAS se reinician en cada `google.script.run`. Por eso el request
del usuario **nunca** debe leer el Spreadsheet: lee un resultado **ya precalculado**.

**La idea central:** un trigger precalcula los KPIs cada pocos minutos y los deja
listos; el request del usuario solo sirve lo cacheado y le pega un sello de cuándo
se calculó. Frescura de minutos, no tiempo real — y honesto sobre ello.

Esta skill es el complemento de frescura de `go-pes-appsscript-dashboard` (construcción
general). Aquí se profundiza solo en cache, refresco, fallback y sello de frescura.

## Las 5 reglas duras

1. **El request del usuario nunca recalcula ni lee el Spreadsheet.** Solo lee el
   snapshot cacheado. Si no hay snapshot, devuelve un estado "calentando", no una
   lectura en vivo. Recalcular en el request reintroduce la lentitud y la cuota
   que este patrón existe para evitar.
2. **Dos almacenes con roles distintos.** `CacheService` es el camino caliente
   (rápido, pero **se puede desalojar antes del TTL** y tiene tope por valor). Un
   **Script Property** guarda el **último dato bueno durable** que sobrevive al
   desalojo y al reinicio del script. No son alternativas por tamaño: son capas.
3. **Fail-safe: el trigger puede fallar; el dashboard no.** Si el precálculo
   revienta (PROD caído, esquema cambiado, timeout), se conserva el último
   snapshot bueno y se sigue sirviendo. Un dashboard que muestra dato viejo con su
   sello es correcto; uno que muestra un error o ceros no lo es.
4. **Todo dato lleva su sello de frescura.** El payload incluye `computedAt`
   (epoch ms) y el frontend muestra visiblemente "actualizado hace X". Nadie debe
   poder confundir un agregado cacheado con tiempo real.
5. **Un solo refresco a la vez.** Si dos ejecuciones del trigger pueden solaparse,
   se serializan con `LockService`; la segunda **cede** (no encola ni duplica el
   trabajo de leer todo el Spreadsheet).

## Limitaciones reales de GAS que fijan el diseño

Espejo de lo que la app ya usa (`putCatalogCacheJson_` en `Catalogs.js`):

- **CacheService:** ~100 KB por valor. La app corta con guard a **90000 bytes**
  (`if (payload.length > 90000) return;`) por margen. TTL máximo 6 h; aquí basta
  minutos. **Puede desalojarse antes del TTL** bajo presión de memoria → por eso
  existe la regla 2.
- **PropertiesService:** ~9 KB por valor, ~500 KB total por store. Es **durable**.
  Los KPIs son agregados (conteos, %, series) → caben de sobra en pocos KB. Si un
  payload superara 9 KB, va solo a cache (o se **trocea** en varias claves de
  cache), nunca a un property gigante.
- **Helpers fail-safe:** lectura y escritura de cache van en `try/catch` que
  devuelve `null` / no-op. Un fallo de infra de cache nunca debe tumbar el request.

## Patrón A — Config desde Script Properties (nada hardcodeado)

```javascript
function getCacheConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    ttlSeconds:       Number(p.getProperty('CACHE_TTL_SECONDS') || 360),   // 6 min
    refreshEveryMin:  Number(p.getProperty('REFRESH_EVERY_MIN') || 5),     // trigger
    staleWarnSeconds: Number(p.getProperty('STALE_WARN_SECONDS') || 900)   // 15 min
  };
}
```

**Por qué el TTL del cache (6 min) > intervalo del trigger (5 min):** deja un
colchón. Si un refresco se salta o falla, el snapshot anterior sigue vivo en cache
y el usuario no cae a un miss frío.

## Patrón B — Escribir el snapshot en las dos capas

```javascript
var KPIS_CACHE_KEY = 'go_pes_dashboard_kpis_v1';
var KPIS_PROP_KEY  = 'DASHBOARD_LAST_GOOD_KPIS';   // último dato bueno durable

/** Guarda el snapshot en cache (caliente) y en property (durable). */
function storeSnapshot_(payloadStr) {
  var ttl = getCacheConfig_().ttlSeconds;
  try {
    if (payloadStr.length <= 90000) {
      CacheService.getScriptCache().put(KPIS_CACHE_KEY, payloadStr, ttl);
    }
  } catch (e) { /* cache es best-effort: nunca tumbar por esto */ }
  try {
    if (payloadStr.length <= 9000) {
      PropertiesService.getScriptProperties().setProperty(KPIS_PROP_KEY, payloadStr);
    }
  } catch (e) { /* property es best-effort */ }
}

/** Recupera el mejor snapshot disponible: cache primero, property como respaldo. */
function readSnapshot_() {
  try {
    var hot = CacheService.getScriptCache().get(KPIS_CACHE_KEY);
    if (hot) return hot;
  } catch (e) {}
  try {
    return PropertiesService.getScriptProperties().getProperty(KPIS_PROP_KEY) || null;
  } catch (e) { return null; }
}
```

El payload es **JSON string** (igual que GO-PES: evita que `google.script.run`
arruine tipos como `Date`, y calza con lo que cache/property guardan).

## Patrón C — Trigger de refresco con lock (fail-safe)

```javascript
/** Lo llama el trigger time-driven. Precalcula y publica; nunca propaga error. */
function refreshDashboardCache_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(0)) return;              // otro refresco corre: ceder, no encolar
  try {
    var data = computeKpis_();               // lectura de PROD + agregación (puro)
    data.computedAt = Date.now();
    data.ok = true;
    storeSnapshot_(JSON.stringify(data));     // publica el nuevo dato bueno
  } catch (err) {
    // NO se toca el snapshot: se conserva el último dato bueno (regla 3).
    console.error('[dashboard] refresh falló, se mantiene último dato bueno: ' + err);
  } finally {
    lock.releaseLock();
  }
}

/** Correr UNA vez desde el editor para instalar el trigger (idempotente). */
function setupDashboardRefreshTrigger_() {
  var mins = getCacheConfig_().refreshEveryMin;
  var yaExiste = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === 'refreshDashboardCache_';
  });
  if (!yaExiste) {
    ScriptApp.newTrigger('refreshDashboardCache_').timeBased().everyMinutes(mins).create();
  }
  refreshDashboardCache_(); // primer llenado inmediato
}
```

`tryLock(0)` (no `waitLock`) es deliberado: si otro refresco ya corre, este cede
al instante. Encolar solo duplicaría una lectura cara del Spreadsheet.

## Patrón D — El endpoint del usuario: servir cacheado + sello

```javascript
/** API pública (google.script.run). Sirve snapshot; jamás lee el Spreadsheet. */
function getKpisData() {
  var snap = readSnapshot_();
  var cfg  = getCacheConfig_();

  if (!snap) {
    // Aún no hay dato bueno (primer arranque / cache y property vacíos).
    return JSON.stringify({ ok: false, warming: true, computedAt: null });
  }

  var data = JSON.parse(snap);
  var ageMs = data.computedAt ? (Date.now() - data.computedAt) : null;
  data.ageSeconds = ageMs != null ? Math.round(ageMs / 1000) : null;
  data.stale = data.ageSeconds != null && data.ageSeconds > cfg.staleWarnSeconds;
  return JSON.stringify(data);
}
```

El request es O(1): una lectura de cache y un `JSON.parse`. `stale` marca cuándo el
dato ya envejeció demasiado (p. ej. el trigger lleva rato fallando) para que el
frontend lo advierta con fuerza.

## Patrón E — Sello de frescura visible en el frontend

Regla 4 hecha UI. Mostrar siempre "actualizado hace X"; si `warming`, decir que se
está calculando; si `stale`, advertir claramente que el dato está viejo.

```javascript
function renderFreshness(data) {
  var el = document.getElementById('freshness');
  if (data.warming) { el.textContent = 'Calculando indicadores…'; return; }
  el.textContent = 'Actualizado ' + humanizarEdad(data.ageSeconds);
  el.classList.toggle('is-stale', !!data.stale); // estilo de advertencia si viejo
}

function humanizarEdad(seg) {
  if (seg == null) return 'hace un momento';
  if (seg < 60)   return 'hace ' + seg + ' s';
  var min = Math.round(seg / 60);
  if (min < 60)   return 'hace ' + min + ' min';
  var hr = Math.round(min / 60);
  return 'hace ' + hr + ' h';
}
```

No dependas solo del color para el estado `stale` (accesibilidad): acompáñalo de
texto ("dato desactualizado — el refresco automático puede estar fallando").

## Patrón F — Invalidación coherente

Un dashboard operativo tolera minutos de retraso, así que **la invalidación normal
es el propio TTL/refresco**: no hace falta invalidar en cada cambio del Spreadsheet.
Provee además un botón/función manual para forzar refresco tras un cambio grande:

```javascript
function forceRefreshDashboard() {           // acción manual (p. ej. superuser)
  try { CacheService.getScriptCache().remove(KPIS_CACHE_KEY); } catch (e) {}
  refreshDashboardCache_();                  // recalcula y republica ya mismo
  return JSON.stringify({ ok: true });
}
```

Nota: `forceRefreshDashboard` **recalcula en servidor**, no en el request de un
visor. No conviertas el endpoint de lectura (`getKpisData`) en uno que recalcule.

## Diagnóstico (correr desde el editor)

```javascript
function diagnosticoCacheDashboard() {
  var snap = readSnapshot_();
  Logger.log('Config: ' + JSON.stringify(getCacheConfig_()));
  Logger.log('¿Hay snapshot?: ' + (!!snap));
  if (snap) {
    var d = JSON.parse(snap);
    Logger.log('computedAt: ' + new Date(d.computedAt));
    Logger.log('edad (s): ' + Math.round((Date.now() - d.computedAt) / 1000));
  }
  Logger.log('Triggers: ' + ScriptApp.getProjectTriggers().map(function(t) {
    return t.getHandlerFunction();
  }).join(', '));
  return { ok: true };
}
```

Verifica: hay snapshot, el `computedAt` avanza entre corridas del trigger, y el
trigger `refreshDashboardCache_` está instalado.

## Checklist al implementar o ajustar

- [ ] `getKpisData()` **solo** llama `readSnapshot_()` — no `computeKpis_()` ni lecturas de Sheet.
- [ ] El snapshot se escribe en **cache y property**; ambas escrituras son best-effort (try/catch).
- [ ] El trigger usa `LockService` con `tryLock(0)` y **cede** si hay otro corriendo.
- [ ] En el `catch` del trigger **no** se toca el snapshot (se conserva el último bueno).
- [ ] El payload incluye `computedAt`; el frontend muestra "actualizado hace X" y advierte si `stale`.
- [ ] TTL del cache > intervalo del trigger (colchón ante un refresco saltado).
- [ ] El ID de PROD y los tiempos vienen de Script Properties, no del código.

## Cuándo NO usar esta skill

- Construcción general del dashboard (estructura, `doGet`, lectura de vistas,
  sanitizado) → `go-pes-appsscript-dashboard`.
- Cualquier cosa que **escriba** en el Spreadsheet de PROD → este dashboard es solo lectura.
- El dashboard interno container-bound de GO-PES (`Dashboard.js`, endpoint
  `getDashboardData`) → ese es parte de la app principal, con su propio cacheo
  (`GO_PES_RUNTIME` + `putCatalogCacheJson_`), no este proyecto standalone.
