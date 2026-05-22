function getFixedBenefitMeta_() {
  return [
    {
      beneficio_codigo: 'CHARLAS_CAPACITACIONES',
      beneficio_nombre: 'Charlas y capacitaciones',
      descripcion_beneficio: 'Plan anual editable de capacitaciones para organizaciones con certificado provisorio.',
      instrumento_tipo: 'capacitacion_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: 'certificado_provisorio',
      elegibilidad_label: 'Requiere certificado provisorio',
      cantidad_anual_capacitaciones: 4,
      cantidad_default_capacitaciones: 4,
      llamados_por_anio: '',
      visita_tecnica_requerida_flag: 'No',
      flujo_inicio_default: 'Definir plan anual de capacitaciones',
      config_mode: 'charlas',
      estado_options: ['Pendiente', 'Programada', 'Ejecutada'],
      estado_default: 'Pendiente',
      tracking_fields: []
    },
    {
      beneficio_codigo: 'FONDESE',
      beneficio_nombre: 'Fondese',
      descripcion_beneficio: 'Dos convocatorias anuales con fechas clave editables para seguimiento y alertas.',
      instrumento_tipo: 'fondo_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: 'proceso_100',
      elegibilidad_label: 'Requiere proceso completado al 100%',
      cantidad_anual_capacitaciones: '',
      cantidad_default_capacitaciones: '',
      llamados_por_anio: 2,
      visita_tecnica_requerida_flag: 'No',
      flujo_inicio_default: 'Revisar calendario de convocatorias FONDESE',
      config_mode: 'fondese',
      estado_options: ['Elegible', 'Postula', 'Admisible', 'Evaluada', 'Convenio', 'Fondos entregados', 'Rendicion pendiente', 'Rendicion cerrada'],
      estado_default: 'Elegible',
      tracking_fields: []
    },
    {
      beneficio_codigo: 'CAMARAS_1414',
      beneficio_nombre: 'Camaras 1414',
      descripcion_beneficio: 'Beneficio que inicia con visita tecnica una vez obtenido el certificado definitivo.',
      instrumento_tipo: 'beneficio_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: 'certificado_definitivo',
      elegibilidad_label: 'Requiere certificado definitivo',
      cantidad_anual_capacitaciones: '',
      cantidad_default_capacitaciones: '',
      llamados_por_anio: '',
      visita_tecnica_requerida_flag: 'Si',
      flujo_inicio_default: 'Solicitar visita tecnica tras certificado definitivo',
      config_mode: 'camaras',
      estado_options: ['Elegible', 'Visita tecnica solicitada', 'Visita tecnica realizada', 'En proceso', 'Implementado'],
      estado_default: 'Elegible',
      tracking_fields: [
        { hito_codigo: 'visita_tecnica_solicitada', hito_nombre: 'Visita tecnica solicitada', alerta_clave_flag: 'Si' },
        { hito_codigo: 'visita_tecnica_realizada', hito_nombre: 'Visita tecnica realizada', alerta_clave_flag: 'Si' }
      ]
    }
  ];
}

function getFixedBenefitMetaByCode_(beneficioCodigo) {
  const key = String(beneficioCodigo || '').trim().toUpperCase();
  return getFixedBenefitMeta_().find(function(item) {
    return item.beneficio_codigo === key;
  }) || null;
}

function getDefaultFondeseConfigRows_() {
  return [
    buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'postulacion_proyectos', 'Postulacion de Proyectos Primera Convocatoria', 'rango', '2026-01-29', '2026-03-27', '', '', 'Si', 'Pendiente', 10),
    buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'revision_admisibilidad', 'Revision de Admisibilidad Primera Convocatoria', 'hasta', '', '', '2026-03-30', '', 'Si', 'Pendiente', 20),
    buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'evaluacion_proyectos', 'Evaluacion de los Proyectos Primera Convocatoria', 'hasta', '', '', '2026-04-06', '', 'Si', 'Pendiente', 30),
    buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'firma_convenio_entrega_fondos', 'Firma de convenio y entrega de Fondos Primera Convocatoria', 'fecha', '', '', '2026-04-17', '', 'Si', 'Pendiente', 40),
    buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'ejecucion_proyectos', 'Ejecucion de proyectos Primera Convocatoria', 'texto', '', '', '', 'Desde la recepcion de Fondos', 'No', 'Pendiente', 50),
    buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'rendicion_recursos', 'Rendicion de recursos Primera Convocatoria', 'hasta', '', '', '2026-06-30', '', 'Si', 'Pendiente', 60),
    buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'postulacion_proyectos', 'Postulacion de Proyectos Segunda Convocatoria', 'rango', '2026-07-01', '2026-08-03', '', '', 'Si', 'Pendiente', 110),
    buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'revision_admisibilidad', 'Revision de Admisibilidad Segunda Convocatoria', 'hasta', '', '', '2026-08-14', '', 'Si', 'Pendiente', 120),
    buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'evaluacion_proyectos', 'Evaluacion de los Proyectos Segunda Convocatoria', 'hasta', '', '', '2026-08-21', '', 'Si', 'Pendiente', 130),
    buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'firma_convenio_entrega_fondos', 'Firma de convenio y entrega de Fondos Segunda Convocatoria', 'fecha', '', '', '2026-08-28', '', 'Si', 'Pendiente', 140),
    buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'ejecucion_proyectos', 'Ejecucion de proyectos Segunda Convocatoria', 'texto', '', '', '', 'Desde la recepcion de Fondos', 'No', 'Pendiente', 150),
    buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'rendicion_recursos', 'Rendicion de recursos Segunda Convocatoria', 'hasta', '', '', '2026-11-30', '', 'Si', 'Pendiente', 160)
  ];
}

