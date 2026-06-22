# INICIO RÁPIDO — GO-PES v2 (Sesiones Claude)

> **📂 Ubicación:** `docs/INICIO-RAPIDO-CLAUDE.md`  
> **📋 REGLA DE ORGANIZACIÓN:** **Toda la documentación está en `docs/` — SIN archivos .md en la raíz del proyecto**

**Propósito:** Este documento contiene la información esencial que Claude necesita al iniciar una nueva sesión de desarrollo. Es un resumen ejecutivo del proyecto.

**Última actualización:** 2026-06-19  
**Versión del proyecto:** v2.1.512

---

## 📋 ¿Qué es GO-PES?

**GO-PES v2** (Gestor Operativo del Programa Estamos Seguros) es una aplicación web interna de la **Municipalidad de Providencia, Chile** para gestionar organizaciones comunitarias, beneficios e instrumentos de apoyo social.

**Características clave:**
- SPA construida sobre Google Apps Script (runtime V8)
- Google Sheets como base de datos (hojas = tablas)
- Vanilla JS (sin frameworks), HTML5, CSS3
- Autenticación Google OAuth + control interno por roles
- Deploy con clasp a entornos DEV/PROD

---

## 🎯 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Runtime | Google Apps Script (V8) |
| Base de datos | Google Sheets |
| Frontend | HTML5 + CSS3 + Vanilla JS |
| Auth | Google OAuth + DIM_Usuarios |
| Hosting | Google Apps Script Web App |
| CLI | clasp |
| Zona horaria | America/Santiago |

**NO hay:** npm en runtime, bundler, servidor externo, framework frontend.

---

## 📁 Estructura del código

```
GO Provi/
│
├── docs/                       ← 📚 Toda la documentación (SIN .md en raíz)
│   ├── README.md               ← Quick Start para usuarios/nuevos devs
│   ├── INICIO-RAPIDO-CLAUDE.md ← Este archivo (resumen para Claude)
│   ├── CLAUDE.md               ← Guía técnica extensa (fuente de verdad)
│   ├── CHECKLIST-PRODUCCION.md ← Pre-deploy checklist
│   │
│   ├── arquitectura.md         ← Capas, módulos, flujo
│   ├── modelo-datos.md         ← Esquema hojas, relaciones
│   ├── deploy.md               ← Deploy DEV/PROD
│   ├── seguridad.md            ← Roles, permisos, PINs
│   ├── design-system.md        ← Sistema diseño completo
│   ├── dev-stats.md            ← Métricas proyecto
│   └── archive/                ← Documentos históricos
│
└── go-pes-local/               ← Código fuente Apps Script
    ├── Main.js                 ← Bootstrap, GO_PES_V2 constante
    ├── Auth.js                 ← Autenticación, usuarios
    ├── SecurityPins.js         ← PINs con rate limiting
    ├── Repository.js           ← Acceso a hojas + cache
    ├── Services.js             ← Lógica de negocio principal
    ├── ZZ_*Backend.js          ← Módulos de negocio (Avance, Beneficios, etc.)
    ├── Index.html              ← Template principal
    ├── Styles.html             ← CSS global (~154 KB)
    ├── ThemeDark.html          ← CSS modo oscuro
    ├── Scripts.html            ← Core JS
    ├── Scripts_*.html          ← JS por módulo (8 parciales)
    ├── Manual.html             ← Manual de usuario
    └── Audith.js               ← Suite de tests (262 tests)
```

---

## 🔐 Roles del sistema

`visor` < `operador` < `coordinador` < `superuser`

- **visor:** Solo lectura
- **operador:** Gestión de casos, organizaciones, beneficios
- **coordinador:** + reconstrucción de vistas, config módulos
- **superuser:** + gestión usuarios, reset datos, config sistema

---

## 🧩 Módulos principales

