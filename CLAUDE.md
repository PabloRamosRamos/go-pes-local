# GO-PES v2 — Gestor Operativo PES

## Descripción del proyecto

GO-PES (Gestor Operativo del Programa Estamos Seguros) es una aplicación web interna de la **Municipalidad de Providencia, Chile**, construida sobre **Google Apps Script**. Su propósito es gestionar el programa social "Estamos Seguros": registro de vecinos, seguimiento de casos, organizaciones comunitarias, beneficios e instrumentos de apoyo.

La aplicación corre embebida dentro de un Google Spreadsheet y se despliega como Web App de Google Apps Script. El spreadsheet actúa como base de datos (hojas = tablas).

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Google Apps Script (V8) |
| Base de datos | Google Sheets (hojas estructuradas como tablas) |
| Frontend | HTML5 + CSS3 + Vanilla JS (sin framework) |
| Templating | `HtmlService.createTemplateFromFile()` |
| Auth | Google OAuth (sesión del usuario de Google) |
| Hosting | Google Apps Script Web App deployment |
| Herramientas locales | clasp (CLI de Google Apps Script) |
| Zona horaria | America/Santiago |

No hay npm, bundler, ni servidor externo. Todo es JavaScript puro que corre en el runtime de Google.

## Cómo correr el proyecto en local

### Pre-requisitos

1. Tener `clasp` instalado: `npm install -g @google/clasp`
2. Estar autenticado: `clasp login`
3. Tener acceso al Google Spreadsheet contenedor del proyecto

### Despliegue

```bash
# Desde la carpeta go-pes-local/
cd go-pes-local

# Subir cambios al proyecto de Apps Script
clasp push

# Abrir el editor online de Apps Script (para deployments)
clasp open

# Ver logs en tiempo real
clasp logs --watch
```

### Configuración inicial del spreadsheet

Desde el menú "GO-PES v2" dentro del spreadsheet:
1. **Configurar motor operativo** → crea todas las hojas necesarias y siembra catálogos base
2. **Inicializar superUsers** → configura el superusuario inicial (`pablo.ramos@providencia.cl`)
3. **Abrir Gestor Operativo** → abre la Web App en nueva pestaña

### Deployment de la Web App

Desde el editor online de Apps Script:
1. Desplegar → Nueva implementación
2. Tipo: Aplicación web
3. Ejecutar como: Usuario que accede a la aplicación
4. Quién tiene acceso: Cualquier usuario de Google (o ajustar según necesidad)

## Estructura de carpetas

```
GO Provi/
├── CLAUDE.md               ← Este archivo
└── go-pes-local/           ← Código fuente del proyecto Apps Script
    ├── appsscript.json     ← Manifiesto del proyecto (runtime, timezone, webapp config)
    │
    ├── — BOOTSTRAP —
    ├── Main.js             ← Constante GO_PES_V2, doGet(), onOpen(), bootstrap
    │
    ├── — INFRAESTRUCTURA —
    ├── Auth.js             ← Autenticación, gestión de usuarios, permisos por módulo
    ├── SecurityPins.js     ← Gestión de PINs de seguridad con rate limiting (PropertiesService)
    ├── Repository.js       ← Capa de acceso a hojas + cache en memoria (GO_PES_RUNTIME)
    ├── Validators.js       ← Helpers de validación de datos
    ├── Diagnostics.js      ← Trazas de diagnóstico activables/desactivables
    ├── SystemConfig.js     ← Configuración del sistema (persiste en CFG_Parametros)
    ├── DerivedBuilders.js  ← Reconstrucción de vistas derivadas y dimensiones
    │
    ├── — LÓGICA DE NEGOCIO —
    ├── Services.js         ← Servicios de dominio principales
    ├── Catalogs.js         ← Gestión de catálogos (DIM_*)
    ├── NuevoIngreso.js     ← Módulo de ingreso de nuevos vecinos/solicitudes
    ├── ZZ_AvanceBackend.js ← Módulo de avance/seguimiento de hitos
    ├── ZZ_AvancePhase1.js  ← Fase 1 del avance
    ├── ZZ_AvancePhase2.js  ← Fase 2 del avance
    ├── ZZ_BeneficiosBackend.js     ← Módulo de beneficios e instrumentos
    ├── ZZ_OrganizacionesBackend.js ← Módulo de organizaciones comunitarias
    ├── ZZ_SociosBackend.js         ← Módulo de socios/miembros
    ├── ZZ_AdminDataReset.js ← Utilidades de administración y reset
    │
    ├── — FRONTEND (HTML/CSS/JS) —
    ├── Index.html              ← Template principal (incluye todos los parciales)
    ├── Styles.html             ← CSS global (~154 KB)
    ├── ThemeDark.html          ← CSS del tema oscuro
    ├── Scripts.html            ← Core JS: constantes, init, routing, catalogs, utils (~1.757 líneas)
    ├── Scripts_Inicio.html     ← Módulo Inicio (renderQuickActions, renderHomeTiles)
    ├── Scripts_Ficha.html      ← Módulo Ficha (renderFicha, fichaBlock)
    ├── Scripts_NuevoIngreso.html ← Módulo Nuevo Ingreso + formulario organización
    ├── Scripts_Organizaciones.html ← Módulo Organizaciones
    ├── Scripts_Beneficios.html ← Módulo Beneficios/Instrumentos (~1.700 líneas)
    ├── Scripts_Socios.html     ← Módulo Socios (~714 líneas)
    ├── Scripts_Avance.html     ← Módulo Avance (~853 líneas)
    ├── Scripts_Admin.html      ← Módulos Usuarios + Configuración (~1.697 líneas)
    ├── Splash.html             ← Pantalla de splash inicial
    ├── Loading.html            ← Pantalla de carga
    ├── Inicio.html             ← HTML estático del módulo Inicio/Home
    ├── Assets.js               ← Data URIs de logos e imágenes (base64)
    │
    └── — DEBUG/QA —
        └── Audith.js       ← Runner de tests automatizados + funciones de debug manual
```

## Módulos (vistas del frontend)

