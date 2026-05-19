/**
 * Limpieza segura de datos operativos de prueba.
 *
 * Regla central: solo se limpian hojas incluidas explicitamente en whitelist.
 * No se eliminan hojas, no se eliminan encabezados y no se limpian catalogos,
 * usuarios, permisos, logs ni configuraciones.
 */

const GO_PES_ADMIN_RESET_PIN_PROPERTY = 'GO_PES_ADMIN_RESET_PIN';

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

  goPesRebuildAfterAdminReset_();

  const detail = {
    sheets_cleared: cleared.length,
    rows_cleared: cleared.reduce(function(total, item) {
      return total + Number(item.rows_cleared || 0);
    }, 0),
    skipped: skipped
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

function goPesSetAdminDataResetPin(pin) {
  const user = requireRole_(['superuser']);
  goPesAssertAdminResetSuperuser_(user);

  const value = String(pin || '').trim();
  if (value.length < 6) {
    throw new Error('El PIN debe tener al menos 6 caracteres.');
  }

  PropertiesService.getScriptProperties().setProperty(GO_PES_ADMIN_RESET_PIN_PROPERTY, value);
  logUserAction_('SET_ADMIN_RESET_PIN', 'admin_reset', '', 'OK', { actor: user.email });
  return { ok: true };
}

function goPesGetAdminResetCleanableSheets_() {
  goPesEnsureAdminResetSheetConfig_();
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
    S.FACT_AVANCE_HITOS,
    S.FACT_AVANCE_ESTADO,
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
  goPesEnsureAdminResetSheetConfig_();
  const S = GO_PES_V2.SHEETS;

  return [
    S.CAT_HITOS_AVANCE,
    S.DIM_USUARIOS,
    S.DIM_TERRITORIO,
    S.DIM_ESTADOS,
    S.DIM_ETAPAS,
    S.DIM_ORIGEN,
    S.DIM_INSTRUMENTOS,
    S.DIM_REQUISITOS,
    S.DIM_RESPONSABLES,
    S.DIM_CARGOS,
    S.LOG_PROC,
    S.LOG_ACCESOS,
    S.LOG_ACCIONES,
    S.LEGACY_FORM,
    S.LEGACY_AVANCE,
    S.LEGACY_CSV,
    S.LEGACY_FONDESE,
    S.LEGACY_SOCIOS
  ].filter(Boolean);
}

function goPesEnsureAdminResetSheetConfig_() {
  if (typeof goPesApplyAvancePhase1Config_ === 'function') {
    goPesApplyAvancePhase1Config_();
  }
}

function goPesAssertAdminResetSuperuser_(user) {
  if (!user || !user.superuser_flag) {
    throw new Error('Solo un SUPERUSER puede limpiar datos de prueba.');
  }
}

function goPesValidateAdminResetPin_(pin) {
  const expected = String(PropertiesService.getScriptProperties().getProperty(GO_PES_ADMIN_RESET_PIN_PROPERTY) || '').trim();
  if (!expected) {
    throw new Error('No existe PIN configurado. Define Script Property GO_PES_ADMIN_RESET_PIN antes de usar esta accion.');
  }

  if (String(pin || '').trim() !== expected) {
    throw new Error('PIN invalido.');
  }
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
