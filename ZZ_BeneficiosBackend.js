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

  const sync = ensureCamaras1414EligibilityForOrg_(organizacionId);
  if (!sync.assignment) {
    throw new Error('La organizacion no es elegible para CAMARAS 1414 porque aun no registra el certificado definitivo.');
  }

  const now = new Date();
  const actorEmail = getBeneficiosActorEmail_(actor);
  const org = sync.organizacion || findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  const checklist = normalizeCamarasChecklistPayload_(payload.checklist);
  const response = normalizeCamarasResponsePayload_(payload.response);
  const visit = normalizeCamarasVisitPayload_(payload.visit);
  const installation = normalizeCamarasInstallationPayload_(payload.installation);
  const agreement = normalizeCamarasAgreementPayload_(payload.agreement);
  const closure = normalizeCamarasClosurePayload_(payload.closure);
  const caseRow = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', org && org.solicitud_id, false) || {};
  const socios = getCamarasSociosByOrganizacionId_(organizacionId, caseRow);
  const committeeContact = normalizeCamarasCommitteeContactPayload_(payload.committeeContact, socios, caseRow);
  const emailDraft = buildCamarasEmailDraft_(org, checklist, {
    eligibilityDate: sync.eligibilityDate
  });
  const emailPayload = normalizeCamarasEmailPayload_(payload.email, emailDraft);
  if (emailPayload.sentConfirmed && !emailPayload.sentDate) {
    throw new Error('Debes registrar la fecha de envio cuando confirmas que el correo fue enviado.');
  }
  if (!emailPayload.sentConfirmed && emailPayload.sentDate) {
    throw new Error('Marca "Correo enviado" para confirmar la fecha de envio registrada.');
  }

  const detailRows = buildCamarasDetailRows_(sync.assignment, {
    checklist: checklist,
    committeeContact: committeeContact,
    email: emailPayload,
    response: response,
    visit: visit,
    installation: installation,
    agreement: agreement,
    closure: closure
  }, actorEmail, now);

  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG_HITOS, 'beneficio_org_hito_id', detailRows, false);

  const detailMap = indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(sync.assignment.beneficio_org_id));
  const computed = buildCamarasWorkflowState_(sync.assignment, detailMap, sync.eligibilityDate);
  const nextAssignment = Object.assign({}, sync.assignment, {
    elegible_flag: 'Si',
    criterio_elegibilidad: 'Certificado definitivo registrado en Avance (FOR_04 / hito 11).',
    motivo_no_elegibilidad: '',
    activo_flag: closure.closed ? 'No' : 'Si',
    estado_beneficio: computed.status,
    avance_beneficio_pct: computed.progressPct,
    proximo_hito_beneficio: computed.nextStep,
    fecha_inicio_beneficio: sync.assignment.fecha_inicio_beneficio || sync.eligibilityDate || now,
    fecha_termino_beneficio: closure.closedDate || agreement.receivedDate || sync.assignment.fecha_termino_beneficio || '',
    resultado_beneficio: closure.closed ? 'Beneficio cerrado' : (agreement.received ? 'Convenio recibido' : sync.assignment.resultado_beneficio || ''),
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
  const selectedOrgId = String(payload && payload.organizacion_id || '').trim();
  const sync = syncAllCamaras1414Eligibility_();
  const config = getCamaras1414Config_();
  const assignments = sync.assignments || [];
  const alertRows = buildCamarasAlertRows_(assignments, config);

  const eligibleRows = assignments.filter(function(row) {
    return isCamarasEligibleListRow_(row);
  });
  const activeRows = assignments.filter(function(row) {
    return isCamarasActiveListRow_(row);
  });

  return {
    config: config,
    summary: {
      totalEligible: eligibleRows.length,
      totalActive: activeRows.length,
      totalClosed: assignments.filter(function(row) { return String(row.estado_beneficio || '') === 'Beneficio cerrado'; }).length,
      totalAlerts: alertRows.length
    },
    eligible_rows: eligibleRows,
    active_rows: activeRows,
    alerts_preview: alertRows,
    selected_org_id: selectedOrgId,
    detail: selectedOrgId ? buildCamarasDetailByOrgId_(selectedOrgId) : null
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

  const assignments = getSheetData_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG)
    .filter(function(row) {
      return String(row.beneficio_codigo || '').trim().toUpperCase() === 'CAMARAS_1414';
    })
    .map(function(row) {
      return buildCamarasAssignmentSummary_(row);
    })
    .sort(function(a, b) {
      return String(a.nombre_organizacion || '').localeCompare(String(b.nombre_organizacion || ''), 'es');
    });

  return {
    assignments: assignments
  };
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

function buildCamarasDetailByOrgId_(organizacionId) {
  const sync = ensureCamaras1414EligibilityForOrg_(organizacionId);
  if (!sync.assignment || !sync.organizacion) return null;

  const detailMap = indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(sync.assignment.beneficio_org_id));
  const workflow = buildCamarasWorkflowState_(sync.assignment, detailMap, sync.eligibilityDate);
  const caso = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', sync.organizacion.solicitud_id, false) || {};
  const checklist = buildCamarasChecklistView_(detailMap);
  const config = getCamaras1414Config_();
  const emailDraft = buildCamarasEmailDraft_(sync.organizacion, checklist, {
    eligibilityDate: sync.eligibilityDate
  });
  const assignmentSummary = buildCamarasAssignmentSummary_(sync.assignment);
  const committeeContact = buildCamarasCommitteeContactView_(detailMap, sync.organizacion, caso);

  return {
    organizacion: sync.organizacion,
    contacto: {
      solicitud_id: sync.organizacion.solicitud_id || '',
      contacto_socio_id: committeeContact.socio_id || '',
      contacto_nombre: committeeContact.nombre_socio || '',
      telefono_contacto: committeeContact.telefono_contacto || caso.telefono_contacto || '',
      correo_contacto: committeeContact.correo_contacto || caso.correo_contacto || '',
      direccion_referencia: committeeContact.direccion || sync.organizacion.direccion_referencia || caso.direccion_original || '',
      uv: sync.organizacion.uv || caso.uv || '',
      sector: sync.organizacion.sector || caso.sector || ''
    },
    committeeContact: committeeContact,
    elegibilidad: {
      cumple_flag: true,
      fecha_hito_11: sync.eligibilityDate || '',
      label: 'Elegible por certificado definitivo',
      detalle: 'Hito 11 de Avance completado.'
    },
    assignment: assignmentSummary,
    state_options: getCamarasStateOptions_(),
    config: config,
    email: buildCamarasEmailView_(detailMap, emailDraft),
    checklist: checklist,
    response: buildCamarasResponseView_(detailMap),
    visit: buildCamarasVisitView_(detailMap),
    installation: buildCamarasInstallationView_(detailMap),
    agreement: buildCamarasAgreementView_(detailMap),
    closure: buildCamarasClosureView_(detailMap),
    alerts: buildCamarasAlertRows_([assignmentSummary], config),
    workflow: workflow,
    tracking: buildCamarasTrackingSummary_(sync.assignment, detailMap, sync.eligibilityDate, config)
  };
}

function buildCamarasAssignmentSummary_(row) {
  const assignment = row || {};
  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', assignment.organizacion_id, false) || {};
  const detailMap = assignment.beneficio_org_id
    ? indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(assignment.beneficio_org_id))
    : {};
  const eligibilityDate = getCamarasEligibilityDateFromAssignment_(assignment);
  const workflow = buildCamarasWorkflowState_(assignment, detailMap, eligibilityDate);

  return {
    beneficio_org_id: assignment.beneficio_org_id || '',
    beneficio_codigo: 'CAMARAS_1414',
    organizacion_id: assignment.organizacion_id || '',
    org_instrumento_id: assignment.org_instrumento_id || '',
    nombre_organizacion: org.nombre_organizacion || assignment.organizacion_id || '',
    responsable_beneficio: assignment.responsable_beneficio || org.responsable_actual || '',
    estado_beneficio: workflow.status,
    avance_beneficio_pct: workflow.progressPct,
    proximo_hito_beneficio: workflow.nextStep,
    fecha_inicio_beneficio: assignment.fecha_inicio_beneficio || eligibilityDate || '',
    fecha_termino_beneficio: assignment.fecha_termino_beneficio || '',
    observacion_beneficio: assignment.observacion_beneficio || '',
    elegible_flag: 'Si',
    criterio_elegibilidad: assignment.criterio_elegibilidad || 'Certificado definitivo registrado en Avance.',
    estado_constitucion: org.estado_constitucion || '',
    fecha_hito_11: eligibilityDate || '',
    ultima_actualizacion: assignment.updated_at || '',
    alert_tone: workflow.alertTone || '',
    alert_label: workflow.alertLabel || ''
  };
}

