# Script de Inicialização Completa - Flamilha Sistema
# Execute este script para inicializar tudo automaticamente

Write-Host "================================" -ForegroundColor Cyan
Write-Host "   Flamilha - Inicialização     " -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Docker
Write-Host "[1/5] Verificando Docker..." -ForegroundColor Yellow
$dockerRunning = docker version 2>&1 | Select-String "Version" -Quiet
if (-not $dockerRunning) {
    Write-Host "  ⚠️  Docker não está rodando. Tentando iniciar..." -ForegroundColor Yellow
    $dockerPath = "C:\Program Files\Docker\Docker\Docker.exe"
    if (Test-Path $dockerPath) {
        Write-Host "  → Abrindo Docker Desktop..." -ForegroundColor Cyan
        Start-Process $dockerPath -WindowStyle Minimized
        Write-Host "  ⏳ Aguardando Docker inicializar (30 segundos)..." -ForegroundColor Cyan
        Start-Sleep -Seconds 30
    } else {
        Write-Host "  ❌ Docker Desktop não encontrado. Por favor, instale Docker Desktop." -ForegroundColor Red
        Write-Host "     https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
        exit 1
    }
}
Write-Host "  ✅ Docker está pronto" -ForegroundColor Green

# 2. Subir PostgreSQL
Write-Host "`n[2/5] Iniciando PostgreSQL..." -ForegroundColor Yellow
cd "d:\Sistema de Futebol Flamilha"
docker-compose up -d postgres 2>&1 | ForEach-Object { Write-Host "  → $_" -ForegroundColor Gray }
Write-Host "  ⏳ Aguardando PostgreSQL inicializar (15 segundos)..." -ForegroundColor Cyan
Start-Sleep -Seconds 15
Write-Host "  ✅ PostgreSQL iniciado" -ForegroundColor Green

# 3. Aplicar migrações
Write-Host "`n[3/5] Aplicando migrações do banco de dados..." -ForegroundColor Yellow
npx prisma migrate deploy 2>&1 | ForEach-Object { Write-Host "  → $_" -ForegroundColor Gray }
Write-Host "  ✅ Migrações aplicadas" -ForegroundColor Green

# 4. Seed do banco
Write-Host "`n[4/5] Populando dados iniciais..." -ForegroundColor Yellow
npm run prisma:seed 2>&1 | ForEach-Object { Write-Host "  → $_" -ForegroundColor Gray }
Write-Host "  ✅ Dados iniciais inseridos" -ForegroundColor Green

# 5. Iniciar backend e frontend
Write-Host "`n[5/5] Iniciando servidores..." -ForegroundColor Yellow
Write-Host "  → Backend iniciando em http://localhost:3333" -ForegroundColor Cyan
Write-Host "  → Frontend iniciando em http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "   ✅ Sistema Pronto!           " -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Iniciar em paralelo
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Sistema de Futebol Flamilha'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Sistema de Futebol Flamilha\frontend'; npm run dev"

Write-Host "✅ Backend e Frontend iniciados em novas janelas" -ForegroundColor Green
Write-Host "   Verifique as janelas abertas para logs" -ForegroundColor Gray
