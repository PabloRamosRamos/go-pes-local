# Design System GO-PES v2

**Versión:** 1.0  
**Última actualización:** 2026-05-31  
**Autor:** Equipo Frontend GO-PES

---

## Introducción

Este documento define los componentes visuales, patrones de diseño y convenciones de estilo del sistema GO-PES v2. El objetivo es mantener consistencia visual y facilitar el desarrollo de nuevas funcionalidades.

---

## Paleta de colores

### Colores del sistema

Definidos en `Main.js` (`GO_PES_V2.COLORS`):

```javascript
COLORS: {
  primary: '#3D96B4',      // Azul institucional
  secondary: '#8CC63F',    // Verde institucional
  accent: '#03C2AE',       // Turquesa (acentos)
  text: '#24364B',         // Texto principal
  'text-muted': '#6b7a8d', // Texto secundario
  bg: '#F7FAFC',           // Fondo claro
  'bg-dark': '#0D2940',    // Fondo oscuro
  border: '#D6E0EA',       // Bordes
  success: '#007C4A',      // Verde éxito
  warning: '#F5A623',      // Amarillo advertencia
  error: '#E05555'         // Rojo error
}
```

### Variables CSS

Aplicadas en `Styles.html` y accesibles vía `var()`:

```css
--runtime-brand-primary: #3D96B4
--runtime-brand-secondary: #8CC63F
--runtime-brand-accent: #03C2AE
--text: #24364B
--text-muted: #6b7a8d
--surface: #fff
--surface-alt: #f7fafc
--border: #D6E0EA
--success: #007C4A
--warning: #e0a800
--danger: #c0392b
```

---

## Componentes

### Botones

#### Clases base

```css
.primary-btn      /* Acción principal (azul) */
.secondary-btn    /* Acción secundaria (gris) */
.danger-btn       /* Acción destructiva (rojo) */
```

#### Modificadores

```css
.btn--sm          /* Pequeño: padding reducido */
.btn--lg          /* Grande: padding aumentado */
```

#### Uso recomendado

```html
<!-- Acción principal -->
<button class="primary-btn">
  <span class="material-symbols-outlined">save</span>
  Guardar
</button>

<!-- Acción secundaria -->
<button class="secondary-btn">
  <span class="material-symbols-outlined">close</span>
  Cancelar
</button>

<!-- Acción destructiva -->
<button class="danger-btn">
  <span class="material-symbols-outlined">delete</span>
  Eliminar
</button>
```

#### Estados

- `:hover` — Transform Y y sombra
- `:disabled` — Opacidad 0.6, cursor not-allowed
- `:focus-visible` — Outline accent

---

### Badges

#### Clase base

```css
.badge-pill        /* Badge redondo base */
```

#### Variantes específicas

```css
.hist-badge        /* Historial (border-radius 20px) */
.dash-priority-badge  /* Dashboard prioridad */
.inicio-cal-badge  /* Calendario inicio */
```

#### Modificadores semánticos

```css
.badge--success    /* Verde */
.badge--warning    /* Amarillo */
.badge--error      /* Rojo */
.badge--info       /* Azul */
```

#### Uso recomendado

```html
<span class="badge-pill badge--success">Activo</span>
<span class="badge-pill badge--warning">Pendiente</span>
<span class="badge-pill badge--error">Rechazado</span>
```

---

### Tablas

#### Clases base

```css
.data-table        /* Tabla genérica */
.table-wrap        /* Contenedor con scroll */
```

#### Clases específicas

```css
.dash-table        /* Tablas del dashboard */
.organizaciones-table  /* Tabla de organizaciones */
.socios-table      /* Tabla de socios */
.users-table       /* Tabla de usuarios */
```

#### Responsive

En mobile (<768px), las tablas `.data-table` se convierten automáticamente a **card layout**.

**Requisito:** Añadir `data-label` a cada celda:

```html
<table class="data-table">
  <thead>
    <tr>
      <th>Nombre</th>
      <th>Estado</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Nombre">Juan Pérez</td>
      <td data-label="Estado">Activo</td>
      <td data-label="Acciones">
        <button class="table-action-btn">Editar</button>
      </td>
    </tr>
  </tbody>
</table>
```

---

### Cards

#### Clases base

```css
.panel             /* Card genérico */
.card              /* Card con sombra */
```

#### Variantes

```css
.inicio-kpi-card   /* KPI del dashboard */
.dash-chart-card   /* Gráfico del dashboard */
.dash-table-card   /* Tabla del dashboard */
.inicio-cal-card   /* Card de calendario */
```

#### Estructura estándar

