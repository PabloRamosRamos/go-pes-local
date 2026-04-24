/**
 * Catálogos y payloads auxiliares para la UI.
 * Reúne catálogos de dominio y catálogos derivados desde datos operativos.
 */
const GO_PES_CATALOG_CACHE_KEYS = {
  APP_CLIENT: 'go_pes_catalogs_app_client',
  INGRESO_CLIENT: 'go_pes_catalogs_ingreso_client',
  ORGANIZACION_CLIENT: 'go_pes_catalogs_organizacion_client',
  AVANCE_ORGS_CLIENT: 'go_pes_catalogs_avance_orgs_client'
};

function seedGoPesV2Catalogs_() {
  ensureGoPesV2Sheets_();
  seedEstados_();
  seedEtapas_();
  seedOrigen_();
  seedInstrumentos_();
  seedRequisitos_();
  seedCargos_();
  seedDerivedTerritorio_();
  seedDerivedResponsables_();
}

function seedEstados_() {
  const rows = []
    .concat(buildEstadoRows_('estado_vecino', [
      'Nuevo ingreso',
      'Pendiente de contacto',
      'En orientación',
      'En seguimiento',
      'Avanza a organización',
      'No continúa',
      'Desistido',
      'Cerrado'
    ]))
    .concat(buildEstadoRows_('estado_constitucion', [
      'Sin iniciar',
      'En visita',
      'Carta ingresada',
      'Asamblea realizada',
      'Documentación ingresada',
      'Provisoria obtenida',
      'Ratificación pendiente',
      'Constituida'
    ]))
    .concat(buildEstadoRows_('estado_general_organizacion', [
      'En constitución',
      'Constituida sin instrumentos',
      'Constituida con beneficios activos',
      'Constituida con postulaciones en curso',
      'Constituida con adjudicación',
      'Inactiva',
      'Cerrada'
    ]))
    .concat(buildEstadoRows_('estado_hito', [
      'Pendiente',
      'En curso',
      'Cumplido',
      'No aplica',
      'Vencido',
      'Cancelado'
    ]))
    .concat(buildEstadoRows_('estado_instrumento', [
      'Identificado',
      'En evaluación',
      'En habilitación',
      'Habilitado',
      'Postulación en preparación',
      'Postulación enviada',
      'En revisión',
      'Adjudicado',
      'No adjudicado',
      'En implementación',
      'Ejecutado',
      'Cerrado',
      'Desistido'
    ]))
    .concat(buildEstadoRows_('resultado_instrumento', [
      'Adjudicado',
      'No adjudicado',
      'En revisión',
      'Pendiente',
      'No aplica'
    ]))
    .concat(buildEstadoRows_('estado_requisito', [
      'Pendiente',
      'Solicitado',
      'Entregado',
      'Validado',
      'Rechazado',
      'Vencido',
      'No aplica'
    ]));

  mergeCatalogRows_(
    GO_PES_V2.SHEETS.DIM_ESTADOS,
    ['tipo_estado', 'codigo_estado', 'descripcion_estado', 'orden_estado', 'activo_flag'],
    rows,
    ['tipo_estado', 'codigo_estado']
  );
}

function getCatalogosOrganizacionClient() {
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
  const cached = getCatalogCacheJson_(GO_PES_CATALOG_CACHE_KEYS.ORGANIZACION_CLIENT);
  if (cached) return cached;

  const payload = serializeForClient_(buildOrganizacionCatalogListBundle_());
  putCatalogCacheJson_(GO_PES_CATALOG_CACHE_KEYS.ORGANIZACION_CLIENT, payload, 300);
  return payload;
}

function getOrganizacionClientById(payload) {
  requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);

  const organizacionId = String(payload && payload.organizacion_id || '').trim();
  if (!organizacionId) throw new Error('Falta organizacion_id.');

  const row = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionId, false);
  if (!row) throw new Error('No se encontró la organización indicada.');

  return serializeForClient_(buildOrganizacionClientSnapshot_(row));
}

function buildEstadoRows_(tipo, values) {
  return values.map(function(v, i) {
    return [tipo, catalogSlugify_(v), v, i + 1, true];
  });
}

