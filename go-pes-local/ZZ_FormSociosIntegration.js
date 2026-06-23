/**
 * ZZ_FormSociosIntegration.js
 * Integración con Google Form de registro de socios
 *
 * Form ID: 1Mwyocl0WKftdNbVaSr3Hg_yTRphPDa3CEaNcCFEiHL0
 * Entry ID: entry.148863196
 */

/**
 * Genera link prellenado del formulario de registro de socios para un grupo específico
 */
function generarLinkFormSocios(payload) {
  const diag = goPesDiagStart_('ZZ_FormSociosIntegration.generarLinkFormSocios', payload || {});
  const user = requireModuleAccess_('organizacion', ['operador', 'coordinador', 'superuser']);

  payload = payload || {};
  const solicitudId = String(payload.solicitud_id || '').trim();
  if (!solicitudId) throw new Error('Falta solicitud_id del grupo.');

  // Obtener info del grupo desde MAE_CASOS
  const caso = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false);
  if (!caso) throw new Error('No se encontró el grupo de vecinos indicado.');

  // Validar que no tenga organizacion_id (debe ser grupo, no org constituida)
  if (String(caso.organizacion_id || '').trim()) {
    throw new Error('Este grupo ya está constituido como organización. Use el módulo de Socios para gestionar miembros.');
  }

  // Construir label del grupo
  const nombreCompleto = String(caso.nombre_completo || '').trim();
  const sector = String(caso.sector || caso.uv || '').trim();
  const label = nombreCompleto + (sector ? ' - ' + sector : '');

  // Obtener configuración del form
  const config = goPesGetFormSociosConfig_();
  if (!config.activo) throw new Error('El formulario de registro de socios no está activo.');

  // Construir URL prellenada
  const labelEncoded = encodeURIComponent(label).replace(/%20/g, '+');
  const url = config.form_url_base + '?usp=pp_url&' + config.entry_grupo + '=' + labelEncoded;

  // Generar QR code (usamos API pública de QR Server)
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(url);

  logUserAction_('GENERAR_LINK_FORM_SOCIOS', 'grupo', solicitudId, 'OK', { label: label });

  const result = {
    ok: true,
    solicitud_id: solicitudId,
    label: label,
    url: url,
    qr_url: qrUrl,
    nombre_contacto: nombreCompleto,
    sector: sector
  };

  goPesDiagEnd_(diag, { ok: true });
  return serializeForClient_(result);
}

/**
 * Obtiene la configuración del formulario de socios
 */
function goPesGetFormSociosConfig_() {
  const config = getRuntimeSystemConfig_();
  const formConfig = config.form_socios_config || {};

  // Valores por defecto hardcodeados
  return {
    form_url_base: String(formConfig.form_url_base || 'https://docs.google.com/forms/d/e/1FAIpQLSczBrk27i-7R00G66LpEWolrIm2eWrRFOYqkgrFjUhriQDYew/viewform'),
    entry_grupo: String(formConfig.entry_grupo || 'entry.1283210507'),
    sheet_respuestas_id: String(formConfig.sheet_respuestas_id || '1fRpj_XRDjyUCm7RS4yd6GIPP5a24e8qTDL6l17k0gkc'),
    activo: formConfig.activo !== undefined ? Boolean(formConfig.activo) : true
  };
}

/**
 * Actualiza la configuración del formulario de socios (solo superuser)
 */
function actualizarConfigFormSocios(payload) {
  requireRole_(['superuser']);

  payload = payload || {};
  const config = getSystemConfig_();

  config.form_socios_config = {
    form_url_base: String(payload.form_url_base || config.form_socios_config?.form_url_base || ''),
    entry_grupo: String(payload.entry_grupo || config.form_socios_config?.entry_grupo || ''),
    sheet_respuestas_id: String(payload.sheet_respuestas_id || config.form_socios_config?.sheet_respuestas_id || ''),
    activo: payload.activo !== undefined ? Boolean(payload.activo) : Boolean(config.form_socios_config?.activo)
  };

  setSystemConfig_(config);

  logUserAction_('UPDATE_CONFIG_FORM_SOCIOS', 'config', '', 'OK', config.form_socios_config);

  return serializeForClient_({ ok: true, config: config.form_socios_config });
}

/**
 * Lee respuestas del formulario de Google Sheets e importa a RAW_SOCIOS + FACT_SOCIOS
 */
