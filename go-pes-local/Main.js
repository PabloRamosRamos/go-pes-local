/**
 * Bootstrap y entrypoints principales de la Web App container-bound.
 */
const GO_PES_V2 = {
  APP_NAME: 'GO-PES',
  PROGRAM_TITLE: 'Gestor Operativo PES',
  SUBTITLE: 'Programa Estamos Seguros · Municipalidad de Providencia',
  VERSION: '2.1.901',
  BUILD: '568691e',
  BUILD_DATE: '20260611',
  ENVIRONMENT: 'DEV',
  SUPERUSERS: [
    'pablo.ramos@providencia.cl',
    'p.e.ramos.ramos@gmail.com'
  ],
  TRUSTED_DOMAINS: ['providencia.cl'],
  COLORS: {
    green: '#007C4A',
    blue: '#214E8A',
    ink: '#24364B',
    slate: '#EAF0F5',
    border: '#D6E0EA',
    bg: '#F7FAFC'
  },
  SHEETS: {
    RAW_INGRESO: 'RAW_Formulario_Ingreso',
    RAW_SEGUIMIENTO: 'RAW_Gestion_Casos',
    RAW_ORGANIZACIONES: 'RAW_Organizaciones',
    RAW_INSTRUMENTOS: 'RAW_Instrumentos',
    RAW_REQUISITOS: 'RAW_Requisitos_Instrumento',
    RAW_SOCIOS: 'RAW_Socios',

    MAE_CASOS: 'MAE_Casos',
    MAE_ORGANIZACIONES: 'MAE_Organizaciones',
    FACT_HITOS: 'FACT_Hitos',
    FACT_INSTRUMENTOS: 'FACT_Instrumentos_Organizacion',
    FACT_REQUISITOS: 'FACT_Requisitos_Instrumento',
    FACT_SOCIOS: 'FACT_Socios',
    FACT_BENEFICIOS_DETALLE: 'FACT_Beneficios_Detalle',
    FACT_BENEFICIOS_HITOS: 'FACT_Beneficios_Hitos',
    FACT_BENEFICIOS_ORG: 'FACT_Beneficios_Organizacion',
    FACT_BENEFICIOS_ORG_HITOS: 'FACT_Beneficios_Organizacion_Hitos',
    FACT_AVANCE_HITOS: 'FACT_Avance_Hitos',
    FACT_AVANCE_ESTADO: 'FACT_Avance_Estado',
    FACT_FONDESE: 'FACT_Fondese',
    CFG_FONDESE_EDICIONES: 'CFG_FONDESE_Ediciones',
    FACT_FORM_EVENTOS: 'FACT_Form_Eventos',
    FACT_FORM_INSCRIPCIONES: 'FACT_Form_Inscripciones',
    CAT_HITOS_AVANCE: 'CAT_Hitos_Avance',
    VW_AVANCE_ORGANIZACION: 'VW_Avance_Organizacion',

    MASTER: 'MASTER_DATOS',
    VW_ORGS: 'VW_LS_Organizaciones',
    VW_INSTR: 'VW_LS_Instrumentos',
    VW_TERR: 'VW_LS_Territorial',

    DIM_USUARIOS: 'DIM_Usuarios',
    DIM_TERRITORIO: 'DIM_Territorio',
    DIM_ESTADOS: 'DIM_Estados',
    DIM_ETAPAS: 'DIM_Etapas_Constitucion',
    DIM_ORIGEN: 'DIM_Origen_Canal',
    DIM_BENEFICIOS: 'DIM_Beneficios',
    DIM_INSTRUMENTOS: 'DIM_Instrumentos',
    DIM_REQUISITOS: 'DIM_Requisitos_Instrumento',
    DIM_RESPONSABLES: 'DIM_Responsables',
    DIM_CARGOS: 'DIM_Cargos_Socios',
    DIM_ORG_SUG: 'DIM_Organizaciones_Sugeridas',
    DIM_VEC_SUG: 'DIM_Vecinos_Sugeridos',
    DIM_SOL_SUG: 'DIM_Solicitudes_Sugeridas',
    CFG_PARAMETROS: 'CFG_Parametros',

    LOG_PROC: 'LOG_Procesamiento',
    LOG_ACCESOS: 'LOG_Accesos',
    LOG_ACCIONES: 'LOG_Acciones_Usuario'
  },
  VIEWS: {
    HOME: 'inicio',
    SEARCH: 'buscar',
    PROFILE: 'ficha',
    NEW_INGRESO: 'nuevo-ingreso',
    AVANCE: 'avance',
    ORGANIZACION: 'organizacion',
    INSTRUMENTO: 'instrumento',
    SOCIOS: 'socios',
    HISTORIAL: 'historial',
    USERS: 'usuarios',
    CONFIG: 'configuracion'
  },
  ROLES: ['visor', 'operador', 'coordinador', 'superuser'],
  AVANCE: {
    TRAMOS: ['Preconstitución', 'Formalización posterior'],
    ESTADOS: ['Activo', 'Stand by', 'Detenido', 'Finalizado']
  },
  ALERTAS: {
    CONFIG_SECTION: 'alertas_operativas',
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutos
    TIPOS: { DANGER: 'danger', WARNING: 'warning', INFO: 'info' },
    AREAS: { FORMALIZACION: 'formalizacion', BENEFICIOS: 'beneficios' },
    HITOS: {
      PRE_04: 'PRE_04',
      PRE_05: 'PRE_05',
      PRE_07: 'PRE_07',
      PRE_08: 'PRE_08',
      PRE_09: 'PRE_09',
      PRE_10: 'PRE_10',
      PRE_11: 'PRE_11'
    },
    ALERTAS_IDS: {
      FORM_HITO4A5: 'form_hito4a5',
      FORM_HITO5A9: 'form_hito5a9',
      FORM_HITO8ANTES9: 'form_hito8antes9',
      FORM_HITO7POST5: 'form_hito7post5',
      FORM_HITO11POST10: 'form_hito11post10',
      BEN_CAMARAS_POST_CERT: 'ben_camaras_post_cert'
    }
  },
  DASHBOARD: {
    HITOS_VISIBLES: [2, 4, 7, 11, 12, 13, 14, 15],
    HITO_COMITE_COMPLETO: 11,
    HITO_ASAMBLEA: 3,
    CACHE_TTL_MS: 3 * 60 * 1000 // 3 minutos
  },
  TRUSTED_DOMAIN_AUTO_ACTIVE: false,
  DEFAULT_VIEW: 'inicio',

  // Actualizar al subir versión significativa
  DEV_STATS: {
    linesOfCode:   34000,
    devHours:      540,
    sourceFiles:   37,
    apiEndpoints:  99,
    testCases:     249,
    hourlyRateCLP: 32000,
    ufValueCLP:    39500,
    usdRateCLP:    940
  }
};

