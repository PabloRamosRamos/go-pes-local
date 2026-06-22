# PLAN DE ANÁLISIS Y CORRECCIÓN DE LOADERS

## 📊 DIAGNÓSTICO ACTUAL

### Tipos de loaders existentes:

1. **Global/Content Loading**
   - Funciones: `showContentLoading()`, `hideContentLoading()`
   - Ubicación: `Loading.html`
   - Comportamiento: Detecta automáticamente si hay modal abierto
   - **Problema**: Cuando detecta modal, cubre TODA la pantalla en lugar de solo el modal

2. **Modal Loading (forzado)**
   - Función: `showModalLoading()`
   - Ubicación: `Loading.html`
   - Comportamiento: Fuerza contexto fullscreen
   - **Problema**: Siempre cubre toda la pantalla, no el modal específico

3. **Avance Loading (específico)**
   - Funciones: `showAvanceLoading_()`, `hideAvanceLoading_()`
   - Ubicación: `Scripts_Avance.html`
   - Comportamiento: Loader específico del módulo
   - **Estado**: Funciona pero es inconsistente con otros módulos

4. **View Loaders (eliminados)**
   - Fueron eliminados porque causaban problemas de loaders atascados
   - **Lección aprendida**: Los loaders deben tener control centralizado

### Módulos analizados (83 ocurrencias):

| Archivo | Ocurrencias | Tipo de loader usado |
|---------|-------------|---------------------|
| `Scripts_Avance.html` | 18 | Propio + Content |
| `Scripts_Admin.html` | 32 | Content + Modal |
| `Loading.html` | 10 | Definiciones |
| `Scripts.html` | 7 | Content |
| `Scripts_Beneficios.html` | 6 | Content + Modal |
| `Scripts_NuevoIngreso.html` | 4 | Content |
| `Scripts_Organizaciones.html` | 4 | Content + Modal |
| `Scripts_Socios.html` | 2 | Content + Modal |

---

## 🎯 PROBLEMAS IDENTIFICADOS

### 1. **Loader fullscreen en modales** (CRÍTICO)
   - Al abrir modal de organizaciones y ejecutar acción, el loader cubre TODA la pantalla
   - Debería cubrir solo el modal, no toda la app
   - Afecta: Organizaciones, Socios, Admin, Beneficios

### 2. **Inconsistencia entre módulos**
   - Avance tiene su propio sistema de loading
   - Otros módulos usan sistema global
   - No hay estándar unificado

### 3. **Loader "content" vs "modal" mal implementado**
   - La detección automática de contexto no distingue entre:
     - **Loader fullscreen**: cuando NO hay modal abierto
     - **Loader dentro del modal**: cuando SÍ hay modal abierto
   - Actualmente si hay modal abierto → fullscreen (incorrecto)
   - Debería ser: si hay modal abierto → dentro del modal específico

---

## 💡 SOLUCIÓN PROPUESTA

### Estrategia: **3 Contextos de Loading**

1. **FULLSCREEN** - Cubre toda la app
   - Uso: Carga inicial, cambio de módulo, operaciones globales
   - Elemento: `#content-loading` montado en `#app`
   - Z-index: Máximo

2. **CONTENT** - Cubre solo el área de contenido
   - Uso: Carga de datos dentro de un módulo
   - Elemento: `#content-loading` montado en `.content`
   - Z-index: Intermedio

3. **MODAL** - Cubre solo el modal específico abierto
   - Uso: Acciones dentro de modales (guardar, actualizar, etc.)
   - Elemento: Nuevo `modal-loading` dentro de cada modal
   - Z-index: Relativo al modal

### API Propuesta:

```javascript
// Contexto global/fullscreen
showContentLoading('Cargando...')

// Contexto del módulo actual
showModuleLoading('Cargando datos...')

// Contexto del modal específico
showModalLoading(modalId, 'Guardando...')
// Ejemplo: showModalLoading('organizaciones-modal', 'Guardando organización...')

// Ocultar (detecta contexto automáticamente)
hideLoading()
```

---

## 🔧 PLAN DE IMPLEMENTACIÓN

