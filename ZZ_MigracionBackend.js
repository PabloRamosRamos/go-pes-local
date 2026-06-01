/**
 * Módulo de migración de datos desde hoja de cálculo externa.
 * Solo accesible para superusers desde el módulo de Configuración.
 *
 * Fuente: spreadsheet de producción anterior.
 * Hojas origen: 'Respuestas de formulario 1' (ingresos) y 'SOCIOS'.
 * Flujo: verificar → previsualizar → ejecutar ingresos → ejecutar socios.
 *
 * CONFIGURACIÓN: El Spreadsheet ID de origen se almacena en PropertiesService.
 * Para configurarlo, ejecutar desde el editor (una sola vez):
 *   goPesConfigurarMigracionSourceId('1Eb_mj3Ef6Ss0JiBuQvlshj3nbKTOqLgtNbDRDsBzJq8')
 */
var MIGRACION_SHEET_INGRESOS_ = 'Respuestas de formulario 1';
var MIGRACION_SHEET_SOCIOS_ = 'SOCIOS';

var MIGRACION_INGRESO_KEYWORDS_ = {
  nombre_vecino:         ['nombre'],
  apellido_vecino:       ['apellido'],
  rut_vecino:            ['rut', 'run'],
  telefono_contacto:     ['telefono', 'fono', 'celular', 'tel'],
  correo_contacto:       ['correo', 'email', 'mail'],
  direccion_original:    ['direccion', 'calle', 'domicilio'],
  uv:                    ['uv', 'unidad vecinal'],
  sector:                ['sector'],
  tipo_vivienda:         ['vivienda'],
  requerimiento_inicial: ['requerimiento', 'solicitud', 'motivo', 'necesidad'],
  medio_solicitud:       ['medio', 'canal'],
  unidad_origen:         ['unidad', 'derivado', 'origen'],
  fecha_solicitud:       ['marca temporal', 'marca de tiempo', 'fecha', 'timestamp'],
  observaciones_form:    ['observacion', 'comentario', 'nota']
};

var MIGRACION_SOCIOS_KEYWORDS_ = {
  organizacion_id:      ['organizacion_id', 'org_id', 'id_organizacion'],
  nombre_comite_origen: ['organizacion', 'comite', 'junta', 'nombre org'],
  run_socio:            ['rut', 'run', 'cedula'],
  numero_registro:      ['numero', 'registro', 'nro', 'n.', 'num'],
  nombre_socio:         ['nombre'],
  edad:                 ['edad'],
  cargo:                ['cargo', 'rol'],
  direccion_socio:      ['direccion', 'domicilio'],
  ubicacion_socio:      ['ubicacion', 'sector']
};

// ------------------------------------------------------------
// Helpers internos
// ------------------------------------------------------------

function bulkNextIds_(namespace, prefix, count) {
  if (!count || count < 1) return [];
  const props = PropertiesService.getScriptProperties();
  const key = 'GO_PES_SEQ_' + namespace.toUpperCase();
  const current = Number(props.getProperty(key) || '0');
  props.setProperty(key, String(current + count));
  return Array.from({ length: count }, function(_, i) {
    return prefix + '-' + String(current + i + 1).padStart(6, '0');
  });
}

function migracionAutoMap_(headers, keywords) {
  const mapping = {};
  const usedIdx = {};
  Object.keys(keywords).forEach(function(destField) {
    const terms = keywords[destField];
    for (var i = 0; i < headers.length; i++) {
      if (usedIdx[i]) continue;
      const normalized = normalizeText_(headers[i]);
      const matched = terms.some(function(term) {
        return normalized.indexOf(normalizeText_(term)) !== -1;
      });
      if (matched) {
        mapping[destField] = headers[i];
        usedIdx[i] = true;
        break;
      }
    }
  });
  return mapping;
}

function migracionApplyMap_(rowObj, columnMap) {
  const result = {};
  Object.keys(columnMap).forEach(function(destField) {
    const srcHeader = columnMap[destField];
    result[destField] = srcHeader ? String(rowObj[srcHeader] || '').trim() : '';
  });
  return result;
}

/**
 * Obtiene el Spreadsheet ID de origen configurado en PropertiesService.
 * @private
 */
