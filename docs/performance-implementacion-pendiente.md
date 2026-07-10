# Performance - Implementación Pendiente

**Fecha:** 2026-07-10  
**Estado:** Fase 1 completada (infraestructura + Dashboard), Fase 2 pendiente (resto de módulos)

---

## ✅ Completado (Fase 1)

### 1. Infraestructura Base
- ✅ **Repository_Indexes.js** creado con 9 índices
- ✅ **Lazy loading** agregado a Repository.js (`findOneByField_`, `getSheetDataLimited_`)
- ✅ **getDashboardKpis()** optimizado (Services.js)
- ✅ **Logging de performance** agregado

### Impacto Estimado de Fase 1
- Dashboard: **70-80% más rápido** (8-12s → 2-4s)
- Filtros por UV/Estado/Tipo: **93% menos iteraciones**
- Avance por hito: **95% menos iteraciones** usando índice

---

## 🔄 Pendiente (Fase 2) — Optimizar Resto de Módulos

### 2. Módulo Organizaciones

**Archivo:** `ZZ_OrganizacionesBackend.js`  
**Función:** `getOrganizacionesConGruposClient()` (líneas 58-170)

#### Cambios requeridos:

**ANTES (líneas 63-96):**
```javascript
var avanceHitos = getSheetData_(FACT_AVANCE_HITOS) || [];
var socios = getSheetData_(FACT_SOCIOS) || [];

// Construir índices localmente (SE REPITE EN CADA REQUEST)
var sociosByOrg = {};
socios.forEach(function(s) {
  var orgId = String(s.organizacion_id || '').trim();
  if (!orgId) return;
  if (!sociosByOrg[orgId]) sociosByOrg[orgId] = 0;
  sociosByOrg[orgId]++;
});

var hitosByOrg = {};
avanceHitos.forEach(function(h) {
  var orgId = String(h.organizacion_id || '').trim();
  if (!orgId) return;
  if (!hitosByOrg[orgId]) hitosByOrg[orgId] = [];
  hitosByOrg[orgId].push(h.orden_hito);
});
```

**DESPUÉS:**
```javascript
// Usar índices globales (CONSTRUIDOS UNA VEZ, REUSADOS)
var sociosByOrgIndex = buildSociosByOrgIdIndex_();
var hitosByOrgIndex = buildHitosByOrgIdIndex_();

// ... más tarde en el map de orgs (línea 115):
total_socios: (sociosByOrgIndex[orgId] || []).length,
hitos_cumplidos: (hitosByOrgIndex[orgId] || []).map(function(h) { return h.orden_hito; })
```

**Ganancia:** 70-75% más rápido

---

### 3. Módulo Avance

**Archivo:** `ZZ_AvanceBackend.js`  
**Función:** `getAvanceOrganizacion()` (líneas 150-181)

#### Cambios en helper `goPesGetTimelineAvanceRows_`:

**ANTES:**
```javascript
function goPesGetTimelineAvanceRows_(orgId) {
  const avanceHitos = getSheetData_(FACT_AVANCE_HITOS) || [];
  const hitosOrg = avanceHitos.filter(function(h) {
    return h.organizacion_id === orgId;
  }); // ← INEFICIENTE: itera 600 rows para retornar ~10
  
  // ... join con catálogo ...
}
```

**DESPUÉS:**
```javascript
function goPesGetTimelineAvanceRows_(orgId) {
  const hitosByOrgIndex = buildHitosByOrgIdIndex_();
  const hitosOrg = hitosByOrgIndex[orgId] || []; // ← EFICIENTE: lookup O(1)
  
  // Join con catálogo también optimizado
  const catalogoIndex = buildCatalogoHitosByCodigoIndex_();
  hitosOrg.forEach(function(h) {
    const meta = catalogoIndex[h.codigo_hito]; // En vez de .find()
    // ...
  });
}
```

**Ganancia:** 70-75% más rápido

---

### 4. Módulo Búsqueda

**Archivo:** `Services.js`  
**Función:** `buscarClient()` (líneas 86-117)

#### Cambios requeridos:

