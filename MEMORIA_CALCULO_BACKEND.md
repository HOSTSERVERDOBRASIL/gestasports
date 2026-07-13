# Memória de Cálculo — Backend GestaSports

> Documento de referência com todas as fórmulas, scores e regras numéricas/temporais
> implementadas no backend, extraídas diretamente do código (file:line). Complementa
> [AUDITORIA_MODULOS_BACKEND.md](AUDITORIA_MODULOS_BACKEND.md). Convenção: valores monetários
> em **centavos** (`*Cents`), datas em UTC.

---

## 1. Financeiro (`src/modules/finance/finance.routes.ts`)

### 1.1 Data de vencimento da competência
```
dueDateForCompetence(month, year, dueDay) =
    Date.UTC(year, month - 1, clamp(dueDay, 1, 28))
```
- `clamp` evita problemas de mês com menos de 31 dias.
- `dueDay` padrão: `settings.monthlyDueDay` (configurável por tenant).
- Referência: `finance.routes.ts:302`.

### 1.2 Dias de diferença até hoje
```
daysDiffFromToday(date) = round((date_UTC - today_UTC) / 86_400_000)
```
- Positivo = no futuro (ainda não venceu); negativo = atrasado.
- Referência: `finance.routes.ts:296-300`.

### 1.3 Marcação de pagamento atrasado
```
SE status == PENDING E dueDate < hoje_UTC ENTÃO status = LATE
```
- Executado antes de montar dashboard de cobrança e antes de rodar a cadência.
- Referência: `finance.routes.ts:283-292`.

### 1.4 Geração de mensalidades do período
```
PARA CADA associado COM status != INACTIVE:
    SE NÃO existe Payment(associadoId, mês, ano):
        criar Payment{
            amountCents = associado.monthlyFeeCents,
            dueDate     = dueDateForCompetence(mês, ano, settings.monthlyDueDay),
            status      = PENDING
        }
```
- Referência: `finance.routes.ts:352-389`.

### 1.5 Lançamento de receita ao baixar mensalidade
```
SE existe FinancialEntry(associadoId, mês, ano, categoria=MONTHLY_FEE, tipo=INCOME):
    atualizar { amountCents, status = PAID, paidAt = agora }
SENÃO:
    criar FinancialEntry{ ..., status = PAID, paidAt = agora }
```
- Referência: `finance.routes.ts:391-436`.

### 1.6 Segmentação de inadimplência (dashboard de cobrança)
```
current  : daysDiffFromToday(dueDate) >= 0
d1_7     : atraso entre 1 e 7 dias
d8_30    : atraso entre 8 e 30 dias
d31Plus  : atraso >= 31 dias

riskPercent = (Σ amountCents[status=LATE] / Σ amountCents[status∈{PENDING,LATE}]) * 100
```
- "Top devedores": agrupa por associado, soma valores, guarda atraso máximo, ordena por
  atraso desc → valor desc, limita a 10.
- Referência: `finance.routes.ts:606-701` (risco em `:679`).

### 1.7 Estágio da régua de cobrança
```
daysDiffFromToday(dueDate) ==  3  →  PRE_DUE_3   (D-3, antes de vencer)
daysDiffFromToday(dueDate) == -3  →  D_PLUS_3    (D+3)
daysDiffFromToday(dueDate) == -7  →  D_PLUS_7    (D+7)
daysDiffFromToday(dueDate) <= -15 →  D_PLUS_15
```
- Disparo de e-mail/WhatsApp por estágio, com deduplicação via `CollectionActionLog`
  (par paymentId+stage+canal já enviado não repete).
- Referência: `finance.routes.ts:703-718` (estágios), `:796-907` (execução/dedupe).

### 1.8 Taxa de recuperação por estágio de cobrança
```
recoveryRatePercent(estágio) = (recuperados_no_estágio / enviados_no_estágio) * 100
```
- "Recuperado" = pagamento com `paidAt >= sentAt` da ação de cobrança.
- Referência: `finance.routes.ts:909-947`.

### 1.9 Resumo financeiro mensal
```
incomeCents  = Σ amountCents WHERE type=INCOME  AND status=PAID
expenseCents = Σ amountCents WHERE type=EXPENSE AND status=PAID
balanceCents = incomeCents - expenseCents
```
- Mais contagem de pendentes/atrasados e quebra por categoria.
- Referência: `finance.routes.ts:949-1005`.