function getMigracionSourceId_() {
  const props = PropertiesService.getScriptProperties();
  const sourceId = props.getProperty('GO_PES_MIGRATION_SOURCE_ID');

  if (!sourceId) {
    throw new Error(
      'Spreadsheet de migración no configurado. ' +
      'Ejecuta desde el editor: goPesConfigurarMigracionSourceId("SPREADSHEET_ID")'
    );
  }

  return sourceId;
}

/**
 * Configura el Spreadsheet ID de origen para migración.
 * Solo superusers pueden ejecutar esta función.
 */
function goPesConfigurarMigracionSourceId(spreadsheetId) {
  const user = requireRole_(['superuser']);

  const id = String(spreadsheetId || '').trim();
  if (!id || id.length < 20) {
    throw new Error('Spreadsheet ID inválido.');
  }

  // Validar que el spreadsheet existe y es accesible
  try {
    SpreadsheetApp.openById(id);
  } catch (err) {
    throw new Error('No se pudo acceder al Spreadsheet con ID: ' + id + '. Verifica los permisos.');
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperty('GO_PES_MIGRATION_SOURCE_ID', id);

  logProcessing_('INFO', 'goPesConfigurarMigracionSourceId', 'migration_config', id, user.email, 'OK', {
    spreadsheet_id: id
  });

  return { ok: true, spreadsheet_id: id, message: 'Spreadsheet de migración configurado correctamente' };
}

/**
 * Obtiene el Spreadsheet ID configurado (solo para verificación).
 */
function goPesVerMigracionSourceId() {
  requireRole_(['superuser']);
  const sourceId = getMigracionSourceId_();
  return { ok: true, spreadsheet_id: sourceId };
}

function migracionReadSource_(sheetName) {
  const ss = SpreadsheetApp.openById(getMigracionSourceId_());
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('No se encontró la hoja "' + sheetName + '" en la fuente de migración.');

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || !lastCol) return { headers: [], rows: [] };

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const rows = values
    .filter(function(r) { return r.join('').trim() !== ''; })
    .map(function(r) {
      const obj = {};
      headers.forEach(function(h, i) { obj[h] = r[i]; });
      return obj;
    });

  return { headers: headers, rows: rows };
}

function migracionValidarIngreso_(mapped) {
  if (!String(mapped.nombre_vecino || '').trim() && !String(mapped.apellido_vecino || '').trim()) {
    return { ok: false, error: 'Falta nombre del vecino.' };
  }
  return { ok: true };
}

function migracionValidarSocio_(mapped) {
  if (!String(mapped.nombre_socio || '').trim()) {
    return { ok: false, error: 'Falta nombre del socio.' };
  }
  return { ok: true };
}

// ------------------------------------------------------------
// API pública
// ------------------------------------------------------------

function verificarFuenteMigracion() {
  requireModuleAccess_('configuracion', ['superuser']);

  try {
    const srcIngresos = migracionReadSource_(MIGRACION_SHEET_INGRESOS_);
    const srcSocios   = migracionReadSource_(MIGRACION_SHEET_SOCIOS_);

    const mappingIngresos = migracionAutoMap_(srcIngresos.headers, MIGRACION_INGRESO_KEYWORDS_);
    const mappingSocios   = migracionAutoMap_(srcSocios.headers,   MIGRACION_SOCIOS_KEYWORDS_);

    const existingOrgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);
    const existingCases = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);

    return serializeForClient_({
      ok: true,
      ingresos: {
        sheet: MIGRACION_SHEET_INGRESOS_,
        totalRows: srcIngresos.rows.length,
        headers: srcIngresos.headers,
        suggestedMap: mappingIngresos
      },
      socios: {
        sheet: MIGRACION_SHEET_SOCIOS_,
        totalRows: srcSocios.rows.length,
        headers: srcSocios.headers,
        suggestedMap: mappingSocios
      },
      destStats: {
        existingOrgs: existingOrgs.length,
        existingCases: existingCases.length
      }
    });
  } catch (e) {
    return serializeForClient_({ ok: false, error: e.message });
  }
}

