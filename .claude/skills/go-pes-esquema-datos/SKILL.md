---
name: go-pes-esquema-datos
description: >-
  Agrega o modifica la estructura de datos de GO-PES v2: hojas del spreadsheet,
  catálogos DIM, vistas derivadas y siembra de datos. Úsala para "agregar una
  hoja", "nueva tabla", "nuevo catálogo", "agregar una dimensión DIM", "sembrar
  datos", "reconstruir vistas/master", "campo nuevo en una hoja". Conoce la
  convención de prefijos (RAW/MAE/FACT/DIM/CAT/CFG/VW/LOG), el registro en
  GO_PES_V2.SHEETS, buildSheetDefinitions_, el bootstrap y la regla de esquema
  evolutivo por JSON.
---

# go-pes-esquema-datos — Hojas, catálogos y vistas

Skill para trabajar la capa de datos de GO-PES v2. El spreadsheet es la base de datos: cada hoja es una tabla y toda hoja se registra en `GO_PES_V2.SHEETS` (`Main.js`).

**Lee primero `references/reglas-go-pes.md`.**

## Convención de prefijos
| Prefijo | Uso | Ejemplos |
|---------|-----|----------|
| `RAW_` | Datos crudos de entrada | `RAW_Formulario_Ingreso`, `RAW_Gestion_Casos` |
| `MAE_` | Maestros (canónicos) | `MAE_Casos`, `MAE_Organizaciones` |
| `FACT_` | Hechos / transacciones | `FACT_Hitos`, `FACT_Socios`, `FACT_Fondese` |
| `DIM_` | Dimensiones / catálogos | `DIM_Estados`, `DIM_Territorio`, `DIM_*_Sugeridos` |
| `CAT_` | Catálogos de dominio | `CAT_Hitos_Avance` |
| `CFG_` | Configuración (JSON) | `CFG_Parametros`, `CFG_FONDESE_Ediciones` |
| `VW_` / `MASTER_` | Vistas derivadas / master | `VW_LS_Organizaciones`, `MASTER_DATOS` |
| `LOG_` | Logs | `LOG_Procesamiento`, `LOG_Accesos`, `LOG_Acciones_Usuario` |

## Fase 1 — Lectura (NO escribir código)
Lee: la sección `SHEETS` de `GO_PES_V2` en `Main.js`, `buildSheetDefinitions_()` en `Repository.js`, y las funciones de bootstrap/seed (`ensureGoPesV2Sheets_`, `seedGoPesV2Catalogs_`, `rebuildSuggestionDims_`) y de vistas derivadas (`DerivedBuilders.js`, `goPesRefrescarVistasYMaster`). Presenta qué hojas ya existen y dónde encaja la nueva. Espera aprobación.

## Agregar una hoja nueva
1. Registra la clave en `GO_PES_V2.SHEETS` (`Main.js`):
   ```javascript
   MI_HOJA: 'FACT_Mi_Hoja',
   ```
2. Define sus encabezados/columnas donde el proyecto arma las definiciones (`buildSheetDefinitions_()`).
3. Asegura su creación en el bootstrap (`ensureGoPesV2Sheets_`, que corre desde el menú **GO-PES v2 → Configurar motor operativo** vía `setupMotorOperativoPES`).
4. Si es catálogo base, siémbralo en `seedGoPesV2Catalogs_`. Si alimenta autocomplete, agrégalo a `rebuildSuggestionDims_` (menú → **Refrescar catálogos sugeridos**).
5. Si alimenta una vista derivada o el master, reconstruye (`DerivedBuilders.js` / menú → **Reconstruir vistas y master**).

## Catálogos DIM y sugeridos
- Los `DIM_*` son las dimensiones (estados, territorio, etapas, responsables, cargos…).
- Los `DIM_*_Sugeridos` alimentan autocompletado y se reconstruyen con `rebuildSuggestionDims_`. Si cambias su esquema, actualiza tanto la definición como el builder.

## Regla de esquema evolutivo (lección FONDESE)
Si una parte de la estructura **cambia por año/edición/versión** (ej. los documentos requeridos que varían cada convocatoria), guárdala como **campo JSON serializado en una sola columna**, no como columnas fijas (`DOC_01..DOC_13`). Así:
- Una edición nueva no obliga a cambiar el esquema de la hoja.
- El frontend deserializa usando la config **de la edición del registro**, no de la edición activa.
Patrón de dos capas: una hoja `CFG_*_Ediciones` (una fila por año, con la config variable en JSON) + una hoja `FACT_*` (una fila por transacción, que referencia su edición por ID).

## Siembra de datos
Tras crear las hojas, si el módulo necesita datos base (ej. la edición activa del año), créalos como fila semilla en la función de seed correspondiente, dejando claro el estado inicial (ej. `ESTADO = "activa"`).

## Cierre
- Verifica que la hoja se crea limpia desde bootstrap en un spreadsheet nuevo (DEV).
- Reporta hojas/claves agregadas y builders tocados.
- Corre `goPesRunAllTests()`.

## Skills relacionadas
- `go-pes-feature` (Fase 2/3 delega aquí al crear hojas).
- `go-pes-tests`, `go-pes-deploy`.