### 1.10 Relatório de período com comparativos
```
percentDelta(atual, anterior) =
    SE anterior == 0:  (atual == 0 ? 0 : null)
    SENÃO:             round( (atual - anterior) / |anterior| * 100 )

marginPercent        = (balanceCents / incomeCents) * 100
expenseRatioPercent  = (expenseCents / incomeCents) * 100
delinquencyRisk      = (overdueCents / (incomeCents + pendingCents + overdueCents)) * 100
```
- Range agrupa MONTH=1 / QUARTER=3 / SEMESTER=6 / YEAR=12 meses anteriores.
- "Highlights": melhor/pior mês por `balanceCents`.
- Referência: `finance.routes.ts:1025-1030` (delta), `:1032-1161` (relatório completo).

### 1.11 Snapshot comparativo anual
- Junta, por mês (1-12): financeiro (receita/despesa/saldo/pendente/atrasado), jogos, gols,
  presenças; mais artilheiros, ranking de disciplina e confrontos do ano.
- Referência: `finance.routes.ts:1189-1386`.

### 1.12 Checkout PIX
```
SE paymentMode == PROVIDER E paymentProvider == SICOOB E há credenciais Sicoob:
    usar createSicoobPixCheckout()   // chamada HTTPS real, mTLS + OAuth2
SENÃO:
    usar createPixCheckout()         // PIX estático/manual (copia-e-cola fixo)
```
- Retorno: `{ pixCopyPaste, qrCodeDataUrl, expiresAt }`.
- Referência: `finance.routes.ts:575-604`; integração Sicoob em `sicoob-pix.service.ts` (1-227).

### 1.13 Auto-liquidação de PIX (apenas fora de produção)
```
SE autoSettleEnabled E NODE_ENV != 'production':
    agendar callback após pixAutoSettleSeconds →
        marcar Payment PAID, atualizar associado, registrar FinancialEntry, enviar e-mail
```
- Desabilitado em produção por segurança (exige webhook real do provedor).
- Referência: `finance.routes.ts:1989-2031`; guarda em `athlete-payment.service.ts:126`.

---

## 2. Atletas (`src/modules/athletes/athletes.routes.ts`)

### 2.1 Idade em uma data de referência
```
age = refDate.year - birthDate.year
SE (mesDiff < 0) OU (mesDiff == 0 E refDate.day < birthDate.day): age -= 1
age = max(0, age)
```
- Referência: `athletes.routes.ts:212-223`.

### 2.2 Faixa etária (para balanceamento de times)
```
idade < 30 → "19-29"   idade < 40 → "30-39"   idade < 50 → "40-49"
idade < 60 → "50-59"   idade >= 60 → "60+"    nulo → "UNKNOWN"
```
- Referência: `athletes.routes.ts:225-242`.

### 2.3 Tempo de associação (meses)
```
monthsBetween(de, para) = (para.year - de.year)*12 + (para.month - de.month) - (para.day < de.day ? 1 : 0)
```
- Convertido depois para rótulo "X anos e Y meses". Referência: `athletes.routes.ts:179-199`.

### 2.4 Estatísticas técnicas anuais do atleta
```
disciplineScore    = max(1, 10 - amarelos*0.7 - vermelhos*2.5)
presenceScore      = min(10, presençaPercent / 10)
confirmationScore  = min(10, confirmaçãoPercent / 10)
contributionScore  = min(10, gols*0.8 + assistências*0.6)
resultScore        = min(10, aproveitamentoPercent / 10)

statsScore = presenceScore*0.24 + confirmationScore*0.16 + contributionScore*0.24
           + resultScore*0.16 + disciplineScore*0.20            (arredondado, 1 decimal)
```
- Referência: `athletes.routes.ts:264-324`.

