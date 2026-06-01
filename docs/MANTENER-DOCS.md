# Guía de Mantenimiento de Documentación — GO-PES v2

**Propósito:** Este archivo es la fuente de verdad sobre qué documentar, cuándo y cómo mantener la documentación sincronizada con el código durante el desarrollo activo.

**Audiencia:** Desarrolladores, Claude Code, cualquier colaborador que modifique el sistema.

---

## Regla de oro

**Si cambias el código, actualiza la documentación en el mismo commit.**

No hay "después lo documento". El conocimiento se pierde en 48 horas.

---

## Matriz de responsabilidad documental

| Documento | Dueño | Frecuencia | Trigger de actualización |
|-----------|-------|-----------|--------------------------|
| **README.md** | Dev lead | Por release | Cambio de stack, estructura o proceso de deploy |
| **docs/arquitectura.md** | Dev lead | Por cambio mayor | Nuevo módulo, nueva capa, cambio en flujo request→response |
| **docs/modelo-datos.md** | Dev lead | Por cambio mayor | Nueva hoja, campo crítico, relación FK, pipeline RAW→MAE |
| **docs/deploy.md** | Dev lead | Por cambio de proceso | Nuevo entorno, cambio en clasp, nueva dependencia de deploy |
| **docs/api-interna.md** | Dev (quien escribe la función) | Por función pública nueva | Cada función pública sin `_` añadida al backend |
| **docs/configuracion.md** | Dev lead | Por nueva config | Nueva clave en `CFG_Parametros` o `SystemConfig.js` |
| **docs/seguridad.md** | Dev lead + Auditor | Por cambio de permisos | Nuevo rol, scope, dominio, PIN, auth guard |
| **docs/testing.md** | Dev (quien escribe el test) | Por nueva suite | Nueva suite en `Audith.js`, cambio en estrategia de testing |
| **docs/runbook-operacion.md** | Operaciones + Dev lead | Mensual | Nuevo incidente recurrente, procedimiento de soporte |
| **docs/migraciones-y-reset.md** | Dev lead | Por nueva utilidad | Nueva función admin, cambio en proceso de migración |
| **docs/dependencias-externas.md** | Dev lead | Por nueva integración | Nuevo servicio externo (Calendar, Looker, API terceros) |
| **CHANGELOG.md** | Dev lead | Por release | Cada vez que se incrementa VERSION en Main.js |
| **docs/onboarding.md** | Dev lead | Trimestral | Feedback de nuevos devs/operadores |
| **Manual.html** | Product owner + Dev | Por release | Cambio en UI, nuevo módulo, nueva funcionalidad visible |

---

## Triggers automáticos: "Si haces X, documenta Y"

### Backend

| Cambias | Actualiza |
|---------|-----------|
| Función pública nueva (sin `_`) | `docs/api-interna.md` — añadir firma, payload, response, roles |
| Nueva hoja en `GO_PES_V2.SHEETS` | `docs/modelo-datos.md` — añadir tabla con esquema y relaciones |
| Nuevo rol en auth | `docs/seguridad.md` — matriz de permisos |
| Nueva constante en `SystemConfig.js` | `docs/configuracion.md` — clave, default, efecto |
| Nueva suite de tests | `docs/testing.md` — cobertura, cómo correrla |
| Nuevo módulo (`ZZ_*.js`) | `docs/arquitectura.md` — agregar al mapa de módulos |
| Cambio en `appsscript.json` scopes | `docs/seguridad.md` — justificar scope |

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
□ ¿Agregaste/modificaste una función pública?
  → Actualizar docs/api-interna.md

□ ¿Cambiaste el esquema de una hoja (headers)?
  → Actualizar docs/modelo-datos.md

□ ¿Agregaste un nuevo rol, módulo o scope?
  → Actualizar docs/seguridad.md

□ ¿Modificaste SystemConfig.js o CFG_Parametros?
  → Actualizar docs/configuracion.md

□ ¿Escribiste un nuevo test?
  → Actualizar docs/testing.md (cobertura)

□ ¿Es un cambio funcional visible al usuario?
  → Actualizar Manual.html

□ ¿Es un release (incremento de VERSION)?
  → Actualizar CHANGELOG.md con versión, fecha, cambios
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

### Living (se actualiza en cada cambio relevante)
- `docs/api-interna.md` — crece con cada función pública
- `docs/modelo-datos.md` — crece con cada hoja nueva
- `docs/testing.md` — crece con cada suite
- `CHANGELOG.md` — crece con cada release

### Estable (se revisa por fase/milestone)
- `README.md` — solo cambios mayores de stack/estructura
- `docs/arquitectura.md` — solo refactorings grandes
- `docs/deploy.md` — solo cambios de proceso
- `docs/runbook-operacion.md` — acumula conocimiento, se consolida mensual

---

## Formato de secciones repetitivas

### Función pública en `docs/api-interna.md`

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

### Hoja nueva en `docs/modelo-datos.md`

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
