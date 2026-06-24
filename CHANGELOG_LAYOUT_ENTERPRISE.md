# Alterações aplicadas - Layout Enterprise

## Arquivos criados

- `frontend/src/components/ui/EnterpriseUI.tsx`
  - `PageTemplate`
  - `PageHeader`
  - `StatsGrid`
  - `EnterpriseStatCard`
  - `ContentGrid`
  - `ContentCard`
  - `PrimaryButton`
  - `SoftButton`
  - `EmptyPanel`

- `SPEC_COMPONENTES_ENTERPRISE_VSCODE.md`
  - orientação para o VSCode/Copilot refatorar as telas usando os componentes novos.

## Arquivos alterados

- `frontend/src/index.css`
  - adicionada camada visual enterprise.
  - cards antigos com `rounded-lg border bg-white` passam a receber visual mais premium.
  - cores vermelhas antigas passam a respeitar `--brand-accent`.
  - botões principais continuam usando `--brand-primary`.
  - dark mode recebeu compatibilidade básica para os novos componentes.

## Validação

- `npm --prefix frontend run typecheck`: OK.
- `npm run frontend:build`: não concluiu por dependência nativa ausente no node_modules enviado no ZIP (`@rolldown/binding-linux-x64-gnu`). Isso é ambiente/dependência do Vite/Rolldown, não erro de TypeScript dos arquivos alterados.

## Como validar no VSCode

1. Remover `frontend/node_modules`.
2. Rodar `npm install` dentro de `frontend`.
3. Rodar `npm run frontend:build` na raiz.