| Módulo | Ruta | Rol mínimo | Descripción |
|--------|------|-----------|-------------|
| Inicio | `/inicio` | visor | Dashboard nativo KPIs |
| Nuevo ingreso | `/nuevo-ingreso` | operador | Registro vecinos |
| Ficha | `/ficha` | operador | Detalle vecino/caso |
| Avance | `/avance` | operador | Seguimiento hitos |
| Organizaciones | `/organizacion` | operador | Orgs comunitarias |
| Beneficios | `/instrumento` | operador | Instrumentos/capacitaciones |
| Usuarios | `/usuarios` | superuser | Gestión usuarios |
| Configuración | `/configuracion` | superuser | Config sistema |

---

## 🗄️ Hojas clave del Spreadsheet

### Tipos de hojas
- **RAW_\*** — Datos de entrada (formularios, importaciones)
- **MAE_\*** — Maestros (casos, organizaciones)
- **FACT_\*** — Hechos/transacciones (hitos, instrumentos, socios)
- **DIM_\*** — Dimensiones/catálogos
- **VW_\*** — Vistas derivadas
- **CFG_\*** — Configuración
- **LOG_\*** — Logs del sistema

### Hojas más importantes
- `DIM_Usuarios` — Usuarios del sistema con roles
- `MAE_Casos` — Registro maestro de vecinos/solicitudes
- `MAE_Organizaciones` — Organizaciones comunitarias
- `FACT_Avance_Hitos` — Seguimiento hitos de constitución
- `CFG_Parametros` — Configuración runtime (JSON)

---

## 🔧 Comandos de desarrollo

### Deploy
```powershell
.\push-dev.ps1    # Deploy a DEV
.\push-prod.ps1   # Deploy a PROD (requiere confirmación)
```

### Tests
```javascript
// Desde Apps Script Editor:
goPesRunAllTests()  // 262 tests, 0 fallos esperado
```

### Configuración inicial (primera vez)
```javascript
// 1. Configurar PINs de seguridad
goPesConfigurePinDeSeguridad('admin_reset', 'PIN')
goPesConfigurePinDeSeguridad('user_deactivate', 'PIN')
goPesConfigurePinDeSeguridad('evento_abierto', 'PIN')

// 2. Inicializar superusuario
goPesSeedSuperUsers()  // pablo.ramos@providencia.cl
```

---

## 🎨 Frontend — Design System

**Variables CSS clave:**
- Colores: `--runtime-brand-primary`, `--text`, `--surface`, `--border`
- Espaciado: `--space-1` (4px) a `--space-8` (40px)
- Border radius: `--radius-sm` a `--radius-pill`

**Componentes base:**
- Botones: `.primary-btn`, `.secondary-btn`, `.danger-btn`
- Badges: `.badge-pill` (con variantes `--success`, `--warning`, `--error`)
- Cards: `.panel`, `.card`
- Modales: `A11Y.openModal()`, `A11Y.closeModal()`
- Toasts: `GO_PES_UI.showSuccess()`, `GO_PES_UI.showError()`

**Iconografía:** Material Symbols Outlined (Google Fonts)

**Tipografía:** Inter (Google Fonts)

**Ver:** [`docs/design-system.md`](docs/design-system.md) para referencia completa

---

## ⚡ Convenciones de código críticas

### Backend
1. **Funciones privadas con `_` final:** `getUserData_()` (internas)
2. **Funciones públicas sin `_`:** `getUserData()` (API cliente)
3. **Validar roles al inicio:** `requireRole_(minRole)`, `requireModuleAccess_(module)`
4. **Serializar respuestas:** `serializeForClient_(data)`
5. **Cache en memoria:** `GO_PES_RUNTIME` para datos frecuentes

### Frontend
1. **TODO el CSS en `Styles.html` y `ThemeDark.html`**
2. **PROHIBIDO CSS inline en JS**
3. **Nomenclatura BEM:** `.bloque`, `.bloque__elemento`, `.bloque--modificador`
4. **Prefijos de módulo:** `org-card__*`, `ficha-gestiones__*`, `inicio-cal__*`
5. **Modo claro Y oscuro obligatorios juntos**