function sanitizeForClient_(value) {
  return serializeForClient_(value);
}

function getCatalogosAppClient() {
  const cached = getCatalogCacheJson_(GO_PES_CATALOG_CACHE_KEYS.APP_CLIENT);
  if (cached) return cached;

  const payload = sanitizeForClient_(buildCatalogosAppClientBundle_());
  putCatalogCacheJson_(GO_PES_CATALOG_CACHE_KEYS.APP_CLIENT, payload, 300);
  return payload;
}

function seedEtapas_() {
  const rows = [
    [0, 'ingreso_recibido', 'Ingreso recibido', 0, 5, true],
    [1, 'visita_informativa', 'Visita informativa realizada', 1, 10, true],
    [2, 'carta_ingresada', 'Carta ingresada', 2, 10, true],
    [3, 'asamblea_constitucion', 'Asamblea realizada', 3, 20, true],
    [4, 'documentos_secretaria', 'Documentación ingresada', 4, 15, true],
    [5, 'certificado_provisorio', 'Provisoria obtenida', 5, 15, true],
    [6, 'asamblea_ratificacion', 'Ratificación pendiente / realizada', 6, 15, true],
    [7, 'organizacion_constituida', 'Constituida', 7, 10, true]
  ];

  mergeCatalogRows_(
    GO_PES_V2.SHEETS.DIM_ETAPAS,
    ['etapa_constitucion_num', 'etapa_constitucion_codigo', 'etapa_constitucion_txt', 'orden_visual', 'peso_avance', 'activa_flag'],
    rows,
    ['etapa_constitucion_codigo']
  );
}

function seedOrigen_() {
  const rows = [
    ['Derivación interna', 'OOCC', 'interna', true],
    ['Derivación interna', 'OAVI', 'interna', true],
    ['Derivación interna', 'Seguridad', 'interna', true],
    ['Derivación interna', 'Territorial', 'interna', true],
    ['Derivación interna', 'DIDECO', 'interna', true],
    ['Derivación interna', 'Otra unidad municipal', 'interna', true],
    ['Publicidad', 'Sin dato', 'externa', true],
    ['Recomendación de vecino', 'Sin dato', 'externa', true],
    ['Demanda espontánea', 'Sin dato', 'externa', true],
    ['Derivación externa', 'Externa', 'externa', true],
    ['Otro', 'Sin dato', 'otra', true],
    ['Telefono', 'OOCC', 'interna', true],
    ['Correo', 'OOCC', 'interna', true]
  ];

  mergeCatalogRows_(
    GO_PES_V2.SHEETS.DIM_ORIGEN,
    ['medio_solicitud', 'unidad_origen', 'categoria_origen', 'activo_flag'],
    rows,
    ['medio_solicitud', 'unidad_origen']
  );
}

function seedInstrumentos_() {
  const rows = [
    ['CAMARAS_1414', 'Cámaras 1414', 'beneficio_municipal', 'municipal', true],
    ['FONDESE', 'FONDESE', 'fondo_municipal', 'municipal', true],
    ['FONDO_ESTATAL_SEGURIDAD', 'Fondo estatal de seguridad', 'fondo_estatal', 'estatal', true],
    ['APOYO_TECNICO_POSTULACION', 'Apoyo técnico de postulación', 'asistencia_tecnica', 'municipal', true],
    ['OTRO', 'Otro instrumento', 'subvencion', 'otro', true]
  ];

  mergeCatalogRows_(
    GO_PES_V2.SHEETS.DIM_INSTRUMENTOS,
    ['instrumento_codigo_catalogo', 'instrumento_nombre', 'instrumento_tipo', 'origen_instrumento', 'activo_flag'],
    rows,
    ['instrumento_codigo_catalogo']
  );
}

