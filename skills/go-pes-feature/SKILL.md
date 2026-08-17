---
name: go-pes-feature
description: >-
  Implementa un módulo, submódulo o feature nuevo en GO-PES v2 (app de Google
  Apps Script de la Municipalidad de Providencia) que toca backend + frontend.
  Úsala para "nuevo módulo", "nuevo submódulo", "agregar funcionalidad",
  "implementar feature", "nueva vista con datos", o para replicar el patrón de
  FONDESE, Alertas, Dashboard o Calendario. Guía el flujo completo por fases:
  Fase 1 lectura → Fase 2 diseño → Fase 3 backend → Fase 4 frontend → Fase 5
  tests → Fase 6 verificación y deploy, respetando las convenciones del proyecto.
---

# go-pes-feature — Desarrollo de módulo/submódulo/feature

Skill para construir funcionalidad nueva en GO-PES v2 que involucra backend (Apps Script) y frontend (parcial HTML). Reemplaza el andamiaje que antes se escribía a mano en cada prompt largo.

**Antes de nada, lee `references/reglas-go-pes.md`** (reglas obligatorias y convenciones). No las repitas al usuario; aplícalas.

Trabaja **estrictamente por fases** y **no avances de fase sin aprobación explícita del usuario**. Este proyecto opera con cultura de "analizar y aprobar antes de construir".

---

## Fase 1 — Lectura y análisis (NO escribir código)

1. Identifica los archivos involucrados y **léelos completos** antes de opinar. Orden habitual:
   - `Main.js` → estructura de `GO_PES_V2` (`SHEETS`, `VIEWS`, `ROLES`, y la sección específica si existe: `ALERTAS`, `DASHBOARD`, etc.).
   - El backend del módulo más parecido al que vas a crear (`Alertas.js`, `Dashboard.js`, `ZZ_*Backend.js`) para copiar su patrón.
   - `Auth.js` → `getUsuarioActual()`, `requireRole_`, `requireModuleAccess_`, qué campos trae el objeto usuario.
   - `Repository.js` → `getSheet_`, lectura de filas, `buildSheetDefinitions_`, cache `GO_PES_RUNTIME`.
   - `SystemConfig.js` → cómo se lee/escribe `CFG_Parametros` si el feature necesita configuración.
   - El parcial frontend análogo (`Scripts_*.html`) y su punto de despacho/routing.
2. Presenta un **resumen de hallazgos**: qué existe, qué falta, qué funciones públicas están disponibles, qué hojas se consultan.
3. Formula **todas las preguntas abiertas** (opciones de almacenamiento, catálogos, ubicación en la UI, reutilización de componentes visuales).
4. Enumera **riesgos** (qué podría romperse, qué toca zonas sensibles).
5. **Detente y espera aprobación.**

## Fase 2 — Diseño (plantear, no implementar)

Presenta para aprobación:
- **Esquema de datos:** hojas nuevas o modificadas (usa la skill `go-pes-esquema-datos`). Si el esquema evoluciona por año/edición, prefiere **un campo JSON serializado** en vez de columnas fijas (lección FONDESE).
- **Arquitectura de flujo:** `google.script.run.<publica>()` → `getUsuarioActual()` + guard de rol → lectura/config → cómputo → `serializeForClient_`.
- **Contrato de la(s) función(es) pública(s):** nombre, payload, forma exacta del objeto de retorno.
- **Estrategia de performance:** cache en `GO_PES_RUNTIME` con TTL, evaluación lazy, o carga diferida de librerías, según el caso.
- Espera aprobación antes de codear.

## Fase 3 — Implementación backend

- Registra constantes nuevas dentro de `GO_PES_V2` en `Main.js` (nunca hardcodeadas sueltas).
- Crea el archivo del módulo (patrón `Alertas.js`/`Dashboard.js`) o extiende el `ZZ_*Backend.js` correspondiente.
- **Cada función pública** empieza con `requireRole_([...])` o `requireModuleAccess_(key, [...])` y retorna vía `serializeForClient_(...)`. Privadas con sufijo `_`.
- Usa `try/catch` en escrituras; cache con TTL + **invalidación explícita** al modificar datos.
- Ver `references/plantilla-funcion-backend.md`.

## Fase 4 — Implementación frontend

- Un parcial `Scripts_<Modulo>.html` incrustado con `include()` **sin `<script>`**.
- Renderizado asíncrono: skeleton/spinner → `google.script.run.withSuccessHandler().withFailureHandler().<publica>(payload)` → render.
- **Sin librerías externas** salvo excepción preaprobada (cargar Leaflet/Chart.js dinámicamente solo dentro del módulo).
- CSS nuevo **al final de `Styles.html`** (modo claro) y overrides oscuros al final de `ThemeDark.html`, en bloque con comentario de sección y clases de **prefijo propio**; no modifiques ni elimines lo existente, y nada de CSS inline. Si tocas color, aplica `go-pes-colores`.
- Respeta accesibilidad: `<button>` reales, `role`/`aria-*`, `prefers-reduced-motion`.

## Fase 5 — Tests

- Agrega una suite `goPesTest<Modulo>_()` en `Audith.js` y regístrala con `acumular(goPesTest<Modulo>_())` dentro de `goPesRunAllTests()`. Detalle en la skill `go-pes-tests`.

## Fase 6 — Verificación y deploy

- Corre `goPesRunAllTests()` (0 fallos) y recorre `references/checklist-integracion.md`.
- Verifica **modo claro y oscuro**.
- Entrega el reporte (ver abajo) y usa la skill `go-pes-deploy` para pasar a DEV → PROD.

---

## Entregables al cerrar

1. Resumen de hallazgos de Fase 1 (qué había, qué faltaba).
2. Lista exacta de archivos modificados con diff resumido por archivo y **por qué**.
3. Confirmación de que en `Styles.html`/`ThemeDark.html` solo se **agregó** el bloque CSS del módulo al final (nada existente modificado ni eliminado).
4. Instrucciones para probar en DEV.
5. Tabla "resumen de archivos a modificar" (formato en `references/checklist-integracion.md`).

## Skills relacionadas

- `go-pes-esquema-datos` — al crear/modificar hojas.
- `go-pes-tests` — Fase 5.
- `go-pes-deploy` — Fase 6.
- `go-pes-colores` — si el feature toca cualquier color.
