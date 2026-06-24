# Checklist de pre-producao - GestaSports

Use este checklist antes de colocar um cliente pagante no ar.

## 1. Seguranca obrigatoria

- `NODE_ENV=production`.
- `JWT_SECRET` forte, unico e fora do repositorio.
- `SMTP_HOST`, `SMTP_PORT` e `SMTP_FROM` configurados.
- Nenhum usuario criado com senha padrao.
- Senhas iniciais comunicadas por canal seguro e trocadas no primeiro atendimento.
- `CORS_ORIGINS` restrito aos dominios reais.
- Acesso ao banco protegido por SSL, IP allowlist ou rede privada.

## 2. Banco e tenant

- `npm run tenant:audit` sem registros com `tenantId` nulo.
- `npx prisma migrate deploy` executado no banco de producao.
- Backup automatico configurado.
- Restore testado em ambiente separado.
- Tenant do cliente com dominio/subdominio, modulos e admin inicial.

## 3. Onboarding do clube

- Dados institucionais: nome, marca, cores, logo, telefone e email.
- Plano contratado e modulos habilitados.
- Usuarios iniciais: admin, financeiro e pelo menos um responsavel esportivo.
- Pix ou instrucoes de cobranca interna configurados.
- Campos/locais cadastrados.
- Categorias/equipes iniciais cadastradas.
- Associados/atletas importados ou cadastrados.
- Primeiro jogo cadastrado e validado.
- Fluxo de convite testado.

## 4. Operacao e observabilidade

- `/health` retorna `database: connected`.
- Logs do app coletados pelo provedor de hospedagem.
- Alertas para app fora do ar, erro 5xx e banco indisponivel.
- Rotina de deploy documentada.
- Responsavel por suporte definido.
- Janela de manutencao combinada com cliente piloto.

## 5. Billing SaaS

- Plano do cliente registrado no superadmin.
- Valor mensal, implantacao e vencimento conferidos.
- Cobranca SaaS inicial criada.
- Processo manual de baixa definido enquanto nao houver gateway recorrente.
- Regra de suspensao/reabilitacao validada.

## 6. LGPD e comercial

- Contrato de prestacao com escopo e SLA basico.
- Politica de privacidade publicada.
- Termos de uso aceitos pelo cliente.
- Canal de solicitacao de exportacao/exclusao de dados.
- Responsavel interno por incidentes de seguranca.

## Criterio de liberacao

O cliente so deve entrar em producao quando todos os itens de seguranca, banco, onboarding e observabilidade estiverem marcados.
