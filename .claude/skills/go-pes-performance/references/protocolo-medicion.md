# Protocolo de medición — backend (GO-PES v2)

Medir antes y después. Sin números, no hay optimización: hay adivinanza.

## 1. Identificar el request culpable
En Apps Script cada llamada del cliente es una **ejecución** independiente. Fuentes de medida:
- **Panel de ejecuciones** del editor de Apps Script (Ejecuciones): muestra cada función pública invocada, su duración y si terminó OK/error. Ordena por duración.
- **`clasp logs` / `clasp logs --watch`** durante la navegación real: correlaciona la acción del usuario con la función que corre y su tiempo.
- **Diagnostics.js**: si hay trazas activables, úsalas para tiempos internos.

Anota, para el request lento: **nombre de la función pública, duración total, y en qué momento de la UI se dispara**.

## 2. Contar el costo real
El costo dominante en GAS son las **llamadas a la API de Sheets** y los **round-trips cliente↔servidor**, no el cómputo JS. Para el request culpable:
- ¿Cuántas lecturas/escrituras de hoja hace? (cada `getRange().getValues()`, `appendRow`, `setValues` es una llamada de API). Busca lecturas repetidas de la misma hoja dentro del mismo request.
- ¿Cuántos `api(...)` (round-trips) dispara el cliente para completar **una** interacción? Si el arranque o una vista hace 3 llamadas que podrían ser 1 endpoint compuesto, ese es el hallazgo.
- ¿El cache acierta? Un TTL guardado en `GO_PES_RUNTIME` **nunca** acierta entre ejecuciones (muere al terminar). Verifica que el cache persistente sea `CacheService`.

## 3. Registrar la línea base
Antes de tocar código, deja escrito: `función — duración — nº llamadas Sheets — nº round-trips`. Presenta esto como diagnóstico y espera aprobación.

## 4. Re-medir (antes / después)
Tras el cambio, repite exactamente la misma medición y compara. Prueba **cache frío** (primera llamada) y **cache caliente** (segunda) por separado: son escenarios distintos. Una mejora que solo se ve en caliente no ayuda al primer usuario.

## 5. No degradar correctitud
`goPesRunAllTests()` en 0 fallos. Confirma que la invalidación de cache sigue disparando cuando el dato cambia (un cache más agresivo que sirve datos viejos es un bug, no una mejora).
