---
name: go-pes-dashboard-access
description: >-
  Skill de seguridad del dashboard de KPIs de GO-PES (app Apps Script de solo
  lectura que consume PROD, con datos personales de vecinos de un programa
  municipal). Hace cumplir control de acceso en defensa en profundidad
  (despliegue Web App "Ejecutar como propietario" + acceso restringido al dominio
  providencia.cl, MÁS un allowlist en código por correo/rol reutilizando los roles
  de GO-PES, denegar por defecto), privacidad por diseño (solo KPIs agregados;
  nunca filas crudas con nombre, RUT/run_socio o teléfono; detalle individual
  prohibido salvo rol explícito) y auditoría (registrar cada acceso email +
  timestamp con el patrón LOG_Accesos, sin romper la regla de solo lectura sobre
  PROD). Úsala SIEMPRE que trabajes en autenticación, autorización, control de
  acceso o exposición de datos del dashboard: "quién puede ver el dashboard",
  "restringir acceso", "allowlist del dashboard", "auth del dashboard", "roles en
  el dashboard", "no mostrar PII", "ocultar RUT/teléfonos", "auditar accesos",
  "registrar quién vio el dashboard", "denegar por defecto", aunque no se nombre
  la palabra "skill". Complementa a `go-pes-appsscript-dashboard` (construcción) y
  `go-pes-dashboard-cache` (frescura). NO es para el control de acceso de la app
  principal de GO-PES (eso es `go-pes-seguridad`).
---

# go-pes-dashboard-access — Seguridad del dashboard de KPIs

Este dashboard lee el Spreadsheet de PROD de GO-PES, que contiene **datos
personales de vecinos** de un programa municipal: nombres, **RUT/`run_socio`**,
teléfonos, direcciones. Que sea "solo un dashboard" no baja el estándar: expone
datos sensibles de personas reales. Esta skill impone las tres capas —**quién
entra**, **qué se muestra**, **qué queda registrado**— y explica el porqué de cada
una para que las decisiones se tomen bien, no por receta.

Complementa a `go-pes-appsscript-dashboard` (cómo se construye) y
`go-pes-dashboard-cache` (frescura del dato). Aquí solo va seguridad y privacidad.

## Las 3 capas (y por qué cada una)

Ninguna capa basta sola. El ajuste de despliegue puede aflojarse por error; el
código puede desplegarse mal; por eso se refuerzan entre sí (**defensa en
profundidad**). Y como el peor daño aquí es filtrar PII de vecinos, el default es
siempre **negar y no mostrar**, nunca "mostrar salvo que se prohíba".

---

## Capa 1 — CONTROL DE ACCESO (defensa en profundidad)

### 1a. Despliegue del Web App (primer muro, fuera del código)

Al crear/actualizar el despliegue:

- **Ejecutar como: Yo (propietario).** El propietario tiene lectura sobre PROD; los
  visores no necesitan permiso directo sobre el Spreadsheet. Esto también mantiene
  el acceso a PROD por una sola identidad controlada (mínimo privilegio).
