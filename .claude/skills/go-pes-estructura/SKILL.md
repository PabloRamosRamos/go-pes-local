---
name: go-pes-estructura
description: >-
  Asegura que los módulos y elementos parecidos de GO-PES v2 (app de Google Apps
  Script) compartan la MISMA estructura: layout de archivos backend, parciales
  frontend, orden de secciones, nombres y registro en los sitios estándar. Úsala
  para "estandarizar la estructura de", "que siga el mismo patrón que los otros
  módulos", "reordenar/organizar este archivo", "crear el módulo con la estructura
  correcta", "cómo se organiza un módulo aquí". Complementa a go-pes-feature (que
  construye la funcionalidad); esta define el molde. NO es para lógica ni bugs.
---

# go-pes-estructura — Estructura consistente de módulos/archivos

En GO-PES los módulos parecidos deben verse parecidos: mismo layout de archivo, mismos nombres, registro en los mismos lugares. Esto reduce sorpresas y bugs. Esta skill es el **molde**; para construir el contenido usa `go-pes-feature`.

**Lee primero `references/reglas-go-pes.md`.** Esqueletos canónicos en `references/estructura-modulo.md`.

## Molde de un módulo (dónde va cada pieza)
Un módulo nuevo toca **siempre los mismos sitios**:
1. **Constantes** → dentro de `GO_PES_V2` en `Main.js` (nunca sueltas).
2. **Hojas** → clave en `GO_PES_V2.SHEETS` + headers en `buildSheetDefinitions_()` (`Repository.js`). Ver `go-pes-esquema-datos`.
3. **Backend** → archivo propio del módulo (`Alertas.js`, `Dashboard.js`) o `ZZ_<Modulo>Backend.js` para módulos tardíos/secundarios.
4. **Frontend** → un parcial `Scripts_<Modulo>.html`, incrustado con `include()` **sin `<script>`**.
5. **Tests** → suite `goPesTest<Modulo>_()` en `Audith.js`, registrada en `goPesRunAllTests()`.
6. **Estilos** → bloque al final de `Styles.html` (+ `ThemeDark.html`), clases con prefijo propio.

## Estructura de un archivo backend
Orden estándar (ver ejemplo en `references/estructura-modulo.md`):
1. **Cabecera** `/** ... */` con propósito del módulo.
2. **Secciones separadas** con comentarios `// ═══...` (convención del repo).
3. (Opcional) detección de entorno `isDevEnvironment<Modulo>_()`.
4. **Config/defaults** `getDefault<Modulo>Config_()` si aplica.
5. **Funciones públicas** (sin `_`): guard de rol en la 1ª línea → lógica → `return serializeForClient_(...)`.
6. **Funciones privadas** (sufijo `_`): helpers, sin guard (ya validó la pública).

## Estructura de un parcial frontend (`Scripts_<Modulo>.html`)
- **Sin `<script>`** y sin IIFE propio (se concatena dentro del IIFE de `Scripts.html`); sin CSS inline.
- Función de entrada `render<Modulo>View_()` que orquesta; sub-render `render<Modulo><Parte>_()`; handlers `<accion><Modulo>Ui_()`.
- Datos vía el wrapper **`api(fn, payload)`** (promesa), con loader acotado (usa `go-pes-loaders`).
- Funciones de limpieza `clear<Modulo>View_()` consistentes.

## Convenciones de nombres (transversales)
- **Pública** = sin `_`; **privada** = sufijo `_`. Archivos de negocio tardíos = prefijo `ZZ_`.
- Públicas de menú/diagnóstico y utilidades globales llevan prefijo `goPes*`.
- Paralelismo: si `getXModuloClient` existe en un módulo, el análogo en otro se llama igual (`get<Modulo>ModuloClient`), no inventes variantes.

## Cómo aplicarla
1. **Toma un módulo hermano como referencia** (el más parecido) y **replica su estructura**, no una nueva.
2. Verifica que el módulo nuevo aparece en los 6 sitios estándar de arriba.
3. Al reorganizar un archivo existente: solo mueve/renombra para alinear con el molde; no cambies comportamiento (si tocas lógica, es `go-pes-feature`/`go-pes-bug`).

## Cuándo NO usar esta skill
- Construir la funcionalidad → `go-pes-feature`.
- Arreglar un bug → `go-pes-bug`.

## Skills relacionadas
- `go-pes-feature` (construye siguiendo este molde), `go-pes-esquema-datos` (hojas), `go-pes-tests` (suite), `go-pes-loaders` (loaders del parcial), `go-pes-higiene` (evita duplicar al reorganizar).
