function getFixedBenefitMeta_() {
  return [
    {
      beneficio_codigo: 'CAMARAS_1414',
      beneficio_nombre: 'CAMARAS 1414',
      descripcion_beneficio: 'Flujo operativo desde certificado definitivo hasta cierre por convenio firmado.',
      descripcion_corta: 'Solicitud, visita tecnica, convenio y cierre por organizacion.',
      instrumento_tipo: 'beneficio_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: 'hito_avance',
      elegibilidad_label: 'Hito 11 / Certificado definitivo',
      estado: 'Operativo',
      items: [
        'Elegibilidad automatica al registrar el certificado definitivo.',
        'Checklist documental, borrador formal de correo y seguimiento operativo.',
        'Registro de visita tecnica, instalacion, convenio y cierre.'
      ],
      nota: 'Primer beneficio operativo real del modulo Beneficios.'
    },
    {
      beneficio_codigo: 'FONDESE',
      beneficio_nombre: 'FONDESE',
      descripcion_beneficio: 'Base minima del modulo para el flujo FONDESE.',
      descripcion_corta: 'Convocatorias y seguimiento se reconstruiran en iteraciones futuras.',
      instrumento_tipo: 'fondo_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: '',
      elegibilidad_label: 'Base minima',
      estado: 'Base minima',
      items: [
        'Pestana fija para organizar el futuro desarrollo del flujo FONDESE.',
        'Sin calendario editable ni CRUD legado activos.',
        'Espacio reservado para construir administracion, hitos y operacion por separado.'
      ],
      nota: 'El backend anterior de configuracion y seguimiento fue retirado para evitar complejidad residual.'
    },
    {
      beneficio_codigo: 'CHARLAS_CAPACITACIONES',
      beneficio_nombre: 'CAPACITACIONES',
      descripcion_beneficio: 'Base minima del modulo para CAPACITACIONES.',
      descripcion_corta: 'Espacio operativo reservado para contenidos y gestion futura.',
      instrumento_tipo: 'capacitacion_municipal',
      origen_instrumento: 'municipal',
      elegibilidad_tipo: '',
      elegibilidad_label: 'Base minima',
      estado: 'Base minima',
      items: [
        'Pestana preparada para construir la logica propia de capacitaciones.',
        'Sin planes anuales, formularios ni asignaciones activas por ahora.',
        'Lista para crecer de forma incremental sin arrastrar la implementacion anterior.'
      ],
      nota: 'La pestana queda visible y estable, con el modulo operativo pero sin sobrearquitectura.'
    }
  ];
}

function seedBeneficios_() {
  ensureSheetsSubset_([
    GO_PES_V2.SHEETS.DIM_BENEFICIOS,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG,
    GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS,
    GO_PES_V2.SHEETS.FACT_INSTRUMENTOS
  ]);

  const now = new Date();
  const actor = 'system';
  const rows = getFixedBenefitMeta_().map(function(item) {
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
  });

  upsertRowsByKey_(GO_PES_V2.SHEETS.DIM_BENEFICIOS, 'beneficio_codigo', rows, false);
}

function getBeneficiosModuloPanel(payload) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  seedBeneficios_();

  payload = payload || {};
  const tabs = getFixedBenefitMeta_().map(function(item) {
    return {
      codigo: item.beneficio_codigo,
      titulo: item.beneficio_nombre,
      descripcion: item.descripcion_beneficio,
      descripcion_corta: item.descripcion_corta,
      estado: item.estado,
      items: (item.items || []).slice(),
      nota: item.nota || ''
    };
  });

  const requestedCode = String(payload.beneficio_codigo || '').trim().toUpperCase();
  const selected = tabs.find(function(tab) {
    return String(tab.codigo || '').trim().toUpperCase() === requestedCode;
  }) || tabs[0] || null;

  const result = {
    tabs: tabs,
    selected_tab_codigo: selected ? selected.codigo : '',
    selected_tab: selected || ''
  };

  if (selected && selected.codigo === 'CAMARAS_1414') {
    result.camaras1414 = buildCamaras1414Panel_(payload);
  }

  return serializeForClient_(result);
}

function guardarConfiguracionCamaras1414(payload) {
  const actor = requireModuleAccess_('instrumento', ['coordinador', 'superuser']);
  const current = getRuntimeSystemConfig_();
  const beneficios = cloneSystemConfig_(current.beneficios || {});
  beneficios.camaras1414 = Object.assign({}, beneficios.camaras1414 || {}, payload || {});
  const normalized = normalizeConfigSectionByName_('beneficios', beneficios, current);

  writeSystemConfigSection_('beneficios', normalized, getBeneficiosActorEmail_(actor));
  invalidateSystemConfigRuntimeCache_();

  logUserAction_('GUARDAR_CONFIG_CAMARAS_1414', 'beneficio_config', 'CAMARAS_1414', 'OK', {
    actor: getBeneficiosActorEmail_(actor)
  });

  return serializeForClient_({
    ok: true,
    config: getCamaras1414Config_()
  });
}

function guardarCamaras1414Organizacion(payload) {
  const actor = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  seedBeneficios_();
  goPesEnsureAvanceBackendReady_();

  payload = payload || {};
  const organizacionId = String(payload.organizacion_id || '').trim();
  if (!organizacionId) throw new Error('Falta organizacion_id.');
  assertOrganizacionActiva_(organizacionId); // suspendida = solo lectura

  const sync = ensureCamaras1414EligibilityForOrg_(organizacionId);
  if (!sync.assignment) {
    throw new Error('La organizacion no es elegible para CAMARAS 1414 porque aun no registra el certificado definitivo.');
  }

  const now = new Date();
  const actorEmail = getBeneficiosActorEmail_(actor);
  const org = sync.organizacion || findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);

  // Fusion: una accion parcial (solo solicitud, o solo instalacion) no debe borrar la otra.
  const existingDetail = indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(sync.assignment.beneficio_org_id));
  const solicitud = (payload.solicitud !== undefined)
    ? normalizeCamarasSolicitudPayload_(payload.solicitud)
    : normalizeCamarasSolicitudPayload_(parseCamarasDetailPayload_(existingDetail.SOLICITUD_SP));
  const instalacion = (payload.instalacion !== undefined)
    ? normalizeCamarasInstalacionPayload_(payload.instalacion)
    : normalizeCamarasInstalacionPayload_(parseCamarasDetailPayload_(existingDetail.INSTALACION_REG));

  const detailRows = buildCamarasDetailRows_(sync.assignment, {
    solicitud: solicitud,
    instalacion: instalacion
  }, actorEmail, now);

  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS, 'beneficio_org_hito_id', detailRows, false);

  const detailMap = indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(sync.assignment.beneficio_org_id));
  const computed = buildCamarasWorkflowState_(sync.assignment, detailMap, sync.eligibilityDate);
  const instalado = computed.index === 2;
  const nextAssignment = Object.assign({}, sync.assignment, {
    elegible_flag: 'Si',
    criterio_elegibilidad: 'Certificado definitivo registrado en Avance (FOR_04 / hito 11).',
    motivo_no_elegibilidad: '',
    activo_flag: instalado ? 'No' : 'Si',
    estado_beneficio: computed.status,
    avance_beneficio_pct: computed.progressPct,
    proximo_hito_beneficio: computed.nextStep,
    fecha_inicio_beneficio: sync.assignment.fecha_inicio_beneficio || sync.eligibilityDate || now,
    fecha_termino_beneficio: (instalado && instalacion.agreementDate) || sync.assignment.fecha_termino_beneficio || '',
    resultado_beneficio: instalado
      ? ('Instalado' + (instalacion.cameras ? ' - ' + instalacion.cameras + ' camaras' : ''))
      : (solicitud.requested ? 'Solicitado' : ''),
    responsable_beneficio: String(payload.responsable_beneficio || sync.assignment.responsable_beneficio || org.responsable_actual || '').trim(),
    observacion_beneficio: String(payload.observacion_beneficio || '').trim(),
    updated_by: actorEmail,
    updated_at: now
  });

  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_org_id', [nextAssignment], false);
  syncFactInstrumentoFromCamaras_(org, nextAssignment, computed, actorEmail, now);

  logUserAction_('GUARDAR_CAMARAS_1414_ORG', 'beneficio_org', nextAssignment.beneficio_org_id, 'OK', {
    organizacion_id: organizacionId,
    estado_beneficio: nextAssignment.estado_beneficio
  });

  return serializeForClient_({
    ok: true,
    organizacion_id: organizacionId,
    beneficio_org_id: nextAssignment.beneficio_org_id,
    estado_beneficio: nextAssignment.estado_beneficio
  });
}

function goPesHandleCamaras1414EligibilityFromAvance_(organizacionId, fechaHito, hitoCatalogo) {
  const codigo = String(hitoCatalogo && hitoCatalogo.codigo_hito || '').trim().toUpperCase();
  if (codigo !== 'FOR_04') return null;

  const sync = ensureCamaras1414EligibilityForOrg_(organizacionId, fechaHito);
  if (!sync || !sync.assignment || !sync.organizacion) return null;

  return serializeForClient_({
    beneficio_codigo: 'CAMARAS_1414',
    beneficio_nombre: 'CAMARAS 1414',
    organizacion_id: organizacionId,
    organizacion_nombre: sync.organizacion.nombre_organizacion || '',
    eligibility_date: sync.eligibilityDate || fechaHito || '',
    title: 'Organizacion elegible para CAMARAS 1414',
    message: 'La organizacion ya cuenta con certificado definitivo. Corresponde iniciar la gestion de visita tecnica con Seguridad Publica.'
  });
}

