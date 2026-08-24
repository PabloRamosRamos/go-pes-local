function importarSocios(payload) {
  const diag = goPesDiagStart_('ZZ_SociosBackend.importarSocios', {
    rows_input: payload && Array.isArray(payload.rows) ? payload.rows.length : 0
  });
  const user = requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);
  const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
  const validRows = [];
  const errors = [];
  const now = new Date();

  // Orgs suspendidas/eliminadas: no se importan socios hacia ellas (solo lectura).
  const orgsSuspendidas_ = {};
  getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES).forEach(function(o) {
    const e = String(o.estado_general_organizacion || '').toLowerCase();
    if (e.indexOf('suspend') !== -1 || e.indexOf('elimin') !== -1) {
      orgsSuspendidas_[String(o.organizacion_id || '').trim()] = true;
    }
  });

  rows.forEach((row, idx) => {
    const check = validateSocioRowV2_(row);
    if (!check.ok) {
      errors.push({ index: idx + 1, error: check.error, row: row });
      return;
    }
    const orgIdRow = String(row.organizacion_id || '').trim();
    if (orgIdRow && orgsSuspendidas_[orgIdRow]) {
      errors.push({ index: idx + 1, error: 'La organización está suspendida: solo lectura.', row: row });
      return;
    }
    validRows.push(row);
  });

  const rawRows = [];
  const factRows = [];

  validRows.forEach(function(row) {
    const socioId = row.socio_id || nextId_('socio', 'SOC');
    const solicitudId = String(row.solicitud_id || '').trim();
    const organizacionId = String(row.organizacion_id || '').trim();
    const vinc = (solicitudId || organizacionId) ? 'manual' : 'pendiente';

    rawRows.push({
      created_at: now,
      source: 'WEB_APP',
      user_email: user.email,
      organizacion_id: organizacionId,
      run_socio: row.run_socio || '',
      numero_registro: row.numero_registro || '',
      nombre_socio: row.nombre_socio,
      edad: asNumberOrBlank_(row.edad),
      cargo: row.cargo || '',
      direccion_socio: row.direccion_socio || '',
      ubicacion_socio: row.ubicacion_socio || '',
      nombre_comite_origen: row.nombre_comite_origen || '',
      status_carga: errors.length ? 'PARCIAL' : 'OK',
      legacy_source: '',
      legacy_key: '',
      solicitud_id: solicitudId,
      grupo_label_origen: '',
      telefono_socio: String(row.telefono_socio || '').trim(),
      correo_socio: String(row.correo_socio || '').trim(),
      consentimiento: String(row.consentimiento || '').trim(),
      fecha_registro: String(row.fecha_registro || '').trim(),
      vinculo_estado: vinc
    });

    factRows.push({
      socio_id: socioId,
      organizacion_id: organizacionId,
      run_socio: row.run_socio || '',
      numero_registro: row.numero_registro || '',
      nombre_socio: row.nombre_socio,
      edad: asNumberOrBlank_(row.edad),
      cargo: row.cargo || '',
      direccion_socio: row.direccion_socio || '',
      ubicacion_socio: row.ubicacion_socio || '',
      nombre_comite_origen: row.nombre_comite_origen || '',
      status_carga: 'OK',
      updated_by: user.email,
      updated_at: now,
      solicitud_id: solicitudId,
      telefono_socio: String(row.telefono_socio || '').trim(),
      correo_socio: String(row.correo_socio || '').trim(),
      consentimiento: String(row.consentimiento || '').trim(),
      fecha_registro: String(row.fecha_registro || '').trim(),
      vinculo_estado: vinc
    });
  });

  appendRowObjects_(GO_PES_V2.SHEETS.RAW_SOCIOS, rawRows);
  upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', factRows, false);

  const affectedOrgIds = uniqueNonBlank_(validRows.map(function(row) {
    return row.organizacion_id;
  }));
  const solicitudesByOrg = {};
  getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES).forEach(function(row) {
    const orgId = String(row.organizacion_id || '').trim();
    if (!orgId) return;
    solicitudesByOrg[orgId] = String(row.solicitud_id || '').trim();
  });

  refreshPartialArtifacts_({
    masterSolicitudIds: uniqueNonBlank_(affectedOrgIds.map(function(orgId) {
      return solicitudesByOrg[orgId] || '';
    })),
    vistaOrganizacionIds: affectedOrgIds
  });
  logProcessing_('INFO', 'importarSocios', 'socios', '', user.email, errors.length ? 'PARCIAL' : 'OK', { total: rows.length, validos: validRows.length, errores: errors.length });
  logUserAction_('IMPORT_SOCIOS', 'socios', '', errors.length ? 'PARCIAL' : 'OK', { total: rows.length, errores: errors });
  const result = {
    ok: errors.length === 0,
    total: rows.length,
    imported: validRows.length,
    errors: errors,
    importedRows: serializeForClient_(factRows)
  };
  goPesDiagEnd_(diag, {
    ok: result.ok,
    imported: validRows.length,
    errors: errors.length
  });
  return result;
}

