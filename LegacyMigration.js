function migrarHistoricoLegacy_() {
  requireRole_(['administrador', 'superuser']);
  ensureGoPesV2Sheets_();
  seedGoPesV2Catalogs_();

  const actorEmail = getCurrentUserEmail_() || 'system';
  const S = GO_PES_V2.SHEETS;

  const legacyForm = sheetExists_(S.LEGACY_FORM) ? getSheetDataFromHeaderRow_(S.LEGACY_FORM, 1) : [];
  const legacyAvance = sheetExists_(S.LEGACY_AVANCE) ? getSheetDataFromHeaderRow_(S.LEGACY_AVANCE, 1) : [];
  const legacyCsv = sheetExists_(S.LEGACY_CSV) ? getSheetDataFromHeaderRow_(S.LEGACY_CSV, 1) : [];
  const legacyFonde = sheetExists_(S.LEGACY_FONDESE) ? getSheetDataFromHeaderRow_(S.LEGACY_FONDESE, 5) : [];
  const legacySocios = sheetExists_(S.LEGACY_SOCIOS) ? getSheetDataFromHeaderRow_(S.LEGACY_SOCIOS, 1) : [];

  const existingIngreso = getSheetData_(S.RAW_INGRESO);
  const existingOrg = getSheetData_(S.RAW_ORGANIZACIONES);
  const existingInst = getSheetData_(S.RAW_INSTRUMENTOS);

  const solicitudByLegacy = {};
  const vecinoByLegacy = {};
  existingIngreso.forEach(function(r) {
    if (r.legacy_source === 'legacy_form' && r.legacy_key) {
      solicitudByLegacy[r.legacy_key] = r.solicitud_id;
      vecinoByLegacy[r.legacy_key] = r.vecino_id;
    }
  });

  const orgByName = {};
  existingOrg.forEach(function(r) {
    const key = normalizeText_(r.nombre_organizacion);
    if (key) orgByName[key] = r.organizacion_id;
  });

  function getSolicitudId_(legacyId) {
    legacyId = String(legacyId || '').trim();
    if (!legacyId) return nextId_('solicitud', 'SOL');
    if (!solicitudByLegacy[legacyId]) solicitudByLegacy[legacyId] = nextId_('solicitud', 'SOL');
    return solicitudByLegacy[legacyId];
  }

  function getVecinoId_(legacyId) {
    legacyId = String(legacyId || '').trim();
    if (!legacyId) return nextId_('vecino', 'VEC');
    if (!vecinoByLegacy[legacyId]) vecinoByLegacy[legacyId] = nextId_('vecino', 'VEC');
    return vecinoByLegacy[legacyId];
  }

  function getOrgIdByName_(name) {
    const key = normalizeText_(name);
    if (!key) return '';
    if (!orgByName[key]) orgByName[key] = nextId_('organizacion', 'ORG');
    return orgByName[key];
  }

  const rawIngresos = [];
  const rawSeguimientos = [];
  const rawOrganizacionesSnapshots = {};
  const rawInstrumentosSnapshots = {};
  const rawRequisitos = [];
  const rawSocios = [];

  // 1) FORMULARIO LEGACY -> RAW_INGRESO
  legacyForm.forEach(function(r, idx) {
    const legacyId = padLegacyId_(legacyValue_(r, ['ID_avance'])) || ('FORM_' + (idx + 1));
    const solicitudId = getSolicitudId_(legacyId);
    const vecinoId = getVecinoId_(legacyId);

    rawIngresos.push({
      created_at: asDateOrBlank_(legacyValue_(r, ['Marca temporal'])) || new Date(),
      source: 'LEGACY_IMPORT',
      user_email: actorEmail,
      vecino_id: vecinoId,
      solicitud_id: solicitudId,
      nombre_vecino: safeString_(legacyValue_(r, ['Nombre Vecino'])),
      apellido_vecino: safeString_(legacyValue_(r, ['Apellido'])),
      rut_vecino: safeString_(legacyValue_(r, ['Rut'])),
      telefono_contacto: safeString_(legacyValue_(r, ['Contacto'])),
      correo_contacto: safeString_(legacyValue_(r, ['Correo'])),
      direccion_original: safeString_(legacyValue_(r, ['Dirección'])),
      uv: safeString_(legacyValue_(r, ['UV'])),
      sector: '',
      tipo_vivienda: safeString_(legacyValue_(r, ['Tipo de Vivienda'])),
      requerimiento_inicial: safeString_(legacyValue_(r, ['Requerimiento'])),
      medio_solicitud: safeString_(legacyValue_(r, ['Medio de Solicitud'])),
      unidad_origen: safeString_(legacyValue_(r, ['Unidad de Origen'])),
      fecha_solicitud: asDateOrBlank_(legacyValue_(r, ['Fecha de solicitud'])) || asDateOrBlank_(legacyValue_(r, ['Marca temporal'])) || '',
      observaciones_form: safeString_(legacyValue_(r, ['Observaciones'])),
      estado_vecino: mapLegacySolicitudState_(legacyValue_(r, ['Estado de la solicitud']), legacyValue_(r, ['Etapa'])),
      legacy_source: 'legacy_form',
      legacy_key: legacyId
    });
  });

  // 2) AVANCE -> seguimiento, organizaciones, cámaras
  legacyAvance.forEach(function(r) {
    const legacyId = padLegacyId_(legacyValue_(r, ['ID']));
    const solicitudId = getSolicitudId_(legacyId);
    const vecinoId = getVecinoId_(legacyId);

    const nombreOrg = safeString_(legacyValue_(r, ['Nombre']));
    const orgId = nombreOrg ? getOrgIdByName_(nombreOrg) : '';
    const uv = safeString_(legacyValue_(r, ['Infraestructura']));
    const etapa = safeString_(legacyValue_(r, ['Etapa']));

    if (orgId) {
      patchLegacyOrgSnapshot_(rawOrganizacionesSnapshots, orgId, {
        created_at: new Date(),
        source: 'LEGACY_IMPORT',
        user_email: actorEmail,
        solicitud_id: solicitudId,
        organizacion_id: orgId,
        tipo_organizacion: 'Comité de seguridad',
        nombre_organizacion: nombreOrg,
        uv: uv,
        sector: '',
        direccion_referencia: '',
        fecha_inicio_acompanamiento: '',
        cantidad_socios_declarada: '',
        estado_constitucion: mapLegacyConstitucionState_('', etapa),
        fecha_asamblea_constitucion: asDateOrBlank_(legacyValue_(r, ['F. Asamblea'])),
        fecha_ratificacion: '',
        vigencia_directiva_hasta: '',
        personalidad_juridica_flag: toSiNo_(legacyValue_(r, ['Asamblea'])),
        certificado_provisorio_flag: toSiNo_(legacyValue_(r, ['C. Provisorio'])),
        certificado_definitivo_flag: '',
        directiva_vigente_flag: '',
        organizacion_constituida_flag: toSiNo_(etapa === 'Etapa 5'),
        estado_general_organizacion: '',
        responsable_actual: '',
        observacion_resumen: 'Migrado desde AVANCE',
        legacy_source: 'legacy_org',
        legacy_key: orgId
      });
    }

    if (legacyBool_(legacyValue_(r, ['Visita']))) {
      rawSeguimientos.push(buildLegacySeguimiento_({
        actorEmail: actorEmail,
        solicitud_id: solicitudId,
        organizacion_id: orgId,
        vecino_id: vecinoId,
        fecha_gestion: '',
        responsable_gestion: '',
        flujo: 'constitucion',
        hito: 'visita_informativa',
        estado_hito: 'Cumplido',
        detalle_gestion: 'Migrado desde AVANCE: visita registrada',
        legacy_key: legacyId + '|visita'
      }));
    }

    if (legacyValue_(r, ['N° Ingreso'])) {
      rawSeguimientos.push(buildLegacySeguimiento_({
        actorEmail: actorEmail,
        solicitud_id: solicitudId,
        organizacion_id: orgId,
        vecino_id: vecinoId,
        fecha_gestion: '',
        responsable_gestion: '',
        flujo: 'constitucion',
        hito: 'carta_ingresada',
        estado_hito: 'Cumplido',
        detalle_gestion: 'Migrado desde AVANCE. N° Ingreso: ' + legacyValue_(r, ['N° Ingreso']),
        legacy_key: legacyId + '|ingreso'
      }));
    }

    if (asDateOrBlank_(legacyValue_(r, ['F. Asamblea'])) || legacyBool_(legacyValue_(r, ['Asamblea']))) {
      rawSeguimientos.push(buildLegacySeguimiento_({
        actorEmail: actorEmail,
        solicitud_id: solicitudId,
        organizacion_id: orgId,
        vecino_id: vecinoId,
        fecha_gestion: asDateOrBlank_(legacyValue_(r, ['F. Asamblea'])),
        responsable_gestion: '',
        flujo: 'constitucion',
        hito: 'asamblea_constitucion',
        estado_hito: 'Cumplido',
        detalle_gestion: 'Migrado desde AVANCE: asamblea de constitución',
        legacy_key: legacyId + '|asamblea'
      }));
    }

    if (legacyBool_(legacyValue_(r, ['Ingreso docs']))) {
      rawSeguimientos.push(buildLegacySeguimiento_({
        actorEmail: actorEmail,
        solicitud_id: solicitudId,
        organizacion_id: orgId,
        vecino_id: vecinoId,
        fecha_gestion: '',
        responsable_gestion: '',
        flujo: 'constitucion',
        hito: 'documentos_secretaria',
        estado_hito: 'Cumplido',
        detalle_gestion: 'Migrado desde AVANCE: documentación ingresada',
        legacy_key: legacyId + '|docs'
      }));
    }

    if (legacyBool_(legacyValue_(r, ['C. Provisorio']))) {
      rawSeguimientos.push(buildLegacySeguimiento_({
        actorEmail: actorEmail,
        solicitud_id: solicitudId,
        organizacion_id: orgId,
        vecino_id: vecinoId,
        fecha_gestion: '',
        responsable_gestion: '',
        flujo: 'constitucion',
        hito: 'certificado_provisorio',
        estado_hito: 'Cumplido',
        detalle_gestion: 'Migrado desde AVANCE: certificado provisorio',
        legacy_key: legacyId + '|provisorio'
      }));
    }

    if (legacyBool_(legacyValue_(r, ['Convenio'])) || !isBlankLegacy_(legacyValue_(r, ['Cam']))) {
      const instId = getOrCreateLegacyInstrumentId_(existingInst, rawInstrumentosSnapshots, orgId, 'CAMARAS_1414');
      rawInstrumentosSnapshots[instId] = mergeNonBlank_(
        rawInstrumentosSnapshots[instId] || {},
        {
          created_at: new Date(),
          source: 'LEGACY_IMPORT',
          user_email: actorEmail,
          organizacion_id: orgId,
          org_instrumento_id: instId,
          instrumento_codigo_catalogo: 'CAMARAS_1414',
          instrumento_nombre_otro: '',
          instrumento_tipo: 'beneficio_municipal',
          origen_instrumento: 'municipal',
          anio_convocatoria: '',
          nombre_convocatoria: 'Beneficio cámaras 1414',
          numero_llamado: '',
          fecha_inicio_gestion: asDateOrBlank_(legacyValue_(r, ['F. Asamblea'])) || '',
          fecha_apertura: '',
          fecha_cierre: '',
          fecha_habilitacion: '',
          fecha_postulacion: '',
          fecha_resultado: '',
          fecha_cierre_instrumento: '',
          estado_instrumento: mapLegacyCamaraState_(legacyValue_(r, ['Convenio']), legacyValue_(r, ['Cam'])),
          subestado_instrumento: '',
          avance_instrumento_pct: mapLegacyCamaraPct_(legacyValue_(r, ['Convenio']), legacyValue_(r, ['Cam'])),
          proximo_hito_instrumento: '',
          resultado_instrumento: 'No aplica',
          monto_solicitado: '',
          monto_adjudicado: '',
          monto_ejecutado: '',
          responsable_instrumento: '',
          contraparte: '',
          observacion_instrumento: 'Migrado desde AVANCE',
          documento_respaldo_url: '',
          legacy_source: 'legacy_camaras',
          legacy_key: legacyId
        }
      );
    }
  });

  // 3) CSV -> organizaciones, seguimiento ratificación, requisitos FONDESE, instrumento FONDESE base
  legacyCsv.forEach(function(r) {
    const legacyId = padLegacyId_(legacyValue_(r, ['ID_Avance']));
    const solicitudId = getSolicitudId_(legacyId);
    const nombreOrg = safeString_(legacyValue_(r, ['Nombre']));
    const orgId = nombreOrg ? getOrgIdByName_(nombreOrg) : '';
    const estado = safeString_(legacyValue_(r, ['Estado']));

    if (orgId) {
      patchLegacyOrgSnapshot_(rawOrganizacionesSnapshots, orgId, {
        created_at: new Date(),
        source: 'LEGACY_IMPORT',
        user_email: actorEmail,
        solicitud_id: solicitudId,
        organizacion_id: orgId,
        tipo_organizacion: 'Comité de seguridad',
        nombre_organizacion: nombreOrg,
        uv: safeString_(legacyValue_(r, ['UV'])),
        sector: '',
        direccion_referencia: safeString_(legacyValue_(r, ['Direccion'])),
        fecha_inicio_acompanamiento: asDateOrBlank_(legacyValue_(r, ['F. Asamblea'])) || '',
        cantidad_socios_declarada: asNumberOrBlank_(legacyValue_(r, ['SOCIOS'])),
        estado_constitucion: mapLegacyConstitucionState_(estado, ''),
        fecha_asamblea_constitucion: asDateOrBlank_(legacyValue_(r, ['F. Asamblea'])),
        fecha_ratificacion: asDateOrBlank_(legacyValue_(r, ['F. Ratificacion'])),
        vigencia_directiva_hasta: asDateOrBlank_(legacyValue_(r, ['Vencimiento'])),
        personalidad_juridica_flag: toSiNo_(!!legacyValue_(r, ['F. Comprobante Recepcion'])),
        certificado_provisorio_flag: toSiNo_(estado.indexOf('Provisoria') !== -1),
        certificado_definitivo_flag: toSiNo_(legacyBool_(legacyValue_(r, ['C. Definitivo'])) || estado.indexOf('Definitiva') !== -1),
        directiva_vigente_flag: toSiNo_(legacyBool_(legacyValue_(r, ['Renovación']))),
        organizacion_constituida_flag: toSiNo_(estado.indexOf('Definitiva') !== -1),
        estado_general_organizacion: '',
        responsable_actual: '',
        observacion_resumen: 'Migrado desde CSV',
        legacy_source: 'legacy_org',
        legacy_key: orgId
      });
    }

    if (orgId && (asDateOrBlank_(legacyValue_(r, ['F. Ratificacion'])) || legacyBool_(legacyValue_(r, ['Renovación'])))) {
      rawSeguimientos.push(buildLegacySeguimiento_({
        actorEmail: actorEmail,
        solicitud_id: solicitudId,
        organizacion_id: orgId,
        vecino_id: '',
        fecha_gestion: asDateOrBlank_(legacyValue_(r, ['F. Ratificacion'])),
        responsable_gestion: '',
        flujo: 'constitucion',
        hito: 'asamblea_ratificacion',
        estado_hito: 'Cumplido',
        detalle_gestion: 'Migrado desde CSV: ratificación / renovación',
        legacy_key: legacyId + '|ratificacion'
      }));
    }

    if (orgId && (
      legacyBool_(legacyValue_(r, ['Renovación'])) ||
      legacyBool_(legacyValue_(r, ['C. Definitivo'])) ||
      legacyBool_(legacyValue_(r, ['RMRFP'])) ||
      legacyBool_(legacyValue_(r, ['RCCE'])) ||
      !isBlankLegacy_(legacyValue_(r, ['RUT'])) ||
      legacyBool_(legacyValue_(r, ['Cta. Cte']))
    )) {
      const instId = getOrCreateLegacyInstrumentId_(existingInst, rawInstrumentosSnapshots, orgId, 'FONDESE');

      rawInstrumentosSnapshots[instId] = mergeNonBlank_(
        rawInstrumentosSnapshots[instId] || {},
        {
          created_at: new Date(),
          source: 'LEGACY_IMPORT',
          user_email: actorEmail,
          organizacion_id: orgId,
          org_instrumento_id: instId,
          instrumento_codigo_catalogo: 'FONDESE',
          instrumento_nombre_otro: '',
          instrumento_tipo: 'fondo_municipal',
          origen_instrumento: 'municipal',
          anio_convocatoria: extractYear_(legacyValue_(r, ['F. Ratificacion'])) || '',
          nombre_convocatoria: 'Habilitación FONDESE',
          numero_llamado: '',
          fecha_inicio_gestion: asDateOrBlank_(legacyValue_(r, ['F. Asamblea'])) || '',
          fecha_apertura: '',
          fecha_cierre: '',
          fecha_habilitacion: '',
          fecha_postulacion: '',
          fecha_resultado: '',
          fecha_cierre_instrumento: '',
          estado_instrumento: mapLegacyFondeStateFromCsv_(r),
          subestado_instrumento: '',
          avance_instrumento_pct: mapLegacyCsvFondePct_(r),
          proximo_hito_instrumento: '',
          resultado_instrumento: 'Pendiente',
          monto_solicitado: '',
          monto_adjudicado: '',
          monto_ejecutado: '',
          responsable_instrumento: '',
          contraparte: '',
          observacion_instrumento: 'Migrado desde CSV',
          documento_respaldo_url: '',
          legacy_source: 'legacy_fondese',
          legacy_key: orgId + '|csv'
        }
      );

      pushLegacyCsvRequirement_(rawRequisitos, actorEmail, orgId, instId, 'directiva_vigente', legacyValue_(r, ['Renovación']), orgId + '|renovacion');
      pushLegacyCsvRequirement_(rawRequisitos, actorEmail, orgId, instId, 'certificado_definitivo', legacyValue_(r, ['C. Definitivo']), orgId + '|cert_def');
      pushLegacyCsvRequirement_(rawRequisitos, actorEmail, orgId, instId, 'rmrfp', legacyValue_(r, ['RMRFP']), orgId + '|rmrfp');
      pushLegacyCsvRequirement_(rawRequisitos, actorEmail, orgId, instId, 'rcce', legacyValue_(r, ['RCCE']), orgId + '|rcce');
      pushLegacyCsvRequirement_(rawRequisitos, actorEmail, orgId, instId, 'e_rut', legacyValue_(r, ['RUT']), orgId + '|rut');
      pushLegacyCsvRequirement_(rawRequisitos, actorEmail, orgId, instId, 'cuenta_cte', legacyValue_(r, ['Cta. Cte']), orgId + '|cuenta');
    }
  });

  // 4) FONDESE -> instrumentos y requisitos documentales
  legacyFonde.forEach(function(r) {
    const nombreOrg = safeString_(legacyValue_(r, ['NOMBRE']));
    if (!nombreOrg) return;

    const orgId = getOrgIdByName_(nombreOrg);
    const instId = getOrCreateLegacyInstrumentId_(existingInst, rawInstrumentosSnapshots, orgId, 'FONDESE');
    const avanceRaw = legacyValue_(r, ['%']);
    const avancePct = asNumberOrBlank_(avanceRaw);
    const avanceNorm = avancePct === '' ? '' : (avancePct <= 1 ? avancePct * 100 : avancePct);

    rawInstrumentosSnapshots[instId] = mergeNonBlank_(
      rawInstrumentosSnapshots[instId] || {},
      {
        created_at: new Date(),
        source: 'LEGACY_IMPORT',
        user_email: actorEmail,
        organizacion_id: orgId,
        org_instrumento_id: instId,
        instrumento_codigo_catalogo: 'FONDESE',
        instrumento_nombre_otro: '',
        instrumento_tipo: 'fondo_municipal',
        origen_instrumento: 'municipal',
        anio_convocatoria: 2026,
        nombre_convocatoria: 'POSTULACIÓN FONDESE 2026',
        numero_llamado: 'PRIMER LLAMADO',
        fecha_inicio_gestion: asDateOrBlank_(legacyValue_(r, ['ASAMBLEA'])) || '',
        fecha_apertura: '',
        fecha_cierre: '',
        fecha_habilitacion: '',
        fecha_postulacion: '',
        fecha_resultado: '',
        fecha_cierre_instrumento: '',
        estado_instrumento: mapLegacyFondeStateFromFondeSheet_(r),
        subestado_instrumento: '',
        avance_instrumento_pct: avanceNorm,
        proximo_hito_instrumento: '',
        resultado_instrumento: 'Pendiente',
        monto_solicitado: '',
        monto_adjudicado: '',
        monto_ejecutado: '',
        responsable_instrumento: safeString_(legacyValue_(r, ['CONTACTO'])),
        contraparte: '',
        observacion_instrumento: safeString_(legacyValue_(r, ['PROYECTO'])),
        documento_respaldo_url: '',
        legacy_source: 'legacy_fondese',
        legacy_key: orgId + '|2026'
      }
    );

    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'anexo_1', legacyValue_(r, ['Anexo N°1']), orgId + '|anexo1');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'anexo_2', legacyValue_(r, ['Anexo N°2']), orgId + '|anexo2');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'anexo_3', legacyValue_(r, ['Anexo N°3']), orgId + '|anexo3');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'cotizaciones', legacyValue_(r, ['Cotizaciones']), orgId + '|cotizaciones');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'e_rut', legacyValue_(r, ['E-RUT']), orgId + '|erut');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'cartola', legacyValue_(r, ['Cartola']), orgId + '|cartola');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'acta', legacyValue_(r, ['Acta']), orgId + '|acta');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'ci', legacyValue_(r, ['C.I.']), orgId + '|ci');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'certificado_directorio', legacyValue_(r, ['Cer. Directorio']), orgId + '|cerdir');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'estatutos', legacyValue_(r, ['Estatutos']), orgId + '|estatutos');
    pushLegacyFondeRequirement_(rawRequisitos, actorEmail, orgId, instId, 'decreto_19862', legacyValue_(r, ['Decreto']), orgId + '|decreto');
  });

  // 5) SOCIOS -> RAW_SOCIOS
  legacySocios.forEach(function(r, idx) {
    const nombreComite = safeString_(legacyValue_(r, ['Nombre Comite']));
    const orgId = getOrgIdByName_(nombreComite);

    rawSocios.push({
      created_at: new Date(),
      source: 'LEGACY_IMPORT',
      user_email: actorEmail,
      organizacion_id: orgId || '',
      run_socio: safeString_(legacyValue_(r, ['Columna 1', 'RUN'])),
      numero_registro: asNumberOrBlank_(legacyValue_(r, ['N° Registro'])),
      nombre_socio: safeString_(legacyValue_(r, ['Nombre'])),
      edad: asNumberOrBlank_(legacyValue_(r, ['Edad'])),
      cargo: safeString_(legacyValue_(r, ['Cargo'])),
      direccion_socio: safeString_(legacyValue_(r, ['Direccion'])),
      ubicacion_socio: safeString_(legacyValue_(r, ['Ubicacion'])),
      nombre_comite_origen: nombreComite,
      status_carga: orgId ? 'OK' : 'ORGANIZACION_NO_ENCONTRADA',
      legacy_source: 'legacy_socios',
      legacy_key: (safeString_(legacyValue_(r, ['Columna 1', 'RUN'])) || ('SOCIO_' + idx)) + '|' + normalizeText_(nombreComite)
    });
  });

  // Finalizar snapshots de organizaciones
  const rawOrganizaciones = Object.keys(rawOrganizacionesSnapshots).map(function(k) {
    return finalizeLegacyOrgSnapshot_(rawOrganizacionesSnapshots[k], rawInstrumentosSnapshots);
  });

  const rawInstrumentos = Object.keys(rawInstrumentosSnapshots).map(function(k) {
    return rawInstrumentosSnapshots[k];
  });

  mergeLegacyRowsIntoSheet_(S.RAW_INGRESO, rawIngresos);
  mergeLegacyRowsIntoSheet_(S.RAW_SEGUIMIENTO, rawSeguimientos);
  mergeLegacyRowsIntoSheet_(S.RAW_ORGANIZACIONES, rawOrganizaciones);
  mergeLegacyRowsIntoSheet_(S.RAW_INSTRUMENTOS, rawInstrumentos);
  mergeLegacyRowsIntoSheet_(S.RAW_REQUISITOS, rawRequisitos);
  mergeLegacyRowsIntoSheet_(S.RAW_SOCIOS, rawSocios);

  logProcessing_('INFO', 'migrarHistoricoLegacy', 'legacy', '', actorEmail, 'OK', {
    forms: legacyForm.length,
    avance: legacyAvance.length,
    csv: legacyCsv.length,
    fondese: legacyFonde.length,
    socios: legacySocios.length,
    rawIngresos: rawIngresos.length,
    rawSeguimientos: rawSeguimientos.length,
    rawOrganizaciones: rawOrganizaciones.length,
    rawInstrumentos: rawInstrumentos.length,
    rawRequisitos: rawRequisitos.length,
    rawSocios: rawSocios.length
  });

  reconstruirEstructurasDesdeRaw_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Migración legacy completada.', 'GO-PES', 6);
}