function seedRequisitos_() {
  const rows = [
    ['CAMARAS_1414', 'organizacion_constituida', 'Organización constituida', 'legal', true],
    ['CAMARAS_1414', 'validacion_tecnica', 'Validación técnica', 'tecnico', true],
    ['CAMARAS_1414', 'convenio_firmado', 'Convenio firmado', 'administrativo', true],
    ['CAMARAS_1414', 'factibilidad_instalacion', 'Factibilidad de instalación', 'tecnico', true],

    ['FONDESE', 'directiva_vigente', 'Directiva vigente', 'legal', true],
    ['FONDESE', 'certificado_definitivo', 'Certificado definitivo', 'legal', true],
    ['FONDESE', 'rmrfp', 'RMRFP', 'administrativo', true],
    ['FONDESE', 'rcce', 'RCCE', 'administrativo', true],
    ['FONDESE', 'certificado_directorio', 'Certificado directorio', 'legal', true],
    ['FONDESE', 'estatutos', 'Estatutos', 'legal', true],
    ['FONDESE', 'decreto_19862', 'Decreto 19.862', 'legal', true],
    ['FONDESE', 'e_rut', 'E-RUT', 'documental', true],
    ['FONDESE', 'cartola', 'Cartola', 'financiero', true],
    ['FONDESE', 'cuenta_cte', 'Cuenta corriente', 'financiero', true],
    ['FONDESE', 'acta', 'Acta', 'documental', true],
    ['FONDESE', 'ci', 'Cédula de identidad', 'documental', true],
    ['FONDESE', 'anexo_1', 'Anexo 1', 'documental', true],
    ['FONDESE', 'anexo_2', 'Anexo 2', 'documental', true],
    ['FONDESE', 'anexo_3', 'Anexo 3', 'documental', true],
    ['FONDESE', 'cotizaciones', 'Cotizaciones', 'financiero', true],

    ['FONDO_ESTATAL_SEGURIDAD', 'otro_requisito', 'Otro requisito', 'otro', true],
    ['APOYO_TECNICO_POSTULACION', 'otro_requisito', 'Otro requisito', 'otro', true],
    ['OTRO', 'otro_requisito', 'Otro requisito', 'otro', true]
  ];

  mergeCatalogRows_(
    GO_PES_V2.SHEETS.DIM_REQUISITOS,
    ['instrumento_codigo_catalogo', 'requisito_codigo', 'requisito_nombre', 'categoria_requisito', 'activo_flag'],
    rows,
    ['instrumento_codigo_catalogo', 'requisito_codigo']
  );
}

function seedCargos_() {
  const rows = [
    ['CAR-001', 'Presidente/a', true],
    ['CAR-002', 'Secretario/a', true],
    ['CAR-003', 'Tesorero/a', true],
    ['CAR-004', 'Director/a', true],
    ['CAR-005', 'Socio/a', true],
    ['CAR-999', 'Otro', true]
  ];

  mergeCatalogRows_(
    GO_PES_V2.SHEETS.DIM_CARGOS,
    ['cargo_id', 'cargo_nombre', 'activo_flag'],
    rows,
    ['cargo_nombre']
  );
}

function mergeCatalogRows_(sheetName, headers, newRows, keyFields) {
  ensureSheetWithHeaders_(sheetName, headers);

  const existing = getSheetData_(sheetName);
  const index = {};

  existing.forEach(function(r) {
    const key = catalogCompositeKeyFromObject_(r, keyFields);
    index[key] = headers.map(function(h) {
      return r[h] !== undefined ? r[h] : '';
    });
  });

  (newRows || []).forEach(function(row) {
    const rowObj = {};
    headers.forEach(function(h, i) {
      rowObj[h] = row[i];
    });

    const key = catalogCompositeKeyFromObject_(rowObj, keyFields);
    index[key] = headers.map(function(h) {
      return rowObj[h] !== undefined ? rowObj[h] : '';
    });
  });

  const rows = Object.keys(index).sort().map(function(k) {
    return index[k];
  });

  replaceSheetData_(sheetName, headers, rows);
}

function getCatalogosNuevoIngresoClient() {
  const cached = getCatalogCacheJson_(GO_PES_CATALOG_CACHE_KEYS.INGRESO_CLIENT);
  if (cached) return cached;

  const c = getCatalogosAppClient();
  const payload = {
    uvList: c.uvList || [],
    sectorByUv: c.sectorByUv || {},
    tipoVivienda: c.tipoVivienda || ['Casa', 'Departamento', 'Condominio', 'Pasaje', 'Villa', 'Mixto', 'Otro'],
    medioSolicitud: c.medioSolicitud || [],
    unidadOrigen: c.unidadOrigen || []
  };

  putCatalogCacheJson_(GO_PES_CATALOG_CACHE_KEYS.INGRESO_CLIENT, payload, 300);
  return payload;
}

