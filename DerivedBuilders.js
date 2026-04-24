/**
 * Builders de vistas derivadas y dimensiones sugeridas.
 * Este archivo es la fuente canónica para reconstrucciones materializadas.
 */
function goPesRefrescarVistasYMaster_() {
  ensureGoPesV2Sheets_();

  buildMasterDatos_();
  buildVistaOrganizaciones_();
  buildVistaInstrumentos_();
  buildVistaTerritorial_();
  rebuildSuggestionDims_();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Vistas y MASTER_DATOS actualizados.',
    'GO-PES',
    5
  );
}

function goPesRefrescarVistasYMaster() {
  return goPesRefrescarVistasYMaster_();
}

function rebuildSuggestionDims_() {
  ensureGoPesV2Sheets_();

  const S = GO_PES_V2.SHEETS;

  const casos = sheetExists_(S.MAE_CASOS) ? getSheetData_(S.MAE_CASOS) : [];
  const orgs = sheetExists_(S.MAE_ORGANIZACIONES) ? getSheetData_(S.MAE_ORGANIZACIONES) : [];

  const vecHeaders = [
    'vecino_id',
    'solicitud_id',
    'nombre_completo',
    'telefono_contacto',
    'direccion_original',
    'uv',
    'sector',
    'estado_actual',
    'organizacion_id',
    'updated_at'
  ];

  const solHeaders = [
    'solicitud_id',
    'vecino_id',
    'nombre_completo',
    'telefono_contacto',
    'direccion_original',
    'uv',
    'sector',
    'estado_actual',
    'organizacion_id',
    'fecha_ingreso',
    'updated_at'
  ];

  const orgHeaders = [
    'organizacion_id',
    'nombre_organizacion',
    'tipo_organizacion',
    'uv',
    'sector',
    'estado_constitucion',
    'estado_general_organizacion',
    'responsable_actual',
    'updated_at'
  ];

  const vecMap = {};
  const solMap = {};
  const orgMap = {};

  casos.forEach(function(r) {
    const vecinoId = String(r.vecino_id || '').trim();
    const solicitudId = String(r.solicitud_id || '').trim();
    const nombreCompleto = String(r.nombre_completo || buildFullName_(r.nombre_vecino, r.apellido_vecino) || '').trim();

    if (vecinoId) {
      vecMap[vecinoId] = [
        vecinoId,
        solicitudId,
        nombreCompleto,
        r.telefono_contacto || '',
        r.direccion_original || '',
        r.uv || '',
        r.sector || '',
        r.estado_actual || '',
        r.organizacion_id || '',
        r.updated_at || r.ultima_gestion || r.fecha_ingreso || ''
      ];
    }

    if (solicitudId) {
      solMap[solicitudId] = [
        solicitudId,
        vecinoId,
        nombreCompleto,
        r.telefono_contacto || '',
        r.direccion_original || '',
        r.uv || '',
        r.sector || '',
        r.estado_actual || '',
        r.organizacion_id || '',
        r.fecha_ingreso || '',
        r.updated_at || r.ultima_gestion || ''
      ];
    }
  });

  orgs.forEach(function(r) {
    const organizacionId = String(r.organizacion_id || '').trim();
    if (!organizacionId) return;

    orgMap[organizacionId] = [
      organizacionId,
      r.nombre_organizacion || '',
      r.tipo_organizacion || '',
      r.uv || '',
      r.sector || '',
      r.estado_constitucion || '',
      r.estado_general_organizacion || '',
      r.responsable_actual || '',
      r.updated_at || ''
    ];
  });

  replaceSheetData_(
    S.DIM_VEC_SUG,
    vecHeaders,
    Object.keys(vecMap).sort().map(function(k) { return vecMap[k]; })
  );

  replaceSheetData_(
    S.DIM_SOL_SUG,
    solHeaders,
    Object.keys(solMap).sort().map(function(k) { return solMap[k]; })
  );

  replaceSheetData_(
    S.DIM_ORG_SUG,
    orgHeaders,
    Object.keys(orgMap).sort().map(function(k) { return orgMap[k]; })
  );
}

/**
 * Reconstruye las capas materializadas desde las tablas RAW.
 * Se usa como ruta de reparación segura tras migraciones legacy o ajustes manuales.
 */