function buildCamarasWorkflowState_(assignment, detailMap, eligibilityDate) {
  const detail = detailMap || {};
  const email = parseCamarasDetailPayload_(detail.MAIL_SOLICITUD);
  const response = parseCamarasDetailPayload_(detail.VISITA_RESPUESTA);
  const visit = parseCamarasDetailPayload_(detail.VISITA_TECNICA);
  const installation = parseCamarasDetailPayload_(detail.INSTALACION);
  const agreement = parseCamarasDetailPayload_(detail.CONVENIO);
  const closure = parseCamarasDetailPayload_(detail.CIERRE);

  const stage = resolveCamarasStageIndex_({
    eligibilityDate: eligibilityDate,
    email: email,
    response: response,
    visit: visit,
    installation: installation,
    agreement: agreement,
    closure: closure
  });
  const stages = getCamarasStateOptions_();
  const progressPct = Math.round(((stage.index + 1) / stages.length) * 100);
  return {
    index: stage.index,
    status: stage.label,
    progressPct: progressPct,
    nextStep: stage.nextStep,
    alertTone: stage.alertTone || '',
    alertLabel: stage.alertLabel || ''
  };
}

function resolveCamarasStageIndex_(data) {
  const email = data.email || {};
  const response = data.response || {};
  const visit = data.visit || {};
  const installation = data.installation || {};
  const agreement = data.agreement || {};
  const closure = data.closure || {};

  if (closure.closed && closure.closedDate) {
    return { index: 9, label: 'Beneficio cerrado', nextStep: 'Sin acciones pendientes.' };
  }
  if (agreement.received && agreement.receivedDate) {
    return { index: 8, label: 'Convenio recibido', nextStep: 'Marcar cierre del beneficio.' };
  }
  if (String(installation.status || '').trim() && String(installation.status || '').trim() !== 'Sin informacion') {
    return {
      index: 7,
      label: 'Instalacion en seguimiento',
      nextStep: 'Dar seguimiento a instalacion y esperar convenio firmado.'
    };
  }
  if (visit.visitCompleted) {
    return {
      index: 6,
      label: 'Visita realizada',
      nextStep: 'Registrar seguimiento de instalacion o novedades posteriores a la visita.'
    };
  }
  if (response.visitDate) {
    return { index: 5, label: 'Visita agendada', nextStep: 'Registrar resultado de la visita tecnica.' };
  }
  if (response.hasResponse) {
    return { index: 4, label: 'En espera de respuesta', nextStep: 'Registrar fecha de visita o seguimiento de la respuesta.' };
  }
  if ((email.sentConfirmed || email.sentDate) && email.sentDate) {
    return { index: 3, label: 'Solicitud enviada', nextStep: 'Registrar respuesta de Seguridad Publica o fecha de visita.' };
  }
  if (email.prepared || email.subject || email.body) {
    return { index: 2, label: 'Solicitud de visita tecnica preparada', nextStep: 'Enviar solicitud formal a Seguridad Publica.' };
  }
  if (data.eligibilityDate) {
    return { index: 0, label: 'Elegible por certificado definitivo', nextStep: 'Preparar checklist documental e iniciar gestion.' };
  }
  return { index: 1, label: 'Gestion pendiente', nextStep: 'Revisar elegibilidad del beneficio.' };
}

