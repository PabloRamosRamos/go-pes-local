 /**
 * ZZ_AvancePhase2.gs
 * Fase 2 del módulo "Avance"
 *
 * Objetivo:
 * - Poblar CAT_Hitos_Avance con el catálogo inicial de hitos
 * - Dejar wrappers visibles para siembra y diagnóstico
 *
 * Requiere:
 * - ZZ_AvancePhase1.gs ya instalado
 */

/** Wrapper visible */
function goPesSembrarCatalogoAvanceFase2() {
  return goPesSembrarCatalogoAvanceFase2_();
}

/** Wrapper visible */
function goPesDiagnosticarCatalogoAvanceFase2() {
  return goPesDiagnosticarCatalogoAvanceFase2_();
}

/** Catálogo inicial de hitos */
function getSeedCatalogoHitosAvance_() {
  return [
    {
      codigo_hito: 'PRE_01',
      tramo: 'Preconstitución',
      orden_hito: 1,
      nombre_hito: 'Reunión informativa realizada',
      descripcion: 'El vecino o grupo recibió orientación sobre el proceso.',
      codigo_hito_previo: '',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'PRE_02',
      tramo: 'Preconstitución',
      orden_hito: 2,
      nombre_hito: 'Carta por oficina de partes',
      descripcion: 'Ingreso de carta solicitando ministro de fe, dirigida al alcalde.',
      codigo_hito_previo: 'PRE_01',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'PRE_03',
      tramo: 'Preconstitución',
      orden_hito: 3,
      nombre_hito: 'Fecha asignada',
      descripcion: 'Secretaría informa día, fecha y hora de la asamblea de constitución.',
      codigo_hito_previo: 'PRE_02',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'PRE_04',
      tramo: 'Preconstitución',
      orden_hito: 4,
      nombre_hito: 'Asamblea constitutiva realizada',
      descripcion: 'Aquí nace formalmente el expediente de constitución.',
      codigo_hito_previo: 'PRE_03',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'PRE_05',
      tramo: 'Preconstitución',
      orden_hito: 5,
      nombre_hito: 'Documentación ingresada a constitución',
      descripcion: 'El acta, estatutos y documentación fueron presentados ante la entidad correspondiente.',
      codigo_hito_previo: 'PRE_04',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'PRE_06',
      tramo: 'Preconstitución',
      orden_hito: 6,
      nombre_hito: 'Observaciones subsanadas',
      descripcion: 'Solo aplica si existieron observaciones posteriores al ingreso.',
      codigo_hito_previo: 'PRE_05',
      permite_saltar: true,
      activo_flag: true
    },
    {
      codigo_hito: 'PRE_07',
      tramo: 'Preconstitución',
      orden_hito: 7,
      nombre_hito: 'Certificado provisorio obtenido',
      descripcion: 'Aquí la organización ya tiene personalidad jurídica.',
      codigo_hito_previo: 'PRE_05',
      permite_saltar: true,
      activo_flag: true
    },
    {
      codigo_hito: 'FOR_01',
      tramo: 'Formalización posterior',
      orden_hito: 1,
      nombre_hito: 'Ingreso comisión electoral',
      descripcion: 'Informan a secretaría municipal la fecha de asamblea para ratificar directiva.',
      codigo_hito_previo: 'PRE_07',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'FOR_02',
      tramo: 'Formalización posterior',
      orden_hito: 2,
      nombre_hito: 'Asamblea de ratificación',
      descripcion: 'Se realiza la asamblea de ratificación sin presencia municipal.',
      codigo_hito_previo: 'FOR_01',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'FOR_03',
      tramo: 'Formalización posterior',
      orden_hito: 3,
      nombre_hito: 'Documentación ingresada a ratificación',
      descripcion: 'El acta y documentación fueron presentados ante la entidad correspondiente.',
      codigo_hito_previo: 'FOR_02',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'FOR_04',
      tramo: 'Formalización posterior',
      orden_hito: 4,
      nombre_hito: 'Certificado definitivo obtenido',
      descripcion: 'Registro Civil hace entrega del certificado definitivo válido por 3 años.',
      codigo_hito_previo: 'FOR_03',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'FOR_05',
      tramo: 'Formalización posterior',
      orden_hito: 5,
      nombre_hito: 'Registro municipal habilitado (RMRFP)',
      descripcion: 'Para organizaciones que deben quedar aptas para gestión o subvención.',
      codigo_hito_previo: 'FOR_04',
      permite_saltar: false,
      activo_flag: true
    },
    {
      codigo_hito: 'FOR_06',
      tramo: 'Formalización posterior',
      orden_hito: 6,
      nombre_hito: 'Registro de colaboradores del Estado (RCCE) completado',
      descripcion: 'Si aplica al tipo de organización.',
      codigo_hito_previo: 'FOR_05',
      permite_saltar: true,
      activo_flag: true
    },
    {
      codigo_hito: 'FOR_07',
      tramo: 'Formalización posterior',
      orden_hito: 7,
      nombre_hito: 'RUT obtenido',
      descripcion: 'Hito administrativo clave.',
      codigo_hito_previo: 'FOR_06',
      permite_saltar: true,
      activo_flag: true
    },
    {
      codigo_hito: 'FOR_08',
      tramo: 'Formalización posterior',
      orden_hito: 8,
      nombre_hito: 'Cuenta corriente habilitada',
      descripcion: 'Último hito fuerte de formalización operativa.',
      codigo_hito_previo: 'FOR_07',
      permite_saltar: true,
      activo_flag: true
    }
  ];
}