| Módulo | Vista | Rol mínimo | Descripción |
|--------|-------|-----------|-------------|
| Inicio | `inicio` | visor | Dashboard principal |
| Nuevo ingreso | `nuevo-ingreso` | operador | Registro de nuevos vecinos |
| Buscar | `buscar` | operador | Búsqueda de vecinos/solicitudes |
| Ficha | `ficha` | operador | Detalle de un vecino/caso |
| Avance | `avance` | operador | Seguimiento de hitos y progreso |
| Organizaciones | `organizacion` | operador | Gestión de organizaciones comunitarias |
| Socios | `socios` | operador | Gestión de socios/miembros |
| Beneficios | `instrumento` | operador | Instrumentos y beneficios |
| Historial | `historial` | operador | Historial de acciones |
| Usuarios | `usuarios` | superuser | Gestión de usuarios del sistema |
| Configuración | `configuracion` | superuser | Configuración de la aplicación |

## Roles del sistema

`visor` < `operador` < `coordinador` < `superuser`

## Hojas del Spreadsheet (base de datos)

### Datos RAW (entrada)
- `RAW_Formulario_Ingreso` — Formularios de ingreso de vecinos
- `RAW_Gestion_Casos` — Historial de gestión de casos
- `RAW_Organizaciones`, `RAW_Instrumentos`, `RAW_Requisitos_Instrumento`, `RAW_Socios`

### Maestros (MAE) y Hechos (FACT)
- `MAE_Casos`, `MAE_Organizaciones` — Registros maestros
- `FACT_Hitos`, `FACT_Instrumentos_Organizacion`, `FACT_Requisitos_Instrumento`
- `FACT_Socios`, `FACT_Beneficios_*`, `FACT_AVANCE_*`

### Dimensiones (DIM) — Catálogos
- `DIM_Usuarios`, `DIM_Territorio`, `DIM_Estados`, `DIM_Etapas_Constitucion`
- `DIM_Origen_Canal`, `DIM_Beneficios`, `DIM_Instrumentos`, `DIM_Responsables`
- `DIM_Cargos_Socios`, `DIM_*_Sugeridos` (autocomplete)

### Configuración y Logs
- `CFG_Parametros` — Configuración del sistema (JSON serializado)
- `LOG_Procesamiento`, `LOG_Accesos`, `LOG_Acciones_Usuario`

### Vistas derivadas (VW)
- `VW_LS_Organizaciones`, `VW_LS_Instrumentos`, `VW_LS_Territorial`, `MASTER_DATOS`

## Convenciones de código

1. **Funciones privadas con guión bajo**: todas las funciones internas usan sufijo `_` (ej: `getUsuario_()`)
2. **Funciones públicas (API cliente)**: sin guión bajo, son las que llama el frontend
3. **Prefijo módulo**: archivos `ZZ_*` son módulos de negocio tardíos/secundarios
4. **Serialización**: todas las respuestas al cliente pasan por `serializeForClient_()`
5. **Cache**: usar `GO_PES_RUNTIME` para datos de ejecución frecuente; invalidar explícitamente
6. **Roles**: validar con `requireRole_(minRole)` y `requireModuleAccess_(moduleKey)` al inicio de cada función pública
7. **Constante global**: `GO_PES_V2` en `Main.js` es la fuente de verdad para sheets, vistas, roles y colores
8. **Sin frameworks**: vanilla JS en frontend; no agregar librerías externas sin evaluar el impacto de carga

## Comunicación frontend ↔ backend

El frontend usa la API nativa de Google Apps Script:

```javascript
// Llamada asíncrona desde el cliente
google.script.run
  .withSuccessHandler(function(result) { ... })
  .withFailureHandler(function(error) { ... })
  .nombreDeFuncionPublica(payload);
```

No hay REST API, no hay URL configurable. Todas las funciones públicas del backend son automáticamente accesibles desde el cliente.

## Entornos

| Entorno | Script ID | Cuenta | Archivo config | Estado |
|---------|-----------|--------|---------------|--------|
| DEV | `12ZfNLyF...` | p.e.ramos.ramos@gmail.com | `.clasp.json` / `.clasp.dev.json` | Desarrollo y pruebas |
| PROD | `10Lzrg2G...` | pablo.ramos@providencia.cl | `.clasp.prod.json` | **Activo — datos reales** |

El flujo de trabajo es: desarrollar y verificar en DEV → ejecutar batería de tests → push a PROD.

> **`appsscript.json` — access: "ANYONE" es intencional en DEV.** La cuenta de desarrollo (`p.e.ramos.ramos@gmail.com`) está fuera del dominio `providencia.cl`, por lo que el acceso debe quedar abierto para poder desarrollar y probar sin restricciones de dominio. **Al hacer deploy a PROD, cambiar a `"DOMAIN"` para restringir el acceso solo a cuentas `@providencia.cl`.**

### Comandos de deploy

```powershell
# Desde la raíz del proyecto:
.\push-dev.ps1    # → DEV (cuenta personal, spreadsheet de prueba)
.\push-prod.ps1   # → PROD (pide confirmación: escribir 'prod')
```

### Autenticar cuentas (primera vez)

```powershell
clasp -u dev login --no-localhost   # → p.e.ramos.ramos@gmail.com
clasp -u prod login --no-localhost  # → pablo.ramos@providencia.cl
```

### Configuración de PINs de seguridad (primera vez después de deploy)

El sistema usa PINs separados por contexto almacenados en `PropertiesService`. Después de hacer deploy a un entorno nuevo (o después de actualizar a la versión con `SecurityPins.js`), configurar los 3 PINs ejecutando desde el editor de Apps Script:

```javascript
// Ejecutar una sola vez después de deploy
goPesConfigurePinDeSeguridad('admin_reset', 'PIN_PARA_RESET_DATOS')
goPesConfigurePinDeSeguridad('user_deactivate', 'PIN_PARA_DESACTIVAR_USUARIOS')
goPesConfigurePinDeSeguridad('evento_abierto', 'PIN_PARA_EVENTOS_ABIERTOS')
```

**Contextos de PIN:**
- `admin_reset` — Limpieza de datos de prueba (módulo Configuración)
- `user_deactivate` — Desactivar usuarios del sistema (módulo Usuarios)
- `evento_abierto` — Crear eventos de formación con inscripción abierta (módulo Beneficios)

