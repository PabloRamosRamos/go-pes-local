# Análisis completo — GO-PES v2

**Fecha:** 2026-07-10
**Versión analizada:** 2.1.905 · build `47d37d5` (HEAD de `master`) · 2026-07-02
**Alcance:** arquitectura, calidad de código, riesgos, deuda técnica y estado de pendientes. Solo lectura — no se modificó ningún archivo del proyecto.

---

## 1. Resumen ejecutivo

GO-PES v2 es un proyecto maduro y bien estructurado para su stack (Google Apps Script + Sheets, sin frameworks). Tiene ~44.500 líneas en 53 archivos fuente, separación clara de capas (bootstrap / infraestructura / negocio / frontend), 262 tests automatizados en 7 suites, documentación técnica extensa y actualizada en `docs/`, y un flujo DEV→PROD con checklist pre-vuelo.

Los hallazgos más relevantes son de higiene, no de arquitectura: **funciones públicas sin guard de autenticación en archivos de migración/instalación** (el más serio), texto corrupto por doble codificación UTF-8 en `Main.js`, un working tree de git 100% "sucio" por line endings (CRLF/LF) que oculta los cambios reales, y mensajes de commit sin significado que anulan la trazabilidad que las propias reglas del proyecto exigen.

---

## 2. Radiografía del proyecto

| Métrica | Valor real (2026-07-10) | Valor en `DEV_STATS` (Main.js) |
|---|---|---|
| Líneas de código | 44.486 | 34.000 |
| Archivos fuente | 53 (en `go-pes-local/`) | 37 |
| Funciones públicas (API cliente) | 129 | 99 |
| Tests | 262 (7 suites) | 249 |

`DEV_STATS` está desactualizado (el comentario dice actualizarlo por versión significativa; la última fue 2026-06-01).

Archivos más grandes: `Styles.html` (8.566 líneas), `Scripts_Beneficios.html` (4.299), `Scripts.html` (2.406), `Scripts_Admin.html` (2.360), `ZZ_BeneficiosBackend.js` (1.958), `ZZ_AvanceBackend.js` (1.771).

El proyecto creció considerablemente respecto al snapshot del CLAUDE.md de mayo: módulos nuevos **Alertas** (`Alertas.js`), **Dashboard** (`Dashboard.js`), **Calendario** (`ZZ_CalendarioBackend.js` + `Calendario.html`), **Migración** (`ZZ_MigracionBackend.js`, `ZZ_MigracionHitos.js`), **Integración Google Forms de socios** (`ZZ_FormSociosIntegration.js`), **PINs de seguridad** (`SecurityPins.js`), **Manual de usuario** (`Manual.html`, `ManualProcedimientos.html`), y parciales frontend nuevos (`Scripts_UI`, `Scripts_Utils`, `Scripts_A11y`, `Scripts_CatalogCache`, `Scripts_Calendario`).

---

## 3. Arquitectura

### Backend

La separación de capas es consistente y se respeta en el código real, no solo en la documentación:

- **Bootstrap** (`Main.js`): `GO_PES_V2` como fuente de verdad (sheets, vistas, roles, colores, alertas, dashboard). `doGet()` construye el bootstrap completo (usuario, permisos, config, preferencias) en una sola pasada — buen diseño para minimizar round-trips en GAS.
- **Infraestructura**: `Repository.js` centraliza acceso a hojas con cache por ejecución (`GO_PES_RUNTIME`) e invalidación explícita. `Auth.js` resuelve identidad contra `DIM_Usuarios` con logging de accesos denegados. `SecurityPins.js` almacena PINs hasheados en PropertiesService con rate limiting (3 intentos/hora).
- **Negocio**: servicios de dominio con patrón uniforme — guard (`requireModuleAccess_`/`requireRole_`) al inicio, `LockService` en escrituras, diagnóstico opcional (`goPesDiagStart_`), serialización vía `serializeForClient_`. Verifiqué este patrón en `Services.js`, `ZZ_OrganizacionesBackend.js`, `ZZ_SociosBackend.js` y `ZZ_MigracionBackend.js`: se cumple.
- **Entornos**: detección DEV/PROD por Script ID en runtime; `push-prod.ps1` reescribe VERSION/BUILD/ENVIRONMENT y exige confirmación + checklist. Sólido.

