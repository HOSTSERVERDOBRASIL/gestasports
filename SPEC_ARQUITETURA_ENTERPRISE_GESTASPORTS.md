# SPEC Arquitetura Enterprise - GestaSports

Data: 2026-06-05

## 1. Visao do produto

O GestaSports deve evoluir de um sistema focado em clube para uma plataforma de gestao esportiva, associativa e competitiva.

O eixo principal do produto passa a ser:

```text
Operacao + Historia + Comunidade
```

A maioria dos sistemas esportivos para em cadastro, jogo e fim. O GestaSports deve ir alem:

```text
Cadastro
  Jogo
    Sumula
      Estatisticas
        Memorial
          Historia
            Engajamento
              Patrimonio Digital
```

O resultado esperado e que o clube acumule valor institucional ao longo dos anos. O sistema deixa de ser apenas uma ferramenta de operacao e passa a preservar memoria, legado, estatisticas historicas e acervo.

Publicos atendidos:

- Clubes amadores.
- Clubes de bairro.
- Clubes de veteranos.
- Associacoes esportivas.
- Associacoes recreativas.
- Associacoes comunitarias.
- Escolinhas.
- Centros de treinamento.
- Organizacoes multiesportivas.
- Ligas municipais.
- Ligas regionais.
- Ligas estaduais.
- Federacoes regionais.
- Federacoes estaduais.
- Federacoes nacionais.

## 2. Entidade principal

### Organization

Toda operacao do sistema pertence a uma `Organization`.

A organizacao representa a entidade real que usa ou administra a plataforma. Ela pode ser um clube, associacao, escolinha, liga, federacao ou organizacao multiesportiva.

### Tenant

Cada `Organization` possui um `Tenant`, responsavel por isolamento operacional, dominio, plano, status comercial e identidade visual.

Campos conceituais:

- `id`
- `name`
- `slug`
- `organizationType`
- `domain`
- `subdomain`
- `plan`
- `status`
- `settings`
- `logo`
- `primaryColor`
- `secondaryColor`
- `accentColor`
- `publicName`
- `theme`

Exemplos de dominios:

- `app.flamilha.com.br`
- `app.ligafpolis.com.br`
- `app.fcf.sc.br`

## 3. Tipos de organizacao

### Clube

- Clube amador.
- Clube de bairro.
- Clube de veteranos.

### Associacao

- Associacao esportiva.
- Associacao recreativa.
- Associacao comunitaria.

### Formacao

- Escolinha.
- Centro de treinamento.
- Academia esportiva.

### Competicao

- Liga municipal.
- Liga regional.
- Liga estadual.

### Governanca

- Federacao regional.
- Federacao estadual.
- Federacao nacional.

### Multimodalidade

- Organizacao multiesportiva.

## 4. Hierarquia institucional

Modelo conceitual:

```text
Federacao Nacional
  Federacao Estadual
    Liga Estadual
      Liga Regional
        Liga Municipal
          Clube
```

Regras:

- Uma organizacao pode ter uma organizacao superior.
- Uma federacao pode administrar ligas e clubes filiados.
- Uma liga pode administrar competicoes e clubes participantes.
- Um clube pode operar seus atletas, associados, financeiro e memorial.
- A hierarquia nao deve quebrar isolamento de dados: acesso entre organizacoes deve ser explicitamente autorizado.

## 5. Multi-tenant e white label

Cada tenant possui:

- Logo.
- Cores.
- Dominio.
- Subdominio.
- Nome publico.
- Tema.
- Modulos habilitados.
- Plano comercial.
- Status operacional.

Regras obrigatorias:

- Nenhum dado operacional pode existir sem tenant.
- O mesmo usuario/email pode existir em tenants diferentes.
- Superadmin acessa o control plane global.
- Organizacoes superiores acessam dados agregados apenas quando houver permissao e relacionamento institucional.
- White label deve afetar login, layout, portal publico e aplicativo.

## 6. Motor de modulos

Nenhum menu deve ser fixo.

O menu deve ser gerado dinamicamente por:

