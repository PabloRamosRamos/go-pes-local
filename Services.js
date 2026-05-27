/**
 * Servicios de aplicación y operaciones del dominio GO-PES.
 * Esta capa orquesta validación, persistencia y refresco de vistas derivadas.
 */
function buscarVecino(query) {
  const diag = goPesDiagStart_('Services.buscarVecino', {
    query_length: String(query || '').trim().length
  });
  requireModuleAccess_('buscar', ['operador', 'coordinador', 'superuser']);

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

function getBuscarModuleData() {
  requireModuleAccess_('buscar', ['operador', 'coordinador', 'superuser']);

  const caseRows = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);
  const orgRows  = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);

  const orgBySolicitud = {};
  orgRows.forEach(function(r) {
    const key = String(r.solicitud_id || '').trim();
    if (key && !orgBySolicitud[key]) orgBySolicitud[key] = r;
  });

  const rows = caseRows.map(function(r) {
    const key = String(r.solicitud_id || '').trim();
    const org = orgBySolicitud[key] || {};
    return {
      solicitud_id:       String(r.solicitud_id || ''),
      organizacion_id:    String(r.organizacion_id || org.organizacion_id || ''),
      nombre_completo:    String(r.nombre_completo || buildFullName_(r.nombre_vecino, r.apellido_vecino) || ''),
      rut_vecino:         String(r.rut_vecino || ''),
      telefono_contacto:  String(r.telefono_contacto || ''),
      correo_contacto:    String(r.correo_contacto || ''),
      direccion_original: String(r.direccion_original || ''),
      uv:                 String(r.uv || ''),
      sector:             String(r.sector || ''),
      estado_actual:      String(r.estado_actual || ''),
      nombre_organizacion:String(org.nombre_organizacion || '')
    };
  });

  return serializeForClient_({ rows: rows });
}

function buscarOrganizacion(query) {
  requireModuleAccess_('buscar', ['operador', 'coordinador', 'superuser']);
  const term = normalizeText_(query || '');
  const rows = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);
  if (!term) return rows.slice(0, 25);
  return rows.filter(r => [r.organizacion_id, r.nombre_organizacion, r.uv, r.sector].map(normalizeText_).join(' | ').includes(term)).slice(0, 50);
}

function getInicioPanelData() {
  requireModuleAccess_('inicio', ['visor', 'operador', 'coordinador', 'superuser']);

  const systemConfig = getRuntimeSystemConfig_();
  const inicioConfig = (systemConfig && systemConfig.alertsInicio) || {};
  const highDays = Math.max(0, Number(inicioConfig.alertHighDays || 7));
  const mediumDays = Math.max(highDays, Number(inicioConfig.alertMediumDays || 15));
  const maxVisibleAlerts = Math.max(1, Number(inicioConfig.maxVisibleAlerts || 6));
  const maxUpcomingAssemblies = Math.max(1, Number(inicioConfig.maxUpcomingAssemblies || 5));

  const organizaciones = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  const instrumentos = getSheetData_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS) || [];
  const organizacionesById = {};

  organizaciones.forEach(function(row) {
    const key = String(row.organizacion_id || '').trim();
    if (key && !organizacionesById[key]) organizacionesById[key] = row;
  });

  const alerts = buildInicioBeneficioAlerts_(instrumentos, organizacionesById, {
    highDays: highDays,
    mediumDays: mediumDays,
    limit: maxVisibleAlerts
  });

  const reminders = buildInicioReminderItems_(organizaciones, {
    limit: maxUpcomingAssemblies
  });

  return serializeForClient_({
    summary: {
      activeAlertsCount: alerts.length,
      benefitsToReviewCount: alerts.filter(function(item) {
        return String(item.category || '') === 'beneficio';
      }).length,
      upcomingAssembliesCount: reminders.length
    },
    alerts: alerts,
    reminders: reminders,
    meta: {
      alertsState: alerts.length ? 'derived' : 'empty',
      remindersState: reminders.some(function(item) {
        return String(item.source || '') === 'real';
      }) ? 'real' : (reminders.length ? 'derived' : 'empty'),
      alertsDescription: alerts.length
        ? 'Fechas proximas derivadas desde beneficios con registro vigente.'
        : 'Sin alertas operativas de beneficios con fechas registradas en el sistema.',
      remindersDescription: reminders.length
        ? 'Agenda derivada desde organizaciones y fechas registradas en el sistema.'
        : 'Sin asambleas ni recordatorios con fecha registrada en esta etapa.',
      alertsEmptyMessage: 'No hay beneficios con vencimientos proximos o atrasados dentro del rango configurado.',
      remindersEmptyMessage: 'No hay asambleas programadas ni pendientes con base suficiente para mostrar recordatorios.'
    }
  });
}

