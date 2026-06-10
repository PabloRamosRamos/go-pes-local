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

  // Verificar cache (TTL 3 minutos)
  var cached = GO_PES_RUNTIME[cacheKey];
  if (cached && cached.timestamp && (Date.now() - cached.timestamp) < GO_PES_V2.DASHBOARD.CACHE_TTL_MS) {
    return serializeForClient_(cached.data);
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

  return serializeForClient_(data);
}

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
