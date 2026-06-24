# Evolução do Produto

## Objetivo

Transformar o sistema em um produto SaaS vendável para clubes, associações e grupos de futebol, saindo de MVP avançado para uma plataforma com estabilidade, onboarding, operação comercial e retenção.

## Etapa 1 - Estabilidade

- Corrigir erros de dados nulos em dashboard, memorial, jogos, atleta e financeiro.
- Garantir que listas vindas da API sejam sempre filtradas antes de renderizar.
- Padronizar estados vazios: sem jogo, sem escala, sem atleta, sem pagamento e sem memorial.
- Validar build a cada ciclo com typecheck e build.

## Etapa 2 - Fluxo Principal Vendável

- Dashboard limpo com indicadores de gestão, financeiro e próximo jogo.
- Jogos com fluxo completo: cadastrar, agenda, confirmações, sorteio no campo, salvar escalação, súmula e memorial.
- Campos como cadastro único de local, sem vínculo com time.
- Diretoria por cargos, associados vinculados e histórico por ano.
- Memorial com linha do tempo por ano: atletas, artilharia, diretoria, jogos, uniformes e súmulas.

## Etapa 3 - Onboarding

- Criar guia inicial do clube: dados do clube, Pix, uniformes, campos, categorias, associados e primeiro jogo.
- Exibir checklist de configuração para administradores.
- Adicionar exemplos de dados para demonstração comercial.
- Criar fluxo de convite simples para associados e atletas.

## Etapa 4 - Comercial

- Definir planos: Essencial, Clube e Associação.
- Fechar assinatura com pagamento recorrente.
- Criar tela de status da assinatura para superadmin.
- Preparar materiais de demonstração: roteiro, prints e vídeo curto.

## Etapa 5 - Prova de Valor

- Implantar em 5 a 10 clubes piloto.
- Medir uso semanal: jogos criados, confirmações, mensalidades cobradas e associados ativos.
- Registrar depoimentos e melhorias pedidas.
- Usar os dados para justificar valor de produto acima de R$ 200 mil.

## Indicadores de Produto

- Zero erro em fluxo principal por 30 dias.
- Primeiro jogo cadastrado em menos de 10 minutos.
- Pelo menos 70% dos associados convidados acessando ou confirmando cadastro.
- Cobranças Pix emitidas e registradas no financeiro.
- Memorial preenchido com pelo menos uma temporada completa.
