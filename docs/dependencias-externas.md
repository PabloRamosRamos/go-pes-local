# Dependencias externas

**Propósito:** inventario de servicios/artefactos externos de los que depende GO-PES v2, su rol, dónde se configuran y qué pasa si fallan. El proyecto es deliberadamente autocontenido (sin npm en runtime, sin backend externo), así que la lista es corta.

---

## Plataforma (Google)
| Servicio | Rol | Si falla |
|----------|-----|----------|
| **Google Apps Script (V8)** | Runtime del backend + hosting de la Web App | La app no corre; ver estado en el editor de Apps Script |
| **Google Sheets** | Base de datos (hojas = tablas) | Lecturas/escrituras fallan; datos intactos |
| **Google OAuth** | Autenticación (sesión del usuario Google) | Login falla; el acceso interno se resuelve por `DIM_Usuarios` |
| **Drive / PropertiesService / CacheService / LockService** | Assets, config persistente (PINs, IDs, secuencias), cache, locks | Degradación según el servicio; cache se recalcula, locks serializan |

Estas son intrínsecas a Apps Script — no hay alternativa ni fallback local.

## Recursos de terceros (frontend)
| Recurso | URL | Rol | Si falla |
|---------|-----|-----|----------|
| **Google Fonts** | `fonts.googleapis.com` / `fonts.gstatic.com` | Tipografía **Inter** + iconos **Material Symbols** | La UI cae a fuentes/íconos del sistema; funcional pero con estética degradada |

> No hay otras librerías externas cargadas (sin CDN de JS, sin bundler). Si en el futuro se agrega una (mapas, charts), va **cargada lazy solo dentro del módulo** que la usa (regla del proyecto) y se documenta aquí.

## Integraciones opcionales
| Integración | Dónde | Rol |
|-------------|-------|-----|
| **Google Form — registro de socios** | `ZZ_FormSociosIntegration.js` (`generarLinkFormSocios`, `importarRespuestasFormSocios`) | Link prellenado del formulario por grupo + importación de respuestas al módulo Socios |

## Herramientas de desarrollo (no runtime)
- **clasp** (CLI de Apps Script): deploy DEV/PROD (`push-dev.ps1` / `push-prod.ps1`). No es dependencia de la app en ejecución.

## Regla al agregar una dependencia
No se agregan librerías/APIs/servicios externos sin aprobación explícita (regla del proyecto). Al hacerlo: documentar aquí (rol, URL, config, fallback) y, si es OAuth-scope nuevo, actualizar `seguridad.md`.
