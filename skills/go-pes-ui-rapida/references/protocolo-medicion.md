# Protocolo de medición — velocidad percibida (GO-PES v2)

La percepción se mide en el cliente, no en los logs del server. Mide antes y después, con **red real** (no solo cache caliente).

## 1. Contar round-trips por interacción
El factor #1 de lentitud percibida son las llamadas `api()` en serie. Para la interacción que "se siente lenta" (abrir un módulo, guardar, filtrar):
- Abre la Web App en el navegador → **DevTools → Network** (filtra por XHR/Fetch: las llamadas a `google.script.run` aparecen como peticiones a `script.google.com`).
- Ejecuta la interacción una vez y **cuenta cuántas peticiones** dispara y si van **en serie** (una espera a la anterior) o en paralelo. Varias en serie = candidato a endpoint compuesto.
- Anota el tiempo entre la acción del usuario y la **primera petición** (¿hubo trabajo bloqueante antes de pedir datos?).

## 2. Medir cuándo aparece el contenido
- **DevTools → Performance**: graba la interacción. Mira cuándo aparece el **primer contenido útil** del módulo (no la página, el módulo) y si el hilo principal se bloquea (tareas largas, "long tasks") durante el render.
- ¿Hubo pantalla en blanco antes del loader? El loader debería aparecer en <100 ms.

## 3. Detectar parpadeo y re-render
- ¿La vista se pinta, desaparece y se vuelve a pintar? (doble `route()`, loader que tapa contenido en vuelo, re-fetch innecesario). Grábalo y cuéntalo.
- ¿Se re-piden catálogos que ya estaban cacheados? Búscalo en Network (misma llamada repetida).

## 4. Línea base y re-medida
Deja escrito antes de tocar: `interacción — nº round-trips (serie/paralelo) — ms hasta primer contenido — parpadeos`. Tras el cambio, repite idéntico y compara. Verifica con **throttling de red** (DevTools → Network → Fast/Slow 3G) para no engañarte con cache caliente y localhost.

## 5. No romper nada
Modo claro y oscuro; `goPesRunAllTests()` en 0 fallos. Confirma que las acciones (guardar, filtrar, navegar) siguen refrescando la vista correctamente tras la optimización.