function buildCamaras1414Panel_(payload) {
  syncAllCamaras1414Eligibility_();
  const config = getCamaras1414Config_();

  const orgById = {};
  getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES).forEach(function(o) {
    const id = String(o.organizacion_id || '').trim();
    if (id) orgById[id] = o;
  });

  const estados = ['elegible', 'solicitado', 'instalado'];
  const orgs = getSheetData_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG)
    .filter(function(a) { return String(a.beneficio_codigo || '').trim().toUpperCase() === 'CAMARAS_1414'; })
    .map(function(a) {
      const detailMap = indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(a.beneficio_org_id));
      const eligDate = getCamarasEligibilityDateFromAssignment_(a);
      const wf = buildCamarasWorkflowState_(a, detailMap, eligDate);
      const plazo = buildCamarasPlazoInfo_(eligDate, wf, config);
      const org = orgById[String(a.organizacion_id || '').trim()] || {};
      return {
        organizacion_id: String(a.organizacion_id || ''),
        nombre_organizacion: String(org.nombre_organizacion || a.organizacion_id || ''),
        fecha_certificado: eligDate || '',
        estado: estados[wf.index] || 'elegible',
        estado_index: wf.index,
        estado_label: wf.status,
        fecha_solicitud: (wf.solicitud && wf.solicitud.requestDate) || '',
        fecha_convenio: (wf.instalacion && wf.instalacion.agreementDate) || '',
        camaras: (wf.instalacion && wf.instalacion.cameras) || '',
        plazo_tono: plazo.tono || '',
        plazo_badge: plazo.badge || '',
        plazo_mensaje: plazo.mensaje || ''
      };
    })
    .sort(function(a, b) { return String(a.nombre_organizacion).localeCompare(String(b.nombre_organizacion), 'es'); });

  return {
    orgs: orgs,
    summary: {
      elegible: orgs.filter(function(o) { return o.estado_index === 0; }).length,
      solicitado: orgs.filter(function(o) { return o.estado_index === 1; }).length,
      instalado: orgs.filter(function(o) { return o.estado_index === 2; }).length,
      vencidos: orgs.filter(function(o) { return o.estado_index === 0 && o.plazo_tono === 'danger'; }).length
    }
  };
}

function syncAllCamaras1414Eligibility_() {
  goPesEnsureAvanceBackendReady_();
  seedBeneficios_();

  const avanceRows = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS).filter(function(row) {
    return String(row.codigo_hito || '').trim().toUpperCase() === 'FOR_04' && String(row.organizacion_id || '').trim();
  });
  const latestByOrg = {};
  avanceRows.forEach(function(row) {
    const orgId = String(row.organizacion_id || '').trim();
    if (!orgId) return;
    const current = latestByOrg[orgId];
    if (!current || new Date(row.fecha_hito || 0).getTime() > new Date(current.fecha_hito || 0).getTime()) {
      latestByOrg[orgId] = row;
    }
  });

  Object.keys(latestByOrg).forEach(function(orgId) {
    ensureCamaras1414EligibilityForOrg_(orgId, latestByOrg[orgId].fecha_hito);
  });
}

function ensureCamaras1414EligibilityForOrg_(organizacionId, fechaHito) {
  const orgId = String(organizacionId || '').trim();
  if (!orgId) return { assignment: null, organizacion: null, eligibilityDate: '' };

  const organizacion = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', orgId, false);
  if (!organizacion) return { assignment: null, organizacion: null, eligibilityDate: '' };

  const eligibilityRow = findLatestCamarasEligibilityHito_(orgId);
  const eligibilityDate = asDateOrBlank_(fechaHito) || asDateOrBlank_(eligibilityRow && eligibilityRow.fecha_hito) || '';
  if (!eligibilityDate) return { assignment: null, organizacion: organizacion, eligibilityDate: '' };

  const existing = findCamarasAssignmentByOrgId_(orgId);
  const currentDetail = existing ? indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(existing.beneficio_org_id)) : {};
  const computed = buildCamarasWorkflowState_(existing || {}, currentDetail, eligibilityDate);
  const now = new Date();
  const orgInstrumentId = existing && existing.org_instrumento_id
    ? existing.org_instrumento_id
    : deterministicId_('INST', ['CAMARAS_1414', orgId]);
  const assignment = Object.assign({}, existing || {}, {
    beneficio_org_id: existing && existing.beneficio_org_id ? existing.beneficio_org_id : deterministicId_('BENORG', ['CAMARAS_1414', orgId]),
    beneficio_codigo: 'CAMARAS_1414',
    organizacion_id: orgId,
    org_instrumento_id: orgInstrumentId,
    elegible_flag: 'Si',
    criterio_elegibilidad: 'Certificado definitivo registrado en Avance (FOR_04 / hito 11).',
    motivo_no_elegibilidad: '',
    activo_flag: String(existing && existing.activo_flag || '').trim() || 'Si',
    estado_beneficio: computed.status,
    avance_beneficio_pct: computed.progressPct,
    proximo_hito_beneficio: computed.nextStep,
    fecha_inicio_beneficio: existing && existing.fecha_inicio_beneficio ? existing.fecha_inicio_beneficio : eligibilityDate,
    fecha_termino_beneficio: existing && existing.fecha_termino_beneficio ? existing.fecha_termino_beneficio : '',
    resultado_beneficio: existing && existing.resultado_beneficio ? existing.resultado_beneficio : '',
    responsable_beneficio: existing && existing.responsable_beneficio ? existing.responsable_beneficio : String(organizacion.responsable_actual || '').trim(),
    observacion_beneficio: existing && existing.observacion_beneficio ? existing.observacion_beneficio : '',
    updated_by: existing && existing.updated_by ? existing.updated_by : 'system',
    updated_at: existing && existing.updated_at ? existing.updated_at : now
  });

  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG, 'beneficio_org_id', [assignment], false);
  syncFactInstrumentoFromCamaras_(organizacion, assignment, computed, 'system', now);

  return {
    assignment: assignment,
    organizacion: organizacion,
    eligibilityDate: eligibilityDate
  };
}

/* Info de plazo de solicitud: dias habiles desde el certificado y estado del plazo (5 dias habiles). */
function buildCamarasPlazoInfo_(eligibilityDate, workflow, config) {
  const cert = asDateOrBlank_(eligibilityDate);
  const limite = Number((config && config.maxDaysToSendRequest) || 5);
  const wf = workflow || {};
  const solicitud = wf.solicitud || {};
  const yaSolicito = !!(solicitud.requested && solicitud.requestDate);
  if (!cert) {
    return { limite_dias_habiles: limite, ya_solicito: yaSolicito, dias_habiles: null, tono: '', mensaje: '' };
  }
  const fechaLimite = addBusinessDays_(cert, limite);
  if (yaSolicito) {
    const habilesHastaSolicitud = businessDaysBetween_(cert, asDateOrBlank_(solicitud.requestDate) || cert);
    const aTiempo = habilesHastaSolicitud <= limite;
    return {
      limite_dias_habiles: limite,
      ya_solicito: true,
      dias_habiles: habilesHastaSolicitud,
      fecha_limite: fechaLimite,
      tono: aTiempo ? 'ok' : 'warning',
      badge: aTiempo ? 'A tiempo' : 'Fuera de plazo',
      mensaje: aTiempo
        ? ('Solicitud realizada dentro del plazo (' + habilesHastaSolicitud + ' dias habiles).')
        : ('Solicitud realizada fuera de plazo (' + habilesHastaSolicitud + ' dias habiles).')
    };
  }
  const transcurridos = businessDaysBetween_(cert, stripTimeFromDate_(new Date()));
  const restantes = limite - transcurridos;
  return {
    limite_dias_habiles: limite,
    ya_solicito: false,
    dias_habiles: transcurridos,
    restantes: restantes,
    fecha_limite: fechaLimite,
    tono: restantes < 0 ? 'danger' : (restantes <= 2 ? 'warning' : 'ok'),
    badge: restantes < 0
      ? ('Vencido · ' + Math.abs(restantes) + ' d hábiles')
      : (restantes <= 2 ? ('Vence en ' + restantes + ' d hábiles') : (restantes + ' d hábiles')),
    mensaje: restantes < 0
      ? ('Plazo vencido: ' + Math.abs(restantes) + ' dias habiles de atraso para solicitar.')
      : ('Quedan ' + restantes + ' dias habiles para solicitar la instalacion.')
  };
}

/* Estado unificado de CAMARAS 1414 (flujo simplificado: solicitar -> registrar instalacion).
   Tres estados: Elegible -> Solicitado -> Instalado. Fuente: los detail rows SOLICITUD_SP e
   INSTALACION_REG. */
function buildCamarasWorkflowState_(assignment, detailMap, eligibilityDate) {
  const detail = detailMap || {};
  const solicitud = parseCamarasDetailPayload_(detail.SOLICITUD_SP);
  const instalacion = parseCamarasDetailPayload_(detail.INSTALACION_REG);
  const stages = getCamarasStateOptions_();

  let index, status, nextStep;
  if (instalacion.installed) {
    index = 2;
    status = 'Instalado';
    nextStep = 'Sin acciones pendientes.';
  } else if (solicitud.requested && solicitud.requestDate) {
    index = 1;
    status = 'Solicitado';
    nextStep = 'Registrar la instalacion al recibir la firma del convenio.';
  } else {
    index = 0;
    status = 'Elegible';
    nextStep = 'Solicitar la instalacion a Seguridad Publica (5 dias habiles desde el certificado).';
  }

  return {
    index: index,
    status: status,
    progressPct: Math.round(((index + 1) / stages.length) * 100),
    nextStep: nextStep,
    solicitud: solicitud,
    instalacion: instalacion
  };
}

