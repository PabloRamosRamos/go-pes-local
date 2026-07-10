# Seguridad — GO-PES v2

**Propósito:** Documentación completa del modelo de seguridad, permisos, roles, scopes OAuth, exposición de la webapp, PINs y riesgos conocidos.

**Audiencia:** Desarrolladores, auditores de seguridad, administradores del sistema.

---

## Tabla de contenidos

- [Modelo de autenticación](#modelo-de-autenticación)
- [Roles del sistema](#roles-del-sistema)
- [Permisos por módulo](#permisos-por-módulo)
- [OAuth Scopes](#oauth-scopes)
- [Exposición de la webapp](#exposición-de-la-webapp)
- [Sistema de PINs](#sistema-de-pines)
- [Superusuarios](#superusuarios)
- [Auditoría de seguridad](#auditoría-de-seguridad)
- [Riesgos conocidos](#riesgos-conocidos)
- [Mejores prácticas](#mejores-prácticas)

---

## Modelo de autenticación

### OAuth de Google

GO-PES usa **Google OAuth nativo** de Apps Script. No hay contraseñas propias, no hay JWT, no hay sesiones manuales.

**Flujo de autenticación:**

```
1. Usuario accede a la URL de la webapp
   ↓
2. Google OAuth (si no está autenticado)
   → Solicita permiso para acceder a Spreadsheets
   → Solicita email del usuario
   ↓
3. Apps Script ejecuta doGet(e)
   ↓
4. getCurrentUserEmail_() obtiene el email autenticado
   ↓
5. Auth.js verifica si el usuario existe en DIM_Usuarios
   ↓
6. Si existe y activo → renderiza la webapp
   Si no existe → auto-provisiona (si es dominio confiable o superuser)
   Si existe pero inactivo → rechaza acceso
```

**Ventajas:**
- ✅ No hay contraseñas que gestionar
- ✅ MFA de Google (si el usuario lo tiene habilitado)
- ✅ No hay tokens que rotar

**Limitaciones:**
- ⚠️ Si el usuario pierde acceso a su cuenta Google, pierde acceso a la app
- ⚠️ No hay logout explícito (sesión es de Google)

---

## Roles del sistema

GO-PES tiene **4 roles jerárquicos**:

```
visor < operador < coordinador < superuser
```

| Rol | Capacidades | Módulos |
|-----|-------------|---------|
| **visor** | Solo lectura | Inicio (dashboard), Buscar, Ficha (lectura) |
| **operador** | Gestión de casos, organizaciones, beneficios | visor + Nuevo ingreso, Avance, Organizaciones, Socios, Beneficios, Historial (parcial) |
| **coordinador** | operador + reconstrucción de vistas, configuración de módulos | operador + rebuild de vistas, gestión de catálogos |
| **superuser** | coordinador + gestión de usuarios, configuración del sistema, reset de datos | coordinador + Usuarios, Configuración, Historial (completo), utilidades admin |

### Jerarquía de permisos

Un rol superior **hereda** todos los permisos del rol inferior:

```javascript
// Auth.js
function requireRole_(allowedRoles) {
  const user = getCurrentUser_();
  const roleHierarchy = ['visor', 'operador', 'coordinador', 'superuser'];
  const userRoleIndex = roleHierarchy.indexOf(user.perfil);
  const minRoleIndex = Math.min(...allowedRoles.map(r => roleHierarchy.indexOf(r)));

  if (userRoleIndex < minRoleIndex) {
    throw new Error('Acceso denegado. Rol requerido: ' + allowedRoles.join(' o '));
  }
}
```

**Ejemplo:**
- Función requiere `['operador']` → permite operador, coordinador, superuser
- Función requiere `['superuser']` → solo superuser

### Almacenamiento de roles

**Tabla:** `DIM_Usuarios`

| Campo | Descripción |
|-------|-------------|
| `user_id` | ID único (USR-XXXXXX) |
| `email` | Email de Google (PK lógica) |
| `nombre_visible` | Nombre para mostrar |
| `perfil` | Rol: `visor`, `operador`, `coordinador`, `superuser` |
| `activo_flag` | Usuario activo/inactivo |
| `superuser_flag` | Flag especial para superusers |
| `modulos_permitidos` | JSON con permisos por módulo (o `*` para superuser) |

---

## Permisos por módulo

Cada módulo de la app requiere un **rol mínimo** y puede tener **permisos granulares**.

### Matriz de permisos

| Módulo | Key | Rol mínimo | Lectura | Escritura | Operaciones especiales |
|--------|-----|-----------|---------|-----------|------------------------|
| **Inicio** | `inicio` | visor | ✓ | - | - |
| **Buscar** | `buscar` | operador | ✓ | - | - |
| **Ficha** | `ficha` | operador | ✓ | ✓ | Editar contacto, registrar gestión |
| **Nuevo ingreso** | `nuevo-ingreso` | operador | - | ✓ | Crear vecino/solicitud |
| **Avance** | `avance` | operador | ✓ | ✓ | Registrar hitos, modificar fechas, cambiar estado |
| **Organizaciones** | `organizacion` | operador | ✓ | ✓ | Crear/editar org, suspender |
| **Socios** | `socios` | operador | ✓ | ✓ | Añadir/editar socios |
| **Beneficios** | `instrumento` | operador | ✓ | ✓ | Gestionar instrumentos, Fondese, eventos |
| **Historial** | `historial` | **superuser** | ✓ | - | Ver logs del sistema |
| **Usuarios** | `usuarios` | **superuser** | ✓ | ✓ | Crear/editar/desactivar usuarios |
| **Configuración** | `configuracion` | **superuser** | ✓ | ✓ | Cambiar config del sistema, ejecutar reset |

### Validación de permisos

**Backend:**

```javascript
// Al inicio de cada función pública
function guardarNuevoIngreso(payload) {
  requireModuleAccess_('nuevo-ingreso', ['operador', 'coordinador', 'superuser']);
  // ... lógica
}
```

**Frontend:**

```javascript
// Scripts.html
function ensureNuevoIngresoView_() {
  const user = GLOBAL_USER_PROFILE;
  if (!canAccessModule_(user, 'nuevo-ingreso', ['operador'])) {
    showError_('No tienes permisos para acceder a este módulo');
    navigateTo_('inicio');
    return;
  }
  // ... renderizar vista
}
```

### Permisos especiales por función

| Función | Roles permitidos | Notas |
|---------|------------------|-------|
| `recalcularFicha({})` (sin IDs) | coordinador, superuser | Rebuild global |
| `goPesRefrescarVistasYMaster()` | coordinador, superuser | Reconstrucción completa |
| `goPesSeedSuperUsers()` | superuser | Inicializar superusers |
| `limpiarDatosPruebaAdmin()` | superuser + PIN | Reset de datos (solo DEV) |
| `deactivateUser()` | superuser + PIN | Desactivar usuario |
| `goPesUpsertFormEvento()` (inscripción abierta) | operador + PIN | Crear evento abierto |

---

## OAuth Scopes

La webapp solicita los siguientes permisos OAuth:

**Definidos en `appsscript.json`:**

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.storage",
    "https://www.googleapis.com/auth/calendar.readonly"
  ]
}
```

| Scope | Propósito | Justificación |
|-------|-----------|---------------|
| `userinfo.email` | Obtener el email del usuario autenticado | **Crítico:** Base de la autenticación. Sin esto no se puede identificar al usuario. |
| `spreadsheets` | Leer y escribir en Google Sheets | **Crítico:** La app usa Sheets como base de datos. Necesita acceso completo al spreadsheet contenedor. |
| `script.storage` | Acceder a PropertiesService y CacheService | **Crítico:** Almacenamiento de PINs, IDs secuenciales, cache de catálogos. |
| `calendar.readonly` | Leer eventos de Google Calendar | **Opcional:** Para mostrar calendario de reuniones en dashboard. No usado actualmente en PROD. |

**Revisión de scopes:**
- ✅ `userinfo.email` — mínimo necesario
- ✅ `spreadsheets` — mínimo necesario (no se puede limitar más)
- ✅ `script.storage` — mínimo necesario
- ⚠️ `calendar.readonly` — actualmente no usado, considerar remover

---

## Exposición de la webapp

### Configuración actual

**DEV:**
```json
{
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "ANYONE"
  }
}
```

**PROD:**
```json
{
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "DOMAIN"  // ← Restringido a providencia.cl
  }
}
```

### executeAs: USER_ACCESSING

**Qué significa:**
- El código se ejecuta con los permisos del **usuario que accede**, no del owner del script
- El usuario debe tener permisos de **al menos Viewer** en el Spreadsheet
- `Session.getActiveUser()` retorna el usuario actual

**Ventajas:**
- ✅ Auditoría clara: cada acción es del usuario real
- ✅ Permisos de Drive controlan el acceso al spreadsheet
- ✅ No hay "cuenta de servicio" con acceso total

**Desventajas:**
- ⚠️ Usuarios necesitan permisos de Editor en el Spreadsheet para escribir
- ⚠️ Si el owner del script pierde acceso, la webapp falla

### access: ANYONE vs DOMAIN

| Configuración | Quién puede acceder | Uso |
|---------------|---------------------|-----|
| `ANYONE` | Cualquier usuario con cuenta Google | **DEV** (cuenta personal fuera del dominio) |
| `DOMAIN` | Solo usuarios de `providencia.cl` | **PROD** (datos reales municipales) |
| `ANYONE_ANONYMOUS` | Cualquiera sin autenticar | **NUNCA** (no hay casos de uso) |

**Regla de oro:** PROD siempre debe ser `DOMAIN` para limitar exposición.

---

## Sistema de PINs

A partir de la auditoría de seguridad (2026-05-31), GO-PES usa PINs de seguridad para operaciones sensibles.

### Arquitectura de PINs

**Módulo:** `SecurityPins.js`

**Storage:** `PropertiesService.getScriptProperties()` con keys:
- `GO_PES_PIN_ADMIN_RESET`
- `GO_PES_PIN_USER_DEACTIVATE`
- `GO_PES_PIN_EVENTO_ABIERTO`

**Formato almacenado:**
```json
{
  "salt": "GO_PES_PIN_ADMIN_RESET_V1_1717200000000",
  "hash": "xUGcfZmxbUgq7J3VGUoJPCj+O5upODLuZTWCHH+zefk="
}
```

**Hash:** SHA-256 + salt único por contexto + timestamp

### Tres contextos de PIN

| Contexto | Key | Uso | Función |
|----------|-----|-----|---------|
| `admin_reset` | `GO_PES_PIN_CONTEXTS.ADMIN_RESET` | Limpieza de datos de prueba (solo DEV) | `limpiarDatosPruebaAdmin()` |
| `user_deactivate` | `GO_PES_PIN_CONTEXTS.USER_DEACTIVATE` | Desactivar usuarios del sistema | `deactivateUser()` |
| `evento_abierto` | `GO_PES_PIN_CONTEXTS.EVENTO_ABIERTO` | Crear eventos con inscripción abierta | `goPesUpsertFormEvento()` |

**Por qué 3 PINs separados:**
- ✅ Separación de privilegios (reset ≠ desactivar ≠ eventos)
- ✅ Rotación independiente
- ✅ Auditoría granular

### Rate limiting

**Límite:** 3 intentos fallidos por usuario por hora

**Implementación:**
```javascript
// SecurityPins.js
const GO_PES_PIN_RATE_LIMIT_MAX_ATTEMPTS = 3;
const GO_PES_PIN_RATE_LIMIT_WINDOW_SECONDS = 3600;  // 1 hora
```

**Storage:** `CacheService.getScriptCache()` con key `pin_attempts_[context]_[email]`

**Comportamiento:**
1. Intento 1 fallido → contador = 1, quedan 2 intentos
2. Intento 2 fallido → contador = 2, queda 1 intento
3. Intento 3 fallido → contador = 3, quedan 0 intentos
4. Intento 4 → **bloqueado** por 1 hora
5. Después de 1 hora → cache expira, contador resetea a 0

**Bypass manual:**
```javascript
// Solo superuser
goPesResetPinRateLimit('admin_reset', 'usuario@providencia.cl')
```

### Configuración de PINs

**Primera vez después de deploy:**

```javascript
// Desde el editor de Apps Script
goPesConfigurePinDeSeguridad('admin_reset', 'PIN_FUERTE_1')
goPesConfigurePinDeSeguridad('user_deactivate', 'PIN_FUERTE_2')
goPesConfigurePinDeSeguridad('evento_abierto', 'PIN_FUERTE_3')

// Verificar
goPesIsPinConfigured('admin_reset')  // → {configured: true}
```

**Rotación (cada 90 días recomendado):**

```javascript
// Cambiar PIN (el anterior queda invalidado inmediatamente)
goPesConfigurePinDeSeguridad('admin_reset', 'NUEVO_PIN')
```

### Logging de PINs

Todos los intentos de validación de PIN se loguean:

**Éxito:**
```javascript
logProcessing_('INFO', 'goPesValidatePin', 'security_pin', 'admin_reset', email, 'OK', {...})
```

**Fallo:**
```javascript
logProcessing_('WARN', 'goPesValidatePin', 'security_pin', 'admin_reset', email, 'INVALID_PIN', {
  attempts: 2,
  remaining: 1
})
```

**Rate limit excedido:**
```javascript
logProcessing_('WARN', 'goPesValidatePin', 'security_pin', 'admin_reset', email, 'RATE_LIMIT', {
  attempts: 3
})
```

---

## Superusuarios

### Lista de superusers

**Definidos en:** `Main.js` → `GO_PES_V2.SUPERUSERS`

```javascript
const GO_PES_V2 = {
  SUPERUSERS: [
    'pablo.ramos@providencia.cl',  // Superuser PROD
    'p.e.ramos.ramos@gmail.com'    // Superuser DEV (fuera del dominio)
  ],
  TRUSTED_DOMAINS: ['providencia.cl']
};
```

### Privilegios de superuser

Los superusers tienen bypass de varias validaciones:

1. **Auto-provisión:** Se crean automáticamente en `DIM_Usuarios` en el primer login
2. **Bypass de dominio:** La cuenta Gmail personal puede acceder a DEV aunque no sea del dominio confiable
3. **Acceso total:** `modulos_permitidos = '*'`
4. **No se pueden desactivar:** `deactivateUser()` rechaza desactivar superusers configurados

### Gestión de superusers

**Inicializar (primera vez):**

Desde el **Spreadsheet** → Menú GO-PES v2 → **Inicializar superUsers**

O desde el editor:
```javascript
goPesSeedSuperUsers()
```

**Añadir un nuevo superuser:**

1. Agregar email a `GO_PES_V2.SUPERUSERS` en `Main.js`
2. `clasp push`
3. Ejecutar `goPesSeedSuperUsers()` desde el editor
4. El usuario aparece en `DIM_Usuarios` con `perfil = 'superuser'` y `superuser_flag = true`

**⚠️ Decisión de diseño:**

La lista de superusers está hardcodeada en `Main.js` en lugar de estar en `CFG_Parametros`. Esto es **intencional**:
- ✅ No se puede modificar desde la UI (protección contra escalada de privilegios)
- ✅ Requiere acceso al código + deploy para cambiar
- ⚠️ Consideración futura: mover a `CFG_Parametros` protegido con validación adicional

---

## Auditoría de seguridad

### Auditoría realizada (2026-05-31)

Se completó una auditoría de seguridad exhaustiva con los siguientes hallazgos:

| # | Hallazgo | Criticidad | Estado |
|---|----------|-----------|--------|
| 1 | Funciones mutantes sin auth guard | 🔴 CRÍTICA | ✅ CERRADO |
| 2 | Bypass autorización en recalcularFicha() | 🔴 CRÍTICA | ✅ CERRADO |
| 3 | Cuenta Gmail hardcodeada | 🔴 CRÍTICA | 🟡 EXCLUIDO (diseño DEV) |
| 4 | WebApp access: ANYONE | 🟠 ALTA | 🟡 EXCLUIDO (diseño DEV) |
| 5 | PIN compartido embebido | 🟠 ALTA | ✅ CERRADO |
| 6 | Historial expone telemetría | 🟠 ALTA | ✅ CERRADO |
| 7 | Spreadsheet ID hardcodeado | 🟡 MEDIO | ✅ CERRADO |

**Commits de corrección:**
- `4feef30` — Auth guards en funciones mutantes
- `0e1ec52` — Sistema de PINs externalizado
- `5100b5e` — Historial + migración
- `3b2a014` — Tests de seguridad

**Blast radius reducido:**
- ❌ **Antes:** Cualquier usuario autenticado → operaciones destructivas
- ✅ **Después:** Solo coordinador/superuser + PINs + rate limiting

---

## Riesgos conocidos

### Riesgos aceptados

| Riesgo | Probabilidad | Impacto | Mitigación | Estado |
|--------|--------------|---------|------------|--------|
| **Cuenta Gmail en superusers** | Baja | Alto | Solo para DEV, no en PROD | Aceptado |
| **DEV con access: ANYONE** | Media | Medio | Datos de prueba, no producción | Aceptado |
| **Sin MFA obligatorio** | Media | Alto | Depende de configuración personal de Google | Aceptado (limitación de Apps Script) |
| **Superusers hardcodeados** | Baja | Medio | Requiere acceso al código para modificar | Aceptado (por ahora) |

### Riesgos a monitorear

| Riesgo | Señal de alarma | Acción |
|--------|-----------------|--------|
| **Exceso de intentos de PIN** | >10 intentos fallidos/día en logs | Investigar cuenta afectada, resetear PIN |
| **Múltiples logins fallidos** | Logs de acceso denegado recurrentes | Revisar `LOG_Accesos`, contactar usuario |
| **Ejecuciones anómalas** | Ejecuciones nocturnas no programadas | Revisar Editor → Executions, auditar cambios |
| **Spreadsheet compartido públicamente** | Permisos de Drive cambiados | Alertar a administrador, revocar permisos |

### Riesgos mitigados

| Riesgo (antes) | Cómo se mitigó |
|----------------|----------------|
| Bypass de autorización | Auth guards en todas las funciones mutantes |
| PIN en código fuente | Externalizado a PropertiesService con rate limiting |
| Operadores viendo logs completos | Módulo Historial restringido a superuser |
| ID de migración expuesto | ✅ RESUELTO (2026-07-10): ZZ_MigracionHitos.js eliminado, Phase1/2 privatizadas |

---

## Mejores prácticas

### Para desarrolladores

1. **Toda función pública debe tener auth guard:**
   ```javascript
   function miFuncionPublica(payload) {
     requireModuleAccess_('modulo', ['operador', 'coordinador', 'superuser']);
     // ... lógica
   }
   ```

2. **Usar LockService para escrituras críticas:**
   ```javascript
   const lock = LockService.getDocumentLock();
   lock.waitLock(30000);
   try {
     // Operación crítica
   } finally {
     lock.releaseLock();
   }
   ```

3. **Loguear acciones sensibles:**
   ```javascript
   logUserAction_('ACCION', 'entidad', entityId, 'OK', detailJson);
   ```

4. **Nunca hardcodear credenciales:**
   - ❌ `const PASSWORD = 'mi-password';`
   - ✅ `const hash = PropertiesService.getScriptProperties().getProperty('KEY');`

5. **Validar input del usuario:**
   ```javascript
   const email = String(payload.email || '').trim();
   if (!isValidEmail_(email)) {
     throw new Error('Email inválido');
   }
   ```

### Para administradores

1. **Rotar PINs cada 90 días:**
   ```javascript
   goPesConfigurePinDeSeguridad('admin_reset', 'NUEVO_PIN')
   ```

2. **Revisar usuarios inactivos trimestralmente:**
   - Abrir módulo Usuarios
   - Filtrar por última actividad >6 meses
   - Desactivar cuentas no usadas

3. **Monitorear logs de seguridad semanalmente:**
   - Abrir `LOG_Procesamiento`
   - Filtrar por `nivel = 'WARN'` y `accion LIKE '%Pin%'`
   - Revisar intentos fallidos

4. **Backup antes de operaciones destructivas:**
   - Antes de reset de datos
   - Antes de deploy PROD
   - Antes de desactivar usuarios masivamente

5. **Validar permisos del Spreadsheet:**
   - Solo usuarios activos del equipo deben tener acceso
   - Rol mínimo: Viewer (Editor para operadores)
   - Sin compartir públicamente (link anyone)

---

**Última actualización:** 2026-05-31  
**Versión:** 1.0  
**Próxima revisión:** Trimestral o ante cambios en modelo de permisos/autenticación
