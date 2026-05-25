/**
 * Configuración global administrable del sistema.
 * Persiste por sección en CFG_Parametros para evitar múltiples fuentes de verdad.
 */
function getBaseModuleDefinitions_() {
  return [
    { key: 'inicio', label: 'Inicio', view: 'inicio', icon: 'home', required: true, defaultVisible: true, navVisible: true, assignable: true, superOnly: false, order: 10, state: 'active' },
    { key: 'nuevo-ingreso', label: 'Nuevo ingreso', view: 'nuevo-ingreso', icon: 'person_add', defaultVisible: false, navVisible: true, assignable: true, superOnly: false, order: 20, state: 'active' },
    { key: 'buscar', label: 'Buscar vecino', view: 'buscar', icon: 'search', defaultVisible: false, navVisible: true, assignable: true, superOnly: false, order: 30, state: 'active' },
    { key: 'ficha', label: 'Ficha', view: 'ficha', icon: 'description', defaultVisible: false, navVisible: false, assignable: false, superOnly: false, order: 35, state: 'active' },
    { key: 'avance', label: 'Avance', view: 'avance', icon: 'event_note', defaultVisible: false, navVisible: true, assignable: true, superOnly: false, order: 40, state: 'active' },
    { key: 'organizacion', label: 'Organizaciones', view: 'organizacion', icon: 'groups', defaultVisible: false, navVisible: true, assignable: true, superOnly: false, order: 50, state: 'active' },
    { key: 'socios', label: 'Socios', view: 'socios', icon: 'badge', defaultVisible: false, navVisible: true, assignable: true, superOnly: false, order: 60, state: 'active' },
    { key: 'instrumento', label: 'Beneficios', view: 'instrumento', icon: 'handshake', defaultVisible: false, navVisible: true, assignable: true, superOnly: false, order: 70, state: 'active' },
    { key: 'historial', label: 'Historial', view: 'historial', icon: 'history', defaultVisible: false, navVisible: true, assignable: true, superOnly: false, order: 80, state: 'active' },
    { key: 'usuarios', label: 'Gestión de usuarios', view: 'usuarios', icon: 'manage_accounts', defaultVisible: false, navVisible: true, assignable: false, superOnly: true, order: 90, state: 'active' },
    { key: 'configuracion', label: 'Configuración', view: 'configuracion', icon: 'settings', defaultVisible: false, navVisible: true, assignable: false, superOnly: true, order: 100, state: 'active' }
  ];
}

function getFixedPrimarySuperuserEmail_() {
  return sanitizeEmailValue_(
    Array.isArray(GO_PES_V2.SUPERUSERS) ? (GO_PES_V2.SUPERUSERS[0] || '') : '',
    'pablo.ramos@providencia.cl'
  );
}

