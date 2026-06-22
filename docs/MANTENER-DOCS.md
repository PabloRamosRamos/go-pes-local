# Guía de Mantenimiento de Documentación — GO-PES v2

**Propósito:** Este archivo es la fuente de verdad sobre qué documentar, cuándo y cómo mantener la documentación sincronizada con el código durante el desarrollo activo.

**Audiencia:** Desarrolladores, Claude Code, cualquier colaborador que modifique el sistema.

---

## Regla de oro

**Si cambias el código, actualiza la documentación en el mismo commit.**

No hay "después lo documento". El conocimiento se pierde en 48 horas.

---

## Matriz de responsabilidad documental

| Documento | Dueño | Frecuencia | Estado | Trigger de actualización |
|-----------|-------|-----------|--------|--------------------------|
| **docs/README.md** | Dev lead | Por release | ✅ Activo | Cambio de stack, estructura o proceso de deploy |
| **docs/CLAUDE.md** | Dev lead | Por cambio | ✅ Activo | Cambio significativo en código/arquitectura |
| **docs/INICIO-RAPIDO-CLAUDE.md** | Dev lead | Por release | ✅ Activo | Actualización de métricas o cambios mayores |
| **docs/arquitectura.md** | Dev lead | Por cambio mayor | ✅ Activo | Nuevo módulo, nueva capa, cambio en flujo request→response |
| **docs/modelo-datos.md** | Dev lead | Por cambio mayor | ✅ Activo | Nueva hoja, campo crítico, relación FK, pipeline RAW→MAE |
| **docs/deploy.md** | Dev lead | Por cambio de proceso | ✅ Activo | Nuevo entorno, cambio en clasp, nueva dependencia de deploy |
| **docs/seguridad.md** | Dev lead + Auditor | Por cambio de permisos | ✅ Activo | Nuevo rol, scope, dominio, PIN, auth guard |
| **docs/design-system.md** | Dev lead | Por nuevo componente | ✅ Activo | Nuevo componente CSS, patrón UI, transición |
| **docs/dev-stats.md** | Dev lead | Por release | ✅ Activo | Actualización de métricas de proyecto |
| **docs/CHECKLIST-PRODUCCION.md** | Dev lead | Por release | ✅ Activo | Nuevo paso en proceso de deploy a PROD |
| **docs/MANTENER-DOCS.md** | Dev lead | Por nueva práctica | ✅ Activo | Cambio en convenciones de documentación |
| **Manual.html** | Product owner + Dev | Por release | ✅ Activo | Cambio en UI, nuevo módulo, nueva funcionalidad visible |
| **docs/api-interna.md** | Dev (quien escribe la función) | Por función pública nueva | ⚠️ Pendiente | Cada función pública sin `_` añadida al backend |
| **docs/configuracion.md** | Dev lead | Por nueva config | ⚠️ Pendiente | Nueva clave en `CFG_Parametros` o `SystemConfig.js` |
| **docs/testing.md** | Dev (quien escribe el test) | Por nueva suite | ⚠️ Pendiente | Nueva suite en `Audith.js`, cambio en estrategia de testing |
| **docs/runbook-operacion.md** | Operaciones + Dev lead | Mensual | ⚠️ Pendiente | Nuevo incidente recurrente, procedimiento de soporte |
| **docs/migraciones-y-reset.md** | Dev lead | Por nueva utilidad | ⚠️ Pendiente | Nueva función admin, cambio en proceso de migración |
| **docs/dependencias-externas.md** | Dev lead | Por nueva integración | ⚠️ Pendiente | Nuevo servicio externo (Calendar, Looker, API terceros) |

---

## Triggers automáticos: "Si haces X, documenta Y"

### Backend

| Cambias | Actualiza |
|---------|-----------|
| Función pública nueva (sin `_`) | `docs/CLAUDE.md` — añadir entrada en historial si es cambio significativo |
| Nueva hoja en `GO_PES_V2.SHEETS` | `docs/modelo-datos.md` — añadir tabla con esquema y relaciones |
| Nuevo rol en auth | `docs/seguridad.md` — matriz de permisos |
| Nuevo módulo (`ZZ_*.js`) | `docs/arquitectura.md` — agregar al mapa de módulos |
| Cambio en `appsscript.json` scopes | `docs/seguridad.md` — justificar scope |
| Nuevo componente CSS/UI | `docs/design-system.md` — documentar componente y variantes |
| Cambio significativo en código | `docs/CLAUDE.md` — añadir entrada en "Historial de cambios significativos" |

