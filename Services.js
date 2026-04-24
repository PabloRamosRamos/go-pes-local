/**
 * Servicios de aplicación y operaciones del dominio GO-PES.
 * Esta capa orquesta validación, persistencia y refresco de vistas derivadas.
 */
function buscarVecino(query) {
  const diag = goPesDiagStart_('Services.buscarVecino', {
    query_length: String(query || '').trim().length
  });
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);

  const term = normalizeText_(query || '');

  const caseRows = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);
  const orgRows = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);

  const orgBySolicitud = {};
  orgRows.forEach(function(r) {
    const key = String(r.solicitud_id || '').trim();
    if (key && !orgBySolicitud[key]) orgBySolicitud[key] = r;
  });

  let rows = caseRows.map(function(r) {
    const key = String(r.solicitud_id || '').trim();
    const org = orgBySolicitud[key] || {};

    return Object.assign({}, r, {
      organizacion_id: r.organizacion_id || org.organizacion_id || '',
      nombre_organizacion: org.nombre_organizacion || '',
      estado_constitucion: org.estado_constitucion || '',
      estado_general_organizacion: org.estado_general_organizacion || '',
      responsable_actual: org.responsable_actual || r.responsable_actual || ''
    });
  });

  if (term) {
    rows = rows.filter(function(r) {
      const haystack = [
        r.nombre_completo,
        r.nombre_vecino,
        r.apellido_vecino,
        r.telefono_contacto,
        r.correo_contacto,
        r.direccion_original,
        r.solicitud_id,
        r.organizacion_id,
        r.nombre_organizacion
      ].map(normalizeText_).join(' | ');

      return haystack.includes(term);
    });
  }

  const result = rows.slice(0, 50).map(function(r) {
    return {
      solicitud_id: String(r.solicitud_id || ''),
      organizacion_id: String(r.organizacion_id || ''),
      nombre_completo: String(
        r.nombre_completo ||
        buildFullName_(r.nombre_vecino, r.apellido_vecino) ||
        ''
      ),
      direccion_original: String(r.direccion_original || ''),
      estado_actual: String(r.estado_actual || ''),
      nombre_organizacion: String(r.nombre_organizacion || ''),
      telefono_contacto: String(r.telefono_contacto || ''),
      correo_contacto: String(r.correo_contacto || ''),
      uv: String(r.uv || ''),
      sector: String(r.sector || '')
    };
  });

  goPesDiagEnd_(diag, {
    result_count: result.length
  });
  return result;
}

function buscarSolicitud(query) {
  return buscarVecino(query);
}

function buscarOrganizacion(query) {
  const term = normalizeText_(query || '');
  const rows = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);
  if (!term) return rows.slice(0, 25);
  return rows.filter(r => [r.organizacion_id, r.nombre_organizacion, r.uv, r.sector].map(normalizeText_).join(' | ').includes(term)).slice(0, 50);
}