/* Dias habiles (lun-vie) transcurridos desde 'from' (exclusivo) hasta 'to' (inclusive). */
function businessDaysBetween_(from, to) {
  let a = stripTimeFromDate_(from), b = stripTimeFromDate_(to);
  if (!a || !b) return 0;
  if (b < a) { const t = a; a = b; b = t; }
  const totalDays = Math.round((b.getTime() - a.getTime()) / 86400000);
  const fullWeeks = Math.floor(totalDays / 7);
  let count = fullWeeks * 5;
  const extra = totalDays - fullWeeks * 7;
  const startDow = a.getDay();
  for (let i = 1; i <= extra; i++) {
    const d = (startDow + i) % 7;
    if (d !== 0 && d !== 6) count++;
  }
  return count;
}

/* Suma 'n' dias habiles (lun-vie) a una fecha; devuelve Date. */
function addBusinessDays_(date, n) {
  let d = stripTimeFromDate_(date);
  if (!d) return '';
  let added = 0;
  while (added < Number(n || 0)) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function getCamarasStateOptions_() {
  return ['Elegible', 'Solicitado', 'Instalado'];
}

function getCamaras1414Config_() {
  const config = (((getRuntimeSystemConfig_() || {}).beneficios || {}).camaras1414) || {};
  return {
    displayName: config.displayName || 'CAMARAS 1414',
    baseStates: Array.isArray(config.baseStates) ? config.baseStates.slice() : getCamarasStateOptions_(),
    technicalVisitAlertDays: Number(config.technicalVisitAlertDays || 7),
    baseEligibilityCondition: config.baseEligibilityCondition || 'Organizacion con certificado definitivo',
    reminderDaysFromEligibility: Number(config.reminderDaysFromEligibility || 0),
    maxDaysToSendRequest: Number(config.maxDaysToSendRequest || 5),
    maxDaysWithoutVisitResponse: Number(config.maxDaysWithoutVisitResponse || 10),
    maxDaysPostVisitFollowup: Number(config.maxDaysPostVisitFollowup || 7),
    maxDaysToConvenio: Number(config.maxDaysToConvenio || 20),
    maxDaysWithoutProgress: Number(config.maxDaysWithoutProgress || 30),
    alertHighDays: Number(config.alertHighDays || 3),
    alertMediumDays: Number(config.alertMediumDays || 7)
  };
}

/* Alerta unica: organizacion elegible que aun no solicita la instalacion dentro del plazo de
   dias habiles (default 5) desde el certificado definitivo. */
function buildCamarasAlertRows_(assignments, config) {
  const limite = Number((config && config.maxDaysToSendRequest) || 5);
  const rows = [];

  (assignments || []).forEach(function(row) {
    const detailMap = row.beneficio_org_id
      ? indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(row.beneficio_org_id))
      : {};
    const solicitud = parseCamarasDetailPayload_(detailMap.SOLICITUD_SP);
    const instalacion = parseCamarasDetailPayload_(detailMap.INSTALACION_REG);
    if (instalacion.installed) return;
    if (solicitud.requested && solicitud.requestDate) return;

    const cert = asDateOrBlank_(row.fecha_hito_11 || row.fecha_inicio_beneficio);
    if (!cert) return;
    const transcurridos = businessDaysBetween_(cert, stripTimeFromDate_(new Date()));
    const restantes = limite - transcurridos;

    rows.push({
      organizacion_id: row.organizacion_id,
      nombre_organizacion: row.nombre_organizacion,
      estado_beneficio: row.estado_beneficio,
      title: 'Instalacion sin solicitar',
      due_date: addBusinessDays_(cert, limite),
      days_until: restantes,
      tone: restantes < 0 ? 'danger' : (restantes <= 2 ? 'warning' : 'info'),
      detail: restantes < 0
        ? ('Atrasado ' + Math.abs(restantes) + ' dias habiles para solicitar.')
        : ('Quedan ' + restantes + ' dias habiles para solicitar.')
    });
  });

  return rows.sort(function(a, b) {
    return Number(a.days_until || 0) - Number(b.days_until || 0);
  });
}

function isCamarasEligibleListRow_(row) {
  return String(row && row.estado_beneficio || '').trim() === 'Elegible';
}

function isCamarasActiveListRow_(row) {
  const status = String(row && row.estado_beneficio || '').trim();
  return status === 'Solicitado' || status === 'Instalado';
}

function buildCamarasDetailRows_(assignment, payload, actorEmail, now) {
  const beneficioOrgId = assignment.beneficio_org_id;
  const base = {
    beneficio_org_id: beneficioOrgId,
    beneficio_codigo: 'CAMARAS_1414',
    organizacion_id: assignment.organizacion_id,
    convocatoria_codigo: '',
    convocatoria_nombre: '',
    modo_fecha: '',
    fecha_inicio: '',
    fecha_fin: '',
    fecha_referencia: '',
    descripcion_operativa: '',
    estado_hito: '',
    alerta_clave_flag: 'No',
    orden_visual: 0,
    valor_texto: '',
    valor_numero: '',
    valor_flag: '',
    observacion_hito: '',
    payload_json: '',
    updated_by: actorEmail,
    updated_at: now
  };

  const rows = [];
  const solicitud = payload.solicitud || {};
  const instalacion = payload.instalacion || {};

  rows.push(Object.assign({}, base, {
    beneficio_org_hito_id: deterministicId_('BENH', [beneficioOrgId, 'SOLICITUD_SP']),
    hito_codigo: 'SOLICITUD_SP',
    hito_nombre: 'Solicitud de instalacion a Seguridad Publica',
    fecha_referencia: solicitud.requestDate || '',
    estado_hito: (solicitud.requested && solicitud.requestDate) ? 'Solicitado' : 'Pendiente',
    orden_visual: 10,
    valor_flag: solicitud.requested ? 'Si' : 'No',
    observacion_hito: solicitud.observations || '',
    payload_json: JSON.stringify(solicitud)
  }));

  rows.push(Object.assign({}, base, {
    beneficio_org_hito_id: deterministicId_('BENH', [beneficioOrgId, 'INSTALACION_REG']),
    hito_codigo: 'INSTALACION_REG',
    hito_nombre: 'Instalacion registrada',
    fecha_referencia: instalacion.agreementDate || '',
    estado_hito: instalacion.installed ? 'Instalado' : 'Pendiente',
    orden_visual: 20,
    valor_flag: instalacion.installed ? 'Si' : 'No',
    valor_numero: instalacion.cameras || '',
    observacion_hito: instalacion.observations || '',
    payload_json: JSON.stringify(instalacion)
  }));

  return rows;
}

function normalizeCamarasSolicitudPayload_(value) {
  const v = value || {};
  const date = sanitizeCamarasDate_(v.requestDate);
  return {
    requested: !!(v.requested || date),
    requestDate: date,
    observations: sanitizeCamarasText_(v.observations, 500)
  };
}

function normalizeCamarasInstalacionPayload_(value) {
  const v = value || {};
  const camerasNum = Number(v.cameras);
  const date = sanitizeCamarasDate_(v.agreementDate);
  return {
    installed: !!v.installed,
    cameras: (isFinite(camerasNum) && camerasNum > 0) ? Math.round(camerasNum) : '',
    agreementDate: date,
    observations: sanitizeCamarasText_(v.observations, 500)
  };
}

function syncFactInstrumentoFromCamaras_(organizacion, assignment, workflow, actorEmail, now) {
  const org = organizacion || {};
  const row = {
    org_instrumento_id: assignment.org_instrumento_id || deterministicId_('INST', ['CAMARAS_1414', assignment.organizacion_id]),
    organizacion_id: assignment.organizacion_id || '',
    instrumento_codigo_catalogo: 'CAMARAS_1414',
    instrumento_nombre_otro: '',
    instrumento_tipo: 'beneficio_municipal',
    origen_instrumento: 'municipal',
    anio_convocatoria: now.getFullYear(),
    nombre_convocatoria: 'CAMARAS 1414',
    numero_llamado: '',
    fecha_inicio_gestion: assignment.fecha_inicio_beneficio || '',
    fecha_apertura: '',
    fecha_cierre: '',
    fecha_habilitacion: '',
    fecha_postulacion: '',
    fecha_resultado: '',
    fecha_cierre_instrumento: assignment.fecha_termino_beneficio || '',
    estado_instrumento: workflow.status,
    subestado_instrumento: assignment.proximo_hito_beneficio || workflow.nextStep,
    avance_instrumento_pct: workflow.progressPct,
    proximo_hito_instrumento: workflow.nextStep,
    resultado_instrumento: assignment.resultado_beneficio || '',
    monto_solicitado: '',
    monto_adjudicado: '',
    monto_ejecutado: '',
    responsable_instrumento: assignment.responsable_beneficio || org.responsable_actual || '',
    contraparte: 'Seguridad Publica',
    observacion_instrumento: assignment.observacion_beneficio || '',
    documento_respaldo_url: '',
    updated_by: actorEmail,
    updated_at: now
  };
  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'org_instrumento_id', [row], false);
}

function findLatestCamarasEligibilityHito_(organizacionId) {
  const rows = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS)
    .filter(function(row) {
      return String(row.organizacion_id || '').trim() === String(organizacionId || '').trim() &&
        String(row.codigo_hito || '').trim().toUpperCase() === 'FOR_04';
    })
    .sort(function(a, b) {
      return new Date(b.fecha_hito || 0).getTime() - new Date(a.fecha_hito || 0).getTime();
    });
  return rows[0] || null;
}

function findCamarasAssignmentByOrgId_(organizacionId) {
  return getSheetData_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG).find(function(row) {
    return String(row.beneficio_codigo || '').trim().toUpperCase() === 'CAMARAS_1414' &&
      String(row.organizacion_id || '').trim() === String(organizacionId || '').trim();
  }) || null;
}

function getCamarasDetailRowsByAssignmentId_(beneficioOrgId) {
  return getSheetData_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS)
    .filter(function(row) {
      return String(row.beneficio_org_id || '').trim() === String(beneficioOrgId || '').trim();
    })
    .sort(function(a, b) {
      return Number(a.orden_visual || 0) - Number(b.orden_visual || 0);
    });
}

