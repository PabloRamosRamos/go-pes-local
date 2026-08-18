# Plan: consolidación de fuentes de datos de Socios (fuente única = formulario)

Estado: **propuesta / pendiente de OK final**. Autor: sesión Claude. Fecha: 2026-08-18.

Objetivo: dejar el **formulario nuevo** como fuente de socios a futuro, **migrar y preservar** los socios antiguos, y arreglar el módulo sin perder datos (teléfono/correo/consentimiento por socio) ni romper la reconstrucción de artefactos. Nada al azar: cada cambio está anclado al código real.

---

## 1. Arquitectura real (verificada en código)

- **`RAW_SOCIOS`** (`buildSheetDefinitions_` Repository.js:120) es el **log append-only** (fuente de verdad).
- **`FACT_SOCIOS`** (Repository.js:127) es **derivado**: se reconstruye desde `RAW_SOCIOS` en `DerivedBuilders.js:777-807` vía `replaceSheetData_`, con `socio_id` **determinístico** (`deterministicId_('SOC', [legacy_source, legacy_key, organizacion_id, run_socio, numero_registro, nombre_socio])`).
- El módulo **lee** `FACT_SOCIOS` (`getSociosModuloClient`, ZZ_SociosBackend.js:95).
- Dos entradas hoy escriben a **RAW + FACT** (append RAW, upsert FACT):
  - `importarSocios` (pegado manual, `source: WEB_APP`, ZZ_SociosBackend.js:1).
  - `importarRespuestasFormSocios` (lee Sheet externo `sheet_respuestas_id`, `source: GOOGLE_FORM`, ZZ_FormSociosIntegration.js:103).
- **Vínculo actual (el nudo):** el socio de un grupo guarda el `solicitud_id` **dentro de** `organizacion_id`; al constituirse el grupo, `goPesActualizarSociosAlConstituirOrganizacion_` (ZZ_AvanceBackend.js:1758) reescribe `organizacion_id = orgId` filtrando por `organizacion_id === solicitudId`. Una columna con dos significados.
- Agregar columnas es **seguro y automático** si se hace **append-only al final** de la definición: `ensureSheetWithHeaders_` (Repository.js:180) solo reescribe la fila 1 de headers cuando hay mismatch; las filas de datos no se desalinean porque las columnas existentes conservan su posición.

### Minas ocultas que esto implica (y hay que resolver)
1. **Rebuild borra columnas nuevas**: si agrego teléfono/correo a `FACT_SOCIOS` pero no al mapper de `DerivedBuilders.js:782-797`, un "reconstruir todo" las vacía. → Hay que tocar RAW def + FACT def + mapper.
2. **`socio_id` determinístico incluye `organizacion_id`**: si un socio se re-vincula (cambia de grupo/org), su `socio_id` **cambia** en el próximo rebuild → se duplica / se orfana. Y `FACT_FORM_INSCRIPCIONES.socio_id` (Repository.js:165) referencia socios. → Hay que basar la identidad en una llave **estable** (RUT), no en la org.
3. **Todo debe ser RAW-first**: cualquier vínculo manual debe escribir a `RAW_SOCIOS` (no solo a `FACT_SOCIOS`), o el rebuild lo revierte.

---

## 2. Modelo destino

