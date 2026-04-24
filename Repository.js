/**
 * Infraestructura de acceso a Sheets.
 * Centraliza lectura, escritura e invalidación para evitar round trips
 * redundantes dentro de una misma ejecución de Apps Script.
 */
var GO_PES_RUNTIME = this.GO_PES_RUNTIME || {
  spreadsheet: null,
  sheetByName: {},
  headersBySheet: {},
  rowsBySheet: {},
  currentUser: null,
  currentUserEmail: '',
  activityTouchedByEmail: {}
};

function invalidateSheetRuntimeCache_(sheetName) {
  delete GO_PES_RUNTIME.sheetByName[sheetName];
  delete GO_PES_RUNTIME.headersBySheet[sheetName];
  delete GO_PES_RUNTIME.rowsBySheet[sheetName];
}

function cloneRowObjects_(rows) {
  return (rows || []).map(function(row) {
    return Object.assign({}, row);
  });
}

function getSpreadsheet_() {
  if (GO_PES_RUNTIME.spreadsheet) {
    return GO_PES_RUNTIME.spreadsheet;
  }

  const props = PropertiesService.getScriptProperties();
  const ssId = props.getProperty('GO_PES_SPREADSHEET_ID');

  if (ssId) {
    GO_PES_RUNTIME.spreadsheet = SpreadsheetApp.openById(ssId);
    return GO_PES_RUNTIME.spreadsheet;
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('No se encontró el spreadsheet del proyecto. Debes fijar GO_PES_SPREADSHEET_ID.');
  }

  GO_PES_RUNTIME.spreadsheet = active;
  return GO_PES_RUNTIME.spreadsheet;
}

function getSheet_(sheetName) {
  if (GO_PES_RUNTIME.sheetByName[sheetName]) {
    return GO_PES_RUNTIME.sheetByName[sheetName];
  }

  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (sheet) {
    GO_PES_RUNTIME.sheetByName[sheetName] = sheet;
  }
  return sheet;
}

function sheetExists_(sheetName) {
  return !!getSheet_(sheetName);
}

function ensureGoPesV2Sheets_() {
  const defs = buildSheetDefinitions_();
  Object.keys(defs).forEach(name => ensureSheetWithHeaders_(name, defs[name]));
}

