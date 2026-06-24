# SPEC de Correcoes do Codigo - GestaSports

Data: 2026-06-05

## 1. Objetivo

Consolidar o estado atual do codigo e transformar os problemas encontrados em uma fila objetiva de correcoes. Esta spec complementa `SPEC_EVOLUCAO_V2_GESTASPORTS.md`: a v2 continua sendo a visao de produto; este documento e a trilha pratica para estabilizar codigo, build, seguranca multi-tenant e UX.

Esta spec tambem deve ser executada antes da expansao descrita em `SPEC_ARQUITETURA_ENTERPRISE_GESTASPORTS.md`, que consolida a visao de plataforma para clubes, associacoes, ligas, federacoes, escolinhas, multiesportes, portal publico e mobile.

## 2. Inventario rapido do projeto

### Backend

- Stack: TypeScript, Fastify, Prisma, PostgreSQL, Zod, JWT.
- Entrada principal: `src/server.ts`.
- Prisma client e escopo multi-tenant: `src/lib/prisma.ts`.
- Contexto de tenant: `src/modules/tenancy/tenant-context.ts`.
- Resolucao de tenant por host/subdominio/header: `src/modules/tenancy/tenant.plugin.ts`.
- Auth e usuarios: `src/modules/auth/auth.routes.ts` e `src/modules/auth/auth.plugin.ts`.
- Modulos principais:
  - `associates`
  - `athletes`
  - `finance`
  - `sports`
  - `clubs`
  - `gallery`
  - `dashboard`
  - `group`
  - `audit`
  - `superadmin`
  - `tenancy`

### Frontend

- Stack: React, TypeScript, Vite, React Query, Tailwind, Recharts, lucide-react.
- Entrada: `frontend/src/main.tsx`.
- Rotas: `frontend/src/routes/AppRoutes.tsx`.
- Layout autenticado: `frontend/src/layouts/AppLayout.tsx`.
- Navegacao: `frontend/src/data/navigation.ts`.
- Cliente API: `frontend/src/services/api.ts`.
- Paginas densas:
  - `frontend/src/pages/OperationsPages.tsx`
  - `frontend/src/pages/SuperadminPage.tsx`
  - `frontend/src/pages/DashboardPage.tsx`
  - `frontend/src/pages/FinanceiroPage.tsx`
  - `frontend/src/pages/AthletesPage.tsx`
- Componente aberto no IDE: `frontend/src/components/ui/FullPitchBoard.tsx`.

### Banco e scripts

- Schema: `prisma/schema.prisma`.
- Migrations: `prisma/migrations`.
- Seed atual: `prisma/seed.ts`.
- Seed legado provavel: `prisma/seed.js`.
- Scripts operacionais:
  - `scripts/provision-tenant.ts`
  - `scripts/ensure-superadmin-pilot.ts`
  - `scripts/rename-pilot-flamilia.ts`

## 3. Diagnostico executado

Comandos rodados:

- `npm run build`: passou.
- `npx prisma validate`: passou.
- `npm --prefix frontend run typecheck`: passou.
- `npm --prefix frontend run lint`: falhou com 2 erros e 10 warnings.
- `npm run frontend:build`: falhou ao carregar dependencia nativa do Tailwind/Vite no Windows.

### Resultado tecnico

- Backend TypeScript esta compilando.
- Prisma schema esta valido.
- Frontend TypeScript esta compilando.
- Frontend lint tem erro real em `frontend/src/pages/SuperadminPage.tsx`.
- Frontend build esta bloqueado por ambiente/dependencia nativa:
  - `@tailwindcss/oxide-win32-x64-msvc`
  - `spawn EPERM`

## 4. Problemas prioritarios

### P0 - Padrao visual deve seguir a tela de Associados

Arquivo/modelo: `frontend/src/pages/OperationsPages.tsx`, funcao `AssociadosPageReal`.

Diretriz obrigatoria:

