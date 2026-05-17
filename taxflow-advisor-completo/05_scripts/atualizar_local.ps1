# =============================================================
# Atualiza o app TaxFlow Advisor em D:\PAULO\PROJETOS\
# com as mudancas mais recentes do diretorio de outputs do Claude
# =============================================================

$origem = "$env:LOCALAPPDATA\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\local-agent-mode-sessions\66debb3b-c8f2-419f-8df0-48549180724b\da5b820b-6844-4288-8e00-31611b99f0c2\local_0b4e1c64-6023-470a-90b6-71f7bf43a270\outputs\taxflow-web"
$destino = "D:\PAULO\PROJETOS\taxflow-advisor"

if (-not (Test-Path $origem)) {
    Write-Host "ERRO: Pasta de origem nao encontrada." -ForegroundColor Red
    Write-Host "Caminho esperado: $origem" -ForegroundColor Yellow
    Write-Host "Verifique se a sessao do Claude ainda esta aberta." -ForegroundColor Yellow
    exit 1
}

Write-Host "Atualizando $destino..." -ForegroundColor Cyan
robocopy $origem $destino /E /XD node_modules .next /XF tsconfig.tsbuildinfo tsconfig.test.json /NFL /NDL /NJH /NJS

Write-Host ""
Write-Host "Arquivos modificados recentemente:" -ForegroundColor Green
Get-ChildItem -Path $destino -Recurse -File -Include "*.tsx", "*.ts", "*.json", "*.md" |
    Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\.next" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 10 |
    ForEach-Object { Write-Host "  $($_.LastWriteTime.ToString('HH:mm:ss')) $($_.Name)" }

Write-Host ""
Write-Host "Pronto. Para rodar:" -ForegroundColor Yellow
Write-Host "  cd $destino" -ForegroundColor White
Write-Host "  npm run dev -- -p 3333" -ForegroundColor White
Write-Host ""
Write-Host "Se o servidor ja esta rodando, basta dar F5 no navegador." -ForegroundColor Green