**Seguridad implementada:**
- Rate limiting: 3 intentos por usuario por hora
- Logs automáticos de intentos fallidos en `LOG_Procesamiento`
- Almacenamiento hasheado (SHA-256 + salt único por contexto)

**Funciones de utilidad:**
```javascript
// Verificar si un PIN está configurado
goPesIsPinConfigured('admin_reset')

// Resetear rate limit de un usuario (solo emergencias)
goPesResetPinRateLimit('admin_reset', 'usuario@providencia.cl')
```

## Auditoría de seguridad (2026-05-31)

Se completó una auditoría de seguridad exhaustiva del sistema con los siguientes resultados:

### **Hallazgos críticos cerrados: 5 de 7**

| # | Hallazgo | Criticidad | Estado | Commits |
|---|----------|-----------|--------|---------|
| 1 | Funciones mutantes sin auth guard | 🔴 CRÍTICA | ✅ CERRADO | `4feef30` |
| 2 | Bypass autorización en recalcularFicha() | 🔴 CRÍTICA | ✅ CERRADO | `4feef30` |
| 3 | Cuenta Gmail hardcodeada fuera del dominio | 🔴 CRÍTICA | 🟡 EXCLUIDO | Mantenida para DEV |
| 4 | WebApp access: ANYONE | 🟠 ALTA | 🟡 EXCLUIDO | Mantenida para DEV |
| 5 | PIN compartido embebido en código | 🟠 ALTA | ✅ CERRADO | `0e1ec52` |
| 6 | Historial expone telemetría sensible | 🟠 ALTA | ✅ CERRADO | `5100b5e` |
| 7 | Spreadsheet ID hardcodeado | 🟡 MEDIO | ✅ CERRADO | `5100b5e` |

### **Cambios implementados**

**Commit `4feef30` — Auth guards en funciones mutantes:**
- `recalcularFicha({})` ahora requiere coordinador/superuser para rebuild global
- `goPesRefrescarVistasYMaster()` protegida con requireRole_
- `goPesSeedSuperUsers()` renombrada y protegida

**Commit `0e1ec52` — Sistema de PINs externalizado:**
- Nuevo módulo `SecurityPins.js` con gestión centralizada
- Tres contextos independientes con PINs separados
- Rate limiting: 3 intentos/usuario/hora
- Credenciales en PropertiesService (no en código fuente)
- Logs automáticos de intentos fallidos

**Commit `5100b5e` — Historial + migración:**
- Módulo Historial restringido a solo superuser
- Spreadsheet ID de migración externalizado a PropertiesService

### **Blast radius reducido**
**Antes:** Cualquier usuario autenticado podía ejecutar operaciones destructivas  
**Después:** Solo coordinador/superuser según operación, con PINs externalizados y rate limiting

### **Tests de seguridad**
Suite de tests automatizados en `Audith.js` cubre:
- Auth guards de funciones mutantes
- Validación de PINs con rate limiting
- Configuración de contextos de seguridad
- Acceso al módulo Historial

## Estadísticas del proyecto

**Ver [`docs/dev-stats.md`](../docs/dev-stats.md) para estadísticas completas de desarrollo.**

| Métrica | Valor |
|---------|-------|
| **Archivos de código** | 44 (22 JS + 22 HTML) |
| **Líneas de código** | ~33.326 |
| **Tests automatizados** | 262 (0 fallos) |
| **Cobertura estimada** | ~78% |
| **Módulos funcionales** | 11 |
| **Hojas de base de datos** | 35+ |
| **Estado general** | ✅ **PRODUCCIÓN ESTABLE** |

## Tareas pendientes

- [x] Manual de usuario implementado en `Manual.html` (accesible desde menú de usuario → Manual). Cubre todos los módulos, roles, FAQ y glosario.
- [x] `Scripts.html` dividido en 8 parciales por módulo (Fase 5 completada)
- [x] Tests automatizados implementados en `Audith.js` (262 tests, 0 fallos, verificados en DEV y PROD)
- [x] Auditoría de seguridad completada (5 de 7 hallazgos cerrados, 2 excluidos por diseño DEV)
- [x] Plan de mejora frontend completado (5/5 fases: A11y, Consolidación CSS, Modularización JS, Responsive, Design System). Ver [`docs/design-system.md`](../docs/design-system.md) y [`docs/frontend-plan-resumen.md`](../docs/frontend-plan-resumen.md).
- [x] Sistema de transiciones UX implementado (3 fases: modales, vistas, stagger). Ver [`docs/design-system.md`](../docs/design-system.md) sección "Transiciones y Animaciones".
- [x] Eliminar 3 funciones duplicadas en `Scripts_Beneficios.html` — Ya completado en commits anteriores (verificado 2026-06-01: solo existe 1 definición de cada función)
- [ ] Superusuario y dominios confiables hardcodeados en Main.js — evaluar moverlos a CFG_Parametros (bajo, solo convenios de configuración)
- [ ] Añadir `data-label` attributes a tablas dinámicas de `Scripts_*.html` para card layout responsive (incremental, baja prioridad)

## Historial de cambios significativos

- **2026-06-01 (UX — Normalización de mensajes técnicos)** — Implementado sistema de traducción de errores técnicos a mensajes operativos en dos capas: **(1) Capa central:** función `normalizeUserMessage_()` en `Scripts_UI.html` que intercepta todos los errores en `showError()` antes de mostrarlos. Mapea ~15 mensajes técnicos exactos (ej: "Usuario no registrado en DIM_Usuarios" → "Tu usuario no tiene acceso habilitado"), detecta patrones ("Falta el campo obligatorio: nombre_vecino" → "Debes completar el campo Nombre"), reemplaza nombres de tablas/constantes (`DIM_*`, `GO_PES_V2` → "el sistema"), filtra JSON crudo. Diccionario de 13 campos técnicos → etiquetas visibles. **(2) Limpieza en origen:** `Validators.js` (6 funciones con etiquetas legibles en vez de nombres técnicos), `Scripts_Socios.html` (errores de importación en tabla HTML legible, no JSON stringify), `Scripts_Avance.html` (prompt sin formato técnico YYYY-MM-DD), 3 archivos con mensajes de éxito sin IDs ("Solicitud guardada: SOL-123" → "Solicitud guardada correctamente"). **Criterio editorial:** lenguaje de tarea, no de estructura interna; contexto funcional + acción sugerida; sin nombres de tablas, variables, claves técnicas, formatos internos ni JSON crudo. Archivos: `Scripts_UI.html` (+95 líneas), `Validators.js` (~60 líneas), `Scripts_Socios.html`, `Scripts_Avance.html`, `Scripts_NuevoIngreso.html`, `Scripts_Organizaciones.html`. Total ~169 líneas modificadas + ~15 mensajes backend auto-traducidos.

