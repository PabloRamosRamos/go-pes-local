// ── DEBUG MANUAL ──────────────────────────────────────────────────────────────

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

// ── RUNNER DE TESTS AUTOMATIZADOS ─────────────────────────────────────────────

/**
 * Entry point público. Llamado desde el menú "GO-PES v2 → Ejecutar tests".
 * Encadena los tres suites y loguea un resumen final.
 */
function goPesRunAllTests() {
  requireRole_(['superuser']);
  Logger.log('');
  Logger.log('==========================================');
  Logger.log('  GO-PES v2 — Tests automatizados');
  Logger.log('==========================================');
  Logger.log('');

  var total = { passed: 0, failed: 0 };

  function acumular(r) { total.passed += r.passed; total.failed += r.failed; }

  acumular(goPesTestValidators_());
  acumular(goPesTestAuth_());
  acumular(goPesTestServices_());
  acumular(goPesTestAvance_());
  acumular(goPesTestBeneficios_());

  Logger.log('==========================================');
  Logger.log('  TOTAL: ' + total.passed + ' pasados, ' + total.failed + ' fallados' +
    (total.failed === 0 ? '  — TODO OK' : '  — HAY FALLOS'));
  Logger.log('==========================================');
  Logger.log('');

  try {
    var email = '';
    try { email = Session.getActiveUser().getEmail(); } catch (e) {}
    logProcessing_('INFO', 'goPesRunAllTests', 'tests', 'suite-completo', email,
      total.failed === 0 ? 'OK' : 'FAIL',
      { passed: total.passed, failed: total.failed });
  } catch (e) {}

  return total;
}

// ── INFRAESTRUCTURA DEL RUNNER ────────────────────────────────────────────────

function createTestSuite_(suiteName) {
  var tests = [];
  var suiteResults = [];

  function test(description, fn) {
    tests.push({ description: description, fn: fn });
  }

  function skip(description, reason) {
    tests.push({ description: description, fn: null, skip: true, reason: reason || '' });
  }

  function run() {
    var passed = 0;
    var failed = 0;
    var skipped = 0;
    Logger.log('--- [' + suiteName + '] ---');

    tests.forEach(function(t) {
      if (t.skip) {
        skipped++;
        Logger.log('  - SKIP: ' + t.description + (t.reason ? '  (' + t.reason + ')' : ''));
        suiteResults.push({ suite: suiteName, test: t.description, status: 'SKIP', reason: t.reason });
        return;
      }
      try {
        t.fn();
        passed++;
        Logger.log('  v ' + t.description);
        suiteResults.push({ suite: suiteName, test: t.description, status: 'PASS' });
      } catch (err) {
        failed++;
        Logger.log('  X ' + t.description + '  ->  ' + err.message);
        suiteResults.push({ suite: suiteName, test: t.description, status: 'FAIL', error: err.message });
      }
    });

    Logger.log('  [' + suiteName + '] ' + passed + ' pasados, ' + failed + ' fallados, ' + skipped + ' omitidos');
    Logger.log('');
    return { passed: passed, failed: failed, skipped: skipped, results: suiteResults };
  }

  return { test: test, skip: skip, run: run };
}

function assertEqual_(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg ? msg + ': ' : '') +
      'esperado "' + expected + '", obtenido "' + actual + '"');
  }
}

function assertDeepEqual_(actual, expected, msg) {
  var a = JSON.stringify(actual);
  var e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error((msg ? msg + ': ' : '') + 'esperado ' + e + ', obtenido ' + a);
  }
}

function assertTrue_(condition, msg) {
  if (!condition) throw new Error(msg || 'se esperaba verdadero, obtenido falso');
}

function assertFalse_(condition, msg) {
  if (condition) throw new Error(msg || 'se esperaba falso, obtenido verdadero');
}

function assertThrows_(fn, msg) {
  var threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(msg || 'se esperaba que lanzara un error, pero no lo hizo');
}

function assertNotThrows_(fn, msg) {
  try { fn(); } catch (e) {
    throw new Error((msg || 'no se esperaba un error') + ': ' + e.message);
  }
}

// ── STUB DE USUARIO PARA TESTS DE AUTH ───────────────────────────────────────

/**
 * Inyecta un usuario sintético en GO_PES_RUNTIME para la duración de fn().
 * Pre-marca activityTouchedByEmail para que requireRole_ no acceda al spreadsheet.
 * Restaura el estado original en el bloque finally.
 */
function withTestUser_(profile, isSuper, fn) {
  var testEmail = 'test-runner@goipes.internal';
  var savedUser = GO_PES_RUNTIME.currentUser;
  GO_PES_RUNTIME.currentUser = {
    user_id: 'TEST-0',
    email: testEmail,
    nombre_visible: 'Test Runner',
    perfil: profile || 'operador',
    activo_flag: true,
    superuser_flag: !!isSuper,
    modulos_permitidos: '*',
    modules: ['inicio', 'buscar', 'nuevo-ingreso', 'ficha', 'avance',
               'organizacion', 'instrumento', 'socios', 'historial'],
    canAccess: true
  };
  GO_PES_RUNTIME.activityTouchedByEmail[normalizeEmail_(testEmail)] = true;
  try {
    return fn();
  } finally {
    GO_PES_RUNTIME.currentUser = savedUser;
    delete GO_PES_RUNTIME.activityTouchedByEmail[normalizeEmail_(testEmail)];
  }
}

// ── SUITE 1: VALIDATORS ───────────────────────────────────────────────────────

