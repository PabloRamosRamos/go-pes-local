# GO-PES v2 — Gestor Operativo PES

> **📘 Nota:** Este es el README principal del proyecto, ahora ubicado en `docs/README.md`.  
> **Para Claude:** Inicia con [INICIO-RAPIDO-CLAUDE.md](INICIO-RAPIDO-CLAUDE.md)  
> **Toda la documentación está en:** `docs/` (sin archivos .md en raíz)

**Programa Estamos Seguros · Municipalidad de Providencia, Chile**

Sistema de gestión integral para organizaciones comunitarias, beneficios, instrumentos de apoyo y seguimiento territorial del programa social municipal.

---

## ¿Qué es GO-PES?

GO-PES (Gestor Operativo del Programa Estamos Seguros) es una aplicación web interna construida sobre **Google Apps Script**, que usa un Google Spreadsheet como base de datos para gestionar:

- 📋 **Registro de vecinos** y solicitudes de apoyo
- 🏘️ **Organizaciones comunitarias** (juntas de vecinos, comités, grupos)
- 📊 **Seguimiento de hitos** (pre-constitución, formalización, legalización)
- 🎁 **Beneficios e instrumentos** (capacitaciones, certificaciones, programas)
- 👥 **Socios y directivas** de organizaciones
- 📍 **Gestión territorial** por UV (Unidades Vecinales) y sectores

**Audiencia:** Operadores municipales, coordinadores de territorio, equipo PES.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Runtime** | Google Apps Script (V8) |
| **Base de datos** | Google Sheets (hojas estructuradas como tablas) |
| **Frontend** | HTML5 + CSS3 + Vanilla JavaScript (sin frameworks) |
| **Templating** | `HtmlService.createTemplateFromFile()` |
| **Auth** | Google OAuth (sesión del usuario de Google) |
| **Hosting** | Google Apps Script Web App deployment |
| **CLI** | clasp (Google Apps Script Command Line Tool) |
| **Zona horaria** | America/Santiago |

**Sin bundler, sin npm en runtime, sin servidor externo.** Todo es JavaScript puro que corre en el runtime de Google.

---

## Estructura del repositorio

```
GO Provi/
│
├── docs/                        ← 📚 Toda la documentación (sin .md en raíz)
│   ├── README.md                ← Estás aquí (Quick Start principal)
│   ├── INICIO-RAPIDO-CLAUDE.md  ← Resumen ejecutivo para sesiones Claude
│   ├── CLAUDE.md                ← Guía técnica extensa (fuente de verdad)
│   ├── CHECKLIST-PRODUCCION.md  ← Verificación pre-deploy PROD
│   ├── ORGANIZACION-DOCS-2026-06-19.md ← Proceso de reorganización
│   │
│   ├── — Documentación técnica —
│   ├── MANTENER-DOCS.md         ← Guía de mantenimiento documentación
│   ├── arquitectura.md          ← Capas, módulos, flujo request→response
│   ├── modelo-datos.md          ← Esquema hojas, relaciones, pipeline
│   ├── deploy.md                ← Proceso despliegue DEV/PROD
│   ├── seguridad.md             ← Roles, permisos, scopes, PINs
│   ├── design-system.md         ← Sistema diseño (componentes, CSS, UX)
│   ├── dev-stats.md             ← Métricas del proyecto
│   ├── frontend-*.md            ← Documentos frontend (estado, plan, resumen)
│   ├── mensajes-normalizados.md ← Sistema traducción mensajes técnicos
│   ├── diagnostico-transiciones.md ← Sistema transiciones UX
│   │
│   └── archive/                 ← Documentos históricos
│       ├── ANALISIS-AVANCE-LEGACY.md
│       ├── DEPLOYMENT-2026-06-05.md
│       ├── GUIA-MIGRACION.md
│       └── PLAN-LOADERS.md
│
├── go-pes-local/                ← Código fuente Apps Script
│   ├── appsscript.json          ← Manifiesto (runtime, timezone, scopes)
│   ├── .clasp.json              ← Config DEV
│   ├── .clasp.prod.json         ← Config PROD
│   │
│   ├── — BOOTSTRAP —
│   ├── Main.js                  ← doGet(), onOpen(), GO_PES_V2
│   │
│   ├── — INFRAESTRUCTURA —
│   ├── Auth.js                  ← Autenticación, usuarios, permisos
│   ├── SecurityPins.js          ← PINs con rate limiting
│   ├── Repository.js            ← Acceso hojas + cache
│   ├── Validators.js            ← Validación datos
│   ├── SystemConfig.js          ← Configuración sistema
│   ├── DerivedBuilders.js       ← Vistas derivadas
│   ├── Diagnostics.js           ← Trazas debug
│   │
│   ├── — LÓGICA DE NEGOCIO —
│   ├── Services.js              ← Servicios dominio
│   ├── Catalogs.js              ← Gestión catálogos
│   ├── NuevoIngreso.js          ← Módulo ingreso vecinos
│   ├── ZZ_AvanceBackend.js      ← Módulo avance/hitos
│   ├── ZZ_AvancePhase1.js       ← Avance fase 1
│   ├── ZZ_AvancePhase2.js       ← Avance fase 2
│   ├── ZZ_BeneficiosBackend.js  ← Módulo beneficios
│   ├── ZZ_OrganizacionesBackend.js ← Módulo organizaciones
│   ├── ZZ_SociosBackend.js      ← Módulo socios
│   ├── ZZ_AdminDataReset.js     ← Utilidades reset
│   │
│   ├── — FRONTEND —
│   ├── Index.html               ← Template principal
│   ├── Styles.html              ← CSS global (~154 KB)
│   ├── ThemeDark.html           ← CSS modo oscuro
│   ├── Scripts.html             ← Core JS
│   ├── Scripts_*.html           ← JS módulos (8 parciales)
│   ├── Manual.html              ← Manual usuario
│   ├── Calendario.html          ← Calendario reuniones
│   ├── Splash.html              ← Splash inicial
│   ├── Loading.html             ← Loading overlay
│   ├── Assets.js                ← Imágenes (data URIs)
│   │
│   └── Audith.js                ← Tests (262 tests)
│
├── push-dev.ps1                 ← Deploy DEV
└── push-prod.ps1                ← Deploy PROD
```

