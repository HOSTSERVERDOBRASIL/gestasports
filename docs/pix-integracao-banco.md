# Integração Pix com banco/provedor

O sistema já gera QR Code Pix e copia-e-cola. Para baixa automática em produção, o banco ou provedor Pix deve chamar o webhook do sistema quando a cobrança for paga.

## Endpoint

Configure no banco/provedor:

```text
POST https://seu-dominio.com/api/finance/pix-webhook/SICOOB
```

Para Credisc/Sicoob, use `SICOOB` como provedor ativo em Configurações > Pix e ferramentas. O endpoint também aceita `ASAAS`, `EFI`, `MERCADO_PAGO`, `STRIPE` ou `MANUAL_PIX`, conforme o provedor configurado.

## Segurança

Envie um dos headers abaixo com o mesmo segredo salvo em `Segredo do webhook`:

```text
x-gestasports-webhook-secret: seu-segredo
```

ou:

```text
Authorization: Bearer seu-segredo
```

Sem esse segredo, o sistema não aceita a baixa.

## Payload aceito

O payload mínimo para confirmar uma cobrança é:

```json
{
  "txid": "id-da-mensalidade-ou-prefixo",
  "status": "PAID",
  "paidAt": "2026-06-12T12:00:00.000Z",
  "amountCents": 6000
}
```

Também são aceitos `paymentId` ou `externalReference` no lugar de `txid`.

Para Sicoob/Credisc, configure a cobrança Pix usando o `txid` gerado pelo sistema como referência da mensalidade. Se o painel/API do Sicoob permitir "identificador externo" ou "referência", envie o mesmo valor em `externalReference`.

## Sicoob / Credisc

A API Pix usada pelo Sicoob tende a seguir a especificação oficial da API Pix do Banco Central. Para fechar a integração real, solicite ao Credisc/Sicoob:

```text
client_id
client_secret
certificado mTLS (.pfx, .p12 ou .pem)
senha do certificado
chave Pix da conta recebedora
base URL de homologação
base URL de produção
escopos OAuth liberados
formato real do webhook de Pix recebido/liquidado
```

Fluxo esperado:

```text
1. Autenticar na API do Sicoob com OAuth2 e certificado mTLS.
2. Criar uma cobrança Pix imediata usando o txid da mensalidade.
3. Receber do Sicoob o payload/loc/BR Code da cobrança.
4. Mostrar QR Code e copia-e-cola ao associado.
5. Receber webhook do Sicoob quando o Pix for liquidado.
6. Dar baixa automática na mensalidade no sistema.
```

Endpoints esperados pelo padrão Bacen Pix API:

```text
PUT /cob/{txid}
GET /cob/{txid}
GET /pix
PUT /webhook/{chave}
GET /webhook/{chave}
DELETE /webhook/{chave}
```

O nome exato da URL base e os detalhes de autenticação podem variar no Sicoob. Por isso, não use endpoints de exemplo em produção sem confirmar no portal Developers Sicoob ou com o suporte técnico do Credisc.

Status tratados como pagamento confirmado:

```text
PAID, CONFIRMED, COMPLETED, APPROVED, RECEIVED, CONCLUIDA, CONCLUIDO, LIQUIDADO
```

## Produção

Em produção, a baixa automática de teste fica desativada pelo backend. Pagamento só deve ser confirmado por webhook do banco/provedor ou por baixa manual do financeiro.
