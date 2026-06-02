# CHECKLIST PRE-PRODUCCIÓN GO-PES v2
**Fecha:** 2026-06-02  
**Entorno:** PROD (`pablo.ramos@providencia.cl`)

---

## ✅ CONFIGURACIÓN CRÍTICA

### 1. **appsscript.json** 
- [x] `"access": "ANYONE"` ✓ (intencional - autenticación vía DIM_Usuarios)
- [x] `"executeAs": "USER_ACCESSING"` ✓
- [x] `"timeZone": "America/Santiago"` ✓
- [x] OAuth scopes completos ✓

**NOTA:** `access: "ANYONE"` es intencional en PROD. El control de acceso se gestiona internamente a través de `DIM_Usuarios`, permitiendo usuarios externos (dirigentes, vecinos) sin restricción de dominio Google.

---

## 🔐 SEGURIDAD

### 2. **PINs de Seguridad**
Después del primer deploy a PROD, configurar los 3 PINs desde el editor:

```javascript
// Ejecutar UNA VEZ desde Apps Script Editor:
goPesConfigurePinDeSeguridad('admin_reset', 'PIN_SEGURO_AQUI')
goPesConfigurePinDeSeguridad('user_deactivate', 'PIN_SEGURO_AQUI')
goPesConfigurePinDeSeguridad('evento_abierto', 'PIN_SEGURO_AQUI')
```

**Contextos:**
- `admin_reset` — Limpieza de datos de prueba (Configuración)
- `user_deactivate` — Desactivar usuarios (Usuarios)
- `evento_abierto` — Eventos con inscripción abierta (Beneficios)

**Seguridad:** Rate limiting 3 intentos/hora por usuario

### 3. **Usuarios del Sistema**
- [ ] Superusuario inicial configurado: `pablo.ramos@providencia.cl`
- [ ] Usuarios del equipo creados con roles correctos
- [ ] Permisos por módulo asignados

**Ejecutar desde el editor (primera vez):**
```javascript
goPesSeedSuperUsers()  // Crea superusuario inicial
```

---

## 🗃️ DATOS Y ESTRUCTURA

### 4. **Hojas del Spreadsheet**
- [ ] Todas las hojas creadas (ejecutar "Configurar motor operativo" desde menú)
- [ ] Headers verificados
- [ ] Catálogos sembrados (DIM_*, CAT_*)

**Ejecutar desde menú GO-PES v2:**
1. Configurar motor operativo
2. Inicializar catálogos de avance (si no existen)
3. Inicializar superUsers

### 5. **Datos de Prueba**
- [ ] **LIMPIAR datos de prueba antes de producción**

**Usar función de limpieza:**
- Módulo: Configuración → Limpieza de datos
- PIN: `admin_reset`
- Confirmación: escribir "LIMPIAR"

**Hojas que SE LIMPIAN** (26 hojas de datos operativos):
- RAW_* (ingresos, seguimiento, organizaciones, instrumentos, socios)
- MAE_* (casos, organizaciones)
- FACT_* (hitos, instrumentos, socios, beneficios, avance)
- VW_* (vistas derivadas)
- DIM_*_Sugeridos
- MASTER_DATOS

**Hojas PROTEGIDAS** (14 hojas que NO se tocan):
- CAT_Hitos_Avance
- CFG_FONDESE_Ediciones
- DIM_Usuarios
- DIM_Territorio, DIM_Estados, DIM_Etapas, DIM_Origen
- DIM_Beneficios, DIM_Instrumentos, DIM_Requisitos
- DIM_Responsables, DIM_Cargos
- LOG_* (procesamiento, accesos, acciones)

**Función de limpieza también:**
- ✅ Resetea contadores de secuencia (IDs vuelven a VEC-000001, SOL-000001, etc.)
- ✅ Reconstruye vistas derivadas automáticamente
- ✅ Requiere PIN + confirmación doble
- ✅ Registra en logs la acción de limpieza

---

## 🧪 TESTS

### 6. **Suite de Tests Automatizados**
- [ ] Ejecutar `goPesRunAllTests()` desde el editor
- [ ] Verificar: **262 tests, 0 fallos**

**Cobertura:**
- 90 tests de validadores
- 41 tests de autenticación
- 51 tests de servicios
- 35 tests de avance
- 32 tests de beneficios
- 13 tests de seguridad

---

## 🚀 FUNCIONALIDADES CRÍTICAS

### 7. **Nuevas Funcionalidades Implementadas**
- [x] **Hito PRE_01 automático:**
  - ✓ Nuevos ingresos desde calendario
  - ✓ Importación/migración de datos
  - ✓ Backfill para casos existentes: `goPesBackfillHitoPRE01()`
  
