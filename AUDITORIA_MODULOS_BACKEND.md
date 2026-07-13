# Auditoria de Backend por Módulo — GestaSports

> Metodologia: levantamento tipo BMAD (Analyst → Architect) aplicado manualmente — sem os
> módulos do framework instalados localmente (`~/.bmad/cache` está vazio). Este documento faz
> o papel de *Project Brief + Architecture Gap Analysis*: o que existe, o que falta, e risco.
>
> Escopo: `src/modules/*` (Fastify + Prisma + TS), 13.116 linhas, 70 modelos Prisma, ~70 rotas.
> Acompanha o documento [MEMORIA_CALCULO_BACKEND.md](MEMORIA_CALCULO_BACKEND.md) com todas as
> fórmulas/cálculos extraídos do código.

Legenda de prioridade: 🔴 crítico (segurança/dado) · 🟠 alto (funcional) · 🟡 médio · 🟢 nice-to-have

---

## 1. Finance (`src/modules/finance/`, 2378 + 227 linhas)

**Implementado:** mensalidades (geração, baixa manual, PIX), webhook Sicoob, dashboard de
cobrança com segmentação por atraso, cadência de cobrança (D-3/D+3/D+7/D+15) com deduplicação,
produtividade de cobrança, lançamentos financeiros (receita/despesa), contratos de goleiro,
relatórios (resumo mensal, período com deltas, comparação anual, arquivo histórico, export CSV),
mandatos de presidente. Integração Sicoob PIX é real (mTLS + OAuth2 + `/cob/{txid}`), não é stub.

**Faltando / gaps:**
- 🔴 **Tenant scoping ausente em queries** — `financialEntry.findMany`, `expense.findMany`,
  `payment.findMany` (ex. `finance.routes.ts:2160, 2133`) não filtram por `tenantId` explicitamente;
  dependem 100% do middleware de contexto. Um bug no middleware = vazamento entre clubes.
- 🔴 **Webhook PIX sem assinatura criptográfica** — valida só um secret estático em header
  (`finance.routes.ts:1681-1684`); sem HMAC, sem proteção a replay.
- 🟠 **Multas/juros por atraso não existem** — status muda para `LATE` mas o valor cobrado
  nunca aumenta. Se há intenção de cobrar multa por mensalidade atrasada, é 100% a implementar.
- 🟠 **Sem reembolso/estorno** — não há rota para reverter pagamento, tratar pagamento a maior,
  ou cancelar uma baixa indevida.
- 🟠 **Sem pro-rata** — associado que entra no meio do mês é cobrado o mês cheio.
- 🟠 **Sem descontos/cupons/parcelamento** — mensalidade é sempre `associate.monthlyFeeCents` fixo.
- 🟡 **Duplicação de lógica entre módulos** — `dueDateForCompetence` e `settleMonthlyFeeIncome`
  existem tanto em `finance.routes.ts` quanto em `athletes.routes.ts`, com comportamento
  **diferente** (uma respeita `settings.monthlyDueDay`, a outra está fixa no dia 10) — risco de
  inconsistência de vencimento entre os dois fluxos.
- 🟡 **Sem transação atômica** em fluxos multi-etapa (pagamento → associado → lançamento
  financeiro → e-mail); falha no meio deixa estado inconsistente.
- 🟡 **Sem auditoria de quem alterou** lançamento financeiro/despesa (sem `userId` no registro).
- 🟢 Métodos de pagamento limitados a PIX (sem boleto/cartão/transferência).

---

## 2. Athletes (`src/modules/athletes/`, 2284 + 203 linhas)

**Implementado:** CRUD de atleta, conta/estatísticas completas, avaliações técnicas com score
calculado, autoatendimento do atleta (`/athlete/me`: perfil, evolução mensal, ranking, próximos
jogos, pagamentos), sorteio balanceado de times (algoritmo com até 300 iterações aleatórias ou
busca exaustiva para ≤20 jogadores).

**Faltando / gaps:**
- 🟠 **Billing de convidado (guest) é só schema** — `guestBillingEnabled`/`guestFeeCents` existem
  no modelo mas não há nenhuma rota/lógica que gere cobrança real para atleta convidado.
- 🟡 **Due date duplicado e divergente do finance** (ver item Finance acima) — dia 10 fixo
  (`athletes.routes.ts:128-130`) vs. configurável em `finance.routes.ts:302`.
- 🟡 **Sem testes** para o algoritmo de sorteio de times (lógica combinatória complexa, alto risco
  de regressão silenciosa).
- 🟢 Rating do atleta é só manual + avaliação técnica; não há ajuste automático por inadimplência
  ou desempenho recente fora da avaliação técnica formal.

---

## 3. Sports (`src/modules/sports/`, 800 + 1243 linhas)

**Implementado:** campos, jogos (CRUD), escalações/lineups com validação de posição e suspensão,
planos táticos (A/B/C), eventos de jogo (gol/assistência/cartão) com suspensão automática,
substituições, cronômetro de partida com máquina de estados, notificação de convocados
(e-mail/WhatsApp), rankings (artilheiros, aproveitamento, disciplina, confrontos red×white).

**Faltando / gaps:**
- 🔴 **`GET /sports/games` não filtra por `tenantId`** — só filtra por mês/ano/tipo
  (`sports.routes.ts:356-360`). Risco real de um clube ver jogos de outro.
- 🔴 **Todas as rotas de estatística (`/sports/stats/scorers`, `/competition`, `/discipline`,
  `/confrontations`) são globais, sem filtro de tenant** — rankings cruzam dados entre clubes.
- 🟡 Sem testes para o motor de cronômetro/estados de jogo.
- 🟢 Sem importação de calendário/temporada em lote (jogos só são criados um a um).

---

