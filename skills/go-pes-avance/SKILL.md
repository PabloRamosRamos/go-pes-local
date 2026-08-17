---
name: go-pes-avance
description: >-
  Cubre la máquina de estados del módulo Avance de GO-PES v2 (app de Google Apps
  Script de la Municipalidad de Providencia): tramos, estados, catálogo de hitos
  PRE_*/FOR_*, sus prerequisitos (codigo_hito_previo) y los plazos/alertas. Úsala
  para "agregar/cambiar un hito", "el orden de los hitos", "registrar avance",
  "por qué no se puede marcar el hito X", "certificado provisorio/definitivo",
  "plazos entre hitos", "alertas de formalización", "estados del caso
  (Activo/Stand by/Detenido/Finalizado)". NO es para el rediseño visual del
  timeline (go-pes-rediseno-visual) ni para lentitud del módulo (go-pes-performance).
---

# go-pes-avance — Máquina de estados del Avance (hitos)

El módulo Avance modela el **proceso de formalización** de una organización como una secuencia regulada de **hitos** con prerequisitos. Es el flujo más normado del sistema: cambiar un hito, su orden o su prerequisito afecta el timeline, el dashboard y las alertas. Esta skill te da el modelo real y sus anclajes.

**Lee primero `references/reglas-go-pes.md`.** Tabla completa de hitos en `references/hitos-y-transiciones.md`. Referencia humana equivalente en el repo: `docs/avance-hitos.md`; los plazos/alertas en `docs/alertas.md`.

## El modelo (fuente de verdad)
- **Tramos** (`GO_PES_V2.AVANCE.TRAMOS`): `Preconstitución` → `Formalización posterior`.
- **Estados del caso** (`GO_PES_V2.AVANCE.ESTADOS`): `Activo`, `Stand by`, `Detenido`, `Finalizado`. El estado vigente es el **último registro** de `FACT_Avance_Estado` (helpers `buildEstadosBy*Index_`).
- **Catálogo de hitos** (seed `getSeedCatalogoHitosAvance_()` en `ZZ_AvancePhase2.js`, hoja `CAT_Hitos_Avance`): 15 hitos, `PRE_01..PRE_07` + `FOR_01..FOR_08`, cada uno con `orden_hito`, `nombre_hito`, `codigo_hito_previo` y `permite_saltar`. **Ojo: `orden_hito` NO es correlativo con el código** (FOR_07 es orden 12, FOR_05 es orden 15); el código es identidad, el orden es la secuencia. Varios FOR dependen todos de `FOR_04` (ramas paralelas post-certificado definitivo).
- **Hechos** (`FACT_AVANCE_HITOS`): un registro por hito cumplido, con `codigo_hito`, fecha, `usuario_registro` (y campos especiales como `numero_ingreso` en PRE_02).

## Hitos clave (memorízalos, se citan en todo el código)
- `PRE_04` — Asamblea constitutiva (nace el expediente).
- `PRE_07` — **Certificado provisorio** (personalidad jurídica; cierra Preconstitución, habilita `FOR_01`).
- `FOR_04` — **Certificado definitivo** (válido 3 años; habilita las ramas RUT/RCCE/cuenta/RMRFP).

## Reglas al tocar el avance
1. **El catálogo es un seed, no hardcode disperso.** Para cambiar hitos, edita `getSeedCatalogoHitosAvance_()` y re-siembra (`goPesSembrarCatalogoAvanceFase2_`, superuser). No dupliques nombres/órdenes en el frontend.
2. **Respeta `codigo_hito_previo` y `permite_saltar`.** No permitas marcar un hito cuyo previo no está cumplido, salvo que el previo sea `permite_saltar: true` (PRE_06/PRE_07 y las ramas FOR_05/06/07/08).
3. **Cuidado con confundir número vs código** (bug real histórico: el dashboard contaba el hito 9 como "Cert. provisorio" cuando el correcto es `PRE_07`). Referencia siempre por `codigo_hito`, no por posición.
4. **Los plazos viven en Alertas** (`GO_PES_V2.ALERTAS.HITOS` + umbrales en `Alertas.js`): las alertas de formalización miden días entre hitos (`form_hito4a5_dias`, etc.) filtrando por `codigo_hito` (nunca por `hito_key`, campo inexistente que rompió las alertas en PROD).
5. Persistencia en **dos caminos** (organización con `organizacion_id` y grupo de vecinos con `solicitud_id`): al tocar `registrarHitoAvance`, cubre ambos.

## Archivos
- Backend: `ZZ_AvanceBackend.js` (`registrarHitoAvance`, `getAvanceGrupoVecinos`, `actualizarFechasHitos`), `ZZ_AvancePhase1.js` (definiciones de hoja), `ZZ_AvancePhase2.js` (seed del catálogo), `Alertas.js` (plazos).
- Frontend: `Scripts_Avance.html` (`renderAvanceTimeline_`, `registrarHitoAvanceUi_`, `submitAvanceHitoModal_`).

## Skills relacionadas
- `go-pes-flujo` — cómo encaja el Avance en el recorrido del caso.
- `go-pes-esquema-datos` — al cambiar la estructura de `CAT_Hitos_Avance`/`FACT_AVANCE_HITOS`.
- `go-pes-bug` (bugs de hito/orden), `go-pes-rediseno-visual` (timeline), `go-pes-tests` (suite `goPesTestAvance_`).
