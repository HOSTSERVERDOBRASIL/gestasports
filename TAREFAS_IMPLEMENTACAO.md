# Lista de Tarefas de Implementação — GestaSports

> Documento acionável para implementação incremental. Cada tarefa tem contexto técnico suficiente
> para execução autônoma por um agente Claude. Execute uma tarefa por vez, marque `[x]` ao
> concluir e faça commit antes de passar para a próxima.
>
> Referências: [AUDITORIA_MODULOS_BACKEND.md](AUDITORIA_MODULOS_BACKEND.md) ·
> [MEMORIA_CALCULO_BACKEND.md](MEMORIA_CALCULO_BACKEND.md) ·
> [CUSTO_CRONOGRAMA_FRONT_BACK.md](CUSTO_CRONOGRAMA_FRONT_BACK.md)
>
> Estimativa total: **252h core** · **R$ 7.560** a R$30/h (sem opcionais e sem contingência).

---

## BLOCO 0 — Segurança e Multi-tenancy (executar PRIMEIRO)

> Estes itens têm risco de vazamento de dado entre clubes. Nenhuma feature nova deve entrar
> antes de B0 estar 100% feito.

- [x] **T01 · Backend · ~12h** — Corrigir isolamento de tenant ~~em queries sem `tenantId`~~ (achado real, diferente do previsto)
  - **Revisão:** a auditoria original presumiu que `financialEntry.findMany`/`game.findMany`/etc. não tinham filtro de tenant. Na prática, `src/lib/prisma.ts` já injeta `tenantId` automaticamente em toda query desses models via `$extends` + `AsyncLocalStorage` (`tenantScopedModels`). O bug real era **anterior** a isso: `src/modules/tenancy/tenant.plugin.ts` resolve o tenant pelo header `Host`/`X-Tenant-Slug` (controlável pelo cliente) e, em `auth.plugin.ts`, esse tenant "do host" tinha precedência sobre o `tenantId` do JWT verificado. Um usuário autenticado do Tenant A podia forjar `X-Tenant-Slug: tenant-b` (ou o `Host`) e o backend escopava automaticamente todas as queries — e todos os `request.tenant?.id ?? request.user.tenantId` espalhados pelas rotas — para o Tenant B, usando o papel (role) do próprio token do atacante. Confirmado por teste manual (login real + replay do token com slug trocado).
  - **Correção aplicada:**
    - `auth.plugin.ts`: `applyAuthenticatedTenant` agora sempre usa o `tenantId` do JWT verificado (nunca o do host) para o `tenantContext`; nova função `isTenantMismatched` rejeita com **403** quando o tenant resolvido pelo host diverge do tenant do token (SUPERADMIN é exceção via bypass).
    - Callsites que liam `request.tenant?.id ?? request.user.tenantId` diretamente (em vez do contexto automático) tiveram a precedência invertida para `request.user.tenantId ?? request.tenant?.id` em: `auth.routes.ts`, `tenant.routes.ts`, `dashboard.routes.ts`, `events.routes.ts`, `sports.routes.ts`, `archive.routes.ts` (incluindo `ensureArchiveAccess` e as rotas de `MemorialCategory`, que usam `$queryRaw` e por isso não passam pela extensão automática do Prisma).
  - **Critério de aceite:** verificado — login real como ADMIN do Tenant A, replay do token contra `X-Tenant-Slug: tenant-b-test` em `GET /api/auth/users` retorna `403 {"message":"Token não pertence a este ambiente"}`; a mesma chamada com o slug correto retorna `200`.

- [x] **T02 · Backend · ~4h** — Rate limiting em rotas de autenticação — verificado: 11ª tentativa de login retorna `429` com `Retry-After: 900`.
  - **Arquivo:** `src/server.ts`, `src/modules/auth/auth.routes.ts`
  - **O que fazer:**
    1. Instalar: `npm install @fastify/rate-limit`
    2. Registrar plugin em `src/server.ts` com config padrão global.
    3. Aplicar rate limit específico nas rotas:
       - `POST /auth/login`: max 10 req / 15 min por IP
       - `POST /auth/password/forgot`: max 5 req / hora por IP
    4. Retornar 429 com header `Retry-After` em segundos.
  - **Critério de aceite:** Após 10 tentativas de login seguidas, a 11ª retorna 429.