function buildBenefitBaseHitoSeed_(beneficioCodigo, convocatoriaCodigo, convocatoriaNombre, hitoCodigo, hitoNombre, modoFecha, fechaInicio, fechaFin, fechaReferencia, descripcionOperativa, alertaClaveFlag, estadoDefault, ordenVisual) {
  return {
    beneficio_hito_base_id: deterministicId_('BHB', [beneficioCodigo, convocatoriaCodigo, hitoCodigo]),
    beneficio_codigo: beneficioCodigo,
    convocatoria_codigo: convocatoriaCodigo || '',
    convocatoria_nombre: convocatoriaNombre || '',
    hito_codigo: hitoCodigo || '',
    hito_nombre: hitoNombre || '',
    modo_fecha: modoFecha || 'fecha',
    fecha_inicio: fechaInicio || '',
    fecha_fin: fechaFin || '',
    fecha_referencia: fechaReferencia || '',
    descripcion_operativa: descripcionOperativa || '',
    alerta_clave_flag: alertaClaveFlag || 'No',
    estado_hito_default: estadoDefault || 'Pendiente',
    orden_visual: ordenVisual || 0,
    activo_flag: 'Si'
  };
}

function seedBeneficios_() {
  ensureSheetsSubset_([
    GO_PES_V2.SHEETS.DIM_BENEFICIOS,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS
  ]);

  const now = new Date();
  const actor = 'system';
  const meta = getFixedBenefitMeta_();

  upsertRowsByKey_(GO_PES_V2.SHEETS.DIM_BENEFICIOS, 'beneficio_codigo', meta.map(function(item) {
    return {
      beneficio_codigo: item.beneficio_codigo,
      beneficio_nombre: item.beneficio_nombre,
      descripcion_beneficio: item.descripcion_beneficio,
      instrumento_tipo: item.instrumento_tipo,
      origen_instrumento: item.origen_instrumento,
      elegibilidad_tipo: item.elegibilidad_tipo,
      elegibilidad_label: item.elegibilidad_label,
      activo_flag: 'Si',
      system_flag: 'Si',
      updated_by: actor,
      updated_at: now
    };
  }), false);

  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE, 'beneficio_detalle_id', meta.map(function(item) {
    return {
      beneficio_detalle_id: deterministicId_('BDC', [item.beneficio_codigo]),
      beneficio_codigo: item.beneficio_codigo,
      nombre_beneficio: item.beneficio_nombre,
      descripcion_beneficio: item.descripcion_beneficio,
      instrumento_tipo: item.instrumento_tipo,
      origen_instrumento: item.origen_instrumento,
      elegibilidad_tipo: item.elegibilidad_tipo,
      elegibilidad_label: item.elegibilidad_label,
      requiere_certificado_provisorio_flag: toSiNo_(item.elegibilidad_tipo === 'certificado_provisorio'),
      requiere_certificado_definitivo_flag: toSiNo_(item.elegibilidad_tipo === 'certificado_definitivo'),
      requiere_proceso_100_flag: toSiNo_(item.elegibilidad_tipo === 'proceso_100'),
      cantidad_anual_capacitaciones: item.cantidad_anual_capacitaciones,
      cantidad_default_capacitaciones: item.cantidad_default_capacitaciones,
      llamados_por_anio: item.llamados_por_anio,
      visita_tecnica_requerida_flag: toSiNo_(item.visita_tecnica_requerida_flag),
      flujo_inicio_default: item.flujo_inicio_default,
      alerta_origen_modulo: 'Modulo 0',
      activo_flag: 'Si',
      system_flag: 'Si',
      updated_by: actor,
      updated_at: now
    };
  }), false);

  if (!getBenefitBaseHitos_('FONDESE').length) {
    replaceBenefitBaseHitos_('FONDESE', normalizeBenefitBaseHitosForStorage_('FONDESE', getDefaultFondeseConfigRows_(), actor, now));
  }

  replaceBenefitBaseHitos_('CHARLAS_CAPACITACIONES', []);
  replaceBenefitBaseHitos_('CAMARAS_1414', []);
}