function buildInicioBeneficioAlerts_(rows, organizacionesById, options) {
  const config = Object.assign({
    highDays: 7,
    mediumDays: 15,
    limit: 6
  }, options || {});
  const today = getInicioTodayStart_();
  const items = [];

  (rows || []).forEach(function(row) {
    if (isClosedInicioInstrumentState_(row && row.estado_instrumento)) return;

    const candidates = getInicioInstrumentDateCandidates_(row).map(function(candidate) {
      const date = parseInicioDate_(candidate && candidate.value);
      if (!date) return null;

      const daysUntil = diffInicioDays_(today, date);
      if (daysUntil < -config.mediumDays || daysUntil > config.mediumDays) return null;

      return {
        label: candidate.label,
        date: date,
        daysUntil: daysUntil
      };
    }).filter(Boolean).sort(function(a, b) {
      return a.daysUntil - b.daysUntil;
    });

    if (!candidates.length) return;

    const nextDate = candidates[0];
    const organizacion = organizacionesById[String(row.organizacion_id || '').trim()] || {};
    const beneficio = getInicioInstrumentDisplayName_(row);
    const orgLabel = String(
      organizacion.nombre_organizacion ||
      row.nombre_organizacion ||
      row.organizacion_id ||
      'Organizacion sin nombre'
    ).trim();
    const tone = resolveInicioAlertTone_(nextDate.daysUntil, config.highDays);
    const status = buildInicioAlertStatus_(nextDate.daysUntil, config.highDays);
    const dateLabel = formatInicioDate_(nextDate.date);

    items.push({
      status: status,
      title: beneficio,
      detail: orgLabel,
      note: nextDate.label + ': ' + dateLabel,
      tone: tone,
      icon: tone === 'danger' ? 'priority_high' : 'schedule',
      category: 'beneficio',
      source: 'derived',
      dateIso: nextDate.date,
      daysUntil: nextDate.daysUntil
    });
  });

  return items.sort(function(a, b) {
    return Number(a.daysUntil || 0) - Number(b.daysUntil || 0);
  }).slice(0, config.limit);
}

function buildInicioReminderItems_(rows, options) {
  const config = Object.assign({
    limit: 5
  }, options || {});
  const today = getInicioTodayStart_();
  const items = [];

  (rows || []).forEach(function(row) {
    const nombre = String(row.nombre_organizacion || row.organizacion_id || 'Organizacion').trim();
    const ubicacion = [row.uv ? 'UV ' + row.uv : '', row.sector || ''].filter(Boolean).join(' · ');
    const fechaConstitucion = parseInicioDate_(row.fecha_asamblea_constitucion);
    const fechaRatificacion = parseInicioDate_(row.fecha_ratificacion);
    const estadoConstitucion = normalizeText_(row.estado_constitucion || '');

    if (fechaConstitucion && diffInicioDays_(today, fechaConstitucion) >= 0) {
      items.push({
        title: nombre,
        detail: 'Asamblea constitutiva programada para ' + formatInicioDate_(fechaConstitucion),
        note: ubicacion,
        icon: 'groups',
        source: 'real',
        dateIso: fechaConstitucion,
        daysUntil: diffInicioDays_(today, fechaConstitucion)
      });
    }

    if (fechaRatificacion && diffInicioDays_(today, fechaRatificacion) >= 0) {
      items.push({
        title: nombre,
        detail: 'Ratificacion programada para ' + formatInicioDate_(fechaRatificacion),
        note: ubicacion,
        icon: 'event_available',
        source: 'real',
        dateIso: fechaRatificacion,
        daysUntil: diffInicioDays_(today, fechaRatificacion)
      });
    }

    if (!fechaConstitucion && estadoConstitucion && estadoConstitucion !== 'constituida') {
      items.push({
        title: nombre,
        detail: 'Asamblea constitutiva pendiente de agendamiento.',
        note: ubicacion || 'Sin ubicacion registrada',
        icon: 'event_busy',
        source: 'derived',
        dateIso: '',
        daysUntil: 999999
      });
    }
  });

  return items.sort(function(a, b) {
    return Number(a.daysUntil || 0) - Number(b.daysUntil || 0);
  }).slice(0, config.limit);
}

