/**
 * Compatibilidad con la API histórica de "Nuevo ingreso".
 * Deriva al flujo consolidado en Services.js para evitar lógica duplicada.
 */
function getCatalogosNuevoIngreso() {
  return getCatalogosNuevoIngresoClient();
}

function guardarNuevoIngreso(payload) {
  return guardarIngreso(payload);
}

function normalizarNuevoIngresoPayload_(payload) {
  payload = payload || {};
  return {
    nombre_vecino: String(payload.nombre_vecino || '').trim(),
    apellido_vecino: String(payload.apellido_vecino || '').trim(),
    rut_vecino: String(payload.rut_vecino || '').trim(),
    telefono_contacto: String(payload.telefono_contacto || '').trim(),
    correo_contacto: String(payload.correo_contacto || '').trim(),
    direccion_original: String(payload.direccion_original || '').trim(),
    uv: String(payload.uv || '').trim(),
    sector: String(payload.sector || '').trim(),
    tipo_vivienda: String(payload.tipo_vivienda || '').trim(),
    requerimiento_inicial: String(payload.requerimiento_inicial || '').trim(),
    medio_solicitud: String(payload.medio_solicitud || '').trim(),
    unidad_origen: String(payload.unidad_origen || '').trim(),
    fecha_solicitud: payload.fecha_solicitud || '',
    observaciones_form: String(payload.observaciones_form || '').trim()
  };
}

function validarNuevoIngresoPayload_(payload) {
  return validateIngresoV2_(normalizarNuevoIngresoPayload_(payload));
}
