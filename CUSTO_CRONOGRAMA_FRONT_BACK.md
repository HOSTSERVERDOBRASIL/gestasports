# Custo e Cronograma — O que falta implementar (Backend + Frontend + Integração)

> Taxa de mão de obra usada neste documento: **R$ 30,00/hora**, um único desenvolvedor full-stack.
> Estimativas são de esforço de desenvolvimento (código + teste manual do próprio item); não
> incluem hospedagem, domínio, certificados, ou suporte pós-entrega.
>
> Este documento substitui o cálculo isolado de backend e incorpora o frontend e a integração
> entre os dois, que não tinham sido cobertos em [AUDITORIA_MODULOS_BACKEND.md](AUDITORIA_MODULOS_BACKEND.md)
> e [MEMORIA_CALCULO_BACKEND.md](MEMORIA_CALCULO_BACKEND.md).

---

## 0. Panorama rápido

| Camada | Maturidade atual | Observação |
|---|---|---|
| Backend | ~85% das rotas necessárias existem | Faltam regras financeiras específicas e hardening de segurança |
| Frontend | 43 páginas, ~38 já consomem API real | Stack: React 19 + Vite + TS + React Router 7 + TanStack Query + Tailwind (sem lib de componentes) |
| Integração | A maior parte do que existe no backend tem tela | Mas várias telas estão **parciais** (leem dado, não têm o formulário de criar/editar) |
| Testes (front e back) | **Zero arquivos de teste em todo o projeto** | Maior risco de regressão silenciosa ao crescer |

---

## 1. Backend — itens essenciais (core)

| # | Item | Módulo | Por quê | Horas |
|---|---|---|---|---|
| B1 | Corrigir filtro de `tenantId` ausente em ~10 endpoints (`/sports/games`, stats esportivas, galeria, clubes, lançamentos financeiros) | Transversal | Risco de vazamento de dado entre clubes — o achado mais sério da auditoria | 12h |
| B2 | Rate limiting em `/auth/login` e `/auth/password/forgot` | Auth | Hoje é possível força-bruta e enumeração de e-mail | 4h |
| B3 | Assinatura HMAC no webhook PIX (`/finance/pix-webhook/:provider`) | Finance | Hoje só compara um secret estático em header | 4h |
| B4 | Unificar `dueDateForCompetence`/baixa de mensalidade em um serviço único (hoje duplicado e divergente entre `finance` e `athletes`) | Finance/Athletes | Vencimentos diferentes dependendo de qual rota gerou o pagamento | 6h |
| B5 | Multa por atraso (configurável: % ou valor fixo, acúmulo por dia/mês) | Finance | Hoje pagamento atrasado nunca aumenta de valor | 12h |
| B6 | Reembolso/estorno de pagamento (rota + impacto no lançamento financeiro + auditoria) | Finance | Não existe nenhuma forma de reverter um pagamento indevido hoje | 10h |
| B7 | Pro-rata para associado que entra no meio do mês | Finance | Hoje cobra mês cheio sempre | 8h |
| B8 | Billing real para atleta convidado (gerar cobrança quando `guestBillingEnabled`, rota de listagem/baixa) | Athletes/Finance | Hoje é só campo de schema, sem nenhuma lógica | 10h |
| B9 | Transações atômicas nos fluxos multi-tabela (pagamento → associado → lançamento; provisionamento de tenant) | Transversal | Falha no meio do fluxo hoje deixa estado inconsistente | 6h |
| B10 | Auditoria de mutações em `finance` e `superadmin` (hoje só dados operacionais do tenant são auditados) | Audit | Sem rastro de quem alterou cobrança/plano/tenant | 6h |
| B11 | Verificação de e-mail no registro por convite | Auth | Convite hoje não confirma propriedade do e-mail | 4h |
| B12 | Bloqueio de conta após N tentativas de login falhas | Auth | Complementa o rate limiting (B2) | 4h |
| B13 | Revogação de sessão real (logout invalida o token no servidor) | Auth | Hoje logout só limpa o token no cliente; token continua válido até expirar (12h) | 8h |
| B14 | Suíte de testes automatizados do backend (funções de cálculo: vencimento, scores, balanceamento de times, régua de cobrança; testes de integração nas rotas críticas de finance/sports) | Transversal | Zero testes hoje; é a maior parte das fórmulas documentadas na memória de cálculo | 24h |
| | **Subtotal backend core** | | | **118h** |

