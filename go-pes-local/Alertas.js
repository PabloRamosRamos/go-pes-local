/**
 * Sistema de Alertas Operativas GO-PES
 *
 * Gestiona alertas basadas en reglas de negocio críticas:
 * - Formalización: plazos entre hitos PRE_*
 * - Beneficios: plazos post-certificado definitivo
 *
 * Creado: 2026-06-09
 */

// ══════════════════════════════════════════════════════════════════════════
// DETECCIÓN DE ENTORNO (DEV vs PROD)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Detecta si estamos en entorno DEV
 * Usa GO_PES_V2.SCRIPT_IDS centralizado (2026-07-10)
 */
function isDevEnvironmentAlertas_() {
  var currentScriptId = ScriptApp.getScriptId();
  return currentScriptId === GO_PES_V2.SCRIPT_IDS.DEV;
}

// ══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN Y DEFAULTS
// ══════════════════════════════════════════════════════════════════════════

function getDefaultAlertasConfig_() {
  return {
    umbrales: {
      form_hito4a5_dias: 14,
      form_hito5a9_dias: 60,
      form_hito8antes9_dias: 15,
      form_hito7despues5_dias: 10,
      form_hito11despues10_dias: 30,
      ben_camaras_post_cert_dias: 5
    },
    usuarios_perfiles: []
  };
}

function getAlertasConfig_() {
  var persistedConfig = {};
  try {
    var allConfig = getSheetData_(GO_PES_V2.SHEETS.CFG_PARAMETROS);
    var row = allConfig.find(function(r) {
      return r.config_section === GO_PES_V2.ALERTAS.CONFIG_SECTION;
    });
    if (row && row.value_json) {
      persistedConfig = JSON.parse(row.value_json);
    }
  } catch (e) {
    Logger.log('[Alertas] Error leyendo config: ' + e);
  }

  var defaults = getDefaultAlertasConfig_();
  return {
    umbrales: Object.assign({}, defaults.umbrales, persistedConfig.umbrales || {}),
    usuarios_perfiles: Array.isArray(persistedConfig.usuarios_perfiles)
      ? persistedConfig.usuarios_perfiles
      : []
  };
}

function saveAlertasConfig_(config) {
  upsertByKey_(
    GO_PES_V2.SHEETS.CFG_PARAMETROS,
    'config_section',
    {
      config_section: GO_PES_V2.ALERTAS.CONFIG_SECTION,
      value_json: JSON.stringify(config),
      updated_at: new Date(),
      updated_by: getCurrentUserEmail_()
    },
    false
  );
  invalidateAlertasCache_();
}

function invalidateAlertasCache_() {
  delete GO_PES_RUNTIME.alertasUsuario;
  delete GO_PES_RUNTIME.alertasConfig;
  Object.keys(GO_PES_RUNTIME).forEach(function(k) {
    if (k.indexOf('alertasUsuario_') === 0) delete GO_PES_RUNTIME[k];
  });
  // Cache persistente por usuario (solo alcanza al usuario en sesión;
  // el resto expira por TTL)
  try {
    CacheService.getUserCache().remove(GO_PES_ALERTAS_USER_CACHE_KEY);
  } catch (err) {}
  // Invalidar también cache del dashboard (depende de alertas)
  if (typeof invalidateDashboardCache_ === 'function') {
    invalidateDashboardCache_();
  }
}

var GO_PES_ALERTAS_USER_CACHE_KEY = 'go_pes_alertas_usuario';

