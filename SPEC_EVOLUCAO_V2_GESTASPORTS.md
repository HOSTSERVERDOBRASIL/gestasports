# SPEC Evolucao v2 - GestaSports

Data: 2026-06-02

## 1. Objetivo

Transformar o sistema atual em um SaaS esportivo corporativo, separando claramente o controle da plataforma GestaSports do painel operacional de cada clube.

O produto deve ter duas experiencias distintas:

- GestaSports Admin SaaS: control plane da empresa, usado para gerenciar clientes, dominios, billing, modulos, logs e provisionamento.
- Painel do Cliente / Clube: ambiente isolado do clube, usado para gerenciar atletas, equipes, jogos, escalacoes, financeiro, comunicacao e relatorios.

## 2. Estado atual considerado

O projeto ja possui base importante para a evolucao:

- `OrganizationTenant` para clientes/tenants.
- `TenantDomain` para dominios e subdominios.
- `SaaSCharge` para cobrancas da plataforma.
- `AuditLog` para rastreabilidade.
- `tenantId` em grande parte das tabelas operacionais.
- Tela `SuperadminPage` com gestao de clientes, dominios, acessos, marca, billing e logs.
- Navegacao atual ainda mistura operacao do clube com itens de control plane.

O ponto critico da v2 e transformar essa base em produto SaaS consistente, visualmente corporativo e tecnicamente seguro para multiplos clientes.

## 3. Separacao de produto

### 3.1 GestaSports Admin SaaS

Publico: equipe interna GestaSports, suporte, comercial e operacao.

Deve conter:

- Dashboard SaaS com receita recorrente, clientes ativos, clientes suspensos, inadimplencia SaaS e status de provisionamento.
- Clientes com lista forte em tabela, busca, filtros por status e saude operacional.
- Cadastro e setup wizard de cliente.
- Dominios e subdominios por cliente.
- Tema/marca por cliente.
- Modulos contratados e habilitados por cliente.
- Usuarios administradores do cliente.
- Billing SaaS: planos, mensalidades, implantacao, extras, vencimento, status e historico.
- Provisionamento automatico.
- Logs de auditoria globais.
- Acoes administrativas: ativar, suspender, cancelar, reprocessar provisionamento e resetar acesso inicial.

Nao deve conter rotinas esportivas do clube como escala, jogo, atleta, mensalidade interna ou relatorio esportivo.

### 3.2 Painel do Cliente / Clube

Publico: diretoria, financeiro, comissao, atletas e convidados do clube.

Deve conter:

- Dashboard operacional do clube.
- Atletas, associados, categorias, equipes e temporadas.
- Agenda de jogos.
- Confirmacoes/presencas.
- Escalacoes.
- Sumula e eventos de jogo.
- Ranking esportivo.
- Mensalidades, inadimplencia, receitas e despesas.
- Documentos e anexos.
- Comunicacao com atletas/associados.
- Relatorios administrativos, financeiros e esportivos.
- Configuracoes do clube, dentro dos limites permitidos pelo plano.

Nao deve conter gestao comercial da GestaSports, billing SaaS, provisionamento, dominios globais ou controle de outros clientes.

## 4. Diretriz visual v2

O visual deve sair de "cards amontoados" e assumir uma linguagem de sistema corporativo:

- Sidebar limpa, com secoes curtas e separadas por contexto.
- Topbar discreta, com tenant atual, periodo global e perfil.
- Tabelas fortes para listas principais.
- Tabs para agrupar operacoes dentro de uma mesma area.
- Menos cores e menos sombras.
- Mais hierarquia tipografica e espacamento previsivel.
- Botoes menores, com texto objetivo e icones quando fizer sentido.
- Superficies com borda sutil, raio maximo de 8px e sombra minima ou ausente.
- Cards apenas para indicadores, itens repetidos ou estados realmente resumidos.
- Vermelho reservado exclusivamente para erro, suspensao, cancelamento, bloqueio ou alerta grave.

### 4.1 Paleta recomendada

- Texto principal: slate/neutral escuro.
- Fundo: cinza muito claro ou branco.
- Bordas: slate claro.
- Primaria GestaSports: azul institucional escuro.
- Sucesso: verde somente para status positivo.
- Atencao: amarelo/ambar para pendencias nao criticas.
- Perigo: vermelho somente para erro, suspensao, cancelamento ou inadimplencia grave.

