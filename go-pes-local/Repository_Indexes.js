/**
 * Repository_Indexes.js
 * Índices in-memory para optimización de queries
 *
 * PROPÓSITO: Reducir 60-80% el tiempo de respuesta construyendo hash maps
 * que se reusan durante toda la ejecución de Apps Script.
 *
 * ESTRATEGIA:
 * - Construir índices LAZY (solo cuando se necesitan)
 * - Cachear en GO_PES_INDEXES (scope global de ejecución)
 * - Invalidar junto con GO_PES_RUNTIME cuando hay writes
 *
 * CREADO: 2026-07-10
 * IMPACTO: Todos los módulos (Dashboard, Organizaciones, Avance, Búsqueda, Ficha, Socios, Beneficios)
 */

// ══════════════════════════════════════════════════════════════════════════
// STORAGE DE ÍNDICES
// ══════════════════════════════════════════════════════════════════════════

var GO_PES_INDEXES = this.GO_PES_INDEXES || {
  // Índices de organizaciones
  orgsByUv: null,                    // { "UV1": [org1, org2], "UV2": [...] }
  orgsByEstado: null,                // { "constituida": [...], "en_proceso": [...] }
  orgsByTipo: null,                  // { "junta_vecinos": [...], "club_deportivo": [...] }
  orgById: null,                     // { "ORG-001": org, "ORG-002": org, ... }

  // Índices de casos
  casosByUv: null,                   // { "UV1": [caso1, caso2], ... }
  casosByAnio: null,                 // { 2024: [...], 2025: [...], 2026: [...] }
  casosByNombreNorm: null,           // { "juan": [caso1, caso2], "pedro": [...] }

  // Índices de hitos de avance
  hitosByOrgId: null,                // { "ORG-001": [hito1, hito2], ... }
  hitosBySolicitudId: null,          // { "SOL-001": [hito1, hito2], ... }

  // Índices de socios
  sociosByOrgId: null,               // { "ORG-001": [socio1, socio2], ... }

  // Índices de estados de avance
  estadosByOrgId: null,              // { "ORG-001": [estado1, estado2], ... }
  estadosBySolicitudId: null,        // { "SOL-001": [estado1], ... }

  // Índices de beneficios
  beneficiosByOrgId: null,           // { "ORG-001": [ben1, ben2], ... }
  hitosBeneficiosByOrgBenId: null,   // { "ORGBEN-001": [hito1, hito2], ... }

  // Índices de catálogos (pequeños, construir siempre)
  catalogoHitosByCodigo: null,       // { "PRE_01": {...}, "PRE_02": {...}, ... }

  // Índice de instrumentos
  instrumentosByOrgId: null          // { "ORG-001": [inst1, inst2], ... }
};

// ══════════════════════════════════════════════════════════════════════════
// INVALIDACIÓN
// ══════════════════════════════════════════════════════════════════════════

/**
 * Invalidar TODOS los índices
 * LLAMAR después de cualquier write a hojas
 */
function invalidateAllIndexes_() {
  GO_PES_INDEXES.orgsByUv = null;
  GO_PES_INDEXES.orgsByEstado = null;
  GO_PES_INDEXES.orgsByTipo = null;
  GO_PES_INDEXES.orgById = null;
  GO_PES_INDEXES.casosByUv = null;
  GO_PES_INDEXES.casosByAnio = null;
  GO_PES_INDEXES.casosByNombreNorm = null;
  GO_PES_INDEXES.hitosByOrgId = null;
  GO_PES_INDEXES.hitosBySolicitudId = null;
  GO_PES_INDEXES.sociosByOrgId = null;
  GO_PES_INDEXES.estadosByOrgId = null;
  GO_PES_INDEXES.estadosBySolicitudId = null;
  GO_PES_INDEXES.beneficiosByOrgId = null;
  GO_PES_INDEXES.hitosBeneficiosByOrgBenId = null;
  GO_PES_INDEXES.catalogoHitosByCodigo = null;
  GO_PES_INDEXES.instrumentosByOrgId = null;
}

// ══════════════════════════════════════════════════════════════════════════
// ÍNDICES DE ORGANIZACIONES
// ══════════════════════════════════════════════════════════════════════════

/**
 * Índice: Organizaciones por UV
 * USADO EN: Dashboard (filtro UV), Búsqueda, Reportes
 */
