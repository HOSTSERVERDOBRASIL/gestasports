ALTER TABLE "OrganizationTenant" ALTER COLUMN "planName" SET DEFAULT 'Padrão';

UPDATE "OrganizationTenant"
SET "planName" = 'Padrão'
WHERE "planName" = 'Padrao';

UPDATE "SaaSPlan"
SET "description" = CASE "slug"
  WHEN 'essencial' THEN 'Operação básica para clubes pequenos com financeiro e jogos.'
  WHEN 'profissional' THEN 'Gestão completa do clube com relatórios, rankings e galeria.'
  WHEN 'enterprise' THEN 'Pacote completo para operação multi-equipes com automações e comunicação.'
  ELSE "description"
END
WHERE "slug" IN ('essencial', 'profissional', 'enterprise');