function goPesTestValidators_() {
  var s = createTestSuite_('Validators');

  // normalizeText_
  s.test('normalizeText: quita tildes', function() {
    assertEqual_(normalizeText_('Ángel'), 'angel');
  });
  s.test('normalizeText: convierte a minusculas', function() {
    assertEqual_(normalizeText_('PABLO'), 'pablo');
  });
  s.test('normalizeText: hace trim', function() {
    assertEqual_(normalizeText_('  hola  '), 'hola');
  });
  s.test('normalizeText: null → string vacio', function() {
    assertEqual_(normalizeText_(null), '');
  });
  s.test('normalizeText: N/n con tilde queda como n', function() {
    assertEqual_(normalizeText_('Nono'), 'nono');
  });

  // slugify_
  s.test('slugify: espacios → guion_bajo', function() {
    assertEqual_(slugify_('Hola Mundo'), 'hola_mundo');
  });
  s.test('slugify: caracteres especiales eliminados', function() {
    assertEqual_(slugify_('cafe & pan'), 'cafe_pan');
  });
  s.test('slugify: quita guiones bajos al inicio y fin', function() {
    assertEqual_(slugify_('  test  '), 'test');
  });

  // buildFullName_
  s.test('buildFullName: nombre y apellido', function() {
    assertEqual_(buildFullName_('Pablo', 'Ramos'), 'Pablo Ramos');
  });
  s.test('buildFullName: solo apellido', function() {
    assertEqual_(buildFullName_('', 'Ramos'), 'Ramos');
  });
  s.test('buildFullName: null null → vacio', function() {
    assertEqual_(buildFullName_(null, null), '');
  });
  s.test('buildFullName: elimina espacios multiples', function() {
    assertEqual_(buildFullName_('Pablo ', ' Ramos'), 'Pablo Ramos');
  });

  // toSiNo_
  s.test('toSiNo: true → Si', function() {
    assertEqual_(toSiNo_(true), 'Sí');
  });
  s.test('toSiNo: false → No', function() {
    assertEqual_(toSiNo_(false), 'No');
  });
  s.test('toSiNo: "si" → Si', function() {
    assertEqual_(toSiNo_('si'), 'Sí');
  });
  s.test('toSiNo: "si" con tilde → Si', function() {
    assertEqual_(toSiNo_('sí'), 'Sí');
  });
  s.test('toSiNo: "no" → No', function() {
    assertEqual_(toSiNo_('no'), 'No');
  });
  s.test('toSiNo: "true" → Si', function() {
    assertEqual_(toSiNo_('true'), 'Sí');
  });
  s.test('toSiNo: "false" → No', function() {
    assertEqual_(toSiNo_('false'), 'No');
  });
  s.test('toSiNo: valor desconocido pasa tal cual', function() {
    assertEqual_(toSiNo_('otro'), 'otro');
  });
  s.test('toSiNo: vacio → vacio', function() {
    assertEqual_(toSiNo_(''), '');
  });

  // toBool_
  s.test('toBool: true → true', function() {
    assertTrue_(toBool_(true));
  });
  s.test('toBool: false → false', function() {
    assertFalse_(toBool_(false));
  });
  s.test('toBool: "si" → true', function() {
    assertTrue_(toBool_('si'));
  });
  s.test('toBool: "true" → true', function() {
    assertTrue_(toBool_('true'));
  });
  s.test('toBool: "1" → true', function() {
    assertTrue_(toBool_('1'));
  });
  s.test('toBool: "no" → false', function() {
    assertFalse_(toBool_('no'));
  });
  s.test('toBool: vacio → false', function() {
    assertFalse_(toBool_(''));
  });

  // looksLikeUrl_
  s.test('looksLikeUrl: https → true', function() {
    assertTrue_(looksLikeUrl_('https://google.com'));
  });
  s.test('looksLikeUrl: http → true', function() {
    assertTrue_(looksLikeUrl_('http://test.cl'));
  });
  s.test('looksLikeUrl: ftp → false', function() {
    assertFalse_(looksLikeUrl_('ftp://test.cl'));
  });
  s.test('looksLikeUrl: sin protocolo → false', function() {
    assertFalse_(looksLikeUrl_('google.com'));
  });
  s.test('looksLikeUrl: vacio → false', function() {
    assertFalse_(looksLikeUrl_(''));
  });
  s.test('looksLikeUrl: null → false', function() {
    assertFalse_(looksLikeUrl_(null));
  });

  // isNumberBetween_
  s.test('isNumberBetween: 50 en [0,100] → true', function() {
    assertTrue_(isNumberBetween_(50, 0, 100));
  });
  s.test('isNumberBetween: limite inferior 0 → true', function() {
    assertTrue_(isNumberBetween_(0, 0, 100));
  });
  s.test('isNumberBetween: limite superior 100 → true', function() {
    assertTrue_(isNumberBetween_(100, 0, 100));
  });
  s.test('isNumberBetween: -1 fuera de [0,100] → false', function() {
    assertFalse_(isNumberBetween_(-1, 0, 100));
  });
  s.test('isNumberBetween: 101 fuera de [0,100] → false', function() {
    assertFalse_(isNumberBetween_(101, 0, 100));
  });
  s.test('isNumberBetween: string numerico → true', function() {
    assertTrue_(isNumberBetween_('75', 0, 100));
  });
  s.test('isNumberBetween: string no numerico → false', function() {
    assertFalse_(isNumberBetween_('abc', 0, 100));
  });

  // asDateOrBlank_
  s.test('asDateOrBlank: null → vacio', function() {
    assertEqual_(asDateOrBlank_(null), '');
  });
  s.test('asDateOrBlank: string vacio → vacio', function() {
    assertEqual_(asDateOrBlank_(''), '');
  });
  s.test('asDateOrBlank: string invalido → vacio', function() {
    assertEqual_(asDateOrBlank_('no-es-fecha'), '');
  });
  s.test('asDateOrBlank: Date valida → no vacio', function() {
    assertTrue_(asDateOrBlank_(new Date('2024-01-15')) !== '');
  });

  // asNumberOrBlank_
  s.test('asNumberOrBlank: string vacio → vacio', function() {
    assertEqual_(asNumberOrBlank_(''), '');
  });
  s.test('asNumberOrBlank: null → vacio', function() {
    assertEqual_(asNumberOrBlank_(null), '');
  });
  s.test('asNumberOrBlank: undefined → vacio', function() {
    assertEqual_(asNumberOrBlank_(undefined), '');
  });
  s.test('asNumberOrBlank: numero entero → numero', function() {
    assertEqual_(asNumberOrBlank_(42), 42);
  });
  s.test('asNumberOrBlank: coma decimal → punto decimal', function() {
    assertEqual_(asNumberOrBlank_('3,14'), 3.14);
  });
  s.test('asNumberOrBlank: texto → vacio', function() {
    assertEqual_(asNumberOrBlank_('abc'), '');
  });
  s.test('asNumberOrBlank: cero → 0', function() {
    assertEqual_(asNumberOrBlank_(0), 0);
  });

  // uniqueNonBlank_
  s.test('uniqueNonBlank: deduplica y ordena', function() {
    assertDeepEqual_(uniqueNonBlank_(['b', 'a', 'b', '']), ['a', 'b']);
  });
  s.test('uniqueNonBlank: array vacio → []', function() {
    assertDeepEqual_(uniqueNonBlank_([]), []);
  });
  s.test('uniqueNonBlank: null → []', function() {
    assertDeepEqual_(uniqueNonBlank_(null), []);
  });
  s.test('uniqueNonBlank: filtra strings de solo espacios', function() {
    assertDeepEqual_(uniqueNonBlank_(['', '  ', 'x']), ['x']);
  });

  // indexBy_
  s.test('indexBy: construye mapa por campo clave', function() {
    var rows = [{ k: 'a', v: 1 }, { k: 'b', v: 2 }];
    var result = indexBy_(rows, 'k');
    assertEqual_(result['a'].v, 1);
    assertEqual_(result['b'].v, 2);
  });
  s.test('indexBy: array vacio → objeto vacio', function() {
    assertDeepEqual_(indexBy_([], 'k'), {});
  });
  s.test('indexBy: null → objeto vacio', function() {
    assertDeepEqual_(indexBy_(null, 'k'), {});
  });

  // groupBy_
  s.test('groupBy: agrupa filas por campo', function() {
    var rows = [{ g: 'x', v: 1 }, { g: 'x', v: 2 }, { g: 'y', v: 3 }];
    var result = groupBy_(rows, 'g');
    assertEqual_(result['x'].length, 2);
    assertEqual_(result['y'].length, 1);
  });
  s.test('groupBy: null → objeto vacio', function() {
    assertDeepEqual_(groupBy_(null, 'k'), {});
  });

  // validateIngresoV2_
  var ingresoBase = {
    nombre_vecino: 'Juan',
    apellido_vecino: 'Perez',
    telefono_contacto: '912345678',
    direccion_original: 'Calle 123',
    requerimiento_inicial: 'Visita inicial',
    correo_contacto: ''
  };
  s.test('validateIngreso: payload valido sin correo → no lanza', function() {
    assertNotThrows_(function() { validateIngresoV2_(ingresoBase); });
  });
  s.test('validateIngreso: correo valido → no lanza', function() {
    assertNotThrows_(function() {
      validateIngresoV2_(Object.assign({}, ingresoBase, { correo_contacto: 'test@muni.cl' }));
    });
  });
  s.test('validateIngreso: nombre_vecino vacio → lanza', function() {
    assertThrows_(function() {
      validateIngresoV2_(Object.assign({}, ingresoBase, { nombre_vecino: '' }));
    });
  });
  s.test('validateIngreso: apellido_vecino solo espacios → lanza', function() {
    assertThrows_(function() {
      validateIngresoV2_(Object.assign({}, ingresoBase, { apellido_vecino: '   ' }));
    });
  });
  s.test('validateIngreso: telefono vacio → lanza', function() {
    assertThrows_(function() {
      validateIngresoV2_(Object.assign({}, ingresoBase, { telefono_contacto: '' }));
    });
  });
  s.test('validateIngreso: direccion vacia → lanza', function() {
    assertThrows_(function() {
      validateIngresoV2_(Object.assign({}, ingresoBase, { direccion_original: '' }));
    });
  });
  s.test('validateIngreso: requerimiento vacio → lanza', function() {
    assertThrows_(function() {
      validateIngresoV2_(Object.assign({}, ingresoBase, { requerimiento_inicial: '' }));
    });
  });
  s.test('validateIngreso: correo invalido → lanza', function() {
    assertThrows_(function() {
      validateIngresoV2_(Object.assign({}, ingresoBase, { correo_contacto: 'no-es-email' }));
    });
  });

  // validateSeguimientoV2_
  var seguimientoBase = {
    solicitud_id: 'SOL-001',
    fecha_gestion: new Date(),
    responsable_gestion: 'Pablo',
    flujo: 'Acompaniamiento',
    hito: 'Visita domiciliaria',
    estado_hito: 'Realizado',
    detalle_gestion: 'Se realizo visita',
    documento_respaldo_url: ''
  };
  s.test('validateSeguimiento: payload valido → no lanza', function() {
    assertNotThrows_(function() { validateSeguimientoV2_(seguimientoBase); });
  });
  s.test('validateSeguimiento: solicitud_id vacio → lanza', function() {
    assertThrows_(function() {
      validateSeguimientoV2_(Object.assign({}, seguimientoBase, { solicitud_id: '' }));
    });
  });
  s.test('validateSeguimiento: URL invalida → lanza', function() {
    assertThrows_(function() {
      validateSeguimientoV2_(Object.assign({}, seguimientoBase, { documento_respaldo_url: 'no-url' }));
    });
  });
  s.test('validateSeguimiento: URL valida → no lanza', function() {
    assertNotThrows_(function() {
      validateSeguimientoV2_(Object.assign({}, seguimientoBase, { documento_respaldo_url: 'https://docs.google.com' }));
    });
  });

  // validateOrganizacionV2_
  var orgBase = { tipo_organizacion: 'Junta de vecinos', nombre_organizacion: 'JV Los Pinos' };
  s.test('validateOrganizacion: payload valido → no lanza', function() {
    assertNotThrows_(function() { validateOrganizacionV2_(orgBase); });
  });
  s.test('validateOrganizacion: tipo vacio → lanza', function() {
    assertThrows_(function() {
      validateOrganizacionV2_(Object.assign({}, orgBase, { tipo_organizacion: '' }));
    });
  });
  s.test('validateOrganizacion: nombre vacio → lanza', function() {
    assertThrows_(function() {
      validateOrganizacionV2_(Object.assign({}, orgBase, { nombre_organizacion: '' }));
    });
  });

  // validateInstrumentoV2_
  var instrBase = {
    organizacion_id: 'ORG-1',
    instrumento_codigo_catalogo: 'FONDESE',
    instrumento_tipo: 'Subsidio',
    origen_instrumento: 'Externo',
    anio_convocatoria: '2024',
    estado_instrumento: 'Vigente',
    avance_instrumento_pct: '',
    documento_respaldo_url: ''
  };
  s.test('validateInstrumento: payload valido → no lanza', function() {
    assertNotThrows_(function() { validateInstrumentoV2_(instrBase); });
  });
  s.test('validateInstrumento: avance 50 (en rango) → no lanza', function() {
    assertNotThrows_(function() {
      validateInstrumentoV2_(Object.assign({}, instrBase, { avance_instrumento_pct: 50 }));
    });
  });
  s.test('validateInstrumento: avance 101 (fuera de rango) → lanza', function() {
    assertThrows_(function() {
      validateInstrumentoV2_(Object.assign({}, instrBase, { avance_instrumento_pct: 101 }));
    });
  });
  s.test('validateInstrumento: avance -1 (fuera de rango) → lanza', function() {
    assertThrows_(function() {
      validateInstrumentoV2_(Object.assign({}, instrBase, { avance_instrumento_pct: -1 }));
    });
  });
  s.test('validateInstrumento: URL valida → no lanza', function() {
    assertNotThrows_(function() {
      validateInstrumentoV2_(Object.assign({}, instrBase, { documento_respaldo_url: 'https://docs.google.com/file' }));
    });
  });
  s.test('validateInstrumento: URL invalida → lanza', function() {
    assertThrows_(function() {
      validateInstrumentoV2_(Object.assign({}, instrBase, { documento_respaldo_url: 'no-es-url' }));
    });
  });
  s.test('validateInstrumento: organizacion_id vacio → lanza', function() {
    assertThrows_(function() {
      validateInstrumentoV2_(Object.assign({}, instrBase, { organizacion_id: '' }));
    });
  });

  // validateRequisitoV2_
  var reqBase = {
    organizacion_id: 'ORG-1',
    org_instrumento_id: 'OIN-1',
    estado_requisito: 'Pendiente',
    requisito_codigo: 'REQ-001',
    requisito_nombre_libre: '',
    documento_respaldo_url: ''
  };
  s.test('validateRequisito: con codigo de catalogo → no lanza', function() {
    assertNotThrows_(function() { validateRequisitoV2_(reqBase); });
  });
  s.test('validateRequisito: solo nombre libre (sin codigo) → no lanza', function() {
    assertNotThrows_(function() {
      validateRequisitoV2_(Object.assign({}, reqBase, { requisito_codigo: '', requisito_nombre_libre: 'Plano catastral' }));
    });
  });
  s.test('validateRequisito: sin codigo ni nombre libre → lanza', function() {
    assertThrows_(function() {
      validateRequisitoV2_(Object.assign({}, reqBase, { requisito_codigo: '', requisito_nombre_libre: '' }));
    });
  });
  s.test('validateRequisito: organizacion_id vacio → lanza', function() {
    assertThrows_(function() {
      validateRequisitoV2_(Object.assign({}, reqBase, { organizacion_id: '' }));
    });
  });

  // validateSocioRowV2_
  s.test('validateSocio: row valida → {ok: true}', function() {
    assertTrue_(validateSocioRowV2_({ organizacion_id: 'ORG-1', nombre_socio: 'Juan' }).ok);
  });
  s.test('validateSocio: sin organizacion_id → {ok: false, error}', function() {
    var r = validateSocioRowV2_({ organizacion_id: '', nombre_socio: 'Juan' });
    assertFalse_(r.ok);
    assertTrue_(!!r.error);
  });
  s.test('validateSocio: sin nombre_socio → {ok: false, error}', function() {
    var r = validateSocioRowV2_({ organizacion_id: 'ORG-1', nombre_socio: '' });
    assertFalse_(r.ok);
    assertTrue_(!!r.error);
  });

  // buscarCoincidenciasIngreso — omitido: requiere auth + spreadsheet
  s.skip('buscarCoincidenciasIngreso',
    'requiere requireRole_ (Session) + lectura de MAE_Casos');

  return s.run();
}