function getSociosModuloClient() {
  const diag = goPesDiagStart_('ZZ_SociosBackend.getSociosModuloClient', {});
  requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);

  const socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];

  // OPTIMIZACIÓN: Usar índices en lugar de scan completo
  const orgById = buildOrganizacionesByOrgIdIndex_();
  const caseByOrgId = buildCasosByOrgIdIndex_();

  const rows = socios.map(function(row) {
    const organizacionId = String(row.organizacion_id || '').trim();
    const org = orgById[organizacionId] || {};
    const caseRow = caseByOrgId[organizacionId] || {};
    const nombreComite = String(row.nombre_comite_origen || org.nombre_organizacion || '').trim();
    return {
      socio_id: row.socio_id || '',
      organizacion_id: organizacionId,
      solicitud_id: String(row.solicitud_id || org.solicitud_id || caseRow.solicitud_id || '').trim(),
      nombre_organizacion: String(org.nombre_organizacion || '').trim(),
      nombre_comite: nombreComite,
      nombre_comite_origen: String(row.nombre_comite_origen || '').trim(),
      run_socio: String(row.run_socio || '').trim(),
      numero_registro: String(row.numero_registro || '').trim(),
      nombre_socio: String(row.nombre_socio || '').trim(),
      edad: row.edad,
      cargo: String(row.cargo || '').trim(),
      direccion_socio: String(row.direccion_socio || '').trim(),
      ubicacion_socio: String(row.ubicacion_socio || '').trim(),
      // Contacto del socio (form nuevo); fallback al contacto del caso para datos antiguos.
      telefono_contacto: String(row.telefono_socio || caseRow.telefono_contacto || '').trim(),
      correo_contacto: String(row.correo_socio || caseRow.correo_contacto || '').trim(),
      consentimiento: String(row.consentimiento || '').trim(),
      vinculo_estado: String(row.vinculo_estado || '').trim(),
      grupo_label_origen: String(row.grupo_label_origen || '').trim(),
      fecha_registro: row.fecha_registro || '',
      status_carga: String(row.status_carga || '').trim(),
      updated_by: String(row.updated_by || '').trim(),
      updated_at: row.updated_at || ''
    };
  }).sort(function(a, b) {
    return String(a.nombre_socio || '').localeCompare(String(b.nombre_socio || ''), 'es', { sensitivity: 'base' });
  });

  const result = serializeForClient_({
    rows: rows
  });

  goPesDiagEnd_(diag, {
    socios_count: rows.length,
    organizaciones_indexed: Object.keys(orgById).length,
    casos_indexed: Object.keys(caseByOrgId).length
  });

  return goPesDiagPayloadSize_(result, 'getSociosModuloClient');
}

function actualizarCargoSocioOrganizacion(payload) {
  const user = requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);
  const socioId = String(payload && payload.socio_id || '').trim();
  const organizacionId = String(payload && payload.organizacion_id || '').trim();
  const cargo = String(payload && payload.cargo || '').trim();

  if (!socioId) throw new Error('Falta socio_id.');
  if (!organizacionId) throw new Error('Falta organizacion_id.');
  if (!goPesSocioCargoPermitido_(cargo)) throw new Error('Cargo de socio no permitido.');

  const socio = findByField_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', socioId, false);
  if (!socio) throw new Error('No se encontró el socio indicado.');
  if (String(socio.organizacion_id || '').trim() !== organizacionId) {
    throw new Error('El socio no pertenece a la organización indicada.');
  }
  assertOrganizacionActiva_(organizacionId); // suspendida = solo lectura

  const now = new Date();
  const nextSocio = Object.assign({}, socio, {
    cargo: cargo,
    updated_by: user.email,
    updated_at: now
  });

  upsertByKey_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', nextSocio, false);

  logProcessing_('INFO', 'actualizarCargoSocioOrganizacion', 'socio', socioId, user.email, 'OK', {
    organizacion_id: organizacionId,
    cargo: cargo
  });
  logUserAction_('UPDATE_SOCIO_CARGO', 'socio', socioId, 'OK', {
    organizacion_id: organizacionId,
    cargo: cargo
  });

  return serializeForClient_({
    ok: true,
    socio_id: socioId,
    organizacion_id: organizacionId,
    cargo: cargo
  });
}