```html
<div class="panel">
  <div class="panel__head">
    <h3>Título</h3>
  </div>
  <div class="panel__body">
    <!-- Contenido -->
  </div>
  <div class="panel__footer">
    <!-- Acciones -->
  </div>
</div>
```

---

### Estados vacíos

#### Clase base

```css
.empty-state       /* Container de estado vacío */
```

#### Helpers JS

```javascript
// En Scripts_UI.html
GO_PES_UI.emptyStateHtml(icon, title, message, extraClass)
GO_PES_UI.tableEmptyRowHtml(icon, message, colspan)
```

#### Uso recomendado

```html
<div class="empty-state">
  <span class="material-symbols-outlined">inbox</span>
  <strong>Sin resultados</strong>
  <p class="muted">No hay registros que coincidan con tu búsqueda.</p>
</div>
```

---

### Modales

#### Clases base

```css
.modal             /* Modal genérico */
.modal-backdrop    /* Fondo oscuro */
```

#### API JavaScript

```javascript
// En Scripts_A11y.html
A11Y.openModal(modalId, options)
A11Y.closeModal(modalId)
```

#### Estructura estándar

```html
<div id="mi-modal" class="modal is-hidden" role="dialog" aria-modal="true">
  <div class="modal__backdrop"></div>
  <div class="modal__dialog">
    <div class="modal__head">
      <h3>Título del modal</h3>
      <button type="button" class="secondary-btn" data-close>
        <span class="material-symbols-outlined">close</span>
        Cerrar
      </button>
    </div>
    <div class="modal__body">
      <!-- Contenido -->
    </div>
    <div class="modal__footer">
      <button class="primary-btn">Guardar</button>
      <button class="secondary-btn" data-close>Cancelar</button>
    </div>
  </div>
</div>
```

---

### Formularios

#### Clases base

```css
.field             /* Contenedor de campo */
.field-error       /* Error inline */
.field.has-error   /* Estado de error */
```

#### Modificadores

```css
.field--full       /* Ancho completo */
.field--half       /* Mitad de ancho */
.field--grow       /* Flex grow */
```

#### Estructura estándar

```html
<div class="field">
  <label for="nombre">Nombre</label>
  <input id="nombre" type="text" required>
  <p class="field-help">Texto de ayuda opcional</p>
</div>

<!-- Con error -->
<div class="field has-error">
  <label for="email">Email</label>
  <input id="email" type="email">
  <span class="field-error" role="alert">Email inválido</span>
</div>
```

---

### Toasts (notificaciones)

#### API JavaScript

```javascript
// En Scripts_UI.html
GO_PES_UI.showSuccess(message)
GO_PES_UI.showError(error)
GO_PES_UI.showToast(message, type, durationMs)
```

#### Tipos

- `success` — Verde, 4 segundos
- `error` — Rojo, 7 segundos
- `session` — Amarillo, 7 segundos

#### Uso recomendado

```javascript
// Éxito
GO_PES_UI.showSuccess('Cambios guardados correctamente');

// Error
GO_PES_UI.showError('No se pudo guardar. Intenta nuevamente.');

// Custom
GO_PES_UI.showToast('Procesando...', 'info', 3000);
```

---

### Paginador

#### API JavaScript

```javascript
// En Scripts_UI.html
GO_PES_UI.paginatorHtml(currentPage, totalPages, dataPrefix)
```

#### Uso recomendado

```javascript
const html = GO_PES_UI.paginatorHtml(1, 10, 'socios');
document.getElementById('pager-container').innerHTML = html;

// Listener
document.addEventListener('click', (e) => {
  const page = e.target.dataset.sociosPage;
  if (page) loadPage(parseInt(page, 10));
});
```

---

## Iconografía

### Librería

**Material Symbols Outlined** — Google Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
```

### Uso

```html
<span class="material-symbols-outlined">search</span>
<span class="material-symbols-outlined">save</span>
<span class="material-symbols-outlined">delete</span>
```

### Iconos comunes

| Acción | Icono | Código |
|--------|-------|--------|
| Guardar | 💾 | `save` |
| Editar | ✏️ | `edit` |
| Eliminar | 🗑️ | `delete` |
| Cerrar | ✖️ | `close` |
| Buscar | 🔍 | `search` |
| Agregar | ➕ | `add` |
| Ver | 👁️ | `visibility` |
| Descargar | ⬇️ | `download` |
| Actualizar | 🔄 | `refresh` |

---

## Tipografía

### Fuente principal

**Inter** — Google Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### Jerarquía

```css
h1 { font-size: 2rem; font-weight: 700; }
h2 { font-size: 1.5rem; font-weight: 600; }
h3 { font-size: 1.25rem; font-weight: 600; }
h4 { font-size: 1rem; font-weight: 600; }
body { font-size: 0.875rem; font-weight: 400; }
small { font-size: 0.75rem; }
```

### Clases utilitarias

```css
.eyebrow    /* Texto pequeño sobre título */
.muted      /* Texto secundario */
```

---

## Espaciado

### Variables

Definidas en `Styles.html`:

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-7: 32px
--space-8: 40px
```