// ── SUITE 2: AUTH ─────────────────────────────────────────────────────────────

function goPesTestAuth_() {
  var s = createTestSuite_('Auth');

  // normalizeRoleForAccess_
  s.test('normalizeRole: "superuser" → "superuser"', function() {
    assertEqual_(normalizeRoleForAccess_('superuser'), 'superuser');
  });
  s.test('normalizeRole: "visor" → "visor"', function() {
    assertEqual_(normalizeRoleForAccess_('visor'), 'visor');
  });
  s.test('normalizeRole: "coordinador" → "coordinador"', function() {
    assertEqual_(normalizeRoleForAccess_('coordinador'), 'coordinador');
  });
  s.test('normalizeRole: "administrador" → "coordinador" (alias legacy)', function() {
    assertEqual_(normalizeRoleForAccess_('administrador'), 'coordinador');
  });
  s.test('normalizeRole: "operador" → "operador"', function() {
    assertEqual_(normalizeRoleForAccess_('operador'), 'operador');
  });
  s.test('normalizeRole: vacio → "operador" (default)', function() {
    assertEqual_(normalizeRoleForAccess_(''), 'operador');
  });
  s.test('normalizeRole: null → "operador" (default)', function() {
    assertEqual_(normalizeRoleForAccess_(null), 'operador');
  });
  s.test('normalizeRole: "SUPERUSER" mayusculas → "superuser"', function() {
    assertEqual_(normalizeRoleForAccess_('SUPERUSER'), 'superuser');
  });

  // normalizeManagedUserProfile_
  s.test('normalizeProfile: "visor" → "visor"', function() {
    assertEqual_(normalizeManagedUserProfile_('visor'), 'visor');
  });
  s.test('normalizeProfile: "coordinador" → "coordinador"', function() {
    assertEqual_(normalizeManagedUserProfile_('coordinador'), 'coordinador');
  });
  s.test('normalizeProfile: "administrador" → "coordinador"', function() {
    assertEqual_(normalizeManagedUserProfile_('administrador'), 'coordinador');
  });
  s.test('normalizeProfile: "superuser" → "coordinador" (no asignable)', function() {
    assertEqual_(normalizeManagedUserProfile_('superuser'), 'coordinador');
  });
  s.test('normalizeProfile: "operador" → "operador"', function() {
    assertEqual_(normalizeManagedUserProfile_('operador'), 'operador');
  });
  s.test('normalizeProfile: vacio → "operador"', function() {
    assertEqual_(normalizeManagedUserProfile_(''), 'operador');
  });

  // normalizeEmail_
  s.test('normalizeEmail: convierte a minusculas', function() {
    assertEqual_(normalizeEmail_('PABLO@EXAMPLE.COM'), 'pablo@example.com');
  });
  s.test('normalizeEmail: elimina espacios', function() {
    assertEqual_(normalizeEmail_('  test@test.cl  '), 'test@test.cl');
  });
  s.test('normalizeEmail: null → vacio', function() {
    assertEqual_(normalizeEmail_(null), '');
  });

  // getUserRoleLabel_
  s.test('getRoleLabel: visor → "Visor"', function() {
    assertEqual_(getUserRoleLabel_('visor'), 'Visor');
  });
  s.test('getRoleLabel: coordinador → "Coordinador"', function() {
    assertEqual_(getUserRoleLabel_('coordinador'), 'Coordinador');
  });
  s.test('getRoleLabel: operador → "Operador"', function() {
    assertEqual_(getUserRoleLabel_('operador'), 'Operador');
  });

  // normalizeUserBoolLike_
  s.test('normalizeBool: true → true', function() {
    assertTrue_(normalizeUserBoolLike_(true, false));
  });
  s.test('normalizeBool: false → false', function() {
    assertFalse_(normalizeUserBoolLike_(false, true));
  });
  s.test('normalizeBool: 1 → true', function() {
    assertTrue_(normalizeUserBoolLike_(1, false));
  });
  s.test('normalizeBool: 0 → false', function() {
    assertFalse_(normalizeUserBoolLike_(0, true));
  });
  s.test('normalizeBool: "si" → true', function() {
    assertTrue_(normalizeUserBoolLike_('si', false));
  });
  s.test('normalizeBool: "activo" → true', function() {
    assertTrue_(normalizeUserBoolLike_('activo', false));
  });
  s.test('normalizeBool: "no" → false', function() {
    assertFalse_(normalizeUserBoolLike_('no', true));
  });
  s.test('normalizeBool: "inactivo" → false', function() {
    assertFalse_(normalizeUserBoolLike_('inactivo', true));
  });
  s.test('normalizeBool: vacio respeta default true', function() {
    assertTrue_(normalizeUserBoolLike_('', true));
  });
  s.test('normalizeBool: vacio respeta default false', function() {
    assertFalse_(normalizeUserBoolLike_('', false));
  });

  // buildDeniedUser_
  s.test('buildDeniedUser: canAccess es false', function() {
    assertFalse_(buildDeniedUser_('x@test.cl', 'motivo').canAccess);
  });
  s.test('buildDeniedUser: email y reason asignados', function() {
    var u = buildDeniedUser_('x@test.cl', 'Sin dominio');
    assertEqual_(u.email, 'x@test.cl');
    assertEqual_(u.reason, 'Sin dominio');
  });

  // requireRole_ — jerarquía de roles via stub GO_PES_RUNTIME
  s.test('requireRole: visor pasa en lista que incluye visor', function() {
    assertNotThrows_(function() {
      withTestUser_('visor', false, function() {
        requireRole_(['visor', 'operador', 'coordinador', 'superuser']);
      });
    });
  });
  s.test('requireRole: visor bloqueado en lista que excluye visor', function() {
    assertThrows_(function() {
      withTestUser_('visor', false, function() {
        requireRole_(['operador', 'coordinador', 'superuser']);
      });
    });
  });
  s.test('requireRole: operador pasa en lista operador+', function() {
    assertNotThrows_(function() {
      withTestUser_('operador', false, function() {
        requireRole_(['operador', 'coordinador', 'superuser']);
      });
    });
  });
  s.test('requireRole: operador bloqueado en lista coordinador+', function() {
    assertThrows_(function() {
      withTestUser_('operador', false, function() {
        requireRole_(['coordinador', 'superuser']);
      });
    });
  });
  s.test('requireRole: coordinador pasa en lista coordinador+', function() {
    assertNotThrows_(function() {
      withTestUser_('coordinador', false, function() {
        requireRole_(['coordinador', 'superuser']);
      });
    });
  });
  s.test('requireRole: coordinador pasa en lista operador+', function() {
    assertNotThrows_(function() {
      withTestUser_('coordinador', false, function() {
        requireRole_(['operador', 'coordinador', 'superuser']);
      });
    });
  });
  s.test('requireRole: superuser_flag pasa cualquier lista de roles', function() {
    assertNotThrows_(function() {
      withTestUser_('visor', true, function() {
        requireRole_(['coordinador', 'superuser']);
      });
    });
  });
  s.test('requireRole: lista vacia permite cualquier usuario activo', function() {
    assertNotThrows_(function() {
      withTestUser_('visor', false, function() { requireRole_([]); });
    });
  });
  s.test('requireRole: usuario con canAccess false → lanza', function() {
    var saved = GO_PES_RUNTIME.currentUser;
    GO_PES_RUNTIME.currentUser = {
      email: 'bloqueado@goipes.internal',
      perfil: 'operador',
      canAccess: false,
      reason: 'Dominio no autorizado',
      superuser_flag: false,
      activo_flag: false
    };
    try {
      assertThrows_(function() { requireRole_(['operador']); });
    } finally {
      GO_PES_RUNTIME.currentUser = saved;
    }
  });

  // getUsuarioActual / listUsers / updateUser / deactivateUser
  s.skip('getUsuarioActual', 'requiere Session.getActiveUser() + lectura DIM_Usuarios');
  s.skip('listUsers', 'requiere rol superuser + lectura DIM_Usuarios');
  s.skip('updateUser', 'requiere rol superuser + escritura DIM_Usuarios');
  s.skip('deactivateUser', 'requiere rol superuser + PIN + escritura DIM_Usuarios');

  return s.run();
}