- tipo de organizacao;
- plano;
- modulos contratados;
- perfil do usuario;
- permissoes granulares;
- modalidade esportiva ativa;
- contexto atual da organizacao.

### Core

- Dashboard.
- Usuarios.
- Permissoes.
- Auditoria.
- Configuracoes.

### Associacao

- Associados.
- Diretoria.
- Conselhos.
- Departamentos.
- Documentos.
- Assembleias.
- Portal da Transparencia.

### Futebol

- Temporadas.
- Atletas.
- Jogos.
- Escalacoes.
- Convocacoes.
- Estatisticas.
- Disciplina.

### Competicoes

- Campeonatos.
- Tabelas.
- Classificacoes.
- Artilharia.
- Confrontos.

### Arbitragem

- Arbitros.
- Escalas.
- Pagamentos.
- Penalidades.

### Escolinha

- Alunos.
- Responsaveis.
- Turmas.
- Treinos.
- Avaliacoes.
- Mensalidades.

### Financeiro

- Receitas.
- Despesas.
- Patrocinios.
- Mensalidades.
- Fluxo de caixa.
- Prestacao de contas.

### Patrimonio

- Campos.
- Uniformes.
- Equipamentos.
- Veiculos.
- Infraestrutura.

### Memorial

- Historia.
- Centro historico.
- Hall da fama.
- Estatisticas historicas.
- Presidentes.
- Titulos.
- Linha do tempo.
- Galeria historica.
- Jogos memoraveis.
- Uniformes historicos.
- Perfil historico do atleta.
- Memorial de jogos.
- Memorial de diretorias.
- Legado automatico.

### Comunicacao

- Comunicados.
- Email.
- WhatsApp.
- Push.
- Notificacoes.

### Portal Publico

- Noticias.
- Eventos.
- Resultados.
- Classificacoes.
- Galeria.
- Historia.

## 7. Layout padrao enterprise

Toda pagina operacional deve seguir o mesmo padrao:

1. Titulo.
2. Subtitulo.
3. KPIs.
4. Filtros.
5. Conteudo principal.
6. Acoes.

Exemplo para Atletas:

- Titulo: `Atletas`.
- KPIs: ativos, suspensos, lesionados, base.
- Filtros: pesquisa, temporada, categoria, status.
- Conteudo: tabela.
- Acoes: criar, editar, exportar, detalhes.

Regras de UI:

- Listagens principais devem usar tabela ou layout tabular.
- Filtros devem ficar acima do conteudo.
- Acoes devem ser compactas e previsiveis.
- Cards devem ser usados para KPIs, estados resumidos ou itens repetidos.
- Vermelho deve ser reservado para erro, perigo, suspensao, cancelamento, inadimplencia grave ou status critico.

## 8. Dashboard padrao

O dashboard deve ser adaptavel ao tipo de organizacao, mas manter uma estrutura comum.

### Topo

- Saude financeira.
- Saude associativa.
- Atletas ou participantes aptos.
- Agenda.

### Centro

Evento principal, podendo ser:

- Jogo.
- Treino.
- Assembleia.
- Evento.
- Competicao.

### Lateral

- Pendencias.
- Rankings.
- Financeiro.
- Notificacoes.

### Rodape

- Avisos.
- Contratos.
- Documentos.
- Mensalidades.

## 9. Temporadas

Tudo deve girar em torno de temporadas.

Uma temporada contem:

- Atletas.
- Jogos.
- Uniformes.
- Financeiro.
- Competicoes.
- Estatisticas.
- Documentos.
- Comunicados.

Regras:

- Cada tenant deve ter uma temporada ativa.
- Relatorios devem filtrar por temporada.
- Rankings devem ser calculados por temporada.
- Encerramento de temporada deve gerar snapshot historico.

## 10. Uniformes como patrimonio historico

Uniformes nao devem ser tratados como estoque simples.

Estrutura:

- Temporada.
- Uniforme.
- Fornecedor.
- Patrocinadores.
- Fotos.
- Status.

Status:

- Planejado.
- Em uso.
- Encerrado.
- Historico.

## 11. Memorial

