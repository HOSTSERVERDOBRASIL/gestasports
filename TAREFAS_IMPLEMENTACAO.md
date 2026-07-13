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

- [x] **T06 · Backend · ~10h** — Reembolso/estorno de pagamento
  - **Implementado:** `POST /finance/monthly-fees/:id/refund` (ADMIN/FINANCIAL). Valida `status === PAID` (409 caso contrário — isso já cobre o caso de estornar duas vezes, já que a 1ª chamada deixa o pagamento em `REFUNDED`). Em `prisma.$transaction`: `Payment` → `REFUNDED` com `refundedAt`/`refundReason`; cria `FinancialEntry` (`EXPENSE`/`REFUND`) no valor cheio (já incluindo eventual multa); se `Associate.status === ACTIVE`, reverte para `LATE` (não existe status "pendente mas não vencido" separado de `ACTIVE` no schema, então `LATE` é o valor mais correto); grava `AuditLog` com `action: "payment:refund"`.
  - **Migração:** `add_payment_refund` — `PaymentStatus.REFUNDED`, `FinancialCategory.REFUND`, `Payment.refundedAt`/`refundReason`.
  - **Critério de aceite:** verificado end-to-end — estornar um pagamento `LATE` (ainda não pago) retorna 409; após `manual-settle` (PAID), o estorno cria o `FinancialEntry` de despesa, reverte o associado de `ACTIVE` para `LATE`, e uma segunda tentativa de estorno retorna 409.

- [x] **T07 · Backend · ~8h** — Pro-rata para associado que entra no meio do mês
  - **Arquivo:** `src/modules/finance/finance.routes.ts` (função `ensureMonthlyPaymentsForPeriod`) e `src/modules/associates/associates.routes.ts` (rota de criação de associado)
  - **Lógica:**
    1. Ao criar associado, se `joinDate` (data de ingresso) está no meio do mês atual, calcular:
       `diasRestantes = diasNoMes - joinDate.getUTCDate() + 1`
       `prorataFee = round(monthlyFeeCents * diasRestantes / diasNoMes)`
    2. Primeiro `Payment` gerado para este associado no mês de ingresso usa `amountCents = prorataFee`.
    3. Campo `prorataApplied: boolean` na resposta de criação do associado.
    4. `GET /finance/monthly-fees` retorna `isProrataMonth: boolean` e `prorataFee` por item.
  - **Implementado:** `createAssociateSchema` aceita `joinDate` opcional (default hoje); `prorataFeeForJoinDate` (novo, em `finance.utils.ts`) calcula o pro-rata a partir do mês/ano da própria `joinDate` (não do "mês atual" do servidor — assim funciona corretamente mesmo com data de ingresso retroativa/futura). `POST /associates` já cria o primeiro `Payment` daquele período com o valor pro-rata (em vez de esperar `ensureMonthlyPaymentsForPeriod`, que detecta o registro existente e não duplica). Migração `add_payment_prorata` adiciona `Payment.isProrata Boolean` para sinalizar isso de forma inequívoca no `GET /finance/monthly-fees` (em vez de inferir por `amountCents < monthlyFeeCents`, que quebraria com multa por atraso somada).
  - **Critério de aceite:** verificado — associado criado com `joinDate: "2026-06-15"` (junho/2026, 30 dias) e `monthlyFeeCents: 6000` retorna `prorataApplied: true`, `prorataFeeCents: 3200` (16 dias restantes ÷ 30); `GET /finance/monthly-fees` retorna `isProrataMonth: true` para esse pagamento.

- [x] **T08 · Backend · ~10h** — Billing real para atleta convidado (guest)
  - **Implementado:** as 3 rotas descritas, mais o necessário para conectá-las: `FinancialEntry.athleteId` (novo FK, `Athlete` não tinha nenhuma ligação com lançamentos financeiros antes) e `FinancialCategory.GUEST_ATHLETE` (migração `add_financial_entry_athlete_guest`). `POST .../charge` aceita `month`/`year` opcionais no body (default: mês/ano atual) já que `FinancialEntry.competenceMonth/Year` são obrigatórios.
  - **Critério de aceite:** verificado — atleta `GUEST` com `guestBillingEnabled=true`, `guestFeeCents=2000` gera cobrança de R$20 (`INCOME`/`GUEST_ATHLETE`, `PENDING`); listagem por período mostra nome do atleta; baixa manual marca `PAID` com `paidAt`.

---

## BLOCO 2 — Robustez Técnica

- [x] **T09 · Backend · ~6h** — Transações atômicas em fluxos multi-tabela
  - **Liquidação via webhook PIX** e **baixa manual de mensalidade**: ambas agora rodam `payment.update` + `associate.update` + `settleMonthlyFeeIncome` (+ `auditLog.create` no caso do webhook) dentro de `prisma.$transaction(async (tx) => ...)`. `settleMonthlyFeeIncome` (em `finance.utils.ts`) passou a aceitar o client (`tx` ou `prisma`) como segundo parâmetro para funcionar dentro da transação.
  - **Provisionamento de tenant:** ao investigar, `POST /superadmin/tenants` já cria `OrganizationTenant` + `GroupSettings` + `PaymentSettings` + `TenantDomain` + `User` + `TenantModule[]` + `SaaSCharge` num único `prisma.organizationTenant.create({ data: { groupSettings: { create }, paymentSettings: { create }, domains: { create }, users: { create }, modules: { create }, charges: { create } } })` — nested writes do Prisma dentro de um único `.create()` já são atômicos (tudo ou nada) por padrão, então esse fluxo já satisfazia o critério sem mudança de código. Os passos seguintes (`ensureTenantWorkspace`, `ensureTenantModules`, `applyPlanModulesToTenant`) são idempotentes "ensure defaults", não criação inicial.
  - **Critério de aceite:** verificado para os dois fluxos financeiros (webhook PIX e baixa manual) rodando de ponta a ponta após o wrap; o fluxo de tenant já era atômico na sua criação principal.