function obtenerFicha(payload) {
  const diag = goPesDiagStart_('Services.obtenerFicha', payload || {});
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);

  const solicitudId = payload && payload.solicitud_id ? String(payload.solicitud_id) : '';
  const organizacionId = payload && payload.organizacion_id ? String(payload.organizacion_id) : '';

  let caseRow = solicitudId
    ? findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false)
    : null;

  let orgRow = organizacionId
    ? findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false)
    : null;

  if (!caseRow && orgRow && orgRow.solicitud_id) {
    caseRow = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', orgRow.solicitud_id, false);
  }
  if ((!caseRow && !orgRow) && payload && payload.query) {
    const match = buscarVecino(payload.query)[0] || null;
    if (match && match.solicitud_id) {
      caseRow = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', match.solicitud_id, false);
    }
    if (!orgRow && match && match.organizacion_id) {
      orgRow = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', match.organizacion_id, false);
    }
  }

  if (!orgRow && caseRow && caseRow.organizacion_id) {
    orgRow = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', caseRow.organizacion_id, false);
  }
  if (!caseRow && !orgRow) {
    throw new Error('No se encontrÃ³ la ficha solicitada.');
  }
  const finalSolicitudId = String(
    (caseRow && caseRow.solicitud_id) ||
    (orgRow && orgRow.solicitud_id) ||
    solicitudId ||
    ''
  );
  const finalOrgId = String(
    (orgRow && orgRow.organizacion_id) ||
    (caseRow && caseRow.organizacion_id) ||
    organizacionId ||
    ''
  );
  /* legacy block removed
  const _legacyCaseRow =
    (solicitudId
      ? findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false)
      : null) ||
    (base && base.solicitud_id
      ? findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', base.solicitud_id, false)
      : null) ||
    null;

  const orgIdFromBase = base && base.organizacion_id ? String(base.organizacion_id) : '';
  const orgIdFromCase = caseRow && caseRow.organizacion_id ? String(caseRow.organizacion_id) : '';
  const finalOrgId = orgIdFromBase || orgIdFromCase || organizacionId || '';

  if (!base && !caseRow) {
    throw new Error('No se encontró la ficha solicitada.');
  

  const orgRow = finalOrgId
    ? findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', finalOrgId, false)
    : null;

  const finalSolicitudId =
    (base && base.solicitud_id) ||
    (caseRow && caseRow.solicitud_id) ||
    solicitudId ||
    '';

  */

  const hitos = finalSolicitudId
    ? filterByField_(GO_PES_V2.SHEETS.FACT_HITOS, 'solicitud_id', finalSolicitudId, false)
        .sort((a, b) => new Date(b.fecha_gestion || 0) - new Date(a.fecha_gestion || 0))
    : [];

  const instrumentos = finalOrgId
    ? filterByField_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'organizacion_id', finalOrgId, false)
    : [];

  const requisitos = finalOrgId
    ? filterByField_(GO_PES_V2.SHEETS.FACT_REQUISITOS, 'organizacion_id', finalOrgId, false)
    : [];

  const socios = finalOrgId
    ? filterByField_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'organizacion_id', finalOrgId, false)
    : [];

  const acciones = getSheetData_(GO_PES_V2.SHEETS.LOG_ACCIONES)
    .filter(r =>
      String(r.entity_id || '') === String(finalSolicitudId) ||
      String(r.entity_id || '') === String(finalOrgId || '')
    )
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  const lastAction = acciones[0] || {};
  const summary = Object.assign({}, caseRow || {}, orgRow || {}, {
    solicitud_id: finalSolicitudId,
    organizacion_id: finalOrgId,
    nombre_organizacion: String(orgRow && orgRow.nombre_organizacion || ''),
    estado_constitucion: String(orgRow && orgRow.estado_constitucion || ''),
    estado_general_organizacion: String(orgRow && orgRow.estado_general_organizacion || ''),
    responsable_actual: String(
      (orgRow && orgRow.responsable_actual) ||
      (caseRow && caseRow.responsable_actual) ||
      ''
    ),
    ultimo_usuario: String(lastAction.email || ''),
    ultima_actualizacion: lastAction.timestamp || (caseRow && caseRow.updated_at) || (orgRow && orgRow.updated_at) || ''
  });

  const result = toClientSafe_({
    summary: summary,
    vecino: caseRow || {},
    organizacion: orgRow,
    hitos: hitos.slice(0, 25),
    instrumentos: instrumentos,
    requisitos: requisitos,
    socios: socios,
    trazabilidad: acciones.slice(0, 25)
  });

  goPesDiagEnd_(diag, {
    found: !!(result && result.summary)
  });
  return result;
}