### Frontend

| Cambias | Actualiza |
|---------|-----------|
| Nueva vista (módulo) | `Manual.html` — sección dedicada |
| Cambio en flujo de usuario | `Manual.html` — actualizar screenshots/pasos |
| Nuevo permiso por módulo | `docs/seguridad.md` — matriz rol→módulo |

### Deploy

| Cambias | Actualiza |
|---------|-----------|
| Nuevo script `push-*.ps1` | `docs/deploy.md` — procedimiento |
| Nueva dependencia en `package.json` o clasp | `README.md` y `docs/deploy.md` |
| Nuevo entorno (STAGING, etc.) | `docs/deploy.md` — sección dedicada |

### Operación

| Incidente recurrente | Actualiza |
|---------------------|-----------|
| Error nuevo que se repite 3+ veces | `docs/runbook-operacion.md` — checklist de diagnóstico |
| Nueva dependencia externa con downtime | `docs/dependencias-externas.md` — contacto, SLA, plan B |

---

## Checklist pre-commit

Antes de hacer `git commit`, verifica:

```
□ ¿Es un cambio significativo (nuevo módulo, feature, fix importante)?
  → Actualizar docs/CLAUDE.md — sección "Historial de cambios"

□ ¿Cambiaste el esquema de una hoja (headers)?
  → Actualizar docs/modelo-datos.md

□ ¿Agregaste un nuevo rol, módulo o scope?
  → Actualizar docs/seguridad.md

□ ¿Agregaste/modificaste un componente CSS o patrón UI?
  → Actualizar docs/design-system.md

□ ¿Es un cambio funcional visible al usuario?
  → Actualizar Manual.html

□ ¿Modificaste métricas del proyecto (LOC, tests, etc.)?
  → Actualizar docs/dev-stats.md
```

---

## Checklist pre-release

Antes de hacer `push-prod.ps1`:

```
□ CHANGELOG.md actualizado con versión actual
□ Manual.html revisado por cambios funcionales
□ docs/deploy.md incluye pasos post-deploy si hay breaking changes
□ README.md refleja el stack/estructura actuales
□ docs/seguridad.md actualizada si hay nuevos PINs/roles/scopes
□ Todos los tests pasan (goPesRunAllTests → 0 fallos)
```

---

## Documentación "living" vs "estable"

### Living (se actualiza en cada cambio relevante) ✅
- `docs/CLAUDE.md` — crece con cada cambio significativo (historial)
- `docs/modelo-datos.md` — crece con cada hoja nueva
- `docs/seguridad.md` — actualiza con cada cambio de permisos
- `docs/design-system.md` — crece con cada componente nuevo

### Estable (se revisa por fase/milestone) ✅
- `docs/README.md` — solo cambios mayores de stack/estructura
- `docs/arquitectura.md` — solo refactorings grandes
- `docs/deploy.md` — solo cambios de proceso
- `docs/dev-stats.md` — se actualiza por release/milestone

### Pendientes de crear (según necesidad) ⚠️
- `docs/api-interna.md` — inventario completo de funciones públicas
- `docs/testing.md` — estrategia y cobertura de tests
- `docs/runbook-operacion.md` — diagnóstico de incidentes recurrentes
- `docs/configuracion.md` — claves de CFG_Parametros
- `docs/migraciones-y-reset.md` — utilidades de administración
- `docs/dependencias-externas.md` — Calendar, Looker, APIs terceros

---

## Plantillas para documentos futuros

### Para `docs/api-interna.md` (cuando se cree)

