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
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
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
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const rows = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES)
    .filter(function(r) {
      return String(r.organizacion_id || '').trim() && String(r.nombre_organizacion || '').trim();
    })
    .sort(function(a, b) {
      return String(a.nombre_organizacion || '').localeCompare(String(b.nombre_organizacion || ''), 'es');
    });

  return goPesAvanceToClientSafe_({
    organizacionesList: rows.map(function(r) {
      return {
        value: String(r.organizacion_id || '').trim(),
        label: String(r.nombre_organizacion || '').trim(),
        solicitud_id: String(r.solicitud_id || '').trim(),
        estado_constitucion: String(r.estado_constitucion || '').trim()
      };
    })
  });
}

function getTimelineAvance(payload) {
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const ctx = goPesResolveAvanceContext_(payload);
  const timeline = goPesGetTimelineAvanceRows_(ctx.organizacion.organizacion_id);

  return goPesAvanceToClientSafe_(timeline);
}

function getBotonesAvanceEstado(payload) {
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const ctx = goPesResolveAvanceContext_(payload);
  const buttons = goPesBuildBotonesAvanceEstado_(ctx.organizacion.organizacion_id, ctx.organizacion.solicitud_id);

  return goPesAvanceToClientSafe_(buttons);
}

function getAvanceOrganizacion(payload) {
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  const ctx = goPesResolveAvanceContext_(payload);
  const orgId = ctx.organizacion.organizacion_id;
  const solicitudId = ctx.organizacion.solicitud_id || '';

  goPesEnsureEstadoAvanceInicial_(orgId, solicitudId, requireRole_(['operador', 'coordinador', 'administrador', 'superuser']));

  const estadoActual = goPesGetEstadoAvanceActual_(orgId, solicitudId);
  const timeline = goPesGetTimelineAvanceRows_(orgId);
  const botones = goPesBuildBotonesAvanceEstado_(orgId, solicitudId);
  const resumen = goPesBuildResumenAvance_(ctx.organizacion, estadoActual, timeline);

  return goPesAvanceToClientSafe_({
    organizacion: ctx.organizacion,
    estado: estadoActual,
    resumen: resumen,
    botones: botones,
    timeline: timeline
  });
}

function registrarHitoAvance(payload) {
  const user = requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  goPesEnsureAvanceBackendReady_();

  payload = payload || {};

  const organizacionId = String(payload.organizacion_id || '').trim();
  const codigoHito = String(payload.codigo_hito || '').trim();
  const observacion = String(payload.observacion || '').trim();
  const fechaHito = asDateOrBlank_(payload.fecha_hito);

  if (!organizacionId) throw new Error('Falta organizacion_id.');
  if (!codigoHito) throw new Error('Falta codigo_hito.');
  if (!fechaHito) throw new Error('Debes indicar una fecha del hito.');

  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!org) throw new Error('No se encontró la organización indicada.');

  const solicitudId = String(org.solicitud_id || '').trim();
  goPesEnsureEstadoAvanceInicial_(organizacionId, solicitudId, user);

  const estadoActual = goPesGetEstadoAvanceActual_(organizacionId, solicitudId);
  if (String(estadoActual.estado_avance || 'Activo') !== 'Activo') {
    throw new Error('No se pueden registrar hitos porque el avance no está en estado Activo.');
  }

  const hitoCatalogo = goPesFindHitoCatalogo_(codigoHito);
  if (!hitoCatalogo) throw new Error('El código de hito no existe en el catálogo.');

  const yaExiste = goPesFindAvanceHitoByOrgAndCodigo_(organizacionId, codigoHito);
  if (yaExiste) {
    throw new Error('Este hito ya fue registrado para la organización.');
  }

  const validacion = goPesValidatePuedeRegistrarHito_(organizacionId, hitoCatalogo);
  if (!validacion.ok) {
    throw new Error(validacion.message || 'No se puede registrar el hito.');
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

  buildVistaAvanceOrganizacion_();

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

  return goPesAvanceToClientSafe_({
    ok: true,
    avance_hito_id: avanceHitoId,
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    codigo_hito: codigoHito,
    nombre_hito: hitoCatalogo.nombre_hito
  });
}

function cambiarEstadoAvance(payload) {
  const user = requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
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

  buildVistaAvanceOrganizacion_();

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

  return goPesAvanceToClientSafe_({
    ok: true,
    avance_estado_id: avanceEstadoId,
    organizacion_id: organizacionId,
    solicitud_id: solicitudId,
    estado_avance: nuevoEstado
  });
}

/** =========================
 *  BUILDERS / VISTAS
 *  ========================= */

function buildVistaAvanceOrganizacion_() {
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

  return {
    ok: true,
    total: rows.length
  };
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
    'MAE_ORGANIZACIONES'
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

function goPesGetTimelineAvanceRows_(organizacionId) {
  const rows = filterByField_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS, 'organizacion_id', organizacionId, false) || [];
  return rows.sort(function(a, b) {
    return new Date(b.timestamp_registro || 0) - new Date(a.timestamp_registro || 0);
  });
}

function goPesGetEstadoAvanceActual_(organizacionId, solicitudId) {
  const rows = filterByField_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO, 'organizacion_id', organizacionId, false) || [];
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
  const rows = filterByField_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS, 'organizacion_id', organizacionId, false) || [];
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

function goPesBuildResumenAvance_(org, estadoActual, timeline) {
  const ultimo = timeline[0] || {};
  const totalPre = timeline.filter(function(x) { return String(x.tramo || '') === 'Preconstitución'; }).length;
  const totalFor = timeline.filter(function(x) { return String(x.tramo || '') === 'Formalización posterior'; }).length;

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