function indexCamarasDetailRows_(rows) {
  return (rows || []).reduce(function(acc, row) {
    const code = String(row.hito_codigo || '').trim();
    if (code) acc[code] = row;
    return acc;
  }, {});
}

function parseCamarasDetailPayload_(row) {
  const raw = row && row.payload_json ? String(row.payload_json || '') : '';
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function getCamarasEligibilityDateFromAssignment_(assignment) {
  const latest = assignment && assignment.organizacion_id
    ? findLatestCamarasEligibilityHito_(assignment.organizacion_id)
    : null;
  return latest ? latest.fecha_hito : (assignment && assignment.fecha_inicio_beneficio ? assignment.fecha_inicio_beneficio : '');
}

function sanitizeCamarasText_(value, maxLength) {
  const text = String(value == null ? '' : value).trim();
  if (!maxLength) return text;
  return text.slice(0, maxLength);
}

function sanitizeCamarasDate_(value) {
  const parsed = asDateOrBlank_(value);
  return parsed || '';
}

function getBeneficiosActorEmail_(actor) {
  return String(
    (actor && actor.email) ||
    (typeof getUsuarioActual === 'function' && getUsuarioActual().email) ||
    Session.getActiveUser().getEmail() ||
    'system'
  ).trim() || 'system';
}

function stripTimeFromDate_(date) {
  const value = asDateOrBlank_(date);
  if (!value) return '';
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays_(date, days) {
  const base = stripTimeFromDate_(date);
  if (!base) return '';
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + Number(days || 0));
}

function diffDays_(fromDate, toDate) {
  const from = stripTimeFromDate_(fromDate);
  const to = stripTimeFromDate_(toDate);
  if (!from || !to) return 999999;
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function formatDateOnlyForMail_(value) {
  const date = asDateOrBlank_(value);
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd-MM-yyyy');
}

/* =========================================================
   FONDESE — Fondo de Seguridad Providencia
   Modelo de dos capas: CFG_FONDESE_Ediciones + FACT_FONDESE
   ========================================================= */

function goPesEnsureFondeseSheets_() {
  var S = GO_PES_V2.SHEETS;
  ensureSheetWithHeaders_(S.CFG_FONDESE_EDICIONES, [
    'id_edicion', 'anio', 'nombre', 'presupuesto_total', 'estado',
    'convocatorias', 'lineas_producto', 'documentos', 'fecha_creacion', 'creado_por'
  ]);
  ensureSheetWithHeaders_(S.FACT_FONDESE, [
    'fondese_id', 'id_edicion', 'organizacion_id', 'nombre_organizacion',
    'convocatoria_id', 'linea_producto_id', 'estado_proceso', 'resultado_adj',
    'estado_ejecucion', 'estado_rendicion', 'fecha_rendicion', 'observaciones_rendicion', 'checklist_docs',
    'fecha_creacion', 'fecha_actualizacion', 'creado_por', 'monto_adjudicado', 'monto_ejecutado'
  ]);
}

function goPesParseFondeseEdicion_(row) {
  if (!row) return null;
  var parsed = Object.assign({}, row);
  try { parsed.convocatorias   = JSON.parse(String(row.convocatorias   || '[]')); } catch(e) { parsed.convocatorias   = []; }
  try { parsed.lineas_producto = JSON.parse(String(row.lineas_producto || '[]')); } catch(e) { parsed.lineas_producto = []; }
  try { parsed.documentos      = JSON.parse(String(row.documentos      || '[]')); } catch(e) { parsed.documentos      = []; }
  return parsed;
}

/* Etapas canonicas del ciclo de vida FONDESE (mismas que el stepper del detalle).
   'en_armado' = Ventana 1 (PES acompana antes de ingresar); 'ingresada' = handoff (fuera de manos). */
function getFondeseStateOptions_() {
  return [
    { code: 'en_armado',      label: 'En armado' },
    { code: 'ingresada',      label: 'Ingresada' },
    { code: 'en_evaluacion',  label: 'En evaluacion' },
    { code: 'adjudicado',     label: 'Adjudicado' },
    { code: 'firma_convenio', label: 'Firma de convenio' },
    { code: 'en_ejecucion',   label: 'En ejecucion' },
    { code: 'en_rendicion',   label: 'En rendicion' },
    { code: 'cerrado',        label: 'Cerrado' }
  ];
}

/* Estado unificado de una postulacion FONDESE (espejo de buildCamarasWorkflowState_).
   Fuente unica del progreso: la usan el ledger (syncFactInstrumentoFromFondese_) y las alertas. */
function buildFondeseWorkflowState_(registro, edicion) {
  var reg = registro || {};
  var states = getFondeseStateOptions_();
  var codes = states.map(function(s) { return s.code; });
  var current = String(reg.estado_proceso || 'en_armado').trim() || 'en_armado';
  var index = codes.indexOf(current);
  if (index < 0) { index = 0; current = codes[0]; }
  var progressPct = Math.round(((index + 1) / states.length) * 100);

  var nextSteps = {
    en_armado:      'Acompanar el armado y ayudar a ingresar la postulacion antes del cierre.',
    ingresada:      'Postulacion ingresada al municipio; a la espera de evaluacion.',
    en_evaluacion:  'Esperar el resultado de la evaluacion municipal.',
    adjudicado:     'Registrar el monto adjudicado y avanzar a la firma de convenio.',
    firma_convenio: 'Firmar el convenio e iniciar la ejecucion del proyecto.',
    en_ejecucion:   'Ejecutar el proyecto e iniciar la rendicion al finalizar.',
    en_rendicion:   'Presentar y aprobar la rendicion de cuentas.',
    cerrado:        'Sin acciones pendientes.'
  };

  var convocatoria = null;
  var convocatorias = (edicion && edicion.convocatorias) || [];
  var convId = String(reg.convocatoria_id || '').trim();
  for (var i = 0; i < convocatorias.length; i++) {
    if (String(convocatorias[i].id || '').trim() === convId) { convocatoria = convocatorias[i]; break; }
  }

  return {
    index: index,
    code: current,
    status: states[index].label,
    progressPct: progressPct,
    nextStep: nextSteps[current] || '',
    resultadoAdj: String(reg.resultado_adj || '').trim(),
    convocatoriaLabel: convocatoria ? String(convocatoria.label || '') : '',
    plazos: {
      fecha_apertura:         convocatoria ? (convocatoria.fecha_apertura || '') : '',
      fecha_cierre:           convocatoria ? (convocatoria.fecha_cierre || '') : '',
      fecha_evaluacion:       convocatoria ? (convocatoria.fecha_evaluacion || '') : '',
      fecha_firma:            convocatoria ? (convocatoria.fecha_firma || '') : '',
      fecha_cierre_rendicion: convocatoria ? (convocatoria.fecha_cierre_rendicion || '') : ''
    }
  };
}

/* Refleja una postulacion FONDESE en el ledger FACT_INSTRUMENTOS (espejo de
   syncFactInstrumentoFromCamaras_). Clave determinista por fondese_id => idempotente. */
function syncFactInstrumentoFromFondese_(registro, edicion, workflow, actorEmail, now) {
  var reg = registro || {};
  var ed = edicion || {};
  var fondeseId = String(reg.fondese_id || '').trim();
  if (!fondeseId) return;
  var wf = workflow || buildFondeseWorkflowState_(reg, ed);
  var stamp = now || new Date();
  var isCerrado = wf.code === 'cerrado';

  var row = {
    org_instrumento_id: deterministicId_('INST', ['FONDESE', fondeseId]),
    organizacion_id: String(reg.organizacion_id || '').trim(),
    instrumento_codigo_catalogo: 'FONDESE',
    instrumento_nombre_otro: '',
    instrumento_tipo: 'fondo_municipal',
    origen_instrumento: 'municipal',
    anio_convocatoria: ed.anio || '',
    nombre_convocatoria: ed.nombre || 'FONDESE',
    numero_llamado: wf.convocatoriaLabel || '',
    fecha_inicio_gestion: reg.fecha_creacion || '',
    fecha_apertura: wf.plazos.fecha_apertura || '',
    fecha_cierre: wf.plazos.fecha_cierre || '',
    fecha_habilitacion: '',
    fecha_postulacion: reg.fecha_creacion || '',
    fecha_resultado: wf.plazos.fecha_evaluacion || '',
    fecha_cierre_instrumento: isCerrado ? (reg.fecha_actualizacion || stamp) : '',
    estado_instrumento: wf.status,
    subestado_instrumento: wf.nextStep,
    avance_instrumento_pct: wf.progressPct,
    proximo_hito_instrumento: wf.nextStep,
    resultado_instrumento: reg.resultado_adj || '',
    monto_solicitado: '',
    monto_adjudicado: reg.monto_adjudicado || '',
    monto_ejecutado: reg.monto_ejecutado || '',
    responsable_instrumento: reg.creado_por || '',
    contraparte: 'FONDESE',
    observacion_instrumento: reg.observaciones_rendicion || '',
    documento_respaldo_url: '',
    updated_by: actorEmail || getBeneficiosActorEmail_(null),
    updated_at: stamp
  };
  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'org_instrumento_id', [row], false);
}

function goPesSeedFondese2026_() {
  var S = GO_PES_V2.SHEETS;
  goPesEnsureFondeseSheets_();
  var rows = getSheetData_(S.CFG_FONDESE_EDICIONES);
  if (rows.some(function(r) { return String(r.id_edicion || '').trim() === 'FONDESE-2026'; })) return;

  appendRowObjects_(S.CFG_FONDESE_EDICIONES, [{
    id_edicion:        'FONDESE-2026',
    anio:              2026,
    nombre:            'Fondo de Seguridad Providencia 2026',
    presupuesto_total: 60000000,
    estado:            'activa',
    convocatorias: JSON.stringify([
      { id:'1', label:'Primer Llamado',  fecha_apertura:'2026-01-29', fecha_cierre:'2026-03-27',
        fecha_evaluacion:'2026-04-06', fecha_firma:'2026-04-17', fecha_cierre_rendicion:'2026-06-30', monto:30000000 },
      { id:'2', label:'Segundo Llamado', fecha_apertura:'2026-07-01', fecha_cierre:'2026-08-03',
        fecha_evaluacion:'2026-08-21', fecha_firma:'2026-08-28', fecha_cierre_rendicion:'2026-11-30', monto:30000000 }
    ]),
    lineas_producto: JSON.stringify([
      { id:'LP01', nombre:'Sistema Cierre Eléctrico', monto_max:2500000 },
      { id:'LP02', nombre:'Videoportero',              monto_max:1500000 },
      { id:'LP03', nombre:'Focos Led Solar',           monto_max:1500000 },
      { id:'LP04', nombre:'Dientes Tiburón',           monto_max:2000000 },
      { id:'LP05', nombre:'Alarma Sirena Solar',       monto_max:1500000 },
      { id:'LP06', nombre:'Acceso Biométrico',         monto_max:1500000 },
      { id:'LP07', nombre:'Cámaras de Seguridad',      monto_max:1500000 },
      { id:'LP08', nombre:'Kit Emergencia Familiar',   monto_max:2500000 },
      { id:'LP09', nombre:'Kit Mascotas',              monto_max:2000000 },
      { id:'LP10', nombre:'Extintores PQS',            monto_max:1500000 }
    ]),
    documentos: JSON.stringify([
      { id:'D01', etiqueta:'Ficha Única de Postulación (Anexo N°1)' },
      { id:'D02', etiqueta:'Declaración Jurada Simple (Anexo N°2)' },
      { id:'D03', etiqueta:'Carta Compromiso de Ejecución Directa (Anexo N°3)' },
      { id:'D04', etiqueta:'Estatutos y sus modificaciones en el que conste su objeto' },
      { id:'D05', etiqueta:'Acta de Asamblea o Sesión en la que se acuerde postular el proyecto con su respectivo registro de asistencia' },
      { id:'D06', etiqueta:'E-RUT de la Organización' },
      { id:'D07', etiqueta:'Certificado de Vigencia Cta. Bancaria' },
      { id:'D08', etiqueta:'Certificado de Personalidad Jurídica sin fines de lucro' },
      { id:'D09', etiqueta:'Copia C.I Representante Legal, Presidente, Tesorero y Secretario' },
      { id:'D10', etiqueta:'Decreto Registro Municipal de Personas Jurídicas Receptoras de Fondos Públicos' },
      { id:'D11', etiqueta:'Certificado Registro Central de Colaboradores del Estado y Municipalidades Ley N°19.862' },
      { id:'D12', etiqueta:'Tres Cotizaciones que respalden cada gasto que generará el proyecto' },
      { id:'D13', etiqueta:'Copia del libro de socios' }
    ]),
    fecha_creacion: new Date(),
    creado_por:     'sistema'
  }]);
  invalidateSheetRuntimeCache_(S.CFG_FONDESE_EDICIONES);
}

function goPesGetFondeseEdiciones() {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  goPesEnsureFondeseSheets_();
  var rows = getSheetData_(GO_PES_V2.SHEETS.CFG_FONDESE_EDICIONES);
  var parsed = rows.map(goPesParseFondeseEdicion_).filter(Boolean);
  parsed.sort(function(a, b) { return Number(b.anio || 0) - Number(a.anio || 0); });
  return serializeForClient_({ ediciones: parsed });
}

function goPesGetFondeseEdicionActiva() {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  goPesEnsureFondeseSheets_();
  goPesSeedFondese2026_();
  var activa = getSheetData_(GO_PES_V2.SHEETS.CFG_FONDESE_EDICIONES).find(function(r) {
    return String(r.estado || '').trim() === 'activa';
  });
  return serializeForClient_({ edicion: activa ? goPesParseFondeseEdicion_(activa) : null });
}

function goPesUpsertFondeseEdicion(payload) {
  var actor = requireRole_(['superuser']);
  var p = payload || {};
  var email = String((actor && actor.email) || '').trim() || Session.getActiveUser().getEmail();
  var S = GO_PES_V2.SHEETS;
  goPesEnsureFondeseSheets_();

  var id = String(p.id_edicion || '').trim();
  if (!id) throw new Error('id_edicion es requerido.');

  if (String(p.estado || '').trim() === 'activa') {
    var toDeactivate = getSheetData_(S.CFG_FONDESE_EDICIONES).filter(function(r) {
      return String(r.id_edicion || '').trim() !== id && String(r.estado || '').trim() === 'activa';
    });
    if (toDeactivate.length) {
      toDeactivate.forEach(function(r) {
        upsertRowsByKey_(S.CFG_FONDESE_EDICIONES, 'id_edicion',
          [Object.assign({}, r, { estado: 'cerrada' })], false);
      });
      invalidateSheetRuntimeCache_(S.CFG_FONDESE_EDICIONES);
    }
  }

  var now = new Date();
  var existing = getSheetData_(S.CFG_FONDESE_EDICIONES).find(function(r) {
    return String(r.id_edicion || '').trim() === id;
  });
  if (existing) {
    upsertRowsByKey_(S.CFG_FONDESE_EDICIONES, 'id_edicion', [Object.assign({}, p)], false);
  } else {
    appendRowObjects_(S.CFG_FONDESE_EDICIONES, [Object.assign({}, p, {
      fecha_creacion: now,
      creado_por: email
    })]);
  }

  invalidateSheetRuntimeCache_(S.CFG_FONDESE_EDICIONES);
  logUserAction_('UPSERT_FONDESE_EDICION', 'fondese_edicion', id, 'OK', {});
  var saved = getSheetData_(S.CFG_FONDESE_EDICIONES).find(function(r) {
    return String(r.id_edicion || '').trim() === id;
  });
  return serializeForClient_({ ok: true, edicion: goPesParseFondeseEdicion_(saved || p) });
}

function goPesGetFondeseDetalle(idFondese) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  var id = String(idFondese || '').trim();
  if (!id) throw new Error('Falta ID FONDESE.');
  goPesEnsureFondeseSheets_();
  var S = GO_PES_V2.SHEETS;

  var row = getSheetData_(S.FACT_FONDESE).find(function(r) {
    return String(r.fondese_id || '').trim() === id;
  });
  if (!row) throw new Error('Registro FONDESE no encontrado: ' + id);

  var checklist = {};
  try { checklist = JSON.parse(String(row.checklist_docs || '{}')); } catch(e) {}
  var registro = Object.assign({}, row, { checklist_docs: checklist });

  var edicionRow = getSheetData_(S.CFG_FONDESE_EDICIONES).find(function(r) {
    return String(r.id_edicion || '').trim() === String(row.id_edicion || '').trim();
  });
  var edicion = goPesParseFondeseEdicion_(edicionRow);

  return serializeForClient_({ registro: registro, edicion: edicion });
}

