# Guía de Deploy — GO-PES v2

**Propósito:** Procedimiento completo para desplegar cambios a DEV y PROD de forma segura, incluyendo preflight, checklist pre-PROD, limpieza de datos de prueba, validación post-deploy y rollback. (Consolida el antiguo `checklist-produccion.md`, hoy en `archive/`.)

**Audiencia:** Desarrolladores con acceso a clasp y cuentas Google del proyecto.

---

## Tabla de contenidos

- [Entornos](#entornos)
- [Pre-requisitos](#pre-requisitos)
- [Deploy a DEV](#deploy-a-dev)
- [Deploy a PROD](#deploy-a-prod)
- [Configuración post-deploy](#configuración-post-deploy)
- [Validación post-deploy](#validación-post-deploy)
- [Rollback](#rollback)
- [Troubleshooting](#troubleshooting)

---

## Entornos

| Entorno | Script ID | Cuenta | Config clasp | Spreadsheet | Acceso webapp |
|---------|-----------|--------|--------------|-------------|---------------|
| **DEV** | `12ZfNLyFP5K_...` | p.e.ramos.ramos@gmail.com | `.clasp.json` / `.clasp.dev.json` | [Link DEV](https://docs.google.com/spreadsheets/d/12ZfNLyFP5K_...) | `ANYONE` |
| **PROD** | `10Lzrg2GKt3M_...` | pablo.ramos@providencia.cl | `.clasp.prod.json` | [Link PROD](https://docs.google.com/spreadsheets/d/10Lzrg2GKt3M_...) | `DOMAIN` |

**Flujo de trabajo:**
```
Desarrollar local → Push DEV → Tests → Validación → Push PROD
```

---

## Pre-requisitos

### Software

```bash
# Node.js LTS
node --version  # → v18.x o superior

# clasp CLI
npm install -g @google/clasp
clasp --version  # → 2.4.x o superior

# Git
git --version
```

### Cuentas Google autenticadas

```powershell
# Autenticar cuenta DEV (primera vez)
clasp -u dev login --no-localhost
# → Usar p.e.ramos.ramos@gmail.com

# Autenticar cuenta PROD (primera vez, solo si tienes acceso)
clasp -u prod login --no-localhost
# → Usar pablo.ramos@providencia.cl

# Verificar cuentas autenticadas
clasp login --status
```

### Permisos requeridos

- **DEV:** Editor en el Spreadsheet de desarrollo
- **PROD:** Editor en el Spreadsheet de producción + Rol superuser en la app

---

## Deploy a DEV

### Preflight checklist

```
□ Rama correcta: estás en master o feature branch?
□ Cambios commiteados: git status limpio?
□ Tests locales ejecutados: goPesRunAllTests() sin fallos?
□ Sin console.log() olvidados en código de producción
□ Sin hardcoded credentials o datos sensibles
```

### Ejecución

```powershell
# Desde la raíz del proyecto (GO Provi/)
.\push-dev.ps1
```

**Qué hace el script:**
1. Verifica que estés en el directorio correcto
2. Copia `.clasp.dev.json` → `.clasp.json` (apunta a DEV)
3. Ejecuta `clasp push` con user `dev`
4. Muestra link al editor de Apps Script

**Salida esperada:**
```
╔═══════════════════════���════════════════╗
║   GO-PES v2 Deploy Script (DEV)        ║
╚═══════════════════════════���════════════╝

→ Usando configuración: .clasp.dev.json
→ Pushing to DEV environment...
└─ @google/clasp 2.4.2
└─ Pushing files...
   ├─ Main.js
   ├─ Auth.js
   ...
   └─ 45 files pushed.
✔ Pushed 45 files.

→ Deploy completado.
→ Abrir editor: https://script.google.com/d/12ZfNLyF.../edit
```

### Post-deploy inmediato

```javascript
// Desde el editor de Apps Script → Ejecutar → goPesRunAllTests
goPesRunAllTests()
// → Verificar: 272 tests (7 suites), 0 fallos
```

---

## Deploy a PROD

⚠️ **ADVERTENCIA:** PROD contiene datos reales de operación municipal. Seguir el procedimiento completo sin excepciones.

### Preflight checklist

```
□ Todos los tests pasan en DEV: goPesRunAllTests() → 0 fallos
□ Validación funcional completa en DEV por usuario operador
□ CHANGELOG.md actualizado con versión y fecha
□ Backup de PROD hecho en las últimas 24h (ver sección Backup)
□ Sin breaking changes no documentados
□ Ventana de mantenimiento comunicada (si aplica)
□ Post-deploy config preparada (PINs, IDs, etc.)
```

### Ejecución

```powershell
# Desde la raíz del proyecto (GO Provi/)
.\push-prod.ps1
```

**El script pedirá confirmación:**
```
╔════════════════════════════════════════╗
║   GO-PES v2 Deploy Script (PROD)       ║
╚════════════════════════════════════════╝

⚠️  ADVERTENCIA ⚠️
Estás a punto de hacer DEPLOY a PRODUCCIÓN.
Este ambiente contiene datos reales del sistema operativo.

Asegúrate de haber:
  ✓ Ejecutado todos los tests en DEV
  ✓ Validado los cambios funcionalmente
  ✓ Actualizado el CHANGELOG
  ✓ Hecho backup de PROD

→ Escribe 'prod' para continuar o CTRL+C para cancelar:
```

**Escribir:** `prod` (en minúsculas)

**Qué hace el script:**
1. Pide confirmación explícita
2. Verifica que estés en el directorio correcto
3. Copia `.clasp.prod.json` → `.clasp.json` (apunta a PROD)
4. Ejecuta `clasp push` con user `prod`
5. Muestra link al editor de Apps Script

---

## Configuración post-deploy

### Primera vez en un entorno nuevo

Si es la primera vez que despliegas a un entorno limpio:

#### 1. Configurar motor operativo

Desde el **Spreadsheet** (abrir la hoja de cálculo):

**Menú GO-PES v2 → Configurar motor operativo**
- Crea todas las hojas necesarias (RAW, MAE, FACT, DIM, VW, CFG, LOG)
- Siembra catálogos base (estados, etapas, instrumentos, etc.)

**Menú GO-PES v2 → Inicializar superUsers**
- Configura el superusuario inicial del entorno

#### 2. Configurar PINs de seguridad

Desde el **Editor de Apps Script**:

```javascript
// Ejecutar una sola vez después del primer deploy
goPesConfigurePinDeSeguridad('admin_reset', 'PIN_FUERTE_1')
goPesConfigurePinDeSeguridad('user_deactivate', 'PIN_FUERTE_2')
goPesConfigurePinDeSeguridad('evento_abierto', 'PIN_FUERTE_3')

// Verificar configuración
goPesIsPinConfigured('admin_reset')  // → {configured: true}
```

**Recomendaciones de PINs:**
- Mínimo 8 caracteres
- Mezcla de letras, números y símbolos
- **NO usar la misma clave para los 3 contextos**
- Guardar en gestor de passwords del equipo (1Password, LastPass, etc.)

#### 3. Desplegar la Web App

Desde el **Editor de Apps Script**:

1. **Desplegar → Nueva implementación**
2. **Tipo:** Aplicación web
3. **Descripción:** `GO-PES v2 - [PROD|DEV] - [Fecha]`
4. **Ejecutar como:** Usuario que accede a la aplicación
5. **Quién tiene acceso:**
   - DEV: `Cualquier usuario de Google`
   - PROD: `Solo usuarios de providencia.cl` ← **CRÍTICO**
6. **Desplegar**
7. Copiar la URL de la webapp

### Después de cada deploy con breaking changes

Si el deploy incluye breaking changes documentados en CHANGELOG:

1. Leer la sección "BREAKING CHANGES" del CHANGELOG
2. Ejecutar scripts de migración si los hay
3. Actualizar configuración de `CFG_Parametros` si aplica
4. Notificar a usuarios clave del cambio

---

## Puesta en marcha de PROD: limpieza de prueba y backfill

### Limpiar datos de prueba (antes de abrir PROD al equipo)

Si el entorno tiene datos de prueba, límpialos **antes** de operar:
- **Dónde:** módulo Configuración → Limpieza de datos.
- **Requiere:** PIN `admin_reset` + escribir la confirmación `LIMPIAR`.
- La función resetea contadores de secuencia (IDs vuelven a `VEC-000001`, `SOL-000001`…), reconstruye vistas derivadas y registra la acción en logs.

**Hojas que SE LIMPIAN (datos operativos):** `RAW_*` (ingresos, seguimiento, organizaciones, instrumentos, socios), `MAE_*` (casos, organizaciones), `FACT_*` (hitos, instrumentos, socios, beneficios, avance), `VW_*`, `DIM_*_Sugeridos`, `MASTER_DATOS`.

**Hojas PROTEGIDAS (NO se tocan):** `CAT_Hitos_Avance`, `CFG_FONDESE_Ediciones`, `DIM_Usuarios`, `DIM_Territorio`, `DIM_Estados`, `DIM_Etapas_Constitucion`, `DIM_Origen_Canal`, `DIM_Beneficios`, `DIM_Instrumentos`, `DIM_Requisitos_Instrumento`, `DIM_Responsables`, `DIM_Cargos_Socios`, `LOG_*`.

### Backfill del hito PRE_01

Si hay casos en PROD sin el hito inicial `PRE_01` (reunión informativa), ejecutar desde el editor:

```javascript
goPesBackfillHitoPRE01()
```

Crea `PRE_01` para todos los casos que no lo tienen, usando `fecha_ingreso` del caso como fecha del hito. Ver [`avance-hitos.md`](avance-hitos.md) para el catálogo de hitos.

---

## Validación post-deploy

### Checklist básico (todos los deploys)

```
□ Webapp carga sin errores de consola
□ Login funciona (OAuth Google)
□ Dashboard Inicio renderiza correctamente
□ Módulos principales accesibles según rol
□ Tests automatizados pasan: goPesRunAllTests() → 0 fallos
```

### Checklist extendido (deploy PROD)

```
□ Buscar vecino por nombre/RUT funciona
□ Abrir una ficha existente renderiza correctamente
□ Crear nuevo ingreso → se guarda en MAE_CASOS
□ Timeline de avance muestra hitos históricos
□ Beneficios vigentes aparecen en dashboard
□ Manual de usuario abre correctamente
□ Logs no muestran errores críticos (LOG_Procesamiento)
```

### Validación funcional con usuario operador

Coordinar con un usuario operador para:
1. Realizar una operación típica (ej: registrar nuevo ingreso)
2. Validar que datos persisten correctamente
3. Verificar permisos según su rol
4. Reportar cualquier comportamiento inesperado

### Verificar logs

Desde el **Editor de Apps Script → Executions**:
- Ver últimas 10 ejecuciones
- Filtrar por errores
- Verificar que no haya stack traces nuevos

Desde la **Hoja LOG_Procesamiento**:
- Filtrar por `nivel = 'ERROR'` o `nivel = 'CRITICAL'`
- Últimas 24h sin errores nuevos

---

## Rollback

### Escenario 1: Deploy reciente con problemas críticos

Si el deploy fue en las últimas 2 horas y hay errores bloqueantes:

#### Opción A: Rollback de webapp deployment

Desde el **Editor de Apps Script**:

1. **Desplegar → Administrar implementaciones**
2. Identificar la versión anterior estable
3. **Editar implementación activa**
4. Cambiar a la **versión anterior**
5. **Guardar**

**Tiempo de rollback:** ~30 segundos  
**Pérdida de datos:** Ninguna (solo vuelve el código, los datos persisten)

#### Opción B: Push de commit anterior

```powershell
# Ver historial de commits
git log --oneline -5

# Identificar el último commit estable
git checkout COMMIT_HASH_ESTABLE

# Push a PROD
.\push-prod.ps1
```

**Tiempo de rollback:** ~3 minutos  
**Pérdida de datos:** Ninguna

### Escenario 2: Corrupción de datos

Si el problema es corrupción de hojas o datos inconsistentes:

1. **STOP:** No hacer más operaciones en la webapp
2. **Restaurar desde backup** (ver sección Backup)
3. **Investigar causa raíz** en logs
4. **Fix en DEV** + validación exhaustiva
5. **Deploy corregido a PROD**

### Escenario 3: Breaking change no anticipado

Si usuarios reportan funcionalidad rota:

1. **Evaluar impacto:** ¿cuántos usuarios afectados?
2. **Workaround temporal:** comunicar vía alternativa
3. Si es crítico → Rollback Opción A
4. Si es tolerable → Fix en DEV + deploy express

---

## Backup

### Backup manual antes de deploy PROD

```
1. Abrir el Spreadsheet de PROD
2. Archivo → Hacer una copia
3. Nombrar: "BACKUP_GO_PES_PROD_YYYYMMDD_HHMM_pre-deploy"
4. Mover a carpeta "Backups" en Drive
5. Verificar que la copia tenga todas las hojas
```

**Frecuencia recomendada:**
- Antes de cada deploy PROD
- Antes de ejecutar utilidades de reset/migración
- Semanalmente (automatizado)

### Restaurar desde backup

```
1. Abrir el backup en Drive
2. Identificar las hojas afectadas
3. Archivo → Hacer una copia de la hoja específica
4. Pegar en el Spreadsheet PROD
5. Desde el menú GO-PES v2 → Reconstruir vistas y master
6. Validar integridad de datos
```

---

## Troubleshooting

### Error: "Script has been disabled"

**Causa:** El proyecto de Apps Script fue deshabilitado o borrado.

**Solución:**
1. Verificar que el Script ID en `.clasp.json` sea correcto
2. Abrir el spreadsheet → Extensiones → Apps Script
3. Verificar que el proyecto exista
4. Si no existe, restaurar desde backup

### Error: "User does not have permission to access this resource"

**Causa:** La cuenta autenticada en clasp no tiene permisos de editor en el spreadsheet.

**Solución:**
1. Verificar cuenta autenticada: `clasp login --status`
2. Solicitar permisos de editor en el Spreadsheet
3. Re-autenticar: `clasp login --creds .clasprc.json`

### Error: "Push rejected"

**Causa:** Archivos `.gs` en el proyecto remoto pero `.js` en local (o viceversa).

**Solución:**
```powershell
# Forzar pull primero
clasp pull --force

# Resolver conflictos manualmente

# Push de nuevo
clasp push
```

### Deploy OK pero webapp muestra "Error 500"

**Causa:** Error en tiempo de ejecución no detectado por tests.

**Diagnóstico:**
1. Abrir Editor → Executions
2. Ver última ejecución fallida
3. Revisar stack trace

**Solución:**
- Fix en local
- Push a DEV
- Validar
- Push a PROD

### Tests fallan después de deploy PROD pero pasaban en DEV

**Causa:** Diferencia de datos entre DEV y PROD.

**Diagnóstico:**
1. Comparar esquema de hojas DEV vs PROD
2. Verificar catálogos (DIM_*)
3. Revisar configuración (CFG_Parametros)

**Solución:**
- Sincronizar catálogos: Menú → Refrescar catálogos sugeridos
- Reconstruir vistas: Menú → Reconstruir vistas y master

---

## Checklist de release completo

Antes de anunciar un release a usuarios:

```
□ Version bump en Main.js → GO_PES_V2.VERSION
□ Build hash actualizado → GO_PES_V2.BUILD
□ CHANGELOG.md con entrada de la versión
□ README.md refleja cambios estructurales (si aplica)
□ Manual.html actualizado con cambios funcionales
□ Tests pasan en DEV y PROD: 272/272 OK
□ Validación funcional completa por usuario key
□ Datos de prueba limpiados (si aplica) y backfill PRE_01 ejecutado
□ Backup de PROD hecho
□ Deploy a PROD ejecutado sin errores
□ Post-deploy validation OK
□ Comunicación a usuarios enviada (si cambios visibles)
□ Tag en git: git tag vX.Y.Z && git push --tags (usar GO_PES_V2.VERSION)
```

---

**Última actualización:** 2026-05-31  
**Versión:** 1.0  
**Próxima revisión:** Antes del próximo cambio mayor de proceso