function mergeLegacyRowsIntoSheet_(sheetName, newRows) {
  const headers = buildSheetDefinitions_()[sheetName];
  const existing = getSheetData_(sheetName);

  const nonLegacyRows = existing
    .filter(function(r) { return !r.legacy_source && !r.legacy_key; })
    .map(function(r) { return headers.map(function(h) { return r[h] !== undefined ? r[h] : ''; }); });

  const legacyMap = {};
  existing
    .filter(function(r) { return r.legacy_source || r.legacy_key; })
    .forEach(function(r) {
      const key = legacyMergeKey_(r);
      if (key) legacyMap[key] = headers.map(function(h) { return r[h] !== undefined ? r[h] : ''; });
    });

  (newRows || []).forEach(function(r) {
    const key = legacyMergeKey_(r);
    if (!key) return;
    legacyMap[key] = headers.map(function(h) { return r[h] !== undefined ? r[h] : ''; });
  });

  const merged = nonLegacyRows.concat(
    Object.keys(legacyMap).sort().map(function(k) { return legacyMap[k]; })
  );

  replaceSheetData_(sheetName, headers, merged);
}

function legacyMergeKey_(row) {
  const a = normalizeText_(row.legacy_source || '');
  const b = normalizeText_(row.legacy_key || '');
  return (a || b) ? (a + '|' + b) : '';
}

