# Billing SaaS - operacao inicial

Enquanto nao houver gateway recorrente integrado, a cobranca SaaS deve ser operada de forma assistida pelo superadmin.

## Cadastro comercial

1. Criar ou selecionar plano no superadmin.
2. Definir:
   - mensalidade;
   - taxa de implantacao;
   - dia de vencimento;
   - modulos habilitados;
   - limite de usuarios, atletas e equipes quando aplicavel.
3. Criar tenant do cliente com status `IMPLEMENTATION` ou `TRIAL`.
4. Criar cobranca de implantacao, se houver.

## Geracao mensal

Executar pelo superadmin a acao de gerar mensalidades do mes.

Conferencia obrigatoria:

- clientes ativos, trial ou implantacao;
- valor mensal correto;
- competencia correta;
- vencimento correto;
- ausencia de duplicidade para a mesma competencia.

## Baixa manual

1. Confirmar pagamento no banco/gateway externo.
2. Abrir cliente no superadmin.
3. Marcar cobranca como paga.
4. Conferir se cliente suspenso por inadimplencia foi reativado automaticamente quando aplicavel.

## Inadimplencia SaaS

1. Rodar revisao de inadimplencia.
2. Conferir clientes com cobrancas vencidas.
3. Entrar em contato antes da suspensao.
4. Aplicar suspensao apenas quando o prazo de tolerancia contratual vencer.
5. Registrar motivo no tenant.

## Evolucao para gateway

Quando houver volume, integrar:

- assinatura recorrente;
- boleto ou Pix recorrente;
- webhook de pagamento;
- baixa automatica;
- notificacao de vencimento;
- nota fiscal, se aplicavel.

## Criterio para sair do manual

Migrar para gateway quando houver mais de 10 clientes ativos ou quando a operacao manual consumir mais de 2 horas por mes.