- **2026-06-01 (Testing — Corrección suite de seguridad + estadísticas)** — Corregidos 10 fallos en `goPesTestSecurity_()` causados por uso incorrecto de `function(assert)` en vez de las funciones globales de assert (`assertTrue_`, `assertEqual_`). Reemplazadas todas las referencias en 13 tests de seguridad. Suite completa ahora pasa exitosamente: **262 tests, 0 fallos** (90 validators + 41 auth + 51 services + 35 avance + 32 beneficios + 13 security, 26 SKIPs intencionales). Creado documento `docs/dev-stats.md` con métricas completas del proyecto: 44 archivos, ~33.326 líneas de código, 11 módulos funcionales, 35+ hojas de base de datos. Desglose detallado por tipo de archivo (JS backend/frontend, CSS, HTML), cobertura de tests por suite (~78%), hitos de desarrollo completados (6 fases: Arquitectura, Modularización, Seguridad, Testing, Design System, UX/UI), deuda técnica pendiente (solo 3 items de prioridad media/baja), métricas de calidad (100% tests pasados, 71% hallazgos seguridad cerrados, 0 CSS inline), tiempos de carga estimados, estado del proyecto (**PRODUCCIÓN ESTABLE**). Sección nueva en `CLAUDE.md` con tabla resumen de métricas. Archivos: `Audith.js` (13 tests corregidos), `docs/dev-stats.md` (nuevo), `CLAUDE.md` (estadísticas + historial).

- **2026-06-01 (UX — Stagger en cards/listas, Fase 3)** — Implementado sistema de animación escalonada (stagger) para módulos visuales. **CSS:** nuevas clases `.stagger-item` (estado inicial: opacity 0, translateY(8px)) y `.stagger-item.stagger-animate` (estado animado: opacity 1, translateY(0) con transition 220ms). Delays incrementales vía `:nth-child(n)` de 40ms por ítem (máx 12 items visibles con delays hasta 440ms, items 13+ comparten delay 480ms para evitar espera excesiva). **Aplicación:** módulo **Inicio** (6 KPI cards, 5 chart cards, 3 table cards en `Inicio.html` + activación en `Scripts_Inicio.html`), módulo **Organizaciones** (cards de organizaciones y grupos de vecinos en `Scripts_Organizaciones.html`). Activación vía `requestAnimationFrame` después de `innerHTML` render para forzar reflow. **No aplicado a Beneficios** (estructura panel compleja, pospuesto). Archivos: Styles.html (+48 líneas stagger system), Inicio.html (5 cambios: 3× chart cards, 1× KPI cards, 1× table cards), Scripts_Inicio.html (+8 líneas activación), Scripts_Organizaciones.html (2 cambios: org-card class, activación). **Resultado:** entrada visual progresiva y pulida sin afectar performance.

- **2026-06-01 (UX — Transiciones suaves al cargar módulos, Fase 2)** — Implementada transición **enter-only** (view-fade-up) al cambiar de módulo. **CSS:** nuevos estados `.view-enter` (opacity 0, translateY(12px)) y `.view-enter-active` (opacity 1, translateY(0) con transition 220ms ease-out). Reglas anteriores `.view { display:none }` y `.view.active { display:block }` movidas al sistema de transiciones (Styles.html:~7650) para consolidar. **JS:** `route()` en Scripts.html modificado para aplicar `view-enter` → forzar reflow con `offsetHeight` → `requestAnimationFrame` → `view-enter-active`. Cleanup de estados previos: `classList.remove('active', 'view-enter', 'view-enter-active')` en todas las vistas antes de activar la nueva. **Duración:** 220ms (sincronizado con modales). **No hay exit animation** (cambio inmediato, solo entrada suave) para evitar fragilidad con re-renders de `innerHTML`. Archivos: Styles.html (+28 líneas), Scripts.html (~15 líneas modificadas en `route()`).

- **2026-06-01 (UX — Transiciones suaves en modales y loading overlay)** — Implementado sistema de transiciones con estados intermedios (`is-opening`, `is-open`, `is-closing`) para modales y loading overlay. **Modales:** `A11Y.openModal()` usa `requestAnimationFrame` para forzar reflow entre estado inicial (opacity 0, translateY(16px) scale(0.96)) y estado final (opacity 1, translateY(0) scale(1)). `A11Y.closeModal()` espera `transitionend` antes de aplicar `display:none` (fallback 250ms para `prefers-reduced-motion`). **Loading:** `showContentLoading()` / `showModalLoading()` fuerzan reflow con `overlay.offsetHeight` antes de quitar `.is-hidden`; `hideContentLoading()` espera 250ms después de agregar `.is-hidden` antes de resetear `display:none`. **Gramática de movimiento:** duraciones `--transition-fast` (160ms), `--transition-base` (220ms), `--transition-slow` (320ms); easings `--ease-out` (cubic-bezier salida), `--ease-in-out` (cubic-bezier bidireccional); soporte `@media (prefers-reduced-motion: reduce)` con duración 0.01ms. **Blast radius:** 5 modales (admin-reset, user, avance, socios, organizaciones) + 1 loading overlay. CSS: +145 líneas en `Styles.html` (líneas 7493-7638). JS: `Scripts_A11y.html` (~20 líneas modificadas), `Loading.html` (~15 líneas modificadas). Sin breaking changes; backward compatible.

