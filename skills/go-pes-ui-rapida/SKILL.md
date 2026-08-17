---
name: go-pes-ui-rapida
description: >-
  Hace que la interfaz de GO-PES v2 (app de Google Apps Script de la
  Municipalidad de Providencia) se sienta muy rápida: velocidad percibida,
  respuesta inmediata y sin parpadeos en el frontend. Úsala para "la interfaz se
  siente lenta", "la vista tarda en aparecer", "hacer la UI más ágil/fluida",
  "reducir el parpadeo", "que responda al instante", "skeleton", "UI optimista",
  "quitar la espera al abrir un módulo". NO es para lentitud del servidor/datos
  (usa go-pes-performance), un bug de comportamiento (go-pes-bug) ni cambios
  estéticos (go-pes-rediseno-visual).
---

# go-pes-ui-rapida — Interfaz de velocidad percibida

Skill para que GO-PES v2 **se sienta** rápida. En un frontend vanilla sobre Apps Script, casi toda la latencia percibida viene de **round-trips `api()` al servidor** y de **cómo se maneja la espera**, no del render en sí. La percepción se gana dando **feedback inmediato**, pidiendo **una sola vez** los datos, y **no bloqueando** ni parpadeando.

**Lee primero `references/reglas-go-pes.md`.** Material de apoyo:
- `references/protocolo-medicion.md` — cómo medir la percepción (DevTools, contar `api()` por interacción).
- `references/checklist-frontend.md` — checklist accionable + anti-patrones prohibidos.

> Si la medición muestra que el cuello es el **servidor** (el request tarda en volver, no la UI en reaccionar), el problema es de rendimiento real: usa `go-pes-performance`.

## Regla de oro
**Velocidad percibida ≠ velocidad real.** Un módulo que muestra un loader acotado en <100 ms y datos en 800 ms se siente más rápido que uno que congela la pantalla 400 ms en blanco. Optimiza la **experiencia de la espera** primero, y el número de esperas después.

## Primitivas reales del proyecto (úsalas, no reinventes)
- **`window.api(fn, payload)`** (Scripts.html): wrapper que promisifica `google.script.run` (resuelve/rechaza, detecta sesión expirada). Todos los módulos llaman datos por aquí. Cuenta cuántos `api()` dispara **una** interacción.
- **`ensureCatalogsForView_(view)`** y el cache de catálogos cliente con **TTL 5 min** (`Scripts_CatalogCache.html`): no re-pidas catálogos ya cacheados; reutiliza el prefetch en vuelo (`APP.state.inicioPrefetchPromise`, `inicioPanelFetchedAt`).
- **Loaders acotados** (`Loading.html`): `showModuleLoading`/`hideModuleLoading` (dentro de `#app .content`, sidebar/header visibles) y `showModalLoading`/`hideModalLoading` (dentro del modal). **Nunca fullscreen** salvo el splash.
- **Stagger** (`.stagger-item` + `.stagger-animate`): entrada escalonada de cards/listas vía `requestAnimationFrame` tras el `innerHTML`, para percepción de fluidez.
- **Carga lazy de librerías CDN** (Leaflet/Chart.js): solo al **entrar** al módulo que las usa, nunca en el arranque.
- **`prefers-reduced-motion`**: respétalo en toda transición.

## Flujo
1. **Mide la percepción** (Fase 1, NO tocar código): sigue `references/protocolo-medicion.md` — cuántos `api()` por interacción, cuánto tarda en aparecer el primer contenido del módulo, dónde parpadea/bloquea. Presenta el diagnóstico y espera aprobación.
2. **Aplica** recorriendo `references/checklist-frontend.md`; **scope mínimo**, sin tocar backend ni APIs.
3. **Verifica**: prueba en DEV con red real (no solo cache caliente), modo claro y oscuro, y `goPesRunAllTests()` en 0 fallos (aunque sea frontend, confirma que nada se rompió).

## Composición
- **`go-pes-performance`** — cuando el cuello es el servidor/datos (esta skill remite allí).
- **`go-pes-rediseno-visual`** — si además cambia la estética/layout (esta skill solo toca la *experiencia de espera y respuesta*, no el diseño).
- **`go-pes-bug`** — si el "se siente lento" es en realidad un comportamiento roto (doble render, listener duplicado).
- **`go-pes-colores`** — no aplica salvo que toques color (entonces cede a ella).
