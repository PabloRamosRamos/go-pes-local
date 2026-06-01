# Sistema de Normalización de Mensajes Técnicos

**Fecha de implementación:** 2026-06-01  
**Archivos principales:** `Scripts_UI.html`, `Validators.js`

---

## Objetivo

Traducir mensajes técnicos internos (nombres de campos, tablas, constantes) a lenguaje operativo funcional dirigido a usuarios operador/coordinador.

---

## Arquitectura

### Capa 1: Traductor central

**Ubicación:** [`go-pes-local/Scripts_UI.html`](../go-pes-local/Scripts_UI.html)  
**Función:** `normalizeUserMessage_(rawMessage)`  
**Punto de entrada:** `showError(error)` — intercepta **todos** los errores antes de mostrarlos

### Capa 2: Mensajes limpios en origen

**Archivos modificados:**
- `Validators.js` — 6 funciones de validación
- `Scripts_Socios.html` — Formato de errores de importación
- `Scripts_Avance.html` — Prompts simplificados
- `Scripts_NuevoIngreso.html` — Mensajes de éxito
- `Scripts_Organizaciones.html` — Mensajes de éxito

---

## Mapeo de mensajes técnicos → operativos

### Mensajes exactos (mapeo 1:1)

| Mensaje técnico | Mensaje operativo |
|----------------|-------------------|
| `Usuario no registrado en DIM_Usuarios.` | Tu usuario no tiene acceso habilitado al sistema. |
| `Usuario registrado pero inactivo en DIM_Usuarios.` | Tu acceso al sistema está deshabilitado. |
| `Falta solicitud_id.` | No fue posible identificar la solicitud. Recarga la ficha e inténtalo nuevamente. |
| `Falta organizacion_id.` | No fue posible identificar la organización seleccionada. |
| `GO_PES_V2 no está disponible.` | El sistema no está disponible en este momento. Intenta nuevamente o contacta a soporte. |
| `No se pudo acceder al spreadsheet contenedor.` | El sistema no está disponible en este momento. Intenta nuevamente o contacta a soporte. |
| `Contexto invalido. Debe ser: admin_reset...` | No fue posible validar esta acción de seguridad. |

---

### Patrones de reemplazo

#### 1. Campos obligatorios

**Patrón técnico:**
```
Falta el campo obligatorio: nombre_vecino
El campo telefono_contacto es obligatorio
```

**Patrón operativo:**
```
Debes completar el campo Nombre.
Debes completar el campo Teléfono.
```

**Implementación:**
```javascript
msg = msg.replace(
  /falta\s+el\s+campo\s+obligatorio:\s*(\w+)/gi,
  (match, field) => {
    const label = fieldLabels[field] || field;
    return `Debes completar el campo ${label}`;
  }
);
```

---

#### 2. Diccionario de campos técnicos → etiquetas

| Campo técnico | Etiqueta visible |
|--------------|------------------|
| `nombre_vecino` | Nombre |
| `apellido_vecino` | Apellido |
| `telefono_contacto` | Teléfono |
| `direccion_original` | Dirección |
| `requerimiento_inicial` | Requerimiento |
| `correo_contacto` | Correo |
| `solicitud_id` | Identificador de solicitud |
| `organizacion_id` | Identificador de organización |
| `org_instrumento_id` | Identificador de beneficio |
| `nombre_organizacion` | Nombre de organización |
| `tipo_organizacion` | Tipo de organización |
| `fecha_ingreso` | Fecha de ingreso |
| `observacion` | Observación |

---

#### 3. Referencias a tablas internas

**Patrón técnico:**
```
DIM_Usuarios, MAE_Casos, FACT_Hitos, RAW_Ingreso, CFG_Parametros
```

**Patrón operativo:**
```
el sistema
```

**Implementación:**
```javascript
if (/\b(DIM|MAE|FACT|RAW|CFG|LOG|VW)_[A-Z_]+\b/i.test(msg)) {
  msg = msg.replace(/\b(DIM|MAE|FACT|RAW|CFG|LOG|VW)_[A-Z_]+\b/gi, 'el sistema');
}
```

---

#### 4. Constantes globales

**Patrón técnico:**
```
GO_PES_V2, Spreadsheet
```

**Patrón operativo:**
```
el sistema
```

---

#### 5. JSON crudo

**Patrón técnico:**
```json
{"errors":[{"row":3,"message":"Falta nombre_socio"}]}
```

**Patrón operativo:**
```
Ocurrió un error al procesar la solicitud. Revisa los datos e inténtalo nuevamente.
```

