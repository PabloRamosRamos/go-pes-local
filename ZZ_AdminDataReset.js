/**
 * Limpieza segura de datos operativos de prueba.
 *
 * Regla central: solo se limpian hojas incluidas explicitamente en whitelist.
 * No se eliminan hojas, no se eliminan encabezados y no se limpian catalogos,
 * usuarios, permisos, logs ni configuraciones.
 */

const GO_PES_ADMIN_RESET_PIN_SALT = 'GO_PES_ADMIN_RESET_PIN_V1';
const GO_PES_ADMIN_RESET_PIN_HASH = 'xUGcfZmxbUgq7J3VGUoJPCj+O5upODLuZTWCHH+zefk=';

function getAdminDataResetPlan() {
  const user = requireRole_(['superuser']);
  goPesAssertAdminResetSuperuser_(user);
  return serializeForClient_({
    limpiables: goPesGetAdminResetCleanableSheets_(),
    protegidas: goPesGetAdminResetProtectedSheets_()
  });
}


function limpiarDatosPruebaAdmin(payload) {
  const user = requireRole_(['superuser']);
  goPesAssertAdminResetSuperuser_(user);
  goPesValidateAdminResetPin_(payload && payload.pin);

  const confirmacion = String(payload && payload.confirmacion || '').trim().toUpperCase();
  if (confirmacion !== 'LIMPIAR') {
    throw new Error('Confirmacion invalida. Debes escribir LIMPIAR para ejecutar la limpieza.');
  }

  goPesEnsureAdminResetSheetConfig_();

  const cleanable = goPesGetAdminResetCleanableSheets_();
  const defs = buildSheetDefinitions_();
  const cleared = [];
  const skipped = [];

  cleanable.forEach(function(sheetName) {
    if (!sheetName || !defs[sheetName]) {
      skipped.push({ sheet: sheetName, reason: 'Sin definicion de encabezados' });
      return;
    }

    const rowsBefore = goPesCountDataRows_(sheetName);
    ensureSheetWithHeaders_(sheetName, defs[sheetName]);
    clearSheetData_(sheetName);
    cleared.push({ sheet: sheetName, rows_cleared: rowsBefore });
  });

  const resetCounters = goPesResetSequenceCounters_();
  goPesRebuildAfterAdminReset_();

  const detail = {
    sheets_cleared: cleared.length,
    rows_cleared: cleared.reduce(function(total, item) {
      return total + Number(item.rows_cleared || 0);
    }, 0),
    skipped: skipped,
    sequences_reset: resetCounters
  };

  logProcessing_('WARN', 'limpiarDatosPruebaAdmin', 'admin_reset', '', user.email, 'OK', detail);
  logUserAction_('ADMIN_RESET_DATOS_PRUEBA', 'admin_reset', '', 'OK', detail);

  return serializeForClient_({
    ok: true,
    cleared: cleared,
    skipped: skipped,
    protected: goPesGetAdminResetProtectedSheets_()
  });
}

function goPesGetAdminResetCleanableSheets_() {
  const S = GO_PES_V2.SHEETS;

  return [
    S.RAW_INGRESO,
    S.RAW_SEGUIMIENTO,
    S.RAW_ORGANIZACIONES,
    S.RAW_INSTRUMENTOS,
    S.RAW_REQUISITOS,
    S.RAW_SOCIOS,
    S.MAE_CASOS,
    S.MAE_ORGANIZACIONES,
    S.FACT_HITOS,
    S.FACT_INSTRUMENTOS,
    S.FACT_REQUISITOS,
    S.FACT_SOCIOS,
    S.FACT_BENEFICIOS_DETALLE,
    S.FACT_BENEFICIOS_HITOS,
    S.FACT_BENEFICIOS_ORG,
    S.FACT_BENEFICIOS_ORG_HITOS,
    S.FACT_AVANCE_HITOS,
    S.FACT_AVANCE_ESTADO,
    S.FACT_FONDESE,
    S.MASTER,
    S.VW_ORGS,
    S.VW_INSTR,
    S.VW_TERR,
    S.VW_AVANCE_ORGANIZACION,
    S.DIM_ORG_SUG,
    S.DIM_VEC_SUG,
    S.DIM_SOL_SUG
  ].filter(Boolean);
}

function goPesGetAdminResetProtectedSheets_() {
  const S = GO_PES_V2.SHEETS;

  return [
    S.CAT_HITOS_AVANCE,
    S.CFG_FONDESE_EDICIONES,
    S.DIM_USUARIOS,
    S.DIM_TERRITORIO,
    S.DIM_ESTADOS,
    S.DIM_ETAPAS,
    S.DIM_ORIGEN,
    S.DIM_BENEFICIOS,
    S.DIM_INSTRUMENTOS,
    S.DIM_REQUISITOS,
    S.DIM_RESPONSABLES,
    S.DIM_CARGOS,
    S.LOG_PROC,
    S.LOG_ACCESOS,
    S.LOG_ACCIONES
  ].filter(Boolean);
}

function goPesAssertAdminResetSuperuser_(user) {
  if (!user || !user.superuser_flag) {
    throw new Error('Solo un SUPERUSER puede limpiar datos de prueba.');
  }
}

