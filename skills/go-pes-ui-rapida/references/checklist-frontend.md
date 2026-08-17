# Checklist de velocidad percibida — frontend (GO-PES v2)

Recórrelo tras medir (ver `protocolo-medicion.md`). Anclado a las primitivas reales del proyecto.

## Feedback inmediato (la espera bien manejada)
- [ ] Toda acción que dispara `api()` muestra un **loader acotado en <100 ms**: `showModuleLoading` (vista) o `showModalLoading(modalId)` (modal). Nunca pantalla en blanco ni loader fullscreen (salvo splash).
- [ ] El loader se monta **dentro del área de acción** (`#app .content` o el modal), no cubriendo toda la app.
- [ ] Estado vacío elegante cuando no hay datos (no un spinner infinito).

## Menos round-trips (la causa #1 de lentitud percibida)
- [ ] Una interacción = el **mínimo de `api()`**. Si al entrar a una vista se disparan varias llamadas encadenadas, evalúa un **endpoint compuesto** (coordinar con `go-pes-performance`).
- [ ] Catálogos y datos ya cacheados **no se vuelven a pedir**: usa `ensureCatalogsForView_` y respeta el TTL de 5 min del cache cliente.
- [ ] Reutiliza el prefetch en vuelo (`APP.state.inicioPrefetchPromise`) en vez de duplicar la llamada de arranque.
- [ ] Prefetch oportunista: si el usuario probablemente irá a una vista, precárgala en background **sin bloquear** la actual.

## Render no bloqueante
- [ ] Tras un `innerHTML` grande, activa transiciones/stagger con `requestAnimationFrame` (no bloquees el hilo).
- [ ] Inputs de búsqueda/filtro con **debounce** antes de llamar al server o refiltrar.
- [ ] Listas largas: pagina o acota (patrón paginador existente) en vez de pintar cientos de nodos de golpe.
- [ ] Evita **layout thrash**: agrupa lecturas y escrituras del DOM; no midas (`offsetHeight`) y escribas en bucle.

## Carga diferida
- [ ] Librerías CDN (Leaflet/Chart.js) se cargan **solo al entrar** al módulo que las usa, nunca en el arranque.
- [ ] Trabajo pesado no crítico (logs, telemetría) se difiere tras el primer render.

## Fluidez y accesibilidad
- [ ] Stagger (`.stagger-item`/`.stagger-animate`) en cards/listas para percepción de entrada progresiva.
- [ ] Todas las transiciones respetan `prefers-reduced-motion`.
- [ ] Sin **tiempos fijos** (`setTimeout` arbitrarios, mínimos de splash): cierra el loader apenas el dato está listo.

## Optimista (con cuidado)
- [ ] Para acciones de baja probabilidad de fallo, considera **UI optimista**: refleja el cambio de inmediato y reconcilia al volver el `api()`, con rollback visible si falla. No la uses en escrituras críticas sin confirmación.

## Anti-patrones prohibidos
- ❌ Loader fullscreen que congela toda la app (solo el splash puede).
- ❌ Cascada de `api()` en serie que podría ser 1 endpoint compuesto.
- ❌ Re-pedir catálogos ya cacheados en cada entrada a la vista.
- ❌ `setTimeout` fijos para "dar tiempo" a que algo cargue.
- ❌ Pintar toda una lista enorme sin paginar ni diferir.
- ❌ Bloquear el arranque cargando una librería CDN que solo usa un módulo.

## Cierre
- [ ] Re-medida la percepción (menos `api()` por interacción / primer contenido más pronto), con red real.
- [ ] Verificado modo claro y oscuro; `goPesRunAllTests()` en 0 fallos.
- [ ] Reporte: qué se cambió, cuántos round-trips se ahorraron, archivos tocados.
