# Instrumentar la ruta de guardado real (la medición definitiva)

El profiler `goPesPerfProbe()` muestra qué hojas pesan, pero la prueba concluyente de "por qué guardar es lento" es cronometrar **la función real de guardado, fase por fase**, haciendo un guardado de verdad. Este es el procedimiento.

> Correr siempre en **DEV**. La instrumentación no cambia la lógica (solo agrega marcas de tiempo), pero se hace sobre la ruta que escribe datos. Revertir al terminar.

## Paso 1 — Encontrar la función pública de guardado

En el frontend, buscar la llamada que dispara el guardado:

```bash
grep -n "google.script.run" Scripts_NuevoIngreso.html Scripts_Ficha.html
```

Identificar el `.<nombre>(payload)` que corresponde a "guardar / registrar" (p. ej. `registrarIngreso`, `guardarFicha`, o el nombre real que exista). Esa es la función pública a instrumentar en el backend (`NuevoIngreso.js` / `Services.js`).

## Paso 2 — Colocar las marcas

`Perf.js` expone un micro-timer (`goPesPerfStart_` / `goPesPerfMark_` / `goPesPerfFinish_`). Envolver la función identificada así, **sin alterar su lógica ni su valor de retorno** — solo intercalar marcas entre fases:

```javascript
function registrarIngreso(payload) {            // ← usar el nombre REAL
  requireModuleAccess_('nuevo-ingreso', ['operador','coordinador','superuser']); // guard existente, intacto

  var __p = goPesPerfStart_('registrarIngreso'); // ← INSTRUMENTACIÓN

  // --- validación (código existente) ---
  var datos = validar_(payload);
  goPesPerfMark_(__p, 'validacion');             // ← INSTRUMENTACIÓN

  // --- escritura de la fila (código existente) ---
  var id = escribirFila_(datos);
  goPesPerfMark_(__p, 'escritura_fila');         // ← INSTRUMENTACIÓN

  // --- actualización de índices / cache (código existente) ---
  invalidarCache_();
  goPesPerfMark_(__p, 'indices_cache');          // ← INSTRUMENTACIÓN

  // --- refresco de vistas derivadas y master (SOSPECHOSO PRINCIPAL) ---
  goPesRefrescarVistasYMaster();
  goPesPerfMark_(__p, 'refrescar_vistas_master');// ← INSTRUMENTACIÓN

  // --- recálculo de ficha, si aplica ---
  recalcularFicha(id);
  goPesPerfMark_(__p, 'recalcular_ficha');       // ← INSTRUMENTACIÓN

  // --- serialización de la respuesta (código existente) ---
  var out = serializeForClient_({ ok: true, id: id });
  goPesPerfMark_(__p, 'serializacion');          // ← INSTRUMENTACIÓN

  goPesPerfFinish_(__p);                          // ← INSTRUMENTACIÓN (emite tabla + JSON)
  return out;                                     // ← retorno original, intacto
}
```

Reglas:
- Los nombres de fase son libres; usar los que reflejen la ruta real.
- No mover ni fusionar las líneas existentes; solo intercalar `goPesPerfMark_`.
- `goPesPerfFinish_` debe ir **antes** del `return`, en todas las salidas si hay varias.

## Paso 3 — Ejecutar y leer

1. `.\push-dev.ps1` (o `clasp -u dev push`).
2. Hacer **un** guardado real desde la app en DEV.
3. Leer el resultado:
   ```bash
   clasp logs
   ```
   Buscar el bloque:
   ```
   ===GO-PES-PERF=== probe=registrarIngreso env=DEV total=NNNN ms ...
          ms      cum  fase
           12       12  validacion
           38       50  escritura_fila
           15       65  indices_cache
         2450     2515  refrescar_vistas_master   ← aquí se va el tiempo
          140     2655  recalcular_ficha
           20     2675  serializacion
   ===PERF-JSON==={...}===END-PERF-JSON===
   ```

## Paso 4 — Interpretar

- La fase con mayor `ms` es el objetivo. Si `refrescar_vistas_master` domina (patrón típico), el fix es hacer ese refresco **incremental** o **diferido**, no migrar de base de datos.
- Guardar el bloque `===PERF-JSON===` del "antes". Tras el fix, repetir y comparar contra el "después".

## Paso 5 — Revertir la instrumentación

Quitar todas las líneas marcadas `← INSTRUMENTACIÓN` (o revertir el commit). La función queda idéntica a la original. `Perf.js` puede permanecer en DEV; no debe registrarse en menús de usuario ni desplegarse a PROD salvo decisión explícita (sus públicas ya están tras guard de superuser).
