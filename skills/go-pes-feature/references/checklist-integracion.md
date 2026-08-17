# Checklist de integración + plantilla de entregables

## Checklist antes de marcar completado
- [ ] Cada función pública nueva es accesible desde `google.script.run` sin error.
- [ ] Cada función pública valida rol en su primera línea (`requireRole_` / `requireModuleAccess_`).
- [ ] Ninguna función pública fue renombrada/eliminada sin verificar por grep que nadie la llame.
- [ ] Los retornos al cliente pasan por `serializeForClient_`.
- [ ] El módulo respeta el rol del usuario (un rol menor no ve lo que no debe).
- [ ] El render es asíncrono: skeleton/spinner mientras carga; no bloquea el resto de la vista.
- [ ] Estado vacío elegante cuando no hay datos.
- [ ] El cache se invalida al guardar/modificar datos.
- [ ] Verificado en **modo claro y oscuro**.
- [ ] CSS nuevo **solo agregado al final** de `Styles.html`/`ThemeDark.html` (nada existente modificado ni eliminado); sin CSS inline.
- [ ] Sin librerías externas nuevas (o excepción preaprobada, cargada solo dentro del módulo).
- [ ] Suite `goPesTest<Modulo>_()` agregada y registrada en `goPesRunAllTests()`.
- [ ] `goPesRunAllTests()` en 0 fallos.
- [ ] Sin errores en `clasp logs --watch` durante navegación normal.

## Plantilla "Resumen de archivos a modificar"

| Archivo | Cambio |
|---------|--------|
| `Main.js` | Agregar `GO_PES_V2.<SECCION>` / hoja en `SHEETS` |
| `<Modulo>.js` | **Crear nuevo** — lógica backend |
| `Scripts_<Modulo>.html` | `render<Modulo>()` + integración en el dispatcher |
| `Styles.html` / `ThemeDark.html` | CSS del módulo (bloque agregado al final, clases con prefijo propio) |
| `Audith.js` | Suite `goPesTest<Modulo>_()` |

**Solo AGREGAR al final, nunca modificar lo existente:** `Styles.html`, `ThemeDark.html`.
**No tocar sin aprobación explícita:** `appsscript.json`.

## Plantilla de reporte final
1. Hallazgos de Fase 1 (qué había / qué faltaba).
2. Archivos modificados + diff resumido + por qué.
3. Confirmación de que en `Styles.html`/`ThemeDark.html` solo se agregó el bloque nuevo al final.
4. Cómo probar en DEV.
5. Comando de deploy: `.\push-dev.ps1` → verificar → `.\push-prod.ps1`.
