---
name: go-pes-beneficios
description: >-
  Trabaja el módulo Beneficios/Instrumentos de GO-PES v2 (app de Google Apps
  Script): CÁMARAS 1414, FONDESE (ediciones por año) y eventos de formación con
  inscripciones. Úsala para "beneficios", "instrumentos", "CÁMARAS 1414", "FONDESE",
  "edición/convocatoria FONDESE", "elegibilidad de beneficio", "evento de
  formación/inscripción", "capacitaciones". Conoce sus reglas: elegibilidad por
  certificado definitivo, esquema evolutivo por edición y PIN de eventos abiertos.
  NO es para el avance/hitos (go-pes-avance) ni otros módulos.
---

# go-pes-beneficios — Módulo Beneficios / Instrumentos

Es el módulo más amplio tras Avance: agrupa los instrumentos de apoyo que una organización puede recibir. Backend en `ZZ_BeneficiosBackend.js`, frontend en `Scripts_Beneficios.html`.

**Lee primero `references/reglas-go-pes.md`.**

## Los tres flujos del módulo
1. **CÁMARAS 1414** (`beneficio_codigo: 'CAMARAS_1414'`) — **beneficio único por organización; el rol del equipo es solicitar y registrar**
   - **Elegibilidad:** la organización debe tener el **certificado definitivo** (`FOR_04`); el backend lo valida y lanza error si falta (ver `go-pes-avance`).
   - **Flujo simplificado (3 estados): Elegible → Solicitado → Instalado.** (1) Solicitar la instalación a la Unidad de Seguridad Pública dentro de **5 días hábiles (lun-vie)** del certificado; (2) al recibir la firma del convenio, registrar que las cámaras están instaladas y **cuántas**. Se guardan 2 detail rows (`SOLICITUD_SP`, `INSTALACION_REG`) en `FACT_Beneficios_Organizacion_Hitos`; el estado en `FACT_Beneficios_Organizacion`. `guardarCamaras1414Organizacion` recibe `{solicitud, instalacion}`; `buildCamarasWorkflowState_` deriva el estado.
   - **Plazo/alerta:** `ben_camaras_post_cert_dias` (default 5) se cuenta en **días hábiles** desde el certificado (helpers `businessDaysBetween_`/`addBusinessDays_`); alerta si la org está elegible y aún no solicita (ver `alertas.md`). **El plazo NO es configurable** (fijo 5 días hábiles).
   - **UI (panel):** una **tabla de seguimiento** única (`renderCamaras1414Panel_`/`renderCamaras1414TrackingTable_`) con progreso por fila (Elegible→Solicitado→Instalado), badge de plazo por color, y botones al final de fila que abren un editor inline: "Marcar solicitud" (fecha) y "Registrar instalación" (fecha + N° cámaras) → llaman a `guardarCamaras1414Organizacion` con payload parcial (fusiona con lo existente). `buildCamaras1414Panel_` devuelve `{orgs, summary}`.
2. **FONDESE** (`beneficio_codigo: 'FONDESE'`) — **esquema evolutivo por año + dos ventanas de acompañamiento**
   - **Esquema evolutivo:** los documentos/requisitos **cambian por edición/convocatoria**: se guardan como **JSON serializado** en `CFG_FONDESE_Ediciones` (una fila por año), no como columnas fijas (lección FONDESE — ver `go-pes-esquema-datos`). El `FACT_Fondese` referencia su edición por ID; **deserializa con la config de la edición del registro**, no de la edición activa.
   - **Ciclo de vida** (`FACT_Fondese.estado_proceso`): `en_armado → ingresada → en_evaluacion → adjudicado → firma_convenio → en_ejecucion → en_rendicion → cerrado`. El equipo PES acompaña en **dos ventanas** con un hueco en medio: **Ventana 1** = `en_armado` (ayuda a armar la postulación; la **línea es editable** solo aquí); al pasar a `ingresada` la postulación sale de sus manos; **evaluación** = hueco (sin alertas); **Ventana 2** = `en_ejecucion`/`en_rendicion` (vigila cumplimiento en tiempo y forma). `buildFondeseWorkflowState_` es la fuente única del progreso.
   - **Dos llamados por año:** cada edición tiene siempre **Primer** y **Segundo Llamado FONDESE 20XX** (convocatorias en el JSON de la edición; nombre visible vía `goPesFondeseLlamadoNombre_`). Una organización **puede postular a ambos llamados** — la unicidad de proceso es **por llamado** (`goPesIngresarFondeseArmado` valida no-duplicado por convocatoria, no por edición).
   - **Regla de adjudicación (`goPesAssertAdjudicacionFondese_`, en `goPesUpsertFondese` al pasar a `adjudicado`):** una organización solo puede **adjudicarse una vez por año calendario** (sumando ambos llamados), y solo si **toda adjudicación anterior se cerró con rendición aprobada** (`estado_proceso='cerrado'` + `estado_rendicion='aprobada'`).
   - **Montos y ledger:** `monto_adjudicado`/`monto_ejecutado` se capturan **solo tras la adjudicación**; `syncFactInstrumentoFromFondese_` refleja cada postulación en `FACT_Instrumentos` (idempotente por `fondese_id`) para la ficha de la org y el dashboard.
   - **Alertas** (`Alertas.js`): `evaluarBenFondeseCierreConv_` (Ventana 1) y `evaluarBenFondeseRendicion_` (Ventana 2); umbrales `ben_fondese_cierre_conv_dias`/`ben_fondese_rendicion_dias`.
   - API: ediciones `goPesGetFondeseEdiciones`/`goPesGetFondeseEdicionActiva`/`goPesUpsertFondeseEdicion`; puerta de entrada `goPesGetFondeseHabilitadas(payload {id_edicion, convocatoria_id})`/`goPesIngresarFondeseArmado`; registro `goPesGetFondeseDetalle`/`goPesUpsertFondese`; one-run superuser `goPesBackfillFondeseInstrumentos`/`goPesMigrateFondeseEstados`. La puerta de entrada es un listado de habilitadas por año/llamado (`Scripts_Beneficios.html` → `renderFondeseHabilitadasListado_`), que reemplazó la tabla de postulaciones y el modal "Nueva postulación" (eliminados).