// ── SUITE 3: SERVICES (helpers puros) ────────────────────────────────────────

function goPesTestServices_() {
  var s = createTestSuite_('Services');

  // isClosedInicioInstrumentState_
  s.test('isClosedState: "cerrado" → true', function() {
    assertTrue_(isClosedInicioInstrumentState_('cerrado'));
  });
  s.test('isClosedState: "Cerrado" (mayusculas) → true', function() {
    assertTrue_(isClosedInicioInstrumentState_('Cerrado'));
  });
  s.test('isClosedState: "finalizado" → true', function() {
    assertTrue_(isClosedInicioInstrumentState_('finalizado'));
  });
  s.test('isClosedState: "cancelado" → true', function() {
    assertTrue_(isClosedInicioInstrumentState_('cancelado'));
  });
  s.test('isClosedState: "rendido" → true', function() {
    assertTrue_(isClosedInicioInstrumentState_('rendido'));
  });
  s.test('isClosedState: "desistido" → true', function() {
    assertTrue_(isClosedInicioInstrumentState_('desistido'));
  });
  s.test('isClosedState: "activo" → false', function() {
    assertFalse_(isClosedInicioInstrumentState_('activo'));
  });
  s.test('isClosedState: "En gestion" → false', function() {
    assertFalse_(isClosedInicioInstrumentState_('En gestion'));
  });
  s.test('isClosedState: vacio → false', function() {
    assertFalse_(isClosedInicioInstrumentState_(''));
  });

  // resolveInicioAlertTone_
  s.test('alertTone: daysUntil <= highDays → "danger"', function() {
    assertEqual_(resolveInicioAlertTone_(3, 7), 'danger');
  });
  s.test('alertTone: daysUntil == highDays → "danger"', function() {
    assertEqual_(resolveInicioAlertTone_(7, 7), 'danger');
  });
  s.test('alertTone: daysUntil > highDays → "warning"', function() {
    assertEqual_(resolveInicioAlertTone_(8, 7), 'warning');
  });
  s.test('alertTone: dias negativos (vencido) → "danger"', function() {
    assertEqual_(resolveInicioAlertTone_(-1, 7), 'danger');
  });

  // buildInicioAlertStatus_
  s.test('alertStatus: dias negativos → "Vencido hace N dias"', function() {
    assertEqual_(buildInicioAlertStatus_(-3, 7), 'Vencido hace 3 dias');
  });
  s.test('alertStatus: 0 dias → "Vence hoy"', function() {
    assertEqual_(buildInicioAlertStatus_(0, 7), 'Vence hoy');
  });
  s.test('alertStatus: dentro de highDays → "Alta prioridad"', function() {
    assertEqual_(buildInicioAlertStatus_(5, 7), 'Alta prioridad');
  });
  s.test('alertStatus: mas de highDays → "Prioridad media"', function() {
    assertEqual_(buildInicioAlertStatus_(10, 7), 'Prioridad media');
  });

  // diffInicioDays_
  s.test('diffDays: misma fecha → 0', function() {
    var d = new Date('2024-06-01T00:00:00');
    assertEqual_(diffInicioDays_(d, d), 0);
  });
  s.test('diffDays: un dia despues → 1', function() {
    assertEqual_(diffInicioDays_(new Date('2024-06-01'), new Date('2024-06-02')), 1);
  });
  s.test('diffDays: un dia antes → -1', function() {
    assertEqual_(diffInicioDays_(new Date('2024-06-02'), new Date('2024-06-01')), -1);
  });
  s.test('diffDays: 7 dias → 7', function() {
    assertEqual_(diffInicioDays_(new Date('2024-06-01'), new Date('2024-06-08')), 7);
  });

  // parseInicioDate_
  s.test('parseDate: null → null', function() {
    assertEqual_(parseInicioDate_(null), null);
  });
  s.test('parseDate: vacio → null', function() {
    assertEqual_(parseInicioDate_(''), null);
  });
  s.test('parseDate: string invalido → null', function() {
    assertEqual_(parseInicioDate_('fecha-invalida'), null);
  });
  s.test('parseDate: Date valida → normalizada a medianoche', function() {
    var d = parseInicioDate_(new Date('2024-03-15T15:30:00'));
    assertTrue_(d !== null);
    assertEqual_(d.getHours(), 0);
    assertEqual_(d.getMinutes(), 0);
    assertEqual_(d.getSeconds(), 0);
  });

  // getInicioInstrumentDisplayName_
  s.test('displayName: usa instrumento_codigo_catalogo primero', function() {
    assertEqual_(getInicioInstrumentDisplayName_({
      instrumento_codigo_catalogo: 'FONDESE', instrumento_tipo: 'Subsidio'
    }), 'FONDESE');
  });
  s.test('displayName: fallback a instrumento_tipo si no hay codigo', function() {
    assertEqual_(getInicioInstrumentDisplayName_({ instrumento_tipo: 'Subsidio' }), 'Subsidio');
  });
  s.test('displayName: row vacio → "Beneficio"', function() {
    assertEqual_(getInicioInstrumentDisplayName_({}), 'Beneficio');
  });
  s.test('displayName: null → "Beneficio"', function() {
    assertEqual_(getInicioInstrumentDisplayName_(null), 'Beneficio');
  });

  // buildInicioReminderItems_
  s.test('reminderItems: org sin fecha y estado pendiente → item derivado', function() {
    var rows = [{
      organizacion_id: 'ORG-T',
      nombre_organizacion: 'JV Test',
      uv: '5', sector: 'norte',
      estado_constitucion: 'en proceso',
      fecha_asamblea_constitucion: null,
      fecha_ratificacion: null
    }];
    var result = buildInicioReminderItems_(rows, { limit: 5 });
    assertEqual_(result.length, 1);
    assertEqual_(result[0].source, 'derived');
  });
  s.test('reminderItems: array vacio → []', function() {
    assertEqual_(buildInicioReminderItems_([], {}).length, 0);
  });
  s.test('reminderItems: null → []', function() {
    assertEqual_(buildInicioReminderItems_(null, {}).length, 0);
  });
  s.test('reminderItems: org ya constituida → no genera item derivado', function() {
    var rows = [{
      organizacion_id: 'ORG-T',
      nombre_organizacion: 'JV Constituida',
      estado_constitucion: 'constituida',
      fecha_asamblea_constitucion: null,
      fecha_ratificacion: null
    }];
    assertEqual_(buildInicioReminderItems_(rows, {}).length, 0);
  });

  // resolveHistorialCutoffDate_
  s.test('cutoffDate: "all" → null', function() {
    assertEqual_(resolveHistorialCutoffDate_('all'), null);
  });
  s.test('cutoffDate: "" → null', function() {
    assertEqual_(resolveHistorialCutoffDate_(''), null);
  });
  s.test('cutoffDate: clave desconocida → null', function() {
    assertEqual_(resolveHistorialCutoffDate_('siempre'), null);
  });
  s.test('cutoffDate: "last_week" → Date no nula', function() {
    assertTrue_(resolveHistorialCutoffDate_('last_week') !== null);
  });
  s.test('cutoffDate: "last_month" → Date no nula', function() {
    assertTrue_(resolveHistorialCutoffDate_('last_month') !== null);
  });
  s.test('cutoffDate: "last_year" → Date no nula', function() {
    assertTrue_(resolveHistorialCutoffDate_('last_year') !== null);
  });

  // parseHistorialJsonSafe_
  s.test('parseJsonSafe: JSON valido → objeto parseado', function() {
    assertEqual_(parseHistorialJsonSafe_('{"a":1}').a, 1);
  });
  s.test('parseJsonSafe: JSON invalido → null', function() {
    assertEqual_(parseHistorialJsonSafe_('{invalid}'), null);
  });
  s.test('parseJsonSafe: null → null', function() {
    assertEqual_(parseHistorialJsonSafe_(null), null);
  });
  s.test('parseJsonSafe: vacio → null', function() {
    assertEqual_(parseHistorialJsonSafe_(''), null);
  });
  s.test('parseJsonSafe: ya es objeto → lo retorna directamente', function() {
    var obj = { x: 2 };
    assertTrue_(parseHistorialJsonSafe_(obj) === obj);
  });

  // buildHistorialDetailText_
  s.test('detailText: null → vacio', function() {
    assertEqual_(buildHistorialDetailText_(null), '');
  });
  s.test('detailText: string no-JSON → retorna tal cual (trimado)', function() {
    assertEqual_(buildHistorialDetailText_('texto plano'), 'texto plano');
  });
  s.test('detailText: JSON con nombre_organizacion → lo incluye en resultado', function() {
    assertTrue_(buildHistorialDetailText_('{"nombre_organizacion":"JV Test"}').indexOf('JV Test') !== -1);
  });
  s.test('detailText: JSON array → elementos unidos por " | "', function() {
    assertTrue_(buildHistorialDetailText_('["a","b","c"]').indexOf(' | ') !== -1);
  });

  // filterHistorialRowsByPeriod_
  s.test('filterHistorial: "all" retorna todas las filas', function() {
    var rows = [{ timestamp: new Date(), action: 'X' }, { timestamp: new Date('2000-01-01'), action: 'Y' }];
    assertEqual_(filterHistorialRowsByPeriod_(rows, 'all').length, 2);
  });
  s.test('filterHistorial: "" retorna todas las filas', function() {
    var rows = [{ timestamp: new Date(), action: 'X' }];
    assertEqual_(filterHistorialRowsByPeriod_(rows, '').length, 1);
  });
  s.test('filterHistorial: "last_week" excluye filas antiguas', function() {
    var reciente = { timestamp: new Date(), action: 'A' };
    var antiguo  = { timestamp: new Date('2000-01-01'), action: 'B' };
    var result = filterHistorialRowsByPeriod_([reciente, antiguo], 'last_week');
    assertEqual_(result.length, 1);
    assertEqual_(result[0].action, 'A');
  });

  // Funciones públicas omitidas por requerir auth + spreadsheet
  s.skip('buscarVecino',        'requiere requireModuleAccess_ + lectura MAE_Casos / MAE_Organizaciones');
  s.skip('buscarOrganizacion',  'requiere requireModuleAccess_ + lectura MAE_Organizaciones');
  s.skip('getInicioPanelData',  'requiere requireModuleAccess_ + lectura MAE_Organizaciones + FACT_Instrumentos');
  s.skip('obtenerFicha',        'requiere requireModuleAccess_ + lectura multiples hojas');
  s.skip('guardarIngreso',      'escribe en RAW_Ingreso + MAE_Casos + LockService');
  s.skip('guardarSeguimiento',  'escribe en RAW_Seguimiento + FACT_Hitos');
  s.skip('guardarOrganizacion', 'escribe en RAW_Organizaciones + MAE_Organizaciones');
  s.skip('guardarInstrumento',  'escribe en RAW_Instrumentos + FACT_Instrumentos');
  s.skip('guardarRequisito',    'escribe en RAW_Requisitos + FACT_Requisitos');
  s.skip('refrescarVistasYMaster', 'requiere rol coordinador + reconstruye todas las vistas');

  return s.run();
}