function getBeneficiosModuloPanel(payload) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'administrador', 'superuser']);
  payload = payload || {};
  ensureBenefitsModuleReady_();

  const selectedCode = String(payload.beneficio_codigo || '').trim().toUpperCase() || 'CHARLAS_CAPACITACIONES';
  const selectedOrgId = String(payload.organizacion_id || '').trim();
  const selectedBenefit = getBenefitByCode_(selectedCode);
  const organizationsPanel = selectedBenefit ? buildBenefitOrganizationsPanel_(selectedBenefit) : {
    activas: [],
    elegibles: [],
    no_elegibles: []
  };

  const selectedOrgDetail = selectedBenefit && selectedOrgId
    ? getBeneficioOrganizacionDetalle({ beneficio_codigo: selectedBenefit.beneficio_codigo, organizacion_id: selectedOrgId })
    : '';

  const beneficios = getBenefitDefinitions_().map(function(benefit) {
    const panel = buildBenefitOrganizationsPanel_(benefit);
    return {
      beneficio_codigo: benefit.beneficio_codigo,
      beneficio_nombre: benefit.beneficio_nombre,
      descripcion_beneficio: benefit.descripcion_beneficio,
      elegibilidad_label: benefit.elegibilidad_label,
      config_mode: benefit.config_mode,
      total_activas: panel.activas.length,
      total_elegibles: panel.elegibles.length,
      total_no_elegibles: panel.no_elegibles.length
    };
  });

  return serializeForClient_({
    beneficios: beneficios,
    selected_beneficio: selectedBenefit || '',
    selected_beneficio_hitos: selectedBenefit && selectedBenefit.beneficio_codigo === 'FONDESE' ? getBenefitBaseHitos_('FONDESE') : [],
    organizaciones_panel: organizationsPanel,
    selected_org_detail: selectedOrgDetail
  });
}

function getBeneficioOrganizacionDetalle(payload) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'administrador', 'superuser']);
  payload = payload || {};
  ensureBenefitsModuleReady_();

  const beneficioCodigo = String(payload.beneficio_codigo || '').trim().toUpperCase();
  const organizacionId = String(payload.organizacion_id || '').trim();
  if (!beneficioCodigo) throw new Error('Falta beneficio_codigo.');
  if (!organizacionId) throw new Error('Falta organizacion_id.');

  ensureBenefitOrgRowsFromLegacy_(beneficioCodigo);

  const benefit = getBenefitByCode_(beneficioCodigo);
  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!benefit || !org) throw new Error('No se encontro la definicion solicitada.');

  const eligibility = evaluateBenefitEligibility_(benefit, org);
  const assignment = findBenefitOrgRow_(beneficioCodigo, organizacionId);
  const trackingFields = buildTrackingFieldsForClient_(benefit, assignment ? getBenefitOrgHitos_(assignment.beneficio_org_id) : []);
  const assignmentClient = assignment
    ? normalizeBenefitOrgClient_(benefit, assignment, trackingFields)
    : buildDraftBenefitOrgClient_(benefit, org, trackingFields);

  return serializeForClient_({
    beneficio: benefit,
    organizacion: pickBenefitOrgClientFields_(org),
    elegibilidad: eligibility,
    asignacion: assignmentClient,
    status_options: benefit.estado_options || [],
    tracking_fields: trackingFields
  });
}

function guardarConfiguracionBeneficio(payload) {
  const user = requireModuleAccess_('instrumento', ['coordinador', 'administrador', 'superuser']);
  payload = payload || {};
  ensureBenefitsModuleReady_();

  const benefit = getBenefitByCode_(payload.beneficio_codigo);
  if (!benefit) throw new Error('Beneficio no disponible.');

  const meta = getFixedBenefitMetaByCode_(benefit.beneficio_codigo);
  const now = new Date();

  const configRow = {
    beneficio_detalle_id: deterministicId_('BDC', [benefit.beneficio_codigo]),
    beneficio_codigo: benefit.beneficio_codigo,
    nombre_beneficio: meta.beneficio_nombre,
    descripcion_beneficio: meta.descripcion_beneficio,
    instrumento_tipo: meta.instrumento_tipo,
    origen_instrumento: meta.origen_instrumento,
    elegibilidad_tipo: meta.elegibilidad_tipo,
    elegibilidad_label: meta.elegibilidad_label,
    requiere_certificado_provisorio_flag: toSiNo_(meta.elegibilidad_tipo === 'certificado_provisorio'),
    requiere_certificado_definitivo_flag: toSiNo_(meta.elegibilidad_tipo === 'certificado_definitivo'),
    requiere_proceso_100_flag: toSiNo_(meta.elegibilidad_tipo === 'proceso_100'),
    cantidad_anual_capacitaciones: benefit.beneficio_codigo === 'CHARLAS_CAPACITACIONES'
      ? asNumberOrBlank_(payload.cantidad_anual_capacitaciones || benefit.cantidad_anual_capacitaciones || meta.cantidad_anual_capacitaciones || 4)
      : '',
    cantidad_default_capacitaciones: meta.cantidad_default_capacitaciones,
    llamados_por_anio: meta.llamados_por_anio,
    visita_tecnica_requerida_flag: toSiNo_(meta.visita_tecnica_requerida_flag),
    flujo_inicio_default: benefit.beneficio_codigo === 'CAMARAS_1414'
      ? String(payload.flujo_inicio_default || benefit.flujo_inicio_default || meta.flujo_inicio_default).trim()
      : meta.flujo_inicio_default,
    alerta_origen_modulo: 'Modulo 0',
    activo_flag: 'Si',
    system_flag: 'Si',
    updated_by: user.email,
    updated_at: now
  };

  upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE, 'beneficio_detalle_id', configRow, false);

  if (benefit.beneficio_codigo === 'FONDESE') {
    replaceBenefitBaseHitos_('FONDESE', normalizeBenefitBaseHitosForStorage_('FONDESE', Array.isArray(payload.hitos) ? payload.hitos : getBenefitBaseHitos_('FONDESE'), user.email, now));
  }

  logUserAction_('UPSERT_BENEFICIO_CONFIG', 'beneficio', benefit.beneficio_codigo, 'OK', {});
  return serializeForClient_({ ok: true, beneficio_codigo: benefit.beneficio_codigo });
}

