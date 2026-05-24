/**
 * ZZ_AvanceBackend.gs
 * Backend operativo del módulo "Avance"
 *
 * Requiere:
 * - ZZ_AvancePhase1.gs
 * - ZZ_AvancePhase2.gs
 * - Utilidades base del proyecto:
 *   requireRole_, getSheetData_, findByField_, appendRowObject_, replaceSheetData_,
 *   logProcessing_, logUserAction_, nextId_ (opcional), getUsuarioActual (opcional)
 */

/** =========================
 *  WRAPPERS VISIBLES
 *  ========================= */

function goPesRefrescarVistaAvanceOrganizacion() {
  return buildVistaAvanceOrganizacion_();
}

function goPesDiagnosticarAvanceBackend() {
  return goPesDiagnosticarAvanceBackend_();
}

/** =========================
 *  API CLIENTE
 *  ========================= */

function getCatalogosAvanceClient() {
  requireModuleAccess_('seguimiento', ['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const hitos = goPesGetCatalogoHitosAvance_();

  return goPesAvanceToClientSafe_({
    estadosAvance: (GO_PES_V2.AVANCE && GO_PES_V2.AVANCE.ESTADOS) || ['Activo', 'Stand by', 'Detenido', 'Finalizado'],
    tramosAvance: (GO_PES_V2.AVANCE && GO_PES_V2.AVANCE.TRAMOS) || ['Preconstitución', 'Formalización posterior'],
    hitosCatalogo: hitos,
    hitosPorTramo: {
      preconstitucion: hitos.filter(function(h) { return String(h.tramo) === 'Preconstitución'; }),
      formalizacion: hitos.filter(function(h) { return String(h.tramo) === 'Formalización posterior'; })
    }
  });
}

function getOrganizacionesAvanceClient() {
  const diag = goPesDiagStart_('ZZ_AvanceBackend.getOrganizacionesAvanceClient', {});
  requireAnyModuleAccess_(['seguimiento', 'socios'], ['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const cached = typeof getCatalogCacheJson_ === 'function' &&
    typeof GO_PES_CATALOG_CACHE_KEYS !== 'undefined'
    ? getCatalogCacheJson_(GO_PES_CATALOG_CACHE_KEYS.AVANCE_ORGS_CLIENT)
    : null;
  if (cached) {
    goPesDiagEnd_(diag, {
      result_count: (cached.organizacionesList || []).length,
      cache_hit: true
    });
    return cached;
  }

  const rows = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES)
    .filter(function(r) {
      return String(r.organizacion_id || '').trim() && String(r.nombre_organizacion || '').trim();
    })
    .sort(function(a, b) {
      return String(a.nombre_organizacion || '').localeCompare(String(b.nombre_organizacion || ''), 'es');
    });

  const result = goPesAvanceToClientSafe_({
    organizacionesList: rows.map(function(r) {
      return {
        value: String(r.organizacion_id || '').trim(),
        label: String(r.nombre_organizacion || '').trim()
      };
    })
  });
  if (typeof putCatalogCacheJson_ === 'function' && typeof GO_PES_CATALOG_CACHE_KEYS !== 'undefined') {
    putCatalogCacheJson_(GO_PES_CATALOG_CACHE_KEYS.AVANCE_ORGS_CLIENT, result, 300);
  }
  goPesDiagEnd_(diag, {
    result_count: result.organizacionesList.length
  });
  return result;
}

function getGruposVecinosAvanceClient() {
  const diag = goPesDiagStart_('ZZ_AvanceBackend.getGruposVecinosAvanceClient', {});
  requireModuleAccess_('seguimiento', ['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const rows = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS)
    .filter(function(r) {
      return String(r.solicitud_id || '').trim() && !String(r.organizacion_id || '').trim();
    })
    .sort(function(a, b) {
      return String(a.fecha_ingreso || '').localeCompare(String(b.fecha_ingreso || ''));
    });

  const result = goPesAvanceToClientSafe_({
    gruposList: rows.map(function(r) {
      const solicitudId = String(r.solicitud_id || '').trim();
      const nombre = String(r.nombre_completo || '').trim();
      const direccion = String(r.direccion_original || '').trim();
      return {
        value: solicitudId,
        label: [nombre || 'Grupo de vecinos', solicitudId, direccion].filter(Boolean).join(' - '),
        solicitud_id: solicitudId,
        nombre_completo: nombre,
        direccion_original: direccion
      };
    })
  });

  goPesDiagEnd_(diag, { result_count: result.gruposList.length });
  return result;
}

function getTimelineAvance(payload) {
  requireModuleAccess_('seguimiento', ['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const ctx = goPesResolveAvanceContext_(payload);
  const timeline = goPesGetTimelineAvanceRows_(ctx.organizacion.organizacion_id);

  return goPesAvanceToClientSafe_(timeline);
}

function getBotonesAvanceEstado(payload) {
  requireModuleAccess_('seguimiento', ['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const ctx = goPesResolveAvanceContext_(payload);
  const buttons = goPesBuildBotonesAvanceEstado_(ctx.organizacion.organizacion_id, ctx.organizacion.solicitud_id);

  return goPesAvanceToClientSafe_(buttons);
}

function getAvanceOrganizacion(payload) {
  const diag = goPesDiagStart_('ZZ_AvanceBackend.getAvanceOrganizacion', payload || {});
  requireModuleAccess_('seguimiento', ['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const ctx = goPesResolveAvanceContext_(payload);
  const orgId = ctx.organizacion.organizacion_id;
  const solicitudId = ctx.organizacion.solicitud_id || '';

  goPesEnsureEstadoAvanceInicial_(orgId, solicitudId, requireModuleAccess_('seguimiento', ['operador', 'coordinador', 'administrador', 'superuser']));

  const estadoActual = goPesGetEstadoAvanceActual_(orgId, solicitudId);
  const timeline = goPesGetTimelineAvanceRows_(orgId);
  const botones = goPesBuildBotonesAvanceEstado_(orgId, solicitudId);
  const resumen = goPesBuildResumenAvance_(ctx.organizacion, estadoActual, timeline);

  const result = goPesAvanceToClientSafe_({
    organizacion: ctx.organizacion,
    estado: estadoActual,
    resumen: resumen,
    botones: botones,
    timeline: timeline
  });
  goPesDiagEnd_(diag, {
    timeline_count: result.timeline.length
  });
  return result;
}

function getAvanceGrupoVecinos(payload) {
  const diag = goPesDiagStart_('ZZ_AvanceBackend.getAvanceGrupoVecinos', payload || {});
  requireModuleAccess_('seguimiento', ['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const solicitudId = String(payload && payload.solicitud_id || '').trim();
  if (!solicitudId) throw new Error('Falta solicitud_id.');

  const caso = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false);
  if (!caso) throw new Error('No se encontró el Grupo de vecinos indicado.');
  if (String(caso.organizacion_id || '').trim()) {
    throw new Error('Esta solicitud ya tiene organización creada. Continúa el Tramo 2 desde Organización.');
  }

  const timeline = goPesGetTimelineAvanceRowsBySolicitud_(solicitudId);
  const estadoActual = goPesGetEstadoAvanceActualBySolicitud_(solicitudId);
  const botones = goPesBuildBotonesAvanceGrupoVecinos_(solicitudId);
  const resumen = goPesBuildResumenAvanceGrupoVecinos_(caso, estadoActual, timeline);

  const result = goPesAvanceToClientSafe_({
    context_type: 'grupo_vecinos',
    grupo: caso,
    estado: estadoActual,
    resumen: resumen,
    botones: botones,
    timeline: timeline
  });
  goPesDiagEnd_(diag, { timeline_count: result.timeline.length });
  return result;
}

function registrarHitoAvance(payload) {
  const diag = goPesDiagStart_('ZZ_AvanceBackend.registrarHitoAvance', payload || {});
  const user = requireModuleAccess_('seguimiento', ['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  payload = payload || {};

  const organizacionId = String(payload.organizacion_id || '').trim();
  const solicitudIdPayload = String(payload.solicitud_id || '').trim();
  const codigoHito = String(payload.codigo_hito || '').trim();
  const observacion = String(payload.observacion || '').trim();
  const fechaHito = asDateOrBlank_(payload.fecha_hito);

  if (!codigoHito) throw new Error('Falta codigo_hito.');
  if (!fechaHito) throw new Error('Debes indicar una fecha del hito.');

  if (!organizacionId && solicitudIdPayload) {
    return registrarHitoAvanceGrupoVecinos_(payload, user, diag);
  }

  if (!organizacionId) throw new Error('Falta organizacion_id.');

  let org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!org) throw new Error('No se encontró la organización indicada.');

  const hitoCatalogo = goPesFindHitoCatalogo_(codigoHito);
  if (!hitoCatalogo) throw new Error('El código de hito no existe en el catálogo.');

  const yaExiste = goPesFindAvanceHitoByOrgAndCodigo_(organizacionId, codigoHito);
  if (yaExiste) {
    throw new Error('Este hito ya fue registrado para la organización.');
  }

  let solicitudId = String(org.solicitud_id || '').trim();
  goPesEnsureEstadoAvanceInicial_(organizacionId, solicitudId, user);

  const estadoActual = goPesGetEstadoAvanceActual_(organizacionId, solicitudId);
  if (String(estadoActual.estado_avance || 'Activo') !== 'Activo') {
    throw new Error('No se pueden registrar hitos porque el avance no está en estado Activo.');
  }

  const validacion = goPesValidatePuedeRegistrarHito_(organizacionId, hitoCatalogo);
  if (!validacion.ok) {
    throw new Error(validacion.message || 'No se puede registrar el hito.');
  }

  if (goPesIsHitoCreacionOrganizacion_(hitoCatalogo)) {
    org = goPesCrearOrganizacionDesdeHitoDocumentacion_(org, payload, user);
    solicitudId = String(org.solicitud_id || '').trim();
  }

  const now = new Date();
  const avanceHitoId = goPesNextIdSafe_('avance_hito', 'AVH');

  appendRowObject_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS, {
    avance_hito_id: avanceHitoId,
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    codigo_hito: hitoCatalogo.codigo_hito,
    tramo: hitoCatalogo.tramo,
    orden_hito: hitoCatalogo.orden_hito,
    nombre_hito: hitoCatalogo.nombre_hito,
    fecha_hito: fechaHito,
    usuario_registro: goPesGetUserEmail_(user),
    timestamp_registro: now,
    observacion: observacion
  });

  upsertVistaAvanceOrganizacionRowById_(organizacionId);

  logProcessing_(
    'INFO',
    'registrarHitoAvance',
    'avance_hito',
    avanceHitoId,
    goPesGetUserEmail_(user),
    'OK',
    {
      organizacion_id: organizacionId,
      solicitud_id: solicitudId,
      codigo_hito: codigoHito
    }
  );

  logUserAction_(
    'REGISTRAR_HITO_AVANCE',
    'avance_hito',
    avanceHitoId,
    'OK',
    {
      organizacion_id: organizacionId,
      solicitud_id: solicitudId,
      codigo_hito: codigoHito,
      nombre_hito: hitoCatalogo.nombre_hito
    }
  );

  const result = goPesAvanceToClientSafe_({
    ok: true,
    avance_hito_id: avanceHitoId,
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    codigo_hito: codigoHito,
    nombre_hito: hitoCatalogo.nombre_hito
  });
  goPesDiagEnd_(diag, {
    ok: true,
    organizacion_id: organizacionId,
    codigo_hito: codigoHito
  });
  return result;
}

function registrarHitoAvanceGrupoVecinos_(payload, user, diag) {
  const solicitudId = String(payload.solicitud_id || '').trim();
  const codigoHito = String(payload.codigo_hito || '').trim();
  const observacion = String(payload.observacion || '').trim();
  const fechaHito = asDateOrBlank_(payload.fecha_hito);

  const caso = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false);
  if (!caso) throw new Error('No se encontró el Grupo de vecinos indicado.');
  if (String(caso.organizacion_id || '').trim()) {
    throw new Error('Esta solicitud ya tiene organización creada. Continúa el Tramo 2 desde Organización.');
  }

  const hitoCatalogo = goPesFindHitoCatalogo_(codigoHito);
  if (!hitoCatalogo) throw new Error('El código de hito no existe en el catálogo.');
  if (!goPesIsTramoPreconstitucion_(hitoCatalogo.tramo)) {
    throw new Error('El Tramo 1 solo permite registrar hitos de Grupo de vecinos.');
  }

  const yaExiste = goPesFindAvanceHitoBySolicitudAndCodigo_(solicitudId, codigoHito);
  if (yaExiste) {
    throw new Error('Este hito ya fue registrado para el Grupo de vecinos.');
  }

  const validacion = goPesValidatePuedeRegistrarHitoSolicitud_(solicitudId, hitoCatalogo);
  if (!validacion.ok) {
    throw new Error(validacion.message || 'No se puede registrar el hito.');
  }

  let organizacionCreada = null;
  if (goPesIsHitoCreacionOrganizacion_(hitoCatalogo)) {
    organizacionCreada = goPesCrearOrganizacionDesdeGrupoVecinos_(caso, payload, user);
  }

  const now = new Date();
  const avanceHitoId = goPesNextIdSafe_('avance_hito', 'AVH');
  const organizacionId = organizacionCreada ? String(organizacionCreada.organizacion_id || '') : '';

  appendRowObject_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS, {
    avance_hito_id: avanceHitoId,
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    codigo_hito: hitoCatalogo.codigo_hito,
    tramo: hitoCatalogo.tramo,
    orden_hito: hitoCatalogo.orden_hito,
    nombre_hito: hitoCatalogo.nombre_hito,
    fecha_hito: fechaHito,
    usuario_registro: goPesGetUserEmail_(user),
    timestamp_registro: now,
    observacion: observacion
  });

  if (organizacionId) {
    upsertVistaAvanceOrganizacionRowById_(organizacionId);
  }

  logProcessing_('INFO', 'registrarHitoAvanceGrupoVecinos', 'avance_hito', avanceHitoId, goPesGetUserEmail_(user), 'OK', {
    solicitud_id: solicitudId,
    organizacion_id: organizacionId,
    codigo_hito: codigoHito
  });
  logUserAction_('REGISTRAR_HITO_AVANCE_GRUPO_VECINOS', 'avance_hito', avanceHitoId, 'OK', {
    solicitud_id: solicitudId,
    organizacion_id: organizacionId,
    codigo_hito: codigoHito,
    nombre_hito: hitoCatalogo.nombre_hito
  });

  const result = goPesAvanceToClientSafe_({
    ok: true,
    avance_hito_id: avanceHitoId,
    solicitud_id: solicitudId,
    organizacion_id: organizacionId,
    codigo_hito: codigoHito,
    nombre_hito: hitoCatalogo.nombre_hito,
    warning_nombre_duplicado: organizacionCreada ? String(organizacionCreada.warning_nombre_duplicado || '') : ''
  });
  goPesDiagEnd_(diag, {
    ok: true,
    solicitud_id: solicitudId,
    organizacion_id: organizacionId,
    codigo_hito: codigoHito
  });
  return result;
}

function cambiarEstadoAvance(payload) {
  const diag = goPesDiagStart_('ZZ_AvanceBackend.cambiarEstadoAvance', payload || {});
  const user = requireModuleAccess_('seguimiento', ['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  payload = payload || {};

  const organizacionId = String(payload.organizacion_id || '').trim();
  const nuevoEstado = String(payload.estado_avance || '').trim();
  const motivo = String(payload.motivo_estado || '').trim();
  const fechaEstado = asDateOrBlank_(payload.fecha_estado) || new Date();

  if (!organizacionId) throw new Error('Falta organizacion_id.');
  if (!nuevoEstado) throw new Error('Falta estado_avance.');

  const estadosPermitidos = ((GO_PES_V2.AVANCE && GO_PES_V2.AVANCE.ESTADOS) || ['Activo', 'Stand by', 'Detenido', 'Finalizado'])
    .map(function(x) { return String(x); });

  if (estadosPermitidos.indexOf(nuevoEstado) === -1) {
    throw new Error('El estado de avance no es válido.');
  }

  if ((nuevoEstado === 'Stand by' || nuevoEstado === 'Detenido') && !motivo) {
    throw new Error('Debes indicar un motivo para Stand by o Detenido.');
  }

  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!org) throw new Error('No se encontró la organización indicada.');

  const solicitudId = String(org.solicitud_id || '').trim();
  const now = new Date();
  const avanceEstadoId = goPesNextIdSafe_('avance_estado', 'AVE');

  goPesDeactivateEstadosAvanceActivos_(organizacionId);

  appendRowObject_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO, {
    avance_estado_id: avanceEstadoId,
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    estado_avance: nuevoEstado,
    motivo_estado: motivo,
    fecha_estado: fechaEstado,
    usuario_estado: goPesGetUserEmail_(user),
    timestamp_registro: now,
    activo_flag: true
  });

  upsertVistaAvanceOrganizacionRowById_(organizacionId);

  logProcessing_(
    'INFO',
    'cambiarEstadoAvance',
    'avance_estado',
    avanceEstadoId,
    goPesGetUserEmail_(user),
    'OK',
    {
      organizacion_id: organizacionId,
      solicitud_id: solicitudId,
      estado_avance: nuevoEstado
    }
  );

  logUserAction_(
    'CAMBIAR_ESTADO_AVANCE',
    'avance_estado',
    avanceEstadoId,
    'OK',
    {
      organizacion_id: organizacionId,
      solicitud_id: solicitudId,
      estado_avance: nuevoEstado,
      motivo_estado: motivo
    }
  );

  const result = goPesAvanceToClientSafe_({
    ok: true,
    avance_estado_id: avanceEstadoId,
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    estado_avance: nuevoEstado
  });
  goPesDiagEnd_(diag, {
    ok: true,
    organizacion_id: organizacionId,
    estado_avance: nuevoEstado
  });
  return result;
}

/** =========================
 *  BUILDERS / VISTAS
 *  ========================= */

function buildVistaAvanceOrganizacion_() {
  const diag = goPesDiagStart_('ZZ_AvanceBackend.buildVistaAvanceOrganizacion_', {});
  goPesEnsureAvanceBackendReady_();

  const headers = goPesGetAvanceHeaders_(GO_PES_V2.SHEETS.VW_AVANCE_ORGANIZACION);
  const orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES)
    .filter(function(r) {
      return String(r.organizacion_id || '').trim();
    });

  const estados = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO);
  const hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS);

  const estadosByOrg = groupBy_(estados, 'organizacion_id');
  const hitosByOrg = groupBy_(hitos, 'organizacion_id');

  const rows = orgs.map(function(org) {
    const orgId = String(org.organizacion_id || '').trim();
    const solicitudId = String(org.solicitud_id || '').trim();

    const estadoActual = goPesGetEstadoAvanceActualFromRows_(estadosByOrg[orgId] || [], solicitudId);
    const timeline = (hitosByOrg[orgId] || []).slice().sort(function(a, b) {
      return new Date(b.timestamp_registro || 0) - new Date(a.timestamp_registro || 0);
    });

    const ultimo = timeline[0] || {};
    const totalPre = timeline.filter(function(x) { return String(x.tramo || '') === 'Preconstitución'; }).length;
    const totalFor = timeline.filter(function(x) { return String(x.tramo || '') === 'Formalización posterior'; }).length;

    const map = {
      organizacion_id: orgId,
      solicitud_id: solicitudId,
      nombre_organizacion: String(org.nombre_organizacion || ''),
      estado_avance: String(estadoActual.estado_avance || 'Activo'),
      ultimo_hito_codigo: String(ultimo.codigo_hito || ''),
      ultimo_hito_nombre: String(ultimo.nombre_hito || ''),
      ultimo_hito_fecha: ultimo.fecha_hito || '',
      usuario_ultimo_hito: String(ultimo.usuario_registro || ''),
      total_hitos_cumplidos: timeline.length,
      total_hitos_tramo_pre: totalPre,
      total_hitos_tramo_for: totalFor
    };

    return headers.map(function(h) {
      return map[h] !== undefined ? map[h] : '';
    });
  });

  replaceSheetData_(GO_PES_V2.SHEETS.VW_AVANCE_ORGANIZACION, headers, rows);

  const result = {
    ok: true,
    total: rows.length
  };
  goPesDiagEnd_(diag, {
    rows_written: rows.length
  });
  return result;
}

function buildVistaAvanceOrganizacionRecordById_(organizacionId) {
  goPesEnsureAvanceBackendReady_();

  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!org) return null;

  const solicitudId = String(org.solicitud_id || '').trim();
  const estadoActual = goPesGetEstadoAvanceActual_(organizacionId, solicitudId);
  const timeline = goPesGetTimelineAvanceRows_(organizacionId);
  const ultimo = timeline[0] || {};
  const totalPre = timeline.filter(function(x) {
    return String(x.tramo || '') === 'Preconstitución';
  }).length;
  const totalFor = timeline.filter(function(x) {
    return String(x.tramo || '') === 'Formalización posterior';
  }).length;

  return {
    organizacion_id: String(org.organizacion_id || '').trim(),
    solicitud_id: solicitudId,
    nombre_organizacion: String(org.nombre_organizacion || ''),
    estado_avance: String(estadoActual.estado_avance || 'Activo'),
    ultimo_hito_codigo: String(ultimo.codigo_hito || ''),
    ultimo_hito_nombre: String(ultimo.nombre_hito || ''),
    ultimo_hito_fecha: ultimo.fecha_hito || '',
    usuario_ultimo_hito: String(ultimo.usuario_registro || ''),
    total_hitos_cumplidos: timeline.length,
    total_hitos_tramo_pre: totalPre,
    total_hitos_tramo_for: totalFor
  };
}

function upsertVistaAvanceOrganizacionRowById_(organizacionId) {
  const record = buildVistaAvanceOrganizacionRecordById_(organizacionId);
  if (!record) return;

  upsertByKey_(GO_PES_V2.SHEETS.VW_AVANCE_ORGANIZACION, 'organizacion_id', record, false);
}

/** =========================
 *  HELPERS PRINCIPALES
 *  ========================= */

function goPesEnsureAvanceBackendReady_() {
  if (typeof goPesApplyAvancePhase1Config_ === 'function') {
    goPesApplyAvancePhase1Config_();
  }

  if (typeof GO_PES_V2 === 'undefined' || !GO_PES_V2 || !GO_PES_V2.SHEETS) {
    throw new Error('GO_PES_V2 no está disponible.');
  }

  const required = [
    'CAT_HITOS_AVANCE',
    'FACT_AVANCE_HITOS',
    'FACT_AVANCE_ESTADO',
    'VW_AVANCE_ORGANIZACION',
    'MAE_ORGANIZACIONES',
    'MAE_CASOS'
  ];

  required.forEach(function(key) {
    if (!GO_PES_V2.SHEETS[key]) {
      throw new Error('Falta la hoja configurada: ' + key);
    }
  });
}

function goPesResolveAvanceContext_(payload) {
  payload = payload || {};

  const organizacionId = String(payload.organizacion_id || '').trim();
  const solicitudId = String(payload.solicitud_id || '').trim();

  let org = null;

  if (organizacionId) {
    org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  }

  if (!org && solicitudId) {
    const rows = filterByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'solicitud_id', solicitudId, false) || [];
    org = rows.length ? rows[0] : null;
  }

  if (!org) {
    throw new Error('No se encontró la organización para el módulo de Avance.');
  }

  return {
    organizacion: org
  };
}

function goPesGetCatalogoHitosAvance_() {
  const rows = getSheetData_(GO_PES_V2.SHEETS.CAT_HITOS_AVANCE)
    .filter(function(r) { return goPesBool_(r.activo_flag); })
    .sort(function(a, b) {
      const tramoCompare = String(a.tramo || '').localeCompare(String(b.tramo || ''), 'es');
      if (tramoCompare !== 0) return tramoCompare;
      return Number(a.orden_hito || 0) - Number(b.orden_hito || 0);
    });

  return rows.map(function(r) {
    return {
      codigo_hito: String(r.codigo_hito || ''),
      tramo: String(r.tramo || ''),
      orden_hito: Number(r.orden_hito || 0),
      nombre_hito: String(r.nombre_hito || ''),
      descripcion: String(r.descripcion || ''),
      codigo_hito_previo: String(r.codigo_hito_previo || ''),
      permite_saltar: goPesBool_(r.permite_saltar),
      activo_flag: goPesBool_(r.activo_flag)
    };
  });
}

function goPesFindHitoCatalogo_(codigoHito) {
  const term = String(codigoHito || '').trim();
  const hitos = goPesGetCatalogoHitosAvance_();
  for (var i = 0; i < hitos.length; i++) {
    if (String(hitos[i].codigo_hito || '') === term) return hitos[i];
  }
  return null;
}

function goPesNormalizeOrganizacionNombre_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function goPesIsHitoCreacionOrganizacion_(hito) {
  const tramo = goPesNormalizeOrganizacionNombre_(hito && hito.tramo);
  const nombre = goPesNormalizeOrganizacionNombre_(hito && hito.nombre_hito);
  return Number(hito && hito.orden_hito || 0) === 5
    && tramo.indexOf('preconstitucion') !== -1
    && (nombre.indexOf('ingreso') !== -1 || nombre.indexOf('documentacion') !== -1);
}

function goPesIsTramoPreconstitucion_(tramo) {
  return goPesNormalizeOrganizacionNombre_(tramo).indexOf('preconstitucion') !== -1;
}

function goPesIsTramoFormalizacion_(tramo) {
  return goPesNormalizeOrganizacionNombre_(tramo).indexOf('formalizacion') !== -1;
}

function goPesCrearOrganizacionDesdeGrupoVecinos_(caso, payload, user) {
  const nombreAsamblea = String(payload && payload.nombre_organizacion_asamblea || '').trim();
  if (!nombreAsamblea) {
    throw new Error('Debes indicar el nombre de la organización para completar el hito 5.');
  }

  const solicitudId = String(caso.solicitud_id || '').trim();
  if (String(caso.organizacion_id || '').trim()) {
    throw new Error('La solicitud ya tiene una organización asociada: ' + String(caso.organizacion_id || ''));
  }

  const existingBySolicitud = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES).filter(function(row) {
    return String(row.solicitud_id || '').trim() === solicitudId;
  });
  if (existingBySolicitud.length) {
    throw new Error('Ya existe una organización asociada a esta solicitud/proceso: ' + String(existingBySolicitud[0].nombre_organizacion || existingBySolicitud[0].organizacion_id));
  }

  const nombreNormalizado = goPesNormalizeOrganizacionNombre_(nombreAsamblea);
  const existingByName = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES).find(function(row) {
    return goPesNormalizeOrganizacionNombre_(row.nombre_organizacion) === nombreNormalizado;
  });
  const warningNombreDuplicado = existingByName
    ? 'Existe otra organización con nombre similar: ' + String(existingByName.nombre_organizacion || existingByName.organizacion_id)
    : '';

  const now = new Date();
  const organizacionId = goPesNextIdSafe_('organizacion', 'ORG');
  const org = {
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    tipo_organizacion: '',
    nombre_organizacion: nombreAsamblea,
    uv: caso.uv || '',
    sector: caso.sector || '',
    direccion_referencia: caso.direccion_original || '',
    fecha_inicio_acompanamiento: now,
    cantidad_socios_declarada: '',
    estado_constitucion: 'Documentación ingresada',
    fecha_asamblea_constitucion: '',
    fecha_ratificacion: '',
    vigencia_directiva_hasta: '',
    personalidad_juridica_flag: '',
    certificado_provisorio_flag: '',
    certificado_definitivo_flag: '',
    directiva_vigente_flag: '',
    organizacion_constituida_flag: '',
    estado_general_organizacion: 'Activo',
    responsable_actual: caso.responsable_actual || goPesGetUserEmail_(user),
    observacion_resumen: caso.observacion_resumen || '',
    updated_at: now
  };

  appendRowObject_(GO_PES_V2.SHEETS.RAW_ORGANIZACIONES, {
    created_at: now,
    source: 'AVANCE_HITO_5',
    user_email: goPesGetUserEmail_(user),
    solicitud_id: solicitudId,
    organizacion_id: organizacionId,
    tipo_organizacion: org.tipo_organizacion,
    nombre_organizacion: org.nombre_organizacion,
    uv: org.uv,
    sector: org.sector,
    direccion_referencia: org.direccion_referencia,
    fecha_inicio_acompanamiento: org.fecha_inicio_acompanamiento,
    cantidad_socios_declarada: org.cantidad_socios_declarada,
    estado_constitucion: org.estado_constitucion,
    fecha_asamblea_constitucion: org.fecha_asamblea_constitucion,
    fecha_ratificacion: org.fecha_ratificacion,
    vigencia_directiva_hasta: org.vigencia_directiva_hasta,
    personalidad_juridica_flag: org.personalidad_juridica_flag,
    certificado_provisorio_flag: org.certificado_provisorio_flag,
    certificado_definitivo_flag: org.certificado_definitivo_flag,
    directiva_vigente_flag: org.directiva_vigente_flag,
    organizacion_constituida_flag: org.organizacion_constituida_flag,
    estado_general_organizacion: org.estado_general_organizacion,
    responsable_actual: org.responsable_actual,
    observacion_resumen: org.observacion_resumen
  });

  upsertByKey_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', org, false);
  patchCaseSummary_(solicitudId, {
    organizacion_id: organizacionId,
    estado_actual: org.estado_general_organizacion,
    etapa_actual: org.estado_constitucion,
    responsable_actual: org.responsable_actual,
    observacion_resumen: org.observacion_resumen
  });

  refreshPartialArtifacts_({
    masterSolicitudIds: [solicitudId],
    vistaOrganizacionIds: [organizacionId],
    sugerenciaSolicitudIds: [solicitudId],
    sugerenciaOrganizacionIds: [organizacionId],
    vistaTerritorialPairs: [{ uv: org.uv || '', sector: org.sector || '' }],
    territorioCatalogPairs: [{ uv: org.uv || '', sector: org.sector || '' }],
    responsables: [org.responsable_actual || goPesGetUserEmail_(user)]
  });
  goPesInvalidateAvanceSelectorCaches_();

  if (warningNombreDuplicado) {
    logProcessing_('WARN', 'crearOrganizacionDesdeGrupoVecinos.nombreSimilar', 'organizacion', organizacionId, goPesGetUserEmail_(user), 'WARN', {
      solicitud_id: solicitudId,
      nombre_organizacion: nombreAsamblea,
      warning: warningNombreDuplicado
    });
  }

  logProcessing_('INFO', 'crearOrganizacionDesdeGrupoVecinos', 'organizacion', organizacionId, goPesGetUserEmail_(user), 'OK', {
    solicitud_id: solicitudId,
    nombre_organizacion: nombreAsamblea
  });
  logUserAction_('CREAR_ORGANIZACION_HITO_5', 'organizacion', organizacionId, 'OK', {
    solicitud_id: solicitudId,
    nombre_organizacion: nombreAsamblea
  });

  return Object.assign({}, org, {
    warning_nombre_duplicado: warningNombreDuplicado
  });
}

function goPesInvalidateAvanceSelectorCaches_() {
  try {
    if (typeof GO_PES_CATALOG_CACHE_KEYS !== 'undefined' && GO_PES_CATALOG_CACHE_KEYS.AVANCE_ORGS_CLIENT) {
      CacheService.getScriptCache().remove(GO_PES_CATALOG_CACHE_KEYS.AVANCE_ORGS_CLIENT);
    }
  } catch (err) {}
}

function goPesCrearOrganizacionDesdeHitoDocumentacion_(org, payload, user) {
  const nombreAsamblea = String(payload && payload.nombre_organizacion_asamblea || '').trim();
  if (!nombreAsamblea) {
    throw new Error('Debes indicar el nombre asignado en la asamblea para crear la organización.');
  }

  const organizacionId = String(org.organizacion_id || '').trim();
  const solicitudId = String(org.solicitud_id || '').trim();
  const nombreNormalizado = goPesNormalizeOrganizacionNombre_(nombreAsamblea);
  const orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];

  for (var i = 0; i < orgs.length; i++) {
    const row = orgs[i] || {};
    const rowOrgId = String(row.organizacion_id || '').trim();
    const rowNombreNormalizado = goPesNormalizeOrganizacionNombre_(row.nombre_organizacion);

    if (rowOrgId && rowOrgId !== organizacionId && rowNombreNormalizado && rowNombreNormalizado === nombreNormalizado) {
      logProcessing_('WARN', 'crearOrganizacionDesdeHito5.nombreSimilar', 'organizacion', organizacionId, goPesGetUserEmail_(user), 'WARN', {
        solicitud_id: solicitudId,
        nombre_organizacion: nombreAsamblea,
        existente: String(row.nombre_organizacion || row.organizacion_id)
      });
    }

    if (
      solicitudId &&
      rowOrgId &&
      rowOrgId !== organizacionId &&
      String(row.solicitud_id || '').trim() === solicitudId
    ) {
      throw new Error('Ya existe una organización asociada a esta solicitud/proceso: ' + String(row.nombre_organizacion || row.organizacion_id));
    }
  }

  const now = new Date();
  const nextOrg = Object.assign({}, org, {
    nombre_organizacion: nombreAsamblea,
    estado_general_organizacion: org.estado_general_organizacion || 'Activo',
    estado_constitucion: org.estado_constitucion || 'Documentación ingresada',
    responsable_actual: org.responsable_actual || goPesGetUserEmail_(user),
    updated_at: now
  });

  appendRowObject_(GO_PES_V2.SHEETS.RAW_ORGANIZACIONES, {
    created_at: now,
    source: 'AVANCE_HITO_5',
    user_email: goPesGetUserEmail_(user),
    solicitud_id: solicitudId,
    organizacion_id: organizacionId,
    tipo_organizacion: nextOrg.tipo_organizacion || '',
    nombre_organizacion: nextOrg.nombre_organizacion || '',
    uv: nextOrg.uv || '',
    sector: nextOrg.sector || '',
    direccion_referencia: nextOrg.direccion_referencia || '',
    fecha_inicio_acompanamiento: nextOrg.fecha_inicio_acompanamiento || now,
    cantidad_socios_declarada: nextOrg.cantidad_socios_declarada || '',
    estado_constitucion: nextOrg.estado_constitucion || '',
    fecha_asamblea_constitucion: nextOrg.fecha_asamblea_constitucion || '',
    fecha_ratificacion: nextOrg.fecha_ratificacion || '',
    vigencia_directiva_hasta: nextOrg.vigencia_directiva_hasta || '',
    personalidad_juridica_flag: nextOrg.personalidad_juridica_flag || '',
    certificado_provisorio_flag: nextOrg.certificado_provisorio_flag || '',
    certificado_definitivo_flag: nextOrg.certificado_definitivo_flag || '',
    directiva_vigente_flag: nextOrg.directiva_vigente_flag || '',
    organizacion_constituida_flag: nextOrg.organizacion_constituida_flag || '',
    estado_general_organizacion: nextOrg.estado_general_organizacion || '',
    responsable_actual: nextOrg.responsable_actual || '',
    observacion_resumen: nextOrg.observacion_resumen || ''
  });

  upsertByKey_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', nextOrg, false);

  if (solicitudId) {
    patchCaseSummary_(solicitudId, {
      organizacion_id: organizacionId,
      estado_actual: nextOrg.estado_general_organizacion || 'Activo',
      etapa_actual: nextOrg.estado_constitucion || 'Documentación ingresada',
      responsable_actual: nextOrg.responsable_actual || goPesGetUserEmail_(user),
      observacion_resumen: nextOrg.observacion_resumen || ''
    });
  }

  refreshPartialArtifacts_({
    masterSolicitudIds: uniqueNonBlank_([solicitudId]),
    vistaOrganizacionIds: [organizacionId],
    sugerenciaSolicitudIds: uniqueNonBlank_([solicitudId]),
    sugerenciaOrganizacionIds: [organizacionId],
    territorioCatalogPairs: [{ uv: nextOrg.uv || '', sector: nextOrg.sector || '' }],
    responsables: [nextOrg.responsable_actual || goPesGetUserEmail_(user)]
  });
  goPesInvalidateAvanceSelectorCaches_();

  logProcessing_('INFO', 'crearOrganizacionDesdeHito5', 'organizacion', organizacionId, goPesGetUserEmail_(user), 'OK', {
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    nombre_organizacion: nombreAsamblea
  });
  logUserAction_('CREAR_ORGANIZACION_HITO_5', 'organizacion', organizacionId, 'OK', {
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    nombre_organizacion: nombreAsamblea
  });

  return nextOrg;
}

function goPesGetTimelineAvanceRows_(organizacionId) {
  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  const solicitudId = org && org.solicitud_id ? String(org.solicitud_id || '').trim() : '';
  const rows = (getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || []).filter(function(row) {
    return String(row.organizacion_id || '').trim() === String(organizacionId || '').trim()
      || (solicitudId && String(row.solicitud_id || '').trim() === solicitudId);
  });
  return rows.sort(function(a, b) {
    return new Date(b.timestamp_registro || 0) - new Date(a.timestamp_registro || 0);
  });
}

function goPesGetTimelineAvanceRowsBySolicitud_(solicitudId) {
  const rows = filterByField_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS, 'solicitud_id', solicitudId, false) || [];
  return rows.sort(function(a, b) {
    return new Date(b.timestamp_registro || 0) - new Date(a.timestamp_registro || 0);
  });
}

function goPesGetEstadoAvanceActual_(organizacionId, solicitudId) {
  const rows = filterByField_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO, 'organizacion_id', organizacionId, false) || [];
  return goPesGetEstadoAvanceActualFromRows_(rows, solicitudId);
}

