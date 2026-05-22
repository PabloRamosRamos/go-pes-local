function getSystemBenefitSeeds_() {
  return [
    {
      beneficio_codigo: 'CHARLAS_CAPACITACIONES',
      beneficio_nombre: 'Charlas y capacitaciones',
      descripcion_beneficio: 'Plan anual editable de capacitaciones para organizaciones con certificado provisorio.',
      instrumento_tipo: 'capacitacion_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: 'certificado_provisorio',
      elegibilidad_label: 'Requiere certificado provisorio',
      requiere_certificado_provisorio_flag: 'Sí',
      requiere_certificado_definitivo_flag: 'No',
      requiere_proceso_100_flag: 'No',
      cantidad_anual_capacitaciones: 4,
      cantidad_default_capacitaciones: 4,
      llamados_por_anio: '',
      visita_tecnica_requerida_flag: 'No',
      flujo_inicio_default: 'Definir plan anual de capacitaciones',
      activo_flag: 'Sí',
      system_flag: 'Sí'
    },
    {
      beneficio_codigo: 'FONDESE',
      beneficio_nombre: 'Fondese',
      descripcion_beneficio: 'Dos convocatorias anuales con hitos y fechas editables para seguimiento y alertas.',
      instrumento_tipo: 'fondo_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: 'proceso_100',
      elegibilidad_label: 'Requiere proceso completado al 100%',
      requiere_certificado_provisorio_flag: 'No',
      requiere_certificado_definitivo_flag: 'No',
      requiere_proceso_100_flag: 'Sí',
      cantidad_anual_capacitaciones: '',
      cantidad_default_capacitaciones: '',
      llamados_por_anio: 2,
      visita_tecnica_requerida_flag: 'No',
      flujo_inicio_default: 'Revisar calendario de convocatorias FONDESE',
      activo_flag: 'Sí',
      system_flag: 'Sí'
    },
    {
      beneficio_codigo: 'CAMARAS_1414',
      beneficio_nombre: 'Cámaras 1414',
      descripcion_beneficio: 'Beneficio que inicia con visita técnica una vez obtenido el certificado definitivo.',
      instrumento_tipo: 'beneficio_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: 'certificado_definitivo',
      elegibilidad_label: 'Requiere certificado definitivo',
      requiere_certificado_provisorio_flag: 'No',
      requiere_certificado_definitivo_flag: 'Sí',
      requiere_proceso_100_flag: 'No',
      cantidad_anual_capacitaciones: '',
      cantidad_default_capacitaciones: '',
      llamados_por_anio: '',
      visita_tecnica_requerida_flag: 'Sí',
      flujo_inicio_default: 'Solicitar visita técnica tras certificado definitivo',
      activo_flag: 'Sí',
      system_flag: 'Sí'
    }
  ];
}

function getSystemBenefitTemplateHitos_(beneficioCodigo) {
  const code = String(beneficioCodigo || '').trim().toUpperCase();
  if (code === 'FONDESE') {
    return [
      buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'postulacion_proyectos', 'Postulación de Proyectos Primera Convocatoria', 'rango', '2026-01-29', '2026-03-27', '', '', 'Sí', 'Pendiente', 10),
      buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'revision_admisibilidad', 'Revisión de Admisibilidad Primera Convocatoria', 'hasta', '', '', '2026-03-30', '', 'Sí', 'Pendiente', 20),
      buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'evaluacion_proyectos', 'Evaluación de los Proyectos Primera Convocatoria', 'hasta', '', '', '2026-04-06', '', 'Sí', 'Pendiente', 30),
      buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'firma_convenio_entrega_fondos', 'Firma de convenio y entrega de Fondos Primera Convocatoria', 'fecha', '', '', '2026-04-17', '', 'Sí', 'Pendiente', 40),
      buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'ejecucion_proyectos', 'Ejecución de proyectos Primera Convocatoria', 'texto', '', '', '', 'Desde la recepción de Fondos', 'No', 'Pendiente', 50),
      buildBenefitBaseHitoSeed_('FONDESE', 'PRIMERA_2026', 'Primera Convocatoria', 'rendicion_recursos', 'Rendición de recursos Primera Convocatoria', 'hasta', '', '', '2026-06-30', '', 'Sí', 'Pendiente', 60),
      buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'postulacion_proyectos', 'Postulación de Proyectos Segunda Convocatoria', 'rango', '2026-07-01', '2026-08-03', '', '', 'Sí', 'Pendiente', 110),
      buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'revision_admisibilidad', 'Revisión de Admisibilidad Segunda Convocatoria', 'hasta', '', '', '2026-08-14', '', 'Sí', 'Pendiente', 120),
      buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'evaluacion_proyectos', 'Evaluación de los Proyectos Segunda Convocatoria', 'hasta', '', '', '2026-08-21', '', 'Sí', 'Pendiente', 130),
      buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'firma_convenio_entrega_fondos', 'Firma de convenio y entrega de Fondos Segunda Convocatoria', 'fecha', '', '', '2026-08-28', '', 'Sí', 'Pendiente', 140),
      buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'ejecucion_proyectos', 'Ejecución de proyectos Segunda Convocatoria', 'texto', '', '', '', 'Desde la recepción de Fondos', 'No', 'Pendiente', 150),
      buildBenefitBaseHitoSeed_('FONDESE', 'SEGUNDA_2026', 'Segunda Convocatoria', 'rendicion_recursos', 'Rendición de recursos Segunda Convocatoria', 'hasta', '', '', '2026-11-30', '', 'Sí', 'Pendiente', 160)
    ];
  }

  if (code === 'CAMARAS_1414') {
    return [
      buildBenefitBaseHitoSeed_('CAMARAS_1414', '', '', 'visita_tecnica_solicitada', 'Visita técnica solicitada', 'fecha', '', '', '', 'Se solicita cuando exista certificado definitivo.', 'Sí', 'Pendiente', 10),
      buildBenefitBaseHitoSeed_('CAMARAS_1414', '', '', 'visita_tecnica_realizada', 'Visita técnica realizada', 'fecha', '', '', '', '', 'Sí', 'Pendiente', 20),
      buildBenefitBaseHitoSeed_('CAMARAS_1414', '', '', 'proceso_en_ejecucion', 'Proceso en ejecución', 'texto', '', '', '', 'Seguimiento operativo posterior a la visita técnica.', 'No', 'Pendiente', 30)
    ];
  }

  if (code === 'CHARLAS_CAPACITACIONES') {
    return [
      buildBenefitBaseHitoSeed_('CHARLAS_CAPACITACIONES', '', '', 'plan_anual_definido', 'Plan anual definido', 'texto', '', '', '', 'Cantidad anual editable con valor base 4.', 'No', 'Pendiente', 10),
      buildBenefitBaseHitoSeed_('CHARLAS_CAPACITACIONES', '', '', 'programacion_vigente', 'Programación vigente', 'texto', '', '', '', 'Programación o uso efectivo del beneficio por organización.', 'No', 'Pendiente', 20)
    ];
  }

  return [];
}

