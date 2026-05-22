function getBeneficiosBaseDefinitions_() {
  return [
    {
      beneficio_codigo: 'CHARLAS_CAPACITACIONES',
      beneficio_nombre: 'Charlas y capacitaciones',
      instrumento_tipo: 'capacitacion_municipal',
      origen_instrumento: 'municipal',
      anio_operativo_default: new Date().getFullYear(),
      estado_instrumento_default: 'Identificado',
      resultado_instrumento_default: 'No aplica',
      proximo_hito_default: 'Definir plan anual de capacitaciones',
      elegibilidad_tipo: 'certificado_provisorio',
      elegibilidad_label: 'Requiere certificado provisorio',
      descripcion: 'Plan anual editable de capacitaciones para organizaciones con certificado provisorio.',
      cantidad_anual_default: 4
    },
    {
      beneficio_codigo: 'FONDESE',
      beneficio_nombre: 'Fondese',
      instrumento_tipo: 'fondo_municipal',
      origen_instrumento: 'municipal',
      anio_operativo_default: 2026,
      estado_instrumento_default: 'Identificado',
      resultado_instrumento_default: 'Pendiente',
      proximo_hito_default: 'Revisar calendario de convocatorias FONDESE',
      elegibilidad_tipo: 'proceso_100',
      elegibilidad_label: 'Requiere proceso completado al 100%',
      descripcion: 'Dos convocatorias anuales con hitos y fechas editables para seguimiento y alertas.'
    },
    {
      beneficio_codigo: 'CAMARAS_1414',
      beneficio_nombre: 'Cámaras 1414',
      instrumento_tipo: 'beneficio_municipal',
      origen_instrumento: 'municipal',
      anio_operativo_default: new Date().getFullYear(),
      estado_instrumento_default: 'Identificado',
      resultado_instrumento_default: 'No aplica',
      proximo_hito_default: 'Solicitar visita técnica tras certificado definitivo',
      elegibilidad_tipo: 'certificado_definitivo',
      elegibilidad_label: 'Requiere certificado definitivo',
      descripcion: 'Activa el flujo de visita técnica como hito preparatorio para alertas futuras.'
    }
  ];
}

