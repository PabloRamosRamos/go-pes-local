# Patrones de layout probados — GO-PES v2

Recetas de diseño **ya implementadas y aprobadas** en producción/DEV. Antes de maquetar un layout desde cero, revisa si uno de estos patrones aplica y **parte de él**. Cada patrón lista: cuándo usarlo, el HTML/CSS mínimo, y los *gotchas* que ya costaron un bug.

> Convención: el CSS vive al final de `Styles.html` (claro) y `ThemeDark.html` (oscuro). Colores siempre por variable con fallback hex real (ver `SKILL.md`). Estas recetas usan el namespace del módulo (ej. `avance-*`); reusa el nombre de familia del módulo que estés tocando.

---

## Patrón 1 — Segmentos en columnas de igual alto con scroll interno

**Cuándo:** varias columnas lado a lado (resumen + tramos + historial, etc.) que deben verse como tarjetas de **la misma altura**, sin que la más larga estire a las demás. Cada columna scrollea su propio contenido.

**Implementado en:** módulo Avance (`.avance-quad` + `.avance-seg`), 4 segmentos: Resumen · Preconstitución · Formalización · Historial.

```css
/* Contenedor: grid con proporciones fijas + alto uniforme */
.avance-quad{display:grid;grid-template-columns:290px 1fr 1fr 1.15fr;gap:14px;align-items:stretch;margin-bottom:18px}
.avance-quad > .avance-seg{height:560px}          /* alto fijo = todas iguales */
@media (max-width:1100px){.avance-quad{grid-template-columns:1fr 1fr}
  .avance-quad > .avance-seg{height:auto;min-height:340px;max-height:480px}}
@media (max-width:620px){.avance-quad{grid-template-columns:1fr}
  .avance-quad > .avance-seg{max-height:none}}     /* en móvil se libera el alto */

/* Tarjeta: cabecera fija + cuerpo scrollable */
.avance-seg{display:flex;flex-direction:column;background:var(--surface,#fff);
  border:1px solid var(--border,#BFD9E7);border-radius:12px;overflow:hidden}
.avance-seg__head{flex:0 0 auto; /* ...ver Patrón 2... */}
.avance-seg__body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px}
```

**Gotchas (ya nos costaron):**
- `align-items:stretch` **por sí solo NO da scroll**: estira todas a la altura del contenido más largo. Para que scrollee y el alto sea uniforme, hace falta **alto fijo** (`height`) en los hijos + `overflow-y:auto` en el cuerpo.
- El cuerpo scrollable **necesita `min-height:0`**. Sin eso, un hijo flex no encoge por debajo de su contenido y el scroll nunca aparece.
- En móvil, libera el alto (`height:auto`/`max-height:none`) o quedan mini-scrolls molestos en 1 columna.

---

## Patrón 2 — Cabecera de segmento: eyebrow + título en 2 líneas, alto uniforme

**Cuándo:** cabeceras de tarjeta con una etiqueta corta (eyebrow, ej. "TRAMO 1") sobre el título, todas alineadas al mismo alto aunque una traiga botón de acción y otra no.

```css
.avance-seg__head{flex:0 0 auto;box-sizing:border-box;height:56px;display:flex;
  align-items:center;gap:8px;padding:0 14px;border-bottom:1px solid var(--border,#BFD9E7);
  background:var(--surface-alt,#F1F6FA)}
.avance-seg__titles{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;
  justify-content:center;gap:1px}                 /* apila eyebrow sobre título */
.avance-seg__titles h4{margin:0;font-size:.9rem;font-weight:700;color:var(--text,#24364B);
  line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.avance-seg__titles .eyebrow{font-size:.64rem;text-transform:uppercase;letter-spacing:.07em;
  color:var(--text-muted,#64748B);font-weight:700;line-height:1.1}
.avance-seg__head > .secondary-btn{flex:0 0 auto;align-self:center}  /* botón a la derecha */
```

```html
<div class="avance-seg__head">
  <div class="avance-seg__titles"><span class="eyebrow">Tramo 1</span><h4>Preconstitución</h4></div>
  <!-- opcional: botón de acción; queda a la derecha porque .titles toma flex:1 -->
  <button type="button" class="secondary-btn btn--sm" title="Exportar">
    <span class="material-symbols-outlined">download</span>
  </button>
</div>
```

**Gotchas:**
- `box-sizing:border-box` + `height` fijo = todas las cabeceras exactamente iguales, tengan o no botón/eyebrow.
- El botón se alinea a la derecha **solo** porque `.avance-seg__titles` es `flex:1 1 auto`; no hace falta `margin-left:auto` si el título ocupa el resto.
- Para que las 4 cabeceras "rimen", dale eyebrow a todas (incluso una genérica como "Panel" en el resumen).

---

## Patrón 3 — Fila compacta clickable (lista de ítems / hitos)

**Cuándo:** lista densa de ítems accionables (hitos, registros) con estado visual (hecho / siguiente / bloqueado). Reemplaza cards grandes que desperdician espacio vertical.

**Implementado en:** `.avance-hrow` (Avance), botones de hito.

