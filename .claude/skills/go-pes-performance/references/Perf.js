/**
 * Perf.js — Test de timing / profiler de performance para GO-PES v2
 * ------------------------------------------------------------------
 * GAS-puro (V8), sin dependencias externas. Vive junto a Audith.js como
 * módulo de DEBUG/QA. Su propósito es MEDIR dónde se va el tiempo antes de
 * tocar nada (regla del proyecto: Fase 1 = lectura, medir antes de optimizar).
 *
 * Qué mide y con qué seguridad:
 *   - goPesPerfProbe()            READ-ONLY. Cronometra la lectura de cada
 *                                 hoja del spreadsheet. Seguro en PROD.
 *   - goPesPerfProbeRebuild(tok)  ESCRIBE (rebuild de VW_ y MASTER). Gated:
 *                                 corre libre en DEV; en otros entornos exige
 *                                 el token "REBUILD". Correr en ventana de baja
 *                                 carga.
 *   - goPesPerfStart_/Mark_/Finish_  Micro-timer reutilizable para instrumentar
 *                                 la ruta de guardado real (ver
 *                                 references/instrumentar-guardado.md).
 *
 * Salida: doble formato en Cloud Logging (visible con `clasp logs`):
 *   1) una tabla legible por humanos, y
 *   2) un bloque JSON delimitado por ===PERF-JSON=== ... ===END-PERF-JSON===
 *      pensado para que Claude Code lo parsee sin ambigüedad.
 * Además cada función retorna el objeto de resultado (visible al ejecutar
 * desde el editor de Apps Script).
 *
 * Convención del proyecto: público sin "_", privado con "_". Las funciones
 * públicas (goPesPerfProbe / goPesPerfProbeRebuild) validan superuser.
 */

var GO_PES_PERF = {
  VERSION: '1.0.0',
  MARK: '===GO-PES-PERF===',
  JSON_OPEN: '===PERF-JSON===',
  JSON_CLOSE: '===END-PERF-JSON==='
};

/* ============================================================
 * 1) PROFILER READ-ONLY DE HOJAS  (seguro en PROD)
 * ============================================================
 * Cronometra getValues() de cada hoja y las ordena de más lenta a más
 * rápida. Sirve para ver de un vistazo qué hojas pesan (típicamente
 * MASTER_DATOS y las VW_*), que son las que un guardado reescribe/recorre.
 */
function goPesPerfProbe() {
  goPesPerfGuard_();
  var ss = goPesPerfSpreadsheet_();
  var env = goPesPerfEnv_();
  var t0 = Date.now();
  var rows = [];

  ss.getSheets().forEach(function (sh) {
    var name = sh.getName();
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    var cells = lastRow * lastCol;
    var tRead = Date.now();
    try {
      if (lastRow > 0 && lastCol > 0) {
        sh.getRange(1, 1, lastRow, lastCol).getValues();
      }
    } catch (e) {
      // Hoja no legible (protegida / vacía): registramos 0 y seguimos.
    }
    var ms = Date.now() - tRead;
    rows.push({
      sheet: name,
      rows: lastRow,
      cols: lastCol,
      cells: cells,
      readMs: ms,
      msPer1kCells: cells ? Math.round((ms / cells) * 1000) : 0,
      derived: /^VW_|^MASTER/.test(name)
    });
  });

  rows.sort(function (a, b) { return b.readMs - a.readMs; });

  var payload = {
    probe: 'read-only-sheets',
    version: GO_PES_PERF.VERSION,
    env: env,
    totalMs: Date.now() - t0,
    sheetCount: rows.length,
    rows: rows
  };
  goPesPerfLog_(payload);
  return payload;
}

/* ============================================================
 * 2) PROFILER DE REBUILD DE VISTAS DERIVADAS  (ESCRIBE — gated)
 * ============================================================
 * Cronometra las funciones que reconstruyen VW_ y MASTER. Es la medición
 * clave para confirmar la hipótesis "el guardado es lento por el rebuild".
 * Como ESCRIBE en hojas, exige token fuera de DEV.
 *
 * @param {string=} confirmToken  Pasa "REBUILD" para autorizar fuera de DEV.
 */
function goPesPerfProbeRebuild(confirmToken) {
  goPesPerfGuard_();
  var env = goPesPerfEnv_();
  if (env !== 'DEV' && confirmToken !== 'REBUILD') {
    throw new Error(
      'Perf: goPesPerfProbeRebuild() ESCRIBE en VW_*/MASTER. Entorno=' + env +
      '. Para autorizar llama goPesPerfProbeRebuild("REBUILD") y hazlo en una ' +
      'ventana de baja carga. En DEV corre sin token.'
    );
  }

  var p = goPesPerfStart_('rebuild-vistas');

  // Se usan guardas typeof para no romper si un nombre difiere en el repo.
  // typeof sobre identificador no declarado es seguro (devuelve 'undefined').
  if (typeof goPesRefrescarVistasYMaster === 'function') {
    goPesPerfTimeCall_(p, 'goPesRefrescarVistasYMaster', function () { goPesRefrescarVistasYMaster(); });
  } else if (typeof refrescarVistasYMaster === 'function') {
    goPesPerfTimeCall_(p, 'refrescarVistasYMaster', function () { refrescarVistasYMaster(); });
  } else {
    p.notFound.push('refrescarVistasYMaster');
  }

  if (typeof goPesRefrescarVistaAvanceOrganizacion === 'function') {
    goPesPerfTimeCall_(p, 'goPesRefrescarVistaAvanceOrganizacion', function () { goPesRefrescarVistaAvanceOrganizacion(); });
  } else {
    p.notFound.push('goPesRefrescarVistaAvanceOrganizacion');
  }

  if (typeof rebuildSuggestionDims_ === 'function') {
    goPesPerfTimeCall_(p, 'rebuildSuggestionDims_', function () { rebuildSuggestionDims_(); });
  } else {
    p.notFound.push('rebuildSuggestionDims_');
  }

  return goPesPerfFinish_(p, { env: env });
}