function guardarBeneficioOrganizacion(payload) {
  const user = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'administrador', 'superuser']);
  payload = payload || {};
  ensureBenefitsModuleReady_();

  const beneficioCodigo = String(payload.beneficio_codigo || '').trim().toUpperCase();
  const organizacionId = String(payload.organizacion_id || '').trim();
  if (!beneficioCodigo || !organizacionId) throw new Error('Faltan datos obligatorios.');

  const benefit = getBenefitByCode_(beneficioCodigo);
  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!benefit || !org) throw new Error('No se encontro el beneficio u organizacion indicada.');

  const eligibility = evaluateBenefitEligibility_(benefit, org);
  const existing = findBenefitOrgRow_(beneficioCodigo, organizacionId);
  if (!existing && !eligibility.cumple_flag) {
    throw new Error('La organizacion no cumple la elegibilidad actual para incorporarse al beneficio.');
  }

  const now = new Date();
  const beneficioOrgId = existing && existing.beneficio_org_id ? existing.beneficio_org_id : nextId_('beneficio_org', 'BOR');
  const estadoBeneficio = normalizeBenefitState_(beneficioCodigo, payload.estado_beneficio || (existing && existing.estado_beneficio) || benefit.estado_default);
  const trackingRows = buildOrgTrackingRowsForSave_(
    benefit,
    beneficioOrgId,
    organizacionId,
    Array.isArray(payload.tracking_fields) ? payload.tracking_fields : [],
    user.email,
    now
  );

  const row = {
    beneficio_org_id: beneficioOrgId,
    beneficio_codigo: beneficioCodigo,
    organizacion_id: organizacionId,
    org_instrumento_id: existing && existing.org_instrumento_id
      ? existing.org_instrumento_id
      : (findBenefitInstrumentMirror_(beneficioCodigo, organizacionId)?.org_instrumento_id || nextId_('instrumento', 'OIN')),
    elegible_flag: toSiNo_(eligibility.cumple_flag),
    criterio_elegibilidad: eligibility.label,
    motivo_no_elegibilidad: eligibility.cumple_flag ? '' : eligibility.detalle,
    activo_flag: 'Si',
    estado_beneficio: estadoBeneficio,
    avance_beneficio_pct: calculateBenefitProgressFromState_(beneficioCodigo, estadoBeneficio),
    proximo_hito_beneficio: getNextBenefitStateLabel_(beneficioCodigo, estadoBeneficio),
    fecha_inicio_beneficio: asDateOrBlank_(payload.fecha_inicio_beneficio || existing && existing.fecha_inicio_beneficio || new Date()),
    fecha_termino_beneficio: asDateOrBlank_(payload.fecha_termino_beneficio || existing && existing.fecha_termino_beneficio || ''),
    resultado_beneficio: String(payload.resultado_beneficio || existing && existing.resultado_beneficio || '').trim(),
    responsable_beneficio: String(payload.responsable_beneficio || existing && existing.responsable_beneficio || org.responsable_actual || user.nombre_visible || '').trim(),
    observacion_beneficio: String(payload.observacion_beneficio || existing && existing.observacion_beneficio || '').trim(),
    updated_by: user.email,
    updated_at: now
  };

  upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_org_id', row, false);
  replaceBenefitOrgHitos_(beneficioOrgId, trackingRows);
  syncInstrumentoMirrorFromBenefitOrg_(benefit, org, row);

  logUserAction_('UPSERT_BENEFICIO_ORG', 'beneficio_org', beneficioOrgId, 'OK', {
    beneficio_codigo: beneficioCodigo,
    organizacion_id: organizacionId
  });

  return serializeForClient_({
    ok: true,
    beneficio_org_id: beneficioOrgId,
    beneficio_codigo: beneficioCodigo,
    organizacion_id: organizacionId
  });
}

function desactivarBeneficioOrganizacion(payload) {
  const user = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'administrador', 'superuser']);
  payload = payload || {};
  ensureBenefitsModuleReady_();

  const beneficioCodigo = String(payload.beneficio_codigo || '').trim().toUpperCase();
  const organizacionId = String(payload.organizacion_id || '').trim();
  const row = findBenefitOrgRow_(beneficioCodigo, organizacionId);
  if (!row) throw new Error('No se encontro la asignacion del beneficio para la organizacion.');

  upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_org_id', Object.assign({}, row, {
    activo_flag: 'No',
    estado_beneficio: 'Inactivo',
    updated_by: user.email,
    updated_at: new Date()
  }), false);

  replaceBenefitOrgHitos_(row.beneficio_org_id, []);

  const benefit = getBenefitByCode_(beneficioCodigo);
  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (benefit && org) {
    syncInstrumentoMirrorFromBenefitOrg_(benefit, org, Object.assign({}, row, {
      activo_flag: 'No',
      estado_beneficio: 'Inactivo',
      resultado_beneficio: 'No aplica'
    }));
  }

  return serializeForClient_({ ok: true, beneficio_codigo: beneficioCodigo, organizacion_id: organizacionId });
}

