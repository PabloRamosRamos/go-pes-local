/**
 * ZZ_LimpiarDuplicados.js
 * Script para detectar y limpiar casos duplicados en MAE_CASOS
 *
 * PROPÓSITO: Limpiar duplicados por nombre+dirección verificando vínculos
 * CREADO: 2026-07-10
 */

/**
 * Paso 1: Analizar duplicados y sus vínculos
 * SOLO LECTURA - No modifica nada
 */
function goPesAnalizarCasosDuplicados_() {
  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('  ANÁLISIS DE CASOS DUPLICADOS - GO-PES v2');
  Logger.log('  Fecha: ' + new Date().toISOString());
  Logger.log('═══════════════════════════════════════════════════════════\n');

  // Leer datos
  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];
  const avanceHitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [];
  const gestiones = getSheetData_(GO_PES_V2.SHEETS.FACT_HITOS) || [];
  const socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];

  Logger.log('Datos cargados:');
  Logger.log('- Casos: ' + casos.length);
  Logger.log('- Hitos de avance: ' + avanceHitos.length);
  Logger.log('- Gestiones: ' + gestiones.length);
  Logger.log('- Socios: ' + socios.length + '\n');

  // Construir índices de vínculos
  const hitosPorSolicitud = {};
  avanceHitos.forEach(function(h) {
    const solId = String(h.solicitud_id || '').trim();
    if (!solId) return;
    if (!hitosPorSolicitud[solId]) hitosPorSolicitud[solId] = [];
    hitosPorSolicitud[solId].push(h);
  });

  const gestionesPorSolicitud = {};
  gestiones.forEach(function(g) {
    const solId = String(g.solicitud_id || '').trim();
    if (!solId) return;
    if (!gestionesPorSolicitud[solId]) gestionesPorSolicitud[solId] = [];
    gestionesPorSolicitud[solId].push(g);
  });

  const sociosPorOrg = {};
  socios.forEach(function(s) {
    const orgId = String(s.organizacion_id || '').trim();
    if (!orgId) return;
    if (!sociosPorOrg[orgId]) sociosPorOrg[orgId] = [];
    sociosPorOrg[orgId].push(s);
  });

  // Detectar duplicados por nombre + dirección
  const porPersona = {};
  casos.forEach(function(caso) {
    const nombre = normalizeText_(String(caso.nombre_completo || caso.nombre_vecino || ''));
    const direccion = normalizeText_(String(caso.direccion_original || ''));

    if (!nombre) return;

    const key = nombre + '|' + direccion;
    if (!porPersona[key]) {
      porPersona[key] = [];
    }
    porPersona[key].push(caso);
  });

  // Filtrar solo los que tienen duplicados
  const duplicados = [];
  Object.keys(porPersona).forEach(function(key) {
    if (porPersona[key].length > 1) {
      duplicados.push({
        key: key,
        casos: porPersona[key]
      });
    }
  });

  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('RESUMEN:');
  Logger.log('- Total casos: ' + casos.length);
  Logger.log('- Personas únicas: ' + Object.keys(porPersona).length);
  Logger.log('- Personas con duplicados: ' + duplicados.length);
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (duplicados.length === 0) {
    Logger.log('✅ No se encontraron duplicados.\n');
    return { duplicados: [], recomendaciones: [] };
  }

  // Analizar cada grupo de duplicados
  const recomendaciones = [];

  duplicados.forEach(function(dup, idx) {
    const parts = dup.key.split('|');
    const nombre = parts[0];
    const direccion = parts[1] || '(sin dirección)';

    Logger.log('┌─────────────────────────────────────────────────────────');
    Logger.log('│ DUPLICADO ' + (idx + 1) + ' de ' + duplicados.length);
    Logger.log('│ Nombre: ' + nombre);
    Logger.log('│ Dirección: ' + direccion);
    Logger.log('│ Total casos: ' + dup.casos.length);
    Logger.log('└─────────────────────────────────────────────────────────');

    const analisis = [];

    dup.casos.forEach(function(caso, i) {
      const solId = String(caso.solicitud_id || '').trim();
      const orgId = String(caso.organizacion_id || '').trim();
      const fechaIngreso = caso.fecha_ingreso ? new Date(caso.fecha_ingreso) : null;

      const hitosAvance = hitosPorSolicitud[solId] || [];
      const gestionesCaso = gestionesPorSolicitud[solId] || [];
      const sociosCaso = orgId ? (sociosPorOrg[orgId] || []) : [];

      const tieneVinculos = hitosAvance.length > 0 || gestionesCaso.length > 0 || sociosCaso.length > 0;

      Logger.log('');
      Logger.log('  [' + (i + 1) + '] ' + solId);
      Logger.log('      Fecha ingreso: ' + (fechaIngreso ? fechaIngreso.toISOString().split('T')[0] : 'Sin fecha'));
      Logger.log('      Organización: ' + (orgId || '(ninguna)'));
      Logger.log('      Hitos avance: ' + hitosAvance.length);
      Logger.log('      Gestiones: ' + gestionesCaso.length);
      Logger.log('      Socios (vía org): ' + sociosCaso.length);
      Logger.log('      Estado: ' + (caso.estado_actual || 'Sin estado'));
      Logger.log('      RUT: ' + (caso.rut_vecino || '(sin RUT)'));

      analisis.push({
        solicitud_id: solId,
        organizacion_id: orgId,
        fecha_ingreso: fechaIngreso,
        hitos_avance: hitosAvance.length,
        gestiones: gestionesCaso.length,
        socios: sociosCaso.length,
        tiene_vinculos: tieneVinculos,
        peso: hitosAvance.length * 3 + gestionesCaso.length * 2 + sociosCaso.length * 5,
        caso: caso
      });
    });

    // Ordenar por peso (más vínculos = mayor peso)
    analisis.sort(function(a, b) {
      // Primero por vínculos (peso)
      if (b.peso !== a.peso) return b.peso - a.peso;
      // Luego por fecha (más reciente)
      if (a.fecha_ingreso && b.fecha_ingreso) {
        return b.fecha_ingreso - a.fecha_ingreso;
      }
      return 0;
    });

    const mantener = analisis[0];
    const eliminar = analisis.slice(1);

    Logger.log('');
    Logger.log('  ┌─ RECOMENDACIÓN:');
    Logger.log('  │ ✅ MANTENER: ' + mantener.solicitud_id + ' (peso: ' + mantener.peso + ')');

    eliminar.forEach(function(e) {
      if (e.tiene_vinculos) {
        Logger.log('  │ ⚠️  REVISAR MANUAL: ' + e.solicitud_id + ' (tiene vínculos: ' + e.peso + ')');
      } else {
        Logger.log('  │ ❌ ELIMINAR: ' + e.solicitud_id + ' (sin vínculos)');
      }
    });
    Logger.log('  └─');

    recomendaciones.push({
      nombre: nombre,
      direccion: direccion,
      mantener: mantener,
      eliminar: eliminar
    });

    Logger.log('');
  });

  Logger.log('\n═══════════════════════════════════════════════════════════');
  Logger.log('RESUMEN DE RECOMENDACIONES:');

  let totalMantener = 0;
  let totalEliminarSinVinculos = 0;
  let totalRevisarManual = 0;

  recomendaciones.forEach(function(r) {
    totalMantener++;
    r.eliminar.forEach(function(e) {
      if (e.tiene_vinculos) {
        totalRevisarManual++;
      } else {
        totalEliminarSinVinculos++;
      }
    });
  });

  Logger.log('- Casos a mantener: ' + totalMantener);
  Logger.log('- Casos a eliminar (sin vínculos): ' + totalEliminarSinVinculos);
  Logger.log('- Casos a revisar manual (con vínculos): ' + totalRevisarManual);
  Logger.log('═══════════════════════════════════════════════════════════\n');

  return {
    duplicados: duplicados,
    recomendaciones: recomendaciones,
    stats: {
      total_mantener: totalMantener,
      total_eliminar_seguro: totalEliminarSinVinculos,
      total_revisar_manual: totalRevisarManual
    }
  };
}

