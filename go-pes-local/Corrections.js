/**
 * Corrección auditada transversal de GO-PES v2.
 *
 * Pieza compartida para que TODOS los flujos corrijan datos de forma idéntica:
 * aplican el cambio en la hoja Y dejan historial en LOG_Acciones_Usuario, de forma
 * atómica (si el log falla, la corrección se revierte). Nunca sobrescritura
 * silenciosa. Ver skill go-pes-correccion.
 *
 * El proyecto NO trabaja con autoría de registros: la reja de acceso la pone el
 * llamador (requireModuleAccess_ / requireRole_); esta función no la repite.
 * La identidad de quien corrige se deriva internamente (getUsuarioActual), no se
 * confía al llamador.
 */

// Campos considerados datos personales (PII): en el log se registran enmascarados,
// nunca en crudo. El valor anterior autoritativo ya queda en la capa RAW_*.
var GO_PES_PII_FIELDS_ = [
  'rut_vecino', 'run_socio',
  'telefono_contacto', 'telefono_socio',
  'correo_contacto', 'correo_socio',
  'nombre_vecino', 'apellido_vecino', 'nombre_completo', 'nombre_socio',
  'direccion_original', 'direccion_socio'
];

/**
 * Aplica una corrección auditada sobre un registro de una hoja.
 *
 * @param {Object} params
 *   @param {string} params.sheet        Nombre de hoja (GO_PES_V2.SHEETS.X). Requerido.
 *   @param {string} params.keyField     Campo clave del registro (p. ej. 'socio_id'). Requerido.
 *   @param {string} params.keyValue     Valor de la clave del registro a corregir. Requerido.
 *   @param {Object} params.patch        { campo: nuevoValor, ... } solo lo que cambia. Requerido.
 *   @param {string} params.entityType   Tipo de entidad para el log (entity_type). Requerido.
 *   @param {string} [params.action]     Acción del log. Default 'CORREGIR_' + entityType.
 *   @param {string} [params.motivo]     Motivo de la corrección.
 *   @param {boolean}[params.requireMotivo]  Si true, exige motivo (grado 2). Default false.
 *   @param {string[]}[params.piiFields] Campos PII extra además de GO_PES_PII_FIELDS_.
 *   @param {Function}[params.applyFn]   (despues, antes) => void. Default: upsertByKey_.
 *                                       Solo para entidades cuya escritura NO es un
 *                                       upsert plano; recibe el estado completo deseado
 *                                       (en la reversión, el snapshot anterior).
 *   @param {boolean}[params.caseInsensitiveKey]  Match del key sin distinción. Default false.
 *   @param {Object} [params.expectedAntes]  { campo: valorEsperado } para control de
 *                                       concurrencia optimista (edición concurrente).
 *   @param {Object} [params.extraDetail]  Contexto extra para el log (p. ej.
 *                                       { organizacion_id }). No puede pisar cambios/motivo.
 * @returns {Object} { ok, sin_cambios?, cambios, entity_id }
 */