function buildLegacySeguimiento_(cfg) {
  return {
    created_at: cfg.fecha_gestion || new Date(),
    source: 'LEGACY_IMPORT',
    user_email: cfg.actorEmail || '',
    solicitud_id: cfg.solicitud_id || '',
    organizacion_id: cfg.organizacion_id || '',
    vecino_id: cfg.vecino_id || '',
    fecha_gestion: cfg.fecha_gestion || '',
    responsable_gestion: cfg.responsable_gestion || '',
    territorial_responsable: cfg.territorial_responsable || '',
    flujo: cfg.flujo || 'seguimiento_general',
    hito: cfg.hito || '',
    estado_hito: cfg.estado_hito || 'Cumplido',
    detalle_gestion: cfg.detalle_gestion || '',
    resultado_hito: cfg.resultado_hito || '',
    fecha_vencimiento: '',
    proximo_hito_sugerido: '',
    proxima_accion_descripcion: '',
    documento_respaldo_url: '',
    legacy_source: 'legacy_seguimiento',
    legacy_key: cfg.legacy_key || deterministicId_('LEG', [cfg.solicitud_id, cfg.hito, cfg.detalle_gestion])
  };
}

function patchLegacyOrgSnapshot_(store, orgId, patch) {
  if (!store[orgId]) store[orgId] = {};
  store[orgId] = mergeNonBlank_(store[orgId], patch);
}

