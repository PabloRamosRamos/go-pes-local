# Patrón de corrección — cómo llamar a la función central

La pieza compartida ya existe: **`aplicarCorreccionAuditada_(params)`** en `go-pes-local/Corrections.js`. Todo flujo que corrija datos la invoca; **no** reimplementes leer/diff/aplicar/loguear. Esta función hace, bajo un solo `LockService`: leer el snapshot *antes* → diff de lo que cambió → aplicar → registrar en `LOG_Acciones_Usuario` → **revertir si el log falla** (log-o-aborta). Sin autoría (decisión del proyecto).

## Firma

```javascript
aplicarCorreccionAuditada_({
  sheet,              // GO_PES_V2.SHEETS.X                         (requerido)
  keyField,           // 'socio_id' | 'solicitud_id' | ...          (requerido)
  keyValue,           // id del registro                            (requerido)
  patch,              // { campo: nuevoValor } SOLO lo editable     (requerido)
  entityType,         // 'socio' | 'vecino' | ... → entity_type del log (requerido)

  action,             // default 'CORREGIR_' + entityType.toUpperCase();
                      //   pasa el nombre histórico para no romper el Historial (p. ej. 'EDIT_SOCIO')
  motivo,             // string
  requireMotivo,      // bool → grado 2; sin motivo lanza
  piiFields,          // string[] extra de campos PII del flujo (se suman a los base)
  extraDetail,        // { organizacion_id, ... } contexto extra para el log (no pisa cambios/motivo)
  applyFn,            // (despues, antes)=>void, solo si la escritura NO es un upsert plano
  caseInsensitiveKey, // bool para el match del key (default false)
  expectedAntes       // { campo: valorEsperado } → control de concurrencia optimista
})
// → { ok, sin_cambios?, cambios, entity_id }
```

Reglas de uso:
- **El guard va en el flujo, no en la función central:** `requireModuleAccess_(modulo, [roles])` (+ `requireRole_` si el grado 2 se limita por rol) antes de llamar.
- **La identidad se deriva sola** (`getUsuarioActual`): no pases el usuario.
- **El `patch` lleva solo campos editables** (nunca la PK; la función la protege igual).
- **No tomes tu propio `LockService`** para la escritura: lo hace la función central (evita lock anidado). Lecturas previas de validación (existencia, guard de org) sí van antes.
- **Refrescos de vista / append a RAW** propios del flujo van **después**, y solo si hubo cambios (`if (!r.sin_cambios) …`).

## Ejemplo real 1 — `editarDatosSocio` (`ZZ_SociosBackend.js`)

```javascript
function editarDatosSocio(payload) {
  requireModuleAccess_('socios', ['operador', 'coordinador', 'superuser']);

  const socioId = String(payload && payload.socio_id || '').trim();
  if (!socioId) throw new Error('Falta socio_id.');

  const socio = findByField_(GO_PES_V2.SHEETS.FACT_SOCIOS, 'socio_id', socioId, false);
  if (!socio) throw new Error('No se encontro el socio indicado.');
  assertOrganizacionActiva_(socio.organizacion_id); // suspendida = solo lectura

  const patch = {};
  if (payload.run_socio       !== undefined) patch.run_socio       = String(payload.run_socio       || '').trim();
  if (payload.nombre_socio    !== undefined) patch.nombre_socio    = String(payload.nombre_socio    || '').trim();
  if (payload.direccion_socio !== undefined) patch.direccion_socio = String(payload.direccion_socio || '').trim();
  // ... numero_registro, edad
  if (payload.cargo !== undefined) {
    const cargo = String(payload.cargo || '').trim();
    if (cargo && !goPesSocioCargoPermitido_(cargo)) throw new Error('Cargo de socio no permitido: ' + cargo);
    patch.cargo = cargo;
  }

  const r = aplicarCorreccionAuditada_({
    sheet: GO_PES_V2.SHEETS.FACT_SOCIOS,
    keyField: 'socio_id',
    keyValue: socioId,
    entityType: 'socio',
    action: 'EDIT_SOCIO',                              // nombre histórico
    patch: patch,
    piiFields: ['nombre_socio', 'run_socio', 'direccion_socio'],
    extraDetail: { organizacion_id: socio.organizacion_id }
  });

  return serializeForClient_({ ok: true, socio_id: socioId, organizacion_id: socio.organizacion_id, sin_cambios: !!r.sin_cambios });
}
```

## Ejemplo real 2 — `editarDatosVecino` (`Services.js`)

Igual, sobre `MAE_CASOS`. El `applyFn` por defecto (`upsertByKey_`) reproduce exactamente lo que hacía `patchCaseSummary_` (merge + `updated_at`), así que **no** hace falta `applyFn`. El refresco de vistas va después y solo si hubo cambios:

```javascript
const r = aplicarCorreccionAuditada_({
  sheet: GO_PES_V2.SHEETS.MAE_CASOS,
  keyField: 'solicitud_id',
  keyValue: solicitudId,
  entityType: 'vecino',
  action: 'EDIT_VECINO_CONTACTO',
  patch: patch,                                        // telefono/correo/direccion/uv/sector
  piiFields: ['telefono_contacto', 'correo_contacto', 'direccion_original']
});
if (!r.sin_cambios) refreshPartialArtifacts_({ masterSolicitudIds: [solicitudId] });
```

### Cuándo SÍ se necesita `applyFn`
Cuando escribir no es un `upsertByKey_` sobre una sola hoja (p. ej. una entidad con estado espejo en otra hoja). `applyFn(despues, antes)` recibe el estado completo deseado; en la reversión recibe el snapshot anterior. Extrae de `despues` los campos que tu writer necesita.

## Frontend: confirmación por grado
- **Grado 1 (campo simple):** editor inline / modal; loader de modal (`go-pes-loaders`) y `google.script.run`.
- **Grado 2 (consecuencias):** diálogo que **nombra la consecuencia** + `motivo` obligatorio (textarea) antes de llamar; el backend pasa `requireMotivo: true` (+ PIN si es irreversible, `go-pes-seguridad`).
- **Grado 3 (PII):** el enmascarado del log lo hace el backend vía `piiFields`; el cliente solo agrega la nota de privacidad si corresponde.

## Forma del `detail_json` en el log

```json
{
  "organizacion_id": "ORG-9",
  "cambios": [
    { "campo": "telefono_contacto", "antes": "***678", "despues": "***999", "pii": true },
    { "campo": "cargo", "antes": "Socio", "despues": "Presidente" }
  ],
  "motivo": "Teléfono mal digitado en el ingreso."
}
```

El *quién* (email del que corrige) y el *cuándo* los agrega `logUserAction_` en las columnas `email` y `timestamp`. **No** se registra autoría del registro (el proyecto no la usa).