function getCatalogosApp() {
  const S = GO_PES_V2.SHEETS;
  const sheets = getSheetDataMap_([
    S.DIM_TERRITORIO,
    S.DIM_ORIGEN,
    S.DIM_ESTADOS,
    S.DIM_ETAPAS,
    S.DIM_INSTRUMENTOS,
    S.DIM_REQUISITOS,
    S.DIM_USUARIOS,
    S.DIM_RESPONSABLES,
    S.DIM_CARGOS
  ]);

  const territorios = sheets[S.DIM_TERRITORIO] || [];
  const origen = sheets[S.DIM_ORIGEN] || [];
  const estados = sheets[S.DIM_ESTADOS] || [];
  const etapas = sheets[S.DIM_ETAPAS] || [];
  const instrumentos = sheets[S.DIM_INSTRUMENTOS] || [];
  const requisitos = sheets[S.DIM_REQUISITOS] || [];
  const usuarios = (sheets[S.DIM_USUARIOS] || []).filter(function(r) {
    return catalogToBool_(r.activo_flag);
  });
  const responsables = (sheets[S.DIM_RESPONSABLES] || []).filter(function(r) {
    return catalogToBool_(r.activo_flag);
  });
  const cargos = (sheets[S.DIM_CARGOS] || []).filter(function(r) {
    return catalogToBool_(r.activo_flag);
  });

  const orgSug = sheetExists_(S.DIM_ORG_SUG) ? getSheetData_(S.DIM_ORG_SUG) : [];
  const vecSug = sheetExists_(S.DIM_VEC_SUG) ? getSheetData_(S.DIM_VEC_SUG) : [];
  const solSug = sheetExists_(S.DIM_SOL_SUG) ? getSheetData_(S.DIM_SOL_SUG) : [];

  const uvList = catalogUniqueNonBlank_(territorios.map(function(r) { return r.uv; }));
  const sectorByUv = {};
  territorios.forEach(function(r) {
    const uv = String(r.uv || '').trim();
    const sector = String(r.sector || '').trim();
    if (!uv) return;
    if (!sectorByUv[uv]) sectorByUv[uv] = [];
    if (sector && sectorByUv[uv].indexOf(sector) === -1) {
      sectorByUv[uv].push(sector);
    }
  });

  const medioSolicitud = catalogUniqueNonBlank_(origen.map(function(r) { return r.medio_solicitud; }));
  const unidadOrigen = catalogUniqueNonBlank_(origen.map(function(r) { return r.unidad_origen; }));

  const estadosPorTipo = {};
  estados.forEach(function(r) {
    const tipo = r.tipo_estado;
    if (!estadosPorTipo[tipo]) estadosPorTipo[tipo] = [];
    estadosPorTipo[tipo].push(r.descripcion_estado);
  });

  const requisitosPorInstrumento = {};
  requisitos.forEach(function(r) {
    const inst = r.instrumento_codigo_catalogo;
    if (!requisitosPorInstrumento[inst]) requisitosPorInstrumento[inst] = [];
    requisitosPorInstrumento[inst].push({
      requisito_codigo: r.requisito_codigo,
      requisito_nombre: r.requisito_nombre,
      categoria_requisito: r.categoria_requisito
    });
  });

  const responsablesCatalog = catalogUniqueNonBlank_(
    usuarios.map(function(r) { return r.nombre_visible || r.email; })
      .concat(responsables.map(function(r) { return r.nombre_responsable; }))
  );

  return {
    uvList: uvList,
    sectorByUv: sectorByUv,
    tipoVivienda: ['Casa', 'Departamento', 'Condominio', 'Pasaje', 'Villa', 'Mixto', 'Otro'],
    medioSolicitud: medioSolicitud,
    unidadOrigen: unidadOrigen,
    tipoOrganizacion: ['Comité de seguridad', 'Junta de vecinos', 'Comité funcional', 'Organización comunitaria', 'Otra'],
    flujo: ['ingreso', 'constitucion', 'beneficio', 'fondo', 'derivacion', 'seguimiento_general'],
    hitos: [
      'visita_informativa',
      'carta_ingresada',
      'asamblea_constitucion',
      'documentos_secretaria',
      'certificado_provisorio',
      'asamblea_ratificacion',
      'organizacion_constituida',
      'observacion_general',
      'derivacion_realizada',
      'cierre_solicitud',
      'convenio_beneficio'
    ],
    estadosPorTipo: estadosPorTipo,
    etapasConstitucion: etapas,
    instrumentos: instrumentos,
    requisitosPorInstrumento: requisitosPorInstrumento,
    responsables: responsablesCatalog,
    usuariosActivos: usuarios,
    cargosSocios: cargos.map(function(r) { return r.cargo_nombre; }),
    organizacionesSugeridas: orgSug,
    vecinosSugeridos: vecSug,
    solicitudesSugeridas: solSug
  };
}