```markdown
#### `nombreFuncion(payload)`

**Módulo:** `nombre-modulo`  
**Roles:** `operador`, `coordinador`, `superuser`  
**Descripción:** Qué hace en 1 línea  

**Payload:**
- `campo1` (string, requerido) — descripción
- `campo2` (number, opcional) — descripción

**Respuesta:**
```javascript
{
  ok: true,
  data: { ... }
}
```

**Hojas afectadas:**
- Lectura: `MAE_CASOS`, `DIM_USUARIOS`
- Escritura: `FACT_HITOS`

**Side effects:**
- Invalida cache de catálogos
- Dispara rebuild parcial de MASTER_DATOS
```

### Para nuevas hojas en `docs/modelo-datos.md`

```markdown
### `NOMBRE_HOJA`

**Tipo:** RAW / MAE / FACT / DIM / VW / CFG / LOG  
**Productor:** Función/módulo que escribe  
**Consumidor:** Función/módulo que lee  

**Esquema:**

| Campo | Tipo | PK | FK | Requerido | Descripción |
|-------|------|----|----|-----------|-------------|
| `id` | string | ✓ | | ✓ | ID único generado por nextId_('namespace','PREFIX') |
| `campo_x` | string | | | ✓ | ... |

**Relaciones:**
- FK lógica a `MAE_OTRA` via `campo_fk`
- Referenciada por `VW_VISTA` via `id`
```

---

## Herramientas para mantener sincronización

### Script de validación de docs (futuro)
Crear `scripts/validate-docs.js` que:
- Lista funciones públicas en backend vs `docs/api-interna.md`
- Lista hojas en `GO_PES_V2.SHEETS` vs `docs/modelo-datos.md`
- Verifica que CHANGELOG.md tenga entrada para VERSION actual

### Comando de revisión rápida

```bash
# Ver qué funciones públicas no están documentadas
grep -r "^function [a-z].*(" go-pes-local/*.js | grep -v "_" | wc -l
# vs líneas en docs/api-interna.md con "####"
grep -c "^####" docs/api-interna.md
```

---

## Anti-patrones a evitar

❌ **"Lo documento después"** — No existe después. Documenta en el commit.  
❌ **Documentación en Slack/Notion** — Si no está en el repo, no existe.  
❌ **README gigante** — README es índice, no manual completo.  
❌ **Docs desactualizadas** — Peor que no tener docs. Borra lo obsoleto.  
❌ **Solo comentarios en código** — El código cambia, los comments no se actualizan.

✅ **Documentación mínima viable por cambio** — 1 párrafo > 0 párrafos.  
✅ **Links entre docs** — `[Ver deploy.md](deploy.md)` mantiene navegación.  
✅ **Ejemplos concretos** — Un payload de ejemplo > 3 párrafos abstractos.  
✅ **Versión en cada doc crítico** — "Actualizado: 2026-05-31 | v2.1.512"

---

## Revisión editorial periódica

**Cada 3 meses (o antes de release mayor):**

1. Leer `README.md` de principio a fin como si fueras nuevo → ¿falta algo crítico?
2. Validar `docs/api-interna.md` contra funciones reales → ¿hay funciones huérfanas?
3. Ejecutar `goPesRunAllTests()` y comparar con `docs/testing.md` → ¿cobertura real vs documentada?
4. Revisar `Manual.html` con usuario operador → ¿capturas de pantalla obsoletas?
5. Consolidar `docs/runbook-operacion.md` → ¿incidentes nuevos no documentados?

---

## Claude Code: Cómo usar este archivo

Cuando el usuario te pida actualizar docs o hagas un cambio que lo requiera:

1. **Lee este archivo primero:** `docs/MANTENER-DOCS.md`
2. **Identifica el trigger:** ¿qué cambió? (función, hoja, rol, etc.)
3. **Consulta la matriz:** ¿qué documento(s) hay que actualizar?
4. **Usa el formato de ejemplo:** copia la plantilla de sección
5. **Actualiza en el mismo commit:** docs + código juntos

Ejemplo de prompt interno:
```
Usuario agregó función pública `guardarNuevoIngreso(payload)`
→ Trigger: Backend → Función pública nueva
→ Documento: docs/api-interna.md
→ Acción: Agregar sección con formato estándar (módulo, roles, payload, response, hojas)
```

---

**Última actualización:** 2026-05-31  
**Versión de este archivo:** 1.0  
**Próxima revisión:** 2026-08-31 (3 meses)