function getBeneficiosModuloDetalle(payload) {
  const user = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'administrador', 'superuser']);
  const organizacionId = String(payload && payload.organizacion_id || '').trim();
  if (!organizacionId) throw new Error('Falta organizacion_id.');

  ensureSheetsSubset_([
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS
  ]);

  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!org) throw new Error('No se encontró la organización indicada.');

  const defs = getBeneficiosBaseDefinitions_();
  const codes = defs.map(function(def) { return def.beneficio_codigo; });
  const instrumentos = filterByField_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'organizacion_id', organizacionId, false)
    .filter(function(row) {
      return codes.indexOf(String(row.instrumento_codigo_catalogo || '').trim()) !== -1;
    });
  const detalles = filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE, 'organizacion_id', organizacionId, false) || [];
  const hitos = filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS, 'organizacion_id', organizacionId, false) || [];

  goPesEnsureBeneficioSupportRowsForExistingRecords_(org, instrumentos, detalles, hitos, user);

  const detallesRefrescados = filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE, 'organizacion_id', organizacionId, false) || [];
  const hitosRefrescados = filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS, 'organizacion_id', organizacionId, false) || [];
  const contexto = goPesBuildBeneficiosContext_(org);

  const instrumentosByCode = {};
  instrumentos.forEach(function(row) {
    instrumentosByCode[String(row.instrumento_codigo_catalogo || '').trim()] = row;
  });

  const detalleByCode = {};
  detallesRefrescados.forEach(function(row) {
    detalleByCode[String(row.beneficio_codigo || '').trim()] = row;
  });

  const hitosByCode = {};
  hitosRefrescados.forEach(function(row) {
    const code = String(row.beneficio_codigo || '').trim();
    if (!hitosByCode[code]) hitosByCode[code] = [];
    hitosByCode[code].push(row);
  });

  const beneficios = defs.map(function(def) {
    const code = def.beneficio_codigo;
    const instrumento = instrumentosByCode[code] || null;
    const detalle = detalleByCode[code] || null;
    const elegibilidad = goPesBuildBeneficioElegibilidad_(def, org, contexto);
    const beneficioHitos = goPesBuildBeneficioHitosForClient_(def, organizacionId, instrumento, hitosByCode[code] || []);
    const proximoHito = goPesFindNextBeneficioHito_(beneficioHitos);
    const estadoInstrumento = instrumento && instrumento.estado_instrumento
      ? String(instrumento.estado_instrumento)
      : def.estado_instrumento_default;
    const detalleEspecifico = goPesBuildBeneficioDetalleForClient_(def, detalle, beneficioHitos);

    return {
      beneficio_codigo: code,
      beneficio_nombre: def.beneficio_nombre,
      descripcion: def.descripcion,
      org_instrumento_id: instrumento && instrumento.org_instrumento_id || '',
      persisted_flag: !!(instrumento && instrumento.org_instrumento_id),
      disponible_flag: elegibilidad.cumple_flag,
      disponibilidad_label: elegibilidad.cumple_flag ? 'Disponible' : 'No disponible',
      elegibilidad: elegibilidad,
      estado_instrumento: estadoInstrumento,
      resultado_instrumento: instrumento && instrumento.resultado_instrumento || def.resultado_instrumento_default,
      responsable_instrumento: instrumento && instrumento.responsable_instrumento || org.responsable_actual || '',
      proximo_hito_instrumento: instrumento && instrumento.proximo_hito_instrumento || proximoHito.label || def.proximo_hito_default,
      observacion_instrumento: instrumento && instrumento.observacion_instrumento || '',
      anio_operativo: instrumento && instrumento.anio_convocatoria || def.anio_operativo_default,
      detalle: detalleEspecifico,
      hitos: beneficioHitos,
      proximo_hito: proximoHito,
      alertas_preparadas: beneficioHitos.filter(function(row) { return toBool_(row.alerta_clave_flag); }).length
    };
  });

  return serializeForClient_({
    organizacion: {
      organizacion_id: org.organizacion_id || '',
      solicitud_id: org.solicitud_id || '',
      nombre_organizacion: org.nombre_organizacion || '',
      estado_constitucion: org.estado_constitucion || '',
      estado_general_organizacion: goPesMapVisibleEstadoGeneral_(org.estado_general_organizacion || ''),
      certificado_provisorio_flag: org.certificado_provisorio_flag || '',
      certificado_definitivo_flag: org.certificado_definitivo_flag || '',
      responsable_actual: org.responsable_actual || '',
      updated_at: org.updated_at || ''
    },
    resumen: {
      proceso_completado_pct: contexto.proceso_completado_pct,
      proceso_completado_100_flag: contexto.proceso_completado_100_flag,
      fuente_proceso: contexto.fuente_proceso,
      beneficios_totales: beneficios.length,
      beneficios_disponibles: beneficios.filter(function(row) { return row.disponible_flag; }).length,
      hitos_alertables: beneficios.reduce(function(acc, row) {
        return acc + Number(row.alertas_preparadas || 0);
      }, 0)
    },
    beneficios: beneficios
  });
}