function goPesUpsertFondese(payload) {
  var actor = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  var p = payload || {};
  var email = String((actor && actor.email) || '').trim() || Session.getActiveUser().getEmail();
  var now = new Date();
  var S = GO_PES_V2.SHEETS;
  goPesEnsureFondeseSheets_();

  // suspendida = solo lectura (resolver la org del payload o del registro existente)
  var _orgFondese = String(p.organizacion_id || '').trim();
  if (!_orgFondese && String(p.fondese_id || '').trim()) {
    var _rowF = getSheetData_(S.FACT_FONDESE).find(function(r) { return String(r.fondese_id || '').trim() === String(p.fondese_id).trim(); });
    if (_rowF) _orgFondese = String(_rowF.organizacion_id || '').trim();
  }
  assertOrganizacionActiva_(_orgFondese);

  var checklistRaw = p.checklist_docs;
  if (checklistRaw && typeof checklistRaw === 'object') {
    checklistRaw = JSON.stringify(checklistRaw);
  } else {
    checklistRaw = String(checklistRaw || '{}');
  }

  // Los montos llegan como texto desde el formulario; se guardan como numero (o vacio).
  if (p.monto_adjudicado !== undefined) p.monto_adjudicado = asNumberOrBlank_(p.monto_adjudicado);
  if (p.monto_ejecutado  !== undefined) p.monto_ejecutado  = asNumberOrBlank_(p.monto_ejecutado);

  var id = String(p.fondese_id || '').trim();
  if (id) {
    var existing = getSheetData_(S.FACT_FONDESE).find(function(r) {
      return String(r.fondese_id || '').trim() === id;
    });
    if (!existing) throw new Error('Registro FONDESE no encontrado: ' + id);
    // Fusiona el payload sobre la fila existente: un upsert parcial (ej. botones
    // "Iniciar rendicion"/"Cerrar proceso") no debe borrar las columnas no enviadas.
    var mergedChecklist = (p.checklist_docs !== undefined) ? checklistRaw : String(existing.checklist_docs || '{}');
    var merged = Object.assign({}, existing, p, {
      checklist_docs: mergedChecklist,
      fecha_actualizacion: now
    });

    var edMergedRow = getSheetData_(S.CFG_FONDESE_EDICIONES).find(function(r) {
      return String(r.id_edicion || '').trim() === String(merged.id_edicion || '').trim();
    });
    var edMerged = goPesParseFondeseEdicion_(edMergedRow);

    // Regla de adjudicacion: al transicionar a 'adjudicado', una sola vez por ano calendario
    // y solo si toda adjudicacion anterior se cerro con rendicion aprobada.
    if (String(merged.resultado_adj || '').trim() === 'adjudicado' &&
        String(existing.resultado_adj || '').trim() !== 'adjudicado') {
      goPesAssertAdjudicacionFondese_(merged, Number((edMerged && edMerged.anio) || 0));
    }

    upsertRowsByKey_(S.FACT_FONDESE, 'fondese_id', [merged], false);
    invalidateSheetRuntimeCache_(S.FACT_FONDESE);
    syncFactInstrumentoFromFondese_(merged, edMerged, buildFondeseWorkflowState_(merged, edMerged), email, now);

    logUserAction_('UPSERT_FONDESE', 'fondese', id, 'OK', { organizacion_id: merged.organizacion_id });
    return serializeForClient_({ ok: true, fondese_id: id });
  }

  var edicionId = String(p.id_edicion || '').trim();
  if (!edicionId) {
    var activa = getSheetData_(S.CFG_FONDESE_EDICIONES).find(function(r) {
      return String(r.estado || '').trim() === 'activa';
    });
    if (!activa) throw new Error('No hay una edición de FONDESE activa. Configure una edición antes de crear postulaciones.');
    edicionId = String(activa.id_edicion || '').trim();
  }

  var newId = 'FND-' + new Date().getTime();
  var createdRow = Object.assign({}, p, {
    fondese_id:          newId,
    id_edicion:          edicionId,
    checklist_docs:      checklistRaw,
    fecha_creacion:      now,
    fecha_actualizacion: now,
    creado_por:          email
  });
  appendRowObjects_(S.FACT_FONDESE, [createdRow]);
  invalidateSheetRuntimeCache_(S.FACT_FONDESE);

  var edCreatedRow = getSheetData_(S.CFG_FONDESE_EDICIONES).find(function(r) {
    return String(r.id_edicion || '').trim() === edicionId;
  });
  var edCreated = goPesParseFondeseEdicion_(edCreatedRow);
  syncFactInstrumentoFromFondese_(createdRow, edCreated, buildFondeseWorkflowState_(createdRow, edCreated), email, now);

  logUserAction_('UPSERT_FONDESE', 'fondese', newId, 'OK', { organizacion_id: p.organizacion_id });
  return serializeForClient_({ ok: true, fondese_id: newId });
}