**ANTES (líneas 96-105):**
```javascript
const caseRows = getSheetData_(MAE_CASOS); // Lee 300 rows
const orgRows = getSheetData_(MAE_ORGANIZACIONES); // Lee 150 rows

const searchTerm = normalizeText_(payload.q || '');

// Iterar TODOS los rows y comparar
const matches = caseRows.filter(function(c) {
  return normalizeText_(c.nombre_completo || '').indexOf(searchTerm) >= 0;
}).concat(orgRows.filter(function(o) {
  return normalizeText_(o.nombre_organizacion || '').indexOf(searchTerm) >= 0;
}));
```

**DESPUÉS:**
```javascript
const searchTerm = normalizeText_(payload.q || '');
const palabras = searchTerm.split(' ');

// Usar índice de búsqueda
const casoIndex = buildCasosByNombreIndex_();
const matchedCasos = new Set();

palabras.forEach(function(palabra) {
  (casoIndex[palabra] || []).forEach(function(caso) {
    matchedCasos.add(caso);
  });
});

const matches = Array.from(matchedCasos);
```

**Ganancia:** 60-70% más rápido

---

### 5. Módulo Ficha

**Archivo:** `Services.js`  
**Función:** `obtenerFicha()` (líneas 1224-1350)

#### Cambios requeridos:

**ANTES:**
```javascript
const casos = getSheetData_(MAE_CASOS); // Lee 300 rows para encontrar 1
const caso = casos.find(function(c) {
  return c.solicitud_id === solicitudId;
});

const hitos = getSheetData_(FACT_HITOS); // Lee 800 rows para retornar ~25
const hitosFiltered = hitos
  .filter(function(h) { return h.solicitud_id === solicitudId; })
  .sort(function(a,b) { return new Date(b.fecha_gestion) - new Date(a.fecha_gestion); })
  .slice(0, 25);
```

**DESPUÉS:**
```javascript
// Lazy loading: buscar 1 registro sin leer toda la hoja
const caso = findOneByField_(MAE_CASOS, 'solicitud_id', solicitudId);

// Usar índice de hitos por solicitud
const hitosBySolicitudIndex = buildHitosBySolicitudIdIndex_();
const hitosFiltered = (hitosBySolicitudIndex[solicitudId] || [])
  .sort(function(a,b) { return new Date(b.fecha_gestion) - new Date(a.fecha_gestion); })
  .slice(0, 25);
```

**Ganancia:** 75-80% más rápido

---

### 6. Módulo Socios

**Archivo:** `ZZ_SociosBackend.js`  
**Función:** `getSociosModuloClient()` (líneas 95-200)

#### Cambios requeridos:

**ANTES:**
```javascript
const socios = getSheetData_(FACT_SOCIOS) || [];
const sociosOrg = socios.filter(function(s) {
  return s.organizacion_id === organizacionId;
});

const orgs = getSheetData_(MAE_ORGANIZACIONES) || [];
sociosOrg.forEach(function(socio) {
  const org = orgs.find(function(o) {
    return o.organizacion_id === socio.organizacion_id;
  });
  socio.nombre_organizacion = org ? org.nombre_organizacion : '';
});
```

**DESPUÉS:**
```javascript
const sociosByOrgIndex = buildSociosByOrgIdIndex_();
const sociosOrg = sociosByOrgIndex[organizacionId] || [];

const orgByIdIndex = buildOrgByIdIndex_();
sociosOrg.forEach(function(socio) {
  const org = orgByIdIndex[socio.organizacion_id];
  socio.nombre_organizacion = org ? org.nombre_organizacion : '';
});
```

**Ganancia:** 60-65% más rápido

---

### 7. Módulo Beneficios

**Archivo:** `ZZ_BeneficiosBackend.js`  
**Función:** `getBeneficiosModuloPanel()` (líneas 86-400)

#### Cambios en verificación de elegibilidad:

