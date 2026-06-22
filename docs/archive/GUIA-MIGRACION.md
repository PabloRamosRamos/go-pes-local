# GUÍA DE MIGRACIÓN DE DATOS - GO-PES v2
**Versión:** v2.1.84  
**Fecha:** 2026-06-02  
**Entorno:** PROD

---

## 📋 PRE-REQUISITOS

### ✅ Verificar ANTES de comenzar:

1. **Sistema en PROD funcionando**
   - [ ] Web App desplegada y accesible
   - [ ] PINs de seguridad configurados
   - [ ] Tests ejecutados (262/262)
   - [ ] Datos de prueba limpiados

2. **Acceso al spreadsheet origen**
   - [ ] Tienes permisos de lectura en el spreadsheet antiguo
   - [ ] Identificaste el Spreadsheet ID (desde la URL)
   - [ ] Verificaste que las hojas existen:
     - `Respuestas de formulario 1` (para ingresos)
     - `SOCIOS` (para socios)

3. **Rol de usuario**
   - [ ] Eres **superuser** en el sistema
   - [ ] Puedes acceder al módulo Configuración

---

## 🔧 CONFIGURACIÓN INICIAL (UNA SOLA VEZ)

### Paso 1: Configurar Spreadsheet de Origen

Desde el **Editor de Apps Script** de PROD:

```javascript
// Reemplaza con el ID real del spreadsheet origen
// El ID está en la URL: docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
goPesConfigurarMigracionSourceId('1Eb_mj3Ef6Ss0JiBuQvlshj3nbKTOqLgtNbDRDsBzJq8')
```

**¿Cómo obtener el Spreadsheet ID?**
```
URL completa:
https://docs.google.com/spreadsheets/d/1Eb_mj3Ef6Ss0JiBuQvlshj3nbKTOqLgtNbDRDsBzJq8/edit#gid=0
                                       └──────────────── ESTE ES EL ID ────────────────┘
```

### Paso 2: Verificar la Configuración

```javascript
// Ejecutar para confirmar que se guardó correctamente
goPesVerMigracionSourceId()
```

Debe retornar: `{ ok: true, spreadsheet_id: "1Eb..." }`

---

## 📊 FASE 1: MIGRACIÓN DE INGRESOS

### Nombres de Hojas Esperados:
- **Hoja origen:** `Respuestas de formulario 1`
- **Hojas destino:** `RAW_Formulario_Ingreso` + `MAE_Casos` + `FACT_Avance_Hitos`

### Mapeo Automático de Columnas

El sistema detecta automáticamente las columnas por palabras clave:

| Campo Destino | Palabras clave en headers de origen |
|---------------|-------------------------------------|
| nombre_vecino | nombre |
| apellido_vecino | apellido |
| rut_vecino | rut, run |
| telefono_contacto | telefono, fono, celular, tel |
| correo_contacto | correo, email, mail |
| direccion_original | direccion, calle, domicilio |
| uv | uv, unidad vecinal |
| sector | sector |
| tipo_vivienda | vivienda |
| requerimiento_inicial | requerimiento, solicitud, motivo, necesidad |
| medio_solicitud | medio, canal |
| unidad_origen | unidad, derivado, origen |
| fecha_solicitud | marca temporal, marca de tiempo, fecha, timestamp |
| observaciones_form | observacion, comentario, nota |

### Proceso Paso a Paso:

#### **1.1 Verificar Conexión**

Desde la app (Módulo **Configuración**):
- Click en **"Migración de datos"**
- Click en **"Verificar origen"**
- Debe mostrar:
  - ✅ Total de filas en "Respuestas de formulario 1"
  - ✅ Headers detectados
  - ✅ Mapeo sugerido de columnas

#### **1.2 Previsualizar (IMPORTANTE)**

- Click en **"Previsualizar ingresos"**
- Revisa las primeras 10 filas mapeadas
- Verifica que:
  - [ ] Los campos críticos estén correctos (nombre, apellido, RUT)
  - [ ] Las fechas se interpreten bien
  - [ ] No haya errores de validación

**Si el mapeo automático falla:**
- Puedes ajustar manualmente las columnas en la interfaz
- El sistema recuerda tu mapeo para la ejecución

#### **1.3 Ejecutar Migración de Ingresos**

- Click en **"Ejecutar migración de ingresos"**
- Se abre modal de confirmación
- El sistema mostrará:
  - Total de filas a procesar
  - Duplicados detectados (por RUT)
  - Errores de validación

**Confirmación:**
- Lee el resumen
- Click en **"Confirmar migración"**

