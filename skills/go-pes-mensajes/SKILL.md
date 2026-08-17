---
name: go-pes-mensajes
description: >-
  Mantiene los mensajes que ve el usuario en GO-PES v2 (app de Google Apps Script
  de la Municipalidad de Providencia) en lenguaje operativo, no técnico: traduce
  errores internos y evita filtrar nombres de campos, tablas, constantes o JSON.
  Úsala para "el error se ve técnico", "mensaje poco claro al usuario", "sale el
  nombre de una tabla/campo en pantalla", "normalizar mensajes", "traducir errores",
  "texto de error/éxito para el operador". NO es para lógica de validación en sí
  (go-pes-feature/go-pes-bug) ni para estilos del toast (go-pes-rediseno-visual).
---

# go-pes-mensajes — Mensajes operativos (no técnicos)

Los usuarios de GO-PES son operadores/coordinadores municipales, no desarrolladores. Ningún mensaje debe exponer estructura interna (nombres de campos, tablas `DIM_*`/`MAE_*`/…, constantes como `GO_PES_V2`, formatos `YYYY-MM-DD`, ni JSON crudo). Esta skill mantiene ese contrato.

**Lee primero `references/reglas-go-pes.md`.** El mapeo completo (tabla técnico→operativo, diccionario de campos, patrones) vive en **`docs/mensajes-normalizados.md`** — consúltalo, no lo dupliques.

## Arquitectura (dos capas)
1. **Traductor central** — `normalizeUserMessage_(rawMessage)` en `Scripts_UI.html`, invocado por `showError(error)`: intercepta **todos** los errores antes de mostrarlos. Hace: mapeo 1:1 de mensajes exactos, patrón "Falta el campo obligatorio: X" → "Debes completar el campo <label>", reemplazo de nombres de tabla/constante por "el sistema", y filtrado de JSON crudo.
2. **Mensajes limpios en origen** — `Validators.js` (etiquetas legibles en vez de nombres técnicos) y los parciales `Scripts_Socios/Avance/NuevoIngreso/Organizaciones.html` (errores y éxitos en lenguaje de tarea).

## Cómo trabajar
- **Al agregar un error/éxito nuevo:** escríbelo ya en lenguaje operativo en origen. Si es un error técnico inevitable, agrégalo al mapeo de `normalizeUserMessage_` y documenta la fila nueva en `docs/mensajes-normalizados.md`.
- **Al agregar un campo con validación:** añade su etiqueta visible al diccionario `fieldLabels` (para que "Falta el campo obligatorio: `nombre_x`" salga como "Debes completar el campo <Etiqueta>").
- **Nunca** muestres al usuario: nombres de hoja/tabla (`DIM_*`, `MAE_*`, `FACT_*`, `RAW_*`, `CFG_*`, `LOG_*`, `VW_*`), constantes (`GO_PES_V2`), IDs internos crudos, formatos internos (`YYYY-MM-DD`) ni `JSON.stringify` de un objeto.

## Criterio editorial
- **Lenguaje de tarea, no de estructura interna.** Di qué pasó en términos del trabajo del usuario y **sugiere la acción** ("Recarga la ficha e inténtalo nuevamente").
- Éxitos sin IDs técnicos ("Solicitud guardada correctamente", no "Solicitud guardada: SOL-123").
- Consistencia con las filas ya existentes en `docs/mensajes-normalizados.md`.

## Verificación
- Revisa que el mensaje pase por `showError()` (para que lo normalice) y que no quede texto técnico visible.
- `goPesRunAllTests()` en 0 fallos.

## Skills relacionadas
- `go-pes-feature` / `go-pes-bug` — la lógica que produce el error (esta skill solo cuida cómo se comunica).
- `go-pes-rediseno-visual` — apariencia del toast/alerta, no su texto.
- `go-pes-higiene` — al cerrar, documenta la fila nueva en el doc (no dejes el mapeo sin registrar).
