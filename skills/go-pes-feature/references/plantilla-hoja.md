# Plantilla — registrar una hoja nueva en GO_PES_V2.SHEETS

Toda hoja se registra en `GO_PES_V2.SHEETS` (`Main.js`). Prefijos por tipo:

| Prefijo | Uso |
|---------|-----|
| `RAW_` | Datos crudos de entrada (formularios, gestión) |
| `MAE_` | Maestros (registros canónicos) |
| `FACT_` | Hechos / transacciones |
| `DIM_` | Dimensiones / catálogos (incl. `*_Sugeridos` para autocomplete) |
| `CAT_` | Catálogos de dominio (ej. `CAT_Hitos_Avance`) |
| `CFG_` | Configuración (JSON serializado; ej. `CFG_Parametros`, `CFG_FONDESE_Ediciones`) |
| `VW_` / `MASTER_` | Vistas derivadas / master |
| `LOG_` | Logs de procesamiento, accesos y acciones |

## Pasos
1. Agrega la clave en `GO_PES_V2.SHEETS`:
   ```javascript
   MI_HOJA: 'FACT_Mi_Hoja',
   ```
2. Define columnas/encabezados donde el proyecto arma las definiciones (`buildSheetDefinitions_()` en `Repository.js`).
3. Asegura su creación en el bootstrap (`ensureGoPesV2Sheets_`, invocado por `setupMotorOperativoPES` en el menú).
4. Si es catálogo, siémbralo en `seedGoPesV2Catalogs_` y, si es de autocomplete, en `rebuildSuggestionDims_`.
5. Si alimenta una vista derivada, reconstrúyela (`goPesRefrescarVistasYMaster` / `DerivedBuilders.js`).

## Regla de esquema evolutivo
Si la estructura cambia por año o edición (ej. documentos de FONDESE que varían cada convocatoria), guarda esa parte como **campo JSON serializado** en una sola columna, no como columnas fijas. Así una edición nueva no obliga a cambiar el esquema de la hoja.