### Sistema de colores — REGLA CRÍTICA
⚠️ **Antes de tocar un color:**
1. Hacer grep del valor exacto en todos los archivos
2. Distinguir colores de sistema vs. colores de branding
3. Verificar modo claro Y modo oscuro
4. Usar hex exacto (no aproximaciones)
5. Los fallbacks del sistema NO son errores

---

## 🚨 Reglas de trabajo OBLIGATORIAS

### Flujo general
1. **Analiza antes de actuar** — Entiende el alcance completo
2. **Fase 1 siempre es lectura** — Primero analizar, luego código
3. **Scope mínimo** — Menos archivos, menos líneas
4. **Reporta lo que cambiaste** — Qué archivo, qué línea, por qué
5. **Di explícitamente si algo puede romperse**

### Backend
- Leer función completa antes de modificar
- No eliminar/renombrar funciones públicas sin verificar llamadas
- No agregar dependencias externas sin aprobación
- Los fallback values son intencionales, no errores

### Frontend y diseño
- **CSS solo en `Styles.html`/`ThemeDark.html`**
- Reutilizar antes de crear
- Convención de nombres con prefijo de módulo
- Modo claro y oscuro juntos
- Agregar al final del archivo con comentario de sección
- No modificar splash/logo/layout sin instrucción explícita

---

## 📊 Estadísticas del proyecto

| Métrica | Valor |
|---------|-------|
| Archivos de código | 44 (22 JS + 22 HTML) |
| Líneas de código | ~33.326 |
| Tests automatizados | 262 (0 fallos) |
| Cobertura estimada | ~78% |
| Módulos funcionales | 11 |
| Hojas de base de datos | 35+ |
| Estado general | ✅ PRODUCCIÓN ESTABLE |

**Ver:** [`docs/dev-stats.md`](docs/dev-stats.md) para desglose completo

---

## 🔒 Seguridad — Auditoría 2026-05-31

**Hallazgos críticos cerrados:** 5 de 7

- ✅ Auth guards en funciones mutantes
- ✅ Sistema de PINs externalizado + rate limiting
- ✅ Historial restringido a superuser
- ✅ Spreadsheet ID externalizado
- 🟡 Gmail hardcodeada (excluido, solo DEV)
- 🟡 WebApp access: ANYONE (excluido, diseño intencional)

**Ver:** [seguridad.md](seguridad.md) para detalles

---

## 📚 Documentación disponible

> **Toda en `docs/`** — Sin archivos .md en raíz

### Core
- **[CLAUDE.md](CLAUDE.md)** — Guía técnica extensa (fuente de verdad)
- **[README.md](README.md)** — Quick start para usuarios/nuevos devs
- **INICIO-RAPIDO-CLAUDE.md** — Este archivo

### Técnica
- **[arquitectura.md](arquitectura.md)** — Capas, módulos, flujo
- **[modelo-datos.md](modelo-datos.md)** — Esquema hojas, relaciones
- **[deploy.md](deploy.md)** — Proceso despliegue DEV/PROD
- **[seguridad.md](seguridad.md)** — Roles, permisos, PINs
- **[design-system.md](design-system.md)** — Sistema diseño completo
- **[dev-stats.md](dev-stats.md)** — Métricas desarrollo

### Operación
- **[CHECKLIST-PRODUCCION.md](CHECKLIST-PRODUCCION.md)** — Pre-deploy PROD
- **[MANTENER-DOCS.md](MANTENER-DOCS.md)** — Mantenimiento docs
- **[Manual.html](../go-pes-local/Manual.html)** — Manual usuario embebido

---

## 🎯 Tareas pendientes (estado actual)