O memorial e diferencial comercial da plataforma.

Entidades:

- Centro historico.
- Hall da fama.
- Historia institucional.
- Linha do tempo.
- Presidentes.
- Titulos.
- Jogos historicos.
- Fotos.
- Videos.
- Relatos.
- Uniformes historicos.
- Estatisticas historicas.
- Participacoes por atleta.
- Diretorias por periodo.
- Acervo digital.

Exemplo de linha do tempo:

- 1995: Fundacao.
- 2001: Primeiro titulo.
- 2014: Reforma.
- 2026: Modernizacao.

### Centro historico

Ao entrar no centro historico, a tela deve impressionar qualquer dirigente.

Indicadores automaticos:

- Ano de fundacao.
- Anos de historia.
- Partidas registradas.
- Gols registrados.
- Atletas que passaram pelo clube.
- Titulos conquistados.
- Uniformes historicos.
- Fotos arquivadas.

Esses numeros devem ser calculados a partir de jogos, sumulas, temporadas, atletas, uniformes, titulos e acervo.

### Memorial inteligente

O sistema deve gerar eventos historicos automaticamente.

Exemplos:

- Atleta alcancou 100 jogos pelo clube.
- Clube venceu o jogo oficial numero 2.000.
- Uniforme foi utilizado pela 50a vez.
- Atleta tornou-se maior artilheiro da historia.
- Neste dia ha 5 anos o clube conquistava um titulo.
- Ha 10 anos um atleta marcava seu primeiro gol.

Esses eventos alimentam a linha do tempo e geram engajamento.

### Hall da fama

Categorias iniciais:

- Artilheiros.
- Mais jogos.
- Mais assistencias.
- Capitaes historicos.
- Goleiros historicos.
- Tecnicos historicos.

Cada categoria deve ter ranking por temporada e historico geral.

### Perfil historico do atleta

Esta pagina deve reunir:

- Foto.
- Dados pessoais.
- Entrada no clube.
- Saida ou status ativo.
- Temporadas.
- Jogos.
- Gols.
- Assistencias.
- Cartoes.
- Conquistas.
- Uniformes utilizados.
- Jogos historicos.
- Galeria do atleta ao longo dos anos.

### Sistema de participacoes

Indicadores:

- Jogos.
- Minutos.
- Titular.
- Reserva.
- Convocado.
- Ausente.
- Lesionado.
- Frequencia.
- Presenca.
- Ausencia.
- Evolucao por ano.

### Memorial de jogos

Cada jogo deve virar uma pagina historica com:

- Placar.
- Escalacao.
- Banco.
- Comissao tecnica.
- Uniforme utilizado.
- Fotos.
- Videos.
- Estatisticas.
- Sumula.
- Publico.
- Patrocinadores do evento.

### Memorial de uniformes

Cada uniforme deve virar uma entidade historica.

Dados:

- Foto.
- Fornecedor.
- Patrocinadores.
- Periodo.
- Jogos.
- Vitorias.
- Empates.
- Derrotas.
- Conquistas.
- Atletas que mais utilizaram.

### Memorial de diretorias

Importante para clubes e associacoes.

Dados:

- Presidente.
- Vice.
- Tesoureiro.
- Secretario.
- Conselho.
- Periodo.
- Conquistas.
- Obras e entregas institucionais.

### Acervo digital

Separado do memorial, mas conectado a ele.

Tipos:

- Fotos.
- Videos.
- PDFs.
- Sumulas.
- Regulamentos.
- Estatutos.
- Recortes.
- Certificados.
- Contratos historicos.

Melhoria futura:

- OCR.
- Busca por texto.
- Vinculo automatico com atleta, jogo, temporada, titulo e uniforme.

## 12. Multiesportivo

Cada organizacao pode operar multiplas modalidades.

Modalidades iniciais:

- Futebol.
- Futsal.
- Basquete.
- Volei.
- Handebol.
- Atletismo.

Cada modalidade possui:

- Atletas.
- Competicoes.
- Treinos.
- Estatisticas.
- Calendario.

## 13. Financeiro enterprise

### Receitas