function buildBenefitBaseHitoSeed_(beneficioCodigo, convocatoriaCodigo, convocatoriaNombre, hitoCodigo, hitoNombre, modoFecha, fechaInicio, fechaFin, fechaReferencia, descripcionOperativa, alertaClaveFlag, estadoDefault, ordenVisual) {
  return {
    beneficio_hito_base_id: deterministicId_('BHB', [beneficioCodigo, convocatoriaCodigo, hitoCodigo]),
    beneficio_codigo: beneficioCodigo,
    convocatoria_codigo: convocatoriaCodigo || '',
    convocatoria_nombre: convocatoriaNombre || '',
    hito_codigo: hitoCodigo,
    hito_nombre: hitoNombre,
    modo_fecha: modoFecha || 'fecha',
    fecha_inicio: fechaInicio || '',
    fecha_fin: fechaFin || '',
    fecha_referencia: fechaReferencia || '',
    descripcion_operativa: descripcionOperativa || '',
    alerta_clave_flag: alertaClaveFlag || 'No',
    estado_hito_default: estadoDefault || 'Pendiente',
    orden_visual: ordenVisual || 0,
    activo_flag: 'Sí'
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
  const seeds = getSystemBenefitSeeds_();

  upsertRowsByKey_(GO_PES_V2.SHEETS.DIM_BENEFICIOS, 'beneficio_codigo', seeds.map(function(seed) {
    return {
      beneficio_codigo: seed.beneficio_codigo,
      beneficio_nombre: seed.beneficio_nombre,
      descripcion_beneficio: seed.descripcion_beneficio,
      instrumento_tipo: seed.instrumento_tipo,
      origen_instrumento: seed.origen_instrumento,
      elegibilidad_tipo: seed.elegibilidad_tipo,
      elegibilidad_label: seed.elegibilidad_label,
      activo_flag: seed.activo_flag,
      system_flag: seed.system_flag,
      updated_by: actor,
      updated_at: now
    };
  }), false);

  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE, 'beneficio_detalle_id', seeds.map(function(seed) {
    return Object.assign({}, seed, {
      beneficio_detalle_id: deterministicId_('BDC', [seed.beneficio_codigo]),
      nombre_beneficio: seed.beneficio_nombre,
      alerta_origen_modulo: 'Módulo 0',
      updated_by: actor,
      updated_at: now
    });
  }), false);

  seeds.forEach(function(seed) {
    const existing = (filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS, 'beneficio_codigo', seed.beneficio_codigo, false) || []).length;
    if (!existing) {
      replaceBenefitBaseHitos_(seed.beneficio_codigo, normalizeBenefitBaseHitosForStorage_(seed.beneficio_codigo, getSystemBenefitTemplateHitos_(seed.beneficio_codigo), actor, now));
    }
  });
}