// ── SUITE 4: AVANCE ───────────────────────────────────────────────────────────

function goPesTestAvance_() {
  var s = createTestSuite_('Avance');

  // goPesNormalizeOrganizacionNombre_
  s.test('normalizeNombre: elimina tildes', function() {
    assertEqual_(goPesNormalizeOrganizacionNombre_('Ángel'), 'angel');
  });
  s.test('normalizeNombre: convierte a minusculas', function() {
    assertEqual_(goPesNormalizeOrganizacionNombre_('JUNTA'), 'junta');
  });
  s.test('normalizeNombre: colapsa espacios multiples', function() {
    assertEqual_(goPesNormalizeOrganizacionNombre_('Junta  de  Vecinos'), 'junta de vecinos');
  });
  s.test('normalizeNombre: elimina caracteres especiales', function() {
    assertEqual_(goPesNormalizeOrganizacionNombre_('Comité #1'), 'comite 1');
  });
  s.test('normalizeNombre: null → vacio', function() {
    assertEqual_(goPesNormalizeOrganizacionNombre_(null), '');
  });
  s.test('normalizeNombre: string vacio → vacio', function() {
    assertEqual_(goPesNormalizeOrganizacionNombre_(''), '');
  });

  // goPesIsTramoPreconstitucion_
  s.test('isTramoPre: "Preconstitución" → true', function() {
    assertTrue_(goPesIsTramoPreconstitucion_('Preconstitución'));
  });
  s.test('isTramoPre: "preconstitucion" → true', function() {
    assertTrue_(goPesIsTramoPreconstitucion_('preconstitucion'));
  });
  s.test('isTramoPre: "Formalización posterior" → false', function() {
    assertFalse_(goPesIsTramoPreconstitucion_('Formalización posterior'));
  });
  s.test('isTramoPre: vacio → false', function() {
    assertFalse_(goPesIsTramoPreconstitucion_(''));
  });

  // goPesIsTramoFormalizacion_
  s.test('isTramoForm: "Formalización posterior" → true', function() {
    assertTrue_(goPesIsTramoFormalizacion_('Formalización posterior'));
  });
  s.test('isTramoForm: "formalizacion" → true', function() {
    assertTrue_(goPesIsTramoFormalizacion_('formalizacion'));
  });
  s.test('isTramoForm: "Preconstitución" → false', function() {
    assertFalse_(goPesIsTramoFormalizacion_('Preconstitución'));
  });
  s.test('isTramoForm: vacio → false', function() {
    assertFalse_(goPesIsTramoFormalizacion_(''));
  });

  // goPesBool_
  s.test('goPesBool: true → true', function() {
    assertTrue_(goPesBool_(true));
  });
  s.test('goPesBool: false → false', function() {
    assertFalse_(goPesBool_(false));
  });
  s.test('goPesBool: "true" → true', function() {
    assertTrue_(goPesBool_('true'));
  });
  s.test('goPesBool: "si" → true', function() {
    assertTrue_(goPesBool_('si'));
  });
  s.test('goPesBool: "sí" → true', function() {
    assertTrue_(goPesBool_('sí'));
  });
  s.test('goPesBool: "1" → true', function() {
    assertTrue_(goPesBool_('1'));
  });
  s.test('goPesBool: 1 (número) → true', function() {
    assertTrue_(goPesBool_(1));
  });
  s.test('goPesBool: "no" → false', function() {
    assertFalse_(goPesBool_('no'));
  });
  s.test('goPesBool: vacio → false', function() {
    assertFalse_(goPesBool_(''));
  });
  s.test('goPesBool: null → false', function() {
    assertFalse_(goPesBool_(null));
  });
  s.test('goPesBool: 0 → false', function() {
    assertFalse_(goPesBool_(0));
  });

  // goPesGetEstadoAvanceActualFromRows_
  s.test('getEstadoFromRows: array vacio → fallback estado Activo', function() {
    var r = goPesGetEstadoAvanceActualFromRows_([], 'SOL-001');
    assertEqual_(r.estado_avance, 'Activo');
    assertEqual_(r.solicitud_id, 'SOL-001');
  });
  s.test('getEstadoFromRows: null → fallback estado Activo', function() {
    assertEqual_(goPesGetEstadoAvanceActualFromRows_(null, 'SOL-X').estado_avance, 'Activo');
  });
  s.test('getEstadoFromRows: prefiere fila con activo_flag=true', function() {
    var rows = [
      { estado_avance: 'Stand by', activo_flag: false,  timestamp_registro: new Date('2024-01-01') },
      { estado_avance: 'Activo',   activo_flag: true,   timestamp_registro: new Date('2024-01-02') }
    ];
    assertEqual_(goPesGetEstadoAvanceActualFromRows_(rows, '').estado_avance, 'Activo');
  });
  s.test('getEstadoFromRows: sin activos, retorna el más reciente', function() {
    var rows = [
      { estado_avance: 'Stand by', activo_flag: false, timestamp_registro: new Date('2024-01-01') },
      { estado_avance: 'Detenido', activo_flag: false, timestamp_registro: new Date('2024-06-01') }
    ];
    assertEqual_(goPesGetEstadoAvanceActualFromRows_(rows, '').estado_avance, 'Detenido');
  });
  s.test('getEstadoFromRows: activo_flag como string "true"', function() {
    var rows = [{ estado_avance: 'Finalizado', activo_flag: 'true', timestamp_registro: new Date() }];
    assertEqual_(goPesGetEstadoAvanceActualFromRows_(rows, '').estado_avance, 'Finalizado');
  });

  // goPesIsHitoCreacionOrganizacion_
  s.test('isHitoCreacion: orden 5 + preconstitución + documentacion → true', function() {
    assertTrue_(goPesIsHitoCreacionOrganizacion_({
      orden_hito: 5, tramo: 'Preconstitución', nombre_hito: 'Ingreso de documentación'
    }));
  });
  s.test('isHitoCreacion: orden 5 + preconstitución + ingreso → true', function() {
    assertTrue_(goPesIsHitoCreacionOrganizacion_({
      orden_hito: 5, tramo: 'Preconstitución', nombre_hito: 'Hito de ingreso'
    }));
  });
  s.test('isHitoCreacion: orden 5 + tramo formalizacion → false', function() {
    assertFalse_(goPesIsHitoCreacionOrganizacion_({
      orden_hito: 5, tramo: 'Formalización posterior', nombre_hito: 'Ingreso de documentación'
    }));
  });
  s.test('isHitoCreacion: orden 3 + preconstitución → false', function() {
    assertFalse_(goPesIsHitoCreacionOrganizacion_({
      orden_hito: 3, tramo: 'Preconstitución', nombre_hito: 'Primera reunión'
    }));
  });
  s.test('isHitoCreacion: null → false', function() {
    assertFalse_(goPesIsHitoCreacionOrganizacion_(null));
  });

  // funciones que requieren spreadsheet o auth
  s.skip('getCatalogosAvanceClient',      'requiere lectura CAT_Hitos_Avance + auth');
  s.skip('getOrganizacionesAvanceClient', 'requiere lectura MAE_Organizaciones + auth');
  s.skip('getAvanceOrganizacion',         'requiere auth + lectura FACT_Avance_Hitos + FACT_Avance_Estado');
  s.skip('registrarHitoAvance',           'escribe en FACT_Avance_Hitos + LockService + auth');
  s.skip('cambiarEstadoAvance',           'escribe en FACT_Avance_Estado + auth');

  return s.run();
}