function guardarBeneficioModulo(payload) {
  const user = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'administrador', 'superuser']);
  payload = payload || {};

  const organizacionId = String(payload.organizacion_id || '').trim();
  const beneficioCodigo = String(payload.beneficio_codigo || '').trim().toUpperCase();
  if (!organizacionId) throw new Error('Falta organizacion_id.');
  if (!beneficioCodigo) throw new Error('Falta beneficio_codigo.');

  const def = getBeneficioDefinitionByCode_(beneficioCodigo);
  if (!def) throw new Error('El beneficio indicado no está soportado por el módulo.');

  ensureSheetsSubset_([
    GO_PES_V2.SHEETS.RAW_INSTRUMENTOS,
    GO_PES_V2.SHEETS.FACT_INSTRUMENTOS,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS
  ]);

  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!org) throw new Error('No se encontró la organización indicada.');

  const now = new Date();
  const existingInstrumento = goPesFindBeneficioInstrumento_(organizacionId, beneficioCodigo);
  const orgInstrumentoId = existingInstrumento && existingInstrumento.org_instrumento_id
    ? existingInstrumento.org_instrumento_id
    : nextId_('instrumento', 'OIN');

  const hitosInput = Array.isArray(payload.hitos) ? payload.hitos : [];
  const hitos = goPesNormalizePersistedBeneficioHitos_(def, organizacionId, orgInstrumentoId, hitosInput, now, user.email);
  const proximoHito = goPesFindNextBeneficioHito_(hitos);
  const detallePayload = payload.detalle || {};

  const estadoInstrumento = String(payload.estado_instrumento || existingInstrumento && existingInstrumento.estado_instrumento || def.estado_instrumento_default).trim();
  const resultadoInstrumento = String(payload.resultado_instrumento || existingInstrumento && existingInstrumento.resultado_instrumento || def.resultado_instrumento_default).trim();
  const responsable = String(payload.responsable_instrumento || existingInstrumento && existingInstrumento.responsable_instrumento || org.responsable_actual || user.nombre_visible || user.email || '').trim();
  const observacion = String(payload.observacion_instrumento || existingInstrumento && existingInstrumento.observacion_instrumento || '').trim();
  const anioOperativo = Number(payload.anio_operativo || existingInstrumento && existingInstrumento.anio_convocatoria || def.anio_operativo_default) || def.anio_operativo_default;

  appendRowObject_(GO_PES_V2.SHEETS.RAW_INSTRUMENTOS, {
    created_at: now,
    source: 'WEB_APP_BENEFICIOS',
    user_email: user.email,
    organizacion_id: organizacionId,
    org_instrumento_id: orgInstrumentoId,
    instrumento_codigo_catalogo: beneficioCodigo,
    instrumento_nombre_otro: '',
    instrumento_tipo: def.instrumento_tipo,
    origen_instrumento: def.origen_instrumento,
    anio_convocatoria: anioOperativo,
    nombre_convocatoria: payload.nombre_convocatoria || def.beneficio_nombre,
    numero_llamado: payload.numero_llamado || '',
    fecha_inicio_gestion: asDateOrBlank_(payload.fecha_inicio_gestion) || now,
    fecha_apertura: asDateOrBlank_(payload.fecha_apertura),
    fecha_cierre: asDateOrBlank_(payload.fecha_cierre),
    fecha_habilitacion: asDateOrBlank_(payload.fecha_habilitacion),
    fecha_postulacion: asDateOrBlank_(payload.fecha_postulacion),
    fecha_resultado: asDateOrBlank_(payload.fecha_resultado),
    fecha_cierre_instrumento: asDateOrBlank_(payload.fecha_cierre_instrumento),
    estado_instrumento: estadoInstrumento,
    subestado_instrumento: String(payload.subestado_instrumento || '').trim(),
    avance_instrumento_pct: asNumberOrBlank_(payload.avance_instrumento_pct),
    proximo_hito_instrumento: String(payload.proximo_hito_instrumento || proximoHito.label || def.proximo_hito_default).trim(),
    resultado_instrumento: resultadoInstrumento,
    monto_solicitado: asNumberOrBlank_(payload.monto_solicitado),
    monto_adjudicado: asNumberOrBlank_(payload.monto_adjudicado),
    monto_ejecutado: asNumberOrBlank_(payload.monto_ejecutado),
    responsable_instrumento: responsable,
    contraparte: String(payload.contraparte || '').trim(),
    observacion_instrumento: observacion,
    documento_respaldo_url: String(payload.documento_respaldo_url || '').trim(),
    legacy_source: '',
    legacy_key: ''
  });

  upsertByKey_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'org_instrumento_id', {
    org_instrumento_id: orgInstrumentoId,
    organizacion_id: organizacionId,
    instrumento_codigo_catalogo: beneficioCodigo,
    instrumento_nombre_otro: '',
    instrumento_tipo: def.instrumento_tipo,
    origen_instrumento: def.origen_instrumento,
    anio_convocatoria: anioOperativo,
    nombre_convocatoria: payload.nombre_convocatoria || def.beneficio_nombre,
    numero_llamado: payload.numero_llamado || '',
    fecha_inicio_gestion: asDateOrBlank_(payload.fecha_inicio_gestion) || now,
    fecha_apertura: asDateOrBlank_(payload.fecha_apertura),
    fecha_cierre: asDateOrBlank_(payload.fecha_cierre),
    fecha_habilitacion: asDateOrBlank_(payload.fecha_habilitacion),
    fecha_postulacion: asDateOrBlank_(payload.fecha_postulacion),
    fecha_resultado: asDateOrBlank_(payload.fecha_resultado),
    fecha_cierre_instrumento: asDateOrBlank_(payload.fecha_cierre_instrumento),
    estado_instrumento: estadoInstrumento,
    subestado_instrumento: String(payload.subestado_instrumento || '').trim(),
    avance_instrumento_pct: asNumberOrBlank_(payload.avance_instrumento_pct),
    proximo_hito_instrumento: String(payload.proximo_hito_instrumento || proximoHito.label || def.proximo_hito_default).trim(),
    resultado_instrumento: resultadoInstrumento,
    monto_solicitado: asNumberOrBlank_(payload.monto_solicitado),
    monto_adjudicado: asNumberOrBlank_(payload.monto_adjudicado),
    monto_ejecutado: asNumberOrBlank_(payload.monto_ejecutado),
    responsable_instrumento: responsable,
    contraparte: String(payload.contraparte || '').trim(),
    observacion_instrumento: observacion,
    documento_respaldo_url: String(payload.documento_respaldo_url || '').trim(),
    updated_by: user.email,
    updated_at: now
  });

  goPesUpsertBeneficioDetalleRow_(def, organizacionId, orgInstrumentoId, detallePayload, now, user.email);
  goPesReplaceBeneficioHitos_(organizacionId, beneficioCodigo, hitos);

  refreshPartialArtifacts_({
    masterSolicitudIds: [org.solicitud_id || ''],
    vistaOrganizacionIds: [organizacionId],
    vistaInstrumentoIds: [orgInstrumentoId],
    vistaTerritorialPairs: [{
      uv: org.uv || '',
      sector: org.sector || ''
    }]
  });

  logProcessing_('INFO', 'guardarBeneficioModulo', 'beneficio', orgInstrumentoId, user.email, 'OK', {
    organizacion_id: organizacionId,
    beneficio_codigo: beneficioCodigo
  });
  logUserAction_('UPSERT_BENEFICIO', 'beneficio', orgInstrumentoId, 'OK', {
    organizacion_id: organizacionId,
    beneficio_codigo: beneficioCodigo
  });

  return serializeForClient_({
    ok: true,
    organizacion_id: organizacionId,
    org_instrumento_id: orgInstrumentoId,
    beneficio_codigo: beneficioCodigo
  });
}