### Frontend

- `Index.html` como shell; parciales incluidos vía `include()`/`includeModule_()`. Core (`Scripts.html`, 2.406 líneas) + 12 parciales por módulo. El propio header de `Scripts.html` documenta una Fase 3 pendiente (dividir el core en 3 archivos) marcada como riesgo alto / valor alto — sigue sin hacerse, razonablemente.
- Tema oscuro por `data-theme` en `<html>` con variables CSS override (`ThemeDark.html`) — limpio, y el snippet anti-flash se ejecuta antes del render.
- Preferencias de usuario: tema y zoom en `localStorage`; módulo por defecto en `PropertiesService` (backend), correctamente validado contra permisos en `buildBootstrapForTemplate_`.

### Datos y seguridad

- Webapp con `access: ANYONE` + `executeAs: USER_ACCESSING` — intencional y documentado (`docs/seguridad.md`, checklist de producción). El control real es contra `DIM_Usuarios`.
- Modelo de roles normalizado (`visor < operador < coordinador < superuser`); `'administrador'` se mapea a `coordinador` como compatibilidad.
- `docs/` es un activo notable: 17 documentos organizados (arquitectura, modelo de datos, seguridad, design system, deploy, checklist de producción) con convenciones de mantenimiento (`MANTENER-DOCS.md`).

---

## 4. Hallazgos y riesgos (priorizados)

### ALTO — Funciones públicas sin guard en migración/instalación

En GAS, **toda función sin sufijo `_` es invocable desde el cliente** por cualquier usuario que cargue la webapp (incluso rol `visor`), vía consola del navegador y `google.script.run`. Encontré estas sin ningún guard:

| Archivo | Funciones | Riesgo |
|---|---|---|
| `ZZ_MigracionHitos.js` | `analizarHoja19`, `goPesAnalizarHoja19`, `analizarMigracionHoja19`, `goPesAnalizarMigracionHoja19`, `migrarHitosHoja19`, `goPesMigrarHitosHoja19` | `migrarHitosHoja19(false)` ejecuta una migración que **escribe en FACT_Hitos**. Además contiene el spreadsheet ID de origen hardcodeado (líneas 13 y 77) |
| `ZZ_AvancePhase1.js` | `goPesInstalarModuloAvanceFase1`, `goPesDiagnosticarModuloAvanceFase1` | Instalación/creación de hojas invocable por cualquier usuario |
| `ZZ_AvancePhase2.js` | `goPesSembrarCatalogoAvanceFase2`, `goPesDiagnosticarCatalogoAvanceFase2` | Siembra de catálogos invocable por cualquier usuario |

Agrava el punto: `docs/seguridad.md` declara el riesgo "ID de migración expuesto" como **mitigado** ("movido a PropertiesService"). Eso es cierto para `ZZ_MigracionBackend.js` (que sí tiene guards `superuser` en todas sus públicas), pero `ZZ_MigracionHitos.js` (posterior, 2026-06-08) lo reintrodujo. La documentación de seguridad afirma algo que el código contradice.

**Recomendación:** agregar `requireRole_(['superuser'])` a las 10 funciones, o convertirlas en privadas (`_`) si solo se ejecutan desde el editor. Si la migración de Hoja 19 ya se completó, eliminar el archivo entero.

Nota: `goPesAutoCloseFormEventos` (ZZ_BeneficiosBackend) también carece de guard, pero es correcto — es el handler del trigger horario y no debe exigir sesión. `getCatalogosAppClient`/`getCatalogosApp` (Catalogs.js) tampoco tienen guard; exponen solo catálogos sanitizados — impacto bajo, pero vale decidirlo conscientemente.

