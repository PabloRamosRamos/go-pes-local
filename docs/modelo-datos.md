# Modelo de Datos — GO-PES v2

**Propósito:** Documentación completa del esquema de datos, relaciones entre tablas, pipeline RAW→MAE/FACT y reglas de negocio del modelo.

**Audiencia:** Desarrolladores, arquitectos de datos, operadores avanzados que necesitan entender la estructura subyacente.

---

## Tabla de contenidos

- [Arquitectura del modelo](#arquitectura-del-modelo)
- [Pipeline de datos](#pipeline-de-datos)
- [Capas del modelo](#capas-del-modelo)
- [Inventario de hojas](#inventario-de-hojas)
- [Relaciones entre tablas](#relaciones-entre-tablas)
- [Reglas de negocio del modelo](#reglas-de-negocio-del-modelo)

---

## Arquitectura del modelo

GO-PES usa Google Sheets como base de datos con una arquitectura de capas inspirada en Data Warehouse:

```
┌─────────────────────────────────────────────────────���───┐
│                    FRONTEND (UI)                        │
│          Vanilla JS consume funciones backend           │
└─────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Apps Script)                  │
│   Services.js, ZZ_*Backend.js, Repository.js, etc.     │
└─────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE (Google Spreadsheet)              │
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────┐  ┌──────────┐   │
│  │   RAW   │  │ MAE/FACT │  │ DIM  │  │ VW / LOG │   │
│  │ Entrada │→ │ Maestros │→ │Catá- │→ │Vistas    │   │
│  │  cruda  │  │ + Hechos │  │logos │  │derivadas │   │
│  └─────────┘  └──────────┘  └──────┘  └──────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Capas:**
- **RAW:** Datos crudos de entrada (formularios, importaciones)
- **MAE (Maestros):** Entidades principales (casos, organizaciones)
- **FACT (Hechos):** Eventos, transacciones, relaciones N:M
- **DIM (Dimensiones):** Catálogos, configuraciones, usuarios
- **VW (Vistas):** Vistas materializadas pre-calculadas
- **CFG (Configuración):** Parámetros del sistema
- **LOG (Logs):** Auditoría y trazabilidad

---

## Pipeline de datos

### Flujo típico de ingreso de un vecino

```
1. ENTRADA (RAW_Formulario_Ingreso)
   ↓ guardarNuevoIngreso()
   
2. MAESTRO (MAE_Casos)
   ↓ refreshPartialArtifacts_()
   
3. VISTAS DERIVADAS
   ├─ MASTER_DATOS (ficha completa)
   ├─ VW_LS_Territorial (agregado por UV/sector)
   └─ DIM_Vecinos_Sugeridos (autocomplete)
   
4. CONSUMO (Frontend)
   └─ buscarVecino(), obtenerFicha()
```

### Flujo de creación de organización

```
1. ENTRADA MANUAL (organizacion_id via nextId_)
   ↓ guardarOrganizacion()
   
2. MAESTRO (MAE_Organizaciones)
   ↓ registrarHitoAvance() al crear
   
3. HECHOS ASOCIADOS
   ├─ FACT_Avance_Hitos (hito creación)
   ├─ FACT_Avance_Estado (estado inicial "Activo")
   └─ VW_Avance_Organizacion (vista materializada)
   
4. VISTAS DERIVADAS
   ├─ VW_LS_Organizaciones
   ├─ MASTER_DATOS (si tiene solicitud_id)
   └─ DIM_Organizaciones_Sugeridas
```

### Pipeline completo RAW → FACT

```
RAW_*
  ↓ reconstruirEstructurasDesdeRaw_()
  ├─ MAE_Casos
  ├─ MAE_Organizaciones
  ├─ FACT_Hitos
  ├─ FACT_Instrumentos
  ├─ FACT_Requisitos
  └─ FACT_Socios
    ↓ refreshDerivedArtifacts_()
    ├─ MASTER_DATOS
    ├─ VW_LS_Organizaciones
    ├─ VW_LS_Instrumentos
    ├─ VW_LS_Territorial
    ├─ DIM_*_Sugeridas
    └─ VW_Avance_Organizacion
```

---

## Capas del modelo

### RAW (Datos crudos)

Hojas de entrada sin procesamiento. Cada fila representa un evento o formulario.

| Hoja | Productor | Consumidor | Descripción |
|------|-----------|------------|-------------|
| `RAW_Formulario_Ingreso` | Formulario Google Forms + `guardarNuevoIngreso()` | `reconstruirEstructurasDesdeRaw_()` | Ingresos de vecinos/solicitudes |
| `RAW_Gestion_Casos` | `guardarSeguimiento()` | `reconstruirEstructurasDesdeRaw_()` | Historial de gestiones |
| `RAW_Organizaciones` | `guardarOrganizacion()` | `reconstruirEstructurasDesdeRaw_()` | Alta/modificación de organizaciones |
| `RAW_Instrumentos` | `guardarInstrumento()` | `reconstruirEstructurasDesdeRaw_()` | Instrumentos y beneficios |
| `RAW_Requisitos_Instrumento` | `guardarRequisito()` | `reconstruirEstructurasDesdeRaw_()` | Requisitos de instrumentos |
| `RAW_Socios` | Migración + `guardarSocio()` | `reconstruirEstructurasDesdeRaw_()` | Socios de organizaciones |

**Características:**
- Append-only (no se borran registros)
- Tienen `created_at`, `source`, `user_email`, `legacy_source`, `legacy_key`
- Son la fuente de verdad para auditoría

### MAE (Maestros)

Entidades principales del dominio. Estado actual consolidado.

| Hoja | PK | FK Lógicas | Descripción |
|------|----|-----------|----|
| `MAE_Casos` | `solicitud_id` | `organizacion_id` → MAE_Organizaciones | Vecinos/solicitudes (1 por vecino) |
| `MAE_Organizaciones` | `organizacion_id` | `solicitud_id` → MAE_Casos | Organizaciones comunitarias |

**Esquema MAE_Casos:**

| Campo | Tipo | PK | FK | Req | Descripción |
|-------|------|----|----|-----|-------------|
| `solicitud_id` | string | ✓ | | ✓ | ID único (SOL-XXXXXX) |
| `vecino_id` | string | | | ✓ | ID del vecino (VEC-XXXXXX) |
| `nombre_vecino` | string | | | ✓ | Nombre del vecino |
| `apellido_vecino` | string | | | ✓ | Apellido del vecino |
| `nombre_completo` | string | | | ✓ | Nombre + Apellido (derivado) |
| `rut_vecino` | string | | | | RUT del vecino |
| `telefono_contacto` | string | | | | Teléfono |
| `correo_contacto` | string | | | | Email |
| `direccion_original` | string | | | | Direcci��n |
| `uv` | string | | DIM_Territorio | | Unidad Vecinal |
| `sector` | string | | DIM_Territorio | | Sector territorial |
| `tipo_vivienda` | string | | | | Tipo de vivienda |
| `requerimiento_inicial` | string | | | | Motivo del contacto |
| `medio_solicitud` | string | | DIM_Origen_Canal | | Medio de ingreso |
| `unidad_origen` | string | | DIM_Origen_Canal | | Unidad municipal origen |
| `fecha_ingreso` | date | | | ✓ | Fecha de registro |
| `estado_actual` | string | | DIM_Estados | | Estado del caso |
| `etapa_actual` | string | | DIM_Etapas | | Etapa del proceso |
| `organizacion_id` | string | | MAE_Organizaciones | | FK a organización (opcional) |
| `ultima_gestion` | date | | | | Última acción registrada |
| `proximo_hito` | string | | | | Próxima acción sugerida |
| `responsable_actual` | string | | DIM_Responsables | | Responsable asignado |
| `observacion_resumen` | string | | | | Notas generales |
| `updated_at` | datetime | | | ✓ | Timestamp última actualización |

**Esquema MAE_Organizaciones:**

| Campo | Tipo | PK | FK | Req | Descripción |
|-------|------|----|----|-----|-------------|
| `organizacion_id` | string | ✓ | | ✓ | ID único (ORG-XXXXXX) |
| `solicitud_id` | string | | MAE_Casos | | FK a caso origen (opcional) |
| `tipo_organizacion` | string | | | ✓ | Junta vecinos, comité, grupo, etc. |
| `nombre_organizacion` | string | | | ✓ | Nombre de la organización |
| `uv` | string | | DIM_Territorio | | Unidad Vecinal |
| `sector` | string | | DIM_Territorio | | Sector territorial |
| `direccion_referencia` | string | | | | Dirección de contacto |
| `fecha_inicio_acompanamiento` | date | | | | Fecha de inicio de gestión |
| `cantidad_socios_declarada` | number | | | | Cantidad de socios según acta |
| `estado_constitucion` | string | | DIM_Estados | | En proceso, Constituida, Stand by, etc. |
| `fecha_asamblea_constitucion` | date | | | | Fecha de asamblea constitutiva |
| `fecha_ratificacion` | date | | | | Fecha de ratificación Min. Fe |
| `vigencia_directiva_hasta` | date | | | | Fecha de vencimiento directiva |
| `personalidad_juridica_flag` | boolean | | | | Tiene personalidad jurídica |
| `certificado_provisorio_flag` | boolean | | | | Tiene certificado provisorio |
| `certificado_definitivo_flag` | boolean | | | | Tiene certificado definitivo |
| `directiva_vigente_flag` | boolean | | | | Directiva vigente |
| `organizacion_constituida_flag` | boolean | | | | Proceso completo |
| `estado_general_organizacion` | string | | DIM_Estados | | Activa, Inactiva, Suspendida |
| `responsable_actual` | string | | DIM_Responsables | | Responsable asignado |
| `observacion_resumen` | string | | | | Notas generales |
| `updated_at` | datetime | | | ✓ | Timestamp última actualización |

### FACT (Hechos)

Eventos, transacciones y relaciones N:M. Historiales.

| Hoja | PK | FK Lógicas | Tipo | Descripción |
|------|----|-----------|----|-------------|
| `FACT_Hitos` | `hito_id` | `solicitud_id`, `organizacion_id` | Evento | Historial de gestiones generales |
| `FACT_Instrumentos_Organizacion` | `org_instrumento_id` | `organizacion_id` | Transacción | Instrumentos aplicados a organizaciones |
| `FACT_Requisitos_Instrumento` | `requisito_registro_id` | `org_instrumento_id` | Transacción | Requisitos de instrumentos |
| `FACT_Socios` | `socio_id` | `organizacion_id` | Relación | Socios y directivas |
| `FACT_Avance_Hitos` | `avance_hito_id` | `organizacion_id`, `solicitud_id` | Evento | Hitos de constitución (Pre+For) |
| `FACT_Avance_Estado` | `avance_estado_id` | `organizacion_id`, `solicitud_id` | Estado | Estados de avance (Activo/Stand by/etc.) |
| `FACT_Beneficios_*` | varios | `organizacion_id`, `beneficio_codigo` | Sistema | Beneficios estructurados (capacitaciones, fondos) |
| `FACT_Fondese` | `fondese_id` | `id_edicion`, `organizacion_id` | Transacción | Postulaciones Fondese |
| `FACT_Form_Eventos` | `evento_id` | - | Evento | Eventos de capacitación |
| `FACT_Form_Inscripciones` | `inscripcion_id` | `evento_id`, `socio_id` | Relación | Inscripciones a eventos |

**Ejemplo: FACT_Avance_Hitos**

| Campo | Tipo | PK | FK | Req | Descripción |
|-------|------|----|----|-----|-------------|
| `avance_hito_id` | string | ✓ | | ✓ | ID único (AH-XXXXXX) |
| `organizacion_id` | string | | MAE_Organizaciones | | FK a organización |
| `solicitud_id` | string | | MAE_Casos | | FK a caso (grupo vecinos) |
| `codigo_hito` | string | | CAT_Hitos_Avance | ✓ | Código del hito (PRE_01, PRE_02, etc.) |
| `tramo` | string | | | ✓ | Preconstitución / Formalización |
| `orden_hito` | number | | | ✓ | Orden secuencial |
| `nombre_hito` | string | | | ✓ | Nombre descriptivo |
| `fecha_hito` | date | | | ✓ | Fecha de cumplimiento |
| `usuario_registro` | string | | DIM_Usuarios | ✓ | Usuario que registró |
| `timestamp_registro` | datetime | | | ✓ | Timestamp de registro |
| `observacion` | string | | | | Notas del hito |
| `numero_ingreso` | string | | | | Número oficina partes (Hito 2) |

### DIM (Dimensiones / Catálogos)

Tablas de referencia. Diccionarios del dominio.

| Hoja | PK | Gestión | Descripción |
|------|----|---------|-------------|
| `DIM_Usuarios` | `user_id` | Auth.js | Usuarios del sistema |
| `DIM_Territorio` | `uv`, `sector` (compuesto) | seedDerivedTerritorio_() | UV y sectores |
| `DIM_Estados` | `tipo_estado`, `codigo_estado` | seedEstados_() | Estados por tipo |
| `DIM_Etapas_Constitucion` | `etapa_constitucion_codigo` | seedEtapas_() | Etapas de constitución |
| `DIM_Origen_Canal` | `medio_solicitud`, `unidad_origen` | seedOrigen_() | Canales de ingreso |
| `DIM_Beneficios` | `beneficio_codigo` | Config manual | Catálogo de beneficios |
| `DIM_Instrumentos` | `instrumento_codigo_catalogo` | seedInstrumentos_() | Instrumentos disponibles |
| `DIM_Requisitos_Instrumento` | `requisito_codigo` | seedRequisitos_() | Requisitos por instrumento |
| `DIM_Responsables` | `responsable_id` | seedDerivedResponsables_() | Responsables (derivado de usuarios) |
| `DIM_Cargos_Socios` | `cargo_id` | seedCargos_() | Cargos de directiva |
| `DIM_*_Sugeridas` | varios | rebuildSuggestionDims_() | Autocomplete (vecinos, solicitudes, orgs) |

### VW (Vistas materializadas)

Vistas pre-calculadas para consultas frecuentes.

| Hoja | Productor | Actualización | Descripción |
|------|-----------|---------------|-------------|
| `MASTER_DATOS` | buildMasterDatos_() | Parcial + Full | Ficha completa por solicitud_id (join de MAE+FACT) |
| `VW_LS_Organizaciones` | buildVistaOrganizaciones_() | Parcial + Full | Lista de organizaciones con agregados |
| `VW_LS_Instrumentos` | buildVistaInstrumentos_() | Parcial + Full | Lista de instrumentos con nombres |
| `VW_LS_Territorial` | buildVistaTerritorial_() | Parcial + Full | Agregados por UV/sector |
| `VW_Avance_Organizacion` | buildVistaAvanceOrganizacion_() | Parcial + Full | Estado de avance por organización |

**Actualización:**
- **Full:** `goPesRefrescarVistasYMaster()` → reconstruye todo
- **Parcial:** `refreshPartialArtifacts_()` → actualiza solo IDs afectados

### CFG (Configuración)

| Hoja | PK | Gestión | Descripción |
|------|----|---------|-------------|
| `CFG_Parametros` | `config_section` | SystemConfig.js | Configuración del sistema (JSON serializado) |
| `CFG_FONDESE_Ediciones` | `id_edicion` | Módulo Fondese | Ediciones de Fondese |

### LOG (Logs de auditoría)

| Hoja | PK | Gestión | Descripción |
|------|----|---------|-------------|
| `LOG_Procesamiento` | timestamp (implícito) | logProcessing_() | Eventos del sistema |
| `LOG_Accesos` | timestamp (implícito) | logAccess_() | Accesos a la webapp |
| `LOG_Acciones_Usuario` | timestamp (implícito) | logUserAction_() | Acciones de usuario |

---

## Inventario de hojas

**Total: 46 hojas**

| Prefijo | Cantidad | Propósito |
|---------|----------|-----------|
| RAW_* | 6 | Entrada cruda |
| MAE_* | 2 | Maestros |
| FACT_* | 14 | Hechos y transacciones |
| DIM_* | 12 | Catálogos y dimensiones |
| VW_* | 5 | Vistas materializadas |
| CFG_* | 2 | Configuración |
| LOG_* | 3 | Auditoría |
| CAT_* | 1 | Catálogo de hitos |
| MASTER | 1 | Vista principal |

---

## Relaciones entre tablas

### Diagrama de relaciones principales

```
MAE_Casos (solicitud_id)
    ├─ 1:1? ─→ MAE_Organizaciones (solicitud_id FK)
    ├─ 1:N ──→ FACT_Hitos (solicitud_id FK)
    ├─ 1:N ──→ FACT_Avance_Hitos (solicitud_id FK)
    └─ 1:N ──→ FACT_Avance_Estado (solicitud_id FK)

MAE_Organizaciones (organizacion_id)
    ├─ 1:N ──→ FACT_Instrumentos (organizacion_id FK)
    ├─ 1:N ──→ FACT_Socios (organizacion_id FK)
    ├─ 1:N ──→ FACT_Avance_Hitos (organizacion_id FK)
    ├─ 1:N ──→ FACT_Avance_Estado (organizacion_id FK)
    ├─ 1:N ──→ FACT_Beneficios_Org (organizacion_id FK)
    └─ 1:N ──→ FACT_Fondese (organizacion_id FK)

FACT_Instrumentos (org_instrumento_id)
    └─ 1:N ──→ FACT_Requisitos (org_instrumento_id FK)

FACT_Form_Eventos (evento_id)
    └─ 1:N ──→ FACT_Form_Inscripciones (evento_id FK)

FACT_Beneficios_Org (beneficio_org_id)
    └─ 1:N ──→ FACT_Beneficios_Org_Hitos (beneficio_org_id FK)
```

### Relaciones con catálogos (DIM)

Todas las tablas MAE/FACT tienen FKs lógicas a DIM:
- `uv` + `sector` → `DIM_Territorio`
- `estado_*` → `DIM_Estados` (tipo_estado variable)
- `responsable_*` → `DIM_Responsables`
- `instrumento_codigo_catalogo` → `DIM_Instrumentos`
- `beneficio_codigo` → `DIM_Beneficios`

**No hay FKs de integridad referencial** (limitación de Google Sheets). La validación es en el backend.

---

## Reglas de negocio del modelo

### Generación de IDs

Todos los IDs se generan con `nextId_(namespace, prefix)`:

| Entidad | Namespace | Prefix | Formato |
|---------|-----------|--------|---------|
| Vecino | `vecino` | `VEC` | `VEC-XXXXXX` |
| Solicitud | `solicitud` | `SOL` | `SOL-XXXXXX` |
| Organización | `organizacion` | `ORG` | `ORG-XXXXXX` |
| Socio | `socio` | `SOC` | `SOC-XXXXXX` |
| Hito | `hito` | `HIT` | `HIT-XXXXXX` |
| Instrumento | `instrumento` | `INS` | `INS-XXXXXX` |
| Requisito | `requisito` | `REQ` | `REQ-XXXXXX` |
| Usuario | `usuario` | `USR` | `USR-XXXXXX` |
| Avance Hito | `avance_hito` | `AH` | `AH-XXXXXX` |
| Avance Estado | `avance_estado` | `AE` | `AE-XXXXXX` |

**Storage:** Contador en `PropertiesService.getScriptProperties()` con key `GO_PES_SEQ_[NAMESPACE]`.

### Relación Caso ↔ Organización

- **1 Caso puede tener 0 o 1 Organización:** `MAE_Casos.organizacion_id`
- **1 Organización puede tener 0 o 1 Caso origen:** `MAE_Organizaciones.solicitud_id`
- **Grupos de vecinos:** Casos sin `organizacion_id` pero con avance ≥ hito 2 (reunión vecinos)
- **Organizaciones sin caso:** Creadas directamente (migración, registro directo)

### Estados de avance

- **Entidad:** `FACT_Avance_Estado`
- **Estados válidos:** `Activo`, `Stand by`, `Detenido`, `Finalizado`
- **Solo 1 estado activo por organización/solicitud:** `activo_flag = true`
- **Histórico:** Estados anteriores quedan con `activo_flag = false`

### Hitos de avance

- **Catálogo:** `CAT_Hitos_Avance` (13 hitos: 7 Pre + 6 For)
- **Registro:** `FACT_Avance_Hitos`
- **Orden secuencial:** `orden_hito` (1..13)
- **Saltos permitidos:** campo `permite_saltar` en catálogo
- **Validación:** No se puede registrar hito N+2 sin haber cumplido N+1 (salvo saltos permitidos)

### Vistas materializadas

- **Invalidación:** Cache de `CacheService` + flag en `GO_PES_RUNTIME`
- **Actualización parcial:** Solo actualiza filas afectadas por IDs
- **Actualización full:** Reconstruye toda la hoja desde cero
- **Trigger:** Automático en cada guardado (parcial) o manual (full)

### Campos de auditoría

Todas las tablas MAE/FACT tienen:
- `updated_at` (datetime) — Última actualización
- `updated_by` (string) — Usuario que actualizó (email)

Todas las tablas RAW tienen:
- `created_at` (datetime) — Timestamp de inserción
- `source` (string) — Origen (webapp, formulario, migración)
- `user_email` (string) — Usuario que insertó

---

**Última actualización:** 2026-05-31  
**Versión:** 1.0  
**Próxima revisión:** Cada vez que se agregue una hoja nueva o se modifique el esquema de una tabla crítica