function getBeneficioDefinitionByCode_(codigo) {
  const key = String(codigo || '').trim().toUpperCase();
  return getBeneficiosBaseDefinitions_().find(function(def) {
    return String(def.beneficio_codigo || '').trim().toUpperCase() === key;
  }) || null;
}

function goPesBuildBeneficiosContext_(org) {
  if (typeof goPesApplyAvancePhase1Config_ === 'function') {
    try {
      goPesApplyAvancePhase1Config_();
    } catch (err) {}
  }

  const orgId = String(org && org.organizacion_id || '').trim();
  const defaultContext = {
    proceso_completado_pct: 0,
    proceso_completado_100_flag: false,
    fuente_proceso: 'organizacion'
  };
  if (!orgId) return defaultContext;

  const viewSheet = GO_PES_V2.SHEETS.VW_AVANCE_ORGANIZACION;
  const avance = viewSheet && sheetExists_(viewSheet)
    ? findByField_(viewSheet, 'organizacion_id', orgId, false)
    : null;

  const totalHitos = Number(avance && avance.total_hitos_tramo_pre || 0) + Number(avance && avance.total_hitos_tramo_for || 0);
  const cumplidos = Number(avance && avance.total_hitos_cumplidos || 0);
  if (totalHitos > 0) {
    const pct = Math.max(0, Math.min(100, Math.round((cumplidos / totalHitos) * 100)));
    return {
      proceso_completado_pct: pct,
      proceso_completado_100_flag: cumplidos >= totalHitos,
      fuente_proceso: 'avance'
    };
  }

  const fallbackComplete = toBool_(org.certificado_definitivo_flag) ||
    toBool_(org.organizacion_constituida_flag) ||
    normalizeText_(org.estado_constitucion) === 'constituida';

  return {
    proceso_completado_pct: fallbackComplete ? 100 : 0,
    proceso_completado_100_flag: fallbackComplete,
    fuente_proceso: 'organizacion'
  };
}