- [x] **T03 · Backend · ~4h** — Assinatura HMAC-SHA256 no webhook PIX
  - **Implementado:** raw body capturado via `addContentTypeParser` escopado num child context só para essa rota; `expectedSig = HMAC-SHA256(timestamp + "." + rawBody, settings.providerWebhookSecret)` (a chave é o segredo **por tenant** já existente em `PaymentSettings`, não uma env var global — o texto original pedia `process.env.PIX_WEBHOOK_SECRET`, mas isso seria incorreto num sistema multi-tenant onde cada clube configura seu próprio segredo). Headers: `X-Gestasports-Webhook-Signature` (hex) e `X-Gestasports-Webhook-Timestamp` (unix seconds). Comparação com `crypto.timingSafeEqual`; janela de replay de 300s; 401 em qualquer falha. Substituiu o antigo compare direto (`!==`, sem proteção a replay) por `readWebhookSecret`.
  - **Critério de aceite:** verificado — assinatura válida sobre o body original passa; mesmo header de assinatura sobre body adulterado retorna 401; sem headers de assinatura retorna 401; assinatura válida com timestamp de 10min atrás retorna 401 (replay).
  - **Achado crítico durante a implementação (fora do escopo original de T03, corrigido em conjunto):** ao testar esta rota, descobri que o contexto de tenant (`AsyncLocalStorage`, usado pela extensão automática do Prisma em `src/lib/prisma.ts` para popular `tenantId` em creates/updates) **não sobrevivia a `request.jwtVerify()`** — confirmado empiricamente: qualquer rota autenticada que faz uma mutação (`POST`/`PATCH`) sem passar `tenantId` explicitamente na query estava gravando registros com `tenantId: null` (reproduzido com `POST /finance/entries`). Isso é mais grave que T01: não é um vazamento entre tenants, é **perda de dado** — o registro criado nunca aparece em nenhuma listagem porque não pertence a tenant nenhum, e uma auditoria de "linhas com tenantId nulo" (o script `npm run tenant:audit` já existe no projeto, sinal de que esse sintoma já tinha sido notado antes sem a causa raiz ser encontrada) encontraria esses registros.
    - **Causa raiz:** `auth.plugin.ts` chamava `request.jwtVerify()` e, na mesma função `preHandler`, tentava restabelecer o contexto de tenant logo em seguida. Comprovado por teste direto que isso quebra a propagação para a fase seguinte do Fastify (handler), mesmo a leitura imediata after o `enterWith()` mostrando o valor certo dentro da própria função.
    - **Correção:** `authenticate`/`authorize` agora são um **array de dois preHandlers** — o primeiro faz `jwtVerify()` + checagens de role/tenant/módulo; um segundo, separado, só então chama `tenantContext.enterWith(...)`. Verificado: `POST /finance/entries` agora grava `tenantId` correto; T01 (bloqueio de spoof de tenant) e bypass de SUPERADMIN continuam funcionando.

---

## BLOCO 1 — Consistência Financeira

- [x] **T04 · Backend · ~6h** — Unificar lógica de vencimento e baixa de mensalidade
  - **Criado:** `src/lib/finance.utils.ts` com `dueDateForCompetence(month, year, dueDay)` e `settleMonthlyFeeIncome(input)`, ambas extraídas verbatim da versão de `finance.routes.ts` (a correta, com `dueDay` configurável).
  - **Corrigido:** `athletes.routes.ts` tinha uma cópia com o dia fixo em 10 (`Date.UTC(year, month-1, 10)`) usada em `GET /athlete/me` (due date projetada) e `POST /athlete/me/payments/current/checkout` (criação real do `Payment`). Ambos os pontos agora buscam `getPaymentSettings()` (exportado de `finance.routes.ts`) e passam `monthlyDueDay` real.
  - **Critério de aceite:** verificado — `POST /finance/monthly-fees/generate` gera `Payment` com `dueDate` calculado a partir de `settings.monthlyDueDay` (dia 10 por padrão); um único source of truth compartilhado entre os dois módulos.

- [x] **T05 · Backend · ~12h** — Multa por atraso configurável
  - **Migração Prisma:** Adicionar em `PaymentSettings`: `lateFeeCents Int @default(0)`, `lateFeePercent Float @default(0)`. Rodar `prisma migrate dev`.
  - **Arquivo:** `src/modules/finance/finance.routes.ts`
  - **O que fazer:**
    1. Em `updateLatePaymentsForPeriod` (~linha 283): ao marcar `LATE`, buscar `settings.lateFeeCents` / `settings.lateFeePercent` e recalcular: `newAmount = original + lateFeeCents + round(original * lateFeePercent / 100)`. Gravar `amountCents = newAmount` e `lateFeeAppliedCents = multa`.
    2. Migração: campo `lateFeeAppliedCents Int @default(0)` em `Payment`.
    3. `GET /finance/monthly-fees` retorna `lateFeeAppliedCents` por item.
    4. `GET /finance/pix-settings` e `PATCH /finance/pix-settings` incluem os novos campos.
  - **Critério de aceite:** verificado — migração `20260705163335_add_late_fee_settings` aplicada; com `lateFeeCents=500` configurado, gerar mensalidades para um período vencido marca o pagamento `LATE` com `amountCents` 6000→6500 e `lateFeeAppliedCents: 500`; `GET /finance/monthly-fees` expõe `lateFeeAppliedCents`/`lateFeeApplied` por item.