function ensureBenefitsModuleReady_() {
  ensureSheetsSubset_([
    GO_PES_V2.SHEETS.DIM_BENEFICIOS,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS,
    GO_PES_V2.SHEETS.DIM_INSTRUMENTOS,
    GO_PES_V2.SHEETS.RAW_INSTRUMENTOS,
    GO_PES_V2.SHEETS.FACT_INSTRUMENTOS
  ]);

  seedBeneficios_();
  getBenefitDefinitions_().forEach(function(benefit) {
    syncBenefitInstrumentCatalog_(benefit.beneficio_codigo);
    ensureBenefitOrgRowsFromLegacy_(benefit.beneficio_codigo);
  });
}

function buildBenefitOrganizationsPanel_(benefit) {
  const orgs = (getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || []).filter(function(row) {
    return String(row.organizacion_id || '').trim() && String(row.nombre_organizacion || '').trim();
  });
  const assignments = (filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_codigo', benefit.beneficio_codigo, false) || []).filter(function(row) {
    return toBool_(row.activo_flag);
  });
  const activeByOrg = {};
  assignments.forEach(function(row) {
    activeByOrg[String(row.organizacion_id || '').trim()] = row;
  });

  const activas = [];
  const elegibles = [];
  const noElegibles = [];

  orgs.forEach(function(org) {
    const eligibility = evaluateBenefitEligibility_(benefit, org);
    const active = activeByOrg[String(org.organizacion_id || '').trim()] || null;
    if (active) {
      activas.push(Object.assign(
        pickBenefitOrgClientFields_(org),
        normalizeBenefitOrgClient_(benefit, active, buildTrackingFieldsForClient_(benefit, getBenefitOrgHitos_(active.beneficio_org_id)))
      ));
      return;
    }

    const row = Object.assign(pickBenefitOrgClientFields_(org), {
      criterio_elegibilidad: eligibility.label,
      detalle_elegibilidad: eligibility.detalle
    });
    if (eligibility.cumple_flag) elegibles.push(row);
    else noElegibles.push(row);
  });

  const sorter = function(a, b) {
    return String(a.nombre_organizacion || '').localeCompare(String(b.nombre_organizacion || ''), 'es');
  };
  activas.sort(sorter);
  elegibles.sort(sorter);
  noElegibles.sort(sorter);

  return {
    activas: activas,
    elegibles: elegibles,
    no_elegibles: noElegibles
  };
}

function evaluateBenefitEligibility_(benefit, org) {
  const tipo = String(benefit.elegibilidad_tipo || '').trim();
  const contexto = buildOrgProcessContext_(org);

  if (tipo === 'certificado_provisorio') {
    const ok = toBool_(org.certificado_provisorio_flag);
    return {
      cumple_flag: ok,
      label: benefit.elegibilidad_label || 'Requiere certificado provisorio',
      detalle: ok ? 'La organizacion ya cuenta con certificado provisorio.' : 'La organizacion aun no registra certificado provisorio.',
      valor_actual: ok ? 'Si' : 'No'
    };
  }

  if (tipo === 'certificado_definitivo') {
    const ok = toBool_(org.certificado_definitivo_flag);
    return {
      cumple_flag: ok,
      label: benefit.elegibilidad_label || 'Requiere certificado definitivo',
      detalle: ok ? 'La organizacion ya cuenta con certificado definitivo.' : 'La organizacion aun no registra certificado definitivo.',
      valor_actual: ok ? 'Si' : 'No'
    };
  }

  const ok = !!contexto.proceso_completado_100_flag;
  return {
    cumple_flag: ok,
    label: benefit.elegibilidad_label || 'Requiere proceso completado al 100%',
    detalle: ok ? 'La organizacion cumple el proceso al 100%.' : 'La organizacion aun no completa el 100% del proceso.',
    valor_actual: String(contexto.proceso_completado_pct || 0) + '%'
  };
}

function buildOrgProcessContext_(org) {
  if (typeof goPesApplyAvancePhase1Config_ === 'function') {
    try {
      goPesApplyAvancePhase1Config_();
    } catch (err) {}
  }

  const viewSheet = GO_PES_V2.SHEETS.VW_AVANCE_ORGANIZACION;
  const avance = viewSheet && sheetExists_(viewSheet)
    ? findByField_(viewSheet, 'organizacion_id', org.organizacion_id, false)
    : null;
  const total = Number(avance && avance.total_hitos_tramo_pre || 0) + Number(avance && avance.total_hitos_tramo_for || 0);
  const done = Number(avance && avance.total_hitos_cumplidos || 0);
  if (total > 0) {
    const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    return { proceso_completado_pct: pct, proceso_completado_100_flag: done >= total };
  }

  const fallback = toBool_(org.certificado_definitivo_flag) || toBool_(org.organizacion_constituida_flag) || normalizeText_(org.estado_constitucion) === 'constituida';
  return { proceso_completado_pct: fallback ? 100 : 0, proceso_completado_100_flag: fallback };
}