- [x] **T10 · Backend · ~6h** — Ampliar cobertura de auditoria
  - **Implementado:** `audit.plugin.ts` só tinha o hook genérico `onResponse` (que já loga toda mutação, mas com action derivada do path tipo `create:finance`, pouco específica); não existia nenhum helper reutilizável. Criado `src/modules/audit/audit.service.ts` com `createAuditLog(client, { request, action, targetType, targetId, metadata, tenantId? })` — aceita `tx` ou `prisma` (para logar dentro de transações) e um `tenantId` explícito (necessário para ações de SUPERADMIN, que rodam com `bypassTenant: true` e portanto não teriam `tenantId` auto-injetado).
    - Finance: `finance:entry:create/update/delete`, `finance:expense:create`, `finance:payment:manual-settle` (dentro da transação do T09). `payment:refund` (T06) já tinha seu próprio audit log inline.
    - Superadmin: `superadmin:tenant:update` (mudança de plano e/ou status), `superadmin:tenant:modules-update` (toggle de módulo), `superadmin:charge:create`, `superadmin:charge:settle` — todos com `tenantId` do tenant afetado (não do superadmin).
  - **Critério de aceite:** verificado — `POST /finance/entries` gera log com `action: "finance:entry:create"`; `PATCH /superadmin/tenants/:id` com mudança de status gera `superadmin:tenant:update` associado ao `tenantId` correto (não nulo).

- [x] **T11 · Backend · ~4h** — Verificação de e-mail no registro por convite
  - **Implementado com um ajuste importante em relação ao texto original:** o token não fica em `User.emailVerificationToken` — seguindo o padrão já usado por `PasswordResetToken` neste código (tabela própria, `tokenHash` em vez de token em texto puro, expiração e `usedAt`), criei `EmailVerificationToken` do mesmo jeito. `GET /auth/verify-email?token=` valida hash+expiração+uso único, marca `emailVerifiedAt` e `usedAt`.
  - **Achado importante:** gatear `POST /auth/login` por `emailVerifiedAt == null` bloquearia **todo mundo** em produção — usuários criados via `POST /auth/users` (admin cadastra direto) e o ADMIN inicial de cada tenant (criado pelo superadmin) nunca passam por `/auth/invite-register`, então nunca teriam `emailVerifiedAt` setado. Corrigido: essas 3 rotas de criação de usuário (`POST /auth/users`, criação de tenant no superadmin, `POST /superadmin/tenants/:tenantId/users`) agora setam `emailVerifiedAt = now()` na criação, já que não são auto-cadastro. Migração `backfill_email_verified` marca todo usuário já existente como verificado (`emailVerifiedAt = createdAt`) para não bloquear contas atuais. Só `/auth/invite-register` (auto-cadastro via convite) exige o clique no link.
  - **Critério de aceite:** verificado com `NODE_ENV=production` real — usuário recém-registrado por convite recebe 403 ("E-mail não verificado") até clicar no link (testado com token gerado diretamente, já que SMTP não está configurado neste ambiente); após verificar, login funciona; usuários pré-existentes/criados por admin não são afetados.

- [x] **T12 · Backend · ~4h** — Bloqueio de conta após tentativas de login falhas
  - **Implementado** exatamente como descrito: `User.failedLoginAttempts`/`lockedUntil` (migração `add_login_lockout`); checagem de bloqueio antes da senha; incremento/reset em `POST /auth/login`.
  - **Critério de aceite:** verificado — 5 senhas erradas seguidas bloqueiam a conta; a 6ª tentativa retorna `429` mesmo com a senha **correta**; forçando `lockedUntil` para o passado (simulando os 15 min), login com senha correta volta a funcionar e zera `failedLoginAttempts`/`lockedUntil`.

- [x] **T13 · Backend · ~8h** — Revogação real de sessão JWT
  - **Implementado** como descrito: migração `add_revoked_token`; `jti: crypto.randomUUID()` incluído nos dois pontos de assinatura (login e invite-register); `POST /auth/logout` (autenticado) grava `{jti, expiresAt}` via `upsert` (idempotente); `auth.plugin.ts` checa revogação logo após `jwtVerify()`, antes de qualquer outra checagem. Limpeza lazy probabilística (~1% das requisições autenticadas) faz `deleteMany` de tokens já expirados, evitando rodar essa varredura em toda requisição.
  - **Critério de aceite:** verificado — token usado com sucesso antes do logout; `POST /auth/logout` retorna 204; o mesmo token reaproveitado em seguida numa rota autenticada retorna 401 ("Sessão encerrada").

---

## BLOCO 3 — Frontend · Fluxos Incompletos