function aplicarCorreccionAuditada_(params) {
  params = params || {};
  if (!params.sheet) throw new Error('Falta la hoja del registro a corregir.');
  if (!params.keyField) throw new Error('Falta la clave del registro a corregir.');
  var keyValue = String(params.keyValue == null ? '' : params.keyValue).trim();
  if (!keyValue) throw new Error('Falta el identificador del registro a corregir.');
  if (!params.patch || typeof params.patch !== 'object') throw new Error('No hay cambios que aplicar.');
  if (!params.entityType) throw new Error('Falta el tipo de entidad para la auditoría.');

  // Nunca dejes que el patch cambie la propia clave del registro.
  var patch = Object.assign({}, params.patch);
  delete patch[params.keyField];

  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var user = getUsuarioActual();
    var antes = findByField_(params.sheet, params.keyField, keyValue, !!params.caseInsensitiveKey);
    if (!antes) throw new Error('No se encontró el registro que intentas corregir.');

    var applyFn = typeof params.applyFn === 'function'
      ? params.applyFn
      : function(row) { upsertByKey_(params.sheet, params.keyField, row, !!params.caseInsensitiveKey); };

    var coreParams = Object.assign({}, params, { keyValue: keyValue, patch: patch });
    return aplicarCorreccionCore_(antes, user, coreParams, { apply: applyFn, log: logUserAction_ });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Núcleo de la corrección, sin acceso a hojas ni sesión: recibe el snapshot
 * "antes", el usuario y las dependencias (apply/log) inyectadas. Separado del
 * wrapper para poder probar la atomicidad (diff, no-op, motivo, reversión) sin
 * tocar el spreadsheet. No lo llames directamente desde los flujos: usa
 * aplicarCorreccionAuditada_.
 *
 * @param {Object} antes  Snapshot del registro antes del cambio.
 * @param {Object} user   Usuario actual ({ email }).
 * @param {Object} params Igual que aplicarCorreccionAuditada_ (keyValue/patch ya normalizados).
 * @param {Object} deps   { apply(despues, antes), log(action, type, id, result, detail) }.
 * @returns {Object} { ok, sin_cambios?, cambios, entity_id }
 */
function aplicarCorreccionCore_(antes, user, params, deps) {
  antes = antes || {};
  params = params || {};
  var patch = params.patch || {};

  // Control de concurrencia optimista: el registro no debe haber cambiado en disco
  // respecto de lo que el llamador vio al abrir el formulario.
  if (params.expectedAntes) {
    Object.keys(params.expectedAntes).forEach(function(campo) {
      var esperado = params.expectedAntes[campo] == null ? '' : String(params.expectedAntes[campo]);
      var actual = antes[campo] == null ? '' : String(antes[campo]);
      if (esperado !== actual) {
        throw new Error('El registro cambió desde que lo abriste; recárgalo e inténtalo de nuevo.');
      }
    });
  }

  var cambios = diffCamposCorreccion_(antes, patch);
  if (!cambios.length) {
    return { ok: true, sin_cambios: true, cambios: [], entity_id: params.keyValue };
  }

  var motivo = String(params.motivo || '').trim();
  if (params.requireMotivo && !motivo) {
    throw new Error('Indica el motivo de la corrección.');
  }

  var despues = Object.assign({}, antes, patch, {
    updated_by: user && user.email ? user.email : '',
    updated_at: new Date()
  });

  // 1) Aplicar el cambio.
  deps.apply(despues, antes);

  // 2) Registrar. LOG-O-ABORTA: si no se puede auditar, se revierte el cambio.
  try {
    deps.log(
      params.action || ('CORREGIR_' + String(params.entityType || '').toUpperCase()),
      params.entityType,
      params.keyValue,
      'OK',
      Object.assign({}, params.extraDetail || {}, {
        cambios: sanitizarCambiosPII_(cambios, params.piiFields),
        motivo: motivo
      })
    );
  } catch (logErr) {
    try {
      deps.apply(antes, despues); // revertir al snapshot anterior
    } catch (revertErr) {
      throw new Error('No se pudo registrar ni revertir la corrección. Avisa a soporte antes de seguir editando este registro.');
    }
    throw new Error('No se pudo registrar la corrección; el cambio no se aplicó. Intenta de nuevo.');
  }

  return { ok: true, cambios: cambios, entity_id: params.keyValue };
}

/**
 * Diff de los campos realmente cambiados entre el snapshot y el patch.
 * Compara como texto para no marcar cambios espurios por tipo (5 vs '5').
 * @returns {Array<{campo, antes, despues}>}
 */
function diffCamposCorreccion_(antes, patch) {
  antes = antes || {};
  var out = [];
  Object.keys(patch || {}).forEach(function(campo) {
    var a = antes[campo] === undefined || antes[campo] === null ? '' : String(antes[campo]);
    var d = patch[campo] === undefined || patch[campo] === null ? '' : String(patch[campo]);
    if (a !== d) out.push({ campo: campo, antes: a, despues: d });
  });
  return out;
}

/**
 * Enmascara los cambios de campos PII para el log (no expone el valor crudo).
 * @param {Array<{campo, antes, despues}>} cambios
 * @param {string[]} [extraPii] Campos PII adicionales del flujo.
 */
function sanitizarCambiosPII_(cambios, extraPii) {
  var pii = GO_PES_PII_FIELDS_.concat(Array.isArray(extraPii) ? extraPii : []);
  return (cambios || []).map(function(c) {
    if (pii.indexOf(c.campo) === -1) return c;
    return { campo: c.campo, antes: enmascararPII_(c.antes), despues: enmascararPII_(c.despues), pii: true };
  });
}

/**
 * Deja solo una pista del valor PII (últimos 3 caracteres) para poder distinguir
 * un cambio sin exponer el dato completo. Vacío se mantiene vacío.
 */
function enmascararPII_(valor) {
  var s = String(valor == null ? '' : valor);
  if (!s) return '';
  if (s.length <= 3) return '***';
  return '***' + s.slice(-3);
}
