import type { UserRole } from "../types/domain";

export const ADMIN_ROLES: UserRole[] = ["ADMIN"];
export const MANAGEMENT_ROLES: UserRole[] = ["ADMIN"];
export const FINANCE_ROLES: UserRole[] = ["ADMIN", "FINANCIAL"];
export const SPORTS_ROLES: UserRole[] = ["ADMIN", "SPORTS_DIRECTOR"];
export const ASSOCIATE_ROLES: UserRole[] = ["ASSOCIATE"];
export const ATHLETE_ROLES: UserRole[] = ["ATHLETE"];
export const SUPERADMIN_ROLES: UserRole[] = ["SUPERADMIN"];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: "Superadmin da plataforma",
  ADMIN: "Administrador do tenant",
  SPORTS_DIRECTOR: "Diretor de esportes",
  FINANCIAL: "Diretoria financeira",
  ASSOCIATE: "Associado",
  ATHLETE: "Atleta / associado"
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SPORTS_DIRECTOR: "Gerencia jogos, Campo e Times, elenco, convocações, escalações e competições.",
  ASSOCIATE: "Acompanha situação associativa, financeiro pessoal, comunicados e acervo do clube.",
  SUPERADMIN: "Opera clientes, planos, recursos globais e suporte da plataforma GestaSports.",
  ADMIN: "Configura o clube, gerencia futebol, associados, memorial, usuários e permissões locais.",
  FINANCIAL: "Acompanha gestão, cobranças, receitas, despesas, relatórios e operação financeira.",
  ATHLETE: "Acessa portal próprio, convocações, jogos, pagamentos, perfil e histórico individual."
};

export type EnterpriseProfile = {
  label: string;
  roles: UserRole[];
  description: string;
};

export const ENTERPRISE_PROFILES: EnterpriseProfile[] = [
  { label: "Atleta", roles: ATHLETE_ROLES, description: "Rotina esportiva, presença, desempenho, financeiro próprio e perfil." },
  { label: "Associado", roles: ATHLETE_ROLES, description: "Portal pessoal com vínculos, mensalidades e comunicação do clube." },
  { label: "Responsável", roles: ATHLETE_ROLES, description: "Acesso operacional ao vínculo familiar ou administrativo simples do associado." },
  { label: "Técnico", roles: ADMIN_ROLES, description: "Gestão esportiva, elenco, jogos, escalações, estatísticas e disciplina." },
  { label: "Diretor de futebol", roles: ADMIN_ROLES, description: "Governança esportiva, competições, atletas, campos e calendário." },
  { label: "Diretor financeiro", roles: ["FINANCIAL"], description: "Cobranças, PIX, mensalidades, caixa, despesas e relatórios." },
  { label: "Presidente", roles: MANAGEMENT_ROLES, description: "Visão executiva da associação, histórico, financeiro e relatórios." },
  { label: "Administrador do tenant", roles: ADMIN_ROLES, description: "Controle total do cliente, incluindo usuários, módulos, tema e configurações." },
  { label: "Superadmin da plataforma", roles: SUPERADMIN_ROLES, description: "Administração SaaS global, clientes, planos, templates e suporte." }
];

export type PermissionArea = {
  area: string;
  roles: UserRole[];
  access: string;
  examples: string;
};

export const PERMISSION_AREAS: PermissionArea[] = [
  { area: "Dashboard da associação", roles: MANAGEMENT_ROLES, access: "Visualizar operação e indicadores", examples: "KPIs, widgets, agenda e resumos executivos" },
  { area: "Configurações e permissões", roles: ADMIN_ROLES, access: "Administrar", examples: "Usuários, tema, módulos, Pix, diretoria e perfis" },
  { area: "Pessoas e associados", roles: MANAGEMENT_ROLES, access: "Consultar e operar", examples: "Associados, convites, diretoria e vínculos" },
  { area: "Elenco e futebol", roles: ADMIN_ROLES, access: "Administrar operação esportiva", examples: "Atletas, jogos, escalações, súmulas, competições e ligas internas" },
  { area: "Agenda e treinos", roles: MANAGEMENT_ROLES, access: "Planejar e acompanhar", examples: "Eventos, treinos, jogos, inscrições, calendário e reservas" },
  { area: "Financeiro", roles: FINANCE_ROLES, access: "Consultar e lançar", examples: "Mensalidades, cobranças, receitas, despesas e relatórios financeiros" },
  { area: "Memorial e acervo", roles: MANAGEMENT_ROLES, access: "Curadoria administrativa", examples: "Categorias, documentos, títulos, linha do tempo e galeria" },
  { area: "Portal do atleta", roles: ATHLETE_ROLES, access: "Uso pessoal", examples: "Convocações, presença, pagamentos, carreira e perfil" },
  { area: "Backoffice SaaS", roles: SUPERADMIN_ROLES, access: "Administração global", examples: "Tenants, planos, recursos, templates, auditoria e suporte" }
];

export function hasAnyRole(userRoles: UserRole[] | undefined, allowedRoles: UserRole[]) {
  if (!userRoles?.length) return false;
  return allowedRoles.some((role) => userRoles.includes(role));
}

export function roleListLabel(roles: UserRole[]) {
  return roles.map((role) => ROLE_LABELS[role] ?? role).join(" + ");
}