## 4. Dashboard (`src/modules/dashboard/`, 122 + 788 linhas)

**Implementado:** resumo unificado (financeiro + esportivo + alertas), resumo do diretor
esportivo, layout de widgets personalizável por usuário. Suporta modelo financeiro novo
(`FinancialEntry`) e legado (`Payment`/`Expense`) em paralelo para migração.

**Faltando / gaps:**
- 🟡 **Convivência de dois modelos financeiros** (`FinancialEntry` novo vs. `Payment`/`Expense`
  legado) sem rota de migração definitiva — dívida técnica que deveria ter prazo para sunset do
  legado.
- 🟢 Sem cache de dashboard (tudo recalculado a cada request); aceitável no volume atual, mas
  vira gargalo se a base crescer.

---

## 5. Auth (`src/modules/auth/`, 841 + 214 linhas)

**Implementado:** login/JWT (12h), registro via convite, reset de senha (token hash SHA-256,
expira 1h, uso único), reautenticação para ações sensíveis, gestão de usuários e papéis
(`role`/`roleAssignments`), validação de senha forte.

**Faltando / gaps (segurança):**
- 🔴 **Sem rate limiting** em `/auth/login` e `/auth/password/forgot` — força bruta e enumeração
  de e-mail são possíveis hoje.
- 🟠 **Sem bloqueio de conta** após N tentativas falhas.
- 🟠 **Sem verificação de e-mail** no registro por convite.
- 🟡 **Sem revogação de sessão/token** — logout não invalida o JWT no servidor (sem blacklist/jti).
- 🟡 **Sem 2FA.**
- 🟢 Sem histórico de senha (usuário pode reusar a mesma senha).

---

## 6. Superadmin / Tenancy (`src/modules/superadmin/` 1000 linhas + `src/modules/tenancy/`)

**Implementado:** planos SaaS, provisionamento completo de tenant (DB, admin inicial, domínio,
módulos, configurações de pagamento padrão), gestão de domínio customizado, cobrança SaaS
(geração mensal automática, enforcement de inadimplência com auto-suspensão configurável),
troca de plano com reaplicação de módulos.

**Faltando / gaps:**
- 🟠 **Sem auditoria das ações de superadmin** — mudanças em tenant/plano/cobrança não geram
  log de auditoria (diferente do módulo `audit` que cobre dados operacionais do tenant).
- 🟡 Verificação de domínio customizado é manual (sem checagem real de DNS/TXT record).
- 🟢 Sem limite/validação de tamanho em campos de texto livre de planos.

---

## 7. Associates, Clubs, Events, Group, Archive, Gallery (módulos menores, 300–532 linhas cada)

**Implementado:** CRUD de associados e cargos de diretoria, clubes/times/competições,
eventos com inscrição e controle de capacidade, configurações de grupo + solicitações de
entrada, arquivo histórico (categorias memoriais, presidentes, uniformes), galeria de mídia.

**Faltando / gaps:**
- 🔴 **Vazamento de tenant em múltiplos GETs** — `gallery.routes.ts:34-45` (consulta global de
  `MediaAsset`), e em `clubs.routes.ts` (linhas ~123-128, 180-185, 239-255, 307-317) — várias
  listagens não incluem `where: { tenantId }` explícito.
- 🟡 **Archive usa SQL raw** em vez de Prisma ORM para `MemorialCategory` — inconsistente com o
  resto do código e mais propenso a erro/injeção se algum input não for parametrizado.
- 🟡 **`monthlyFeeCents` hardcoded em 6000** na aprovação de solicitação de entrada
  (`group.routes.ts:253`) — deveria herdar de `GroupSettings`/plano em vez de valor fixo.
- 🟢 Sem paginação em algumas listagens (ex. arquivo histórico).

---

## 8. Transversal — achados que cruzam todos os módulos

| Tema | Situação | Prioridade |
|---|---|---|
| Isolamento multi-tenant em queries | Inconsistente — vários GETs sem `where: { tenantId }` explícito, dependendo só do middleware | 🔴 |
| Rate limiting | Inexistente em qualquer rota pública | 🔴 |
| Auditoria de escrita | Existe módulo `audit`, mas não cobre todas as mutações (finance, superadmin) | 🟠 |
| Transações atômicas | Ausentes em fluxos multi-tabela (pagamento, provisionamento de tenant) | 🟠 |
| Testes automatizados | Nenhum arquivo `.test.ts`/`.spec.ts` encontrado em `src/` | 🟠 |
| Soft delete | Não existe — todo DELETE é físico | 🟡 |
| Exportação de relatórios | Só CSV financeiro; sem PDF/Excel | 🟢 |

---

## 9. Backlog priorizado sugerido

1. 🔴 Adicionar `tenantId` explícito em todas as queries listadas acima (finance, sports,
   clubs, gallery) — é o risco mais sério encontrado: vazamento de dado entre clubes.
2. 🔴 Rate limiting em login/forgot-password (ex. `@fastify/rate-limit`).
3. 🔴 Assinatura HMAC no webhook PIX.
4. 🟠 Unificar `dueDateForCompetence`/`settleMonthlyFeeIncome` em um serviço compartilhado
   (`src/lib` ou `src/modules/finance/finance.service.ts`) usado por finance e athletes.
5. 🟠 Decidir e implementar: multa por atraso, pro-rata, reembolso — três peças financeiras
   claramente ausentes se o negócio precisa delas.
6. 🟠 Billing real para atletas convidados (guest) — hoje é só campo de schema sem uso.
7. 🟡 Suite de testes mínima para: sorteio de times, cálculo de score técnico, cadência de
   cobrança, máquina de estados do cronômetro de jogo.
8. 🟡 Plano de descontinuação do modelo financeiro legado (`Payment`/`Expense`) em favor de
   `FinancialEntry`.