**Procesamiento:**
- El sistema:
  1. ✅ Valida cada fila
  2. ✅ Detecta duplicados (RUT existente)
  3. ✅ Genera IDs automáticos (VEC-000001, SOL-000001...)
  4. ✅ Guarda en RAW_Formulario_Ingreso
  5. ✅ Guarda en MAE_Casos
  6. ✅ **NUEVO:** Crea hito PRE_01 automáticamente para cada ingreso
  7. ✅ Registra en logs

**Resultado esperado:**
```
✅ Migración completada:
   - Total procesado: 150 filas
   - Importados: 145 ingresos
   - Duplicados (omitidos): 3
   - Errores: 2
   - Hitos PRE_01 creados: 145
```

#### **1.4 Reconstruir Vistas**

**IMPORTANTE:** Después de la migración, debes reconstruir las vistas derivadas.

Desde la app (Módulo **Configuración**):
- Click en **"Reconstruir vistas"**
- Espera a que complete (puede tardar 1-2 minutos)

O desde el editor:
```javascript
goPesRefrescarVistasYMaster()
```

#### **1.5 Verificar Importación**

- Ve al módulo **Buscar**
- Busca algunos vecinos importados
- Abre una **Ficha**
- Verifica que:
  - [ ] Datos básicos están correctos
  - [ ] Hito PRE_01 está presente con fecha de ingreso
  - [ ] Observación del hito dice "Migración automática - Reunión informativa inicial"

---

## 👥 FASE 2: MIGRACIÓN DE SOCIOS

**IMPORTANTE:** Solo ejecutar DESPUÉS de completar Fase 1 exitosamente.

### Nombres de Hojas Esperados:
- **Hoja origen:** `SOCIOS`
- **Hojas destino:** `RAW_Socios` + `FACT_Socios`

### Mapeo Automático de Columnas

| Campo Destino | Palabras clave en headers de origen |
|---------------|-------------------------------------|
| organizacion_id | organizacion_id, org_id, id_organizacion |
| nombre_comite_origen | organizacion, comite, junta, nombre org |
| run_socio | rut, run, cedula |
| numero_registro | numero, registro, nro, n., num |
| nombre_socio | nombre |
| edad | edad |
| cargo | cargo, rol |
| direccion_socio | direccion, domicilio |
| ubicacion_socio | ubicacion, sector |

### Pre-requisito CRÍTICO:

**Las organizaciones deben existir ANTES de importar socios.**

- Si importas socios sin organizaciones creadas, se marcarán como "organización no encontrada"
- Necesitas crear las organizaciones primero (manualmente o importarlas)

### Proceso Paso a Paso:

#### **2.1 Crear Organizaciones (si no existen)**

**Opción A:** Crear manualmente desde la app
- Módulo **Organizaciones** → Nuevo comité de seguridad
- Guarda el `organizacion_id` generado (ej: ORG-000001)

**Opción B:** Tener una columna `organizacion_id` en la hoja SOCIOS
- Con los IDs ya generados en el sistema (ORG-000001, ORG-000002, etc.)

#### **2.2 Verificar IDs de Organizaciones**

En la hoja origen `SOCIOS`:
- Debe haber una columna con el `organizacion_id`
- Formato: `ORG-000001`, `ORG-000002`, etc.
- **Verificar que esos IDs existan en tu sistema:**
  - Módulo Organizaciones → Busca cada organización
  - O consulta la hoja `MAE_Organizaciones`

#### **2.3 Previsualizar Socios**

- Click en **"Previsualizar socios"**
- Revisa las primeras 10 filas
- Verifica:
  - [ ] `organizacion_id` está presente y correcto
  - [ ] `run_socio` está bien formateado
  - [ ] `nombre_socio` es correcto

#### **2.4 Ejecutar Migración de Socios**

- Click en **"Ejecutar migración de socios"**
- Revisa el resumen:
  - Total a procesar
  - Duplicados (mismo RUT en misma organización)
  - Organizaciones no encontradas

- Click en **"Confirmar migración"**

**Procesamiento:**
- El sistema:
  1. ✅ Valida cada fila
  2. ✅ Verifica que `organizacion_id` existe
  3. ✅ Detecta duplicados (RUT + organización)
  4. ✅ Genera IDs automáticos (SOC-000001, SOC-000002...)
  5. ✅ Guarda en RAW_Socios
  6. ✅ Guarda en FACT_Socios
  7. ✅ Registra en logs

**Resultado esperado:**
```
✅ Migración completada:
   - Total procesado: 450 filas
   - Importados: 440 socios
   - Duplicados (omitidos): 5
   - Organizaciones no encontradas: 5
   - Errores: 0
```

#### **2.5 Reconstruir Vistas**

```javascript
goPesRefrescarVistasYMaster()
```

#### **2.6 Verificar Importación**

- Ve al módulo **Socios**
- Busca una organización
- Verifica que:
  - [ ] Los socios aparecen listados
  - [ ] Los cargos están correctos
  - [ ] No hay duplicados

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "Spreadsheet de migración no configurado"
**Solución:**
```javascript
goPesConfigurarMigracionSourceId('TU_SPREADSHEET_ID')
```