function getAlertasUserCacheJson_() {
  try {
    var raw = CacheService.getUserCache().get(GO_PES_ALERTAS_USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function putAlertasUserCacheJson_(payload) {
  try {
    var raw = JSON.stringify(payload);
    if (raw.length > 90000) return;
    CacheService.getUserCache().put(
      GO_PES_ALERTAS_USER_CACHE_KEY,
      raw,
      Math.floor(GO_PES_V2.ALERTAS.CACHE_TTL_MS / 1000)
    );
  } catch (err) {}
}

// ══════════════════════════════════════════════════════════════════════════
// PERFIL OPERATIVO DEL USUARIO
// ══════════════════════════════════════════════════════════════════════════

function getPerfilUsuario_(email) {
  if (!email) return null;

  // Superusers y coordinadores ven TODAS las alertas (ambas áreas)
  var user = getUsuarioActual();
  if (user && (user.superuser_flag || user.perfil === 'coordinador')) {
    return 'todas'; // Perfil especial que combina ambas áreas
  }

  // Usuarios normales buscan en configuración
  var config = getAlertasConfig_();
  var perfil = config.usuarios_perfiles.find(function(p) {
    return normalizeEmail_(p.email) === normalizeEmail_(email);
  });

  return perfil ? perfil.area : null;
}

// ══════════════════════════════════════════════════════════════════════════
// EVALUACIÓN DE ALERTAS
// ══════════════════════════════════════════════════════════════════════════

function evaluarAlertasFormalizacion_(umbrales) {
  var hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS);
  var casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);
  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);

  var alertas = [];

  // Agrupar hitos por solicitud_id o organizacion_id
  var hitosPorCaso = {};
  hitos.forEach(function(h) {
    var key = h.organizacion_id || h.solicitud_id;
    if (!key) return;
    if (!hitosPorCaso[key]) hitosPorCaso[key] = [];
    hitosPorCaso[key].push(h);
  });

  // Enriquecer con datos de caso/org
  var casosMap = {};
  casos.forEach(function(c) { if (c.solicitud_id) casosMap[c.solicitud_id] = c; });
  var orgsMap = {};
  orgs.forEach(function(o) { if (o.organizacion_id) orgsMap[o.organizacion_id] = o; });

  // ALERTA 1: Hito 4 a 5 (crítica)
  alertas.push(evaluarFormHito4a5_(hitosPorCaso, casosMap, orgsMap, umbrales.form_hito4a5_dias));

  // ALERTA 2: Hito 5 a 9 (crítica)
  alertas.push(evaluarFormHito5a9_(hitosPorCaso, casosMap, orgsMap, umbrales.form_hito5a9_dias));

  // ALERTA 3: Hito 8 antes de 9 (crítica - legal)
  alertas.push(evaluarFormHito8Antes9_(hitosPorCaso, casosMap, orgsMap, umbrales.form_hito8antes9_dias));

  // ALERTA 4: Hito 7 post 5 (warning)
  alertas.push(evaluarFormHito7Post5_(hitosPorCaso, casosMap, orgsMap, umbrales.form_hito7despues5_dias));

  // ALERTA 5: Hito 11 post 10 (warning)
  alertas.push(evaluarFormHito11Post10_(hitosPorCaso, casosMap, orgsMap, umbrales.form_hito11despues10_dias));

  return alertas.filter(function(a) { return a.conteo > 0; });
}

function evaluarFormHito4a5_(hitosPorCaso, casosMap, orgsMap, umbralDias) {
  var afectados = [];

  Object.keys(hitosPorCaso).forEach(function(key) {
    var hitosDelCaso = hitosPorCaso[key];
    var h4 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_04; });
    var h5 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_05; });

    if (!h4 || !h5) return;

    var fecha4 = h4.fecha_hito instanceof Date ? h4.fecha_hito : new Date(h4.fecha_hito);
    var fecha5 = h5.fecha_hito instanceof Date ? h5.fecha_hito : new Date(h5.fecha_hito);
    var diasTranscurridos = Math.round((fecha5 - fecha4) / (24 * 60 * 60 * 1000));

    if (diasTranscurridos > umbralDias) {
      var caso = casosMap[h4.solicitud_id] || {};
      var org = orgsMap[h4.organizacion_id] || {};
      afectados.push({
        solicitud_id: h4.solicitud_id || '',
        organizacion_id: h4.organizacion_id || '',
        nombre_vecino: caso.nombre_completo || '',
        organizacion_nombre: org.nombre_organizacion || '',
        dias_transcurridos: diasTranscurridos,
        fecha_hito_origen: Utilities.formatDate(fecha4, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        fecha_hito_destino: Utilities.formatDate(fecha5, Session.getScriptTimeZone(), 'dd/MM/yyyy')
      });
    }
  });

  return {
    id: GO_PES_V2.ALERTAS.ALERTAS_IDS.FORM_HITO4A5,
    titulo: 'Plazo crítico entre hito 4 y 5 excedido',
    descripcion: afectados.length + ' caso' + (afectados.length === 1 ? '' : 's') + ' supera' + (afectados.length === 1 ? '' : 'n') + ' los ' + umbralDias + ' días permitidos. El proceso puede caer.',
    tipo: GO_PES_V2.ALERTAS.TIPOS.DANGER,
    conteo: afectados.length,
    umbral: umbralDias,
    casos: afectados.slice(0, 10)
  };
}

