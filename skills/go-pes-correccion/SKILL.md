---
name: go-pes-correccion
description: >-
  Hace cumplir en GO-PES v2 (Google Apps Script) el principio de que todo dato
  ingresado se puede enmendar: corregir = editar el valor Y registrar el cambio
  (qué campo, de qué valor a cuál, quién y cuándo) en LOG_Acciones_Usuario, nunca
  sobrescritura silenciosa. Úsala SIEMPRE que trabajes en cualquier flujo que
  ingrese, edite, guarde o corrija datos, y cuando diseñes la UI de esos flujos:
  "editar/corregir un registro", "enmendar un dato mal ingresado", "cambiar el
  nombre/teléfono/RUT", "anular o revertir un beneficio", "cambiar el estado de la
  organización", "guardar cambios de la ficha", "agregar botón editar", "dejar
  historial del cambio", "que quede auditado", "validar antes de guardar",
  "confirmar antes de", "resumen antes de guardar". Impone historial + trazabilidad
  (si no se puede auditar, no se aplica) + validación/confirmación previa + grados
  de corrección según impacto + cuidado de datos personales en logs. NO es el
  control de acceso general (eso es go-pes-seguridad) ni el esquema de hojas (eso
  es go-pes-esquema-datos), pero se apoya en ambas.
---

# go-pes-correccion — Corregir con historial, nunca sobrescribir en silencio

Las personas cometen errores; **todo dato o acción ingresada en GO-PES debe tener una vía para enmendarse**. Esta skill impone cómo se corrige: editar el valor **y** dejar rastro auditable del valor anterior. Si un cambio no puede quedar registrado, no se aplica.

**Lee primero `references/reglas-go-pes.md`** (reglas de trabajo, roles, convenciones). La pieza compartida **ya está construida**: **`aplicarCorreccionAuditada_(params)` en `go-pes-local/Corrections.js`**. Todo flujo que corrija datos la **invoca** en vez de reimplementar el patrón. Cómo llamarla y ejemplos reales (`editarDatosSocio`, `editarDatosVecino`) en **`references/patron-correccion.md`**.

## El principio en una frase

`corregir = leer el valor actual → aplicar el nuevo → registrar en LOG_Acciones_Usuario qué campo cambió, de qué a qué, quién y cuándo`. Nunca borrar el rastro del valor anterior.

## Regla obligatoria: toda corrección pasa por la función central

**Toda corrección de datos en GO-PES DEBE ejecutarse a través de la función compartida `aplicarCorreccionAuditada_`, que vive en `go-pes-local/Corrections.js`.**

Está **prohibido** implementar una corrección a mano, flujo por flujo: nunca escribas el cambio (`upsertByKey_` / `patchCaseSummary_` / `setValues`) **ni** registres en el log (`logUserAction_`) por tu cuenta para corregir un dato. Hacerlo reintroduce exactamente las brechas que la función central cierra: el diff del *antes→después*, el `LockService`, el **log-o-aborta** (revertir si no se puede auditar) y el enmascarado de PII.

El flujo solo aporta: el guard de módulo/rol, el `patch` (campos editables), `entityType`/`action`, `piiFields` y `requireMotivo`/`motivo`; **todo lo demás lo garantiza la función central**. Si una entidad no se escribe con un `upsert` plano, pásale un `applyFn` — no la sortees. Flujos ya migrados de referencia: `editarDatosSocio` (`ZZ_SociosBackend.js`) y `editarDatosVecino` (`Services.js`). Cómo llamarla, en `references/patron-correccion.md`.

### Excepción: qué NO pasa por la función central
La regla anterior gobierna **correcciones in-place de un registro** (leer → difear → reescribir esa misma fila). Quedan fuera **por diseño** dos clases de escritura, donde forzar la central sería incorrecto (su reversión por-registro rompería la consistencia):
1. **Eventos append-only** — transiciones de estado que **desactivan la fila activa y agregan una nueva** (p. ej. `cambiarEstadoAvance`), y el registro de gestiones/hitos (`guardarSeguimiento`, `registrarHitoAvance`). El antes→después vive en el historial de filas.
2. **Escrituras acopladas multi-hoja con estado derivado** — p. ej. CÁMARAS (`guardarCamaras1414Organizacion`): filas de detalle + fila de asignación + sync al ledger, todo recalculado. Revertir solo la asignación dejaría el detalle inconsistente.

En estos casos **igual se audita el antes→después**: reutiliza `diffCamposCorreccion_` (de `Corrections.js`) y registra `estado_anterior` y/o `cambios` en `logUserAction_` — pero **no** se invoca `aplicarCorreccionAuditada_`. La distinción es *corrección de un valor almacenado* (central) vs *evento / escritura acoplada* (auditar a mano con el mismo helper de diff).

## Contexto del proyecto que esta skill asume (verificado en el código)

