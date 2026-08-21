# Alertas operativas

**Propósito:** documentar el sistema de alertas que avisa cuando un caso lleva demasiado tiempo entre hitos o supera un plazo tras un certificado. Fuente de verdad: `GO_PES_V2.ALERTAS` (`Main.js`) + `Alertas.js`. Se muestran en el dashboard de Inicio.

---

## Modelo

- **Áreas** (`GO_PES_V2.ALERTAS.AREAS`): `formalizacion` (plazos entre hitos PRE_*) y `beneficios` (plazos post-certificado).
- **Tipos / severidad** (`GO_PES_V2.ALERTAS.TIPOS`): `danger`, `warning`, `info`.
- **Cache** (`GO_PES_V2.ALERTAS.CACHE_TTL_MS`): 5 min, en `CacheService.getUserCache()` (`invalidateAlertasCache_`).
- **Configuración persistida:** sección `alertas_operativas` en `CFG_Parametros` (los umbrales son editables desde Configuración; los defaults están en `getDefaultAlertasConfig_()`).

## Umbrales por defecto (`getDefaultAlertasConfig_` en `Alertas.js`)

| Clave | Días | Regla |
|-------|------|-------|
| `form_hito4a5_dias` | 14 | Entre asamblea constitutiva y documentación ingresada |
| `form_hito5a9_dias` | 60 | Entre documentación de constitución y ratificación |
| `form_hito8antes9_dias` | 15 | Antes de la asamblea de ratificación |
| `form_hito7despues5_dias` | 10 | Certificado provisorio tras documentación |
| `form_hito11despues10_dias` | 30 | Certificado definitivo tras documentación de ratificación |
| `ben_camaras_post_cert_dias` | 5 | Beneficio CÁMARAS tras certificado definitivo |
| `ben_fondese_cierre_conv_dias` | 10 | FONDESE en armado con la convocatoria por cerrar (Ventana 1) |
| `ben_fondese_rendicion_dias` | 15 | FONDESE adjudicado con la rendición por vencer (Ventana 2) |

Los IDs de alerta (`GO_PES_V2.ALERTAS.ALERTAS_IDS`): `form_hito4a5`, `form_hito5a9`, `form_hito8antes9`, `form_hito7post5`, `form_hito11post10`, `ben_camaras_post_cert`, `ben_fondese_cierre_conv`, `ben_fondese_rendicion`.

**Alertas FONDESE (dos ventanas de responsabilidad PES).** El equipo acompaña **antes de ingresar** la postulación y **después de adjudicar** (ejecución/rendición); en el medio (evaluación municipal) no hay alertas. `evaluarBenFondeseCierreConv_` (WARNING) marca las orgs en estado `en_armado` con la convocatoria a ≤ umbral días del cierre (o cerrada) sin ingresar. `evaluarBenFondeseRendicion_` (DANGER) marca las orgs adjudicadas en `en_ejecucion`/`en_rendicion` con `fecha_cierre_rendicion` a ≤ umbral días (o vencida) y rendición sin aprobar.

## Regla crítica (bug histórico)
Las evaluaciones de plazo filtran los hechos por **`codigo_hito`** (ej. `PRE_04`), **nunca** por `hito_key` (campo inexistente). Un filtro por un campo que no existe devuelve `[]` en silencio y **las alertas nunca disparan** — eso ocurrió en PROD. Al tocar alertas, valida contra el `codigo_hito` real del catálogo (ver [`avance-hitos.md`](avance-hitos.md)) y prueba con datos reales al desplegar.

## Dónde vive en el código
- Reglas y evaluación: `Alertas.js` (`getDefaultAlertasConfig_`, `getAlertasConfig_`, evaluaciones de formalización y beneficios).
- Constantes: `GO_PES_V2.ALERTAS` (`Main.js`).
- Entrega al cliente: dentro del bootstrap de Inicio (`getInicioBootstrapData`) y `getAlertasUsuario`.
- Tests: suite `goPesTestAlertas_()` en `Audith.js`.
