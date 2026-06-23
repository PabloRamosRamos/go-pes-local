/**
 * Instrumentacion ligera y reversible para diagnostico de latencia.
 * Se activa solo si GO_PES_DIAG=1 en ScriptProperties.
 */
var GO_PES_DIAG_RUNTIME = this.GO_PES_DIAG_RUNTIME || {
  enabled: null
};

function goPesDiagEnabled_() {
  if (GO_PES_DIAG_RUNTIME.enabled !== null) {
    return GO_PES_DIAG_RUNTIME.enabled;
  }

  try {
    GO_PES_DIAG_RUNTIME.enabled =
      PropertiesService.getScriptProperties().getProperty('GO_PES_DIAG') === '1';
  } catch (err) {
    GO_PES_DIAG_RUNTIME.enabled = false;
  }

  return GO_PES_DIAG_RUNTIME.enabled;
}

function goPesDiagStart_(eventName, meta) {
  if (!goPesDiagEnabled_()) return null;
  return {
    event: String(eventName || ''),
    startedAt: Date.now(),
    meta: meta || {}
  };
}

function goPesDiagEnd_(token, extra) {
  if (!token) return;

  try {
    var result = {
      tag: 'GO_PES_DIAG',
      event: token.event,
      duration_ms: Date.now() - token.startedAt,
      meta: Object.assign({}, token.meta || {}, extra || {})
    };

    Logger.log(JSON.stringify(result));

    // También escribir a hoja de diagnóstico si está habilitada
    goPesDiagWriteToSheet_(result);
  } catch (err) {}
}

/**
 * Helper para medir tamaño de payload retornado al cliente
 */
function goPesDiagPayloadSize_(data, endpoint) {
  if (!goPesDiagEnabled_()) return data;

  try {
    var jsonStr = JSON.stringify(data);
    var sizeKB = (jsonStr.length / 1024).toFixed(2);

    Logger.log(JSON.stringify({
      tag: 'GO_PES_DIAG_PAYLOAD',
      endpoint: endpoint,
      size_kb: parseFloat(sizeKB),
      has_rows: Array.isArray(data && data.rows),
      row_count: Array.isArray(data && data.rows) ? data.rows.length : 0
    }));
  } catch (err) {}

  return data;
}

/**
 * Escribe diagnósticos a una hoja opcional para análisis posterior
 */
function goPesDiagWriteToSheet_(result) {
  try {
    var sheetName = 'LOG_Diagnostics';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);

    // Solo escribir si la hoja existe (no crearla automáticamente)
    if (!sheet) return;

    var now = new Date();
    sheet.appendRow([
      now,
      result.event || '',
      result.duration_ms || 0,
      JSON.stringify(result.meta || {}),
      Session.getActiveUser().getEmail()
    ]);
  } catch (err) {
    // Silencioso - no queremos romper por esto
  }
}

function goPesEnableDiagnostics() {
  PropertiesService.getScriptProperties().setProperty('GO_PES_DIAG', '1');
  GO_PES_DIAG_RUNTIME.enabled = true;
  return { ok: true, enabled: true };
}

function goPesDisableDiagnostics() {
  PropertiesService.getScriptProperties().deleteProperty('GO_PES_DIAG');
  GO_PES_DIAG_RUNTIME.enabled = false;
  return { ok: true, enabled: false };
}

function goPesGetDiagnosticsStatus() {
  return {
    ok: true,
    enabled: goPesDiagEnabled_()
  };
}
