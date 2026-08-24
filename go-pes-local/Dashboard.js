/**
 * Dashboard.js
 * Backend del Dashboard Operativo GO-PES
 *
 * Creado: 2026-06-09
 * Reemplaza gradualmente getDashboardKpis() de Services.js
 */

// ══════════════════════════════════════════════════════════════════════════
// FUNCIÓN DE DIAGNÓSTICO (ejecutar desde editor de Apps Script)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Diagnóstico del dashboard - ejecutar desde el editor para verificar
 */
function goPesDiagnosticoDashboard() {
  requireRole_(['superuser']);
  try {
    Logger.log('=== DIAGNÓSTICO DASHBOARD ===');
    Logger.log('1. Verificando acceso a GO_PES_V2.DASHBOARD...');
    Logger.log(JSON.stringify(GO_PES_V2.DASHBOARD, null, 2));

    Logger.log('2. Ejecutando getDashboardData({})...');
    var resultado = getDashboardData({});

    Logger.log('3. Estructura retornada:');
    Logger.log('   - kpis: ' + (resultado.kpis ? 'OK' : 'FALTA'));
    Logger.log('   - charts: ' + (resultado.charts ? 'OK' : 'FALTA'));
    Logger.log('   - tables: ' + (resultado.tables ? 'OK' : 'FALTA'));
    Logger.log('   - filters: ' + (resultado.filters ? 'OK' : 'FALTA'));

    Logger.log('4. KPIs:');
    Logger.log(JSON.stringify(resultado.kpis, null, 2));

    Logger.log('5. Avance por hito (debe tener 8 elementos):');
    Logger.log('   Total hitos: ' + (resultado.charts.avancePorHito || []).length);
    (resultado.charts.avancePorHito || []).forEach(function(h, i) {
      Logger.log('   ' + (i+1) + '. ' + h.hito + ' - ' + h.completados + '/' + h.total + ' (' + h.pct + '%)');
    });

    Logger.log('6. Estado de formalización:');
    Logger.log(JSON.stringify(resultado.charts.estadoBeneficios, null, 2));

    Logger.log('=== DIAGNÓSTICO COMPLETO ===');
    return { ok: true, message: 'Dashboard funciona correctamente', data: resultado };
  } catch (e) {
    Logger.log('ERROR: ' + e.toString());
    Logger.log('Stack: ' + e.stack);
    return { ok: false, error: e.toString(), stack: e.stack };
  }
}

// ══════════════════════════════════════════════════════════════════════════
// API PÚBLICA
// ══════════════════════════════════════════════════════════════════════════

/**
 * Retorna todos los datos del dashboard en una sola llamada
 * @param {Object} filtros - { uv, estado, year }
 * @returns {Object} Objeto completo con KPIs, gráficos, tablas y meta
 */