function reconstruirEstructurasDesdeRaw_() {
  ensureGoPesV2Sheets_();

  const S = GO_PES_V2.SHEETS;
  const raw = getSheetDataMap_([
    S.RAW_INGRESO,
    S.RAW_SEGUIMIENTO,
    S.RAW_ORGANIZACIONES,
    S.RAW_INSTRUMENTOS,
    S.RAW_REQUISITOS,
    S.RAW_SOCIOS
  ]);

  const ingresos = raw[S.RAW_INGRESO] || [];
  const seguimientos = raw[S.RAW_SEGUIMIENTO] || [];
  const organizaciones = raw[S.RAW_ORGANIZACIONES] || [];
  const instrumentos = raw[S.RAW_INSTRUMENTOS] || [];
  const requisitos = raw[S.RAW_REQUISITOS] || [];
  const socios = raw[S.RAW_SOCIOS] || [];

  const latestIngresoBySolicitud = pickLatestRowsByKey_(ingresos, 'solicitud_id', 'created_at');
  const latestSeguimientoBySolicitud = pickLatestRowsByKey_(seguimientos, 'solicitud_id', 'fecha_gestion');
  const latestOrganizacionById = pickLatestRowsByKey_(organizaciones, 'organizacion_id', 'created_at');
  const latestOrgBySolicitud = pickLatestRowsByKey_(organizaciones, 'solicitud_id', 'created_at');

  const caseHeaders = buildSheetDefinitions_()[S.MAE_CASOS];
  const caseRows = Object.keys(latestIngresoBySolicitud).sort().map(function(solicitudId) {
    const ingreso = latestIngresoBySolicitud[solicitudId];
    const seguimiento = latestSeguimientoBySolicitud[solicitudId] || {};
    const org = latestOrgBySolicitud[solicitudId] || {};

    const record = {
      solicitud_id: solicitudId,
      vecino_id: ingreso.vecino_id || '',
      nombre_vecino: ingreso.nombre_vecino || '',
      apellido_vecino: ingreso.apellido_vecino || '',
      nombre_completo: buildFullName_(ingreso.nombre_vecino, ingreso.apellido_vecino),
      rut_vecino: ingreso.rut_vecino || '',
      telefono_contacto: ingreso.telefono_contacto || '',
      correo_contacto: ingreso.correo_contacto || '',
      direccion_original: ingreso.direccion_original || '',
      uv: org.uv || ingreso.uv || '',
      sector: org.sector || ingreso.sector || '',
      tipo_vivienda: ingreso.tipo_vivienda || '',
      requerimiento_inicial: ingreso.requerimiento_inicial || '',
      medio_solicitud: ingreso.medio_solicitud || '',
      unidad_origen: ingreso.unidad_origen || '',
      fecha_ingreso: ingreso.fecha_solicitud || ingreso.created_at || '',
      estado_actual: seguimiento.estado_hito || ingreso.estado_vecino || 'Nuevo ingreso',
      etapa_actual: seguimiento.hito || 'Ingreso recibido',
      organizacion_id: seguimiento.organizacion_id || org.organizacion_id || ingreso.organizacion_id || '',
      ultima_gestion: seguimiento.fecha_gestion || ingreso.created_at || '',
      proximo_hito: seguimiento.proximo_hito_sugerido || 'Pendiente de contacto',
      responsable_actual: seguimiento.responsable_gestion || org.responsable_actual || ingreso.user_email || '',
      observacion_resumen: seguimiento.detalle_gestion || org.observacion_resumen || ingreso.observaciones_form || '',
      updated_at: latestDateValue_(seguimiento.fecha_gestion, seguimiento.created_at, ingreso.created_at, ingreso.fecha_solicitud)
    };

    return caseHeaders.map(function(header) {
      return record[header] !== undefined ? record[header] : '';
    });
  });

  const orgHeaders = buildSheetDefinitions_()[S.MAE_ORGANIZACIONES];
  const orgRows = Object.keys(latestOrganizacionById).sort().map(function(organizacionId) {
    const row = latestOrganizacionById[organizacionId];
    const record = {
      organizacion_id: organizacionId,
      solicitud_id: row.solicitud_id || '',
      tipo_organizacion: row.tipo_organizacion || '',
      nombre_organizacion: row.nombre_organizacion || '',
      uv: row.uv || '',
      sector: row.sector || '',
      direccion_referencia: row.direccion_referencia || '',
      fecha_inicio_acompanamiento: row.fecha_inicio_acompanamiento || row.created_at || '',
      cantidad_socios_declarada: row.cantidad_socios_declarada || '',
      estado_constitucion: row.estado_constitucion || '',
      fecha_asamblea_constitucion: row.fecha_asamblea_constitucion || '',
      fecha_ratificacion: row.fecha_ratificacion || '',
      vigencia_directiva_hasta: row.vigencia_directiva_hasta || '',
      personalidad_juridica_flag: row.personalidad_juridica_flag || '',
      certificado_provisorio_flag: row.certificado_provisorio_flag || '',
      certificado_definitivo_flag: row.certificado_definitivo_flag || '',
      directiva_vigente_flag: row.directiva_vigente_flag || '',
      organizacion_constituida_flag: row.organizacion_constituida_flag || '',
      estado_general_organizacion: row.estado_general_organizacion || '',
      responsable_actual: row.responsable_actual || row.user_email || '',
      observacion_resumen: row.observacion_resumen || '',
      updated_at: latestDateValue_(row.created_at, row.fecha_inicio_acompanamiento)
    };

    return orgHeaders.map(function(header) {
      return record[header] !== undefined ? record[header] : '';
    });
  });

  const hitoHeaders = buildSheetDefinitions_()[S.FACT_HITOS];
  const hitoRows = seguimientos
    .filter(function(row) { return String(row.solicitud_id || '').trim(); })
    .sort(compareRowsByDateDesc_.bind(null, 'fecha_gestion', 'created_at'))
    .map(function(row) {
      const record = {
        hito_id: row.hito_id || deterministicId_('HIT', [row.legacy_source, row.legacy_key, row.solicitud_id, row.organizacion_id, row.hito, row.fecha_gestion, row.detalle_gestion]),
        solicitud_id: row.solicitud_id || '',
        organizacion_id: row.organizacion_id || '',
        vecino_id: row.vecino_id || '',
        fecha_gestion: row.fecha_gestion || row.created_at || '',
        responsable_gestion: row.responsable_gestion || row.user_email || '',
        territorial_responsable: row.territorial_responsable || '',
        flujo: row.flujo || '',
        hito: row.hito || '',
        estado_hito: row.estado_hito || '',
        detalle_gestion: row.detalle_gestion || '',
        resultado_hito: row.resultado_hito || '',
        fecha_vencimiento: row.fecha_vencimiento || '',
        proximo_hito_sugerido: row.proximo_hito_sugerido || '',
        proxima_accion_descripcion: row.proxima_accion_descripcion || '',
        documento_respaldo_url: row.documento_respaldo_url || '',
        updated_by: row.user_email || '',
        updated_at: latestDateValue_(row.fecha_gestion, row.created_at)
      };

      return hitoHeaders.map(function(header) {
        return record[header] !== undefined ? record[header] : '';
      });
    });

  const instrumentoHeaders = buildSheetDefinitions_()[S.FACT_INSTRUMENTOS];
  const instrumentoRows = buildRowsFromRawByKey_(
    instrumentos,
    'org_instrumento_id',
    'created_at',
    function(row) {
      const instrumentId = row.org_instrumento_id || deterministicId_('OIN', [row.legacy_source, row.legacy_key, row.organizacion_id, row.instrumento_codigo_catalogo, row.anio_convocatoria]);
      return {
        org_instrumento_id: instrumentId,
        organizacion_id: row.organizacion_id || '',
        instrumento_codigo_catalogo: row.instrumento_codigo_catalogo || '',
        instrumento_nombre_otro: row.instrumento_nombre_otro || '',
        instrumento_tipo: row.instrumento_tipo || '',
        origen_instrumento: row.origen_instrumento || '',
        anio_convocatoria: row.anio_convocatoria || '',
        nombre_convocatoria: row.nombre_convocatoria || '',
        numero_llamado: row.numero_llamado || '',
        fecha_inicio_gestion: row.fecha_inicio_gestion || row.created_at || '',
        fecha_apertura: row.fecha_apertura || '',
        fecha_cierre: row.fecha_cierre || '',
        fecha_habilitacion: row.fecha_habilitacion || '',
        fecha_postulacion: row.fecha_postulacion || '',
        fecha_resultado: row.fecha_resultado || '',
        fecha_cierre_instrumento: row.fecha_cierre_instrumento || '',
        estado_instrumento: row.estado_instrumento || '',
        subestado_instrumento: row.subestado_instrumento || '',
        avance_instrumento_pct: row.avance_instrumento_pct || '',
        proximo_hito_instrumento: row.proximo_hito_instrumento || '',
        resultado_instrumento: row.resultado_instrumento || '',
        monto_solicitado: row.monto_solicitado || '',
        monto_adjudicado: row.monto_adjudicado || '',
        monto_ejecutado: row.monto_ejecutado || '',
        responsable_instrumento: row.responsable_instrumento || row.user_email || '',
        contraparte: row.contraparte || '',
        observacion_instrumento: row.observacion_instrumento || '',
        documento_respaldo_url: row.documento_respaldo_url || '',
        updated_by: row.user_email || '',
        updated_at: latestDateValue_(row.fecha_inicio_gestion, row.created_at)
      };
    },
    instrumentoHeaders
  );

  const requisitoHeaders = buildSheetDefinitions_()[S.FACT_REQUISITOS];
  const requisitoRows = buildRowsFromRawByKey_(
    requisitos,
    'requisito_registro_id',
    'created_at',
    function(row) {
      const requisitoId = row.requisito_registro_id || deterministicId_('REQ', [row.legacy_source, row.legacy_key, row.organizacion_id, row.org_instrumento_id, row.requisito_codigo]);
      return {
        requisito_registro_id: requisitoId,
        organizacion_id: row.organizacion_id || '',
        org_instrumento_id: row.org_instrumento_id || '',
        instrumento_codigo_catalogo: row.instrumento_codigo_catalogo || '',
        requisito_codigo: row.requisito_codigo || '',
        requisito_nombre_libre: row.requisito_nombre_libre || '',
        categoria_requisito: row.categoria_requisito || '',
        estado_requisito: row.estado_requisito || '',
        fecha_solicitud: row.fecha_solicitud || '',
        fecha_cumplimiento: row.fecha_cumplimiento || '',
        fecha_vencimiento: row.fecha_vencimiento || '',
        responsable_requisito: row.responsable_requisito || row.user_email || '',
        documento_respaldo_url: row.documento_respaldo_url || '',
        observacion_requisito: row.observacion_requisito || '',
        vigente_flag: row.vigente_flag || '',
        updated_by: row.user_email || '',
        updated_at: latestDateValue_(row.fecha_cumplimiento, row.fecha_solicitud, row.created_at)
      };
    },
    requisitoHeaders
  );

  const socioHeaders = buildSheetDefinitions_()[S.FACT_SOCIOS];
  const socioRows = buildRowsFromRawByKey_(
    socios,
    '',
    'created_at',
    function(row) {
      return {
        socio_id: deterministicId_('SOC', [row.legacy_source, row.legacy_key, row.organizacion_id, row.run_socio, row.numero_registro, row.nombre_socio]),
        organizacion_id: row.organizacion_id || '',
        run_socio: row.run_socio || '',
        numero_registro: row.numero_registro || '',
        nombre_socio: row.nombre_socio || '',
        edad: row.edad || '',
        cargo: row.cargo || '',
        direccion_socio: row.direccion_socio || '',
        ubicacion_socio: row.ubicacion_socio || '',
        nombre_comite_origen: row.nombre_comite_origen || '',
        status_carga: row.status_carga || '',
        updated_by: row.user_email || '',
        updated_at: latestDateValue_(row.created_at)
      };
    },
    socioHeaders
  );

  replaceSheetData_(S.MAE_CASOS, caseHeaders, caseRows);
  replaceSheetData_(S.MAE_ORGANIZACIONES, orgHeaders, orgRows);
  replaceSheetData_(S.FACT_HITOS, hitoHeaders, hitoRows);
  replaceSheetData_(S.FACT_INSTRUMENTOS, instrumentoHeaders, instrumentoRows);
  replaceSheetData_(S.FACT_REQUISITOS, requisitoHeaders, requisitoRows);
  replaceSheetData_(S.FACT_SOCIOS, socioHeaders, socioRows);

  goPesRefrescarVistasYMaster_();

  return {
    ok: true,
    mae_casos: caseRows.length,
    mae_organizaciones: orgRows.length,
    fact_hitos: hitoRows.length,
    fact_instrumentos: instrumentoRows.length,
    fact_requisitos: requisitoRows.length,
    fact_socios: socioRows.length
  };
}