function getBeneficiosModuloPanel(payload) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'administrador', 'superuser']);
  payload = payload || {};
  ensureBenefitsModuleReady_();

  const selectedCode = String(payload.beneficio_codigo || '').trim().toUpperCase();
  const selectedOrgId = String(payload.organizacion_id || '').trim();
  const benefits = getBenefitDefinitions_(true);
  const allBenefits = getBenefitDefinitions_(false);

  if (!selectedCode && benefits.length) {
    return serializeForClient_(buildBeneficiosPanelPayload_(benefits[0].beneficio_codigo, selectedOrgId, benefits, allBenefits));
  }

  return serializeForClient_(buildBeneficiosPanelPayload_(selectedCode, selectedOrgId, benefits, allBenefits));
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
  if (!benefit || !org) throw new Error('No se encontró la definición solicitada.');

  const eligibility = evaluateBenefitEligibility_(benefit, org);
  const assignment = findBenefitOrgRow_(beneficioCodigo, organizacionId);
  const baseHitos = getBenefitBaseHitos_(beneficioCodigo);
  const orgHitos = assignment ? getBenefitOrgHitos_(assignment.beneficio_org_id) : [];
  const mergedHitos = mergeOrgHitosWithBase_(beneficioCodigo, organizacionId, assignment && assignment.beneficio_org_id || '', baseHitos, orgHitos);

  const assignmentClient = assignment
    ? normalizeBenefitOrgClient_(assignment, mergedHitos)
    : buildDraftBenefitOrgClient_(benefit, org, eligibility, mergedHitos);

  return serializeForClient_({
    beneficio: benefit,
    organizacion: pickBenefitOrgClientFields_(org),
    elegibilidad: eligibility,
    asignacion: assignmentClient,
    hitos: mergedHitos
  });
}

function guardarBeneficioDefinicion(payload) {
  const user = requireModuleAccess_('instrumento', ['coordinador', 'administrador', 'superuser']);
  payload = payload || {};
  ensureBenefitsModuleReady_();

  const isNew = !String(payload.beneficio_codigo || '').trim();
  const beneficioCodigo = isNew
    ? slugify_(payload.beneficio_nombre || '').toUpperCase()
    : String(payload.beneficio_codigo || '').trim().toUpperCase();
  if (!beneficioCodigo) throw new Error('Debes indicar un nombre o código para el beneficio.');
  if (!String(payload.beneficio_nombre || '').trim()) throw new Error('Falta nombre del beneficio.');
  if (!String(payload.elegibilidad_tipo || '').trim()) throw new Error('Falta elegibilidad_tipo.');

  const now = new Date();
  const existingDim = getBenefitByCode_(beneficioCodigo, false);
  const systemFlag = existingDim ? existingDim.system_flag : 'No';
  const activeFlag = toSiNo_(payload.activo_flag === undefined ? true : payload.activo_flag);

  upsertByKey_(GO_PES_V2.SHEETS.DIM_BENEFICIOS, 'beneficio_codigo', {
    beneficio_codigo: beneficioCodigo,
    beneficio_nombre: String(payload.beneficio_nombre || '').trim(),
    descripcion_beneficio: String(payload.descripcion_beneficio || '').trim(),
    instrumento_tipo: String(payload.instrumento_tipo || 'beneficio_municipal').trim(),
    origen_instrumento: String(payload.origen_instrumento || 'municipal').trim(),
    elegibilidad_tipo: String(payload.elegibilidad_tipo || '').trim(),
    elegibilidad_label: String(payload.elegibilidad_label || buildEligibilityLabel_(payload.elegibilidad_tipo)).trim(),
    activo_flag: activeFlag,
    system_flag: systemFlag || 'No',
    updated_by: user.email,
    updated_at: now
  }, false);

  upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE, 'beneficio_detalle_id', {
    beneficio_detalle_id: existingDim ? deterministicId_('BDC', [beneficioCodigo]) : deterministicId_('BDC', [beneficioCodigo]),
    beneficio_codigo: beneficioCodigo,
    nombre_beneficio: String(payload.beneficio_nombre || '').trim(),
    descripcion_beneficio: String(payload.descripcion_beneficio || '').trim(),
    instrumento_tipo: String(payload.instrumento_tipo || 'beneficio_municipal').trim(),
    origen_instrumento: String(payload.origen_instrumento || 'municipal').trim(),
    elegibilidad_tipo: String(payload.elegibilidad_tipo || '').trim(),
    elegibilidad_label: String(payload.elegibilidad_label || buildEligibilityLabel_(payload.elegibilidad_tipo)).trim(),
    requiere_certificado_provisorio_flag: toSiNo_(String(payload.elegibilidad_tipo || '').trim() === 'certificado_provisorio'),
    requiere_certificado_definitivo_flag: toSiNo_(String(payload.elegibilidad_tipo || '').trim() === 'certificado_definitivo'),
    requiere_proceso_100_flag: toSiNo_(String(payload.elegibilidad_tipo || '').trim() === 'proceso_100'),
    cantidad_anual_capacitaciones: asNumberOrBlank_(payload.cantidad_anual_capacitaciones),
    cantidad_default_capacitaciones: asNumberOrBlank_(payload.cantidad_default_capacitaciones),
    llamados_por_anio: asNumberOrBlank_(payload.llamados_por_anio),
    visita_tecnica_requerida_flag: toSiNo_(payload.visita_tecnica_requerida_flag),
    flujo_inicio_default: String(payload.flujo_inicio_default || '').trim(),
    alerta_origen_modulo: 'Módulo 0',
    activo_flag: activeFlag,
    system_flag: systemFlag || 'No',
    updated_by: user.email,
    updated_at: now
  }, false);

  const hitos = normalizeBenefitBaseHitosForStorage_(beneficioCodigo, Array.isArray(payload.hitos) ? payload.hitos : [], user.email, now);
  replaceBenefitBaseHitos_(beneficioCodigo, hitos);
  syncBenefitInstrumentCatalog_(beneficioCodigo);

  logUserAction_('UPSERT_BENEFICIO_DEF', 'beneficio', beneficioCodigo, 'OK', { activo_flag: activeFlag });
  return serializeForClient_({ ok: true, beneficio_codigo: beneficioCodigo });
}