- A tela de `Associados` e o modelo para as demais telas operacionais.
- Modelo significa: formato dos KPIs, filtros, tabela/lista, icones de acao, acoes compactas por linha, legenda de status, separacao entre listagem e formulario.
- Telas densas nao devem misturar varias funcoes no mesmo bloco visual.
- Cada area deve ter acoes bem separadas: exemplo no financeiro, `Lancamentos`, `Cobranca`, `Mensalidades`, `Relatorios` e `Configuracoes` nao devem parecer uma tela unica.

Correcao esperada:

- Usar topo padrao: titulo, subtitulo, KPIs compactos, filtros e acoes principais.
- Usar tabs/segmentos logo depois do topo para separar funcoes.
- Usar tabela/lista com acoes por icone quando houver itens repetidos.
- Formularios devem abrir em modo proprio, como `Novo associado` / `Editar associado`.
- Financeiro deve deixar claro onde o usuario esta: extrato, novo lancamento, cobranca, relatorios ou configuracoes.

Criterio de aceite:

- Usuario consegue identificar a funcao atual da tela sem procurar no meio de varios cards.
- As acoes principais ficam agrupadas no contexto certo.
- Financeiro nao abre com todas as funcoes misturadas antes das abas.
- Novas telas seguem o modelo de `Associados` como contrato visual.

### P0 - Lint bloqueando qualidade do frontend

Arquivo: `frontend/src/pages/SuperadminPage.tsx`

Problema:

- Linha aproximada 927 usa `false && managementView !== "NEW"`, gerando `no-constant-condition` e `no-constant-binary-expression`.
- Isso indica bloco morto ou feature desativada manualmente dentro do JSX.

Correcao esperada:

- Remover o bloco morto se nao for mais usado.
- Ou substituir por uma condicao real de produto, por exemplo uma flag nomeada (`showLegacyClientList`) ou um estado de tela valido.
- O lint deve rodar sem erros.

Criterio de aceite:

- `npm --prefix frontend run lint` nao retorna erros.

### P0 - Build do frontend bloqueado por dependencia nativa

Arquivo/area: `frontend/node_modules`, `frontend/package-lock.json`, `frontend/vite.config.ts`, dependencias do Vite/Tailwind.

Problema:

- `npm run frontend:build` falha antes de compilar o app:
  - nao consegue carregar `tailwindcss-oxide.win32-x64-msvc.node`;
  - erro adicional `spawn EPERM`.

Hipoteses provaveis:

- instalacao corrompida/incompleta de dependencia opcional nativa;
- bloqueio do Windows/antivirus/permissao em binario `.node`;
- combinacao instavel de Vite 8, Tailwind 4 e pacote nativo no ambiente local.

Correcao esperada:

- Reinstalar dependencias do frontend de forma limpa.
- Confirmar se `@tailwindcss/oxide-win32-x64-msvc` foi instalado corretamente.
- Se persistir, avaliar travar versoes conhecidas ou ajustar a dependencia do plugin Tailwind/Vite.

Criterio de aceite:

- `npm run frontend:build` conclui e gera `frontend/dist`.

### P0 - Encoding quebrado em textos

Arquivos afetados visiveis:

- `frontend/src/data/navigation.ts`
- `frontend/src/pages/SuperadminPage.tsx`
- `src/modules/auth/auth.routes.ts`
- `src/server.ts`
- Possivelmente outros arquivos com textos em portugues.

Problema:

- Há textos com mojibake, por exemplo `Operação`, `Configurações`, `Observações`, `Usuário`.
- Isso afeta UX, emails, mensagens de erro e manutencao.

Correcao esperada:

- Padronizar arquivos como UTF-8.
- Corrigir strings quebradas visiveis no frontend e API.
- Validar telas principais e respostas de erro.

Criterio de aceite:

- Busca por sinais de codificação quebrada não retorna ocorrências em código fonte, exceto casos tecnicamente justificados.
- UI e mensagens da API aparecem com acentos corretos.

### P1 - TenantId ainda opcional em muitas tabelas operacionais

Arquivo: `prisma/schema.prisma`

Problema:

- Muitas tabelas operacionais ainda usam `tenantId String?`.
- Exemplos: `User`, `Associate`, `Athlete`, `Game`, `Payment`, `FinancialEntry`, `MediaAsset`, `AuditLog`, `GroupSettings`, `PaymentSettings`.
- A spec v2 ja define que dados operacionais devem ter tenant obrigatorio.

Risco:

- Dados legados ou criacoes sem contexto podem ficar globais por acidente.
- Superadmin e clube podem misturar dados se houver bypass ou rota publica mal filtrada.

Correcao esperada:

- Criar migracao em duas etapas:
  1. preencher `tenantId` legado com tenant piloto/default;
  2. tornar `tenantId` `NOT NULL` nas tabelas operacionais.
- Manter globais apenas modelos realmente SaaS/plataforma.

Criterio de aceite:

- Tabelas operacionais criticas nao aceitam `tenantId` nulo.
- Seed e scripts criam todos os dados com tenant.
- Rotas operacionais continuam funcionando.

### P1 - Transacoes Prisma podem furar escopo multi-tenant

Arquivos afetados:

- Rotas que usam `prisma.$transaction(async (tx) => ...)`.
- Exemplos visiveis em `auth.routes.ts`, `athletes.routes.ts`, `sports.service.ts`, `group.routes.ts`.

Problema:

- O Prisma client extendido em `src/lib/prisma.ts` aplica tenant automaticamente nas chamadas via `prisma`.
- E preciso confirmar se o `tx` recebido dentro de transacoes preserva o mesmo extension/escopo.
- Mesmo quando preserva, algumas operacoes usam `findUnique`/`update` por `id`, e hoje o schema ainda permite `tenantId` nulo.

Correcao esperada:

- Criar testes de isolamento multi-tenant para leituras, updates, deletes e transacoes.
- Nos fluxos sensiveis, preferir `updateMany`/`deleteMany` com escopo ou validacao previa do tenant.
- Auditar operacoes que conectam por `associateId`, `athleteId`, `gameId` para garantir que o registro pertence ao tenant atual.

Criterio de aceite:

- Um tenant nao consegue ler, alterar, associar ou deletar dados de outro tenant.
- Testes cobrem transacoes com `tx`.

### P1 - Rotas publicas de convite e recuperacao precisam ser escopadas por tenant

Arquivo: `src/modules/auth/auth.routes.ts`

Problemas observados:

- `/auth/invite` e `/auth/invite-register` usam `groupSettings.findFirst()`.
- `/auth/invite-register` consulta usuario e associado por email sem filtro explicito no codigo.
- A extensao de tenant pode resolver quando `request.tenant` existe, mas em host local/plataforma sem header de tenant o fluxo pode ficar ambiguo.
- `/auth/password/forgot` consulta por email sem exigir tenant, podendo selecionar usuario errado quando o mesmo email existir em varios clubes.

Correcao esperada:

- Exigir tenant resolvido para convite de clube.
- Recuperacao de senha deve usar tenant atual quando for usuario de clube.
- Superadmin global continua permitido apenas em contexto de plataforma.
- Retornar erro claro quando tenant nao puder ser determinado.

Criterio de aceite:

- Mesmo email em dois clubes recupera senha apenas no clube correto.
- Convite sem tenant resolvido nao cria usuario solto.

### P1 - Navegacao separada existe, mas precisa revisao de rotas protegidas

Arquivos:

- `frontend/src/data/navigation.ts`
- `frontend/src/routes/AppRoutes.tsx`
- `frontend/src/layouts/AppLayout.tsx`

Estado atual:

- A navegacao ja separa `SAAS` e `CLUB`.
- `AppRoutes.tsx` ainda registra `/superadmin` dentro do mesmo layout geral.
- A visibilidade do menu nao garante, sozinha, bloqueio de rota.

Correcao esperada:

- Garantir bloqueio por role no nivel de rota, nao apenas sidebar.
- Superadmin nao deve entrar em rotas operacionais do clube sem contexto explicito.
- Usuario de clube nao deve acessar `/superadmin` digitando URL.