function getInicioInstrumentDateCandidates_(row) {
  return [
    { label: 'Cierre de postulacion', value: row && row.fecha_cierre },
    { label: 'Postulacion', value: row && row.fecha_postulacion },
    { label: 'Resultados', value: row && row.fecha_resultado },
    { label: 'Habilitacion', value: row && row.fecha_habilitacion },
    { label: 'Cierre del beneficio', value: row && row.fecha_cierre_instrumento }
  ];
}

function getInicioInstrumentDisplayName_(row) {
  return String(
    (row && row.instrumento_codigo_catalogo) ||
    (row && row.nombre_convocatoria) ||
    (row && row.instrumento_nombre_otro) ||
    (row && row.instrumento_tipo) ||
    'Beneficio'
  ).trim() || 'Beneficio';
}

function isClosedInicioInstrumentState_(value) {
  const state = normalizeText_(value || '');
  return [
    'cerrado',
    'cerrada',
    'finalizado',
    'finalizada',
    'cancelado',
    'cancelada',
    'desistido',
    'desistida',
    'rendido',
    'rendida'
  ].indexOf(state) !== -1;
}

function resolveInicioAlertTone_(daysUntil, highDays) {
  return daysUntil <= highDays ? 'danger' : 'warning';
}

function buildInicioAlertStatus_(daysUntil, highDays) {
  if (daysUntil < 0) {
    return 'Vencido hace ' + Math.abs(daysUntil) + ' dias';
  }
  if (daysUntil === 0) return 'Vence hoy';
  if (daysUntil <= highDays) return 'Alta prioridad';
  return 'Prioridad media';
}

