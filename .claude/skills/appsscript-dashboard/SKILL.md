---
name: appsscript-dashboard
description: >-
  Construye y mantiene el dashboard de KPIs de GO-PES como una app Google Apps
  Script STANDALONE y de SOLO LECTURA, que lee el Spreadsheet de PROD con
  SpreadsheetApp.openById() (ID desde Script Properties) y sirve el frontend con
  HtmlService + google.script.run, reproduciendo los patrones de GO-PES
  (Dashboard.js / Main.js). Úsala SIEMPRE que se cree o modifique código de este
  dashboard de KPIs: "dashboard de KPIs", "dashboard de GO-PES", "leer el
  Spreadsheet de PROD para el dashboard", "endpoint de KPIs", "cache del
  dashboard", "openById", "Script Properties del dashboard", "gráficos del
  dashboard", "agregar un KPI/indicador", aunque no se nombre explícitamente la
  palabra "skill". NO es para el dashboard interno de GO-PES (módulo Inicio /
  Dashboard.js dentro de la app principal) ni para escribir en el Spreadsheet.
---

# appsscript-dashboard — Dashboard de KPIs de GO-PES (Apps Script, solo lectura)

Este dashboard es una **aplicación Apps Script separada** de GO-PES. **Lee** el
Spreadsheet de PROD (donde vive GO-PES) y muestra KPIs. **Nunca escribe.** Comparte
el stack de GO-PES —Apps Script V8, `HtmlService`, Sheets como fuente,
`google.script.run`, deploy con clasp— pero es su propio proyecto, con su propia
URL, su propio control de acceso y su propio deploy.

**GO-PES es la fuente de verdad; este dashboard es un consumidor de solo lectura.**
Antes de tocar nada, entiende el modelo de datos y las vistas: `docs/modelo-datos.md`
y la constante `GO_PES_V2.SHEETS` en `go-pes-local/Main.js`.

## Las 6 reglas duras (no negociables)

1. **Solo lectura, siempre.** El dashboard solo lee: `SpreadsheetApp.openById(...).getSheetByName(...).getDataRange().getValues()`. **Prohibido** `setValue*`, `appendRow`, `getRange().setValues`, `deleteRow`, o cualquier mutación del Spreadsheet de PROD. Si un cálculo "necesita" escribir, está mal planteado — cachea el resultado en `CacheService`, no en el Sheet.
2. **El ID del Spreadsheet vive en Script Properties, nunca hardcodeado.** Se lee con `PropertiesService.getScriptProperties().getProperty('PROD_SPREADSHEET_ID')`. Hardcodear el ID acopla el código a un entorno y filtra infraestructura al repo.
3. **Preferir las vistas ya aplanadas.** Lee `MASTER_DATOS`, `VW_LS_*` y `VW_Avance_Organizacion` (que GO-PES ya mantiene pre-unidas) y **agrega**, en vez de recomputar joins entre `MAE_*` y `FACT_*`. Menos lecturas, menos lógica frágil, menos riesgo de reproducir mal un join.
4. **Fallar fuerte y visible, nunca en silencio.** Si falta una hoja o una columna esperada, lanza un `Error` con mensaje claro que nombre la hoja/columna. Un dashboard que muestra ceros porque no encontró una columna es peor que uno que dice "falta la columna X en la hoja Y".
5. **Sanitizar todo lo que se renderiza.** Los valores del Spreadsheet son datos, no HTML. Usa `textContent` o escapa con un helper antes de inyectar en `innerHTML`. Nunca concatenes un valor de celda crudo dentro de HTML.
6. **No exponer PII cruda.** El Spreadsheet de PROD tiene datos personales de vecinos (nombres, **RUT**, teléfonos). Los endpoints devuelven **agregados** (conteos, %, series). No sirvas filas crudas con PII salvo que un KPI lo exija y con control de acceso.

## Estructura del proyecto

```
dashboard-kpis/            ← proyecto Apps Script standalone (su propio .clasp.json)
├── Main.js                ← doGet(), include(), constante de config
├── Repository.js          ← lectura de PROD por ID (readSheet_, requireColumns_)
├── Kpis.js                ← endpoint público getKpisData() + cálculo/cache
├── Index.html             ← template principal
├── Styles.html            ← CSS
├── Scripts.html           ← JS cliente (google.script.run, render, sanitizado)
└── appsscript.json
```

## Patrón 1 — Config desde Script Properties

Nunca hardcodees el ID ni el TTL. Léelos de Script Properties (Project Settings →
Script Properties, o `PropertiesService` desde un `_setup()` que corras una vez).