/**
 * Wrapper público
 */
function goPesAnalizarCasosDuplicados() {
  return goPesAnalizarCasosDuplicados_();
}

/**
 * Paso 2: Limpiar casos duplicados SIN vínculos
 * ESCRIBE - Elimina rows de MAE_CASOS
 *
 * @param {boolean} dryRun - Si es true, solo simula (default: true)
 */
function goPesLimpiarCasosDuplicados_(dryRun) {
  if (typeof dryRun === 'undefined') {
    dryRun = true; // Safe by default
  }

  Logger.log('═══════════════════════════════════════════════════════════');
  Logger.log('  LIMPIEZA DE CASOS DUPLICADOS - GO-PES v2');
  Logger.log('  Modo: ' + (dryRun ? '🔍 DRY RUN (simulación)' : '💾 REAL (persistencia)'));
  Logger.log('═══════════════════════════════════════════════════════════\n');

  // Ejecutar análisis
  const analisis = goPesAnalizarCasosDuplicados_();

  if (analisis.stats.total_eliminar_seguro === 0) {
    Logger.log('✅ No hay casos sin vínculos para eliminar.\n');
    return { eliminados: 0, dry_run: dryRun };
  }

  Logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('INICIANDO LIMPIEZA...');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const aEliminar = [];

  analisis.recomendaciones.forEach(function(r) {
    r.eliminar.forEach(function(e) {
      if (!e.tiene_vinculos) {
        aEliminar.push(e.solicitud_id);
      }
    });
  });

  Logger.log('Casos a eliminar: ' + aEliminar.length);
  aEliminar.forEach(function(solId) {
    Logger.log('  - ' + solId);
  });

  if (dryRun) {
    Logger.log('\n⚠️  ESTO ES UN DRY RUN - No se eliminó nada.');
    Logger.log('Para ejecutar la limpieza real: goPesLimpiarCasosDuplicados(false)\n');
    return { eliminados: 0, dry_run: true, a_eliminar: aEliminar };
  }

  // ELIMINACIÓN REAL
  Logger.log('\n💾 ELIMINANDO CASOS...\n');

  const sheet = getSheet_(GO_PES_V2.SHEETS.MAE_CASOS);
  if (!sheet) {
    throw new Error('No se encontró la hoja MAE_CASOS');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log('✅ Hoja vacía, nada que eliminar.\n');
    return { eliminados: 0, dry_run: false };
  }

  const headers = getSheetHeaders_(GO_PES_V2.SHEETS.MAE_CASOS);
  const solIdColIndex = headers.indexOf('solicitud_id');

  if (solIdColIndex === -1) {
    throw new Error('No se encontró columna solicitud_id');
  }

  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const rowsAMantener = [];
  let eliminados = 0;

  data.forEach(function(row) {
    const solId = String(row[solIdColIndex] || '').trim();
    if (aEliminar.indexOf(solId) === -1) {
      rowsAMantener.push(row);
    } else {
      eliminados++;
      Logger.log('  ❌ Eliminado: ' + solId);
    }
  });

  // Limpiar hoja y reescribir
  sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();

  if (rowsAMantener.length > 0) {
    sheet.getRange(2, 1, rowsAMantener.length, headers.length).setValues(rowsAMantener);
  }

  // Invalidar cache
  invalidateSheetRuntimeCache_(GO_PES_V2.SHEETS.MAE_CASOS);

  Logger.log('\n✅ Limpieza completada.');
  Logger.log('   Casos eliminados: ' + eliminados);
  Logger.log('   Casos mantenidos: ' + rowsAMantener.length);
  Logger.log('\n═══════════════════════════════════════════════════════════\n');

  return { eliminados: eliminados, dry_run: false, mantenidos: rowsAMantener.length };
}

/**
 * Wrapper público - DRY RUN por defecto
 */
function goPesLimpiarCasosDuplicados(dryRun) {
  return goPesLimpiarCasosDuplicados_(dryRun);
}
