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
    Logger.log(JSON.stringify({
      tag: 'GO_PES_DIAG',
      event: token.event,
      duration_ms: Date.now() - token.startedAt,
      meta: Object.assign({}, token.meta || {}, extra || {})
    }));
  } catch (err) {}
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