function desactivarBeneficio(payload) {
  const user = requireModuleAccess_('instrumento', ['coordinador', 'administrador', 'superuser']);
  payload = payload || {};
  ensureBenefitsModuleReady_();

  const beneficioCodigo = String(payload.beneficio_codigo || '').trim().toUpperCase();
  if (!beneficioCodigo) throw new Error('Falta beneficio_codigo.');

  const dim = getBenefitByCode_(beneficioCodigo, false);
  const config = findBenefitConfig_(beneficioCodigo, false);
  if (!dim || !config) throw new Error('No se encontró el beneficio indicado.');
  const now = new Date();

  upsertByKey_(GO_PES_V2.SHEETS.DIM_BENEFICIOS, 'beneficio_codigo', Object.assign({}, dim, {
    activo_flag: 'No',
    updated_by: user.email,
    updated_at: now
  }), false);

  upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE, 'beneficio_detalle_id', Object.assign({}, config, {
    activo_flag: 'No',
    updated_by: user.email,
    updated_at: now
  }), false);

  syncBenefitInstrumentCatalog_(beneficioCodigo);
  logUserAction_('DEACTIVATE_BENEFICIO', 'beneficio', beneficioCodigo, 'OK', {});
  return serializeForClient_({ ok: true, beneficio_codigo: beneficioCodigo, activo_flag: 'No' });
}

function guardarBeneficioOrganizacion(payload) {
  const user = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'administrador', 'superuser']);
  payload = payload || {};
  ensureBenefitsModuleReady_();

  const beneficioCodigo = String(payload.beneficio_codigo || '').trim().toUpperCase();
  const organizacionId = String(payload.organizacion_id || '').trim();
  if (!beneficioCodigo) throw new Error('Falta beneficio_codigo.');
  if (!organizacionId) throw new Error('Falta organizacion_id.');

  const benefit = getBenefitByCode_(beneficioCodigo, false);
  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!benefit || !org) throw new Error('No se encontró el beneficio u organización indicada.');

  const eligibility = evaluateBenefitEligibility_(benefit, org);
  const existing = findBenefitOrgRow_(beneficioCodigo, organizacionId);
  if (!existing && !eligibility.cumple_flag) {
    throw new Error('La organización no cumple la elegibilidad actual para incorporarse al beneficio.');
  }

  const now = new Date();
  const beneficioOrgId = existing && existing.beneficio_org_id
    ? existing.beneficio_org_id
    : nextId_('beneficio_org', 'BOR');
  const orgInstrumentoId = existing && existing.org_instrumento_id
    ? existing.org_instrumento_id
    : (findBenefitInstrumentMirror_(beneficioCodigo, organizacionId)?.org_instrumento_id || nextId_('instrumento', 'OIN'));

  const baseHitos = getBenefitBaseHitos_(beneficioCodigo);
  const normalizedHitos = normalizeBenefitOrgHitosForStorage_(
    beneficioCodigo,
    organizacionId,
    beneficioOrgId,
    Array.isArray(payload.hitos) ? payload.hitos : [],
    baseHitos,
    user.email,
    now
  );
  const progress = calculateBenefitProgress_(normalizedHitos);

  const row = {
    beneficio_org_id: beneficioOrgId,
    beneficio_codigo: beneficioCodigo,
    organizacion_id: organizacionId,
    org_instrumento_id: orgInstrumentoId,
    elegible_flag: toSiNo_(eligibility.cumple_flag),
    criterio_elegibilidad: eligibility.label,
    motivo_no_elegibilidad: eligibility.cumple_flag ? '' : eligibility.detalle,
    activo_flag: toSiNo_(payload.activo_flag === undefined ? true : payload.activo_flag),
    estado_beneficio: String(payload.estado_beneficio || existing && existing.estado_beneficio || 'Activo en beneficio').trim(),
    avance_beneficio_pct: progress,
    proximo_hito_beneficio: String(payload.proximo_hito_beneficio || findNextPendingOrgHitoLabel_(normalizedHitos) || '').trim(),
    fecha_inicio_beneficio: asDateOrBlank_(payload.fecha_inicio_beneficio || existing && existing.fecha_inicio_beneficio || new Date()),
    fecha_termino_beneficio: asDateOrBlank_(payload.fecha_termino_beneficio || ''),
    resultado_beneficio: String(payload.resultado_beneficio || existing && existing.resultado_beneficio || '').trim(),
    responsable_beneficio: String(payload.responsable_beneficio || existing && existing.responsable_beneficio || org.responsable_actual || user.nombre_visible || '').trim(),
    observacion_beneficio: String(payload.observacion_beneficio || existing && existing.observacion_beneficio || '').trim(),
    updated_by: user.email,
    updated_at: now
  };

  upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_org_id', row, false);
  replaceBenefitOrgHitos_(beneficioOrgId, normalizedHitos);
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
  if (!row) throw new Error('No se encontró la asignación del beneficio para la organización.');

  upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_org_id', Object.assign({}, row, {
    activo_flag: 'No',
    estado_beneficio: 'Inactivo',
    updated_by: user.email,
    updated_at: new Date()
  }), false);

  const benefit = getBenefitByCode_(beneficioCodigo, false);
  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (benefit && org) {
    syncInstrumentoMirrorFromBenefitOrg_(benefit, org, Object.assign({}, row, {
      activo_flag: 'No',
      estado_beneficio: 'Inactivo',
      resultado_beneficio: 'No aplica'
    }));
  }

  return serializeForClient_({ ok: true, beneficio_codigo: beneficioCodigo, organizacion_id: organizacionId, activo_flag: 'No' });
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
  getBenefitDefinitions_(false).forEach(function(benefit) {
    syncBenefitInstrumentCatalog_(benefit.beneficio_codigo);
    ensureBenefitOrgRowsFromLegacy_(benefit.beneficio_codigo);
  });
}