- [ ] **T06 · Backend · ~10h** — Reembolso/estorno de pagamento
  - **Arquivo:** `src/modules/finance/finance.routes.ts`
  - **Nova rota:** `POST /finance/monthly-fees/:id/refund` (roles: ADMIN, FINANCIAL)
  - **Lógica:**
    1. Buscar `Payment` pelo `:id` com `tenantId` do contexto.
    2. Validar: `status == PAID` e não há `FinancialEntry` com `category == REFUND` para este payment.
    3. Em transação (`prisma.$transaction`):
       - Atualizar `Payment.status = REFUNDED`, `refundedAt = now`, `refundReason = body.reason`.
       - Criar `FinancialEntry { type: EXPENSE, category: REFUND, amountCents: payment.amountCents, status: PAID, paidAt: now, notes: "Estorno: " + reason }`.
       - Se associado ficou `ACTIVE` por causa deste pagamento, avaliar reverter status.
       - Criar `AuditLog { action: "payment:refund", ... }`.
    4. Retornar payment atualizado.
  - **Migração Prisma:** Campos `refundedAt DateTime?` e `refundReason String?` em `Payment`. Valor `REFUNDED` no enum `PaymentStatus`.
  - **Critério de aceite:** Pagamento marcado como `PAID` pode ser estornado; lançamento de despesa é criado; não é possível estornar duas vezes.

- [ ] **T07 · Backend · ~8h** — Pro-rata para associado que entra no meio do mês
  - **Arquivo:** `src/modules/finance/finance.routes.ts` (função `ensureMonthlyPaymentsForPeriod`) e `src/modules/associates/associates.routes.ts` (rota de criação de associado)
  - **Lógica:**
    1. Ao criar associado, se `joinDate` (data de ingresso) está no meio do mês atual, calcular:
       `diasRestantes = diasNoMes - joinDate.getUTCDate() + 1`
       `prorataFee = round(monthlyFeeCents * diasRestantes / diasNoMes)`
    2. Primeiro `Payment` gerado para este associado no mês de ingresso usa `amountCents = prorataFee`.
    3. Campo `prorataApplied: boolean` na resposta de criação do associado.
    4. `GET /finance/monthly-fees` retorna `isProrataMonth: boolean` e `prorataFee` por item.
  - **Critério de aceite:** Associado criado no dia 15 de um mês de 30 dias recebe mensalidade com 50% do valor cheio.

- [ ] **T08 · Backend · ~10h** — Billing real para atleta convidado (guest)
  - **Arquivo:** `src/modules/finance/finance.routes.ts` (novas rotas)
  - **Novas rotas:**
    - `POST /finance/guest-athletes/:athleteId/charge` — gera `FinancialEntry { category: GUEST_ATHLETE, amountCents: athlete.guestFeeCents, status: PENDING }` validando que `athlete.guestBillingEnabled == true` e `athlete.linkType == GUEST`.
    - `GET /finance/guest-athletes/charges?month=&year=` — lista cobranças de convidados do período com `tenantId` do contexto.
    - `PATCH /finance/guest-athletes/charges/:entryId/settle` — marca `FinancialEntry.status = PAID, paidAt = now`.
  - **Critério de aceite:** Atleta com `guestBillingEnabled = true` e `guestFeeCents = 2000` gera cobrança de R$20 ao chamar o endpoint; listagem exibe a cobrança; baixa manual funciona.

---

## BLOCO 2 — Robustez Técnica

- [ ] **T09 · Backend · ~6h** — Transações atômicas em fluxos multi-tabela
  - **Arquivo:** `src/modules/finance/finance.routes.ts`, `src/modules/superadmin/superadmin.routes.ts`
  - **Fluxos a envolver em `prisma.$transaction([...])` ou callback transaction:**
    1. **Liquidação via webhook PIX** (`settlePaymentFromPixWebhook`, ~linha 504): `payment.update` + `associate.update` + `financialEntry.upsert` + `auditLog.create` — tudo ou nada.
    2. **Baixa manual de mensalidade** (`POST /finance/monthly-fees/:id/manual-settle`): idem.
    3. **Provisionamento de tenant** (`POST /superadmin/tenants`): criação de `OrganizationTenant` + `GroupSettings` + `PaymentSettings` + `TenantDomain` + `User` + `TenantModule[]` + `SaaSCharge`.
  - **Critério de aceite:** Simular falha (throw) após a 2ª operação de cada fluxo — nenhuma das operações anteriores deve persistir no banco.

- [ ] **T10 · Backend · ~6h** — Ampliar cobertura de auditoria
  - **Arquivo:** `src/modules/finance/finance.routes.ts`, `src/modules/superadmin/superadmin.routes.ts`
  - **O que adicionar:** Chamar `createAuditLog(prisma, { tenantId, action, performedBy: userId, payload })` (usando o `audit.plugin.ts` já existente) nos seguintes pontos:
    - Finance: create/update/delete de `FinancialEntry` e `Expense`; liquidação e estorno de pagamento.
    - Superadmin: mudança de plano de tenant, mudança de status, toggle de módulo, criação/liquidação de cobrança SaaS. Usar `userId` do token JWT do superadmin como `performedBy`.
  - **Critério de aceite:** Após criar um lançamento financeiro, `GET /audit-logs` exibe o evento com action `finance:entry:create`.