function finalizeLegacyOrgSnapshot_(row, instrumentSnapshots) {
  const orgId = row.organizacion_id;
  const hasCam = Object.keys(instrumentSnapshots).some(function(k) {
    const r = instrumentSnapshots[k];
    return r.organizacion_id === orgId && r.instrumento_codigo_catalogo === 'CAMARAS_1414';
  });
  const hasFonde = Object.keys(instrumentSnapshots).some(function(k) {
    const r = instrumentSnapshots[k];
    return r.organizacion_id === orgId && r.instrumento_codigo_catalogo === 'FONDESE';
  });

  if (!row.estado_general_organizacion) {
    row.estado_general_organizacion = mapLegacyGeneralOrgState_(row, hasCam, hasFonde);
  }
  return row;
}

function getOrCreateLegacyInstrumentId_(existingInst, currentSnapshots, organizacionId, code) {
  const existing = existingInst.find(function(r) {
    return String(r.organizacion_id || '') === String(organizacionId || '') &&
           String(r.instrumento_codigo_catalogo || '') === String(code || '');
  });
  if (existing && existing.org_instrumento_id) return existing.org_instrumento_id;

  const current = Object.keys(currentSnapshots).find(function(k) {
    const r = currentSnapshots[k];
    return String(r.organizacion_id || '') === String(organizacionId || '') &&
           String(r.instrumento_codigo_catalogo || '') === String(code || '');
  });
  if (current) return current;

  return nextId_('instrumento', 'OIN');
}

