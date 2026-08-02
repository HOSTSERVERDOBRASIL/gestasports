# Análise Detalhada — Pregão Eletrônico nº 81/2026
**Prefeitura Municipal de Nova Esperança-PR** | Processo Administrativo nº 163/2026 | UASG 987721 | Nº na plataforma: 08/2026

---

## 1. Identificação e regras gerais

| Item | Detalhe |
|---|---|
| Modalidade | Pregão Eletrônico, modo de disputa **Aberto e Fechado** |
| Base legal | Lei nº 14.133/2021, LC nº 123/2006, Decreto Municipal nº 6.059/2023 |
| Critério de julgamento | **Menor preço GLOBAL** — grupo único com 2 itens (não é possível vencer apenas um dos itens) |
| Valor total estimado | **R$ 81.515,32** (12 meses) |
| Preferência ME/EPP | Grupo destinado à **ampla participação** (não exclusivo), mas com tratamento diferenciado de desempate previsto em lei |
| Recebimento de propostas | 24/07/2026 10h → 10/08/2026 08h59 |
| Sessão pública | 10/08/2026 09h (horário de Brasília) |
| Pregoeiro | Designado pela Portaria nº 16.593/2025 |
| Foro | Comarca de Nova Esperança-PR |

---

## 2. Objeto

Contratação de empresa especializada para **locação de sistema informatizado de atendimento automatizado via WhatsApp oficial (API Meta)**, integrado a serviço de **IA generativa** (interações conversacionais sobre serviços públicos do município), com chatbot personalizado.

---

## 3. Itens e composição do valor (Anexo II)

| Item | Serviço | Qtd | Valor unit. | Total |
|---|---|---|---|---|
| 01 | Implantação, personalização e treinamento para todos os setores (parcela única) | 1 | R$ 10.000,00 | R$ 10.000,00 |
| 02 | Mensalidade da plataforma — mensagens receptivas **ilimitadas** via API oficial Meta, franquia mínima de **600 mensagens ativas/mês**, chat interno para até **250 usuários** | 12 meses | R$ 5.959,61 | R$ 71.515,32 |
| | | | **TOTAL** | **R$ 81.515,32** |

- Registro de preços: **NÃO**
- Subcontratação: **vedada** (total ou parcial)
- Vigência: **12 meses**, prorrogável por igual período (art. 107, Lei 14.133/21)
- Reajuste: **IPCA**, intervalo mínimo de 1 ano
- Dotação orçamentária: 02.001.04.122.0020.2.002.3.3.90.40.00.00, fonte 1.000 (edital) — a minuta de contrato lista 5 dotações adicionais em fontes diferentes (1000, 38494, 1303, 1104, 1103), todas para "Serviços de Tecnologia da Informação e Comunicação"

---

## 4. Cronograma de execução — prazos que a contratada precisa cumprir

| Marco | Prazo |
|---|---|
| Envio de documentos de habilitação (quando solicitado) | **2 horas** |
| Prova de Conceito (POC) | até **5 dias úteis** após convocação |
| Assinatura do contrato | até **3 dias úteis** após convocação (prorrogável 1x) |
| Início da execução do serviço | até **10 dias** após assinatura do contrato/OS |
| Implantação completa do sistema | até **30 dias** após assinatura |
| Recebimento provisório | **10 dias** após entrega, pelo fiscal |
| Recebimento definitivo | **30 dias** após o recebimento provisório |
| Restauração de backup, se solicitado | até **24 horas** |
| Suporte técnico regular | seg-sex, 8h-18h, com plantão emergencial fora desse horário para falhas críticas |

---

## 5. Habilitação (Anexo I) — o que precisa apresentar

### 5.1 Jurídica
Registro comercial / ato constitutivo / contrato social vigente, conforme o tipo societário.

### 5.2 Fiscal, social e trabalhista
CNPJ, CND Federal/Dívida Ativa/INSS, Estadual, Municipal, FGTS, CNDT (Justiça do Trabalho) — pode ser suprido pelo SICAF.