function getCamarasStateOptions_() {
  return [
    'Elegible por certificado definitivo',
    'Gestion pendiente',
    'Solicitud de visita tecnica preparada',
    'Solicitud enviada',
    'En espera de respuesta',
    'Visita agendada',
    'Visita realizada',
    'Instalacion en seguimiento',
    'Convenio recibido',
    'Beneficio cerrado'
  ];
}

function getCamarasChecklistDefinitions_() {
  return [
    { code: 'DOC_CONTACTO', label: 'Datos de contacto' },
    { code: 'DOC_GEOREFERENCIA', label: 'Geo referencia de socios' },
    { code: 'DOC_FOTO_LIBRO', label: 'Foto libro socios' },
    { code: 'DOC_CERT_VIGENCIA', label: 'Certificado de vigencia' },
    { code: 'DOC_CERT_DIRECTORIO', label: 'Certificado de directorio' }
  ];
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

function buildCamarasChecklistView_(detailMap) {
  return getCamarasChecklistDefinitions_().map(function(def) {
    const payload = parseCamarasDetailPayload_(detailMap[def.code]);
    return {
      code: def.code,
      label: def.label,
      status: payload.status || 'Pendiente',
      date: payload.date || '',
      observation: payload.observation || ''
    };
  });
}

function buildCamarasEmailView_(detailMap, emailDraft) {
  const payload = parseCamarasDetailPayload_(detailMap.MAIL_SOLICITUD);
  return {
    recipient: payload.recipient || emailDraft.recipient,
    subject: payload.subject || emailDraft.subject,
    body: payload.body || emailDraft.body,
    prepared: !!payload.prepared || !!payload.subject || !!payload.body,
    preparedDate: payload.preparedDate || '',
    sentConfirmed: payload.sentConfirmed === undefined ? !!payload.sentDate : !!payload.sentConfirmed,
    sentDate: payload.sentDate || '',
    notes: payload.notes || ''
  };
}

function buildCamarasTrackingSummary_(assignment, detailMap, eligibilityDate, config) {
  const detail = detailMap || {};
  const email = parseCamarasDetailPayload_(detail.MAIL_SOLICITUD);
  const response = parseCamarasDetailPayload_(detail.VISITA_RESPUESTA);
  const visit = parseCamarasDetailPayload_(detail.VISITA_TECNICA);
  const installation = parseCamarasDetailPayload_(detail.INSTALACION);
  const agreement = parseCamarasDetailPayload_(detail.CONVENIO);
  const closure = parseCamarasDetailPayload_(detail.CIERRE);
  const today = stripTimeFromDate_(new Date());

  let responseWait = null;
  const sentDate = (email.sentConfirmed || email.sentDate) && email.sentDate ? stripTimeFromDate_(email.sentDate) : '';
  if (sentDate) {
    const responseStopDate = resolveCamarasResponseStopDate_(sentDate, response, visit);
    const endDate = responseStopDate || today;
    const days = Math.max(0, diffDays_(sentDate, endDate));
    responseWait = {
      active: !responseStopDate,
      days: days,
      label: !responseStopDate
        ? days + ' dias desde envio'
        : days + ' dias hasta respuesta / visita',
      referenceDate: sentDate,
      endDate: responseStopDate || '',
      tone: !responseStopDate && days > Number(config.maxDaysWithoutVisitResponse || 0)
        ? 'danger'
        : (!responseStopDate ? 'info' : 'success')
    };
  }

  return {
    responseWait: responseWait,
    inactivity: buildCamarasInactivitySummary_(assignment, {
      email: email,
      response: response,
      visit: visit,
      installation: installation,
      agreement: agreement,
      closure: closure,
      eligibilityDate: eligibilityDate
    }, config)
  };
}

function buildCamarasCommitteeContactView_(detailMap, organizacion, caseRow) {
  const org = organizacion || {};
  const caso = caseRow || {};
  const payload = parseCamarasDetailPayload_(detailMap.CONTACTO_COMITE);
  const socios = getCamarasSociosByOrganizacionId_(org.organizacion_id, caso);
  const selectedId = String(payload.socio_id || '').trim();
  const selectedSocio = socios.find(function(item) {
    return String(item.socio_id || '').trim() === selectedId;
  }) || null;

  const fallback = selectedSocio || payload || {};
  const current = {
    socio_id: selectedSocio ? String(selectedSocio.socio_id || '').trim() : selectedId,
    nombre_socio: sanitizeCamarasText_(fallback.nombre_socio, 200),
    cargo: sanitizeCamarasText_(fallback.cargo, 120),
    telefono_contacto: sanitizeCamarasText_(fallback.telefono_contacto || caso.telefono_contacto, 80),
    correo_contacto: sanitizeCamarasText_(fallback.correo_contacto || caso.correo_contacto, 200),
    direccion: sanitizeCamarasText_(fallback.direccion || fallback.direccion_socio || org.direccion_referencia || caso.direccion_original, 300),
    available: !!selectedSocio
  };

  return {
    socio_id: current.socio_id || '',
    nombre_socio: current.nombre_socio || '',
    cargo: current.cargo || '',
    telefono_contacto: current.telefono_contacto || '',
    correo_contacto: current.correo_contacto || '',
    direccion: current.direccion || '',
    available: current.available,
    emptyMessage: socios.length ? '' : 'No hay socios disponibles para seleccionar',
    options: socios.map(function(item) {
      return {
        socio_id: String(item.socio_id || '').trim(),
        nombre_socio: String(item.nombre_socio || '').trim(),
        cargo: String(item.cargo || '').trim(),
        telefono_contacto: String(item.telefono_contacto || '').trim(),
        correo_contacto: String(item.correo_contacto || '').trim(),
        direccion: String(item.direccion || '').trim()
      };
    })
  };
}

function resolveCamarasResponseStopDate_(sentDate, response, visit) {
  const base = stripTimeFromDate_(sentDate);
  if (!base) return '';

  return [
    response && response.responseDate,
    response && response.visitDate,
    visit && visit.performedDate
  ].map(asDateOrBlank_).filter(function(date) {
    return date && stripTimeFromDate_(date).getTime() >= base.getTime();
  }).sort(function(a, b) {
    return a.getTime() - b.getTime();
  })[0] || '';
}

function buildCamarasInactivitySummary_(assignment, data, config) {
  const threshold = Number(config && config.maxDaysWithoutProgress || 0);
  const today = stripTimeFromDate_(new Date());
  const email = data && data.email || {};
  const response = data && data.response || {};
  const visit = data && data.visit || {};
  const installation = data && data.installation || {};
  const agreement = data && data.agreement || {};
  const closure = data && data.closure || {};
  if (!threshold || closure.closed) return null;

  let reference = '';
  let label = '';
  let detail = '';

  if (agreement.receivedDate && !closure.closed) {
    reference = agreement.receivedDate;
    label = 'Convenio recibido sin cierre';
    detail = 'El convenio ya fue recibido y el cierre del beneficio sigue pendiente.';
  } else if ((installation.knownDate || String(installation.status || '').trim() === 'Instalada') && !agreement.receivedDate) {
    reference = installation.knownDate || visit.performedDate || response.visitDate || '';
    label = 'Convenio pendiente sin novedad';
    detail = 'No se han registrado nuevas novedades posteriores a instalacion / convenio.';
  } else if (visit.performedDate && !agreement.receivedDate) {
    reference = visit.performedDate;
    label = 'Visita pendiente sin actualizacion';
    detail = 'La visita tecnica fue realizada y no hay una novedad posterior registrada.';
  } else if (response.visitDate && !visit.performedDate) {
    reference = response.visitDate;
    label = 'Visita agendada sin actualizacion';
    detail = 'Existe una fecha de visita, pero no se ha registrado su resultado.';
  } else if ((email.sentConfirmed || email.sentDate) && email.sentDate && !response.responseDate && !response.visitDate && !visit.performedDate) {
    reference = email.sentDate;
    label = 'Correo enviado sin respuesta';
    detail = 'No se ha registrado respuesta ni fecha de visita desde el envio.';
  } else {
    return null;
  }

  const referenceDate = stripTimeFromDate_(reference);
  if (!referenceDate || !today) return null;

  const days = Math.max(0, diffDays_(referenceDate, today));
  return {
    active: days > threshold,
    days: days,
    threshold: threshold,
    label: label,
    detail: detail,
    referenceDate: referenceDate
  };
}

function buildCamarasResponseView_(detailMap) {
  const payload = parseCamarasDetailPayload_(detailMap.VISITA_RESPUESTA);
  return {
    hasResponse: !!payload.hasResponse,
    responseDate: payload.responseDate || '',
    visitDate: payload.visitDate || '',
    observations: payload.observations || ''
  };
}

function buildCamarasVisitView_(detailMap) {
  const payload = parseCamarasDetailPayload_(detailMap.VISITA_TECNICA);
  return {
    visitCompleted: !!payload.visitCompleted,
    performedDate: payload.performedDate || '',
    cameraCount: payload.cameraCount === '' ? '' : Number(payload.cameraCount || 0),
    installationLocations: payload.installationLocations || '',
    powerPoints: payload.powerPoints || '',
    internetPoints: payload.internetPoints || '',
    technicalObservations: payload.technicalObservations || ''
  };
}

function getCamarasSociosByOrganizacionId_(organizacionId, caseRow) {
  const orgId = String(organizacionId || '').trim();
  if (!orgId) return [];

  const caso = caseRow || findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'organizacion_id', orgId, false) || {};
  return getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS)
    .filter(function(row) {
      return String(row.organizacion_id || '').trim() === orgId;
    })
    .map(function(row) {
      return {
        socio_id: String(row.socio_id || '').trim(),
        organizacion_id: orgId,
        nombre_socio: String(row.nombre_socio || '').trim(),
        cargo: String(row.cargo || '').trim(),
        telefono_contacto: String(caso.telefono_contacto || '').trim(),
        correo_contacto: String(caso.correo_contacto || '').trim(),
        direccion: String(row.direccion_socio || '').trim()
      };
    })
    .filter(function(row) {
      return row.socio_id && row.nombre_socio;
    })
    .sort(function(a, b) {
      return String(a.nombre_socio || '').localeCompare(String(b.nombre_socio || ''), 'es', { sensitivity: 'base' });
    });
}