function buildMasterDatos_() {
  const S = GO_PES_V2.SHEETS;
  const headers = buildSheetDefinitions_()[S.MASTER];

  const casos = getSheetData_(S.MAE_CASOS);
  const orgs = getSheetData_(S.MAE_ORGANIZACIONES);
  const instrumentos = getSheetData_(S.FACT_INSTRUMENTOS);
  const requisitos = getSheetData_(S.FACT_REQUISITOS);
  const socios = getSheetData_(S.FACT_SOCIOS);
  const logAcciones = sheetExists_(S.LOG_ACCIONES) ? getSheetData_(S.LOG_ACCIONES) : [];

  const orgBySolicitud = {};
  orgs.forEach(function(r) {
    if (r.solicitud_id) orgBySolicitud[r.solicitud_id] = r;
  });

  const instrumentosActivosByOrg = {};
  instrumentos.forEach(function(r) {
    const orgId = r.organizacion_id || '';
    if (!orgId) return;
    const estado = normalizeText_(r.estado_instrumento);
    const activo = ['identificado', 'en evaluacion', 'en habilitacion', 'habilitado', 'postulacion en preparacion', 'postulacion enviada', 'en revision', 'adjudicado', 'en implementacion'].indexOf(estado) !== -1;
    if (!instrumentosActivosByOrg[orgId]) instrumentosActivosByOrg[orgId] = 0;
    if (activo) instrumentosActivosByOrg[orgId]++;
  });

  const requisitosPendientesByOrg = {};
  requisitos.forEach(function(r) {
    const orgId = r.organizacion_id || '';
    if (!orgId) return;
    const estado = normalizeText_(r.estado_requisito);
    const pendiente = ['pendiente', 'solicitado', 'rechazado', 'vencido'].indexOf(estado) !== -1;
    if (!requisitosPendientesByOrg[orgId]) requisitosPendientesByOrg[orgId] = 0;
    if (pendiente) requisitosPendientesByOrg[orgId]++;
  });

  const sociosByOrg = {};
  socios.forEach(function(r) {
    const orgId = r.organizacion_id || '';
    if (!orgId) return;
    if (!sociosByOrg[orgId]) sociosByOrg[orgId] = 0;
    sociosByOrg[orgId]++;
  });

  const lastActionByEntity = {};
  logAcciones.forEach(function(r) {
    const key = (r.entity_type || '') + '|' + (r.entity_id || '');
    const ts = new Date(r.timestamp || 0).getTime();
    if (!lastActionByEntity[key] || ts > lastActionByEntity[key]._ts) {
      lastActionByEntity[key] = {
        _ts: ts,
        email: r.email || '',
        updated_at: r.timestamp || '',
        action: r.action || ''
      };
    }
  });

  const rows = casos.map(function(c) {
    const org = orgBySolicitud[c.solicitud_id] || {};
    const orgId = org.organizacion_id || c.organizacion_id || '';
    const lastAction =
      lastActionByEntity['organizacion|' + orgId] ||
      lastActionByEntity['solicitud|' + c.solicitud_id] ||
      {};

    const record = {
      solicitud_id: c.solicitud_id || '',
      vecino_id: c.vecino_id || '',
      organizacion_id: orgId,
      nombre_completo: c.nombre_completo || '',
      telefono_contacto: c.telefono_contacto || '',
      correo_contacto: c.correo_contacto || '',
      direccion_original: c.direccion_original || '',
      uv: org.uv || c.uv || '',
      sector: org.sector || c.sector || '',
      fecha_ingreso: c.fecha_ingreso || '',
      estado_actual: c.estado_actual || '',
      etapa_actual: c.etapa_actual || '',
      proximo_hito: c.proximo_hito || '',
      responsable_actual: org.responsable_actual || c.responsable_actual || '',
      nombre_organizacion: org.nombre_organizacion || '',
      estado_constitucion: org.estado_constitucion || '',
      estado_general_organizacion: org.estado_general_organizacion || '',
      cantidad_instrumentos_activos: instrumentosActivosByOrg[orgId] || 0,
      cantidad_requisitos_pendientes: requisitosPendientesByOrg[orgId] || 0,
      cantidad_socios: sociosByOrg[orgId] || 0,
      ultimo_usuario: lastAction.email || '',
      ultima_actualizacion: lastAction.updated_at || c.updated_at || org.updated_at || ''
    };

    return headers.map(function(h) {
      return record[h] !== undefined ? record[h] : '';
    });
  });

  replaceSheetData_(S.MASTER, headers, rows);
}

