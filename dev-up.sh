#!/bin/bash
# Sobe o ambiente de desenvolvimento completo do GestaSports:
# Postgres (docker) -> migrations -> seed -> backend -> frontend.
#
# Uso:
#   ./dev-up.sh            inicia tudo e roda o seed (recria os dados demo)
#   ./dev-up.sh --no-seed  inicia tudo sem popular/resetar o banco
#
# O Vite do frontend exige Node 20.19+/22.12+; se o Node ativo no shell for
# mais antigo, o script procura uma versão compatível instalada via nvm.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

RUN_SEED=1
if [[ "${1:-}" == "--no-seed" ]]; then
  RUN_SEED=0
fi

echo "==> Subindo PostgreSQL..."
if docker inspect flamilha-postgres >/dev/null 2>&1; then
  docker start flamilha-postgres >/dev/null
else
  docker compose up -d postgres
fi

echo -n "==> Aguardando PostgreSQL aceitar conexoes"
for _ in $(seq 1 30); do
  if docker exec flamilha-postgres pg_isready -U postgres >/dev/null 2>&1; then
    echo " OK"
    break
  fi
  echo -n "."
  sleep 1
done

echo "==> Gerando Prisma Client e aplicando migrations..."
npx prisma generate
npx prisma migrate deploy

if [[ "$RUN_SEED" -eq 1 ]]; then
  echo "==> Populando banco (seed)..."
  npm run prisma:seed
else
  echo "==> Seed pulado (--no-seed)"
fi

# Node do frontend: precisa 20.19+/22.12+; troca via nvm se necessario.
FRONTEND_NODE_BIN="node"
if ! node -e 'process.exit(process.versions.node.split(".").map(Number)[0] >= 20 ? 0 : 1)' 2>/dev/null; then
  if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    source "$HOME/.nvm/nvm.sh"
    COMPATIBLE_VERSION=$(nvm ls --no-colors 2>/dev/null | grep -oE 'v(2[0-9]|[3-9][0-9])\.[0-9]+\.[0-9]+' | sort -V | tail -1)
    if [[ -n "$COMPATIBLE_VERSION" ]]; then
      nvm use "$COMPATIBLE_VERSION" >/dev/null
      FRONTEND_NODE_BIN="$(nvm which "$COMPATIBLE_VERSION")"
      echo "==> Node atual e antigo para o Vite; usando $COMPATIBLE_VERSION para o frontend"
    else
      echo "AVISO: nenhum Node >=20 encontrado via nvm; o Vite pode falhar." >&2
    fi
  else
    echo "AVISO: Node atual < 20 e nvm nao encontrado; o Vite pode falhar." >&2
  fi
fi

PIDS=()

cleanup() {
  echo ""
  echo "==> Encerrando servidores..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "==> Iniciando backend (http://localhost:3333)..."
npm run dev &
PIDS+=("$!")

echo "==> Iniciando frontend (http://localhost:5173)..."
(cd frontend && "$FRONTEND_NODE_BIN" node_modules/.bin/vite --config vite.config.mjs --configLoader native) &
PIDS+=("$!")

echo ""
echo "================================================"
echo " Backend:  http://localhost:3333"
echo " Frontend: http://localhost:5173"
echo " Usuarios demo (senha: GestaSports@2026):"
echo "   superadmin@gestasports.com      (SUPERADMIN)"
echo "   admin@gestasports.com.br        (ADMIN)"
echo "   financeiro@gestasports.com.br   (FINANCIAL)"
echo "   atleta@gestasports.com.br       (ATHLETE)"
echo "================================================"
echo ""

wait