function editarDatosSocio(payload) {
  const user = requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const socioId = String(payload && payload.socio_id || '').trim();
    if (!socioId) throw new Error('Falta socio_id.');

    const socio = findByField_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', socioId, false);
    if (!socio) throw new Error('No se encontro el socio indicado.');
    assertOrganizacionActiva_(socio.organizacion_id); // suspendida = solo lectura

    const cargo = (payload.cargo !== undefined) ? String(payload.cargo || '').trim() : (socio.cargo || '');
    if (cargo && !goPesSocioCargoPermitido_(cargo)) throw new Error('Cargo de socio no permitido: ' + cargo);

    const now = new Date();
    const next = Object.assign({}, socio, {
      run_socio:       payload.run_socio       !== undefined ? String(payload.run_socio       || '').trim() : (socio.run_socio       || ''),
      numero_registro: payload.numero_registro !== undefined ? String(payload.numero_registro || '').trim() : (socio.numero_registro || ''),
      nombre_socio:    payload.nombre_socio    !== undefined ? String(payload.nombre_socio    || '').trim() : (socio.nombre_socio    || ''),
      edad:            payload.edad            !== undefined ? String(payload.edad            || '').trim() : (socio.edad            || ''),
      cargo:           cargo,
      direccion_socio: payload.direccion_socio !== undefined ? String(payload.direccion_socio || '').trim() : (socio.direccion_socio || ''),
      updated_by: user.email,
      updated_at: now
    });

    upsertByKey_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', next, false);

    logUserAction_('EDIT_SOCIO', 'socio', socioId, 'OK', { socio_id: socioId, organizacion_id: socio.organizacion_id });
    return serializeForClient_({ ok: true, socio_id: socioId, organizacion_id: socio.organizacion_id });
  } finally {
    lock.releaseLock();
  }
}

function goPesSocioCargoPermitido_(cargo) {
  return getConfiguredSocioCargos_().indexOf(String(cargo || '').trim()) !== -1;
}

/**
 * MIGRACIÓN (una vez, idempotente): consolida el vínculo de socios al nuevo modelo.
 * - Backfill `solicitud_id`: si el socio está en una organización constituida, toma la
 *   solicitud de esa org. Si su `organizacion_id` en realidad guardaba un solicitud_id
 *   (patrón viejo de grupos), lo mueve a `solicitud_id` y limpia `organizacion_id`.
 * - Marca `source=MIGRACION` (RAW) y `vinculo_estado`.
 * - RAW-first (append corrección) + upsert FACT in-place (conserva el `socio_id` actual,
 *   sin churn de ids en esta pasada).
 * - Idempotente: salta los que ya tienen `solicitud_id`.
 * Ejecutar manualmente (solo superuser). Devuelve reporte con conteos.
 */