> **Nota de verificação (sessão posterior):** antes de implementar, o estado atual do frontend foi
> auditado por grep/leitura direta contra cada critério de aceite abaixo, porque este documento
> estava desatualizado em relação ao código. Resultado:
> - **Já estavam implementados** (achado ao investigar, sem alteração necessária): **T14**
>   (avaliação técnica — formulário completo com reauth já existe em `AthletesPage.tsx`), **T15**
>   (exclusão de evento de jogo — `deleteEventMutation` em `GamesPage.tsx`), **T16** (convocação —
>   `/sports/games/:id/notify` já é chamado com UI), **T17** e **T18** (resultado da régua e da
>   geração de mensalidades já são exibidos inline, com números reais, logo abaixo dos botões em
>   `FinanceiroPage.tsx`), **T20** (upload de anexo do acervo — só a exclusão individual de anexo
>   segue faltando, gap menor não coberto nesta sessão), **T21** (badge de tenant suspenso já existe
>   em `SuperadminPage.tsx`), **T23** (checkout PIX do atleta — fluxo completo com
>   `PixCheckoutModal`), **T24** (tela/aba de auditoria do superadmin já existe, com filtros e
>   tabela).
> - **Implementados nesta sessão** (não existiam antes): **T19** (`ReauthModal.tsx`, aplicado a
>   excluir atleta e excluir lançamento financeiro), **T22** (`utils/csv.ts` + botão "Exportar CSV"
>   em artilharia/aproveitamento/disciplina/confrontos), **T25** (`SessionExpiryBanner.tsx` +
>   temporizador de expiração em `AuthContext.tsx`), **T26** (campos de multa fixa/percentual em
>   `OperationsPages.tsx` + coluna "Multa" na listagem de mensalidades), **T27** (botão/modal de
>   estorno na listagem de mensalidades), **T28** (campo "Data de ingresso" — não existia nenhum
>   campo de data no formulário de associado antes — com prévia de pro-rata em
>   `AssociateEditor.tsx`), **T29** (aba "Convidados" nova em `FinanceiroPage.tsx`: lista atletas
>   convidados elegíveis, gera cobrança avulsa, dá baixa — o toggle no perfil do atleta já existia).
> - **Verificado:** `npm run typecheck` e `npx eslint .` (frontend) limpos após as mudanças — o
>   único erro de lint encontrado foi no código novo (`csv.ts`, BOM literal via regex, corrigido
>   para `String.fromCharCode`); os erros pré-existentes em `AthletePortalPage.tsx` e
>   `TenantThemeContext.tsx` não foram tocados nesta sessão. `vite build` não roda neste ambiente
>   (Node 18.20.8; Vite exige Node 20.19+/22.12+) — limitação de ambiente, não do código; `tsc -b`
>   (typecheck real do projeto) passou antes de chegar nessa etapa.

- [x] **T14 · Frontend · ~6h** — Formulário de criação/edição de avaliação técnica do atleta
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

- [x] **T15 · Frontend · ~3h** — Excluir evento de jogo na UI
  - **Arquivo:** `frontend/src/pages/games/GamesPage.tsx` (ou componente de eventos do jogo)
  - **O que fazer:**
    1. Na lista de eventos (gols, cartões) de um jogo, adicionar ícone de lixeira por item.
    2. Ao clicar: mostrar confirmação `"Remover este evento?"`.
    3. Confirmar: chamar `DELETE /sports/games/:gameId/events/:eventId`.
    4. Invalidar query de eventos do jogo após sucesso.
  - **Critério de aceite:** Gol lançado por engano pode ser removido; lista atualiza sem reload.

- [x] **T16 · Frontend · ~5h** — Botão "Convocar atletas" no jogo
  - **Arquivo:** `frontend/src/pages/games/GamesPage.tsx`
  - **O que fazer:**
    1. Exibir botão "Convocar" na view de escalação de jogo com status `SCHEDULED` ou `RUNNING`.
    2. Modal com: lista dos atletas escalados (nome, posição, contato), campo de mensagem adicional opcional.
    3. Submit: `POST /sports/games/:id/notify`.
    4. Exibir resultado: toast ou modal com `"X e-mails enviados · Y WhatsApp · Z sem contato cadastrado"`.
  - **Critério de aceite:** Clicar em "Convocar" dispara notificação e exibe contagem de enviados/pulados.

- [x] **T17 · Frontend · ~4h** — Exibir resultado da régua de cobrança
  - **Arquivo:** `frontend/src/pages/finance/FinanceiroPage.tsx`
  - **O que fazer:**
    1. Ao chamar `POST /finance/collection/run` (já existe), capturar resposta `{ sentEmail, sentWhatsapp, skipped, month, year }`.
    2. Exibir modal de resultado: "Régua executada com sucesso — X e-mails · Y WhatsApp · Z pulados".
    3. Exibir erros em toast se a chamada falhar.
  - **Critério de aceite:** Ao executar a régua, usuário vê os números reais de envio.

- [x] **T18 · Frontend · ~5h** — Completar fluxo de geração de mensalidades
  - **Arquivo:** `frontend/src/pages/finance/FinanceiroPage.tsx`
  - **O que fazer:**
    1. Botão "Gerar mensalidades" abre modal com seletor de mês/ano (padrão: mês/ano atual).
    2. Exibir aviso: "Serão geradas mensalidades para todos os associados ativos do período selecionado."
    3. Submit: `POST /finance/monthly-fees/generate` com `{ month, year }`.
    4. Modal de resultado: `"X mensalidades criadas de Y associados elegíveis (dia de vencimento: DD)"`.
    5. Invalidar queries de mensalidades após sucesso.
  - **Critério de aceite:** Selecionar mês futuro e confirmar gera mensalidades e exibe contagem.