function evaluarFormHito5a9_(hitosPorCaso, casosMap, orgsMap, umbralDias) {
  var afectados = [];

  Object.keys(hitosPorCaso).forEach(function(key) {
    var hitosDelCaso = hitosPorCaso[key];
    var h5 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_05; });
    var h9 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_09; });

    if (!h5 || !h9) return;

    var fecha5 = h5.fecha_hito instanceof Date ? h5.fecha_hito : new Date(h5.fecha_hito);
    var fecha9 = h9.fecha_hito instanceof Date ? h9.fecha_hito : new Date(h9.fecha_hito);
    var diasTranscurridos = Math.round((fecha9 - fecha5) / (24 * 60 * 60 * 1000));

    if (diasTranscurridos > umbralDias) {
      var caso = casosMap[h5.solicitud_id] || {};
      var org = orgsMap[h5.organizacion_id] || {};
      afectados.push({
        solicitud_id: h5.solicitud_id || '',
        organizacion_id: h5.organizacion_id || '',
        nombre_vecino: caso.nombre_completo || '',
        organizacion_nombre: org.nombre_organizacion || '',
        dias_transcurridos: diasTranscurridos,
        fecha_hito_origen: Utilities.formatDate(fecha5, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        fecha_hito_destino: Utilities.formatDate(fecha9, Session.getScriptTimeZone(), 'dd/MM/yyyy')
      });
    }
  });

  return {
    id: GO_PES_V2.ALERTAS.ALERTAS_IDS.FORM_HITO5A9,
    titulo: 'Plazo crítico entre hito 5 y 9 excedido',
    descripcion: afectados.length + ' caso' + (afectados.length === 1 ? '' : 's') + ' supera' + (afectados.length === 1 ? '' : 'n') + ' los ' + umbralDias + ' días permitidos. El proceso puede caer.',
    tipo: GO_PES_V2.ALERTAS.TIPOS.DANGER,
    conteo: afectados.length,
    umbral: umbralDias,
    casos: afectados.slice(0, 10)
  };
}

function evaluarFormHito8Antes9_(hitosPorCaso, casosMap, orgsMap, minimoAntesDias) {
  var afectados = [];

  Object.keys(hitosPorCaso).forEach(function(key) {
    var hitosDelCaso = hitosPorCaso[key];
    var h8 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_08; });
    var h9 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_09; });

    if (!h8 || !h9) return;

    var fecha8 = h8.fecha_hito instanceof Date ? h8.fecha_hito : new Date(h8.fecha_hito);
    var fecha9 = h9.fecha_hito instanceof Date ? h9.fecha_hito : new Date(h9.fecha_hito);
    var diasAntes = Math.round((fecha9 - fecha8) / (24 * 60 * 60 * 1000));

    if (diasAntes < minimoAntesDias) {
      var caso = casosMap[h8.solicitud_id] || {};
      var org = orgsMap[h8.organizacion_id] || {};
      afectados.push({
        solicitud_id: h8.solicitud_id || '',
        organizacion_id: h8.organizacion_id || '',
        nombre_vecino: caso.nombre_completo || '',
        organizacion_nombre: org.nombre_organizacion || '',
        dias_transcurridos: diasAntes,
        fecha_hito_origen: Utilities.formatDate(fecha8, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        fecha_hito_destino: Utilities.formatDate(fecha9, Session.getScriptTimeZone(), 'dd/MM/yyyy')
      });
    }
  });

  return {
    id: GO_PES_V2.ALERTAS.ALERTAS_IDS.FORM_HITO8ANTES9,
    titulo: 'Hito 8 no cumple plazo legal antes de hito 9',
    descripcion: afectados.length + ' caso' + (afectados.length === 1 ? '' : 's') + ' no cumple' + (afectados.length === 1 ? '' : 'n') + ' los ' + minimoAntesDias + ' días mínimos requeridos por ley.',
    tipo: GO_PES_V2.ALERTAS.TIPOS.DANGER,
    conteo: afectados.length,
    umbral: minimoAntesDias,
    casos: afectados.slice(0, 10)
  };
}