function goPesBuildBeneficioElegibilidad_(def, org, contexto) {
  const provisorio = toBool_(org.certificado_provisorio_flag);
  const definitivo = toBool_(org.certificado_definitivo_flag);
  const proceso100 = !!(contexto && contexto.proceso_completado_100_flag);

  if (def.elegibilidad_tipo === 'certificado_provisorio') {
    return {
      tipo: def.elegibilidad_tipo,
      label: def.elegibilidad_label,
      cumple_flag: provisorio,
      valor_actual: provisorio ? 'Sí' : 'No',
      detalle: provisorio ? 'La organización ya cuenta con certificado provisorio.' : 'Aún no registra certificado provisorio.'
    };
  }

  if (def.elegibilidad_tipo === 'certificado_definitivo') {
    return {
      tipo: def.elegibilidad_tipo,
      label: def.elegibilidad_label,
      cumple_flag: definitivo,
      valor_actual: definitivo ? 'Sí' : 'No',
      detalle: definitivo ? 'La organización ya cuenta con certificado definitivo.' : 'Aún no registra certificado definitivo.'
    };
  }

  return {
    tipo: def.elegibilidad_tipo,
    label: def.elegibilidad_label,
    cumple_flag: proceso100,
    valor_actual: String((contexto && contexto.proceso_completado_pct) || 0) + '%',
    detalle: proceso100
      ? 'La organización cumple el proceso al 100%.'
      : 'La organización aún no completa el 100% del proceso.'
  };
}

function goPesBuildBeneficioDetalleForClient_(def, detalle, hitos) {
  if (def.beneficio_codigo === 'CHARLAS_CAPACITACIONES') {
    const cantidad = asNumberOrBlank_(detalle && detalle.cantidad_anual_capacitaciones);
    return {
      tipo: 'charlas',
      cantidad_anual_capacitaciones: cantidad === '' ? def.cantidad_anual_default : cantidad,
      cantidad_default_capacitaciones: def.cantidad_anual_default
    };
  }

  if (def.beneficio_codigo === 'CAMARAS_1414') {
    const visita = (hitos || []).find(function(row) {
      return String(row.hito_codigo || '') === 'visita_tecnica';
    }) || {};
    return {
      tipo: 'camaras',
      visita_tecnica_estado: detalle && detalle.visita_tecnica_estado || 'Pendiente de solicitud',
      visita_tecnica_fecha_solicitud: visita.fecha_referencia || '',
      visita_tecnica_observacion: detalle && detalle.visita_tecnica_observacion || '',
      flujo_inicio_estado: detalle && detalle.flujo_inicio_estado || 'A la espera de certificado definitivo'
    };
  }

  return {
    tipo: 'fondese',
    convocatorias: groupBy_(hitos || [], 'convocatoria_codigo')
  };
}

function goPesBuildBeneficioHitosForClient_(def, organizacionId, instrumento, savedRows) {
  const orgInstrumentoId = instrumento && instrumento.org_instrumento_id || '';
  const defaults = def.beneficio_codigo === 'FONDESE'
    ? goPesBuildFondeseBaseHitos_(organizacionId, orgInstrumentoId)
    : (def.beneficio_codigo === 'CAMARAS_1414'
      ? goPesBuildCamarasBaseHitos_(organizacionId, orgInstrumentoId)
      : []);

  return goPesMergeBeneficioHitos_(defaults, savedRows || []);
}