**Implementación:**
```javascript
if (/^\{.*\}$/.test(msg) || /^\[.*\]$/.test(msg)) {
  return 'Ocurrió un error al procesar la solicitud. Revisa los datos e inténtalo nuevamente.';
}
```

---

## Ejemplos de transformación end-to-end

### Ejemplo 1: Validación de campos

**Backend** (`Validators.js:validateIngresoV2_`):
```javascript
// Antes
throw new Error(`Falta el campo obligatorio: nombre_vecino`);

// Después
throw new Error(`Debes completar el campo Nombre.`);
```

**Frontend** (usuario ve):
```
✅ Debes completar el campo Nombre.
```

---

### Ejemplo 2: Error de sistema

**Backend** (`Auth.js:getUsuarioActual_`):
```javascript
// Sin cambios (mensaje técnico original)
throw new Error('Usuario no registrado en DIM_Usuarios.');
```

**Frontend** (auto-traducido por `normalizeUserMessage_`):
```
✅ Tu usuario no tiene acceso habilitado al sistema.
```

---

### Ejemplo 3: Errores de importación masiva

**Backend** (`ZZ_SociosBackend.js:importarSocios`):
```javascript
// Sin cambios (retorna estructura con errores)
return {
  imported: 47,
  total: 50,
  errors: [
    { row: 3, message: 'Falta nombre_socio' },
    { row: 8, message: 'Falta organizacion_id' }
  ]
};
```

**Frontend** (`Scripts_Socios.html:53`):

**Antes:**
```html
Errores: [{"row":3,"message":"Falta nombre_socio"},{"row":8,"message":"Falta organizacion_id"}]
```

**Después:**
```html
<strong>La carga terminó con observaciones.</strong>
<p>Revisa las siguientes filas con error:</p>
<ul>
  <li>Fila 3: Debes completar el nombre del socio.</li>
  <li>Fila 8: Debes seleccionar una organización.</li>
</ul>
```

---

### Ejemplo 4: Mensajes de éxito

**Antes:**
```javascript
showSuccess(`Solicitud guardada: ${res.solicitud_id}`);
// Usuario ve: "Solicitud guardada: SOL-20260601-001"
```

**Después:**
```javascript
showSuccess('Solicitud guardada correctamente.');
// Usuario ve: "Solicitud guardada correctamente."
```

---

## Criterio editorial

### ✅ Lo que SÍ mostramos

| Categoría | Ejemplo |
|-----------|---------|
| **Contexto funcional** | No fue posible identificar la solicitud |
| **Acción sugerida** | Recarga la ficha e inténtalo nuevamente |
| **Confirmación clara** | Solicitud guardada correctamente |
| **Campos con etiquetas** | Debes completar el campo Nombre |
| **Estado del sistema** | El sistema no está disponible en este momento |

---

### ❌ Lo que NO mostramos

| Categoría | Ejemplo (evitar) |
|-----------|------------------|
| **Nombres de tablas** | `DIM_Usuarios`, `MAE_Casos`, `FACT_Hitos` |
| **Nombres de variables** | `solicitud_id`, `organizacion_id`, `nombre_vecino` |
| **Claves técnicas** | `GO_PES_V2`, `Spreadsheet`, `PropertiesService` |
| **Formatos internos** | `YYYY-MM-DD`, `ISO 8601`, `UTC` |
| **JSON crudo** | `{"errors":[...]}`, `[{row:3,...}]` |
| **IDs en éxito** | `SOL-123`, `ORG-456`, `USER-789` |

---

## Plantillas de mensajes normalizados

### Errores de validación

```
Debes completar el campo [Nombre del campo].
El [campo] no es válido.
Debes seleccionar una [entidad] válida.
```

### Errores de selección

```
No fue posible identificar la [entidad]. Recarga la ficha e inténtalo nuevamente.
Selecciona una [entidad] válida para continuar.
```

### Errores de acceso

```
Tu usuario no tiene acceso habilitado al sistema.
Tu acceso al sistema está deshabilitado.
No tienes permisos para realizar esta acción.
```

### Errores de sistema

```
El sistema no está disponible en este momento. Intenta nuevamente o contacta a soporte.
No fue posible completar la acción en este momento. Intenta nuevamente.
Ocurrió un error al procesar la solicitud. Revisa los datos e inténtalo nuevamente.
```

### Mensajes de éxito

```
[Entidad] guardada correctamente.
[Entidad] actualizada correctamente.
[Acción] completada exitosamente.
```