function normalizeModuleLookupKey_(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getModuleKeyAliasMap_() {
  const aliases = {
    home: 'inicio',
    inicio: 'inicio',
    nuevo_ingreso: 'nuevo-ingreso',
    ingreso: 'nuevo-ingreso',
    buscar: 'buscar',
    buscar_vecino: 'buscar',
    buscar_ficha: 'buscar',
    ficha: 'ficha',
    ficha_vecino: 'ficha',
    seguimiento: 'avance',
    registrar_avance: 'avance',
    avance: 'avance',
    organizacion: 'organizacion',
    organizaciones: 'organizacion',
    gestion_organizaciones: 'organizacion',
    socios: 'socios',
    beneficio: 'instrumento',
    beneficios: 'instrumento',
    instrumento: 'instrumento',
    instrumentos: 'instrumento',
    gestionar_beneficios: 'instrumento',
    gestionar_instrumentos: 'instrumento',
    historial: 'historial',
    usuario: 'usuarios',
    usuarios: 'usuarios',
    gestion_usuarios: 'usuarios',
    configuracion: 'configuracion',
    config: 'configuracion',
    settings: 'configuracion'
  };

  getBaseModuleDefinitions_().forEach(function(def) {
    const lookup = normalizeModuleLookupKey_(def.key);
    const viewLookup = normalizeModuleLookupKey_(def.view || def.key);
    if (lookup) aliases[lookup] = def.key;
    if (viewLookup) aliases[viewLookup] = def.key;
  });

  return aliases;
}

function normalizeModuleKey_(value) {
  const lookup = normalizeModuleLookupKey_(value);
  if (!lookup) return '';
  return getModuleKeyAliasMap_()[lookup] || '';
}

function getModuleDefinitions_() {
  const baseDefs = getBaseModuleDefinitions_();
  const config = getRuntimeSystemConfig_();
  const moduleConfigMap = ((config.accessModules && config.accessModules.modules) || []).reduce(function(acc, row) {
    const key = normalizeModuleKey_(row && row.key);
    if (key) acc[key] = row;
    return acc;
  }, {});
  const alwaysVisible = getConfiguredAlwaysVisibleModules_();

  return baseDefs.map(function(base) {
    const configured = moduleConfigMap[base.key] || {};
    const state = base.superOnly
      ? 'active'
      : sanitizeModuleState_(configured.state, base.state || 'active');
    const required = !!base.required || alwaysVisible.indexOf(base.key) !== -1;
    return Object.assign({}, base, {
      key: base.key,
      view: base.view || base.key,
      icon: base.icon || '',
      label: configured.label || base.label,
      order: Number(configured.order || base.order || 0),
      state: state,
      enabled: state === 'active',
      required: required,
      defaultVisible: required || !!base.defaultVisible
    });
  }).sort(function(a, b) {
    return Number(a.order || 0) - Number(b.order || 0);
  });
}

function getSystemConfigSectionOrder_() {
  return [
    'general',
    'branding',
    'accessModules',
    'socios',
    'beneficios',
    'alertsInicio',
    'integrations',
    'technical'
  ];
}

function getDefaultSystemConfig_() {
  const colors = (GO_PES_V2 && GO_PES_V2.COLORS) || {};
  return {
    general: {
      appName: 'Gestor Operativo PES',
      appSubtitle: 'Gestión de vecinos, avance y organizaciones',
      programName: 'Programa Estamos Seguros',
      environmentLabel: String((GO_PES_V2 && GO_PES_V2.ENVIRONMENT) || '').trim().toUpperCase(),
      showVisibleVersion: true,
      loadingText: 'Iniciando Gestor Operativo',
      splashMinDurationMs: 5000
    },
    branding: {
      logoLightDataUri: '',
      logoDarkDataUri: '',
      primaryColor: colors.blue || '#214E8A',
      secondaryColor: colors.green || '#007C4A',
      accentColor: '#03C2AE',
      lightBackground: colors.bg || '#F7FAFC',
      darkBackground: '#0D2940',
      loadingProgressColor: '#8CC63F'
    },
    accessModules: {
      allowedDomain: 'providencia.cl',
      primarySuperuserEmail: Array.isArray(GO_PES_V2.SUPERUSERS) ? (GO_PES_V2.SUPERUSERS[0] || '') : '',
      defaultUserProfile: 'operador',
      defaultView: (GO_PES_V2 && GO_PES_V2.DEFAULT_VIEW) || 'inicio',
      alwaysVisibleModules: ['inicio'],
      modules: getBaseModuleDefinitions_().map(function(module) {
        return {
          key: module.key,
          label: module.label,
          order: module.order || 0,
          state: module.state || 'active'
        };
      })
    },
    socios: {
      addressSuffix: 'Providencia',
      allowedRoles: [
        'Presidente',
        'Tesorero',
        'Secretario',
        'Director',
        'Comisión electoral',
        'Comisión de finanzas',
        'Socio'
      ],
      requiredManualFields: ['organizacion_id', 'nombre_socio', 'cargo'],
      bulkColumnMap: {
        run_socio: 'RUN',
        numero_registro: 'Registro',
        nombre_socio: 'Nombre',
        cargo: 'Cargo',
        direccion_socio: 'Direccion',
        ubicacion_socio: 'Ubicacion'
      },
      dashboardHeight: 443
    },
    beneficios: {
      capacitaciones: {
        annualDefaultCount: 4,
        displayName: 'CAPACITACIONES',
        allowedStates: ['Planificada', 'En gestión', 'Ejecutada'],
        baseEligibilityCondition: 'Organización con proceso activo'
      },
      fondese: {
        baseYear: new Date().getFullYear(),
        callsPerYear: 2,
        keyDates: [
          { key: 'apertura', label: 'Apertura', date: '' },
          { key: 'cierre', label: 'Cierre', date: '' },
          { key: 'resultados', label: 'Resultados', date: '' }
        ],
        alertDaysBefore: 10,
        baseStates: ['Pendiente', 'Postulación', 'Resultado']
      },
      camaras1414: {
        displayName: 'CAMARAS 1414',
        baseStates: [
          'Elegible por certificado definitivo',
          'Gestion pendiente',
          'Solicitud de visita tecnica preparada',
          'Solicitud enviada',
          'En espera de respuesta',
          'Visita agendada',
          'Visita realizada',
          'Instalacion en seguimiento',
          'Convenio recibido',
          'Beneficio cerrado'
        ],
        technicalVisitAlertDays: 7,
        baseEligibilityCondition: 'Organizacion con certificado definitivo',
        reminderDaysFromEligibility: 0,
        maxDaysToSendRequest: 5,
        maxDaysWithoutVisitResponse: 10,
        maxDaysPostVisitFollowup: 7,
        maxDaysToConvenio: 20,
        maxDaysWithoutProgress: 30,
        alertHighDays: 3,
        alertMediumDays: 7
      }
    },
    alertsInicio: {
      alertHighDays: 7,
      alertMediumDays: 15,
      maxVisibleAlerts: 6,
      maxUpcomingAssemblies: 5,
      homeBlocksOrder: ['hero', 'quickActions', 'tiles', 'dashboard'],
      homeBlocksVisibility: {
        quickActions: true,
        tiles: true,
        dashboard: true
      },
      leftPanelDefaults: ['resumen', 'alertas']
    },
    integrations: {
      homeDashboardUrl: 'https://datastudio.google.com/embed/reporting/bc4833f8-43c1-4df8-a96b-4cb794228f7c/page/tYkyF',
      sociosDashboardUrl: 'https://datastudio.google.com/embed/reporting/bc4833f8-43c1-4df8-a96b-4cb794228f7c/page/tYkyF',
      futureReports: [],
      googleCalendarId: '',
      externalLinks: []
    },
    technical: {
      maintenanceMode: false,
      demoMode: false,
      showExtendedLogs: false,
      enableDataReset: true,
      resetExclusions: [
        'DIM_Usuarios',
        'LOG_Accesos',
        'LOG_Acciones_Usuario'
      ]
    }
  };
}

function invalidateSystemConfigRuntimeCache_() {
  delete GO_PES_RUNTIME.systemConfig;
}

function getRuntimeSystemConfig_() {
  if (GO_PES_RUNTIME.systemConfig) {
    return cloneSystemConfig_(GO_PES_RUNTIME.systemConfig);
  }

  const merged = mergeConfigObjects_(
    getDefaultSystemConfig_(),
    readPersistedSystemConfig_()
  );
  migrateLegacySharedConfig_(merged);
  const normalized = normalizeSystemConfig_(merged);
  GO_PES_RUNTIME.systemConfig = cloneSystemConfig_(normalized);
  return cloneSystemConfig_(normalized);
}

function getRuntimeClientSystemConfig_() {
  const config = getRuntimeSystemConfig_();
  return cloneSystemConfig_({
    general: config.general,
    branding: config.branding,
    accessModules: {
      defaultUserProfile: config.accessModules.defaultUserProfile,
      defaultView: config.accessModules.defaultView,
      alwaysVisibleModules: config.accessModules.alwaysVisibleModules,
      modules: config.accessModules.modules
    },
    socios: {
      addressSuffix: config.socios.addressSuffix,
      allowedRoles: config.socios.allowedRoles,
      requiredManualFields: config.socios.requiredManualFields,
      bulkColumnMap: config.socios.bulkColumnMap,
      dashboardHeight: config.socios.dashboardHeight
    },
    beneficios: config.beneficios,
    alertsInicio: config.alertsInicio,
    integrations: config.integrations,
    technical: {
      maintenanceMode: config.technical.maintenanceMode,
      demoMode: config.technical.demoMode,
      showExtendedLogs: config.technical.showExtendedLogs,
      enableDataReset: config.technical.enableDataReset
    }
  });
}

function getSystemConfigClient() {
  requireRole_(['superuser']);
  return serializeForClient_({
    sectionOrder: getSystemConfigSectionOrder_(),
    config: getRuntimeSystemConfig_(),
    moduleDefinitions: getModuleDefinitions_(),
    clientConfig: getRuntimeClientSystemConfig_()
  });
}

function migrateLegacySharedConfig_(config) {
  if (!config || typeof config !== 'object') return;
  const socios = config.socios || {};
  const integrations = config.integrations || {};
  const legacySociosDashboard = sanitizeUrlValue_(socios.dashboardEmbedUrl, '');
  const canonicalSociosDashboard = sanitizeUrlValue_(integrations.sociosDashboardUrl, '');

  if (!canonicalSociosDashboard && legacySociosDashboard) {
    integrations.sociosDashboardUrl = legacySociosDashboard;
  }

  if (socios && Object.prototype.hasOwnProperty.call(socios, 'dashboardEmbedUrl')) {
    delete socios.dashboardEmbedUrl;
  }

  config.socios = socios;
  config.integrations = integrations;
}

function saveSystemConfigSection(payload) {
  const actor = requireRole_(['superuser']);
  const section = String(payload && payload.section || '').trim();
  if (getSystemConfigSectionOrder_().indexOf(section) === -1) {
    throw new Error('Sección de configuración no válida.');
  }

  const current = getRuntimeSystemConfig_();
  const incoming = payload && payload.data ? payload.data : {};
  const next = cloneSystemConfig_(current);
  next[section] = normalizeConfigSectionByName_(section, incoming, current);

  writeSystemConfigSection_(section, next[section], actor.email);
  invalidateSystemConfigRuntimeCache_();

  logUserAction_('SAVE_SYSTEM_CONFIG_SECTION', 'configuracion', section, 'OK', {
    actor: actor.email
  });

  return serializeForClient_({
    ok: true,
    section: section,
    config: getRuntimeSystemConfig_(),
    clientConfig: getRuntimeClientSystemConfig_(),
    moduleDefinitions: getModuleDefinitions_()
  });
}

function readPersistedSystemConfig_() {
  const sh = ensureSystemConfigSheet_();
  if (!sh || sh.getLastRow() < 2) return {};

  return getSheetData_(GO_PES_V2.SHEETS.CFG_PARAMETROS).reduce(function(acc, row) {
    const section = String(row.config_section || '').trim();
    if (!section) return acc;
    const parsed = parseConfigJsonSafe_(row.value_json);
    if (parsed && typeof parsed === 'object') {
      acc[section] = parsed;
    }
    return acc;
  }, {});
}

function writeSystemConfigSection_(section, value, actorEmail) {
  upsertByKey_(GO_PES_V2.SHEETS.CFG_PARAMETROS, 'config_section', {
    config_section: section,
    value_json: JSON.stringify(value || {}),
    updated_at: new Date(),
    updated_by: actorEmail || 'system'
  }, false);
}

function ensureSystemConfigSheet_() {
  return ensureSheetWithHeaders_(
    GO_PES_V2.SHEETS.CFG_PARAMETROS,
    buildSheetDefinitions_()[GO_PES_V2.SHEETS.CFG_PARAMETROS]
  );
}

function normalizeSystemConfig_(config) {
  const base = getDefaultSystemConfig_();
  const merged = mergeConfigObjects_(base, config || {});
  const current = base;

  return {
    general: normalizeConfigSectionByName_('general', merged.general, current),
    branding: normalizeConfigSectionByName_('branding', merged.branding, current),
    accessModules: normalizeConfigSectionByName_('accessModules', merged.accessModules, current),
    socios: normalizeConfigSectionByName_('socios', merged.socios, current),
    beneficios: normalizeConfigSectionByName_('beneficios', merged.beneficios, current),
    alertsInicio: normalizeConfigSectionByName_('alertsInicio', merged.alertsInicio, current),
    integrations: normalizeConfigSectionByName_('integrations', merged.integrations, current),
    technical: normalizeConfigSectionByName_('technical', merged.technical, current)
  };
}

function normalizeConfigSectionByName_(section, value, current) {
  const defaults = getDefaultSystemConfig_();
  const fallback = defaults[section] || {};
  const previous = (current && current[section]) || fallback;
  const input = (value && typeof value === 'object') ? value : {};

  switch (section) {
    case 'general':
      return {
        appName: sanitizeConfigText_(input.appName, previous.appName),
        appSubtitle: sanitizeConfigText_(input.appSubtitle, previous.appSubtitle),
        programName: sanitizeConfigText_(input.programName, previous.programName),
        environmentLabel: sanitizeConfigText_(input.environmentLabel, previous.environmentLabel).toUpperCase(),
        showVisibleVersion: sanitizeConfigBool_(input.showVisibleVersion, previous.showVisibleVersion),
        loadingText: sanitizeConfigText_(input.loadingText, previous.loadingText),
        splashMinDurationMs: sanitizeConfigNumber_(input.splashMinDurationMs, previous.splashMinDurationMs, 500, 30000)
      };
    case 'branding':
      return {
        logoLightDataUri: sanitizeDataUriValue_(input.logoLightDataUri, previous.logoLightDataUri),
        logoDarkDataUri: sanitizeDataUriValue_(input.logoDarkDataUri, previous.logoDarkDataUri),
        primaryColor: sanitizeColorValue_(input.primaryColor, previous.primaryColor),
        secondaryColor: sanitizeColorValue_(input.secondaryColor, previous.secondaryColor),
        accentColor: sanitizeColorValue_(input.accentColor, previous.accentColor),
        lightBackground: sanitizeColorValue_(input.lightBackground, previous.lightBackground),
        darkBackground: sanitizeColorValue_(input.darkBackground, previous.darkBackground),
        loadingProgressColor: sanitizeColorValue_(input.loadingProgressColor, previous.loadingProgressColor)
      };
    case 'accessModules': {
      const baseModules = getBaseModuleDefinitions_();
      const defaultViewDefs = baseModules.filter(function(module) {
        return module.navVisible !== false && !module.superOnly;
      });
      const rawModules = Array.isArray(input.modules) ? input.modules : previous.modules;
      return {
        allowedDomain: sanitizeDomainValue_(input.allowedDomain, previous.allowedDomain),
        primarySuperuserEmail: getFixedPrimarySuperuserEmail_(),
        defaultUserProfile: sanitizeUserProfileValue_(input.defaultUserProfile, previous.defaultUserProfile),
        defaultView: sanitizeViewKeyValue_(input.defaultView, previous.defaultView, defaultViewDefs),
        alwaysVisibleModules: sanitizeModuleKeyArray_(input.alwaysVisibleModules, previous.alwaysVisibleModules, baseModules),
        modules: normalizeConfiguredModules_(rawModules, baseModules)
      };
    }
    case 'socios':
      return {
        addressSuffix: sanitizeConfigText_(input.addressSuffix, previous.addressSuffix),
        allowedRoles: sanitizeStringList_(input.allowedRoles, previous.allowedRoles),
        requiredManualFields: sanitizeStringList_(input.requiredManualFields, previous.requiredManualFields),
        bulkColumnMap: sanitizeObjectValue_(input.bulkColumnMap, previous.bulkColumnMap),
        dashboardHeight: sanitizeConfigNumber_(input.dashboardHeight, previous.dashboardHeight, 280, 2000)
      };
    case 'beneficios':
      return {
        capacitaciones: {
          annualDefaultCount: sanitizeConfigNumber_(input.capacitaciones && input.capacitaciones.annualDefaultCount, previous.capacitaciones.annualDefaultCount, 0, 99),
          displayName: sanitizeConfigText_(input.capacitaciones && input.capacitaciones.displayName, previous.capacitaciones.displayName),
          allowedStates: sanitizeStringList_(input.capacitaciones && input.capacitaciones.allowedStates, previous.capacitaciones.allowedStates),
          baseEligibilityCondition: sanitizeConfigText_(input.capacitaciones && input.capacitaciones.baseEligibilityCondition, previous.capacitaciones.baseEligibilityCondition)
        },
        fondese: {
          baseYear: sanitizeConfigNumber_(input.fondese && input.fondese.baseYear, previous.fondese.baseYear, 2020, 2100),
          callsPerYear: sanitizeConfigNumber_(input.fondese && input.fondese.callsPerYear, previous.fondese.callsPerYear, 1, 12),
          keyDates: sanitizeKeyDates_(input.fondese && input.fondese.keyDates, previous.fondese.keyDates),
          alertDaysBefore: sanitizeConfigNumber_(input.fondese && input.fondese.alertDaysBefore, previous.fondese.alertDaysBefore, 0, 365),
          baseStates: sanitizeStringList_(input.fondese && input.fondese.baseStates, previous.fondese.baseStates)
        },
        camaras1414: {
          displayName: sanitizeConfigText_(input.camaras1414 && input.camaras1414.displayName, previous.camaras1414.displayName),
          baseStates: sanitizeStringList_(input.camaras1414 && input.camaras1414.baseStates, previous.camaras1414.baseStates),
          technicalVisitAlertDays: sanitizeConfigNumber_(input.camaras1414 && input.camaras1414.technicalVisitAlertDays, previous.camaras1414.technicalVisitAlertDays, 0, 365),
          baseEligibilityCondition: sanitizeConfigText_(input.camaras1414 && input.camaras1414.baseEligibilityCondition, previous.camaras1414.baseEligibilityCondition),
          reminderDaysFromEligibility: sanitizeConfigNumber_(input.camaras1414 && input.camaras1414.reminderDaysFromEligibility, previous.camaras1414.reminderDaysFromEligibility, 0, 365),
          maxDaysToSendRequest: sanitizeConfigNumber_(input.camaras1414 && input.camaras1414.maxDaysToSendRequest, previous.camaras1414.maxDaysToSendRequest, 0, 365),
          maxDaysWithoutVisitResponse: sanitizeConfigNumber_(input.camaras1414 && input.camaras1414.maxDaysWithoutVisitResponse, previous.camaras1414.maxDaysWithoutVisitResponse, 0, 365),
          maxDaysPostVisitFollowup: sanitizeConfigNumber_(input.camaras1414 && input.camaras1414.maxDaysPostVisitFollowup, previous.camaras1414.maxDaysPostVisitFollowup, 0, 365),
          maxDaysToConvenio: sanitizeConfigNumber_(input.camaras1414 && input.camaras1414.maxDaysToConvenio, previous.camaras1414.maxDaysToConvenio, 0, 365),
          maxDaysWithoutProgress: sanitizeConfigNumber_(input.camaras1414 && input.camaras1414.maxDaysWithoutProgress, previous.camaras1414.maxDaysWithoutProgress, 0, 365),
          alertHighDays: sanitizeConfigNumber_(input.camaras1414 && input.camaras1414.alertHighDays, previous.camaras1414.alertHighDays, 0, 365),
          alertMediumDays: sanitizeConfigNumber_(input.camaras1414 && input.camaras1414.alertMediumDays, previous.camaras1414.alertMediumDays, 0, 365)
        }
      };
    case 'alertsInicio':
      return {
        alertHighDays: sanitizeConfigNumber_(input.alertHighDays, previous.alertHighDays, 0, 365),
        alertMediumDays: sanitizeConfigNumber_(input.alertMediumDays, previous.alertMediumDays, 0, 365),
        maxVisibleAlerts: sanitizeConfigNumber_(input.maxVisibleAlerts, previous.maxVisibleAlerts, 1, 50),
        maxUpcomingAssemblies: sanitizeConfigNumber_(input.maxUpcomingAssemblies, previous.maxUpcomingAssemblies, 1, 50),
        homeBlocksOrder: sanitizeStringList_(input.homeBlocksOrder, previous.homeBlocksOrder),
        homeBlocksVisibility: sanitizeObjectBooleanMap_(input.homeBlocksVisibility, previous.homeBlocksVisibility),
        leftPanelDefaults: sanitizeStringList_(input.leftPanelDefaults, previous.leftPanelDefaults)
      };
    case 'integrations':
      return {
        homeDashboardUrl: sanitizeUrlValue_(input.homeDashboardUrl, previous.homeDashboardUrl),
        sociosDashboardUrl: sanitizeUrlValue_(input.sociosDashboardUrl, previous.sociosDashboardUrl),
        futureReports: sanitizeStringList_(input.futureReports, previous.futureReports),
        googleCalendarId: sanitizeConfigText_(input.googleCalendarId, previous.googleCalendarId),
        externalLinks: sanitizeStringList_(input.externalLinks, previous.externalLinks)
      };
    case 'technical':
      return {
        maintenanceMode: sanitizeConfigBool_(input.maintenanceMode, previous.maintenanceMode),
        demoMode: sanitizeConfigBool_(input.demoMode, previous.demoMode),
        showExtendedLogs: sanitizeConfigBool_(input.showExtendedLogs, previous.showExtendedLogs),
        enableDataReset: sanitizeConfigBool_(input.enableDataReset, previous.enableDataReset),
        resetExclusions: sanitizeStringList_(input.resetExclusions, previous.resetExclusions)
      };
    default:
      return cloneSystemConfig_(fallback);
  }
}

function normalizeConfiguredModules_(rawModules, baseModules) {
  const defs = baseModules || getBaseModuleDefinitions_();
  const incomingMap = (Array.isArray(rawModules) ? rawModules : []).reduce(function(acc, row) {
    const key = normalizeModuleKey_(row && row.key);
    if (key) acc[key] = row;
    return acc;
  }, {});

  return defs.map(function(base) {
    const incoming = incomingMap[base.key] || {};
    const state = base.superOnly
      ? 'active'
      : sanitizeModuleState_(incoming.state, base.state || 'active');
    return {
      key: base.key,
      label: sanitizeConfigText_(incoming.label, base.label),
      order: sanitizeConfigNumber_(incoming.order, base.order || 0, 1, 999),
      state: state
    };
  }).sort(function(a, b) {
    return Number(a.order || 0) - Number(b.order || 0);
  });
}

function getConfiguredAppTitle_() {
  return getRuntimeSystemConfig_().general.appName;
}

function getConfiguredAppSubtitle_() {
  const general = getRuntimeSystemConfig_().general;
  return [general.programName, general.appSubtitle].filter(Boolean).join(' · ');
}

function getConfiguredProgramName_() {
  return getRuntimeSystemConfig_().general.programName;
}

function getConfiguredEnvironmentLabel_() {
  return getRuntimeSystemConfig_().general.environmentLabel || '';
}

function shouldShowVisibleVersion_() {
  return !!getRuntimeSystemConfig_().general.showVisibleVersion;
}

function getConfiguredLoadingText_() {
  return getRuntimeSystemConfig_().general.loadingText || 'Iniciando Gestor Operativo';
}

function getConfiguredSplashMinDurationMs_() {
  return getRuntimeSystemConfig_().general.splashMinDurationMs || 5000;
}

function getConfiguredAllowedDomains_() {
  const configured = String(getRuntimeSystemConfig_().accessModules.allowedDomain || '').trim().toLowerCase();
  return uniqueConfigList_([configured].concat(GO_PES_V2.TRUSTED_DOMAINS || []));
}

function getConfiguredPrimarySuperuserEmail_() {
  return getFixedPrimarySuperuserEmail_();
}

function getConfiguredDefaultManagedProfile_() {
  return sanitizeUserProfileValue_(getRuntimeSystemConfig_().accessModules.defaultUserProfile, 'operador');
}

function getConfiguredDefaultView_() {
  const defs = getModuleDefinitions_().filter(function(def) {
    return def.navVisible !== false && !def.superOnly && def.enabled !== false;
  });
  return sanitizeViewKeyValue_(getRuntimeSystemConfig_().accessModules.defaultView, 'inicio', defs);
}

function getConfiguredAlwaysVisibleModules_() {
  return sanitizeModuleKeyArray_(
    getRuntimeSystemConfig_().accessModules.alwaysVisibleModules,
    ['inicio'],
    getBaseModuleDefinitions_()
  );
}

function getConfiguredHomeDashboardUrl_() {
  return getRuntimeSystemConfig_().integrations.homeDashboardUrl || '';
}

function getConfiguredSociosDashboardUrl_() {
  return getRuntimeSystemConfig_().integrations.sociosDashboardUrl || '';
}

function getConfiguredSociosDashboardHeight_() {
  return getRuntimeSystemConfig_().socios.dashboardHeight || 443;
}

function getConfiguredSocioCargos_() {
  return sanitizeStringList_(getRuntimeSystemConfig_().socios.allowedRoles, []);
}

function canShowResetDataButton_() {
  return !!getRuntimeSystemConfig_().technical.enableDataReset;
}

function getConfiguredLogoDataUri_(theme) {
  const branding = getRuntimeSystemConfig_().branding || {};
  const preferred = String(theme || '').toLowerCase() === 'dark'
    ? branding.logoDarkDataUri || branding.logoLightDataUri
    : branding.logoLightDataUri || branding.logoDarkDataUri;
  return preferred || getLogoDataUri_();
}

function getConfiguredThemeTokens_() {
  const branding = getRuntimeSystemConfig_().branding || {};
  return {
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    lightBackground: branding.lightBackground,
    darkBackground: branding.darkBackground,
    loadingProgressColor: branding.loadingProgressColor
  };
}

function mergeConfigObjects_(base, extra) {
  const output = cloneSystemConfig_(base || {});
  Object.keys(extra || {}).forEach(function(key) {
    const value = extra[key];
    if (Array.isArray(value)) {
      output[key] = value.slice();
      return;
    }
    if (value && typeof value === 'object') {
      output[key] = mergeConfigObjects_(output[key] || {}, value);
      return;
    }
    output[key] = value;
  });
  return output;
}

function cloneSystemConfig_(value) {
  return JSON.parse(JSON.stringify(value == null ? {} : value));
}

function parseConfigJsonSafe_(value) {
  if (!value) return {};
  try {
    return JSON.parse(String(value));
  } catch (err) {
    return {};
  }
}

function sanitizeConfigText_(value, fallback) {
  const text = String(value == null ? '' : value).trim();
  return text || String(fallback == null ? '' : fallback).trim();
}

function sanitizeConfigBool_(value, fallback) {
  if (value === true || value === false) return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  if (!normalized) return !!fallback;
  if (['true', 'si', 'sí', 'yes', 'on', 'activo'].indexOf(normalized) !== -1) return true;
  if (['false', 'no', 'off', 'inactivo'].indexOf(normalized) !== -1) return false;
  return !!fallback;
}

function sanitizeConfigNumber_(value, fallback, min, max) {
  const num = Number(value);
  const safe = isFinite(num) ? num : Number(fallback);
  const boundedMin = isFinite(min) ? min : safe;
  const boundedMax = isFinite(max) ? max : safe;
  return Math.min(boundedMax, Math.max(boundedMin, Math.round(safe)));
}

function sanitizeColorValue_(value, fallback) {
  const text = String(value == null ? '' : value).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(text) || /^#[0-9a-fA-F]{3}$/.test(text)) return text;
  return String(fallback || '').trim();
}

function sanitizeDataUriValue_(value, fallback) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return String(fallback || '').trim();
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(text)) return text;
  if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length > 64) {
    return 'data:image/png;base64,' + text.replace(/\s+/g, '');
  }
  return String(fallback || '').trim();
}

