# Inicialização rápida - GestaSports

Use este guia para subir o ambiente local da plataforma GestaSports.

## Requisitos

- Node.js 22+
- Docker Desktop
- PostgreSQL via `docker-compose.yml`

## Iniciar tudo

Opção recomendada no Windows:

```powershell
powershell -ExecutionPolicy Bypass -File INIT.ps1
```

Ou manualmente:

```powershell
npm install
npm --prefix frontend install
docker-compose up -d postgres
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
```

Em dois terminais:

```powershell
npm run dev
```

```powershell
npm run frontend:dev
```

## Acessos

- Frontend: http://localhost:5173
- Backend/API: http://localhost:3333
- Healthcheck: http://localhost:3333/health

## Contexto do produto

GestaSports é a plataforma SaaS. Cada clube cadastrado funciona como tenant independente, com usuários, dados, módulos e configurações próprias.

O clube Flamilha permanece como cliente piloto/demonstração, mas não deve ser tratado como o produto inteiro.
