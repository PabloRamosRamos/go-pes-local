---
name: go-pes-higiene
description: >-
  Mantiene la higiene de código de GO-PES v2 (Google Apps Script): evita y
  elimina duplicados de funciones, código muerto y CSS huérfano, sin romper lo
  vigente. Úsala para "limpiar duplicados", "eliminar código muerto", "hay dos
  funciones iguales", "auditar el archivo X", "verificar duplicados",
  "consolidar", o ANTES de crear una función (grep obligatorio por el namespace
  único de GAS). NO es para features nuevas (go-pes-feature) ni para arreglar un
  bug de comportamiento puntual (go-pes-bug).
---

# go-pes-higiene — Anti-duplicados y anti-código-muerto

En Apps Script todos los `.js` comparten **un solo namespace global** y los parciales `Scripts_*.html` se concatenan dentro de **un mismo IIFE**: si defines una función con un nombre que ya existe, **la segunda definición sombrea a la primera sin error**. Esto ha causado bugs reales (una `invalidateRequestIndexes_()` duplicada que no invalidaba índices de hitos/socios). Esta skill previene y limpia esos vicios.

**Lee primero `references/reglas-go-pes.md`.**

## Antes de CREAR una función (obligatorio)
- **Grep del nombre exacto** en todo el repo antes de escribir una función nueva. Si ya existe, extiende/reutiliza; no la redefinas.
- Ídem para clases CSS: grep del nombre antes de crearla (colisión silenciosa con estilos existentes).

## Al ELIMINAR / migrar
- **Eliminar, no desactivar.** Prohibido dejar funciones `*LegacyInactive_`, bloques comentados "por si acaso" o flags muertos. Si algo ya no se usa, se borra.
- **Migraciones completas, sin alias permanentes.** Nada de `funcionVieja = funcionNueva` "para no romper": actualiza a todos los llamadores y elimina la vieja.
- **No renombres ni elimines funciones públicas** (sin `_`) sin grep global que confirme cero llamadores (incluido el frontend).
- **Verificación bidireccional de CSS:** al borrar una clase, grep en JS/HTML que nadie la aplique; al borrar JS que aplicaba una clase, grep que la clase no quede huérfana en `Styles.html`/`ThemeDark.html`.

## Al CERRAR cualquier cambio
- **Scan de duplicados:** grep de las funciones tocadas para confirmar **una sola definición** de cada una.
- Corre `goPesRunAllTests()` → 0 fallos.

## Herramientas del repo para duplicados de datos
Para registros duplicados (no de código): `ZZ_VerificarDuplicados.js` (`goPesVerificarTodosDuplicados`, `goPesVerificarDuplicadosHitos`, `goPesVerificarDuplicadosCasos`) inventaría; `ZZ_LimpiarDuplicados.js` limpia. **Corre siempre la verificación antes de limpiar**, y limpia en DEV antes que en PROD (datos reales).

## Documentación (parte de la higiene)
- Un doc completado se mueve a `docs/archive/` **en el mismo cambio** que lo cierra; no se crean docs paralelos del mismo tema.
- Si eliminas una API, grep en `docs/` y actualiza las referencias.

## Skills relacionadas
- `go-pes-colores` — si la limpieza toca variables/valores de color (cede el criterio visual a ella).
- `go-pes-bug` — si al limpiar destapas un bug de comportamiento.
- `go-pes-esquema-datos` — duplicados que nacen de un esquema mal diseñado.