### 4.2 Componentes padrao

- Listagens: tabela com coluna de status, acoes compactas e filtros acima.
- Formularios: layout em grid, labels claros, botoes no rodape da secao.
- Filtros: busca, status, periodo, modulo e perfil em linha unica quando possivel.
- Tabs: usadas em cliente, financeiro, jogos, relatorios e configuracoes.
- Badges: neutros por padrao, coloridos apenas quando o status exigir.

## 5. Arquitetura SaaS alvo

### 5.1 Multi-tenant

Regras obrigatorias:

- Toda tabela operacional deve ter `tenantId` obrigatorio, exceto tabelas realmente globais da plataforma.
- Toda consulta operacional deve filtrar por `request.tenant.id`.
- Toda escrita operacional deve gravar `tenantId` a partir do contexto autenticado, nunca do body livre.
- Login deve ser escopado por `email + tenantId`.
- O mesmo email pode existir em clubes diferentes.
- Superadmin pode acessar control plane, mas nao deve misturar dados de clubes sem contexto explicito.
- Seeds e scripts devem criar tenants e dados com `tenantId`.

### 5.2 Modelos SaaS adicionais

Adicionar ou consolidar:

- `TenantModule`: modulos habilitados por tenant.
- `TenantSetupStep`: progresso do setup wizard.
- `TenantTheme`: tema visual do cliente, caso a configuracao cresca alem de `OrganizationTenant`.
- `AccessProfile`: perfis customizaveis por tenant.
- `AccessPermission`: permissoes granulares por perfil.
- `ProvisioningJob`: fila/status de provisionamento e retries.
- `BillingPlan`: catalogo de planos SaaS.
- `BillingSubscription`: assinatura ativa do tenant.
- `BillingInvoice`: faturas SaaS, podendo evoluir a partir de `SaaSCharge`.

### 5.3 Modulos ativaveis

Modulos sugeridos:

- `ATHLETES`
- `CATEGORIES`
- `TEAMS`
- `SEASONS`
- `GAMES`
- `LINEUPS`
- `ATTENDANCE`
- `RANKINGS`
- `FINANCE`
- `DELINQUENCY`
- `REPORTS`
- `DOCUMENTS`
- `COMMUNICATION`
- `GALLERY`

Cada modulo deve controlar:

- visibilidade na sidebar;
- acesso as rotas;
- permissoes de API;
- recursos disponiveis no painel do clube;
- plano comercial que libera o modulo.

## 6. Funcionalidade esportiva alvo

### 6.1 Atletas

- Cadastro completo com dados pessoais, posicao, status, foto, documento, observacoes e condicao medica.
- Vinculo opcional com associado.
- Historico esportivo, financeiro e disciplinar.
- Avaliacoes tecnicas por temporada.
- Filtros por status, categoria, equipe, posicao e inadimplencia.

### 6.2 Categorias

- Cadastro de categorias como Sub-11, Sub-13, Adulto, Veterano ou Livre.
- Regras por faixa etaria e genero, quando aplicavel.
- Vinculo com atletas, equipes, jogos e temporadas.

### 6.3 Equipes

- Equipes por clube e temporada.
- Comissao tecnica e elenco vinculado.
- Uniformes, cores, escudo e configuracoes.
- Equipes internas e externas.

### 6.4 Temporadas

- Temporada ativa por tenant.
- Calendario, ranking, financeiro e disciplina por temporada.
- Encerramento com snapshot de resultados.

### 6.5 Jogos

- Agenda com filtros por periodo, categoria, equipe e status.
- Jogos internos e externos.
- Local, adversario, valor, responsaveis, anexos e status.
- Sumula com eventos, placar, cartoes e substituicoes.

### 6.6 Escalacoes

- Escalacao por jogo, equipe, lado e funcao.
- Bloqueio automatico de atleta suspenso ou inapto.
- Confirmacao de presenca.
- Banco/reservas.
- Historico de tentativas de escala.

### 6.7 Presencas

- Confirmacao por atleta.
- Check-in administrativo.
- Status: confirmado, ausente, atrasado, cortado, sem resposta.
- Relatorio de assiduidade.

### 6.8 Ranking

- Artilharia, assistencias, participacoes, media tecnica, fair play e presenca.
- Ranking por temporada, equipe e categoria.
- Criterios configuraveis por clube.

