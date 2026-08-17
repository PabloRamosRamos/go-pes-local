---
name: go-pes-bug
description: >-
  Corrige un bug en GO-PES v2 (app de Google Apps Script de la Municipalidad de
  Providencia) con un flujo estructurado: reproducir → inventario → fix mínimo →
  test → deploy. Úsala para "hay un bug", "esto está fallando", "no funciona X",
  "sale error al", "el dato sale mal", "se registra duplicado", "corregir el
  comportamiento de". NO es para features nuevas (usa go-pes-feature), rediseño
  visual (go-pes-rediseno-visual) ni bugs de color/tema (usa go-pes-colores).
---

# go-pes-bug — Corrección estructurada de bugs

Skill para arreglar comportamiento roto en GO-PES v2 con disciplina de causa raíz, no parches. El proyecto opera con cultura de "analizar y aprobar antes de construir": el fix se diseña antes de escribirse.

**Lee primero `references/reglas-go-pes.md`.**

## Regla de oro
No propongas un fix hasta **reproducir** el bug y **entender la causa raíz**. Un síntoma tratado sin causa reaparece. Muchos bugs del proyecto vinieron de claves/campos mal escritos que fallaban en silencio (`h.hito_key` vs `codigo_hito`, `AVANCE.FACT_HITOS` inexistente → hoja `undefined` → `[]` mudo).

## Fase 1 — Diagnóstico (NO escribir código)
1. **Reproducir:** define el input exacto, el resultado esperado y el observado. Si es intermitente (carreras, cache), dilo.
2. **Inventario por grep:** localiza toda la cadena involucrada — la función pública de entrada, las privadas que llama, las hojas/claves `GO_PES_V2.SHEETS`/campos que toca, y el parcial `Scripts_*.html` que la invoca. Verifica que los nombres de campo/hoja/clave **existan de verdad** (los `undefined` silenciosos son la causa raíz típica).
3. **Aislar la causa raíz:** ¿dato mal leído, guard de rol, cache no invalidado, carrera de escritura/lectura, campo inexistente, override CSS? Nómbrala explícitamente.
4. **Blast radius:** qué más usa ese código; si el fix puede romper otro módulo (regla: no renombrar públicas sin grep global).
5. Presenta diagnóstico + fix mínimo propuesto y **espera aprobación**. Si el bug es de color/tema, cede a `go-pes-colores`.

## Fase 2 — Fix mínimo
- **Scope mínimo:** el menor número de archivos/líneas. Corrige la causa, no el síntoma.
- Respeta convenciones backend (guard en 1ª línea, `serializeForClient_`, privadas con `_`).
- Si el bug era un duplicado o código muerto que sombrea al vigente, aplica `go-pes-higiene`.
- **Nada de alias/compat permanentes** para "no romper": si migras, migra completo.

## Fase 3 — Test que capture la regresión
- Agrega o ajusta un test en la suite correspondiente de `Audith.js` que **falle antes** del fix y **pase después** (skill `go-pes-tests`). Para bordes (plazos, N días exactos) testea el límite.
- Corre `goPesRunAllTests()` → 0 fallos.

## Fase 4 — Verificación y deploy
- Verifica el caso reproducido y los estados vecinos (vacío, parcial, el módulo tocado). Modo claro y oscuro si fue visual.
- Deploy con `go-pes-deploy` (DEV → verificación → PROD). **Ojo con bugs cuyo fix depende de datos reales** (varias alertas nunca dispararon en PROD por el bug `hito_key`): valida contra PROD al desplegar.

## Entregables
1. Reproducción (input → esperado vs observado) y **causa raíz** en una frase.
2. Archivos/líneas cambiadas y por qué (scope mínimo).
3. El test que ahora cubre la regresión.
4. Qué se verificó y en qué entorno.

## Skills relacionadas
- `go-pes-colores` — si el bug es de color/tema (cede a ella).
- `go-pes-higiene` — si la causa es un duplicado / código muerto.
- `go-pes-performance` — si el síntoma es lentitud o doble envío.
- `go-pes-tests`, `go-pes-deploy`.