function buildCamarasInstallationView_(detailMap) {
  const payload = parseCamarasDetailPayload_(detailMap.INSTALACION);
  return {
    status: payload.status || 'Sin informacion',
    knownDate: payload.knownDate || '',
    observations: payload.observations || ''
  };
}

function buildCamarasAgreementView_(detailMap) {
  const payload = parseCamarasDetailPayload_(detailMap.CONVENIO);
  return {
    received: !!payload.received,
    receivedDate: payload.receivedDate || '',
    observations: payload.observations || ''
  };
}

function buildCamarasClosureView_(detailMap) {
  const payload = parseCamarasDetailPayload_(detailMap.CIERRE);
  return {
    closed: !!payload.closed,
    closedDate: payload.closedDate || '',
    observations: payload.observations || ''
  };
}

function buildCamarasEmailDraft_(organizacion, checklist, options) {
  const org = organizacion || {};
  const caso = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', org.solicitud_id, false) || {};
  const eligibilityDate = options && options.eligibilityDate ? options.eligibilityDate : '';
  const subject = 'Solicitud de visita tecnica CAMARAS 1414 - ' + String(org.nombre_organizacion || org.organizacion_id || 'Organizacion').trim();
  const bodyLines = [
    'Estimada Barbara Collado:',
    '',
    'Junto con saludar, solicitamos coordinar visita tecnica para la organizacion ' +
      String(org.nombre_organizacion || 'sin nombre').trim() +
      (org.organizacion_id ? ' (' + org.organizacion_id + ')' : '') + '.',
    '',
    'La organizacion ya obtuvo su certificado definitivo' + (eligibilityDate ? ' con fecha ' + formatDateOnlyForMail_(eligibilityDate) + '.' : '.'),
    '',
    'Datos de contacto y referencia:',
    '- Telefono: ' + String(caso.telefono_contacto || 'Pendiente').trim(),
    '- Correo: ' + String(caso.correo_contacto || 'Pendiente').trim(),
    '- Direccion / referencia: ' + String(org.direccion_referencia || caso.direccion_original || 'Pendiente').trim(),
    '- UV / Sector: ' + [org.uv ? 'UV ' + org.uv : '', org.sector || caso.sector || ''].filter(Boolean).join(' / '),
    '',
    'Estado de informacion/documentacion requerida:',
    (checklist || []).map(function(item) {
      return '- ' + item.label + ': ' + String(item.status || 'Pendiente').trim();
    }).join('\n'),
    '',
    'Agradecemos informar disponibilidad y fecha de visita tecnica.',
    '',
    'Saludos cordiales,'
  ];

  return {
    recipient: 'barbara.collado@seguridadprovidencia.cl',
    subject: subject,
    body: bodyLines.join('\n')
  };
}