### MEDIO — Texto corrupto (doble codificación UTF-8) en `Main.js`

Tres ocurrencias de mojibake almacenadas literalmente en el archivo (UTF-8 con BOM):

- Línea 328: `join(' Â· ')` en `getAppVersionLabel_` → **el separador corrupto es visible en la etiqueta de versión del UI**.
- Línea 343: mismo separador en `getAppVersionLabelLegacy_`.
- Línea 348: `'…antes de ejecutar esta funciÃ³n.'` en `fijarSpreadsheetPES_`.

Causa probable: alguna pasada de `push-prod.ps1` (`Get-Content`/`Set-Content`) en Windows PowerShell 5.1 leyó el archivo sin BOM como ANSI y lo reescribió como UTF-8. El script actual escribe con `-Encoding utf8` pero no fija encoding en la lectura. **Recomendación:** corregir las 3 cadenas (` · ` y `función`) y agregar `-Encoding utf8` al `Get-Content` del script (o migrar a PowerShell 7, que es UTF-8 por defecto).

### MEDIO — Working tree 100% "sucio" por line endings

`git status` muestra ~24 archivos modificados, pero el diff (24.791 inserciones = 24.791 eliminaciones) es **enteramente churn CRLF↔LF**. El único cambio real de contenido es `Main.js`: `BUILD: 'f8890c1' → '47d37d5'` y `ENVIRONMENT: 'PROD' → 'DEV'` (residuo esperable de los scripts de push). No hay `.gitattributes` ni `core.autocrlf` configurado.

Consecuencia: cualquier cambio real queda enterrado en ruido, y el próximo commit registrará 24 mil líneas falsas. **Recomendación:** crear `.gitattributes` con `* text=auto`, normalizar una vez (`git add --renormalize .`) y commitear eso separado de cualquier cambio funcional.

### MEDIO — Mensajes de commit sin significado

De los últimos 25 commits, al menos 10 son ruido: `dfgh`, `jk`, `werftgh`, `sdfghj`, `jdbnkdojsjbkkd`, `regthygj`, etc. Esto contradice directamente la regla del proyecto ("cada push debe ir acompañado de un resumen de qué cambió y cómo probarlo") y hace imposible auditar qué entró a PROD en junio. El repo remoto además tiene ramas `main` y `master` coexistiendo en origin — conviene eliminar la que no se usa.

### BAJO — Duplicación de constantes de entorno

`SCRIPT_ID_DEV_` y `SCRIPT_ID_PROD_` están declarados con `var` **dos veces** (en `Alertas.js` y `ZZ_CalendarioBackend.js`). En GAS todos los archivos comparten scope global; hoy los valores coinciden, pero si alguna vez divergen el resultado dependerá del orden de carga de archivos. Centralizar en `GO_PES_V2` (p. ej. `GO_PES_V2.SCRIPT_IDS`) junto a una única `isDevEnvironment_()`.

### BAJO — Métricas y documentos desactualizados

- `DEV_STATS` en `Main.js` (ver tabla de la sección 2).
- El `CLAUDE.md` de la carpeta del proyecto Claude ("Gestor operativo - Providencia") es el snapshot de 2026-05-26 y lista como pendientes cosas ya resueltas; la versión viva es `docs/CLAUDE.md`. Conviene sincronizarlos o dejar el viejo como puntero al nuevo.
- `docs/dev-stats.md` (2026-06-01) también quedó atrás del código.

### BAJO — Archivo suelto `test-flujo-socios.js` en la raíz

Script de prueba manual fuera de `go-pes-local/` (no se pushea a GAS, no hace daño), pero tiene un bug latente: si `grupos.length === 0`, usa `grupo` sin definir y lanza ReferenceError. Si ya cumplió su propósito, eliminarlo; si no, moverlo a una carpeta `scratch/` o integrarlo a `Audith.js`.

---

## 5. Estado de pendientes (CLAUDE.md de mayo vs. código actual)

