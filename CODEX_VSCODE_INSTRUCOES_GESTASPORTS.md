# INSTRUÇÕES PARA CODEX / VS CODE — GESTA SPORTS

## Objetivo principal
Evoluir o Gesta Sports para uma plataforma SaaS multi-tenant com padrão visual enterprise, separando claramente:

1. Portal do Atleta / Associado
2. Área de Gestão da Associação / Clube
3. Memorial / Acervo Institucional
4. Governança
5. Dashboard dinâmico por widgets
6. Tema configurável por cliente

O sistema não deve ser apenas uma coleção de telas. Deve funcionar como uma plataforma configurável para clubes, associações, escolinhas, ligas e federações.

---

## Regra número 1 — Não criar telas soltas
Nenhuma página nova deve criar layout próprio manualmente.

Todas as páginas devem usar componentes base:

- `AppShell`
- `PageTemplate`
- `PageHeader`
- `StatCard`
- `ContentCard`
- `DashboardWidget`
- `DataTable`
- `FilterBar`
- `Timeline`
- `GalleryGrid`
- `TenantThemeProvider`

Se algum componente não existir, criar antes de implementar novas telas.

---

## Regra número 2 — Tema por cliente
Não usar cores fixas nas páginas.

Tudo deve vir do tema do tenant:

- cor primária
- cor secundária
- cor da sidebar
- cor de destaque
- logo
- raio de borda
- fonte

Exemplo obrigatório:

```tsx
const theme = useTenantTheme();
```

Nunca fixar vermelho, preto ou azul diretamente no componente, exceto como fallback do tema.

---

## Regra número 3 — Dois layouts principais
Criar/organizar dois grandes layouts.

### 1. Portal do Atleta / Associado
Usado por atletas, associados e participantes.

Menu recomendado:

- Dashboard
- Agenda
- Convocações
- Jogos
- Estatísticas
- Carreira
- Rankings
- Conquistas
- Financeiro
- Cobranças
- PIX
- Galeria
- Vídeos
- Perfil
- Configurações

Esse portal deve priorizar futebol, rotina e experiência do usuário.

### 2. Área de Gestão / Clube / Associação
Usado por administradores, diretoria e comissão.

Menu recomendado:

- Dashboard da Associação
- Associados
- Atletas
- Jogos
- Agenda
- Financeiro
- Eventos
- Memorial
- Patrimônio
- Governança
- Relatórios
- Configurações

---

## Dashboard do Atleta
O Dashboard do Atleta deve ter o futebol como centro da experiência.

Primeira dobra obrigatória:

- Card grande do próximo jogo
- Botões de confirmar presença e não poderei comparecer
- Situação financeira resumida, mas sem dominar a tela

Depois:

- KPIs da temporada
- Evolução na temporada
- Últimos jogos
- Avisos e novidades
- Acesso rápido

Não colocar mensalidade como principal destaque do dashboard.

---

## Dashboard da Associação
O Dashboard da Associação deve ser configurável por widgets.

O administrador pode:

- adicionar widget
- remover widget
- reordenar widget
- alterar tamanho
- ocultar widget

O administrador não pode:

- criar HTML próprio
- alterar CSS estrutural
- quebrar o layout base
- criar componente livre

Widgets disponíveis:

### Futebol
- Próximo jogo
- Próximos jogos
- Últimos resultados
- Classificação
- Artilharia
- Assistências
- Escalações
- Confrontos

### Pessoas
- Atletas ativos
- Associados ativos
- Novos associados
- Aniversariantes
- Equipe técnica

### Financeiro
- Receitas
- Despesas
- Inadimplência
- PIX pendentes
- Mensalidades

### Agenda
- Agenda
- Treinos
- Eventos
- Reuniões

### Memorial
- Último título
- Último homenageado
- Fotos recentes
- Linha do tempo
- Documentos recentes

### Comunicação
- Avisos
- Comunicados
- Mensagens

---

## Tamanhos dos widgets
Todo widget deve aceitar tamanho:

- `S`
- `M`
- `L`
- `XL`
- `FULL`

Exemplo de layout salvo:

```json
{
  "rows": [
    [{ "widget": "next_match", "size": "FULL" }],
    [
      { "widget": "active_players", "size": "M" },
      { "widget": "monthly_revenue", "size": "M" },
      { "widget": "attendance", "size": "M" }
    ],
    [{ "widget": "latest_results", "size": "L" }],
    [{ "widget": "memorial_latest_title", "size": "M" }]
  ]
}
```

---

## Memorial / Acervo
O Memorial não pode ser apenas área de cadastro.