function guardarIngreso(payload) {
  const diag = goPesDiagStart_('Services.guardarIngreso', {});
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    const user = requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
    ensureSheetsSubset_([GO_PES_V2.SHEETS.RAW_INGRESO, GO_PES_V2.SHEETS.MAE_CASOS]);

    payload = payload || {};

    const clean = {
      vecino_id: String(payload.vecino_id || '').trim(),
      solicitud_id: String(payload.solicitud_id || '').trim(),
      organizacion_id: String(payload.organizacion_id || '').trim(),
      nombre_vecino: String(payload.nombre_vecino || '').trim(),
      apellido_vecino: String(payload.apellido_vecino || '').trim(),
      rut_vecino: String(payload.rut_vecino || '').trim(),
      telefono_contacto: String(payload.telefono_contacto || '').trim(),
      correo_contacto: String(payload.correo_contacto || '').trim(),
      direccion_original: String(payload.direccion_original || '').trim(),
      uv: String(payload.uv || '').trim(),
      sector: String(payload.sector || '').trim(),
      tipo_vivienda: String(payload.tipo_vivienda || '').trim(),
      requerimiento_inicial: String(payload.requerimiento_inicial || '').trim(),
      medio_solicitud: String(payload.medio_solicitud || '').trim(),
      unidad_origen: String(payload.unidad_origen || '').trim(),
      observaciones_form: String(payload.observaciones_form || '').trim(),
      fecha_solicitud: asDateOrBlank_(payload.fecha_solicitud)
    };

    validateIngresoV2_(clean);

    const vecinoId = clean.vecino_id || nextId_('vecino', 'VEC');
    const solicitudId = clean.solicitud_id || nextId_('solicitud', 'SOL');
    const now = new Date();
    const fechaSolicitud = clean.fecha_solicitud || now;
    const responsableActual = user.nombre_visible || user.email || '';

    appendRowObject_(GO_PES_V2.SHEETS.RAW_INGRESO, {
      created_at: now,
      source: 'WEB_APP',
      user_email: user.email || '',
      vecino_id: vecinoId,
      solicitud_id: solicitudId,
      nombre_vecino: clean.nombre_vecino,
      apellido_vecino: clean.apellido_vecino,
      rut_vecino: clean.rut_vecino,
      telefono_contacto: clean.telefono_contacto,
      correo_contacto: clean.correo_contacto,
      direccion_original: clean.direccion_original,
      uv: clean.uv,
      sector: clean.sector,
      tipo_vivienda: clean.tipo_vivienda,
      requerimiento_inicial: clean.requerimiento_inicial,
      medio_solicitud: clean.medio_solicitud,
      unidad_origen: clean.unidad_origen,
      fecha_solicitud: fechaSolicitud,
      observaciones_form: clean.observaciones_form,
      estado_vecino: 'Nuevo ingreso',
      legacy_source: '',
      legacy_key: ''
    });

    upsertByKey_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', {
      solicitud_id: solicitudId,
      vecino_id: vecinoId,
      nombre_vecino: clean.nombre_vecino,
      apellido_vecino: clean.apellido_vecino,
      nombre_completo: buildFullName_(clean.nombre_vecino, clean.apellido_vecino),
      rut_vecino: clean.rut_vecino,
      telefono_contacto: clean.telefono_contacto,
      correo_contacto: clean.correo_contacto,
      direccion_original: clean.direccion_original,
      uv: clean.uv,
      sector: clean.sector,
      tipo_vivienda: clean.tipo_vivienda,
      requerimiento_inicial: clean.requerimiento_inicial,
      medio_solicitud: clean.medio_solicitud,
      unidad_origen: clean.unidad_origen,
      fecha_ingreso: fechaSolicitud,
      estado_actual: 'Nuevo ingreso',
      etapa_actual: 'Ingreso recibido',
      organizacion_id: clean.organizacion_id,
      ultima_gestion: now,
      proximo_hito: 'Pendiente de contacto',
      responsable_actual: responsableActual,
      observacion_resumen: clean.observaciones_form,
      updated_at: now
    });

    logProcessing_('INFO', 'guardarIngreso', 'solicitud', solicitudId, user.email || '', 'OK', clean);
    logUserAction_('CREATE_INGRESO', 'solicitud', solicitudId, 'OK', clean);

    refreshPartialArtifacts_({
      masterSolicitudIds: [solicitudId],
      vistaTerritorialPairs: [{ uv: clean.uv, sector: clean.sector }],
      sugerenciaSolicitudIds: [solicitudId]
    });
    refreshDerivedArtifacts_({
      master: true,
      vistaTerritorial: true,
      sugerencias: true
    });

    const result = {
      ok: true,
      solicitud_id: solicitudId,
      vecino_id: vecinoId,
      message: 'Solicitud guardada correctamente.'
    };
    goPesDiagEnd_(diag, {
      ok: true,
      solicitud_id: solicitudId
    });
    return result;
  } finally {
    lock.releaseLock();
  }
}

