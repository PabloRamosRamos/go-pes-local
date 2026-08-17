# Deployment a PROD - 2026-06-05

## 📋 Resumen de cambios

### 1. Nuevos campos en hitos del módulo Avance

Se agregaron campos específicos a 5 hitos del proceso de constitución de organizaciones:

| Hito | Código | Campo agregado | Tipo | Obligatorio |
|------|--------|----------------|------|-------------|
| 3 | PRE_03 | Fecha asignada para la asamblea | Date | Sí |
| 7 | PRE_07 | N° de registro (cert. provisorio) | Text | Sí |
| 11 | FOR_04 | N° de registro (cert. definitivo) | Text | Sí, pre-carga del hito 7 |
| 12 | FOR_07 | RUT de la organización | Text | Sí, validación formato `00000000-0` |
| 14 | FOR_08 | N° de Cuenta bancaria + Banco | Text + Select | Ambos obligatorios |

**Archivos modificados:**
- `ZZ_AvancePhase1.js` — Schema de `FACT_AVANCE_HITOS` con 5 nuevos campos
- `Repository.js` — Schema actualizado para Repository
- `ZZ_AvanceBackend.js` — Extracción, validación y persistencia de nuevos campos
- `Scripts_Avance.html` — Modal con campos condicionales, validaciones y pre-carga
- `appsscript.json` — Scope `script.scriptapp` agregado

**Validaciones implementadas:**
- RUT: regex `^\d{7,8}-[\dkK]$` (sin puntos, con guión)
- Pre-carga: Hito 11 carga automáticamente el N° registro del Hito 7
- Banco: lista de 20 bancos chilenos

### 2. Modal de detalle de Organizaciones actualizado

El modal de detalle ahora muestra todos los nuevos campos en un bloque "Datos administrativos y financieros" con layout de 3 columnas:

- **Columna 1:** RUT de la organización (Hito 12)
- **Columna 2:** N° Registro certificado provisorio (Hito 7) + N° Registro certificado definitivo (Hito 11)
- **Columna 3:** Cuenta bancaria + Banco (Hito 14)

**Archivos modificados:**
- `Scripts_Organizaciones.html` — Nueva función `renderOrganizacionDetalle_` con extracción de hitos y display
- `Styles.html` — Nueva clase `.organizaciones-kv--triple` para layout 3 columnas

### 3. Loaders locales por módulo (UX)

Reemplazado el loading fullscreen por loaders locales dentro de cada vista de módulo:

**Antes:** Al navegar a Organizaciones/Avance/Beneficios/Socios, se mostraba un loader que cubría toda la pantalla.

**Ahora:** Cada módulo tiene su propio spinner local dentro de su `<section class="view">`.

**Archivos modificados:**
- `Index.html` — Agregado `.view-loader` en 4 vistas (avance, organizacion, instrumento, socios)
- `Styles.html` — Estilos `.view-loader` con spinner animado
- `ThemeDark.html` — Dark mode para `.view-loader`
- `Scripts.html` — Funciones `showViewLoader_()` / `hideViewLoader_()` y lógica en `route()`

### 4. Modales ajustados a 20px del top

Todos los modales del sistema ahora abren a 20px del top del viewport en lugar de estar centrados verticalmente:

**Modales actualizados:**
- `organizaciones-modal` (detalle, edición, cargo socio)
- `admin-reset-modal`
- `user-modal`
- `avance-modal`
- `socios-modal`

**Archivos modificados:**
- `Styles.html` — Cambiado `align-items: center` → `align-items: flex-start` + `padding-top: 20px` en 5 modales
- `Styles.html` — Cambiado `margin: auto` → `margin: 0` en dialogs compartidos
- `Styles.html` — Ajustado `max-height` de dialogs de `100vh - 32px` → `100vh - 40px`

### 5. Normalización de mensajes de error UX

Sistema de traducción de errores técnicos a mensajes operativos implementado en `Scripts_UI.html`:

**Antes:** "Usuario no registrado en DIM_Usuarios"  
**Ahora:** "Tu usuario no tiene acceso habilitado"

**Antes:** "Falta el campo obligatorio: nombre_vecino"  
**Ahora:** "Debes completar el campo Nombre"

**Implementación:**
- Función `normalizeUserMessage_()` intercepta errores en `showError()`
- Mapea ~15 mensajes técnicos exactos
- Detecta patrones (campos obligatorios, registros duplicados)
- Reemplaza nombres de tablas/constantes por términos funcionales
- Diccionario de 13 campos técnicos → etiquetas visibles

**Archivos modificados:**
- `Scripts_UI.html` — Función central de normalización (~95 líneas)
- `Validators.js` — 6 funciones con etiquetas legibles
- `Scripts_Socios.html`, `Scripts_Avance.html`, `Scripts_NuevoIngreso.html`, `Scripts_Organizaciones.html` — Mensajes específicos

---

## ✅ Pre-flight checklist completado

- [x] Tests automatizados ejecutados en DEV: **262 tests, 0 fallos**
- [x] Verificación manual de módulos principales en DEV
- [x] Código subido a PROD con `.\push-prod.ps1`
- [x] Deployment actualizado (no creado nuevo) para mantener URL

---

## 🔗 URL de PROD (sin cambios)

```
https://script.google.com/a/macros/providencia.cl/s/AKfycbwCGOUG1badbRUOonNVEpGJjNVG1lFtvkFpnQNmBg1G239u-qsoEaYWeuyQdRbANiGQ-w/exec
```

**Script ID PROD:** `10Lzrg2GyPlkB0Wk6yLCshhtwv53dCSKLxDc8dDaOOpJgM2euLoKjRPOG`

---

## 📊 Impacto y riesgos

### ✅ Bajo riesgo
- Campos nuevos en hitos: solo afectan al registrar/editar hitos específicos
- Loaders locales: mejora UX sin romper funcionalidad existente
- Modal de organizaciones: cambios visuales sin lógica de negocio
- Normalización mensajes: no afecta funcionalidad, solo presentación

### ⚠️ Cambios de schema
- `FACT_AVANCE_HITOS` tiene 5 columnas nuevas
- **Acción requerida:** Ejecutar "Configurar motor operativo" desde el menú GO-PES v2 en PROD para crear las columnas

### 🔄 Rollback
Si se necesita revertir:
1. En "Administrar implementaciones", seleccionar versión anterior
2. Las columnas nuevas en `FACT_AVANCE_HITOS` quedarán vacías pero no afectan funcionalidad anterior

---

## 📝 Tareas post-deployment

1. ✅ Verificar que la URL de PROD abre correctamente
2. ✅ Ejecutar "GO-PES v2" → "Configurar motor operativo" para crear columnas nuevas
3. ⏳ Probar registro de hitos 3, 7, 11, 12 y 14 con los nuevos campos
4. ⏳ Verificar que el modal de organizaciones muestra los datos correctamente
5. ⏳ Confirmar que los loaders locales funcionan al navegar entre módulos
6. ⏳ Verificar tema claro y oscuro en todos los cambios

---

## 🐛 Problemas conocidos

Ninguno detectado en DEV.

---

## 📞 Contacto

**Desarrollador:** Pablo Ramos  
**Fecha:** 2026-06-05  
**Versión desplegada:** v2.1.1 (ver `Main.js`)
