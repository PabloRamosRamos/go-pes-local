function importarSocios(payload) {
  const diag = goPesDiagStart_('ZZ_SociosBackend.importarSocios', {
    rows_input: payload && Array.isArray(payload.rows) ? payload.rows.length : 0
  });
  const user = requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);
  const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];
  const validRows = [];
  const errors = [];
  const now = new Date();

  rows.forEach((row, idx) => {
    const check = validateSocioRowV2_(row);
    if (!check.ok) {
      errors.push({ index: idx + 1, error: check.error, row: row });
      return;
    }
    validRows.push(row);
  });

  const rawRows = [];
  const factRows = [];

  validRows.forEach(function(row) {
    const socioId = row.socio_id || nextId_('socio', 'SOC');

    rawRows.push({
      created_at: now,
      source: 'WEB_APP',
      user_email: user.email,
      organizacion_id: row.organizacion_id,
      run_socio: row.run_socio || '',
      numero_registro: row.numero_registro || '',
      nombre_socio: row.nombre_socio,
      edad: asNumberOrBlank_(row.edad),
      cargo: row.cargo || '',
      direccion_socio: row.direccion_socio || '',
      ubicacion_socio: row.ubicacion_socio || '',
      nombre_comite_origen: row.nombre_comite_origen || '',
      status_carga: errors.length ? 'PARCIAL' : 'OK'
    });

    factRows.push({
      socio_id: socioId,
      organizacion_id: row.organizacion_id,
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
      updated_at: now
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
  requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);

  const socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS) || [];
  const organizaciones = getSheetData_(GO_PES_V2.SHEETS.MAE_ORGANIZACIONES) || [];
  const casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS) || [];

  const orgById = organizaciones.reduce(function(acc, row) {
    const key = String(row.organizacion_id || '').trim();
    if (key) acc[key] = row;
    return acc;
  }, {});

  const caseByOrgId = casos.reduce(function(acc, row) {
    const key = String(row.organizacion_id || '').trim();
    if (!key) return acc;
    const current = acc[key];
    if (!current || new Date(row.updated_at || row.fecha_ingreso || 0) > new Date(current.updated_at || current.fecha_ingreso || 0)) {
      acc[key] = row;
    }
    return acc;
  }, {});

  const rows = socios.map(function(row) {
    const organizacionId = String(row.organizacion_id || '').trim();
    const org = orgById[organizacionId] || {};
    const caseRow = caseByOrgId[organizacionId] || {};
    const nombreComite = String(row.nombre_comite_origen || org.nombre_organizacion || '').trim();
    return {
      socio_id: row.socio_id || '',
      organizacion_id: organizacionId,
      solicitud_id: String(org.solicitud_id || caseRow.solicitud_id || '').trim(),
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
      telefono_contacto: String(caseRow.telefono_contacto || '').trim(),
      correo_contacto: String(caseRow.correo_contacto || '').trim(),
      status_carga: String(row.status_carga || '').trim(),
      updated_by: String(row.updated_by || '').trim(),
      updated_at: row.updated_at || ''
    };
  }).sort(function(a, b) {
    return String(a.nombre_socio || '').localeCompare(String(b.nombre_socio || ''), 'es', { sensitivity: 'base' });
  });

  return serializeForClient_({
    rows: rows
  });
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
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const user = requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);
    const socioId = String(payload && payload.socio_id || '').trim();
    if (!socioId) throw new Error('Falta socio_id.');

    const socio = findByField_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', socioId, false);
    if (!socio) throw new Error('No se encontro el socio indicado.');

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

function goPesSocioCargoPermitidoLegacy_(cargo) {
  return [
    'Presidente',
    'Tesorero',
    'Secretario',
    'Director',
    'Comisión electoral',
    'Comision de finanzas',
    'Socio'
  ].indexOf(String(cargo || '').trim()) !== -1;
}

function goPesSocioCargoPermitido_(cargo) {
  return getConfiguredSocioCargos_().indexOf(String(cargo || '').trim()) !== -1;
}