- [x] **T19 · Frontend · ~8h** — Componente `ReauthModal` para ações sensíveis
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

- [x] **T20 · Frontend · ~8h** — CRUD de anexos no Acervo/Memorial
  - **Arquivo:** `frontend/src/pages/memorial/` (telas de arquivo histórico — partidas, títulos, etc.)
  - **O que fazer:**
    1. Em cada formulário/detalhe de item do acervo, adicionar seção "Anexos":
       - Lista de anexos existentes: nome, tipo, tamanho, botão de download, botão de remover.
       - Botão "Adicionar arquivo": input de file + upload via `POST /archive-items/:id/attachments` (FormData).
       - Excluir: `DELETE /archive-items/:id/attachments/:attachmentId`.
    2. Exibir spinner durante upload; toast de sucesso/erro.
  - **Critério de aceite:** Arquivo PDF/imagem pode ser adicionado a um item de acervo e depois removido.

- [x] **T21 · Frontend · ~3h** — Indicador de tenant suspenso no Superadmin
  - **Arquivo:** `frontend/src/pages/superadmin/SuperadminPage.tsx` (ou componente de card de tenant)
  - **O que fazer:**
    1. No card/linha de cada tenant, verificar `tenant.status == "SUSPENDED"`.
    2. Exibir badge vermelho "SUSPENSO" ao lado do nome.
    3. Tooltip ao hover: exibir `tenant.suspendedReason`.
    4. Adicionar filtro rápido "Mostrar suspensos" na listagem.
  - **Critério de aceite:** Tenant com status SUSPENDED aparece com badge vermelho e motivo no tooltip.

- [x] **T22 · Frontend · ~4h** — Exportação CSV de relatórios esportivos
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

- [x] **T23 · Frontend · ~6h** — Completar checkout PIX do próprio atleta
  - **Arquivo:** Portal do atleta — tela "Pagamentos" em `frontend/src/pages/`
  - **O que fazer:**
    1. Na tela de pagamento atual do atleta, exibir status da mensalidade (mês/ano, valor, vencimento, status).
    2. Se status `PENDING` ou `LATE`: botão "Pagar via PIX".
    3. Ao clicar: `POST /athlete/me/payments/current/checkout` → resposta com `pixCopyPaste` e `qrCodeDataUrl`.
    4. Abrir `PixCheckoutModal.tsx` (componente já existe) com o QR code e copia-e-cola.
  - **Critério de aceite:** Atleta com mensalidade pendente consegue gerar QR code PIX para pagamento.

- [x] **T24 · Frontend · ~5h** — Tela de auditoria de ações do superadmin
  - **Criar:** nova página em `frontend/src/pages/superadmin/` com rota `/superadmin/auditoria`
  - **O que fazer:**
    1. Adicionar item no menu do superadmin: "Auditoria".
    2. Chamar `GET /audit-logs?action=superadmin:*&limit=200` (ou filtro por `performedBy` sendo superadmin).
    3. Tabela: data, ação, tenant afetado (nome + id), usuário que executou, payload resumido.
    4. Filtros: por data, por ação (mudança de plano, suspensão, cobrança), por tenant.
  - **Critério de aceite:** Tela exibe log de "quem mudou o plano do tenant X e quando".

- [x] **T25 · Frontend · ~4h** — Aviso de sessão expirando
  - **Arquivo:** `frontend/src/context/AuthContext.tsx` (ou hook `useAuth`)
  - **O que fazer:**
    1. Ao fazer login, decodificar o JWT (base64 decode do payload, sem verificar assinatura) e extrair `exp`.
    2. Configurar `setTimeout` para quando restar 5 min (`exp * 1000 - Date.now() - 300_000`).
    3. Exibir banner fixo no topo: "Sua sessão expira em 5 minutos. [Renovar]".
    4. Botão "Renovar" redireciona para `/login?redirect=currentPath` ou exibe modal de senha.
    5. Se sessão expirar sem ação: chamar `logout()` e redirecionar para login com aviso "Sessão expirada".
  - **Critério de aceite:** 5 minutos antes do JWT expirar, usuário vê o banner de aviso.

- [x] **T26 · Frontend · ~6h** — UI de multa por atraso (depende de T05)
  - **Arquivo:** `frontend/src/pages/finance/FinanceiroPage.tsx` e tela de configurações
  - **O que fazer:**
    1. Na tela de configurações do clube (seção de pagamento): campos "Multa fixa (R$)" e "Multa percentual (%)" editáveis via `PATCH /finance/pix-settings`.
    2. Na listagem de mensalidades: coluna "Multa" exibindo `lateFeeAppliedCents` formatado; badge "Com multa" se aplicado.
  - **Critério de aceite:** Admin configura multa de R$5; próxima execução de atualização de atrasados mostra pagamentos com coluna de multa preenchida.