/** Siembra completa del catálogo */
function goPesSembrarCatalogoAvanceFase2_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No se encontró el Spreadsheet activo.');

  if (typeof goPesApplyAvancePhase1Config_ !== 'function') {
    throw new Error('No está disponible la Fase 1. Instala primero ZZ_AvancePhase1.gs.');
  }

  goPesApplyAvancePhase1Config_();

  const defs = getGoPesAvanceSheetDefinitions_();
  const sheetName = GO_PES_V2.SHEETS.CAT_HITOS_AVANCE;
  const headers = defs[sheetName];
  if (!headers || !headers.length) {
    throw new Error('No se encontraron headers para CAT_Hitos_Avance.');
  }

  goPesEnsureSheetHeadersSafe_(ss, sheetName, headers);

  const seed = getSeedCatalogoHitosAvance_();
  const rows = seed
    .sort(function(a, b) {
      const tramoCompare = String(a.tramo || '').localeCompare(String(b.tramo || ''), 'es');
      if (tramoCompare !== 0) return tramoCompare;
      return Number(a.orden_hito || 0) - Number(b.orden_hito || 0);
    })
    .map(function(item) {
      return headers.map(function(h) {
        if (h === 'permite_saltar' || h === 'activo_flag') {
          return item[h] === true;
        }
        return item[h] !== undefined ? item[h] : '';
      });
    });

  replaceSheetData_(sheetName, headers, rows);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Catálogo inicial de hitos de Avance cargado.',
    'GO-PES',
    5
  );

  Logger.log(JSON.stringify({
    ok: true,
    sheet: sheetName,
    total_hitos: rows.length,
    total_pre: seed.filter(function(x) { return x.tramo === 'Preconstitución'; }).length,
    total_for: seed.filter(function(x) { return x.tramo === 'Formalización posterior'; }).length
  }, null, 2));

  return {
    ok: true,
    sheet: sheetName,
    total_hitos: rows.length
  };
}

/** Diagnóstico del catálogo */
function goPesDiagnosticarCatalogoAvanceFase2_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No se encontró el Spreadsheet activo.');

  if (typeof goPesApplyAvancePhase1Config_ !== 'function') {
    throw new Error('No está disponible la Fase 1. Instala primero ZZ_AvancePhase1.gs.');
  }

  goPesApplyAvancePhase1Config_();

  const sheetName = GO_PES_V2.SHEETS.CAT_HITOS_AVANCE;
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error('No existe la hoja CAT_Hitos_Avance.');

  const headers = getGoPesAvanceSheetDefinitions_()[sheetName];
  const data = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues()
    : [];

  const report = {
    exists: true,
    total_rows: data.length,
    total_pre: 0,
    total_for: 0,
    codigos_duplicados: [],
    codigos_vacios: 0
  };

  const seen = {};
  data.forEach(function(row) {
    const item = {};
    headers.forEach(function(h, i) {
      item[h] = row[i];
    });

    const codigo = String(item.codigo_hito || '').trim();
    const tramo = String(item.tramo || '').trim();

    if (!codigo) {
      report.codigos_vacios += 1;
    } else {
      if (seen[codigo]) report.codigos_duplicados.push(codigo);
      seen[codigo] = true;
    }

    if (tramo === 'Preconstitución') report.total_pre += 1;
    if (tramo === 'Formalización posterior') report.total_for += 1;
  });

  Logger.log(JSON.stringify(report, null, 2));
  return report;
}