function buildSheetDefinitions_() {
  if (typeof goPesApplyAvancePhase1Config_ === 'function') {
    try {
      goPesApplyAvancePhase1Config_();
    } catch (err) {}
  }

  const S = GO_PES_V2.SHEETS;
  const defs = {
    [S.RAW_INGRESO]: ['created_at', 'source', 'user_email', 'vecino_id', 'solicitud_id', 'nombre_vecino', 'apellido_vecino', 'rut_vecino', 'telefono_contacto', 'correo_contacto', 'direccion_original', 'uv', 'sector', 'tipo_vivienda', 'requerimiento_inicial', 'medio_solicitud', 'unidad_origen', 'fecha_solicitud', 'observaciones_form', 'estado_vecino', 'legacy_source', 'legacy_key'],
    [S.RAW_SEGUIMIENTO]: ['created_at', 'source', 'user_email', 'solicitud_id', 'organizacion_id', 'vecino_id', 'fecha_gestion', 'responsable_gestion', 'territorial_responsable', 'flujo', 'hito', 'estado_hito', 'detalle_gestion', 'resultado_hito', 'fecha_vencimiento', 'proximo_hito_sugerido', 'proxima_accion_descripcion', 'documento_respaldo_url', 'legacy_source', 'legacy_key'],
    [S.RAW_ORGANIZACIONES]: ['created_at', 'source', 'user_email', 'solicitud_id', 'organizacion_id', 'tipo_organizacion', 'nombre_organizacion', 'uv', 'sector', 'direccion_referencia', 'fecha_inicio_acompanamiento', 'cantidad_socios_declarada', 'estado_constitucion', 'fecha_asamblea_constitucion', 'fecha_ratificacion', 'vigencia_directiva_hasta', 'personalidad_juridica_flag', 'certificado_provisorio_flag', 'certificado_definitivo_flag', 'directiva_vigente_flag', 'organizacion_constituida_flag', 'estado_general_organizacion', 'responsable_actual', 'observacion_resumen', 'legacy_source', 'legacy_key'],
    [S.RAW_INSTRUMENTOS]: ['created_at', 'source', 'user_email', 'organizacion_id', 'org_instrumento_id', 'instrumento_codigo_catalogo', 'instrumento_nombre_otro', 'instrumento_tipo', 'origen_instrumento', 'anio_convocatoria', 'nombre_convocatoria', 'numero_llamado', 'fecha_inicio_gestion', 'fecha_apertura', 'fecha_cierre', 'fecha_habilitacion', 'fecha_postulacion', 'fecha_resultado', 'fecha_cierre_instrumento', 'estado_instrumento', 'subestado_instrumento', 'avance_instrumento_pct', 'proximo_hito_instrumento', 'resultado_instrumento', 'monto_solicitado', 'monto_adjudicado', 'monto_ejecutado', 'responsable_instrumento', 'contraparte', 'observacion_instrumento', 'documento_respaldo_url', 'legacy_source', 'legacy_key'],
    [S.RAW_REQUISITOS]: ['created_at', 'source', 'user_email', 'organizacion_id', 'org_instrumento_id', 'requisito_registro_id', 'instrumento_codigo_catalogo', 'requisito_codigo', 'requisito_nombre_libre', 'categoria_requisito', 'estado_requisito', 'fecha_solicitud', 'fecha_cumplimiento', 'fecha_vencimiento', 'responsable_requisito', 'documento_respaldo_url', 'observacion_requisito', 'vigente_flag', 'legacy_source', 'legacy_key'],
    [S.RAW_SOCIOS]: ['created_at', 'source', 'user_email', 'organizacion_id', 'run_socio', 'numero_registro', 'nombre_socio', 'edad', 'cargo', 'direccion_socio', 'ubicacion_socio', 'nombre_comite_origen', 'status_carga', 'legacy_source', 'legacy_key'],

    [S.MAE_CASOS]: ['solicitud_id', 'vecino_id', 'nombre_vecino', 'apellido_vecino', 'nombre_completo', 'rut_vecino', 'telefono_contacto', 'correo_contacto', 'direccion_original', 'uv', 'sector', 'tipo_vivienda', 'requerimiento_inicial', 'medio_solicitud', 'unidad_origen', 'fecha_ingreso', 'estado_actual', 'etapa_actual', 'organizacion_id', 'ultima_gestion', 'proximo_hito', 'responsable_actual', 'observacion_resumen', 'updated_at'],
    [S.MAE_ORGANIZACIONES]: ['organizacion_id', 'solicitud_id', 'tipo_organizacion', 'nombre_organizacion', 'uv', 'sector', 'direccion_referencia', 'fecha_inicio_acompanamiento', 'cantidad_socios_declarada', 'estado_constitucion', 'fecha_asamblea_constitucion', 'fecha_ratificacion', 'vigencia_directiva_hasta', 'personalidad_juridica_flag', 'certificado_provisorio_flag', 'certificado_definitivo_flag', 'directiva_vigente_flag', 'organizacion_constituida_flag', 'estado_general_organizacion', 'responsable_actual', 'observacion_resumen', 'updated_at'],
    [S.FACT_HITOS]: ['hito_id', 'solicitud_id', 'organizacion_id', 'vecino_id', 'fecha_gestion', 'responsable_gestion', 'territorial_responsable', 'flujo', 'hito', 'estado_hito', 'detalle_gestion', 'resultado_hito', 'fecha_vencimiento', 'proximo_hito_sugerido', 'proxima_accion_descripcion', 'documento_respaldo_url', 'updated_by', 'updated_at'],
    [S.FACT_INSTRUMENTOS]: ['org_instrumento_id', 'organizacion_id', 'instrumento_codigo_catalogo', 'instrumento_nombre_otro', 'instrumento_tipo', 'origen_instrumento', 'anio_convocatoria', 'nombre_convocatoria', 'numero_llamado', 'fecha_inicio_gestion', 'fecha_apertura', 'fecha_cierre', 'fecha_habilitacion', 'fecha_postulacion', 'fecha_resultado', 'fecha_cierre_instrumento', 'estado_instrumento', 'subestado_instrumento', 'avance_instrumento_pct', 'proximo_hito_instrumento', 'resultado_instrumento', 'monto_solicitado', 'monto_adjudicado', 'monto_ejecutado', 'responsable_instrumento', 'contraparte', 'observacion_instrumento', 'documento_respaldo_url', 'updated_by', 'updated_at'],
    [S.FACT_REQUISITOS]: ['requisito_registro_id', 'organizacion_id', 'org_instrumento_id', 'instrumento_codigo_catalogo', 'requisito_codigo', 'requisito_nombre_libre', 'categoria_requisito', 'estado_requisito', 'fecha_solicitud', 'fecha_cumplimiento', 'fecha_vencimiento', 'responsable_requisito', 'documento_respaldo_url', 'observacion_requisito', 'vigente_flag', 'updated_by', 'updated_at'],
    [S.FACT_SOCIOS]: ['socio_id', 'organizacion_id', 'run_socio', 'numero_registro', 'nombre_socio', 'edad', 'cargo', 'direccion_socio', 'ubicacion_socio', 'nombre_comite_origen', 'status_carga', 'updated_by', 'updated_at'],

    [S.MASTER]: ['solicitud_id', 'vecino_id', 'organizacion_id', 'nombre_completo', 'telefono_contacto', 'correo_contacto', 'direccion_original', 'uv', 'sector', 'fecha_ingreso', 'estado_actual', 'etapa_actual', 'proximo_hito', 'responsable_actual', 'nombre_organizacion', 'estado_constitucion', 'estado_general_organizacion', 'cantidad_instrumentos_activos', 'cantidad_requisitos_pendientes', 'cantidad_socios', 'ultimo_usuario', 'ultima_actualizacion'],
    [S.VW_ORGS]: ['organizacion_id', 'solicitud_id', 'nombre_organizacion', 'uv', 'sector', 'estado_constitucion', 'estado_general_organizacion', 'cantidad_instrumentos_activos', 'cantidad_socios', 'responsable_actual', 'updated_at'],
    [S.VW_INSTR]: ['org_instrumento_id', 'organizacion_id', 'nombre_organizacion', 'instrumento_codigo_catalogo', 'instrumento_tipo', 'origen_instrumento', 'estado_instrumento', 'resultado_instrumento', 'avance_instrumento_pct', 'responsable_instrumento', 'updated_at'],
    [S.VW_TERR]: ['uv', 'sector', 'total_solicitudes', 'total_organizaciones', 'organizaciones_constituidas', 'instrumentos_activos'],

    [S.DIM_USUARIOS]: ['user_id', 'email', 'nombre_visible', 'perfil', 'activo_flag', 'superuser_flag', 'fecha_alta', 'fecha_ultima_actividad'],
    [S.DIM_TERRITORIO]: ['uv', 'sector', 'macrosector', 'activo_flag'],
    [S.DIM_ESTADOS]: ['tipo_estado', 'codigo_estado', 'descripcion_estado', 'orden_estado', 'activo_flag'],
    [S.DIM_ETAPAS]: ['etapa_constitucion_num', 'etapa_constitucion_codigo', 'etapa_constitucion_txt', 'orden_visual', 'peso_avance', 'activa_flag'],
    [S.DIM_ORIGEN]: ['medio_solicitud', 'unidad_origen', 'categoria_origen', 'activo_flag'],
    [S.DIM_INSTRUMENTOS]: ['instrumento_codigo_catalogo', 'instrumento_nombre', 'instrumento_tipo', 'origen_instrumento', 'activo_flag'],
    [S.DIM_REQUISITOS]: ['instrumento_codigo_catalogo', 'requisito_codigo', 'requisito_nombre', 'categoria_requisito', 'activo_flag'],
    [S.DIM_RESPONSABLES]: ['responsable_id', 'nombre_responsable', 'perfil', 'activo_flag'],
    [S.DIM_CARGOS]: ['cargo_id', 'cargo_nombre', 'activo_flag'],
    [S.DIM_ORG_SUG]: ['organizacion_id', 'nombre_organizacion', 'uv', 'sector', 'estado_constitucion', 'estado_general_organizacion', 'activo_flag'],
    [S.DIM_VEC_SUG]: ['vecino_id', 'solicitud_id', 'nombre_completo', 'telefono_contacto', 'direccion_original', 'uv', 'sector', 'estado_actual', 'activo_flag'],
    [S.DIM_SOL_SUG]: ['solicitud_id', 'vecino_id', 'nombre_completo', 'telefono_contacto', 'direccion_original', 'estado_actual', 'organizacion_id', 'activo_flag'],

    [S.LOG_PROC]: ['timestamp', 'nivel', 'accion', 'entidad', 'entidad_id', 'usuario', 'resultado', 'detalle_json'],
    [S.LOG_ACCESOS]: ['timestamp', 'event', 'email', 'payload_json'],
    [S.LOG_ACCIONES]: ['timestamp', 'email', 'action', 'entity_type', 'entity_id', 'result', 'detail_json']
  };

  if (typeof getGoPesAvanceSheetDefinitions_ === 'function') {
    const avanceDefs = getGoPesAvanceSheetDefinitions_();
    Object.keys(avanceDefs || {}).forEach(function(sheetName) {
      defs[sheetName] = avanceDefs[sheetName];
    });
  }

  return defs;
}