function buildOrgsByUvIndex_() {
  if (GO_PES_INDEXES.orgsByUv) return GO_PES_INDEXES.orgsByUv;

  const orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  const index = {};

  orgs.forEach(function(org) {
    const uv = normalizeText_(String(org.uv || ''));
    if (!uv) return;
    if (!index[uv]) index[uv] = [];
    index[uv].push(org);
  });

  GO_PES_INDEXES.orgsByUv = index;
  return index;
}

/**
 * Índice: Organizaciones por estado de constitución
 * USADO EN: Dashboard (filtro estado)
 */
function buildOrgsByEstadoIndex_() {
  if (GO_PES_INDEXES.orgsByEstado) return GO_PES_INDEXES.orgsByEstado;

  const orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  const index = {};

  orgs.forEach(function(org) {
    const estado = normalizeText_(String(org.estado_constitucion || ''));
    if (!estado) return;
    if (!index[estado]) index[estado] = [];
    index[estado].push(org);
  });

  GO_PES_INDEXES.orgsByEstado = index;
  return index;
}

/**
 * Índice: Organizaciones por tipo
 * USADO EN: Dashboard (filtro tipo)
 */
function buildOrgsByTipoIndex_() {
  if (GO_PES_INDEXES.orgsByTipo) return GO_PES_INDEXES.orgsByTipo;

  const orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  const index = {};

  orgs.forEach(function(org) {
    const tipo = normalizeText_(String(org.tipo_organizacion || ''));
    if (!tipo) return;
    if (!index[tipo]) index[tipo] = [];
    index[tipo].push(org);
  });

  GO_PES_INDEXES.orgsByTipo = index;
  return index;
}

/**
 * Índice: Organizaciones por ID (lookup rápido)
 * USADO EN: Socios, Beneficios, Avance (lookup nombre org)
 */
function buildOrgByIdIndex_() {
  if (GO_PES_INDEXES.orgById) return GO_PES_INDEXES.orgById;

  const orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  const index = {};

  orgs.forEach(function(org) {
    const id = String(org.organizacion_id || '').trim();
    if (!id) return;
    index[id] = org;
  });

  GO_PES_INDEXES.orgById = index;
  return index;
}

/**
 * Obtener organizaciones filtradas (USA ÍNDICES)
 * ESTRATEGIA: Empezar por el filtro más selectivo, luego aplicar resto
 */