function getDashboardData(filtros) {
  requireModuleAccess_('inicio', ['visor', 'operador', 'coordinador', 'superuser']);

  // Normalizar filtros
  var params = filtros || {};
  var filterUv = normalizeText_(String(params.uv || ''));
  var filterEstado = normalizeText_(String(params.estado || ''));
  var filterYear = Number(params.year || 0);

  // Generar clave de cache
  var cacheKey = 'dashboard_data_' + JSON.stringify({ uv: filterUv, estado: filterEstado, year: filterYear });
  var isDefaultQuery = !filterUv && !filterEstado && !filterYear;

  // Cache runtime (solo vive dentro de la misma ejecución GAS)
  var cached = GO_PES_RUNTIME[cacheKey];
  if (cached && cached.timestamp && (Date.now() - cached.timestamp) < GO_PES_V2.DASHBOARD.CACHE_TTL_MS) {
    return serializeForClient_(cached.data);
  }

  // Cache persistente entre ejecuciones (CacheService) para la consulta sin
  // filtros — la del arranque y la entrada a Inicio. Las variables globales
  // de GAS se reinician en cada google.script.run, por lo que sin esto cada
  // apertura de Inicio recalcula todas las hojas.
  if (isDefaultQuery) {
    var scriptCached = getCatalogCacheJson_(GO_PES_DASHBOARD_CACHE_KEY);
    if (scriptCached) return scriptCached;
  }

  // Calcular datos
  var kpis = calcularKpis_({ uv: filterUv, estado: filterEstado, year: filterYear });
  var estadoFormalizacion = calcularEstadoFormalizacion_({ uv: filterUv, estado: filterEstado });
  var avancePorHito = calcularAvancePorHito_({ uv: filterUv, estado: filterEstado });
  var comitesPorUV = calcularComitesPorUV_({ uv: filterUv, estado: filterEstado });
  var estadoComites = calcularEstadoComites_({ uv: filterUv, estado: filterEstado });
  var tendenciaMensual = calcularTendencia_({ uv: filterUv, estado: filterEstado, year: filterYear });
  var filtrosDisponibles = getFiltrosDisponibles_();
  var tz = Session.getScriptTimeZone();

  // KPIs ampliados (rediseño Alt A): casos, estados de avance, beneficios y capacitaciones.
  // Los agregados de beneficios/capacitaciones son globales (no aplican los filtros UV/estado/año)
  // y viajan en el mismo payload cacheado, por lo que se calculan una vez por TTL.
  // Cada agregador va protegido: un fallo de un dominio no debe romper el dashboard de inicio.
  var casosResumen         = dashboardSafeAgg_(function(){ return calcularCasosResumen_({ uv: filterUv, year: filterYear }); }, { total: 0, grupos: 0, porUv: [] });
  var estadosAvance        = dashboardSafeAgg_(calcularEstadosAvance_, { 'Activo': 0, 'Stand by': 0, 'Detenido': 0, 'Finalizado': 0 });
  var fondeseResumen       = dashboardSafeAgg_(calcularFondeseResumen_, { total: 0, embudo: [], adjudicadas: 0, montoAdjudicado: 0, montoEjecutado: 0, rendicionesPendientes: 0 });
  var camarasResumen       = dashboardSafeAgg_(calcularCamarasResumen_, { elegible: 0, solicitado: 0, instalado: 0, fueraPlazo: 0, camarasInstaladas: 0 });
  var capacitacionesResumen = dashboardSafeAgg_(calcularCapacitacionesResumen_, { eventos: 0, inscripciones: 0, personasUnicas: 0, ocupacionPct: 0, porTipo: [] });

  // Adaptar estructura para compatibilidad con frontend existente
  var data = {
    kpis: {
      totalSolicitudes: 0, // Deprecated - mantener para compatibilidad
      totalOrgs: kpis.enGestion.valor + kpis.comites.valor,
      orgsConstituidas: kpis.comites.valor,
      pctConstituidas: (kpis.enGestion.valor + kpis.comites.valor) > 0
        ? Math.round((kpis.comites.valor / (kpis.enGestion.valor + kpis.comites.valor)) * 100)
        : 0,
      instActivos: estadoFormalizacion.vigentes.conteo + estadoFormalizacion.porVencer.conteo,
      totalSocios: kpis.sociosVinculados.valor,
      trendSolicitudes: null,
      trendOrgs: kpis.enGestion.variacion
    },
    charts: {
      estadosConstitucion: estadoComites.map(function(e) {
        return { label: e.estado, count: e.conteo };
      }),
      porUv: comitesPorUV.map(function(u) {
        return { label: u.nombre, count: u.conteo };
      }),
      casosEstado: [],
      ingresosPorMes: [],
      instrumentosPorTipo: [],
      tendenciaMensual: tendenciaMensual,
      avancePorHito: avancePorHito.map(function(h) {
        return { hito: h.nombreCorto, completados: h.completados, total: h.total, pct: h.porcentaje };
      }),
      estadoBeneficios: {
        vigentes: estadoFormalizacion.vigentes.conteo,
        porVencer: estadoFormalizacion.porVencer.conteo,
        atrasados: estadoFormalizacion.vencidos.conteo
      }
    },
    tables: {
      proximosVencimientos: [],
      atencionPrioritaria: [],
      ultimasGestiones: []
    },
    // ── Campos del rediseño Alt A (agregados, sin PII) ──
    heroKpis: {
      comites: kpis.comites.valor,
      enGestion: kpis.enGestion.valor,
      proximasAsambleas: kpis.proximasAsambleas.valor,
      totalCasos: casosResumen.total,
      grupos: casosResumen.grupos,
      fondeseAdjudicadas: fondeseResumen.adjudicadas,
      fondeseMontoAdjudicado: fondeseResumen.montoAdjudicado,
      fondeseMontoEjecutado: fondeseResumen.montoEjecutado
    },
    formalizacion: {
      vigentes: estadoFormalizacion.vigentes.conteo,
      porVencer: estadoFormalizacion.porVencer.conteo,
      atrasados: estadoFormalizacion.vencidos.conteo
    },
    casosResumen: casosResumen,
    estadosAvance: estadosAvance,
    fondese: fondeseResumen,
    camaras: camarasResumen,
    capacitaciones: capacitacionesResumen,
    filters: {
      uvs: filtrosDisponibles.uvs.map(function(u) { return u.nombre.replace('UV ', ''); }),
      tipos: [],
      years: filtrosDisponibles.years,
      activeFilters: {
        uv: params.uv || '',
        year: params.year || '',
        estado_constitucion: params.estado || '',
        tipo_organizacion: ''
      }
    },
    lastUpdated: Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm')
  };

  // Guardar en cache
  GO_PES_RUNTIME[cacheKey] = {
    data: data,
    timestamp: Date.now()
  };

  var payload = serializeForClient_(data);
  if (isDefaultQuery) {
    putCatalogCacheJson_(GO_PES_DASHBOARD_CACHE_KEY, payload, Math.floor(GO_PES_V2.DASHBOARD.CACHE_TTL_MS / 1000));
  }
  return payload;
}

