function getOrganizacionesModuloClient() {
  requireModuleAccess_('organizacion', ['operador', 'coordinador', 'superuser']);

  var rows = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES)
    .filter(function(r) {
      return String(r.organizacion_id || '').trim() && String(r.nombre_organizacion || '').trim();
    })
    .sort(function(a, b) {
      return String(a.nombre_organizacion || '').localeCompare(String(b.nombre_organizacion || ''), 'es');
    });

  var hitosByOrg = {};
  try {
    var avanceHitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [];
    avanceHitos.forEach(function(h) {
      var orgId = String(h.organizacion_id || '').trim();
      if (!orgId) return;
      if (!hitosByOrg[orgId]) hitosByOrg[orgId] = [];
      var orden = Number(h.orden_hito || 0);
      if (orden > 0 && hitosByOrg[orgId].indexOf(orden) === -1) {
        hitosByOrg[orgId].push(orden);
      }
    });
  } catch (e) {}

  return serializeForClient_({
    organizaciones: rows.map(function(r) {
      var orgId = String(r.organizacion_id || '').trim();
      return {
        value: orgId,
        label: String(r.nombre_organizacion || '').trim(),
        estado_general_organizacion: String(r.estado_general_organizacion || ''),
        estado_constitucion: String(r.estado_constitucion || ''),
        uv: String(r.uv || ''),
        sector: String(r.sector || ''),
        tipo_organizacion: String(r.tipo_organizacion || ''),
        responsable_actual: String(r.responsable_actual || ''),
        certificado_definitivo_flag: String(r.certificado_definitivo_flag || ''),
        certificado_provisorio_flag: String(r.certificado_provisorio_flag || ''),
        personalidad_juridica_flag: String(r.personalidad_juridica_flag || ''),
        directiva_vigente_flag: String(r.directiva_vigente_flag || ''),
        organizacion_constituida_flag: String(r.organizacion_constituida_flag || ''),
        fecha_asamblea_constitucion: String(r.fecha_asamblea_constitucion || ''),
        hitos_cumplidos: hitosByOrg[orgId] || []
      };
    })
  });
}

function getOrganizacionesConGruposClient() {
  requireModuleAccess_('organizacion', ['operador', 'coordinador', 'superuser']);

  var avanceHitos = [];
  try { avanceHitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || []; } catch (e) {}

  // Obtener socios por organización para contar total
  var socios = [];
  try { socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || []; } catch (e) {}
  var sociosByOrg = {};
  var contactoByOrg = {}; // Primer socio con cargo "Presidente" o primer socio
  socios.forEach(function(s) {
    var orgId = String(s.organizacion_id || '').trim();
    if (!orgId) return;
    if (!sociosByOrg[orgId]) sociosByOrg[orgId] = 0;
    sociosByOrg[orgId]++;

    // Capturar contacto principal (preferir Presidente)
    if (!contactoByOrg[orgId] || String(s.cargo_socio || '').toLowerCase().indexOf('president') !== -1) {
      contactoByOrg[orgId] = String(s.nombre_socio || '').trim();
    }
  });

  var hitosByOrg = {};
  var hitosBySolicitud = {};
  avanceHitos.forEach(function(h) {
    var orgId  = String(h.organizacion_id || '').trim();
    var solId  = String(h.solicitud_id || '').trim();
    var orden  = Number(h.orden_hito || 0);
    if (orden <= 0) return;
    if (orgId) {
      if (!hitosByOrg[orgId]) hitosByOrg[orgId] = [];
      if (hitosByOrg[orgId].indexOf(orden) === -1) hitosByOrg[orgId].push(orden);
    } else if (solId) {
      if (!hitosBySolicitud[solId]) hitosBySolicitud[solId] = [];
      if (hitosBySolicitud[solId].indexOf(orden) === -1) hitosBySolicitud[solId].push(orden);
    }
  });

  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES)
    .filter(function(r) {
      return String(r.organizacion_id || '').trim() && String(r.nombre_organizacion || '').trim();
    })
    .map(function(r) {
      var orgId = String(r.organizacion_id || '').trim();
      return {
        tipo: 'organizacion',
        value: orgId,
        label: String(r.nombre_organizacion || '').trim(),
        estado_general_organizacion: String(r.estado_general_organizacion || ''),
        estado_constitucion: String(r.estado_constitucion || ''),
        uv: String(r.uv || ''),
        sector: String(r.sector || ''),
        direccion: String(r.direccion_organizacion || r.direccion || ''),
        tipo_organizacion: String(r.tipo_organizacion || ''),
        responsable_actual: String(r.responsable_actual || ''),
        total_socios: sociosByOrg[orgId] || 0,
        nombre_contacto: contactoByOrg[orgId] || '',
        certificado_definitivo_flag: String(r.certificado_definitivo_flag || ''),
        certificado_provisorio_flag: String(r.certificado_provisorio_flag || ''),
        personalidad_juridica_flag: String(r.personalidad_juridica_flag || ''),
        directiva_vigente_flag: String(r.directiva_vigente_flag || ''),
        organizacion_constituida_flag: String(r.organizacion_constituida_flag || ''),
        fecha_asamblea_constitucion: String(r.fecha_asamblea_constitucion || ''),
        hitos_cumplidos: hitosByOrg[orgId] || []
      };
    });

  var grupos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS)
    .filter(function(r) {
      var solId = String(r.solicitud_id || '').trim();
      if (!solId || String(r.organizacion_id || '').trim()) return false;
      var maxH = Math.max.apply(null, [0].concat(hitosBySolicitud[solId] || []));
      return maxH >= 2;
    })
    .map(function(r) {
      var solId = String(r.solicitud_id || '').trim();
      return {
        tipo: 'grupo_vecinos',
        value: solId,
        label: String(r.nombre_completo || '').trim() || 'Grupo de vecinos',
        solicitud_id: solId,
        uv: String(r.uv || ''),
        sector: String(r.sector || ''),
        direccion: String(r.direccion_original || ''),
        direccion_original: String(r.direccion_original || ''),
        responsable_actual: String(r.responsable_actual || ''),
        total_socios: 0, // Los grupos de vecinos no tienen socios formales aún
        nombre_contacto: String(r.nombre_completo || '').trim(), // El vecino que hace la solicitud
        fecha_ingreso: r.fecha_ingreso ? Utilities.formatDate(r.fecha_ingreso instanceof Date ? r.fecha_ingreso : new Date(r.fecha_ingreso), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
        hitos_cumplidos: hitosBySolicitud[solId] || []
      };
    });

  var todosSorted = orgs
    .sort(function(a, b) { return a.label.localeCompare(b.label, 'es'); })
    .concat(grupos.sort(function(a, b) { return a.label.localeCompare(b.label, 'es'); }));

  return serializeForClient_({ organizaciones: todosSorted });
}