/* Refleja en el ledger FACT_INSTRUMENTOS todas las postulaciones FONDESE existentes.
   Idempotente (clave determinista por fondese_id): se puede correr las veces que haga falta. */
function goPesBackfillFondeseInstrumentos() {
  requireRole_(['superuser']);
  goPesEnsureFondeseSheets_();
  var S = GO_PES_V2.SHEETS;
  var now = new Date();
  var actor = getBeneficiosActorEmail_(null);

  var ediciones = {};
  getSheetData_(S.CFG_FONDESE_EDICIONES).forEach(function(r) {
    ediciones[String(r.id_edicion || '').trim()] = goPesParseFondeseEdicion_(r);
  });

  var procesados = 0;
  getSheetData_(S.FACT_FONDESE).forEach(function(r) {
    if (!String(r.fondese_id || '').trim()) return;
    var ed = ediciones[String(r.id_edicion || '').trim()] || null;
    syncFactInstrumentoFromFondese_(r, ed, buildFondeseWorkflowState_(r, ed), actor, now);
    procesados++;
  });

  logUserAction_('BACKFILL_FONDESE_INSTRUMENTOS', 'fondese', '', 'OK', { procesados: procesados });
  return serializeForClient_({ ok: true, procesados: procesados });
}

/* Migracion one-run: renombra el estado 'postulando' (que significaba 'ya ingresada, esperando')
   a 'ingresada'. Idempotente: una segunda corrida no encuentra filas por migrar. */
function goPesMigrateFondeseEstados() {
  requireRole_(['superuser']);
  goPesEnsureFondeseSheets_();
  var S = GO_PES_V2.SHEETS;
  var now = new Date();

  var pendientes = getSheetData_(S.FACT_FONDESE).filter(function(r) {
    return String(r.estado_proceso || '').trim() === 'postulando';
  });
  pendientes.forEach(function(r) {
    upsertRowsByKey_(S.FACT_FONDESE, 'fondese_id',
      [Object.assign({}, r, { estado_proceso: 'ingresada', fecha_actualizacion: now })], false);
  });
  if (pendientes.length) invalidateSheetRuntimeCache_(S.FACT_FONDESE);

  logUserAction_('MIGRATE_FONDESE_ESTADOS', 'fondese', '', 'OK', { migrados: pendientes.length });
  return serializeForClient_({ ok: true, migrados: pendientes.length });
}

/* Nombre visible de un llamado: "Primer Llamado FONDESE 2026". */
function goPesFondeseLlamadoNombre_(label, anio) {
  var l = String(label || '').trim();
  var a = String(anio || '').trim();
  if (!l) return a ? ('Llamado FONDESE ' + a) : 'Llamado FONDESE';
  return l + ' FONDESE' + (a ? (' ' + a) : '');
}

/* Guard de adjudicacion FONDESE: al marcar 'adjudicado' se exige (1) que la organizacion no
   tenga otra adjudicacion en el mismo ano calendario (sumando ambos llamados) y (2) que toda
   adjudicacion anterior este cerrada con rendicion aprobada. */
function goPesAssertAdjudicacionFondese_(reg, anioActual) {
  var orgId = String(reg.organizacion_id || '').trim();
  var fondeseId = String(reg.fondese_id || '').trim();
  if (!orgId) return;
  var S = GO_PES_V2.SHEETS;

  var anioByEd = {};
  getSheetData_(S.CFG_FONDESE_EDICIONES).forEach(function(e) {
    anioByEd[String(e.id_edicion || '').trim()] = Number(e.anio || 0);
  });

  var otrosAdj = getSheetData_(S.FACT_FONDESE).filter(function(r) {
    return String(r.organizacion_id || '').trim() === orgId &&
      String(r.fondese_id || '').trim() !== fondeseId &&
      String(r.resultado_adj || '').trim() === 'adjudicado';
  });

  var yaEsteAnio = otrosAdj.some(function(r) {
    return (anioByEd[String(r.id_edicion || '').trim()] || 0) === anioActual;
  });
  if (yaEsteAnio) throw new Error('La organización ya tiene una adjudicación FONDESE en este año calendario; solo se permite una adjudicación al año.');

  var anteriorSinCerrar = otrosAdj.some(function(r) {
    return !(String(r.estado_proceso || '').trim() === 'cerrado' && String(r.estado_rendicion || '').trim() === 'aprobada');
  });
  if (anteriorSinCerrar) throw new Error('La organización tiene una adjudicación FONDESE anterior que no se cerró con la rendición aprobada; complétela antes de una nueva adjudicación.');
}

/* Listado de la puerta de entrada FONDESE (Fase B), POR LLAMADO: todas las organizaciones
   HABILITADAS (hito FOR_04) unidas a su registro FONDESE del llamado seleccionado, o
   'habilitada' si aun no entraron. Devuelve tambien los llamados de la edicion (con nombre
   completo) y las banderas de adjudicacion anual por org. Una org puede estar en proceso en
   ambos llamados; la unicidad es por llamado, no por edicion. */
