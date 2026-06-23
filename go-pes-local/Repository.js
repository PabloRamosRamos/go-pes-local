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
  systemConfig: null,
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

function ensureSheetsSubset_(sheetNames) {
  const defs = buildSheetDefinitions_();
  (sheetNames || []).forEach(function(sheetName) {
    if (!sheetName || !defs[sheetName]) return;
    ensureSheetWithHeaders_(sheetName, defs[sheetName]);
  });
}

// OPTIMIZACIÓN: Cache global para buildSheetDefinitions_ (se llama 25+ veces)
var GO_PES_SHEET_DEFS_CACHE_ = null;

function buildSheetDefinitions_() {
  // Retornar cache si existe
  if (GO_PES_SHEET_DEFS_CACHE_) {
    return GO_PES_SHEET_DEFS_CACHE_;
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
    [S.FACT_BENEFICIOS_DETALLE]: ['beneficio_detalle_id', 'beneficio_codigo', 'nombre_beneficio', 'descripcion_beneficio', 'instrumento_tipo', 'origen_instrumento', 'elegibilidad_tipo', 'elegibilidad_label', 'requiere_certificado_provisorio_flag', 'requiere_certificado_definitivo_flag', 'requiere_proceso_100_flag', 'cantidad_anual_capacitaciones', 'cantidad_default_capacitaciones', 'llamados_por_anio', 'visita_tecnica_requerida_flag', 'flujo_inicio_default', 'alerta_origen_modulo', 'activo_flag', 'system_flag', 'updated_by', 'updated_at'],
    [S.FACT_BENEFICIOS_HITOS]: ['beneficio_hito_base_id', 'beneficio_codigo', 'convocatoria_codigo', 'convocatoria_nombre', 'hito_codigo', 'hito_nombre', 'modo_fecha', 'fecha_inicio', 'fecha_fin', 'fecha_referencia', 'descripcion_operativa', 'alerta_clave_flag', 'estado_hito_default', 'orden_visual', 'activo_flag', 'updated_by', 'updated_at'],
    [S.FACT_BENEFICIOS_ORG]: ['beneficio_org_id', 'beneficio_codigo', 'organizacion_id', 'org_instrumento_id', 'elegible_flag', 'criterio_elegibilidad', 'motivo_no_elegibilidad', 'activo_flag', 'estado_beneficio', 'avance_beneficio_pct', 'proximo_hito_beneficio', 'fecha_inicio_beneficio', 'fecha_termino_beneficio', 'resultado_beneficio', 'responsable_beneficio', 'observacion_beneficio', 'updated_by', 'updated_at'],
    [S.FACT_BENEFICIOS_ORG_HITOS]: ['beneficio_org_hito_id', 'beneficio_org_id', 'beneficio_codigo', 'organizacion_id', 'convocatoria_codigo', 'convocatoria_nombre', 'hito_codigo', 'hito_nombre', 'modo_fecha', 'fecha_inicio', 'fecha_fin', 'fecha_referencia', 'descripcion_operativa', 'estado_hito', 'alerta_clave_flag', 'orden_visual', 'valor_texto', 'valor_numero', 'valor_flag', 'observacion_hito', 'payload_json', 'updated_by', 'updated_at'],

    [S.MASTER]: ['solicitud_id', 'vecino_id', 'organizacion_id', 'nombre_completo', 'telefono_contacto', 'correo_contacto', 'direccion_original', 'uv', 'sector', 'fecha_ingreso', 'estado_actual', 'etapa_actual', 'proximo_hito', 'responsable_actual', 'nombre_organizacion', 'estado_constitucion', 'estado_general_organizacion', 'cantidad_instrumentos_activos', 'cantidad_requisitos_pendientes', 'cantidad_socios', 'ultimo_usuario', 'ultima_actualizacion'],
    [S.VW_ORGS]: ['organizacion_id', 'solicitud_id', 'nombre_organizacion', 'uv', 'sector', 'estado_constitucion', 'estado_general_organizacion', 'cantidad_instrumentos_activos', 'cantidad_socios', 'responsable_actual', 'updated_at'],
    [S.VW_INSTR]: ['org_instrumento_id', 'organizacion_id', 'nombre_organizacion', 'instrumento_codigo_catalogo', 'instrumento_tipo', 'origen_instrumento', 'estado_instrumento', 'resultado_instrumento', 'avance_instrumento_pct', 'responsable_instrumento', 'updated_at'],
    [S.VW_TERR]: ['uv', 'sector', 'total_solicitudes', 'total_organizaciones', 'organizaciones_constituidas', 'instrumentos_activos'],

    [S.DIM_USUARIOS]: ['user_id', 'email', 'nombre_visible', 'perfil', 'activo_flag', 'superuser_flag', 'fecha_alta', 'fecha_ultima_actividad', 'modulos_permitidos', 'updated_at', 'updated_by'],
    [S.DIM_TERRITORIO]: ['uv', 'sector', 'macrosector', 'activo_flag'],
    [S.DIM_ESTADOS]: ['tipo_estado', 'codigo_estado', 'descripcion_estado', 'orden_estado', 'activo_flag'],
    [S.DIM_ETAPAS]: ['etapa_constitucion_num', 'etapa_constitucion_codigo', 'etapa_constitucion_txt', 'orden_visual', 'peso_avance', 'activa_flag'],
    [S.DIM_ORIGEN]: ['medio_solicitud', 'unidad_origen', 'categoria_origen', 'activo_flag'],
    [S.DIM_BENEFICIOS]: ['beneficio_codigo', 'beneficio_nombre', 'descripcion_beneficio', 'instrumento_tipo', 'origen_instrumento', 'elegibilidad_tipo', 'elegibilidad_label', 'activo_flag', 'system_flag', 'updated_by', 'updated_at'],
    [S.DIM_INSTRUMENTOS]: ['instrumento_codigo_catalogo', 'instrumento_nombre', 'instrumento_tipo', 'origen_instrumento', 'activo_flag'],
    [S.DIM_REQUISITOS]: ['instrumento_codigo_catalogo', 'requisito_codigo', 'requisito_nombre', 'categoria_requisito', 'activo_flag'],
    [S.DIM_RESPONSABLES]: ['responsable_id', 'nombre_responsable', 'perfil', 'activo_flag'],
    [S.DIM_CARGOS]: ['cargo_id', 'cargo_nombre', 'activo_flag'],
    [S.DIM_VEC_SUG]: ['vecino_id', 'solicitud_id', 'nombre_completo', 'telefono_contacto', 'direccion_original', 'uv', 'sector', 'estado_actual', 'organizacion_id', 'updated_at'],
    [S.DIM_SOL_SUG]: ['solicitud_id', 'vecino_id', 'nombre_completo', 'telefono_contacto', 'direccion_original', 'uv', 'sector', 'estado_actual', 'organizacion_id', 'fecha_ingreso', 'updated_at'],
    [S.DIM_ORG_SUG]: ['organizacion_id', 'nombre_organizacion', 'tipo_organizacion', 'uv', 'sector', 'estado_constitucion', 'estado_general_organizacion', 'responsable_actual', 'updated_at'],
    [S.CFG_PARAMETROS]: ['config_section', 'value_json', 'updated_at', 'updated_by'],

    [S.LOG_PROC]: ['timestamp', 'nivel', 'accion', 'entidad', 'entidad_id', 'usuario', 'resultado', 'detalle_json'],
    [S.LOG_ACCESOS]: ['timestamp', 'event', 'email', 'payload_json'],
    [S.LOG_ACCIONES]: ['timestamp', 'email', 'action', 'entity_type', 'entity_id', 'result', 'detail_json'],

    [S.CAT_HITOS_AVANCE]: ['codigo_hito', 'tramo', 'orden_hito', 'nombre_hito', 'descripcion', 'codigo_hito_previo', 'permite_saltar', 'activo_flag'],
    [S.FACT_AVANCE_HITOS]: ['avance_hito_id', 'organizacion_id', 'solicitud_id', 'codigo_hito', 'tramo', 'orden_hito', 'nombre_hito', 'fecha_hito', 'usuario_registro', 'timestamp_registro', 'observacion', 'numero_ingreso', 'fecha_asamblea_asignada', 'numero_registro', 'rut_organizacion', 'numero_cuenta', 'banco'],
    [S.FACT_AVANCE_ESTADO]: ['avance_estado_id', 'organizacion_id', 'solicitud_id', 'estado_avance', 'motivo_estado', 'fecha_estado', 'usuario_estado', 'timestamp_registro', 'activo_flag'],
    [S.VW_AVANCE_ORGANIZACION]: ['organizacion_id', 'solicitud_id', 'nombre_organizacion', 'estado_avance', 'ultimo_hito_codigo', 'ultimo_hito_nombre', 'ultimo_hito_fecha', 'usuario_ultimo_hito', 'total_hitos_cumplidos', 'total_hitos_tramo_pre', 'total_hitos_tramo_for'],

    [S.CFG_FONDESE_EDICIONES]: ['id_edicion', 'anio', 'nombre', 'presupuesto_total', 'estado', 'convocatorias', 'lineas_producto', 'documentos', 'fecha_creacion', 'creado_por'],
    [S.FACT_FONDESE]: ['fondese_id', 'id_edicion', 'organizacion_id', 'nombre_organizacion', 'convocatoria_id', 'linea_producto_id', 'estado_proceso', 'resultado_adj', 'estado_ejecucion', 'estado_rendicion', 'fecha_rendicion', 'observaciones_rendicion', 'checklist_docs', 'fecha_creacion', 'fecha_actualizacion', 'creado_por'],
    [S.FACT_FORM_EVENTOS]: ['evento_id', 'tipo', 'titulo', 'descripcion', 'fecha_evento', 'hora_inicio', 'hora_fin', 'lugar', 'tipo_inscripcion', 'cupo_maximo', 'estado', 'created_by', 'created_at', 'updated_by', 'updated_at'],
    [S.FACT_FORM_INSCRIPCIONES]: ['inscripcion_id', 'evento_id', 'tipo_inscrito', 'socio_id', 'rut', 'nombre', 'telefono', 'correo', 'organizacion_vinculada', 'estado_inscripcion', 'created_by', 'created_at', 'updated_by', 'updated_at']
  };

  // Guardar en cache y retornar
  GO_PES_SHEET_DEFS_CACHE_ = defs;
  return defs;
}

