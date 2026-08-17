# Módulo Avance — Máquina de estados de hitos

**Propósito:** documentar el flujo más regulado del sistema: cómo una organización avanza por los hitos de constitución (Preconstitución) y formalización posterior. Es la referencia humana; la fuente de verdad del catálogo es el seed `getSeedCatalogoHitosAvance_()` en `go-pes-local/ZZ_AvancePhase2.js` (hoja `CAT_Hitos_Avance`). Para operar el módulo al programar, usa la skill `go-pes-avance`.

---

## Modelo

- **Tramos** (`GO_PES_V2.AVANCE.TRAMOS`): `Preconstitución` → `Formalización posterior`.
- **Estados del caso** (`GO_PES_V2.AVANCE.ESTADOS`): `Activo`, `Stand by`, `Detenido`, `Finalizado`. El estado vigente es el **último registro** de `FACT_Avance_Estado`.
- **Hitos** (`CAT_Hitos_Avance`): 15 hitos con `codigo_hito`, `orden_hito`, `nombre_hito`, `codigo_hito_previo` y `permite_saltar`.
- **Hechos** (`FACT_AVANCE_HITOS`): un registro por hito cumplido (`codigo_hito`, fecha, `usuario_registro`; `numero_ingreso` en PRE_02).

> **El `orden_hito` no es correlativo con el código** (FOR_07 es orden 12; FOR_05 es orden 15). El código es identidad; el orden es la secuencia. Referencia siempre por `codigo_hito`, nunca por posición.

## Catálogo de hitos

### Tramo 1 — Preconstitución
| Código | Orden | Nombre | Previo | Saltable |
|--------|-------|--------|--------|----------|
| `PRE_01` | 1 | Reunión informativa realizada | — | no |
| `PRE_02` | 2 | Carta por oficina de partes | `PRE_01` | no |
| `PRE_03` | 3 | Fecha asignada | `PRE_02` | no |
| `PRE_04` | 4 | Asamblea constitutiva realizada | `PRE_03` | no |
| `PRE_05` | 5 | Documentación ingresada a constitución | `PRE_04` | no |
| `PRE_06` | 6 | Observaciones subsanadas | `PRE_05` | **sí** |
| `PRE_07` | 7 | Certificado provisorio obtenido | `PRE_05` | **sí** |

### Tramo 2 — Formalización posterior
| Código | Orden | Nombre | Previo | Saltable |
|--------|-------|--------|--------|----------|
| `FOR_01` | 8 | Ingreso comisión electoral | `PRE_07` | no |
| `FOR_02` | 9 | Asamblea de ratificación | `FOR_01` | no |
| `FOR_03` | 10 | Documentación ingresada a ratificación | `FOR_02` | no |
| `FOR_04` | 11 | Certificado definitivo obtenido | `FOR_03` | no |
| `FOR_07` | 12 | Obtención de RUT | `FOR_04` | **sí** |
| `FOR_06` | 13 | Registro de colaboradores del Estado (RCCE) | `FOR_04` | **sí** |
| `FOR_08` | 14 | Cuenta bancaria habilitada | `FOR_04` | **sí** |
| `FOR_05` | 15 | Registro municipal habilitado (RMRFP) | `FOR_04` | **sí** |

## Hitos bisagra
- `PRE_04` — Asamblea constitutiva: nace formalmente el expediente.
- `PRE_07` — **Certificado provisorio**: la organización obtiene personalidad jurídica; cierra Preconstitución y habilita `FOR_01`.
- `FOR_04` — **Certificado definitivo** (válido 3 años): habilita las 4 ramas administrativas paralelas (RUT, RCCE, cuenta bancaria, RMRFP), que cuelgan todas de él.

## Reglas
- No marcar un hito si su `codigo_hito_previo` no está cumplido, salvo que el previo tenga `permite_saltar: true` (PRE_06/PRE_07 y las ramas FOR_05/06/07/08).
- El catálogo se cambia editando el seed y re-sembrando (`goPesSembrarCatalogoAvanceFase2_`, superuser), no hardcodeando en el frontend.
- La persistencia tiene **dos caminos**: organización (`organizacion_id`) y grupo de vecinos (`solicitud_id`).

## Dónde vive en el código
- Backend: `ZZ_AvanceBackend.js` (`registrarHitoAvance`, `getAvanceGrupoVecinos`, `actualizarFechasHitos`), `ZZ_AvancePhase1.js` (definiciones de hoja), `ZZ_AvancePhase2.js` (seed).
- Frontend: `Scripts_Avance.html` (`renderAvanceTimeline_`, `registrarHitoAvanceUi_`).
- Plazos entre hitos: ver [`alertas.md`](alertas.md).
