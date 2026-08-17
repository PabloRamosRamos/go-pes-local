# API interna — funciones públicas (cliente ↔ backend)

**Propósito:** inventario de las funciones **públicas** del backend (sin sufijo `_`), automáticamente accesibles desde `google.script.run` (el cliente las llama vía el wrapper `window.api(fn, payload)`). Es la referencia viva: al agregar/renombrar/eliminar una función pública, actualiza este doc en el mismo commit (ver `mantener-docs.md`).

**Fuente de verdad:** los `.js` en `go-pes-local/`. Toda función pública valida rol en su primera línea (`requireRole_` / `requireModuleAccess_`, ver `seguridad.md`) y retorna vía `serializeForClient_`.

> Verificación rápida de sincronía:
> ```bash
> grep -rEc '^function [A-Za-z][A-Za-z0-9]*\(' go-pes-local/*.js   # públicas por archivo
> ```

---

## Bootstrap y app (`Main.js`)
| Función | Qué hace |
|---------|----------|
| `doGet(e)` | Entry point de la Web App; construye el bootstrap y sirve `Index.html` |
| `include(filename)` | Incrusta parciales HTML en el template |
| `onOpen()` | Menú GO-PES v2 en el spreadsheet |
| `getAppBootstrap()` | Bootstrap para el cliente (usuario, permisos, config) |
| `setupMotorOperativoPES()` | Crea hojas + siembra catálogos (menú) |
| `reconstruirEstructurasDesdeRaw()` · `refrescarCatalogosSugeridos()` | Reconstrucción de estructuras/catálogos (menú) |
| `goPesSeedSuperUsers()` | Inicializa el superusuario (protegida) |

## Auth y usuarios (`Auth.js`)
| Función | Rol | Qué hace |
|---------|-----|----------|
| `getUsuarioActual()` | — | Usuario en sesión (perfil, permisos) |
| `listUsers()` · `updateUser()` · `deactivateUser()` | superuser | Gestión de usuarios (deactivate usa PIN `user_deactivate`) |
| `getUserPreferences()` · `setUserPreference()` | usuario | Preferencias por usuario |
| `goPesLogAppOpened(params)` | — | Log de apertura diferido post-render |
| `getSystemInfo()` | — | Versión/entorno |

## Config del sistema (`SystemConfig.js`)
| Función | Rol | Qué hace |
|---------|-----|----------|
| `getSystemConfigClient()` | — | Config efectiva para el cliente (branding, módulos) |
| `saveSystemConfigSection(section, data)` | superuser | Guarda una sección de config (ver `branding-configuracion.md`) |

## Seguridad — PINs (`SecurityPins.js`)
| Función | Qué hace |
|---------|----------|
| `goPesConfigurePinDeSeguridad(context, pin)` | Configura un PIN por contexto (`admin_reset`/`user_deactivate`/`evento_abierto`) |
| `goPesIsPinConfigured(context)` · `goPesResetPinRateLimit(context, email)` | Estado / reset de rate limit |

## Inicio y dashboard (`Dashboard.js`, `Services.js`, `Alertas.js`)
| Función | Rol | Qué hace |
|---------|-----|----------|
| `getInicioBootstrapData()` | inicio | **Endpoint compuesto** de arranque: dashboard + panel + alertas |
| `getDashboardData(filtros)` · `getDashboardKpis()` | inicio | KPIs del dashboard |
| `getInicioPanelData()` | inicio | Panel de inicio |
| `getAlertasUsuario()` | — | Alertas operativas del usuario (ver `alertas.md`) |
| `getAlertasConfigAdmin()` · `saveAlertasConfigAdmin(cfg)` | superuser | Umbrales de alertas |

## Búsqueda y ficha (`Services.js`, `NuevoIngreso.js`, `Validators.js`)
| Función | Rol | Qué hace |
|---------|-----|----------|
| `buscarVecino(q)` · `buscarSolicitud(q)` · `buscarOrganizacion(q)` · `getBuscarModuleData()` | operador | Búsquedas |
| `obtenerFicha(payload)` | operador | Ficha de un vecino/caso (+ historial) |
| `editarDatosVecino(payload)` · `recalcularFicha(payload)` | operador/coordinador | Edición / rebuild de ficha |
| `guardarIngreso(payload)` · `guardarNuevoIngreso(payload)` · `getCatalogosNuevoIngreso()` | operador | Nuevo ingreso |
| `guardarSeguimiento(payload)` | operador | Gestión de seguimiento |
| `buscarCoincidenciasIngreso(payload)` | operador | Detección de duplicados al ingresar |
| `listarHistorial()` · `getHistorialUsuariosLista()` | superuser | Historial/auditoría |

