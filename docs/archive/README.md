# Archivo Histórico — GO-PES v2

Este directorio contiene documentos de análisis, planes y deployments históricos que ya no son necesarios para el desarrollo activo pero se conservan por referencia.

**Fecha de archivo:** 2026-06-19

---

## 📦 Documentos archivados

### ANALISIS-AVANCE-LEGACY.md
**Fecha:** 2026-05-26  
**Propósito:** Análisis de migración del módulo Avance desde sistema legacy  
**Estado:** ✅ Migración completada, documento conservado por referencia

### DEPLOYMENT-2026-06-05.md
**Fecha:** 2026-06-05  
**Propósito:** Notas de deployment específico con checklist de verificación  
**Estado:** ✅ Deploy completado, checklist integrada en CHECKLIST-PRODUCCION.md

### GUIA-MIGRACION.md
**Fecha:** 2026-06-02  
**Propósito:** Guía paso a paso para migración de datos desde sistema legacy  
**Estado:** ✅ Migración completada, funcionalidad integrada en ZZ_MigracionBackend.js

### PLAN-LOADERS.md
**Fecha:** 2026-06-08  
**Propósito:** Plan de mejora de loaders y estados de carga UX  
**Estado:** ✅ Superseded — el sistema de loading se estandarizó el 2026-07-10 (loader por módulo, nunca fullscreen). Ver `design-system.md` → "Sistema de Loading"

### diagnostico-transiciones.md
**Fecha:** 2026-06-01 · **Archivado:** 2026-07-13  
**Propósito:** Diagnóstico puntual del sistema de transiciones UX (v2.1.512)  
**Estado:** ✅ Sistema de transiciones implementado y documentado en `design-system.md`

### frontend-estado-actual.md
**Fecha:** 2026-05-31 · **Archivado:** 2026-07-13  
**Propósito:** Auditoría UX/accesibilidad del frontend previa al plan de mejora  
**Estado:** ✅ Instantánea pre-mejoras; el plan derivado se completó (5/5 fases)

### frontend-plan-mejora.md
**Fecha:** 2026-05-31 · **Archivado:** 2026-07-13  
**Propósito:** Roadmap priorizado de mejoras frontend  
**Estado:** ✅ Completado (5/5 fases); resultado documentado en `design-system.md`

### frontend-plan-resumen.md
**Fecha:** 2026-05-31 · **Archivado:** 2026-07-13  
**Propósito:** Resumen ejecutivo del plan de mejora frontend  
**Estado:** ✅ Completado (5/5 fases)

### ORGANIZACION-DOCS-2026-06-19.md
**Fecha:** 2026-06-19 · **Archivado:** 2026-07-13  
**Propósito:** Registro del proceso de reorganización de documentación a `docs/`  
**Estado:** ✅ Proceso ejecutado; la estructura vigente está en `README.md`

---

## 🔍 ¿Por qué se archivan estos documentos?

Estos documentos fueron útiles durante fases específicas del desarrollo:
- **Análisis pre-implementación:** Servían como plan de trabajo
- **Guías de deployment:** Checklists para procesos únicos
- **Planes de mejora:** Roadmaps que ya se completaron

Una vez completadas las tareas, la información relevante se integró en:
- Código fuente (`go-pes-local/`)
- Documentación técnica activa (`docs/*.md`)
- Guía de producción (`CHECKLIST-PRODUCCION.md`)

---

## ⚠️ Nota importante

**Estos documentos NO deben usarse como referencia para desarrollo activo.**

Si necesitas información sobre estos temas, consulta:
- **Módulo Avance:** [`CLAUDE.md`](../CLAUDE.md) → sección "Módulo Avance"
- **Deploy a PROD:** [`CHECKLIST-PRODUCCION.md`](../CHECKLIST-PRODUCCION.md)
- **Migración de datos:** Código en `go-pes-local/ZZ_MigracionBackend.js`
- **Loaders UX:** [`design-system.md`](../design-system.md) → sección "Sistema de Loading"
- **Frontend (componentes, transiciones):** [`design-system.md`](../design-system.md)

---

**Próxima revisión de archivo:** 2026-12-19 (6 meses)  
**Política de retención:** Mantener 2 años, luego eliminar o consolidar
