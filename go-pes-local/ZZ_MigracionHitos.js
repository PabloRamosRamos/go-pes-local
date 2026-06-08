/**
 * ZZ_MigracionHitos.js
 * Migración de hitos PRE_02 y PRE_03 desde "Hoja 19" (datos consolidados)
 *
 * VERSIÓN LIMPIA - Empezamos de cero
 */

/**
 * PASO 1: Analizar estructura de "Hoja 19"
 */
function analizarHoja19() {
  try {
    const ssId = '1Eb_mj3Ef6Ss0JiBuQvlshj3nbKTOqLgtNbDRDsBzJq8';
    const ss = SpreadsheetApp.openById(ssId);
    const sh = ss.getSheetByName('Hoja 19');

    if (!sh) {
      return { error: 'No se encontró la hoja "Hoja 19".' };
    }

    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();

    if (lastRow < 2) {
      return { error: 'La hoja "Hoja 19" no tiene datos.' };
    }

    // Leer headers
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];

    // Leer primeras 10 filas de muestra
    const sampleSize = Math.min(10, lastRow - 1);
    const sampleData = sh.getRange(2, 1, sampleSize, lastCol).getValues();

    // Reporte
    Logger.log('=== HOJA 19 - DATOS CONSOLIDADOS ===');
    Logger.log('Total filas de datos: ' + (lastRow - 1));
    Logger.log('Total columnas: ' + lastCol);
    Logger.log('\n--- Headers ---');
    headers.forEach((h, idx) => {
      Logger.log('Columna ' + String.fromCharCode(65 + idx) + ': ' + h);
    });

    Logger.log('\n--- Muestra de datos (primeras 3 filas) ---');
    for (let i = 0; i < Math.min(3, sampleData.length); i++) {
      Logger.log('\nFila ' + (i + 2) + ':');
      headers.forEach((h, idx) => {
        Logger.log('  ' + h + ': ' + sampleData[i][idx]);
      });
    }

    return {
      totalRows: lastRow - 1,
      totalColumns: lastCol,
      headers: headers,
      sampleData: sampleData
    };

  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    return { error: error.toString() };
  }
}

/**
 * Wrapper público
 */
function goPesAnalizarHoja19() {
  return analizarHoja19();
}

/**
 * PASO 2: Análisis previo - cuántos registros pueden migrar
 */