| Pendiente (2026-05-26) | Estado verificado hoy |
|---|---|
| Bug visual de colores (bloqueante) | **Resuelto** — sin rastro en código ni en `docs/`; el plan de mejora frontend (5/5 fases) y el sistema de transiciones están cerrados |
| Eliminar 3 funciones duplicadas en `Scripts_Beneficios.html` | **Resuelto** — verifiqué: existe una sola definición de `renderCamaras1414Panel_`, `Table_` y `Detail_` |
| Menú usuario: módulo de inicio por defecto | **Implementado** — `goDefaultModule` vía `getUserPreferences()`/`PropertiesService`, validado contra permisos en el bootstrap |
| Menú usuario: densidad de vista (compacto/normal/espacioso) | **No implementado** — no existe ninguna clase `density-*`; en su lugar se implementó zoom de aplicación (`APP_ZOOM_OPTIONS`, localStorage). Decidir si la densidad sigue en el roadmap o se descarta formalmente |
| Menú usuario: información del sistema | **Implementado** — `getSystemInfo` presente en `Auth.js` y modal en `Scripts.html` |
| Reestructurar submódulo branding | **Implementado** — 6 claves, `<input type="color">`, inyección como variables CSS (`--runtime-brand-*`) en `Scripts_Admin.html`/`SystemConfig.js` |
| Superusuario/dominios hardcodeados en `Main.js` | **Pendiente** — siguen en `GO_PES_V2.SUPERUSERS`/`TRUSTED_DOMAINS`; `docs/seguridad.md` lo registra como riesgo aceptado |
| README de usuario final | **Cubierto de otra forma** — `Manual.html` (manual in-app completo) + `docs/README.md` |

Pendientes vigentes según `docs/CLAUDE.md` (junio): superusers hardcodeados (bajo) y `data-label` en tablas dinámicas para layout responsive (bajo). Este análisis agrega los hallazgos de la sección 4.

---

## 6. Fortalezas

Vale dejarlas registradas porque son decisiones que conviene proteger: patrón de seguridad uniforme (guard + lock + serialización) aplicado con disciplina en los módulos de negocio; cache de ejecución bien diseñado con invalidación explícita; 262 tests ejecutables desde el propio menú del spreadsheet, incluyendo una suite específica de guards y PINs; PINs fuera del código fuente con rate limiting; pipeline DEV→PROD con confirmación interactiva y checklist; documentación técnica en `docs/` de un nivel raro de ver en proyectos internos de este tamaño; y un frontend vanilla que, pese a las ~19.000 líneas de parciales, mantiene convenciones consistentes (parciales sin `<script>`, IIFE única, variables CSS para theming).

---

## 7. Plan de acción sugerido (en orden)

1. **Guards en `ZZ_MigracionHitos.js`, `ZZ_AvancePhase1.js`, `ZZ_AvancePhase2.js`** (o eliminar/privatizar) — 30 min, cierra el hallazgo de mayor riesgo. Agregar un test a la suite Security que recorra las públicas y falle si alguna mutante no tiene guard.
2. **Normalizar line endings** — `.gitattributes` + renormalize en un commit aislado. Desbloquea el uso normal de git.
3. **Corregir mojibake en `Main.js`** (3 cadenas) y fijar encoding de lectura en `push-prod.ps1`.
4. **Retomar disciplina de commits** — mensajes descriptivos; opcionalmente un hook `commit-msg` con largo mínimo.
5. **Sincronizar documentación** — `DEV_STATS`, `dev-stats.md`, `seguridad.md` (corregir la fila "ID de migración expuesto"), y alinear el CLAUDE.md del proyecto Claude con `docs/CLAUDE.md`.
6. **Decidir sobre la densidad de vista** (implementar o descartar) y sobre `test-flujo-socios.js`.
7. **Backlog estructural** (sin urgencia): dividir `Scripts.html` según su propia propuesta Fase 3; evaluar partición de `Scripts_Beneficios.html` (4.299 líneas); centralizar Script IDs de entorno en `GO_PES_V2`.
