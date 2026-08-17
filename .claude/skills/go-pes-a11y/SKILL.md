---
name: go-pes-a11y
description: >-
  Guardarraíl de accesibilidad para el frontend de GO-PES v2 (app de Google Apps
  Script): navegación por teclado, foco, ARIA, modales accesibles y movimiento
  reducido. Úsala para "accesibilidad", "a11y", "navegación por teclado", "focus
  trap", "lector de pantalla", "roles/aria", "el modal no atrapa el foco", "aria-
  label/aria-expanded", "contraste/foco visible", o al agregar/rediseñar cualquier
  UI interactiva. Complementa a go-pes-feature y go-pes-rediseno-visual (que
  construyen la UI); esta asegura que sea accesible. NO es para lógica ni backend.
---

# go-pes-a11y — Accesibilidad del frontend

La UI de GO-PES la usan operadores municipales a diario; debe ser operable por teclado y por lector de pantalla. El proyecto ya tiene infraestructura A11y (`Scripts_A11y.html`); esta skill asegura usarla y no romperla.

**Lee primero `references/reglas-go-pes.md`.**

## Usa la infraestructura existente (no reinventes)
- **Modales:** ábrelos/ciérralos con **`A11Y.openModal(modalIdOrElement, options)`** / **`A11Y.closeModal(...)`** (`Scripts_A11y.html`). Ya hacen: focus trap (`trapFocus`), restauración de foco al cerrar (`restoreFocus`), cierre con **Escape**, y setean `aria-hidden`/`aria-modal`. Mantienen una pila de modales activos.
- **Loaders:** los overlays de `Loading.html` ya declaran `role="status"` + `aria-live="polite"` + `aria-busy`. Usa `go-pes-loaders`, no spinners ad hoc sin ARIA.

## Reglas al agregar/rediseñar UI
1. **Controles reales:** las acciones son `<button>`/`<a>` reales, nunca `<div onclick>`. Los CTA deben ser enfocables y activables con Enter/Espacio.
2. **Estados en ARIA:** filas/paneles colapsables con `role="button"` + `aria-expanded`; elementos ocultos con `aria-hidden`; segmentos/íconos sin texto con `aria-label`.
3. **Foco:** todo modal usa `A11Y.openModal` (trap + restore). No dejes foco “perdido” tras cerrar. Orden de tabulación lógico; foco visible (no elimines el outline sin reemplazo).
4. **Movimiento reducido:** toda transición/animación respeta `@media (prefers-reduced-motion: reduce)` (ya es regla del CSS del proyecto).
5. **Texto e iconos:** no comuniques solo por color (ver `go-pes-colores`); acompaña con texto/ícono/aria.
6. **Regiones dinámicas:** contenido que aparece async (resultados, errores) en zonas con `aria-live` apropiado para que el lector lo anuncie.

## Checklist de verificación
- ¿Se puede completar el flujo **solo con teclado** (Tab/Shift+Tab/Enter/Escape)?
- ¿El modal atrapa el foco y lo restaura al cerrar?
- ¿Los controles son elementos nativos con `aria-*` correctos?
- ¿Las transiciones respetan `prefers-reduced-motion`?
- ¿Estados (expandido, ocupado, seleccionado) reflejados en ARIA?

## Cuándo NO usar esta skill
- Lógica de negocio o backend → `go-pes-feature`/`go-pes-bug`.
- Estética/paleta → `go-pes-rediseno-visual`/`go-pes-colores`.

## Skills relacionadas
- `go-pes-feature`, `go-pes-rediseno-visual` (construyen la UI que esta skill hace accesible).
- `go-pes-loaders` (sus overlays ya traen el ARIA de carga), `go-pes-colores` (contraste, no-solo-color).
