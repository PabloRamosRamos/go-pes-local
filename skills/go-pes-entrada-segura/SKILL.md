---
name: go-pes-entrada-segura
description: >-
  Contraparte preventiva de go-pes-correccion en GO-PES v2 (Google Apps Script):
  atrapar el error al INGRESAR para necesitar menos correcciones. Úsala SIEMPRE que
  construyas o modifiques cualquier flujo de ingreso, formulario o guardado de datos,
  y al diseñar su UI: "nuevo formulario", "guardar/registrar X", "validar antes de
  guardar", "campos obligatorios", "validar RUT/teléfono/fecha", "confirmar antes de
  anular/suspender/cerrar", "resumen antes de guardar", "¿esto es correcto?", "el
  mensaje de error es críptico", "que no entren datos malos", "número que llega como
  texto", "fecha inconsistente". Impone: validación al ingresar (tipos, formatos,
  obligatorios) con el backend como autoridad; confirmación explícita para acciones
  con consecuencias (distinta de una edición simple); resumen "¿esto es correcto?"
  antes de guardar en flujos importantes; mensajes de error que dicen qué corregir y
  cómo; y coherencia de calidad de datos (no dejar entrar lo que rompe los cálculos
  aguas abajo). NO es cómo se corrige un dato ya ingresado (eso es go-pes-correccion),
  ni el control de acceso (go-pes-seguridad), ni el esquema de hojas (go-pes-esquema-datos).
---

# go-pes-entrada-segura — Atrapar el error al ingresar, no al corregir

Corregir menos es mejor que corregir bien. Esta skill es la **cara preventiva** de `go-pes-correccion`: cada dato que entra mal genera trabajo de corrección aguas abajo y puede romper cálculos (dashboard, alertas, avance). El objetivo es que el error **no pueda entrar**.

**Lee primero `references/reglas-go-pes.md`** (reglas de trabajo, roles, convenciones). Patrones concretos de validación, confirmación y resumen en **`references/validacion-y-confirmacion.md`**.

## Contexto del proyecto que esta skill asume (verificado en el código)

- **Validación:** `Validators.js` tiene `validateIngresoV2_`, `validateSeguimientoV2_`, `validateOrganizacionV2_`, `validateInstrumentoV2_`, `validateRequisitoV2_`, `validateSocioRowV2_` — **lanzan mensajes operativos en español** (`Debes completar el campo Teléfono.`, `El porcentaje de avance debe estar entre 0 y 100.`, `La URL del documento de respaldo no es válida.`). Reutilízalos; no dupliques validación.
- **Helpers de saneo:** `asDateOrBlank_` (acepta `YYYY-MM-DD` de `input type=date`; inválido → vacío), `asNumberOrBlank_` (coma→punto; texto → vacío), `isNumberBetween_`, `looksLikeUrl_`, `toBool_`, `normalizeText_`.
- **Gap conocido (importante):** **no existe hoy** validador de **formato de RUT** ni de **teléfono** — solo se valida *presencia*. Si el flujo lo necesita, **agrégalo en `Validators.js`** con el mismo estilo de mensaje (`El RUT ingresado no es válido.`), no en el frontend ni en otro archivo.
- **Patrón de guardado:** `validate*V2_(payload)` → `LockService` → escribir RAW (`appendRowObject_`, append-only) + MAE/FACT (`upsertByKey_`) → refrescar vistas → `logUserAction_` → `serializeForClient_`. El **backend es la autoridad**; la validación de cliente es solo UX.
- **Mensajes:** `normalizeUserMessage_` (Scripts_UI.html) traduce técnico→operativo en `showError`; ver `go-pes-mensajes`.
- **Confirmación/PIN:** operaciones sensibles usan confirmación + PIN por contexto (`SecurityPins.js`, `goPesValidatePin_`); ver `go-pes-seguridad`.

## Los pilares que la skill hace cumplir

### 1. Validación al ingresar — el backend es la autoridad
- **Toda función pública de guardado valida primero**, con `validate*V2_` (o el validador del tipo), **antes** de tomar el lock o escribir. La validación de cliente acelera el feedback pero **nunca** reemplaza la del servidor.
- Cubre: **tipos** (número con `asNumberOrBlank_`, fecha con `asDateOrBlank_`, booleano con `toBool_`), **formatos** (correo y URL ya validados; **RUT y teléfono a agregar** si el flujo los pide), y **obligatorios** (campos requeridos presentes y no vacíos).
- Rango y dominio: números en su rango (`isNumberBetween_`), valores de catálogo dentro del catálogo (no texto libre donde hay `DIM_*`).
- Si algo no valida, **lanza** con mensaje operativo; no guardes parcial.