function getOrgsFiltered_(filters) {
  filters = filters || {};
  const { uv, estado_constitucion, tipo_organizacion } = filters;

  let result = null;

  // Estrategia: empezar por el filtro más selectivo
  if (uv) {
    const index = buildOrgsByUvIndex_();
    const uvNorm = normalizeText_(String(uv));
    result = (index[uvNorm] || []).slice(); // Clone array
  } else if (estado_constitucion) {
    const index = buildOrgsByEstadoIndex_();
    const estadoNorm = normalizeText_(String(estado_constitucion));
    result = (index[estadoNorm] || []).slice();
  } else if (tipo_organizacion) {
    const index = buildOrgsByTipoIndex_();
    const tipoNorm = normalizeText_(String(tipo_organizacion));
    result = (index[tipoNorm] || []).slice();
  } else {
    // Sin filtros, retornar todas
    result = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
    return result.slice(); // Clone
  }

  // Aplicar filtros restantes sobre conjunto reducido
  if (estado_constitucion && !uv) {
    const estadoNorm = normalizeText_(String(estado_constitucion));
    result = result.filter(function(r) {
      return normalizeText_(String(r.estado_constitucion || '')) === estadoNorm;
    });
  }

  if (tipo_organizacion && !uv && !estado_constitucion) {
    const tipoNorm = normalizeText_(String(tipo_organizacion));
    result = result.filter(function(r) {
      return normalizeText_(String(r.tipo_organizacion || '')) === tipoNorm;
    });
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════
// ÍNDICES DE CASOS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Índice: Casos por UV
 * USADO EN: Dashboard (filtro UV)
 */
function buildCasosByUvIndex_() {
  if (GO_PES_INDEXES.casosByUv) return GO_PES_INDEXES.casosByUv;

  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  const index = {};

  casos.forEach(function(caso) {
    const uv = normalizeText_(String(caso.uv || ''));
    if (!uv) return;
    if (!index[uv]) index[uv] = [];
    index[uv].push(caso);
  });

  GO_PES_INDEXES.casosByUv = index;
  return index;
}

/**
 * Índice: Casos por año de ingreso
 * USADO EN: Dashboard (tendencias mensuales), Reportes
 */
function buildCasosByAnioIndex_() {
  if (GO_PES_INDEXES.casosByAnio) return GO_PES_INDEXES.casosByAnio;

  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  const index = {};

  casos.forEach(function(caso) {
    const fecha = caso.fecha_ingreso ? new Date(caso.fecha_ingreso) : null;
    if (!fecha || isNaN(fecha)) return;
    const anio = fecha.getFullYear();
    if (!index[anio]) index[anio] = [];
    index[anio].push(caso);
  });

  GO_PES_INDEXES.casosByAnio = index;
  return index;
}

/**
 * Índice: Casos por nombre normalizado (para búsqueda)
 * USADO EN: Búsqueda por nombre
 */
function buildCasosByNombreIndex_() {
  if (GO_PES_INDEXES.casosByNombreNorm) return GO_PES_INDEXES.casosByNombreNorm;

  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  const index = {};

  casos.forEach(function(caso) {
    const nombreCompleto = normalizeText_(String(caso.nombre_completo || caso.nombre_vecino || ''));
    if (!nombreCompleto) return;

    // Indexar por palabras (permite búsqueda parcial)
    const palabras = nombreCompleto.split(' ');
    palabras.forEach(function(palabra) {
      if (palabra.length < 2) return; // Ignorar palabras muy cortas
      if (!index[palabra]) index[palabra] = [];
      // Evitar duplicados del mismo caso
      if (index[palabra].indexOf(caso) === -1) {
        index[palabra].push(caso);
      }
    });
  });

  GO_PES_INDEXES.casosByNombreNorm = index;
  return index;
}

// ══════════════════════════════════════════════════════════════════════════
// ÍNDICES DE HITOS DE AVANCE
// ══════════════════════════════════════════════════════════════════════════

/**
 * Índice: Hitos de avance por organización
 * USADO EN: Organizaciones, Avance, Dashboard (gauges), Beneficios (elegibilidad)
 * CRÍTICO: Este es el índice más usado de todos
 */
function buildHitosByOrgIdIndex_() {
  if (GO_PES_INDEXES.hitosByOrgId) return GO_PES_INDEXES.hitosByOrgId;

  const hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [];
  const index = {};

  hitos.forEach(function(hito) {
    const orgId = String(hito.organizacion_id || '').trim();
    if (!orgId) return;
    if (!index[orgId]) index[orgId] = [];
    index[orgId].push(hito);
  });

  GO_PES_INDEXES.hitosByOrgId = index;
  return index;
}

/**
 * Índice: Hitos de avance por solicitud (grupos de vecinos)
 * USADO EN: Organizaciones (grupos), Ficha, Avance (grupos)
 */
function buildHitosBySolicitudIdIndex_() {
  if (GO_PES_INDEXES.hitosBySolicitudId) return GO_PES_INDEXES.hitosBySolicitudId;

  const hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [];
  const index = {};

  hitos.forEach(function(hito) {
    const solId = String(hito.solicitud_id || '').trim();
    if (!solId) return;
    if (!index[solId]) index[solId] = [];
    index[solId].push(hito);
  });

  GO_PES_INDEXES.hitosBySolicitudId = index;
  return index;
}

// ══════════════════════════════════════════════════════════════════════════
// ÍNDICES DE SOCIOS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Índice: Socios por organización
 * USADO EN: Organizaciones (contar socios), Socios (listar socios)
 */
function buildSociosByOrgIdIndex_() {
  if (GO_PES_INDEXES.sociosByOrgId) return GO_PES_INDEXES.sociosByOrgId;

  const socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];
  const index = {};

  socios.forEach(function(socio) {
    const orgId = String(socio.organizacion_id || '').trim();
    if (!orgId) return;
    if (!index[orgId]) index[orgId] = [];
    index[orgId].push(socio);
  });

  GO_PES_INDEXES.sociosByOrgId = index;
  return index;
}

// ══════════════════════════════════════════════════════════════════════════
// ÍNDICES DE ESTADOS DE AVANCE
// ══════════════════════════════════════════════════════════════════════════

/**
 * Índice: Estados de avance por organización
 * USADO EN: Avance (estado actual)
 */
function buildEstadosByOrgIdIndex_() {
  if (GO_PES_INDEXES.estadosByOrgId) return GO_PES_INDEXES.estadosByOrgId;

  const estados = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO) || [];
  const index = {};

  estados.forEach(function(estado) {
    const orgId = String(estado.organizacion_id || '').trim();
    if (!orgId) return;
    if (!index[orgId]) index[orgId] = [];
    index[orgId].push(estado);
  });

  GO_PES_INDEXES.estadosByOrgId = index;
  return index;
}