```javascript
function getDashboardConfig_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PROD_SPREADSHEET_ID');
  if (!id) {
    throw new Error(
      'Falta la Script Property PROD_SPREADSHEET_ID. Configúrala en ' +
      'Project Settings → Script Properties (nunca en el código).'
    );
  }
  return {
    spreadsheetId: id,
    cacheTtlSeconds: Number(props.getProperty('CACHE_TTL_SECONDS') || 300) // 5 min
  };
}
```

## Patrón 2 — Lectura de PROD por ID (solo lectura + fail loud)

Espejo del `getSheetData_` de GO-PES, pero abriendo PROD por ID y **exigiendo** las
columnas que el cálculo necesita. Devuelve filas como objetos `{columna: valor}`.

```javascript
/** Lee una hoja de PROD como array de objetos. SOLO LECTURA. */
function readSheet_(sheetName) {
  var ss = SpreadsheetApp.openById(getDashboardConfig_().spreadsheetId);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) {
    throw new Error('Hoja no encontrada en el Spreadsheet de PROD: "' + sheetName +
      '". El dashboard no puede continuar (revisa GO_PES_V2.SHEETS / el esquema).');
  }
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { headers: (values[0] || []).map(String), rows: [] };
  var headers = values[0].map(String);
  var rows = values.slice(1).map(function(r) {
    var o = {};
    for (var i = 0; i < headers.length; i++) o[headers[i]] = r[i];
    return o;
  });
  return { headers: headers, rows: rows };
}

/** Falla claro si el esquema real no tiene las columnas que el KPI espera. */
function requireColumns_(sheetName, headers, expected) {
  var missing = expected.filter(function(c) { return headers.indexOf(c) === -1; });
  if (missing.length) {
    throw new Error('En la hoja "' + sheetName + '" faltan columnas esperadas: ' +
      missing.join(', ') + '. Revisa el esquema de PROD antes de seguir.');
  }
}
```

**Regla:** cada función de cálculo declara y valida sus columnas con `requireColumns_`
apenas lee la hoja. Así, si PROD cambia el esquema, el dashboard lo dice, no lo oculta.

## Patrón 3 — Endpoint único de KPIs con cache (espejo de `getDashboardData`)

Como GO-PES (`Dashboard.js`): **una sola llamada** devuelve todo, y se cachea. Leer
hojas completas es lento (segundos) y hay cuotas; sin cache cada apertura recalcularía
todo el Spreadsheet.

```javascript
var KPIS_CACHE_KEY = 'go_pes_dashboard_kpis_v1';

/** API pública: el cliente llama esto con google.script.run. Devuelve JSON string. */
function getKpisData() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(KPIS_CACHE_KEY);
  if (cached) return cached;              // hit: string JSON ya listo

  var payload = JSON.stringify(computeKpis_());
  cache.put(KPIS_CACHE_KEY, payload, getDashboardConfig_().cacheTtlSeconds);
  return payload;
}

/** Cálculo puro: lee vistas aplanadas de PROD y agrega. Sin efectos secundarios. */
function computeKpis_() {
  var orgSheet = 'VW_LS_Organizaciones';
  var v = readSheet_(orgSheet);
  requireColumns_(orgSheet, v.headers, ['organizacion_id', 'estado_constitucion', 'uv']);
  var orgs = v.rows;

  var porEstado = {};
  orgs.forEach(function(o) {
    var e = String(o.estado_constitucion || 'Sin estado').trim();
    porEstado[e] = (porEstado[e] || 0) + 1;
  });

  return {
    ok: true,
    kpis: { totalOrganizaciones: orgs.length },
    charts: {
      porEstado: Object.keys(porEstado).map(function(k) { return { label: k, count: porEstado[k] }; })
    },
    lastUpdated: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
  };
}
```

**Notas de patrón:**
- Se devuelve **JSON string** (el cliente hace `JSON.parse`). Evita que `google.script.run`
  arruine tipos (p. ej. `Date`) y calza con lo que `CacheService` guarda (strings).
- El **cálculo es puro** (`computeKpis_`): solo lee y agrega, no cachea ni escribe. Así se
  puede probar/diagnosticar aislado.
- **TTL 5 min** por defecto (dashboard operativo, no tiempo real). Ajustable por Script Property.

## Patrón 4 (recomendado) — Precalcular con trigger para que el usuario nunca espere

Un trigger time-driven refresca el cache cada N minutos; el `getKpisData()` del usuario
siempre encuentra hit. Configúralo una vez (superuser) con `_setup`.