var GO_PES_DASHBOARD_CACHE_KEY = 'go_pes_dashboard_client_default';

/**
 * Invalida el cache del dashboard (llamar después de modificar datos)
 */
function invalidateDashboardCache_() {
  var keys = Object.keys(GO_PES_RUNTIME);
  keys.forEach(function(k) {
    if (k.indexOf('dashboard_data_') === 0) {
      delete GO_PES_RUNTIME[k];
    }
  });
  try {
    CacheService.getScriptCache().remove(GO_PES_DASHBOARD_CACHE_KEY);
  } catch (err) {}
}

/**
 * Bootstrap del módulo Inicio en una sola ejecución GAS:
 * dashboard + panel de inicio + alertas del usuario.
 * Reemplaza 3 llamadas google.script.run (con su auth y lecturas
 * repetidas) por 1 sola en el arranque de la app.
 */
function getInicioBootstrapData() {
  requireModuleAccess_('inicio', ['visor', 'operador', 'coordinador', 'superuser']);
  return {
    dashboard: getDashboardData({}),
    panel: getInicioPanelData(),
    alertas: getAlertasUsuario()
  };
}

// ══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE KPIs
// ══════════════════════════════════════════════════════════════════════════

function calcularKpis_(filtros) {
  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  var casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  var avanceHitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [];
  var socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];

  // Aplicar filtros a organizaciones
  var filteredOrgs = filtrarOrganizaciones_(orgs, filtros);
  var filteredCasos = filtrarCasos_(casos, filtros);

  // Set de organizaciones filtradas
  var orgIdSet = {};
  filteredOrgs.forEach(function(r) { if (r.organizacion_id) orgIdSet[r.organizacion_id] = true; });

  // Filtrar hitos y socios por organizaciones
  var filteredHitos = avanceHitos.filter(function(h) { return orgIdSet[h.organizacion_id]; });
  var filteredSocios = socios.filter(function(s) { return orgIdSet[s.organizacion_id]; });

  // KPI 1: Comités (hito 11 = FOR_04 completado)
  var orgsPorHito = agruparOrgsPorHito_(filteredHitos);
  var comites = Object.keys(orgsPorHito['FOR_04'] || {}).length;

  // KPI 2: En gestión (orgs activas sin hito 11)
  var enGestion = filteredOrgs.filter(function(r) {
    var orgId = String(r.organizacion_id || '').trim();
    return orgId && !(orgsPorHito['FOR_04'] || {})[orgId];
  }).length;

  // KPI 3: Alertas activas (desde sistema de alertas)
  var alertasActivas = 0;
  try {
    if (typeof getAlertasUsuario === 'function') {
      var alertasData = getAlertasUsuario();
      if (alertasData && alertasData.ok && Array.isArray(alertasData.alertas)) {
        alertasActivas = alertasData.alertas.reduce(function(sum, a) {
          return sum + (Number(a.conteo) || 0);
        }, 0);
      }
    }
  } catch (e) {
    Logger.log('[Dashboard] Error obteniendo alertas: ' + e);
  }

  // KPI 4: Próximas asambleas (hito 3 = PRE_03 completado, sin hito 4 = PRE_04)
  var proximasAsambleas = filteredOrgs.filter(function(r) {
    var orgId = String(r.organizacion_id || '').trim();
    var tienePre03 = !!(orgsPorHito['PRE_03'] || {})[orgId];
    var tienePre04 = !!(orgsPorHito['PRE_04'] || {})[orgId];
    return tienePre03 && !tienePre04;
  }).length;

  // KPI 5: Socios vinculados (activos)
  var sociosVinculados = filteredSocios.filter(function(s) {
    return normalizeText_(s.status_carga || '') !== 'inactivo';
  }).length;

  // Calcular variaciones vs mes anterior
  var now = new Date();
  var mesActual = now.getMonth();
  var anioActual = now.getFullYear();
  var mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
  var anioAnterior = mesActual === 0 ? anioActual - 1 : anioActual;

  // Filtrar datos del mes actual y anterior
  var orgsMesActual = contarPorMes_(filteredOrgs, 'updated_at', mesActual, anioActual);
  var orgsMesAnterior = contarPorMes_(filteredOrgs, 'updated_at', mesAnterior, anioAnterior);
  var casosMesActual = contarPorMes_(filteredCasos, 'fecha_ingreso', mesActual, anioActual);
  var casosMesAnterior = contarPorMes_(filteredCasos, 'fecha_ingreso', mesAnterior, anioAnterior);

  return {
    comites: {
      valor: comites,
      variacion: calcularVariacion_(comites, orgsMesAnterior)
    },
    enGestion: {
      valor: enGestion,
      variacion: calcularVariacion_(enGestion, orgsMesAnterior)
    },
    alertasActivas: {
      valor: alertasActivas,
      variacion: null // Las alertas no tienen histórico mensual
    },
    proximasAsambleas: {
      valor: proximasAsambleas,
      variacion: null
    },
    sociosVinculados: {
      valor: sociosVinculados,
      variacion: null
    }
  };
}

