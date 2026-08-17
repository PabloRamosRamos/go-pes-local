# Análisis de Hoja AVANCE Legacy

## 📋 Información recibida

**Spreadsheet ID:** `1Eb_mj3Ef6Ss0JiBuQvlshj3nbKTOqLgtNbDRDsBzJq8`

**Hoja:** AVANCE

### Estructura identificada:

| Columna | Contenido | Uso en migración |
|---------|-----------|------------------|
| F | Número de ingreso oficina de partes | → `numero_ingreso` en hito PRE_02 |
| G | Fecha de asamblea | → `fecha_asamblea_asignada` en hito PRE_03 |
| ? | Otros datos por confirmar | Pendiente análisis |

---

## 🎯 Objetivo de la migración

Cargar automáticamente los **3 primeros hitos** (PRE_01, PRE_02, PRE_03) para grupos de vecinos que tienen estos datos en la hoja AVANCE legacy.

### Hitos a crear:

#### Hito 1: PRE_01 - Reunión informativa realizada
- **Fecha:** Ya existe en `FACT_AVANCE_HITOS` (confirmado por usuario)
- **Acción:** ✅ No requiere migración, ya está cargado

#### Hito 2: PRE_02 - Carta por oficina de partes
- **Fecha carta:** Calcular = `fecha_PRE_01 + 7 días`
- **Número ingreso:** Columna F de hoja AVANCE
- **Validación:** La fecha calculada NO debe ser ≥ fecha de asamblea (columna G)
- **Campo nuevo:** `numero_ingreso` (recién implementado hoy)

#### Hito 3: PRE_03 - Fecha asignada
- **Fecha asignada:** Columna G de hoja AVANCE
- **Campo nuevo:** `fecha_asamblea_asignada` (recién implementado hoy)
- **Validación:** Debe ser > fecha carta (PRE_02)

---

## 🔍 Análisis necesario antes de implementar

### 1. Estructura completa de la hoja AVANCE
Necesito ver:
- ¿Qué columnas tiene? (A, B, C, D, E, F, G, H...)
- ¿Cómo se identifica cada fila? (solicitud_id, organizacion_id, RUT, nombre?)
- ¿Todas las filas tienen datos en F y G o hay filas vacías?
- ¿Cuántas filas de datos hay aproximadamente?

### 2. Validaciones de integridad
- ¿Hay grupos de vecinos en `MAE_CASOS` que ya tienen hitos PRE_02/PRE_03 registrados?
- ¿Cómo evitamos duplicar hitos?
- ¿Qué pasa si la fecha calculada (fecha_PRE_01 + 7) es ≥ fecha_asamblea?

### 3. Casos edge
- ¿Qué hacer si un grupo tiene hito PRE_01 pero NO tiene datos en AVANCE?
- ¿Qué hacer si un grupo NO tiene hito PRE_01 pero SÍ tiene datos en AVANCE?
- ¿Qué hacer si el número de ingreso (col F) está vacío?
- ¿Qué hacer si la fecha de asamblea (col G) está vacía?

---

## 📝 Plan propuesto (pendiente aprobación)

### Opción A: Script de migración único (RECOMENDADO)
Crear una función `goPesMigrarHitosAvanceLegacy()` que:

1. Lee la hoja AVANCE (spreadsheet externo)
2. Por cada fila con datos válidos:
   - Busca el grupo de vecinos en `MAE_CASOS` por identificador
   - Verifica si ya tiene hitos PRE_01, PRE_02, PRE_03
   - Si tiene PRE_01 pero NO tiene PRE_02/PRE_03:
     - Calcula fecha carta = fecha_PRE_01 + 7 días
     - Valida que fecha_carta < fecha_asamblea
     - Crea hito PRE_02 con numero_ingreso
     - Crea hito PRE_03 con fecha_asamblea_asignada
3. Genera reporte de:
   - Hitos creados exitosamente
   - Filas omitidas (ya tienen hitos, validación fallida, etc.)
   - Errores encontrados

**Ventajas:**
- Se ejecuta una sola vez
- Control total del proceso
- Reporte detallado de qué se migró
- Rollback posible si algo falla

**Desventajas:**
- Requiere ejecución manual
- No es automático para nuevos datos

### Opción B: Sincronización automática
Modificar el sistema para que al cargar datos de grupos de vecinos, busque en AVANCE si hay datos pendientes.

**Ventajas:**
- Transparente para el usuario
- Funciona con datos nuevos

**Desventajas:**
- Mayor complejidad
- Dependencia de spreadsheet externo
- Más difícil de debuggear

---

## 🚨 Riesgos identificados

1. **Datos inconsistentes:** Si fecha_PRE_01 + 7 ≥ fecha_asamblea, la validación falla
2. **Duplicación:** Si ya existen hitos PRE_02/PRE_03, podrían duplicarse
3. **Identificadores:** Si no hay match claro entre AVANCE y MAE_CASOS
4. **Fechas inválidas:** Si las columnas F o G tienen valores no parseables

---

## ⏭️ Siguiente paso

**Crear función de SOLO LECTURA** para analizar la estructura de AVANCE:

```javascript
function analizarHojaAvanceLegacy() {
  const ssId = '1Eb_mj3Ef6Ss0JiBuQvlshj3nbKTOqLgtNbDRDsBzJq8';
  const ss = SpreadsheetApp.openById(ssId);
  const sh = ss.getSheetByName('AVANCE');
  
  // Leer headers (fila 1)
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  
  // Leer primeras 5 filas de datos para análisis
  const data = sh.getRange(2, 1, Math.min(5, sh.getLastRow() - 1), sh.getLastColumn()).getValues();
  
  Logger.log('Headers:', headers);
  Logger.log('Sample data:', data);
  Logger.log('Total rows:', sh.getLastRow() - 1);
  
  return {
    headers: headers,
    sampleData: data,
    totalRows: sh.getLastRow() - 1
  };
}
```

**¿Ejecuto esta función de análisis o prefieres revisar algo más antes?**
