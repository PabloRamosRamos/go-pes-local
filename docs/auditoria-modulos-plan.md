# Plan de auditoría por módulo (con skills)

**Propósito:** revisar cada módulo de GO-PES v2 con las skills `go-pes-*` como lentes, aplicar ajustes seguros y verificar en DEV. Documento **vivo**: se marca el estado por módulo; al terminar todas las olas se mueve a `archive/`.

**Inicio:** 2026-08 · **Método:** por módulo → Fase 1 lectura (8 lentes) → fixes seguros (lo ambiguo se reporta) → `push-dev` → commit → verificación DEV (tests 0 fallos + visual claro/oscuro). **Cadencia:** 1 módulo por tanda.

---

## Lentes por módulo
`estructura` · `seguridad` (guards en públicas) · `higiene` (duplicados / código muerto) · `loaders` (uso correcto, nunca fullscreen) · `a11y` (teclado/ARIA) · `colores` (hex/dark) · `mensajes` (texto al usuario) · `performance`+`ui-rapida` (round-trips, cache, render). Módulo-específicas: `avance` (Avance), `beneficios` (Beneficios).

## Checklist de auditoría (por módulo)
- **Seguridad:** ¿toda pública que escribe tiene guard `requireRole_`/`requireModuleAccess_`? ¿alguna pública sin `_` que debería ser privada?
- **Higiene:** ¿funciones duplicadas (namespace global)? ¿código muerto / `*Legacy`? ¿CSS huérfano?
- **Loaders:** ¿usa `showModuleLoading`/`showModalLoading`? ¿nada fullscreen ni `alert()`?
- **A11y:** ¿controles nativos (`<button>`)? ¿modales vía `A11Y.openModal`? ¿ARIA de estados?
- **Colores:** ¿hex inline pelado que rompe dark? ¿mapea a token theme-aware exacto/misma-familia?
- **Mensajes:** ¿`alert()` nativo? ¿fuga técnica (tabla/campo/JSON/F12)? → `showError`.
- **Performance/UI:** ¿round-trips innecesarios? ¿`GO_PES_RUNTIME` como cache persistente? ¿loader acotado inmediato?
- **Estructura:** ¿sigue el molde (render`<Modulo>`View_, `api()`, secciones)? ¿nombres consistentes con módulos hermanos?

## Secuenciación (olas)
| Ola | Módulos | Estado |
|-----|---------|--------|
| 1 — validar proceso (chicos) | Ficha · Nuevo Ingreso · Calendario | ✅ completa |
| 2 — core diario | Inicio/Dashboard · Socios · Organizaciones | ⏳ |
| 3 — grandes/complejos | Avance · Beneficios · Admin (Usuarios+Config) | ⏳ |
| 4 — transversal + cierre | Buscar/Historial · Infra (Auth/Repository/Styles/Loading/A11y) | ⏳ |

## Seguimiento por módulo
| Módulo | Archivos | Estado | Build DEV | Notas |
|--------|----------|--------|-----------|-------|
| Ficha | `Scripts_Ficha.html`, `Services.js` (obtenerFicha, editarDatosVecino, recalcularFicha, guardarSeguimiento) | ✅ | (ver commit) | Front limpio. Fix perf D4: guard/validación **antes** del lock en `editarDatosVecino` y `guardarSeguimiento`; guard como 1ª línea en `obtenerFicha`. Notado (no forzado): `renderFicha` no sigue `render<Modulo>View_`; save inline usa botón-loader en vez de `showModalLoading`. |
| Nuevo Ingreso | `Scripts_NuevoIngreso.html`, `NuevoIngreso.js`, `Services.js` (guardarIngreso) | ✅ | (ver commit) | Front limpio (`renderNuevoIngresoView_` sigue molde, loaders/showError OK). Higiene: eliminado código muerto en `NuevoIngreso.js` (`normalizar/validarNuevoIngresoPayload_` sin llamadores). Perf D4: guard antes del lock en `guardarIngreso`. |
| Calendario | `Scripts_Calendario.html`, `Calendario.html`, `ZZ_CalendarioBackend.js` | ✅ | (sin cambios) | **Limpio, sin fixes.** Backend con guard 1ª línea; `_calShowLoading` es el step-loader del diálogo (válido); a11y (`<a>`→`<button>`) ya resuelto en auditoría previa. Cosmético no forzado: nombres `_cal*` mezclan prefijo/sufijo `_`. |
| Inicio/Dashboard | `Scripts_Inicio.html`, `Inicio.html`, `Dashboard.js` | ⏳ | — | — |
| Socios | `Scripts_Socios.html`, `ZZ_SociosBackend.js`, `ZZ_FormSociosIntegration.js` | ⏳ | — | — |
| Organizaciones | `Scripts_Organizaciones.html`, `ZZ_OrganizacionesBackend.js` | ⏳ | — | — |
| Avance | `Scripts_Avance.html`, `ZZ_AvanceBackend/Phase1/Phase2.js` | ⏳ | — | (parcial: colores hechos) |
| Beneficios | `Scripts_Beneficios.html`, `ZZ_BeneficiosBackend.js` | ⏳ | — | (parcial: colores Lote B) |
| Admin (Usuarios+Config) | `Scripts_Admin.html`, `Auth.js`, `SystemConfig.js` | ⏳ | — | — |
| Buscar/Historial | `Services.js` (buscar*, listarHistorial), `Scripts.html` | ⏳ | — | — |
| Infra transversal | `Auth.js`, `Repository*.js`, `Styles.html`, `ThemeDark.html`, `Loading.html`, `Scripts_A11y.html`, `Scripts.html` | ⏳ | — | — |

## Reglas
- PROD tiene datos reales: nada a ciegas; la verificación visual claro/oscuro es del usuario.
- Colores/estructura: solo equivalentes seguros; lo ambiguo se reporta, no se fuerza.
- 1 commit por módulo ("Auditoría módulo X"); `push-dev` lo corre Claude, `push-prod` el usuario.