### 2.5 Avaliação técnica manual + score final
```
manualScore = technicalScore*0.18 + tacticalScore*0.16 + physicalScore*0.13
            + defensiveScore*0.12 + offensiveScore*0.15 + commitmentScore*0.16
            + disciplineScore*0.10

finalScore  = manualScore*0.65 + statsScore*0.35     (statsScore = item 2.4)

classificação:  finalScore >= 9.0 → "Destaque"
                finalScore >= 7.5 → "Avançado"
                finalScore >= 6.0 → "Intermediário"
                finalScore >= 4.0 → "Básico"
                finalScore <  4.0 → "Inicial"

rating_atleta = clamp(round(finalScore / 2), 1, 5)     // atualiza Athlete.rating
```
- Referência: `athletes.routes.ts:1074-1113` (pesos em `:1075-1084`, classificação em `:1085-1093`
  segundo o relatório de exploração — linhas exatas podem variar ±10 conforme versão lida).

### 2.6 Score de balanceamento de times (sorteio)
```
teamBalanceScore(red, white) =
      |Σrating_red - Σrating_white| * 55                         (nível técnico)
    + |qtdGoleiros_red - qtdGoleiros_white| * 45                  (goleiros)
    + Σ_posição |contagem_red - contagem_white| * (16~18)         (distribuição por posição)
    + |idadeMédia_red - idadeMédia_white| * 8                     (idade média)
    + Σ_faixaEtária |contagem_red - contagem_white| * (6 p/ UNKNOWN, 14 demais)
    + |tamanho_red - tamanho_white| * 8                           (tamanho do elenco)
```
- **Quanto menor, melhor** (é uma função de penalidade, não de score positivo).
- `playerTechnicalLevel = technicalBalanceScore ?? (rating * 2)`.
- Algoritmo: busca exaustiva (todas as combinações C(n,k)) se ≤20 jogadores; senão 300
  iterações aleatórias com atribuição gulosa ordenada por nível técnico desc.
- Referência: `athletes.routes.ts:506-559` (score), `:572-626` (algoritmo de split).

### 2.7 Elegibilidade para sorteio/escalação
```
bloqueado SE: status ∈ {INACTIVE, SUSPENDED}
            OU associado.status == INACTIVE
            OU medicalStatus ∈ {INJURED, TREATMENT}
canPlay = NÃO bloqueado
```
- Limite de 3 tentativas de sorteio por jogo. Mínimo de 2 goleiros contratados no pool.
- Titulares mínimos por linha: defesa ≥5, meio ≥7, ataque ≥4 (total = `playersPerTeam`, padrão 11).
- Referência: `athletes.routes.ts:1299-1303` (elegibilidade), `:1327-1356` (distribuição mínima).

### 2.8 Situação de pagamento por atleta (para listagem/bloqueio)
```
isAssociate    = linkType == ASSOCIATE E associado existe
paidThisMonth  = NÃO isAssociate OU payment.status == PAID
amountDueCents = (isAssociate E NÃO paidThisMonth) ? associado.monthlyFeeCents : 0
blockedByStatus = status != ACTIVE OU associado.status == INACTIVE
                  OU medicalStatus ∈ {INJURED, TREATMENT}
```
- Referência: `athletes.routes.ts:392-492`.

### 2.9 Ranking pessoal do atleta (`/athlete/me`)
```
fairPlayScore = amarelos + vermelhos*3
ordenação: gols desc → assistências desc → fairPlayScore asc → presençaPercent desc → vitórias desc
```
- Top 5 por métrica. Referência: `athletes.routes.ts:1617-1643`.

### 2.10 Índice de adimplência pessoal
```
adimplenciaPercent = (qtdPagamentos_PAID / qtdPagamentos_total) * 100
```
- Mais `yearlyPaidCents = Σ amountCents WHERE year=atual AND status=PAID`.
- Referência: `athletes.routes.ts:1761-1900`.

### 2.11 Vencimento de mensalidade (autoatendimento) — ⚠️ diverge do item 1.1
```
dueDateForCompetence(month, year) = Date.UTC(year, month-1, 10)     // dia 10 fixo, sem settings
```
- Referência: `athletes.routes.ts:128-130`. **Ver gap 🟡 na auditoria de módulos** — esta versão
  não respeita `settings.monthlyDueDay` como a do finance (item 1.1), gerando vencimentos
  diferentes dependendo de qual fluxo gerou o pagamento.

---

## 3. Esportivo (`src/modules/sports/sports.service.ts`)

### 3.1 Média de gols por jogo (artilheiro)
```
goalAverage = jogos > 0 ? (gols / jogos).toFixed(2) : 0
```
- Referência: `sports.service.ts:872`.