function goPesBuildFondeseBaseHitos_(organizacionId, orgInstrumentoId) {
  return [
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'PRIMERA_2026', 'Primera Convocatoria', 'postulacion_proyectos', 'Postulación de Proyectos Primera Convocatoria', 'rango', '2026-01-29', '2026-03-27', '', '', true, 'Pendiente', 10),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'PRIMERA_2026', 'Primera Convocatoria', 'revision_admisibilidad', 'Revisión de Admisibilidad Primera Convocatoria', 'hasta', '', '', '2026-03-30', '', true, 'Pendiente', 20),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'PRIMERA_2026', 'Primera Convocatoria', 'evaluacion_proyectos', 'Evaluación de los Proyectos Primera Convocatoria', 'hasta', '', '', '2026-04-06', '', true, 'Pendiente', 30),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'PRIMERA_2026', 'Primera Convocatoria', 'firma_convenio_entrega_fondos', 'Firma de convenio y entrega de Fondos Primera Convocatoria', 'fecha', '', '', '2026-04-17', '', true, 'Pendiente', 40),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'PRIMERA_2026', 'Primera Convocatoria', 'ejecucion_proyectos', 'Ejecución de proyectos Primera Convocatoria', 'texto', '', '', '', 'Desde la recepción de Fondos', false, 'Pendiente', 50),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'PRIMERA_2026', 'Primera Convocatoria', 'rendicion_recursos', 'Rendición de recursos Primera Convocatoria', 'hasta', '', '', '2026-06-30', '', true, 'Pendiente', 60),

    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'SEGUNDA_2026', 'Segunda Convocatoria', 'postulacion_proyectos', 'Postulación de Proyectos Segunda Convocatoria', 'rango', '2026-07-01', '2026-08-03', '', '', true, 'Pendiente', 110),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'SEGUNDA_2026', 'Segunda Convocatoria', 'revision_admisibilidad', 'Revisión de Admisibilidad Segunda Convocatoria', 'hasta', '', '', '2026-08-14', '', true, 'Pendiente', 120),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'SEGUNDA_2026', 'Segunda Convocatoria', 'evaluacion_proyectos', 'Evaluación de los Proyectos Segunda Convocatoria', 'hasta', '', '', '2026-08-21', '', true, 'Pendiente', 130),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'SEGUNDA_2026', 'Segunda Convocatoria', 'firma_convenio_entrega_fondos', 'Firma de convenio y entrega de Fondos Segunda Convocatoria', 'fecha', '', '', '2026-08-28', '', true, 'Pendiente', 140),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'SEGUNDA_2026', 'Segunda Convocatoria', 'ejecucion_proyectos', 'Ejecución de proyectos Segunda Convocatoria', 'texto', '', '', '', 'Desde la recepción de Fondos', false, 'Pendiente', 150),
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'FONDESE', 'Fondese', 'SEGUNDA_2026', 'Segunda Convocatoria', 'rendicion_recursos', 'Rendición de recursos Segunda Convocatoria', 'hasta', '', '', '2026-11-30', '', true, 'Pendiente', 160)
  ];
}

function goPesBuildCamarasBaseHitos_(organizacionId, orgInstrumentoId) {
  return [
    goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, 'CAMARAS_1414', 'Cámaras 1414', '', '', 'visita_tecnica', 'Solicitud de visita técnica', 'fecha', '', '', '', 'Se solicita una vez obtenido el certificado definitivo.', true, 'Pendiente', 10)
  ];
}

function goPesCreateBeneficioHitoDefault_(organizacionId, orgInstrumentoId, beneficioCodigo, beneficioNombre, convocatoriaCodigo, convocatoriaNombre, hitoCodigo, hitoNombre, modoFecha, fechaInicio, fechaFin, fechaReferencia, descripcionOperativa, alertaClaveFlag, estadoHito, ordenVisual) {
  return {
    beneficio_hito_id: deterministicId_('BHI', [organizacionId, beneficioCodigo, convocatoriaCodigo, hitoCodigo]),
    organizacion_id: organizacionId || '',
    org_instrumento_id: orgInstrumentoId || '',
    beneficio_codigo: beneficioCodigo || '',
    beneficio_nombre: beneficioNombre || '',
    convocatoria_codigo: convocatoriaCodigo || '',
    convocatoria_nombre: convocatoriaNombre || '',
    hito_codigo: hitoCodigo || '',
    hito_nombre: hitoNombre || '',
    modo_fecha: modoFecha || 'fecha',
    fecha_inicio: fechaInicio || '',
    fecha_fin: fechaFin || '',
    fecha_referencia: fechaReferencia || '',
    descripcion_operativa: descripcionOperativa || '',
    alerta_clave_flag: alertaClaveFlag ? 'Sí' : 'No',
    estado_hito: estadoHito || 'Pendiente',
    orden_visual: ordenVisual || 0,
    updated_by: '',
    updated_at: ''
  };
}

function goPesMergeBeneficioHitos_(defaults, savedRows) {
  const index = {};
  (defaults || []).forEach(function(row) {
    index[goPesBeneficioHitoKey_(row)] = Object.assign({}, row);
  });

  (savedRows || []).forEach(function(row) {
    const key = goPesBeneficioHitoKey_(row);
    index[key] = Object.assign({}, index[key] || {}, row);
  });

  return Object.keys(index).map(function(key) {
    return index[key];
  }).sort(function(a, b) {
    return Number(a.orden_visual || 0) - Number(b.orden_visual || 0);
  });
}

function goPesBeneficioHitoKey_(row) {
  return [
    String(row.beneficio_codigo || '').trim(),
    String(row.convocatoria_codigo || '').trim(),
    String(row.hito_codigo || '').trim()
  ].join('||');
}