function calcularVariacion_(actual, anterior) {
  if (anterior === 0) {
    return actual > 0 ? 100 : 0;
  }
  var diff = actual - anterior;
  var pct = Math.round((diff / anterior) * 100);
  return pct;
}

function contarPorMes_(rows, campoFecha, mes, anio) {
  return rows.filter(function(r) {
    var fecha = r[campoFecha] ? new Date(r[campoFecha]) : null;
    return fecha && !isNaN(fecha) && fecha.getMonth() === mes && fecha.getFullYear() === anio;
  }).length;
}

// ══════════════════════════════════════════════════════════════════════════
// ESTADO DE FORMALIZACIÓN (reutiliza lógica de Alertas.js)
// ══════════════════════════════════════════════════════════════════════════

function calcularEstadoFormalizacion_(filtros) {
  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  var filteredOrgs = filtrarOrganizaciones_(orgs, filtros);

  // Obtener configuración de umbrales de alertas
  var config = typeof getAlertasConfig_ === 'function' ? getAlertasConfig_() : { umbrales: {} };
  var umbrales = config.umbrales || {};

  // Evaluar alertas de formalización
  var alertas = [];
  try {
    if (typeof evaluarAlertasFormalizacion_ === 'function') {
      alertas = evaluarAlertasFormalizacion_(umbrales);
    }
  } catch (e) {
    Logger.log('[Dashboard] Error evaluando alertas: ' + e);
  }

  // Crear set de organizaciones con alertas
  var orgsConAlerta = {};
  alertas.forEach(function(a) {
    if (Array.isArray(a.casos)) {
      a.casos.forEach(function(c) {
        var orgId = String(c.organizacion_id || c.id || '').trim();
        if (orgId) orgsConAlerta[orgId] = a.tipo; // 'danger' o 'warning'
      });
    }
  });

  // Clasificar organizaciones
  var vigentes = 0;
  var porVencer = 0;
  var vencidos = 0;

  filteredOrgs.forEach(function(r) {
    var orgId = String(r.organizacion_id || '').trim();
    if (!orgId) return;

    var tipoAlerta = orgsConAlerta[orgId];
    if (!tipoAlerta) {
      vigentes++;
    } else if (tipoAlerta === 'danger') {
      vencidos++;
    } else if (tipoAlerta === 'warning') {
      porVencer++;
    } else {
      vigentes++;
    }
  });

  var total = filteredOrgs.length;

  return {
    vigentes: {
      conteo: vigentes,
      porcentaje: total > 0 ? Math.round((vigentes / total) * 100) : 0
    },
    porVencer: {
      conteo: porVencer,
      porcentaje: total > 0 ? Math.round((porVencer / total) * 100) : 0
    },
    vencidos: {
      conteo: vencidos,
      porcentaje: total > 0 ? Math.round((vencidos / total) * 100) : 0
    }
  };
}

