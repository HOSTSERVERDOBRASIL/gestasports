# GestaSports

Plataforma full stack para gestão de clubes esportivos. O sistema nasceu no ambiente Flamilha, mas a arquitetura atual é multi-clube: o GestaSports atua como base SaaS e permite cadastrar clubes independentes, cada um com seus próprios usuários, módulos, dados operacionais e identidade visual.

## Ideia central

- GestaSports: camada principal da plataforma, administração SaaS e controle dos clubes.
- Clubes independentes: cada tenant opera seu próprio ambiente sem misturar dados com outros clubes.
- Módulos do clube: financeiro, associados, atletas, jogos, estatísticas, histórico, galeria, uniformes e configurações.
- Superadmin: gestão dos clubes/tenants, planos, status comercial, módulos habilitados e parametrizações globais.

## Stack

- Backend: TypeScript, Fastify, Prisma, PostgreSQL, Zod e JWT.
- Frontend: React, TypeScript, Vite, React Query, Recharts e Tailwind.
- Banco: Prisma migrations em PostgreSQL.

## Estrutura viva

```text
src/
  server.ts                    # API Fastify e registro dos módulos
  config/
  lib/
  modules/
    auth/
    tenancy/
    superadmin/
    associates/
    athletes/
    finance/
    sports/
    dashboard/
    gallery/
    group/
    audit/
prisma/
  schema.prisma
  migrations/
  seed.ts
frontend/
  src/
    routes/
    layouts/
    pages/
    components/
    services/
    hooks/
    context/
    types/
    utils/
scripts/
  provision-tenant.ts
  ensure-superadmin-pilot.ts
  rename-pilot-flamilia.ts
```

## Rotas importantes

- Frontend principal: `frontend/src/routes/AppRoutes.tsx`
- Layout autenticado: `frontend/src/layouts/AppLayout.tsx`
- Painel superadmin: `frontend/src/pages/SuperadminPage.tsx`
- Financeiro do clube: `frontend/src/pages/FinanceiroPage.tsx`
- API financeira: `src/modules/finance/finance.routes.ts`
- API de tenants/clubes: `src/modules/tenancy/tenant.routes.ts`
- API superadmin: `src/modules/superadmin/superadmin.routes.ts`

## Rodar localmente

```bash
npm install
npm --prefix frontend install
docker-compose up -d postgres
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
```

Em terminais separados:

```bash
npm run dev
npm run frontend:dev
```

URLs:

- Frontend: http://localhost:5173
- API: http://localhost:3333
- Healthcheck: http://localhost:3333/health

## Comandos úteis

```bash
npm run build
npm run frontend:build
npm run build:all
npm run check
npm run tenant:provision
```

## Produção

Antes de subir, crie um `.env.production` a partir de `.env.production.example` e configure:

- `NODE_ENV=production`
- `DATABASE_URL` de um PostgreSQL gerenciado com backup e SSL
- `JWT_SECRET` forte e único
- `SAAS_APP_HOST` com o domínio principal
- `CORS_ORIGINS` apenas para domínios customizados que não sejam subdomínios do `SAAS_APP_HOST`
- SMTP e provedor financeiro, quando usados em produção

Fluxo recomendado:

```bash
npm ci
npm --prefix frontend ci
npm run prisma:generate
npm run build:all
npm run prisma:migrate:deploy
npm run start
```

Com Docker:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d
```

Checklist mínimo antes de expor cliente real:

- domínio com HTTPS ativo;
- `/health` respondendo `database: connected`;
- backup automático do banco validado;
- usuário superadmin criado com senha forte;
- `JWT_SECRET` diferente do valor de desenvolvimento;
- CORS restrito ao domínio da plataforma e domínios customizados;
- `prisma migrate deploy` executado sem erro;
- login, financeiro, jogos, acervo, permissões e superadmin testados em ambiente limpo.

Documentos operacionais:

- `docs/pre-producao-lancamento.md`: checklist antes de liberar cliente real.
- `docs/implantacao-assistida.md`: roteiro de venda, demo e onboarding.
- `docs/runbook-producao.md`: deploy, healthcheck, logs, backup e incidente.
- `docs/billing-saas-runbook.md`: cobrança SaaS assistida antes do gateway recorrente.
- `docs/lgpd-e-contratos.md`: base de privacidade, contratos e solicitações LGPD.

## Nota de manutenção

Arquivos de protótipo estático, logs locais e builds gerados não fazem parte da estrutura principal. A manutenção deve priorizar `src`, `frontend/src`, `prisma` e `scripts`.
