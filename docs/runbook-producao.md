# Runbook de producao

## Deploy

1. Atualizar variaveis em `.env.production`.
2. Executar:

```bash
npm ci
npm --prefix frontend ci
npm run test
npm run check
npx prisma migrate deploy
npm run start
```

Com Docker:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d
```

## Healthcheck

Endpoint:

```text
/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Monitoramento minimo

- App indisponivel por mais de 2 minutos.
- `/health` sem `database: connected`.
- Erros HTTP 5xx acima do normal.
- Uso de CPU/memoria alto por mais de 10 minutos.
- Disco do banco acima de 80%.
- Backup ausente ou com falha.

## Logs

Coletar logs do processo Node ou container.

Eventos importantes:

- login;
- alteracao financeira;
- alteracao de permissao;
- criacao/suspensao de tenant;
- falha de envio de email;
- falha de webhook;
- erro 500.

## Backup

- Backup automatico diario do PostgreSQL.
- Retencao minima: 7 diarios, 4 semanais e 3 mensais.
- Testar restore antes de colocar cliente pagante.
- Restore deve acontecer em ambiente separado, nunca por cima da producao sem aprovacao.

## Incidente

1. Confirmar impacto.
2. Verificar `/health`.
3. Verificar banco.
4. Verificar deploy recente.
5. Comunicar clientes afetados.
6. Corrigir ou fazer rollback.
7. Registrar causa raiz e acao preventiva.

## Rotina semanal

- Conferir backups.
- Conferir tenants suspensos/inadimplentes.
- Conferir erros 5xx.
- Conferir logs de auditoria sensiveis.
- Rodar `npm audit --audit-level=high` no ciclo de manutencao.