### 2. Confirmación explícita para acciones con consecuencias
- **Distingue edición simple de acción con consecuencias.** Corregir un teléfono no lleva diálogo aparatoso; **anular un beneficio, suspender una organización, cerrar/rehacer un hito** sí.
- El diálogo **nombra la consecuencia** ("Esto suspenderá la organización y quedará en solo lectura"), no un genérico "¿Seguro?". Estas acciones son **grado 2** de `go-pes-correccion`: piden **motivo** obligatorio y, si son irreversibles, **PIN** (`go-pes-seguridad`).
- No uses el mismo botón "Guardar" para una edición trivial y para una acción con consecuencias.

### 3. Resumen "¿esto es correcto?" antes de guardar
- En los flujos importantes (**nuevo ingreso**, **alta de organización**, **postulación a beneficio**), muestra los datos ingresados para revisión **antes** del `google.script.run`. Es la última red antes de que el dato exista.
- El resumen refleja lo que se va a guardar tal cual (nombres legibles, no claves técnicas).

### 4. Mensajes de error claros — qué corregir y cómo
- Lenguaje de tarea, no de estructura interna: "Debes completar el campo Teléfono", no "missing field telefono_contacto". Los `validate*V2_` ya lo hacen; **manténlo**.
- Sin filtrar nombres de hojas/campos/constantes ni JSON crudo — `normalizeUserMessage_` es la red final, pero el mensaje debe nacer claro (`go-pes-mensajes`).
- Cuando se pueda, el mensaje indica **la acción** ("revisa el formato del RUT", "la fecha no puede ser futura"), no solo que algo falló.

### 5. Coherencia de calidad de datos (no romper los cálculos aguas abajo)
Lo que entra alimenta dashboard (KPIs), alertas (plazos) y avance (timeline). No dejes entrar lo que los rompe:
- **Números como número**, no como texto: `asNumberOrBlank_` antes de guardar montos/porcentajes/cantidades. Un `"1.000"` como texto rompe sumas y promedios.
- **Fechas como fecha válida y coherente**: `asDateOrBlank_`; y reglas de dominio donde apliquen (p. ej. no futuras para hitos ya ocurridos, orden temporal entre hitos).
- **Completitud de celdas que deben venir llenas**: los campos que otros módulos asumen presentes (FK lógicas `organizacion_id`/`solicitud_id`, códigos de catálogo) no deben quedar vacíos silenciosamente.
- Coherente con `go-pes-esquema-datos` (no hay FKs de integridad en Sheets: la validación de consistencia es responsabilidad del backend al ingresar).

## Checklist — antes de dar por listo un flujo de ingreso/guardado
- [ ] La función pública valida con `validate*V2_` (o el validador del tipo) **antes** de lock/escritura.
- [ ] Tipos saneados (`asNumberOrBlank_`/`asDateOrBlank_`/`toBool_`), obligatorios presentes, rangos y catálogos verificados.
- [ ] Formatos: correo/URL validados; RUT/teléfono validados **si el flujo los usa** (agregar validador en `Validators.js` si falta).
- [ ] Acciones con consecuencias: confirmación que **nombra la consecuencia** + motivo (+ PIN si es irreversible), separadas de la edición simple.
- [ ] Flujos importantes: resumen "¿esto es correcto?" antes de `google.script.run`.
- [ ] Mensajes operativos (qué y cómo), sin filtrar internals (`go-pes-mensajes`).
- [ ] Guard anti doble envío en acciones > 2 s (botón deshabilitado / flag en `APP.state`).
- [ ] Modales/formularios accesibles (`go-pes-a11y`); loaders estándar (`go-pes-loaders`).
- [ ] Probado en DEV con `goPesRunAllTests()` en 0 fallos antes de PROD.

## Anti-patrones (rechazar)
- **Validar solo en el cliente:** el backend es la autoridad; el cliente es UX.
- **Guardar y "ya lo corregirán":** si el error se puede atrapar al ingresar, se atrapa. Esta skill existe para reducir el trabajo de `go-pes-correccion`.
- **Guardar números/fechas como texto crudo** del formulario sin `asNumberOrBlank_`/`asDateOrBlank_`.
- **Un solo botón para edición trivial y acción con consecuencias** (sin confirmación que nombre la consecuencia).
- **Mensajes crípticos** con nombres de campos/tablas o JSON.
- **Duplicar validación** en vez de reutilizar `validate*V2_`.

## Relación con otras skills
- **`go-pes-correccion`** — la cara curativa: cómo se enmienda un dato ya ingresado (con historial auditado). Esta skill busca que se necesite menos.
- `go-pes-mensajes` — texto operativo de errores y confirmaciones.
- `go-pes-seguridad` — guards de rol/módulo y PIN para acciones sensibles.
- `go-pes-esquema-datos` — hojas, catálogos y consistencia de datos aguas abajo.
- `go-pes-feature` / `go-pes-bug` — construyen el flujo; esta skill impone cómo se ingresa dentro de él.
- `go-pes-a11y`, `go-pes-loaders` — accesibilidad y carga de los formularios/modales.
