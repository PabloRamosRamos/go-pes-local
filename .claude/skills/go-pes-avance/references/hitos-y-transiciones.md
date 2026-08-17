# Catálogo de hitos y transiciones — módulo Avance

Fuente de verdad: `getSeedCatalogoHitosAvance_()` en `ZZ_AvancePhase2.js` (hoja `CAT_Hitos_Avance`). Esta tabla es un espejo verificado; ante cualquier duda, relee el seed (puede cambiar).

## Tramo 1 — Preconstitución

| Código | Orden | Nombre | Previo | ¿Saltable? |
|--------|-------|--------|--------|------------|
| `PRE_01` | 1 | Reunión informativa realizada | — | no |
| `PRE_02` | 2 | Carta por oficina de partes | `PRE_01` | no |
| `PRE_03` | 3 | Fecha asignada | `PRE_02` | no |
| `PRE_04` | 4 | Asamblea constitutiva realizada | `PRE_03` | no |
| `PRE_05` | 5 | Documentación ingresada a constitución | `PRE_04` | no |
| `PRE_06` | 6 | Observaciones subsanadas | `PRE_05` | **sí** |
| `PRE_07` | 7 | Certificado provisorio obtenido | `PRE_05` | **sí** |

`PRE_06` y `PRE_07` cuelgan **ambos de `PRE_05`** (las observaciones son opcionales). `PRE_07` cierra el tramo y habilita `FOR_01`.

## Tramo 2 — Formalización posterior

| Código | Orden | Nombre | Previo | ¿Saltable? |
|--------|-------|--------|--------|------------|
| `FOR_01` | 8 | Ingreso comisión electoral | `PRE_07` | no |
| `FOR_02` | 9 | Asamblea de ratificación | `FOR_01` | no |
| `FOR_03` | 10 | Documentación ingresada a ratificación | `FOR_02` | no |
| `FOR_04` | 11 | Certificado definitivo obtenido | `FOR_03` | no |
| `FOR_07` | 12 | Obtención de RUT | `FOR_04` | **sí** |
| `FOR_06` | 13 | Registro de colaboradores del Estado (RCCE) | `FOR_04` | **sí** |
| `FOR_08` | 14 | Cuenta bancaria habilitada | `FOR_04` | **sí** |
| `FOR_05` | 15 | Registro municipal habilitado (RMRFP) | `FOR_04` | **sí** |

## Notas de la máquina de estados
- **El código no es correlativo con el orden.** `FOR_05/06/07/08` tienen órdenes 12–15 pero todos dependen de `FOR_04`: son **ramas paralelas** administrativas post-certificado definitivo, no una cadena lineal. Ordena/visualiza por `orden_hito`; identifica por `codigo_hito`.
- **Hitos hitos-bisagra:** `PRE_04` (nace el expediente), `PRE_07` (personalidad jurídica; puente a Formalización), `FOR_04` (certificado definitivo; abre las 4 ramas finales).
- **Prerequisitos:** no marcar un hito si su `codigo_hito_previo` no está cumplido, salvo que el previo tenga `permite_saltar: true`.

## Plazos / alertas (referencia cruzada)
`GO_PES_V2.ALERTAS.HITOS` expone `PRE_04, PRE_05, PRE_07, PRE_08, PRE_09, PRE_10, PRE_11` para las reglas de plazo; los umbrales (`form_hito4a5_dias`, `form_hito5a9_dias`, `form_hito8antes9_dias`, `form_hito7post5_dias`, `form_hito11post10_dias`, `ben_camaras_post_cert_dias`) viven en `Alertas.js` (`getDefaultAlertasConfig_`). Las evaluaciones filtran por `codigo_hito`. (Nota: los IDs de alerta usan numeración histórica que no siempre calza 1:1 con los códigos actuales del catálogo — valida contra el código real al tocar alertas.)
