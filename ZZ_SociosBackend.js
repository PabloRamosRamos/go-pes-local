function importarSocios(payload) {
  const diag = goPesDiagStart_('ZZ_SociosBackend.importarSocios', {
    rows_input: payload && Array.isArray(payload.rows) ? payload.rows.length : 0
  });
  const user = requireRole_(['operador', 'coordinador', 'administrador', 'superuser']);
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
  const result = { ok: errors.length === 0, total: rows.length, imported: validRows.length, errors: errors };
  goPesDiagEnd_(diag, {
    ok: result.ok,
    imported: validRows.length,
    errors: errors.length
  });
  return result;
}
