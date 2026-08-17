# Archivo Histórico — GO-PES v2

Este directorio contiene documentos de análisis, planes y deployments históricos que ya no son necesarios para el desarrollo activo pero se conservan por referencia.

**Fecha de archivo:** 2026-06-19

---

## 📦 Documentos archivados

### analisis-avance-legacy.md
**Fecha:** 2026-05-26  
**Propósito:** Análisis de migración del módulo Avance desde sistema legacy  
**Estado:** ✅ Migración completada, documento conservado por referencia

### deployment-2026-06-05.md
**Fecha:** 2026-06-05  
**Propósito:** Notas de deployment específico con checklist de verificación  
**Estado:** ✅ Deploy completado, checklist integrada en deploy.md

### plan-loaders.md
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

### organizacion-docs-2026-06-19.md
**Fecha:** 2026-06-19 · **Archivado:** 2026-07-13  
**Propósito:** Registro del proceso de reorganización de documentación a `docs/`  
**Estado:** ✅ Proceso ejecutado; la estructura vigente está en `README.md`

### analisis-completo-2026-07-10.md
**Fecha:** 2026-07-10 · **Archivado:** 2026-08  
**Propósito:** Análisis integral puntual del proyecto  
**Estado:** ✅ Instantánea fechada; hallazgos incorporados al código y docs vigentes

### performance-plan-agresivo.md · performance-analisis-modulos.md · plan-rendimiento-agresivo.md
**Fecha:** 2026-07-10 · **Archivado:** 2026-08  
**Propósito:** Planes y análisis de rendimiento (optimizaciones con código, análisis por módulo, diagnóstico transversal D1–D6)  
**Estado:** ✅ Consolidados en `performance.md` (activo). Se conservan por el código de ejemplo y el detalle por módulo; el plan y estado vigentes están en `performance.md` + `performance-implementacion-pendiente.md`

### checklist-produccion.md
**Fecha:** 2026-06-02 · **Archivado:** 2026-08  
**Propósito:** Checklist pre-producción (configuración crítica, PINs, limpieza de datos, backfill, verificaciones finales)  
**Estado:** ✅ Consolidado en `deploy.md` (secciones "Puesta en marcha de PROD" y checklists de preflight/release)

---

## 🔍 ¿Por qué se archivan estos documentos?

Estos documentos fueron útiles durante fases específicas del desarrollo:
- **Análisis pre-implementación:** Servían como plan de trabajo
- **Guías de deployment:** Checklists para procesos únicos
- **Planes de mejora:** Roadmaps que ya se completaron

Una vez completadas las tareas, la información relevante se integró en:
- Código fuente (`go-pes-local/`)
- Documentación técnica activa (`docs/*.md`)
- Proceso de deploy y checklist pre-PROD (`deploy.md`)

---

## ⚠️ Nota importante

**Estos documentos NO deben usarse como referencia para desarrollo activo.**

Si necesitas información sobre estos temas, consulta:
- **Módulo Avance:** [`CLAUDE.md`](../CLAUDE.md) → sección "Módulo Avance"
- **Deploy a PROD:** [`deploy.md`](../deploy.md)
- **Loaders UX:** [`design-system.md`](../design-system.md) → sección "Sistema de Loading"
- **Frontend (componentes, transiciones):** [`design-system.md`](../design-system.md)

---

**Próxima revisión de archivo:** 2026-12-19 (6 meses)  
**Política de retención:** Mantener 2 años, luego eliminar o consolidar