### 6.9 Financeiro do clube

- Mensalidades por associado/atleta.
- Receitas e despesas.
- Centros de custo.
- Comprovantes.
- Cobranca manual ou automatizada.
- Inadimplencia com funil de cobranca.
- Integracao futura com gateway de pagamento.

### 6.10 Documentos

- Documentos do atleta, contrato, autorizacao, recibos e anexos.
- Status de validade.
- Alertas de documento vencido.
- Permissao por perfil.

### 6.11 Comunicacao

- Comunicados por equipe, categoria, perfil ou atleta.
- Templates de cobranca, jogo e convocacao.
- Historico de envio.
- Canais futuros: email, WhatsApp e notificacao interna.

## 7. Fases de implementacao

## Fase 1 - Correcao visual e navegacao

Objetivo: separar visualmente o SaaS admin do painel do clube e deixar a interface mais corporativa.

Entregas:

- Separar navegacao em dois contextos: `superadmin` e `club`.
- Remover duplicidade de secoes de jogos na sidebar.
- Reorganizar sidebar do clube em: Operacao, Esportivo, Financeiro, Relatorios, Configuracoes.
- Reorganizar sidebar do GestaSports em: Dashboard, Clientes, Billing, Provisionamento, Modulos, Logs.
- Trocar listagens principais de cards para tabelas.
- Reduzir sombras, excesso de cores e botoes grandes.
- Ajustar uso do vermelho apenas para erro/suspensao/alerta grave.
- Padronizar tabs nas paginas densas.
- Revisar `FinanceiroPage`, `SuperadminPage`, `AthletesPage`, `DashboardPage` e `AppLayout`.

Criterios de aceite:

- Superadmin nao ve menus esportivos do clube.
- Usuario de clube nao ve menus de billing SaaS, provisionamento ou clientes.
- Listas principais usam tabela ou layout tabular.
- Sidebar fica legivel em desktop e mobile.
- Nenhum card usa vermelho como cor decorativa.

## Fase 2 - Multi-tenant e setup de clientes

Objetivo: tornar o sistema seguro para multiplos clientes no mesmo banco.

Entregas:

- Tornar `tenantId` obrigatorio nas tabelas operacionais.
- Criar migracao para preencher `tenantId` legado antes de aplicar `NOT NULL`.
- Revisar todas as rotas para filtrar por `request.tenant.id`.
- Impedir que body/query sobrescreva `tenantId`.
- Criar middleware/helper padrao para queries por tenant.
- Criar setup wizard por cliente.
- Criar checklist de implantacao por tenant.
- Melhorar provisionamento automatico com status, erro, retry e historico.
- Garantir login por dominio/subdominio e `email + tenantId`.

Criterios de aceite:

- Teste prova que um tenant nao acessa dados de outro.
- Todas as tabelas operacionais criticas tem `tenantId NOT NULL`.
- Setup wizard cria cliente com dominio, admin, tema, modulos e financeiro inicial.
- Provisionamento registra sucesso, falha e reprocessamento.

## Fase 3 - Modulos esportivos

Objetivo: fortalecer o produto do clube como sistema esportivo completo.

Entregas:

- Criar categorias.
- Criar equipes.
- Vincular atletas a categoria, equipe e temporada.
- Melhorar temporadas como eixo principal de jogos e rankings.
- Evoluir jogos, escalacoes e presencas.
- Melhorar rankings esportivos.
- Adicionar documentos de atleta.
- Adicionar comunicacao basica.
- Controlar acesso por modulos ativados.

Criterios de aceite:

- Clube consegue operar temporada, categoria, equipe, atletas, jogos, escala e presenca.
- Rankings funcionam por temporada e categoria/equipe.
- Modulo desativado nao aparece na UI e bloqueia API.
- Documentos e comunicados ficam isolados por tenant.

## Fase 4 - Financeiro

Objetivo: tornar o financeiro do clube robusto e separar completamente do billing SaaS.

Entregas:

- Separar nomenclatura: "Financeiro do Clube" e "Billing SaaS".
- Mensalidades recorrentes por atleta/associado.
- Inadimplencia com status e acoes de cobranca.
- Centros de custo.
- Fluxo de caixa por competencia e periodo.
- Comprovantes e anexos.
- Relatorios financeiros por tenant.
- Preparar integracao com gateway de pagamento.