function importarRespuestasFormSocios(payload) {
  const diag = goPesDiagStart_('ZZ_FormSociosIntegration.importarRespuestasFormSocios', payload || {});
  const user = requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);

  // Obtener configuración
  const config = goPesGetFormSociosConfig_();
  if (!config.activo) throw new Error('El formulario de registro de socios no está activo.');
  if (!config.sheet_respuestas_id) throw new Error('No se ha configurado el Sheet ID de respuestas del formulario.');

  // Abrir el spreadsheet de respuestas
  let sheet;
  try {
    const ss = SpreadsheetApp.openById(config.sheet_respuestas_id);
    sheet = ss.getSheets()[0]; // Primera hoja (respuestas)
  } catch (e) {
    throw new Error('No se pudo abrir el Google Sheet de respuestas. Verifica el ID configurado.');
  }

  // Leer todas las respuestas (asumiendo headers en fila 1)
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return serializeForClient_({ ok: true, total: 0, imported: 0, errors: [], message: 'No hay respuestas en el formulario.' });
  }

  const headers = data[0];
  const rows = data.slice(1);

  // Mapeo dinámico de columnas por nombre de header
  // Buscar índices basados en los nombres de las preguntas del formulario
  const colMap = {};
  headers.forEach(function(header, index) {
    const headerLower = String(header || '').toLowerCase().trim();
    if (headerLower.indexOf('marca temporal') >= 0 || headerLower.indexOf('timestamp') >= 0) colMap.timestamp = index;
    if (headerLower.indexOf('direcci') >= 0 && headerLower.indexOf('correo') >= 0) colMap.email = index;
    if (headerLower.indexOf('grupo') >= 0 && headerLower.indexOf('vecinos') >= 0) colMap.grupo = index;
    if (headerLower.indexOf('rut') >= 0) colMap.rut = index;
    if (headerLower.indexOf('nombre completo') >= 0 || headerLower.indexOf('nombre y apellido') >= 0) colMap.nombre = index;
    if (headerLower.indexOf('edad') >= 0) colMap.edad = index;
    if (headerLower.indexOf('direcci') >= 0 && headerLower.indexOf('correo') < 0) colMap.direccion = index;
    if (headerLower.indexOf('email') >= 0 || headerLower.indexOf('electr') >= 0 || (headerLower.indexOf('correo') >= 0 && headerLower.indexOf('contacto') >= 0)) colMap.emailContacto = index;
    if (headerLower.indexOf('tel') >= 0 || headerLower.indexOf('celular') >= 0) colMap.telefono = index;
    if (headerLower.indexOf('cargo') >= 0) colMap.cargo = index;
    if (headerLower.indexOf('acepto') >= 0 || headerLower.indexOf('acepta') >= 0 || headerLower.indexOf('consentimiento') >= 0) colMap.acepta = index;
  });

  // Log para debug
  Logger.log('Headers detectados: ' + JSON.stringify(headers));
  Logger.log('Mapeo de columnas: ' + JSON.stringify(colMap));

  // Validar que existan las columnas críticas
  if (colMap.rut === undefined || colMap.nombre === undefined) {
    throw new Error('El formulario no tiene las columnas esperadas (RUT, Nombre). Verifica la estructura del Google Form.');
  }

  if (colMap.grupo === undefined) {
    throw new Error('No se encontró la columna "Grupo de vecinos" en el formulario. Headers detectados: ' + headers.join(', '));
  }

  const validRows = [];
  const errors = [];
  const now = new Date();

  // Obtener socios ya existentes (para evitar duplicados por RUT)
  const existingSocios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];
  const existingRUTs = new Set(existingSocios.map(s => String(s.run_socio || '').trim().toLowerCase()));

  // Mapear grupos de vecinos (solicitud_id → organizacion_id si existe)
  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  const grupoMap = {};
  casos.forEach(function(caso) {
    const nombreCompleto = String(caso.nombre_completo || '').trim();
    const sector = String(caso.sector || caso.uv || '').trim();
    const label = nombreCompleto + (sector ? ' - ' + sector : '');
    grupoMap[label] = {
      solicitud_id: String(caso.solicitud_id || '').trim(),
      organizacion_id: String(caso.organizacion_id || '').trim(),
      nombre_completo: nombreCompleto
    };
  });

  rows.forEach(function(row, idx) {
    const rowNum = idx + 2; // Fila en el sheet (1-indexed, +1 por header)

    const grupoLabel = String(row[colMap.grupo] || '').trim();
    const rut = String(row[colMap.rut] || '').trim();
    const nombre = String(row[colMap.nombre] || '').trim();
    const edad = String(row[colMap.edad] || '').trim();
    const direccion = String(row[colMap.direccion] || '').trim();
    const cargo = String(row[colMap.cargo] || '').trim();

    // Log de debug para primera fila
    if (idx === 0) {
      Logger.log('Primera fila - Valores: grupo=' + grupoLabel + ', rut=' + rut + ', nombre=' + nombre);
      Logger.log('Primera fila - Índices usados: colMap.grupo=' + colMap.grupo + ', valor en row[' + colMap.grupo + ']=' + row[colMap.grupo]);
    }

    // Validaciones básicas
    if (!grupoLabel) {
      errors.push({ index: rowNum, error: 'Grupo de vecinos vacío (columna índice: ' + colMap.grupo + ')', row: { rut, nombre } });
      return;
    }

    if (!rut) {
      errors.push({ index: rowNum, error: 'RUT vacío', row: { grupo: grupoLabel, nombre } });
      return;
    }

    if (!nombre) {
      errors.push({ index: rowNum, error: 'Nombre vacío', row: { grupo: grupoLabel, rut } });
      return;
    }

    // Verificar si el RUT ya existe
    const rutNorm = rut.toLowerCase();
    if (existingRUTs.has(rutNorm)) {
      errors.push({ index: rowNum, error: 'RUT ya registrado en el sistema', row: { grupo: grupoLabel, rut, nombre } });
      return;
    }

    // Buscar el grupo en el mapa
    const grupo = grupoMap[grupoLabel];
    if (!grupo) {
      errors.push({ index: rowNum, error: 'Grupo no encontrado en el sistema: ' + grupoLabel, row: { rut, nombre } });
      return;
    }

    // Si el grupo ya tiene organizacion_id, usar ese; si no, usar solicitud_id como temporal
    const organizacionId = grupo.organizacion_id || grupo.solicitud_id;

    if (!organizacionId) {
      errors.push({ index: rowNum, error: 'Grupo sin ID asignado', row: { grupo: grupoLabel, rut, nombre } });
      return;
    }

    validRows.push({
      timestamp: colMap.timestamp !== undefined ? row[colMap.timestamp] : new Date(),
      grupo_label: grupoLabel,
      organizacion_id: organizacionId,
      run_socio: rut,
      nombre_socio: nombre,
      edad: edad,
      direccion_socio: direccion,
      ubicacion_socio: '', // No viene en el form actual
      cargo: cargo,
      nombre_comite_origen: grupo.nombre_completo
    });
  });

  // Importar usando la función existente
  const rawRows = [];
  const factRows = [];

  validRows.forEach(function(row) {
    const socioId = nextId_('socio', 'SOC');

    rawRows.push({
      created_at: now,
      source: 'GOOGLE_FORM',
      user_email: user.email,
      organizacion_id: row.organizacion_id,
      run_socio: row.run_socio,
      numero_registro: '',
      nombre_socio: row.nombre_socio,
      edad: asNumberOrBlank_(row.edad),
      cargo: row.cargo,
      direccion_socio: row.direccion_socio,
      ubicacion_socio: row.ubicacion_socio,
      nombre_comite_origen: row.nombre_comite_origen,
      status_carga: errors.length ? 'PARCIAL' : 'OK'
    });

    factRows.push({
      socio_id: socioId,
      organizacion_id: row.organizacion_id,
      run_socio: row.run_socio,
      numero_registro: '',
      nombre_socio: row.nombre_socio,
      edad: asNumberOrBlank_(row.edad),
      cargo: row.cargo,
      direccion_socio: row.direccion_socio,
      ubicacion_socio: row.ubicacion_socio,
      nombre_comite_origen: row.nombre_comite_origen,
      status_carga: 'OK',
      updated_by: user.email,
      updated_at: now
    });
  });

  if (factRows.length > 0) {
    appendRowObjects_(GO_PES_V2.SHEETS.RAW_SOCIOS, rawRows);
    upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', factRows, false);

    const affectedOrgIds = uniqueNonBlank_(validRows.map(function(row) {
      return row.organizacion_id;
    }));
    const solicitudesByOrg = {};
    getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES).forEach(function(row) {
      const orgId = String(row.organizacion_id || '').trim();
      if (!orgId) return;
      solicitudesByOrg[orgId] = String(row.solicitud_id || '').trim();
    });

    refreshPartialArtifacts_({
      masterSolicitudIds: uniqueNonBlank_(affectedOrgIds.map(function(orgId) {
        return solicitudesByOrg[orgId] || '';
      })),
      vistaOrganizacionIds: affectedOrgIds
    });
  }

  logProcessing_('INFO', 'importarRespuestasFormSocios', 'socios', '', user.email, errors.length ? 'PARCIAL' : 'OK', {
    total: rows.length,
    validos: validRows.length,
    errores: errors.length
  });

  logUserAction_('IMPORT_FORM_SOCIOS', 'socios', '', errors.length ? 'PARCIAL' : 'OK', {
    total: rows.length,
    imported: validRows.length,
    errores: errors.length
  });

  const result = {
    ok: errors.length === 0,
    total: rows.length,
    imported: validRows.length,
    errors: errors,
    importedRows: serializeForClient_(factRows)
  };

  goPesDiagEnd_(diag, {
    ok: result.ok,
    imported: validRows.length,
    errors: errors.length
  });

  return serializeForClient_(result);
}