/* ============================================================
 * 3) MICRO-TIMER REUTILIZABLE
 * ============================================================
 * Para instrumentar cualquier ruta de código (sobre todo el guardado real).
 * Uso:
 *   var __p = goPesPerfStart_('guardarIngreso');
 *   ... paso 1 ...   goPesPerfMark_(__p, 'validacion');
 *   ... paso 2 ...   goPesPerfMark_(__p, 'escritura_fila');
 *   ... rebuild ...  goPesPerfMark_(__p, 'refrescar_vistas');
 *   goPesPerfFinish_(__p);
 * Ver references/instrumentar-guardado.md para el patrón completo.
 */
function goPesPerfStart_(label) {
  var now = Date.now();
  return { label: label || 'perf', t0: now, last: now, marks: [], notFound: [] };
}

function goPesPerfMark_(p, name) {
  var now = Date.now();
  p.marks.push({ step: name, ms: now - p.last, cumMs: now - p.t0 });
  p.last = now;
  return now;
}

function goPesPerfFinish_(p, extra) {
  var payload = {
    probe: p.label,
    version: GO_PES_PERF.VERSION,
    totalMs: Date.now() - p.t0,
    marks: p.marks
  };
  if (p.notFound && p.notFound.length) { payload.notFound = p.notFound; }
  if (extra) {
    for (var k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) { payload[k] = extra[k]; }
    }
  }
  goPesPerfLog_(payload);
  return payload;
}

/* Cronometra una llamada capturando error sin abortar el probe. */
function goPesPerfTimeCall_(p, name, fn) {
  var t = Date.now();
  var err = null;
  try {
    fn();
  } catch (e) {
    err = (e && e.message) ? e.message : ('' + e);
  }
  var now = Date.now();
  var mark = { step: name, ms: now - t, cumMs: now - p.t0 };
  if (err) { mark.error = err; }
  p.marks.push(mark);
  p.last = now;
}

/* ============================================================
 * 4) HELPERS INTERNOS
 * ============================================================ */
function goPesPerfGuard_() {
  // Respeta el patrón del proyecto (guard como primera línea). Si el helper
  // no existe en este entorno, no bloquea: estas funciones son de DEBUG/QA y
  // se corren desde el editor por un desarrollador.
  try {
    if (typeof requireRole_ === 'function') { requireRole_(['superuser']); }
  } catch (e) {
    throw new Error('Perf: acceso denegado (se requiere superuser): ' + ((e && e.message) || e));
  }
}

function goPesPerfSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) { return ss; }
  try {
    var id = PropertiesService.getScriptProperties().getProperty('GO_PES_SPREADSHEET_ID');
    if (id) { return SpreadsheetApp.openById(id); }
  } catch (e) {}
  throw new Error('Perf: no se pudo resolver el spreadsheet (ni activo ni GO_PES_SPREADSHEET_ID).');
}

function goPesPerfEnv_() {
  try {
    if (typeof GO_PES_V2 !== 'undefined' && GO_PES_V2 && GO_PES_V2.ENVIRONMENT) {
      return GO_PES_V2.ENVIRONMENT;
    }
  } catch (e) {}
  try {
    if (typeof ENVIRONMENT !== 'undefined' && ENVIRONMENT) { return ENVIRONMENT; }
  } catch (e) {}
  return 'DESCONOCIDO';
}

function goPesPerfPad_(v, n) {
  var s = '' + v;
  while (s.length < n) { s = ' ' + s; }
  return s;
}

/* Logging estructurado: tabla legible + bloque JSON parseable por CC. */
function goPesPerfLog_(payload) {
  var out = [];
  out.push(
    GO_PES_PERF.MARK +
    ' probe=' + (payload.probe || '?') +
    ' env=' + (payload.env || '?') +
    ' total=' + (payload.totalMs != null ? payload.totalMs : '?') + 'ms' +
    ' v' + GO_PES_PERF.VERSION
  );

  if (payload.rows) {
    out.push('   #     ms   filas  cols    celdas  ms/1k  hoja');
    payload.rows.forEach(function (r, i) {
      out.push(
        '  ' + goPesPerfPad_(i + 1, 2) +
        ' ' + goPesPerfPad_(r.readMs, 6) +
        ' ' + goPesPerfPad_(r.rows, 6) +
        ' ' + goPesPerfPad_(r.cols, 4) +
        ' ' + goPesPerfPad_(r.cells, 9) +
        ' ' + goPesPerfPad_(r.msPer1kCells, 5) +
        '  ' + (r.derived ? '▸ ' : '  ') + r.sheet
      );
    });
  }

  if (payload.marks) {
    out.push('       ms      cum  fase');
    payload.marks.forEach(function (m) {
      out.push(
        '  ' + goPesPerfPad_(m.ms, 8) +
        ' ' + goPesPerfPad_(m.cumMs, 8) +
        '  ' + m.step + (m.error ? ('  [ERROR: ' + m.error + ']') : '')
      );
    });
  }

  if (payload.notFound && payload.notFound.length) {
    out.push('  (funciones no encontradas: ' + payload.notFound.join(', ') + ')');
  }

  console.log(out.join('\n'));
  console.log(GO_PES_PERF.JSON_OPEN + JSON.stringify(payload) + GO_PES_PERF.JSON_CLOSE);
}