function getBenefitDefinitions_() {
  const meta = getFixedBenefitMeta_();
  const dimRows = getSheetData_(GO_PES_V2.SHEETS.DIM_BENEFICIOS) || [];
  const configRows = getSheetData_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE) || [];
  const dimByCode = {};
  const configByCode = {};

  dimRows.forEach(function(row) {
    dimByCode[String(row.beneficio_codigo || '').trim().toUpperCase()] = row;
  });
  configRows.forEach(function(row) {
    configByCode[String(row.beneficio_codigo || '').trim().toUpperCase()] = row;
  });

  return meta.map(function(item) {
    const code = item.beneficio_codigo;
    return Object.assign({}, item, dimByCode[code] || {}, configByCode[code] || {}, {
      beneficio_codigo: code,
      beneficio_nombre: item.beneficio_nombre,
      descripcion_beneficio: item.descripcion_beneficio,
      elegibilidad_tipo: item.elegibilidad_tipo,
      elegibilidad_label: item.elegibilidad_label,
      config_mode: item.config_mode,
      estado_options: item.estado_options.slice(),
      estado_default: item.estado_default,
      tracking_fields: cloneRowObjects_(item.tracking_fields || []),
      activo_flag: 'Si',
      system_flag: 'Si'
    });
  });
}

function getBenefitByCode_(beneficioCodigo) {
  const key = String(beneficioCodigo || '').trim().toUpperCase();
  return getBenefitDefinitions_().find(function(row) {
    return row.beneficio_codigo === key;
  }) || null;
}

function getBenefitBaseHitos_(beneficioCodigo) {
  return (filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS, 'beneficio_codigo', beneficioCodigo, false) || [])
    .filter(function(row) { return toBool_(row.activo_flag); })
    .sort(function(a, b) { return Number(a.orden_visual || 0) - Number(b.orden_visual || 0); });
}

function normalizeBenefitBaseHitosForStorage_(beneficioCodigo, rows, userEmail, now) {
  return (rows || []).map(function(row, index) {
    const convocatoriaCodigo = String(row.convocatoria_codigo || '').trim();
    const hitoCodigo = String(row.hito_codigo || '').trim() || slugify_(row.hito_nombre || ('hito_' + index));
    return {
      beneficio_hito_base_id: row.beneficio_hito_base_id || deterministicId_('BHB', [beneficioCodigo, convocatoriaCodigo, hitoCodigo]),
      beneficio_codigo: beneficioCodigo,
      convocatoria_codigo: convocatoriaCodigo,
      convocatoria_nombre: String(row.convocatoria_nombre || '').trim(),
      hito_codigo: hitoCodigo,
      hito_nombre: String(row.hito_nombre || '').trim(),
      modo_fecha: String(row.modo_fecha || 'fecha').trim(),
      fecha_inicio: asDateOrBlank_(row.fecha_inicio),
      fecha_fin: asDateOrBlank_(row.fecha_fin),
      fecha_referencia: asDateOrBlank_(row.fecha_referencia),
      descripcion_operativa: String(row.descripcion_operativa || '').trim(),
      alerta_clave_flag: toSiNo_(row.alerta_clave_flag),
      estado_hito_default: 'Pendiente',
      orden_visual: Number(row.orden_visual || (index + 1) * 10),
      activo_flag: 'Si',
      updated_by: userEmail || '',
      updated_at: now || new Date()
    };
  }).filter(function(row) {
    return row.hito_codigo && row.hito_nombre;
  });
}

function replaceBenefitBaseHitos_(beneficioCodigo, rows) {
  const sheetName = GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS;
  const headers = buildSheetDefinitions_()[sheetName];
  const otherRows = (getSheetData_(sheetName) || []).filter(function(row) {
    return String(row.beneficio_codigo || '').trim().toUpperCase() !== String(beneficioCodigo || '').trim().toUpperCase();
  });
  replaceSheetData_(sheetName, headers, mapRowsToSheetMatrix_(headers, otherRows.concat(rows || [])));
}

function findBenefitOrgRow_(beneficioCodigo, organizacionId) {
  return (filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_codigo', beneficioCodigo, false) || []).find(function(row) {
    return String(row.organizacion_id || '').trim() === String(organizacionId || '').trim();
  }) || null;
}

function getBenefitOrgHitos_(beneficioOrgId) {
  return (filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS, 'beneficio_org_id', beneficioOrgId, false) || []).sort(function(a, b) {
    return Number(a.orden_visual || 0) - Number(b.orden_visual || 0);
  });
}

function buildTrackingFieldsForClient_(benefit, rows) {
  const defs = benefit && benefit.tracking_fields ? benefit.tracking_fields : [];
  const rowByCode = {};
  (rows || []).forEach(function(row) {
    rowByCode[String(row.hito_codigo || '').trim()] = row;
  });
  return defs.map(function(def, index) {
    const current = rowByCode[def.hito_codigo] || {};
    return {
      hito_codigo: def.hito_codigo,
      hito_nombre: def.hito_nombre,
      alerta_clave_flag: def.alerta_clave_flag || 'No',
      fecha_referencia: current.fecha_referencia || '',
      orden_visual: Number(current.orden_visual || ((index + 1) * 10))
    };
  });
}