function normalizeCamarasCommitteeContactPayload_(value, socios, caseRow) {
  const input = value || {};
  const socioId = String(input.socio_id || '').trim();
  if (!socioId) {
    return {
      socio_id: '',
      nombre_socio: '',
      cargo: '',
      telefono_contacto: '',
      correo_contacto: ''
    };
  }

  const socio = (socios || []).find(function(item) {
    return String(item.socio_id || '').trim() === socioId;
  });
  if (!socio) {
    if (input.unavailable && String(input.nombre_socio || '').trim()) {
      const caso = caseRow || {};
      return {
        socio_id: socioId,
        nombre_socio: sanitizeCamarasText_(input.nombre_socio, 200),
        cargo: sanitizeCamarasText_(input.cargo, 120),
        telefono_contacto: sanitizeCamarasText_(input.telefono_contacto || caso.telefono_contacto, 80),
        correo_contacto: sanitizeCamarasText_(input.correo_contacto || caso.correo_contacto, 200),
        direccion: sanitizeCamarasText_(input.direccion || caso.direccion_original, 300)
      };
    }
    throw new Error('El socio seleccionado ya no está disponible para este comité. Recarga la ficha y selecciona un contacto válido.');
  }

  const caso = caseRow || {};
  return {
    socio_id: socio.socio_id,
    nombre_socio: sanitizeCamarasText_(socio.nombre_socio, 200),
    cargo: sanitizeCamarasText_(socio.cargo, 120),
    telefono_contacto: sanitizeCamarasText_(socio.telefono_contacto || caso.telefono_contacto, 80),
    correo_contacto: sanitizeCamarasText_(socio.correo_contacto || caso.correo_contacto, 200),
    direccion: sanitizeCamarasText_(socio.direccion || caso.direccion_original, 300)
  };
}