function guardarSeguimiento(payload) {
  const user = requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  validateSeguimientoV2_(payload);
  const now = new Date();
  const hitoId = payload.hito_id || nextId_('hito', 'HIT');

  appendRowObject_(GO_PES_V2.SHEETS.RAW_SEGUIMIENTO, {
    created_at: now,
    source: 'WEB_APP',
    user_email: user.email,
    solicitud_id: payload.solicitud_id,
    organizacion_id: payload.organizacion_id || '',
    vecino_id: payload.vecino_id || '',
    fecha_gestion: asDateOrBlank_(payload.fecha_gestion) || now,
    responsable_gestion: payload.responsable_gestion,
    territorial_responsable: payload.territorial_responsable || '',
    flujo: payload.flujo,
    hito: payload.hito,
    estado_hito: payload.estado_hito,
    detalle_gestion: payload.detalle_gestion,
    resultado_hito: payload.resultado_hito || '',
    fecha_vencimiento: asDateOrBlank_(payload.fecha_vencimiento),
    proximo_hito_sugerido: payload.proximo_hito_sugerido || '',
    proxima_accion_descripcion: payload.proxima_accion_descripcion || '',
    documento_respaldo_url: payload.documento_respaldo_url || ''
  });

  upsertByKey_(GO_PES_V2.SHEETS.FACT_HITOS, 'hito_id', {
    hito_id: hitoId,
    solicitud_id: payload.solicitud_id,
    organizacion_id: payload.organizacion_id || '',
    vecino_id: payload.vecino_id || '',
    fecha_gestion: asDateOrBlank_(payload.fecha_gestion) || now,
    responsable_gestion: payload.responsable_gestion,
    territorial_responsable: payload.territorial_responsable || '',
    flujo: payload.flujo,
    hito: payload.hito,
    estado_hito: payload.estado_hito,
    detalle_gestion: payload.detalle_gestion,
    resultado_hito: payload.resultado_hito || '',
    fecha_vencimiento: asDateOrBlank_(payload.fecha_vencimiento),
    proximo_hito_sugerido: payload.proximo_hito_sugerido || '',
    proxima_accion_descripcion: payload.proxima_accion_descripcion || '',
    documento_respaldo_url: payload.documento_respaldo_url || '',
    updated_by: user.email,
    updated_at: now
  });

  patchCaseSummary_(payload.solicitud_id, {
    estado_actual: payload.estado_hito,
    etapa_actual: payload.hito,
    ultima_gestion: asDateOrBlank_(payload.fecha_gestion) || now,
    proximo_hito: payload.proximo_hito_sugerido || '',
    responsable_actual: payload.responsable_gestion,
    observacion_resumen: payload.detalle_gestion,
    organizacion_id: payload.organizacion_id || undefined
  });

  maybeCallMaker_('recalcularFicha', { solicitud_id: payload.solicitud_id, organizacion_id: payload.organizacion_id || '' });
  refreshDerivedArtifacts_({
    master: true,
    sugerencias: true
  });
  refreshDerivedArtifacts_({
    master: true,
    sugerencias: true
  });
  logProcessing_('INFO', 'guardarSeguimiento', 'seguimiento', hitoId, user.email, 'OK', payload);
  logUserAction_('CREATE_SEGUIMIENTO', 'seguimiento', hitoId, 'OK', payload);
  return { ok: true, hito_id: hitoId };
}