```javascript
function refreshKpisCache_() {                 // lo llama el trigger
  var payload = JSON.stringify(computeKpis_());
  CacheService.getScriptCache().put(KPIS_CACHE_KEY, payload, getDashboardConfig_().cacheTtlSeconds);
}

function setupDashboardTrigger_() {            // correr UNA vez desde el editor
  var exists = ScriptApp.getProjectTriggers().some(function(t) {
    return t.getHandlerFunction() === 'refreshKpisCache_';
  });
  if (!exists) ScriptApp.newTrigger('refreshKpisCache_').timeBased().everyMinutes(5).create();
}
```

## Patrón 5 — Frontend: `doGet` + HtmlService + `google.script.run`

Igual que GO-PES (`Main.js`): `doGet` sirve el template; el cliente pide datos por RPC.

```javascript
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('GO-PES · Dashboard KPIs')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DENY); // anti-clickjacking
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

Cliente (`Scripts.html`), con manejo de éxito **y** de error (fail visible):

```javascript
function loadKpis() {
  showLoading(true);
  google.script.run
    .withSuccessHandler(function(json) {
      showLoading(false);
      var data;
      try { data = JSON.parse(json); }
      catch (e) { return showError('Respuesta inválida del servidor.'); }
      if (!data || !data.ok) return showError('No se pudieron cargar los KPIs.');
      renderKpis(data);
    })
    .withFailureHandler(function(err) {
      showLoading(false);
      showError(String(err && err.message ? err.message : err)); // muestra el Error del backend
    })
    .getKpisData();
}
```

## Patrón 6 — Sanitizado del HTML

Todo valor que venga del Spreadsheet se trata como texto. Preferir `textContent`; si se
arma HTML, escapar primero. Nunca interpolar un valor de celda crudo en `innerHTML`.

```javascript
function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}
// Uso: cell.textContent = valor;  // preferido
//   o: html += '<td>' + escapeHtml_(valor) + '</td>';
```

## Diagnóstico (correr desde el editor, como `goPesDiagnosticoDashboard`)

Incluye una función de diagnóstico que ejercita el cálculo sin pasar por el web app,
para validar acceso a PROD y estructura de datos:

```javascript
function diagnosticoDashboard() {
  Logger.log('Config: ' + JSON.stringify(getDashboardConfig_()));
  var data = computeKpis_();
  Logger.log('KPIs: ' + JSON.stringify(data.kpis));
  Logger.log('lastUpdated: ' + data.lastUpdated);
  return { ok: true };
}
```

## Seguridad y acceso (estándares aplicados)

- **Solo lectura por diseño** (regla 1) + **mínimo privilegio**: el proyecto solo abre PROD
  por ID; no toca el resto del Drive.
- **Acceso por despliegue del Web App:** "Ejecutar como = Yo (owner)", "Quién tiene acceso =
  usuarios de `providencia.cl`" (o lista específica). El owner debe tener lectura sobre el
  Spreadsheet de PROD. Google sirve HTTPS.
- **Defensa en profundidad (opcional):** allowlist por correo/rol en `getKpisData()`
  (`Session.getActiveUser().getEmail()`).
- **Sin secretos en el repo:** el ID va en Script Properties (regla 2); nada de credenciales
  en el código ni en el cliente.
- **Anti-clickjacking:** `setXFrameOptionsMode(DENY)`. **Sin PII cruda** en los payloads (regla 6).

## Estándares web

- **HTML semántico** y **accesible** (roles/ARIA, foco visible, contraste); responsive.
- **Charts accesibles:** al construir gráficos, aplica la skill `dataviz` (paleta consistente,
  etiquetas, alternativa textual). No dependas solo del color para transmitir estado.
- HTTP correcto vía HtmlService; UTF-8; nada de APIs deprecadas.

## Deploy

Mismo tooling que GO-PES: **clasp** con su propio `.clasp.json` (proyecto aparte).
Configura primero la Script Property `PROD_SPREADSHEET_ID` (paso manual del usuario), luego
`clasp push` y crea/actualiza el despliegue de Web App con los ajustes de acceso de arriba.
Ver `go-pes-deploy` para el patrón de scripts push-dev/push-prod si se replica.

## Cuándo NO usar esta skill

- El **dashboard interno de GO-PES** (módulo Inicio, `Dashboard.js` dentro de la app
  principal container-bound) → ese es parte de GO-PES, no este proyecto standalone.
- Cualquier cosa que **escriba** en el Spreadsheet → esta skill es solo lectura.