function pushLegacyCsvRequirement_(arr, actorEmail, orgId, orgInstrumentoId, code, rawValue, key) {
  if (isBlankLegacy_(rawValue)) return;
  arr.push(buildLegacyRequirementRow_(actorEmail, orgId, orgInstrumentoId, 'FONDESE', code, rawValue, key));
}

function pushLegacyFondeRequirement_(arr, actorEmail, orgId, orgInstrumentoId, code, rawValue, key) {
  if (isBlankLegacy_(rawValue)) return;
  arr.push(buildLegacyRequirementRow_(actorEmail, orgId, orgInstrumentoId, 'FONDESE', code, rawValue, key));
}

function buildLegacyRequirementRow_(actorEmail, orgId, orgInstrumentoId, instrumentCode, reqCode, rawValue, key) {
  const ok = legacyBool_(rawValue) || String(rawValue || '').trim() !== '';
  return {
    created_at: new Date(),
    source: 'LEGACY_IMPORT',
    user_email: actorEmail,
    organizacion_id: orgId || '',
    org_instrumento_id: orgInstrumentoId || '',
    requisito_registro_id: deterministicId_('REQ', [orgId, orgInstrumentoId, reqCode, key]),
    instrumento_codigo_catalogo: instrumentCode,
    requisito_codigo: reqCode,
    requisito_nombre_libre: '',
    categoria_requisito: '',
    estado_requisito: ok ? 'Validado' : 'Pendiente',
    fecha_solicitud: '',
    fecha_cumplimiento: ok ? new Date() : '',
    fecha_vencimiento: '',
    responsable_requisito: '',
    documento_respaldo_url: '',
    observacion_requisito: 'Migrado desde fuente legacy',
    vigente_flag: 'Sí',
    legacy_source: 'legacy_requisito',
    legacy_key: key
  };
}