/**
 * Invalida el cache de buildSheetDefinitions_ (llamar después de modificar GO_PES_V2.SHEETS)
 */
function invalidateBuildSheetDefinitionsCache_() {
  GO_PES_SHEET_DEFS_CACHE_ = null;
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

  const diag = goPesDiagStart_('Repository.getSheetDataFromSheet_', {
    sheet: sh ? sh.getName() : '',
    header_row: headerRow
  });

  let rowsRead = 0;
  let colsRead = 0;

  try {
    if (!sh) return [];

    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow <= headerRow || !lastCol) return [];

    rowsRead = lastRow - headerRow;
    colsRead = lastCol;

    const headers = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0].map(String);
    const values = sh.getRange(headerRow + 1, 1, rowsRead, headers.length).getValues();
    return values
      .filter(r => r.join('').trim() !== '')
      .map(r => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return obj;
      });
  } finally {
    goPesDiagEnd_(diag, {
      rows_read: rowsRead,
      cols_read: colsRead
    });
  }
}

function getSheetDataMap_(sheetNames) {
  return (sheetNames || []).reduce(function(acc, sheetName) {
    acc[sheetName] = getSheetData_(sheetName);
    return acc;
  }, {});
}

function getRowsByFieldValuesSelective_(sheetName, field, values, caseInsensitive, options) {
  const targets = (values || []).map(function(value) {
    return caseInsensitive ? normalizeText_(value) : String(value || '');
  }).filter(function(value) {
    return String(value || '') !== '';
  });

  if (!targets.length) return [];

  if (GO_PES_RUNTIME.rowsBySheet[sheetName]) {
    const cached = cloneRowObjects_(GO_PES_RUNTIME.rowsBySheet[sheetName]).filter(function(row) {
      const candidate = caseInsensitive ? normalizeText_(row[field]) : String(row[field] || '');
      return targets.indexOf(candidate) !== -1;
    });
    return sortSelectiveRows_(cached, options || {});
  }

  const sh = getSheet_(sheetName);
  if (!sh) return [];

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || !lastCol) return [];

  const headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  GO_PES_RUNTIME.headersBySheet[sheetName] = headerRow.slice();

  const fieldIndex = headerRow.indexOf(field);
  if (fieldIndex === -1) return [];

  const config = Object.assign({
    sortField: '',
    sortDesc: false,
    limit: 0
  }, options || {});

  const rowsCount = lastRow - 1;
  const fieldValues = sh.getRange(2, fieldIndex + 1, rowsCount, 1).getValues();
  const sortFieldIndex = config.sortField ? headerRow.indexOf(config.sortField) : -1;
  const sortValues = sortFieldIndex !== -1
    ? sh.getRange(2, sortFieldIndex + 1, rowsCount, 1).getValues()
    : null;

  let matches = [];
  for (let i = 0; i < rowsCount; i++) {
    const candidate = caseInsensitive ? normalizeText_(fieldValues[i][0]) : String(fieldValues[i][0] || '');
    if (targets.indexOf(candidate) === -1) continue;

    matches.push({
      rowIndex: i + 2,
      sortValue: sortValues ? sortValues[i][0] : '',
      order: i
    });
  }

  if (!matches.length) return [];

  if (config.sortField) {
    matches.sort(function(a, b) {
      const aTs = new Date(a.sortValue || 0).getTime();
      const bTs = new Date(b.sortValue || 0).getTime();
      if (config.sortDesc) return bTs - aTs;
      return aTs - bTs;
    });
  }

  if (config.limit && matches.length > config.limit) {
    matches = matches.slice(0, config.limit);
  }

  const rowsByIndex = {};
  buildContiguousRowBlocks_(matches.map(function(match) {
    return match.rowIndex;
  })).forEach(function(block) {
    const valuesBlock = sh.getRange(block.start, 1, block.count, lastCol).getValues();
    valuesBlock.forEach(function(rowValues, offset) {
      const absoluteRow = block.start + offset;
      rowsByIndex[absoluteRow] = mapSheetRowToObject_(headerRow, rowValues);
    });
  });

  return matches.map(function(match) {
    return rowsByIndex[match.rowIndex];
  }).filter(Boolean);
}

