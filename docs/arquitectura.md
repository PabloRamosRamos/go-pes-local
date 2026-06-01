# Arquitectura — GO-PES v2

**Propósito:** Mapa de la arquitectura del sistema, capas, módulos, flujo de una operación típica y decisiones arquitectónicas clave.

**Audiencia:** Desarrolladores, arquitectos, cualquier persona que necesite entender cómo está construido el sistema.

---

## Tabla de contenidos

- [Visión general](#visión-general)
- [Stack tecnológico](#stack-tecnológico)
- [Capas del sistema](#capas-del-sistema)
- [Módulos del backend](#módulos-del-backend)
- [Módulos del frontend](#módulos-del-frontend)
- [Flujo de una operación típica](#flujo-de-una-operación-típica)
- [Decisiones arquitectónicas](#decisiones-arquitectónicas)
- [Limitaciones conocidas](#limitaciones-conocidas)

---

## Visión general

GO-PES es una **aplicación web monolítica** construida sobre Google Apps Script que usa un Google Spreadsheet como base de datos. No hay servidor externo, no hay microservicios, no hay bundler.

**Modelo de ejecución:**
- **Runtime:** Google Apps Script (V8 engine, JavaScript ES6+)
- **Hosting:** Web App de Google Apps Script (URL estable)
- **Base de datos:** Google Sheets (hojas = tablas, filas = registros)
- **Autenticación:** Google OAuth (sesión del usuario de Google)
- **Deploy:** `clasp push` → actualiza el proyecto remoto
- **Zona horaria:** America/Santiago

**Características clave:**
- ✅ Sin servidor que mantener
- ✅ OAuth de Google nativo
- ✅ Versionado y rollback via Apps Script
- ✅ Sin costos de infraestructura
- ⚠️ Límites de cuotas de Google Apps Script
- ⚠️ Sin transacciones ACID (Google Sheets no es DB transaccional)
- ⚠️ Concurrencia limitada (LockService para escrituras críticas)

---

## Stack tecnológico

### Backend

| Componente | Tecnología | Versión | Propósito |
|------------|-----------|---------|-----------|
| **Runtime** | Google Apps Script | V8 | Ejecución de código JavaScript server-side |
| **Lenguaje** | JavaScript | ES6+ | Sin TypeScript, sin transpilación |
| **Base de datos** | Google Sheets | API v4 | Almacenamiento estructurado |
| **Cache** | CacheService | Apps Script | Cache volátil (6h TTL) |
| **Properties** | PropertiesService | Apps Script | Configuración persistente (PINs, IDs) |
| **Concurrencia** | LockService | Apps Script | Locks para escrituras críticas |
| **Logging** | Logger + Sheets | Apps Script | Logs en consola + hojas LOG_* |

### Frontend

| Componente | Tecnología | Propósito |
|------------|-----------|-----------|
| **HTML** | HTML5 | Estructura de vistas |
| **CSS** | CSS3 | Estilos (sin pre-procesadores) |
| **JavaScript** | Vanilla JS (ES6+) | Lógica cliente (sin frameworks) |
| **Templating** | `HtmlService.createTemplateFromFile()` | Server-side includes |
| **Comunicación** | `google.script.run` | RPC nativo Apps Script → Backend |

**Sin frameworks:** No hay React, Vue, Angular. Todo es DOM manipulation puro.

### Tooling

| Herramienta | Propósito |
|-------------|-----------|
| **clasp** | CLI para push/pull de código a Apps Script |
| **Git** | Control de versiones (GitHub) |
| **PowerShell** | Scripts de deploy (push-dev.ps1, push-prod.ps1) |

---

## Capas del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO FINAL                           │
│                    (Navegador web Chrome/Edge)                  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Index.html  │  │ Styles.html  │  │Scripts_*.html│         │
│  │  (template)  │  │    (CSS)     │  │     (JS)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  Renderizado: HtmlService.createTemplateFromFile()             │
│  Comunicación: google.script.run.funcionBackend(payload)       │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ RPC (google.script.run)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE APLICACIÓN                         │
│  ┌──────────────────────────────────────────────────┐          │
│  │              BOOTSTRAP & ROUTING                 │          │
│  │  Main.js: doGet(), onOpen(), buildBootstrap     │          │
│  └──────────────────────────────────────────────────┘          │
│                              │                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │              LÓGICA DE NEGOCIO                   │          │
│  │  Services.js, ZZ_*Backend.js, NuevoIngreso.js   │          │
│  └──────────────────────────────────────────────────┘          │
│                              │                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │          INFRAESTRUCTURA & SEGURIDAD             │          │
│  │  Auth.js, SecurityPins.js, SystemConfig.js,     │          │
│  │  Repository.js, DerivedBuilders.js, Catalogs.js │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ SpreadsheetApp API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CAPA DE PERSISTENCIA                        │
│                      (Google Spreadsheet)                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │
│  │  RAW   │ │  MAE   │ │  FACT  │ │  DIM   │ │  VW    │      │
│  │Entrada │ │Maestros│ │ Hechos │ │Catálog.│ │Vistas  │      │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      │
│                                                                 │
│  46 hojas en total (ver docs/modelo-datos.md)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Módulos del backend

### Bootstrap y configuración

| Módulo | Responsabilidad | Funciones clave |
|--------|----------------|-----------------|
| **Main.js** | Entry point, routing, bootstrap | `doGet()`, `onOpen()`, `buildBootstrapForTemplate_()`, `GO_PES_V2` (constante global) |
| **SystemConfig.js** | Configuración del sistema | `getRuntimeSystemConfig_()`, `saveSystemConfigSection()`, gestión de `CFG_Parametros` |

### Infraestructura

| Módulo | Responsabilidad | Funciones clave |
|--------|----------------|-----------------|
| **Auth.js** | Autenticación, usuarios, permisos | `requireRole_()`, `requireModuleAccess_()`, `getCurrentUser_()`, gestión `DIM_Usuarios` |
| **SecurityPins.js** | Gestión de PINs con rate limiting | `goPesValidatePin_()`, `goPesConfigurePinDeSeguridad()`, 3 contextos (admin_reset, user_deactivate, evento_abierto) |
| **Repository.js** | Acceso a hojas + cache | `getSheetData_()`, `upsertByKey_()`, `appendRowObject_()`, `buildSheetDefinitions_()`, cache en `GO_PES_RUNTIME` |
| **Validators.js** | Validación de datos | `isValidEmail_()`, `isValidRut_()`, `normalizeText_()`, `toBool_()` |
| **DerivedBuilders.js** | Vistas materializadas | `refreshDerivedArtifacts_()`, `buildMasterDatos_()`, `buildVistaOrganizaciones_()`, actualización parcial/full |
| **Catalogs.js** | Gestión de catálogos | `getCatalogosAppClient()`, `seedGoPesV2Catalogs_()`, `rebuildSuggestionDims_()` |
| **Diagnostics.js** | Trazas de diagnóstico | `goPesDiagStart_()`, `goPesDiagEnd_()`, activables/desactivables |

### Lógica de negocio

| Módulo | Dominio | Funciones clave |
|--------|---------|-----------------|
| **Services.js** | Core (búsqueda, ficha, guardado) | `buscarVecino()`, `obtenerFicha()`, `guardarIngreso()`, `guardarSeguimiento()`, `listarHistorial()` |
| **NuevoIngreso.js** | Ingreso de vecinos | `guardarNuevoIngreso()`, validación de payload |
| **ZZ_AvanceBackend.js** | Avance de hitos | `registrarHitoAvance()`, `cambiarEstadoAvance()`, `getAvanceOrganizacion()`, gestión de `FACT_Avance_*` |
| **ZZ_BeneficiosBackend.js** | Beneficios e instrumentos | `goPesUpsertBeneficioDetalle()`, `guardarCamaras1414Organizacion()`, gestión Fondese, eventos formación |
| **ZZ_OrganizacionesBackend.js** | Organizaciones | `getOrganizacionesConGruposClient()`, `getOrganizacionModuloDetalle()`, suspender/eliminar |
| **ZZ_SociosBackend.js** | Socios y directivas | `getSociosModuloData()`, `guardarSocio()`, gestión de `FACT_Socios` |
| **ZZ_AdminDataReset.js** | Utilidades admin (solo DEV) | `limpiarDatosPruebaAdmin()`, reset de datos de prueba, requiere PIN |
| **ZZ_MigracionBackend.js** | Migración de datos legacy | `goPesConfigurarMigracionSourceId()`, importación desde spreadsheet externo |

### Testing

| Módulo | Responsabilidad |
|--------|----------------|
| **Audith.js** | Suite de tests automatizados | 195 tests en 6 suites: Validators, Auth, Services, Avance, Beneficios, Security |

---

## Módulos del frontend

### Core

| Archivo | Responsabilidad | Tamaño aprox. |
|---------|----------------|---------------|
| **Index.html** | Template principal, incluye todos los parciales | 400 líneas |
| **Styles.html** | CSS global (light mode) | ~4,500 líneas |
| **ThemeDark.html** | CSS dark mode (overrides) | ~200 líneas |
| **Scripts.html** | Core JS (constantes, routing, catálogos, utils) | ~1,750 líneas |
| **Splash.html** | Pantalla de splash inicial | 100 líneas |
| **Loading.html** | Spinner de carga | 50 líneas |

### Módulos funcionales (Scripts_*.html)

| Archivo | Módulo | Responsabilidad | Tamaño aprox. |
|---------|--------|----------------|---------------|
| **Scripts_Inicio.html** | Inicio | Dashboard nativo (KPIs, gráficos, alertas) | ~800 líneas |
| **Scripts_Ficha.html** | Ficha | Renderizado de ficha de vecino/organización | ~600 líneas |
| **Scripts_NuevoIngreso.html** | Nuevo ingreso | Formulario de ingreso + org manual | ~400 líneas |
| **Scripts_Organizaciones.html** | Organizaciones | Lista de orgs + grupos vecinos, filtros | ~500 líneas |
| **Scripts_Beneficios.html** | Beneficios | Gestión de beneficios, instrumentos, Fondese, eventos | ~1,700 líneas |
| **Scripts_Socios.html** | Socios | Lista de socios, directivas, inscripciones | ~700 líneas |
| **Scripts_Avance.html** | Avance | Timeline de hitos, modal de registro | ~850 líneas |
| **Scripts_Admin.html** | Usuarios + Config | Gestión de usuarios, configuración del sistema | ~1,700 líneas |

### Otros

| Archivo | Responsabilidad |
|---------|----------------|
| **Manual.html** | Manual de usuario embebido | ~3,500 líneas |
| **Assets.js** | Logos e imágenes (data URIs base64) | ~50 líneas |

---

## Flujo de una operación típica

### Ejemplo: Registrar un nuevo ingreso

**1. Usuario llena formulario en frontend**

```
Usuario en módulo "Nuevo ingreso"
  → Llena campos (nombre, apellido, teléfono, UV, etc.)
  → Click en "Guardar"
```

**2. Frontend valida y envía payload**

```javascript
// Scripts_NuevoIngreso.html
function submitNuevoIngreso_() {
  const payload = {
    nombre_vecino: sel_('nuevo-ingreso-nombre').value.trim(),
    apellido_vecino: sel_('nuevo-ingreso-apellido').value.trim(),
    telefono_contacto: sel_('nuevo-ingreso-telefono').value.trim(),
    // ... más campos
  };

  // Validación básica
  if (!payload.nombre_vecino || !payload.apellido_vecino) {
    alert('Falta nombre o apellido');
    return;
  }

  // Llamada RPC al backend
  google.script.run
    .withSuccessHandler(function(result) {
      alert('Ingreso guardado: ' + result.solicitud_id);
      navigateTo_('ficha', { solicitud_id: result.solicitud_id });
    })
    .withFailureHandler(function(error) {
      alert('Error: ' + error.message);
    })
    .guardarNuevoIngreso(payload);
}
```

**3. Backend recibe, valida y procesa**

```javascript
// NuevoIngreso.js
function guardarNuevoIngreso(payload) {
  // 1. Auth guard
  const user = requireModuleAccess_('nuevo-ingreso', ['operador', 'coordinador', 'superuser']);

  // 2. Lock para evitar concurrencia
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    // 3. Normalizar y validar payload
    payload = normalizarNuevoIngresoPayload_(payload);
    validarNuevoIngresoPayload_(payload);

    // 4. Generar IDs
    const vecinoId = nextId_('vecino', 'VEC');
    const solicitudId = nextId_('solicitud', 'SOL');

    // 5. Insertar en RAW_Formulario_Ingreso
    appendRowObject_(GO_PES_V2.SHEETS.RAW_INGRESO, {
      created_at: new Date(),
      source: 'webapp',
      user_email: user.email,
      vecino_id: vecinoId,
      solicitud_id: solicitudId,
      nombre_vecino: payload.nombre_vecino,
      apellido_vecino: payload.apellido_vecino,
      // ... resto de campos
    });

    // 6. Upsert en MAE_Casos (maestro)
    upsertByKey_(GO_PES_V2.SHEETS.MAE_CASOS, 'solicitud_id', {
      solicitud_id: solicitudId,
      vecino_id: vecinoId,
      nombre_completo: buildFullName_(payload.nombre_vecino, payload.apellido_vecino),
      fecha_ingreso: new Date(),
      estado_actual: 'Nuevo ingreso',
      // ... resto de campos
    });

    // 7. Actualizar vistas derivadas (parcial)
    refreshPartialArtifacts_({
      masterSolicitudIds: [solicitudId],
      sugerenciaSolicitudIds: [solicitudId]
    });

    // 8. Logging
    logUserAction_('NUEVO_INGRESO', 'vecino', solicitudId, 'OK', { vecino_id: vecinoId });

    // 9. Retornar al cliente
    return serializeForClient_({
      ok: true,
      solicitud_id: solicitudId,
      vecino_id: vecinoId
    });

  } finally {
    lock.releaseLock();
  }
}
```

**4. Actualización de vistas derivadas**

```javascript
// DerivedBuilders.js
function refreshPartialArtifacts_(options) {
  // Actualiza solo las filas afectadas por los IDs proporcionados
  options.masterSolicitudIds.forEach(function(solicitudId) {
    upsertMasterRowBySolicitudId_(solicitudId);  // MASTER_DATOS
  });

  options.sugerenciaSolicitudIds.forEach(function(solicitudId) {
    upsertSuggestionRowsForSolicitudId_(solicitudId);  // DIM_Solicitudes_Sugeridas
  });

  // Invalidar cache de catálogos
  invalidateCatalogClientCaches_();
}
```

**5. Frontend recibe respuesta y navega**

```javascript
// El withSuccessHandler recibe el result
{
  ok: true,
  solicitud_id: "SOL-000123",
  vecino_id: "VEC-000456"
}

// Navega a la ficha del vecino recién creado
navigateTo_('ficha', { solicitud_id: 'SOL-000123' });
```

**Resultado final:**
- ✅ Datos en `RAW_Formulario_Ingreso` (auditoría)
- ✅ Registro en `MAE_Casos` (maestro)
- ✅ Vista `MASTER_DATOS` actualizada (ficha completa)
- ✅ Vista `DIM_Solicitudes_Sugeridas` actualizada (autocomplete)
- ✅ Log en `LOG_Acciones_Usuario`
- ✅ Frontend navegó a la ficha del vecino

---

## Decisiones arquitectónicas

### ¿Por qué Google Apps Script?

**Ventajas:**
- ✅ **Cero infraestructura:** No hay servidor, no hay costos de hosting
- ✅ **OAuth nativo:** Autenticación de Google sin implementar nada
- ✅ **Permisos de Drive:** Control de acceso via permisos del Spreadsheet
- ✅ **Iteración rápida:** `clasp push` y el código está en producción
- ✅ **Backups automáticos:** Google Drive versiona el spreadsheet
- ✅ **Escalabilidad suficiente:** Para un equipo de 10-50 usuarios es ideal

**Desventajas:**
- ⚠️ **Cuotas de Google:** 6 min/ejecución, 90 min/día por usuario, 20k lecturas/día
- ⚠️ **Performance limitada:** Sheets no es DB; lecturas completas de hojas pueden ser lentas
- ⚠️ **Sin transacciones ACID:** Escrituras críticas requieren LockService manual
- ⚠️ **Debugging limitado:** No hay debugger interactivo; solo Logger y try/catch

### ¿Por qué sin frameworks en frontend?

**Ventajas:**
- ✅ **Simplicidad:** No hay build, no hay bundler, no hay node_modules
- ✅ **Tamaño:** Toda la app carga en ~500KB (HTML+CSS+JS concatenado)
- ✅ **Control total:** No hay magic, no hay dependencias obsoletas
- ✅ **Performance:** DOM manipulation directo es rápido

**Desventajas:**
- ⚠️ **Verbosidad:** Más código manual para routing, estado, renderizado
- ⚠️ **Sin hot reload:** Hay que refreshear manualmente para ver cambios
- ⚠️ **No reactive:** Estado manual, no hay observables

### ¿Por qué Sheets como DB?

**Ventajas:**
- ✅ **Visualización directa:** Los datos son visibles en la hoja
- ✅ **Auditoría visual:** Cualquier admin puede ver/editar datos
- ✅ **Migración fácil:** Copiar hoja = backup instantáneo
- ✅ **Sin ORM:** Acceso directo con `getValues()` / `setValues()`

**Desventajas:**
- ⚠️ **Sin índices:** Búsquedas secuenciales (O(n))
- ⚠️ **Sin FKs:** Integridad referencial manual
- ⚠️ **Límites de tamaño:** 10 millones de celdas por spreadsheet
- ⚠️ **Performance:** Lectura completa de 5000 filas = ~2-3 segundos

### Cache strategy

**CacheService (volátil, 6h TTL):**
- Catálogos de dimensiones (DIM_*)
- Rate limiting de PINs (3 intentos/hora)
- Resultados de búsquedas frecuentes

**GO_PES_RUNTIME (memoria del script, lifetime = 1 ejecución):**
- Sheets cargadas (`sheetByName`)
- Datos de hojas leídas (`rowsBySheet`)
- Se invalida al terminar la ejecución

**PropertiesService (persistente):**
- Contadores de secuencias (IDs)
- PINs de seguridad (hasheados)
- Spreadsheet ID de migración

---

## Limitaciones conocidas

### Cuotas de Google Apps Script

| Recurso | Límite | Impacto |
|---------|--------|---------|
| Tiempo de ejecución | 6 min/ejecución | Operaciones batch deben dividirse |
| Tiempo de ejecución diario | 90 min/día por usuario | Usuario intensivo puede agotar cuota |
| URL Fetch | 20k llamadas/día | Integraciones externas limitadas |
| Triggers time-driven | 90 ejecuciones/hora | Procesos automáticos limitados |
| Cache size | 10 MB | Catálogos grandes pueden no cachear |

**Mitigación:**
- Usar `refreshPartialArtifacts_()` en lugar de full rebuild
- Dividir operaciones grandes con `LockService` + reintentos
- Cachear agresivamente lecturas frecuentes

### Concurrencia

**Problema:** Múltiples usuarios guardando a la vez pueden sobrescribirse.

**Mitigación:**
```javascript
const lock = LockService.getDocumentLock();
lock.waitLock(30000);  // Espera hasta 30 seg
try {
  // Operación crítica (upsert, append)
} finally {
  lock.releaseLock();
}
```

**Límite:** Solo 1 escritura a la vez por spreadsheet. Si 10 usuarios guardan simultáneamente, se serializan.

### Performance de búsquedas

**Problema:** Sheets no tiene índices. Buscar 1 vecino entre 5000 requiere leer las 5000 filas.

**Mitigación:**
- Vistas materializadas (`DIM_*_Sugeridas`) pre-filtradas
- Cache de resultados frecuentes en `CacheService`
- Limitar resultados (`slice(0, 50)`)

### Tamaño del spreadsheet

**Límite:** 10 millones de celdas por spreadsheet.

**Ejemplo:**
- 46 hojas × 50 columnas promedio × 5000 filas = 11.5M celdas ⚠️

**Mitigación:**
- Archivar datos históricos >2 años
- Compactar logs (eliminar filas >6 meses)
- Dividir en múltiples spreadsheets si crece más

---

**Última actualización:** 2026-05-31  
**Versión:** 1.0  
**Próxima revisión:** Ante cambios arquitectónicos mayores (nuevo módulo, nueva capa, nuevo servicio externo)
