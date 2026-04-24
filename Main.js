/**
 * Bootstrap y entrypoints principales de la Web App container-bound.
 */
const GO_PES_V2 = {
  APP_NAME: 'GO-PES',
  PROGRAM_TITLE: 'Gestor Operativo PES',
  SUBTITLE: 'Programa Estamos Seguros · Municipalidad de Providencia',
  VERSION: '2.1.0-modular',
  SUPERUSERS: [
    'pablo.ramos@providencia.cl',
    'p.e.ramos.ramos@gmail.com'
  ],
  TRUSTED_DOMAINS: ['providencia.cl', 'gmail.com'],
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

    MASTER: 'MASTER_DATOS',
    VW_ORGS: 'VW_LS_Organizaciones',
    VW_INSTR: 'VW_LS_Instrumentos',
    VW_TERR: 'VW_LS_Territorial',

    DIM_USUARIOS: 'DIM_Usuarios',
    DIM_TERRITORIO: 'DIM_Territorio',
    DIM_ESTADOS: 'DIM_Estados',
    DIM_ETAPAS: 'DIM_Etapas_Constitucion',
    DIM_ORIGEN: 'DIM_Origen_Canal',
    DIM_INSTRUMENTOS: 'DIM_Instrumentos',
    DIM_REQUISITOS: 'DIM_Requisitos_Instrumento',
    DIM_RESPONSABLES: 'DIM_Responsables',
    DIM_CARGOS: 'DIM_Cargos_Socios',
    DIM_ORG_SUG: 'DIM_Organizaciones_Sugeridas',
    DIM_VEC_SUG: 'DIM_Vecinos_Sugeridos',
    DIM_SOL_SUG: 'DIM_Solicitudes_Sugeridas',

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
    SEGUIMIENTO: 'seguimiento',
    ORGANIZACION: 'organizacion',
    INSTRUMENTO: 'instrumento',
    REQUISITO: 'requisito',
    SOCIOS: 'socios',
    HISTORIAL: 'historial',
    USERS: 'usuarios'
  },
  ROLES: ['operador', 'coordinador', 'administrador', 'superuser'],
  TRUSTED_DOMAIN_AUTO_ACTIVE: true,
  DEFAULT_VIEW: 'inicio'
};

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.bootstrap = JSON.stringify(buildBootstrapForTemplate_(e));
  template.logoDataUri = getLogoDataUri_();

  return template.evaluate()
    .setTitle(GO_PES_V2.PROGRAM_TITLE)
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
  const user = getUsuarioActual();

  logAccess_('OPEN_APP', params);

  return {
    appName: GO_PES_V2.APP_NAME,
    programTitle: GO_PES_V2.PROGRAM_TITLE,
    subtitle: GO_PES_V2.SUBTITLE,
    version: GO_PES_V2.VERSION,
    colors: GO_PES_V2.COLORS,
    initialView: params.view || GO_PES_V2.DEFAULT_VIEW,
    query: params,
    user: user,
    permissions: buildPermissionMap_(user)
  };
}

function getAppBootstrap() {
  const user = getUsuarioActual();
  return serializeForClient_({
    appName: GO_PES_V2.APP_NAME,
    programTitle: GO_PES_V2.PROGRAM_TITLE,
    subtitle: GO_PES_V2.SUBTITLE,
    version: GO_PES_V2.VERSION,
    colors: GO_PES_V2.COLORS,
    user: user,
    permissions: buildPermissionMap_(user),
    views: GO_PES_V2.VIEWS,
    catalogs: {}
  });
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