function sortSelectiveRows_(rows, options) {
  const config = Object.assign({
    sortField: '',
    sortDesc: false,
    limit: 0
  }, options || {});

  let out = (rows || []).slice();
  if (config.sortField) {
    out.sort(function(a, b) {
      const aTs = new Date(a && a[config.sortField] ? a[config.sortField] : 0).getTime();
      const bTs = new Date(b && b[config.sortField] ? b[config.sortField] : 0).getTime();
      if (config.sortDesc) return bTs - aTs;
      return aTs - bTs;
    });
  }
  if (config.limit && out.length > config.limit) {
    out = out.slice(0, config.limit);
  }
  return out;
}

function buildContiguousRowBlocks_(rowIndexes) {
  const sorted = (rowIndexes || []).slice().sort(function(a, b) {
    return a - b;
  });
  if (!sorted.length) return [];

  const blocks = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    blocks.push({ start: start, count: previous - start + 1 });
    start = current;
    previous = current;
  }

  blocks.push({ start: start, count: previous - start + 1 });
  return blocks;
}

function mapSheetRowToObject_(headers, rowValues) {
  const obj = {};
  (headers || []).forEach(function(header, index) {
    obj[header] = rowValues && rowValues[index] !== undefined ? rowValues[index] : '';
  });
  return obj;
}