function previewMigracion(payload) {
  requireModuleAccess_('configuracion', ['superuser']);

  payload = payload || {};
  const tipo      = String(payload.tipo || '').trim();
  const columnMap = payload.columnMap || {};

  if (tipo !== 'ingresos' && tipo !== 'socios') {
    return serializeForClient_({ ok: false, error: 'tipo debe ser "ingresos" o "socios".' });
  }

  try {
    const sheetName = tipo === 'ingresos' ? MIGRACION_SHEET_INGRESOS_ : MIGRACION_SHEET_SOCIOS_;
    const src = migracionReadSource_(sheetName);
    const previewRows = src.rows.slice(0, 10);

    const mapped = previewRows.map(function(row, idx) {
      const m = migracionApplyMap_(row, columnMap);
      const v = tipo === 'ingresos' ? migracionValidarIngreso_(m) : migracionValidarSocio_(m);
      return { index: idx + 1, data: m, valid: v.ok, error: v.error || '' };
    });

    return serializeForClient_({ ok: true, rows: mapped, totalSource: src.rows.length });
  } catch (e) {
    return serializeForClient_({ ok: false, error: e.message });
  }
}

function ejecutarMigracionIngresos(payload) {
  const user = requireModuleAccess_('configuracion', ['superuser']);
  payload = payload || {};
  const columnMap = payload.columnMap || {};

  const lock = LockService.getDocumentLock();
  lock.waitLock(60000);

  try {
    ensureSheetsSubset_([GO_PES_V2.SHEETS.RAW_INGRESO, GO_PES_V2.SHEETS.MAE_CASOS]);

    const src = migracionReadSource_(MIGRACION_SHEET_INGRESOS_);
    const now = new Date();

    // Índice de RUTs existentes para detección de duplicados
    const existingRuts = {};
    getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS).forEach(function(r) {
      const rut = normalizeText_(r.rut_vecino || '');
      if (rut) existingRuts[rut] = true;
    });

    const toImport  = [];
    const errors    = [];
    const duplicates = [];

    src.rows.forEach(function(row, idx) {
      const mapped = migracionApplyMap_(row, columnMap);
      const v = migracionValidarIngreso_(mapped);

      if (!v.ok) {
        errors.push({ index: idx + 1, error: v.error, rut: mapped.rut_vecino || '' });
        return;
      }

      const rutNorm = normalizeText_(mapped.rut_vecino || '');
      if (rutNorm && existingRuts[rutNorm]) {
        duplicates.push({
          index: idx + 1,
          rut: mapped.rut_vecino,
          nombre: String(mapped.nombre_vecino || '') + ' ' + String(mapped.apellido_vecino || '')
        });
        return;
      }

      if (rutNorm) existingRuts[rutNorm] = true;
      toImport.push(mapped);
    });

    if (!toImport.length) {
      return serializeForClient_({
        ok: true,
        total: src.rows.length,
        imported: 0,
        duplicates: duplicates.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 50),
        duplicateDetails: duplicates.slice(0, 50),
        message: 'No hay ingresos nuevos para importar.'
      });
    }

    const vecinoIds   = bulkNextIds_('vecino',   'VEC', toImport.length);
    const solicitudIds = bulkNextIds_('solicitud', 'SOL', toImport.length);

    const rawRows = [];
    const maeRows = [];

    toImport.forEach(function(mapped, i) {
      const vecinoId   = vecinoIds[i];
      const solicitudId = solicitudIds[i];
      const fechaSolicitud = asDateOrBlank_(mapped.fecha_solicitud) || now;

      rawRows.push({
        created_at:           now,
        source:               'MIGRACION',
        user_email:           user.email,
        vecino_id:            vecinoId,
        solicitud_id:         solicitudId,
        nombre_vecino:        mapped.nombre_vecino || '',
        apellido_vecino:      mapped.apellido_vecino || '',
        rut_vecino:           mapped.rut_vecino || '',
        telefono_contacto:    mapped.telefono_contacto || '',
        correo_contacto:      mapped.correo_contacto || '',
        direccion_original:   mapped.direccion_original || '',
        uv:                   mapped.uv || '',
        sector:               mapped.sector || '',
        tipo_vivienda:        mapped.tipo_vivienda || '',
        requerimiento_inicial:mapped.requerimiento_inicial || '',
        medio_solicitud:      mapped.medio_solicitud || 'Migración',
        unidad_origen:        mapped.unidad_origen || '',
        fecha_solicitud:      fechaSolicitud,
        observaciones_form:   mapped.observaciones_form || '',
        estado_vecino:        'Migrado',
        legacy_source:        getMigracionSourceId_(),
        legacy_key:           ''
      });

      maeRows.push({
        solicitud_id:          solicitudId,
        vecino_id:             vecinoId,
        nombre_vecino:         mapped.nombre_vecino || '',
        apellido_vecino:       mapped.apellido_vecino || '',
        nombre_completo:       buildFullName_(mapped.nombre_vecino, mapped.apellido_vecino),
        rut_vecino:            mapped.rut_vecino || '',
        telefono_contacto:     mapped.telefono_contacto || '',
        correo_contacto:       mapped.correo_contacto || '',
        direccion_original:    mapped.direccion_original || '',
        uv:                    mapped.uv || '',
        sector:                mapped.sector || '',
        tipo_vivienda:         mapped.tipo_vivienda || '',
        requerimiento_inicial: mapped.requerimiento_inicial || '',
        medio_solicitud:       mapped.medio_solicitud || 'Migración',
        unidad_origen:         mapped.unidad_origen || '',
        fecha_ingreso:         fechaSolicitud,
        estado_actual:         'Migrado',
        etapa_actual:          'Ingreso migrado',
        organizacion_id:       '',
        ultima_gestion:        now,
        proximo_hito:          'Pendiente revisión',
        responsable_actual:    user.nombre_visible || user.email,
        observacion_resumen:   mapped.observaciones_form || '',
        updated_at:            now
      });
    });

    appendRowObjects_(GO_PES_V2.SHEETS.RAW_INGRESO, rawRows);
    appendRowObjects_(GO_PES_V2.SHEETS.MAE_CASOS, maeRows);

    logProcessing_('INFO', 'ejecutarMigracionIngresos', 'migracion', '',
      user.email, errors.length || duplicates.length ? 'PARCIAL' : 'OK',
      { total: src.rows.length, imported: toImport.length, duplicates: duplicates.length, errors: errors.length });
    logUserAction_('MIGRACION_INGRESOS', 'migracion', '',
      errors.length || duplicates.length ? 'PARCIAL' : 'OK',
      { total: src.rows.length, imported: toImport.length });

    return serializeForClient_({
      ok: true,
      total: src.rows.length,
      imported: toImport.length,
      duplicates: duplicates.length,
      errors: errors.length,
      errorDetails: errors.slice(0, 50),
      duplicateDetails: duplicates.slice(0, 50),
      needsRebuild: true,
      message: 'Migración completada: ' + toImport.length + ' ingresos importados. Reconstruye las vistas para ver los datos en el sistema.'
    });
  } finally {
    lock.releaseLock();
  }
}

