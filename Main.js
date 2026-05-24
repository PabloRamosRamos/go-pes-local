/**
 * Bootstrap y entrypoints principales de la Web App container-bound.
 */
const GO_PES_V2 = {
  APP_NAME: 'GO-PES',
  PROGRAM_TITLE: 'Gestor Operativo PES',
  SUBTITLE: 'Programa Estamos Seguros · Municipalidad de Providencia',
  VERSION: '2.1.0-modular',
  ENVIRONMENT: '',
  SUPERUSERS: [
    'pablo.ramos@providencia.cl'
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
    LOG_ACCIONES: 'LOG_Acciones_Usuario',

    LEGACY_FORM: 'Respuestas de formulario 1',
    LEGACY_AVANCE: 'AVANCE',
    LEGACY_CSV: 'CSV',
    LEGACY_FONDESE: 'FONDESE',
    LEGACY_SOCIOS: 'SOCIOS'
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
  TRUSTED_DOMAIN_AUTO_ACTIVE: false,
  DEFAULT_VIEW: 'inicio'
};

function doGet(e) {
  const clientConfig = getRuntimeClientSystemConfig_();
  const template = HtmlService.createTemplateFromFile('Index');
  template.bootstrap = JSON.stringify(buildBootstrapForTemplate_(e));
  template.logoDataUri = getConfiguredLogoDataUri_('light');
  template.logoDarkDataUri = getConfiguredLogoDataUri_('dark');
  template.systemConfigJson = JSON.stringify(clientConfig);

  return template.evaluate()
    .setTitle(getConfiguredAppTitle_())
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GO-PES v2')
    .addItem('Abrir Gestor Operativo', 'openGoPesV2_')
    .addSeparator()
    .addItem('Configurar motor operativo', 'setupMotorOperativoPES')
    .addItem('Migrar histórico legacy', 'migrarHistoricoLegacy')
    .addItem('Reconstruir estructuras desde RAW', 'reconstruirEstructurasDesdeRaw')
    .addItem('Refrescar catálogos sugeridos', 'refrescarCatalogosSugeridos')
    .addItem('Reconstruir vistas y master', 'goPesRefrescarVistasYMaster')
    .addItem('Inicializar superUsers', 'goPesSeedSuperUsers_')
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
  return setupMotorOperativoPES_();
}

function setupMotorOperativoPES_() {
  ensureGoPesV2Sheets_();
  seedGoPesV2Catalogs_();
  seedSuperUsers_();
  rebuildSuggestionDims_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Motor operativo configurado.', 'GO-PES', 5);
}

function migrarHistoricoLegacy() {
  return migrarHistoricoLegacy_();
}

function reconstruirEstructurasDesdeRaw() {
  return reconstruirEstructurasDesdeRaw_();
}

function refrescarCatalogosSugeridos() {
  return rebuildSuggestionDims_();
}

function goPesSeedSuperUsers_() {
  seedSuperUsers_();
  SpreadsheetApp.getActiveSpreadsheet().toast('SuperUsers inicializados.', 'GO-PES', 4);
}

function buildBootstrapForTemplate_(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const config = getRuntimeClientSystemConfig_();
  const user = getUsuarioActual();
  const permissions = buildPermissionMap_(user);
  const buildInfo = getAppBuildInfo_();
  const requestedView = normalizeModuleKey_(params.view || getConfiguredDefaultView_()) || getConfiguredDefaultView_();
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
    initialView: initialView,
    query: params,
    user: user,
    permissions: permissions,
    moduleDefinitions: getModuleDefinitions_()
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
    user: user,
    permissions: buildPermissionMap_(user),
    views: GO_PES_V2.VIEWS,
    moduleDefinitions: getModuleDefinitions_(),
    catalogs: {}
  });
}

function getAppVersionLabel_(buildInfo) {
  const info = buildInfo || getAppBuildInfo_();
  return [
    info.baseVersion ? `v${info.baseVersion}` : '',
    info.buildHash ? `build ${info.buildHash}` : '',
    info.updatedAtLabel || ''
  ].filter(Boolean).join(' · ');
}

function getAppBuildInfo_() {
  const updatedAt = getProjectLastUpdated_();
  return {
    baseVersion: String(GO_PES_V2.VERSION || '').trim(),
    buildHash: buildProjectFingerprint_(),
    updatedAtIso: updatedAt ? updatedAt.toISOString() : '',
    updatedAtLabel: updatedAt ? formatBuildTimestamp_(updatedAt) : ''
  };
}

function getProjectLastUpdated_() {
  try {
    const scriptId = ScriptApp.getScriptId();
    if (!scriptId) return null;
    return DriveApp.getFileById(scriptId).getLastUpdated();
  } catch (err) {
    return null;
  }
}

function buildProjectFingerprint_() {
  const payload = [
    JSON.stringify(GO_PES_V2),
    getProjectHtmlFingerprintSources_(),
    getProjectServerFingerprintSources_()
  ].join('\n---\n');
  return computeBuildHash_(payload);
}

function getProjectHtmlFingerprintSources_() {
  const partials = ['Index', 'Styles', 'ThemeDark', 'Splash', 'Loading', 'Inicio', 'Scripts'];
  return partials.map(function(name) {
    try {
      return `## ${name}\n${HtmlService.createHtmlOutputFromFile(name).getContent()}`;
    } catch (err) {
      return `## ${name}\n`;
    }
  }).join('\n');
}

function getProjectServerFingerprintSources_() {
  const scope = getProjectGlobalScope_();
  return Object.keys(scope || {})
    .filter(function(name) {
      return isProjectFunctionForBuild_(name, scope[name]);
    })
    .sort()
    .map(function(name) {
      return `## ${name}\n${String(scope[name])}`;
    })
    .join('\n');
}

function getProjectGlobalScope_() {
  return Function('return this;')();
}

function isProjectFunctionForBuild_(name, fn) {
  if (typeof fn !== 'function') return false;
  if (!/^[A-Za-z0-9_]+$/.test(String(name || ''))) return false;
  const source = String(fn);
  return !!source && !/\[native code\]/.test(source);
}

function computeBuildHash_(value) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''), Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return normalized.toString(16).padStart(2, '0');
  }).join('').slice(0, 8);
}

function formatBuildTimestamp_(date) {
  const tz = Session.getScriptTimeZone() || 'America/Santiago';
  return Utilities.formatDate(date, tz, 'yyyyMMdd-HHmm');
}

function getAppVersionLabelLegacy_() {
  const version = String(GO_PES_V2.VERSION || '').trim();
  const environment = String(GO_PES_V2.ENVIRONMENT || '').trim().toUpperCase();
  return [version ? `v${version}` : '', environment].filter(Boolean).join(' · ');
}

function fijarSpreadsheetPES_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abre el spreadsheet contenedor antes de ejecutar esta función.');

  PropertiesService.getScriptProperties().setProperty('GO_PES_SPREADSHEET_ID', ss.getId());
  Logger.log('GO_PES_SPREADSHEET_ID = ' + ss.getId());
}

function fijarSpreadsheetPES() {
  fijarSpreadsheetPES_();
}

function debugFichaUi(){
  return {
    ok: true,
    availableViews: GO_PES_V2.VIEWS,
    defaultView: GO_PES_V2.DEFAULT_VIEW
  };
}
