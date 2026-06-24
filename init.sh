#!/bin/bash
# Script para Linux/macOS
# Windows: veja INIT.ps1

echo "🚀 Iniciando Flamilha..."
echo ""

# 1. Docker
echo "[1/5] Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale em:"
    echo "   https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "✅ Docker OK"

# 2. PostgreSQL
echo ""
echo "[2/5] Iniciando PostgreSQL..."
docker-compose up -d postgres
sleep 15
echo "✅ PostgreSQL rodando"

# 3. Migrações
echo ""
echo "[3/5] Aplicando migrações..."
npx prisma migrate deploy
echo "✅ Migrações aplicadas"

# 4. Seed
echo ""
echo "[4/5] Populando dados..."
npm run prisma:seed
echo "✅ Dados inseridos"

# 5. Servidores
echo ""
echo "[5/5] Iniciando servidores..."
echo "✅ Backend: http://localhost:3333"
echo "✅ Frontend: http://localhost:5173"
echo ""
echo "================================"
echo "   Sistema Pronto!             "
echo "================================"
echo ""

# Iniciar em paralelo
npm run dev &
npm --prefix frontend run dev &

wait