function guardarOrganizacion(payload) {
  const diag = goPesDiagStart_('Services.guardarOrganizacion', {});
  const user = requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  validateOrganizacionV2_(payload);
  const now = new Date();
  const organizacionId = payload.organizacion_id || nextId_('organizacion', 'ORG');
  const existingOrg = payload.organizacion_id
    ? findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', payload.organizacion_id, false)
    : null;

  appendRowObject_(GO_PES_V2.SHEETS.RAW_ORGANIZACIONES, {
    created_at: now,
    source: 'WEB_APP',
    user_email: user.email,
    solicitud_id: payload.solicitud_id || '',
    organizacion_id: organizacionId,
    tipo_organizacion: payload.tipo_organizacion,
    nombre_organizacion: payload.nombre_organizacion,
    uv: payload.uv || '',
    sector: payload.sector || '',
    direccion_referencia: payload.direccion_referencia || '',
    fecha_inicio_acompanamiento: asDateOrBlank_(payload.fecha_inicio_acompanamiento) || now,
    cantidad_socios_declarada: asNumberOrBlank_(payload.cantidad_socios_declarada),
    estado_constitucion: payload.estado_constitucion || '',
    fecha_asamblea_constitucion: asDateOrBlank_(payload.fecha_asamblea_constitucion),
    fecha_ratificacion: asDateOrBlank_(payload.fecha_ratificacion),
    vigencia_directiva_hasta: asDateOrBlank_(payload.vigencia_directiva_hasta),
    personalidad_juridica_flag: toSiNo_(payload.personalidad_juridica_flag),
    certificado_provisorio_flag: toSiNo_(payload.certificado_provisorio_flag),
    certificado_definitivo_flag: toSiNo_(payload.certificado_definitivo_flag),
    directiva_vigente_flag: toSiNo_(payload.directiva_vigente_flag),
    organizacion_constituida_flag: toSiNo_(payload.organizacion_constituida_flag),
    estado_general_organizacion: payload.estado_general_organizacion || '',
    responsable_actual: payload.responsable_actual || user.nombre_visible,
    observacion_resumen: payload.observacion_resumen || ''
  });

  upsertByKey_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', {
    organizacion_id: organizacionId,
    solicitud_id: payload.solicitud_id || '',
    tipo_organizacion: payload.tipo_organizacion,
    nombre_organizacion: payload.nombre_organizacion,
    uv: payload.uv || '',
    sector: payload.sector || '',
    direccion_referencia: payload.direccion_referencia || '',
    fecha_inicio_acompanamiento: asDateOrBlank_(payload.fecha_inicio_acompanamiento) || now,
    cantidad_socios_declarada: asNumberOrBlank_(payload.cantidad_socios_declarada),
    estado_constitucion: payload.estado_constitucion || '',
    fecha_asamblea_constitucion: asDateOrBlank_(payload.fecha_asamblea_constitucion),
    fecha_ratificacion: asDateOrBlank_(payload.fecha_ratificacion),
    vigencia_directiva_hasta: asDateOrBlank_(payload.vigencia_directiva_hasta),
    personalidad_juridica_flag: toSiNo_(payload.personalidad_juridica_flag),
    certificado_provisorio_flag: toSiNo_(payload.certificado_provisorio_flag),
    certificado_definitivo_flag: toSiNo_(payload.certificado_definitivo_flag),
    directiva_vigente_flag: toSiNo_(payload.directiva_vigente_flag),
    organizacion_constituida_flag: toSiNo_(payload.organizacion_constituida_flag),
    estado_general_organizacion: payload.estado_general_organizacion || '',
    responsable_actual: payload.responsable_actual || user.nombre_visible,
    observacion_resumen: payload.observacion_resumen || '',
    updated_at: now
  });

  if (payload.solicitud_id) {
    patchCaseSummary_(payload.solicitud_id, {
      organizacion_id: organizacionId,
      estado_actual: payload.estado_general_organizacion || 'Avanza a organización',
      etapa_actual: payload.estado_constitucion || '',
      responsable_actual: payload.responsable_actual || user.nombre_visible,
      observacion_resumen: payload.observacion_resumen || ''
    });
  }

  maybeCallMaker_('recalcularFicha', { solicitud_id: payload.solicitud_id || '', organizacion_id: organizacionId });
  refreshPartialArtifacts_({
    masterSolicitudIds: uniqueNonBlank_([payload.solicitud_id, existingOrg && existingOrg.solicitud_id]),
    vistaOrganizacionIds: [organizacionId],
    vistaTerritorialPairs: [
      { uv: payload.uv || '', sector: payload.sector || '' },
      { uv: existingOrg && existingOrg.uv || '', sector: existingOrg && existingOrg.sector || '' }
    ],
    sugerenciaSolicitudIds: uniqueNonBlank_([payload.solicitud_id, existingOrg && existingOrg.solicitud_id]),
    sugerenciaOrganizacionIds: [organizacionId],
    territorioCatalogPairs: [
      { uv: payload.uv || '', sector: payload.sector || '' },
      { uv: existingOrg && existingOrg.uv || '', sector: existingOrg && existingOrg.sector || '' }
    ],
    responsables: [payload.responsable_actual || user.nombre_visible]
  });
  refreshDerivedArtifacts_({
    master: true,
    vistaOrganizaciones: true,
    vistaTerritorial: true,
    sugerencias: true,
    territorioCatalogo: true,
    responsablesCatalogo: true
  });
  logProcessing_('INFO', 'guardarOrganizacion', 'organizacion', organizacionId, user.email, 'OK', payload);
  logUserAction_('UPSERT_ORGANIZACION', 'organizacion', organizacionId, 'OK', payload);
  const result = { ok: true, organizacion_id: organizacionId };
  goPesDiagEnd_(diag, {
    ok: true,
    organizacion_id: organizacionId
  });
  return result;
}