function buildCatalogosAppClientBundle_() {
  const c = getCatalogosApp();
  return {
    uvList: c.uvList || [],
    sectorByUv: c.sectorByUv || {},
    tipoVivienda: c.tipoVivienda || [],
    medioSolicitud: c.medioSolicitud || [],
    unidadOrigen: c.unidadOrigen || [],
    estadosPorTipo: c.estadosPorTipo || {},
    instrumentos: c.instrumentos || [],
    requisitosPorInstrumento: c.requisitosPorInstrumento || {},
    responsables: c.responsables || [],
    cargosSocios: c.cargosSocios || []
  };
}

function buildOrganizacionCatalogListBundle_() {
  const rows = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES)
    .filter(function(r) {
      return String(r.organizacion_id || '').trim() && String(r.nombre_organizacion || '').trim();
    })
    .sort(function(a, b) {
      return String(a.nombre_organizacion || '').localeCompare(String(b.nombre_organizacion || ''), 'es');
    });

  const organizacionesList = rows.map(function(r) {
    return {
      value: String(r.organizacion_id || '').trim(),
      label: String(r.nombre_organizacion || '').trim()
    };
  });

  return {
    organizacionesList: organizacionesList
  };
}

function buildOrganizacionClientSnapshot_(row) {
  const id = String(row && row.organizacion_id || '').trim();
  return {
    organizacion_id: id,
    solicitud_id: String(row && row.solicitud_id || '').trim(),
    tipo_organizacion: String(row && row.tipo_organizacion || '').trim(),
    nombre_organizacion: String(row && row.nombre_organizacion || '').trim(),
    uv: String(row && row.uv || '').trim(),
    sector: String(row && row.sector || '').trim(),
    direccion_referencia: String(row && row.direccion_referencia || '').trim(),
    fecha_inicio_acompanamiento: row && row.fecha_inicio_acompanamiento || '',
    cantidad_socios_declarada: row && row.cantidad_socios_declarada || '',
    estado_constitucion: String(row && row.estado_constitucion || '').trim(),
    fecha_asamblea_constitucion: row && row.fecha_asamblea_constitucion || '',
    fecha_ratificacion: row && row.fecha_ratificacion || '',
    vigencia_directiva_hasta: row && row.vigencia_directiva_hasta || '',
    personalidad_juridica_flag: String(row && row.personalidad_juridica_flag || '').trim(),
    certificado_provisorio_flag: String(row && row.certificado_provisorio_flag || '').trim(),
    certificado_definitivo_flag: String(row && row.certificado_definitivo_flag || '').trim(),
    directiva_vigente_flag: String(row && row.directiva_vigente_flag || '').trim(),
    organizacion_constituida_flag: String(row && row.organizacion_constituida_flag || '').trim(),
    estado_general_organizacion: String(row && row.estado_general_organizacion || '').trim(),
    responsable_actual: String(row && row.responsable_actual || '').trim(),
    observacion_resumen: String(row && row.observacion_resumen || '').trim()
  };
}

