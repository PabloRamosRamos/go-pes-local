# Frontend — Estado Actual

**Propósito:** Documentación del estado actual del frontend GO-PES v2, hallazgos de auditoría UX/accesibilidad, y análisis de arquitectura cliente.

**Audiencia:** Desarrolladores frontend, diseñadores UX, auditores de accesibilidad.

**Fecha de auditoría:** 2026-05-31

---

## Tabla de contenidos

- [Inventario de archivos frontend](#inventario-de-archivos-frontend)
- [Arquitectura actual](#arquitectura-actual)
- [Hallazgos de accesibilidad](#hallazgos-de-accesibilidad)
- [Hallazgos de arquitectura](#hallazgos-de-arquitectura)
- [Hallazgos de UI/UX](#hallazgos-de-uiux)
- [Aspectos positivos](#aspectos-positivos)
- [Métricas actuales](#métricas-actuales)

---

## Inventario de archivos frontend

**Total: 17 archivos HTML + 1 JS assets**

### Core (shell y estilos)

| Archivo | Líneas | Tamaño | Responsabilidad |
|---------|--------|--------|-----------------|
| **Index.html** | ~920 | 71 KB | Template principal, shell, estructura base |
| **Styles.html** | ~4,500 | 172 KB | CSS global (light mode) |
| **ThemeDark.html** | ~200 | 8 KB | CSS dark mode (overrides) |
| **Scripts.html** | ~1,750 | 103 KB | Core JS (routing, estado, catálogos, modales, historial) |

**Problema identificado:** Index.html tiene ~300 líneas de CSS inline para dashboard, banners y componentes específicos que deberían estar en Styles.html.

### Vistas estáticas

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| **Splash.html** | ~300 | Pantalla de splash inicial con animación |
| **Loading.html** | ~100 | Spinner de carga global |
| **Inicio.html** | ~400 | Estructura HTML del dashboard nativo |

### Módulos funcionales (Scripts_*.html)

| Archivo | Líneas | Responsabilidad principal |
|---------|--------|---------------------------|
| **Scripts_Inicio.html** | ~800 | Dashboard (KPIs, gráficos, alertas) |
| **Scripts_Ficha.html** | ~600 | Ficha de vecino/organización |
| **Scripts_NuevoIngreso.html** | ~400 | Formulario de ingreso |
| **Scripts_Organizaciones.html** | ~500 | Lista de organizaciones |
| **Scripts_Beneficios.html** | ~1,700 | Beneficios, instrumentos, Fondese, eventos |
| **Scripts_Socios.html** | ~700 | Socios y directivas |
| **Scripts_Avance.html** | ~850 | Timeline de hitos |
| **Scripts_Admin.html** | ~1,700 | Usuarios + configuración |
| **Scripts_Calendario.html** | ~200 | Calendario de reuniones |

**Problema identificado:** Scripts_Beneficios.html y Scripts_Admin.html son muy grandes (>1,500 líneas cada uno).

### Otros

| Archivo | Responsabilidad |
|---------|-----------------|
| **Manual.html** | Manual de usuario embebido (~3,500 líneas) |
| **Calendario.html** | Vista parcial del calendario (no es vista completa) |
| **Assets.js** | Logos e imágenes (data URIs base64) |

---

## Arquitectura actual

### Flujo de carga de la aplicación

```
1. doGet() → renderiza Index.html
   ├─ incluye Styles.html (CSS global)
   ├─ incluye ThemeDark.html (CSS dark)
   ├─ incluye Scripts.html (core JS)
   ├─ incluye Scripts_*.html (módulos)
   ├─ incluye Splash.html
   └─ incluye Loading.html

2. DOM carga → init_()
   ├─ Muestra splash (min 800ms)
   ├─ Bootstrap paralelo:
   │  ├─ getAppBootstrap() (user, config, permisos)
   │  └─ prefetch de datos pesados
   ├─ Oculta splash
   └─ Renderiza vista inicial (según defaultView)

3. Navegación → navigateTo_(viewKey, params)
   ├─ Oculta vista actual
   ├─ Actualiza historial (pushState)
   ├─ Renderiza vista nueva
   └─ Actualiza breadcrumb/sidebar
```

### Responsabilidades de Scripts.html (Core)

**Problema: Demasiadas responsabilidades en un solo archivo (1,750 líneas)**

| Líneas | Responsabilidad | Debería estar en |
|--------|----------------|------------------|
| 1-200 | Constantes globales (`GLOBAL_USER_PROFILE`, `GLOBAL_CATALOGS`) | ✅ OK |
| 201-400 | Init, splash, bootstrap | ✅ OK |
| 401-600 | Router (`navigateTo_`, `canNavigate_`, historial browser) | ⚠️ Separar a `app-router.js` |
| 601-800 | Gestión de catálogos (`ensureCatalogos_`, cache) | ⚠️ Separar a `app-catalogs.js` |
| 801-1000 | Modales genéricos (`showModal_`, `closeModal_`, `showConfirm_`) | ⚠️ Separar a `app-modals.js` |
| 1001-1200 | Sidebar, menú usuario, breadcrumb | ⚠️ Separar a `app-shell.js` |
| 1201-1400 | Utilidades DOM (`sel_`, `show_`, `hide_`, `busy_`) | ✅ OK |
| 1401-1750 | Historial de navegación interna, búsqueda global | ⚠️ Separar a `app-history.js` |

**Sugerencia:** Dividir en 5-6 archivos más pequeños y cohesivos.

### Patrón de renderizado dominante: innerHTML

**95% de las vistas usan innerHTML:**

```javascript
// Patrón típico
function renderModulo_() {
  const container = sel_('modulo-container');
  container.innerHTML = buildModuloHtml_();
  initModuloHandlers_();  // Re-bind eventos después de innerHTML
}

function buildModuloHtml_() {
  return `
    <div class="panel">
      <h2>${data.titulo}</h2>
      <button onclick="accion_()">Acción</button>
    </div>
  `;
}
```

**Ventajas:**
- ✅ Rápido para iterar
- ✅ Código conciso
- ✅ Fácil de leer (HTML literal)

**Desventajas:**
- ⚠️ Eventos inline (`onclick`) en lugar de event delegation
- ⚠️ Re-bind de handlers después de cada render (memory leaks potenciales)
- ⚠️ Difícil de testear (no hay componentes aislables)
- ⚠️ XSS risk si no se sanitiza correctamente

### Gestión de estado

**Estado global disperso:**

```javascript
// Scripts.html
var GLOBAL_USER_PROFILE = null;
var GLOBAL_CATALOGS = null;
var GLOBAL_SYSTEM_CONFIG = null;
var CURRENT_VIEW = 'inicio';
var NAVIGATION_HISTORY = [];

// Cada módulo tiene su propio estado
// Scripts_Beneficios.html
var beneficiosModuleState = { ... };

// Scripts_Organizaciones.html
var organizacionesModuleState = { ... };
```

**Problema:** No hay un store centralizado. El estado vive en variables globales dispersas.

---

## Hallazgos de accesibilidad

### 🔴 **Crítico: Modales sin focus trap**

**Ubicación:** `Scripts.html` líneas 801-1000

**Problema:**
```javascript
function showModal_(modalId) {
  const modal = sel_(modalId);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  // ⚠️ NO HAY focus trap
  // ⚠️ NO HAY restauración de foco al cerrar
  // ⚠️ Escape key solo funciona en algunos modales
}
```

**Impacto:**
- Usuario con teclado puede "salirse" del modal con Tab
- Foco no vuelve al elemento que abrió el modal
- Navegación confusa para lectores de pantalla

**Ejemplo específico — Calendario:**
```javascript
// Scripts_Calendario.html línea 188
// Maneja diálogo propio dentro del panel con wiring manual
// Sin focus trap, sin ARIA correcta
```

**Solución requerida:**
- Implementar focus trap en `showModal_`
- Guardar `document.activeElement` antes de abrir
- Restaurar foco al cerrar
- Unificar cierre por Escape

### 🟠 **Alto: Gráficos sin alternativa accesible**

**Ubicación:** `Inicio.html` líneas 224, 245, 300

**Problema:**
```html
<!-- Gráfico decorativo sin alternativa -->
<div class="inicio-grafico" aria-hidden="true">
  <svg>...</svg>
</div>
<!-- ⚠️ No hay texto alternativo para SR -->
<!-- ⚠️ No hay tabla equivalente -->
```

**Impacto:**
- Usuarios con lectores de pantalla pierden información visual crítica
- Dashboard inaccesible para ciegos o baja visión

**Solución requerida:**
- Añadir `<figcaption>` con resumen textual
- O tabla `.sr-only` con datos equivalentes
- O `aria-label` descriptivo en el container

### 🟡 **Medio: Formularios sin labels explícitos en algunos casos**

**Ubicación:** Varios módulos

**Problema:**
```html
<!-- Algunos inputs usan placeholder como label -->
<input type="text" placeholder="Buscar..." />
<!-- ⚠️ Sin <label> asociado -->
```

**Solución:**
```html
<label for="search-input" class="sr-only">Buscar</label>
<input id="search-input" type="text" placeholder="Buscar..." />
```

### ✅ **Bueno: Base de accesibilidad presente**

**Aspectos positivos encontrados:**

1. **Labels presentes en mayoría de formularios**
2. **aria-live para notificaciones:**
   ```html
   <div id="toast-container" role="status" aria-live="polite"></div>
   ```
3. **aria-expanded en menús:**
   ```html
   <button aria-expanded="false" aria-controls="user-menu">Usuario</button>
   ```
4. **Foco visible:**
   ```css
   *:focus-visible {
     outline: 2px solid var(--primary);
     outline-offset: 2px;
   }
   ```
5. **prefers-reduced-motion respetado:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     * { animation-duration: 0.01ms !important; }
   }
   ```

---

## Hallazgos de arquitectura

### 🔴 **Crítico: Scripts.html con demasiadas responsabilidades**

**Tamaño:** 1,750 líneas  
**Responsabilidades:** 7 dominios distintos

**Problema:**
- Cambio en router afecta a modales
- Cambio en catálogos afecta a historial
- Dificil de testear (todo en un archivo)
- Dificil de colaborar (merge conflicts)

**Solución:** Ver `docs/frontend-plan-mejora.md` (Fase 1)

### 🔴 **Crítico: CSS operativo en Index.html**

**Ubicación:** `Index.html` líneas 114-430

**Problema:**
```html
<!-- Index.html -->
<style>
  /* CSS específico del dashboard (~300 líneas) */
  .inicio-kpi-card { ... }
  .inicio-grafico-donut { ... }
  /* ⚠️ Debería estar en Styles.html */
</style>
```

**Impacto:**
- Index.html es ~920 líneas (debería ser ~500)
- CSS duplicado entre Index y Styles
- Mantenimiento difícil (buscar en 3 archivos)

**Solución:** Mover todo a `Styles.html` al final con sección comentada.

### 🟠 **Alto: Scripts_Beneficios.html muy grande**

**Tamaño:** 1,700 líneas  
**Responsabilidades:** 5 submódulos

1. Beneficios generales (~300 líneas)
2. Cámaras 1414 (~400 líneas)
3. Fondese (~500 líneas)
4. Eventos formación (~400 líneas)
5. Configuración de plazos (~100 líneas)

**Solución:** Dividir en 5 archivos o unificar patrones.

### 🟡 **Medio: Patrones UI duplicados**

**Ejemplos:**

1. **Modales:**
   - Modal genérico en `Scripts.html`
   - Modal de sistema info en `Index.html` (línea 436)
   - Modal de admin reset en `Scripts_Admin.html`
   - ⚠️ No comparten base común

2. **Chips/badges:**
   - `.chip` en `Styles.html`
   - `.badge` en `Styles.html`
   - `.org-card__badge` en `Styles.html`
   - ⚠️ Semántica similar, estilos diferentes

3. **Tablas:**
   - `.table` genérica
   - `.inicio-tabla` específica
   - `.historial-tabla` específica
   - ⚠️ No hay tabla base reutilizable

**Solución:** Definir design system interno explícito.

---

## Hallazgos de UI/UX

### 🟡 **Medio: Responsividad con zonas problemáticas**

**Ubicaciones identificadas:**

1. **KPIs del dashboard** (`Index.html` línea 181)
   ```css
   .inicio-kpis {
     display: grid;
     grid-template-columns: repeat(6, 1fr);
     /* ⚠️ 6 columnas fijas, sufre en mobile */
   }
   ```

2. **Historial de gestiones** (`Index.html` línea 319)
   ```css
   .ficha-gestiones-list {
     /* ⚠️ No colapsa bien en <768px */
   }
   ```

3. **Tablas de datos** (`Styles.html` línea 2839)
   ```css
   .table {
     min-width: 800px;
     /* ⚠️ Scroll horizontal inevitable */
   }
   ```

**Solución:** Añadir breakpoints y layouts alternativos.

### 🟡 **Medio: innerHTML + eventos inline = memory leaks potenciales**

**Patrón problemático:**

```javascript
function renderLista_() {
  const html = items.map(item => `
    <li>
      <button onclick="accion_('${item.id}')">Click</button>
    </li>
  `).join('');
  
  container.innerHTML = html;
  // ⚠️ Si se llama repetidamente, los event listeners se acumulan
}
```

**Impacto:**
- Memory leaks si el módulo se renderiza muchas veces
- Eventos duplicados si no se hace cleanup

**Solución:** Event delegation en lugar de inline handlers.

### ✅ **Bueno: Identidad visual definida**

**Aspectos positivos:**

1. **Paleta de colores consistente:**
   ```css
   --primary: #3D96B4;
   --secondary: #8CC63F;
   --ink: #24364B;
   ```

2. **Componentes reutilizables:**
   - Botones primarios/secundarios
   - Chips y badges
   - Paneles y cards
   - Estados vacíos

3. **Dark mode completo:**
   - ThemeDark.html con overrides coherentes
   - Sin rupturas visuales

4. **Animaciones sutiles:**
   - Transiciones suaves
   - Respeta `prefers-reduced-motion`

---

## Aspectos positivos

### ✅ **Base sólida de accesibilidad**

- Labels en formularios
- aria-live para notificaciones
- aria-expanded en menús
- Foco visible
- prefers-reduced-motion

### ✅ **Responsividad real (no "solo desktop")**

- Media queries presentes
- Sidebar colapsa en mobile
- Tablas con scroll horizontal (aunque mejorable)

### ✅ **Identidad visual más allá de genérico**

- Dashboard visual atractivo
- Tarjetas, chips, badges distintivos
- Dark mode coherente

### ✅ **Performance decente**

- Splash mientras carga
- Prefetch de datos pesados en paralelo
- Cache de catálogos

---

## Métricas actuales

### Tamaño de archivos

| Archivo | Líneas | KB | % del total |
|---------|--------|----|-------------|
| Scripts_Beneficios.html | 1,700 | 252 | 19% |
| Scripts.html | 1,750 | 103 | 8% |
| Styles.html | 4,500 | 172 | 13% |
| Scripts_Admin.html | 1,700 | 106 | 8% |
| Manual.html | 3,500 | 123 | 9% |
| **TOTAL frontend** | **~17,000** | **~1.3 MB** | **100%** |

### Distribución de responsabilidades

| Responsabilidad | Archivos | Líneas aprox. |
|----------------|----------|---------------|
| CSS (estilos) | 3 | 5,200 |
| JS (lógica) | 10 | 9,000 |
| HTML (estructura) | 4 | 2,800 |

### Cobertura de tests

- ❌ **Frontend: 0 tests automatizados**
- Backend tiene 195 tests, frontend ninguno

---

**Última actualización:** 2026-05-31  
**Próximo paso:** Ver `docs/frontend-plan-mejora.md` para roadmap de correcciones