function getInicioTodayStart_() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseInicioDate_(value) {
  const date = asDateOrBlank_(value);
  if (!date || isNaN(date.getTime())) return null;
  const normalized = new Date(date.getTime());
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function diffInicioDays_(fromDate, toDate) {
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
}

function formatInicioDate_(value) {
  const date = parseInicioDate_(value);
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd-MM-yyyy');
}

function obtenerFicha(payload) {
  const diag = goPesDiagStart_('Services.obtenerFicha', payload || {});
  requireModuleAccess_('ficha', ['operador', 'coordinador', 'superuser']);

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
    throw new Error('No se encontró la ficha solicitada.');
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

  const hitos = finalSolicitudId
    ? getRowsByFieldValuesSelective_(
        GO_PES_V2.SHEETS.FACT_HITOS,
        'solicitud_id',
        [finalSolicitudId],
        false,
        { sortField: 'fecha_gestion', sortDesc: true, limit: 25 }
      )
    : [];

  const instrumentos = finalOrgId
    ? getRowsByFieldValuesSelective_(
        GO_PES_V2.SHEETS.FACT_INSTRUMENTOS,
        'organizacion_id',
        [finalOrgId],
        false
      )
    : [];

  const requisitos = finalOrgId
    ? getRowsByFieldValuesSelective_(
        GO_PES_V2.SHEETS.FACT_REQUISITOS,
        'organizacion_id',
        [finalOrgId],
        false
      )
    : [];

  const socios = finalOrgId
    ? getRowsByFieldValuesSelective_(
        GO_PES_V2.SHEETS.FACT_SOCIOS,
        'organizacion_id',
        [finalOrgId],
        false
      )
    : [];

  const avanceHitos = (finalOrgId || finalSolicitudId)
    ? (getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [])
        .filter(function(row) {
          return (finalOrgId && String(row.organizacion_id || '').trim() === finalOrgId)
            || (finalSolicitudId && String(row.solicitud_id || '').trim() === finalSolicitudId);
        })
        .sort(function(a, b) {
          return new Date(b.timestamp_registro || 0) - new Date(a.timestamp_registro || 0);
        })
        .slice(0, 25)
    : [];
  const hitoCreacionOrganizacion = getHitoCreacionOrganizacionFromAvance_(avanceHitos);

  const acciones = getRowsByFieldValuesSelective_(
    GO_PES_V2.SHEETS.LOG_ACCIONES,
    'entity_id',
    [finalSolicitudId, finalOrgId],
    false,
    { sortField: 'timestamp', sortDesc: true, limit: 25 }
  );

  const lastAction = acciones[0] || {};
  const summary = Object.assign({}, caseRow || {}, orgRow || {}, {
    solicitud_id: finalSolicitudId,
    organizacion_id: finalOrgId,
    nombre_organizacion: String(orgRow && orgRow.nombre_organizacion || ''),
    estado_constitucion: String(orgRow && orgRow.estado_constitucion || ''),
    estado_general_organizacion: String(orgRow && orgRow.estado_general_organizacion || ''),
    fecha_antiguedad_organizacion:
      (hitoCreacionOrganizacion && hitoCreacionOrganizacion.fecha_hito) ||
      (orgRow && orgRow.fecha_asamblea_constitucion) ||
      (orgRow && orgRow.fecha_inicio_acompanamiento) ||
      (orgRow && orgRow.updated_at) ||
      '',
    fuente_fecha_antiguedad_organizacion: hitoCreacionOrganizacion
      ? 'Hito 5: Ingreso de documentación'
      : (
          (orgRow && orgRow.fecha_asamblea_constitucion && 'Fecha asamblea constitución') ||
          (orgRow && orgRow.fecha_inicio_acompanamiento && 'Fecha inicio acompañamiento') ||
          (orgRow && orgRow.updated_at && 'Última actualización') ||
          ''
        ),
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
    hitos: hitos,
    avance_hitos: avanceHitos,
    instrumentos: instrumentos,
    requisitos: requisitos,
    socios: socios,
    trazabilidad: acciones
  });

  goPesDiagEnd_(diag, {
    found: !!(result && result.summary)
  });
  return result;
}

function getHitoCreacionOrganizacionFromAvance_(rows) {
  const hitos = (rows || []).slice().sort(function(a, b) {
    return new Date(a.fecha_hito || a.timestamp_registro || 0) - new Date(b.fecha_hito || b.timestamp_registro || 0);
  });

  for (var i = 0; i < hitos.length; i++) {
    const h = hitos[i] || {};
    const tramo = normalizeText_(h.tramo || '');
    const nombre = normalizeText_(h.nombre_hito || '');
    if (
      Number(h.orden_hito || 0) === 5 &&
      tramo.indexOf('preconstitucion') !== -1 &&
      (nombre.indexOf('ingreso') !== -1 || nombre.indexOf('documentacion') !== -1)
    ) {
      return h;
    }
  }

  return null;
}

function guardarIngreso(payload) {
  const diag = goPesDiagStart_('Services.guardarIngreso', {});
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    const user = requireModuleAccess_('nuevo-ingreso', ['operador', 'coordinador', 'superuser']);
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
  const user = requireModuleAccess_('avance', ['operador', 'coordinador', 'superuser']);
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
  refreshPartialArtifacts_({
    masterSolicitudIds: [payload.solicitud_id],
    sugerenciaSolicitudIds: [payload.solicitud_id]
  });
  logProcessing_('INFO', 'guardarSeguimiento', 'avance', hitoId, user.email, 'OK', payload);
  logUserAction_('CREATE_AVANCE', 'avance', hitoId, 'OK', payload);
  return { ok: true, hito_id: hitoId };
}

function guardarOrganizacion(payload) {
  const diag = goPesDiagStart_('Services.guardarOrganizacion', {});
  const user = requireModuleAccess_('organizacion', ['operador', 'coordinador', 'superuser']);
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
  const diag = goPesDiagStart_('Services.guardarInstrumento', {});
  const user = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  ensureSheetsSubset_([
    GO_PES_V2.SHEETS.RAW_INSTRUMENTOS,
    GO_PES_V2.SHEETS.FACT_INSTRUMENTOS,
    GO_PES_V2.SHEETS.MAE_ORGANIZACIONES
  ]);

  payload = payload || {};
  validateInstrumentoV2_(payload);

  const organizacionId = String(payload.organizacion_id || '').trim();
  const organizacion = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!organizacion) throw new Error('No se encontró la organización indicada para registrar el instrumento.');

  const now = new Date();
  const orgInstrumentoId = String(payload.org_instrumento_id || '').trim() || nextId_('instrumento', 'OIN');
  const clean = {
    org_instrumento_id: orgInstrumentoId,
    organizacion_id: organizacionId,
    instrumento_codigo_catalogo: String(payload.instrumento_codigo_catalogo || '').trim(),
    instrumento_nombre_otro: String(payload.instrumento_nombre_otro || '').trim(),
    instrumento_tipo: String(payload.instrumento_tipo || '').trim(),
    origen_instrumento: String(payload.origen_instrumento || '').trim(),
    anio_convocatoria: String(payload.anio_convocatoria || '').trim(),
    nombre_convocatoria: String(payload.nombre_convocatoria || '').trim(),
    numero_llamado: String(payload.numero_llamado || '').trim(),
    fecha_inicio_gestion: asDateOrBlank_(payload.fecha_inicio_gestion) || now,
    fecha_apertura: asDateOrBlank_(payload.fecha_apertura),
    fecha_cierre: asDateOrBlank_(payload.fecha_cierre),
    fecha_habilitacion: asDateOrBlank_(payload.fecha_habilitacion),
    fecha_postulacion: asDateOrBlank_(payload.fecha_postulacion),
    fecha_resultado: asDateOrBlank_(payload.fecha_resultado),
    fecha_cierre_instrumento: asDateOrBlank_(payload.fecha_cierre_instrumento),
    estado_instrumento: String(payload.estado_instrumento || '').trim(),
    subestado_instrumento: String(payload.subestado_instrumento || '').trim(),
    avance_instrumento_pct: asNumberOrBlank_(payload.avance_instrumento_pct),
    proximo_hito_instrumento: String(payload.proximo_hito_instrumento || '').trim(),
    resultado_instrumento: String(payload.resultado_instrumento || '').trim(),
    monto_solicitado: asNumberOrBlank_(payload.monto_solicitado),
    monto_adjudicado: asNumberOrBlank_(payload.monto_adjudicado),
    monto_ejecutado: asNumberOrBlank_(payload.monto_ejecutado),
    responsable_instrumento: String(payload.responsable_instrumento || organizacion.responsable_actual || user.nombre_visible || user.email || '').trim(),
    contraparte: String(payload.contraparte || '').trim(),
    observacion_instrumento: String(payload.observacion_instrumento || '').trim(),
    documento_respaldo_url: String(payload.documento_respaldo_url || '').trim()
  };

  appendRowObject_(GO_PES_V2.SHEETS.RAW_INSTRUMENTOS, Object.assign({
    created_at: now,
    source: 'WEB_APP',
    user_email: user.email,
    legacy_source: '',
    legacy_key: ''
  }, clean));

  upsertByKey_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'org_instrumento_id', Object.assign({}, clean, {
    updated_by: user.email,
    updated_at: now
  }), false);

  refreshPartialArtifacts_({
    masterSolicitudIds: uniqueNonBlank_([organizacion.solicitud_id]),
    vistaOrganizacionIds: [organizacionId],
    vistaInstrumentoIds: [orgInstrumentoId],
    vistaTerritorialPairs: [{ uv: organizacion.uv || '', sector: organizacion.sector || '' }]
  });
  logProcessing_('INFO', 'guardarInstrumento', 'instrumento', orgInstrumentoId, user.email, 'OK', {
    organizacion_id: organizacionId,
    instrumento_codigo_catalogo: clean.instrumento_codigo_catalogo,
    estado_instrumento: clean.estado_instrumento
  });
  logUserAction_('UPSERT_INSTRUMENTO', 'instrumento', orgInstrumentoId, 'OK', {
    organizacion_id: organizacionId,
    instrumento_codigo_catalogo: clean.instrumento_codigo_catalogo,
    estado_instrumento: clean.estado_instrumento
  });

  const result = {
    ok: true,
    org_instrumento_id: orgInstrumentoId,
    organizacion_id: organizacionId
  };
  goPesDiagEnd_(diag, {
    ok: true,
    org_instrumento_id: orgInstrumentoId
  });
  return result;
}

