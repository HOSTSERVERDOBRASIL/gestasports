# SPEC - Componentes Enterprise GestaSports

## Objetivo
Padronizar o sistema inteiro com o visual das telas aprovadas: sidebar escura, cards limpos, KPIs fortes, muito espaçamento e cores configuráveis por cliente/tenant.

## Regra principal
Nenhuma tela nova deve montar layout do zero. Toda tela deve usar:

- `PageTemplate`
- `PageHeader`
- `StatsGrid`
- `EnterpriseStatCard`
- `ContentGrid`
- `ContentCard`
- `PrimaryButton`
- `SoftButton`
- `EmptyPanel`

Arquivo criado:

`frontend/src/components/ui/EnterpriseUI.tsx`

## Tema por tenant
As cores devem vir sempre das variáveis CSS já alimentadas pelo tenant:

```css
--brand-primary
--brand-menu
--brand-accent
```

Não usar cor fixa para ação principal. Usar `fl-brand-primary-action` ou componentes `PrimaryButton`/`SoftButton`.

## Exemplo de página nova

```tsx
import { Activity, CalendarDays, CreditCard, Trophy } from "lucide-react";
import {
  ContentCard,
  ContentGrid,
  EnterpriseStatCard,
  PageTemplate,
  PrimaryButton,
  StatsGrid
} from "../components/ui/EnterpriseUI";

export function DashboardAtletaEnterprise() {
  return (
    <PageTemplate
      eyebrow="Portal do atleta"
      title="Lucas Pereira"
      description="Resumo da temporada, próximo jogo, financeiro e saúde."
      actions={<PrimaryButton>Confirmar presença</PrimaryButton>}
    >
      <StatsGrid>
        <EnterpriseStatCard label="Jogos" value="18" helper="Temporada atual" icon={<CalendarDays size={20} />} />
        <EnterpriseStatCard label="Presença" value="92%" helper="Melhor do grupo" icon={<Activity size={20} />} tone="success" />
        <EnterpriseStatCard label="Financeiro" value="Em dia" helper="Sem pendência" icon={<CreditCard size={20} />} />
        <EnterpriseStatCard label="Ranking" value="#3" helper="Artilharia" icon={<Trophy size={20} />} tone="warning" />
      </StatsGrid>

      <ContentGrid>
        <ContentCard title="Próximo jogo" description="Dados principais da partida">
          Conteúdo do jogo
        </ContentCard>
        <ContentCard title="Ações pendentes">
          Confirmação, mensalidade e avisos.
        </ContentCard>
      </ContentGrid>
    </PageTemplate>
  );
}
```

## Módulos a refatorar nesta ordem

1. Portal do Atleta
2. Jogos
3. Desempenho
4. Financeiro
5. Saúde
6. Perfil
7. Memorial / Acervo
8. Admin Dashboard
9. Atletas
10. Configurações

## Checklist para o VSCode/Copilot

- [ ] Trocar cards antigos por `EnterpriseStatCard`.
- [ ] Trocar headers soltos por `PageTemplate`.
- [ ] Trocar caixas principais por `ContentCard`.
- [ ] Remover cores fixas de botões principais.
- [ ] Usar `--brand-primary`, `--brand-menu` e `--brand-accent`.
- [ ] Manter API/backend sem alteração.
- [ ] Rodar `npm run frontend:build`.