function sanitizeDomainValue_(value, fallback) {
  const normalized = String(value == null ? '' : value).trim().toLowerCase().replace(/^@+/, '');
  return normalized || String(fallback || 'providencia.cl').trim().toLowerCase();
}

function sanitizeEmailValue_(value, fallback) {
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return normalized;
  return String(fallback || '').trim().toLowerCase();
}

function sanitizeUserProfileValue_(value, fallback) {
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  if (['visor', 'operador', 'coordinador'].indexOf(normalized) !== -1) return normalized;
  return String(fallback || 'operador').trim().toLowerCase() || 'operador';
}

function sanitizeModuleState_(value, fallback) {
  const normalized = String(value == null ? '' : value).trim().toLowerCase();
  if (['active', 'hidden', 'development'].indexOf(normalized) !== -1) return normalized;
  return String(fallback || 'active').trim().toLowerCase() || 'active';
}

function sanitizeViewKeyValue_(value, fallback, defs) {
  const allowed = (defs || getBaseModuleDefinitions_()).reduce(function(acc, item) {
    const key = item.key || '';
    const view = item.view || key;
    if (key) acc[key] = view;
    if (view) acc[view] = view;
    return acc;
  }, {});
  const normalized = normalizeModuleKey_(value);
  if (normalized && allowed[normalized]) return allowed[normalized];
  const fallbackNormalized = normalizeModuleKey_(fallback);
  if (fallbackNormalized && allowed[fallbackNormalized]) return allowed[fallbackNormalized];
  return 'inicio';
}