- **2026-06-01 (UX — Sistema de loading con contexto explícito)** — Implementadas funciones `showModalLoading()` y `hideModalLoading()` en `Loading.html` para forzar contexto de modal en flujos que cierran el modal antes de disparar la acción. Corregidos 5 casos problemáticos donde el loader se montaba en el módulo en vez del modal: `loadOrganizacionDetalle_()` (Scripts_Organizaciones.html:467), `updateCargoSocioOrganizacion_()` (Scripts_Organizaciones.html:784), `updateUserFromModal_()` (Scripts_Admin.html:200), `confirmDeactivateUser_()` (Scripts_Admin.html:239), `submitAvanceHitoModal_()` (Scripts_Avance.html:768). La API anterior `showContentLoading()` se mantiene para backward compatibility (contexto heurístico basado en presencia de modal abierto). Nueva API usa parámetro `forceModal` en `ensureContentLoadingMounted_()` para control explícito. Patrón de referencia: sistema de loading local del calendario (`#cal-step-loading`, Calendario.html:140).

- **2026-05-31 (Frontend — Design System documentado)** — Creado sistema de diseño completo en `docs/design-system.md` (693 líneas). Documentación cubre: paleta de colores (sistema + variables CSS), componentes base (botones, badges, tablas, cards, modales, formularios, toasts, paginador), iconografía (Material Symbols), tipografía (Inter), espaciado, border radius, sombras, tema oscuro, responsive (4 breakpoints), accesibilidad (keyboard nav, focus trap, ARIA, contrast), convenciones de código (BEM, orden de propiedades), estrategia de migración progresiva. Sección "Design System" añadida a `CLAUDE.md` con principios, tabla de componentes, variables CSS, reglas de trabajo. **Fase 5 del plan de mejora frontend completada.**

- **2026-05-31 (Seguridad — PINs externalizados + rate limiting)** — Implementado sistema centralizado de PINs en `SecurityPins.js` con separación por contexto. Los PINs ya no están hardcodeados en el código fuente; se almacenan hasheados en `PropertiesService.getScriptProperties()`. Tres contextos independientes: `admin_reset` (limpieza datos), `user_deactivate` (desactivar usuarios), `evento_abierto` (eventos inscripción abierta). Rate limiting automático: 3 intentos/usuario/hora vía `CacheService`. Logs de intentos fallidos en `LOG_Procesamiento` para auditoría. Archivos modificados: nuevo `SecurityPins.js`, `ZZ_AdminDataReset.js` (migrado de constantes hardcodeadas a `goPesValidatePin_`), `Auth.js` (contexto `USER_DEACTIVATE`), `ZZ_BeneficiosBackend.js` (contexto `EVENTO_ABIERTO`). Funciones públicas de setup: `goPesConfigurePinDeSeguridad(context, pin)`, `goPesIsPinConfigured(context)`, `goPesResetPinRateLimit(context, email)`. BREAKING: Después de deploy, los superusers deben ejecutar la configuración inicial de PINs desde el editor (ver sección "Configuración de PINs de seguridad" en CLAUDE.md).
- **2026-05-31 (Seguridad — auth guards en funciones mutantes Fase 1)** — Cerrados 2 hallazgos críticos: (1) Bypass autorización en `recalcularFicha()` — rebuild global ahora requiere coordinador/superuser; (2) Funciones mutantes sin auth guard — `goPesRefrescarVistasYMaster()` y `goPesSeedSuperUsers()` ahora protegidas. Archivos: `Services.js:1267-1272`, `DerivedBuilders.js:21`, `Main.js:197-200,142`.
- **2026-05-31 (Arquitectura CSS — estandarización)** — Todo el CSS de la aplicación centralizado en `Styles.html` y `ThemeDark.html`. Regla establecida: prohibido CSS inline en JS; todo nuevo estilo va en esos dos archivos al final, con comentario de sección. Aplicado concretamente en el módulo Organizaciones: extraídas ~17 clases nuevas (`org-card`, `org-card__*`, `org-step-dot--*`, `org-step-line--*`, `org-card__badge--*`, `org-chip-btn--active`, `org-grid`) de las funciones `renderOrganizacionCardHtml_` y `renderGrupoVecinosCardHtml_`. Dark mode de badges añadido en `ThemeDark.html`. Función helper `buildOrgStepper_()` y constante `ORG_HITO_NOMBRES` extraídas como utilidades de módulo. `CLAUDE.md` actualizado con reglas de arquitectura CSS.

- **2026-05-31 (Módulo Organizaciones — grupos de vecinos visibles, Opción B)** — Vista unificada de organizaciones constituidas y grupos de vecinos (casos sin `organizacion_id` con avance ≥ hito 2). Nuevo backend `getOrganizacionesConGruposClient()` en `ZZ_OrganizacionesBackend.js`: consulta `MAE_ORGANIZACIONES` y `MAE_CASOS`, cruza hitos de `FACT_AVANCE_HITOS` por `organizacion_id` y `solicitud_id` respectivamente, retorna array `organizaciones` con campo `tipo` (`'organizacion'` | `'grupo_vecinos'`). Fecha formateada en backend con `Utilities.formatDate`. Frontend: `Scripts_Organizaciones.html` — 3 chips de filtro (Todos / Constituidas / En proceso), cards diferenciadas por tipo (stepper T1+T2 para orgs; stepper T1 solo para grupos con badge "En proceso"), botón "Ver ficha" en grupos navega a ficha del vecino. `Scripts.html` — `ensureOrganizacionesModuloList_` ahora llama a `getOrganizacionesConGruposClient`. Stats de hitos filtran solo `tipo==='organizacion'`.

- **2026-05-30 (Avance PRE_02 — número de ingreso oficina de partes)** — Hito 2 "Carta por oficina de partes" ahora requiere el número de ingreso asignado por oficina de partes. Almacenamiento: campo `numero_ingreso` en `FACT_Avance_Hitos` con formato `"4762/2026"` (número + año completo derivado de la fecha del hito). Visualización: `"4762/26"` (año abreviado) en timeline y futuros reportes. Archivos modificados: `ZZ_AvancePhase1.js` (columna añadida a `getGoPesAvanceSheetDefinitions_` — el header se crea automáticamente al correr "Configurar motor operativo"), `Repository.js` (schema `FACT_AVANCE_HITOS` actualizado), `ZZ_AvanceBackend.js` (extracción de `payload.numero_ingreso` y persistencia en ambos paths: org y grupo vecinos), `Scripts_Avance.html` (campo condicional `avance-modal-num-ingreso-field` en modal, validación en `submitAvanceHitoModal_`, composición `número+'/'+año`, función `formatNumIngreso_()`, display en timeline), `Manual.html` (subsección Hito 2, FAQ nuevo, callout contador anual).

