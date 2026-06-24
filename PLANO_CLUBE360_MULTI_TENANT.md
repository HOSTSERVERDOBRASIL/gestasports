# GestaSports - Plano multi-tenant

## Objetivo

Transformar o sistema atual em uma plataforma SaaS locavel para clubes. GestaSports e a marca da plataforma, enquanto cada clube, como Flamilha, opera em ambiente proprio.

## Modelo desejado

- `gestasports.com.br`: control plane e superadmin.
- `flamilha.gestasports.com.br`: ambiente do cliente Flamilha.
- `outroclube.gestasports.com.br`: ambiente de outro cliente.
- Cada cliente tem login, usuarios, configuracoes, marca, cobranca, convites, jogos, financeiro e historico proprios.

## Base ja preparada

- Cadastro de tenants em `OrganizationTenant`.
- Cadastro de dominios e subdominios em `TenantDomain`.
- Cobrancas SaaS em `SaaSCharge`.
- Endpoint publico `/api/tenant/current` para resolver o clube pelo dominio.
- Login visual carregando marca/cores do tenant atual.
- Token e perfil ativo separados por hostname no navegador.
- Cliente piloto Flamilha apontado para `flamilha.gestasports.com.br`.

## Proxima etapa obrigatoria

Adicionar `tenantId` nas tabelas operacionais antes de vender para varios clubes no mesmo banco:

- `User`
- `Associate`
- `Athlete`
- `GroupSettings`
- `PaymentSettings`
- `Payment`
- `FinancialEntry`
- `Game`
- `GameLineup`
- `GameEvent`
- `GoalkeeperContract`
- `MediaAsset`
- `AuditLog`
- tabelas auxiliares ligadas a essas entidades

Depois disso, todos os endpoints devem filtrar por `request.tenant.id`, e o login deve autenticar por `email + tenantId`, permitindo o mesmo email em clubes diferentes.

## Alternativa com banco separado

Se cada cliente usar um `DATABASE_URL` separado, o control plane continua no banco principal e as rotas do clube precisam escolher o Prisma client correto pelo dominio. Esse caminho isola melhor os dados, mas exige pool de conexoes e provisionamento de banco por cliente.