function buildCamarasAlertRows_(assignments, config) {
  const today = stripTimeFromDate_(new Date());
  const high = Number(config.alertHighDays || 3);
  const medium = Math.max(high, Number(config.alertMediumDays || 7));
  const rows = [];

  (assignments || []).forEach(function(row) {
    const detailMap = row.beneficio_org_id
      ? indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(row.beneficio_org_id))
      : {};
    const email = parseCamarasDetailPayload_(detailMap.MAIL_SOLICITUD);
    const response = parseCamarasDetailPayload_(detailMap.VISITA_RESPUESTA);
    const visit = parseCamarasDetailPayload_(detailMap.VISITA_TECNICA);
    const installation = parseCamarasDetailPayload_(detailMap.INSTALACION);
    const agreement = parseCamarasDetailPayload_(detailMap.CONVENIO);
    const closure = parseCamarasDetailPayload_(detailMap.CIERRE);
    if (closure.closed) return;

    const checks = [
      {
        active: !(email.sentConfirmed || email.sentDate),
        reference: row.fecha_hito_11 || row.fecha_inicio_beneficio,
        limitDays: Number(config.maxDaysToSendRequest || 5),
        label: 'Gestion sin solicitud enviada'
      },
      {
        active: !!(email.sentConfirmed || email.sentDate) && !!email.sentDate && !response.visitDate,
        reference: email.sentDate,
        limitDays: Number(config.maxDaysWithoutVisitResponse || 10),
        label: 'Solicitud enviada sin fecha de visita'
      },
      {
        active: !!visit.performedDate && !agreement.receivedDate,
        reference: visit.performedDate,
        limitDays: Number(config.maxDaysToConvenio || 20),
        label: 'Visita realizada sin convenio recibido'
      }
    ];

    checks.forEach(function(check) {
      const ref = asDateOrBlank_(check.reference);
      if (!check.active || !ref) return;
      const due = addDays_(stripTimeFromDate_(ref), check.limitDays);
      const daysUntil = diffDays_(today, due);
      if (daysUntil > medium) return;
      rows.push({
        organizacion_id: row.organizacion_id,
        nombre_organizacion: row.nombre_organizacion,
        estado_beneficio: row.estado_beneficio,
        title: check.label,
        due_date: due,
        days_until: daysUntil,
        tone: daysUntil <= high ? 'danger' : (daysUntil <= medium ? 'warning' : 'info'),
        detail: daysUntil < 0
          ? 'Atrasado por ' + Math.abs(daysUntil) + ' dias.'
          : 'Vence en ' + daysUntil + ' dias.'
      });
    });

    const inactivity = buildCamarasInactivitySummary_(row, {
      email: email,
      response: response,
      visit: visit,
      installation: installation,
      agreement: agreement,
      closure: closure,
      eligibilityDate: row.fecha_hito_11 || row.fecha_inicio_beneficio || ''
    }, config);
    if (inactivity && inactivity.active) {
      rows.push({
        organizacion_id: row.organizacion_id,
        nombre_organizacion: row.nombre_organizacion,
        estado_beneficio: row.estado_beneficio,
        title: 'Mas de ' + inactivity.threshold + ' dias sin avance',
        due_date: inactivity.referenceDate,
        days_until: -inactivity.days,
        tone: 'danger',
        detail: inactivity.label + '. ' + inactivity.days + ' dias sin novedad.'
      });
    }
  });

  return rows.sort(function(a, b) {
    return Number(a.days_until || 0) - Number(b.days_until || 0);
  });
}

function isCamarasEligibleListRow_(row) {
  const status = String(row && row.estado_beneficio || '').trim();
  return status === 'Elegible por certificado definitivo' || status === 'Gestion pendiente' || status === 'Solicitud de visita tecnica preparada';
}

function isCamarasActiveListRow_(row) {
  const status = String(row && row.estado_beneficio || '').trim();
  return [
    'Solicitud enviada',
    'En espera de respuesta',
    'Visita agendada',
    'Visita realizada',
    'Instalacion en seguimiento',
    'Convenio recibido'
  ].indexOf(status) !== -1;
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

  (payload.checklist || []).forEach(function(item, index) {
    rows.push(Object.assign({}, base, {
      beneficio_org_hito_id: deterministicId_('BENH', [beneficioOrgId, item.code]),
      hito_codigo: item.code,
      hito_nombre: item.label,
      fecha_referencia: item.date || '',
      estado_hito: item.status || 'Pendiente',
      orden_visual: (index + 1) * 10,
      observacion_hito: item.observation || '',
      valor_texto: item.status || 'Pendiente',
      payload_json: JSON.stringify(item)
    }));
  });

  rows.push(buildCamarasSingleDetailRow_(base, beneficioOrgId, 'CONTACTO_COMITE', 'Contacto definido por la organizacion', 90, payload.committeeContact));
  rows.push(buildCamarasSingleDetailRow_(base, beneficioOrgId, 'MAIL_SOLICITUD', 'Solicitud de visita tecnica', 100, payload.email));
  rows.push(buildCamarasSingleDetailRow_(base, beneficioOrgId, 'VISITA_RESPUESTA', 'Respuesta / fecha de visita', 110, payload.response));
  rows.push(buildCamarasSingleDetailRow_(base, beneficioOrgId, 'VISITA_TECNICA', 'Resultado visita tecnica', 120, payload.visit));
  rows.push(buildCamarasSingleDetailRow_(base, beneficioOrgId, 'INSTALACION', 'Seguimiento instalacion', 130, payload.installation));
  rows.push(buildCamarasSingleDetailRow_(base, beneficioOrgId, 'CONVENIO', 'Convenio firmado', 140, payload.agreement));
  rows.push(buildCamarasSingleDetailRow_(base, beneficioOrgId, 'CIERRE', 'Cierre beneficio', 150, payload.closure));

  return rows;
}

function buildCamarasSingleDetailRow_(base, beneficioOrgId, code, label, order, payload) {
  const safe = payload || {};
  return Object.assign({}, base, {
    beneficio_org_hito_id: deterministicId_('BENH', [beneficioOrgId, code]),
    hito_codigo: code,
    hito_nombre: label,
    fecha_referencia: resolveCamarasPayloadMainDate_(safe),
    estado_hito: resolveCamarasPayloadState_(code, safe),
    orden_visual: order,
    valor_texto: resolveCamarasPayloadTextValue_(code, safe),
    valor_numero: resolveCamarasPayloadNumericValue_(code, safe),
    valor_flag: resolveCamarasPayloadFlagValue_(code, safe),
    observacion_hito: safe.observations || safe.notes || '',
    payload_json: JSON.stringify(safe)
  });
}

