# Configuración del sistema y branding

**Propósito:** documentar la configuración editable del sistema (nombre, branding, módulos, socios, alertas) que se persiste en `CFG_Parametros` y se administra desde el módulo **Configuración** (superuser). Fuente de verdad de los defaults: `getDefaultSystemConfig_()` en `go-pes-local/SystemConfig.js`.

---

## Almacenamiento y acceso
- **Persistencia:** una fila JSON en la hoja `CFG_Parametros` (patrón de configuración por JSON serializado). Los defaults se aplican cuando falta una clave.
- **Lectura backend:** `getRuntimeSystemConfig_()` / `getRuntimeClientSystemConfig_()`; para el cliente, `getSystemConfigClient()`.
- **Aplicación en el frontend:** el config inyecta tokens de tema y textos vía `getConfiguredThemeTokens_()` (produce las variables `--runtime-brand-*`) y los getters `getConfigured*_()`.

## Secciones (`getDefaultSystemConfig_`)

| Sección | Contenido |
|---------|-----------|
| `general` | `appName`, `appSubtitle`, `programName`, `environmentLabel`, `showVisibleVersion`, `loadingText`, `splashMinDurationMs` (ritmo de animación del splash, default 5000) |
| `branding` | logos por tema + colores configurables (ver abajo) |
| `accessModules` | `allowedDomain` (`providencia.cl`), `primarySuperuserEmail`, `defaultUserProfile`, `defaultView`, `alwaysVisibleModules`, y el orden/estado de cada módulo |
| `socios` | `addressSuffix`, roles permitidos, campos requeridos, mapeo de columnas para carga masiva |
| `alertas_operativas` | umbrales de plazos — ver [`alertas.md`](alertas.md) |

## Branding (colores y logos configurables)
Los defaults de `branding`:

| Clave | Default | Uso |
|-------|---------|-----|
| `primaryColor` | `#3D96B4` | → `--runtime-brand-primary` |
| `secondaryColor` | `#8CC63F` | → `--runtime-brand-secondary` |
| `accentColor` | `#03C2AE` | → `--runtime-brand-accent` |
| `lightBackground` | `GO_PES_V2.COLORS.bg` (`#F7FAFC`) | fondo modo claro |
| `darkBackground` | `#0D2940` | fondo modo oscuro |
| `loadingProgressColor` | `#8CC63F` | barra del splash |
| `logoLightDataUri` / `logoDarkDataUri` | vacío (usa logo por defecto) | logo por tema (`getConfiguredLogoDataUri_(theme)`) |

> Estos colores de **branding** son distintos de las constantes `GO_PES_V2.COLORS` y de los tokens base `--brand-*` de `Styles.html`. Para entender las tres capas y no romper el sistema visual, usa la skill `go-pes-colores` antes de tocar colores. Los tokens `--runtime-brand-*` sobrescriben los `--brand-*` base cuando hay branding configurado.

## Dónde vive en el código
- Defaults y getters: `SystemConfig.js`.
- Aplicación de tema en runtime: `getConfiguredThemeTokens_()` + inyección en el bootstrap (`Main.js` → `buildBootstrapForTemplate_`).
- UI de administración: módulo Configuración (`Scripts_Admin.html`, rol superuser).