- Mensalidades.
- Patrocinios.
- Doacoes.
- Eventos.
- Locacoes.

### Despesas

- Arbitragem.
- Uniformes.
- Infraestrutura.
- Transporte.
- Alimentacao.

### Centros de custo

- Futebol.
- Administrativo.
- Patrimonio.
- Eventos.
- Escolinha.

Regras:

- Financeiro da organizacao nao pode se misturar com Billing SaaS.
- Inadimplencia operacional pertence ao tenant.
- Inadimplencia SaaS pertence ao control plane.
- Prestacao de contas deve ser auditavel.

## 14. Permissoes

Modelo base: RBAC com possibilidade de permissoes granulares por modulo.

Perfis conceituais:

- Superadmin.
- Administrador.
- Presidente.
- Vice-presidente.
- Tesoureiro.
- Diretor.
- Secretario.
- Treinador.
- Arbitro.
- Atleta.
- Associado.
- Responsavel.
- Visitante.

Regras:

- Perfil define menus visiveis.
- Permissao define acoes permitidas.
- Modulo desabilitado remove menu e bloqueia API.
- Organizacoes superiores precisam de permissoes especificas para visualizar dados agregados.

## 15. Auditoria

Registrar:

- Usuario.
- Data.
- IP.
- Acao.
- Registro alterado.
- Antes.
- Depois.
- Tenant.
- Organizacao.
- Metodo.
- Rota.
- Status.

Auditoria deve cobrir:

- Login.
- Alteracoes financeiras.
- Mudancas de perfil/permissao.
- Alteracoes historicas.
- Acoes de superadmin.
- Suspensao/cancelamento de tenant.

## 16. Portal publico

Cada organizacao recebe automaticamente um portal institucional.

Paginas:

- Historia.
- Noticias.
- Eventos.
- Resultados.
- Galeria.
- Contato.

Regras:

- Portal usa white label do tenant.
- Conteudo publico deve ser separado de dados internos.
- Publicacao deve respeitar permissao e auditoria.

## 17. Aplicativo mobile

Aplicativo unico, white label por tenant.

### Clube

Mostra:

- Jogos.
- Atletas.
- Mensalidades.
- Memorial.

### Liga

Mostra:

- Campeonatos.
- Tabela.
- Clubes.
- Artilharia.

### Federacao

Mostra:

- Competicoes.
- Regulamentos.
- Rankings.
- Ligas filiadas.

## 18. Menus dinamicos por tipo

### Clube

- Dashboard.
- Associacao.
- Futebol.
- Financeiro.
- Patrimonio.
- Memorial.
- Comunicacao.

### Liga

- Dashboard.
- Clubes.
- Competicoes.
- Arbitragem.
- Financeiro.
- Relatorios.

### Federacao

- Dashboard.
- Federacoes.
- Ligas.
- Clubes.
- Competicoes.
- Arbitragem.
- Tribunal.
- Financeiro.

## 19. Roadmap macro

### Fase 1 - Estabilizacao

- Build.
- Lint.
- Encoding.
- Multi-tenant.
- Permissoes.

### Fase 2 - Arquitetura

- Organizacoes.
- Modulos.
- Temporadas.
- Patrimonio.
- Memorial.

### Fase 3 - Portal publico

- Noticias.
- Eventos.
- Historia.
- Resultados.
- Galeria.

### Fase 4 - Aplicativo

- Android.
- iOS.
- Push.
- White label.

### Fase 5 - Marketplace

- Patrocinios.
- Arbitragem.
- Uniformes.
- Servicos.

## 20. Impacto na spec de correcoes

A spec de correcoes deve priorizar a estabilizacao tecnica antes da expansao enterprise:

1. Corrigir build, lint e encoding.
2. Fechar isolamento multi-tenant.
3. Proteger permissoes por rota e API.
4. Transformar menu atual em motor dinamico por modulo.
5. Evoluir `OrganizationTenant` para representar a arquitetura de `Organization`.
6. Introduzir temporadas como eixo central.
7. Expandir patrimonio, memorial, portal publico e mobile em fases posteriores.