function resolveCamarasPayloadMainDate_(payload) {
  return payload.sentDate ||
    payload.visitDate ||
    payload.performedDate ||
    payload.receivedDate ||
    payload.closedDate ||
    payload.date ||
    payload.knownDate ||
    payload.responseDate ||
    payload.preparedDate ||
    '';
}

function resolveCamarasPayloadState_(code, payload) {
  switch (code) {
    case 'CONTACTO_COMITE':
      return payload.socio_id ? 'Definido' : 'Pendiente';
    case 'MAIL_SOLICITUD':
      return (payload.sentConfirmed || payload.sentDate) && payload.sentDate ? 'Enviado' : (payload.prepared ? 'Preparado' : 'Pendiente');
    case 'VISITA_RESPUESTA':
      return payload.visitDate ? 'Visita agendada' : (payload.hasResponse ? 'Respondido' : 'Sin respuesta');
    case 'VISITA_TECNICA':
      return payload.visitCompleted ? 'Realizada' : 'Pendiente';
    case 'INSTALACION':
      return payload.status || 'Sin informacion';
    case 'CONVENIO':
      return payload.received ? 'Recibido' : 'Pendiente';
    case 'CIERRE':
      return payload.closed ? 'Cerrado' : 'Abierto';
    default:
      return payload.status || 'Pendiente';
  }
}

function resolveCamarasPayloadTextValue_(code, payload) {
  if (code === 'CONTACTO_COMITE') return payload.nombre_socio || '';
  if (code === 'VISITA_TECNICA') return payload.installationLocations || '';
  if (code === 'MAIL_SOLICITUD') return payload.subject || '';
  return payload.status || '';
}

function resolveCamarasPayloadNumericValue_(code, payload) {
  if (code === 'VISITA_TECNICA' && payload.cameraCount !== '') {
    return Number(payload.cameraCount || 0);
  }
  return '';
}

function resolveCamarasPayloadFlagValue_(code, payload) {
  if (code === 'CONTACTO_COMITE') return payload.socio_id ? 'Si' : 'No';
  if (code === 'MAIL_SOLICITUD') return (payload.sentConfirmed || payload.sentDate) ? 'Si' : 'No';
  if (code === 'VISITA_RESPUESTA') return payload.hasResponse ? 'Si' : 'No';
  if (code === 'VISITA_TECNICA') return payload.visitCompleted ? 'Si' : 'No';
  if (code === 'CONVENIO') return payload.received ? 'Si' : 'No';
  if (code === 'CIERRE') return payload.closed ? 'Si' : 'No';
  return payload.status ? 'Si' : 'No';
}

function normalizeCamarasChecklistPayload_(value) {
  const input = Array.isArray(value) ? value : [];
  const byCode = input.reduce(function(acc, item) {
    const code = String(item && item.code || '').trim();
    if (code) acc[code] = item;
    return acc;
  }, {});
  return getCamarasChecklistDefinitions_().map(function(def) {
    const item = byCode[def.code] || {};
    return {
      code: def.code,
      label: def.label,
      status: sanitizeCamarasSelect_(item.status, ['Pendiente', 'Disponible', 'En revision'], 'Pendiente'),
      date: sanitizeCamarasDate_(item.date),
      observation: sanitizeCamarasText_(item.observation, 500)
    };
  });
}

function normalizeCamarasEmailPayload_(value, defaults) {
  const input = value || {};
  return {
    recipient: sanitizeCamarasText_(input.recipient || defaults.recipient, 200) || defaults.recipient,
    subject: sanitizeCamarasText_(input.subject || defaults.subject, 250) || defaults.subject,
    body: sanitizeCamarasText_(input.body || defaults.body, 8000) || defaults.body,
    prepared: true,
    preparedDate: sanitizeCamarasDate_(input.preparedDate) || sanitizeCamarasDate_(new Date()),
    sentConfirmed: toBool_(input.sentConfirmed),
    sentDate: sanitizeCamarasDate_(input.sentDate),
    notes: sanitizeCamarasText_(input.notes, 1000)
  };
}

function normalizeCamarasResponsePayload_(value) {
  const input = value || {};
  return {
    hasResponse: toBool_(input.hasResponse),
    responseDate: sanitizeCamarasDate_(input.responseDate),
    visitDate: sanitizeCamarasDate_(input.visitDate),
    observations: sanitizeCamarasText_(input.observations, 1000)
  };
}

function normalizeCamarasVisitPayload_(value) {
  const input = value || {};
  return {
    visitCompleted: toBool_(input.visitCompleted),
    performedDate: sanitizeCamarasDate_(input.performedDate),
    cameraCount: input.cameraCount === '' || input.cameraCount === null || input.cameraCount === undefined
      ? ''
      : Math.max(0, Number(input.cameraCount || 0)),
    installationLocations: sanitizeCamarasText_(input.installationLocations, 3000),
    powerPoints: sanitizeCamarasText_(input.powerPoints, 3000),
    internetPoints: sanitizeCamarasText_(input.internetPoints, 3000),
    technicalObservations: sanitizeCamarasText_(input.technicalObservations, 3000),
    observations: sanitizeCamarasText_(input.technicalObservations, 3000)
  };
}

function normalizeCamarasInstallationPayload_(value) {
  const input = value || {};
  return {
    status: sanitizeCamarasSelect_(input.status, ['Sin informacion', 'Pendiente', 'En proceso', 'Instalada'], 'Sin informacion'),
    knownDate: sanitizeCamarasDate_(input.knownDate),
    observations: sanitizeCamarasText_(input.observations, 2000)
  };
}