function sanitizeStringList_(value, fallback) {
  if (Array.isArray(value)) {
    return uniqueConfigList_(value);
  }
  const text = String(value == null ? '' : value).trim();
  if (!text) return uniqueConfigList_(fallback || []);
  return uniqueConfigList_(text.split(/\r?\n|,/));
}

function sanitizeObjectValue_(value, fallback) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value).reduce(function(acc, key) {
      const cleanKey = String(key || '').trim();
      if (!cleanKey) return acc;
      acc[cleanKey] = String(value[key] == null ? '' : value[key]).trim();
      return acc;
    }, {});
  }
  return cloneSystemConfig_(fallback || {});
}

function sanitizeObjectBooleanMap_(value, fallback) {
  const source = (value && typeof value === 'object' && !Array.isArray(value))
    ? value
    : (fallback || {});
  return Object.keys(source).reduce(function(acc, key) {
    acc[key] = sanitizeConfigBool_(source[key], false);
    return acc;
  }, {});
}

function sanitizeKeyDates_(value, fallback) {
  const rows = Array.isArray(value) ? value : (fallback || []);
  return rows.map(function(item, index) {
    const base = fallback && fallback[index] ? fallback[index] : {};
    return {
      key: sanitizeConfigText_(item && item.key, base.key || ('fecha_' + (index + 1))),
      label: sanitizeConfigText_(item && item.label, base.label || ('Fecha ' + (index + 1))),
      date: sanitizeDateString_(item && item.date, base.date || '')
    };
  });
}

function sanitizeDateString_(value, fallback) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return String(fallback || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return String(fallback || '').trim();
}

function sanitizeUrlValue_(value, fallback) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return String(fallback || '').trim();
  if (/^https?:\/\//i.test(text)) return text;
  return String(fallback || '').trim();
}

function sanitizeModuleKeyArray_(value, fallback, defs) {
  const allowed = (defs || getBaseModuleDefinitions_()).map(function(item) { return item.key; });
  const list = sanitizeStringList_(value, fallback || []);
  return uniqueConfigList_(list.map(normalizeModuleKey_)).filter(function(item) {
    return allowed.indexOf(item) !== -1;
  });
}

function uniqueConfigList_(values) {
  const seen = {};
  return (values || []).map(function(item) {
    return String(item == null ? '' : item).trim();
  }).filter(function(item) {
    if (!item) return false;
    if (seen[item]) return false;
    seen[item] = true;
    return true;
  });
}