## Avance / hitos (`ZZ_AvanceBackend.js`)
Ver también `avance-hitos.md`.
| Función | Qué hace |
|---------|----------|
| `getAvanceOrganizacion(payload)` · `getAvanceGrupoVecinos(payload)` | Datos de avance (org / grupo de vecinos) |
| `getTimelineAvance(payload)` · `getBotonesAvanceEstado(payload)` | Timeline y acciones disponibles |
| `registrarHitoAvance(payload)` | Registra un hito cumplido (dos caminos: org / grupo) |
| `cambiarEstadoAvance(payload)` · `actualizarFechasHitos(payload)` | Cambia estado / edita fechas de hitos |
| `getCatalogosAvanceClient()` · `getOrganizacionesAvanceClient()` · `getGruposVecinosAvanceClient()` | Catálogos y listados |

## Organizaciones (`ZZ_OrganizacionesBackend.js`)
| Función | Qué hace |
|---------|----------|
| `getOrganizacionesConGruposClient()` | Vista unificada orgs + grupos de vecinos (`tipo`) |
| `getOrganizacionesModuloClient()` · `getOrganizacionModuloDetalle(id)` | Listado / detalle |
| `suspenderOrganizacion(payload)` · `eliminarOrganizacion(payload)` | Estado de la organización |

## Socios (`ZZ_SociosBackend.js`, `ZZ_FormSociosIntegration.js`)
| Función | Qué hace |
|---------|----------|
| `getSociosModuloClient()` · `importarSocios(payload)` | Listado / carga masiva |
| `actualizarCargoSocioOrganizacion(payload)` · `editarDatosSocio(payload)` | Edición |
| `generarLinkFormSocios()` · `actualizarConfigFormSocios()` · `importarRespuestasFormSocios()` | Integración Google Form |

## Beneficios / instrumentos (`ZZ_BeneficiosBackend.js`)
| Función | Qué hace |
|---------|----------|
| `getBeneficiosModuloPanel()` | Panel del módulo |
| `guardarConfiguracionCamaras1414()` · `guardarCamaras1414Organizacion()` | CÁMARAS 1414 |
| `goPesGetFondese*` / `goPesUpsertFondese*` | FONDESE (ediciones por año — ver esquema evolutivo en `modelo-datos.md`) |
| `goPesGetFormEventos` / `goPesUpsertFormEvento` / `goPesGetFormInscripciones` / … | Eventos de formación + inscripciones (algunas usan PIN `evento_abierto`) |

## Calendario (`ZZ_CalendarioBackend.js`)
| Función | Qué hace |
|---------|----------|
| `getCalendarioEventos(payload)` | Eventos + cruce con hitos ya ingresados |
| `registrarEventoCalendario(payload)` | Marca un evento como procesado |

## Administración y datos (`ZZ_AdminDataReset.js`, `ZZ_*Duplicados.js`, `DerivedBuilders.js`)
| Función | Qué hace |
|---------|----------|
| `getAdminDataResetPlan()` · `limpiarDatosPruebaAdmin(payload)` | Limpieza de datos de prueba (PIN `admin_reset`) |
| `goPesBackfillHitoPRE01()` (`ZZ_AvanceBackend.js`) | Backfill del hito inicial (ver `deploy.md`) |
| `goPesVerificarTodosDuplicados()` · `goPesAnalizarCasosDuplicados()` · `goPesLimpiarCasosDuplicados()` | Verificación/limpieza de duplicados |
| `goPesRefrescarVistasYMaster()` | Reconstruye vistas derivadas y master |

## Diagnóstico (`Diagnostics.js`, `Audith.js`)
`enableDiagnostics()` / `disableDiagnostics()` / `getDiagnosticsStatus()` (Services.js, **superuser**; delegan en helpers privados `goPes*Diagnostics_` de Diagnostics.js); `goPesRunAllTests()` (ver `testing.md`). Las funciones `debug*` de `Audith.js`/`Main.js` son utilidades manuales de desarrollo (guardadas con `requireRole_(['superuser'])` las que escriben), no API de producción.

---

## Plantilla para documentar una función (formato estándar)

```markdown
#### `nombreFuncion(payload)`
**Módulo:** `nombre-modulo` · **Roles:** `operador`, `coordinador`, `superuser`
**Descripción:** Qué hace en 1 línea.
**Payload:** `campo1` (string, requerido) — descripción · `campo2` (number, opcional) — …
**Respuesta:** `{ ok: true, data: { ... } }`
**Hojas:** Lectura `MAE_CASOS` · Escritura `FACT_AVANCE_HITOS`
**Side effects:** invalida cache X; reconstruye Y.
```