function goPesGetEstadoAvanceActualBySolicitud_(solicitudId) {
  const rows = filterByField_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO, 'solicitud_id', solicitudId, false) || [];
  return goPesGetEstadoAvanceActualFromRows_(rows, solicitudId);
}

function goPesGetEstadoAvanceActualFromRows_(rows, solicitudId) {
  const active = (rows || []).filter(function(r) { return goPesBool_(r.activo_flag); });
  if (active.length) {
    active.sort(function(a, b) {
      return new Date(b.timestamp_registro || 0) - new Date(a.timestamp_registro || 0);
    });
    return active[0];
  }

  const ordered = (rows || []).slice().sort(function(a, b) {
    return new Date(b.timestamp_registro || 0) - new Date(a.timestamp_registro || 0);
  });

  if (ordered.length) return ordered[0];

  return {
    avance_estado_id: '',
    organizacion_id: '',
    solicitud_id: solicitudId || '',
    estado_avance: 'Activo',
    motivo_estado: '',
    fecha_estado: '',
    usuario_estado: '',
    timestamp_registro: '',
    activo_flag: true
  };
}

function goPesEnsureEstadoAvanceInicial_(organizacionId, solicitudId, user) {
  const rows = filterByField_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO, 'organizacion_id', organizacionId, false) || [];
  if (rows.length) return;

  const now = new Date();
  appendRowObject_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO, {
    avance_estado_id: goPesNextIdSafe_('avance_estado', 'AVE'),
    organizacion_id: organizacionId,
    solicitud_id: solicitudId || '',
    estado_avance: 'Activo',
    motivo_estado: 'Estado inicial automático',
    fecha_estado: now,
    usuario_estado: goPesGetUserEmail_(user),
    timestamp_registro: now,
    activo_flag: true
  });

  upsertVistaAvanceOrganizacionRowById_(organizacionId);
}

