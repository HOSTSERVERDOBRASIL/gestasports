import type { ComponentType } from "react";
import type { TenantModuleCode, UserRole } from "../types/domain";
import { FINANCE_ROLES, MANAGEMENT_ROLES, SPORTS_ROLES } from "../security/permissions";
import {
  BarChart3,
  BookOpenText,
  CalendarDays,
  ClipboardList,
  Coins,
  HeartPulse,
  MapPinned,
  Plus,
  Settings,
  Shield,
  ServerCog,
  Trophy,
  UserRound,
  WalletCards,
  Users
} from "lucide-react";

export type NavigationItem = {
  label: string;
  path: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  roles: UserRole[];
  children?: Array<{
    label: string;
    path: string;
    roles?: UserRole[];
  }>;
};

export type NavigationSection = {
  id: string;
  label: string;
  hint: string;
  context: "CLUB" | "SAAS";
  items: NavigationItem[];
};

const managementRoles: UserRole[] = MANAGEMENT_ROLES;
const financeRoles: UserRole[] = FINANCE_ROLES;
const sportsRoles: UserRole[] = SPORTS_ROLES;

export const navigationSections: NavigationSection[] = [
  {
    id: "saas-platform-admin",
    label: "Visão geral",
    hint: "Resumo da plataforma",
    context: "SAAS",
    items: [
      { label: "Painel GestaSports", path: "/superadmin", icon: BarChart3, roles: ["SUPERADMIN"] },
    ]
  },
  {
    id: "saas-clients",
    label: "Clientes e comercial",
    hint: "Clubes, planos e faturamento",
    context: "SAAS",
    items: [
      { label: "Clientes", path: "/superadmin?view=operations&filter=all", icon: Users, roles: ["SUPERADMIN"] },
      { label: "Novo cliente", path: "/superadmin?view=new", icon: Plus, roles: ["SUPERADMIN"] },
      { label: "Planos", path: "/superadmin?view=plans", icon: WalletCards, roles: ["SUPERADMIN"] },
      { label: "Recursos", path: "/superadmin?view=resources", icon: Trophy, roles: ["SUPERADMIN"] },
      { label: "Faturamento", path: "/superadmin?view=finance", icon: Coins, roles: ["SUPERADMIN"] },
    ]
  },
  {
    id: "saas-platform-operations",
    label: "Operação da plataforma",
    hint: "Infraestrutura, segurança e suporte",
    context: "SAAS",
    items: [
      { label: "Integrações Globais", path: "/superadmin?view=global-integrations", icon: ServerCog, roles: ["SUPERADMIN"] },
      { label: "Templates", path: "/superadmin?view=templates", icon: BookOpenText, roles: ["SUPERADMIN"] },
      { label: "Auditoria", path: "/superadmin?view=audit", icon: ClipboardList, roles: ["SUPERADMIN"] },
      { label: "Monitoramento", path: "/superadmin?view=monitoring", icon: BarChart3, roles: ["SUPERADMIN"] },
      { label: "Suporte", path: "/superadmin?view=support", icon: Shield, roles: ["SUPERADMIN"] },
      { label: "Configurações da Plataforma", path: "/superadmin?view=settings", icon: Settings, roles: ["SUPERADMIN"] }
    ]
  },
  {
    id: "club-dashboard",
    label: "Visão administrativa",
    hint: "Visão geral da associação",
    context: "CLUB",
    items: [
      { label: "Dashboard", path: "/", icon: BarChart3, roles: ["ADMIN"] }
    ]
  },
  {
    id: "sports-director",
    label: "Direção de Esportes",
    hint: "Jogos, elenco e campo",
    context: "CLUB",
    items: [
      { label: "Central esportiva", path: "/esportes", icon: Trophy, roles: ["SPORTS_DIRECTOR"] },
      { label: "Campo e Times", path: "/jogos/campo-times", icon: MapPinned, roles: ["SPORTS_DIRECTOR"] },
      { label: "Marcar jogo", path: "/jogos?view=OPERACAO&subView=CADASTRO", icon: Plus, roles: ["SPORTS_DIRECTOR"] },
      { label: "Jogos e convocações", path: "/jogos", icon: CalendarDays, roles: ["SPORTS_DIRECTOR"] },
      { label: "Elenco", path: "/atletas", icon: Users, roles: ["SPORTS_DIRECTOR"] },
      { label: "Clubes e equipes", path: "/clubes", icon: Shield, roles: ["SPORTS_DIRECTOR"] },
      { label: "Campos", path: "/campos", icon: MapPinned, roles: ["SPORTS_DIRECTOR"] },
      { label: "Competições", path: "/competicoes", icon: Trophy, roles: ["SPORTS_DIRECTOR"] },
      { label: "Estatísticas", path: "/estatisticas", icon: BarChart3, roles: ["SPORTS_DIRECTOR"] }
    ]
  },
  {
    id: "associate-portal",
    label: "Associação",
    hint: "Financeiro pessoal e acervo",
    context: "CLUB",
    items: [
      { label: "Minha associação", path: "/associado", icon: UserRound, roles: ["ASSOCIATE"] },
      { label: "Acervo do clube", path: "/acervo", icon: BookOpenText, roles: ["ASSOCIATE"] }
    ]
  },
  {
    id: "atleta-dashboard",
    label: "Atleta",
    hint: "Conta, jogos e desempenho",
    context: "CLUB",
    items: [
      { label: "Dashboard", path: "/atleta", icon: BarChart3, roles: ["ATHLETE"] },
      { label: "Jogos", path: "/atleta/jogos", icon: CalendarDays, roles: ["ATHLETE"] },
      { label: "Desempenho", path: "/atleta/desempenho", icon: Trophy, roles: ["ATHLETE"] },
      { label: "Financeiro", path: "/atleta/financeiro", icon: Coins, roles: ["ATHLETE"] },
      { label: "Saúde", path: "/atleta/saude", icon: HeartPulse, roles: ["ATHLETE"] },
      { label: "Perfil", path: "/atleta/perfil", icon: UserRound, roles: ["ATHLETE"] },
      { label: "Conquistas", path: "/atleta/conquistas", icon: BookOpenText, roles: ["ATHLETE"] }
    ]
  },
  {
    id: "club-people",
    label: "Cadastros e vínculos",
    hint: "Associados, atletas e gestão",
    context: "CLUB",
    items: [
      {
        label: "Pessoas",
        path: "/pessoas",
        icon: Users,
        roles: managementRoles,
        children: [
          { label: "Associados", path: "/associados", roles: managementRoles },
          { label: "Atletas", path: "/atletas", roles: ["ADMIN"] },
          { label: "Diretoria", path: "/diretoria", roles: managementRoles },
          { label: "Comissão Técnica", path: "/comissao-tecnica", roles: ["ADMIN"] },
          { label: "Convites", path: "/convites", roles: managementRoles }
        ]
      }
    ]
  },
  {
    id: "club-agenda",
    label: "Calendário do clube",
    hint: "Eventos, calendário e inscrições",
    context: "CLUB",
    items: [
      {
        label: "Agenda",
        path: "/agenda",
        icon: CalendarDays,
        roles: managementRoles,
        children: [
          { label: "Painel da agenda", path: "/agenda", roles: managementRoles },
          { label: "Calendário", path: "/eventos?view=calendario", roles: managementRoles },
          { label: "Treinos", path: "/treinos", roles: managementRoles },
          { label: "Lista de eventos", path: "/eventos?view=lista", roles: managementRoles },
          { label: "Novo evento", path: "/eventos/novo", roles: ["ADMIN"] }
        ]
      }
    ]
  },
  {
    id: "club-football",
    label: "Operação esportiva",
    hint: "Jogos, campos e competições",
    context: "CLUB",
    items: [
      {
        label: "Futebol",
        path: "/futebol",
        icon: Trophy,
        roles: sportsRoles,
        children: [
          { label: "Painel do futebol", path: "/futebol", roles: sportsRoles },
          { label: "Lista de jogos", path: "/jogos?view=OPERACAO&subView=LISTA", roles: sportsRoles },
          { label: "Cadastrar jogo", path: "/jogos?view=OPERACAO&subView=CADASTRO", roles: sportsRoles },
          { label: "Agenda de jogos", path: "/jogos?view=OPERACAO&subView=AGENDA", roles: sportsRoles },
          { label: "Confirmações", path: "/jogos?view=OPERACAO&subView=CONFIRMACOES", roles: sportsRoles },
          { label: "Escalação", path: "/jogos?view=OPERACAO&subView=ESCALACAO", roles: sportsRoles },
          { label: "Súmula", path: "/jogos?view=OPERACAO&subView=EVENTOS", roles: sportsRoles }
        ]
      },
      {
        label: "Estrutura",
        path: "/campos",
        icon: MapPinned,
        roles: ["ADMIN"],
        children: [
          { label: "Campos", path: "/campos", roles: ["ADMIN"] },
          { label: "Equipes", path: "/clubes?view=equipes", roles: ["ADMIN"] },
          { label: "Adversarios", path: "/adversarios", roles: ["ADMIN"] },
          { label: "Competições", path: "/competicoes", roles: ["ADMIN"] },
          { label: "Ligas Internas", path: "/ligas-internas", roles: ["ADMIN"] }
        ]
      }
    ]
  },
  {
    id: "club-finance",
    label: "Gestão financeira",
    hint: "Mensalidades, receitas, despesas e cobranças",
    context: "CLUB",
    items: [
      {
        label: "Financeiro",
        path: "/financeiro?area=DASHBOARD",
        icon: Coins,
        roles: financeRoles,
        children: [
          { label: "Painel", path: "/financeiro?area=DASHBOARD", roles: financeRoles },
          { label: "Mensalidades", path: "/financeiro?area=MENSALIDADES", roles: financeRoles },
          { label: "Receitas", path: "/financeiro?area=RECEITAS", roles: financeRoles },
          { label: "Despesas", path: "/financeiro?area=DESPESAS", roles: financeRoles },
          { label: "Cobranças", path: "/financeiro?area=COBRANCAS", roles: financeRoles },
          { label: "Relatórios financeiros", path: "/financeiro?area=RELATORIOS", roles: financeRoles }
        ]
      }
    ]
  },
  {
    id: "club-stats",
    label: "Desempenho e estatísticas",
    hint: "Rankings, participações e disciplina",
    context: "CLUB",
    items: [
      {
        label: "Estatísticas",
        path: "/estatisticas",
        icon: BarChart3,
        roles: sportsRoles,
        children: [
          { label: "Artilharia", path: "/artilharia", roles: sportsRoles },
          { label: "Assistências", path: "/assistencias", roles: sportsRoles },
          { label: "Participações", path: "/participacoes", roles: sportsRoles },
          { label: "Disciplina", path: "/disciplina", roles: sportsRoles },
          { label: "Confrontos", path: "/confrontos", roles: sportsRoles },
          { label: "Goleiros", path: "/goleiros", roles: sportsRoles },
          { label: "Rankings Gerais", path: "/rankings", roles: sportsRoles }
        ]
      }
    ]
  },
  {
    id: "club-memorial",
    label: "Memória e Patrimônio",
    hint: "História, camisas e património do futebol",
    context: "CLUB",
    items: [
      {
        label: "Acervo do Clube",
        path: "/memorial",
        icon: Trophy,
        roles: managementRoles,
        children: [
          { label: "Painel do acervo", path: "/memorial", roles: managementRoles },
          { label: "Jogos históricos", path: "/memorial/jogos", roles: managementRoles },
          { label: "Atletas históricos", path: "/memorial/atletas", roles: managementRoles },
          { label: "Presidentes e diretorias", path: "/memorial/diretorias", roles: managementRoles },
          { label: "Títulos", path: "/memorial/titulos", roles: managementRoles },
          { label: "Acervo de súmulas", path: "/memorial/sumulas", roles: managementRoles },
          { label: "Linha do tempo", path: "/memorial/linha-do-tempo", roles: managementRoles },
          { label: "Camisas históricas", path: "/memorial/uniformes", roles: managementRoles },
          { label: "Galeria", path: "/galeria", roles: managementRoles },
          { label: "Documentos históricos", path: "/memorial/documentos", roles: managementRoles },
          { label: "Troféus e premiações", path: "/memorial/trofeus", roles: managementRoles },
          { label: "Patrimônio do clube", path: "/memorial/patrimonio", roles: managementRoles },
          { label: "Hall da fama", path: "/memorial/hall-da-fama", roles: managementRoles }
        ]
      }
    ]
  },
  {
    id: "club-settings",
    label: "Administração do sistema",
    hint: "Clube, categorias, uniformes, Pix, ferramentas e acessos",
    context: "CLUB",
    items: [
      {
        label: "Configurações",
        path: "/configuracoes/visao-geral",
        icon: Settings,
        roles: ["ADMIN"],
        children: [
          { label: "Painel de configurações", path: "/configuracoes/visao-geral", roles: ["ADMIN"] },
          { label: "Clube e associação", path: "/configuracoes?aba=club", roles: ["ADMIN"] },
          { label: "Categorias", path: "/clubes?view=categorias", roles: ["ADMIN"] },
          { label: "Uniformes", path: "/configuracoes?aba=uniforms", roles: ["ADMIN"] },
          { label: "Pix e ferramentas", path: "/configuracoes?aba=pix", roles: ["ADMIN"] },
          { label: "Diretoria e funções", path: "/configuracoes?aba=board", roles: ["ADMIN"] },
          { label: "Permissões", path: "/configuracoes?aba=profiles", roles: ["ADMIN"] },
          { label: "Auditoria", path: "/configuracoes?aba=audit", roles: ["ADMIN"] }
        ]
      }
    ]
  }
];