### Uso recomendado

```css
.mi-componente {
  padding: var(--space-4);
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}
```

---

## Border radius

### Variables

```css
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
--radius-2xl: 20px
--radius-pill: 9999px
```

### Uso recomendado

```css
.card { border-radius: var(--radius-lg); }
.button { border-radius: var(--radius-md); }
.badge { border-radius: var(--radius-pill); }
```

---

## Sombras

### Variables

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1)
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15)
```

### Uso recomendado

```css
.card { box-shadow: var(--shadow-md); }
.modal { box-shadow: var(--shadow-xl); }
.button:hover { box-shadow: var(--shadow-sm); }
```

---

## Tema oscuro

### Activación

El tema oscuro se activa con el atributo `data-theme="dark"` en `<html>`.

### Overrides

Definidos en `ThemeDark.html`:

```css
html[data-theme="dark"] {
  --text: #d4e4f0;
  --text-muted: #7a9ab5;
  --surface: #14202d;
  --surface-alt: #182635;
  --border: #294356;
  /* ... */
}
```

### Convención

- Todos los colores usan variables CSS
- Nunca hardcodear hex en componentes
- Siempre definir override en `ThemeDark.html` si el componente usa colores

---

## Responsive

### Breakpoints

```css
/* Mobile pequeño */
@media (max-width: 479px) { }

/* Mobile */
@media (max-width: 767px) { }

/* Tablet */
@media (min-width: 768px) and (max-width: 1199px) { }

/* Desktop */
@media (min-width: 1200px) { }
```

### Estrategia

**Mobile-first:** Estilos base para mobile, media queries para pantallas más grandes.

---

## Accesibilidad

### Principios

1. **Keyboard navigation** — Todo operable con teclado
2. **Focus trap** — Modales capturan el foco
3. **ARIA labels** — Todos los inputs con label
4. **Alt text** — Gráficos con alternativa textual
5. **Color contrast** — WCAG AA (4.5:1 para texto)

### Helpers

```css
.sr-only           /* Visualmente oculto, accesible para screen readers */
.sr-only-focusable /* Visible al recibir foco */
```

### API

```javascript
// En Scripts_A11y.html
A11Y.announce(message, priority)  // Anuncia vía aria-live
A11Y.updatePageTitle(title)        // Actualiza <title>
```

---

## Convenciones de código

### Nomenclatura CSS

**BEM simplificado:**

```css
.bloque { }
.bloque__elemento { }
.bloque--modificador { }
```

**Ejemplos:**

```css
.card { }
.card__header { }
.card__body { }
.card--highlighted { }
```

### Orden de propiedades CSS

1. Posicionamiento (`position`, `top`, `z-index`)
2. Box model (`display`, `width`, `padding`, `margin`)
3. Tipografía (`font-`, `text-`, `line-height`)
4. Visual (`background`, `border`, `box-shadow`)
5. Otros (`cursor`, `transition`, `animation`)

### Comentarios

```css
/* ========================================
   SECCIÓN PRINCIPAL
   Descripción breve
   ======================================== */

/* Subsección */

/* Comentario inline */
```

---

## Migración progresiva

### Estrategia

1. **No romper lo existente** — Nuevas clases coexisten con las viejas
2. **Aplicar en nuevo código primero** — Componentes nuevos usan Design System
3. **Refactor incremental** — Migrar componentes existentes gradualmente
4. **Deprecar con aviso** — Marcar clases viejas como deprecated en comentarios

### Ejemplo

```css
/* @deprecated Use .badge-pill instead */
.old-badge { }

/* Design System v1.0 */
.badge-pill { }
```

---

## Recursos

- **Código fuente:** `go-pes-local/Styles.html`, `ThemeDark.html`
- **Variables CSS:** `Styles.html` líneas 1-200
- **Componentes JS:** `Scripts_UI.html`, `Scripts_A11y.html`
- **Iconos:** [Material Symbols](https://fonts.google.com/icons)
- **Tipografía:** [Inter Font](https://fonts.google.com/specimen/Inter)

---

## Changelog

### v1.0 (2026-05-31)

- ✅ Documentación inicial del Design System
- ✅ Inventario de componentes existentes
- ✅ Definición de variables CSS
- ✅ Convenciones de código
- ✅ Guía de responsive y accesibilidad

---

**Mantenido por:** Equipo Frontend GO-PES  
**Última revisión:** 2026-05-31
