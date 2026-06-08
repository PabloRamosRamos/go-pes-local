/**
 * Validaciones y utilidades transversales.
 * Mantiene helpers puros para no mezclar esta capa con side effects.
 */
function validateIngresoV2_(p) {
  const requiredFields = {
    nombre_vecino: 'Nombre',
    apellido_vecino: 'Apellido',
    telefono_contacto: 'Teléfono',
    direccion_original: 'Dirección',
    requerimiento_inicial: 'Requerimiento'
  };

  Object.keys(requiredFields).forEach(field => {
    if (!String(p[field] || '').trim()) {
      throw new Error(`Debes completar el campo ${requiredFields[field]}.`);
    }
  });

  if (p.correo_contacto && !/.+@.+\..+/.test(String(p.correo_contacto))) {
    throw new Error('El correo electrónico no es válido.');
  }
}

function validateSeguimientoV2_(p) {
  const requiredFields = {
    solicitud_id: 'Identificador de solicitud',
    fecha_gestion: 'Fecha de gestión',
    responsable_gestion: 'Responsable',
    flujo: 'Flujo',
    hito: 'Hito',
    estado_hito: 'Estado',
    detalle_gestion: 'Detalle'
  };

  Object.keys(requiredFields).forEach(field => {
    if (!String(p[field] || '').trim()) {
      throw new Error(`Debes completar el campo ${requiredFields[field]}.`);
    }
  });

  if (p.documento_respaldo_url && !looksLikeUrl_(p.documento_respaldo_url)) {
    throw new Error('La URL del documento de respaldo no es válida.');
  }
}

function validateOrganizacionV2_(p) {
  // Solo validar nombre como obligatorio siempre
  if (!String(p.nombre_organizacion || '').trim()) {
    throw new Error('Debes completar el campo Nombre de organización.');
  }

  // Tipo de organización solo es obligatorio al crear (no al editar)
  if (!p.organizacion_id && !String(p.tipo_organizacion || '').trim()) {
    throw new Error('Debes completar el campo Tipo de organización.');
  }
}

function validateInstrumentoV2_(p) {
  const requiredFields = {
    organizacion_id: 'Organización',
    instrumento_codigo_catalogo: 'Código de beneficio',
    instrumento_tipo: 'Tipo de beneficio',
    origen_instrumento: 'Origen',
    anio_convocatoria: 'Año de convocatoria',
    estado_instrumento: 'Estado'
  };

  Object.keys(requiredFields).forEach(field => {
    if (!String(p[field] || '').trim()) {
      throw new Error(`Debes completar el campo ${requiredFields[field]}.`);
    }
  });

  if (p.avance_instrumento_pct !== '' && p.avance_instrumento_pct !== undefined && !isNumberBetween_(p.avance_instrumento_pct, 0, 100)) {
    throw new Error('El porcentaje de avance debe estar entre 0 y 100.');
  }

  if (p.documento_respaldo_url && !looksLikeUrl_(p.documento_respaldo_url)) {
    throw new Error('La URL del documento de respaldo no es válida.');
  }
}

function validateRequisitoV2_(p) {
  const requiredFields = {
    organizacion_id: 'Organización',
    org_instrumento_id: 'Beneficio asociado',
    estado_requisito: 'Estado del requisito'
  };

  Object.keys(requiredFields).forEach(field => {
    if (!String(p[field] || '').trim()) {
      throw new Error(`Debes completar el campo ${requiredFields[field]}.`);
    }
  });

  if (!String(p.requisito_codigo || p.requisito_nombre_libre || '').trim()) {
    throw new Error('Debes indicar un requisito del catálogo o escribir un nombre personalizado.');
  }

  if (p.documento_respaldo_url && !looksLikeUrl_(p.documento_respaldo_url)) {
    throw new Error('La URL del documento de respaldo no es válida.');
  }
}

function validateSocioRowV2_(row) {
  if (!String(row.organizacion_id || '').trim()) {
    return { ok: false, error: 'Debes seleccionar una organización.' };
  }
  if (!String(row.nombre_socio || '').trim()) {
    return { ok: false, error: 'Debes completar el nombre del socio.' };
  }
  return { ok: true };
}

function normalizeText_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function slugify_(value) {
  return normalizeText_(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function buildFullName_(name, lastName) {
  return [name || '', lastName || ''].join(' ').replace(/\s+/g, ' ').trim();
}

function toSiNo_(value) {
  if (value === true || normalizeText_(value) === 'si' || normalizeText_(value) === 'sí' || normalizeText_(value) === 'true') return 'Sí';
  if (value === false || normalizeText_(value) === 'no' || normalizeText_(value) === 'false') return 'No';
  return String(value || '');
}

function toBool_(value) {
  return value === true || normalizeText_(value) === 'si' || normalizeText_(value) === 'sí' || normalizeText_(value) === 'true' || String(value) === '1';
}

function looksLikeUrl_(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function isNumberBetween_(value, min, max) {
  const n = Number(value);
  return !isNaN(n) && n >= min && n <= max;
}

function asDateOrBlank_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) return value;
  const d = new Date(value);
  return isNaN(d) ? '' : d;
}

function asNumberOrBlank_(value) {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(String(value).replace(/,/g, '.'));
  return isNaN(n) ? '' : n;
}

function uniqueNonBlank_(arr) {
  return [...new Set((arr || []).map(v => String(v || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function indexBy_(rows, field) {
  const out = {};
  (rows || []).forEach(r => {
    out[String(r[field] || '')] = r;
  });
  return out;
}

function groupBy_(rows, field) {
  return (rows || []).reduce((acc, r) => {
    const k = String(r[field] || '');
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});
}

function buscarCoincidenciasIngreso(payload) {
  requireRole_(['operador', 'coordinador', 'superuser']);

  payload = payload || {};

  const qNombre = normalizeText_(buildFullName_(payload.nombre_vecino, payload.apellido_vecino));
  const qTelefono = normalizeText_(payload.telefono_contacto);
  const qDireccion = normalizeText_(payload.direccion_original);

  const rows = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);

  return rows.filter(function(r) {
    const nombre = normalizeText_(r.nombre_completo);
    const telefono = normalizeText_(r.telefono_contacto);
    const direccion = normalizeText_(r.direccion_original);

    return (
      (qNombre && nombre && nombre.indexOf(qNombre) !== -1) ||
      (qTelefono && telefono && telefono.indexOf(qTelefono) !== -1) ||
      (qDireccion && direccion && direccion.indexOf(qDireccion) !== -1)
    );
  }).slice(0, 10).map(function(row) {
    return serializeForClient_(row);
  });
}

function deterministicId_(prefix, parts) {
  const payload = (parts || []).map(function(part) {
    return String(part == null ? '' : part).trim();
  }).join('||');

  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5,
    payload,
    Utilities.Charset.UTF_8
  );

  const hex = digest.map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return normalized.toString(16).padStart(2, '0');
  }).join('').toUpperCase();

  return `${String(prefix || 'ID').trim() || 'ID'}-${hex.slice(0, 12)}`;
}

function serializeForClient_(value) {
  if (value === null || value === undefined) return '';

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd'T'HH:mm:ss"
    );
  }

  if (Array.isArray(value)) {
    return value.map(serializeForClient_);
  }

  if (typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(function(key) {
      out[key] = serializeForClient_(value[key]);
    });
    return out;
  }

  return value;
}