function buildBeneficiosPanelPayload_(selectedCode, selectedOrgId, activeBenefits, allBenefits) {
  const targetCode = selectedCode || (activeBenefits[0] && activeBenefits[0].beneficio_codigo) || '';
  const selectedBenefit = getBenefitByCode_(targetCode, false);
  const organizationsPanel = selectedBenefit ? buildBenefitOrganizationsPanel_(selectedBenefit) : {
    activas: [],
    elegibles: [],
    no_elegibles: []
  };
  const selectedOrgDetail = (selectedBenefit && selectedOrgId)
    ? getBeneficioOrganizacionDetalle({ beneficio_codigo: selectedBenefit.beneficio_codigo, organizacion_id: selectedOrgId })
    : '';

  const benefitCards = allBenefits.map(function(benefit) {
    const panel = buildBenefitOrganizationsPanel_(benefit);
    return {
      beneficio_codigo: benefit.beneficio_codigo,
      beneficio_nombre: benefit.beneficio_nombre,
      descripcion_beneficio: benefit.descripcion_beneficio,
      activo_flag: benefit.activo_flag,
      system_flag: benefit.system_flag,
      elegibilidad_label: benefit.elegibilidad_label,
      total_activas: panel.activas.length,
      total_elegibles: panel.elegibles.length,
      total_no_elegibles: panel.no_elegibles.length
    };
  });

  return {
    beneficios: benefitCards,
    selected_beneficio: selectedBenefit || '',
    selected_beneficio_hitos: selectedBenefit ? getBenefitBaseHitos_(selectedBenefit.beneficio_codigo) : [],
    organizaciones_panel: organizationsPanel,
    selected_org_detail: selectedOrgDetail
  };
}