function getOrganizacionModuloDetalle(payload) {
  requireModuleAccess_('organizacion', ['operador', 'coordinador', 'superuser']);

  const organizacionId = String(payload && payload.organizacion_id || '').trim();
  if (!organizacionId) throw new Error('Falta organizacion_id.');

  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!org) throw new Error('No se encontró la organización indicada.');

  const socios = filterByField_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'organizacion_id', organizacionId, false) || [];
  const instrumentos = filterByField_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS, 'organizacion_id', organizacionId, false) || [];
  const requisitos = filterByField_(GO_PES_V2.SHEETS.FACT_REQUISITOS, 'organizacion_id', organizacionId, false) || [];
  const casos = filterByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'organizacion_id', organizacionId, false) || [];
  const hitosLegacy = filterByField_(GO_PES_V2.SHEETS.FACT_HITOS, 'organizacion_id', organizacionId, false) || [];
  const _solicitudIdOrg = org ? String(org.solicitud_id || '').trim() : '';
  const avanceHitos = (getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [])
    .filter(function(row) {
      return String(row.organizacion_id || '').trim() === organizacionId
        || (_solicitudIdOrg && String(row.solicitud_id || '').trim() === _solicitudIdOrg);
    })
    .sort(function(a, b) {
      return new Date(b.timestamp_registro || 0) - new Date(a.timestamp_registro || 0);
    });
  const avanceEstados = goPesOrgGetSheetRowsSafe_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO, 'organizacion_id', organizacionId);
  const avanceVista = goPesOrgGetSheetRowsSafe_(GO_PES_V2.SHEETS.VW_AVANCE_ORGANIZACION, 'organizacion_id', organizacionId)[0] || {};
  const hitoNacimiento = avanceHitos
    .filter(function(r) {
      return String(r.codigo_hito || '').trim().toUpperCase() === 'PRE_05';
    })
    .sort(function(a, b) {
      return new Date(a.fecha_hito || a.timestamp_registro || 0) - new Date(b.fecha_hito || b.timestamp_registro || 0);
    })[0] || null;
  const fechaAntiguedad = (hitoNacimiento && hitoNacimiento.fecha_hito)
    || org.fecha_asamblea_constitucion
    || org.fecha_inicio_acompanamiento
    || org.updated_at
    || '';
  const historial = (getSheetData_(GO_PES_V2.SHEETS.LOG_ACCIONES) || [])
    .filter(function(r) {
      return String(r.entity_id || '') === organizacionId || String(r.detail_json || '').indexOf(organizacionId) !== -1;
    })
    .sort(function(a, b) {
      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    })
    .slice(0, 10);

  return serializeForClient_({
    organizacion: org,
    resumen: {
      cantidad_socios: socios.length,
      cantidad_casos: casos.length,
      cantidad_instrumentos: instrumentos.length,
      cantidad_requisitos: requisitos.length,
      cantidad_hitos_legacy: hitosLegacy.length,
      cantidad_avance_hitos: avanceHitos.length,
      estado_avance: String((avanceEstados[0] && avanceEstados[0].estado_avance) || avanceVista.estado_avance || ''),
      ultimo_hito: String((avanceHitos[0] && (avanceHitos[0].nombre_hito || avanceHitos[0].codigo_hito)) || (hitosLegacy[0] && hitosLegacy[0].hito) || ''),
      fecha_antiguedad_organizacion: fechaAntiguedad,
      fuente_fecha_antiguedad_organizacion: hitoNacimiento ? 'PRE_05' : (fechaAntiguedad ? 'organizacion' : '')
    },
    socios: socios.slice(0, 20),
    instrumentos: instrumentos.slice(0, 20),
    requisitos: requisitos.slice(0, 20),
    casos: casos.slice(0, 20),
    avance: {
      vista: avanceVista,
      hitos: avanceHitos.slice(0, 20),
      estados: avanceEstados.slice(0, 10),
      legacy: hitosLegacy.slice(0, 20)
    },
    historial: historial
  });
}