function pickLatestRowsByKey_(rows, keyField, dateField) {
  return (rows || []).reduce(function(acc, row) {
    const key = String(row[keyField] || '').trim();
    if (!key) return acc;

    const currentTs = newestTimestampFromRow_(row, [dateField, 'updated_at', 'created_at']);
    const previousTs = acc[key] ? newestTimestampFromRow_(acc[key], [dateField, 'updated_at', 'created_at']) : -1;

    if (!acc[key] || currentTs >= previousTs) {
      acc[key] = row;
    }

    return acc;
  }, {});
}

function buildRowsFromRawByKey_(rows, keyField, dateField, mapper, headers) {
  const bucket = {};

  (rows || []).forEach(function(row, idx) {
    const mapped = mapper(row, idx) || {};
    const key = keyField ? String(mapped[keyField] || row[keyField] || '').trim() : String(mapped.socio_id || '').trim();
    if (!key) return;

    const previous = bucket[key];
    const currentTs = newestTimestampFromRow_(mapped, [dateField, 'updated_at', 'created_at']);
    const previousTs = previous ? newestTimestampFromRow_(previous, [dateField, 'updated_at', 'created_at']) : -1;

    if (!previous || currentTs >= previousTs) {
      bucket[key] = mapped;
    }
  });

  return Object.keys(bucket).sort().map(function(key) {
    return headers.map(function(header) {
      return bucket[key][header] !== undefined ? bucket[key][header] : '';
    });
  });
}

