/**
 * ZZ_AvancePhase1.gs
 * Fase 1 del módulo "Avance"
 *
 * Objetivo:
 * - Registrar nuevas hojas del módulo Avance en GO_PES_V2.SHEETS
 * - Crear pestañas con headers base
 * - Dejar wrappers visibles para instalación y diagnóstico
 *
 * Uso:
 * 1) Pegar este archivo en el proyecto
 * 2) Ejecutar goPesInstalarModuloAvanceFase1()
 * 3) Revisar el log y las pestañas creadas
 */

/** Wrapper visible */
function goPesInstalarModuloAvanceFase1() {
  return goPesInstalarModuloAvanceFase1_();
}

/** Wrapper visible */
function goPesDiagnosticarModuloAvanceFase1() {
  return goPesDiagnosticarModuloAvanceFase1_();
}

/** Devuelve el mapa de hojas nuevas del módulo Avance */
function getGoPesAvanceSheetMap_() {
  return {
    CAT_HITOS_AVANCE: 'CAT_Hitos_Avance',
    FACT_AVANCE_HITOS: 'FACT_Avance_Hitos',
    FACT_AVANCE_ESTADO: 'FACT_Avance_Estado',
    VW_AVANCE_ORGANIZACION: 'VW_Avance_Organizacion'
  };
}

/** Devuelve las definiciones de headers para la Fase 1 */
function getGoPesAvanceSheetDefinitions_() {
  const S = getGoPesAvanceSheetMap_();

  const defs = {};

  defs[S.CAT_HITOS_AVANCE] = [
    'codigo_hito',
    'tramo',
    'orden_hito',
    'nombre_hito',
    'descripcion',
    'codigo_hito_previo',
    'permite_saltar',
    'activo_flag'
  ];

  defs[S.FACT_AVANCE_HITOS] = [
    'avance_hito_id',
    'organizacion_id',
    'solicitud_id',
    'codigo_hito',
    'tramo',
    'orden_hito',
    'nombre_hito',
    'fecha_hito',
    'usuario_registro',
    'timestamp_registro',
    'observacion'
  ];

  defs[S.FACT_AVANCE_ESTADO] = [
    'avance_estado_id',
    'organizacion_id',
    'solicitud_id',
    'estado_avance',
    'motivo_estado',
    'fecha_estado',
    'usuario_estado',
    'timestamp_registro',
    'activo_flag'
  ];

  defs[S.VW_AVANCE_ORGANIZACION] = [
    'organizacion_id',
    'solicitud_id',
    'nombre_organizacion',
    'estado_avance',
    'ultimo_hito_codigo',
    'ultimo_hito_nombre',
    'ultimo_hito_fecha',
    'usuario_ultimo_hito',
    'total_hitos_cumplidos',
    'total_hitos_tramo_pre',
    'total_hitos_tramo_for'
  ];

  return defs;
}

/** Aplica en memoria la configuración del módulo Avance sobre GO_PES_V2 */
function goPesApplyAvancePhase1Config_() {
  if (typeof GO_PES_V2 === 'undefined' || !GO_PES_V2 || !GO_PES_V2.SHEETS) {
    throw new Error('GO_PES_V2 no está disponible o no contiene SHEETS.');
  }

  const extraSheets = getGoPesAvanceSheetMap_();
  Object.keys(extraSheets).forEach(function(key) {
    GO_PES_V2.SHEETS[key] = extraSheets[key];
  });

  if (!GO_PES_V2.AVANCE) {
    GO_PES_V2.AVANCE = {};
  }

  GO_PES_V2.AVANCE.TRAMOS = [
    'Preconstitución',
    'Formalización posterior'
  ];

  GO_PES_V2.AVANCE.ESTADOS = [
    'Activo',
    'Stand by',
    'Detenido',
    'Finalizado'
  ];

  return {
    ok: true,
    sheets: extraSheets,
    estados: GO_PES_V2.AVANCE.ESTADOS,
    tramos: GO_PES_V2.AVANCE.TRAMOS
  };
}

/** Instala la fase 1: registra config y crea/normaliza hojas */
function goPesInstalarModuloAvanceFase1_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No se encontró el Spreadsheet activo.');

  const applied = goPesApplyAvancePhase1Config_();

  const defs = getGoPesAvanceSheetDefinitions_();
  const created = [];
  const updated = [];

  Object.keys(defs).forEach(function(sheetName) {
    const result = goPesEnsureSheetHeadersSafe_(ss, sheetName, defs[sheetName]);
    if (result.created) created.push(sheetName);
    else if (result.updated) updated.push(sheetName);
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Fase 1 del módulo Avance instalada correctamente.',
    'GO-PES',
    5
  );

  Logger.log(JSON.stringify({
    ok: true,
    applied: applied,
    created: created,
    updated: updated
  }, null, 2));

  return {
    ok: true,
    created: created,
    updated: updated,
    sheets: applied.sheets
  };
}

/** Diagnóstico rápido de la Fase 1 */
function goPesDiagnosticarModuloAvanceFase1_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No se encontró el Spreadsheet activo.');

  goPesApplyAvancePhase1Config_();

  const defs = getGoPesAvanceSheetDefinitions_();
  const report = {};

  Object.keys(defs).forEach(function(sheetName) {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) {
      report[sheetName] = {
        exists: false,
        headers_ok: false,
        last_row: 0,
        last_column: 0
      };
      return;
    }

    const expected = defs[sheetName];
    const current = sh.getLastColumn() > 0
      ? sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), expected.length)).getValues()[0]
      : [];

    const normalizedCurrent = current
      .map(function(x) { return String(x || '').trim(); })
      .slice(0, expected.length);

    const normalizedExpected = expected.map(function(x) { return String(x || '').trim(); });

    const headersOk = JSON.stringify(normalizedCurrent) === JSON.stringify(normalizedExpected);

    report[sheetName] = {
      exists: true,
      headers_ok: headersOk,
      last_row: sh.getLastRow(),
      last_column: sh.getLastColumn()
    };
  });

  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

/** Crea hoja si no existe y asegura headers */
function goPesEnsureSheetHeadersSafe_(ss, sheetName, headers) {
  let sh = ss.getSheetByName(sheetName);
  let created = false;
  let updated = false;

  if (!sh) {
    sh = ss.insertSheet(sheetName);
    created = true;
  }

  const expected = headers.map(function(h) { return String(h || '').trim(); });
  const existing = sh.getLastColumn() > 0
    ? sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), expected.length)).getValues()[0]
    : [];

  const normalizedExisting = existing
    .map(function(x) { return String(x || '').trim(); })
    .slice(0, expected.length);

  const sameHeaders = JSON.stringify(normalizedExisting) === JSON.stringify(expected);

  if (!sameHeaders) {
    if (sh.getMaxColumns() < expected.length) {
      sh.insertColumnsAfter(sh.getMaxColumns(), expected.length - sh.getMaxColumns());
    }

    sh.getRange(1, 1, 1, expected.length).setValues([expected]);
    updated = !created;
  }

  sh.setFrozenRows(1);

  if (sh.getFilter()) {
    try {
      sh.getFilter().remove();
    } catch (e) {}
  }

  if (sh.getLastRow() >= 1 && sh.getLastColumn() >= 1) {
    sh.getRange(1, 1, Math.max(1, sh.getLastRow()), Math.max(1, sh.getLastColumn())).createFilter();
  }

  try {
    sh.autoResizeColumns(1, Math.min(expected.length, sh.getMaxColumns()));
  } catch (e) {}

  return {
    created: created,
    updated: updated
  };
}