- **Identidad del usuario:** `getUsuarioActual()` → `{ email, perfil, superuser_flag, nombre_visible, canAccess }`; el correo real es `getCurrentUserEmail_()` = `Session.getActiveUser().getEmail()`, normalizado con `normalizeEmail_`.
- **Log de acciones:** `logUserAction_(action, entityType, entityId, result, detail)` escribe en la hoja **`LOG_Acciones_Usuario`** (`GO_PES_V2.SHEETS.LOG_ACCIONES`) las columnas `timestamp, email (autor, automático), action, entity_type, entity_id, result, detail_json`. El `detail` va serializado en `detail_json`. Esta hoja solo la ve **superuser** (módulo Historial).
- **Autor de un registro — dónde vive (importante):** *no* hay un campo confiable de "autor original" en MAE/FACT. Lo que existe es:
  - `updated_by` + `updated_at` en MAE/FACT → el **último** editor (se pisa en cada edición).
  - La capa **`RAW_*` (append-only)** conserva `user_email` + `created_at` del que **ingresó originalmente**, y snapshots previos de la entidad. Es el respaldo natural del "valor anterior".
  - **Decisión del proyecto (2026-08-26): el sistema NO rastrea ni usa la autoría de un registro.** No compares autor ni marques `autoria`/`autor_original`. La reja de toda corrección es el **acceso al módulo**; el log guarda qué cambió, el motivo, quién (email del que corrige, automático) y cuándo. Ver pilar 3.
- **Herramientas de prevención ya disponibles:** `Validators.js` (`validateIngresoV2_`, `validateSeguimientoV2_`, `validateOrganizacionV2_`, `validateInstrumentoV2_`, `validateRequisitoV2_`, `validateSocioRowV2_`); `LockService`; PINs por contexto (`goPesValidatePin_`, ver `go-pes-seguridad`); guard de solo-lectura `assertOrganizacionActiva_`; `go-pes-mensajes` para el texto operativo.

## Los 5 pilares que la skill hace cumplir

### 1. Corrección con historial (no sobrescritura silenciosa)
La pieza compartida **`aplicarCorreccionAuditada_(params)`** (`Corrections.js`) es el **único mecanismo** para corregir datos — no reimplementes leer/diff/aplicar/loguear en cada flujo. Hace el ciclo completo:
1. **Lee** la fila actual y guarda el snapshot *antes*.
2. **Diff:** calcula `cambios = [{ campo, antes, despues }]` solo de lo que cambió (si nada cambió, no escribe ni loguea → devuelve `{ sin_cambios: true }`).
3. **Aplica** el cambio (por defecto `upsertByKey_`, fijando `updated_at`; usa `applyFn` para escrituras que no son un `upsert` plano).
4. **Registra** en `LOG_Acciones_Usuario` con `logUserAction_(action, entityType, id, 'OK', { cambios, motivo })` (PII enmascarada).

El flujo solo aporta: guard de módulo/rol, validación de dominio, el `patch` (solo campos editables), `entityType`/`action`, `piiFields`, y `requireMotivo`/`motivo` según el grado.

### 2. Trazabilidad: si no se puede auditar, no se aplica
`aplicarCorreccionAuditada_` lo **garantiza**: bajo un solo `LockService`, aplica el dato y luego registra; **si el log falla, revierte** la fila al snapshot anterior y lanza un error operativo. Nunca queda un cambio sin rastro. No repliques esta mecánica ni la sortees con un `catch` vacío. La capa `RAW_*` (append-only) sigue como segunda red de auditoría donde el flujo ya la escribe.

### 3. Permiso: acceso al módulo (el proyecto NO trabaja con autoría)
> Decisión con el dueño del proyecto (2026-08-26): **no se rastrea ni verifica la autoría de un registro.** Cualquier usuario con acceso al módulo puede corregir cualquier registro (como ya ocurre hoy con `editarDatosVecino`/`editarDatosSocio`). La reja es el **acceso al módulo** (`requireModuleAccess_`); la salvaguarda es el **log con motivo**.

Qué exige la skill en consecuencia:
- **Guard de módulo** al inicio de la función pública (ver `go-pes-seguridad`). **No agregues chequeo de autoría** — no existe y no se usará.
- **No registres `autoria`/`autor_original`.** El log ya guarda *quién* corrige (email automático) y *cuándo*; con eso basta para el Historial.
- **Gate por rol cuando corresponda:** si una corrección con consecuencias debe limitarse a ciertos roles (p. ej. anular un beneficio solo coordinador/superuser), eso se hace con `requireRole_(['coordinador','superuser'])` en la función pública del flujo, no con autoría.
- **Motivo obligatorio** en toda corrección de una acción con consecuencias (pilar 5, grado 2), y recomendado en la edición simple. Sin motivo, no se guarda ese grado.