function suspenderOrganizacion(payload) {
  return cambiarEstadoAdministrativoOrganizacion_(payload, 'Suspendida', 'SUSPENDER_ORGANIZACION');
}

function eliminarOrganizacion(payload) {
  return cambiarEstadoAdministrativoOrganizacion_(payload, 'Eliminada', 'ELIMINAR_ORGANIZACION_LOGICA');
}

function cambiarEstadoAdministrativoOrganizacion_(payload, estado, action) {
  const user = requireModuleAccess_('organizacion', ['coordinador', 'superuser']);
  const organizacionId = String(payload && payload.organizacion_id || '').trim();
  const motivo = String(payload && payload.motivo || '').trim();
  if (!organizacionId) throw new Error('Falta organizacion_id.');

  const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!org) throw new Error('No se encontró la organización indicada.');

  const now = new Date();
  const nextOrg = Object.assign({}, org, {
    estado_general_organizacion: estado,
    observacion_resumen: [org.observacion_resumen || '', motivo ? '[' + estado + '] ' + motivo : ''].filter(Boolean).join('\n'),
    responsable_actual: user.nombre_visible || user.email,
    updated_at: now
  });

  appendRowObject_(GO_PES_V2.SHEETS.RAW_ORGANIZACIONES, {
    created_at: now,
    source: action,
    user_email: user.email,
    solicitud_id: nextOrg.solicitud_id || '',
    organizacion_id: nextOrg.organizacion_id,
    tipo_organizacion: nextOrg.tipo_organizacion || '',
    nombre_organizacion: nextOrg.nombre_organizacion || '',
    uv: nextOrg.uv || '',
    sector: nextOrg.sector || '',
    direccion_referencia: nextOrg.direccion_referencia || '',
    fecha_inicio_acompanamiento: nextOrg.fecha_inicio_acompanamiento || '',
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
    estado_general_organizacion: estado,
    responsable_actual: nextOrg.responsable_actual || '',
    observacion_resumen: nextOrg.observacion_resumen || ''
  });

  upsertByKey_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', nextOrg, false);
  refreshPartialArtifacts_({
    masterSolicitudIds: uniqueNonBlank_([nextOrg.solicitud_id]),
    vistaOrganizacionIds: [organizacionId],
    sugerenciaOrganizacionIds: [organizacionId]
  });
  logProcessing_('INFO', action, 'organizacion', organizacionId, user.email, 'OK', { estado: estado, motivo: motivo });
  logUserAction_(action, 'organizacion', organizacionId, 'OK', { estado: estado, motivo: motivo });
  return serializeForClient_({ ok: true, organizacion_id: organizacionId, estado_general_organizacion: estado });
}

function goPesOrgGetSheetRowsSafe_(sheetName, field, value) {
  if (!sheetName) return [];
  try {
    return filterByField_(sheetName, field, value, false) || [];
  } catch (err) {
    return [];
  }
}