function getCatalogCacheJson_(key) {
  try {
    const cache = CacheService.getScriptCache();
    const raw = cache.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function putCatalogCacheJson_(key, value, ttlSeconds) {
  try {
    const payload = JSON.stringify(value);
    if (payload.length > 90000) return;
    CacheService.getScriptCache().put(key, payload, ttlSeconds || 300);
  } catch (err) {}
}

function invalidateCatalogClientCaches_() {
  try {
    CacheService.getScriptCache().removeAll([
      GO_PES_CATALOG_CACHE_KEYS.APP_CLIENT,
      GO_PES_CATALOG_CACHE_KEYS.INGRESO_CLIENT,
      GO_PES_CATALOG_CACHE_KEYS.ORGANIZACION_CLIENT,
      GO_PES_CATALOG_CACHE_KEYS.AVANCE_ORGS_CLIENT
    ]);
  } catch (err) {}
}

function seedDerivedTerritorio_() {
  const casos = sheetExists_(GO_PES_V2.SHEETS.MAE_CASOS) ? getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) : [];
  const orgs = sheetExists_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) ? getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) : [];

  const rows = []
    .concat(casos.map(function(r) {
      return [r.uv || '', r.sector || '', '', true];
    }))
    .concat(orgs.map(function(r) {
      return [r.uv || '', r.sector || '', '', true];
    }))
    .filter(function(r) {
      return String(r[0] || '').trim() || String(r[1] || '').trim();
    });

  if (!rows.length) return;

  mergeCatalogRows_(
    GO_PES_V2.SHEETS.DIM_TERRITORIO,
    ['uv', 'sector', 'macrosector', 'activo_flag'],
    rows,
    ['uv', 'sector']
  );
}

function seedDerivedResponsables_() {
  const usuarios = sheetExists_(GO_PES_V2.SHEETS.DIM_USUARIOS) ? getSheetData_(GO_PES_V2.SHEETS.DIM_USUARIOS) : [];
  const casos = sheetExists_(GO_PES_V2.SHEETS.MAE_CASOS) ? getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) : [];
  const orgs = sheetExists_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) ? getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) : [];

  const rows = [];

  usuarios.forEach(function(r) {
    const nombre = r.nombre_visible || r.email;
    if (!nombre) return;
    rows.push([
      r.user_id || nextIdIfMissing_('responsable', 'RSP', GO_PES_V2.SHEETS.DIM_RESPONSABLES, 'responsable_id', 'nombre_responsable', nombre),
      nombre,
      r.perfil || 'operador',
      catalogToBool_(r.activo_flag)
    ]);
  });

  casos.forEach(function(r) {
    if (!r.responsable_actual) return;
    rows.push([
      nextIdIfMissing_('responsable', 'RSP', GO_PES_V2.SHEETS.DIM_RESPONSABLES, 'responsable_id', 'nombre_responsable', r.responsable_actual),
      r.responsable_actual,
      'operador',
      true
    ]);
  });

  orgs.forEach(function(r) {
    if (!r.responsable_actual) return;
    rows.push([
      nextIdIfMissing_('responsable', 'RSP', GO_PES_V2.SHEETS.DIM_RESPONSABLES, 'responsable_id', 'nombre_responsable', r.responsable_actual),
      r.responsable_actual,
      'operador',
      true
    ]);
  });

  if (!rows.length) return;

  mergeCatalogRows_(
    GO_PES_V2.SHEETS.DIM_RESPONSABLES,
    ['responsable_id', 'nombre_responsable', 'perfil', 'activo_flag'],
    rows,
    ['nombre_responsable']
  );
}

function catalogCompositeKeyFromObject_(obj, keyFields) {
  return (keyFields || []).map(function(k) {
    return catalogNormalize_(obj[k]);
  }).join('||');
}

function catalogNormalize_(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function catalogSlugify_(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function catalogUniqueNonBlank_(arr) {
  const out = [];
  const seen = {};
  (arr || []).forEach(function(v) {
    const txt = String(v || '').trim();
    if (!txt) return;
    const key = catalogNormalize_(txt);
    if (seen[key]) return;
    seen[key] = true;
    out.push(txt);
  });
  return out;
}

function catalogToBool_(value) {
  if (value === true || value === 1 || value === '1') return true;
  const v = catalogNormalize_(value);
  return v === 'true' || v === 'si' || v === 'sí' || v === 'x';
}