### 4. Prevención (corregir menos es mejor que corregir bien)
- **Validar al ingresar:** reutiliza los `validate*V2_` de `Validators.js` (tipos, formatos, obligatorios). No inventes validación paralela si ya existe la del tipo.
- **Confirmación explícita para acciones con consecuencias**, distinta de una edición simple: anular/revertir un beneficio, cambiar el estado de una organización, borrar/rehacer un hito. El texto del diálogo nombra la consecuencia ("Esto anulará el beneficio X"), no un genérico "¿Seguro?".
- **Resumen "¿esto es correcto?"** antes de guardar en los flujos importantes (nuevo ingreso, alta de organización, postulación a beneficio): mostrar los datos a confirmar antes del `google.script.run`.

### 5. Grados de corrección (tratar distinto según el impacto)
| Grado | Ejemplo | Ceremonia mínima |
|-------|---------|------------------|
| **1 — Campo simple** | corregir un nombre o teléfono mal escrito | validar → `aplicarCorreccionAuditada_` con el `patch` (hace diff → aplica → log con `cambios`). |
| **2 — Acción con consecuencias** | anular un beneficio, cambiar estado de org, rehacer un hito | grado 1 **+ confirmación explícita que nombra la consecuencia + `motivo` obligatorio + auditoría reforzada**. Si la operación es destructiva/irreversible, exige **PIN** (patrón `go-pes-seguridad`). |
| **3 — Datos personales (PII)** | corregir RUT, nombre, teléfono, correo, dirección | grado que corresponda **+ cuidado en el log**: no vuelques PII de más en `detail_json`. Registra que el campo PII cambió; para valores sensibles (RUT, teléfono) guarda una forma **enmascarada** (p. ej. últimos dígitos), no el valor crudo repetido. El valor anterior autoritativo ya queda en la capa `RAW_*`. Coherente con `docs/seguridad.md`. |

Campos a tratar como PII: `rut_vecino`/`run_socio`, `telefono_contacto`/`telefono_socio`, `correo_contacto`/`correo_socio`, `nombre_*`/`apellido_*`, `direccion_*`.

## Checklist — antes de dar por lista una vía de corrección
- [ ] La función pública empieza con `requireModuleAccess_(modulo, [roles])` (+ `requireRole_` si el grado 2 se limita por rol).
- [ ] La corrección pasa por **`aplicarCorreccionAuditada_`** (no un `upsert`+log a mano); se le pasa el `patch` **solo con los campos editables**.
- [ ] `entityType`/`action`, `piiFields` y (grado 2) `requireMotivo`+`motivo` están seteados; `extraDetail` si hace falta contexto (p. ej. `organizacion_id`).
- [ ] El diff, el `LockService`, el log-o-aborta y el `updated_at` los garantiza la función central — no los repliques.
- [ ] Grado 2: confirmación que nombra la consecuencia (+ PIN si es irreversible, `go-pes-seguridad`).
- [ ] Grado 3: los campos PII van en `piiFields` (no se exponen crudos en el log).
- [ ] Mensajes al usuario en lenguaje operativo (`go-pes-mensajes`), sin filtrar nombres de hojas/campos.
- [ ] Probado en DEV con `goPesRunAllTests()` en 0 fallos (suite **Correcciones**) antes de PROD (`go-pes-tests`, `go-pes-deploy`).

## Anti-patrones (rechazar)
- **Sobrescribir sin diff ni log** ("solo es un `upsert`"): toda edición deja rastro del antes.
- **Loguear solo el valor nuevo** (como hoy en `EDIT_VECINO_CONTACTO`/`EDIT_SOCIO`): falta el antes; el objetivo de esta skill es cerrar exactamente esa brecha.
- **Aplicar el cambio y "loguear si se puede"** con `catch` vacío: rompe la trazabilidad. Es log-o-aborta.
- **Confundir edición simple con acción con consecuencias:** un mismo botón "Guardar" para corregir un teléfono y para anular un beneficio. Sepáralos por grado.
- **Volcar PII cruda repetida en el log** por comodidad.
- **Introducir autoría de registros** (campo autor, gate por autor, `autoria`/`autor_original` en el log): el proyecto decidió no trabajar con autoría; la reja es el acceso al módulo (+ rol donde aplique).

## Skills relacionadas
- `go-pes-entrada-segura` — la cara **preventiva**: validar/confirmar al ingresar para necesitar menos correcciones. Esta impone cómo se corrige lo que igual entró mal.
- `go-pes-seguridad` — guards de módulo/rol y PINs (grado 2 irreversible).
- `go-pes-esquema-datos` — hojas, campos de auditoría (`updated_by`/`updated_at`, RAW `user_email`), `LOG_Acciones_Usuario`.
- `go-pes-mensajes` — texto operativo de confirmaciones y errores.
- `go-pes-feature` / `go-pes-bug` — construyen el flujo; esta skill impone cómo se corrige dentro de él.
- `go-pes-tests`, `go-pes-deploy` — verificación y despliegue.