function goPesDeactivateEstadosAvanceActivos_(organizacionId) {
  const sheetName = GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO;
  const sh = getSheet_(sheetName);
  if (!sh) throw new Error('No existe la hoja FACT_Avance_Estado.');

  const headers = goPesGetAvanceHeaders_(sheetName);
  const data = getSheetData_(sheetName);

  var idxActivo = headers.indexOf('activo_flag');
  if (idxActivo === -1) return;

  const updates = [];
  for (var i = 0; i < data.length; i++) {
    const row = data[i];
    if (String(row.organizacion_id || '') === String(organizacionId || '') && goPesBool_(row.activo_flag)) {
      updates.push(i + 2);
    }
  }

  updates.forEach(function(rowIndex) {
    sh.getRange(rowIndex, idxActivo + 1).setValue(false);
  });

  if (updates.length) {
    invalidateSheetRuntimeCache_(sheetName);
  }
}

function goPesFindAvanceHitoByOrgAndCodigo_(organizacionId, codigoHito) {
  const rows = goPesGetTimelineAvanceRows_(organizacionId);
  const target = String(codigoHito || '').trim();

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].codigo_hito || '').trim() === target) return rows[i];
  }
  return null;
}

function goPesFindAvanceHitoBySolicitudAndCodigo_(solicitudId, codigoHito) {
  const rows = goPesGetTimelineAvanceRowsBySolicitud_(solicitudId);
  const target = String(codigoHito || '').trim();

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].codigo_hito || '').trim() === target) return rows[i];
  }
  return null;
}