// ── SUITE 5: BENEFICIOS ───────────────────────────────────────────────────────

function goPesTestBeneficios_() {
  var s = createTestSuite_('Beneficios');

  // getCamarasStateOptions_
  s.test('stateOptions: retorna array no vacio', function() {
    assertTrue_(getCamarasStateOptions_().length > 0);
  });
  s.test('stateOptions: contiene "Beneficio cerrado"', function() {
    assertTrue_(getCamarasStateOptions_().indexOf('Beneficio cerrado') !== -1);
  });
  s.test('stateOptions: contiene "Solicitud enviada"', function() {
    assertTrue_(getCamarasStateOptions_().indexOf('Solicitud enviada') !== -1);
  });
  s.test('stateOptions: contiene "Visita agendada"', function() {
    assertTrue_(getCamarasStateOptions_().indexOf('Visita agendada') !== -1);
  });

  // getCamarasChecklistDefinitions_
  s.test('checklistDefs: retorna array no vacio', function() {
    assertTrue_(getCamarasChecklistDefinitions_().length > 0);
  });
  s.test('checklistDefs: cada item tiene code y label', function() {
    getCamarasChecklistDefinitions_().forEach(function(d) {
      assertTrue_(typeof d.code === 'string' && d.code.length > 0);
      assertTrue_(typeof d.label === 'string' && d.label.length > 0);
    });
  });
  s.test('checklistDefs: contiene DOC_CERT_VIGENCIA', function() {
    assertTrue_(getCamarasChecklistDefinitions_().some(function(d) { return d.code === 'DOC_CERT_VIGENCIA'; }));
  });
  s.test('checklistDefs: contiene DOC_CERT_DIRECTORIO', function() {
    assertTrue_(getCamarasChecklistDefinitions_().some(function(d) { return d.code === 'DOC_CERT_DIRECTORIO'; }));
  });

  // isCamarasEligibleListRow_
  s.test('isEligible: "Elegible por certificado definitivo" → true', function() {
    assertTrue_(isCamarasEligibleListRow_({ estado_beneficio: 'Elegible por certificado definitivo' }));
  });
  s.test('isEligible: "Gestion pendiente" → true', function() {
    assertTrue_(isCamarasEligibleListRow_({ estado_beneficio: 'Gestion pendiente' }));
  });
  s.test('isEligible: "Solicitud de visita tecnica preparada" → true', function() {
    assertTrue_(isCamarasEligibleListRow_({ estado_beneficio: 'Solicitud de visita tecnica preparada' }));
  });
  s.test('isEligible: "Solicitud enviada" → false', function() {
    assertFalse_(isCamarasEligibleListRow_({ estado_beneficio: 'Solicitud enviada' }));
  });
  s.test('isEligible: "Beneficio cerrado" → false', function() {
    assertFalse_(isCamarasEligibleListRow_({ estado_beneficio: 'Beneficio cerrado' }));
  });
  s.test('isEligible: null row → false', function() {
    assertFalse_(isCamarasEligibleListRow_(null));
  });
  s.test('isEligible: estado vacio → false', function() {
    assertFalse_(isCamarasEligibleListRow_({ estado_beneficio: '' }));
  });

  // isCamarasActiveListRow_
  s.test('isActive: "Solicitud enviada" → true', function() {
    assertTrue_(isCamarasActiveListRow_({ estado_beneficio: 'Solicitud enviada' }));
  });
  s.test('isActive: "Visita agendada" → true', function() {
    assertTrue_(isCamarasActiveListRow_({ estado_beneficio: 'Visita agendada' }));
  });
  s.test('isActive: "Visita realizada" → true', function() {
    assertTrue_(isCamarasActiveListRow_({ estado_beneficio: 'Visita realizada' }));
  });
  s.test('isActive: "Convenio recibido" → true', function() {
    assertTrue_(isCamarasActiveListRow_({ estado_beneficio: 'Convenio recibido' }));
  });
  s.test('isActive: "Gestion pendiente" → false', function() {
    assertFalse_(isCamarasActiveListRow_({ estado_beneficio: 'Gestion pendiente' }));
  });
  s.test('isActive: "Beneficio cerrado" → false', function() {
    assertFalse_(isCamarasActiveListRow_({ estado_beneficio: 'Beneficio cerrado' }));
  });
  s.test('isActive: null row → false', function() {
    assertFalse_(isCamarasActiveListRow_(null));
  });

  // resolveCamarasStageIndex_
  s.test('stageIndex: closure cerrada → index 9', function() {
    assertEqual_(resolveCamarasStageIndex_({ closure: { closed: true, closedDate: new Date() } }).index, 9);
  });
  s.test('stageIndex: closure → label "Beneficio cerrado"', function() {
    assertEqual_(resolveCamarasStageIndex_({ closure: { closed: true, closedDate: new Date() } }).label, 'Beneficio cerrado');
  });
  s.test('stageIndex: convenio recibido → index 8', function() {
    assertEqual_(resolveCamarasStageIndex_({ agreement: { received: true, receivedDate: new Date() } }).index, 8);
  });
  s.test('stageIndex: visita completada → index 6', function() {
    assertEqual_(resolveCamarasStageIndex_({ visit: { visitCompleted: true } }).index, 6);
  });
  s.test('stageIndex: visita agendada → index 5', function() {
    assertEqual_(resolveCamarasStageIndex_({ response: { visitDate: new Date() } }).index, 5);
  });
  s.test('stageIndex: email enviado → index 3', function() {
    assertEqual_(resolveCamarasStageIndex_({ email: { sentConfirmed: true, sentDate: new Date() } }).index, 3);
  });
  s.test('stageIndex: solo eligibilityDate → index 0', function() {
    assertEqual_(resolveCamarasStageIndex_({ eligibilityDate: new Date() }).index, 0);
  });
  s.test('stageIndex: sin datos → index 1 (gestion pendiente)', function() {
    assertEqual_(resolveCamarasStageIndex_({}).index, 1);
  });
  s.test('stageIndex: closure prevalece sobre convenio', function() {
    assertEqual_(resolveCamarasStageIndex_({
      closure:   { closed: true, closedDate: new Date() },
      agreement: { received: true, receivedDate: new Date() }
    }).index, 9);
  });
  s.test('stageIndex: cada resultado tiene nextStep no vacio', function() {
    var fixtures = [
      { closure: { closed: true, closedDate: new Date() } },
      { agreement: { received: true, receivedDate: new Date() } },
      { visit: { visitCompleted: true } },
      { response: { visitDate: new Date() } },
      { eligibilityDate: new Date() },
      {}
    ];
    fixtures.forEach(function(f) {
      assertTrue_(resolveCamarasStageIndex_(f).nextStep.length > 0);
    });
  });

  // funciones que requieren spreadsheet o auth
  s.skip('getBeneficiosModuloPanel',        'requiere auth + lectura FACT_Instrumentos');
  s.skip('guardarCamaras1414Organizacion',   'requiere auth + escritura FACT_Beneficios');
  s.skip('goPesGetFondeseList',              'requiere auth + lectura FACT_Fondese');
  s.skip('goPesUpsertFondese',               'requiere auth + escritura FACT_Fondese');
  s.skip('goPesGetFormEventos',              'requiere auth + lectura FACT_Form_Eventos');
  s.skip('goPesUpsertFormEvento',            'requiere auth + escritura + trigger de tiempo');
  s.skip('goPesGetOrgsElegiblesFondese',     'requiere auth + lectura MAE_Organizaciones + FACT_Avance_Hitos');

  return s.run();
}