- [ ] **T11 · Backend · ~4h** — Verificação de e-mail no registro por convite
  - **Arquivo:** `src/modules/auth/auth.routes.ts`
  - **O que fazer:**
    1. Migração: campo `emailVerifiedAt DateTime?` em `User`.
    2. Ao criar usuário via `POST /auth/invite-register`: enviar e-mail com link `GET /auth/verify-email?token=UUID` (token armazenado em `User.emailVerificationToken`, expira 24h).
    3. Nova rota `GET /auth/verify-email?token=`: buscar usuário pelo token, validar expiração, setar `emailVerifiedAt = now`, limpar token.
    4. Em `POST /auth/login`: se `emailVerifiedAt == null` e `NODE_ENV == production`, retornar 403 com `"E-mail não verificado"`.
  - **Critério de aceite:** Em produção, usuário registrado por convite não consegue logar até clicar no link de verificação.

- [ ] **T12 · Backend · ~4h** — Bloqueio de conta após tentativas de login falhas
  - **Migração Prisma:** Adicionar em `User`: `failedLoginAttempts Int @default(0)`, `lockedUntil DateTime?`.
  - **Arquivo:** `src/modules/auth/auth.routes.ts` (rota `POST /auth/login`)
  - **Lógica:**
    1. Antes de verificar senha: se `user.lockedUntil > now`, retornar 429 com `"Conta bloqueada até HH:MM"`.
    2. Se senha incorreta: incrementar `failedLoginAttempts`; se `>= 5`, setar `lockedUntil = now + 15min`.
    3. Se senha correta: zerar `failedLoginAttempts = 0`, limpar `lockedUntil = null`.
  - **Critério de aceite:** Após 5 senhas erradas, login retorna 429. Após 15 min, login funciona normalmente com senha correta.

- [ ] **T13 · Backend · ~8h** — Revogação real de sessão JWT
  - **Migração Prisma:** Nova model `RevokedToken { jti String @id, revokedAt DateTime @default(now()), expiresAt DateTime }`. Index em `expiresAt`.
  - **Arquivo:** `src/modules/auth/auth.routes.ts`, `src/modules/auth/auth.plugin.ts`
  - **O que fazer:**
    1. Ao gerar JWT em login/invite-register, incluir `jti: uuidv4()` no payload.
    2. Nova rota `POST /auth/logout` (autenticada): inserir `{ jti, expiresAt: tokenExp }` em `RevokedToken`.
    3. Em `auth.plugin.ts` (verificação de JWT): após validar assinatura, checar `await prisma.revokedToken.findUnique({ where: { jti } })` — se encontrar, retornar 401.
    4. Limpeza lazy: ao checar, deletar tokens com `expiresAt < now` (ou scheduled job simples).
  - **Critério de aceite:** Após `POST /auth/logout`, usar o mesmo token retorna 401 em qualquer rota autenticada.

---

## BLOCO 3 — Frontend · Fluxos Incompletos

- [ ] **T14 · Frontend · ~6h** — Formulário de criação/edição de avaliação técnica do atleta
  - **Arquivo:** tela de perfil do atleta em `frontend/src/pages/` (aba "Avaliação")
  - **O que fazer:**
    1. Adicionar botão "Nova Avaliação" na aba de avaliações do atleta.
    2. Abrir modal (usar `Modal.tsx` do T30 se já feito, senão inline) com campos:
       - 7 sliders/inputs numéricos 1-10: técnico, tático, físico, defensivo, ofensivo, comprometimento, disciplina.
       - Campo `notes` (textarea) e `year` (select, padrão ano atual).
    3. Submit: `POST /athletes/:id/technical-evaluations`.
    4. Exibir na tela o `finalScore`, `classification` (badge colorido por nível: Inicial/Básico/Intermediário/Avançado/Destaque) e `rating` atualizado (estrelas 1-5).
    5. Listagem existente já usa `GET /athletes/:id/technical-evaluations?year=`, não precisa alterar.
  - **Critério de aceite:** Preencher os 7 campos e salvar cria uma avaliação; score final e classificação aparecem imediatamente.

- [ ] **T15 · Frontend · ~3h** — Excluir evento de jogo na UI
  - **Arquivo:** `frontend/src/pages/games/GamesPage.tsx` (ou componente de eventos do jogo)
  - **O que fazer:**
    1. Na lista de eventos (gols, cartões) de um jogo, adicionar ícone de lixeira por item.
    2. Ao clicar: mostrar confirmação `"Remover este evento?"`.
    3. Confirmar: chamar `DELETE /sports/games/:gameId/events/:eventId`.
    4. Invalidar query de eventos do jogo após sucesso.
  - **Critério de aceite:** Gol lançado por engano pode ser removido; lista atualiza sem reload.