function buildBenefitOrganizationsPanel_(benefit) {
  const orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES).filter(function(row) {
    return String(row.organizacion_id || '').trim() && String(row.nombre_organizacion || '').trim();
  });
  const assignments = filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_codigo', benefit.beneficio_codigo, false) || [];
  const activeByOrg = {};
  assignments.forEach(function(row) {
    if (toBool_(row.activo_flag)) activeByOrg[String(row.organizacion_id || '').trim()] = row;
  });

  const activas = [];
  const elegibles = [];
  const noElegibles = [];

  orgs.forEach(function(org) {
    const eligibility = evaluateBenefitEligibility_(benefit, org);
    const active = activeByOrg[String(org.organizacion_id || '').trim()] || null;

    if (active) {
      const hitos = getBenefitOrgHitos_(active.beneficio_org_id);
      activas.push(Object.assign(
        pickBenefitOrgClientFields_(org),
        normalizeBenefitOrgClient_(active, hitos),
        { elegibilidad_detalle: eligibility.detalle }
      ));
      return;
    }

    const base = Object.assign(pickBenefitOrgClientFields_(org), {
      criterio_elegibilidad: eligibility.label,
      detalle_elegibilidad: eligibility.detalle
    });
    if (eligibility.cumple_flag) {
      elegibles.push(base);
    } else {
      noElegibles.push(base);
    }
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
      detalle: ok ? 'La organización ya cuenta con certificado provisorio.' : 'La organización aún no registra certificado provisorio.',
      valor_actual: ok ? 'Sí' : 'No'
    };
  }

  if (tipo === 'certificado_definitivo') {
    const ok = toBool_(org.certificado_definitivo_flag);
    return {
      cumple_flag: ok,
      label: benefit.elegibilidad_label || 'Requiere certificado definitivo',
      detalle: ok ? 'La organización ya cuenta con certificado definitivo.' : 'La organización aún no registra certificado definitivo.',
      valor_actual: ok ? 'Sí' : 'No'
    };
  }

  const ok = !!contexto.proceso_completado_100_flag;
  return {
    cumple_flag: ok,
    label: benefit.elegibilidad_label || 'Requiere proceso completado al 100%',
    detalle: ok ? 'La organización cumple el proceso al 100%.' : 'La organización aún no completa el 100% del proceso.',
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

function getBenefitDefinitions_(onlyActive) {
  const rows = getSheetData_(GO_PES_V2.SHEETS.DIM_BENEFICIOS) || [];
  const configs = getSheetData_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE) || [];
  const configByCode = {};
  configs.forEach(function(row) {
    configByCode[String(row.beneficio_codigo || '').trim()] = row;
  });

  return rows.filter(function(row) {
    if (!String(row.beneficio_codigo || '').trim()) return false;
    return onlyActive ? toBool_(row.activo_flag) : true;
  }).map(function(row) {
    return Object.assign({}, row, configByCode[String(row.beneficio_codigo || '').trim()] || {});
  }).sort(function(a, b) {
    return String(a.beneficio_nombre || '').localeCompare(String(b.beneficio_nombre || ''), 'es');
  });
}

function getBenefitByCode_(beneficioCodigo, onlyActive) {
  const key = String(beneficioCodigo || '').trim().toUpperCase();
  return getBenefitDefinitions_(onlyActive !== false).find(function(row) {
    return String(row.beneficio_codigo || '').trim().toUpperCase() === key;
  }) || (onlyActive === false ? getBenefitDefinitions_(false).find(function(row) {
    return String(row.beneficio_codigo || '').trim().toUpperCase() === key;
  }) || null : null);
}

function findBenefitConfig_(beneficioCodigo, onlyActive) {
  const key = String(beneficioCodigo || '').trim().toUpperCase();
  return (getSheetData_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE) || []).find(function(row) {
    if (String(row.beneficio_codigo || '').trim().toUpperCase() !== key) return false;
    return onlyActive === false ? true : toBool_(row.activo_flag);
  }) || null;
}

function getBenefitBaseHitos_(beneficioCodigo) {
  return (filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS, 'beneficio_codigo', beneficioCodigo, false) || [])
    .filter(function(row) { return toBool_(row.activo_flag); })
    .sort(function(a, b) { return Number(a.orden_visual || 0) - Number(b.orden_visual || 0); });
}

function normalizeBenefitBaseHitosForStorage_(beneficioCodigo, hitos, userEmail, now) {
  return (hitos || []).map(function(row, index) {
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
      estado_hito_default: String(row.estado_hito_default || row.estado_hito || 'Pendiente').trim(),
      orden_visual: Number(row.orden_visual || (index + 1) * 10),
      activo_flag: toSiNo_(row.activo_flag === undefined ? true : row.activo_flag),
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
  const otherRows = getSheetData_(sheetName).filter(function(row) {
    return String(row.beneficio_codigo || '').trim() !== String(beneficioCodigo || '').trim();
  });
  replaceSheetData_(sheetName, headers, otherRows.concat(rows || []));
}

function findBenefitOrgRow_(beneficioCodigo, organizacionId) {
  return (filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_codigo', beneficioCodigo, false) || []).find(function(row) {
    return String(row.organizacion_id || '').trim() === String(organizacionId || '').trim();
  }) || null;
}

function getBenefitOrgHitos_(beneficioOrgId) {
  return (filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS, 'beneficio_org_id', beneficioOrgId, false) || [])
    .sort(function(a, b) { return Number(a.orden_visual || 0) - Number(b.orden_visual || 0); });
}