function goPesGetFondeseHabilitadas(payload) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  goPesEnsureFondeseSheets_();
  var S = GO_PES_V2.SHEETS;
  var p = payload || {};

  var edicionId = String(p.id_edicion || '').trim();
  if (!edicionId) {
    goPesSeedFondese2026_();
    var activaRow = getSheetData_(S.CFG_FONDESE_EDICIONES).find(function(r) {
      return String(r.estado || '').trim() === 'activa';
    });
    edicionId = activaRow ? String(activaRow.id_edicion || '').trim() : '';
  }
  var edicionRow = edicionId ? getSheetData_(S.CFG_FONDESE_EDICIONES).find(function(r) {
    return String(r.id_edicion || '').trim() === edicionId;
  }) : null;
  var edicion = goPesParseFondeseEdicion_(edicionRow);
  var anioEdicion = Number((edicion && edicion.anio) || 0);

  var convocatorias = ((edicion && edicion.convocatorias) || []).map(function(c) {
    return {
      id:              String(c.id || ''),
      label:           String(c.label || ''),
      nombre_completo: goPesFondeseLlamadoNombre_(c.label, anioEdicion),
      fecha_apertura:  c.fecha_apertura || '',
      fecha_cierre:    c.fecha_cierre || ''
    };
  });
  var convId = String(p.convocatoria_id || '').trim();
  if (!convId || !convocatorias.some(function(c) { return c.id === convId; })) {
    convId = convocatorias.length ? convocatorias[0].id : '';
  }

  var eligibleOrgIds = {};
  getSheetData_(S.FACT_AVANCE_HITOS).forEach(function(h) {
    if (String(h.codigo_hito || '').trim().toUpperCase() === 'FOR_04') {
      var orgId = String(h.organizacion_id || '').trim();
      if (orgId) eligibleOrgIds[orgId] = true;
    }
  });

  var anioByEd = {};
  getSheetData_(S.CFG_FONDESE_EDICIONES).forEach(function(e) {
    anioByEd[String(e.id_edicion || '').trim()] = Number(e.anio || 0);
  });

  // Una pasada por FACT_FONDESE: registro por org del llamado seleccionado + banderas de
  // adjudicacion (ya adjudicada este ano / bloqueada por adjudicacion anterior no cerrada).
  var regByOrg = {};
  var adjEsteAnio = {};
  var adjBloqueo = {};
  getSheetData_(S.FACT_FONDESE).forEach(function(r) {
    var orgId = String(r.organizacion_id || '').trim();
    if (!orgId) return;
    if (String(r.id_edicion || '').trim() === edicionId && String(r.convocatoria_id || '').trim() === convId) {
      var prev = regByOrg[orgId];
      if (!prev || String(prev.estado_proceso || '').trim() === 'cerrado') regByOrg[orgId] = r;
    }
    if (String(r.resultado_adj || '').trim() === 'adjudicado') {
      if ((anioByEd[String(r.id_edicion || '').trim()] || 0) === anioEdicion) adjEsteAnio[orgId] = true;
      var cerradaOk = String(r.estado_proceso || '').trim() === 'cerrado' && String(r.estado_rendicion || '').trim() === 'aprobada';
      if (!cerradaOk) adjBloqueo[orgId] = true;
    }
  });

  var lineaMap = {};
  ((edicion && edicion.lineas_producto) || []).forEach(function(l) { lineaMap[String(l.id)] = l.nombre; });
  var convNombre = {};
  convocatorias.forEach(function(c) { convNombre[c.id] = c.nombre_completo; });

  var habilitadas = getSheetData_(S.MAE_ORGANIZACIONES)
    .filter(function(o) { return eligibleOrgIds[String(o.organizacion_id || '').trim()]; })
    .map(function(o) {
      var orgId = String(o.organizacion_id || '').trim();
      var reg = regByOrg[orgId] || null;
      var wf = reg ? buildFondeseWorkflowState_(reg, edicion) : null;
      var alerta = null;
      if (reg) {
        var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        if (wf.code === 'en_armado' && wf.plazos.fecha_cierre) {
          var dc = Math.ceil((new Date(String(wf.plazos.fecha_cierre).replace(/-/g, '/')) - hoy) / 86400000);
          if (!isNaN(dc) && dc <= 14) alerta = { tone: dc < 0 ? 'danger' : 'warning', text: dc < 0 ? 'Convocatoria cerrada' : 'Cierra en ' + dc + ' días' };
        } else if ((wf.code === 'en_ejecucion' || wf.code === 'en_rendicion') && wf.plazos.fecha_cierre_rendicion && String(reg.estado_rendicion || '') !== 'aprobada') {
          var dr = Math.ceil((new Date(String(wf.plazos.fecha_cierre_rendicion).replace(/-/g, '/')) - hoy) / 86400000);
          if (!isNaN(dr) && dr <= 21) alerta = { tone: dr < 0 ? 'danger' : 'warning', text: dr < 0 ? 'Rendición vencida hace ' + Math.abs(dr) + ' días' : 'Rendición vence en ' + dr + ' días' };
        }
      }
      return {
        organizacion_id:        orgId,
        nombre_organizacion:    String(o.nombre_organizacion || ''),
        solicitud_id:           String(o.solicitud_id || ''),
        en_proceso:             !!reg,
        fondese_id:             reg ? String(reg.fondese_id || '') : '',
        estado_fondese:         reg ? wf.code : 'habilitada',
        estado_label:           reg ? wf.status : 'Habilitada',
        avance_pct:             reg ? wf.progressPct : 0,
        convocatoria_id:        convId,
        convocatoria_nombre:    convNombre[convId] || '',
        linea_producto_id:      reg ? String(reg.linea_producto_id || '') : '',
        linea_nombre:           reg ? (lineaMap[String(reg.linea_producto_id || '')] || '') : '',
        monto_adjudicado:       reg ? Number(reg.monto_adjudicado || 0) : 0,
        alerta:                 alerta,
        adjudicada_este_anio:   !!adjEsteAnio[orgId],
        bloqueada_adjudicacion: !!adjBloqueo[orgId]
      };
    })
    .sort(function(a, b) { return a.nombre_organizacion.localeCompare(b.nombre_organizacion, 'es'); });

  return serializeForClient_({
    edicion:         edicion,
    anio:            anioEdicion,
    convocatorias:   convocatorias,
    convocatoria_id: convId,
    habilitadas:     habilitadas
  });
}

/* Accion "Ingresar al armado" (Fase B): valida elegibilidad (FOR_04) y no-duplicado POR LLAMADO
   (una org puede estar en proceso en ambos llamados), y crea el registro FONDESE en 'en_armado'
   con su linea. Delega la escritura y el sync al ledger en goPesUpsertFondese. */
function goPesIngresarFondeseArmado(payload) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  var p = payload || {};
  var orgId = String(p.organizacion_id || '').trim();
  if (!orgId) throw new Error('Falta la organizacion.');
  assertOrganizacionActiva_(orgId); // suspendida = solo lectura
  goPesEnsureFondeseSheets_();
  var S = GO_PES_V2.SHEETS;

  var elegible = getSheetData_(S.FACT_AVANCE_HITOS).some(function(h) {
    return String(h.codigo_hito || '').trim().toUpperCase() === 'FOR_04' &&
      String(h.organizacion_id || '').trim() === orgId;
  });
  if (!elegible) throw new Error('La organizacion no esta habilitada para FONDESE (falta la formalizacion completa).');

  var edicionId = String(p.id_edicion || '').trim();
  if (!edicionId) {
    var activa = getSheetData_(S.CFG_FONDESE_EDICIONES).find(function(r) {
      return String(r.estado || '').trim() === 'activa';
    });
    if (!activa) throw new Error('No hay una edicion de FONDESE activa.');
    edicionId = String(activa.id_edicion || '').trim();
  }

  var convocatoriaId = String(p.convocatoria_id || '').trim();
  if (!convocatoriaId) throw new Error('Falta el llamado (convocatoria) al que ingresa.');

  var yaEnLlamado = getSheetData_(S.FACT_FONDESE).some(function(r) {
    return String(r.organizacion_id || '').trim() === orgId &&
      String(r.id_edicion || '').trim() === edicionId &&
      String(r.convocatoria_id || '').trim() === convocatoriaId &&
      String(r.estado_proceso || '').trim() !== 'cerrado';
  });
  if (yaEnLlamado) throw new Error('La organizacion ya esta en proceso FONDESE en este llamado.');

  return goPesUpsertFondese({
    organizacion_id:     orgId,
    nombre_organizacion: String(p.nombre_organizacion || '').trim(),
    id_edicion:          edicionId,
    convocatoria_id:     convocatoriaId,
    linea_producto_id:   String(p.linea_producto_id || '').trim(),
    estado_proceso:      'en_armado'
  });
}

/* ============================================================
   FORMACIÓN PERMANENTE — Capacitaciones, Certificaciones, Charlas
   ============================================================ */

function ensureFormacion_() {
  ensureSheetsSubset_([
    GO_PES_V2.SHEETS.FACT_FORM_EVENTOS,
    GO_PES_V2.SHEETS.FACT_FORM_INSCRIPCIONES
  ]);
}

function normalizeFormRut_(rut) {
  return String(rut || '').replace(/[.\- ]/g, '').toUpperCase().trim();
}

/* Capacitaciones/certificaciones/charlas a las que una persona (por RUT) se inscribió.
   Vincula el beneficio de formación (por socio) a la ficha de vecino. */
function getCapacitacionesByRut_(rut) {
  var norm = normalizeFormRut_(rut);
  if (!norm) return [];
  ensureFormacion_();
  var eventosById = {};
  getSheetData_(GO_PES_V2.SHEETS.FACT_FORM_EVENTOS).forEach(function(e) {
    eventosById[String(e.evento_id || '')] = e;
  });
  return getSheetData_(GO_PES_V2.SHEETS.FACT_FORM_INSCRIPCIONES)
    .filter(function(i) {
      return normalizeFormRut_(i.rut) === norm && String(i.estado_inscripcion || '') !== 'cancelado';
    })
    .map(function(i) {
      var e = eventosById[String(i.evento_id || '')] || {};
      return {
        inscripcion_id:  String(i.inscripcion_id || ''),
        evento_id:       String(i.evento_id || ''),
        titulo:          String(e.titulo || ''),
        tipo:            String(e.tipo || ''),
        fecha_evento:    e.fecha_evento || '',
        lugar:           String(e.lugar || ''),
        estado_evento:   String(e.estado || ''),
        tipo_inscrito:   String(i.tipo_inscrito || '')
      };
    })
    .sort(function(a, b) { return new Date(b.fecha_evento || 0) - new Date(a.fecha_evento || 0); });
}

function autoCloseFormEventos_() {
  var now = new Date();
  var rows = getSheetData_(GO_PES_V2.SHEETS.FACT_FORM_EVENTOS);
  var toClose = rows.filter(function(ev) {
    if (String(ev.estado || '') !== 'activo') return false;
    if (!ev.fecha_evento) return false;

    var fechaRaw = ev.fecha_evento;
    var d = fechaRaw instanceof Date
      ? new Date(fechaRaw.getFullYear(), fechaRaw.getMonth(), fechaRaw.getDate())
      : (function() {
          var p = String(fechaRaw).substring(0, 10).split('-');
          return p.length === 3 ? new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)) : null;
        })();
    if (!d || isNaN(d.getTime())) return false;

    var horaFin = String(ev.hora_fin || '23:59').trim();
    var tm = horaFin.match(/^(\d{1,2}):(\d{2})/);
    d.setHours(tm ? parseInt(tm[1], 10) : 23, tm ? parseInt(tm[2], 10) : 59, 0, 0);

    return now >= new Date(d.getTime() + 24 * 60 * 60 * 1000);
  });

  if (!toClose.length) return 0;

  toClose.forEach(function(ev) {
    upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_FORM_EVENTOS, 'evento_id',
      [Object.assign({}, ev, { estado: 'cerrado', updated_by: 'sistema', updated_at: now })], false);
  });

  logProcessing_('AUTO_CLOSE_FORM_EVENTOS', { cerrados: toClose.length });
  return toClose.length;
}

function goPesAutoCloseFormEventos() {
  autoCloseFormEventos_();
}

