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
1. **CÁMARAS 1414** (`beneficio_codigo: 'CAMARAS_1414'`)
   - **Elegibilidad:** la organización debe tener el **certificado definitivo** (`FOR_04`) — sin él, no es elegible (ver `go-pes-avance`). El backend lo valida y lanza error si falta.
   - Config vía `guardarConfiguracionCamaras1414` / asignación por org `guardarCamaras1414Organizacion`.
   - **Plazo/alerta:** `ben_camaras_post_cert_dias` (default 5) mide días tras el certificado definitivo (ver `alertas.md`).
2. **FONDESE** (`beneficio_codigo: 'FONDESE'`) — **esquema evolutivo por año**
   - Los documentos/requisitos **cambian por edición/convocatoria**: se guardan como **JSON serializado** en `CFG_FONDESE_Ediciones` (una fila por año), no como columnas fijas (lección FONDESE — ver `go-pes-esquema-datos`).
   - El `FACT_*` referencia su edición por ID; **deserializa con la config de la edición del registro**, no de la edición activa.
   - API: `goPesGetFondeseEdiciones`/`goPesGetFondeseEdicionActiva`/`goPesUpsertFondeseEdicion` (ediciones) y `goPesGetFondeseList`/`goPesGetFondeseDetalle`/`goPesUpsertFondese`/`goPesGetOrgsElegiblesFondese` (registros).
3. **Eventos de formación / inscripciones** (capacitaciones)
   - API: `goPesGetFormEventos`/`goPesUpsertFormEvento`/`goPesDeleteFormEvento`, inscripciones `goPesGetFormInscripciones`/`goPesUpsertFormInscripcion`/`goPesCancelFormInscripcion`, y `goPesAutoCloseFormEventos` (cierre automático por trigger).
   - **Crear un evento con inscripción abierta requiere el PIN `evento_abierto`** (ver `go-pes-seguridad`).
   - Elegibilidad de socios: `goPesGetFormSocioByRut`, `goPesGetOrganizacionesConHito5`.

## Reglas al tocar el módulo
- **Elegibilidad anclada al avance:** CÁMARAS depende de `FOR_04`; no dupliques la lógica de hitos, consúltala (`go-pes-avance`).
- **FONDESE por edición:** nunca metas documentos variables como columnas fijas; usa el patrón de dos capas (`CFG_*_Ediciones` JSON + `FACT_*`). Cambiar el esquema es `go-pes-esquema-datos`.
- **PIN en acciones sensibles:** eventos con inscripción abierta pasan por `goPesValidatePin_('evento_abierto', ...)`.
- **Deuda conocida:** los wizards informativos de CÁMARAS y FONDESE en `Scripts_Beneficios.html` comparten ~150 líneas de maquinaria local duplicada (candidata a extraer — ver `go-pes-higiene`).

## Cuándo NO usar esta skill
- Hitos/estados de constitución → `go-pes-avance`.
- Otros módulos (organizaciones, socios, calendario) → `go-pes-feature`/`go-pes-flujo`.

## Skills relacionadas
- `go-pes-avance` (elegibilidad por certificado), `go-pes-esquema-datos` (FONDESE evolutivo), `go-pes-seguridad` (PIN `evento_abierto`), `go-pes-feature`/`go-pes-estructura` (al extender el módulo).
