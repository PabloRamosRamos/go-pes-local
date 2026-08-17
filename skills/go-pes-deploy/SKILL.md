---
name: go-pes-deploy
description: >-
  Guía el despliegue de GO-PES v2 a los entornos DEV y PROD con clasp. Úsala para
  "hacer push", "subir a DEV", "desplegar", "pasar a producción", "deploy",
  "publicar los cambios". Conoce el flujo real DEV → tests → PROD, los scripts
  push-dev.ps1 y push-prod.ps1 (con su pre-flight interactivo de 3 preguntas y la
  confirmación escribiendo 'prod'), la config clasp multiusuario, y advierte que
  PROD son datos reales de la Municipalidad de Providencia.
---

# go-pes-deploy — Despliegue DEV → PROD

Skill para desplegar GO-PES v2. El flujo obligatorio es **DEV → `goPesRunAllTests()` en 0 fallos → verificación manual en DEV → PROD**.

**Lee primero `references/reglas-go-pes.md`.**

## Advertencia clave
**PROD son datos reales** de la Municipalidad de Providencia (cuenta `pablo.ramos@providencia.cl`). Nunca se despliega a PROD sin haber verificado en DEV. Antes de PROD se avisa al equipo.

## Los scripts son interactivos → el push lo corre el usuario
`push-dev.ps1` y `push-prod.ps1` usan `Read-Host` (piden confirmación por teclado). Desde esta sesión **no** ejecutes el push por el usuario: **prepara y verifica** los cambios, deja el árbol listo, y entrega las instrucciones exactas para que el usuario corra el script en su terminal. Ese prompt interactivo es el punto de control humano antes de tocar producción.

## DEV — `.\push-dev.ps1`
Desde la raíz del repo (`GO Provi/`):
```powershell
.\push-dev.ps1
```
El script:
1. Sella en `Main.js`: `BUILD` = hash corto de git, `BUILD_DATE` = fecha, `ENVIRONMENT = 'DEV'`.
2. Corre `clasp -u dev push` (cuenta `p.e.ramos.ramos@gmail.com`).
3. Si hay error de auth: `clasp -u dev show-authorized-user`.

Luego: abrir la Web App en el spreadsheet de prueba y verificar.

## Verificación en DEV (obligatoria antes de PROD)
1. `goPesRunAllTests()` (menú GO-PES v2 → Ejecutar tests) → **0 fallos**.
2. Recorrido manual de los módulos principales: dashboard/inicio, nuevo ingreso, buscar, avance (y el módulo tocado por el cambio).
3. `clasp logs --watch` sin errores durante navegación normal.
4. Verificar **modo claro y oscuro** si el cambio fue visual.

## PROD — `.\push-prod.ps1`
```powershell
.\push-prod.ps1
```
El script hace un **pre-flight interactivo** que aborta si respondes distinto de `s`:
1. `[1/3] ¿Ejecutaste goPesRunAllTests() en DEV y todos pasaron? (s/n)`
2. `[2/3] ¿Verificaste manualmente los módulos principales en DEV? (s/n)`
3. `[3/3] ¿Avisaste al equipo del despliegue? (s/n)`

Después pide **nueva versión** (Enter mantiene la actual), muestra Versión/Build/Fecha/Entorno, y exige escribir literalmente **`prod`** para confirmar. Entonces sella `VERSION`/`BUILD`/`BUILD_DATE`/`ENVIRONMENT='PROD'` en `Main.js` y corre `clasp -u prod -P .clasp.prod.json push`.

## Mantener la MISMA URL de PROD tras el push
`push-prod.ps1` solo hace `clasp push` (sube el código); **no** actualiza el deployment de la Web App. Para que la URL de PROD no cambie, después del push hay que **editar el deployment existente, no crear uno nuevo**:
1. `clasp -u prod -P .clasp.prod.json open`
2. En el editor: **Implementar → Administrar implementaciones → ✏️ editar el deployment activo → Nueva versión** (+ descripción) → **Implementar**.
3. Verificar en la URL de PROD. (Crear un deployment nuevo genera una URL distinta.)

## Config de entornos (clasp multiusuario)
| Entorno | Cuenta | Config |
|---------|--------|--------|
| DEV | `p.e.ramos.ramos@gmail.com` | `.clasp.dev.json` (usuario clasp `dev`) |
| PROD | `pablo.ramos@providencia.cl` | `.clasp.prod.json` (usuario clasp `prod`) |

Primera vez / re-auth:
```powershell
clasp -u dev login --no-localhost
clasp -u prod login --no-localhost
```

## Cada push va con un resumen
Regla del proyecto: acompaña cada despliegue con **qué cambió y cómo probarlo** (lista de archivos, propósito, pasos de verificación).

## Skills relacionadas
- `go-pes-tests` — la verificación de 0 fallos que exige el pre-flight.
