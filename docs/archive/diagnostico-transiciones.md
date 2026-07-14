# Diagnóstico de Transiciones — GO-PES v2

**Versión reportada:** v2.1.512 · PROD · build e6d6334  
**Fecha:** 2026-06-01

---

## Estado del código

### ✅ Código implementado correctamente

**1. CSS de transiciones** — [`Styles.html:7492-7658`](../go-pes-local/Styles.html)
- ✅ Variables CSS de duración (`--transition-fast`, `--transition-base`, `--transition-slow`)
- ✅ Estados de modales (`.is-opening`, `.is-open`, `.is-closing`)
- ✅ Transiciones de loading (`.content-loading.is-hidden`)
- ✅ Transiciones de vistas (`.view-enter`, `.view-enter-active`)
- ✅ Soporte `@media (prefers-reduced-motion: reduce)`

**2. JavaScript de modales** — [`Scripts_A11y.html:136-301`](../go-pes-local/Scripts_A11y.html)
- ✅ `A11Y.openModal()` con estados `is-opening` → `is-open`
- ✅ `A11Y.closeModal()` con estados `is-closing` + espera de `transitionend`
- ✅ Fallback de 250ms para `prefers-reduced-motion`

**3. JavaScript de vistas** — [`Scripts.html:1384-1399`](../go-pes-local/Scripts.html)
- ✅ `route()` con estados `view-enter` → `view-enter-active`
- ✅ `requestAnimationFrame` para forzar reflow

**4. JavaScript de loading** — [`Loading.html:112-134`](../go-pes-local/Loading.html)
- ✅ `hideContentLoading()` con `setTimeout(250ms)` antes de `display: none`

---

## Posibles causas del problema reportado

### 1. Cache del navegador (ALTA PROBABILIDAD)

El navegador puede estar sirviendo CSS/JS viejo. El hash del build es `e6d6334`, pero el navegador puede tener cacheado el anterior.

**Solución:**
```javascript
// Desde la consola del navegador (F12):
localStorage.clear();
sessionStorage.clear();
location.reload(true); // Recarga forzada
```

O más agresivo:
```
Ctrl + Shift + Delete (Windows/Linux)
Cmd + Shift + Delete (Mac)
→ Borrar cache e imágenes (última hora)
```

---

### 2. `prefers-reduced-motion` activado (MEDIA PROBABILIDAD)

Si el sistema operativo tiene configuración de "Reducir movimiento" activada, todas las transiciones se reducen a 0.01ms.

**Verificar:**
```javascript
// Desde la consola del navegador:
window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Si retorna true → las transiciones están deshabilitadas intencionalmente
```

**Ubicación de la configuración:**
- **Windows 11:** Configuración → Accesibilidad → Efectos visuales → Efectos de animación (desactivar)
- **macOS:** Preferencias del Sistema → Accesibilidad → Pantalla → Reducir movimiento
- **Linux:** Depende de la distro (GNOME: Configuración → Accesibilidad → Ver → Reducir animaciones)

---

### 3. Orden de carga de scripts (BAJA PROBABILIDAD)

`Scripts_A11y.html` se carga al final del `<body>` en `Index.html:596`. Si algún modal se abre **antes** de que `A11Y` esté disponible, usa el fallback sin transiciones.

**Verificar:**
```javascript
// Desde la consola del navegador (después de cargar la app):
console.log(window.A11Y);
// Debería retornar: { activeModals: [], focusedBeforeModal: null, ... }

console.log(typeof window.A11Y.openModal);
// Debería retornar: "function"
```

Si `A11Y` es `undefined`, el problema es el orden de carga.

---

### 4. Variables CSS no aplicadas (BAJA PROBABILIDAD)

Las variables CSS pueden no estar propagándose correctamente por especificidad.

**Verificar:**
```javascript
// Desde la consola del navegador:
const root = document.documentElement;
getComputedStyle(root).getPropertyValue('--transition-base');
// Debería retornar: "220ms"
```

---

### 5. Conflicto con CSS viejo (BAJA PROBABILIDAD)

Puede haber CSS legacy que sobrescriba los estados de transición.

**Buscar en Styles.html:**
```css
/* Buscar reglas conflictivas */
.modal { display: none !important; } /* ← esto rompería las transiciones */
.view { display: none !important; }  /* ← esto también */
```

---

## Plan de diagnóstico paso a paso

### Paso 1: Verificar que el código nuevo esté cargado

```javascript
// Consola del navegador:
document.querySelector('.admin-reset-modal')?.classList;
// Debería incluir 'is-hidden' (no 'hidden')

document.querySelector('.view')?.classList;
// Debería NO incluir 'active' si no está visible
```

### Paso 2: Verificar que A11Y esté disponible

```javascript
// Consola del navegador:
window.A11Y
console.log(typeof window.A11Y.openModal); // → "function"
```

### Paso 3: Test manual de transición de modal

```javascript
// Consola del navegador:
const modal = document.getElementById('user-modal');
window.A11Y.openModal(modal);
// Observar: ¿el modal aparece gradualmente o de golpe?

// Esperar 2 segundos y luego:
window.A11Y.closeModal(modal);
// Observar: ¿el modal desaparece gradualmente o de golpe?
```

### Paso 4: Test manual de transición de vista