### 5.3 Econômico-financeira
Certidão negativa de falência (validade de 90 dias se a certidão for omissa quanto a isso).

### 5.4 Técnica (documental, exigida de todos)
a) Atestado de capacidade técnica (pessoa jurídica pública ou privada) atestando complexidade compatível;
b) Declaração de conformidade com a **LGPD**;
c) Declaração/documentação de que o sistema roda **100% em ambiente web**, sem instalação local, com detalhamento da infraestrutura de hospedagem;
d) Declaração de que possui infraestrutura própria e tecnologia adequada.

### 5.5 Exigências extras — só do 1º colocado, em até 5 dias após o certame
- **Portfólio**: mínimo de **3 clientes atendidos** com solução tecnológica compatível (atendimento via WhatsApp oficial META, múltiplos atendentes, chatbot, automação de fluxos, IA).
- **Certificações válidas e vigentes, simultâneas**: ISO/IEC 27001 (segurança da informação) **+** ISO/IEC 27017 (segurança em nuvem) **+** ISO/IEC 27701 (privacidade). É uma barreira relevante — reduz bastante o número de empresas aptas.

---

## 6. Prova de Conceito (POC) — Anexo VI — **eliminatória, é o ponto mais crítico do edital**

- Exigida só do 1º colocado provisório, após o certame, em até 5 dias úteis.
- Demonstração **remota, ao vivo, gravada integralmente**, com Comissão Técnica designada por Portaria.
- **Proibido**: apresentação estática, vídeo pré-gravado, protótipo, ambiente criado especialmente para a prova, ou qualquer desenvolvimento/customização feita durante a sessão.
- A solução mostrada tem que ser a **versão real, já comercializada** — nada de "isso a gente implementa depois".
- Critério de aprovação: **100% dos itens avaliados** (não é média — é tudo ou nada). Reprovou, desclassifica e chama o 2º colocado.
- Duração máxima da sessão: 4 horas.

### Os 8 blocos avaliados (cada linha da tabela é um requisito binário: cumpriu / não cumpriu)

| Bloco | Nº de itens | Destaques |
|---|---|---|
| 1. Segurança, integração, acesso e auditoria | 11 | Web responsivo + HTTPS + datacenter ISO 27001; autenticação 2FA/CAPTCHA; **impossível excluir cadastro de usuário** (só suspender); log de auditoria completo (acesso, e-mails, backups, indisponibilidades) |
| 2. Atendimento e gestão operacional | 11 | Múltiplos atendentes simultâneos; filas com distribuição automática; transferência com histórico preservado; retomada de atendimento interrompido; protocolo automático |
| 3. Personalização e chatbot | 6 | Menus multinível (lista/botão/híbrido); palavras-chave; feriados com horário diferenciado; funcionamento 24h |
| 4. Inteligência artificial | 6 | IA generativa — **cita nominalmente**: ChatGPT, Claude 3 Haiku, Claude 3 Sonnet, Claude 3 Opus, Claude 3.5 Sonnet "ou equivalente"; treino por documento/site/Q&A manual; personalização de nome/tom |
| 5. Comunicação ativa e campanhas | 6 | Disparo em massa agendado; mídia (na demo, aceitam só 4 formatos: texto, docx, imagem, vídeo); histórico de disparos com filtros |
| 6. Relatórios e dashboard | 7 | Exportação PDF/CSV/Excel; NPS; média geral e últimos 90 dias; filtros por período/setor/operador |
| 7. Formulários e interação | 6 | Formulários com mídia e geolocalização; encaminhamento automático; prazos configuráveis por formulário |
| 8. Funções indispensáveis | 10 | **Assinatura eletrônica** (mín. 20/mês, validade jurídica MP 2.200-2/01); integração API/WebService; suporte multicanal demonstrado ao vivo |

---

## 7. Especificações técnicas mínimas obrigatórias (Termo de Referência, item 2.2)