function goPesValidatePuedeRegistrarHito_(organizacionId, hitoCatalogo) {
  if (!hitoCatalogo) {
    return { ok: false, message: 'No existe el hito en catálogo.' };
  }

  const previo = String(hitoCatalogo.codigo_hito_previo || '').trim();
  if (!previo) return { ok: true };

  const existePrevio = goPesFindAvanceHitoByOrgAndCodigo_(organizacionId, previo);
  if (existePrevio) return { ok: true };

  const previoCat = goPesFindHitoCatalogo_(previo);
  return {
    ok: false,
    message: 'Debes completar primero el hito previo: ' + String((previoCat && previoCat.nombre_hito) || previo)
  };
}

function goPesValidatePuedeRegistrarHitoSolicitud_(solicitudId, hitoCatalogo) {
  if (!hitoCatalogo) {
    return { ok: false, message: 'No existe el hito en catálogo.' };
  }

  const previo = String(hitoCatalogo.codigo_hito_previo || '').trim();
  if (!previo) return { ok: true };

  const existePrevio = goPesFindAvanceHitoBySolicitudAndCodigo_(solicitudId, previo);
  if (existePrevio) return { ok: true };

  const previoCat = goPesFindHitoCatalogo_(previo);
  return {
    ok: false,
    message: 'Debes completar primero el hito previo: ' + String((previoCat && previoCat.nombre_hito) || previo)
  };
}