Cada item cadastrado deve ter:

1. cadastro administrativo
2. listagem administrativa
3. visualização pública bonita
4. detalhe público
5. card no Dashboard do Memorial
6. possibilidade de aparecer na linha do tempo
7. vínculo com fotos, documentos, jogos, atletas e temporadas

Categorias padrão:

- Painel do Acervo
- Jogos Históricos
- Atletas Históricos
- Presidentes e Diretorias
- Títulos
- Acervo de Súmulas
- Linha do Tempo
- Camisas Históricas
- Galeria
- Documentos Históricos
- Troféus e Premiações
- Patrimônio do Clube
- Hall da Fama

Categorias personalizadas devem ser permitidas.

Exemplos:

- Viagens
- Eventos
- Projetos sociais
- Escolinhas
- Homenagens
- Diretorias especiais
- Obras
- Uniformes alternativos

Ao criar uma categoria nova, o sistema deve gerar automaticamente:

- cadastro
- listagem
- visualização
- permissões
- card opcional no dashboard

---

## Portal do Atleta — telas modelo
As telas de referência são:

- Dashboard do Atleta
- Agenda
- Convocações
- Jogos
- Estatísticas
- Carreira
- Conquistas
- Financeiro
- Perfil

O padrão visual deve seguir:

- sidebar escura
- conteúdo claro
- cards brancos
- bordas suaves
- sombra leve
- ícones coloridos
- destaque vermelho configurável pelo tenant
- grid limpo
- informação esportiva em primeiro plano

---

## Área do Clube / Associação — telas modelo
As telas de referência são:

- Painel do Acervo
- Hall da Fama
- Patrimônio do Clube
- Troféus e Premiações
- Documentos Históricos
- Galeria
- Camisas Históricas
- Linha do Tempo
- Acervo de Súmulas
- Títulos
- Presidentes e Diretorias

Essas telas são institucionais e administrativas. Devem funcionar para clube, associação, liga ou federação.

---

## Governança
Criar ou preparar módulo de governança para associações.

Entidades sugeridas:

- Mandatos
- Presidentes
- Diretorias
- Assembleias
- Atas
- Estatuto
- Conselhos
- Eleições
- Documentos oficiais

Governança deve se conectar ao Memorial.

Exemplo: ao cadastrar uma diretoria histórica, ela aparece também em `Memorial > Presidentes e Diretorias`.

---

## Financeiro
O financeiro deve suportar:

- mensalidades
- eventos
- uniformes
- taxas extras
- viagens
- churrascos
- torneios
- cobranças avulsas
- PIX individual
- PIX agrupado
- histórico de pagamentos
- declaração de quitação

No portal do atleta, financeiro é módulo secundário.
Na gestão da associação, financeiro pode ser dashboard principal.

---

## Permissões
Separar perfis:

- Atleta
- Associado
- Responsável
- Técnico
- Diretor de futebol
- Diretor financeiro
- Presidente
- Administrador do tenant
- Super admin da plataforma

Cada módulo deve respeitar permissões.

---

## Multi-tenant
O sistema deve funcionar por cliente/tenant.

Cada tenant pode configurar:

- nome do clube
- logo
- cores
- menus ativos
- módulos ativos
- dashboard
- categorias do memorial
- tipos de cobrança
- tipos de eventos

Nada deve ser hardcoded para Flamilia.
Flamilia é apenas tenant de referência.

---

## Checklist para implementação

1. Criar/validar `TenantThemeProvider`.
2. Criar/validar `PageTemplate`.
3. Criar/validar componentes base.
4. Refatorar Portal do Atleta para o novo padrão.
5. Refatorar Memorial com cadastro + visualização.
6. Criar Dashboard Builder por widgets.
7. Criar categorias dinâmicas do Memorial.
8. Criar/organizar permissões.
9. Garantir que tudo compile.
10. Não quebrar backend existente.

---

## Prompt curto para usar no Codex

Use este prompt dentro do VS Code/Codex:

```text
Leia o arquivo CODEX_VSCODE_INSTRUCOES_GESTASPORTS.md e implemente em etapas.
Prioridade 1: criar a base visual enterprise com PageTemplate, AppShell, StatCard, ContentCard, DashboardWidget e TenantThemeProvider.
Prioridade 2: refatorar o Portal do Atleta seguindo as telas de referência.
Prioridade 3: refatorar Memorial para ter cadastro e visualização pública para cada categoria.
Prioridade 4: criar Dashboard Builder por widgets configuráveis por tenant.
Não criar layouts soltos. Não usar cores fixas. Não quebrar o backend existente.
```
