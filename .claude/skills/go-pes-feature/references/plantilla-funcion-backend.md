# Plantilla — función pública backend (GO-PES v2)

Estructura estándar de una función pública que el frontend llama vía `google.script.run`. Confirmado contra el código real (`Auth.js`, `Main.js`).

```javascript
/**
 * <Qué hace, en una línea.>
 * Llamada desde el cliente: google.script.run.<nombre>(payload)
 */
function nombreDeFuncionPublica(payload) {
  // 1) Guard de autorización SIEMPRE como primera línea:
  requireRole_(['operador']);                 // o el rol mínimo que corresponda
  // requireModuleAccess_('instrumento', ['operador', 'coordinador']); // por módulo

  // 2) Usuario actual si se necesita:
  var usuario = getUsuarioActual();

  try {
    // 3) Lógica: leer hojas por Repository, computar. Delega en privadas (con _).
    var data = calcularAlgo_(payload, usuario);

    // 4) Cache opcional en runtime con TTL (si es lectura frecuente):
    //    GO_PES_RUNTIME.cache[clave] = { value: data, expiresAt: Date.now() + TTL };

    // 5) Return SIEMPRE serializado para el cliente:
    return serializeForClient_(data);
  } catch (err) {
    logProcessing_('ERROR', 'nombreDeFuncionPublica', 'modulo', '', usuario.email, 'FAIL',
      { error: err.message });
    throw err; // el frontend lo captura en withFailureHandler
  }
}

// Privada: sufijo _, sin guard de rol (ya validó la pública que la llama).
function calcularAlgo_(payload, usuario) {
  // ...
  return { /* objeto plano */ };
}
```

## Reglas
- Pública = sin `_`. Privada = con `_`.
- Guard de rol en la **primera línea** de cada pública.
- Return vía `serializeForClient_(...)` siempre.
- Constantes nuevas → dentro de `GO_PES_V2` en `Main.js`.
- Al **escribir** datos, invalida las claves de cache afectadas (incluido el dashboard si corresponde).
