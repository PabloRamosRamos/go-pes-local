# Reglas y contexto compartido — GO-PES v2

> Fuente única de las reglas de trabajo del proyecto. Todas las skills `go-pes-*` referencian este archivo. Si una regla cambia, se cambia aquí. La fuente canónica del proyecto es `docs/CLAUDE.md` (regla del repo: **no hay `.md` en la raíz**; toda la documentación vive en `docs/`).

## Contexto mínimo del stack

GO-PES v2 es una aplicación web interna de la **Municipalidad de Providencia** sobre **Google Apps Script (V8)**, embebida en un Google Spreadsheet que actúa como base de datos (hojas = tablas). Frontend en **HTML + CSS + vanilla JS** (sin frameworks, sin bundler, sin npm), servido con `HtmlService.createTemplateFromFile()` y parciales incrustados vía `<?!= include('...') ?>`. El cliente llama al backend con `google.script.run.withSuccessHandler(...).withFailureHandler(...).funcionPublica(payload)`. Zona horaria `America/Santiago`.

- **Layout del repo:** el código Apps Script vive en `go-pes-local/` (todos los `.js`/`.html` que citan estas skills están ahí); la documentación en `docs/`; los scripts de deploy (`push-dev.ps1`, `push-prod.ps1`) y los `.clasp.*.json` en la raíz.
- **Fuente de verdad:** la constante `GO_PES_V2` en `go-pes-local/Main.js` (`VERSION`/`BUILD`/`ENVIRONMENT`, `SCRIPT_IDS`, `COLORS`, `SHEETS`, `VIEWS`, `ROLES`, `AVANCE`, `ALERTAS`, `DASHBOARD`).
- **Roles:** `visor` < `operador` < `coordinador` < `superuser`.
- **Entornos:** DEV (cuenta personal `p.e.ramos.ramos@gmail.com`) y PROD (`pablo.ramos@providencia.cl`, **datos reales**).

## Las 8 reglas de trabajo obligatorias

1. **Analiza antes de actuar.** Entiende el alcance completo antes de escribir código. Si es ambiguo o tiene efectos secundarios no obvios, pregunta primero.
2. **Fase 1 siempre es lectura.** Para cualquier cambio no trivial, la primera entrega es un análisis (archivos y funciones involucradas, riesgos). **No tocar código hasta aprobación explícita.**
3. **Scope mínimo.** Cada cambio afecta el menor número de archivos y líneas posible.
4. **Reporta lo que cambiaste.** Al terminar, lista exactamente qué archivo y qué línea cambió, y por qué.
5. **Di explícitamente si algo puede romperse** — antes de ejecutar, no después. En especial si toca producción.
6. **No elimines ni renombres funciones públicas** (sin sufijo `_`) sin verificar por grep global que nada las llame.
7. **No agregues dependencias externas** (librerías, APIs, servicios) sin aprobación explícita.
8. **Los valores fallback en el código son intencionales** — no los cambies asumiendo que son errores. Pregunta primero.

## Convenciones de backend (Apps Script)

- **Funciones públicas** (API cliente): sin sufijo `_`, automáticamente accesibles desde `google.script.run`.
- **Funciones privadas:** sufijo `_` (ej. `getUsuario_()`).
- **Primera línea de toda función pública:** guard de autorización — `requireRole_(['operador'])` o `requireModuleAccess_(moduleKey, [roles])` (definidos en `Auth.js`). El usuario actual se obtiene con `getUsuarioActual()`.
- **Return al cliente:** siempre a través de `serializeForClient_(...)`.
- **Cache:** usar el runtime en memoria (`GO_PES_RUNTIME`) para datos frecuentes, con TTL cuando aplique, e **invalidar explícitamente** al escribir.
- **Errores:** envolver en try/catch cuando la función escribe o puede fallar por datos.
- **Nuevas constantes de módulo:** registrarlas dentro de `GO_PES_V2` en `Main.js`.
- **Archivos `ZZ_*`** son módulos de negocio tardíos/secundarios; los módulos nuevos autocontenidos pueden tener archivo propio (`Alertas.js`, `Dashboard.js`).

## Convenciones de frontend

- Un parcial por módulo: `Scripts_<Modulo>.html`, incrustado vía `include()` **sin etiqueta `<script>`** (el IIFE contenedor ya está en `Scripts.html`).
- **Vanilla JS puro.** Nada de librerías externas salvo excepción preaprobada y puntual (Leaflet/Chart.js del dashboard, cargadas dinámicamente desde `cdnjs.cloudflare.com` solo al entrar al módulo).
- **Todo el CSS se centraliza en `Styles.html` (modo claro) y `ThemeDark.html` (overrides del modo oscuro).** Prohibido el CSS inline en JS/HTML. Lo existente **no se modifica ni elimina**: el CSS nuevo se **agrega al final**, en bloque delimitado con comentario de sección, con clases de **prefijo propio** para no colisionar; las variantes de modo oscuro van en `ThemeDark.html`. (Precedente histórico: algunas features viejas metían CSS en `Index.html`; la **norma vigente** es centralizar en `Styles.html`/`ThemeDark.html`.)
- Splash, logo, tipografía y layout estructural son la línea gráfica base — no modificar sin instrucción explícita.

## Sistema de colores — regla crítica

El sistema visual es **holístico**: sidebar, íconos, textos, fondos, bordes y acentos están coordinados. Antes de tocar cualquier color, aplica la skill `go-pes-colores`. Resumen: (1) inventario por grep del hex/variable exacto en todos los archivos antes de tocar nada; (2) distinguir colores de **sistema** (`GO_PES_V2.COLORS`) vs **branding** configurable del usuario; (3) modo claro y oscuro son interdependientes, verifica ambos; (4) hex exacto, sin aproximaciones; (5) los fallbacks del sistema no son errores.

## Deploy

Flujo obligatorio: **DEV → `goPesRunAllTests()` en 0 fallos → verificación manual en DEV → PROD**. Se despliega con `.\push-dev.ps1` y `.\push-prod.ps1` (este último con pre-flight interactivo). PROD = datos reales: avisar al equipo. Ver skill `go-pes-deploy`. Cada push va acompañado de un resumen de qué cambió y cómo probarlo.