### 2.1 Identidad del socio = MEMBRESÍA (resuelve mina #2 + RUT en varias orgs)
**Un RUT puede pertenecer a varias organizaciones**, así que la entidad es la *membresía* (persona + grupo/org), no la persona. La identidad debe ser **RUT + un discriminador ESTABLE de la membresía**, y ese discriminador **NO puede ser `organizacion_id`** (re-vincular lo cambiaría → mina #2).

- **Form nuevo:** `socio_id = deterministicId_('SOC', [run_socio_norm, fecha_registro])`. Cada envío del formulario = una membresía; el timestamp es inmutable y único. Mismo RUT en dos grupos = dos envíos = dos ids. Re-vincular cambia la org pero **no** el id.
- **Datos antiguos:** discriminador = `legacy_key` (o `nombre_comite_origen`), inmutable. Preserva las membresías múltiples que ya existan.
- **Deduplicación:** por **identidad del envío (`run_socio` + `fecha_registro`)**, NO por RUT global. Reimportar es idempotente; dos membresías reales del mismo RUT entran ambas. (Reemplaza el `existingRUTs` por-RUT actual del import.)

### 2.2 Vínculo (una sola llave, resuelve nudo #1)
- Columna nueva **`solicitud_id`** = grupo al que pertenece el socio (llave base).
- `organizacion_id` queda **vacío** mientras es grupo; se **hereda** al constituirse.
- Se actualiza `goPesActualizarSociosAlConstituirOrganizacion_` para filtrar por `solicitud_id === solicitudId` y **setear** `organizacion_id` (hoy filtra por `organizacion_id === solicitudId`).

### 2.3 Columnas nuevas (append-only)

`RAW_SOCIOS` (agregar al final, después de `legacy_key`):
`solicitud_id, grupo_label_origen, telefono_socio, correo_socio, consentimiento, fecha_registro, vinculo_estado`

`FACT_SOCIOS` (agregar al final, después de `updated_at`):
`solicitud_id, telefono_socio, correo_socio, consentimiento, fecha_registro, vinculo_estado`

Semántica:
- `telefono_socio` / `correo_socio`: contacto **del socio** (hoy el form los trae y se descartan).
- `consentimiento`: texto del form (dato legal).
- `fecha_registro`: marca temporal del form.
- `grupo_label_origen` (solo RAW): el label crudo que llegó del form (para auditar matching).
- `vinculo_estado`: `auto` | `manual` | `pendiente`.

### 2.4 Campos que el form no trae (resueltos, sin dejar al azar)
- **`numero_registro`**: se **autogenera secuencial por `solicitud_id`** al importar (máx. existente + 1 dentro del grupo). La migración **preserva** los N° antiguos.
- **`ubicacion_socio`**: se compone `direccion_socio + ", " + config.socios.addressSuffix` (= `"…, Providencia"`), replicando exactamente la columna "Ubicacion" del sheet antiguo.

---

## 3. Conexiones (3 caminos)

### 3.1 Automática (link prellenado del form) — ya existe, se hace robusta
`generarLinkFormSocios` mete `label = nombre_completo - sector` en la respuesta. El import:
1. Normaliza (`normalizeText_`) ambos lados y arma el `grupoMap` por label normalizado.
2. Si calza → `solicitud_id` del grupo, `vinculo_estado = auto`, `organizacion_id` = el de la org si el grupo ya está constituido, si no vacío.
3. Si **no** calza → **no falla**: guarda el socio con `solicitud_id = ''`, `grupo_label_origen = <label crudo>`, `vinculo_estado = pendiente`. Cae en la bandeja manual.

### 3.2 Manual (lo pedido) — RAW-first
- Backend nuevo `vincularSocioManual({ socio_id, solicitud_id })`:
  - Resuelve `organizacion_id` (si el grupo está constituido).
  - **Append a `RAW_SOCIOS`** una corrección (`source: VINCULO_MANUAL`) con la identidad estable + nuevo `solicitud_id`/`organizacion_id`/`vinculo_estado = manual`.
  - Upsert `FACT_SOCIOS` por `socio_id`.
  - Guard de rol + log. Sobrevive rebuild porque el RAW corregido es el más reciente por llave.
- Backend `reasignarSocio(...)`: mismo mecanismo para mover un socio ya vinculado a otro grupo/org.
- UI: **bandeja "Sin vincular"** (socios `pendiente`) con selector de grupo/org y botón asignar; y acción "reasignar" desde el detalle del socio.

### 3.3 Migración (una vez) — preservar
Función admin `goPesMigrarSociosAntiguos_()` (idempotente):
1. Para cada socio actual de `FACT_SOCIOS` sin `solicitud_id`: backfill `solicitud_id` desde `MAE_ORGANIZACIONES` (la org tiene su `solicitud_id`). Si es socio de grupo (org vacío pero venía con solicitud en organizacion_id), migrar ese valor a `solicitud_id` y limpiar `organizacion_id`.
2. `source = MIGRACION` donde esté vacío. Conserva `numero_registro`/`ubicacion_socio`.
3. Escribe corrección a `RAW_SOCIOS` (RAW-first) + upsert `FACT_SOCIOS`.
4. Reporta: total, backfilled, sin_match (para revisar a mano).

---

## 4. Archivos y funciones a tocar (checklist exacta)

| Archivo | Función | Cambio |
|---|---|---|
| Repository.js | `buildSheetDefinitions_` | Append columnas nuevas a `RAW_SOCIOS` y `FACT_SOCIOS` |
| DerivedBuilders.js | rebuild socios (782-797) | Mapear campos nuevos RAW→FACT; `socio_id` determinístico por RUT (mina #2) |
| ZZ_FormSociosIntegration.js | `importarRespuestasFormSocios` | Persistir telefono/correo/consentimiento/fecha; `solicitud_id`; matching tolerante; pendientes en vez de error; N° Registro secuencial; ubicacion compuesta |
| ZZ_SociosBackend.js | `importarSocios` | Escribir campos nuevos (RAW+FACT) |
| ZZ_SociosBackend.js | `getSociosModuloClient` | Leer `solicitud_id` y contacto del socio (fallback a contacto del caso si vacío) |
| ZZ_SociosBackend.js | `editarDatosSocio` | Permitir editar telefono/correo del socio |
| ZZ_SociosBackend.js (nuevo) | `vincularSocioManual`, `reasignarSocio`, `getSociosSinVincular` | Vinculación manual RAW-first + bandeja |
| ZZ_AvanceBackend.js | `goPesActualizarSociosAlConstituirOrganizacion_` | Filtrar por `solicitud_id`, setear `organizacion_id` (RAW-first) |
| Validators.js | `validateSocioRowV2_` | Aceptar `solicitud_id` **o** `organizacion_id` |
| Repository_Indexes.js | `buildSociosByOrgIdIndex_` | Sin cambio de firma; documentar que cuenta solo constituidos (org no vacío) |
| SystemConfig.js | `defaults.socios` | (Opcional) exponer si se autogenera N° Registro |
| Scripts_Socios.html | vistas | Bandeja de pendientes + contacto por socio + acción vincular/reasignar (ola 4, gráfica) |

Consumidores auditados que **no** requieren cambio de datos (solo leen org/counts): Dashboard.js:206, DerivedBuilders builders de MASTER/vistas, ZZ_BeneficiosBackend (usa contacto del caso). Se verifican tras cada ola.

---

## 5. Olas de implementación (verificar en DEV entre cada una)

1. **Esquema + rebuild + identidad**: columnas nuevas (RAW+FACT) + mapper DerivedBuilders + `socio_id` por RUT. Deploy. `goPesRunAllTests()`. Verificar que un rebuild no rompe nada.
2. **Migración**: `goPesMigrarSociosAntiguos_` + backfill `solicitud_id`. Ejecutar en DEV, revisar reporte de `sin_match`.
3. **Imports**: arreglar `importarRespuestasFormSocios` (contacto/consentimiento/matching/pendientes/N°/ubicación) + `importarSocios`. Reimportar respuestas en DEV, validar pendientes.
4. **Vinculación manual**: backend (`vincularSocioManual`/`getSociosSinVincular`) + herencia al constituir. 
5. **Lectura + gráfica**: `getSociosModuloClient` (contacto por socio) + rediseño del módulo (bandeja, contacto accionable, etc.).

Cada ola: commit → `push-dev` → build → GitHub. `push-prod` lo hace el usuario.

---

## 6. Riesgos y mitigaciones
- **Rebuild borra datos** → mapper actualizado + todo RAW-first (mina #1/#3).
- **Re-vínculo cambia `socio_id`** → identidad por RUT (mina #2); se preserva `FACT_FORM_INSCRIPCIONES.socio_id`.
- **Labels del form no calzan** → cola de pendientes, nunca se pierde el socio.
- **Un RUT en varias organizaciones** → identidad = membresía (RUT + discriminador estable); dedup por identidad de envío (RUT + fecha_registro), NUNCA por RUT global. No se funden ni se rechazan membresías legítimas.
- **Cambio de `socio_id` en rebuild afecta `FACT_FORM_INSCRIPCIONES`**: cambiar la fórmula del id provoca churn en el próximo rebuild completo. Mitigación: la **migración es in-place** (upsert sobre las filas existentes, conservando su `socio_id` actual); la fórmula nueva aplica a socios nuevos y a rebuilds futuros. Si se corre un rebuild completo, se re-mapea `FACT_FORM_INSCRIPCIONES.socio_id` en el mismo paso (o se evita el rebuild). Se confirma antes de la ola 1.
- **Rollback**: `RAW_SOCIOS` es append-only (histórico intacto); revertir = restaurar def anterior + rebuild. Recomendado **respaldar el spreadsheet** antes de la ola 1.

---

## 7. Decisiones que requieren confirmación del usuario
1. **Identidad `socio_id` = membresía (RUT + fecha_registro / legacy_key)**, no organizacion_id, para soportar el mismo RUT en varias orgs y sobrevivir re-vínculos. Dedup por identidad de envío, no por RUT. ¿OK?
2. **N° Registro autogenerado secuencial por grupo** para nuevos (recomendado). ¿OK o lo dejamos en blanco?
3. **Ubicación = dirección + ", Providencia"** (recomendado, replica lo viejo). ¿OK?
4. **Respaldo del spreadsheet** antes de la ola 1. ¿Lo haces tú o lo automatizo?