function appendRowObject_(sheetName, obj) {
  const diag = goPesDiagStart_('Repository.appendRowObject_', {
    sheet: sheetName
  });

  try {
    const sh = ensureSheetWithHeaders_(sheetName, buildSheetDefinitions_()[sheetName] || Object.keys(obj));
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    sh.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
    invalidateSheetRuntimeCache_(sheetName);
  invalidateRequestIndexes_();
    invalidateRequestIndexes_(); // Invalidar índices después de write
  } finally {
    goPesDiagEnd_(diag, { rows_written: 1 });
  }
}

function appendRowObjects_(sheetName, objects) {
  const rowsToAppend = Array.isArray(objects) ? objects : [];
  if (!rowsToAppend.length) return;

  const diag = goPesDiagStart_('Repository.appendRowObjects_', {
    sheet: sheetName,
    rows_written: rowsToAppend.length
  });

  try {
    const headers = buildSheetDefinitions_()[sheetName] || Object.keys(rowsToAppend[0] || {});
    const sh = ensureSheetWithHeaders_(sheetName, headers);
    const values = rowsToAppend.map(function(obj) {
      return headers.map(function(header) {
        return obj && obj[header] !== undefined ? obj[header] : '';
      });
    });

    sh.getRange(sh.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
    invalidateSheetRuntimeCache_(sheetName);
  invalidateRequestIndexes_();
    invalidateRequestIndexes_(); // Invalidar índices después de write
  } finally {
    goPesDiagEnd_(diag);
  }
}

function upsertByKey_(sheetName, keyField, obj, caseInsensitive) {
  const diag = goPesDiagStart_('Repository.upsertByKey_', {
    sheet: sheetName,
    key_field: keyField
  });

  let mode = 'append';

  try {
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
      mode = 'update';
      sh.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
    }
    invalidateSheetRuntimeCache_(sheetName);
  invalidateRequestIndexes_();
  } finally {
    goPesDiagEnd_(diag, {
      mode: mode,
      rows_written: 1
    });
  }
}