function legacyValue_(row, aliases) {
  aliases = aliases || [];
  const keys = Object.keys(row || {});
  for (var i = 0; i < aliases.length; i++) {
    if (row[aliases[i]] !== undefined) return row[aliases[i]];
  }
  for (var j = 0; j < aliases.length; j++) {
    var target = normalizeText_(aliases[j]);
    for (var k = 0; k < keys.length; k++) {
      if (normalizeText_(keys[k]) === target) return row[keys[k]];
    }
  }
  return '';
}

function safeString_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function padLegacyId_(value) {
  var v = String(value || '').trim();
  if (!v) return '';
  return v.padStart(4, '0');
}

function legacyBool_(value) {
  if (value === true || value === 1 || value === '1') return true;
  const t = normalizeText_(value);
  return t === 'true' || t === 'si' || t === 'sí' || t === 'x';
}

function isBlankLegacy_(value) {
  return value === null || value === undefined || String(value).trim() === '' || value === false;
}

function mergeNonBlank_(base, patch) {
  const out = Object.assign({}, base || {});
  Object.keys(patch || {}).forEach(function(k) {
    const v = patch[k];
    if (!(v === '' || v === null || v === undefined)) out[k] = v;
  });
  return out;
}

function mapLegacySolicitudState_(estadoSolicitud, etapa) {
  const est = normalizeText_(estadoSolicitud);
  const etap = normalizeText_(etapa);
  if (etap.indexOf('etapa 5') !== -1) return 'Avanza a organización';
  if (est.indexOf('finalizado') !== -1) return 'En orientación';
  if (est.indexOf('pendiente') !== -1) return 'Pendiente de contacto';
  return 'Nuevo ingreso';
}