- **Quién tiene acceso: usuarios de `providencia.cl`** (no "cualquiera con el
  enlace"). Es el perímetro del dominio municipal. Google exige sesión del dominio
  y sirve HTTPS.

Esto **no** es suficiente: "todo el dominio" es mucho más que el equipo PES. Por
eso existe la capa 1b.

### 1b. Allowlist en código (segundo muro, dentro del backend)

El dominio deja entrar a toda la Municipalidad; el dashboard solo debe verlo el
**equipo del programa PES**. Reutiliza los roles de GO-PES leyendo `DIM_Usuarios`
desde PROD (misma fuente de verdad que la app principal: roles
`visor < operador < coordinador < superuser`), y exige además pertenencia al
equipo PES.

```javascript
/** Resuelve el usuario actual contra los roles de GO-PES en PROD (solo lectura). */
function getDashboardUser_() {
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); }
  catch (e) { email = ''; }

  if (!email) return { email: '', canView: false, reason: 'Correo no disponible.' };

  // Reutiliza DIM_Usuarios de GO-PES (leída de PROD). Espejo de getUsuarioActual().
  var v = readSheet_('DIM_Usuarios');              // helper solo-lectura del dashboard
  requireColumns_('DIM_Usuarios', v.headers, ['email', 'perfil', 'activo_flag']);
  var row = v.rows.find(function(r) {
    return String(r.email || '').trim().toLowerCase() === email;
  });

  if (!row || !toBool_(row.activo_flag)) {
    return { email: email, canView: false, reason: 'Usuario no activo en DIM_Usuarios.' };
  }

  var perfil = normalizeRole_(row.perfil);          // visor|operador|coordinador|superuser
  var cfg = getAccessConfig_();
  // Equipo PES: por rol permitido Y (si se usa) allowlist explícita de correos.
  var rolOk   = cfg.allowedRoles.indexOf(perfil) !== -1;
  var mailOk  = !cfg.emailAllowlist.length || cfg.emailAllowlist.indexOf(email) !== -1;

  return {
    email: email,
    perfil: perfil,
    canView: rolOk && mailOk,
    reason: (rolOk && mailOk) ? '' : 'Fuera del equipo autorizado del dashboard.'
  };
}
```

`getAccessConfig_()` lee la política de **Script Properties** (nada hardcodeado):

```javascript
function getAccessConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    allowedDomain:  (p.getProperty('ALLOWED_DOMAIN') || 'providencia.cl').replace(/^@+/, ''),
    allowedRoles:   (p.getProperty('ALLOWED_ROLES') || 'visor,operador,coordinador,superuser')
                      .split(',').map(function(s){ return normalizeRole_(s.trim()); }),
    emailAllowlist: (p.getProperty('EMAIL_ALLOWLIST') || '')   // vacío = solo filtra por rol
                      .split(',').map(function(s){ return s.trim().toLowerCase(); })
                      .filter(Boolean)
  };
}
```

### 1c. Denegar por defecto

Toda función pública que sirva datos **empieza** verificando acceso; si no,
devuelve un estado denegado **sin datos** y registra el intento. Nunca "por si
acaso" muestres algo.

```javascript
function getKpisData() {
  var u = getDashboardUser_();
  if (!u.canView) {
    logDashboardAccess_('ACCESS_DENIED', u.email, { reason: u.reason });
    return JSON.stringify({ ok: false, denied: true }); // sin KPIs, sin PII
  }
  logDashboardAccess_('VIEW_DASHBOARD', u.email, {});
  return JSON.stringify(readSnapshotForClient_());     // solo agregados (capa 2)
}
```

**Regla:** el chequeo de acceso es la **primera línea** de cada endpoint público,
igual que el `requireRole_` de GO-PES va en la primera línea de cada función. Un
endpoint que sirve datos sin pasar por `getDashboardUser_()` es un agujero.

---

## Capa 2 — PROTECCIÓN DE PII (privacidad por diseño)

### 2a. Solo agregados salen del servidor

El dashboard muestra **conteos, porcentajes y series** — nada más. La PII **no
debe salir del backend**: filtrar en el frontend no cuenta, porque el dato ya
viajó. El payload que devuelve el servidor no contiene nombres, RUT/`run_socio`,
teléfonos ni direcciones.

```javascript
// BIEN — agregado: cuántos, no quiénes.
{ porEstado: [{ label: 'Constituida', count: 42 }], totalSocios: 1380 }

// MAL — fila cruda con PII. NUNCA construir ni devolver esto en el dashboard.
{ socios: [{ nombre: 'Juana Pérez', run_socio: '12.345.678-9', telefono: '+569…' }] }
```

Al escribir un KPI nuevo: **agrega en el servidor** (cuenta/agrupa) y devuelve solo
el resultado. Si te encuentras arrastrando `nombre`/`run_socio`/`telefono` en el
objeto de respuesta "para después", elimínalos antes de serializar.

### 2b. Detalle individual: prohibido por defecto

Cualquier vista a nivel de persona (una tabla de socios, un buscador por RUT, un
"ver ficha") está **prohibida por defecto** en este dashboard. Si en el futuro se
justifica una excepción puntual, debe cumplir **todo** esto, no una parte:

1. **Rol explícito** que lo habilite (p. ej. `coordinador`+), verificado con el
   allowlist de la capa 1 — no basta con estar en el dominio.
2. **Justificación documentada** del caso de uso (qué campo, para qué, por qué el
   agregado no alcanza).
3. **Minimización:** exponer el mínimo campo necesario, nunca el registro completo.
4. **Auditoría reforzada:** registrar el acceso al detalle individual (capa 3) con
   el identificador consultado.

Mientras no exista esa excepción aprobada, el dashboard no tiene endpoints que
devuelvan filas de personas. Punto.

---

## Capa 3 — AUDITORÍA (quién vio qué y cuándo)

Poder responder "¿quién accedió al dashboard y cuándo?" es un requisito, no un
extra: son datos de personas bajo responsabilidad municipal.

### La tensión con "solo lectura" — y cómo se resuelve

El dashboard es de **solo lectura sobre los datos de negocio de PROD** (jamás
muta hitos, socios, organizaciones). Pero auditar exige **escribir** un registro
de acceso. Se reconcilia así: el log de auditoría **no va a las hojas de negocio
de PROD**, va a un **destino de log propio del dashboard** (una hoja/Spreadsheet
de logs cuyo ID vive en Script Properties). Se conserva el esquema de
`LOG_Accesos` de GO-PES (`timestamp, event, email, payload_json`) para que sea
familiar y consultable igual, sin tocar los datos de vecinos.

```javascript
/** Append-only a un Spreadsheet de LOGS propio (no a las hojas de negocio de PROD). */
function logDashboardAccess_(event, email, payload) {
  try {
    var logId = PropertiesService.getScriptProperties().getProperty('LOG_SPREADSHEET_ID');
    if (!logId) return;                       // sin destino de log configurado: no romper
    var sh = SpreadsheetApp.openById(logId).getSheetByName('LOG_Accesos');
    if (!sh) return;
    sh.appendRow([ new Date(), event, email || '', payload ? JSON.stringify(payload) : '' ]);
  } catch (e) {
    // La auditoría es best-effort: un fallo de log no debe tumbar el dashboard,
    // pero SÍ debe quedar en el log de ejecución de Apps Script.
    console.error('[dashboard] fallo al auditar acceso: ' + e);
  }
}
```

Eventos mínimos a registrar: `VIEW_DASHBOARD` (acceso concedido) y `ACCESS_DENIED`
(intento rechazado, con el motivo). Si algún día se habilita detalle individual
(capa 2b), añade un evento propio con el identificador consultado.

**Por qué append-only y en store aparte:** un log que la propia app puede reescribir
no sirve como evidencia; y mantenerlo fuera de las hojas de negocio preserva la
garantía de solo lectura sobre los datos de los vecinos.

---

## Checklist al tocar auth / autorización / exposición de datos

- [ ] Despliegue: "Ejecutar como propietario" + acceso restringido a `providencia.cl`.
- [ ] Cada endpoint público llama `getDashboardUser_()` en su **primera línea**.
- [ ] Acceso = dominio **y** rol/allowlist del equipo PES (no solo dominio).
- [ ] Denegar por defecto: sin acceso → `{ denied: true }`, cero datos.
- [ ] El payload que sale del servidor tiene **solo agregados**; grep de `run_socio`,
      `rut`, `nombre`, `telefono`, `direccion` en la respuesta → deben estar ausentes.
- [ ] Sin endpoints que devuelvan filas de personas (salvo excepción con rol +
      justificación + minimización + auditoría reforzada).
- [ ] Cada acceso concedido y denegado se registra con `logDashboardAccess_`.
- [ ] El log va al Spreadsheet de LOGS (ID en Script Properties), no a hojas de PROD.
- [ ] Toda política (dominio, roles, allowlist, IDs) viene de Script Properties, no del código.

## Diagnóstico (correr desde el editor)

```javascript
function diagnosticoAccesoDashboard() {
  Logger.log('Config acceso: ' + JSON.stringify(getAccessConfig_()));
  var u = getDashboardUser_();
  Logger.log('Usuario actual: ' + JSON.stringify(u));   // ¿canView correcto?
  Logger.log('LOG_SPREADSHEET_ID set: ' +
    !!PropertiesService.getScriptProperties().getProperty('LOG_SPREADSHEET_ID'));
  return { ok: true };
}
```

## Cuándo NO usar esta skill

- Control de acceso de la **app principal** de GO-PES (guards `requireRole_` /
  `requireModuleAccess_`, PINs) → `go-pes-seguridad`.
- Construir el dashboard o agregar KPIs → `go-pes-appsscript-dashboard`.
- Cache/frescura del dashboard → `go-pes-dashboard-cache`.
- Cualquier cosa que escriba en los **datos de negocio** de PROD → este dashboard
  es de solo lectura; el único write permitido es el log de auditoría en su store aparte.