- [ ] **T16 · Frontend · ~5h** — Botão "Convocar atletas" no jogo
  - **Arquivo:** `frontend/src/pages/games/GamesPage.tsx`
  - **O que fazer:**
    1. Exibir botão "Convocar" na view de escalação de jogo com status `SCHEDULED` ou `RUNNING`.
    2. Modal com: lista dos atletas escalados (nome, posição, contato), campo de mensagem adicional opcional.
    3. Submit: `POST /sports/games/:id/notify`.
    4. Exibir resultado: toast ou modal com `"X e-mails enviados · Y WhatsApp · Z sem contato cadastrado"`.
  - **Critério de aceite:** Clicar em "Convocar" dispara notificação e exibe contagem de enviados/pulados.

- [ ] **T17 · Frontend · ~4h** — Exibir resultado da régua de cobrança
  - **Arquivo:** `frontend/src/pages/finance/FinanceiroPage.tsx`
  - **O que fazer:**
    1. Ao chamar `POST /finance/collection/run` (já existe), capturar resposta `{ sentEmail, sentWhatsapp, skipped, month, year }`.
    2. Exibir modal de resultado: "Régua executada com sucesso — X e-mails · Y WhatsApp · Z pulados".
    3. Exibir erros em toast se a chamada falhar.
  - **Critério de aceite:** Ao executar a régua, usuário vê os números reais de envio.

- [ ] **T18 · Frontend · ~5h** — Completar fluxo de geração de mensalidades
  - **Arquivo:** `frontend/src/pages/finance/FinanceiroPage.tsx`
  - **O que fazer:**
    1. Botão "Gerar mensalidades" abre modal com seletor de mês/ano (padrão: mês/ano atual).
    2. Exibir aviso: "Serão geradas mensalidades para todos os associados ativos do período selecionado."
    3. Submit: `POST /finance/monthly-fees/generate` com `{ month, year }`.
    4. Modal de resultado: `"X mensalidades criadas de Y associados elegíveis (dia de vencimento: DD)"`.
    5. Invalidar queries de mensalidades após sucesso.
  - **Critério de aceite:** Selecionar mês futuro e confirmar gera mensalidades e exibe contagem.

- [ ] **T19 · Frontend · ~8h** — Componente `ReauthModal` para ações sensíveis
  - **Criar:** `frontend/src/components/ui/ReauthModal.tsx`
  - **Interface:**
    ```tsx
    <ReauthModal
      open={boolean}
      action="Excluir usuário"
      onConfirm={() => Promise<void>}
      onClose={() => void}
    />
    ```
  - **Lógica:** Ao confirmar, chamar `POST /auth/reauth` com `{ password }`. Se 200, executar `onConfirm()`. Se 401, exibir "Senha incorreta".
  - **Usar em:**
    - Excluir usuário (`PATCH /auth/users/:id`).
    - Alterar papel/role de usuário.
    - Excluir lançamento financeiro (`DELETE /finance/entries/:id`).
    - Excluir atleta (`DELETE /athletes/:id`).
  - **Critério de aceite:** Clicar em "Excluir usuário" abre modal de senha; operação só executa após senha correta.

- [ ] **T20 · Frontend · ~8h** — CRUD de anexos no Acervo/Memorial
  - **Arquivo:** `frontend/src/pages/memorial/` (telas de arquivo histórico — partidas, títulos, etc.)
  - **O que fazer:**
    1. Em cada formulário/detalhe de item do acervo, adicionar seção "Anexos":
       - Lista de anexos existentes: nome, tipo, tamanho, botão de download, botão de remover.
       - Botão "Adicionar arquivo": input de file + upload via `POST /archive-items/:id/attachments` (FormData).
       - Excluir: `DELETE /archive-items/:id/attachments/:attachmentId`.
    2. Exibir spinner durante upload; toast de sucesso/erro.
  - **Critério de aceite:** Arquivo PDF/imagem pode ser adicionado a um item de acervo e depois removido.

- [ ] **T21 · Frontend · ~3h** — Indicador de tenant suspenso no Superadmin
  - **Arquivo:** `frontend/src/pages/superadmin/SuperadminPage.tsx` (ou componente de card de tenant)
  - **O que fazer:**
    1. No card/linha de cada tenant, verificar `tenant.status == "SUSPENDED"`.
    2. Exibir badge vermelho "SUSPENSO" ao lado do nome.
    3. Tooltip ao hover: exibir `tenant.suspendedReason`.
    4. Adicionar filtro rápido "Mostrar suspensos" na listagem.
  - **Critério de aceite:** Tenant com status SUSPENDED aparece com badge vermelho e motivo no tooltip.

- [ ] **T22 · Frontend · ~4h** — Exportação CSV de relatórios esportivos
  - **Arquivo:** `frontend/src/pages/` (tela de relatórios/estatísticas)
  - **O que fazer:**
    1. Nas abas de rankings (artilheiros, aproveitamento, disciplina, confrontos), adicionar botão "Exportar CSV".
    2. Gerar CSV no client a partir dos dados já carregados (sem nova rota de backend):
       ```ts
       const csv = [headers, ...rows.map(r => Object.values(r))].map(r => r.join(',')).join('\n');
       downloadBlob(csv, 'relatorio.csv', 'text/csv');
       ```
    3. Botão download disponível apenas quando há dados.
  - **Critério de aceite:** Clicar em "Exportar CSV" no ranking de artilheiros baixa arquivo com colunas: nome, jogos, gols, assistências, média.