function goPesMigrarSociosAntiguos() {
  const user = requireModuleAccess_('socios', ['superuser']);
  const now = new Date();

  const socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];
  const orgs = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];

  const solByOrgId = {};
  const orgIdSet = {};
  orgs.forEach(function(o) {
    const id = String(o.organizacion_id || '').trim();
    if (!id) return;
    orgIdSet[id] = true;
    solByOrgId[id] = String(o.solicitud_id || '').trim();
  });
  const solIdSet = {};
  casos.forEach(function(c) {
    const s = String(c.solicitud_id || '').trim();
    if (s) solIdSet[s] = true;
  });

  let backfilled = 0, movedGrupo = 0, sinMatch = 0, yaOk = 0;
  const rawCorr = [];
  const factUpd = [];

  socios.forEach(function(row) {
    const socioId = String(row.socio_id || '').trim();
    if (!socioId) return;
    if (String(row.solicitud_id || '').trim()) { yaOk++; return; } // idempotente

    const orgVal = String(row.organizacion_id || '').trim();
    let solicitudId = '';
    let organizacionId = orgVal;

    if (orgVal && orgIdSet[orgVal]) {
      solicitudId = solByOrgId[orgVal] || '';   // org constituida → solicitud de la org
      backfilled++;
    } else if (orgVal && solIdSet[orgVal]) {
      solicitudId = orgVal;                       // era un solicitud_id (grupo)
      organizacionId = '';
      movedGrupo++;
    } else {
      sinMatch++;                                 // no resoluble automáticamente
    }

    const estado = solicitudId ? 'auto' : (String(row.vinculo_estado || '').trim() || 'pendiente');

    factUpd.push(Object.assign({}, row, {
      solicitud_id: solicitudId,
      organizacion_id: organizacionId,
      vinculo_estado: estado,
      updated_by: user.email,
      updated_at: now
    }));

    rawCorr.push({
      created_at: now,
      source: 'MIGRACION',
      user_email: user.email,
      organizacion_id: organizacionId,
      run_socio: row.run_socio || '',
      numero_registro: row.numero_registro || '',
      nombre_socio: row.nombre_socio || '',
      edad: row.edad || '',
      cargo: row.cargo || '',
      direccion_socio: row.direccion_socio || '',
      ubicacion_socio: row.ubicacion_socio || '',
      nombre_comite_origen: row.nombre_comite_origen || '',
      status_carga: row.status_carga || 'OK',
      legacy_source: 'MIGRACION',
      legacy_key: socioId,
      solicitud_id: solicitudId,
      grupo_label_origen: '',
      telefono_socio: row.telefono_socio || '',
      correo_socio: row.correo_socio || '',
      consentimiento: row.consentimiento || '',
      fecha_registro: row.fecha_registro || '',
      vinculo_estado: estado
    });
  });

  if (rawCorr.length) appendRowObjects_(GO_PES_V2.SHEETS.RAW_SOCIOS, rawCorr);
  factUpd.forEach(function(m) {
    upsertByKey_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', m, false);
  });

  logProcessing_('INFO', 'migrarSociosAntiguos', 'socios', '', user.email, sinMatch ? 'PARCIAL' : 'OK', {
    total: socios.length, backfilled, movedGrupo, sinMatch, yaOk
  });
  logUserAction_('MIGRAR_SOCIOS_ANTIGUOS', 'socios', '', sinMatch ? 'PARCIAL' : 'OK', {
    total: socios.length, backfilled, movedGrupo, sinMatch, yaOk
  });

  return serializeForClient_({
    ok: true,
    total: socios.length,
    backfilled: backfilled,
    movedGrupo: movedGrupo,
    sinMatch: sinMatch,
    yaVinculados: yaOk
  });
}

/**
 * Bandeja de socios SIN VINCULAR (vinculo_estado='pendiente' o sin grupo/org).
 * Alimenta la UI de vinculación manual.
 */
function getSociosSinVincular() {
  requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);
  const socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];
  const rows = socios.filter(function(s) {
    const estado = String(s.vinculo_estado || '').trim().toLowerCase();
    const sinVinculo = !String(s.solicitud_id || '').trim() && !String(s.organizacion_id || '').trim();
    return estado === 'pendiente' || sinVinculo;
  }).map(function(s) {
    return {
      socio_id: s.socio_id || '',
      run_socio: String(s.run_socio || '').trim(),
      nombre_socio: String(s.nombre_socio || '').trim(),
      cargo: String(s.cargo || '').trim(),
      grupo_label_origen: String(s.grupo_label_origen || '').trim(),
      telefono_socio: String(s.telefono_socio || '').trim(),
      correo_socio: String(s.correo_socio || '').trim(),
      fecha_registro: s.fecha_registro || ''
    };
  }).sort(function(a, b) {
    return String(a.nombre_socio || '').localeCompare(String(b.nombre_socio || ''), 'es');
  });
  return serializeForClient_({ rows: rows, total: rows.length });
}

