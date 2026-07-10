/**
 * ZZ_VerificarDuplicados.js
 * Script temporal para verificar duplicados post-migración
 *
 * PROPÓSITO: Performance - detectar duplicados en FACT_AVANCE_HITOS
 * que puedan afectar rendimiento de queries.
 */

/**
 * Verifica duplicados por solicitud_id + codigo_hito
 * (una solicitud NO debería tener el mismo hito duplicado)
 */
function goPesVerificarDuplicadosHitos_() {
  try {
    Logger.log('=== VERIFICACIÓN DE DUPLICADOS - FACT_AVANCE_HITOS ===\n');

    const hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [];
    Logger.log('Total hitos en sistema: ' + hitos.length);

    // Mapa: "solicitud_id|codigo_hito" -> count
    const mapa = {};
    const duplicados = [];

    hitos.forEach(function(h, idx) {
      const key = h.solicitud_id + '|' + h.codigo_hito;

      if (!mapa[key]) {
        mapa[key] = [];
      }

      mapa[key].push({
        rowIndex: idx,
        fecha_hito: h.fecha_hito,
        observacion: h.observacion || '',
        numero_ingreso: h.numero_ingreso || '',
        fecha_asamblea_asignada: h.fecha_asamblea_asignada || ''
      });
    });

    // Detectar duplicados
    Object.keys(mapa).forEach(function(key) {
      if (mapa[key].length > 1) {
        const parts = key.split('|');
        duplicados.push({
          solicitud_id: parts[0],
          codigo_hito: parts[1],
          count: mapa[key].length,
          registros: mapa[key]
        });
      }
    });

    // Reporte
    if (duplicados.length === 0) {
      Logger.log('\n✅ No se encontraron duplicados. Sistema limpio.\n');
      return {
        total_hitos: hitos.length,
        duplicados_encontrados: 0,
        detalles: []
      };
    }

    Logger.log('\n⚠️  DUPLICADOS ENCONTRADOS: ' + duplicados.length + ' casos\n');

    duplicados.forEach(function(d) {
      Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      Logger.log('Solicitud: ' + d.solicitud_id);
      Logger.log('Hito: ' + d.codigo_hito);
      Logger.log('Duplicados: ' + d.count + ' veces');
      Logger.log('');

      d.registros.forEach(function(r, idx) {
        Logger.log('  [' + (idx + 1) + '] Fila índice: ' + (r.rowIndex + 2)); // +2 por header
        Logger.log('      Fecha: ' + r.fecha_hito);
        if (r.numero_ingreso) {
          Logger.log('      Nº Ingreso: ' + r.numero_ingreso);
        }
        if (r.fecha_asamblea_asignada) {
          Logger.log('      Fecha asamblea: ' + r.fecha_asamblea_asignada);
        }
        if (r.observacion) {
          Logger.log('      Obs: ' + r.observacion);
        }
        Logger.log('');
      });
    });

    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    Logger.log('IMPACTO EN PERFORMANCE:');
    Logger.log('- Queries que filtran por solicitud_id + codigo_hito pueden devolver múltiples resultados');
    Logger.log('- Filtros .find() pueden devolver el registro incorrecto');
    Logger.log('- Aumenta el tamaño de arrays en memoria\n');

    return {
      total_hitos: hitos.length,
      duplicados_encontrados: duplicados.length,
      detalles: duplicados
    };

  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    Logger.log(error.stack);
    return { error: error.toString() };
  }
}

/**
 * Wrapper público
 */
function goPesVerificarDuplicadosHitos() {
  return goPesVerificarDuplicadosHitos_();
}


/**
 * Verifica duplicados en MAE_Casos por nombre_vecino + codigo_caso
 */
