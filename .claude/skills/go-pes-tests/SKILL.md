---
name: go-pes-tests
description: >-
  Ejecuta y escribe tests automatizados de GO-PES v2 en Audith.js (runner
  GAS-puro). Úsala para "correr los tests", "ejecutar la batería", "agregar una
  suite de tests", "escribir tests para el módulo X", "verificar 0 fallos antes
  de PROD", o cuando un feature nuevo necesita cobertura. Conoce la
  infraestructura real: goPesRunAllTests(), createTestSuite_, los asserts
  disponibles y cómo registrar una suite nueva.
---

# go-pes-tests — Tests automatizados (Audith.js)

Skill para trabajar con la batería de tests GAS-pura del proyecto, que vive en `Audith.js`. Baseline actual: **7 suites, 0 fallos** (a la fecha ≈275 tests activos + ≈31 skips, contados por grep de `s.test(` / `s.skip(` en `Audith.js`). **No fijes un número exacto** en reportes: cámbialo por el conteo real del momento — el total sube al agregar tests, y los docs (`docs/dev-stats.md`, `docs/CLAUDE.md`) aún citan un `262` viejo de cuando eran 6 suites.

**Lee primero `references/reglas-go-pes.md`.**

## Ejecutar los tests
- Entry point público: **`goPesRunAllTests()`** (requiere rol `superuser`).
- Desde el spreadsheet: menú **GO-PES v2 → Ejecutar tests**. Los resultados quedan en el log (`Logger.log` / `clasp logs`).
- Regla del proyecto: **0 fallos es requisito para pasar a PROD.**

## Las 7 suites actuales
`goPesRunAllTests()` acumula, en este orden:
```
goPesTestValidators_()
goPesTestAuth_()
goPesTestServices_()
goPesTestAvance_()
goPesTestBeneficios_()
goPesTestSecurity_()
goPesTestAlertas_()
```

## Infraestructura del runner (ya existe en Audith.js)

```javascript
var suite = createTestSuite_('MiModulo');

suite.test('descripción de lo que valida', function() {
  assertEqual_(actual, esperado, 'mensaje opcional');
});

suite.skip('test pendiente', 'razón por la que se omite'); // documenta SKIPs

var resultado = suite.run(); // { passed, failed, skipped, results }
```

### Asserts disponibles
- `assertEqual_(actual, expected, msg)`
- `assertDeepEqual_(actual, expected, msg)` — compara por `JSON.stringify`
- `assertTrue_(condition, msg)`
- `assertFalse_(condition, msg)`
- `assertThrows_(fn, msg)` — espera que `fn` lance
- `assertNotThrows_(fn, msg)` — espera que `fn` no lance

## Agregar una suite nueva
1. Escribe la función `goPesTest<Modulo>_()` en `Audith.js`:
   ```javascript
   function goPesTestMiModulo_() {
     var suite = createTestSuite_('MiModulo');
     suite.test('getMiModuloData retorna las claves esperadas', function() {
       var r = getMiModuloData({});
       assertTrue_(r && r.kpis !== undefined, 'falta kpis');
     });
     // ...
     return suite.run();
   }
   ```
2. **Regístrala** dentro de `goPesRunAllTests()` agregando una línea:
   ```javascript
   acumular(goPesTestMiModulo_());
   ```
3. Corre `goPesRunAllTests()` y confirma 0 fallos.

## Buenas prácticas
- Tests deterministas: no dependas de datos mutables de PROD; usa stubs cuando el runner ya los provee. Para tests que requieren un usuario/rol, envuelve con `withTestUser_(perfil, isSuper, fn)` (inyecta un usuario sintético en `GO_PES_RUNTIME` y restaura en `finally`), en vez de tocar el spreadsheet.
- Un test valida una cosa; el `description` dice qué.
- Documenta cada `skip` con su razón — es parte del contrato.
- Para funciones que evalúan condiciones/plazos, testea el borde (ej. exactamente N días).

## Skills relacionadas
- `go-pes-feature` (Fase 5 delega aquí).
- `go-pes-deploy` (exige 0 fallos antes de PROD).