/**
 * Índice: Estados de avance por solicitud (grupos)
 * USADO EN: Avance (grupos de vecinos)
 */
function buildEstadosBySolicitudIdIndex_() {
  if (GO_PES_INDEXES.estadosBySolicitudId) return GO_PES_INDEXES.estadosBySolicitudId;

  const estados = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO) || [];
  const index = {};

  estados.forEach(function(estado) {
    const solId = String(estado.solicitud_id || '').trim();
    if (!solId) return;
    if (!index[solId]) index[solId] = [];
    index[solId].push(estado);
  });

  GO_PES_INDEXES.estadosBySolicitudId = index;
  return index;
}

// ══════════════════════════════════════════════════════════════════════════
// ÍNDICES DE BENEFICIOS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Índice: Beneficios por organización
 * USADO EN: Beneficios (listar beneficios de una org)
 */
function buildBeneficiosByOrgIdIndex_() {
  if (GO_PES_INDEXES.beneficiosByOrgId) return GO_PES_INDEXES.beneficiosByOrgId;

  const beneficios = getSheetData_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG) || [];
  const index = {};

  beneficios.forEach(function(ben) {
    const orgId = String(ben.organizacion_id || '').trim();
    if (!orgId) return;
    if (!index[orgId]) index[orgId] = [];
    index[orgId].push(ben);
  });

  GO_PES_INDEXES.beneficiosByOrgId = index;
  return index;
}

/**
 * Índice: Instrumentos por organización
 * USADO EN: Dashboard (beneficios vigentes), Beneficios
 */
function buildInstrumentosByOrgIdIndex_() {
  if (GO_PES_INDEXES.instrumentosByOrgId) return GO_PES_INDEXES.instrumentosByOrgId;

  const instrumentos = getSheetData_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS) || [];
  const index = {};

  instrumentos.forEach(function(inst) {
    const orgId = String(inst.organizacion_id || '').trim();
    if (!orgId) return;
    if (!index[orgId]) index[orgId] = [];
    index[orgId].push(inst);
  });

  GO_PES_INDEXES.instrumentosByOrgId = index;
  return index;
}

// ══════════════════════════════════════════════════════════════════════════
// ÍNDICES DE CATÁLOGOS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Índice: Catálogo de hitos por código
 * USADO EN: Avance (join timeline con catálogo)
 */
function buildCatalogoHitosByCodigoIndex_() {
  if (GO_PES_INDEXES.catalogoHitosByCodigo) return GO_PES_INDEXES.catalogoHitosByCodigo;

  const catalogo = getSheetData_(GO_PES_V2.SHEETS.CAT_HITOS_AVANCE) || [];
  const index = {};

  catalogo.forEach(function(hito) {
    const codigo = String(hito.codigo_hito || '').trim();
    if (!codigo) return;
    index[codigo] = hito;
  });

  GO_PES_INDEXES.catalogoHitosByCodigo = index;
  return index;
}

// ══════════════════════════════════════════════════════════════════════════
// HELPERS DE ALTO NIVEL
// ══════════════════════════════════════════════════════════════════════════

/**
 * Obtener casos filtrados (usa índices cuando aplica)
 */
function getCasosFiltered_(filters) {
  filters = filters || {};
  const { uv, year } = filters;

  let result = null;

  if (uv) {
    const index = buildCasosByUvIndex_();
    const uvNorm = normalizeText_(String(uv));
    result = (index[uvNorm] || []).slice();
  } else if (year) {
    const index = buildCasosByAnioIndex_();
    result = (index[Number(year)] || []).slice();
  } else {
    result = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
    return result.slice();
  }

  // Aplicar filtro de año si UV ya filtró
  if (year && uv) {
    const yearNum = Number(year);
    result = result.filter(function(r) {
      const fecha = r.fecha_ingreso ? new Date(r.fecha_ingreso) : null;
      return fecha && !isNaN(fecha) && fecha.getFullYear() === yearNum;
    });
  }

  return result;
}

/**
 * Logger de performance de índices (para debugging)
 */
function logIndexPerformance_(indexName, startTime) {
  const elapsed = Date.now() - startTime;
  Logger.log('[INDEX] ' + indexName + ' construido en ' + elapsed + 'ms');
}
