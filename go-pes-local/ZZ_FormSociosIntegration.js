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
  const tz = Session.getScriptTimeZone();
  const cfg = getRuntimeSystemConfig_() || {};
  const addressSuffix = String((cfg.socios && cfg.socios.addressSuffix) || 'Providencia').trim();

  // Grupos de vecinos indexados por label NORMALIZADO (matching tolerante).
  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  const grupoMap = {};
  casos.forEach(function(caso) {
    const nombreCompleto = String(caso.nombre_completo || '').trim();
    const sector = String(caso.sector || caso.uv || '').trim();
    const label = nombreCompleto + (sector ? ' - ' + sector : '');
    grupoMap[normalizeText_(label)] = {
      solicitud_id: String(caso.solicitud_id || '').trim(),
      organizacion_id: String(caso.organizacion_id || '').trim(),
      nombre_completo: nombreCompleto
    };
  });

  // Socios existentes: idempotencia por socio_id + contador de N° Registro por solicitud.
  const existingSocios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];
  const existingIds = {};
  const nextRegBySol = {};
  existingSocios.forEach(function(s) {
    existingIds[String(s.socio_id || '').trim()] = true;
    const sol = String(s.solicitud_id || '').trim();
    const reg = Number(s.numero_registro || 0);
    if (sol && reg > 0) nextRegBySol[sol] = Math.max(nextRegBySol[sol] || 0, reg);
  });

  let pendientes = 0;

  rows.forEach(function(row, idx) {
    const rowNum = idx + 2;
    const rut = String(row[colMap.rut] || '').trim();
    const nombre = String(row[colMap.nombre] || '').trim();
    if (!rut && !nombre) return; // fila vacía → ignorar
    if (!rut) { errors.push({ index: rowNum, error: 'RUT vacío', row: { nombre } }); return; }
    if (!nombre) { errors.push({ index: rowNum, error: 'Nombre vacío', row: { rut } }); return; }

    const grupoLabelRaw = String(row[colMap.grupo] || '').trim();
    const fechaRegistro = colMap.timestamp !== undefined
      ? goPesSocioFechaIso_(row[colMap.timestamp], tz)
      : goPesSocioFechaIso_(now, tz);
    const edad = colMap.edad !== undefined ? String(row[colMap.edad] || '').trim() : '';
    const direccion = colMap.direccion !== undefined ? String(row[colMap.direccion] || '').trim() : '';
    const cargo = colMap.cargo !== undefined ? String(row[colMap.cargo] || '').trim() : '';
    const telefono = colMap.telefono !== undefined ? String(row[colMap.telefono] || '').trim() : '';
    const correo = colMap.emailContacto !== undefined ? String(row[colMap.emailContacto] || '').trim() : '';
    const consentimiento = colMap.acepta !== undefined ? String(row[colMap.acepta] || '').trim() : '';

    // Identidad de MEMBRESÍA = RUT + fecha_registro (idéntica a la reconstrucción) → idempotente.
    const runNorm = normalizeText_(rut);
    const socioId = runNorm ? deterministicId_('SOC', [runNorm, fechaRegistro]) : nextId_('socio', 'SOC');
    if (existingIds[socioId]) return; // ya importado (o duplicado en el lote)
    existingIds[socioId] = true;

    // Matching tolerante: si no calza el grupo, NO se pierde → queda 'pendiente'.
    const grupo = grupoLabelRaw ? grupoMap[normalizeText_(grupoLabelRaw)] : null;
    let solicitudId = '', organizacionId = '', vinculoEstado = 'pendiente', nombreComite = '', numeroRegistro = '';
    if (grupo && grupo.solicitud_id) {
      solicitudId = grupo.solicitud_id;
      organizacionId = grupo.organizacion_id || ''; // heredado solo si el grupo ya está constituido
      nombreComite = grupo.nombre_completo;
      vinculoEstado = 'auto';
      const nextReg = (nextRegBySol[solicitudId] || 0) + 1;
      nextRegBySol[solicitudId] = nextReg;
      numeroRegistro = String(nextReg);
    } else {
      pendientes++;
    }

    const ubicacion = direccion ? (direccion + (addressSuffix ? ', ' + addressSuffix : '')) : '';

    validRows.push({
      socio_id: socioId,
      solicitud_id: solicitudId,
      organizacion_id: organizacionId,
      run_socio: rut,
      numero_registro: numeroRegistro,
      nombre_socio: nombre,
      edad: asNumberOrBlank_(edad),
      cargo: cargo,
      direccion_socio: direccion,
      ubicacion_socio: ubicacion,
      nombre_comite_origen: nombreComite,
      telefono_socio: telefono,
      correo_socio: correo,
      consentimiento: consentimiento,
      fecha_registro: fechaRegistro,
      grupo_label_origen: grupoLabelRaw,
      vinculo_estado: vinculoEstado
    });
  });

  // Escribir RAW (log) + FACT (upsert idempotente por socio_id).
  const rawRows = validRows.map(function(row) {
    return {
      created_at: now,
      source: 'GOOGLE_FORM',
      user_email: user.email,
      organizacion_id: row.organizacion_id,
      run_socio: row.run_socio,
      numero_registro: row.numero_registro,
      nombre_socio: row.nombre_socio,
      edad: row.edad,
      cargo: row.cargo,
      direccion_socio: row.direccion_socio,
      ubicacion_socio: row.ubicacion_socio,
      nombre_comite_origen: row.nombre_comite_origen,
      status_carga: 'OK',
      legacy_source: '',
      legacy_key: '',
      solicitud_id: row.solicitud_id,
      grupo_label_origen: row.grupo_label_origen,
      telefono_socio: row.telefono_socio,
      correo_socio: row.correo_socio,
      consentimiento: row.consentimiento,
      fecha_registro: row.fecha_registro,
      vinculo_estado: row.vinculo_estado
    };
  });
  const factRows = validRows.map(function(row) {
    return {
      socio_id: row.socio_id,
      organizacion_id: row.organizacion_id,
      run_socio: row.run_socio,
      numero_registro: row.numero_registro,
      nombre_socio: row.nombre_socio,
      edad: row.edad,
      cargo: row.cargo,
      direccion_socio: row.direccion_socio,
      ubicacion_socio: row.ubicacion_socio,
      nombre_comite_origen: row.nombre_comite_origen,
      status_carga: 'OK',
      updated_by: user.email,
      updated_at: now,
      solicitud_id: row.solicitud_id,
      telefono_socio: row.telefono_socio,
      correo_socio: row.correo_socio,
      consentimiento: row.consentimiento,
      fecha_registro: row.fecha_registro,
      vinculo_estado: row.vinculo_estado,
      grupo_label_origen: row.grupo_label_origen
    };
  });

  if (factRows.length > 0) {
    appendRowObjects_(GO_PES_V2.SHEETS.RAW_SOCIOS, rawRows);
    upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', factRows, false);

    // Refrescar artefactos solo de las orgs afectadas (las que heredaron organizacion_id).
    const affectedOrgIds = uniqueNonBlank_(validRows.map(function(row) { return row.organizacion_id; }));
    if (affectedOrgIds.length) {
      const solicitudesByOrg = {};
      getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES).forEach(function(row) {
        const orgId = String(row.organizacion_id || '').trim();
        if (orgId) solicitudesByOrg[orgId] = String(row.solicitud_id || '').trim();
      });
      refreshPartialArtifacts_({
        masterSolicitudIds: uniqueNonBlank_(affectedOrgIds.map(function(orgId) { return solicitudesByOrg[orgId] || ''; })),
        vistaOrganizacionIds: affectedOrgIds
      });
    }
  }

  logProcessing_('INFO', 'importarRespuestasFormSocios', 'socios', '', user.email, errors.length ? 'PARCIAL' : 'OK', {
    total: rows.length, importados: validRows.length, pendientes: pendientes, errores: errors.length
  });
  logUserAction_('IMPORT_FORM_SOCIOS', 'socios', '', errors.length ? 'PARCIAL' : 'OK', {
    total: rows.length, imported: validRows.length, pendientes: pendientes, errores: errors.length
  });

  const result = {
    ok: errors.length === 0,
    total: rows.length,
    imported: validRows.length,
    pendientes: pendientes,
    errors: errors,
    importedRows: serializeForClient_(factRows)
  };

  goPesDiagEnd_(diag, { ok: result.ok, imported: validRows.length, pendientes: pendientes, errors: errors.length });
  return serializeForClient_(result);
}

/**
 * Normaliza una marca temporal a string ISO estable (yyyy-MM-ddTHH:mm:ss), para que el
 * socio_id determinístico (RUT + fecha_registro) sea idéntico en import y en reconstrucción.
 */
function goPesSocioFechaIso_(value, tz) {
  if (!value) return '';
  var d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value).trim();
  return Utilities.formatDate(d, tz || Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}
