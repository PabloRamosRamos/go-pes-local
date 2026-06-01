# push-prod.ps1 - Sube el codigo al entorno de PRODUCCION (pablo.ramos@providencia.cl)
# Solo usar cuando los cambios esten verificados en DEV.
$mainJs = "$PSScriptRoot\go-pes-local\Main.js"

# PRE-FLIGHT CHECKLIST
Write-Host ""
Write-Host "  PRE-FLIGHT - Verificaciones obligatorias antes de PROD" -ForegroundColor Yellow
Write-Host "  ---------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

$chk1 = Read-Host "  [1/3] Ejecutaste goPesRunAllTests() en DEV y todos los tests pasaron? (s/n)"
if ($chk1 -ne 's') {
    Write-Host "  Abortado. Ejecuta los tests primero: menu GO-PES v2 -> Ejecutar tests" -ForegroundColor Red
    exit 1
}

$chk2 = Read-Host "  [2/3] Verificaste manualmente los modulos principales en DEV? (s/n)"
if ($chk2 -ne 's') {
    Write-Host "  Abortado. Verifica dashboard, ingreso, buscar y avance en el entorno DEV." -ForegroundColor Red
    exit 1
}

$chk3 = Read-Host "  [3/3] Avisaste al equipo del despliegue? (s/n)"
if ($chk3 -ne 's') {
    Write-Host "  Abortado. Notifica al equipo antes de desplegar en PROD." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  Pre-flight OK. Continuando con el despliegue..." -ForegroundColor Green
Write-Host ""

$currentVersion = [regex]::Match((Get-Content $mainJs -Raw), "VERSION:\s*'([^']+)'").Groups[1].Value
Write-Host "Version actual: $currentVersion" -ForegroundColor White

$newVersion = Read-Host "Nueva version (Enter para mantener '$currentVersion')"
if ([string]::IsNullOrWhiteSpace($newVersion)) { $newVersion = $currentVersion }

$hash = git -C "$PSScriptRoot\go-pes-local" rev-parse --short HEAD 2>$null
if (-not $hash) { $hash = 'prod' }
$date = Get-Date -Format 'yyyyMMdd'

Write-Host ""
Write-Host "  Version: $newVersion" -ForegroundColor White
Write-Host "  Build:   $hash" -ForegroundColor White
Write-Host "  Fecha:   $date" -ForegroundColor White
Write-Host "  Entorno: PROD" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "ATENCION: Esto desplegara en PRODUCCION. Escribi 'prod' para confirmar"
if ($confirm -ne 'prod') {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit 0
}

(Get-Content $mainJs) `
  -replace "(VERSION:\s*')[^']*(')", "`${1}$newVersion`$2" `
  -replace "(BUILD:\s*')[^']*(')", "`${1}$hash`$2" `
  -replace "(BUILD_DATE:\s*')[^']*(')", "`${1}$date`$2" `
  -replace "(ENVIRONMENT:\s*')[^']*(')", "`${1}PROD`$2" `
| Set-Content $mainJs -Encoding utf8

Set-Location "$PSScriptRoot\go-pes-local"
Write-Host "[PROD] Subiendo codigo al entorno de produccion..." -ForegroundColor Magenta
clasp -u prod -P .clasp.prod.json push
if ($LASTEXITCODE -eq 0) {
    Write-Host "[PROD] Push exitoso." -ForegroundColor Green
} else {
    Write-Host "[PROD] Error en el push. Revisa la autenticacion con: clasp -u prod show-authorized-user" -ForegroundColor Red
}
