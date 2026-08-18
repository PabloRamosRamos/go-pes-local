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