// ══════════════════════════════════════════════════════════════════════════
// AVANCE POR HITO (8 hitos específicos)
// ══════════════════════════════════════════════════════════════════════════

function calcularAvancePorHito_(filtros) {
  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  var avanceHitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [];
  var catHitos = getSheetData_(GO_PES_V2.SHEETS.CAT_HITOS_AVANCE) || [];

  var filteredOrgs = filtrarOrganizaciones_(orgs, filtros);
  var totalOrgs = filteredOrgs.length;

  // Set de organizaciones filtradas
  var orgIdSet = {};
  filteredOrgs.forEach(function(r) { if (r.organizacion_id) orgIdSet[r.organizacion_id] = true; });

  // Filtrar hitos por organizaciones
  var filteredHitos = avanceHitos.filter(function(h) { return orgIdSet[h.organizacion_id]; });

  // Agrupar hitos por código
  var orgsPorHito = agruparOrgsPorHito_(filteredHitos);

  // Mapeo de orden_hito a código_hito
  var catMap = {};
  catHitos.forEach(function(h) {
    catMap[Number(h.orden_hito)] = {
      codigo: String(h.codigo_hito || '').trim(),
      nombre: String(h.nombre_hito || '').trim()
    };
  });

  // Los 8 hitos solicitados (por orden_hito)
  var hitosRequeridos = GO_PES_V2.DASHBOARD.HITOS_VISIBLES; // [2, 4, 7, 11, 12, 13, 14, 15]

  return hitosRequeridos.map(function(orden) {
    var hitoInfo = catMap[orden] || { codigo: 'H' + orden, nombre: 'Hito ' + orden };
    var codigo = hitoInfo.codigo;
    var nombre = hitoInfo.nombre;

    // Abreviar nombre si es muy largo (> 30 caracteres)
    var nombreCorto = nombre.length > 30 ? nombre.substring(0, 27) + '...' : nombre;

    var completados = Object.keys(orgsPorHito[codigo] || {}).length;
    var porcentaje = totalOrgs > 0 ? Math.round((completados / totalOrgs) * 100) : 0;

    return {
      hitoId: codigo,
      orden: orden,
      nombre: nombre,
      nombreCorto: nombreCorto,
      completados: completados,
      total: totalOrgs,
      porcentaje: porcentaje
    };
  });
}

function agruparOrgsPorHito_(hitos) {
  var map = {};
  hitos.forEach(function(h) {
    var codigo = String(h.codigo_hito || '').trim();
    var orgId = String(h.organizacion_id || '').trim();
    if (!codigo || !orgId) return;

    if (!map[codigo]) map[codigo] = {};
    map[codigo][orgId] = true;
  });
  return map;
}

// ══════════════════════════════════════════════════════════════════════════
// COMITÉS POR UV (Top 10)
// ══════════════════════════════════════════════════════════════════════════

function calcularComitesPorUV_(filtros) {
  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  var filteredOrgs = filtrarOrganizaciones_(orgs, filtros);

  var countPorUV = {};
  filteredOrgs.forEach(function(r) {
    var uv = String(r.uv || 'Sin UV').trim();
    countPorUV[uv] = (countPorUV[uv] || 0) + 1;
  });

  var lista = Object.keys(countPorUV).map(function(uv) {
    return { uv: uv, nombre: 'UV ' + uv, conteo: countPorUV[uv] };
  });

  lista.sort(function(a, b) { return b.conteo - a.conteo; });

  return lista.slice(0, 10);
}