function mergeOrgHitosWithBase_(beneficioCodigo, organizacionId, beneficioOrgId, baseRows, orgRows) {
  const index = {};
  (baseRows || []).forEach(function(base) {
    const key = buildBenefitHitoKey_(base);
    index[key] = {
      beneficio_org_hito_id: deterministicId_('BOH', [beneficioOrgId || organizacionId, beneficioCodigo, key]),
      beneficio_org_id: beneficioOrgId || '',
      beneficio_codigo: beneficioCodigo,
      organizacion_id: organizacionId,
      convocatoria_codigo: base.convocatoria_codigo || '',
      convocatoria_nombre: base.convocatoria_nombre || '',
      hito_codigo: base.hito_codigo || '',
      hito_nombre: base.hito_nombre || '',
      modo_fecha: base.modo_fecha || 'fecha',
      fecha_inicio: base.fecha_inicio || '',
      fecha_fin: base.fecha_fin || '',
      fecha_referencia: base.fecha_referencia || '',
      descripcion_operativa: base.descripcion_operativa || '',
      estado_hito: base.estado_hito_default || 'Pendiente',
      alerta_clave_flag: base.alerta_clave_flag || 'No',
      orden_visual: Number(base.orden_visual || 0),
      updated_by: '',
      updated_at: ''
    };
  });

  (orgRows || []).forEach(function(row) {
    index[buildBenefitHitoKey_(row)] = Object.assign({}, index[buildBenefitHitoKey_(row)] || {}, row);
  });

  return Object.keys(index).map(function(key) {
    return index[key];
  }).sort(function(a, b) {
    return Number(a.orden_visual || 0) - Number(b.orden_visual || 0);
  });
}

function normalizeBenefitOrgHitosForStorage_(beneficioCodigo, organizacionId, beneficioOrgId, inputRows, baseRows, userEmail, now) {
  const merged = mergeOrgHitosWithBase_(beneficioCodigo, organizacionId, beneficioOrgId, baseRows, inputRows);
  return merged.map(function(row, index) {
    const key = buildBenefitHitoKey_(row);
    return {
      beneficio_org_hito_id: row.beneficio_org_hito_id || deterministicId_('BOH', [beneficioOrgId, beneficioCodigo, key]),
      beneficio_org_id: beneficioOrgId,
      beneficio_codigo: beneficioCodigo,
      organizacion_id: organizacionId,
      convocatoria_codigo: String(row.convocatoria_codigo || '').trim(),
      convocatoria_nombre: String(row.convocatoria_nombre || '').trim(),
      hito_codigo: String(row.hito_codigo || '').trim(),
      hito_nombre: String(row.hito_nombre || '').trim(),
      modo_fecha: String(row.modo_fecha || 'fecha').trim(),
      fecha_inicio: asDateOrBlank_(row.fecha_inicio),
      fecha_fin: asDateOrBlank_(row.fecha_fin),
      fecha_referencia: asDateOrBlank_(row.fecha_referencia),
      descripcion_operativa: String(row.descripcion_operativa || '').trim(),
      estado_hito: String(row.estado_hito || 'Pendiente').trim(),
      alerta_clave_flag: toSiNo_(row.alerta_clave_flag),
      orden_visual: Number(row.orden_visual || (index + 1) * 10),
      updated_by: userEmail || '',
      updated_at: now || new Date()
    };
  });
}

function replaceBenefitOrgHitos_(beneficioOrgId, rows) {
  const sheetName = GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS;
  const headers = buildSheetDefinitions_()[sheetName];
  const otherRows = getSheetData_(sheetName).filter(function(row) {
    return String(row.beneficio_org_id || '').trim() !== String(beneficioOrgId || '').trim();
  });
  replaceSheetData_(sheetName, headers, otherRows.concat(rows || []));
}

function buildBenefitHitoKey_(row) {
  return [
    String(row.convocatoria_codigo || '').trim(),
    String(row.hito_codigo || '').trim()
  ].join('||');
}

function calculateBenefitProgress_(rows) {
  const total = (rows || []).length;
  if (!total) return 0;
  const completed = (rows || []).filter(function(row) {
    return normalizeText_(row.estado_hito) === 'cumplido';
  }).length;
  return Math.round((completed / total) * 100);
}

function findNextPendingOrgHitoLabel_(rows) {
  const pending = (rows || []).find(function(row) {
    return normalizeText_(row.estado_hito) !== 'cumplido';
  });
  return pending ? pending.hito_nombre : '';
}

function normalizeBenefitOrgClient_(row, hitos) {
  return {
    beneficio_org_id: row.beneficio_org_id || '',
    org_instrumento_id: row.org_instrumento_id || '',
    activo_flag: row.activo_flag || '',
    estado_beneficio: row.estado_beneficio || '',
    avance_beneficio_pct: row.avance_beneficio_pct === '' ? calculateBenefitProgress_(hitos || []) : row.avance_beneficio_pct,
    proximo_hito_beneficio: row.proximo_hito_beneficio || findNextPendingOrgHitoLabel_(hitos || []),
    fecha_inicio_beneficio: row.fecha_inicio_beneficio || '',
    fecha_termino_beneficio: row.fecha_termino_beneficio || '',
    resultado_beneficio: row.resultado_beneficio || '',
    responsable_beneficio: row.responsable_beneficio || '',
    observacion_beneficio: row.observacion_beneficio || ''
  };
}