function upsertRowsByKey_(sheetName, keyField, objects, caseInsensitive) {
  const items = Array.isArray(objects) ? objects : [];
  if (!items.length) return;

  const diag = goPesDiagStart_('Repository.upsertRowsByKey_', {
    sheet: sheetName,
    key_field: keyField,
    rows_input: items.length
  });

  let updatesCount = 0;
  let appendsCount = 0;

  try {
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

    updatesCount = updates.length;
    appendsCount = appends.length;

    updates.forEach(function(update) {
      sh.getRange(update.rowIndex, 1, 1, headers.length).setValues([update.values]);
    });

    if (appends.length) {
      sh.getRange(sh.getLastRow() + 1, 1, appends.length, headers.length).setValues(appends);
    }

    invalidateSheetRuntimeCache_(sheetName);
  invalidateRequestIndexes_();
  } finally {
    goPesDiagEnd_(diag, {
      rows_updated: updatesCount,
      rows_appended: appendsCount
    });
  }
}

function replaceSheetData_(sheetName, headers, rows) {
  const diag = goPesDiagStart_('Repository.replaceSheetData_', {
    sheet: sheetName,
    rows_written: rows ? rows.length : 0
  });

  try {
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
  invalidateRequestIndexes_();
  } finally {
    goPesDiagEnd_(diag);
  }
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
  invalidateRequestIndexes_();
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

/**
 * =============================================================================
 * HELPERS SELECTIVOS - OPTIMIZACIÓN FASE 1
 * Reducen lecturas completas de hojas grandes
 * =============================================================================
 */

/**
 * Índices por request en memoria para hojas frecuentes
 */
var GO_PES_REQUEST_INDEXES = this.GO_PES_REQUEST_INDEXES || {
  casosByOrgId: null,
  casosBySolicitudId: null,
  organizacionesByOrgId: null,
  hitosByOrgId: null,
  hitosBySolicitudId: null,
  sociosByOrgId: null
};

/**
 * Invalida todos los índices (llamar después de writes)
 */
function invalidateRequestIndexes_() {
  GO_PES_REQUEST_INDEXES.casosByOrgId = null;
  GO_PES_REQUEST_INDEXES.casosBySolicitudId = null;
  GO_PES_REQUEST_INDEXES.organizacionesByOrgId = null;
  GO_PES_REQUEST_INDEXES.hitosByOrgId = null;
  GO_PES_REQUEST_INDEXES.hitosBySolicitudId = null;
  GO_PES_REQUEST_INDEXES.sociosByOrgId = null;
}

/**
 * Construye índice de casos por organizacion_id (lazy)
 */
function buildCasosByOrgIdIndex_() {
  if (GO_PES_REQUEST_INDEXES.casosByOrgId) {
    return GO_PES_REQUEST_INDEXES.casosByOrgId;
  }

  const diag = goPesDiagStart_('Repository.buildCasosByOrgIdIndex_', {});
  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);
  const index = {};

  casos.forEach(function(caso) {
    const orgId = String(caso.organizacion_id || '').trim();
    if (!orgId) return;

    // Si hay múltiples casos con mismo organizacion_id, tomar el más reciente
    const current = index[orgId];
    if (!current || new Date(caso.updated_at || caso.fecha_ingreso || 0) > new Date(current.updated_at || current.fecha_ingreso || 0)) {
      index[orgId] = caso;
    }
  });

  GO_PES_REQUEST_INDEXES.casosByOrgId = index;
  goPesDiagEnd_(diag, { index_size: Object.keys(index).length, total_casos: casos.length });
  return index;
}