function guardarInstrumento(payload) {
  const user = requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  validateInstrumentoV2_(payload);
  const now = new Date();
  const orgInstrumentoId = payload.org_instrumento_id || nextId_('instrumento', 'OIN');

  appendRowObject_(GO_PES_V2.SHEETS.RAW_INSTRUMENTOS, {
    created_at: now,
    source: 'WEB_APP',
    user_email: user.email,
    organizacion_id: payload.organizacion_id,
    org_instrumento_id: orgInstrumentoId,
    instrumento_codigo_catalogo: payload.instrumento_codigo_catalogo,
    instrumento_nombre_otro: payload.instrumento_nombre_otro || '',
    instrumento_tipo: payload.instrumento_tipo,
    origen_instrumento: payload.origen_instrumento,
    anio_convocatoria: payload.anio_convocatoria,
    nombre_convocatoria: payload.nombre_convocatoria || '',
    numero_llamado: payload.numero_llamado || '',
    fecha_inicio_gestion: asDateOrBlank_(payload.fecha_inicio_gestion) || now,
    fecha_apertura: asDateOrBlank_(payload.fecha_apertura),
    fecha_cierre: asDateOrBlank_(payload.fecha_cierre),
    fecha_habilitacion: asDateOrBlank_(payload.fecha_habilitacion),
    fecha_postulacion: asDateOrBlank_(payload.fecha_postulacion),
    fecha_resultado: asDateOrBlank_(payload.fecha_resultado),
    fecha_cierre_instrumento: asDateOrBlank_(payload.fecha_cierre_instrumento),
    estado_instrumento: payload.estado_instrumento,
    subestado_instrumento: payload.subestado_instrumento || '',
    avance_instrumento_pct: asNumberOrBlank_(payload.avance_instrumento_pct),
    proximo_hito_instrumento: payload.proximo_hito_instrumento || '',
    resultado_instrumento: payload.resultado_instrumento || '',
    monto_solicitado: asNumberOrBlank_(payload.monto_solicitado),
    monto_adjudicado: asNumberOrBlank_(payload.monto_adjudicado),
    monto_ejecutado: asNumberOrBlank_(payload.monto_ejecutado),
    responsable_instrumento: payload.responsable_instrumento || user.nombre_visible,
    contraparte: payload.contraparte || '',
    observacion_instrumento: payload.observacion_instrumento || '',
    documento_respaldo_url: payload.documento_respaldo_url || ''
  });

  upsertByKey_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'org_instrumento_id', {
    org_instrumento_id: orgInstrumentoId,
    organizacion_id: payload.organizacion_id,
    instrumento_codigo_catalogo: payload.instrumento_codigo_catalogo,
    instrumento_nombre_otro: payload.instrumento_nombre_otro || '',
    instrumento_tipo: payload.instrumento_tipo,
    origen_instrumento: payload.origen_instrumento,
    anio_convocatoria: payload.anio_convocatoria,
    nombre_convocatoria: payload.nombre_convocatoria || '',
    numero_llamado: payload.numero_llamado || '',
    fecha_inicio_gestion: asDateOrBlank_(payload.fecha_inicio_gestion) || now,
    fecha_apertura: asDateOrBlank_(payload.fecha_apertura),
    fecha_cierre: asDateOrBlank_(payload.fecha_cierre),
    fecha_habilitacion: asDateOrBlank_(payload.fecha_habilitacion),
    fecha_postulacion: asDateOrBlank_(payload.fecha_postulacion),
    fecha_resultado: asDateOrBlank_(payload.fecha_resultado),
    fecha_cierre_instrumento: asDateOrBlank_(payload.fecha_cierre_instrumento),
    estado_instrumento: payload.estado_instrumento,
    subestado_instrumento: payload.subestado_instrumento || '',
    avance_instrumento_pct: asNumberOrBlank_(payload.avance_instrumento_pct),
    proximo_hito_instrumento: payload.proximo_hito_instrumento || '',
    resultado_instrumento: payload.resultado_instrumento || '',
    monto_solicitado: asNumberOrBlank_(payload.monto_solicitado),
    monto_adjudicado: asNumberOrBlank_(payload.monto_adjudicado),
    monto_ejecutado: asNumberOrBlank_(payload.monto_ejecutado),
    responsable_instrumento: payload.responsable_instrumento || user.nombre_visible,
    contraparte: payload.contraparte || '',
    observacion_instrumento: payload.observacion_instrumento || '',
    documento_respaldo_url: payload.documento_respaldo_url || '',
    updated_by: user.email,
    updated_at: now
  });

  refreshDerivedArtifacts_({
    master: true,
    vistaOrganizaciones: true,
    vistaInstrumentos: true,
    vistaTerritorial: true
  });
  refreshDerivedArtifacts_({
    master: true,
    vistaOrganizaciones: true,
    vistaInstrumentos: true,
    vistaTerritorial: true
  });
  logProcessing_('INFO', 'guardarInstrumento', 'instrumento', orgInstrumentoId, user.email, 'OK', payload);
  logUserAction_('UPSERT_INSTRUMENTO', 'instrumento', orgInstrumentoId, 'OK', payload);
  return { ok: true, org_instrumento_id: orgInstrumentoId };
}