export const navigationItems = navigationSections.flatMap((section) =>
  section.items.flatMap((item) => [item, ...(item.children ?? []).map((child) => ({ ...item, ...child, children: undefined }))])
);

export function moduleForPath(path: string): TenantModuleCode | undefined {
  if (path === "/" || path.startsWith("/minha-conta") || path.startsWith("/atleta")) return undefined;
  if (path.startsWith("/superadmin")) return undefined;
  if (path.startsWith("/associacao")) return "ASSOCIATES";
  if (path.startsWith("/pessoas")) return "ASSOCIATES";
  if (path.startsWith("/associados")) return "ASSOCIATES";
  if (path.startsWith("/convites")) return "ASSOCIATES";
  if (path.startsWith("/diretoria")) return "ASSOCIATES";
  if (path.startsWith("/atletas")) return "ATHLETES";
  if (path.startsWith("/agenda") || path.startsWith("/treinos")) return "EVENTS";
  if (path.startsWith("/clubes")) return "CLUBS";
  if (path.startsWith("/campos") || path.startsWith("/adversarios")) return "CLUBS";
  if (path.startsWith("/equipes")) return "TEAMS";
  if (path.startsWith("/comissao-tecnica")) return "TEAMS";
  if (path.startsWith("/uniformes")) return "SETTINGS";
  if (path.startsWith("/futebol")) return "GAMES";
  if (path.startsWith("/jogos/campo-times")) return "LINEUPS";
  if (path.startsWith("/jogos") || path.startsWith("/dashboard/campo-times") || path.startsWith("/cadastrar-jogo") || path.startsWith("/agenda-jogos") || path.startsWith("/escalacoes") || path.startsWith("/participacao") || path.startsWith("/convocacoes")) return "GAMES";
  if (path.startsWith("/competicoes") || path.startsWith("/ligas-internas")) return "COMPETITIONS";
  if (path.startsWith("/financeiro")) return "FINANCE";
  if (path.startsWith("/relatorios")) return "REPORTS";
  if (path.startsWith("/eventos")) return "EVENTS";
  if (path.startsWith("/estatisticas") || path.startsWith("/artilharia") || path.startsWith("/assistencias") || path.startsWith("/participacoes") || path.startsWith("/disciplina") || path.startsWith("/confrontos") || path.startsWith("/rankings") || path.startsWith("/goleiros")) return "RANKINGS";
  if (path.startsWith("/galeria")) return "GALLERY";
  if (path.startsWith("/historico")) return "REPORTS";
  if (path === "/memorial") return undefined;
  if (path.startsWith("/memorial/documentos") || path.startsWith("/memorial/sumulas") || path.startsWith("/memorial/titulos") || path.startsWith("/memorial/trofeus") || path.startsWith("/memorial/patrimonio") || path.startsWith("/memorial/hall-da-fama") || path.startsWith("/memorial/linha-do-tempo")) return "DOCUMENTS";
  if (path.startsWith("/memorial/uniformes")) return "GALLERY";
  if (path.startsWith("/memorial/jogos")) return "GAMES";
  if (path.startsWith("/memorial/atletas")) return "ATHLETES";
  if (path.startsWith("/memorial/diretorias")) return "ASSOCIATES";
  if (path.startsWith("/memorial")) return "DOCUMENTS";
  if (path.startsWith("/configuracoes")) return "SETTINGS";
  if (path.startsWith("/auditoria")) return "SETTINGS";
  return undefined;
}

