# Esqueletos canónicos de módulo — GO-PES v2

Copia la forma de un módulo hermano real; estos esqueletos resumen esa forma.

## Backend — `ZZ_<Modulo>Backend.js` (o `<Modulo>.js`)

```javascript
/**
 * Módulo <Modulo> — <qué gestiona en una línea>.
 * Creado: <fecha>
 */

// ══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN Y DEFAULTS
// ══════════════════════════════════════════════════════════════════════════

function getDefault<Modulo>Config_() {
  return { /* umbrales/opciones por defecto */ };
}

// ══════════════════════════════════════════════════════════════════════════
// API PÚBLICA (cliente)
// ══════════════════════════════════════════════════════════════════════════

/** Llamada desde el cliente: api('get<Modulo>Client', payload) */
function get<Modulo>Client(payload) {
  requireModuleAccess_('<modulo>', ['operador', 'coordinador', 'superuser']); // 1ª línea
  var usuario = getUsuarioActual();
  var data = calcular<Modulo>_(payload, usuario);        // delega en privadas
  return serializeForClient_(data);                      // return siempre serializado
}

function guardar<Modulo>(payload) {
  requireModuleAccess_('<modulo>', ['operador']);
  try {
    // escribir vía helpers de Repository; invalidar cache afectado
    return serializeForClient_(resultado);
  } catch (err) {
    logProcessing_('ERROR', 'guardar<Modulo>', '<modulo>', '', '', 'FAIL', { error: err.message });
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════════════════
// PRIVADAS
// ══════════════════════════════════════════════════════════════════════════

function calcular<Modulo>_(payload, usuario) {
  // ... sin guard de rol (ya validó la pública que la llama)
  return { /* objeto plano */ };
}
```

## Frontend — `Scripts_<Modulo>.html`

```html
<!-- SIN <script>: se concatena dentro del IIFE de Scripts.html. Sin CSS inline. -->
  function render<Modulo>View_() {
    showModuleLoading();                                  // loader acotado (go-pes-loaders)
    api('get<Modulo>Client', payload)
      .then(function(data) {
        render<Modulo>Resumen_(data);
        render<Modulo>Lista_(data.items || []);
      })
      .catch(showError)
      .finally(hideModuleLoading);
  }

  function render<Modulo>Resumen_(data) { /* pinta el encabezado */ }
  function render<Modulo>Lista_(items) { /* pinta la lista/tabla */ }

  function guardar<Modulo>Ui_(payload) {                  // handler de acción
    showModalLoading('<modulo>-modal');
    api('guardar<Modulo>', payload)
      .then(function() { render<Modulo>View_(); })        // refresca la vista
      .catch(showError)
      .finally(function(){ hideModalLoading('<modulo>-modal'); });
  }

  function clear<Modulo>View_() { /* limpia el estado de la vista */ }
```

## Registro (los 6 sitios estándar)
1. `GO_PES_V2.<SECCION>` y/o `GO_PES_V2.SHEETS.<HOJA>` en `Main.js`.
2. Headers en `buildSheetDefinitions_()` (`Repository.js`).
3. Archivo backend del módulo.
4. `Scripts_<Modulo>.html` + su `include()` en `Index.html` y su ruta en el dispatcher (`Scripts.html`).
5. Suite `goPesTest<Modulo>_()` en `Audith.js` + `acumular(...)` en `goPesRunAllTests()`.
6. Bloque CSS al final de `Styles.html` (+ `ThemeDark.html`), clases con prefijo propio.