function goPesVerificarDuplicadosCasos_() {
  try {
    Logger.log('=== VERIFICACIÓN DE DUPLICADOS - MAE_CASOS ===\n');

    const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
    Logger.log('Total casos en sistema: ' + casos.length);

    // Mapa por nombre normalizado
    const mapaPorNombre = {};
    const duplicadosNombre = [];

    casos.forEach(function(c, idx) {
      const nombreNorm = String(c.nombre_vecino || '').trim().toLowerCase();

      if (!nombreNorm) return;

      if (!mapaPorNombre[nombreNorm]) {
        mapaPorNombre[nombreNorm] = [];
      }

      mapaPorNombre[nombreNorm].push({
        rowIndex: idx,
        codigo_caso: c.codigo_caso,
        nombre_vecino: c.nombre_vecino,
        rut_vecino: c.rut_vecino || '',
        estado_comite: c.estado_comite || ''
      });
    });

    // Detectar duplicados por nombre
    Object.keys(mapaPorNombre).forEach(function(nombre) {
      if (mapaPorNombre[nombre].length > 1) {
        duplicadosNombre.push({
          nombre: nombre,
          count: mapaPorNombre[nombre].length,
          registros: mapaPorNombre[nombre]
        });
      }
    });

    // Mapa por código_caso
    const mapaPorCodigo = {};
    const duplicadosCodigo = [];

    casos.forEach(function(c, idx) {
      const codigo = c.codigo_caso;

      if (!codigo) return;

      if (!mapaPorCodigo[codigo]) {
        mapaPorCodigo[codigo] = [];
      }

      mapaPorCodigo[codigo].push({
        rowIndex: idx,
        codigo_caso: c.codigo_caso,
        nombre_vecino: c.nombre_vecino
      });
    });

    // Detectar duplicados por código
    Object.keys(mapaPorCodigo).forEach(function(codigo) {
      if (mapaPorCodigo[codigo].length > 1) {
        duplicadosCodigo.push({
          codigo: codigo,
          count: mapaPorCodigo[codigo].length,
          registros: mapaPorCodigo[codigo]
        });
      }
    });

    // Reporte
    Logger.log('\n--- Duplicados por NOMBRE ---');
    if (duplicadosNombre.length === 0) {
      Logger.log('✅ No hay duplicados por nombre\n');
    } else {
      Logger.log('⚠️  ' + duplicadosNombre.length + ' nombres duplicados\n');

      duplicadosNombre.slice(0, 5).forEach(function(d) {
        Logger.log('Nombre: "' + d.nombre + '" (' + d.count + ' veces)');
        d.registros.forEach(function(r) {
          Logger.log('  - ' + r.codigo_caso + ' | RUT: ' + r.rut_vecino + ' | Estado: ' + r.estado_comite);
        });
        Logger.log('');
      });

      if (duplicadosNombre.length > 5) {
        Logger.log('... y ' + (duplicadosNombre.length - 5) + ' más\n');
      }
    }

    Logger.log('--- Duplicados por CÓDIGO ---');
    if (duplicadosCodigo.length === 0) {
      Logger.log('✅ No hay duplicados por código\n');
    } else {
      Logger.log('🔴 CRÍTICO: ' + duplicadosCodigo.length + ' códigos duplicados\n');

      duplicadosCodigo.forEach(function(d) {
        Logger.log('Código: ' + d.codigo + ' (' + d.count + ' veces)');
        d.registros.forEach(function(r) {
          Logger.log('  - Fila ' + (r.rowIndex + 2) + ' | ' + r.nombre_vecino);
        });
        Logger.log('');
      });
    }

    return {
      total_casos: casos.length,
      duplicados_nombre: duplicadosNombre.length,
      duplicados_codigo: duplicadosCodigo.length,
      detalles_nombre: duplicadosNombre,
      detalles_codigo: duplicadosCodigo
    };

  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    return { error: error.toString() };
  }
}

/**
 * Wrapper público
 */
function goPesVerificarDuplicadosCasos() {
  return goPesVerificarDuplicadosCasos_();
}


/**
 * Runner completo
 */
function goPesVerificarTodosDuplicados() {
  Logger.log('╔════════════════════════════════════════════════════════════╗');
  Logger.log('║  VERIFICACIÓN COMPLETA DE DUPLICADOS - GO-PES v2          ║');
  Logger.log('║  Propósito: Performance y calidad de datos                ║');
  Logger.log('╚════════════════════════════════════════════════════════════╝\n');

  const resultados = {
    timestamp: new Date().toISOString(),
    hitos: goPesVerificarDuplicadosHitos_(),
    casos: goPesVerificarDuplicadosCasos_()
  };

  Logger.log('\n╔════════════════════════════════════════════════════════════╗');
  Logger.log('║  RESUMEN EJECUTIVO                                         ║');
  Logger.log('╚════════════════════════════════════════════════════════════╝');
  Logger.log('');
  Logger.log('FACT_AVANCE_HITOS:');
  Logger.log('  Total: ' + resultados.hitos.total_hitos);
  Logger.log('  Duplicados: ' + resultados.hitos.duplicados_encontrados);
  Logger.log('');
  Logger.log('MAE_CASOS:');
  Logger.log('  Total: ' + resultados.casos.total_casos);
  Logger.log('  Duplicados por nombre: ' + resultados.casos.duplicados_nombre);
  Logger.log('  Duplicados por código: ' + resultados.casos.duplicados_codigo);
  Logger.log('');

  const todoBien = (
    resultados.hitos.duplicados_encontrados === 0 &&
    resultados.casos.duplicados_codigo === 0
  );

  if (todoBien) {
    Logger.log('✅ SISTEMA LIMPIO - Óptimo para performance');
  } else {
    Logger.log('⚠️  SE ENCONTRARON DUPLICADOS - Revisar logs arriba');
  }

  return resultados;
}