// ══════════════════════════════════════════════════════════════════════════
// ESTADO DE COMITÉS (Donut — estado_constitucion)
// ══════════════════════════════════════════════════════════════════════════

function calcularEstadoComites_(filtros) {
  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  var filteredOrgs = filtrarOrganizaciones_(orgs, filtros);

  var countPorEstado = {};
  filteredOrgs.forEach(function(r) {
    var estado = String(r.estado_constitucion || 'Sin estado').trim();
    countPorEstado[estado] = (countPorEstado[estado] || 0) + 1;
  });

  var total = filteredOrgs.length;
  var lista = Object.keys(countPorEstado).map(function(estado) {
    var conteo = countPorEstado[estado];
    return {
      estado: estado,
      conteo: conteo,
      porcentaje: total > 0 ? Math.round((conteo / total) * 100) : 0
    };
  });

  lista.sort(function(a, b) { return b.conteo - a.conteo; });

  return lista;
}

// ══════════════════════════════════════════════════════════════════════════
// TENDENCIA MENSUAL (Últimos 6 meses)
// ══════════════════════════════════════════════════════════════════════════

function calcularTendencia_(filtros) {
  var casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  var hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_HITOS) || [];
  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];

  var filteredOrgs = filtrarOrganizaciones_(orgs, filtros);
  var filteredCasos = filtrarCasos_(casos, filtros);

  // Set de organizaciones filtradas
  var orgIdSet = {};
  filteredOrgs.forEach(function(r) { if (r.organizacion_id) orgIdSet[r.organizacion_id] = true; });

  // Filtrar gestiones por organizaciones
  var filteredHitos = hitos.filter(function(h) { return orgIdSet[h.organizacion_id]; });

  // Calcular últimos 6 meses
  var now = new Date();
  var meses = [];
  var MESES_NOMBRE = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (var i = 5; i >= 0; i--) {
    var fecha = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var mes = fecha.getMonth();
    var anio = fecha.getFullYear();

    var ingresos = contarPorMes_(filteredCasos, 'fecha_ingreso', mes, anio);
    var gestiones = contarPorMes_(filteredHitos, 'fecha_gestion', mes, anio);

    meses.push({
      mes: MESES_NOMBRE[mes] + ' ' + String(anio).substring(2),
      ingresos: ingresos,
      gestiones: gestiones
    });
  }

  return meses;
}

// ══════════════════════════════════════════════════════════════════════════
// TERRITORIOS PARA MAPA (Placeholder por ahora)
// ══════════════════════════════════════════════════════════════════════════

function calcularTerritorios_(filtros) {
  // Por ahora retorna array vacío (mapa es placeholder)
  // En futuro: retornar [{orgId, nombre, uv, lat, lng, estado}, ...]
  return [];
}

// ══════════════════════════════════════════════════════════════════════════
// RESÚMENES AMPLIADOS (rediseño Alt A) — SOLO LECTURA, SOLO AGREGADOS
// ══════════════════════════════════════════════════════════════════════════

/** Ejecuta un agregador del dashboard con fallback si falla (no rompe la pantalla de inicio). */
function dashboardSafeAgg_(fn, fallback) {
  try { return fn(); }
  catch (e) { Logger.log('[Dashboard] agregador falló, usando fallback: ' + e); return fallback; }
}