/**
 * Construye índice de casos por solicitud_id (lazy)
 */
function buildCasosBySolicitudIdIndex_() {
  if (GO_PES_REQUEST_INDEXES.casosBySolicitudId) {
    return GO_PES_REQUEST_INDEXES.casosBySolicitudId;
  }

  const diag = goPesDiagStart_('Repository.buildCasosBySolicitudIdIndex_', {});
  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);
  const index = {};

  casos.forEach(function(caso) {
    const solId = String(caso.solicitud_id || '').trim();
    if (solId) {
      index[solId] = caso;
    }
  });

  GO_PES_REQUEST_INDEXES.casosBySolicitudId = index;
  goPesDiagEnd_(diag, { index_size: Object.keys(index).length, total_casos: casos.length });
  return index;
}

/**
 * Obtiene caso por organizacion_id (sin scan completo)
 */
function getCasoByOrganizacionId_(organizacionId) {
  const orgId = String(organizacionId || '').trim();
  if (!orgId) return null;

  const index = buildCasosByOrgIdIndex_();
  return index[orgId] || null;
}

/**
 * Obtiene caso por solicitud_id (sin scan completo)
 */
function getCasoBySolicitudId_(solicitudId) {
  const solId = String(solicitudId || '').trim();
  if (!solId) return null;

  const index = buildCasosBySolicitudIdIndex_();
  return index[solId] || null;
}

/**
 * Obtiene múltiples casos por lista de organizacion_id
 */
function getCasosByOrganizacionIds_(organizacionIds) {
  const index = buildCasosByOrgIdIndex_();
  return (organizacionIds || []).map(function(orgId) {
    return index[String(orgId || '').trim()] || null;
  }).filter(Boolean);
}

/**
 * Construye índice de organizaciones por organizacion_id (lazy)
 */
function buildOrganizacionesByOrgIdIndex_() {
  if (GO_PES_REQUEST_INDEXES.organizacionesByOrgId) {
    return GO_PES_REQUEST_INDEXES.organizacionesByOrgId;
  }

  const diag = goPesDiagStart_('Repository.buildOrganizacionesByOrgIdIndex_', {});
  const organizaciones = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);
  const index = {};

  organizaciones.forEach(function(org) {
    const orgId = String(org.organizacion_id || '').trim();
    if (orgId) {
      index[orgId] = org;
    }
  });

  GO_PES_REQUEST_INDEXES.organizacionesByOrgId = index;
  goPesDiagEnd_(diag, { index_size: Object.keys(index).length });
  return index;
}

/**
 * Obtiene organización por organizacion_id (sin scan completo)
 */
function getOrganizacionByOrgId_(organizacionId) {
  const orgId = String(organizacionId || '').trim();
  if (!orgId) return null;

  const index = buildOrganizacionesByOrgIdIndex_();
  return index[orgId] || null;
}