### Observaciones/Advertencias

```
La carga terminó con observaciones. Revisa las filas con error.
Algunos campos no pudieron ser actualizados. Revisa los datos e intenta nuevamente.
```

---

## Cobertura de la normalización

### Mensajes auto-traducidos (backend sin cambios)

El traductor central intercepta estos mensajes técnicos de backend:

| Archivo | Mensajes técnicos capturados |
|---------|------------------------------|
| `Auth.js` | 9 errores técnicos (DIM_Usuarios, dominios, permisos) |
| `Services.js` | `Falta solicitud_id.` |
| `ZZ_AvanceBackend.js` | 3× `Falta solicitud_id/organizacion_id.` |
| `ZZ_BeneficiosBackend.js` | `Falta organizacion_id.` |
| `ZZ_OrganizacionesBackend.js` | 2× `Falta organizacion_id.` |
| `ZZ_SociosBackend.js` | `Falta organizacion_id.` |
| `Catalogs.js` | `Falta organizacion_id.` |

**Total:** ~15 mensajes backend auto-traducidos (no requieren modificación en origen)

---

### Mensajes corregidos en origen

| Archivo | Funciones/Líneas modificadas |
|---------|------------------------------|
| `Validators.js` | 6 funciones de validación |
| `Scripts_Socios.html` | Línea 53 (errores de importación) |
| `Scripts_Avance.html` | Línea 824 (prompt simplificado) |
| `Scripts_NuevoIngreso.html` | Líneas 119, 222 (mensajes de éxito) |
| `Scripts_Organizaciones.html` | Línea 813 (mensaje de éxito) |

**Total:** ~169 líneas modificadas

---

## Testing

### Verificación manual recomendada

1. **Validación de campos:**
   - Nuevo ingreso sin completar nombre → debe mostrar "Debes completar el campo Nombre."
   - Nueva organización sin tipo → debe mostrar "Debes completar el campo Tipo de organización."

2. **Errores de sistema:**
   - Acceso con usuario no autorizado → debe mostrar "Tu usuario no tiene acceso habilitado al sistema."
   - Backend arroja `Falta solicitud_id.` → debe mostrar "No fue posible identificar la solicitud. Recarga la ficha..."

3. **Importación de socios:**
   - Importar CSV con errores → debe mostrar lista HTML de errores por fila, no JSON crudo

4. **Mensajes de éxito:**
   - Guardar nueva solicitud → debe mostrar "Solicitud guardada correctamente." (sin ID)
   - Guardar organización → debe mostrar "Organización guardada correctamente." (sin ID)

### Tests automatizados

Los 262 tests existentes siguen pasando:
- Suite `Validators` (90 tests) — valida las funciones modificadas
- Suite `Auth` (41 tests) — valida mensajes de acceso
- Suite completa — 0 fallos

---

## Mantenimiento futuro

### Añadir nuevos mensajes técnicos al traductor

Editar [`Scripts_UI.html`](../go-pes-local/Scripts_UI.html), función `normalizeUserMessage_()`:

**1. Mensaje exacto:**
```javascript
const exactMatches = {
  'Nuevo mensaje técnico exacto.': 'Mensaje operativo traducido.',
  // ... resto de mapeos
};
```

**2. Nueva etiqueta de campo:**
```javascript
const fieldLabels = {
  nuevo_campo_tecnico: 'Etiqueta visible',
  // ... resto de campos
};
```

**3. Nuevo patrón:**
```javascript
// Después de los patrones existentes
if (/nuevo\s+patron\s+tecnico/i.test(msg)) {
  return 'Mensaje operativo correspondiente.';
}
```

### Actualizar mensajes en origen

Para nuevas validaciones, usar el patrón de `Validators.js`:

```javascript
function validateNuevaEntidad_(p) {
  const requiredFields = {
    campo_tecnico_1: 'Etiqueta visible 1',
    campo_tecnico_2: 'Etiqueta visible 2'
  };

  Object.keys(requiredFields).forEach(field => {
    if (!String(p[field] || '').trim()) {
      throw new Error(`Debes completar el campo ${requiredFields[field]}.`);
    }
  });
}
```

---

## Documentos relacionados

- [`CLAUDE.md`](../CLAUDE.md) — Historial de cambios (entrada 2026-06-01)
- [`docs/dev-stats.md`](dev-stats.md) — Métricas del proyecto
- [`docs/design-system.md`](design-system.md) — Sistema de diseño y UX

---

**Documento generado:** 2026-06-01  
**Última actualización:** 2026-06-01