```javascript
// Consola del navegador:
const view = document.getElementById('view-buscar');
view.classList.add('active', 'view-enter');
view.offsetHeight; // Forzar reflow
requestAnimationFrame(() => {
  view.classList.remove('view-enter');
  view.classList.add('view-enter-active');
});
// Observar: ¿la vista aparece gradualmente desde abajo?
```

### Paso 5: Verificar CSS variables

```javascript
// Consola del navegador:
const root = document.documentElement;
console.log({
  fast: getComputedStyle(root).getPropertyValue('--transition-fast'),
  base: getComputedStyle(root).getPropertyValue('--transition-base'),
  slow: getComputedStyle(root).getPropertyValue('--transition-slow'),
  easeOut: getComputedStyle(root).getPropertyValue('--ease-out')
});
// Debería retornar:
// {
//   fast: "160ms",
//   base: "220ms",
//   slow: "320ms",
//   easeOut: "cubic-bezier(0.16, 1, 0.3, 1)"
// }
```

### Paso 6: Verificar prefers-reduced-motion

```javascript
// Consola del navegador:
window.matchMedia('(prefers-reduced-motion: reduce)').matches
// Si es true → desactivar "Reducir movimiento" en el sistema operativo
```

---

## Soluciones rápidas

### Solución 1: Limpiar cache agresivamente

```bash
# Desde el navegador:
1. Abrir DevTools (F12)
2. Click derecho en el botón de recarga
3. Seleccionar "Vaciar caché y volver a cargar de manera forzada"
```

### Solución 2: Forzar redeploy de Apps Script

```powershell
cd "C:\Users\peram\Documents\Sitios\GO Provi\go-pes-local"
clasp push
clasp open
```

Desde el editor de Apps Script:
1. **Implementar → Administrar implementaciones**
2. Click en el ícono de engranaje de la implementación activa
3. **Nueva versión**
4. **Implementar**
5. Copiar el **nuevo URL de la Web App**
6. Abrir en el navegador

### Solución 3: Forzar recarga de módulos

```javascript
// Desde la consola del navegador (después de abrir la app):
location.href = location.href + '?cache_bust=' + Date.now();
```

---

## Verificación final

Después de aplicar las soluciones, ejecutar este test completo:

```javascript
// TEST COMPLETO DE TRANSICIONES
(async function testTransiciones() {
  console.clear();
  console.log('=== TEST DE TRANSICIONES ===');
  
  // 1. Verificar A11Y
  console.log('1. A11Y disponible:', typeof window.A11Y === 'object');
  console.log('   openModal:', typeof window.A11Y?.openModal === 'function');
  console.log('   closeModal:', typeof window.A11Y?.closeModal === 'function');
  
  // 2. Verificar CSS variables
  const root = document.documentElement;
  const base = getComputedStyle(root).getPropertyValue('--transition-base');
  console.log('2. CSS variable --transition-base:', base);
  console.log('   (esperado: "220ms")');
  
  // 3. Verificar prefers-reduced-motion
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  console.log('3. prefers-reduced-motion:', reduced);
  console.log('   (esperado: false)');
  
  // 4. Test modal
  console.log('4. Probando modal...');
  const modal = document.getElementById('user-modal');
  if (modal) {
    window.A11Y.openModal(modal);
    console.log('   Modal abierto. Estados:', Array.from(modal.classList));
    await new Promise(r => setTimeout(r, 500));
    window.A11Y.closeModal(modal);
    console.log('   Modal cerrado. Estados:', Array.from(modal.classList));
  } else {
    console.log('   ⚠️ Modal no encontrado');
  }
  
  // 5. Test vista
  console.log('5. Probando transición de vista...');
  const view = document.getElementById('view-buscar');
  if (view) {
    view.classList.add('active', 'view-enter');
    view.offsetHeight;
    requestAnimationFrame(() => {
      view.classList.remove('view-enter');
      view.classList.add('view-enter-active');
      console.log('   Vista activada. Estados:', Array.from(view.classList));
    });
  } else {
    console.log('   ⚠️ Vista no encontrada');
  }
  
  console.log('=== FIN DEL TEST ===');
})();
```

**Resultado esperado:**
```
=== TEST DE TRANSICIONES ===
1. A11Y disponible: true
   openModal: true
   closeModal: true
2. CSS variable --transition-base: 220ms
   (esperado: "220ms")
3. prefers-reduced-motion: false
   (esperado: false)
4. Probando modal...
   Modal abierto. Estados: ["user-modal", "is-open"]
   Modal cerrado. Estados: ["user-modal", "is-hidden"]
5. Probando transición de vista...
   Vista activada. Estados: ["view", "active", "view-enter-active"]
=== FIN DEL TEST ===
```

---

## Contacto para soporte

Si después de seguir este diagnóstico las transiciones siguen sin funcionar, reportar:

1. Resultado del test completo (copiar desde consola)
2. Navegador y versión (Chrome 120, Firefox 121, etc.)
3. Sistema operativo
4. Screenshot de DevTools → Network mostrando los archivos cargados
5. Screenshot de DevTools → Elements mostrando el estado de un modal abierto

---

**Documento generado:** 2026-06-01  
**Autor:** Claude Code (asistente de desarrollo)