function goPesBuildBotonesAvanceEstado_(organizacionId, solicitudId) {
  const hitos = goPesGetCatalogoHitosAvance_();
  const timeline = goPesGetTimelineAvanceRows_(organizacionId);
  const estadoActual = goPesGetEstadoAvanceActual_(organizacionId, solicitudId);

  const cumplidosMap = {};
  timeline.forEach(function(r) {
    const key = String(r.codigo_hito || '').trim();
    if (!cumplidosMap[key]) cumplidosMap[key] = r;
  });

  const buttons = hitos.map(function(h) {
    const codigo = String(h.codigo_hito || '');
    const cumplido = !!cumplidosMap[codigo];
    const previo = String(h.codigo_hito_previo || '').trim();
    const previoCumplido = !previo || !!cumplidosMap[previo];
    const activo = String(estadoActual.estado_avance || 'Activo') === 'Activo';

    let enabled = false;
    let blockedReason = '';

    if (cumplido) {
      enabled = false;
      blockedReason = 'Cumplido';
    } else if (!activo) {
      enabled = false;
      blockedReason = 'El avance está en estado ' + String(estadoActual.estado_avance || '');
    } else if (!previoCumplido) {
      enabled = false;
      const previoCat = goPesFindHitoCatalogo_(previo);
      blockedReason = 'Requiere ' + String((previoCat && previoCat.nombre_hito) || previo);
    } else {
      enabled = true;
    }

    return {
      codigo_hito: codigo,
      tramo: String(h.tramo || ''),
      orden_hito: Number(h.orden_hito || 0),
      nombre_hito: String(h.nombre_hito || ''),
      descripcion: String(h.descripcion || ''),
      codigo_hito_previo: previo,
      permite_saltar: goPesBool_(h.permite_saltar),
      completed_flag: cumplido,
      enabled_flag: enabled,
      blocked_reason: blockedReason,
      fecha_hito: cumplido ? (cumplidosMap[codigo].fecha_hito || '') : '',
      usuario_registro: cumplido ? String(cumplidosMap[codigo].usuario_registro || '') : ''
    };
  });

  return {
    estado_actual: String(estadoActual.estado_avance || 'Activo'),
    tramos: [
      {
        tramo: 'Preconstitución',
        items: buttons.filter(function(x) { return x.tramo === 'Preconstitución'; })
      },
      {
        tramo: 'Formalización posterior',
        items: buttons.filter(function(x) { return x.tramo === 'Formalización posterior'; })
      }
    ]
  };
}