/**
 * Vincula (o reasigna) un socio a un grupo (solicitud). RAW-first + upsert FACT.
 * Hereda organizacion_id si el grupo ya está constituido. Autogenera N° Registro si falta.
 * Sirve tanto para resolver un 'pendiente' como para mover un socio ya vinculado a otro grupo.
 */
function vincularSocioManual(payload) {
  const user = requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);
  payload = payload || {};
  const socioId = String(payload.socio_id || '').trim();
  const solicitudIdIn = String(payload.solicitud_id || '').trim();
  const organizacionIdIn = String(payload.organizacion_id || '').trim();
  if (!socioId) throw new Error('Falta socio_id.');
  if (!solicitudIdIn && !organizacionIdIn) throw new Error('Debes indicar el grupo u organización destino.');
  assertOrganizacionActiva_(organizacionIdIn); // suspendida = solo lectura

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const socio = findByField_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', socioId, false);
    if (!socio) throw new Error('No se encontró el socio indicado.');

    // Resolver solicitud_id + organizacion_id destino, ya sea que venga por grupo o por org.
    let solicitudId = solicitudIdIn;
    let organizacionId = '';
    let caso = null;
    if (solicitudId) {
      caso = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false);
      if (!caso) throw new Error('No se encontró el grupo (solicitud) indicado.');
      organizacionId = String(caso.organizacion_id || '').trim(); // heredado si el grupo ya se constituyó
    } else {
      const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionIdIn, false);
      if (!org) throw new Error('No se encontró la organización indicada.');
      organizacionId = organizacionIdIn;
      solicitudId = String(org.solicitud_id || '').trim();
      caso = solicitudId ? findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false) : null;
    }

    // N° Registro: conservar si ya tiene; si no, siguiente secuencial del grupo.
    let numeroRegistro = String(socio.numero_registro || '').trim();
    if (!numeroRegistro) {
      let maxReg = 0;
      (getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || []).forEach(function(s) {
        if (String(s.solicitud_id || '').trim() === solicitudId) {
          maxReg = Math.max(maxReg, Number(s.numero_registro || 0) || 0);
        }
      });
      numeroRegistro = String(maxReg + 1);
    }

    const now = new Date();
    const nombreComite = socio.nombre_comite_origen || (caso ? String(caso.nombre_completo || '').trim() : '');
    const merged = Object.assign({}, socio, {
      solicitud_id: solicitudId,
      organizacion_id: organizacionId,
      numero_registro: numeroRegistro,
      nombre_comite_origen: nombreComite,
      vinculo_estado: 'manual',
      updated_by: user.email,
      updated_at: now
    });
    upsertByKey_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', merged, false);

    appendRowObject_(GO_PES_V2.SHEETS.RAW_SOCIOS, {
      created_at: now, source: 'VINCULO_MANUAL', user_email: user.email,
      organizacion_id: organizacionId, run_socio: socio.run_socio || '',
      numero_registro: numeroRegistro, nombre_socio: socio.nombre_socio || '',
      edad: socio.edad || '', cargo: socio.cargo || '',
      direccion_socio: socio.direccion_socio || '', ubicacion_socio: socio.ubicacion_socio || '',
      nombre_comite_origen: nombreComite, status_carga: 'OK',
      legacy_source: '', legacy_key: socioId,
      solicitud_id: solicitudId, grupo_label_origen: socio.grupo_label_origen || '',
      telefono_socio: socio.telefono_socio || '', correo_socio: socio.correo_socio || '',
      consentimiento: socio.consentimiento || '', fecha_registro: socio.fecha_registro || '',
      vinculo_estado: 'manual'
    });

    if (organizacionId) {
      refreshPartialArtifacts_({ masterSolicitudIds: [solicitudId], vistaOrganizacionIds: [organizacionId] });
    }

    logUserAction_('VINCULAR_SOCIO_MANUAL', 'socio', socioId, 'OK', { socio_id: socioId, solicitud_id: solicitudId, organizacion_id: organizacionId });
    return serializeForClient_({ ok: true, socio_id: socioId, solicitud_id: solicitudId, organizacion_id: organizacionId, numero_registro: numeroRegistro });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Vinculación MASIVA: varios socios a una misma organización (o grupo) en una sola pasada.
 * payload = { socio_ids: [...], organizacion_id | solicitud_id }. RAW-first + upsert batch.
 * N° Registro secuencial arrancando del máximo existente del destino.
 */