function goPesFindNextBeneficioHito_(rows) {
  const today = new Date();
  const dated = (rows || []).map(function(row) {
    const source = row.modo_fecha === 'rango'
      ? row.fecha_inicio
      : row.fecha_referencia;
    const date = asDateOrBlank_(source);
    return {
      row: row,
      date: date
    };
  }).filter(function(item) {
    return item.date && item.date.getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  }).sort(function(a, b) {
    return a.date.getTime() - b.date.getTime();
  });

  if (dated.length) {
    return {
      label: dated[0].row.hito_nombre || '',
      fecha: dated[0].row.modo_fecha === 'rango' ? dated[0].row.fecha_inicio : dated[0].row.fecha_referencia
    };
  }

  const textOnly = (rows || []).find(function(row) {
    return String(row.modo_fecha || '') === 'texto' && String(row.descripcion_operativa || '').trim();
  });
  if (textOnly) {
    return {
      label: textOnly.hito_nombre || '',
      fecha: '',
      detalle: textOnly.descripcion_operativa || ''
    };
  }

  return { label: '', fecha: '', detalle: '' };
}

function goPesNormalizePersistedBeneficioHitos_(def, organizacionId, orgInstrumentoId, hitosInput, now, userEmail) {
  const defaults = def.beneficio_codigo === 'FONDESE'
    ? goPesBuildFondeseBaseHitos_(organizacionId, orgInstrumentoId)
    : (def.beneficio_codigo === 'CAMARAS_1414'
      ? goPesBuildCamarasBaseHitos_(organizacionId, orgInstrumentoId)
      : []);
  const merged = goPesMergeBeneficioHitos_(defaults, hitosInput || []);

  return merged.map(function(row) {
    return {
      beneficio_hito_id: row.beneficio_hito_id || deterministicId_('BHI', [organizacionId, def.beneficio_codigo, row.convocatoria_codigo, row.hito_codigo]),
      organizacion_id: organizacionId,
      org_instrumento_id: orgInstrumentoId,
      beneficio_codigo: def.beneficio_codigo,
      beneficio_nombre: def.beneficio_nombre,
      convocatoria_codigo: row.convocatoria_codigo || '',
      convocatoria_nombre: row.convocatoria_nombre || '',
      hito_codigo: row.hito_codigo || '',
      hito_nombre: row.hito_nombre || '',
      modo_fecha: row.modo_fecha || 'fecha',
      fecha_inicio: asDateOrBlank_(row.fecha_inicio),
      fecha_fin: asDateOrBlank_(row.fecha_fin),
      fecha_referencia: asDateOrBlank_(row.fecha_referencia),
      descripcion_operativa: String(row.descripcion_operativa || '').trim(),
      alerta_clave_flag: toSiNo_(row.alerta_clave_flag),
      estado_hito: String(row.estado_hito || 'Pendiente').trim(),
      orden_visual: Number(row.orden_visual || 0),
      updated_by: userEmail || '',
      updated_at: now
    };
  });
}

function goPesReplaceBeneficioHitos_(organizacionId, beneficioCodigo, hitos) {
  const sheetName = GO_PES_V2.SHEETS.FACT_BENEFICIOS_HITOS;
  const headers = buildSheetDefinitions_()[sheetName];
  const existing = getSheetData_(sheetName).filter(function(row) {
    return !(
      String(row.organizacion_id || '').trim() === String(organizacionId || '').trim() &&
      String(row.beneficio_codigo || '').trim() === String(beneficioCodigo || '').trim()
    );
  });
  const nextRows = existing.concat(hitos || []).sort(function(a, b) {
    const orgA = String(a.organizacion_id || '');
    const orgB = String(b.organizacion_id || '');
    if (orgA !== orgB) return orgA.localeCompare(orgB, 'es');
    const benA = String(a.beneficio_codigo || '');
    const benB = String(b.beneficio_codigo || '');
    if (benA !== benB) return benA.localeCompare(benB, 'es');
    return Number(a.orden_visual || 0) - Number(b.orden_visual || 0);
  });
  replaceSheetData_(sheetName, headers, nextRows);
}