function evaluarFormHito7Post5_(hitosPorCaso, casosMap, orgsMap, esperadoDias) {
  var afectados = [];
  var hoy = new Date();

  Object.keys(hitosPorCaso).forEach(function(key) {
    var hitosDelCaso = hitosPorCaso[key];
    var h5 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_05; });
    var h7 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_07; });

    if (!h5 || h7) return; // Si h7 existe, no hay alerta

    var fecha5 = h5.fecha_hito instanceof Date ? h5.fecha_hito : new Date(h5.fecha_hito);
    var diasDesde5 = Math.round((hoy - fecha5) / (24 * 60 * 60 * 1000));

    if (diasDesde5 > esperadoDias) {
      var caso = casosMap[h5.solicitud_id] || {};
      var org = orgsMap[h5.organizacion_id] || {};
      afectados.push({
        solicitud_id: h5.solicitud_id || '',
        organizacion_id: h5.organizacion_id || '',
        nombre_vecino: caso.nombre_completo || '',
        organizacion_nombre: org.nombre_organizacion || '',
        dias_transcurridos: diasDesde5,
        fecha_hito_origen: Utilities.formatDate(fecha5, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        fecha_hito_destino: 'Pendiente'
      });
    }
  });

  return {
    id: GO_PES_V2.ALERTAS.ALERTAS_IDS.FORM_HITO7POST5,
    titulo: 'Hito 7 pendiente posterior a hito 5',
    descripcion: afectados.length + ' caso' + (afectados.length === 1 ? '' : 's') + ' no ha' + (afectados.length === 1 ? '' : 'n') + ' completado hito 7 en ' + esperadoDias + ' días después del hito 5.',
    tipo: GO_PES_V2.ALERTAS.TIPOS.WARNING,
    conteo: afectados.length,
    umbral: esperadoDias,
    casos: afectados.slice(0, 10)
  };
}

function evaluarFormHito11Post10_(hitosPorCaso, casosMap, orgsMap, esperadoDias) {
  var afectados = [];
  var hoy = new Date();

  Object.keys(hitosPorCaso).forEach(function(key) {
    var hitosDelCaso = hitosPorCaso[key];
    var h10 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_10; });
    var h11 = hitosDelCaso.find(function(h) { return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_11; });

    if (!h10 || h11) return; // Si h11 existe, no hay alerta

    var fecha10 = h10.fecha_hito instanceof Date ? h10.fecha_hito : new Date(h10.fecha_hito);
    var diasDesde10 = Math.round((hoy - fecha10) / (24 * 60 * 60 * 1000));

    if (diasDesde10 > esperadoDias) {
      var caso = casosMap[h10.solicitud_id] || {};
      var org = orgsMap[h10.organizacion_id] || {};
      afectados.push({
        solicitud_id: h10.solicitud_id || '',
        organizacion_id: h10.organizacion_id || '',
        nombre_vecino: caso.nombre_completo || '',
        organizacion_nombre: org.nombre_organizacion || '',
        dias_transcurridos: diasDesde10,
        fecha_hito_origen: Utilities.formatDate(fecha10, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        fecha_hito_destino: 'Pendiente'
      });
    }
  });

  return {
    id: GO_PES_V2.ALERTAS.ALERTAS_IDS.FORM_HITO11POST10,
    titulo: 'Certificado definitivo (hito 11) pendiente',
    descripcion: afectados.length + ' caso' + (afectados.length === 1 ? '' : 's') + ' no ha' + (afectados.length === 1 ? '' : 'n') + ' obtenido certificado en ' + esperadoDias + ' días después del hito 10.',
    tipo: GO_PES_V2.ALERTAS.TIPOS.WARNING,
    conteo: afectados.length,
    umbral: esperadoDias,
    casos: afectados.slice(0, 10)
  };
}

