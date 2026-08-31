# Skills de GO-PES v2

Skills de Claude (`go-pes-*`) que encapsulan los flujos de trabajo recurrentes del proyecto, para no reescribir el andamiaje en cada prompt. Cada skill se carga automáticamente cuando la tarea encaja con su descripción.

## Contenido

| Skill | Para qué |
|-------|----------|
| `go-pes-feature` | Módulo/submódulo/feature nuevo (backend + frontend), flujo Fase 1→deploy. |
| `go-pes-rediseno-visual` | Rediseño visual de una vista existente, sin tocar backend/APIs. |
| `go-pes-colores` | Guardarraíl crítico para tocar colores + diagnóstico de bugs visuales. |
| `go-pes-tests` | Ejecutar y escribir tests en `Audith.js` (7 suites). |
| `go-pes-deploy` | Despliegue DEV → PROD con `push-dev.ps1` / `push-prod.ps1`. |
| `go-pes-esquema-datos` | Hojas, catálogos DIM, vistas derivadas y siembra. |
| `go-pes-flujo` | Orientación: recorrido del caso entre módulos, arranque/routing SPA, flujo de datos (indexa docs). |
| `go-pes-avance` | Máquina de estados del Avance: tramos, estados, hitos PRE_*/FOR_* y sus prerequisitos. |
| `go-pes-bug` | Corrección estructurada de bugs (reproducir → causa raíz → fix mínimo → test → deploy). |
| `go-pes-higiene` | Anti-duplicados y anti-código-muerto (namespace único GAS, limpieza segura). |
| `go-pes-performance` | Diagnóstico y optimización de rendimiento con test de timing GAS-puro (`Perf.js`) + reglas de cache/índices/endpoints compuestos. |
| `go-pes-ui-rapida` | Velocidad **percibida** del frontend (round-trips, loaders, cache cliente, render no bloqueante). |
| `go-pes-seguridad` | Guards de rol/módulo y PINs de operaciones sensibles con rate limiting. |
| `go-pes-mensajes` | Mensajes al usuario en lenguaje operativo (traducción de errores técnicos, sin filtrar internals). |
| `go-pes-documentacion` | Mantener y estandarizar la documentación de `docs/` durante DEV (qué doc tocar, nombres, archive). |
| `go-pes-estructura` | Estructura consistente de módulos/archivos (mismo molde backend/frontend/tests). |
| `go-pes-loaders` | Uso estandarizado de loaders y su área de visualización (nunca fullscreen salvo splash). |
| `go-pes-a11y` | Guardarraíl de accesibilidad (teclado, foco, ARIA, modales, movimiento reducido). |
| `go-pes-beneficios` | Módulo Beneficios/Instrumentos (CÁMARAS 1414, FONDESE por ediciones, eventos de formación). |
| `go-pes-correccion` | Corrección auditada de datos: editar + registrar antes→después en `LOG_Acciones_Usuario` (función central `aplicarCorreccionAuditada_`). |
| `go-pes-entrada-segura` | Cara preventiva: validar al ingresar, confirmar acciones con consecuencias, resumen antes de guardar, mensajes claros, calidad de datos. |

## Estructura

```
skills/
├── reglas-go-pes.md            ← MAESTRO de las reglas y convenciones compartidas
├── <skill>/
│   ├── SKILL.md                ← frontmatter (name, description) + instrucciones
│   └── references/
│       ├── reglas-go-pes.md    ← copia bundleada (para que el .skill sea autocontenido)
│       └── ...                 ← plantillas/checklists propios de la skill
```

## Cómo mantenerlas

- **Las reglas compartidas se editan en `reglas-go-pes.md` (el maestro).** Como cada skill instalable debe ser autocontenida, se bundlea una copia en `<skill>/references/reglas-go-pes.md`. Tras editar el maestro, re-sincroniza las copias:
  ```bash
  cd skills && for d in go-pes-*/; do cp reglas-go-pes.md "${d}references/reglas-go-pes.md"; done
  ```
- Re-empaquetar todos los `.skill` (zip autocontenido, ignorando ocultos):
  ```bash
  cd skills && mkdir -p ../dist && for d in go-pes-*/; do d=${d%/}; zip -r -q "../dist/$d.skill" "$d" -x '*/.*'; done
  ```
- La fuente canónica de las reglas del proyecto es `docs/CLAUDE.md` (el repo no tiene `.md` en la raíz); `reglas-go-pes.md` es su extracto operativo para las skills.

## Placement (dónde se usan)

- **`skills/` es la fuente única.** No edites copias; edita aquí y re-sincroniza/re-empaqueta.
- **App de Claude:** instala los `.skill` de `dist/` desde la interfaz.
- **Claude Code (este repo):** las skills de proyecto se cargan desde `.claude/skills/<skill>/SKILL.md`. Se mantiene una copia sincronizada ahí; para actualizarla tras editar `skills/`:
  ```bash
  rm -rf .claude/skills && mkdir -p .claude/skills && cp -r skills/go-pes-* .claude/skills/
  ```
  (No edites `.claude/skills/` a mano: es un espejo de `skills/`.)

## Instalar

Los archivos `.skill` (en `dist/`) se instalan en tu cuenta de Claude desde la interfaz. Una vez instaladas, disparan solas según su `description`; también puedes invocarlas por nombre.