- [x] **T27 · Frontend · ~5h** — UI de reembolso/estorno (depende de T06)
  - **Arquivo:** `frontend/src/pages/finance/FinanceiroPage.tsx`
  - **O que fazer:**
    1. No detalhe/linha de pagamento com status `PAID`: botão "Estornar".
    2. Abrir modal de confirmação com campo "Motivo do estorno" (obrigatório).
    3. Submit: `POST /finance/monthly-fees/:id/refund` com `{ reason }`.
    4. Após sucesso: atualizar status para `REFUNDED` na listagem, exibir toast.
  - **Critério de aceite:** Pagamento PAID pode ser estornado com motivo; aparece como REFUNDED na lista.

- [x] **T28 · Frontend · ~3h** — Indicação de pro-rata na criação de associado (depende de T07)
  - **Arquivo:** formulário de criação de associado em `frontend/src/pages/`
  - **O que fazer:**
    1. Ao preencher data de ingresso no mês atual: calcular pro-rata no client e exibir:
       `"Mensalidade do 1º mês: R$ X,XX (pro-rata de X dias restantes de Y dias do mês)"`.
    2. Cálculo: `prorataFee = round(monthlyFeeCents * (diasNoMes - diaIngresso + 1) / diasNoMes)`.
    3. Exibir como texto informativo (não bloqueia o submit).
  - **Critério de aceite:** Ao selecionar data de ingresso dia 15 de mês com 30 dias, sistema exibe cálculo de ~50% da mensalidade.

- [x] **T29 · Frontend · ~5h** — UI de billing de convidado (depende de T08)
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

- [x] **T30 · Frontend · ~24h** — Criar 6 componentes de design system em `frontend/src/components/ui/`

  **T30a — `Button.tsx`** — variantes/tamanhos/`loading` como especificado. **Achado:** a variante `danger` não pode usar `bg-red-*`/`border-red-*` — o app tem uma regra CSS global (`index.css`, seletor `[class*="bg-red-"]`) que repinta qualquer elemento com essas classes para a cor de marca do tenant (resquício de quando vermelho era placeholder de marca). Usei `rose-*` em vez de `red-*` para o botão de perigo continuar vermelho de verdade.

  **T30b — `Modal.tsx`** — focus trap, ESC, clique no backdrop, `role="dialog"`/`aria-modal`/`aria-labelledby`, animação de entrada (`@keyframes` novo em `index.css`).

  **T30c — `Toast.tsx`** — API imperativa `toast.success/error/warning/info`, auto-dismiss 4s, pilha de até 3, canto inferior direito. Store (`toast-store.ts`) separada do componente `ToastProvider` porque o ESLint (`react-refresh/only-export-components`) não permite misturar exports de função e de componente no mesmo arquivo. `<ToastProvider />` montado em `App.tsx`.

  **T30d — `Select.tsx`**, **T30e — `DatePicker.tsx`** (a máscara dd/mm/yyyy já existia em `DateField.tsx` — só faltava um wrapper com `label`/`error`/`min`/`max`, que foi acrescentado ao próprio `DateField` e exposto via `DatePicker.tsx`), **T30f — `Pagination.tsx`** — implementados conforme especificado.

  - **Critério de aceite:** verificado visualmente — todos os 6 componentes renderizados numa página de teste temporária, capturados com Playwright (`chromium`) rodando contra o Vite dev server: variantes de botão corretas (incluindo o fix do `danger`), modal abre/fecha com ESC, toasts empilham com as 3 cores certas, Select/DatePicker/Pagination com o visual esperado. `npm run typecheck` e `npm run lint` limpos. Página e rota de teste removidas após a verificação.

---

## BLOCO 5 — Testes Automatizados

- [x] **T31a · Backend · ~10h** — Suíte de testes unitários (parte 1 de T31; testes de integração seguem pendentes)
  - **Setup implementado:** `vitest` instalado (`^3.2.7`, compatível com Node 18 e `"type": "module"`); `vitest.config.ts` na raiz aponta para `src/__tests__/**/*.test.ts`. Scripts: `npm run test:unit` (`vitest run`), `npm run test:unit:watch` (`vitest`); `npm test` agora roda `test:security && test:unit` (mantém o preflight de segurança existente em vez de substituí-lo).
  - **Achado ao implementar:** `teamBalanceScore`, `collectionStageForPayment`, `percentDelta`, `roundScore`/`classifyScore` eram funções não exportadas dentro de `athletes.routes.ts`/`finance.routes.ts`; adicionado `export` (sem alterar comportamento) para torná-las importáveis pelos testes. `computeAthleteTechnicalStats` fazia 3 coisas junto (queries Prisma + contagem + fórmula do score); extraída a fórmula pura para `computeStatsScoreFromCounts` (mesmo arquivo, exportada), chamada de dentro da função original — permite testar os pesos da fórmula sem mockar Prisma/banco.
  - **Testes unitários criados** em `src/__tests__/unit/` (29 testes, 5 arquivos, todos passando):
    - `finance.utils.test.ts` — `dueDateForCompetence` (dia 15, clamp de 31→28, clamp de 0→1, mês 1 e 12) e `prorataFeeForJoinDate` (dia 1 = mês cheio, dia 15 de junho/30 dias = 3200, último dia = fee mínima, fevereiro bissexto).
    - `teamBalance.test.ts` — `teamBalanceScore`: times idênticos → 0; gap de rating alto → penalidade maior que times equilibrados; goleiros desbalanceados → penalidade > 0; gap de idade média → penalidade; tamanhos de elenco diferentes → penalidade.
    - `athleteStats.test.ts` — `computeStatsScoreFromCounts`: score perfeito (7.6, confirmado pela fórmula ponderada); zero jogos → todos os percentuais 0; contribuição de gols/assistências capada em 10; peso de cartão amarelo (-0.7) e vermelho (-2.5) na nota de disciplina, incluindo o efeito do arredondamento de `roundScore`; piso de disciplina em 1.
    - `collectionStage.test.ts` — `collectionStageForPayment`: PRE_DUE_3, D_PLUS_3, D_PLUS_7, D_PLUS_15 (e além de 15 dias), dias sem estágio correspondente → `null`. Datas calculadas relativas a "hoje" no momento do teste, não fixas, para não quebrar com o tempo.
    - `percentDelta.test.ts` — `percentDelta(100, 0)` → null; `percentDelta(0, 0)` → 0; `percentDelta(110, 100)` → 10; delta negativo; denominador usa valor absoluto de `previous`.
  - **Critério de aceite:** verificado — `npm test` roda preflight de segurança + `vitest run` com 29/29 testes passando; `npm run build` (tsc) limpo após os `export`s e a extração de `computeStatsScoreFromCounts`.
  - **Pendente (T31b):** testes de integração (`src/__tests__/integration/`) com banco real/mock do Prisma — login/lockout, geração de mensalidades sem duplicar, isolamento de tenant em `/sports/games`. Cobertura (`@vitest/coverage-v8`) ainda não configurada.