function ejecutarMigracionSocios(payload) {
  const user = requireModuleAccess_('configuracion', ['superuser']);
  payload = payload || {};
  const columnMap = payload.columnMap || {};

  const lock = LockService.getDocumentLock();
  lock.waitLock(60000);

  try {
    ensureSheetsSubset_([GO_PES_V2.SHEETS.RAW_SOCIOS, GO_PES_V2.SHEETS.FACT_SOCIOS]);

    const existingOrgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);
    if (!existingOrgs.length) {
      throw new Error('No existen organizaciones en el sistema. Ejecuta primero la migración de ingresos.');
    }

    // Índices de organizaciones por ID y por nombre normalizado
    const orgById  = {};
    const orgByName = {};
    existingOrgs.forEach(function(org) {
      const id     = String(org.organizacion_id || '').trim();
      const nombre = normalizeText_(org.nombre_organizacion || '');
      if (!id) return;
      orgById[id]  = org;
      if (nombre) orgByName[nombre] = org;
    });

    // Pares existentes (run_socio|organizacion_id) para detección de duplicados
    const existingPairs = {};
    getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS).forEach(function(r) {
      const run   = normalizeText_(r.run_socio || '');
      const orgId = String(r.organizacion_id || '').trim();
      if (run && orgId) existingPairs[run + '|' + orgId] = true;
    });

    const src = migracionReadSource_(MIGRACION_SHEET_SOCIOS_);
    const now = new Date();

    const toImport    = [];
    const errors      = [];
    const duplicates  = [];
    const orgNotFound = [];

    src.rows.forEach(function(row, idx) {
      const mapped = migracionApplyMap_(row, columnMap);

      // Resolver organizacion_id: columna directa o búsqueda por nombre
      let orgId = String(mapped.organizacion_id || '').trim();
      if (!orgId && mapped.nombre_comite_origen) {
        const org = orgByName[normalizeText_(mapped.nombre_comite_origen)];
        if (org) orgId = String(org.organizacion_id || '').trim();
      }

      if (!orgId || !orgById[orgId]) {
        orgNotFound.push({
          index: idx + 1,
          nombre: mapped.nombre_socio || '',
          run:    mapped.run_socio || '',
          comite: mapped.nombre_comite_origen || '',
          orgId:  orgId || ''
        });
        return;
      }

      mapped.organizacion_id = orgId;

      const v = migracionValidarSocio_(mapped);
      if (!v.ok) {
        errors.push({ index: idx + 1, error: v.error, nombre: mapped.nombre_socio || '' });
        return;
      }

      // Detección de duplicados por (run_socio, organizacion_id)
      const runNorm  = normalizeText_(mapped.run_socio || '');
      const pairKey  = runNorm + '|' + orgId;
      if (runNorm && existingPairs[pairKey]) {
        duplicates.push({
          index: idx + 1,
          run:   mapped.run_socio,
          nombre: mapped.nombre_socio,
          organizacion_id: orgId
        });
        return;
      }

      if (runNorm) existingPairs[pairKey] = true;
      toImport.push(mapped);
    });

    if (!toImport.length) {
      return serializeForClient_({
        ok: true,
        total: src.rows.length,
        imported: 0,
        duplicates: duplicates.length,
        errors: errors.length,
        orgsNoEncontradas: orgNotFound.length,
        errorDetails: errors.slice(0, 50),
        duplicateDetails: duplicates.slice(0, 50),
        orgNotFoundDetails: orgNotFound.slice(0, 50),
        message: 'No hay socios nuevos para importar.'
      });
    }

    const socioIds = bulkNextIds_('socio', 'SOC', toImport.length);

    const rawRows  = [];
    const factRows = [];

    toImport.forEach(function(mapped, i) {
      const socioId = socioIds[i];

      rawRows.push({
        created_at:          now,
        source:              'MIGRACION',
        user_email:          user.email,
        organizacion_id:     mapped.organizacion_id,
        run_socio:           mapped.run_socio || '',
        numero_registro:     mapped.numero_registro || '',
        nombre_socio:        mapped.nombre_socio,
        edad:                asNumberOrBlank_(mapped.edad),
        cargo:               mapped.cargo || '',
        direccion_socio:     mapped.direccion_socio || '',
        ubicacion_socio:     mapped.ubicacion_socio || '',
        nombre_comite_origen:mapped.nombre_comite_origen || '',
        status_carga:        'MIGRACION',
        legacy_source:       getMigracionSourceId_(),
        legacy_key:          ''
      });

      factRows.push({
        socio_id:            socioId,
        organizacion_id:     mapped.organizacion_id,
        run_socio:           mapped.run_socio || '',
        numero_registro:     mapped.numero_registro || '',
        nombre_socio:        mapped.nombre_socio,
        edad:                asNumberOrBlank_(mapped.edad),
        cargo:               mapped.cargo || '',
        direccion_socio:     mapped.direccion_socio || '',
        ubicacion_socio:     mapped.ubicacion_socio || '',
        nombre_comite_origen:mapped.nombre_comite_origen || '',
        status_carga:        'MIGRACION',
        updated_by:          user.email,
        updated_at:          now
      });
    });

    appendRowObjects_(GO_PES_V2.SHEETS.RAW_SOCIOS, rawRows);
    appendRowObjects_(GO_PES_V2.SHEETS.FACT_SOCIOS, factRows);

    logProcessing_('INFO', 'ejecutarMigracionSocios', 'migracion', '',
      user.email, errors.length || orgNotFound.length ? 'PARCIAL' : 'OK',
      { total: src.rows.length, imported: toImport.length, duplicates: duplicates.length, errors: errors.length, orgNotFound: orgNotFound.length });
    logUserAction_('MIGRACION_SOCIOS', 'migracion', '',
      errors.length || orgNotFound.length ? 'PARCIAL' : 'OK',
      { total: src.rows.length, imported: toImport.length });

    return serializeForClient_({
      ok: true,
      total: src.rows.length,
      imported: toImport.length,
      duplicates: duplicates.length,
      errors: errors.length,
      orgsNoEncontradas: orgNotFound.length,
      errorDetails: errors.slice(0, 50),
      duplicateDetails: duplicates.slice(0, 50),
      orgNotFoundDetails: orgNotFound.slice(0, 50),
      needsRebuild: true,
      message: 'Migración completada: ' + toImport.length + ' socios importados. Reconstruye las vistas para ver los datos en el sistema.'
    });
  } finally {
    lock.releaseLock();
  }
}