/** Casos: total, grupos (casos sin organización) y distribución por UV (Top 8). */
function calcularCasosResumen_(filtros) {
  var casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  var filtered = filtrarCasos_(casos, filtros || {});

  var grupos = filtered.filter(function(c) {
    return !String(c.organizacion_id || '').trim();
  }).length;

  var porUv = {};
  filtered.forEach(function(c) {
    var uv = String(c.uv || 'Sin UV').trim() || 'Sin UV';
    porUv[uv] = (porUv[uv] || 0) + 1;
  });
  var porUvList = Object.keys(porUv)
    .map(function(uv) { return { label: 'UV ' + uv, count: porUv[uv] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 8);

  return { total: filtered.length, grupos: grupos, porUv: porUvList };
}

/** Estado de avance vigente por organización (Activo/Stand by/Detenido/Finalizado). */
function calcularEstadosAvance_() {
  var estados = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_ESTADO) || [];
  var out = { 'Activo': 0, 'Stand by': 0, 'Detenido': 0, 'Finalizado': 0 };
  estados.forEach(function(r) {
    if (!goPesBool_(r.activo_flag)) return; // solo el estado vigente (1 por org)
    var e = String(r.estado_avance || '').trim();
    if (out.hasOwnProperty(e)) out[e]++;
    else if (e) out[e] = (out[e] || 0) + 1;
  });
  return out;
}

/** FONDESE: embudo por estado de proceso, adjudicadas, montos y rendiciones pendientes. */
function calcularFondeseResumen_() {
  var rows = getSheetData_(GO_PES_V2.SHEETS.FACT_FONDESE) || [];
  var opts = (typeof getFondeseStateOptions_ === 'function') ? getFondeseStateOptions_() : [];
  var order = opts.map(function(o) { return o.code; });
  var labelByCode = {};
  opts.forEach(function(o) { labelByCode[o.code] = o.label; });

  var byEstado = {};
  order.forEach(function(c) { byEstado[c] = 0; });

  var idxAdjudicado = order.indexOf('adjudicado');
  var adjudicadas = 0, montoAdj = 0, montoEjec = 0, rendPendientes = 0;

  rows.forEach(function(r) {
    var est = String(r.estado_proceso || '').trim() || 'en_armado';
    if (byEstado.hasOwnProperty(est)) byEstado[est]++;
    else byEstado[est] = (byEstado[est] || 0) + 1;

    var idx = order.indexOf(est);
    if (idxAdjudicado >= 0 && idx >= idxAdjudicado) adjudicadas++;
    montoAdj += Number(r.monto_adjudicado || 0) || 0;
    montoEjec += Number(r.monto_ejecutado || 0) || 0;
    if (est === 'en_rendicion' && String(r.estado_rendicion || '').trim().toLowerCase() !== 'aprobada') {
      rendPendientes++;
    }
  });

  var embudo = order.map(function(c) {
    return { code: c, label: labelByCode[c] || c, count: byEstado[c] || 0 };
  });

  return {
    total: rows.length,
    embudo: embudo,
    adjudicadas: adjudicadas,
    montoAdjudicado: montoAdj,
    montoEjecutado: montoEjec,
    rendicionesPendientes: rendPendientes
  };
}

/** CÁMARAS 1414: conteo por estado + fuera de plazo + cámaras instaladas (sin sincronizar). */
function calcularCamarasResumen_() {
  var asigs = (getSheetData_(GO_PES_V2.SHEETS.FACT_BENEFICIOS_ORG) || []).filter(function(a) {
    return String(a.beneficio_codigo || '').trim().toUpperCase() === 'CAMARAS_1414';
  });
  var config = (typeof getCamaras1414Config_ === 'function') ? getCamaras1414Config_() : {};

  var elegible = 0, solicitado = 0, instalado = 0, fueraPlazo = 0, camaras = 0;
  asigs.forEach(function(a) {
    var detailMap = indexCamarasDetailRows_(getCamarasDetailRowsByAssignmentId_(a.beneficio_org_id));
    var eligDate = getCamarasEligibilityDateFromAssignment_(a);
    var wf = buildCamarasWorkflowState_(a, detailMap, eligDate);
    if (wf.index === 0) elegible++;
    else if (wf.index === 1) solicitado++;
    else if (wf.index === 2) instalado++;
    if (wf.instalacion && wf.instalacion.cameras) camaras += Number(wf.instalacion.cameras) || 0;
    if (wf.index === 0) {
      var plazo = buildCamarasPlazoInfo_(eligDate, wf, config);
      if (plazo && plazo.tono === 'danger') fueraPlazo++;
    }
  });

  return {
    elegible: elegible,
    solicitado: solicitado,
    instalado: instalado,
    fueraPlazo: fueraPlazo,
    camarasInstaladas: camaras
  };
}

/** Capacitaciones: eventos (por tipo), inscripciones no canceladas, personas únicas y ocupación. */
function calcularCapacitacionesResumen_() {
  var eventos = getSheetData_(GO_PES_V2.SHEETS.FACT_FORM_EVENTOS) || [];
  var inscr = getSheetData_(GO_PES_V2.SHEETS.FACT_FORM_INSCRIPCIONES) || [];

  var porTipo = {};
  var cupoTotal = 0;
  eventos.forEach(function(e) {
    var t = String(e.tipo || 'Otro').trim() || 'Otro';
    porTipo[t] = (porTipo[t] || 0) + 1;
    cupoTotal += Number(e.cupo_maximo || 0) || 0;
  });

  var noCanceladas = inscr.filter(function(i) {
    return String(i.estado_inscripcion || '').trim().toLowerCase() !== 'cancelada';
  });
  var rutSet = {};
  noCanceladas.forEach(function(i) {
    var r = String(i.rut || '').trim();
    if (r) rutSet[r] = true; // solo para el conteo distinct; el RUT no sale del backend
  });

  var porTipoList = Object.keys(porTipo)
    .map(function(t) { return { label: t, count: porTipo[t] }; })
    .sort(function(a, b) { return b.count - a.count; });

  return {
    eventos: eventos.length,
    inscripciones: noCanceladas.length,
    personasUnicas: Object.keys(rutSet).length,
    ocupacionPct: cupoTotal > 0 ? Math.round((noCanceladas.length / cupoTotal) * 100) : 0,
    porTipo: porTipoList
  };
}

// ══════════════════════════════════════════════════════════════════════════
// FILTROS DISPONIBLES
// ══════════════════════════════════════════════════════════════════════════

function getFiltrosDisponibles_() {
  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  var casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  var dimEstados = getSheetData_(GO_PES_V2.SHEETS.DIM_ESTADOS) || [];

  // UVs únicas
  var uvSet = {};
  orgs.forEach(function(r) {
    var uv = String(r.uv || '').trim();
    if (uv) uvSet[uv] = true;
  });
  var uvs = Object.keys(uvSet).sort().map(function(uv) {
    return { codigo: uv, nombre: 'UV ' + uv };
  });

  // Estados de constitución
  var estadosConstitucion = dimEstados
    .filter(function(r) { return r.tipo_estado === 'estado_constitucion' && r.activo_flag; })
    .sort(function(a, b) { return (Number(a.orden_estado) || 0) - (Number(b.orden_estado) || 0); })
    .map(function(r) {
      return {
        codigo: String(r.codigo_estado || '').trim(),
        nombre: String(r.descripcion_estado || r.codigo_estado || '').trim()
      };
    });

  // Años disponibles
  var yearSet = {};
  casos.forEach(function(r) {
    var fecha = r.fecha_ingreso ? new Date(r.fecha_ingreso) : null;
    if (fecha && !isNaN(fecha)) yearSet[fecha.getFullYear()] = true;
  });
  var years = Object.keys(yearSet).map(Number).sort(function(a, b) { return b - a; });

  return {
    uvs: uvs,
    estados: estadosConstitucion,
    years: years
  };
}

// ══════════════════════════════════════════════════════════════════════════
// HELPERS DE FILTRADO
// ══════════════════════════════════════════════════════════════════════════

function filtrarOrganizaciones_(orgs, filtros) {
  var result = orgs.slice();

  if (filtros.uv) {
    result = result.filter(function(r) {
      return normalizeText_(r.uv || '') === filtros.uv;
    });
  }

  if (filtros.estado) {
    result = result.filter(function(r) {
      return normalizeText_(r.estado_constitucion || '') === filtros.estado;
    });
  }

  return result;
}

function filtrarCasos_(casos, filtros) {
  var result = casos.slice();

  if (filtros.uv) {
    result = result.filter(function(r) {
      return normalizeText_(r.uv || '') === filtros.uv;
    });
  }

  if (filtros.year) {
    result = result.filter(function(r) {
      var fecha = r.fecha_ingreso ? new Date(r.fecha_ingreso) : null;
      return fecha && !isNaN(fecha) && fecha.getFullYear() === filtros.year;
    });
  }

  return result;
}