### 3.2 Aproveitamento (competição)
```
winRate = jogos > 0 ? (vitórias / jogos * 100).toFixed(1) : 0
```
- Ordenação: vitórias desc → winRate desc → jogos desc.
- Referência: `sports.service.ts:955`.

### 3.3 Score de fair play (disciplina)
```
fairPlayScore = amarelos + vermelhos * 3
```
- Ordenação: fairPlayScore desc → suspensões desc → nome asc.
- Referência: `sports.service.ts:1072`.

### 3.4 Confrontos internos (red × white)
```
goalDifference = golsRed - golsWhite
melhorSequência = maior nº de vitórias consecutivas de um mesmo lado
maiorGoleada     = partida com maior |goalDifference|
```
- Referência: `sports.service.ts:1198` e entorno.

### 3.5 Suspensão automática por cartão
```
cartão VERMELHO                      → suspensão imediata
3º cartão AMARELO (na temporada/ano) → suspensão automática
```
- Cria `CardRecord` com data/minuto/árbitro/motivo.
- Referência: extraído de `sports.routes.ts` (rota de eventos de jogo).

---

## 4. Dashboard (`src/modules/dashboard/dashboard.service.ts`)

### 4.1 Indicadores financeiros do mês
```
monthRevenueCents = Σ FinancialEntry.amountCents WHERE type=INCOME AND status=PAID
                       AND competenceMonth=mês AND competenceYear=ano
monthExpenseCents = Σ FinancialEntry.amountCents WHERE type=EXPENSE AND status=PAID (mesmo período)
balanceCents      = monthRevenueCents - monthExpenseCents
keeperCostCents   = Σ FinancialEntry.amountCents WHERE category=GOALKEEPER_CONTRACT AND status=PAID
```
- `monthlySeries`: janela rolante dos últimos 6 meses + atual.
- Referência: `dashboard.service.ts:184-296` (mais fallback legado em `:334-467` para
  `Payment`/`Expense`, mantido durante a migração para `FinancialEntry`).

### 4.2 Ranking de presença
```
presencePercent = round( confirmados / max(totalJogos, qtdLineupsDoAtleta, 1) * 100 )
```
- Ordenação: presencePercent desc → confirmados desc → nome asc; top 5.
- Referência: `dashboard.service.ts:530-545`.

---

## 5. Superadmin (`src/modules/superadmin/superadmin.routes.ts`)

### 5.1 Vencimento de cobrança SaaS do tenant
```
dueDateFor(month, year, monthlyDueDay) = mesma lógica do item 1.1, aplicada ao tenant
```
- Gerado em massa para todos os tenants ACTIVE/TRIAL/IMPLEMENTATION com `monthlyFeeCents > 0`,
  uma cobrança por (mês, ano, tipo=MONTHLY) caso ainda não exista.
- Referência: rota `POST /superadmin/billing/generate-monthly`.

### 5.2 Enforcement de inadimplência SaaS
```
daysOverdue(cobrança) = dias desde dueDate até hoje (cobrança ainda PENDING/OVERDUE)
SE max(daysOverdue de todas as cobranças abertas do tenant) >= graceDays E autoSuspendEnabled:
    tenant.status = SUSPENDED
    tenant.suspendedReason = "Suspensão automática por inadimplência SaaS: N dia(s)..."
```
- Reativação automática ocorre quando todas as cobranças em atraso são liquidadas
  (`maybeReactivateTenantAfterPayment`), se `autoReactivateEnabled`.
- Referência: rota `POST /superadmin/billing/enforce-delinquency`.

---

## 6. Notas de uso deste documento

- Todas as fórmulas com `*Cents` operam em **inteiros de centavos** — nunca em float de reais;
  qualquer nova feature financeira deve seguir essa convenção para evitar erro de ponto flutuante.
- Datas de vencimento/competência são sempre calculadas em **UTC** (`Date.UTC(...)`), evitando
  bug de fuso horário ao virar o dia.
- Onde há **duas implementações divergentes da mesma regra** (item 1.1 vs. 2.11), isto é uma
  inconsistência real do código atual, não uma variação intencional — está também listado como
  gap 🟡 na auditoria de módulos.