3. **Eventos de formación / inscripciones** (capacitaciones)
   - API: `goPesGetFormEventos`/`goPesUpsertFormEvento`/`goPesDeleteFormEvento`, inscripciones `goPesGetFormInscripciones`/`goPesUpsertFormInscripcion`/`goPesCancelFormInscripcion`, y `goPesAutoCloseFormEventos` (cierre automático por trigger).
   - **Crear un evento con inscripción abierta requiere el PIN `evento_abierto`** (ver `go-pes-seguridad`).
   - Elegibilidad de socios: `goPesGetFormSocioByRut`, `goPesGetOrganizacionesConHito5`.
   - **Es un beneficio POR SOCIO/persona (no por organización):** cada inscripción liga `socio_id` (exclusiva, RUT valida contra `FACT_Socios`) o queda como externo, más `rut`. **Vinculación:** `getCapacitacionesByRut_(rut)` (helper) une inscripciones+eventos por RUT y `obtenerFicha` (Services.js) lo incluye como `capacitaciones` en la ficha del vecino (sección "Capacitaciones y formación"). A diferencia de CÁMARAS/FONDESE (por org, en `FACT_Instrumentos`), CAPACITACIONES vive en la ficha de la persona.

## Reglas al tocar el módulo
- **Elegibilidad anclada al avance:** CÁMARAS depende de `FOR_04`; no dupliques la lógica de hitos, consúltala (`go-pes-avance`).
- **FONDESE por edición:** nunca metas documentos variables como columnas fijas; usa el patrón de dos capas (`CFG_*_Ediciones` JSON + `FACT_*`). Cambiar el esquema es `go-pes-esquema-datos`.
- **Upserts parciales de FONDESE fusionan, no reemplazan:** `goPesUpsertFondese` con `fondese_id` lee la fila existente y hace `Object.assign` antes de escribir. `upsertRowsByKey_` rellena con `''` las columnas ausentes, así que un payload parcial (ej. cambiar solo `estado_proceso`) borraría el resto — mantén la fusión. Todo cambio de estado debe pasar por el ledger (`syncFactInstrumentoFromFondese_`).
- **PIN en acciones sensibles:** eventos con inscripción abierta pasan por `goPesValidatePin_('evento_abierto', ...)`.
- **Deuda conocida:** los wizards informativos de CÁMARAS y FONDESE en `Scripts_Beneficios.html` comparten ~150 líneas de maquinaria local duplicada (candidata a extraer — ver `go-pes-higiene`).

## Cuándo NO usar esta skill
- Hitos/estados de constitución → `go-pes-avance`.
- Otros módulos (organizaciones, socios, calendario) → `go-pes-feature`/`go-pes-flujo`.

## Skills relacionadas
- `go-pes-avance` (elegibilidad por certificado), `go-pes-esquema-datos` (FONDESE evolutivo), `go-pes-seguridad` (PIN `evento_abierto`), `go-pes-feature`/`go-pes-estructura` (al extender el módulo).