```css
.avance-hito-rows{display:flex;flex-direction:column;gap:4px}
.avance-hrow{display:flex;align-items:center;gap:10px;width:100%;text-align:left;
  padding:8px 10px;border-radius:8px;border:1px solid transparent;background:transparent;
  cursor:pointer;font:inherit;color:var(--text,#24364B)}
.avance-hrow__dot{flex:0 0 auto;width:24px;height:24px;border-radius:50%;display:grid;
  place-items:center;font-size:.72rem;font-weight:700;background:var(--surface-alt,#F1F6FA);
  color:var(--text-muted,#64748B);border:1px solid var(--border,#BFD9E7)}
.avance-hrow__t{flex:1 1 auto;min-width:0}
.avance-hrow__t b{display:block;font-weight:600;font-size:.85rem;line-height:1.25;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}   /* trunca sin romper la fila */
.avance-hrow__t small{color:var(--text-muted,#64748B);font-size:.72rem}
/* estados por clase, no por id */
.avance-hrow.done{background:var(--success-soft,#F3FAEA)}
.avance-hrow.next{background:var(--accent-soft,#EAF7FB);
  border-color:color-mix(in srgb,var(--runtime-brand-primary,#3D96B4) 40%,transparent)}
.avance-hrow.blocked{opacity:.72;cursor:not-allowed}
```

**Gotchas:**
- El CTA es un `<button>` real (accesible), no un `<div>` con onclick.
- `min-width:0` en el contenedor de texto es lo que permite el `text-overflow:ellipsis` dentro de flex.

---

## Patrón 4 — Timeline vertical con conector y nodos

**Cuándo:** historial cronológico ("qué ya pasó"), visualmente distinto de listas de tareas pendientes.

**Implementado en:** `.avance-tl` (Historial de Avance).

```css
.avance-tl{list-style:none;margin:0;padding:2px 0 2px 18px;position:relative}
.avance-tl::before{content:"";position:absolute;left:5px;top:8px;bottom:8px;width:2px;
  background:var(--border,#BFD9E7)}                              /* línea vertical */
.avance-tl__item{position:relative;padding:0 0 14px 8px}
.avance-tl__item:last-child{padding-bottom:2px}
.avance-tl__item::before{content:"";position:absolute;left:-18px;top:3px;width:11px;height:11px;
  border-radius:50%;background:var(--success,#8CC63F);border:2px solid var(--surface,#fff);
  box-shadow:0 0 0 1px var(--border,#BFD9E7)}                    /* nodo */
.avance-tl__title{margin:0;font-size:.85rem;font-weight:700;color:var(--text,#24364B);line-height:1.3}
.avance-tl__meta{margin:1px 0 0;font-size:.74rem;color:var(--text-muted,#64748B);line-height:1.35}
.avance-tl__meta b{color:var(--text,#24364B);font-weight:600}
```

Se renderiza como `<ol class="avance-tl"><li class="avance-tl__item">…</li></ol>`. El nodo se posiciona con `left` negativo relativo al padding de la lista.

---

## Patrón 5 — Riel/resumen con anillo de progreso y acción anclada abajo

**Cuándo:** columna-resumen con % de avance, stats y un bloque "siguiente paso" pegado al fondo de la tarjeta.

**Implementado en:** `.avance-rail` + `.avance-pct-ring`.

```css
.avance-pct-ring{--pct:0;width:92px;height:92px;border-radius:50%;
  background:conic-gradient(var(--runtime-brand-secondary,#8CC63F) calc(var(--pct)*1%),var(--border) 0)}
/* el % se pasa por style="--pct:33" desde el render */
.avance-rail{display:flex;flex-direction:column}
.avance-rail__stats{display:flex;flex-direction:column}
.avance-rail__row{display:flex;justify-content:space-between;font-size:.84rem;padding:6px 0;
  border-top:1px solid var(--border,#BFD9E7)}
.avance-rail__next{margin-top:auto}   /* ancla el CTA al fondo del riel */
```

**Gotchas:**
- El anillo con `conic-gradient` + variable `--pct` evita SVG: el render solo setea `style="--pct:${pct}"`.
- `margin-top:auto` en un contenedor flex-column empuja el último bloque al fondo → mantiene el CTA alineado aunque el contenido de arriba varíe.

---

## Gotcha transversal — especificidad ID (1,0,0) vence a clase (0,1,0)

Bug real: un layout nuevo por clase (`.avance-hito-rows`) no aplicaba porque quedaba una regla vieja por **id** (`#avance-pre-grid{display:grid}`) con mayor especificidad, **incluso dentro de media queries**. 

- Prefiere selectores por **clase** para el layout.
- Si reestructuras, **renombra o elimina** las reglas por id huérfanas que peleen con las nuevas.
- Al orfanar clases/ids, **borra el CSS muerto** en el mismo cambio (regla `go-pes-higiene`).

---

## Cómo mantener este catálogo

Cuando un rediseño quede **aprobado por el usuario**, agrega/actualiza aquí el patrón (HTML+CSS mínimo, cuándo usarlo, gotchas). Es la base para no maquetar desde cero la próxima vez. Tras editar, re-empaqueta `dist/` y espeja a `.claude/skills/` (ver `skills/README.md`).