function doGet(e) {
  const clientConfig = getRuntimeClientSystemConfig_();
  const template = HtmlService.createTemplateFromFile('Index');
  template.bootstrap = JSON.stringify(buildBootstrapForTemplate_(e));
  template.logoDataUri = getConfiguredLogoDataUri_('light');
  template.logoDarkDataUri = getConfiguredLogoDataUri_('dark');
  template.faviconDataUri = getFaviconDataUri_();
  template.systemConfigJson = JSON.stringify(clientConfig);

  return template.evaluate()
    .setTitle(getConfiguredAppTitle_())
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createTemplateFromFile(filename).getRawContent();
}

function includeModule_(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GO-PES v2')
    .addItem('Abrir Gestor Operativo', 'openGoPesV2_')
    .addSeparator()
    .addItem('Configurar motor operativo', 'setupMotorOperativoPES')
    .addItem('Reconstruir estructuras desde RAW', 'reconstruirEstructurasDesdeRaw')
    .addItem('Refrescar catálogos sugeridos', 'refrescarCatalogosSugeridos')
    .addItem('Reconstruir vistas y master', 'goPesRefrescarVistasYMaster')
    .addItem('Inicializar superUsers', 'goPesSeedSuperUsers')
    .addSeparator()
    .addItem('Ejecutar tests', 'goPesRunAllTests')
    .addToUi();
}

function openGoPesV2_() {
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert('Primero debes desplegar la Web App. Luego vuelve a intentar.');
    return;
  }
  const html = HtmlService.createHtmlOutput(
    `<script>window.open('${url}','_blank');google.script.host.close();</script>`
  ).setWidth(10).setHeight(10);
  SpreadsheetApp.getUi().showModalDialog(html, 'Abriendo GO-PES');
}

function setupMotorOperativoPES() {
  requireRole_(['superuser']);
  return setupMotorOperativoPES_();
}

function setupMotorOperativoPES_() {
  ensureGoPesV2Sheets_();
  seedGoPesV2Catalogs_();
  seedSuperUsers_();
  rebuildSuggestionDims_();
  goPesSetupFormacionAutoCloseTrigger_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Motor operativo configurado.', 'GO-PES', 5);
}

function goPesSetupFormacionAutoCloseTrigger_() {
  var triggers = ScriptApp.getProjectTriggers();
  var exists = triggers.some(function(t) {
    return t.getHandlerFunction() === 'goPesAutoCloseFormEventos';
  });
  if (!exists) {
    ScriptApp.newTrigger('goPesAutoCloseFormEventos')
      .timeBased()
      .everyHours(1)
      .create();
  }
}

function reconstruirEstructurasDesdeRaw() {
  requireRole_(['superuser']);
  return reconstruirEstructurasDesdeRaw_();
}

function refrescarCatalogosSugeridos() {
  requireRole_(['superuser']);
  return rebuildSuggestionDims_();
}

function goPesSeedSuperUsers() {
  requireRole_(['superuser']);
  seedSuperUsers_();
  SpreadsheetApp.getActiveSpreadsheet().toast('SuperUsers inicializados.', 'GO-PES', 4);
}

