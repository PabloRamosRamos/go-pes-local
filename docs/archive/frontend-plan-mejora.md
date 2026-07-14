# Frontend — Plan de Mejora

**Propósito:** Roadmap priorizado de mejoras de frontend, desde correcciones críticas hasta refactorings arquitectónicos mayores.

**Audiencia:** Desarrolladores, product owner, tech lead.

**Estado:** Plan aprobado, ejecución en fases

---

## Tabla de contenidos

- [Priorización](#priorización)
- [Fase 1: Accesibilidad crítica](#fase-1-accesibilidad-crítica)
- [Fase 2: Consolidación CSS](#fase-2-consolidación-css)
- [Fase 3: Modularización JS](#fase-3-modularización-js)
- [Fase 4: Mejoras UX](#fase-4-mejoras-ux)
- [Fase 5: Design System](#fase-5-design-system)

---

## Priorización

### Criterios

| Criterio | Peso | Descripción |
|----------|------|-------------|
| **Impacto en accesibilidad** | 40% | ¿Afecta a usuarios con discapacidad? |
| **Riesgo de regresión** | 30% | ¿Puede romper funcionalidad existente? |
| **Esfuerzo de implementación** | 20% | ¿Cuánto tiempo toma? |
| **Valor para usuario final** | 10% | ¿Mejora la experiencia directamente? |

### Matriz de prioridad

| Hallazgo | Impacto | Esfuerzo | Prioridad | Fase |
|----------|---------|----------|-----------|------|
| Modales sin focus trap | 🔴 Alto | 🟡 Medio | **CRÍTICA** | **Fase 1** |
| Gráficos sin alternativa accesible | 🟠 Medio-Alto | 🟢 Bajo | **ALTA** | **Fase 1** |
| CSS operativo en Index.html | 🟠 Medio | 🟢 Bajo | **ALTA** | **Fase 2** |
| Scripts.html muy grande | 🟠 Medio | 🔴 Alto | **MEDIA** | **Fase 3** |
| Responsividad con zonas problemáticas | 🟡 Medio | 🟡 Medio | **MEDIA** | **Fase 4** |
| Patrones UI duplicados | 🟡 Medio | 🔴 Alto | **BAJA** | **Fase 5** |

---

## Fase 1: Accesibilidad crítica

**Objetivo:** Hacer la app usable para personas con discapacidad visual o motora.

**Timeline:** 1 semana  
**Riesgo de regresión:** Bajo  
**Valor:** Alto

### 1.1. Implementar focus trap en modales

**Archivo afectado:** `Scripts.html` (funciones de modales)

**Cambios:**

```javascript
// ANTES
function showModal_(modalId) {
  const modal = sel_(modalId);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

// DESPUÉS
var focusedElementBeforeModal = null;

function showModal_(modalId) {
  const modal = sel_(modalId);
  
  // Guardar foco actual
  focusedElementBeforeModal = document.activeElement;
  
  // Mostrar modal
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  
  // Focus trap
  trapFocusInModal_(modal);
  
  // Foco inicial al primer elemento focusable
  const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (firstFocusable) firstFocusable.focus();
  
  // Escape key
  modal.addEventListener('keydown', handleModalEscape_);
}

function trapFocusInModal_(modal) {
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  modal.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  });
}

function closeModal_(modalId) {
  const modal = sel_(modalId);
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  
  // Restaurar foco
  if (focusedElementBeforeModal) {
    focusedElementBeforeModal.focus();
    focusedElementBeforeModal = null;
  }
  
  // Cleanup event listeners
  modal.removeEventListener('keydown', handleModalEscape_);
}

function handleModalEscape_(e) {
  if (e.key === 'Escape') {
    const modalId = e.currentTarget.id;
    closeModal_(modalId);
  }
}
```

**Tests manuales requeridos:**
- ✓ Tab循环 dentro del modal (no se escapa)
- ✓ Shift+Tab循环 inverso
- ✓ Escape cierra el modal
- ✓ Foco vuelve al botón que abrió el modal
- ✓ Funciona con teclado sin mouse

### 1.2. Añadir alternativas accesibles a gráficos

**Archivos afectados:** `Inicio.html`, `Scripts_Inicio.html`

**Cambios:**

```html
<!-- ANTES -->
<div class="inicio-grafico" aria-hidden="true">
  <svg>...</svg>
</div>

<!-- DESPUÉS -->
<figure class="inicio-grafico">
  <figcaption class="sr-only">
    Distribución de organizaciones por estado:
    En proceso: 15 (45%),
    Constituidas: 12 (36%),
    Stand by: 4 (12%),
    Detenidas: 2 (6%).
  </figcaption>
  <svg role="img" aria-label="Gráfico de torta de estados de organizaciones">...</svg>
</figure>

<!-- Alternativa: tabla oculta visualmente -->
<div class="sr-only">
  <table>
    <caption>Organizaciones por estado</caption>
    <thead>
      <tr><th>Estado</th><th>Cantidad</th><th>Porcentaje</th></tr>
    </thead>
    <tbody>
      <tr><td>En proceso</td><td>15</td><td>45%</td></tr>
      <tr><td>Constituidas</td><td>12</td><td>36%</td></tr>
      <!-- ... -->
    </tbody>
  </table>
</div>
```

**CSS helper:**

```css
/* Styles.html */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Aplicar a:**
- Gráfico de torta (estados)
- Gráfico de barras (UV)
- Gráfico de línea (gestiones mensuales)
- Gauges de hitos (6 radiales)

### 1.3. Añadir labels faltantes en formularios

**Patrón a buscar:**

```bash
grep -r 'placeholder=' go-pes-local/*.html | grep -v 'label'
```

**Corrección:**

```html
<!-- ANTES -->
<input type="text" placeholder="Buscar..." />

<!-- DESPUÉS -->
<label for="global-search" class="sr-only">Buscar en el sistema</label>
<input id="global-search" type="text" placeholder="Buscar..." />
```

**Tests con lector de pantalla:**
- NVDA en Windows
- VoiceOver en Mac
- Verificar que todos los inputs se anuncian correctamente

---

## Fase 2: Consolidación CSS

**Objetivo:** Reducir fragmentación de estilos, facilitar mantenimiento.

**Timeline:** 3 días  
**Riesgo de regresión:** Bajo (solo mueve código)  
**Valor:** Medio

### 2.1. Mover CSS operativo de Index.html a Styles.html

**Líneas a mover:** ~300 líneas de `Index.html` (114-430)

**Secciones a extraer:**

1. **Dashboard / Inicio** (~150 líneas)
   - `.inicio-kpi-card`
   - `.inicio-grafico-*`
   - `.inicio-tabla-*`
   - `.inicio-cal-*`

2. **Banners y alertas** (~50 líneas)
   - `.banner-*`
   - `.alert-*`

3. **Modales específicos** (~100 líneas)
   - `.modal-system-info`
   - `.admin-reset-modal`

**Destino:** `Styles.html` al final, antes de `</style>`, con comentario:

```css
/* ========================================
   MÓDULO INICIO / DASHBOARD
   Extraído de Index.html (2026-05-31)
   ======================================== */
.inicio-kpi-card { ... }
```

**Validación:**
- ✓ Abrir app en DEV
- ✓ Verificar que dashboard se ve igual
- ✓ Verificar dark mode
- ✓ Verificar responsive

### 2.2. Consolidar CSS duplicado

**Buscar duplicados:**

```bash
grep -n "\.chip" go-pes-local/*.html
grep -n "\.badge" go-pes-local/*.html
grep -n "\.table" go-pes-local/*.html
```

**Unificar:**

```css
/* Base chip (reutilizable) */
.chip {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.875rem;
  /* ... */
}

/* Variantes */
.chip--primary { background: var(--primary); color: white; }
.chip--secondary { background: var(--secondary); color: white; }
.chip--outline { border: 1px solid var(--border); background: transparent; }
```

---

## Fase 3: Modularización JS

**Objetivo:** Dividir Scripts.html en módulos cohesivos, reducir acoplamiento.

**Timeline:** 2 semanas  
**Riesgo de regresión:** Medio-Alto  
**Valor:** Alto (a largo plazo)

### 3.1. Estructura propuesta

**Scripts.html actual → 6 archivos:**

| Archivo nuevo | Responsabilidad | Líneas aprox. |
|---------------|----------------|---------------|
| `Scripts_Core.html` | Constantes globales, init, utils DOM | 400 |
| `Scripts_Router.html` | Routing, historial browser, canNavigate | 300 |
| `Scripts_Catalogs.html` | Gestión de catálogos, cache | 250 |
| `Scripts_Modals.html` | Modales genéricos, confirm, alert | 300 |
| `Scripts_Shell.html` | Sidebar, menú usuario, breadcrumb | 300 |
| `Scripts_History.html` | Historial de navegación interna, búsqueda | 200 |

**Total:** 1,750 líneas → 6 archivos × ~280 líneas promedio

### 3.2. Plan de migración

**Semana 1:**

1. Crear archivos nuevos vacíos
2. Mover `Scripts_Modals.html` (más independiente)
3. Actualizar `Index.html` para incluir el nuevo archivo
4. Tests funcionales completos
5. Commit

**Semana 2:**

6. Mover `Scripts_Router.html`
7. Mover `Scripts_Catalogs.html`
8. Mover `Scripts_Shell.html`
9. Mover `Scripts_History.html`
10. `Scripts.html` queda solo con Core
11. Renombrar a `Scripts_Core.html`
12. Tests funcionales completos
13. Commit

**Riesgos:**

- Variables globales compartidas entre archivos
- Orden de carga de scripts (dependencias)
- Event listeners que dependen de orden de init

**Mitigación:**

- Documentar dependencias explícitamente
- Usar patrón de init progresivo:
  ```javascript
  // Scripts_Core.html
  function initCore_() { ... }
  
  // Scripts_Router.html
  function initRouter_() { 
    if (!window.GLOBAL_USER_PROFILE) {
      throw new Error('initCore_() debe ejecutarse primero');
    }
    // ...
  }
  ```

### 3.3. Dividir Scripts_Beneficios.html (opcional)

**Si el equipo tiene capacidad:**

| Archivo nuevo | Responsabilidad | Líneas |
|---------------|----------------|--------|
| `Scripts_Beneficios_Core.html` | Lista, panel, configuración | 400 |
| `Scripts_Beneficios_Camaras.html` | Cámaras 1414 | 400 |
| `Scripts_Beneficios_Fondese.html` | Fondese | 500 |
| `Scripts_Beneficios_Eventos.html` | Eventos formación | 400 |

**Ventaja:** Cada submódulo carga solo cuando se usa  
**Desventaja:** Más archivos para mantener

---

## Fase 4: Mejoras UX

**Objetivo:** Mejorar responsividad y experiencia en dispositivos diversos.

**Timeline:** 1 semana  
**Riesgo de regresión:** Medio  
**Valor:** Medio

### 4.1. Responsive en KPIs del dashboard

**Problema actual:**

```css
.inicio-kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}
```

**Solución:**

```css
.inicio-kpis {
  display: grid;
  gap: 16px;
  
  /* Mobile: 2 columnas */
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 768px) {
  .inicio-kpis {
    /* Tablet: 3 columnas */
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1200px) {
  .inicio-kpis {
    /* Desktop: 6 columnas */
    grid-template-columns: repeat(6, 1fr);
  }
}
```

### 4.2. Tablas responsive

**Patrón actual:**

```css
.table {
  min-width: 800px; /* Scroll horizontal inevitable */
}
```

**Solución 1: Card layout en mobile**

```css
@media (max-width: 767px) {
  .table thead {
    display: none;
  }
  
  .table tbody tr {
    display: block;
    margin-bottom: 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  
  .table tbody td {
    display: block;
    text-align: right;
    padding: 8px 16px;
  }
  
  .table tbody td::before {
    content: attr(data-label);
    float: left;
    font-weight: bold;
  }
}
```

**HTML requerido:**

```html
<td data-label="Nombre">Juan Pérez</td>
<td data-label="Estado">Activo</td>
```

**Aplicar a:**
- Tabla de organizaciones
- Tabla de socios
- Tabla de beneficios

### 4.3. Testing con zoom 200%

**Checklist:**

```
□ KPIs legibles
□ Sidebar no se rompe
□ Modales centrados
□ Formularios usables
□ Tablas scrolleables horizontalmente (si no se convirtieron a cards)
□ Sin overflow horizontal en body
```

---

## Fase 5: Design System

**Objetivo:** Unificar componentes visuales, documentar patrones reutilizables.

**Timeline:** 2-3 semanas  
**Riesgo de regresión:** Bajo (no cambia funcionalidad)  
**Valor:** Bajo a corto plazo, alto a largo plazo

### 5.1. Definir primitivas

**Botones:**

```css
/* Primario */
.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

/* Secundario */
.btn-secondary {
  background: var(--secondary);
  /* ... */
}

/* Outline */
.btn-outline {
  background: transparent;
  border: 1px solid var(--primary);
  color: var(--primary);
  /* ... */
}

/* Tamaños */
.btn-sm { padding: 4px 8px; font-size: 0.875rem; }
.btn-md { padding: 8px 16px; font-size: 1rem; }
.btn-lg { padding: 12px 24px; font-size: 1.125rem; }
```

**Chips:**

```css
.chip { /* base */ }
.chip--primary { /* variante */ }
.chip--secondary { /* variante */ }
.chip--outline { /* variante */ }
```

**Badges:**

```css
.badge { /* base */ }
.badge--success { background: var(--success); }
.badge--warning { background: var(--warning); }
.badge--error { background: var(--error); }
```

### 5.2. Documentar en CLAUDE.md

**Sección nueva:**

```markdown
## Design System GO-PES

### Botones
- `.btn-primary` — Acción principal
- `.btn-secondary` — Acción secundaria
- `.btn-outline` — Acción terciaria
- Tamaños: `btn-sm`, `btn-md`, `btn-lg`

### Chips
- `.chip--primary` — Chip con color primario
- `.chip--secondary` — Chip con color secundario
- `.chip--outline` — Chip sin relleno

### Badges
- `.badge--success` — Verde (éxito, activo)
- `.badge--warning` — Amarillo (advertencia, pendiente)
- `.badge--error` — Rojo (error, rechazado)

### Tablas
- `.table` — Tabla base
- `.table--striped` — Filas zebra
- `.table--hover` — Hover en filas

### Estados vacíos
- `.empty-state` — Container de estado vacío
- Ícono + título + descripción + acción opcional
```

### 5.3. Refactor progresivo

**No reescribir todo de golpe:**

1. Crear las clases base nuevas en `Styles.html`
2. Aplicar en **nuevos** componentes primero
3. Migrar componentes existentes de forma incremental
4. Deprecar clases viejas gradualmente

---

## Checklist de implementación

### Fase 1 ✅ (cuando esté completa)

```
□ Focus trap en modales implementado
□ Foco se restaura al cerrar modales
□ Escape cierra todos los modales
□ Gráficos tienen figcaption o tabla alternativa
□ Todos los inputs tienen label (visible o sr-only)
□ Tests manuales con NVDA/VoiceOver OK
```

### Fase 2 ✅ (cuando esté completa)

```
□ CSS movido de Index.html a Styles.html
□ Index.html < 600 líneas
□ Styles.html organizado con secciones comentadas
□ CSS duplicado consolidado
□ App se ve igual en DEV (validación visual)
```

### Fase 3 ✅ (cuando esté completa)

```
□ Scripts.html dividido en 6 archivos
□ Dependencias documentadas
□ Tests funcionales completos pasan
□ Sin regresiones en navegación/modales/catálogos
```

### Fase 4 ✅ (cuando esté completa)

```
□ KPIs responsive (2/3/6 columnas)
□ Tablas responsive (cards en mobile)
□ Testing con zoom 200% OK
□ Testing con pantalla 320px OK
```

### Fase 5 ✅ (cuando esté completa)

```
□ Primitivas de design system definidas
□ Documentadas en CLAUDE.md
□ Al menos 3 módulos refactorizados para usar nuevas clases
```

---

**Última actualización:** 2026-05-31  
**Próximo paso:** Ejecutar Fase 1 (accesibilidad crítica)
