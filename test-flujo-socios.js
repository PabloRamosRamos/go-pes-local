// Script para probar el flujo de socios
function testFlujoSocios() {
  // 1. Buscar un grupo de vecinos (sin organizacion_id, con hito >= 2)
  var casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);
  var grupos = casos.filter(function(c) {
    return !String(c.organizacion_id || '').trim() && String(c.solicitud_id || '').trim();
  });
  
  Logger.log('Grupos de vecinos encontrados: ' + grupos.length);
  if (grupos.length > 0) {
    var grupo = grupos[0];
    Logger.log('Primer grupo: ' + grupo.solicitud_id + ' - ' + grupo.nombre_completo);
    Logger.log('Sector: ' + grupo.sector + ', UV: ' + grupo.uv);
  }
  
  // 2. Verificar socios del grupo
  var socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS);
  var sociosGrupo = socios.filter(function(s) {
    return String(s.organizacion_id || '').trim() === grupo.solicitud_id;
  });
  
  Logger.log('Socios del grupo: ' + sociosGrupo.length);
  sociosGrupo.forEach(function(s) {
    Logger.log('  - ' + s.nombre_socio + ' (RUT: ' + s.run_socio + ')');
  });
  
  return {
    grupo: grupo,
    total_socios: sociosGrupo.length,
    socios: sociosGrupo
  };
}