### Backend — itens opcionais (nice-to-have, não bloqueiam operação)

| # | Item | Horas |
|---|---|---|
| B15 | Soft delete (hoje todo DELETE é físico) | 8h |
| B16 | Autenticação em dois fatores (2FA) | 16h |
| | **Subtotal opcional** | **24h** |

---

## 2. Frontend — itens essenciais (core)

> A auditoria mostrou que a maioria das telas já existe e consome API real (43 páginas, ~38 com
> integração real). O problema não é "falta tela" — é **fluxo incompleto**: a tela lê dado mas não
> tem o formulário de criar/editar, ou a ação existe no backend e não tem botão na UI.

| # | Item | Tela/Módulo | Por quê | Horas |
|---|---|---|---|---|
| F1 | Formulário de criação/edição de avaliação técnica do atleta | Atletas | Hoje a aba "Avaliação" só **lê** (`GET`); o `POST` do backend não tem UI | 6h |
| F2 | Ação de excluir evento de jogo (gol/cartão lançado errado) | Jogos | Backend permite `DELETE`, frontend não tem botão | 3h |
| F3 | Botão/modal "Convocar atletas" (dispara e-mail/WhatsApp) | Jogos | Rota `/sports/games/:id/notify` existe e não é usada em nenhuma tela | 5h |
| F4 | Exibir resultado da régua de cobrança após executar (quantos enviados/pulados) | Financeiro | Hoje a chamada acontece mas o resultado não aparece para o usuário | 4h |
| F5 | Completar o fluxo de geração de mensalidades (escolher mês + confirmar) | Financeiro | Mutation existe, fluxo de UI está incompleto | 5h |
| F6 | Modal de reautenticação para ações sensíveis (excluir usuário, mudar config crítica) | Transversal | Backend tem `/auth/reauth`; frontend não usa em nenhum lugar | 8h |
| F7 | CRUD de anexos no Acervo/Memorial (adicionar/remover arquivo individual) | Arquivo | Hoje o formulário genérico não dá para gerenciar anexos um a um | 8h |
| F8 | Indicador de "tenant suspenso por inadimplência" na tela de superadmin | Superadmin | Backend calcula isso (enforcement de inadimplência), UI não mostra | 3h |
| F9 | Exportação CSV/PDF para relatórios esportivos (hoje só financeiro tem) | Relatórios | Paridade com o que já existe no financeiro | 4h |
| F10 | Checkout PIX do próprio atleta, fim a fim | Portal do atleta | Tela existe, falta fechar o fluxo de pagamento completo | 6h |
| F11 | Tela separada de auditoria de ações do superadmin (hoje só mostra auditoria do tenant) | Superadmin | Depende de B10 | 5h |
| F12 | Aviso/expiração de sessão (UX ao token vencer em 12h) | Transversal | Hoje o usuário só percebe quando uma chamada falha | 4h |
| F13 | UI de multa por atraso (configuração + exibição no boleto/mensalidade) | Financeiro | Depende de **B5** | 6h |
| F14 | UI de reembolso/estorno | Financeiro | Depende de **B6** | 5h |
| F15 | UI de indicação de pro-rata na criação de associado | Financeiro | Depende de **B7** | 3h |
| F16 | UI de billing de convidado (habilitar + configurar valor) | Atletas/Financeiro | Depende de **B8** | 5h |
| F17 | Componentes de design system: variantes de botão, modal genérico, toast/notificação, dropdown/select, date picker, paginação | Design system | Hoje são 100% Tailwind ad-hoc (10 componentes reaproveitáveis para 43 páginas); sem isso cada novo fluxo (F1-F16) reinventa modal/toast | 24h |
| F18 | Suíte de testes automatizados do frontend (Vitest + React Testing Library nos componentes/hooks críticos + Playwright para login/financeiro/jogos) | Transversal | Zero testes hoje | 30h |
| | **Subtotal frontend core** | | | **134h** |