function buildDraftBenefitOrgClient_(benefit, org, eligibility, hitos) {
  return {
    beneficio_org_id: '',
    org_instrumento_id: '',
    activo_flag: 'Sí',
    estado_beneficio: 'Activo en beneficio',
    avance_beneficio_pct: calculateBenefitProgress_(hitos || []),
    proximo_hito_beneficio: findNextPendingOrgHitoLabel_(hitos || []) || benefit.flujo_inicio_default || '',
    fecha_inicio_beneficio: new Date(),
    fecha_termino_beneficio: '',
    resultado_beneficio: '',
    responsable_beneficio: org.responsable_actual || '',
    observacion_beneficio: '',
    criterio_elegibilidad: eligibility.label,
    motivo_no_elegibilidad: eligibility.cumple_flag ? '' : eligibility.detalle
  };
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

function buildEligibilityLabel_(tipo) {
  const key = String(tipo || '').trim();
  if (key === 'certificado_provisorio') return 'Requiere certificado provisorio';
  if (key === 'certificado_definitivo') return 'Requiere certificado definitivo';
  if (key === 'proceso_100') return 'Requiere proceso completado al 100%';
  return 'Regla de elegibilidad';
}

function syncBenefitInstrumentCatalog_(beneficioCodigo) {
  const benefit = getBenefitByCode_(beneficioCodigo, false);
  if (!benefit) return;
  upsertByKey_(GO_PES_V2.SHEETS.DIM_INSTRUMENTOS, 'instrumento_codigo_catalogo', {
    instrumento_codigo_catalogo: benefit.beneficio_codigo,
    instrumento_nombre: benefit.beneficio_nombre,
    instrumento_tipo: benefit.instrumento_tipo || 'beneficio_municipal',
    origen_instrumento: benefit.origen_instrumento || 'municipal',
    activo_flag: toBool_(benefit.activo_flag)
  }, false);
}

function findBenefitInstrumentMirror_(beneficioCodigo, organizacionId) {
  return (filterByField_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'organizacion_id', organizacionId, false) || []).find(function(row) {
    return String(row.instrumento_codigo_catalogo || '').trim() === String(beneficioCodigo || '').trim();
  }) || null;
}

function syncInstrumentoMirrorFromBenefitOrg_(benefit, org, row) {
  const now = new Date();
  const status = toBool_(row.activo_flag) ? (row.estado_beneficio || 'Activo en beneficio') : 'Inactivo';
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
    estado_instrumento: status,
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
  const benefit = getBenefitByCode_(beneficioCodigo, false);
  if (!benefit) return;

  const instruments = filterByField_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'instrumento_codigo_catalogo', beneficioCodigo, false) || [];
  const now = new Date();
  const baseHitos = getBenefitBaseHitos_(beneficioCodigo);

  instruments.forEach(function(inst) {
    const orgId = String(inst.organizacion_id || '').trim();
    if (!orgId) return;
    const existing = findBenefitOrgRow_(beneficioCodigo, orgId);
    if (existing) return;

    const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', orgId, false);
    if (!org) return;
    const eligibility = evaluateBenefitEligibility_(benefit, org);
    const beneficioOrgId = nextId_('beneficio_org', 'BOR');
    const hitos = normalizeBenefitOrgHitosForStorage_(beneficioCodigo, orgId, beneficioOrgId, [], baseHitos, 'system', now);
    const progress = inst.avance_instrumento_pct !== '' ? asNumberOrBlank_(inst.avance_instrumento_pct) : calculateBenefitProgress_(hitos);

    upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_org_id', {
      beneficio_org_id: beneficioOrgId,
      beneficio_codigo: beneficioCodigo,
      organizacion_id: orgId,
      org_instrumento_id: inst.org_instrumento_id || nextId_('instrumento', 'OIN'),
      elegible_flag: toSiNo_(eligibility.cumple_flag),
      criterio_elegibilidad: eligibility.label,
      motivo_no_elegibilidad: eligibility.cumple_flag ? '' : eligibility.detalle,
      activo_flag: toSiNo_(normalizeText_(inst.estado_instrumento) !== 'cerrado' && normalizeText_(inst.estado_instrumento) !== 'desistido'),
      estado_beneficio: inst.estado_instrumento || 'Activo en beneficio',
      avance_beneficio_pct: progress,
      proximo_hito_beneficio: inst.proximo_hito_instrumento || findNextPendingOrgHitoLabel_(hitos),
      fecha_inicio_beneficio: asDateOrBlank_(inst.fecha_inicio_gestion) || now,
      fecha_termino_beneficio: asDateOrBlank_(inst.fecha_cierre_instrumento),
      resultado_beneficio: inst.resultado_instrumento || '',
      responsable_beneficio: inst.responsable_instrumento || org.responsable_actual || '',
      observacion_beneficio: inst.observacion_instrumento || '',
      updated_by: 'system',
      updated_at: now
    }, false);
    replaceBenefitOrgHitos_(beneficioOrgId, hitos);
  });
}