function goPesValidateAdminResetPin_(pin) {
  const candidate = goPesHashAdminResetPin_(pin);
  if (candidate !== GO_PES_ADMIN_RESET_PIN_HASH) {
    throw new Error('PIN invalido.');
  }
}

function goPesHashAdminResetPin_(pin) {
  const raw = GO_PES_ADMIN_RESET_PIN_SALT + ':' + String(pin || '').trim();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}

function goPesEnsureAdminResetSheetConfig_() {
  ensureSheetsSubset_(goPesGetAdminResetCleanableSheets_());
}

function goPesCountDataRows_(sheetName) {
  const sh = getSheet_(sheetName);
  if (!sh) return 0;
  return Math.max(0, sh.getLastRow() - 1);
}

function goPesRebuildAfterAdminReset_() {
  if (typeof refreshDerivedArtifacts_ === 'function') {
    refreshDerivedArtifacts_({
      master: true,
      vistaOrganizaciones: true,
      vistaInstrumentos: true,
      vistaTerritorial: true,
      sugerencias: true
    });
  }

  if (typeof buildVistaAvanceOrganizacion_ === 'function') {
    buildVistaAvanceOrganizacion_();
  }
}

function goPesResetSequenceCounters_() {
  const NAMESPACES = [
    'vecino',
    'solicitud',
    'organizacion',
    'socio',
    'hito',
    'instrumento',
    'requisito',
    'avance_hito',
    'avance_estado'
  ];

  const props = PropertiesService.getScriptProperties();
  const reset = [];

  NAMESPACES.forEach(function(ns) {
    const key = 'GO_PES_SEQ_' + ns.toUpperCase();
    props.setProperty(key, '0');
    reset.push(key);
  });

  return reset;
}

/**
 * Repara hojas FONDESE corrompidas por escrituras sin schema registrado.
 * - FACT_FONDESE: elimina todas las filas de datos y borra columnas extra.
 * - CFG_FONDESE_Ediciones: elimina filas con id_edicion o anio corruptos,
 *   conservando solo filas donde id_edicion ~= /^FONDESE-/ y anio in [2020,2100].
 *
 * Ejecutar una sola vez desde el editor Apps Script tras hacer push.
 */
function goPesRepararFondeseSheets() {
  requireRole_(['superuser']);

  const S = GO_PES_V2.SHEETS;
  const ss = getSpreadsheet_();
  const reparado = [];

  // --- FACT_FONDESE: limpiar datos + eliminar columnas extra ---
  const shFact = ss.getSheetByName(S.FACT_FONDESE);
  if (shFact) {
    const lastRowFact = shFact.getLastRow();
    const lastColFact = shFact.getLastColumn();
    const expectedCols = 14;

    if (lastRowFact > 1) {
      shFact.getRange(2, 1, lastRowFact - 1, lastColFact).clearContent();
    }
    if (lastColFact > expectedCols) {
      shFact.deleteColumns(expectedCols + 1, lastColFact - expectedCols);
    }
    ensureSheetWithHeaders_(S.FACT_FONDESE, [
      'fondese_id', 'id_edicion', 'organizacion_id', 'nombre_organizacion',
      'convocatoria_id', 'linea_producto_id', 'estado_proceso', 'resultado_adj',
      'estado_ejecucion', 'estado_rendicion', 'checklist_docs',
      'fecha_creacion', 'fecha_actualizacion', 'creado_por'
    ]);
    invalidateSheetRuntimeCache_(S.FACT_FONDESE);
    reparado.push('FACT_FONDESE: datos limpiados, ' + Math.max(0, lastColFact - expectedCols) + ' columna(s) extra eliminada(s)');
  }

  // --- CFG_FONDESE_Ediciones: conservar solo filas válidas ---
  const shCfg = ss.getSheetByName(S.CFG_FONDESE_EDICIONES);
  if (shCfg && shCfg.getLastRow() > 1) {
    const numDataRows = shCfg.getLastRow() - 1;
    const numCols = shCfg.getLastColumn();
    const cfgData = shCfg.getRange(2, 1, numDataRows, numCols).getValues();

    const validRows = cfgData.filter(function(row) {
      const idEdicion = String(row[0] || '').trim();
      const anio = Number(row[1]);
      return /^FONDESE-/.test(idEdicion) && anio >= 2020 && anio <= 2100;
    });

    shCfg.getRange(2, 1, numDataRows, numCols).clearContent();
    if (validRows.length > 0) {
      shCfg.getRange(2, 1, validRows.length, numCols).setValues(validRows);
    }
    invalidateSheetRuntimeCache_(S.CFG_FONDESE_EDICIONES);
    reparado.push('CFG_FONDESE_Ediciones: ' + (numDataRows - validRows.length) + ' fila(s) corrupta(s) eliminada(s), ' + validRows.length + ' conservada(s)');
  }

  logProcessing_('INFO', 'goPesRepararFondeseSheets', 'fondese', '', '', 'OK', reparado);
  SpreadsheetApp.getActiveSpreadsheet().toast(reparado.join(' | '), 'GO-PES Reparación FONDESE', 8);
  return serializeForClient_({ ok: true, detalle: reparado });
}