- [x] **Manual de Procedimientos:**
  - ✓ Flowchart de Cámaras de Seguridad
  - ✓ Placeholders FONDESE y Capacitaciones
  
- [x] **Calendario de reuniones:**
  - ✓ Filtros por tipo (Todos/Visitas/Asambleas)
  - ✓ Persistencia de eventos al cancelar formulario
  - ✓ Parser robusto de descripciones (single-line + multiline)

### 8. **Módulos Operativos**
Verificar que todos funcionan:
- [ ] Inicio / Dashboard
- [ ] Nuevo ingreso (con y sin calendario)
- [ ] Buscar vecino
- [ ] Ficha (con historial de gestiones)
- [ ] Avance (con número de ingreso en hito 2)
- [ ] Organizaciones (vista unificada orgs + grupos)
- [ ] Socios
- [ ] Beneficios (Cámaras, FONDESE, Capacitaciones)
- [ ] Usuarios (solo superuser)
- [ ] Configuración (solo superuser)

---

## 📊 BACKFILL HITO PRE_01

### 9. **Actualizar Casos Existentes**
Si hay casos en producción sin el hito PRE_01, ejecutar:

```javascript
// Desde Apps Script Editor:
goPesBackfillHitoPRE01()
```

Esto crea el hito PRE_01 para todos los casos que no lo tienen, usando:
- Fecha: `fecha_ingreso` del caso
- Observación: "Backfill automático - Reunión informativa inicial"

---

## 🔄 PROCESO DE DEPLOY

### 10. **Pasos de Deploy a PROD**

```powershell
# 1. Verificar que estás en la rama correcta
git status

# 2. Push a PROD
.\push-prod.ps1
# Escribir: prod

# 3. Abrir editor de PROD
clasp -u prod open

# 4. Configurar PINs (primera vez)
# Ejecutar desde el editor:
goPesConfigurePinDeSeguridad('admin_reset', 'TU_PIN')
goPesConfigurePinDeSeguridad('user_deactivate', 'TU_PIN')
goPesConfigurePinDeSeguridad('evento_abierto', 'TU_PIN')

# 5. Inicializar superusuario (primera vez)
goPesSeedSuperUsers()

# 6. Ejecutar tests
goPesRunAllTests()

# 7. Limpiar datos de prueba (si hay)
# Desde la app: Configuración → Limpieza de datos

# 8. Backfill hito PRE_01 (si hay casos existentes)
goPesBackfillHitoPRE01()

# 9. Crear deployment de Web App
# Desde el editor: Deploy → Nueva implementación
# Tipo: Aplicación web
# Ejecutar como: Usuario que accede
# Quién tiene acceso: Solo usuarios de mi organización
```

---

## ⚠️ VERIFICACIONES FINALES

### 11. **Antes de Abrir al Equipo**
- [ ] URL de producción funciona
- [ ] Sistema de autenticación vía DIM_Usuarios funciona
- [ ] Superusuario puede acceder a todos los módulos
- [ ] Tests pasan en PROD
- [ ] No hay datos de prueba en las hojas operativas
- [ ] PINs de seguridad configurados
- [ ] Módulo Inicio carga correctamente
- [ ] Calendario muestra eventos
- [ ] Nuevo ingreso desde calendario funciona
- [ ] Hito PRE_01 se crea automáticamente

### 12. **Documentación para el Equipo**
- [ ] Manual de Usuario accesible desde la app
- [ ] Manual de Procedimientos accesible desde la app
- [ ] Roles y permisos claros
- [ ] Soporte técnico definido (contacto)

---

## 📝 NOTAS IMPORTANTES

### **Configuración de Acceso:**
- **DEV y PROD:** `access: "ANYONE"` (intencional)
- **Control de acceso:** Sistema interno vía `DIM_Usuarios`
- **Beneficio:** Permite usuarios externos (dirigentes, vecinos) sin restricción de dominio Google

### **Cuenta de migración (si se usa):**
Si se importan datos desde otro spreadsheet, configurar:
```javascript
goPesConfigurarMigracionSourceId('SPREADSHEET_ID_ORIGEN')
```

### **Contacto de Soporte:**
- Desarrollador: Pablo Ramos (`pablo.ramos@providencia.cl`)
- Issues: https://github.com/anthropics/claude-code/issues (para bugs de la herramienta)

---

## ✅ FIRMA DE APROBACIÓN

- [ ] Todos los items verificados
- [ ] Tests pasados (262/262)
- [ ] Datos de prueba limpiados
- [ ] PINs configurados
- [ ] Deploy completado

**Aprobado por:** ___________________________  
**Fecha:** ___________________________  
**Versión:** v2.1.0-modular  

---

**LISTO PARA PRODUCCIÓN** 🚀