function evaluarAlertasBeneficios_(umbrales) {
  var hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS);
  var casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);
  var orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES);
  var instrumentos = getSheetData_(GO_PES_V2.SHEETS.FACT_INSTRUMENTOS);

  var alertas = [];

  // ALERTA: Cámaras post certificado definitivo
  alertas.push(evaluarBenCamarasPostCert_(hitos, casos, orgs, instrumentos, umbrales.ben_camaras_post_cert_dias));

  return alertas.filter(function(a) { return a.conteo > 0; });
}

function evaluarBenCamarasPostCert_(hitos, casos, orgs, instrumentos, umbralDias) {
  var afectados = [];
  var hoy = new Date();

  // Buscar todos los hitos 11 (certificado definitivo)
  var hitosH11 = hitos.filter(function(h) {
    return h.codigo_hito === GO_PES_V2.ALERTAS.HITOS.PRE_11;
  });

  var casosMap = {};
  casos.forEach(function(c) { if (c.solicitud_id) casosMap[c.solicitud_id] = c; });
  var orgsMap = {};
  orgs.forEach(function(o) { if (o.organizacion_id) orgsMap[o.organizacion_id] = o; });

  // Verificar si tienen solicitud de Cámaras
  hitosH11.forEach(function(h11) {
    var fecha11 = h11.fecha_hito instanceof Date ? h11.fecha_hito : new Date(h11.fecha_hito);
    var diasDesde11 = Math.round((hoy - fecha11) / (24 * 60 * 60 * 1000));

    if (diasDesde11 <= umbralDias) return; // Todavía están dentro del plazo

    var orgId = h11.organizacion_id;
    if (!orgId) return;

    // Buscar si existe solicitud de Cámaras para esta org
    var tieneSolicitud = instrumentos.some(function(inst) {
      return inst.organizacion_id === orgId &&
             String(inst.instrumento_nombre || '').toLowerCase().indexOf('camaras') !== -1;
    });

    if (!tieneSolicitud) {
      var caso = casosMap[h11.solicitud_id] || {};
      var org = orgsMap[orgId] || {};
      afectados.push({
        solicitud_id: h11.solicitud_id || '',
        organizacion_id: orgId,
        nombre_vecino: caso.nombre_completo || '',
        organizacion_nombre: org.nombre_organizacion || '',
        dias_transcurridos: diasDesde11,
        fecha_hito_origen: Utilities.formatDate(fecha11, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        fecha_hito_destino: 'Sin solicitud'
      });
    }
  });

  return {
    id: GO_PES_V2.ALERTAS.ALERTAS_IDS.BEN_CAMARAS_POST_CERT,
    titulo: 'Solicitud Cámaras 1414 no realizada post certificado',
    descripcion: afectados.length + ' organización' + (afectados.length === 1 ? '' : 'es') + ' supera' + (afectados.length === 1 ? '' : 'n') + ' los ' + umbralDias + ' días sin solicitar Cámaras.',
    tipo: GO_PES_V2.ALERTAS.TIPOS.DANGER,
    conteo: afectados.length,
    umbral: umbralDias,
    casos: afectados.slice(0, 10)
  };
}

// ══════════════════════════════════════════════════════════════════════════
// FUNCIONES PÚBLICAS (sin sufijo _, accesibles desde frontend)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Mock data para entorno DEV (similar al calendario)
 */
function getAlertasMock_() {
  var email = getCurrentUserEmail_();
  var area = getPerfilUsuario_(email);

  // Si no tiene perfil, usar formalizacion por defecto en DEV
  if (!area) {
    area = GO_PES_V2.ALERTAS.AREAS.FORMALIZACION;
  }

  var alertasFormalizacion = [
    {
      id: GO_PES_V2.ALERTAS.ALERTAS_IDS.FORM_HITO4A5,
      titulo: 'Plazo crítico entre hito 4 y 5 excedido',
      descripcion: '3 organizaciones superan los 14 días entre acta constitutiva y escritura pública',
      tipo: GO_PES_V2.ALERTAS.TIPOS.DANGER,
      conteo: 3,
      umbral: 14,
      casos: [
        { id: 'ORG-001', nombre: 'Comité de Seguridad Los Castaños', detalle: '18 días transcurridos (4 días de atraso)' },
        { id: 'ORG-002', nombre: 'Junta de Vecinos Sector Norte', detalle: '21 días transcurridos (7 días de atraso)' },
        { id: 'ORG-003', nombre: 'Comité Nueva Providencia', detalle: '16 días transcurridos (2 días de atraso)' }
      ]
    },
    {
      id: GO_PES_V2.ALERTAS.ALERTAS_IDS.FORM_HITO7POST5,
      titulo: 'Certificado de directorio pendiente',
      descripcion: '2 organizaciones sin certificado de directorio vigente después de 10 días',
      tipo: GO_PES_V2.ALERTAS.TIPOS.WARNING,
      conteo: 2,
      umbral: 10,
      casos: [
        { id: 'ORG-004', nombre: 'Comité Test UV 15', detalle: '12 días desde escritura pública' },
        { id: 'ORG-005', nombre: 'Agrupación Vecinal Central', detalle: '14 días desde escritura pública' }
      ]
    }
  ];

  var alertasBeneficios = [
    {
      id: GO_PES_V2.ALERTAS.ALERTAS_IDS.BEN_CAMARAS_POST_CERT,
      titulo: 'Solicitud Cámaras 1414 fuera de plazo',
      descripcion: '1 organización con solicitud pendiente después de 5 días del certificado definitivo',
      tipo: GO_PES_V2.ALERTAS.TIPOS.INFO,
      conteo: 1,
      umbral: 5,
      casos: [
        { id: 'ORG-006', nombre: 'Comité Los Leones', detalle: '7 días desde certificado definitivo (2 días de atraso)' }
      ]
    }
  ];

  var alertasMock = [];

  if (area === 'todas') {
    // Superusers y coordinadores ven TODAS las alertas
    alertasMock = alertasFormalizacion.concat(alertasBeneficios);
  } else if (area === GO_PES_V2.ALERTAS.AREAS.FORMALIZACION) {
    alertasMock = alertasFormalizacion;
  } else if (area === GO_PES_V2.ALERTAS.AREAS.BENEFICIOS) {
    alertasMock = alertasBeneficios;
  }

  return {
    ok: true,
    area: area,
    alertas: alertasMock
  };
}

function getAlertasUsuario() {
  try {
    requireModuleAccess_('inicio', ['visor', 'operador', 'coordinador', 'superuser']);

    // En DEV, retornar mock data automáticamente
    if (isDevEnvironmentAlertas_()) {
      Logger.log('[ALERTAS] Entorno DEV detectado, retornando mock data');
      return serializeForClient_(getAlertasMock_());
    }

    // Cache runtime (solo vive dentro de la misma ejecución GAS)
    var cacheKey = 'alertasUsuario_' + getCurrentUserEmail_();
    if (GO_PES_RUNTIME[cacheKey]) {
      var cached = GO_PES_RUNTIME[cacheKey];
      if (cached.timestamp && (Date.now() - cached.timestamp < GO_PES_V2.ALERTAS.CACHE_TTL_MS)) {
        Logger.log('[ALERTAS] Retornando datos del cache runtime');
        return serializeForClient_(cached.data);
      }
    }

    // Cache persistente entre ejecuciones (CacheService por usuario) —
    // las variables globales de GAS se reinician en cada google.script.run.
    var userCached = getAlertasUserCacheJson_();
    if (userCached) {
      Logger.log('[ALERTAS] Retornando datos del cache persistente');
      return userCached;
    }

    var email = getCurrentUserEmail_();
    Logger.log('[ALERTAS] Obteniendo perfil para usuario: ' + email);

    var area = getPerfilUsuario_(email);
    Logger.log('[ALERTAS] Área asignada: ' + area);

    // Si no tiene perfil asignado, retornar vacío
    if (!area) {
      Logger.log('[ALERTAS] Usuario sin perfil asignado, retornando array vacío');
      return serializeForClient_({
        ok: true,
        area: null,
        alertas: []
      });
    }

    Logger.log('[ALERTAS] Obteniendo configuración de umbrales');
    var config = getAlertasConfig_();
    var alertas = [];

    if (area === 'todas') {
      Logger.log('[ALERTAS] Evaluando alertas para TODAS las áreas (superuser/coordinador)');
      var alertasForm = evaluarAlertasFormalizacion_(config.umbrales);
      var alertasBen = evaluarAlertasBeneficios_(config.umbrales);
      alertas = alertasForm.concat(alertasBen);
      Logger.log('[ALERTAS] Total alertas combinadas: ' + alertas.length);
    } else if (area === GO_PES_V2.ALERTAS.AREAS.FORMALIZACION) {
      Logger.log('[ALERTAS] Evaluando alertas de FORMALIZACIÓN');
      alertas = evaluarAlertasFormalizacion_(config.umbrales);
    } else if (area === GO_PES_V2.ALERTAS.AREAS.BENEFICIOS) {
      Logger.log('[ALERTAS] Evaluando alertas de BENEFICIOS');
      alertas = evaluarAlertasBeneficios_(config.umbrales);
    }

    Logger.log('[ALERTAS] Total alertas evaluadas: ' + alertas.length);

    var result = {
      ok: true,
      area: area,
      alertas: alertas
    };

    // Guardar en cache (runtime + persistente)
    GO_PES_RUNTIME[cacheKey] = {
      timestamp: Date.now(),
      data: result
    };

    var payload = serializeForClient_(result);
    putAlertasUserCacheJson_(payload);

    Logger.log('[ALERTAS] Datos guardados en cache y listos para enviar');
    return payload;

  } catch (error) {
    Logger.log('[ALERTAS] ERROR en getAlertasUsuario: ' + error.toString());
    Logger.log('[ALERTAS] Stack trace: ' + error.stack);

    // Loguear en LOG_Procesamiento para auditoría
    logError_('getAlertasUsuario', error, { email: getCurrentUserEmail_() });

    // Retornar error estructurado al cliente
    return serializeForClient_({
      ok: false,
      error: error.toString(),
      message: 'Error al cargar alertas: ' + error.message
    });
  }
}

function getAlertasConfigAdmin() {
  requireRole_(['coordinador', 'superuser']);

  var config = getAlertasConfig_();
  var usuarios = getSheetData_(GO_PES_V2.SHEETS.DIM_USUARIOS)
    .filter(function(u) { return u.activo_flag; })
    .map(function(u) {
      return {
        email: u.email,
        nombre_visible: u.nombre_visible,
        perfil_rol: u.perfil
      };
    });

  return serializeForClient_({
    ok: true,
    config: config,
    usuarios_disponibles: usuarios,
    areas_disponibles: [
      GO_PES_V2.ALERTAS.AREAS.FORMALIZACION,
      GO_PES_V2.ALERTAS.AREAS.BENEFICIOS
    ]
  });
}

function saveAlertasConfigAdmin(payload) {
  requireRole_(['superuser']);

  var incoming = payload || {};
  var config = {
    umbrales: {
      form_hito4a5_dias: Math.max(1, parseInt(incoming.form_hito4a5_dias || 14)),
      form_hito5a9_dias: Math.max(1, parseInt(incoming.form_hito5a9_dias || 60)),
      form_hito8antes9_dias: Math.max(1, parseInt(incoming.form_hito8antes9_dias || 15)),
      form_hito7despues5_dias: Math.max(1, parseInt(incoming.form_hito7despues5_dias || 10)),
      form_hito11despues10_dias: Math.max(1, parseInt(incoming.form_hito11despues10_dias || 30)),
      ben_camaras_post_cert_dias: Math.max(1, parseInt(incoming.ben_camaras_post_cert_dias || 5))
    },
    usuarios_perfiles: Array.isArray(incoming.usuarios_perfiles)
      ? incoming.usuarios_perfiles
      : []
  };

  saveAlertasConfig_(config);

  logUserAction_('SAVE_ALERTAS_CONFIG', 'configuracion', 'alertas_operativas', 'OK', {
    umbrales: config.umbrales,
    total_usuarios_asignados: config.usuarios_perfiles.length
  });

  return serializeForClient_({
    ok: true,
    config: config
  });
}