function goPesBuildBotonesAvanceGrupoVecinos_(solicitudId) {
  const hitos = goPesGetCatalogoHitosAvance_().filter(function(h) {
    return goPesIsTramoPreconstitucion_(h.tramo);
  });
  const timeline = goPesGetTimelineAvanceRowsBySolicitud_(solicitudId);
  const estadoActual = goPesGetEstadoAvanceActualBySolicitud_(solicitudId);

  const cumplidosMap = {};
  timeline.forEach(function(r) {
    const key = String(r.codigo_hito || '').trim();
    if (!cumplidosMap[key]) cumplidosMap[key] = r;
  });

  const buttons = hitos.map(function(h) {
    const codigo = String(h.codigo_hito || '');
    const cumplido = !!cumplidosMap[codigo];
    const previo = String(h.codigo_hito_previo || '').trim();
    const previoCumplido = !previo || !!cumplidosMap[previo];
    const activo = String(estadoActual.estado_avance || 'Activo') === 'Activo';

    let enabled = false;
    let blockedReason = '';

    if (cumplido) {
      blockedReason = 'Cumplido';
    } else if (!activo) {
      blockedReason = 'El avance está en estado ' + String(estadoActual.estado_avance || '');
    } else if (!previoCumplido) {
      const previoCat = goPesFindHitoCatalogo_(previo);
      blockedReason = 'Requiere ' + String((previoCat && previoCat.nombre_hito) || previo);
    } else {
      enabled = true;
    }

    return {
      codigo_hito: codigo,
      tramo: String(h.tramo || ''),
      orden_hito: Number(h.orden_hito || 0),
      nombre_hito: String(h.nombre_hito || ''),
      descripcion: String(h.descripcion || ''),
      codigo_hito_previo: previo,
      permite_saltar: goPesBool_(h.permite_saltar),
      completed_flag: cumplido,
      enabled_flag: enabled,
      blocked_reason: blockedReason,
      fecha_hito: cumplido ? (cumplidosMap[codigo].fecha_hito || '') : '',
      usuario_registro: cumplido ? String(cumplidosMap[codigo].usuario_registro || '') : ''
    };
  });

  return {
    estado_actual: String(estadoActual.estado_avance || 'Activo'),
    tramos: [
      { tramo: 'Preconstitución', items: buttons },
      { tramo: 'Formalización posterior', items: [] }
    ]
  };
}