function newestTimestampFromRow_(row, fields) {
  const timestamps = (fields || []).map(function(field) {
    return new Date(row && row[field] ? row[field] : 0).getTime();
  }).filter(function(value) {
    return !isNaN(value) && value > 0;
  });

  return timestamps.length ? Math.max.apply(null, timestamps) : 0;
}

function latestDateValue_() {
  const values = Array.prototype.slice.call(arguments);
  let winner = '';
  let winnerTs = 0;

  values.forEach(function(value) {
    const ts = new Date(value || 0).getTime();
    if (!isNaN(ts) && ts >= winnerTs) {
      winnerTs = ts;
      winner = value || '';
    }
  });

  return winner;
}

function compareRowsByDateDesc_(primaryField, fallbackField, a, b) {
  const aTs = newestTimestampFromRow_(a, [primaryField, fallbackField]);
  const bTs = newestTimestampFromRow_(b, [primaryField, fallbackField]);
  return bTs - aTs;
}

function buildVistaOrganizaciones_() {
  const S = GO_PES_V2.SHEETS;
  const headers = buildSheetDefinitions_()[S.VW_ORGS];

  const orgs = getSheetData_(S.MAE_ORGANIZACIONES);
  const instrumentos = getSheetData_(S.FACT_INSTRUMENTOS);
  const socios = getSheetData_(S.FACT_SOCIOS);

  const instrumentosByOrg = {};
  instrumentos.forEach(function(r) {
    const orgId = r.organizacion_id || '';
    if (!orgId) return;
    if (!instrumentosByOrg[orgId]) instrumentosByOrg[orgId] = 0;
    instrumentosByOrg[orgId]++;
  });

  const sociosByOrg = {};
  socios.forEach(function(r) {
    const orgId = r.organizacion_id || '';
    if (!orgId) return;
    if (!sociosByOrg[orgId]) sociosByOrg[orgId] = 0;
    sociosByOrg[orgId]++;
  });

  const rows = orgs.map(function(r) {
    const record = {
      organizacion_id: r.organizacion_id || '',
      solicitud_id: r.solicitud_id || '',
      nombre_organizacion: r.nombre_organizacion || '',
      uv: r.uv || '',
      sector: r.sector || '',
      estado_constitucion: r.estado_constitucion || '',
      estado_general_organizacion: r.estado_general_organizacion || '',
      cantidad_instrumentos_activos: instrumentosByOrg[r.organizacion_id] || 0,
      cantidad_socios: sociosByOrg[r.organizacion_id] || 0,
      responsable_actual: r.responsable_actual || '',
      updated_at: r.updated_at || ''
    };
    return headers.map(function(h) {
      return record[h] !== undefined ? record[h] : '';
    });
  });

  replaceSheetData_(S.VW_ORGS, headers, rows);
}