function vincularSociosManual(payload) {
  const user = requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);
  payload = payload || {};
  const ids = (Array.isArray(payload.socio_ids) ? payload.socio_ids : []).map(function(x) { return String(x || '').trim(); }).filter(Boolean);
  const solicitudIdIn = String(payload.solicitud_id || '').trim();
  const organizacionIdIn = String(payload.organizacion_id || '').trim();
  if (!ids.length) throw new Error('No hay socios seleccionados.');
  if (!solicitudIdIn && !organizacionIdIn) throw new Error('Debes indicar la organización destino.');

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    // Resolver el destino UNA sola vez.
    let solicitudId = solicitudIdIn;
    let organizacionId = '';
    let caso = null;
    if (solicitudId) {
      caso = findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false);
      if (!caso) throw new Error('No se encontró el grupo (solicitud) indicado.');
      organizacionId = String(caso.organizacion_id || '').trim();
    } else {
      const org = findByField_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES, 'organizacion_id', organizacionIdIn, false);
      if (!org) throw new Error('No se encontró la organización indicada.');
      organizacionId = organizacionIdIn;
      solicitudId = String(org.solicitud_id || '').trim();
      caso = solicitudId ? findByField_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', solicitudId, false) : null;
    }
    assertOrganizacionActiva_(organizacionId); // suspendida = solo lectura
    const nombreCasoComite = caso ? String(caso.nombre_completo || '').trim() : '';

    const socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];
    const byId = {};
    let maxReg = 0;
    socios.forEach(function(s) {
      byId[String(s.socio_id || '').trim()] = s;
      if (String(s.solicitud_id || '').trim() === solicitudId || (organizacionId && String(s.organizacion_id || '').trim() === organizacionId)) {
        maxReg = Math.max(maxReg, Number(s.numero_registro || 0) || 0);
      }
    });

    const now = new Date();
    const factRows = [];
    const rawRows = [];
    ids.forEach(function(id) {
      const socio = byId[id];
      if (!socio) return;
      let numeroRegistro = String(socio.numero_registro || '').trim();
      if (!numeroRegistro) { maxReg += 1; numeroRegistro = String(maxReg); }
      const nombreComite = socio.nombre_comite_origen || nombreCasoComite;
      factRows.push(Object.assign({}, socio, {
        solicitud_id: solicitudId, organizacion_id: organizacionId,
        numero_registro: numeroRegistro, nombre_comite_origen: nombreComite,
        vinculo_estado: 'manual', updated_by: user.email, updated_at: now
      }));
      rawRows.push({
        created_at: now, source: 'VINCULO_MANUAL', user_email: user.email,
        organizacion_id: organizacionId, run_socio: socio.run_socio || '',
        numero_registro: numeroRegistro, nombre_socio: socio.nombre_socio || '',
        edad: socio.edad || '', cargo: socio.cargo || '',
        direccion_socio: socio.direccion_socio || '', ubicacion_socio: socio.ubicacion_socio || '',
        nombre_comite_origen: nombreComite, status_carga: 'OK',
        legacy_source: '', legacy_key: id,
        solicitud_id: solicitudId, grupo_label_origen: socio.grupo_label_origen || '',
        telefono_socio: socio.telefono_socio || '', correo_socio: socio.correo_socio || '',
        consentimiento: socio.consentimiento || '', fecha_registro: socio.fecha_registro || '',
        vinculo_estado: 'manual'
      });
    });

    if (rawRows.length) appendRowObjects_(GO_PES_V2.SHEETS.RAW_SOCIOS, rawRows);
    if (factRows.length) upsertRowsByKey_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', factRows, false);
    if (organizacionId && factRows.length) {
      refreshPartialArtifacts_({ masterSolicitudIds: [solicitudId], vistaOrganizacionIds: [organizacionId] });
    }

    logUserAction_('VINCULAR_SOCIOS_MANUAL', 'socios', '', 'OK', { total: factRows.length, solicitud_id: solicitudId, organizacion_id: organizacionId });
    return serializeForClient_({ ok: true, vinculados: factRows.length, solicitud_id: solicitudId, organizacion_id: organizacionId });
  } finally {
    lock.releaseLock();
  }
}
