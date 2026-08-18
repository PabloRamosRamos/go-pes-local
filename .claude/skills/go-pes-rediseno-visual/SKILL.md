---
name: go-pes-rediseno-visual
description: >-
  Rediseña la apariencia o el layout de una vista o componente existente de
  GO-PES v2 SIN tocar backend ni APIs (solo la capa de render frontend). Úsala
  para "rediseñar la vista/card/panel de X", "cambiar el layout de", "mejorar el
  diseño visual de", "unificar en una card", "nueva maqueta aprobada de" un
  módulo existente como Avance, Ficha, Beneficios, etc. NO es para features
  nuevas con datos nuevos (eso es go-pes-feature) ni para cambiar colores del
  sistema (eso es go-pes-colores).
---

# go-pes-rediseno-visual — Rediseño visual de una vista (frontend puro)

Skill para rediseñar cómo se ve un módulo o componente **ya existente**, cambiando únicamente la capa de render. El backend, las APIs, los modales y los selectores se conservan intactos.

**Lee primero `references/reglas-go-pes.md`.**

**Antes de maquetar desde cero, revisa `references/patrones-probados.md`** — catálogo de layouts ya aprobados (columnas de igual alto con scroll, cabeceras de 2 líneas, filas compactas, timeline vertical, riel con anillo) con su HTML/CSS mínimo y los *gotchas* que ya costaron un bug. Parte de un patrón existente cuando aplique.

## Regla de oro
Es un rediseño de **render**, no de comportamiento. Los datos ya llegan del backend; solo cambia cómo se dibujan.

## Fase 1 — Lectura (NO escribir código)
1. Lee completo el `Scripts_<Modulo>.html` afectado y las secciones relevantes de `Styles.html` (clases del módulo, ej. `avance-*`) y `ThemeDark.html` (overrides del módulo).
2. Identifica exactamente qué funciones de render vas a reemplazar (ej. `renderAvanceResumen_` + `renderAvanceBotones_`) y qué datos ya entrega el backend (documenta el shape).
3. Lista lo que **NO** se toca: selectores de búsqueda, modales, llamadas API, helpers reutilizados.
4. Presenta análisis (archivos/funciones a modificar + riesgos) y **espera aprobación**.

## Fase 2 — Implementación

### Dónde va el CSS
- **Todo el CSS se centraliza en `Styles.html` (modo claro) y `ThemeDark.html` (overrides oscuros).** El CSS nuevo se **agrega al final** de `Styles.html`, en bloque delimitado con comentario de sección; los overrides de modo oscuro van al final de `ThemeDark.html`. **No se modifica ni elimina** lo existente; prohibido el CSS inline. (Norma vigente; el viejo precedente de meter CSS en `Index.html` quedó superado — ver maestro.)
- Todas las clases nuevas con **prefijo propio** (ej. `av2-`) para no colisionar con las existentes (`avance-*`).

### Colores
- Usa **variables CSS existentes con su fallback hex exacto**. Antes de escribir, **grepea el `:root` de `Styles.html`** para copiar el valor real (no lo adivines). Valores reales verificados: `var(--surface,#FFFFFF)`, `var(--surface-alt,#F1F6FA)`, `var(--border,#BFD9E7)`, `var(--text,#24364B)`, `var(--text-muted,#64748B)`, `var(--runtime-brand-primary,#3D96B4)`, `var(--runtime-brand-secondary,#8CC63F)`, `var(--runtime-brand-accent,#03C2AE)`.
- **Ojo:** las variables CSS `:root` **no** son las constantes JS `GO_PES_V2.COLORS` (p. ej. `--border` es `#BFD9E7`, no el `#D6E0EA` de `COLORS.border`). Para el render usa siempre las variables CSS. Si dudas del sistema completo, aplica `go-pes-colores`.
- **Nunca hex duro para fondos/textos neutros** — rompería el modo oscuro. Solo usa hex fijo para acentos saturados puntuales (ej. verde de cumplido `#8CC63F`).
- Si el rediseño implica repensar colores del sistema, detente y usa `go-pes-colores`.

### Qué NO tocar (scope mínimo)
- No tocar backend, no tocar otros módulos, no renombrar funciones públicas.
- No modificar selectores, modales de registro/edición, ni las llamadas API. El botón de acción debe seguir llamando a la misma función existente (ej. `registrarHitoAvanceUi_(codigo)`).
- Las funciones de limpieza de la vista (`clear<Modulo>View_`) deben seguir funcionando con la nueva estructura.

### Accesibilidad
- Filas colapsables con `role="button"` y `aria-expanded`; segmentos con `aria-label`; los CTA son `<button>` reales.
- Respeta `prefers-reduced-motion` en transiciones.

## Fase 3 — Verificación
1. Prueba en DEV varios estados representativos (datos parciales, vacío, finalizado, estados alternativos, y cada tipo de contexto).
2. Verifica **modo claro y oscuro** (regla crítica: son interdependientes).
3. Confirma que las acciones (ej. registrar/guardar) siguen refrescando la vista correctamente.
4. `goPesRunAllTests()` en 0 fallos (aunque sea render, confirma que nada se rompió).
5. Reporta: archivos y funciones tocadas, por qué, y confirmación de que en `Styles.html`/`ThemeDark.html` **solo se agregó** el bloque nuevo al final (nada existente modificado ni eliminado).

## Fase 4 — Capitalizar el resultado (tras aprobación del usuario)
Cuando el usuario **apruebe** el rediseño, actualiza `references/patrones-probados.md`: agrega el patrón nuevo o refina uno existente (HTML/CSS mínimo, cuándo usarlo, gotchas encontrados). El objetivo es **no volver a maquetar desde cero** un layout equivalente. Luego re-empaqueta `dist/` y espeja a `.claude/skills/` (ver `skills/README.md`).

## Skills relacionadas
- `go-pes-colores` — si hay que repensar el sistema de color.
- `go-pes-deploy` — al pasar a DEV/PROD.