---

## Cómo empezar (Quick Start)

### Pre-requisitos

1. **Node.js** (para instalar clasp)
2. **clasp CLI**: `npm install -g @google/clasp`
3. **Cuenta Google** con acceso al spreadsheet del proyecto
4. **Permisos de editor** en el Google Spreadsheet contenedor

### Clonar el proyecto

```bash
git clone https://github.com/PabloRamosRamos/go-pes-local.git
cd "GO Provi/go-pes-local"
```

### Autenticar con clasp (primera vez)

```powershell
# Autenticar cuenta DEV
clasp -u dev login --no-localhost
# → Usar p.e.ramos.ramos@gmail.com

# Autenticar cuenta PROD (solo si tienes acceso)
clasp -u prod login --no-localhost
# → Usar pablo.ramos@providencia.cl
```

### Desplegar a DEV

```powershell
# Desde la raíz del proyecto (GO Provi/)
.\push-dev.ps1
```

El script:
1. Verifica que estés en el directorio correcto
2. Cambia a `.clasp.json` (entorno DEV)
3. Ejecuta `clasp push`
4. Muestra el link al editor de Apps Script

### Configuración inicial (primera vez en un entorno nuevo)

Desde el **Spreadsheet** (abrir la hoja de cálculo):

1. **Menú GO-PES v2 → Configurar motor operativo**
   - Crea todas las hojas necesarias
   - Siembra catálogos base
   
2. **Menú GO-PES v2 → Inicializar superUsers**
   - Configura el superusuario inicial

3. **Configurar PINs de seguridad** (ejecutar desde editor de Apps Script):
   ```javascript
   goPesConfigurePinDeSeguridad('admin_reset', 'TU_PIN_1')
   goPesConfigurePinDeSeguridad('user_deactivate', 'TU_PIN_2')
   goPesConfigurePinDeSeguridad('evento_abierto', 'TU_PIN_3')
   ```

4. **Configurar Spreadsheet de migración** (si aplica):
   ```javascript
   goPesConfigurarMigracionSourceId('SPREADSHEET_ID_ORIGEN')
   ```

5. **Menú GO-PES v2 → Abrir Gestor Operativo**
   - Abre la Web App en nueva pestaña

### Ejecutar tests

```javascript
// Desde el editor de Apps Script, o menú GO-PES v2 → Ejecutar tests
goPesRunAllTests()
// → 195 tests, 0 fallos esperado
```

---

## Entornos

| Entorno | Script ID | Cuenta | Config | Acceso webapp | Estado |
|---------|-----------|--------|--------|---------------|--------|
| **DEV** | `12ZfNLyF...` | p.e.ramos.ramos@gmail.com | `.clasp.json` | `ANYONE` | Desarrollo y pruebas |
| **PROD** | `10Lzrg2G...` | pablo.ramos@providencia.cl | `.clasp.prod.json` | `DOMAIN` | **Activo — datos reales** |

**Flujo de trabajo:**
```
Desarrollar en DEV → Ejecutar tests → Push a PROD
```

---

## Roles del sistema

`visor` < `operador` < `coordinador` < `superuser`