### Frontend — itens opcionais

| # | Item | Horas |
|---|---|---|
| F19 | Refatorar páginas grandes (Jogos 8.251 linhas, Financeiro 2.108, Superadmin 2.560) para usar o novo design system (F17) | 12h |
| F20 | "Lembrar-me" / refresh token (hoje é preciso logar a cada sessão nova do navegador) | 6h |
| | **Subtotal opcional** | **18h** |

---

## 3. Totais e custo (R$ 30/hora)

| Bloco | Horas | Custo |
|---|---|---|
| Backend core (seção 1) | 118h | R$ 3.540 |
| Frontend core (seção 2) | 134h | R$ 4.020 |
| **Subtotal core (mínimo viável)** | **252h** | **R$ 7.560** |
| Contingência de integração/QA/debug (15% sobre o core — padrão de mercado para imprevistos, ajustes de integração e testes manuais cruzados) | 38h | R$ 1.140 |
| **Total recomendado (core + contingência)** | **290h** | **R$ 8.700** |
| Backend opcional (B15-B16) | 24h | R$ 720 |
| Frontend opcional (F19-F20) | 18h | R$ 540 |
| **Total se incluir tudo (core + contingência + opcionais)** | **338h** ¹ | **R$ 10.140** ¹ |

¹ contingência de 15% aplicada apenas sobre o core; os itens opcionais entram sem contingência adicional.

---

## 4. Cronograma estimado (uma pessoa só)

| Dedicação | Core (252h) | Core + contingência (290h) | Tudo (338h) |
|---|---|---|---|
| Full-time, 40h/semana | ~6,3 semanas | ~7,3 semanas | ~8,5 semanas |
| Meio período, 20h/semana | ~12,6 semanas | ~14,5 semanas | ~17 semanas |
| Noites/fins de semana, 15h/semana | ~16,8 semanas | ~19,3 semanas | ~22,5 semanas |

---

## 5. Se o orçamento for limitado: o que priorizar primeiro

Ordem sugerida pelo critério **risco × dependência** (o que destrava o resto e o que expõe dado
indevidamente é prioridade, independente de "parecer pequeno"):

1. **B1 + B2 + B3** (24h / R$720) — segurança e vazamento de dado entre clubes. Não é
   negociável antes de qualquer cliente novo entrar em produção.
2. **B4** (6h / R$180) — vencimento de mensalidade consistente; sem isso, qualquer feature
   financeira nova herda o bug.
3. **B5 + F13**, **B6 + F14**, **B7 + F15**, **B8 + F16** (back+front pareados, 60h / R$1.800) —
   as quatro lacunas financeiras reais (multa, reembolso, pro-rata, convidado). Cada par já vem
   com tela; pode ser entregue um por vez.
4. **F1 a F12** (sem F17/F18) — fecha os fluxos que já têm backend pronto e só falta UI; é o
   ganho de percepção mais rápido para quem usa o sistema no dia a dia (66h / R$1.980).
5. **B14 + F18** (testes, 54h / R$1.620) — o item que mais costuma ser cortado e é o que evita
   que os itens 1-4 quebrem silenciosamente depois.
6. **F17** (design system, 24h / R$720) — vale antes de continuar abrindo telas novas, mas pode
   esperar se o prazo for curto.
7. Demais itens B9-B13, F19-F20 e os opcionais B15/B16 — fazem o produto mais robusto, mas
   nenhum deles bloqueia uso real hoje.
