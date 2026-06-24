UPDATE "User"
SET email = 'superadmin@gestasports.com'
WHERE email = 'superadmin@flamilha.com' AND role = 'SUPERADMIN';

UPDATE "OrganizationTenant"
SET
  "defaultSubdomain" = 'flamilha.gestasports.com.br',
  "databaseName" = 'gestasports_flamilha',
  notes = COALESCE(notes, 'Cliente piloto usado para validar o SaaS GestaSports antes de novos clientes.')
WHERE slug = 'flamilha';

UPDATE "TenantDomain"
SET
  hostname = 'flamilha.gestasports.com.br',
  "expectedCname" = 'gestasports.com.br'
WHERE hostname IN ('flamilha.clube360.com.br', 'flamilha.localhost');