- [ ] **T23 · Frontend · ~6h** — Completar checkout PIX do próprio atleta
  - **Arquivo:** Portal do atleta — tela "Pagamentos" em `frontend/src/pages/`
  - **O que fazer:**
    1. Na tela de pagamento atual do atleta, exibir status da mensalidade (mês/ano, valor, vencimento, status).
    2. Se status `PENDING` ou `LATE`: botão "Pagar via PIX".
    3. Ao clicar: `POST /athlete/me/payments/current/checkout` → resposta com `pixCopyPaste` e `qrCodeDataUrl`.
    4. Abrir `PixCheckoutModal.tsx` (componente já existe) com o QR code e copia-e-cola.
  - **Critério de aceite:** Atleta com mensalidade pendente consegue gerar QR code PIX para pagamento.

- [ ] **T24 · Frontend · ~5h** — Tela de auditoria de ações do superadmin
  - **Criar:** nova página em `frontend/src/pages/superadmin/` com rota `/superadmin/auditoria`
  - **O que fazer:**
    1. Adicionar item no menu do superadmin: "Auditoria".
    2. Chamar `GET /audit-logs?action=superadmin:*&limit=200` (ou filtro por `performedBy` sendo superadmin).
    3. Tabela: data, ação, tenant afetado (nome + id), usuário que executou, payload resumido.
    4. Filtros: por data, por ação (mudança de plano, suspensão, cobrança), por tenant.
  - **Critério de aceite:** Tela exibe log de "quem mudou o plano do tenant X e quando".

- [ ] **T25 · Frontend · ~4h** — Aviso de sessão expirando
  - **Arquivo:** `frontend/src/context/AuthContext.tsx` (ou hook `useAuth`)
  - **O que fazer:**
    1. Ao fazer login, decodificar o JWT (base64 decode do payload, sem verificar assinatura) e extrair `exp`.
    2. Configurar `setTimeout` para quando restar 5 min (`exp * 1000 - Date.now() - 300_000`).
    3. Exibir banner fixo no topo: "Sua sessão expira em 5 minutos. [Renovar]".
    4. Botão "Renovar" redireciona para `/login?redirect=currentPath` ou exibe modal de senha.
    5. Se sessão expirar sem ação: chamar `logout()` e redirecionar para login com aviso "Sessão expirada".
  - **Critério de aceite:** 5 minutos antes do JWT expirar, usuário vê o banner de aviso.

- [ ] **T26 · Frontend · ~6h** — UI de multa por atraso (depende de T05)
  - **Arquivo:** `frontend/src/pages/finance/FinanceiroPage.tsx` e tela de configurações
  - **O que fazer:**
    1. Na tela de configurações do clube (seção de pagamento): campos "Multa fixa (R$)" e "Multa percentual (%)" editáveis via `PATCH /finance/pix-settings`.
    2. Na listagem de mensalidades: coluna "Multa" exibindo `lateFeeAppliedCents` formatado; badge "Com multa" se aplicado.
  - **Critério de aceite:** Admin configura multa de R$5; próxima execução de atualização de atrasados mostra pagamentos com coluna de multa preenchida.

- [ ] **T27 · Frontend · ~5h** — UI de reembolso/estorno (depende de T06)
  - **Arquivo:** `frontend/src/pages/finance/FinanceiroPage.tsx`
  - **O que fazer:**
    1. No detalhe/linha de pagamento com status `PAID`: botão "Estornar".
    2. Abrir modal de confirmação com campo "Motivo do estorno" (obrigatório).
    3. Submit: `POST /finance/monthly-fees/:id/refund` com `{ reason }`.
    4. Após sucesso: atualizar status para `REFUNDED` na listagem, exibir toast.
  - **Critério de aceite:** Pagamento PAID pode ser estornado com motivo; aparece como REFUNDED na lista.

- [ ] **T28 · Frontend · ~3h** — Indicação de pro-rata na criação de associado (depende de T07)
  - **Arquivo:** formulário de criação de associado em `frontend/src/pages/`
  - **O que fazer:**
    1. Ao preencher data de ingresso no mês atual: calcular pro-rata no client e exibir:
       `"Mensalidade do 1º mês: R$ X,XX (pro-rata de X dias restantes de Y dias do mês)"`.
    2. Cálculo: `prorataFee = round(monthlyFeeCents * (diasNoMes - diaIngresso + 1) / diasNoMes)`.
    3. Exibir como texto informativo (não bloqueia o submit).
  - **Critério de aceite:** Ao selecionar data de ingresso dia 15 de mês com 30 dias, sistema exibe cálculo de ~50% da mensalidade.