function guardarRequisito(payload) {
  const diag = goPesDiagStart_('Services.guardarRequisito', {});
  const user = requireModuleAccess_('instrumento', ['operador', 'coordinador', 'superuser']);
  ensureSheetsSubset_([
    GO_PES_V2.SHEETS.RAW_REQUISITOS,
    GO_PES_V2.SHEETS.FACT_REQUISITOS,
    GO_PES_V2.SHEETS.FACT_INSTRUMENTOS,
    GO_PES_V2.SHEETS.MAE_ORGANIZACIONES
  ]);

  payload = payload || {};
  validateRequisitoV2_(payload);

  const organizacionId = String(payload.organizacion_id || '').trim();
  const orgInstrumentoId = String(payload.org_instrumento_id || '').trim();
  const organizacion = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!organizacion) throw new Error('No se encontró la organización indicada para registrar el requisito.');

  const instrumento = findByField_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'org_instrumento_id', orgInstrumentoId, false);
  if (!instrumento) throw new Error('No se encontró el instrumento indicado para registrar el requisito.');
  if (String(instrumento.organizacion_id || '').trim() !== organizacionId) {
    throw new Error('El instrumento indicado no pertenece a la organización seleccionada.');
  }

  const now = new Date();
  const requisitoRegistroId = String(payload.requisito_registro_id || '').trim() || nextId_('requisito', 'REQ');
  const clean = {
    requisito_registro_id: requisitoRegistroId,
    organizacion_id: organizacionId,
    org_instrumento_id: orgInstrumentoId,
    instrumento_codigo_catalogo: String(payload.instrumento_codigo_catalogo || instrumento.instrumento_codigo_catalogo || '').trim(),
    requisito_codigo: String(payload.requisito_codigo || '').trim(),
    requisito_nombre_libre: String(payload.requisito_nombre_libre || '').trim(),
    categoria_requisito: String(payload.categoria_requisito || '').trim(),
    estado_requisito: String(payload.estado_requisito || '').trim(),
    fecha_solicitud: asDateOrBlank_(payload.fecha_solicitud),
    fecha_cumplimiento: asDateOrBlank_(payload.fecha_cumplimiento),
    fecha_vencimiento: asDateOrBlank_(payload.fecha_vencimiento),
    responsable_requisito: String(payload.responsable_requisito || instrumento.responsable_instrumento || organizacion.responsable_actual || user.nombre_visible || user.email || '').trim(),
    documento_respaldo_url: String(payload.documento_respaldo_url || '').trim(),
    observacion_requisito: String(payload.observacion_requisito || '').trim(),
    vigente_flag: String(payload.vigente_flag || 'Sí').trim()
  };

  appendRowObject_(GO_PES_V2.SHEETS.RAW_REQUISITOS, Object.assign({
    created_at: now,
    source: 'WEB_APP',
    user_email: user.email,
    legacy_source: '',
    legacy_key: ''
  }, clean));

  upsertByKey_(GO_PES_V2.SHEETS.FACT_REQUISITOS, 'requisito_registro_id', Object.assign({}, clean, {
    updated_by: user.email,
    updated_at: now
  }), false);

  refreshPartialArtifacts_({
    masterSolicitudIds: uniqueNonBlank_([organizacion.solicitud_id]),
    vistaOrganizacionIds: [organizacionId],
    vistaInstrumentoIds: [orgInstrumentoId],
    vistaTerritorialPairs: [{ uv: organizacion.uv || '', sector: organizacion.sector || '' }]
  });
  logProcessing_('INFO', 'guardarRequisito', 'requisito', requisitoRegistroId, user.email, 'OK', {
    organizacion_id: organizacionId,
    org_instrumento_id: orgInstrumentoId,
    estado_requisito: clean.estado_requisito
  });
  logUserAction_('UPSERT_REQUISITO', 'requisito', requisitoRegistroId, 'OK', {
    organizacion_id: organizacionId,
    org_instrumento_id: orgInstrumentoId,
    estado_requisito: clean.estado_requisito
  });

  const result = {
    ok: true,
    requisito_registro_id: requisitoRegistroId,
    org_instrumento_id: orgInstrumentoId,
    organizacion_id: organizacionId
  };
  goPesDiagEnd_(diag, {
    ok: true,
    requisito_registro_id: requisitoRegistroId
  });
  return result;
}

