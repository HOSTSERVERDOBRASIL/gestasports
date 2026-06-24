# Mapa de integrações de pagamento

Este mapa separa bancos Pix diretos, gateways de pagamento e a estratégia recomendada para o GestaSports.

## Prioridade recomendada

1. Sicoob / Credisc
   - Prioridade: alta, por ser o banco alvo atual.
   - Uso: Pix cobrança com txid, QR dinâmico e webhook de liquidação.
   - Exige: client_id, client_secret, certificado mTLS, chave Pix, URLs de homologação/produção e formato real do webhook.

2. Asaas
   - Prioridade: alta para vender como SaaS.
   - Uso: Pix, boleto, cartão, recorrência, régua de cobrança e webhooks.
   - Exige: API key sandbox/produção e webhook.
   - Vantagem: integração mais simples que banco direto.

3. Efí / Gerencianet
   - Prioridade: alta para Pix direto.
   - Uso: Pix cobrança, Pix com vencimento, webhook, certificados e Pix Automático.
   - Exige: client_id, client_secret, certificado P12/PEM e escopos Pix.

4. Mercado Pago
   - Prioridade: média/alta.
   - Uso: Pix, cartão, boleto, checkout transparente, links, assinaturas e notificações.
   - Exige: conta Mercado Pago, aplicação, access token e configuração de notificações.

5. Stripe
   - Prioridade: média.
   - Uso: Pix, cartão, checkout, subscriptions e Connect.
   - Exige: conta Stripe, chaves API, webhooks e habilitação do Pix.

## Bancos Pix diretos

| Provedor | Status no sistema | Integração esperada | Observação |
| --- | --- | --- | --- |
| Sicoob / Credisc | Opção disponível + cliente inicial | API Pix Bacen-like com OAuth2/mTLS | Melhor começar por aqui. |
| Itaú | Opção disponível | API Pix/Open Finance/portal developer | Precisa contrato e documentação da conta PJ. |
| Banco do Brasil | Opção disponível | Portal Developers BB | Tem portal público, detalhes Pix dependem de produto/habilitação. |
| Bradesco | Opção disponível | API bancária/portal developer | Precisa acesso empresarial/dev. |
| Caixa | Opção disponível | API bancária/convênio | Geralmente depende de relacionamento PJ. |
| Santander | Opção disponível | API bancária/portal developer | Precisa acesso empresarial/dev. |
| Efí / Gerencianet | Opção disponível | API Pix com certificado | Boa alternativa bancária pronta para dev. |

## Gateways

| Gateway | Status no sistema | Meios úteis | Melhor uso |
| --- | --- | --- | --- |
| Asaas | Opção disponível | Pix, boleto, cartão, recorrência | Cobrança de mensalidades e SaaS. |
| Mercado Pago | Opção disponível | Pix, cartão, boleto, checkout | Cobrança rápida e checkout amplo. |
| Stripe | Opção disponível | Pix, cartão, checkout, subscriptions, Connect | Plataforma SaaS e pagamentos internacionais. |

## Base técnica Pix

A API Pix oficial do Banco Central define o padrão funcional que muitos bancos seguem:

```text
PUT /cob/{txid}
GET /cob/{txid}
GET /pix
PUT /webhook/{chave}
GET /webhook/{chave}
DELETE /webhook/{chave}
```

Para bancos diretos, espere sempre:

```text
OAuth2 client_credentials
certificado mTLS
escopos: cob.write, cob.read, pix.read, webhook.write, webhook.read
chave Pix do recebedor
webhook público HTTPS
validação de assinatura/segredo
conciliação por txid/e2eid
```

## Decisão prática

Para vender rápido:

```text
Piloto: Pix manual + baixa manual
Produção assistida: Sicoob/Credisc ou Efí
SaaS comercial: Asaas primeiro, depois Mercado Pago/Stripe
Bancos grandes: manter como opções, integrar sob demanda conforme cliente tiver contrato/API liberada
```

## Links oficiais úteis

```text
Bacen API Pix: https://github.com/bacen/pix-api
Bacen visualização API Pix: https://bacen.github.io/pix-api/
Sicoob Developers: https://developers.sicoob.com.br/portal/apis
Banco do Brasil Developers: https://developers.bb.com.br/
Asaas API: https://docs.asaas.com/reference/comece-por-aqui
Efí API Pix: https://dev.efipay.com.br/docs/api-pix/credenciais/
Mercado Pago Developers: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/overview
Stripe Pix: https://docs.stripe.com/payments/pix
```