Criterios de aceite:

- Financeiro do clube nao mistura cobrancas SaaS.
- Inadimplencia do atleta/associado aparece no painel do clube.
- Inadimplencia SaaS aparece apenas no GestaSports Admin.
- Relatorios batem com entradas financeiras e mensalidades.

## Fase 5 - Relatorios e automacoes

Objetivo: transformar dados operacionais em acompanhamento administrativo.

Entregas:

- Relatorios esportivos por temporada, equipe e atleta.
- Relatorios financeiros por competencia, categoria e centro de custo.
- Relatorio de inadimplencia.
- Relatorio de presenca.
- Relatorio de documentos pendentes.
- Exportacao CSV inicialmente; PDF/Excel como melhoria posterior.
- Automacoes de cobranca, lembrete de jogo, documento vencido e tenant em risco.

Criterios de aceite:

- Relatorios respeitam tenant, perfil e modulo contratado.
- Exportacoes mantem filtros aplicados.
- Automacoes geram log de execucao.
- Falha de automacao nao quebra fluxo manual.

## Fase 6 - SaaS comercial

Objetivo: deixar a GestaSports pronta para vender, implantar e operar clientes em escala.

Entregas:

- Catalogo de planos.
- Modulos por plano.
- Assinaturas.
- Faturas SaaS.
- Status comercial do cliente.
- Tela de saude do cliente.
- Metricas: MRR, clientes ativos, churn, inadimplencia SaaS, implantacoes pendentes.
- Workflow de suspensao/cancelamento.
- Registro de contato comercial e suporte.
- Provisionamento padronizado de ambiente.

Criterios de aceite:

- Novo cliente pode ser criado pelo admin SaaS sem intervencao manual critica.
- Plano define modulos disponiveis.
- Billing SaaS gera cobrancas recorrentes.
- Cliente suspenso perde acesso operacional de forma controlada.
- Logs mostram quem fez cada acao sensivel.

## 8. Backlog tecnico imediato

1. Criar mapa de rotas e menus por contexto: `SUPERADMIN` e `CLUB`.
2. Revisar `frontend/src/data/navigation.ts` para remover mistura e duplicidades.
3. Criar componentes padrao de tabela, toolbar de filtros, tabs e status badge.
4. Refatorar `SuperadminPage` em subcomponentes menores.
5. Refatorar `FinanceiroPage` para layout tabular e tabs.
6. Criar migracao para tornar `tenantId` obrigatorio nas tabelas operacionais.
7. Criar helper backend para `whereTenant(request)`.
8. Adicionar testes de isolamento multi-tenant.
9. Criar modelos `TenantModule` e `AccessProfile`.
10. Criar setup wizard de cliente no admin SaaS.

## 9. Ordem recomendada para o programador

1. Fase 1 deve vir primeiro porque reduz confusao de produto e melhora a base visual.
2. Fase 2 deve vir antes de vender para mais clientes, pois multi-tenant opcional e risco real.
3. Fase 3 fortalece o valor esportivo para o clube.
4. Fase 4 transforma o financeiro em modulo confiavel.
5. Fase 5 aumenta gestao e retencao.
6. Fase 6 fecha o ciclo comercial SaaS.

## 10. Nao objetivos da v2 inicial

- Nao criar marketplace publico.
- Nao criar app mobile nativo.
- Nao integrar pagamento real antes de estabilizar mensalidades e billing interno.
- Nao misturar banco separado por cliente antes de validar a operacao com `tenantId` obrigatorio.
- Nao redesenhar a marca inteira; apenas disciplinar o uso visual no produto.

## 11. Definicao de pronto geral

A v2 sera considerada pronta quando:

- Superadmin e painel do clube forem produtos visualmente e funcionalmente separados.
- Dados operacionais forem obrigatoriamente isolados por tenant.
- Cliente novo puder ser criado com setup, dominio, tema, modulos e admin inicial.
- Clube conseguir operar atletas, categorias, equipes, temporadas, jogos, escala, presenca, financeiro e relatorios.
- GestaSports conseguir controlar plano, billing, modulos, provisionamento, logs e status comercial.
- Vermelho estiver reservado a erro, suspensao, cancelamento, bloqueio ou alerta grave.