function recalcularFicha(payload) {
  requireRole_([]);
  payload = payload || {};
  const solicitudId = String(payload.solicitud_id || '').trim();
  let organizacionId = String(payload.organizacion_id || '').trim();

  if (!solicitudId && !organizacionId) {
    return refrescarVistasYMaster();
  }

  let caseRow = null;
  let orgRow = null;

  if (solicitudId) {
    caseRow = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false);
  }
  if (organizacionId) {
    orgRow = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  }
  if (!orgRow && caseRow && caseRow.organizacion_id) {
    organizacionId = String(caseRow.organizacion_id || '').trim();
    orgRow = organizacionId
      ? findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false)
      : null;
  }
  if (!caseRow && orgRow && orgRow.solicitud_id) {
    caseRow = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', orgRow.solicitud_id, false);
  }

  refreshPartialArtifacts_({
    masterSolicitudIds: uniqueNonBlank_([solicitudId, caseRow && caseRow.solicitud_id, orgRow && orgRow.solicitud_id]),
    vistaOrganizacionIds: uniqueNonBlank_([organizacionId, orgRow && orgRow.organizacion_id]),
    vistaTerritorialPairs: [
      { uv: orgRow && orgRow.uv || caseRow && caseRow.uv || '', sector: orgRow && orgRow.sector || caseRow && caseRow.sector || '' }
    ],
    sugerenciaSolicitudIds: uniqueNonBlank_([solicitudId, caseRow && caseRow.solicitud_id, orgRow && orgRow.solicitud_id]),
    sugerenciaOrganizacionIds: uniqueNonBlank_([organizacionId, orgRow && orgRow.organizacion_id])
  });

  return serializeForClient_({
    ok: true,
    mode: 'partial',
    solicitud_id: String(caseRow && caseRow.solicitud_id || solicitudId || '').trim(),
    organizacion_id: String(orgRow && orgRow.organizacion_id || organizacionId || '').trim()
  });
}