function buildVistaInstrumentos_() {
  const S = GO_PES_V2.SHEETS;
  const headers = buildSheetDefinitions_()[S.VW_INSTR];

  const instrumentos = getSheetData_(S.FACT_INSTRUMENTOS);
  const orgs = getSheetData_(S.MAE_ORGANIZACIONES);

  const orgNameById = {};
  orgs.forEach(function(r) {
    orgNameById[r.organizacion_id] = r.nombre_organizacion || '';
  });

  const rows = instrumentos.map(function(r) {
    const record = {
      org_instrumento_id: r.org_instrumento_id || '',
      organizacion_id: r.organizacion_id || '',
      nombre_organizacion: orgNameById[r.organizacion_id] || '',
      instrumento_codigo_catalogo: r.instrumento_codigo_catalogo || '',
      instrumento_tipo: r.instrumento_tipo || '',
      origen_instrumento: r.origen_instrumento || '',
      estado_instrumento: r.estado_instrumento || '',
      resultado_instrumento: r.resultado_instrumento || '',
      avance_instrumento_pct: r.avance_instrumento_pct || '',
      responsable_instrumento: r.responsable_instrumento || '',
      updated_at: r.updated_at || ''
    };
    return headers.map(function(h) {
      return record[h] !== undefined ? record[h] : '';
    });
  });

  replaceSheetData_(S.VW_INSTR, headers, rows);
}

