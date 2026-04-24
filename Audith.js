function debugUvCatalogos() {
  const territorios = getSheetData_(GO_PES_V2.SHEETS.DIM_TERRITORIO);
  const catalogos = getCatalogosApp();

  Logger.log('SHEET NAME: ' + GO_PES_V2.SHEETS.DIM_TERRITORIO);
  Logger.log('ROWS DIM_TERRITORIO: ' + JSON.stringify(territorios));
  Logger.log('UV LIST: ' + JSON.stringify(catalogos.uvList));
  Logger.log('SECTOR BY UV: ' + JSON.stringify(catalogos.sectorByUv));

  return {
    sheetName: GO_PES_V2.SHEETS.DIM_TERRITORIO,
    territorios: territorios,
    uvList: catalogos.uvList,
    sectorByUv: catalogos.sectorByUv
  };
}

function testCatalogosClient() {
  const c = getCatalogosAppClient();
  Logger.log(JSON.stringify(c.uvList));
  return c.uvList;
}

function debugInsertMaeCasos() {
  ensureGoPesV2Sheets_();

  const id = 'TEST-' + new Date().getTime();

  upsertByKey_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', {
    solicitud_id: id,
    vecino_id: 'VEC-TEST',
    nombre_vecino: 'Pablo',
    apellido_vecino: 'Prueba',
    nombre_completo: 'Pablo Prueba',
    rut_vecino: '',
    telefono_contacto: '999999999',
    correo_contacto: 'test@test.cl',
    direccion_original: 'Dirección test',
    uv: '',
    sector: '',
    tipo_vivienda: '',
    requerimiento_inicial: 'Visita Inicial',
    medio_solicitud: '',
    unidad_origen: '',
    fecha_ingreso: new Date(),
    estado_actual: 'Nuevo ingreso',
    etapa_actual: 'Ingreso recibido',
    organizacion_id: '',
    ultima_gestion: new Date(),
    proximo_hito: 'Pendiente de contacto',
    responsable_actual: 'debug',
    observacion_resumen: '',
    updated_at: new Date()
  });

  const check = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', id, false);
  Logger.log(JSON.stringify(check));
  return check;
}

function debugBuscarVecinoPablo() {
  const rows = buscarVecino('Pablo');
  Logger.log(JSON.stringify(rows, null, 2));
  return rows;
}