- [ ] **T29 · Frontend · ~5h** — UI de billing de convidado (depende de T08)
  - **Arquivo:** perfil do atleta e `frontend/src/pages/finance/FinanceiroPage.tsx`
  - **O que fazer:**
    1. Na tela de perfil do atleta (quando `linkType == GUEST`): toggle "Cobrar por participação" + campo "Valor (R$)". Atualiza via `PATCH /athletes/:id`.
    2. Em `FinanceiroPage.tsx`: nova aba "Convidados" com:
       - Tabela de cobranças `GET /finance/guest-athletes/charges?month=&year=`.
       - Botão "Gerar cobrança" por atleta convidado → `POST /finance/guest-athletes/:athleteId/charge`.
       - Botão "Baixar" por cobrança → `PATCH /finance/guest-athletes/charges/:id/settle`.
  - **Critério de aceite:** Atleta convidado com billing habilitado aparece na aba; cobrança pode ser gerada e baixada.

---

## BLOCO 4 — Design System (executar antes de abrir telas novas)

- [ ] **T30 · Frontend · ~24h** — Criar 6 componentes de design system em `frontend/src/components/ui/`

  **T30a (~4h) — `Button.tsx`**
  - Variantes: `primary` (azul sólido), `secondary` (outline), `danger` (vermelho), `ghost` (transparente).
  - Tamanhos: `sm` / `md` / `lg` via prop `size`.
  - Estado `loading`: exibe spinner inline, desabilita clique.
  - Uso: substituir todos os `<button className="...">` ad-hoc nas páginas novas (não é necessário refatorar páginas existentes agora).

  **T30b (~4h) — `Modal.tsx`**
  - Props: `open`, `title`, `children`, `footer` (slot), `onClose`, `size` (sm/md/lg).
  - Comportamento: foco preso dentro do modal (focus trap), ESC fecha, clique no backdrop fecha, animação de entrada.
  - Acessibilidade: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
  - Usar como base para T14, T16, T17, T18, T19, T27.

  **T30c (~3h) — `Toast.tsx` + hook `useToast`**
  - API imperativa: `toast.success("Salvo!")`, `toast.error("Erro")`, `toast.warning("Atenção")`.
  - Auto-dismiss em 4s; pilha de até 3 toasts simultâneos no canto inferior direito.
  - Provider em `App.tsx` ou layout raiz.

  **T30d (~4h) — `Select.tsx`**
  - Wrapper acessível sobre `<select>` nativo.
  - Props: `label`, `options: { value, label }[]`, `value`, `onChange`, `error`, `disabled`.
  - Visual: label flutuante, ícone chevron, borda de erro em vermelho.

  **T30e (~5h) — `DatePicker.tsx`**
  - Input de data com formatação visual `dd/mm/yyyy` (máscara) mas valor interno `yyyy-mm-dd` para APIs.
  - Props: `label`, `value`, `onChange`, `min`, `max`, `error`.
  - Reutilizar `<input type="date">` internamente; sobrepor com input mascarado visualmente.

  **T30f (~4h) — `Pagination.tsx`**
  - Props: `page`, `pageSize`, `total`, `onPageChange`.
  - Renderiza: botões Anterior/Próximo, números de página (até 5 visíveis), indicador "X de Y resultados".
  - Usar nas listagens de lançamentos financeiros, atletas, e logs de auditoria que hoje carregam tudo sem paginar.

---

## BLOCO 5 — Testes Automatizados

- [ ] **T31 · Backend · ~24h** — Suíte de testes unitários e de integração
  - **Setup:**
    1. Instalar: `npm install -D vitest @vitest/coverage-v8`.
    2. Criar `vitest.config.ts` na raiz (compatível com `"type": "module"` do projeto).
    3. Adicionar script: `"test": "vitest run"`, `"test:watch": "vitest"`.
  - **Testes unitários** em `src/__tests__/unit/`:
    - `finance.utils.test.ts`: `dueDateForCompetence` — dia 1, dia 28, dia 31 (deve clamp para 28), mês 1 e 12.
    - `teamBalance.test.ts`: `teamBalanceScore` — times idênticos → penalidade 0; times com rating muito diferente → penalidade alta.
    - `athleteStats.test.ts`: `computeAthleteTechnicalStats` — verificar cada peso da fórmula de `statsScore` (seção 2.4 da memória de cálculo).
    - `collectionStage.test.ts`: `collectionStageForPayment` — D-3, D+3, D+7, D+15, dia não-correspondente → undefined.
    - `percentDelta.test.ts`: `percentDelta(100, 0)` → null; `percentDelta(0, 0)` → 0; `percentDelta(110, 100)` → 10.
  - **Testes de integração** em `src/__tests__/integration/`: usar banco SQLite via `DATABASE_URL=file:./test.db` ou mock do Prisma.
    - Login válido retorna token JWT; login inválido retorna 401; 5 falhas bloqueiam por 15min.
    - `POST /finance/monthly-fees/generate` cria para associados ativos; segunda chamada não duplica.
    - `GET /sports/games` com token do clube A não retorna jogos do clube B (testa T01).
  - **Critério de aceite:** `npm test` passa 100% em CI; cobertura ≥ 60% nas funções de cálculo.