function guardarRequisito(payload) {
  const user = requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  validateRequisitoV2_(payload);
  const now = new Date();
  const registroId = payload.requisito_registro_id || nextId_('requisito', 'REQ');

  appendRowObject_(GO_PES_V2.SHEETS.RAW_REQUISITOS, {
    created_at: now,
    source: 'WEB_APP',
    user_email: user.email,
    organizacion_id: payload.organizacion_id,
    org_instrumento_id: payload.org_instrumento_id,
    requisito_registro_id: registroId,
    instrumento_codigo_catalogo: payload.instrumento_codigo_catalogo,
    requisito_codigo: payload.requisito_codigo,
    requisito_nombre_libre: payload.requisito_nombre_libre || '',
    categoria_requisito: payload.categoria_requisito,
    estado_requisito: payload.estado_requisito,
    fecha_solicitud: asDateOrBlank_(payload.fecha_solicitud),
    fecha_cumplimiento: asDateOrBlank_(payload.fecha_cumplimiento),
    fecha_vencimiento: asDateOrBlank_(payload.fecha_vencimiento),
    responsable_requisito: payload.responsable_requisito || user.nombre_visible,
    documento_respaldo_url: payload.documento_respaldo_url || '',
    observacion_requisito: payload.observacion_requisito || '',
    vigente_flag: toSiNo_(payload.vigente_flag)
  });

  upsertByKey_(GO_PES_V2.SHEETS.FACT_REQUISITOS, 'requisito_registro_id', {
    requisito_registro_id: registroId,
    organizacion_id: payload.organizacion_id,
    org_instrumento_id: payload.org_instrumento_id,
    instrumento_codigo_catalogo: payload.instrumento_codigo_catalogo,
    requisito_codigo: payload.requisito_codigo,
    requisito_nombre_libre: payload.requisito_nombre_libre || '',
    categoria_requisito: payload.categoria_requisito,
    estado_requisito: payload.estado_requisito,
    fecha_solicitud: asDateOrBlank_(payload.fecha_solicitud),
    fecha_cumplimiento: asDateOrBlank_(payload.fecha_cumplimiento),
    fecha_vencimiento: asDateOrBlank_(payload.fecha_vencimiento),
    responsable_requisito: payload.responsable_requisito || user.nombre_visible,
    documento_respaldo_url: payload.documento_respaldo_url || '',
    observacion_requisito: payload.observacion_requisito || '',
    vigente_flag: toSiNo_(payload.vigente_flag),
    updated_by: user.email,
    updated_at: now
  });

  refreshDerivedArtifacts_({
    master: true
  });
  refreshDerivedArtifacts_({
    master: true
  });
  logProcessing_('INFO', 'guardarRequisito', 'requisito', registroId, user.email, 'OK', payload);
  logUserAction_('UPSERT_REQUISITO', 'requisito', registroId, 'OK', payload);
  return { ok: true, requisito_registro_id: registroId };
}

