import { TenantModuleCode } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const tenantModuleCatalog: Array<{ code: TenantModuleCode; label: string; description: string; includedByDefault: boolean }> = [
  { code: "ATHLETES" as TenantModuleCode, label: "Atletas", description: "Elenco, perfis, dados esportivos e status dos atletas.", includedByDefault: true },
  { code: "ASSOCIATES" as TenantModuleCode, label: "Associados", description: "Cadastro de associados, diretoria e vínculos administrativos.", includedByDefault: true },
  { code: "CLUBS" as TenantModuleCode, label: "Clubes", description: "Cadastro do clube principal, adversários e parceiros.", includedByDefault: true },
  { code: "TEAMS" as TenantModuleCode, label: "Equipes", description: "Categorias, comissão técnica e equipes por clube.", includedByDefault: true },
  { code: "GAMES" as TenantModuleCode, label: "Jogos", description: "Agenda, cadastro de jogos e súmulas.", includedByDefault: true },
  { code: "LINEUPS" as TenantModuleCode, label: "Escalações", description: "Escalação, campo e montagem de times.", includedByDefault: true },
  { code: "CALLUPS" as TenantModuleCode, label: "Convocações", description: "Convocação de atletas para amistosos e jogos oficiais.", includedByDefault: true },
  { code: "COMPETITIONS" as TenantModuleCode, label: "Competições", description: "Campeonatos, torneios, tabelas e classificação.", includedByDefault: false },
  { code: "EVENTS" as TenantModuleCode, label: "Eventos", description: "Agenda de eventos, inscrições e ações comunitárias.", includedByDefault: true },
  { code: "ATTENDANCE" as TenantModuleCode, label: "Presenças", description: "Confirmações, check-in e participação.", includedByDefault: true },
  { code: "RANKINGS" as TenantModuleCode, label: "Rankings", description: "Artilharia, disciplina, confrontos e performance.", includedByDefault: true },
  { code: "OFFICIAL_STATS" as TenantModuleCode, label: "Estatísticas oficiais", description: "Números oficiais separados do ranking interno.", includedByDefault: false },
  { code: "FINANCE" as TenantModuleCode, label: "Financeiro", description: "Mensalidades, fluxo de caixa e cobranças do clube.", includedByDefault: true },
  { code: "REPORTS" as TenantModuleCode, label: "Relatórios", description: "Relatórios administrativos, financeiros e esportivos.", includedByDefault: true },
  { code: "DOCUMENTS" as TenantModuleCode, label: "Acervo e documentos", description: "Acervo do clube, documentos de atletas, contratos e anexos.", includedByDefault: true },
  { code: "COMMUNICATION" as TenantModuleCode, label: "Comunicação", description: "Comunicados, lembretes e mensagens por perfil.", includedByDefault: false },
  { code: "GALLERY" as TenantModuleCode, label: "Galeria", description: "Fotos, memórias e mídia do clube.", includedByDefault: true },
  { code: "SETTINGS" as TenantModuleCode, label: "Configurações", description: "Aparência, usuários, convites e parâmetros do clube.", includedByDefault: true }
];

export const defaultTenantModuleCodes = tenantModuleCatalog.filter((item) => item.includedByDefault).map((item) => item.code);

export async function ensureTenantModules(tenantId: string, codes = defaultTenantModuleCodes) {
  const existing = await prisma.tenantModule.findMany({
    where: { tenantId },
    select: { code: true }
  });
  const existingCodes = new Set(existing.map((item) => item.code));
  const missing = tenantModuleCatalog.filter((item) => !existingCodes.has(item.code));

  if (missing.length === 0) {
    return;
  }

  await prisma.tenantModule.createMany({
    data: missing.map((item) => ({
      tenantId,
      code: item.code,
      enabled: codes.includes(item.code)
    })),
    skipDuplicates: true
  });
}

export async function getEnabledTenantModuleCodes(tenantId: string | null | undefined) {
  if (!tenantId) {
    return [];
  }

  await ensureTenantModules(tenantId);
  const modules = await prisma.tenantModule.findMany({
    where: { tenantId, enabled: true },
    select: { code: true }
  });

  return modules.map((item) => item.code);
}