function buildOrgTrackingRowsForSave_(benefit, beneficioOrgId, organizacionId, fields, userEmail, now) {
  return (fields || []).map(function(field, index) {
    const code = String(field.hito_codigo || '').trim();
    const dateValue = asDateOrBlank_(field.fecha_referencia);
    if (!code) return null;
    return {
      beneficio_org_hito_id: deterministicId_('BOH', [beneficioOrgId, benefit.beneficio_codigo, code]),
      beneficio_org_id: beneficioOrgId,
      beneficio_codigo: benefit.beneficio_codigo,
      organizacion_id: organizacionId,
      convocatoria_codigo: '',
      convocatoria_nombre: '',
      hito_codigo: code,
      hito_nombre: String(field.hito_nombre || '').trim(),
      modo_fecha: 'fecha',
      fecha_inicio: '',
      fecha_fin: '',
      fecha_referencia: dateValue,
      descripcion_operativa: '',
      estado_hito: dateValue ? 'Cumplido' : 'Pendiente',
      alerta_clave_flag: toSiNo_(field.alerta_clave_flag),
      orden_visual: Number(field.orden_visual || ((index + 1) * 10)),
      updated_by: userEmail || '',
      updated_at: now || new Date()
    };
  }).filter(Boolean);
}

function replaceBenefitOrgHitos_(beneficioOrgId, rows) {
  const sheetName = GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS;
  const headers = buildSheetDefinitions_()[sheetName];
  const otherRows = (getSheetData_(sheetName) || []).filter(function(row) {
    return String(row.beneficio_org_id || '').trim() !== String(beneficioOrgId || '').trim();
  });
  replaceSheetData_(sheetName, headers, mapRowsToSheetMatrix_(headers, otherRows.concat(rows || [])));
}

function mapRowsToSheetMatrix_(headers, rows) {
  return (rows || []).map(function(row) {
    return (headers || []).map(function(header) {
      return row && row[header] !== undefined ? row[header] : '';
    });
  });
}

function normalizeBenefitOrgClient_(benefit, row, trackingFields) {
  const state = normalizeBenefitState_(benefit.beneficio_codigo, row.estado_beneficio || benefit.estado_default);
  return {
    beneficio_org_id: row.beneficio_org_id || '',
    org_instrumento_id: row.org_instrumento_id || '',
    activo_flag: row.activo_flag || 'Si',
    estado_beneficio: state,
    avance_beneficio_pct: row.avance_beneficio_pct === '' ? calculateBenefitProgressFromState_(benefit.beneficio_codigo, state) : row.avance_beneficio_pct,
    proximo_hito_beneficio: row.proximo_hito_beneficio || getNextBenefitStateLabel_(benefit.beneficio_codigo, state),
    fecha_inicio_beneficio: row.fecha_inicio_beneficio || '',
    fecha_termino_beneficio: row.fecha_termino_beneficio || '',
    resultado_beneficio: row.resultado_beneficio || '',
    responsable_beneficio: row.responsable_beneficio || '',
    observacion_beneficio: row.observacion_beneficio || '',
    tracking_fields: trackingFields || []
  };
}

function buildDraftBenefitOrgClient_(benefit, org, trackingFields) {
  const defaultState = normalizeBenefitState_(benefit.beneficio_codigo, benefit.estado_default);
  return {
    beneficio_org_id: '',
    org_instrumento_id: '',
    activo_flag: 'Si',
    estado_beneficio: defaultState,
    avance_beneficio_pct: calculateBenefitProgressFromState_(benefit.beneficio_codigo, defaultState),
    proximo_hito_beneficio: getNextBenefitStateLabel_(benefit.beneficio_codigo, defaultState),
    fecha_inicio_beneficio: new Date(),
    fecha_termino_beneficio: '',
    resultado_beneficio: '',
    responsable_beneficio: org.responsable_actual || '',
    observacion_beneficio: '',
    tracking_fields: trackingFields || []
  };
}

function normalizeBenefitState_(beneficioCodigo, value) {
  const options = getBenefitStateOptions_(beneficioCodigo);
  const normalizedValue = normalizeText_(value);
  const match = options.find(function(item) {
    return normalizeText_(item) === normalizedValue;
  });
  return match || options[0] || '';
}

function getBenefitStateOptions_(beneficioCodigo) {
  const meta = getFixedBenefitMetaByCode_(beneficioCodigo);
  return meta ? meta.estado_options.slice() : [];
}

function calculateBenefitProgressFromState_(beneficioCodigo, state) {
  const options = getBenefitStateOptions_(beneficioCodigo);
  if (!options.length) return 0;
  const normalizedState = normalizeBenefitState_(beneficioCodigo, state);
  const index = options.indexOf(normalizedState);
  if (index <= 0) return 0;
  if (options.length === 1) return 100;
  return Math.round((index / (options.length - 1)) * 100);
}

function getNextBenefitStateLabel_(beneficioCodigo, state) {
  const options = getBenefitStateOptions_(beneficioCodigo);
  if (!options.length) return '';
  const normalizedState = normalizeBenefitState_(beneficioCodigo, state);
  const index = options.indexOf(normalizedState);
  if (index === -1 || index >= options.length - 1) return '';
  return options[index + 1];
}

function pickBenefitOrgClientFields_(org) {
  return {
    organizacion_id: org.organizacion_id || '',
    nombre_organizacion: org.nombre_organizacion || '',
    estado_constitucion: org.estado_constitucion || '',
    estado_general_organizacion: org.estado_general_organizacion || '',
    certificado_provisorio_flag: org.certificado_provisorio_flag || '',
    certificado_definitivo_flag: org.certificado_definitivo_flag || '',
    responsable_actual: org.responsable_actual || ''
  };
}