function ensureSheetWithHeaders_(name, headers) {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const lastCol = sh.getLastColumn();
  const current = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  const mismatch = headers.some((h, i) => current[i] !== h) || current.length !== headers.length;
  if (mismatch) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    invalidateSheetRuntimeCache_(name);
  }
  GO_PES_RUNTIME.sheetByName[name] = sh;
  return sh;
}

function getSheetData_(sheetName) {
  if (GO_PES_RUNTIME.rowsBySheet[sheetName]) {
    return cloneRowObjects_(GO_PES_RUNTIME.rowsBySheet[sheetName]);
  }

  const sh = getSheet_(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = getSheetDataFromSheet_(sh, 1);
  GO_PES_RUNTIME.rowsBySheet[sheetName] = cloneRowObjects_(rows);
  return cloneRowObjects_(rows);
}

function getSheetDataFromHeaderRow_(sheetName, headerRow) {
  if ((headerRow || 1) === 1) {
    return getSheetData_(sheetName);
  }

  const sh = getSheet_(sheetName);
  if (!sh) return [];
  return getSheetDataFromSheet_(sh, headerRow || 1);
}

function getSheetDataFromSheet_(sh, headerRow) {
  headerRow = headerRow || 1;
  if (!sh || sh.getLastRow() <= headerRow) return [];
  const headers = sh.getRange(headerRow, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const values = sh.getRange(headerRow + 1, 1, sh.getLastRow() - headerRow, headers.length).getValues();
  return values
    .filter(r => r.join('').trim() !== '')
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = r[i]);
      return obj;
    });
}