function refrescarVistasYMaster() {
  requireRole_(['coordinador', 'superuser']);
  goPesRefrescarVistasYMaster_();
  return serializeForClient_({
    ok: true,
    mode: 'full'
  });
}

function listarHistorial(filters) {
  requireModuleAccess_('historial', ['operador', 'coordinador', 'superuser']);
  const config = filters || {};
  let rows = buildHistorialRows_();
  rows = filterHistorialRowsByPeriod_(rows, config.periodo || '');

  if (config.entity_id) {
    const targetEntityId = String(config.entity_id || '').trim();
    rows = rows.filter(function(row) {
      return String(row.entity_id || '').trim() === targetEntityId;
    });
  }

  if (config.email) {
    const targetEmail = normalizeText_(config.email || '');
    rows = rows.filter(function(row) {
      return normalizeText_(row.email || '') === targetEmail;
    });
  }

  if (config.source_key) {
    const targetSource = String(config.source_key || '').trim();
    rows = rows.filter(function(row) {
      return String(row.source_key || '').trim() === targetSource;
    });
  }

  return serializeForClient_(rows);
}

function getHistorialUsuariosLista() {
  requireModuleAccess_('historial', ['operador', 'coordinador', 'superuser']);
  const rows = getSheetData_(GO_PES_V2.SHEETS.DIM_USUARIOS) || [];
  return serializeForClient_(
    rows
      .filter(function(r) { return r.email; })
      .map(function(r) {
        return {
          email: String(r.email || '').trim(),
          nombre: String(r.nombre_visible || r.email || '').trim()
        };
      })
      .sort(function(a, b) { return a.nombre.localeCompare(b.nombre); })
  );
}

function filterHistorialRowsByPeriod_(rows, periodKey) {
  const normalizedPeriod = String(periodKey || '').trim().toLowerCase();
  const cutoff = resolveHistorialCutoffDate_(normalizedPeriod);
  if (!cutoff) return rows;

  return (rows || []).filter(function(row) {
    const timestamp = parseHistorialTimestamp_(row && row.timestamp);
    return timestamp && timestamp.getTime() >= cutoff.getTime();
  });
}

