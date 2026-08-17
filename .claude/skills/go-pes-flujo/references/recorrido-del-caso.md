# Recorrido del caso entre módulos — GO-PES v2

El viaje de un vecino/caso por la app, anclado a las **funciones públicas** y **hojas** que conectan cada salto. Verificado contra el código; ante duda, relee la función citada.

## Mapa de saltos

```
Calendario ──▶ Nuevo Ingreso ──▶ Ficha ──▶ Avance (hitos) ──▶ Organización ──▶ Socios ──▶ Beneficios
```

### 1. Calendario → Nuevo Ingreso
- `getCalendarioEventos(payload)` (`ZZ_CalendarioBackend.js`) lista eventos y cruza con `FACT_AVANCE_HITOS` (por `codigo_hito`) para saber cuáles ya se ingresaron.
- Al ingresar desde un evento, el cliente arrastra `calendarioPendingEvent`; `registrarEventoCalendario(payload)` marca el evento como procesado (ScriptProperties compartido).

### 2. Nuevo Ingreso → Ficha
- `guardarIngreso(payload)` (`Services.js`) crea la solicitud (`RAW_Formulario_Ingreso` / `MAE_Casos`), hace `SpreadsheetApp.flush()` antes de liberar el lock.
- `obtenerFicha(payload)` (`Services.js`) lee el caso recién creado (reintenta una vez si el `solicitud_id` aún no aparece). Devuelve también `data.hitos` (últimas gestiones de `FACT_Hitos`).

### 3. Ficha → Avance
- Desde la ficha se registran gestiones con `guardarSeguimiento(payload)` (`Services.js`, `flujo='seguimiento_general'`).
- El módulo Avance carga con `getAvanceGrupoVecinos(payload)` (`ZZ_AvanceBackend.js`) y registra hitos con `registrarHitoAvance(payload)`. Persistencia en **dos caminos**: organización (`organizacion_id`) o grupo de vecinos (`solicitud_id`). Para el modelo de hitos usa la skill `go-pes-avance`.

### 4. Avance → Organización
- Un caso que avanza (≥ hito 2, con o sin `organizacion_id`) aparece en Organizaciones vía `getOrganizacionesConGruposClient()` (`ZZ_OrganizacionesBackend.js`): cruza `MAE_ORGANIZACIONES` + `MAE_CASOS` con `FACT_AVANCE_HITOS`, y marca `tipo` = `'organizacion'` | `'grupo_vecinos'`.
- El estado de avance vigente (`estado_avance`) sale del último registro de `FACT_Avance_Estado` (índices `buildEstadosBy*Index_`).

### 5. Organización → Socios
- Una organización constituida gestiona sus miembros en Socios (`ZZ_SociosBackend.js`, hoja `FACT_Socios`, cargos en `DIM_Cargos_Socios`). Integración opcional con Google Form (`ZZ_FormSociosIntegration.js`).

### 6. Organización → Beneficios / Instrumentos
- Con certificado definitivo (`FOR_04`) obtenido, la organización accede a instrumentos/beneficios (`ZZ_BeneficiosBackend.js`, hojas `FACT_Beneficios_*`, `DIM_Instrumentos`). Algunas acciones sensibles exigen PIN (`evento_abierto` — ver `go-pes-seguridad`).

## Pistas para depurar cruces de módulo
- Muchos bugs cross-módulo vienen de **claves/campos que no existen** y fallan en silencio (`hito_key` vs `codigo_hito`; `AVANCE.FACT_HITOS` inexistente → hoja `undefined` → `[]`). Verifica el nombre real de cada campo/hoja en el salto.
- El estado vigente (avance, comité) suele ser el **último registro** de una hoja FACT, no un campo único — busca los índices `buildEstadosBy*Index_`.
- Para arreglar un cruce roto, cambia a `go-pes-bug`; para tocar el modelo de hitos, `go-pes-avance`.