function buildVistaTerritorial_() {
  const S = GO_PES_V2.SHEETS;
  const headers = buildSheetDefinitions_()[S.VW_TERR];

  const casos = getSheetData_(S.MAE_CASOS);
  const orgs = getSheetData_(S.MAE_ORGANIZACIONES);
  const instrumentos = getSheetData_(S.FACT_INSTRUMENTOS);

  const map = {};

  function ensureKey(uv, sector) {
    const key = (uv || '') + '|' + (sector || '');
    if (!map[key]) {
      map[key] = {
        uv: uv || '',
        sector: sector || '',
        total_solicitudes: 0,
        total_organizaciones: 0,
        organizaciones_constituidas: 0,
        instrumentos_activos: 0
      };
    }
    return map[key];
  }

  casos.forEach(function(r) {
    ensureKey(r.uv || '', r.sector || '').total_solicitudes++;
  });

  const orgById = {};
  orgs.forEach(function(r) {
    orgById[r.organizacion_id] = r;
    const bucket = ensureKey(r.uv || '', r.sector || '');
    bucket.total_organizaciones++;
    if (normalizeText_(r.estado_constitucion) === 'constituida') {
      bucket.organizaciones_constituidas++;
    }
  });

  instrumentos.forEach(function(r) {
    const org = orgById[r.organizacion_id];
    if (!org) return;
    const estado = normalizeText_(r.estado_instrumento);
    const activo = ['identificado', 'en evaluacion', 'en habilitacion', 'habilitado', 'postulacion en preparacion', 'postulacion enviada', 'en revision', 'adjudicado', 'en implementacion'].indexOf(estado) !== -1;
    if (!activo) return;
    ensureKey(org.uv || '', org.sector || '').instrumentos_activos++;
  });

  const rows = Object.keys(map).sort().map(function(k) {
    return headers.map(function(h) {
      return map[k][h] !== undefined ? map[k][h] : '';
    });
  });

  replaceSheetData_(S.VW_TERR, headers, rows);
}