function canAccessModule(path: string, enabledModules: TenantModuleCode[] | undefined, roleSet: Set<UserRole>) {
  const module = moduleForPath(path);
  if (!module || roleSet.has("SUPERADMIN") || !enabledModules) {
    return true;
  }

  return enabledModules.includes(module);
}

function sectionMatchesRoleContext(section: NavigationSection, roleSet: Set<UserRole>) {
  const isSaasContext = roleSet.has("SUPERADMIN");
  return isSaasContext ? section.context === "SAAS" : section.context === "CLUB";
}

export function getNavigationSectionsByRoles(roles: UserRole[] | undefined, enabledModules: TenantModuleCode[]) {
  if (!roles || roles.length === 0) {
    return [];
  }

  const roleSet = new Set(roles);

  return navigationSections
    .filter((section) => sectionMatchesRoleContext(section, roleSet))
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => item.roles.some((role) => roleSet.has(role)))
        .map((item) => ({
          ...item,
          children: (item.children ?? [])
            .filter((child) => (child.roles ?? item.roles).some((role) => roleSet.has(role)))
            .filter((child) => canAccessModule(child.path, enabledModules, roleSet))
        }))
        .filter((item) => canAccessModule(item.path, enabledModules, roleSet) || Boolean(item.children?.length))
    }))
    .filter((section) => section.items.length > 0);
}

export function getNavigationItemsByRoles(roles: UserRole[] | undefined, enabledModules: TenantModuleCode[]) {
  return getNavigationSectionsByRoles(roles, enabledModules).flatMap((section) => section.items);
}

export function getDefaultFavoritePathsByRoles(roles: UserRole[] | undefined, enabledModules: TenantModuleCode[]) {
  const visibleItems = getNavigationItemsByRoles(roles, enabledModules);
  const preferredOrder = [
    "/superadmin",
    "/superadmin?view=operations&filter=all",
    "/superadmin?view=finance",
    "/",
    "/esportes",
    "/jogos/campo-times",
    "/associado",
    "/acervo",
    "/agenda",
    "/pessoas",
    "/estatisticas",
    "/financeiro?area=COBRANCAS",
    "/memorial",
    "/atleta"
  ];
  const visiblePaths = new Set(visibleItems.map((item) => item.path));

  return preferredOrder.filter((path) => visiblePaths.has(path)).slice(0, 4);
}