### **FASE 1: Análisis detallado** ✅ (Completada)
- [x] Inventario de loaders existentes
- [x] Mapeo de 83 ocurrencias en 8 archivos
- [x] Identificación de problemas críticos
- [x] Documentación del estado actual

### **FASE 2: Diseño de arquitectura** (Siguiente)
1. Crear componente `<modal-loading>` reutilizable
2. Definir API unificada de loading
3. Estrategia de migración sin breaking changes
4. Plan de rollback si algo falla

### **FASE 3: Implementación incremental**

#### **Paso 1: Componente de modal loading** (30 min)
- Crear nuevo template `modal-loading-template` en Loading.html
- Función `showModalLoading(modalId, message)`
- Función `hideModalLoading(modalId)`
- Estilos CSS para overlay dentro del modal

#### **Paso 2: Inyectar en modales existentes** (20 min)
- Agregar `<div class="modal-loading is-hidden">` a cada modal:
  - `#organizaciones-modal`
  - `#org-socio-cargo-modal`
  - `#avance-modal` / `#avance-hito-modal`
  - `#admin-reset-modal`
  - `#user-modal`
  - `#socios-modal`

#### **Paso 3: Migrar llamadas en Organizaciones** (40 min)
- `Scripts_Organizaciones.html` (4 ocurrencias)
  - `loadOrganizacionDetalle_()` → usar loader de contenido
  - `saveOrganizacionDesdeModulo_()` → usar `showModalLoading('organizaciones-modal')`
  - `updateCargoSocioOrganizacion_()` → usar `showModalLoading('org-socio-cargo-modal')`
- Probar exhaustivamente antes de continuar

#### **Paso 4: Migrar otros módulos** (1-2 horas)
En orden de prioridad:
1. Admin (32 ocurrencias) - Crítico
2. Avance (18 ocurrencias) - Eliminar sistema propio
3. Beneficios (6 ocurrencias)
4. Socios (2 ocurrencias)
5. Nuevo Ingreso (4 ocurrencias) - Solo content loading

#### **Paso 5: Cleanup y unificación** (30 min)
- Eliminar `showAvanceLoading_()` personalizado
- Consolidar todas las llamadas a API unificada
- Actualizar documentación en CLAUDE.md

### **FASE 4: Testing**
- [ ] Probar cada módulo individualmente
- [ ] Probar navegación entre módulos con modales abiertos
- [ ] Probar loaders anidados (modal dentro de modal si existe)
- [ ] Verificar que no queden loaders atascados
- [ ] Probar en modo claro y oscuro

### **FASE 5: Deployment**
1. Push a DEV
2. Testing exhaustivo por el usuario
3. Correcciones si hay problemas
4. Push a PROD solo cuando esté 100% funcional

---

## ⚠️ RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Loaders atascados | Media | Alto | Implementar timeout automático de 30s |
| Breaking changes en módulos | Baja | Alto | Migración incremental, probar cada módulo |
| Modal loading no visible | Media | Medio | Z-index relativo al modal, testing visual |
| Performance degradado | Baja | Bajo | Reutilizar elementos DOM, no crear/destruir |

---

## 📝 ESTIMACIÓN DE TIEMPO

- **Fase 2**: 30 min (diseño)
- **Fase 3**: 3-4 horas (implementación incremental)
- **Fase 4**: 1 hora (testing)
- **Total**: ~5 horas de trabajo

---

## ✅ CRITERIOS DE ÉXITO

1. ✅ Loader dentro del modal NO cubre toda la pantalla
2. ✅ Loader de contenido solo cubre el área del módulo
3. ✅ No hay loaders atascados
4. ✅ Consistencia visual en todos los módulos
5. ✅ Navegación entre módulos cierra loaders automáticamente
6. ✅ Performance sin degradación
7. ✅ Código más mantenible y predecible

---

## 🚦 DECISIÓN REQUERIDA

**¿Proceder con la implementación?**

Opciones:
- **A)** Implementar plan completo ahora (~5 horas)
- **B)** Solo fix crítico de modal fullscreen (~1 hora), postergar unificación
- **C)** Revisar/ajustar el plan antes de implementar

**Recomendación**: Opción B (fix crítico primero) para desbloquear al usuario, luego planificar unificación completa en sesión dedicada.