- **visor:** Solo lectura (dashboard, reportes)
- **operador:** Gestión de casos, organizaciones, beneficios
- **coordinador:** Operador + reconstrucción de vistas, configuración de módulos
- **superuser:** Coordinador + gestión de usuarios, reset de datos, configuración de sistema

---

## Módulos principales

| Módulo | Ruta | Rol mínimo | Descripción |
|--------|------|-----------|-------------|
| **Inicio** | `/inicio` | visor | Dashboard nativo con KPIs y alertas |
| **Nuevo ingreso** | `/nuevo-ingreso` | operador | Registro de vecinos y solicitudes |
| **Buscar** | `/buscar` | operador | Búsqueda de vecinos/organizaciones |
| **Ficha** | `/ficha` | operador | Detalle de un vecino/caso |
| **Avance** | `/avance` | operador | Seguimiento de hitos de constitución |
| **Organizaciones** | `/organizacion` | operador | Gestión de organizaciones y grupos |
| **Socios** | `/socios` | operador | Gestión de socios y directivas |
| **Beneficios** | `/instrumento` | operador | Instrumentos, capacitaciones, fondos |
| **Historial** | `/historial` | superuser | Auditoría de logs del sistema |
| **Usuarios** | `/usuarios` | superuser | Gestión de usuarios y permisos |
| **Configuración** | `/configuracion` | superuser | Configuración de la aplicación |

---

## Documentación disponible

### 📘 Para nuevos desarrolladores
- **[README.md](README.md)** — Este archivo (Quick Start)
- **[INICIO-RAPIDO-CLAUDE.md](INICIO-RAPIDO-CLAUDE.md)** — Resumen ejecutivo para sesiones Claude
- **[CLAUDE.md](CLAUDE.md)** — Guía técnica extensa (fuente de verdad)

### 🔧 Documentación técnica
- **[docs/arquitectura.md](docs/arquitectura.md)** — Capas, módulos, flujo request→response
- **[docs/modelo-datos.md](docs/modelo-datos.md)** — Esquema de hojas, relaciones, pipeline
- **[docs/deploy.md](docs/deploy.md)** — Proceso completo de despliegue DEV/PROD
- **[docs/seguridad.md](docs/seguridad.md)** — Roles, permisos, scopes, PINs
- **[docs/design-system.md](docs/design-system.md)** — Sistema de diseño completo
- **[docs/dev-stats.md](docs/dev-stats.md)** — Métricas del proyecto

### 📋 Operación y mantenimiento
- **[docs/CHECKLIST-PRODUCCION.md](docs/CHECKLIST-PRODUCCION.md)** — Verificación pre-deploy PROD
- **[docs/MANTENER-DOCS.md](docs/MANTENER-DOCS.md)** — Guía de mantenimiento de documentación
- **[Manual.html](go-pes-local/Manual.html)** — Manual de usuario embebido en la app

### 📦 Archivo histórico
- **[docs/archive/](docs/archive/)** — Documentos de análisis y deployment históricos

---

## Soporte y contribución

- **Issues y feedback:** https://github.com/PabloRamosRamos/go-pes-local/issues
- **Mantenimiento de docs:** Lee [docs/MANTENER-DOCS.md](docs/MANTENER-DOCS.md) antes de contribuir
- **Tests antes de PR:** Ejecutar `goPesRunAllTests()` → 0 fallos
- **Commit de docs + código juntos:** Ver checklist en `docs/MANTENER-DOCS.md`

---

## Licencia

Uso interno — Municipalidad de Providencia, Chile.

---

## 📚 Guía rápida de documentos

| Situación | Documento |
|-----------|-----------|
| 🆕 Soy nuevo en el proyecto | README.md → [INICIO-RAPIDO-CLAUDE.md](INICIO-RAPIDO-CLAUDE.md) |
| 🤖 Inicio sesión con Claude | [INICIO-RAPIDO-CLAUDE.md](INICIO-RAPIDO-CLAUDE.md) |
| 🔧 Voy a programar backend | [CLAUDE.md](CLAUDE.md) → [docs/arquitectura.md](docs/arquitectura.md) |
| 🎨 Voy a programar frontend | [docs/design-system.md](docs/design-system.md) |
| 🚀 Voy a hacer deploy | [docs/CHECKLIST-PRODUCCION.md](docs/CHECKLIST-PRODUCCION.md) → [docs/deploy.md](docs/deploy.md) |
| 📝 Voy a actualizar docs | [docs/MANTENER-DOCS.md](docs/MANTENER-DOCS.md) |
| 🔐 Necesito info de seguridad | [docs/seguridad.md](docs/seguridad.md) |
| 📊 Necesito métricas del proyecto | [docs/dev-stats.md](docs/dev-stats.md) |

---

**Versión actual:** 2.1.512  
**Última actualización README:** 2026-06-19  
**Próxima revisión:** Antes del próximo release mayor