function goPesUpsertBeneficioDetalleRow_(def, organizacionId, orgInstrumentoId, detallePayload, now, userEmail) {
  detallePayload = detallePayload || {};
  const existing = (filterByField_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE, 'organizacion_id', organizacionId, false) || []).find(function(row) {
    return String(row.beneficio_codigo || '').trim() === String(def.beneficio_codigo || '').trim();
  }) || null;
  const detalleId = existing && String(existing.organizacion_id || '').trim() === String(organizacionId || '').trim()
    ? existing.beneficio_detalle_id
    : deterministicId_('BDE', [organizacionId, def.beneficio_codigo]);
  const visitaTecnicaHito = (def.beneficio_codigo === 'CAMARAS_1414' ? goPesBuildCamarasBaseHitos_(organizacionId, orgInstrumentoId)[0] : null) || {};

  upsertByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_DETALLE, 'beneficio_detalle_id', {
    beneficio_detalle_id: detalleId,
    organizacion_id: organizacionId,
    org_instrumento_id: orgInstrumentoId,
    beneficio_codigo: def.beneficio_codigo,
    cantidad_anual_capacitaciones: def.beneficio_codigo === 'CHARLAS_CAPACITACIONES'
      ? (asNumberOrBlank_(detallePayload.cantidad_anual_capacitaciones) === '' ? def.cantidad_anual_default : asNumberOrBlank_(detallePayload.cantidad_anual_capacitaciones))
      : '',
    cantidad_default_capacitaciones: def.beneficio_codigo === 'CHARLAS_CAPACITACIONES' ? def.cantidad_anual_default : '',
    visita_tecnica_estado: def.beneficio_codigo === 'CAMARAS_1414' ? String(detallePayload.visita_tecnica_estado || 'Pendiente de solicitud').trim() : '',
    visita_tecnica_fecha_solicitud: def.beneficio_codigo === 'CAMARAS_1414' ? asDateOrBlank_(detallePayload.visita_tecnica_fecha_solicitud || visitaTecnicaHito.fecha_referencia) : '',
    visita_tecnica_observacion: def.beneficio_codigo === 'CAMARAS_1414' ? String(detallePayload.visita_tecnica_observacion || '').trim() : '',
    flujo_inicio_estado: def.beneficio_codigo === 'CAMARAS_1414' ? String(detallePayload.flujo_inicio_estado || 'A la espera de certificado definitivo').trim() : '',
    alerta_origen_modulo: 'Beneficios',
    updated_by: userEmail || '',
    updated_at: now
  });
}

function goPesFindBeneficioInstrumento_(organizacionId, beneficioCodigo) {
  return (filterByField_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'organizacion_id', organizacionId, false) || []).find(function(row) {
    return String(row.instrumento_codigo_catalogo || '').trim() === String(beneficioCodigo || '').trim();
  }) || null;
}

function goPesEnsureBeneficioSupportRowsForExistingRecords_(org, instrumentos, detalles, hitos, user) {
  const detailsByCode = {};
  (detalles || []).forEach(function(row) {
    detailsByCode[String(row.beneficio_codigo || '').trim()] = row;
  });
  const hitosByCode = {};
  (hitos || []).forEach(function(row) {
    const code = String(row.beneficio_codigo || '').trim();
    if (!hitosByCode[code]) hitosByCode[code] = [];
    hitosByCode[code].push(row);
  });

  (instrumentos || []).forEach(function(inst) {
    const def = getBeneficioDefinitionByCode_(inst.instrumento_codigo_catalogo);
    if (!def) return;

    if (!detailsByCode[def.beneficio_codigo]) {
      goPesUpsertBeneficioDetalleRow_(def, org.organizacion_id, inst.org_instrumento_id || '', {}, new Date(), user.email || 'system');
    }

    if ((def.beneficio_codigo === 'FONDESE' || def.beneficio_codigo === 'CAMARAS_1414') && !(hitosByCode[def.beneficio_codigo] || []).length) {
      const base = def.beneficio_codigo === 'FONDESE'
        ? goPesBuildFondeseBaseHitos_(org.organizacion_id, inst.org_instrumento_id || '')
        : goPesBuildCamarasBaseHitos_(org.organizacion_id, inst.org_instrumento_id || '');
      goPesReplaceBeneficioHitos_(org.organizacion_id, def.beneficio_codigo, goPesNormalizePersistedBeneficioHitos_(def, org.organizacion_id, inst.org_instrumento_id || '', base, new Date(), user.email || 'system'));
    }
  });
}

function goPesMapVisibleEstadoGeneral_(value) {
  if (normalizeText_(value) === 'constituida sin instrumentos') {
    return 'Constituida sin beneficios';
  }
  return value || '';
}