### Problema 2: "No se encontraron headers en la hoja"
**Causas:**
- Hoja vacía
- Nombre de hoja incorrecto (revisa mayúsculas/espacios)
- Primera fila no contiene headers

**Solución:**
- Verifica que el nombre de la hoja sea exacto: `Respuestas de formulario 1` o `SOCIOS`
- Asegúrate de que la primera fila tiene los nombres de columnas

### Problema 3: Muchos duplicados detectados
**Causa:** Ya importaste estos datos antes

**Solución:**
- Si es re-importación: Primero limpia los datos con "Limpiar datos de prueba"
- Si son duplicados reales: Revisa la hoja origen

### Problema 4: "Organizaciones no encontradas" en socios
**Solución:**
1. Crea las organizaciones primero (Fase 1)
2. Anota los IDs generados (ORG-000001, etc.)
3. Actualiza la hoja SOCIOS con esos IDs
4. Re-ejecuta la migración de socios

### Problema 5: Errores de validación
**Causas comunes:**
- RUT mal formateado
- Fechas en formato incorrecto
- Campos obligatorios vacíos

**Solución:**
- Revisa el detalle de errores en el resultado de la previsualización
- Corrige la hoja origen
- Vuelve a previsualizar

---

## 📊 VERIFICACIÓN POST-MIGRACIÓN

### Checklist Final:

- [ ] Cantidad de registros coincide con origen
- [ ] No hay duplicados inesperados
- [ ] Todos los ingresos tienen hito PRE_01
- [ ] Las organizaciones aparecen en el módulo Organizaciones
- [ ] Los socios están asociados a las organizaciones correctas
- [ ] Dashboard muestra estadísticas actualizadas
- [ ] Vistas derivadas reconstruidas (MASTER_DATOS tiene datos)

### Consultas de Verificación:

```javascript
// Contar ingresos migrados
function contarIngresosMigrados() {
  var casos = getSheetData_(GO_PES_V2.SHEETS.MAE_CASOS);
  var migrados = casos.filter(function(c) { return c.medio_solicitud === 'Migración'; });
  Logger.log('Total ingresos migrados: ' + migrados.length);
}

// Contar hitos PRE_01 creados
function contarHitosPRE01() {
  var hitos = getSheetData_(GO_PES_V2.SHEETS.FACT_AVANCE_HITOS);
  var pre01 = hitos.filter(function(h) { return h.codigo_hito === 'PRE_01'; });
  Logger.log('Total hitos PRE_01: ' + pre01.length);
}

// Contar socios migrados
function contarSociosMigrados() {
  var socios = getSheetData_(GO_PES_V2.SHEETS.FACT_SOCIOS);
  var migrados = socios.filter(function(s) { return s.status_carga === 'MIGRACION'; });
  Logger.log('Total socios migrados: ' + migrados.length);
}
```

---

## 🔄 SI NECESITAS RE-IMPORTAR

### Limpiar datos antes de re-importar:

1. Módulo **Configuración** → **Limpieza de datos**
2. PIN: `admin_reset`
3. Confirmación: escribir "LIMPIAR"
4. Espera a que complete
5. Reconstruye vistas
6. Vuelve a ejecutar la migración

**IMPORTANTE:** Esto borra TODOS los datos operativos, no solo los migrados.

---

## 📝 LOGS Y AUDITORÍA

Todos los procesos de migración se registran en:
- `LOG_Procesamiento` — Detalles técnicos
- `LOG_Acciones_Usuario` — Acciones del superuser

Para revisar:
```javascript
function verLogsMigracion() {
  var logs = getSheetData_(GO_PES_V2.SHEETS.LOG_PROC);
  var migracion = logs.filter(function(l) { 
    return l.function_name && l.function_name.indexOf('Migracion') !== -1;
  });
  Logger.log('Logs de migración: ' + migracion.length);
  migracion.forEach(function(log) {
    Logger.log(log.timestamp + ' - ' + log.function_name + ' - ' + log.status);
  });
}
```

---

## ✅ RESUMEN DEL PROCESO

1. ✅ **Configurar** Spreadsheet ID de origen (una vez)
2. ✅ **Fase 1:** Migrar ingresos
   - Verificar → Previsualizar → Ejecutar → Reconstruir vistas
   - ✅ Hito PRE_01 se crea automáticamente
3. ✅ **Fase 2:** Migrar socios
   - Crear/verificar organizaciones → Previsualizar → Ejecutar → Reconstruir vistas
4. ✅ **Verificar** que todo importó correctamente
5. ✅ **Backfill** hito PRE_01 si hay casos antiguos sin hito

---

¿Todo listo? 🚀