Criterio de aceite:

- Teste manual ou automatizado confirma redirect/403 por role.

### P2 - Warnings de hooks React

Arquivos:

- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/pages/OperationsPages.tsx`
- `frontend/src/pages/SuperadminPage.tsx`

Problemas:

- Dependencias instaveis em `useMemo`/`useEffect`.
- `selectedGame` faltando em dependencias.
- Arrays/objetos fallback criados a cada render.

Correcao esperada:

- Memoizar fallbacks (`effectiveRoles`, `effectiveModules`, `groupSettings`, `tenants`, `plans`).
- Ajustar dependencias dos efeitos ou mover calculos para dentro dos callbacks.

Criterio de aceite:

- `npm --prefix frontend run lint` sem warnings de hooks, ou warnings restantes documentados.

### P2 - Arquivos grandes demais dificultam manutencao

Arquivos principais:

- `frontend/src/pages/OperationsPages.tsx`
- `frontend/src/pages/SuperadminPage.tsx`
- Possivelmente `src/modules/athletes/athletes.routes.ts` e `src/modules/finance/finance.routes.ts`.

Problema:

- Paginas e rotas acumulam muitos fluxos em um arquivo.
- Isso aumenta risco de regressao e torna dificil corrigir UI/tenant/permissao.

Correcao esperada:

- Extrair subcomponentes por aba/fluxo.
- Extrair schemas/helpers de rotas backend.
- Comecar por partes com maior mudanca: jogos, escalacao, financeiro, superadmin.

Criterio de aceite:

- Componentes principais ficam focados em orquestracao.
- Subcomponentes recebem props tipadas e testaveis.

### P2 - Vermelho usado como identidade/decoracao

Arquivos afetados:

- `frontend/src/components/ui/StatCard.tsx`
- `frontend/src/pages/OperationsPages.tsx`
- `prisma/seed.ts`
- `scripts/ensure-superadmin-pilot.ts`
- Configuracoes de tema do tenant piloto.

Problema:

- A spec v2 pede vermelho reservado para erro/suspensao/cancelamento/alerta grave.
- O produto ainda usa vermelho como cor primaria do clube/piloto e em botoes/estados neutros.

Correcao esperada:

- Separar cor de marca do clube de estados semanticos.
- Manter vermelho nos uniformes quando for dado do clube/time, mas nao como padrao de UI.
- Trocar botoes primarios de operacao para cor institucional neutra/azul/verde conforme contexto.

Criterio de aceite:

- UI nao usa vermelho para acao normal ou decoracao.
- Vermelho permanece apenas em erro, perigo, suspensao, cancelamento, inadimplencia grave ou uniforme configurado.

## 5. Ordem recomendada de execucao

1. Corrigir lint P0 em `SuperadminPage.tsx`.
2. Corrigir encoding dos textos mais visiveis.
3. Resolver build do frontend no ambiente Windows.
4. Proteger rotas por role no frontend e backend.
5. Fechar fluxo de convite/recuperacao por tenant.
6. Criar testes de isolamento multi-tenant.
7. Migrar `tenantId` operacional para obrigatorio.
8. Refatorar paginas e rotas grandes por modulo.
9. Ajustar vermelho e padrao visual v2.
10. Preparar o menu atual para virar motor dinamico de modulos, conforme `SPEC_ARQUITETURA_ENTERPRISE_GESTASPORTS.md`.

## 6. Definicao de pronto desta spec

Esta spec sera considerada concluida quando:

- `npm run build` passa.
- `npm --prefix frontend run typecheck` passa.
- `npm --prefix frontend run lint` passa sem erros.
- `npm run frontend:build` passa.
- Prisma valida e migrations aplicam em banco limpo.
- Rotas sensiveis respeitam tenant e role.
- Textos em portugues aparecem sem mojibake.
- Tenant operacional nao fica nulo em dados novos.
- Ha pelo menos um conjunto de testes ou checklist reprodutivel provando isolamento entre dois tenants.