function resolveHistorialCutoffDate_(periodKey) {
  const now = new Date();
  const cutoff = new Date(now.getTime());

  switch (periodKey) {
    case 'last_week':
      cutoff.setDate(cutoff.getDate() - 7);
      return cutoff;
    case 'last_month':
      cutoff.setMonth(cutoff.getMonth() - 1);
      return cutoff;
    case 'last_year':
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      return cutoff;
    case 'all':
    case '':
      return null;
    default:
      return null;
  }
}

function buildHistorialRows_() {
  const rows = []
    .concat((getSheetData_(GO_PES_V2.SHEETS.LOG_ACCIONES) || []).map(mapHistorialAccionRow_))
    .concat((getSheetData_(GO_PES_V2.SHEETS.LOG_PROC) || []).map(mapHistorialProcesamientoRow_))
    .concat((getSheetData_(GO_PES_V2.SHEETS.LOG_ACCESOS) || []).map(mapHistorialAccesoRow_));

  return rows
    .filter(function(row) {
      return row && row.timestamp && row.action;
    })
    .sort(function(a, b) {
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    });
}

function mapHistorialAccionRow_(row) {
  return {
    timestamp: row.timestamp || '',
    source_key: 'accion_usuario',
    source_label: 'Accion usuario',
    email: String(row.email || ''),
    action: String(row.action || ''),
    entity_type: String(row.entity_type || ''),
    entity_id: String(row.entity_id || ''),
    result: String(row.result || ''),
    detail_text: buildHistorialDetailText_(row.detail_json),
    detail_json: String(row.detail_json || '')
  };
}

function mapHistorialProcesamientoRow_(row) {
  return {
    timestamp: row.timestamp || '',
    source_key: 'procesamiento',
    source_label: 'Procesamiento',
    email: String(row.usuario || ''),
    action: String(row.accion || ''),
    entity_type: String(row.entidad || ''),
    entity_id: String(row.entidad_id || ''),
    result: String(row.resultado || ''),
    detail_text: buildHistorialDetailText_(row.detalle_json),
    detail_json: String(row.detalle_json || '')
  };
}

function mapHistorialAccesoRow_(row) {
  return {
    timestamp: row.timestamp || '',
    source_key: 'acceso',
    source_label: 'Acceso',
    email: String(row.email || ''),
    action: String(row.event || ''),
    entity_type: 'sesion',
    entity_id: '',
    result: 'OK',
    detail_text: buildHistorialDetailText_(row.payload_json),
    detail_json: String(row.payload_json || '')
  };
}

function buildHistorialDetailText_(rawValue) {
  const parsed = parseHistorialJsonSafe_(rawValue);
  if (!parsed) return String(rawValue || '').trim();

  if (Array.isArray(parsed)) {
    return parsed.slice(0, 4).map(function(item) {
      return stringifyHistorialValue_(item);
    }).filter(Boolean).join(' | ');
  }

  const preferredKeys = [
    'nombre_organizacion',
    'nombre_comite_origen',
    'estado',
    'motivo',
    'observacion',
    'responsable_actual',
    'event',
    'total',
    'validos',
    'errores'
  ];
  const skippedKeys = {
    actor: true,
    payload: true,
    rows: true,
    data: true,
    timestamp: true,
    updated_at: true,
    created_at: true,
    entity_id: true,
    organizacion_id: true,
    solicitud_id: true
  };
  const entries = [];

  preferredKeys.forEach(function(key) {
    if (parsed[key] === undefined || parsed[key] === null || parsed[key] === '') return;
    entries.push(key + ': ' + stringifyHistorialValue_(parsed[key]));
  });

  Object.keys(parsed).forEach(function(key) {
    if (entries.length >= 4 || skippedKeys[key]) return;
    if (preferredKeys.indexOf(key) !== -1) return;
    const value = parsed[key];
    if (value === undefined || value === null || value === '' || typeof value === 'object') return;
    entries.push(key + ': ' + stringifyHistorialValue_(value));
  });

  return entries.join(' | ');
}

function parseHistorialJsonSafe_(rawValue) {
  if (!rawValue) return null;
  if (typeof rawValue === 'object') return rawValue;
  try {
    return JSON.parse(String(rawValue || ''));
  } catch (err) {
    return null;
  }
}

function stringifyHistorialValue_(value) {
  if (value === undefined || value === null) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  }
  if (typeof value === 'object') return '';
  return String(value);
}

function parseHistorialTimestamp_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
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