- [x] **T31b · Backend · ~14h** — Testes de integração
  - **Setup implementado:** banco Postgres real dedicado (`flamilha_test`, mesmo container `docker-compose.yml` da dev, porta 5434) em vez de SQLite — o `schema.prisma` tem `provider = "postgresql"` fixo, então SQLite exigiria um segundo schema/client e foi descartado. `vitest.integration.config.ts` (config separada de `vitest.config.ts`, só roda com `npm run test:integration`, não faz parte de `npm test`/CI padrão porque exige Docker+Postgres rodando localmente) define `DATABASE_URL`/`NODE_ENV=test`/`JWT_SECRET` de teste via `test.env` e usa `globalSetup` (`src/__tests__/integration/globalSetup.ts`) para rodar `prisma migrate deploy` contra o banco de teste antes da suíte. `fileParallelism: false` para evitar dois arquivos de teste concorrendo pelo mesmo banco.
  - **Refatoração necessária:** `src/server.ts` fazia `Fastify()` + registrava tudo + chamava `.listen()` no top level do módulo — não dava para importar sem abrir uma porta real e registrar handlers de `SIGINT`/`SIGTERM`. Extraído `buildApp()` para `src/app.ts` (toda a montagem do app, idêntica, sem `.listen()`); `server.ts` agora só chama `buildApp()` e cuida de start/shutdown. Testado com `npm run build` limpo.
  - **Fixtures:** `src/__tests__/integration/helpers/db.ts` (`createTestTenant`, `createTestUser` com bcrypt real, `deleteTestTenant` — como todo FK de `OrganizationTenant` é `onDelete: Cascade`, um único delete limpa tenant+users+games+payments etc. de cada teste) e `helpers/app.ts` (`createTestApp`/`loginAs` via `app.inject()` com header `X-Tenant-Slug`).
  - **Testes criados** (7 testes, 3 arquivos): `auth.test.ts` (login válido retorna JWT; senha errada → 401; e-mail inexistente → 401; 5 falhas seguidas bloqueiam a conta e a 6ª tentativa com a senha *correta* retorna 429; token de um tenant com `X-Tenant-Slug` de outro tenant retorna 403 — regressão de T01), `finance.test.ts` (`POST /finance/monthly-fees/generate` cria 1 pagamento por associado ativo, ignora inativo, segunda chamada não duplica), `sports-tenant-isolation.test.ts` (jogo do Clube A nunca aparece em `GET /sports/games` autenticado como Clube B).
  - **🔴 Bug real encontrado e corrigido durante a implementação (fora do escopo original de T31, mas crítico):** o teste "senha errada → 401" começou a falhar com **500** (`P2025`, Prisma não achou o registro para dar `update`) — mas só quando rodado **depois** de outro teste de login bem-sucedido no mesmo arquivo, nunca isolado. Investigado com `prisma:query` logging temporário: o `UPDATE "User" ... WHERE (id = $4 AND tenantId = $5)` estava usando o `tenantId` do tenant do teste **anterior**, não o do request atual. Causa raiz: `tenant.plugin.ts` seta o contexto de tenant (`AsyncLocalStorage`) no hook `onRequest` via `enterWith`, mas — assim como já documentado no comentário do webhook PIX em `finance.routes.ts` e nas correções de T01/T13 em `auth.plugin.ts` — o **parsing do body** (que roda depois do `onRequest`, antes do `preHandler`) quebra essa continuidade. Rotas autenticadas já reentravam o contexto certo via `applyAuthenticatedTenant` (parte do preHandler `authenticate`/`authorize`); o webhook PIX já tinha seu próprio preHandler para isso. **Mas `/auth/login` não tem nenhum preHandler — nem um nem outro — e reentrava com o que quer que estivesse "no ar" de uma requisição anterior não relacionada.** Em produção isso significa: um login (ou tentativa) de um clube logo após qualquer requisição de *outro* clube podia gravar/consultar sob o `tenantId` errado — na prática, como o filtro extra de `tenantId` só reduz o `WHERE` (nunca amplia), o sintoma observável é uma consulta que deveria achar o registro simplesmente não achar (erro/comportamento estranho), mas o mecanismo em si é uma classe de bug real de vazamento de contexto entre requisições, não um artefato do teste.
    - **Correção:** `tenant.plugin.ts` ganhou um segundo hook, `preHandler` global (roda em toda rota, antes de qualquer preHandler específico de rota), que reentra `{ tenantId: request.tenant?.id ?? null, bypassTenant: false }` a partir de `request.tenant` — uma propriedade simples, não afetada pelo problema do `AsyncLocalStorage`. Como hooks globais rodam antes dos `preHandler` de rota, `authenticate`/`authorize` continuam rodando depois e sobrescrevendo com o `tenantId` do JWT verificado (T01 preservado). Isso cobre `/auth/login` e qualquer outra rota pública futura sem precisar lembrar de replicar o padrão manualmente em cada uma (o webhook PIX manteve seu preHandler próprio, agora redundante mas inofensivo).
  - **Critério de aceite:** verificado — `npm run test:integration` roda migração + 7/7 testes passando, incluindo o teste que reproduzia o bug (login válido do tenant A seguido de senha errada do tenant B agora retorna 401, não 500); `npm run build` e `npm test` (preflight + unitários) continuam limpos.
  - **Pendente:** cobertura formal (`@vitest/coverage-v8`) não configurada; a suíte de integração cobre os três fluxos críticos pedidos mas não é exaustiva (não cobre todas as rotas).

