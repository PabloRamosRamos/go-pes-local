---
name: go-pes-colores
description: >-
  Guardarraíl crítico para cualquier cambio en el sistema de colores de GO-PES
  v2. Úsala SIEMPRE que se vaya a tocar un color, hex, variable CSS, paleta,
  branding, tema claro/oscuro, o para diagnosticar bugs visuales de color (fondos
  incorrectos, textos/íconos descoordinados, contraste roto en modo oscuro).
  Dispara con "cambiar color", "el fondo se ve mal", "ajustar la paleta",
  "branding", "color primario/secundario", "personalizar el tema", "logo o tema
  configurable", "modo oscuro roto", "bug visual de colores". Impone: inventario por
  grep primero, distinguir las tres capas de color (constantes JS / tokens CSS /
  branding runtime), verificar claro y oscuro, hex exacto.
---

# go-pes-colores — Sistema de colores (regla crítica)

El sistema visual de GO-PES es **holístico**: sidebar, íconos, textos, fondos, bordes y acentos son un sistema coordinado. **Un cambio en un color puede romper visualmente módulos sin relación aparente.** Esta skill es un guardarraíl: procedimiento obligatorio antes de tocar cualquier valor de color.

**Lee primero `references/reglas-go-pes.md`.** El branding configurable por el usuario (colores/logo en `SystemConfig`) está documentado en `docs/branding-configuracion.md`.

## Procedimiento obligatorio (en orden)

### 1. Inventario primero — NO modificar nada aún
Haz **grep del valor exacto** (hex o nombre de variable) en **todos** los archivos del proyecto. Presenta la lista completa de apariciones antes de tocar una sola línea. Incluye: `Main.js` (`GO_PES_V2.COLORS`), `Styles.html`, `ThemeDark.html`, `Index.html`, `Splash.html`, los `Scripts_*.html` y `SystemConfig.js`.

### 2. Distingue las TRES capas de color
El color en GO-PES vive en tres capas; confundirlas es la causa raíz de la mayoría de bugs visuales.

1. **Constantes JS `GO_PES_V2.COLORS`** (`Main.js`): `green #007C4A`, `blue #214E8A`, `ink #24364B`, `slate #EAF0F5`, `border #D6E0EA`, `bg #F7FAFC`. Se usan en backend/lógica y como *defaults de configuración* (p. ej. `bg` → `lightBackground` en `SystemConfig.js`); **casi no pintan la UI directamente**. No los sobrescribe el branding.
2. **Tokens base CSS en `:root`** (`Styles.html`) — **estos sí pintan la UI**: identidad `--brand-blue #3D96B4`, `--brand-green #8CC63F`, `--brand-teal #03C2AE`; neutros `--surface #FFFFFF`, `--surface-alt #F1F6FA`, `--border #BFD9E7`, `--text #24364B`, `--text-muted #64748B`. **Sus valores NO coinciden con `GO_PES_V2.COLORS`** (p. ej. `--border #BFD9E7` ≠ `COLORS.border #D6E0EA`): para el render, la fuente son las variables CSS, no las constantes JS.
3. **Branding runtime `--runtime-brand-*`** (inyectado desde `SystemConfig.js`, editable por el usuario): `--runtime-brand-primary` (default `#3D96B4`), `--runtime-brand-secondary` (`#8CC63F`), `--runtime-brand-accent` (`#03C2AE`). Los tokens semánticos derivan de él con fallback al `--brand-*` base, p. ej. `--accent: var(--runtime-brand-primary, var(--brand-blue))`.

- **Nunca reemplaces un color de una capa por el de otra** sin entender qué parte del UI alimenta.

### 3. Modo claro y modo oscuro son interdependientes
Un cambio en un fallback del modo claro puede romper el oscuro y viceversa. **Verifica ambos siempre.** Para fondos y textos neutros usa variables CSS con fallback (`var(--surface,#fff)`), nunca hex duro.

### 4. Hex exacto, sin aproximaciones
Si el sistema usa `#03C2AE`, en todos lados es `#03C2AE`. Nunca sustituyas por un valor "cercano" o "equivalente".

### 5. Los fallbacks del sistema no son errores
Valores como `#F7FAFC` en `GO_PES_V2.COLORS.bg` son constantes con propósito. No los cambies asumiendo que son un descuido — pregunta primero.

## Diagnóstico de bugs visuales de color

Cuando el síntoma es "el área de contenido muestra fondo oscuro incorrecto" o "textos/íconos/fondos descoordinados":

1. **Traza la cadena completa de variables CSS en runtime ANTES de modificar valores.** Identifica qué variable alimenta el elemento roto y de dónde toma su valor (definición en `:root`, override de `ThemeDark.html`, o inyección de branding).
2. Determina si el problema es (a) una variable mal resuelta, (b) un override de modo oscuro faltante/sobrante, o (c) un color de branding pisando uno de sistema.
3. Recién entonces propón el cambio mínimo, e indica su efecto en **ambos** modos.
4. No apliques el fix hasta presentar el diagnóstico y recibir aprobación.

## Cierre
- Reporta cada archivo/línea tocada y por qué.
- Confirma verificación en claro **y** oscuro.
- Si tocaste `Styles.html`/`ThemeDark.html`, justifica la instrucción explícita que lo autorizó.