function analizarMigracionHoja19() {
  try {
    const ssId = '1Eb_mj3Ef6Ss0JiBuQvlshj3nbKTOqLgtNbDRDsBzJq8';
    const ss = SpreadsheetApp.openById(ssId);
    const sh = ss.getSheetByName('Hoja 19');

    if (!sh) {
      return { error: 'No se encontró la hoja "Hoja 19".' };
    }

    // Leer todos los datos
    const lastRow = sh.getLastRow();
    const data = sh.getRange(2, 1, lastRow - 1, 6).getValues();

    Logger.log('=== ANÁLISIS DE MIGRACIÓN - HOJA 19 ===');
    Logger.log('Total registros a analizar: ' + data.length);

    // Obtener hitos actuales
    const hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [];

    const analisis = data.map((row, idx) => {
      const idApp = String(row[0] || '').trim(); // Columna A
      const idLegacy = String(row[1] || '').trim(); // Columna B
      const fechaReunion = row[2]; // Columna C (PRE_03 en la hoja, pero es fecha reunión)
      const nombre = String(row[3] || '').trim(); // Columna D
      const numeroIngreso = row[4]; // Columna E (PRE_02 en la hoja)
      const fechaAsamblea = row[5]; // Columna F (PRE_04 en la hoja)

      if (!idApp) {
        return {
          fila: idx + 2,
          id_app: idApp,
          nombre: nombre,
          puede_migrar: false,
          razon: 'ID-APP vacío'
        };
      }

      // Buscar hitos del caso
      const hitosCase = hitos.filter(h => h.solicitud_id === idApp);
      const tienePRE_01 = hitosCase.some(h => h.codigo_hito === 'PRE_01');
      const tienePRE_02 = hitosCase.some(h => h.codigo_hito === 'PRE_02');
      const tienePRE_03 = hitosCase.some(h => h.codigo_hito === 'PRE_03');

      if (!tienePRE_01) {
        return {
          fila: idx + 2,
          id_app: idApp,
          nombre: nombre,
          tiene_PRE_01: false,
          puede_migrar: false,
          razon: 'No tiene hito PRE_01'
        };
      }

      if (tienePRE_02 && tienePRE_03) {
        return {
          fila: idx + 2,
          id_app: idApp,
          nombre: nombre,
          tiene_PRE_01: true,
          tiene_PRE_02: true,
          tiene_PRE_03: true,
          puede_migrar: false,
          razon: 'Ya tiene PRE_02 y PRE_03'
        };
      }

      if (!numeroIngreso) {
        return {
          fila: idx + 2,
          id_app: idApp,
          nombre: nombre,
          tiene_PRE_01: true,
          tiene_numero_ingreso: false,
          puede_migrar: false,
          razon: 'Falta número de ingreso'
        };
      }

      if (!fechaAsamblea) {
        return {
          fila: idx + 2,
          id_app: idApp,
          nombre: nombre,
          tiene_PRE_01: true,
          tiene_fecha_asamblea: false,
          puede_migrar: false,
          razon: 'Falta fecha de asamblea'
        };
      }

      // TODO: Listo para migrar
      const hitoPRE_01 = hitosCase.find(h => h.codigo_hito === 'PRE_01');
      const fechaPRE_01 = new Date(hitoPRE_01.fecha_hito);
      const fechaCarta = new Date(fechaPRE_01.getTime() + (7 * 24 * 60 * 60 * 1000));
      const fechaAsambleaDate = new Date(fechaAsamblea);

      return {
        fila: idx + 2,
        id_app: idApp,
        nombre: nombre,
        tiene_PRE_01: true,
        tiene_PRE_02: tienePRE_02,
        tiene_PRE_03: tienePRE_03,
        numero_ingreso: numeroIngreso,
        fecha_PRE_01: fechaPRE_01,
        fecha_carta_calculada: fechaCarta,
        fecha_asamblea: fechaAsambleaDate,
        puede_migrar: true,
        razon: '✓ Listo para migrar'
      };
    });

    // Resumen
    const puedenMigrar = analisis.filter(a => a.puede_migrar);
    const noPuedenMigrar = analisis.filter(a => !a.puede_migrar);

    Logger.log('\n=== RESUMEN ===');
    Logger.log('✓ PUEDEN MIGRAR: ' + puedenMigrar.length);
    Logger.log('✗ NO pueden migrar: ' + noPuedenMigrar.length);

    if (puedenMigrar.length > 0) {
      Logger.log('\n=== LISTOS PARA MIGRACIÓN (primeros 5) ===');
      puedenMigrar.slice(0, 5).forEach(r => {
        Logger.log(r.id_app + ' | ' + r.nombre);
        Logger.log('  N° Ingreso: ' + r.numero_ingreso);
        Logger.log('  Fecha carta: ' + r.fecha_carta_calculada.toISOString().split('T')[0]);
        Logger.log('  Fecha asamblea: ' + r.fecha_asamblea.toISOString().split('T')[0]);
      });
      if (puedenMigrar.length > 5) {
        Logger.log('... y ' + (puedenMigrar.length - 5) + ' más');
      }
    }

    if (noPuedenMigrar.length > 0) {
      Logger.log('\n=== RAZONES DE NO MIGRACIÓN ===');
      const razones = {};
      noPuedenMigrar.forEach(r => {
        razones[r.razon] = (razones[r.razon] || 0) + 1;
      });
      Object.keys(razones).forEach(razon => {
        Logger.log(razones[razon] + ' registros: ' + razon);
      });
    }

    return {
      total: analisis.length,
      pueden_migrar: puedenMigrar.length,
      no_pueden_migrar: noPuedenMigrar.length,
      listos: puedenMigrar,
      no_listos: noPuedenMigrar
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
function goPesAnalizarMigracionHoja19() {
  return analizarMigracionHoja19();
}

/**
 * PASO 3: Migración de hitos PRE_02 y PRE_03
 *
 * @param {boolean} dryRun - Si es true, solo simula sin persistir. Default: true.
 */
function migrarHitosHoja19(dryRun) {
  if (typeof dryRun === 'undefined') {
    dryRun = true; // Safe by default
  }

  try {
    const ssId = '1Eb_mj3Ef6Ss0JiBuQvlshj3nbKTOqLgtNbDRDsBzJq8';
    const ss = SpreadsheetApp.openById(ssId);
    const sh = ss.getSheetByName('Hoja 19');

    if (!sh) {
      return { error: 'No se encontró la hoja "Hoja 19".' };
    }

    // Leer todos los datos
    const lastRow = sh.getLastRow();
    const data = sh.getRange(2, 1, lastRow - 1, 6).getValues();

    Logger.log('=== MIGRACIÓN DE HITOS - HOJA 19 ===');
    Logger.log('Modo: ' + (dryRun ? '🔍 DRY RUN (simulación)' : '💾 PERSISTENCIA REAL'));
    Logger.log('Total registros: ' + data.length);
    Logger.log('');

    // Obtener hitos actuales
    const hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS) || [];

    const resultados = {
      total_procesados: 0,
      exitosos: [],
      omitidos: [],
      errores: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const fila = i + 2;
      const idApp = String(row[0] || '').trim(); // Columna A
      const nombre = String(row[3] || '').trim(); // Columna D
      const numeroIngreso = String(row[4] || '').trim(); // Columna E
      const fechaAsamblea = row[5]; // Columna F

      resultados.total_procesados++;

      // Validaciones
      if (!idApp) {
        resultados.omitidos.push({
          fila: fila,
          id_app: idApp,
          nombre: nombre,
          razon: 'ID-APP vacío'
        });
        continue;
      }

      // Buscar hitos del caso
      const hitosCase = hitos.filter(function(h) { return h.solicitud_id === idApp; });
      const hitoPRE_01 = hitosCase.find(function(h) { return h.codigo_hito === 'PRE_01'; });
      const tienePRE_02 = hitosCase.some(function(h) { return h.codigo_hito === 'PRE_02'; });
      const tienePRE_03 = hitosCase.some(function(h) { return h.codigo_hito === 'PRE_03'; });

      if (!hitoPRE_01) {
        resultados.omitidos.push({
          fila: fila,
          id_app: idApp,
          nombre: nombre,
          razon: 'No tiene hito PRE_01'
        });
        continue;
      }

      if (tienePRE_02 && tienePRE_03) {
        resultados.omitidos.push({
          fila: fila,
          id_app: idApp,
          nombre: nombre,
          razon: 'Ya tiene PRE_02 y PRE_03'
        });
        continue;
      }

      if (!numeroIngreso) {
        resultados.omitidos.push({
          fila: fila,
          id_app: idApp,
          nombre: nombre,
          razon: 'Falta número de ingreso'
        });
        continue;
      }

      if (!fechaAsamblea) {
        resultados.omitidos.push({
          fila: fila,
          id_app: idApp,
          nombre: nombre,
          razon: 'Falta fecha de asamblea'
        });
        continue;
      }

      // Calcular fechas
      const fechaPRE_01 = new Date(hitoPRE_01.fecha_hito);
      const fechaCarta = new Date(fechaPRE_01.getTime() + (7 * 24 * 60 * 60 * 1000));
      const fechaAsambleaDate = new Date(fechaAsamblea);

      // === MIGRACIÓN ===
      try {
        if (dryRun) {
          // Solo simular
          Logger.log('[DRY RUN] ' + idApp + ' | ' + nombre);
          Logger.log('  → Crearía PRE_02: fecha=' + fechaCarta.toISOString().split('T')[0] + ', num_ingreso=' + numeroIngreso);
          Logger.log('  → Crearía PRE_03: fecha=' + fechaAsambleaDate.toISOString().split('T')[0] + ', fecha_asamblea=' + fechaAsambleaDate.toISOString().split('T')[0]);
        } else {
          // Persistir real
          Logger.log('[REAL] Migrando ' + idApp + ' | ' + nombre);

          // Crear PRE_02
          if (!tienePRE_02) {
            registrarHitoAvance({
              solicitud_id: idApp,
              codigo_hito: 'PRE_02',
              fecha_hito: fechaCarta,
              numero_ingreso: numeroIngreso,
              observacion: 'Migrado desde Hoja 19 (datos legacy)'
            });
            Logger.log('  ✓ PRE_02 creado');
          } else {
            Logger.log('  ⊘ PRE_02 ya existe, omitido');
          }

          // Crear PRE_03
          if (!tienePRE_03) {
            registrarHitoAvance({
              solicitud_id: idApp,
              codigo_hito: 'PRE_03',
              fecha_hito: fechaAsambleaDate,
              fecha_asamblea_asignada: fechaAsambleaDate,
              observacion: 'Migrado desde Hoja 19 (datos legacy)'
            });
            Logger.log('  ✓ PRE_03 creado');
          } else {
            Logger.log('  ⊘ PRE_03 ya existe, omitido');
          }
        }

        resultados.exitosos.push({
          fila: fila,
          id_app: idApp,
          nombre: nombre,
          fecha_carta: fechaCarta,
          fecha_asamblea: fechaAsambleaDate,
          numero_ingreso: numeroIngreso
        });

      } catch (err) {
        Logger.log('  ✗ ERROR: ' + err.toString());
        resultados.errores.push({
          fila: fila,
          id_app: idApp,
          nombre: nombre,
          error: err.toString()
        });
      }
    }

    // === REPORTE FINAL ===
    Logger.log('');
    Logger.log('=== REPORTE DE MIGRACIÓN ===');
    Logger.log('Total procesados: ' + resultados.total_procesados);
    Logger.log('✓ Exitosos: ' + resultados.exitosos.length);
    Logger.log('⊘ Omitidos: ' + resultados.omitidos.length);
    Logger.log('✗ Errores: ' + resultados.errores.length);

    if (resultados.omitidos.length > 0) {
      Logger.log('');
      Logger.log('=== RAZONES DE OMISIÓN ===');
      const razones = {};
      resultados.omitidos.forEach(function(r) {
        razones[r.razon] = (razones[r.razon] || 0) + 1;
      });
      Object.keys(razones).forEach(function(razon) {
        Logger.log(razones[razon] + ' casos: ' + razon);
      });
    }

    if (resultados.errores.length > 0) {
      Logger.log('');
      Logger.log('=== ERRORES ENCONTRADOS ===');
      resultados.errores.forEach(function(e) {
        Logger.log(e.id_app + ' | ' + e.nombre);
        Logger.log('  Error: ' + e.error);
      });
    }

    if (dryRun) {
      Logger.log('');
      Logger.log('⚠️  ESTE FUE UN DRY RUN - No se persistió nada.');
      Logger.log('Para ejecutar la migración real: goPesMigrarHitosHoja19(false)');
    } else {
      Logger.log('');
      Logger.log('✅ Migración completada.');
    }

    return resultados;

  } catch (error) {
    Logger.log('ERROR FATAL: ' + error.toString());
    Logger.log(error.stack);
    return { error: error.toString() };
  }
}

/**
 * Wrapper público - DRY RUN por defecto
 */
function goPesMigrarHitosHoja19(dryRun) {
  return migrarHitosHoja19(dryRun);
}
