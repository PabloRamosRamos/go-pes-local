---
name: go-pes-documentacion
description: >-
  Mantiene y estandariza la documentación de GO-PES v2 (carpeta docs/) durante el
  desarrollo: qué doc actualizar según lo que cambiaste, nombres de archivo
  consistentes, archivar planes completados y no dejar datos desactualizados.
  Úsala para "actualizar la documentación", "documentar este cambio", "crear/
  renombrar un doc", "estandarizar docs", "mover a archive", "el doc quedó
  desactualizado", o al cerrar un cambio que tocó código documentado. NO es para
  higiene de código (go-pes-higiene) ni para escribir un módulo (go-pes-feature).
---

# go-pes-documentacion — Mantener y estandarizar docs

La documentación de GO-PES vive en `docs/` (regla del repo: **sin `.md` en la raíz**). Esta skill mantiene esos docs sincronizados con el código y consistentes entre sí durante DEV. La fuente canónica de las reglas de mantenimiento es **`docs/mantener-docs.md`** — léelo; esta skill es su versión accionable.

**Lee primero `references/reglas-go-pes.md`.**

## Estándar de nombres (obligatorio)
- **`kebab-case` en minúsculas** para todo doc, **excepto** `README.md` y `CLAUDE.md` (convención universal). Sin acentos ni mayúsculas en nombres de archivo. Sufijo de fecha `-YYYY-MM-DD` para docs fechados.
- Al renombrar un doc: `git mv` + **actualiza todas las referencias** (grep del nombre viejo en `docs/`), incluida cualquier mención en el árbol de `README.md`/`CLAUDE.md`.

## "Si cambias X, documenta Y" (matriz de `mantener-docs.md`)
| Cambiaste | Actualiza |
|-----------|-----------|
| Función pública nueva (sin `_`) | `docs/api-interna.md` + historial en `docs/CLAUDE.md` |
| Nueva hoja en `GO_PES_V2.SHEETS` | `docs/modelo-datos.md` |
| Nuevo hito / plazo de avance | `docs/avance-hitos.md` / `docs/alertas.md` |
| Nuevo rol/scope/PIN | `docs/seguridad.md` |
| Nueva clave `CFG_Parametros`/`SystemConfig` | `docs/branding-configuracion.md` |
| Nuevo componente/patrón UI | `docs/design-system.md` |
| Nueva suite de tests | `docs/testing.md` + `docs/dev-stats.md` |
| Cambio de proceso de deploy | `docs/deploy.md` |
| Cambio significativo | entrada en "Historial de cambios" de `docs/CLAUDE.md` |

## Reglas de higiene documental
1. **Documenta en el mismo commit que el código.** "Lo documento después" = no se documenta.
2. **Plan/diagnóstico completado → `docs/archive/`** en el mismo cambio que lo cierra, con su entrada en `archive/README.md`. Si quedó obsoleto sin ejecutarse: encabezado `> ⚠️ SUPERSEDED (fecha): reemplazado por <doc>`.
3. **No crees docs paralelos del mismo tema.** Antes de crear uno, grep en `docs/` por el tema y **extiende** el existente.
4. **Sin datos desactualizados.** Conteos (tests, versión, LOC), nombres de API y rutas deben reflejar el código real; un dato viejo es peor que ninguno. Al eliminar/renombrar una API, grep del nombre viejo en `docs/` y corrige toda mención.
5. **README es índice, no manual.** Mantén el árbol de archivos y los enlaces al día; enlaces relativos dentro de `docs/` van sin prefijo `docs/`.
6. **CLAUDE.md** mantiene su árbol de `go-pes-local/` al día al crear/renombrar/eliminar archivos, y marca `[x]` los pendientes al cerrarlos.

## Al cerrar un cambio (checklist)
- ¿Qué trigger aplica? Actualiza el/los doc(s) que corresponda.
- ¿Algún dato numérico cambió (tests, versión)? Corrígelo en todos los docs que lo citen.
- ¿Completaste un plan? Muévelo a `archive/` con su nota.
- ¿Enlaces nuevos resuelven? (relativos, sin prefijo `docs/`).

## Cuándo NO usar esta skill
- Anti-duplicados / código muerto / CSS huérfano → `go-pes-higiene`.
- Escribir la funcionalidad en sí → `go-pes-feature`.

## Skills relacionadas
- `go-pes-higiene` — comparte la regla "completado → archive"; higiene cubre el código, esta skill los docs.
- `go-pes-feature`, `go-pes-esquema-datos`, `go-pes-seguridad` — generan los cambios que disparan actualización de docs.