function normalizeCamarasAgreementPayload_(value) {
  const input = value || {};
  return {
    received: toBool_(input.received),
    receivedDate: sanitizeCamarasDate_(input.receivedDate),
    observations: sanitizeCamarasText_(input.observations, 2000)
  };
}

function normalizeCamarasClosurePayload_(value) {
  const input = value || {};
  return {
    closed: toBool_(input.closed),
    closedDate: sanitizeCamarasDate_(input.closedDate),
    observations: sanitizeCamarasText_(input.observations, 2000)
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

function sanitizeCamarasSelect_(value, options, fallback) {
  const candidate = String(value == null ? '' : value).trim();
  return options.indexOf(candidate) !== -1 ? candidate : fallback;
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
    'estado_ejecucion', 'estado_rendicion', 'checklist_docs',
    'fecha_creacion', 'fecha_actualizacion', 'creado_por'
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

function goPesGetFondeseList(idEdicion) {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  goPesEnsureFondeseSheets_();
  var S = GO_PES_V2.SHEETS;

  var edicionId = String(idEdicion || '').trim();
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
  var totalDocs = edicion ? (edicion.documentos || []).length : 0;

  var rows = getSheetData_(S.FACT_FONDESE)
    .filter(function(r) {
      return !edicionId || String(r.id_edicion || '').trim() === edicionId;
    })
    .map(function(r) {
      var checklist = {};
      try { checklist = JSON.parse(String(r.checklist_docs || '{}')); } catch(e) {}
      var docsEntregados = Object.keys(checklist).filter(function(k) { return checklist[k]; }).length;
      return Object.assign({}, r, {
        checklist_docs:  checklist,
        docs_entregados: docsEntregados,
        total_docs:      totalDocs,
        pct_docs:        totalDocs > 0 ? Math.round(docsEntregados / totalDocs * 100) : 0
      });
    });

  return serializeForClient_({ rows: rows, edicion: edicion });
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

  var checklistRaw = p.checklist_docs;
  if (checklistRaw && typeof checklistRaw === 'object') {
    checklistRaw = JSON.stringify(checklistRaw);
  } else {
    checklistRaw = String(checklistRaw || '{}');
  }

  var id = String(p.fondese_id || '').trim();
  if (id) {
    upsertRowsByKey_(S.FACT_FONDESE, 'fondese_id',
      [Object.assign({}, p, { checklist_docs: checklistRaw, fecha_actualizacion: now })], false);
    invalidateSheetRuntimeCache_(S.FACT_FONDESE);
    logUserAction_('UPSERT_FONDESE', 'fondese', id, 'OK', { organizacion_id: p.organizacion_id });
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
  appendRowObjects_(S.FACT_FONDESE, [Object.assign({}, p, {
    fondese_id:          newId,
    id_edicion:          edicionId,
    checklist_docs:      checklistRaw,
    fecha_creacion:      now,
    fecha_actualizacion: now,
    creado_por:          email
  })]);
  invalidateSheetRuntimeCache_(S.FACT_FONDESE);
  logUserAction_('UPSERT_FONDESE', 'fondese', newId, 'OK', { organizacion_id: p.organizacion_id });
  return serializeForClient_({ ok: true, fondese_id: newId });
}

function goPesGetOrgsElegiblesFondese() {
  requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  goPesEnsureFondeseSheets_();

  var avanceHitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS);
  var eligibleOrgIds = {};
  avanceHitos.forEach(function(h) {
    if (String(h.codigo_hito || '').trim().toUpperCase() === 'FOR_04') {
      var orgId = String(h.organizacion_id || '').trim();
      if (orgId) eligibleOrgIds[orgId] = true;
    }
  });

  var activaEdicion = getSheetData_(GO_PES_V2.SHEETS.CFG_FONDESE_EDICIONES).filter(function(r) {
    return String(r.estado || '').trim() === 'activa';
  })[0] || null;
  var activaEdicionId = activaEdicion ? String(activaEdicion.id_edicion || '').trim() : '';

  var fondeseRows = getSheetData_(GO_PES_V2.SHEETS.FACT_FONDESE);

  var orgsConActivaPostulacion = {};
  fondeseRows.forEach(function(r) {
    var edId = String(r.id_edicion || '').trim();
    var estado = String(r.estado_proceso || '').trim();
    if ((!activaEdicionId || edId === activaEdicionId) && estado !== 'cerrado') {
      var orgId = String(r.organizacion_id || '').trim();
      if (orgId) orgsConActivaPostulacion[orgId] = true;
    }
  });

  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES)
    .filter(function(r) {
      var orgId = String(r.organizacion_id || '').trim();
      return eligibleOrgIds[orgId] && !orgsConActivaPostulacion[orgId];
    })
    .map(function(r) {
      return {
        organizacion_id:     String(r.organizacion_id || ''),
        nombre_organizacion: String(r.nombre_organizacion || ''),
        solicitud_id:        String(r.solicitud_id || '')
      };
    })
    .sort(function(a, b) {
      return a.nombre_organizacion.localeCompare(b.nombre_organizacion, 'es');
    });

  var existingFondese = fondeseRows.map(function(r) {
    return {
      organizacion_id: String(r.organizacion_id || ''),
      convocatoria_id: String(r.convocatoria_id || ''),
      estado_proceso:  String(r.estado_proceso || '')
    };
  });

  return serializeForClient_({ orgs: orgs, existingFondese: existingFondese });
}
