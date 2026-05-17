# =============================================================
# Copia a pasta HANDOFF inteira do Claude para D:\PAULO\PROJETOS\
# =============================================================
# Execute UMA VEZ. Cria D:\PAULO\PROJETOS\taxflow-advisor-completo\
# com tudo organizado.
# =============================================================

$origem = "$env:LOCALAPPDATA\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\local-agent-mode-sessions\66debb3b-c8f2-419f-8df0-48549180724b\da5b820b-6844-4288-8e00-31611b99f0c2\local_0b4e1c64-6023-470a-90b6-71f7bf43a270\outputs\handoff"
$destino = "D:\PAULO\PROJETOS\taxflow-advisor-completo"

if (-not (Test-Path $origem)) {
    Write-Host "ERRO: Pasta handoff nao encontrada em:" -ForegroundColor Red
    Write-Host "  $origem" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TAXFLOW ADVISOR - Copia para PROJETOS" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Cria pasta de destino
New-Item -ItemType Directory -Path "D:\PAULO\PROJETOS" -Force | Out-Null
if (Test-Path $destino) {
    $resp = Read-Host "Pasta destino ja existe. Sobrescrever? (s/N)"
    if ($resp -ne "s") {
        Write-Host "Cancelado." -ForegroundColor Yellow
        exit 0
    }
    Remove-Item $destino -Recurse -Force
}
New-Item -ItemType Directory -Path $destino | Out-Null

# Copia tudo (excluindo node_modules)
Write-Host "Copiando arquivos..." -ForegroundColor Cyan
robocopy $origem $destino /E /XD node_modules .next /XF tsconfig.tsbuildinfo /NFL /NDL /NJH /NJS

Write-Host ""
Write-Host "Estrutura final em $destino" -ForegroundColor Green
Write-Host ""
Get-ChildItem $destino -Directory | ForEach-Object {
    Write-Host "  $($_.Name)/" -ForegroundColor Yellow
    Get-ChildItem $_.FullName -File | Select-Object -First 5 | ForEach-Object {
        Write-Host "    $($_.Name)"
    }
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  PRONTO" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pasta completa em: $destino" -ForegroundColor White
Write-Host ""
Write-Host "Por onde comecar:" -ForegroundColor Yellow
Write-Host "  1. Leia 00_LEIA_PRIMEIRO.md" -ForegroundColor White
Write-Host "  2. Leia 04_guias\EXPLICACAO_SIMPLES.md" -ForegroundColor White
Write-Host "  3. Para rodar o MVP: 04_guias\COMO_RODAR.md" -ForegroundColor White
Write-Host ""