- Número institucional único, com coleta de aceite LGPD no 1º atendimento do cidadão.
- Atendimento simultâneo multi-operador, com filas, distribuição automática e recuperação de atendimentos interrompidos.
- Chatbot com IA: **mínimo 2.500 interações mensais de IA inclusas** no contrato, fluxos dinâmicos, treinável por documento/site/pergunta-resposta manual.
- Usuários e departamentos **ilimitados**, com perfis distintos (admin, gerente, atendente, disparador).
- **Mínimo 600 mensagens ativas/mês inclusas** (institucionais/marketing/utilidade pública).
- Histórico completo de conversas + protocolo automático por atendimento.
- Relatórios gerenciais completos + painel em tempo real.
- Acesso web responsivo, 2FA, CAPTCHA, controle por IP.
- Armazenamento: **mínimo 1 TB**, múltiplos formatos, backup automático.
- Funcionamento 24h, com IA ativa fora do horário comercial.
- **SLA mínimo de 99,5%** de disponibilidade.
- Assinatura digital: mínimo 20/mês, com validade jurídica.
- Backup diário (retenção mín. 30 dias) e mensal (retenção mín. 12 meses), **datacenter no Brasil**, redundância geográfica, restauração em até 24h.

---

## 8. Financeiro

- Pagamento **mensal**, em até 30 dias após nota fiscal atestada pelo fiscal do contrato.
- Reajuste anual por IPCA, mediante simples apostila (sem necessidade de termo aditivo).
- Acréscimos/supressões possíveis até 25% do valor contratual (art. 125 da Lei 14.133/21).

---

## 9. Penalidades (resumo da tabela oficial)

| Grau | Situação | Multa |
|---|---|---|
| Leve | Atraso até 5 dias | 0,25% a 1% por dia de atraso |
| Média | Atraso de 5 a 20 dias | 1,5% a 3% por dia de atraso |
| Grave | Inexecução parcial / não assinar contrato / não entregar documento | 8% a 15% sobre o valor total |
| Gravíssima | Inexecução total, fraude, má-fé ou abandono | 18% a 30% sobre o valor total |

Além da multa: advertência, impedimento de licitar (até 3 anos) e declaração de inidoneidade são cumuláveis.

---

## 10. Fiscalização e gestão designadas

| Papel | Nome | Matrícula |
|---|---|---|
| Fiscal titular | Michelle Vanessa Jorge | 4447 |
| Fiscal substituto | João Paulo dos Santos Silva | 3502 |
| Gestor de contrato | Vinícius Fatobeni Salvaterra | 4445 |

---

## 11. Pontos de atenção para quem for participar

1. **Julgamento é por menor preço global dos 2 itens somados** — não dá para disputar/vencer apenas a implantação ou apenas a mensalidade.
2. **A POC é tudo-ou-nada** (100% dos ~63 requisitos distribuídos nos 8 blocos). O sistema precisa estar pronto e em uso comercial real — promessa de desenvolvimento futuro desclassifica.
3. **Exigência simultânea das 3 certificações ISO** (27001 + 27017 + 27701), válidas e vigentes, é uma barreira técnica relevante que reduz bastante o número de concorrentes aptos a se habilitar.
4. **Portfólio mínimo de 3 clientes** com solução equivalente (WhatsApp oficial + chatbot + IA) é bem específico — não basta ter clientes de chatbot genérico.
5. **Pesquisa de preço**: apenas **uma empresa** (Lobus Software, produto "Prefeitura Zap") respondeu ao pedido de orçamento, e o valor total estimado do edital (R$ 81.515,32) é **exatamente** a proposta dessa única empresa. Combinado com a menção nominal a modelos de IA específicos no Anexo VI, isso é um padrão que vale observar com atenção caso você for auditar o processo ou preparar impugnação/questionamento — não é necessariamente irregular, mas é o tipo de evidência que costuma ser levantada em questionamentos de direcionamento de edital.
6. **Prazos de implantação são curtos** (10 dias para começar, 30 para implantação completa), e isso corre depois da POC e da assinatura — o cronograma real desde a adjudicação até o sistema no ar é apertado.