function goPesGetFormEventos() {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  ensureFormacion_();
  autoCloseFormEventos_();

  const S = GO_PES_V2.SHEETS;
  const eventos = getSheetData_(S.FACT_FORM_EVENTOS)
    .filter(function(e) { return String(e.estado || '') !== 'cancelado'; });
  const inscripciones = getSheetData_(S.FACT_FORM_INSCRIPCIONES);

  var countByEvento = {};
  inscripciones.forEach(function(i) {
    if (String(i.estado_inscripcion || '') !== 'cancelado') {
      var id = String(i.evento_id || '');
      countByEvento[id] = (countByEvento[id] || 0) + 1;
    }
  });

  var result = eventos.map(function(e) {
    return Object.assign({}, e, { cantidad_inscritos: countByEvento[String(e.evento_id || '')] || 0 });
  });

  result.sort(function(a, b) {
    var da = a.fecha_evento ? new Date(a.fecha_evento) : new Date(0);
    var db = b.fecha_evento ? new Date(b.fecha_evento) : new Date(0);
    return db - da;
  });

  return serializeForClient_({ eventos: result });
}

function goPesUpsertFormEvento(payload) {
  var actor = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  ensureFormacion_();
  payload = payload || {};

  var actorEmail = getBeneficiosActorEmail_(actor);
  var tipoInscripcion = String(payload.tipo_inscripcion || '').toLowerCase().trim();
  if (tipoInscripcion === 'abierta') {
    if (!payload.pin) throw new Error('Se requiere la clave de SUPERUSER para crear eventos con inscripción abierta.');
    goPesValidatePin_(GO_PES_PIN_CONTEXTS.EVENTO_ABIERTO, payload.pin, actorEmail);
  }

  var tipo = String(payload.tipo || '').toLowerCase().trim();
  if (['capacitacion', 'certificacion', 'charla'].indexOf(tipo) === -1) {
    throw new Error('Tipo de evento inválido. Debe ser: capacitacion, certificacion o charla.');
  }
  var titulo = String(payload.titulo || '').trim();
  if (!titulo) throw new Error('El título del evento es obligatorio.');
  if (!payload.fecha_evento) throw new Error('La fecha del evento es obligatoria.');
  if (['exclusiva', 'abierta'].indexOf(tipoInscripcion) === -1) {
    throw new Error('Tipo de inscripción inválido. Debe ser: exclusiva o abierta.');
  }

  var actorEmail = getBeneficiosActorEmail_(actor);
  var now = new Date();
  var isNew = !String(payload.evento_id || '').trim();
  var eventoId = isNew ? goPesNextIdSafe_('form_evento', 'EVT') : String(payload.evento_id).trim();

  var row = {
    evento_id:        eventoId,
    tipo:             tipo,
    titulo:           titulo,
    descripcion:      String(payload.descripcion || '').trim(),
    fecha_evento:     payload.fecha_evento,
    hora_inicio:      String(payload.hora_inicio || '').trim(),
    hora_fin:         String(payload.hora_fin || '').trim(),
    lugar:            String(payload.lugar || '').trim(),
    tipo_inscripcion: tipoInscripcion,
    cupo_maximo:      parseInt(payload.cupo_maximo || 0, 10) || 0,
    estado:           String(payload.estado || 'activo').toLowerCase().trim(),
    updated_by:       actorEmail,
    updated_at:       now
  };

  if (isNew) {
    row.created_by = actorEmail;
    row.created_at = now;
  }

  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_FORM_EVENTOS, 'evento_id', [row], false);
  logUserAction_('UPSERT_FORM_EVENTO', 'form_evento', eventoId, 'OK', { actor: actorEmail, tipo: tipo, nuevo: isNew });

  return serializeForClient_({ ok: true, evento_id: eventoId });
}

function goPesDeleteFormEvento(payload) {
  var actor = requireRole_(['superuser']);
  ensureFormacion_();
  payload = payload || {};
  var eventoId = String(payload.evento_id || '').trim();
  if (!eventoId) throw new Error('Falta evento_id.');

  var actorEmail = getBeneficiosActorEmail_(actor);
  var now = new Date();
  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_FORM_EVENTOS, 'evento_id', [{
    evento_id: eventoId, estado: 'cancelado', updated_by: actorEmail, updated_at: now
  }], false);

  return serializeForClient_({ ok: true });
}

function goPesGetFormInscripciones(payload) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  ensureFormacion_();
  payload = payload || {};
  var eventoId = String(payload.evento_id || '').trim();
  if (!eventoId) throw new Error('Falta evento_id.');

  var evento = findByField_(GO_PES_V2.SHEETS.FACT_FORM_EVENTOS, 'evento_id', eventoId, false);
  if (!evento) throw new Error('Evento no encontrado.');

  var inscripciones = getSheetData_(GO_PES_V2.SHEETS.FACT_FORM_INSCRIPCIONES).filter(function(i) {
    return String(i.evento_id || '') === eventoId && String(i.estado_inscripcion || '') !== 'cancelado';
  });

  return serializeForClient_({ evento: evento, inscripciones: inscripciones });
}

function goPesUpsertFormInscripcion(payload) {
  var actor = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  ensureFormacion_();
  payload = payload || {};

  var eventoId = String(payload.evento_id || '').trim();
  if (!eventoId) throw new Error('Falta evento_id.');

  var evento = findByField_(GO_PES_V2.SHEETS.FACT_FORM_EVENTOS, 'evento_id', eventoId, false);
  if (!evento) throw new Error('Evento no encontrado.');
  if (String(evento.estado || '') === 'cerrado')   throw new Error('El evento está cerrado. No se aceptan nuevas inscripciones.');
  if (String(evento.estado || '') === 'cancelado') throw new Error('El evento fue cancelado.');

  var rut    = String(payload.rut    || '').trim();
  var nombre = String(payload.nombre || '').trim();
  if (!rut)    throw new Error('El RUT es obligatorio.');
  if (!nombre) throw new Error('El nombre es obligatorio.');

  var socioId = '';
  if (String(evento.tipo_inscripcion || '') === 'exclusiva') {
    var socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS);
    var socio  = socios.find ? socios.find(function(s) {
      return normalizeFormRut_(s.run_socio) === normalizeFormRut_(rut);
    }) : null;
    if (!socio) {
      throw new Error('Inscripción exclusiva: el RUT ingresado no corresponde a un socio registrado en el sistema.');
    }
    socioId = String(socio.socio_id || '');
  }

  var cupoMax = parseInt(evento.cupo_maximo || 0, 10);
  if (cupoMax > 0) {
    var countActivos = getSheetData_(GO_PES_V2.SHEETS.FACT_FORM_INSCRIPCIONES).filter(function(i) {
      return String(i.evento_id || '') === eventoId && String(i.estado_inscripcion || '') !== 'cancelado';
    }).length;
    if (countActivos >= cupoMax) throw new Error('El evento ya alcanzó su cupo máximo (' + cupoMax + ' inscripciones).');
  }

  var existing = getSheetData_(GO_PES_V2.SHEETS.FACT_FORM_INSCRIPCIONES).filter(function(i) {
    return String(i.evento_id || '') === eventoId &&
           normalizeFormRut_(i.rut) === normalizeFormRut_(rut) &&
           String(i.estado_inscripcion || '') !== 'cancelado';
  })[0];
  if (existing) throw new Error('Ya existe una inscripción activa con ese RUT para este evento.');

  var actorEmail   = getBeneficiosActorEmail_(actor);
  var now          = new Date();
  var inscripcionId = goPesNextIdSafe_('form_inscripcion', 'INS');

  var row = {
    inscripcion_id:        inscripcionId,
    evento_id:             eventoId,
    tipo_inscrito:         socioId ? 'socio' : 'externo',
    socio_id:              socioId,
    rut:                   rut,
    nombre:                nombre,
    telefono:              String(payload.telefono || '').trim(),
    correo:                String(payload.correo || '').trim(),
    organizacion_vinculada: String(payload.organizacion_vinculada || '').trim(),
    estado_inscripcion:    'activo',
    created_by:            actorEmail,
    created_at:            now,
    updated_by:            actorEmail,
    updated_at:            now
  };

  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_FORM_INSCRIPCIONES, 'inscripcion_id', [row], false);
  logUserAction_('UPSERT_FORM_INSCRIPCION', 'form_inscripcion', inscripcionId, 'OK', { actor: actorEmail, evento_id: eventoId });

  return serializeForClient_({ ok: true, inscripcion_id: inscripcionId });
}

function goPesGetFormSocioByRut(payload) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  payload = payload || {};
  var rut = String(payload.rut || '').trim();
  if (!rut) return serializeForClient_({ socio: null });

  var socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS);
  var socio  = socios.filter ? socios.filter(function(s) {
    return normalizeFormRut_(s.run_socio) === normalizeFormRut_(rut);
  })[0] : null;

  return serializeForClient_({ socio: socio || null });
}

function goPesGetOrganizacionesConHito5() {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  var rows = getSheetData_(GO_PES_V2.SHEETS.VW_AVANCE_ORGANIZACION);
  var orgs = rows
    .filter(function(r) {
      return parseInt(r.total_hitos_cumplidos || 0, 10) >= 5 && String(r.nombre_organizacion || '').trim();
    })
    .map(function(r) {
      return { id: String(r.organizacion_id || '').trim(), nombre: String(r.nombre_organizacion || '').trim() };
    })
    .sort(function(a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  return serializeForClient_({ orgs: orgs });
}

function goPesCancelFormInscripcion(payload) {
  var actor = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  ensureFormacion_();
  payload = payload || {};
  var inscripcionId = String(payload.inscripcion_id || '').trim();
  if (!inscripcionId) throw new Error('Falta inscripcion_id.');

  var actorEmail = getBeneficiosActorEmail_(actor);
  var now        = new Date();

  var found = getSheetData_(GO_PES_V2.SHEETS.FACT_FORM_INSCRIPCIONES).filter(function(i) {
    return String(i.inscripcion_id || '') === inscripcionId;
  })[0];
  if (!found) throw new Error('Inscripción no encontrada.');

  var merged = Object.assign({}, found, { estado_inscripcion: 'cancelado', updated_by: actorEmail, updated_at: now });
  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_FORM_INSCRIPCIONES, 'inscripcion_id', [merged], false);

  return serializeForClient_({ ok: true });
}