function mapLegacyConstitucionState_(csvEstado, etapa) {
  const est = normalizeText_(csvEstado);
  const etap = normalizeText_(etapa);
  if (est.indexOf('definitiva') !== -1) return 'Constituida';
  if (est.indexOf('provisoria') !== -1) return 'Provisoria obtenida';
  if (etap.indexOf('etapa 5') !== -1) return 'Constituida';
  if (etap.indexOf('etapa 4') !== -1) return 'Documentación ingresada';
  if (etap.indexOf('etapa 3') !== -1) return 'Asamblea realizada';
  if (etap.indexOf('etapa 2') !== -1) return 'Carta ingresada';
  if (etap.indexOf('etapa 1') !== -1) return 'En visita';
  return 'Sin iniciar';
}

function mapLegacyGeneralOrgState_(row, hasCam, hasFonde) {
  const constituida = toBool_(row.organizacion_constituida_flag) || normalizeText_(row.estado_constitucion) === 'constituida';
  if (!constituida) return 'En constitución';
  if (hasFonde) return 'Constituida con postulaciones en curso';
  if (hasCam) return 'Constituida con beneficios activos';
  return 'Constituida sin instrumentos';
}

function mapLegacyCamaraState_(convenio, cam) {
  if (!isBlankLegacy_(cam)) return 'Ejecutado';
  if (legacyBool_(convenio)) return 'En implementación';
  return 'Identificado';
}