- [ ] **T32 · Frontend · ~30h** — Suíte de testes de componente e E2E
  - **Setup:**
    1. Instalar: `npm install -D vitest @testing-library/react @testing-library/user-event jsdom`.
    2. Criar `vitest.config.ts` em `frontend/` com `environment: 'jsdom'`.
    3. Instalar Playwright: `npm install -D @playwright/test && npx playwright install`.
    4. Scripts: `"test": "vitest run"`, `"test:e2e": "playwright test"`.
  - **Testes de componente** em `frontend/src/__tests__/`:
    - `Button.test.tsx`: renderiza variante `primary`; estado `loading` desabilita clique; `onClick` é chamado.
    - `Modal.test.tsx`: monta aberto, fecha ao ESC, fecha ao clicar no backdrop.
    - `PixCheckoutModal.test.tsx`: renderiza QR code dado `pixCopyPaste` mockado.
    - `useAuth.test.ts`: login persiste token; logout limpa; role switching funciona.
    - `DatePicker.test.tsx`: valor `2025-06-15` exibe `15/06/2025`.
  - **Testes E2E** em `frontend/e2e/`:
    - `login.spec.ts`: login válido redireciona ao dashboard; login inválido exibe erro.
    - `finance.spec.ts`: criar lançamento financeiro → aparece na listagem; deletar → some.
    - `games.spec.ts`: criar jogo → escalar atleta → lançar gol → verificar ranking de artilheiro.
  - **Critério de aceite:** `npm test` e `npm run test:e2e` passam em CI.

---

## Itens Opcionais (implementar após o core estar completo)

- [ ] **T33 · Backend · ~8h (opcional)** — Soft delete em todas as entidades principais
  - Adicionar `deletedAt DateTime?` em: `Athlete`, `Associate`, `FinancialEntry`, `Game`, `Event`, `ArchiveItem`.
  - Substituir `delete` por `update({ deletedAt: now })` nas rotas de delete.
  - Adicionar filtro `where: { deletedAt: null }` em todos os `findMany`.
  - Nova rota `GET /admin/trash` por módulo para listar e restaurar itens excluídos.

- [ ] **T34 · Backend · ~16h (opcional)** — Autenticação em dois fatores (2FA) via TOTP
  - Biblioteca: `otplib` (TOTP compatível com Google Authenticator).
  - Migração: `User.totpSecret String?`, `User.totpEnabled Boolean @default(false)`.
  - Rotas: `POST /auth/2fa/setup` (gera QR code), `POST /auth/2fa/verify` (valida token e ativa), `POST /auth/2fa/disable`.
  - Em login: se `totpEnabled`, retornar `{ requires2fa: true, sessionToken: tempToken }`; nova rota `POST /auth/2fa/complete` valida TOTP e emite JWT final.

- [ ] **T35 · Frontend · ~12h (opcional)** — Refatorar páginas grandes para o design system (T30)
  - Prioridade: `GamesPage.tsx` (8.251 linhas), `FinanceiroPage.tsx` (2.108 linhas), `SuperadminPage.tsx` (2.560 linhas).
  - Substituir buttons, modals e inputs ad-hoc pelos componentes do T30.
  - Extrair sub-componentes grandes em arquivos separados para melhorar manutenibilidade.

- [ ] **T36 · Frontend · ~6h (opcional)** — "Lembrar-me" / refresh token
  - Backend: ao fazer login com `{ rememberMe: true }`, emitir também `refreshToken` (JWT de 30 dias, escopo limitado a `/auth/refresh`).
  - Nova rota `POST /auth/refresh`: valida refresh token e emite novo access token (12h).
  - Frontend: armazenar refresh token no `localStorage`; ao receber 401, tentar `/auth/refresh` automaticamente antes de redirecionar ao login.

---

## Resumo de Esforço

| Bloco | Tarefas | Horas | Custo (R$30/h) |
|---|---|---|---|
| Bloco 0 — Segurança/Tenancy | T01-T03 | 20h | R$ 600 |
| Bloco 1 — Financeiro | T04-T08 | 46h | R$ 1.380 |
| Bloco 2 — Robustez backend | T09-T13 | 28h | R$ 840 |
| Bloco 3 — Frontend fluxos | T14-T29 | 72h | R$ 2.160 |
| Bloco 4 — Design system | T30 | 24h | R$ 720 |
| Bloco 5 — Testes | T31-T32 | 54h | R$ 1.620 |
| **Core total** | **32 tarefas** | **244h** | **R$ 7.320** |
| Opcionais (T33-T36) | 4 tarefas | 42h | R$ 1.260 |
| Contingência integração/QA (15%) | — | 37h | R$ 1.110 |
| **Total com contingência + opcionais** | **36 tarefas** | **323h** | **R$ 9.690** |

> **Cronograma solo:**
> - Full-time 40h/sem → core em ~6 semanas, tudo em ~8 semanas.
> - Part-time 20h/sem → core em ~12 semanas, tudo em ~16 semanas.