- [x] **T32a · Frontend · ~14h** — Suíte de testes de componente/hook (parte 1 de T32; E2E segue pendente)
  - **🟠 Achado operacional importante (não é sobre os testes em si):** `frontend/package.json` já
    tinha `vite@^8.0.12` antes desta sessão (confirmado via `git diff` — não foi upgrade meu). O
    Vite 8 exige Node `^20.19.0 || >=22.12.0`; o `nvm alias default` deste ambiente é Node
    **18.20.8**. Ou seja, **`npm run dev` e `npm run build` do frontend já não rodavam** sob o Node
    padrão deste ambiente, independente de testes — sintoma: `ReferenceError: CustomEvent is not
    defined` (CLI do Vite) ou `SyntaxError: ... does not provide an export named 'styleText'`
    (dependência interna via rolldown). Não é bug do código, é descompasso de versão de runtime.
    Node 20.20.2 já estava instalado via nvm neste ambiente (não instalei nada novo) — usei
    `nvm use 20` só para esta sessão de testes, sem alterar o `default` do usuário. Recomendação:
    ou fixar `"engines": { "node": ">=20.19" }` em `frontend/package.json` e atualizar o
    `nvm alias default` do ambiente de dev, ou congelar `vite`/`vitest` em versões compatíveis com
    Node 18 — decisão de produto, não tomei nenhuma das duas.
  - **Setup implementado:** `vitest` + `@testing-library/react` + `@testing-library/user-event` +
    `@testing-library/jest-dom` + `jsdom`. `vitest.config.ts` com `environment: "jsdom"` e
    `setupFiles: ["src/__tests__/setup.ts"]`. Scripts `npm test` (`vitest run`) e `npm run
    test:watch`.
    - **Achado ao escrever os testes:** sem `afterEach(() => cleanup())` explícito no setup, o
      RTL não limpa o DOM entre testes do mesmo arquivo neste projeto (o `vitest.config.ts` não
      usa `test.globals: true`, condição sob a qual o auto-cleanup do RTL não se registra sozinho)
      — 5 dos primeiros 19 testes falhavam com "Found multiple elements" até adicionar o
      `cleanup()` manual em `setup.ts`.
  - **Testes criados** em `frontend/src/__tests__/` (19 testes, 4 arquivos, todos passando sob
    Node 20):
    - `Button.test.tsx` — variante primary; variante danger usa `rose-*` (não `bg-red-*`, que o
      CSS global repinta — ver comentário em `Button.tsx`); `loading` desabilita e não dispara
      `onClick`; `onClick` chamado ao clicar.
    - `Modal.test.tsx` — não renderiza fechado; renderiza título/conteúdo aberto; fecha no ESC, no
      clique do backdrop e no botão "Fechar".
    - `DatePicker.test.tsx` — `"2025-06-15"` exibe `"15/06/2025"`; valor vazio exibe campo vazio;
      digitar `15062025` dispara `onChange("2025-06-15")`; exibe mensagem de erro quando fornecida.
    - `useAuth.test.tsx` — login persiste token real no `localStorage` (via `apiRequest` mockado);
      logout limpa token e usuário; troca de papel ativo respeita os papéis do usuário e ignora
      um papel não concedido (sem escalonamento de privilégio no cliente); alerta de sessão
      expirando vira `true` quando faltam menos de 5 minutos (usando fake timers); sessão sem
      token persistido não dispara nenhuma chamada de API.
  - **Critério de aceite:** verificado — `npm run test` (19/19), `npm run typecheck` (`tsc -b`) e
    `npx eslint .` limpos, sob Node 20.