function goPesBuildResumenAvance_(org, estadoActual, timeline) {
  const ultimo = timeline[0] || {};
  const hitosCatalogo = goPesGetCatalogoHitosAvance_();
  const totalPre = hitosCatalogo.filter(function(x) { return goPesIsTramoPreconstitucion_(x.tramo); }).length;
  const totalFor = hitosCatalogo.filter(function(x) { return goPesIsTramoFormalizacion_(x.tramo); }).length;

  return {
    organizacion_id: String(org.organizacion_id || ''),
    solicitud_id: String(org.solicitud_id || ''),
    nombre_organizacion: String(org.nombre_organizacion || ''),
    estado_avance: String(estadoActual.estado_avance || 'Activo'),
    ultimo_hito_codigo: String(ultimo.codigo_hito || ''),
    ultimo_hito_nombre: String(ultimo.nombre_hito || ''),
    ultimo_hito_fecha: ultimo.fecha_hito || '',
    usuario_ultimo_hito: String(ultimo.usuario_registro || ''),
    total_hitos_cumplidos: timeline.length,
    total_hitos_tramo_pre: totalPre,
    total_hitos_tramo_for: totalFor
  };
}

function goPesBuildResumenAvanceGrupoVecinos_(caso, estadoActual, timeline) {
  const ultimo = timeline[0] || {};
  const hitosCatalogo = goPesGetCatalogoHitosAvance_();
  const totalPre = hitosCatalogo.filter(function(x) { return goPesIsTramoPreconstitucion_(x.tramo); }).length;
  const totalFor = hitosCatalogo.filter(function(x) { return goPesIsTramoFormalizacion_(x.tramo); }).length;

  return {
    context_type: 'grupo_vecinos',
    solicitud_id: String(caso.solicitud_id || ''),
    nombre_organizacion: String(caso.nombre_completo || 'Grupo de vecinos'),
    estado_avance: String(estadoActual.estado_avance || 'Activo'),
    ultimo_hito_codigo: String(ultimo.codigo_hito || ''),
    ultimo_hito_nombre: String(ultimo.nombre_hito || ''),
    ultimo_hito_fecha: ultimo.fecha_hito || '',
    usuario_ultimo_hito: String(ultimo.usuario_registro || ''),
    total_hitos_cumplidos: timeline.length,
    total_hitos_tramo_pre: totalPre,
    total_hitos_tramo_for: totalFor
  };
}

