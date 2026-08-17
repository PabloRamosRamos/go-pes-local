# Testing — GO-PES v2

**Propósito:** estrategia, infraestructura y cobertura de los tests automatizados. La batería es **GAS-pura** (sin frameworks) y vive en `go-pes-local/Audith.js`. Para el flujo de trabajo al escribir tests, usa la skill `go-pes-tests`.

---

## Cómo correr los tests
- **Entry point:** `goPesRunAllTests()` (requiere rol `superuser`).
- **Desde el spreadsheet:** menú **GO-PES v2 → Ejecutar tests**.
- **Desde el editor de Apps Script:** Ejecutar → `goPesRunAllTests`.
- Resultados en el log (`Logger.log` / `clasp logs`). Retorna `{ passed, failed }`.
- **Regla del proyecto:** 0 fallos es requisito para pasar a PROD.

## Estado actual
**7 suites · 272 tests activos · 31 SKIPs · 0 fallos** (conteo por grep de `s.test(`/`s.skip(` en `Audith.js`).

| Suite | Tests | Cubre |
|-------|-------|-------|
| `goPesTestValidators_` | 90 | RUT, email, teléfono, campos requeridos, normalización |
| `goPesTestAuth_` | 41 | Autenticación, roles, permisos por módulo |
| `goPesTestServices_` | 51 | Búsqueda, ficha, dashboard, catálogos |
| `goPesTestAvance_` | 35 | Hitos, formateadores, estados del avance |
| `goPesTestBeneficios_` | 32 | Validaciones, estados, elegibilidad |
| `goPesTestSecurity_` | 10 | Auth guards, PINs, rate limiting |
| `goPesTestAlertas_` | 13 | Plazos de formalización y beneficios |

`goPesRunAllTests()` acumula las 7 en ese orden vía `acumular(goPesTest<Modulo>_())`.

## Infraestructura del runner (`Audith.js`)
```javascript
var s = createTestSuite_('MiModulo');
s.test('descripción de lo que valida', function() {
  assertEqual_(actual, esperado, 'mensaje opcional');
});
s.skip('test pendiente', 'razón');   // documenta el SKIP
var r = s.run();                      // { passed, failed, skipped, results }
```

**Asserts disponibles:** `assertEqual_`, `assertDeepEqual_` (compara por `JSON.stringify`), `assertTrue_`, `assertFalse_`, `assertThrows_` (espera que lance), `assertNotThrows_`.

**Stub de usuario:** para tests que requieren un usuario/rol, envuelve con `withTestUser_(perfil, isSuper, fn)` — inyecta un usuario sintético en `GO_PES_RUNTIME` y restaura en `finally` (evita tocar el spreadsheet).

## Agregar una suite nueva
1. Escribe `goPesTest<Modulo>_()` en `Audith.js` que arma un `createTestSuite_('<Modulo>')`, agrega sus `s.test(...)` y retorna `s.run()`.
2. **Regístrala** en `goPesRunAllTests()` con `acumular(goPesTest<Modulo>_())`.
3. Corre `goPesRunAllTests()` y confirma 0 fallos.
4. Actualiza el conteo en este doc y en `dev-stats.md`.

## Buenas prácticas
- **Deterministas:** no dependas de datos mutables de PROD; usa `withTestUser_` y stubs.
- Un test valida **una** cosa; el `description` dice qué.
- Documenta cada `skip` con su razón (es parte del contrato — 31 SKIPs intencionales requieren `Session` + lectura/escritura de hojas reales).
- Para condiciones de plazo (alertas, N días), testea el **borde** (exactamente N).
- Un fix de bug debe venir con un test que **falle antes** y **pase después** (ver skill `go-pes-bug`).

## Cobertura
- **Completa:** Validators, Auth, Services, Avance, Beneficios, Security, Alertas.
- **Parcial:** Organizaciones, Socios, NuevoIngreso.
- **Sin cobertura directa:** DerivedBuilders, Diagnostics.

## Relacionado
- Skill `go-pes-tests` (flujo de escribir/correr), `go-pes-bug` (test de regresión), `deploy.md` (0 fallos antes de PROD).