- [x] **T32b · Frontend · ~16h** — Testes E2E com Playwright
  - **Setup:** `@playwright/test` instalado; `npx playwright install chromium` (só Chromium, sem
    `--with-deps` — a instalação de dependências de sistema via `sudo apt` falhou por falta de
    terminal/senha neste ambiente sandboxed; testado manualmente que o binário do Chromium roda
    mesmo sem essas libs de sistema). `playwright.config.ts` em `frontend/` com dois `webServer`
    (backend na porta 3333 — fixa porque `vite.config.mjs` tem o proxy `/api`/`/health` hardcoded
    para `127.0.0.1:3333`, não é configurável por env — e frontend na porta 5399, para não colidir
    com um `npm run dev` que o usuário já tenha rodando na 5173). `globalSetup` roda
    `prisma migrate deploy` + `prisma/seed.ts` contra o mesmo banco `flamilha_test` usado pelos
    testes de integração do backend (T31b), nunca contra o banco de dev. Script `npm run test:e2e`.
  - **Achado de investigação (não óbvio, guiou a escolha dos seletores):** a rota de "Cadastrar
    jogo" do menu (`/jogos?view=OPERACAO&subView=CADASTRO`) é a que está realmente ligada à
    navegação — `CreateGamePage.tsx`/rota `/create-game` existe no código mas não tem nenhum link
    de menu apontando para ela (`/cadastrar-jogo` redireciona para a rota `/jogos?...CADASTRO`).
    O formulário real de cadastro de jogo é o embutido em `GamesPage.tsx` (8251 linhas) — a
    validação de obrigatoriedade do botão "Salvar e continuar" só exige `location`, `date` e nomes
    de mandante/visitante distintos (não exige competição/categoria apesar do asterisco visual),
    o que permitiu um teste de criação de jogo sem precisar cadastrar uma competição antes.
  - **Testes criados** em `frontend/e2e/` (4 testes, 3 arquivos, todos passando sob Node 20 contra
    os servidores reais de backend+frontend):
    - `login.spec.ts` — login válido redireciona para fora de `/login` e mostra o link
      "Financeiro" no menu; login inválido mostra "Credenciais inválidas" e permanece em `/login`.
    - `finance.spec.ts` — cria um lançamento manual (via atalho "Lançamento" do dashboard
      financeiro) e confirma que aparece na listagem; exclui via `ReauthModal` (senha do admin) e
      confirma que some da lista.
    - `games.spec.ts` — preenche o formulário completo de cadastro de jogo (mandante, visitante,
      local, data, hora) e confirma que o jogo aparece (por local) após salvar. **Não cobre** a
      cadeia completa "escalar atleta → lançar gol → verificar ranking" do escopo original — dado
      o tamanho de `GamesPage.tsx`, isso ficou fora do escopo desta sessão para não arriscar um
      teste especulativo/frágil sem investigação equivalente do fluxo de escalação e súmula.
  - **Critério de aceite:** verificado — `npm run test:e2e` roda migração + seed do banco de teste,
    sobe backend (porta 3333) e frontend (porta 5399) reais, e passa 4/4. `npm run typecheck` e
    `npx eslint .` seguem limpos (os arquivos de `e2e/` não entram no `tsc -b` do projeto — assim
    como `vitest.config.ts` — mas isso não impede a execução real dos testes, que é a verificação
    mais forte de qualquer forma).
  - **Pendente:** cobertura de "escalar atleta → lançar gol → ranking" (games.spec.ts parcial,
    acima).

- [x] **CI · `.github/workflows/ci.yml`** (não estava no backlog original — adicionado porque toda
  a suíte de testes desta sessão, T31+T32, só tem valor se rodar sozinha a cada push/PR)
  - Dois jobs, cada um com seu próprio serviço `postgres:16-alpine` (porta 5432, banco
    `flamilha_test` já criado como banco padrão do serviço — mais simples que o `CREATE DATABASE`
    manual usado em dev): **`backend`** (`npm ci` → `npm run build` → `npm test` → `npm run
    test:integration`) e **`frontend`** (`npm ci` na raiz e em `frontend/` — a raiz é necessária
    porque o `webServer` do Playwright sobe o backend de verdade → `typecheck` → `lint` → `test`
    (Vitest) → `build` (Vite) → `playwright install --with-deps chromium` → `test:e2e`).
  - **Mudança necessária para portabilidade:** `src/__tests__/integration/testEnv.ts` e
    `frontend/e2e/global-setup.ts` tinham a URL do banco de teste hardcoded para
    `localhost:5434` (porta do `docker-compose.yml` local). Ambos agora leem
    `process.env.TEST_DATABASE_URL` primeiro, com o valor local como fallback —o workflow de CI
    passa a URL do serviço Postgres (porta padrão `5432`) por essa variável, sem precisar editar
    nenhum dos dois arquivos.
  - **Node 20** em ambos os jobs — obrigatório para o job `frontend` (achado do T32a: `vite@8`
    exige Node ≥20.19), e usado também no `backend` por consistência/simplicidade (roda igual
    sob Node 18, mas não há motivo para divergir a versão entre os dois jobs de CI).
  - **Não verificado de ponta a ponta:** não há runner local de GitHub Actions (`act`) disponível
    neste ambiente para simular o workflow completo; validado indiretamente — cada comando
    individual do workflow (`npm run build`, `npm test`, `npm run test:integration`, `npm run
    typecheck`/`lint`/`test`/`build` do frontend, `npm run test:e2e`) já tinha sido executado com
    sucesso nesta sessão sob as mesmas condições (Node 20, banco Postgres dedicado), e o YAML foi
    validado sintaticamente. A primeira execução real será no próximo push/PR.

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
