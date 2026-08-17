---
name: go-pes-flujo
description: >-
  Orienta sobre cómo fluye y se conecta el sistema GO-PES v2 (app de Google Apps
  Script de la Municipalidad de Providencia): el recorrido de un caso entre
  módulos, el arranque/routing de la SPA y el flujo de datos entre hojas. Úsala
  para "cómo se conecta X con Y", "por dónde pasa un caso", "de dónde sale este
  dato", "cómo arranca/enruta la app", "qué módulo alimenta a cuál", "entender el
  flujo del sistema" ANTES de implementar o depurar. Es orientación previa: NO
  implementa (go-pes-feature), NO arregla bugs (go-pes-bug) ni cambia el esquema
  (go-pes-esquema-datos) — remite a esas skills.
---

# go-pes-flujo — Mapa del sistema (orientación)

Skill de **orientación**: cuando una tarea cruza varios módulos o necesitas ubicar dónde vive un flujo antes de tocar código, esta skill te dice **qué leer y cómo encajan las piezas**. No reescribe la documentación del repo: la indexa y añade el único mapa que no está escrito como tal (el recorrido del caso).

**Lee primero `references/reglas-go-pes.md`.**

## Los tres flujos y dónde están

### 1. Arquitectura y arranque de la SPA (técnico) → ya documentado
No lo reinventes: léelo en **`docs/arquitectura.md`** (capas, módulos backend/frontend, "Flujo de una operación típica", decisiones arquitectónicas). Resumen del ciclo:
`doGet()` → `buildBootstrapForTemplate_()` (usuario, permisos, config, colores) → `Index.html` + parciales vía `include()` → `Splash.html` → `init()` → `route(view)` → módulo. El cliente pide datos con el wrapper **`window.api(fn, payload)`** (promesa sobre `google.script.run`). Permisos por rol se resuelven en `Auth.js` (`requireRole_`/`requireModuleAccess_`).

### 2. Flujo de datos entre hojas (pipeline) → ya documentado
Léelo en **`docs/modelo-datos.md`** y usa la skill **`go-pes-esquema-datos`** para operarlo. En una frase: `RAW_*` (entrada) → `MAE_*`/`FACT_*` (maestros/hechos) → `DIM_*`/`CAT_*` (catálogos) → `VW_*`/`MASTER_*` (vistas derivadas, reconstruidas por `DerivedBuilders.js`).

### 3. Recorrido del caso entre módulos (negocio) → **aquí**
Es el único mapa que no está escrito como pieza única. Está en **`references/recorrido-del-caso.md`**: el viaje de un vecino/caso Calendario → Nuevo Ingreso → Ficha → Avance → Organización → Socios → Beneficios, anclado a las funciones y hojas que conectan cada salto.

## Cómo usar esta skill
1. Identifica qué flujo necesitas entender (técnico / datos / negocio) y **lee la fuente correcta** de arriba.
2. Con el mapa claro, **cede a la skill que ejecuta**: `go-pes-feature` (construir), `go-pes-bug` (arreglar), `go-pes-avance` (hitos), `go-pes-esquema-datos` (hojas), `go-pes-seguridad` (permisos).
3. Si al mapear detectas que un doc quedó desactualizado respecto al código, **dilo** (no lo edites como parte de otra tarea; es higiene de docs aparte).

## Cuándo NO usar esta skill
- Ya sabes dónde tocar → ve directo a la skill de ejecución.
- La tarea es puramente de un módulo aislado → su skill específica basta.

## Skills relacionadas
- `go-pes-avance` — el flujo más regulado (máquina de estados de hitos).
- `go-pes-esquema-datos` — operar el pipeline de datos.
- `go-pes-feature`, `go-pes-bug`, `go-pes-seguridad` — ejecutan una vez que el mapa está claro.