✅ **Completadas (Fases 1-5):**
- Manual de usuario implementado
- `Scripts.html` dividido en 8 parciales
- Tests automatizados (262 tests)
- Auditoría de seguridad (5/7 cerrados)
- Plan mejora frontend completo
- Sistema transiciones UX
- Design System documentado

❌ **Pendientes (prioridad baja/media):**
- Superusuario y dominios confiables hardcodeados en Main.js
- Añadir `data-label` attributes a tablas dinámicas (responsive)

---

## 🚀 Últimos cambios significativos

**2026-06-01 (UX — Normalización mensajes técnicos)**
- Sistema traducción errores técnicos → mensajes operativos
- Capa central + limpieza en origen
- ~169 líneas modificadas, ~15 mensajes auto-traducidos

**2026-06-01 (Testing — Suite seguridad corregida)**
- 262 tests, 0 fallos
- `docs/dev-stats.md` creado

**2026-06-01 (UX — Transiciones)**
- Sistema completo: modales, vistas, stagger
- Gramática movimiento: duraciones, easings, `prefers-reduced-motion`

**2026-05-31 (Seguridad — PINs externalizados)**
- Sistema centralizado en `SecurityPins.js`
- Rate limiting 3 intentos/hora
- 3 contextos separados

**Ver:** `CLAUDE.md` historial completo de cambios

---

## 🔄 Proceso típico de desarrollo

1. **Leer `CLAUDE.md` relevante** para el área de trabajo
2. **Analizar scope del cambio** (qué archivos, qué funciones)
3. **Preguntar si hay ambigüedad**
4. **Implementar con scope mínimo**
5. **Actualizar documentación** en el mismo commit
6. **Ejecutar tests** (`goPesRunAllTests()`)
7. **Reportar cambios** (archivo:línea, qué y por qué)
8. **Deploy a DEV** → verificar → **Deploy a PROD**

---

## 📞 Contacto y soporte

- **Desarrollador:** Pablo Ramos (`pablo.ramos@providencia.cl`)
- **Email personal:** `p.e.ramos.ramos@gmail.com`
- **Repo:** (privado, Municipalidad de Providencia)

---

## 🎓 Recursos para Claude

### Al iniciar sesión
1. **Leer este archivo primero** (`INICIO-RAPIDO-CLAUDE.md`)
2. **Consultar `CLAUDE.md`** para detalles técnicos
3. **Revisar `docs/MANTENER-DOCS.md`** si hay que actualizar docs
4. **Consultar `docs/design-system.md`** si hay cambios frontend

### Durante desarrollo
- **Backend:** `docs/arquitectura.md`, `docs/modelo-datos.md`
- **Frontend:** `docs/design-system.md`
- **Deploy:** `docs/deploy.md`
- **Seguridad:** `docs/seguridad.md`

### Antes de commit
- **Checklist:** [MANTENER-DOCS.md](MANTENER-DOCS.md) → sección "Checklist pre-commit"
- **Tests:** Ejecutar `goPesRunAllTests()` → 262 tests, 0 fallos

---

## ✨ Principios del proyecto

1. **Simplicidad sobre complejidad** — Vanilla JS, sin frameworks
2. **Documentación sincronizada con código** — Actualizar en el mismo commit
3. **Tests antes de deploy** — 0 fallos obligatorio
4. **Scope mínimo por cambio** — Una cosa a la vez
5. **UX consistente** — Design System como fuente de verdad
6. **Seguridad por capas** — Auth guards + PINs + rate limiting
7. **📂 Documentación organizada** — **Toda en `docs/`, SIN .md en raíz**

---

**¡Listo para comenzar! 🚀**

**Próximos pasos sugeridos:**
1. Ejecutar `goPesRunAllTests()` para verificar estado
2. Revisar [dev-stats.md](dev-stats.md) para métricas actuales
3. Consultar [CLAUDE.md](CLAUDE.md) para área de trabajo específica
4. **Recordar:** Toda la documentación está en `docs/` — sin archivos .md en raíz