- **2026-05-30 (Calendario de reuniones — rediseño ítem)** — Tres mejoras en `Calendario.html`: (1) badge ("CS"/"Min. Fe") movido desde el extremo derecho del `<li>` a un wrapper `.inicio-cal-titulo-row` inline junto al título, usando `flex:1;min-width:0` para que el título trunce con ellipsis; (2) botón de acción ampliado de 24×24px a 38×38px, ícono de `.8rem` a `1.1rem`; (3) eventos "Min. Fe" ahora muestran un botón deshabilitado (`disabled`, opacidad 38%, icono `how_to_reg`) como placeholder para la futura funcionalidad de programar el evento desde la app (requiere cruzar `ev.titulo` con `FACT_AVANCE_HITOS` para verificar 4 hitos completados). CSS añadido en `Index.html` (`.inicio-cal-titulo-row`, actualización `.inicio-cal-action`, `.inicio-cal-action--pending`).

- **2026-05-30 (Ficha — historial y registro de gestiones)** — Sección "Seguimiento de gestiones" añadida al pie de cada ficha de vecino. Usa `data.hitos` que ya devolvía `obtenerFicha` (FACT_Hitos, últimas 25, desc) pero estaba sin uso en el frontend. Lista compacta: fecha · tipo+estado · detalle truncado · responsable (sin dominio). Botón "Nueva gestión" visible solo para usuarios con acceso al módulo Avance; abre formulario inline con 4 campos (tipo, estado desde catálogo, fecha, observación). `flujo` hardcodeado a `'seguimiento_general'`, `responsable_gestion` del usuario en sesión. Al guardar llama `guardarSeguimiento()` (backend ya existía completo) y recarga la ficha. Archivos modificados: `Scripts_Ficha.html` (funciones `renderHistorialGestionSection_`, `initGestionHandlers_`), `Index.html` (CSS `.ficha-gestiones*`, dark mode). Backend sin cambios.

- **2026-05-30 (Eliminación filtro Macrosector del dashboard)** — Filtro "Macrosector" removido del dashboard nativo. Archivos modificados: `Inicio.html` (eliminado `sel_('dash-filter-sector', ...)`, variable `sectores`, clave `sector` en `getFilters_()`, listener y `rebuild_` en `updateFilterOptions_`), `Services.js` (eliminados `filterSector`, los dos `if (filterSector)` sobre filteredOrgs y filteredCasos, `filterSector` de `useOrgFilter`, recolección de `sectores` en opciones de filtro, y `sectores`/`sector` del return de `getDashboardKpis`), `Manual.html` (fila Macrosector eliminada de la tabla de filtros, FAQ actualizada). El dashboard queda con 4 filtros: UV, Estado comité, Tipo organización, Período.

- **2026-05-30 (Manual de usuario — sección Dashboard)** — Añadida sección `sec-inicio` al manual con documentación completa del dashboard nativo: barra de filtros (ahora 4), los 6 KPIs con descripción de tendencias, los 3 gráficos superiores, los 2 gráficos de seguimiento (gauges + línea dual), las 3 tablas de gestión prioritaria y cómo refrescar el dashboard. Añadidas 3 FAQ (indicadores ↑↓, uso de filtros, beneficios "Por vencer") y 3 términos al glosario (Dashboard, KPI, Tendencia). Archivo: `Manual.html`.

- **2026-05-29 (Dashboard nativo Inicio — Phase 2)** — Reemplazado el iframe de Looker Studio por un dashboard nativo completo en el módulo Inicio. Archivos modificados: `Services.js` (`getDashboardKpis` reescrita), `Inicio.html` (reescrito completo, ~484 líneas), `Scripts_Inicio.html` (`renderInicioView_`, `ensureInicioPanelData_` con TTL dual), `Scripts.html` (prefetch paralelo de `getDashboardKpis` + `getInicioPanelData` durante splash), `Index.html` (bloque CSS ~80 líneas con dark/light mode). Dashboard entrega: 6 KPI cards con tendencias ↑↓ (vs. 30d anteriores), barra de 4 filtros (UV, Estado, Tipo, Período), fila superior 3-col (donut estados constitución + bar-H por UV Top 10 + cards estado beneficios vigentes/porVencer/atrasados), fila media 2-col (6 gauges radiales SVG avance por hito + gráfico de línea dual mensual gestiones+ingresos), fila inferior 3-col (tablas: próximos vencimientos, atención prioritaria, últimas gestiones). Mapa geográfico excluido (requiere librería externa). Splash se mantiene visible hasta resolver `Promise.all([bootstrap, dashPrefetch, panelPrefetch])`. Dark mode y light mode completamente soportados con selectores `html[data-theme="dark"]` en `Index.html`.