function mapLegacyCamaraPct_(convenio, cam) {
  if (!isBlankLegacy_(cam)) return 100;
  if (legacyBool_(convenio)) return 70;
  return 30;
}

function mapLegacyFondeStateFromCsv_(row) {
  var score = 0;
  if (legacyBool_(legacyValue_(row, ['Renovación']))) score++;
  if (legacyBool_(legacyValue_(row, ['C. Definitivo']))) score++;
  if (legacyBool_(legacyValue_(row, ['RMRFP']))) score++;
  if (legacyBool_(legacyValue_(row, ['RCCE']))) score++;
  if (!isBlankLegacy_(legacyValue_(row, ['RUT']))) score++;
  if (legacyBool_(legacyValue_(row, ['Cta. Cte']))) score++;
  if (score >= 6) return 'Habilitado';
  if (score > 0) return 'En habilitación';
  return 'Identificado';
}

function mapLegacyCsvFondePct_(row) {
  var score = 0;
  if (legacyBool_(legacyValue_(row, ['Renovación']))) score++;
  if (legacyBool_(legacyValue_(row, ['C. Definitivo']))) score++;
  if (legacyBool_(legacyValue_(row, ['RMRFP']))) score++;
  if (legacyBool_(legacyValue_(row, ['RCCE']))) score++;
  if (!isBlankLegacy_(legacyValue_(row, ['RUT']))) score++;
  if (legacyBool_(legacyValue_(row, ['Cta. Cte']))) score++;
  return Math.round((score / 6) * 100);
}

function mapLegacyFondeStateFromFondeSheet_(row) {
  var docs = [
    'Anexo N°1', 'Anexo N°2', 'Anexo N°3', 'Cotizaciones', 'E-RUT', 'Cartola',
    'Acta', 'C.I.', 'Cer. Directorio', 'Estatutos', 'Decreto'
  ];
  var total = 0;
  docs.forEach(function(c) { if (legacyBool_(legacyValue_(row, [c]))) total++; });
  if (total >= docs.length) return 'Habilitado';
  if (total > 0) return 'En habilitación';
  return 'Identificado';
}

function extractYear_(value) {
  var d = asDateOrBlank_(value);
  if (d && Object.prototype.toString.call(d) === '[object Date]') return d.getFullYear();
  return '';
}