**ANTES:**
```javascript
const avanceHitos = getSheetData_(FACT_AVANCE_HITOS) || [];

// Para cada org, verificar si tiene certificado definitivo (hito 11)
orgs.forEach(function(org) {
  const tieneCertificado = avanceHitos.some(function(h) {
    return h.organizacion_id === org.organizacion_id &&
           h.orden_hito === 11; // PRE_11 = Certificado definitivo
  });
  org.elegible_camaras = tieneCertificado;
});
```

**DESPUÉS:**
```javascript
const hitosByOrgIndex = buildHitosByOrgIdIndex_();

orgs.forEach(function(org) {
  const hitosOrg = hitosByOrgIndex[org.organizacion_id] || [];
  const tieneCertificado = hitosOrg.some(function(h) {
    return h.orden_hito === 11;
  });
  org.elegible_camaras = tieneCertificado;
});
```

**Ganancia:** 65-70% más rápido

---

## 🛠️ Instrucciones de Implementación

### Para cada módulo:

1. **Leer el archivo** y localizar la función indicada
2. **Aplicar el patrón ANTES → DESPUÉS** del ejemplo
3. **Agregar logging de performance:**
   ```javascript
   var perfStart = Date.now();
   // ... lógica de la función ...
   var perfElapsed = Date.now() - perfStart;
   Logger.log('[PERF] nombreFuncion() ejecutado en ' + perfElapsed + 'ms');
   ```

4. **Testing en DEV:**
   - Ejecutar la función desde el módulo
   - Verificar que retorna los mismos datos
   - Comparar tiempo en logs (antes vs después)

### Patrón de refactorización común:

```javascript
// ❌ ANTI-PATRÓN (lento):
const rows = getSheetData_(HOJA);
const filtered = rows.filter(r => r.campo === valor); // O(n)

// ✅ PATRÓN OPTIMIZADO (rápido):
const index = buildIndexByCampo_(); // Construir UNA VEZ
const filtered = index[valor] || []; // Lookup O(1)
```

---

## 📊 Tracking de Progreso

| Módulo | Función | Estado | Ganancia estimada |
|--------|---------|--------|-------------------|
| Dashboard | `getDashboardKpis()` | ✅ **COMPLETADO** | 70-80% |
| Organizaciones | `getOrganizacionesConGruposClient()` | ⏳ Pendiente | 70-75% |
| Avance | `getAvanceOrganizacion()` | ⏳ Pendiente | 70-75% |
| Búsqueda | `buscarClient()` | ⏳ Pendiente | 60-70% |
| Ficha | `obtenerFicha()` | ⏳ Pendiente | 75-80% |
| Socios | `getSociosModuloClient()` | ⏳ Pendiente | 60-65% |
| Beneficios | `getBeneficiosModuloPanel()` | ⏳ Pendiente | 65-70% |

**Total:** 1 de 7 módulos optimizados (14% completo)

---

## ⚡ Testing Rápido

Para verificar que las optimizaciones funcionan sin romper nada:

1. **Abrir DEV** después del push
2. **Ejecutar cada módulo** y comparar tiempos en logs
3. **Verificar que los datos** sean idénticos a la versión sin optimizar

### Script de benchmark (opcional):

Crear `ZZ_PerformanceBenchmark.js`:

```javascript
function goPesBenchmarkDashboard() {
  Logger.log('=== BENCHMARK DASHBOARD ===');
  
  const filters = [
    {},
    { uv: 'UV1' },
    { estado_constitucion: 'constituida' },
    { uv: 'UV1', estado_constitucion: 'constituida', tipo_organizacion: 'junta_vecinos' }
  ];
  
  filters.forEach(function(filter, i) {
    const start = Date.now();
    getDashboardKpis(filter);
    const elapsed = Date.now() - start;
    Logger.log('Filtro ' + i + ': ' + elapsed + 'ms');
  });
}
```

---

## 🎯 Próximos Pasos

1. **Implementar módulos pendientes** (uno a la vez)
2. **Testing en DEV** después de cada módulo
3. **Commit incremental** por módulo optimizado
4. **Push a PROD** cuando todos pasen los tests

**Tiempo estimado:** 2-3 horas para los 6 módulos restantes  
**Ganancia total esperada:** 70% más rápido en toda la app