function syncBenefitInstrumentCatalog_(beneficioCodigo) {
  const benefit = getBenefitByCode_(beneficioCodigo);
  if (!benefit) return;
  upsertByKey_(GO_PES_V2.SHEETS.DIM_INSTRUMENTOS, 'instrumento_codigo_catalogo', {
    instrumento_codigo_catalogo: benefit.beneficio_codigo,
    instrumento_nombre: benefit.beneficio_nombre,
    instrumento_tipo: benefit.instrumento_tipo || 'beneficio_municipal',
    origen_instrumento: benefit.origen_instrumento || 'municipal',
    activo_flag: true
  }, false);
}

function findBenefitInstrumentMirror_(beneficioCodigo, organizacionId) {
  return (filterByField_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'organizacion_id', organizacionId, false) || []).find(function(row) {
    return String(row.instrumento_codigo_catalogo || '').trim().toUpperCase() === String(beneficioCodigo || '').trim().toUpperCase();
  }) || null;
}

function syncInstrumentoMirrorFromBenefitOrg_(benefit, org, row) {
  const now = new Date();
  const state = row && toBool_(row.activo_flag) ? row.estado_beneficio || benefit.estado_default : 'Inactivo';
  const mirror = {
    org_instrumento_id: row.org_instrumento_id || nextId_('instrumento', 'OIN'),
    organizacion_id: org.organizacion_id,
    instrumento_codigo_catalogo: benefit.beneficio_codigo,
    instrumento_nombre_otro: '',
    instrumento_tipo: benefit.instrumento_tipo || 'beneficio_municipal',
    origen_instrumento: benefit.origen_instrumento || 'municipal',
    anio_convocatoria: new Date().getFullYear(),
    nombre_convocatoria: benefit.beneficio_nombre,
    numero_llamado: '',
    fecha_inicio_gestion: asDateOrBlank_(row.fecha_inicio_beneficio) || now,
    fecha_apertura: '',
    fecha_cierre: '',
    fecha_habilitacion: '',
    fecha_postulacion: '',
    fecha_resultado: '',
    fecha_cierre_instrumento: asDateOrBlank_(row.fecha_termino_beneficio),
    estado_instrumento: state,
    subestado_instrumento: '',
    avance_instrumento_pct: asNumberOrBlank_(row.avance_beneficio_pct),
    proximo_hito_instrumento: row.proximo_hito_beneficio || '',
    resultado_instrumento: row.resultado_beneficio || '',
    monto_solicitado: '',
    monto_adjudicado: '',
    monto_ejecutado: '',
    responsable_instrumento: row.responsable_beneficio || org.responsable_actual || '',
    contraparte: '',
    observacion_instrumento: row.observacion_beneficio || '',
    documento_respaldo_url: '',
    updated_by: row.updated_by || '',
    updated_at: now
  };

  upsertByKey_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'org_instrumento_id', mirror, false);
  appendRowObject_(GO_PES_V2.SHEETS.RAW_INSTRUMENTOS, Object.assign({}, mirror, {
    created_at: now,
    source: 'WEB_APP_BENEFICIOS',
    user_email: row.updated_by || '',
    legacy_source: '',
    legacy_key: ''
  }));
}

function ensureBenefitOrgRowsFromLegacy_(beneficioCodigo) {
  const benefit = getBenefitByCode_(beneficioCodigo);
  if (!benefit) return;

  const instruments = filterByField_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'instrumento_codigo_catalogo', beneficioCodigo, false) || [];
  const now = new Date();

  instruments.forEach(function(inst) {
    const orgId = String(inst.organizacion_id || '').trim();
    if (!orgId) return;
    if (findBenefitOrgRow_(beneficioCodigo, orgId)) return;

    const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', orgId, false);
    if (!org) return;

    const eligibility = evaluateBenefitEligibility_(benefit, org);
    const state = normalizeBenefitState_(beneficioCodigo, inst.estado_instrumento || benefit.estado_default);
    const beneficioOrgId = nextId_('beneficio_org', 'BOR');

    upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_org_id', {
      beneficio_org_id: beneficioOrgId,
      beneficio_codigo: beneficioCodigo,
      organizacion_id: orgId,
      org_instrumento_id: inst.org_instrumento_id || nextId_('instrumento', 'OIN'),
      elegible_flag: toSiNo_(eligibility.cumple_flag),
      criterio_elegibilidad: eligibility.label,
      motivo_no_elegibilidad: eligibility.cumple_flag ? '' : eligibility.detalle,
      activo_flag: toSiNo_(normalizeText_(inst.estado_instrumento) !== 'cerrado' && normalizeText_(inst.estado_instrumento) !== 'desistido'),
      estado_beneficio: state,
      avance_beneficio_pct: inst.avance_instrumento_pct !== '' ? asNumberOrBlank_(inst.avance_instrumento_pct) : calculateBenefitProgressFromState_(beneficioCodigo, state),
      proximo_hito_beneficio: inst.proximo_hito_instrumento || getNextBenefitStateLabel_(beneficioCodigo, state),
      fecha_inicio_beneficio: asDateOrBlank_(inst.fecha_inicio_gestion) || now,
      fecha_termino_beneficio: asDateOrBlank_(inst.fecha_cierre_instrumento),
      resultado_beneficio: inst.resultado_instrumento || '',
      responsable_beneficio: inst.responsable_instrumento || org.responsable_actual || '',
      observacion_beneficio: inst.observacion_instrumento || '',
      updated_by: 'system',
      updated_at: now
    }, false);
  });
}