/** =========================
 *  HELPERS TÉCNICOS
 *  ========================= */

function goPesGetAvanceHeaders_(sheetName) {
  if (typeof getGoPesAvanceSheetDefinitions_ === 'function') {
    const defs = getGoPesAvanceSheetDefinitions_();
    if (defs[sheetName]) return defs[sheetName];
  }

  const fallback = {};

  fallback['CAT_Hitos_Avance'] = [
    'codigo_hito', 'tramo', 'orden_hito', 'nombre_hito', 'descripcion',
    'codigo_hito_previo', 'permite_saltar', 'activo_flag'
  ];

  fallback['FACT_Avance_Hitos'] = [
    'avance_hito_id', 'organizacion_id', 'solicitud_id', 'codigo_hito', 'tramo',
    'orden_hito', 'nombre_hito', 'fecha_hito', 'usuario_registro',
    'timestamp_registro', 'observacion'
  ];

  fallback['FACT_Avance_Estado'] = [
    'avance_estado_id', 'organizacion_id', 'solicitud_id', 'estado_avance',
    'motivo_estado', 'fecha_estado', 'usuario_estado', 'timestamp_registro',
    'activo_flag'
  ];

  fallback['VW_Avance_Organizacion'] = [
    'organizacion_id', 'solicitud_id', 'nombre_organizacion', 'estado_avance',
    'ultimo_hito_codigo', 'ultimo_hito_nombre', 'ultimo_hito_fecha',
    'usuario_ultimo_hito', 'total_hitos_cumplidos', 'total_hitos_tramo_pre',
    'total_hitos_tramo_for'
  ];

  return fallback[sheetName] || [];
}

function goPesNextIdSafe_(sequenceKey, prefix) {
  try {
    if (typeof nextId_ === 'function') {
      return nextId_(sequenceKey, prefix);
    }
  } catch (e) {}

  return String(prefix || 'ID') + '-' + Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyyMMddHHmmssSSS'
  );
}

function goPesGetUserEmail_(user) {
  if (user && user.email) return String(user.email);
  try {
    if (typeof getUsuarioActual === 'function') {
      const u = getUsuarioActual();
      if (u && u.email) return String(u.email);
    }
  } catch (e) {}
  return '';
}

function goPesBool_(value) {
  return value === true ||
    String(value || '').toLowerCase() === 'true' ||
    String(value || '').toLowerCase() === 'si' ||
    String(value || '').toLowerCase() === 'sí' ||
    String(value || '') === '1';
}

function goPesAvanceToClientSafe_(value) {
  return serializeForClient_(value);
}

function goPesDiagnosticarAvanceBackend_() {
  goPesEnsureAvanceBackendReady_();

  const orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);
  const hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS);
  const estados = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO);
  const vista = getSheetData_(GO_PES_V2.SHEETS.VW_AVANCE_ORGANIZACION);

  const report = {
    ok: true,
    total_organizaciones: orgs.length,
    total_hitos_registrados: hitos.length,
    total_estados_registrados: estados.length,
    total_vista_rows: vista.length
  };

  Logger.log(JSON.stringify(report, null, 2));
  return report;
}