function buildBootstrapForTemplate_(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const config = getRuntimeClientSystemConfig_();
  const user = getUsuarioActual();
  const permissions = buildPermissionMap_(user);
  const buildInfo = getAppBuildInfo_();
  const userPrefs = getUserPreferences();

  const hasExplicitView = !!(params.view && String(params.view).trim());
  const explicitOrDefault = normalizeModuleKey_(params.view || getConfiguredDefaultView_()) || getConfiguredDefaultView_();
  const savedDefault = !hasExplicitView && userPrefs && userPrefs.goDefaultModule
    ? normalizeModuleKey_(userPrefs.goDefaultModule)
    : '';
  const requestedView = (savedDefault && (permissions.modules || {})[savedDefault])
    ? savedDefault
    : explicitOrDefault;

  const initialView = user.canAccess && (permissions.modules || {})[requestedView]
    ? requestedView
    : getFirstAllowedView_(permissions);

  logAccess_('OPEN_APP', params);

  return {
    appName: config.general.appName || GO_PES_V2.APP_NAME,
    programTitle: config.general.programName || GO_PES_V2.PROGRAM_TITLE,
    programName: config.general.programName || GO_PES_V2.PROGRAM_TITLE,
    subtitle: getConfiguredAppSubtitle_(),
    loadingText: getConfiguredLoadingText_(),
    splashMinDurationMs: getConfiguredSplashMinDurationMs_(),
    version: buildInfo.baseVersion,
    environment: getConfiguredEnvironmentLabel_(),
    buildInfo: buildInfo,
    versionLabel: getAppVersionLabel_(buildInfo),
    colors: GO_PES_V2.COLORS,
    systemConfig: config,
    moduleAliasMap: getModuleKeyAliasMap_(),
    initialView: initialView,
    query: params,
    user: user,
    permissions: permissions,
    moduleDefinitions: getModuleDefinitions_(),
    userPreferences: userPrefs
  };
}

function getFirstAllowedView_(permissions) {
  const modules = (permissions && permissions.modules) || {};
  const priority = getModuleDefinitions_()
    .filter(function(def) {
      return def.navVisible !== false && def.enabled !== false;
    })
    .map(function(def) { return def.view || def.key; });
  const configuredDefault = getConfiguredDefaultView_();
  if (priority.indexOf(configuredDefault) === -1) {
    priority.unshift(configuredDefault);
  }
  for (var i = 0; i < priority.length; i++) {
    if (modules[priority[i]]) return priority[i];
  }
  return modules.inicio ? 'inicio' : configuredDefault;
}

function getAppBootstrap() {
  const config = getRuntimeClientSystemConfig_();
  const user = getUsuarioActual();
  const buildInfo = getAppBuildInfo_();
  return serializeForClient_({
    appName: config.general.appName || GO_PES_V2.APP_NAME,
    programTitle: config.general.programName || GO_PES_V2.PROGRAM_TITLE,
    programName: config.general.programName || GO_PES_V2.PROGRAM_TITLE,
    subtitle: getConfiguredAppSubtitle_(),
    loadingText: getConfiguredLoadingText_(),
    splashMinDurationMs: getConfiguredSplashMinDurationMs_(),
    version: buildInfo.baseVersion,
    environment: getConfiguredEnvironmentLabel_(),
    buildInfo: buildInfo,
    versionLabel: getAppVersionLabel_(buildInfo),
    colors: GO_PES_V2.COLORS,
    systemConfig: config,
    moduleAliasMap: getModuleKeyAliasMap_(),
    user: user,
    permissions: buildPermissionMap_(user),
    views: GO_PES_V2.VIEWS,
    moduleDefinitions: getModuleDefinitions_(),
    userPreferences: getUserPreferences(),
    catalogs: {}
  });
}

function getAppVersionLabel_(buildInfo) {
  const info = buildInfo || getAppBuildInfo_();
  return [
    info.baseVersion ? `v${info.baseVersion}` : '',
    info.buildHash ? `build ${info.buildHash}` : '',
    info.buildDate || ''
  ].filter(Boolean).join(' Â· ');
}

function getAppBuildInfo_() {
  return {
    baseVersion: String(GO_PES_V2.VERSION || '').trim(),
    buildHash: String(GO_PES_V2.BUILD || '').trim(),
    buildDate: String(GO_PES_V2.BUILD_DATE || '').trim(),
    updatedAtIso: ''
  };
}

function getAppVersionLabelLegacy_() {
  const version = String(GO_PES_V2.VERSION || '').trim();
  const environment = String(GO_PES_V2.ENVIRONMENT || '').trim().toUpperCase();
  return [version ? `v${version}` : '', environment].filter(Boolean).join(' Â· ');
}

function fijarSpreadsheetPES_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abre el spreadsheet contenedor antes de ejecutar esta funciÃ³n.');

  PropertiesService.getScriptProperties().setProperty('GO_PES_SPREADSHEET_ID', ss.getId());
  Logger.log('GO_PES_SPREADSHEET_ID = ' + ss.getId());
}

function fijarSpreadsheetPES() {
  requireRole_(['superuser']);
  fijarSpreadsheetPES_();
}

function debugFichaUi(){
  return {
    ok: true,
    availableViews: GO_PES_V2.VIEWS,
    defaultView: GO_PES_V2.DEFAULT_VIEW
  };
}