- **2026-05-26 (Tests + PROD)** — Implementado runner de tests automatizados GAS-puro en `Audith.js`: infraestructura `createTestSuite_` / `assertEqual_` / `assertThrows_` etc., 3 suites (`goPesTestValidators_`, `goPesTestAuth_`, `goPesTestServices_`), 182 tests en total (0 fallos), 15 SKIPs documentados. Entry point público `goPesRunAllTests()` accesible desde menú GO-PES v2 → Ejecutar tests. Tests verificados en DEV y PROD con datos reales. Entorno PROD (`pablo.ramos@providencia.cl`) activado como entorno principal de operación.
- **2026-05-26 (Branding + CSS)** — Corregido conflicto de paleta: defaults de branding (`primaryColor`, `secondaryColor`) actualizados de `#214E8A`/`#007C4A` (paleta institucional de `GO_PES_V2.COLORS`) a `#3D96B4`/`#8CC63F` (paleta de diseño de `Styles.html`) en `SystemConfig.js`, `Scripts.html`, `Splash.html` y `Scripts_Admin.html`. Corregido layout del panel "Configuración de plazos" en módulo Beneficios: `max-height: 324px` + `overflow: hidden` reemplazados por `height: auto` + `overflow: visible` en `Styles.html` (botón "Guardar plazos" quedaba oculto). Panel de dos columnas ajustado a proporción 1/3 + 2/3 (`grid-template-columns: minmax(0, 1fr) minmax(280px, 2fr)`). Etiqueta de versión en sidebar actualizada a formato `v2.1.0-modular · DEV · build c8b0d4ec`.
- **2026-05-26 (Fase 5)** — Split de `Scripts.html` (7.896 líneas) en 8 parciales: `Scripts_Inicio`, `Scripts_Ficha`, `Scripts_NuevoIngreso`, `Scripts_Organizaciones`, `Scripts_Beneficios`, `Scripts_Socios`, `Scripts_Avance`, `Scripts_Admin`. Core reducido a 1.757 líneas. Cada parcial es JS puro incrustado dentro del IIFE via `<?!= include() ?>`. Los parciales NO tienen etiqueta `<script>`. Re-aplicados fixes de session: esquemas de suggestion dims en `Repository.js` y `rebuildSuggestionDims_` en `DerivedBuilders.js`.
- **2026-05-26 (Fase 4)** — Auth guards añadidos a `recalcularFicha`, `refrescarVistasYMaster`, `goPesRefrescarVistaAvanceOrganizacion`, `goPesDiagnosticarAvanceBackend`. `'administrador'` eliminado de todos los arrays de roles en 7 archivos. Doble `requireModuleAccess_` en `getAvanceOrganizacion` corregida. `goPesGetAvanceHeaders_` simplificada a 1 línea usando `buildSheetDefinitions_()`.
- **2026-05-26** — Eliminado `LegacyMigration.js` y todas las referencias legacy. Integradas las hojas del módulo Avance y la config `GO_PES_V2.AVANCE` directamente en `Main.js`. Eliminadas 6 funciones `*LegacyUnused_` de Auth.js. Configurado entorno DEV/PROD con clasp multi-usuario.

## Variables de entorno / configuración

No hay `.env`. La configuración se gestiona a través de:
- `GO_PES_V2` (constante en Main.js): versión, colores, sheets, roles
- `CFG_Parametros` (hoja del spreadsheet): configuración en tiempo de ejecución (appName, branding, módulos activos, etc.)
- `PropertiesService.getScriptProperties()`: almacena `GO_PES_SPREADSHEET_ID`

---

## Reglas de trabajo — OBLIGATORIAS

### Flujo de trabajo general

1. **Analiza antes de actuar.** Ante cualquier requerimiento, primero entiende el alcance completo del cambio. Si el requerimiento es ambiguo o puede tener efectos secundarios no obvios, pregunta antes de escribir código.
2. **Fase 1 siempre es lectura.** Para cualquier cambio no trivial, la primera respuesta debe ser un análisis: qué archivos se ven involucrados, qué funciones se modifican, qué riesgos existen. No tocar código hasta recibir aprobación explícita.
3. **Scope mínimo.** Cada cambio debe afectar el menor número de archivos y líneas posible. Si puedes resolver algo en un archivo, no lo disperses en cinco.
4. **Reporta lo que cambiaste.** Después de cada conjunto de modificaciones, lista exactamente qué archivo y qué línea cambió, y por qué.
5. **Di explícitamente si algo puede romperse.** Si un cambio tiene riesgo de afectar producción o romper otra parte del sistema, adviértelo antes de ejecutar — no después.

### Código backend

- Antes de modificar cualquier función, léela completa y entiende su propósito dentro del módulo.
- No elimines ni renombres funciones públicas (sin sufijo `_`) sin verificar primero que ningún otro archivo las llame.
- No agregues dependencias externas (librerías, APIs, servicios) sin aprobación explícita.
- Los valores fallback en el código son intencionales — no los cambies asumiendo que son errores. Pregunta primero.

### Frontend y diseño visual

- **Todo el CSS de la aplicación debe vivir exclusivamente en `Styles.html` (modo claro) y `ThemeDark.html` (overrides dark).** Nunca escribas estilos en otro lugar.
- **Prohibido el CSS inline en código JavaScript.** Si un componente generado con JS necesita estilos, crea las clases en `Styles.html`/`ThemeDark.html` y aplícalas por nombre de clase.
- **Reutiliza antes de crear.** Antes de definir una clase nueva, verifica si ya existe una clase o variable CSS en `Styles.html` que resuelva el problema. El sistema ya tiene clases para paneles (`.panel`), botones (`.primary-btn`, `.secondary-btn`), grillas, estados vacíos, etc.
- **Convención de nombres para clases nuevas:** usa el prefijo del módulo o componente (`org-card__*`, `ficha-gestiones*`, `inicio-cal-*`). Sigue el patrón BEM ya presente en el código.
- **Modo claro y oscuro son obligatorios en conjunto.** Toda clase nueva que use colores debe tener su contraparte en `ThemeDark.html` si los valores no se resuelven solos con las CSS variables existentes (`--border`, `--surface-2`, `--text-muted`, etc.).
- **Agrega siempre al final del archivo**, antes del cierre `</style>`, con un comentario de sección que identifique el módulo.
- El splash, logo, tipografía y layout estructural de la app son la línea gráfica base — no modificar sin instrucción explícita.
- No agregar librerías CSS o JS externas sin aprobación.

### Sistema de colores — regla crítica

El sistema visual de GO-PES es **holístico**: sidebar, íconos, textos, fondos, bordes y acentos son un sistema coordinado. Un cambio en un color puede romper visualmente módulos que no tienen relación aparente con el cambio.

Antes de tocar cualquier valor de color:

1. **Inventario primero.** Haz un grep de todos los archivos donde aparece ese valor exacto (hex o variable). Presenta la lista antes de modificar nada.
2. **Distingue colores de sistema vs. colores de branding.** `GO_PES_V2.COLORS` contiene colores de sistema (fondos, bordes, estados) que no deben ser sobrescritos por el branding configurable del usuario. El branding del usuario solo controla los colores de identidad (primario, secundario, acento, logo).
3. **El modo claro y el modo oscuro son interdependientes.** Un cambio en un fallback del modo claro puede romper el modo oscuro y viceversa. Verifica ambos.
4. **Hex exacto, sin aproximaciones.** Si el sistema usa `#03C2AE`, en todos los lugares es `#03C2AE`. Nunca sustituir por un valor "cercano" o "equivalente".
5. **Los fallbacks del sistema no son errores.** Valores como `#F7FAFC` en `GO_PES_V2.COLORS.bg` son constantes de sistema con propósito definido. No los reemplaces por valores de branding sin entender qué parte del UI alimentan.

