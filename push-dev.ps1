# push-dev.ps1 — Sube el código al entorno de desarrollo (p.e.ramos.ramos@gmail.com)
$mainJs = "$PSScriptRoot\go-pes-local\Main.js"
$hash = git -C "$PSScriptRoot\go-pes-local" rev-parse --short HEAD 2>$null
if (-not $hash) { $hash = 'dev' }
$date = Get-Date -Format 'yyyyMMdd'

(Get-Content $mainJs) `
  -replace "(BUILD:\s*')[^']*(')", "`${1}$hash`$2" `
  -replace "(BUILD_DATE:\s*')[^']*(')", "`${1}$date`$2" `
  -replace "(ENVIRONMENT:\s*')[^']*(')", "`${1}DEV`$2" `
| Set-Content $mainJs -Encoding utf8

Set-Location "$PSScriptRoot\go-pes-local"
Write-Host "[DEV] Subiendo codigo al entorno de desarrollo..." -ForegroundColor Cyan
clasp -u dev push
if ($LASTEXITCODE -eq 0) {
    Write-Host "[DEV] Push exitoso. Abre la web app en el spreadsheet de prueba." -ForegroundColor Green
} else {
    Write-Host "[DEV] Error en el push. Revisa la autenticacion con: clasp -u dev show-authorized-user" -ForegroundColor Red
}