function getSheetDataMap_(sheetNames) {
  return (sheetNames || []).reduce(function(acc, sheetName) {
    acc[sheetName] = getSheetData_(sheetName);
    return acc;
  }, {});
}

function appendRowObject_(sheetName, obj) {
  const sh = ensureSheetWithHeaders_(sheetName, buildSheetDefinitions_()[sheetName] || Object.keys(obj));
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
  invalidateSheetRuntimeCache_(sheetName);
}

function appendRowObjects_(sheetName, objects) {
  const rowsToAppend = Array.isArray(objects) ? objects : [];
  if (!rowsToAppend.length) return;

  const headers = buildSheetDefinitions_()[sheetName] || Object.keys(rowsToAppend[0] || {});
  const sh = ensureSheetWithHeaders_(sheetName, headers);
  const values = rowsToAppend.map(function(obj) {
    return headers.map(function(header) {
      return obj && obj[header] !== undefined ? obj[header] : '';
    });
  });

  sh.getRange(sh.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  invalidateSheetRuntimeCache_(sheetName);
}

function upsertByKey_(sheetName, keyField, obj, caseInsensitive) {
  const headers = buildSheetDefinitions_()[sheetName] || Object.keys(obj);
  const sh = ensureSheetWithHeaders_(sheetName, headers);
  const data = getSheetData_(sheetName);
  const target = caseInsensitive ? normalizeText_(obj[keyField]) : String(obj[keyField] || '');
  let rowIndex = -1;

  for (let i = 0; i < data.length; i++) {
    const candidate = caseInsensitive ? normalizeText_(data[i][keyField]) : String(data[i][keyField] || '');
    if (candidate === target) {
      rowIndex = i + 2;
      break;
    }
  }

  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  if (rowIndex === -1) {
    sh.appendRow(row);
  } else {
    sh.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
  }
  invalidateSheetRuntimeCache_(sheetName);
}

function upsertRowsByKey_(sheetName, keyField, objects, caseInsensitive) {
  const items = Array.isArray(objects) ? objects : [];
  if (!items.length) return;

  const headers = buildSheetDefinitions_()[sheetName] || Object.keys(items[0] || {});
  const sh = ensureSheetWithHeaders_(sheetName, headers);
  const data = getSheetData_(sheetName);
  const index = {};
  const appendIndexByKey = {};

  data.forEach(function(row, idx) {
    const value = caseInsensitive ? normalizeText_(row[keyField]) : String(row[keyField] || '');
    index[value] = idx + 2;
  });

  const updates = [];
  const appends = [];

  items.forEach(function(obj) {
    const keyValue = caseInsensitive ? normalizeText_(obj[keyField]) : String(obj[keyField] || '');
    const row = headers.map(function(header) {
      return obj[header] !== undefined ? obj[header] : '';
    });

    if (index[keyValue]) {
      updates.push({ rowIndex: index[keyValue], values: row });
      return;
    }

    if (appendIndexByKey[keyValue] !== undefined) {
      appends[appendIndexByKey[keyValue]] = row;
      return;
    }

    appendIndexByKey[keyValue] = appends.length;
    appends.push(row);
  });

  updates.forEach(function(update) {
    sh.getRange(update.rowIndex, 1, 1, headers.length).setValues([update.values]);
  });

  if (appends.length) {
    sh.getRange(sh.getLastRow() + 1, 1, appends.length, headers.length).setValues(appends);
  }

  invalidateSheetRuntimeCache_(sheetName);
}

function replaceSheetData_(sheetName, headers, rows) {
  const sh = ensureSheetWithHeaders_(sheetName, headers);
  const lastRow = sh.getLastRow();
  const lastCol = Math.max(headers.length, sh.getLastColumn());
  if (lastRow > 1) {
    sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
  if (rows && rows.length) {
    sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  invalidateSheetRuntimeCache_(sheetName);
}

function findByField_(sheetName, field, value, caseInsensitive) {
  const rows = getSheetData_(sheetName);
  const target = caseInsensitive ? normalizeText_(value) : String(value || '');
  return rows.find(r => (caseInsensitive ? normalizeText_(r[field]) : String(r[field] || '')) === target) || null;
}

function filterByField_(sheetName, field, value, caseInsensitive) {
  const rows = getSheetData_(sheetName);
  const target = caseInsensitive ? normalizeText_(value) : String(value || '');
  return rows.filter(r => (caseInsensitive ? normalizeText_(r[field]) : String(r[field] || '')) === target);
}

function clearSheetData_(sheetName) {
  const sh = getSheet_(sheetName);
  if (!sh || sh.getLastRow() < 2) return;
  sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  invalidateSheetRuntimeCache_(sheetName);
}

function nextId_(namespace, prefix) {
  const props = PropertiesService.getScriptProperties();
  const key = `GO_PES_SEQ_${namespace.toUpperCase()}`;
  const next = Number(props.getProperty(key) || '0') + 1;
  props.setProperty(key, String(next));
  return `${prefix}-${String(next).padStart(6, '0')}`;
}

function nextIdIfMissing_(namespace, prefix, sheetName, idField, uniqueField, uniqueValue) {
  const existing = findByField_(sheetName, uniqueField, uniqueValue, true);
  if (existing && existing[idField]) return existing[idField];
  return nextId_(namespace, prefix);
}
