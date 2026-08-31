# Validación, confirmación y resumen — patrones concretos

Alinea los flujos de ingreso de GO-PES con lo que ya existe. El backend es la autoridad; el cliente es UX.

## 1. Backend: validar antes de escribir

```javascript
function guardarAlgo(payload) {
  requireModuleAccess_('<modulo>', ['operador', 'coordinador', 'superuser']);

  // 1) Validación PRIMERO (lanza mensaje operativo si algo falla).
  validateInstrumentoV2_(payload);           // reutiliza el validador del tipo

  // 2) Saneo de tipos para no romper cálculos aguas abajo.
  const monto   = asNumberOrBlank_(payload.monto);        // "1.000" texto → número o vacío
  const fecha   = asDateOrBlank_(payload.fecha);          // inválida → vacío
  const avance  = payload.avance_pct;
  if (avance !== '' && avance != null && !isNumberBetween_(avance, 0, 100)) {
    throw new Error('El porcentaje de avance debe estar entre 0 y 100.');
  }

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    // 3) Escribir RAW (append-only) + MAE/FACT (upsert) → refrescar → loguear.
    // ...
    return serializeForClient_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
```

### Validadores disponibles (`Validators.js`) — reutilizar, no duplicar
`validateIngresoV2_`, `validateSeguimientoV2_`, `validateOrganizacionV2_`, `validateInstrumentoV2_`, `validateRequisitoV2_`, `validateSocioRowV2_`.
Helpers: `asDateOrBlank_`, `asNumberOrBlank_`, `isNumberBetween_`, `looksLikeUrl_`, `toBool_`, `normalizeText_`.

### RUT y teléfono — NO existen hoy (agregar si el flujo los pide)
Hoy solo se valida *presencia* del teléfono; el RUT no se valida. Si un flujo requiere formato, agrega el validador en `Validators.js` con el estilo de mensaje del proyecto:

```javascript
// En Validators.js, junto a los demás.
function validarRut_(rut) {
  const limpio = String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) throw new Error('El RUT ingresado no es válido.');
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  let suma = 0, mul = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (suma % 11);
  const dvEsperado = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  if (dv !== dvEsperado) throw new Error('El RUT ingresado no es válido.');
}

function validarTelefonoCl_(tel) {
  const digitos = String(tel || '').replace(/\D/g, '');
  if (digitos.length !== 9) throw new Error('El teléfono debe tener 9 dígitos.');
}
```
(Consúltalo con el dueño antes de imponerlo en un flujo que hoy no lo exige — puede haber datos históricos sin RUT.)

## 2. Confirmación por tipo de acción (frontend)

Distingue claramente **edición simple** de **acción con consecuencias**.

- **Edición simple** (corregir un teléfono): sin diálogo aparatoso; guarda con loader de modal (`go-pes-loaders`).
- **Acción con consecuencias** (anular beneficio, suspender org, cerrar/rehacer hito): diálogo que **nombra la consecuencia** + **motivo** obligatorio antes de llamar al backend. Estas son **grado 2** de `go-pes-correccion` (`requireMotivo: true`); si son irreversibles, el backend además pide **PIN** (`go-pes-seguridad`).

```javascript
// Ejemplo: suspender organización (consecuencia real → confirmación explícita).
function onSuspenderOrg_(orgId) {
  const motivo = /* textarea obligatoria del modal */;
  if (!motivo.trim()) { GO_PES_UI.showError('Indica el motivo de la suspensión.'); return; }
  // El texto del modal ya dijo: "La organización quedará en solo lectura."
  showModalLoading('org-detalle-modal', 'Suspendiendo…');
  google.script.run
    .withSuccessHandler(/* ... */)
    .withFailureHandler(/* GO_PES_UI.showError */)
    .suspenderOrganizacion({ organizacion_id: orgId, motivo: motivo });
}
```

## 3. Resumen "¿esto es correcto?" (flujos importantes)

Antes del `google.script.run` de un flujo importante (nuevo ingreso, alta de organización, postulación a beneficio), muestra un paso de revisión con los datos tal como se guardarán, con **etiquetas legibles**:

```
Revisa antes de guardar:
  Nombre:     Juan Pérez
  Teléfono:   9 1234 5678
  Dirección:  Av. Providencia 123
  UV / Sector: 5 / Norte
[ Volver a editar ]   [ Confirmar y guardar ]
```

Solo tras "Confirmar" se dispara el guardado. El guard anti doble envío (botón deshabilitado / flag en `APP.state`) evita el reenvío mientras la solicitud está en vuelo.

## 4. Mensajes de error (qué y cómo)

- Nacen claros en el backend (los `validate*V2_` ya lo hacen) y `normalizeUserMessage_` (Scripts_UI.html) es la red final que traduce lo técnico.
- Di **qué corregir y cómo**: "La fecha no puede ser futura", "Revisa el formato del RUT", "Debes completar el campo Teléfono".
- Nunca expongas nombres de hojas/campos/constantes ni JSON. Ver `go-pes-mensajes`.