function importarSocios(payload) {
  const diag = goPesDiagStart_('Services.importarSocios', {
    rows_input: payload && Array.isArray(payload.rows) ? payload.rows.length : 0
  });
  const user = requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
  const validRows = [];
  const errors = [];
  const now = new Date();

  rows.forEach((row, idx) => {
    const check = validateSocioRowV2_(row);
    if (!check.ok) {
      errors.push({ index: idx + 1, error: check.error, row: row });
      return;
    }
    validRows.push(row);
  });

  const rawRows = [];
  const factRows = [];

  validRows.forEach(function(row) {
    const socioId = row.socio_id || nextId_('socio', 'SOC');

    rawRows.push({
      created_at: now,
      source: 'WEB_APP',
      user_email: user.email,
      organizacion_id: row.organizacion_id,
      run_socio: row.run_socio || '',
      numero_registro: row.numero_registro || '',
      nombre_socio: row.nombre_socio,
      edad: asNumberOrBlank_(row.edad),
      cargo: row.cargo || '',
      direccion_socio: row.direccion_socio || '',
      ubicacion_socio: row.ubicacion_socio || '',
      nombre_comite_origen: row.nombre_comite_origen || '',
      status_carga: errors.length ? 'PARCIAL' : 'OK'
    });

    factRows.push({
      socio_id: socioId,
      organizacion_id: row.organizacion_id,
      run_socio: row.run_socio || '',
      numero_registro: row.numero_registro || '',
      nombre_socio: row.nombre_socio,
      edad: asNumberOrBlank_(row.edad),
      cargo: row.cargo || '',
      direccion_socio: row.direccion_socio || '',
      ubicacion_socio: row.ubicacion_socio || '',
      nombre_comite_origen: row.nombre_comite_origen || '',
      status_carga: 'OK',
      updated_by: user.email,
      updated_at: now
    });
  });

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
  refreshDerivedArtifacts_({
    master: true,
    vistaOrganizaciones: true
  });
  logProcessing_('INFO', 'importarSocios', 'socios', '', user.email, errors.length ? 'PARCIAL' : 'OK', { total: rows.length, validos: validRows.length, errores: errors.length });
  logUserAction_('IMPORT_SOCIOS', 'socios', '', errors.length ? 'PARCIAL' : 'OK', { total: rows.length, errores: errors });
  const result = { ok: errors.length === 0, total: rows.length, imported: validRows.length, errors: errors };
  goPesDiagEnd_(diag, {
    ok: result.ok,
    imported: validRows.length,
    errors: errors.length
  });
  return result;
}

function listarHistorial(filters) {
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  let rows = getSheetData_(GO_PES_V2.SHEETS.LOG_ACCIONES)
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  if (filters && filters.entity_id) rows = rows.filter(r => String(r.entity_id || '') === String(filters.entity_id));
  if (filters && filters.email) rows = rows.filter(r => normalizeText_(r.email) === normalizeText_(filters.email));
  return rows.slice(0, 200);
}

function goPesRebuildDerivedUnsafe_() {
  buildMaster_();
  buildVwOrganizaciones_();
  buildVwInstrumentos_();
  buildVwTerritorial_();
}

function buildMaster_() {
  return buildMasterDatos_();
}

function buildVwOrganizaciones_() {
  return buildVistaOrganizaciones_();
}

function buildVwInstrumentos_() {
  return buildVistaInstrumentos_();
}

function buildVwTerritorial_() {
  return buildVistaTerritorial_();
}

function patchCaseSummary_(solicitudId, patch) {
  const existing = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false);
  if (!existing) return;
  const merged = Object.assign({}, existing, patch, { updated_at: new Date() });
  upsertByKey_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', merged, false);
}

function logProcessing_(level, action, entity, entityId, userEmail, result, detail) {
  appendRowObject_(GO_PES_V2.SHEETS.LOG_PROC, {
    timestamp: new Date(),
    nivel: level,
    accion: action,
    entidad: entity,
    entidad_id: entityId || '',
    usuario: userEmail || '',
    resultado: result || 'OK',
    detalle_json: detail ? JSON.stringify(detail) : ''
  });
}

function maybeCallMaker_(fnName, payload) {
  try {
    if (typeof this[fnName] === 'function' && !String(fnName).startsWith('goPes')) {
      this[fnName](payload);
    }
  } catch (err) {
    logProcessing_('WARN', 'maybeCallMaker', 'integracion', fnName, getCurrentUserEmail_(), 'ERROR', { message: err.message });
  }
}

function toClientSafe_(value) {
  return serializeForClient_(value);
}