## Design System

GO-PES v2 cuenta con un sistema de diseño documentado que define componentes visuales, patrones de interacción y convenciones de código frontend.

### Documentación completa

Ver [`docs/design-system.md`](../docs/design-system.md) para la referencia completa del sistema de diseño.

### Principios

1. **Consistencia visual** — Todos los componentes siguen las mismas convenciones de color, espaciado, tipografía y estados interactivos.
2. **Accesibilidad por defecto** — Keyboard navigation, focus traps, ARIA labels, color contrast WCAG AA.
3. **Responsive mobile-first** — Breakpoints definidos (mobile < 768px, tablet 768-1199px, desktop ≥ 1200px).
4. **Modo claro y oscuro** — Todos los componentes soportan tema claro y oscuro vía variables CSS.
5. **Migración progresiva** — Nuevos componentes usan el Design System; componentes existentes se migran gradualmente sin romper funcionalidad.

### Componentes base

- **Botones:** `.primary-btn`, `.secondary-btn`, `.danger-btn` (con modificadores `.btn--sm`, `.btn--lg`)
- **Badges:** `.badge-pill` (con variantes `.badge--success`, `.badge--warning`, `.badge--error`, `.badge--info`)
- **Tablas:** `.data-table` (con card layout automático en mobile < 768px usando `data-label` attributes)
- **Cards:** `.panel`, `.card` (con estructura `.panel__head`, `.panel__body`, `.panel__footer`)
- **Modales:** `.modal` (con API JavaScript `A11Y.openModal()` / `A11Y.closeModal()` en `Scripts_A11y.html`)
- **Estados vacíos:** `.empty-state` (helper `GO_PES_UI.emptyStateHtml()` en `Scripts_UI.html`)
- **Formularios:** `.field` (con `.has-error`, `.field-error`, modificadores `.field--full`, `.field--half`)
- **Toasts:** API `GO_PES_UI.showSuccess()`, `GO_PES_UI.showError()`, `GO_PES_UI.showToast()`
- **Paginador:** `GO_PES_UI.paginatorHtml(currentPage, totalPages, dataPrefix)`

### Variables CSS

Todas definidas en `Styles.html` y sobrescritas en `ThemeDark.html`:

- **Colores:** `--runtime-brand-primary`, `--runtime-brand-secondary`, `--runtime-brand-accent`, `--text`, `--text-muted`, `--surface`, `--surface-alt`, `--border`, `--success`, `--warning`, `--danger`
- **Espaciado:** `--space-1` (4px) a `--space-8` (40px)
- **Border radius:** `--radius-sm` (4px) a `--radius-pill` (9999px)
- **Sombras:** `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`

### Iconografía

**Material Symbols Outlined** — Google Fonts

```html
<span class="material-symbols-outlined">save</span>
<span class="material-symbols-outlined">edit</span>
<span class="material-symbols-outlined">delete</span>
```

### Tipografía

**Inter** — Google Fonts

Jerarquía: h1 (2rem/700), h2 (1.5rem/600), h3 (1.25rem/600), h4 (1rem/600), body (0.875rem/400), small (0.75rem)

### Convenciones de código

- **Nomenclatura CSS:** BEM simplificado (`.bloque`, `.bloque__elemento`, `.bloque--modificador`)
- **Orden de propiedades:** Posicionamiento → Box model → Tipografía → Visual → Otros
- **Comentarios:** Secciones con separador `/* ======== SECCIÓN ======== */`

### Sistema de transiciones

**Gramática de movimiento completa** (3 fases implementadas 2026-06-01):

| Elemento | Entrada | Salida | Duración |
|----------|---------|--------|----------|
| Modal backdrop | fade 0→1 | fade 1→0 | 220ms / 160ms |
| Modal dialog | Y+16 scale 0.96→1 | Y+8 scale 0.98 | 220ms / 160ms |
| Loading overlay | fade 0→1 | fade 1→0 | 220ms / 220ms |
| Vista módulo | Y+12 fade 0→1 | inmediato | 220ms / 0ms |
| Cards stagger | Y+8 fade 0→1 + delay 0-480ms | inmediato | 220ms / 0ms |

**Estados CSS:**
- Modales: `.is-opening`, `.is-open`, `.is-closing`
- Vistas: `.view-enter`, `.view-enter-active`
- Stagger: `.stagger-item`, `.stagger-animate`

**Variables CSS:**
- `--transition-fast` (160ms), `--transition-base` (220ms), `--transition-slow` (320ms)
- `--ease-out`, `--ease-in-out`
- Soporte automático `@media (prefers-reduced-motion: reduce)`

**Documentación completa:** [`docs/design-system.md`](../docs/design-system.md) sección "Transiciones y Animaciones"

### Archivos del Design System

| Archivo | Propósito |
|---------|-----------|
| `docs/design-system.md` | Documentación completa del sistema de diseño + transiciones |
| `Styles.html` | CSS global (modo claro) + variables + componentes + transiciones |
| `ThemeDark.html` | Overrides para modo oscuro |
| `Scripts_A11y.html` | Sistema de accesibilidad (focus trap, modales con transiciones) |
| `Scripts_UI.html` | Helpers de UI (toasts, empty states, paginador) |
| `Scripts_Utils.html` | Utilidades (nombres, fechas, config, labels) |
| `Scripts_CatalogCache.html` | Cache de catálogos con TTL |

### Reglas de trabajo con el Design System

1. **Nuevos componentes siempre usan el Design System.** No crear clases ad-hoc; reutilizar las existentes o extenderlas.
2. **Documentar extensiones.** Si agregas una variante nueva de un componente base (ej: `.badge--highlight`), documéntala en `design-system.md`.
3. **No romper lo existente.** Las clases nuevas coexisten con las viejas. Refactorizar componentes legacy de forma incremental.
4. **Deprecación explícita.** Marcar clases viejas con `/* @deprecated Use .nueva-clase instead */` antes de eliminarlas.
5. **Testing cross-theme.** Verificar todo cambio visual en modo claro Y modo oscuro antes de hacer commit.
