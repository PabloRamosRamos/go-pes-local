---
name: go-pes-loaders
description: >-
  Estandariza el uso de loaders/indicadores de carga en GO-PES v2 (app de Google
  Apps Script): qué API usar y en qué área se muestra cada uno, nunca fullscreen
  salvo el splash. Úsala para "agregar un loader", "spinner al cargar", "estado de
  carga", "el loader tapa toda la pantalla", "qué loader uso aquí", "loading al
  guardar/abrir modal", "estandarizar los loaders". NO es para optimizar velocidad
  real (go-pes-performance) ni percibida en general (go-pes-ui-rapida, que usa esta
  como pieza), ni para estilos del spinner (go-pes-rediseno-visual).
---

# go-pes-loaders — Sistema de loading estandarizado

GO-PES tiene un sistema de loading unificado (`Loading.html`): **cada loader se acota a su área de acción; ninguno cubre la pantalla completa** salvo el splash inicial. Esta skill es el guardarraíl para usarlo bien.

**Lee primero `references/reglas-go-pes.md`.** Detalle visual en `docs/design-system.md` → "Sistema de Loading".

## Las 3 formas estándar (y solo estas)
1. **Loader de módulo** — `showModuleLoading(message)` / `hideModuleLoading()`
   - Overlay montado **dentro de `#app .content`** (sidebar y header quedan visibles). Nunca fullscreen.
   - Uso: cargar los datos de una vista o una acción disparada desde el área del módulo.
2. **Loader de modal** — `showModalLoading(modalId, message)` / `hideModalLoading(modalId)`
   - Loader local montado **dentro del diálogo** del modal indicado (`[class*="__dialog"]`), con la clase `.modal-loading`. Cubre solo el modal.
   - Uso: acciones con un modal abierto (guardar, actualizar) mientras el modal sigue visible.
   - Compat: si `modalId` no corresponde a un elemento real, se interpreta como mensaje y cae en `showModuleLoading` (no dependas de esto; pasa un id válido).
3. **Loader local de lista/tabla** — clase CSS **`.module-loading`** (ícono refresh + texto, en `Styles.html`)
   - Uso: spinner estático embebido en una lista/tabla mientras recarga una porción.

## Reglas
- **Prohibido fullscreen** salvo el splash inicial (`Splash.html`). Nada de `position:fixed` con z-index alto cubriendo la app.
- **Emparejar siempre** show/hide, e idealmente en `finally` de la promesa `api(...)` para que no quede colgado si falla.
- **Elige el contexto correcto:** si la acción se dispara con un modal abierto (y el modal sigue en pantalla), usa `showModalLoading(modalId)`, **no** el de módulo — si no, el loader aparece detrás del modal.
- **Sin tiempos fijos:** no uses `setTimeout` para "dar tiempo"; oculta el loader cuando el dato llegó. (El `hideModuleLoading` interno ya sincroniza su transición a ~250 ms; no lo dupliques.)
- **Accesibilidad:** los overlays ya declaran `role="status"` / `aria-live="polite"` / `aria-busy`; respeta `prefers-reduced-motion`.
- **No reinventes:** no crees spinners nuevos ad hoc; usa una de las 3 formas. (Aliases viejos como `showContentLoading`/`showAvanceLoading_` fueron eliminados — no los reintroduzcas.)

## Al agregar un loader (checklist)
- ¿La acción es de **módulo** o de **modal** abierto? Elige la API correcta.
- ¿Es un refresco parcial de una lista/tabla? Usa `.module-loading`.
- ¿Show y hide emparejados (hide en `finally`)?
- ¿Nada fullscreen, nada de tiempos fijos?

## Cuándo NO usar esta skill
- Reducir el número de llamadas / velocidad percibida general → `go-pes-ui-rapida`.
- Lentitud real del servidor → `go-pes-performance`.
- Estilo del spinner (colores, animación) → `go-pes-rediseno-visual` / `go-pes-colores`.

## Skills relacionadas
- `go-pes-ui-rapida` — usa estos loaders como herramienta para la velocidad percibida.
- `go-pes-estructura` — el parcial de un módulo integra estos loaders en su render/handlers.
