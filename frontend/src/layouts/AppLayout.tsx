import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { Topbar } from "../components/layout/Topbar";
import { useAuth } from "../hooks/useAuth";
import { usePeriod } from "../hooks/usePeriod";
import { getNavigationItemsByRoles, moduleForPath } from "../data/navigation";
import { apiRequest } from "../services/api";
import type { CurrentTenant, TenantBillingStatus, TenantBrandingSettings, UserRole } from "../types/domain";

const SIDEBAR_COLLAPSED_KEY = "gestasports-sidebar-collapsed";
const UI_MENU_STYLE_KEY = "gestasports-ui-menu-style";
const UI_EFFECTS_KEY = "gestasports-ui-effects";

type MenuStyle = "brand" | "light" | "glass";
type EffectsLevel = "full" | "soft" | "minimal";

type PageChrome = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionPath?: string;
};

const pageChromeByPath: Array<[string, PageChrome]> = [
  ["/memorial/jogos/novo", { title: "Novo jogo historico", subtitle: "Cadastre uma partida antiga fora do fluxo operacional de jogos.", actionLabel: "Voltar", actionPath: "/memorial/jogos" }],
  ["/memorial/atletas/novo", { title: "Novo atleta historico", subtitle: "Registre atletas atuais ou antigos para o acervo do clube.", actionLabel: "Voltar", actionPath: "/memorial/atletas" }],
  ["/memorial/sumulas/novo", { title: "Subir sumula antiga", subtitle: "Digitalize ou vincule sumulas sem depender do fluxo de jogo atual.", actionLabel: "Voltar", actionPath: "/memorial/sumulas" }],
  ["/memorial/uniformes/novo", { title: "Nova camisa historica", subtitle: "Cadastre temporada, fornecedor, patrocinador e foto da camisa.", actionLabel: "Voltar", actionPath: "/memorial/uniformes" }],
  ["/memorial/titulos/novo", { title: "Novo titulo", subtitle: "Registre conquistas, finais e campanhas para o acervo.", actionLabel: "Voltar", actionPath: "/memorial/titulos" }],
  ["/memorial/documentos/novo", { title: "Novo documento historico", subtitle: "Preserve atas, contratos, estatutos e documentos oficiais.", actionLabel: "Voltar", actionPath: "/memorial/documentos" }],
  ["/memorial/trofeus/novo", { title: "Novo trofeu ou premiacao", subtitle: "Registre trofeus, medalhas e premiacoes individuais.", actionLabel: "Voltar", actionPath: "/memorial/trofeus" }],
  ["/memorial/patrimonio/novo", { title: "Novo patrimonio", subtitle: "Cadastre bens, estruturas, equipamentos e localizacoes do clube.", actionLabel: "Voltar", actionPath: "/memorial/patrimonio" }],
  ["/memorial/hall-da-fama/novo", { title: "Indicar ao Hall da Fama", subtitle: "Cadastre homenageados e seus vinculos com a historia do clube.", actionLabel: "Voltar", actionPath: "/memorial/hall-da-fama" }],
  ["/memorial/linha-do-tempo/novo", { title: "Novo marco historico", subtitle: "Registre acontecimentos importantes na linha do tempo do clube.", actionLabel: "Voltar", actionPath: "/memorial/linha-do-tempo" }],
  ["/memorial/jogos/", { title: "Registro de jogo historico", subtitle: "Consulte detalhes, fotos, documentos e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/memorial/jogos" }],
  ["/memorial/jogos", { title: "Jogos historicos", subtitle: "Registre partidas marcantes fora do fluxo operacional de jogos.", actionLabel: "Novo jogo historico", actionPath: "/memorial/jogos/novo" }],
  ["/memorial/atletas/", { title: "Registro de atleta historico", subtitle: "Consulte detalhes, fotos, documentos e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/memorial/atletas" }],
  ["/memorial/atletas", { title: "Atletas historicos", subtitle: "Organize atletas atuais e antigos que fazem parte da historia do clube.", actionLabel: "Novo atleta historico", actionPath: "/memorial/atletas/novo" }],
  ["/memorial/diretorias", { title: "Presidentes e diretorias", subtitle: "Preserve mandatos, diretorias, projetos e conquistas institucionais.", actionLabel: "Nova diretoria", actionPath: "/diretoria/mandatos/novo" }],
  ["/memorial/titulos/", { title: "Registro de titulo", subtitle: "Consulte detalhes, fotos, documentos e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/memorial/titulos" }],
  ["/memorial/titulos", { title: "Titulos", subtitle: "Consulte e cadastre conquistas, finais, campanhas e documentos.", actionLabel: "Novo titulo", actionPath: "/memorial/titulos/novo" }],
  ["/memorial/sumulas/", { title: "Registro de sumula", subtitle: "Consulte detalhes, anexo oficial e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/memorial/sumulas" }],
  ["/memorial/sumulas", { title: "Acervo de sumulas", subtitle: "Suba sumulas antigas ou vincule documentos fora do fluxo atual de jogo.", actionLabel: "Subir sumula", actionPath: "/memorial/sumulas/novo" }],
  ["/memorial/uniformes/", { title: "Registro de camisa historica", subtitle: "Consulte temporada, imagem, documentos e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/memorial/uniformes" }],
  ["/memorial/uniformes", { title: "Camisas historicas", subtitle: "Cadastre temporadas, fornecedores, patrocinadores e fotos das camisas.", actionLabel: "Nova camisa", actionPath: "/memorial/uniformes/novo" }],
  ["/memorial/linha-do-tempo/", { title: "Registro da linha do tempo", subtitle: "Consulte detalhes e edite este marco historico.", actionLabel: "Voltar", actionPath: "/memorial/linha-do-tempo" }],
  ["/memorial/linha-do-tempo", { title: "Linha do tempo", subtitle: "Acompanhe a historia do clube por ano, marco e categoria.", actionLabel: "Novo marco", actionPath: "/memorial/linha-do-tempo/novo" }],
  ["/memorial/documentos/", { title: "Registro de documento historico", subtitle: "Consulte detalhes, anexos e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/memorial/documentos" }],
  ["/memorial/documentos", { title: "Documentos historicos", subtitle: "Preserve atas, contratos, estatutos e arquivos oficiais do clube.", actionLabel: "Novo documento", actionPath: "/memorial/documentos/novo" }],
  ["/memorial/trofeus/", { title: "Registro de trofeu ou premiacao", subtitle: "Consulte detalhes, imagens e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/memorial/trofeus" }],
  ["/memorial/trofeus", { title: "Trofeus e premiacoes", subtitle: "Organize trofeus, medalhas e premiacoes individuais.", actionLabel: "Novo registro", actionPath: "/memorial/trofeus/novo" }],
  ["/memorial/patrimonio/", { title: "Registro de patrimonio", subtitle: "Consulte detalhes, anexos e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/memorial/patrimonio" }],
  ["/memorial/patrimonio", { title: "Patrimonio do clube", subtitle: "Controle bens, estruturas, equipamentos e manutencoes historicas.", actionLabel: "Novo patrimonio", actionPath: "/memorial/patrimonio/novo" }],
  ["/memorial/hall-da-fama/", { title: "Registro do Hall da Fama", subtitle: "Consulte detalhes, imagens e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/memorial/hall-da-fama" }],
  ["/memorial/hall-da-fama", { title: "Hall da fama", subtitle: "Homenageie pessoas que marcaram a historia do clube.", actionLabel: "Indicar integrante", actionPath: "/memorial/hall-da-fama/novo" }],
  ["/memorial", { title: "Acervo do Clube", subtitle: "Consulte e alimente a memoria historica do clube.", actionLabel: "Novo registro", actionPath: "/memorial/linha-do-tempo/novo" }],
  ["/associacao/", { title: "Plano operacional", subtitle: "Veja como inserir, consultar, editar e anexar registros deste bloco.", actionLabel: "Voltar", actionPath: "/associacao" }],
  ["/associacao", { title: "Gestao da Associacao", subtitle: "Central completa para associados, governanca, documentos, financeiro, eventos e acervo.", actionLabel: "Novo associado", actionPath: "/associados?edit=new" }],
  ["/superadmin", { title: "GestaSports Admin", subtitle: "Gerencie clubes, planos, módulos, billing SaaS e provisionamento." }],
  ["/esportes", { title: "Direção de Esportes", subtitle: "Jogos, elenco, convocações, escalações e Campo e Times.", actionLabel: "Campo e Times", actionPath: "/jogos/campo-times" }],
  ["/associado", { title: "Área do Associado", subtitle: "Mensalidades, situação associativa, comunicados e acervo." }],
  ["/atletas/", { title: "Perfil do atleta", subtitle: "Dados, avaliação, participações, financeiro e acervo do atleta.", actionLabel: "Voltar à lista", actionPath: "/atletas" }],
  ["/pessoas", { title: "Pessoas", subtitle: "Gerencie associados, atletas, diretoria, comissao tecnica e convites.", actionLabel: "Novo associado", actionPath: "/associados?edit=new" }],
  ["/associados", { title: "Associados", subtitle: "Cadastre associados, mensalidades e vínculo com atletas.", actionLabel: "Novo associado", actionPath: "/associados?edit=new" }],
  ["/convites", { title: "Convites", subtitle: "Controle link, indicações e solicitações de entrada.", actionLabel: "Atualizar", actionPath: "/convites" }],
  ["/auditoria", { title: "Auditoria", subtitle: "Acompanhe logs de acesso, alterações e ações sensíveis do clube.", actionLabel: "Atualizar", actionPath: "/auditoria" }],
  ["/diretoria/mandatos/novo", { title: "Novo mandato", subtitle: "Cadastre um registro histórico da diretoria.", actionLabel: "Voltar", actionPath: "/diretoria" }],
  ["/diretoria/mandatos/", { title: "Editar mandato", subtitle: "Atualize o registro histórico da diretoria.", actionLabel: "Voltar", actionPath: "/diretoria" }],
  ["/diretoria", { title: "Diretoria", subtitle: "Registro atual, funções e histórico institucional.", actionLabel: "Novo mandato", actionPath: "/diretoria/mandatos/novo" }],
  ["/comissao-tecnica", { title: "Comissão Técnica", subtitle: "Organize treinadores e auxiliares por equipe, categoria e clube.", actionLabel: "Gerenciar equipes", actionPath: "/clubes?view=equipes" }],
  ["/atletas", { title: "Atletas", subtitle: "Gerencie elenco, presença, perfil e sorteio dos jogadores.", actionLabel: "Novo atleta", actionPath: "/atletas?edit=new" }],
  ["/goleiros", { title: "Goleiros", subtitle: "Controle contratos, custos e goleiros disponíveis por jogo.", actionLabel: "Novo contrato", actionPath: "/goleiros?edit=new" }],
  ["/clubes", { title: "Clubes e equipes", subtitle: "Cadastre clubes, escudos, adversários e equipes por categoria.", actionLabel: "Novo clube", actionPath: "/clubes?edit=new" }],
  ["/equipes", { title: "Clubes e equipes", subtitle: "Cadastre clubes, escudos, adversários e equipes por categoria.", actionLabel: "Novo clube", actionPath: "/clubes?edit=new" }],
  ["/campos", { title: "Campos", subtitle: "Cadastre locais de jogo, estrutura, custos e disponibilidade.", actionLabel: "Novo campo", actionPath: "/campos?edit=new" }],
  ["/adversarios", { title: "Adversarios", subtitle: "Organize clubes adversarios, escudos e historico de confrontos.", actionLabel: "Novo adversario", actionPath: "/adversarios?edit=new" }],
  ["/agenda", { title: "Agenda", subtitle: "Acompanhe eventos, calendario, inscricoes e compromissos do clube.", actionLabel: "Novo evento", actionPath: "/eventos/novo" }],
  ["/treinos", { title: "Treinos", subtitle: "Planeje sessões, confirme presença e acompanhe rotina técnica.", actionLabel: "Novo treino", actionPath: "/treinos" }],
  ["/financeiro", { title: "Financeiro do clube", subtitle: "Controle caixa, cobranças, despesas e lançamentos do clube." }],
  ["/historico", { title: "Acervo do Clube", subtitle: "Consulte temporadas, presidentes, diretorias, camisas e registros antigos.", actionLabel: "Abrir memorial", actionPath: "/memorial" }],
  ["/dashboard/campo-times", { title: "Campo e Times", subtitle: "Monte a escalação visual do jogo e organize reservas." }],
  ["/jogos/campo-times", { title: "Campo e Times", subtitle: "Monte a escalação visual do jogo e organize reservas." }],
  ["/futebol", { title: "Futebol", subtitle: "Acompanhe jogos, competições, equipes, campos, escalação e súmula.", actionLabel: "Novo jogo", actionPath: "/jogos?view=OPERACAO&subView=CADASTRO" }],
  ["/jogos", { title: "Jogos", subtitle: "Gerencie partidas, amistosos e campeonatos do seu time.", actionLabel: "Novo jogo", actionPath: "/jogos?view=OPERACAO&subView=CADASTRO" }],
  ["/minha-conta", { title: "Painel do atleta", subtitle: "Jogos, confirmações, pagamentos, desempenho e saúde em um só lugar.", actionLabel: "Ver financeiro", actionPath: "/atleta/financeiro" }],
  ["/estatisticas", { title: "Estatísticas", subtitle: "Acompanhe rankings, artilharia, assistências, participação e disciplina do clube.", actionLabel: "Ver rankings", actionPath: "/rankings" }],
  ["/artilharia", { title: "Artilharia", subtitle: "Registre gols, assistências e acompanhe rankings por período.", actionLabel: "Lançar artilharia", actionPath: "/artilharia?launch=1" }],
  ["/assistencias", { title: "Assistencias", subtitle: "Acompanhe passes decisivos por atleta, jogo e periodo.", actionLabel: "Ver estatisticas", actionPath: "/estatisticas" }],
  ["/participacoes", { title: "Participacoes", subtitle: "Analise presencas, jogos disputados e recorrencia dos atletas.", actionLabel: "Ver rankings", actionPath: "/rankings" }],
  ["/disciplina", { title: "Disciplina", subtitle: "Registre cartões amarelos e vermelhos por jogo.", actionLabel: "Lançar disciplina", actionPath: "/disciplina?launch=1" }],
  ["/confrontos", { title: "Confrontos", subtitle: "Consulte jogos internos, participantes, escalações e desempenho por ano ou mês.", actionLabel: "Ver jogos", actionPath: "/jogos" }],
  ["/convocacoes", { title: "Convocações", subtitle: "Etapa de convocação vinculada aos jogos do clube.", actionLabel: "Ver jogos", actionPath: "/jogos" }],
  ["/ligas-internas", { title: "Ligas Internas", subtitle: "Organize campeonatos internos, equipes, formatos e classificação.", actionLabel: "Nova liga", actionPath: "/ligas-internas" }],
  ["/competicoes", { title: "Competições", subtitle: "Gerencie campeonatos, torneios, participantes e classificação.", actionLabel: "Nova competição", actionPath: "/competicoes?edit=new" }],
  ["/eventos/novo", { title: "Novo evento", subtitle: "Cadastre um evento social, esportivo ou comunitário sem misturar com jogos.", actionLabel: "Voltar", actionPath: "/eventos" }],
  ["/eventos/inscricoes/nova", { title: "Nova inscricao", subtitle: "Cadastre uma participacao em evento do clube.", actionLabel: "Voltar", actionPath: "/eventos/inscricoes" }],
  ["/eventos/inscricoes/", { title: "Editar inscricao", subtitle: "Atualize confirmacao, check-in e dados da inscricao.", actionLabel: "Voltar", actionPath: "/eventos/inscricoes" }],
  ["/eventos/inscricoes", { title: "Inscrições", subtitle: "Controle inscritos, confirmações, check-in e valores por evento.", actionLabel: "Gerenciar eventos", actionPath: "/eventos" }],
  ["/eventos/", { title: "Editar evento", subtitle: "Atualize dados, inscrição, previsão financeira e acervo do evento.", actionLabel: "Voltar", actionPath: "/eventos" }],
  ["/eventos", { title: "Eventos", subtitle: "Organize eventos do clube com agenda, inscrições e acervo próprio.", actionLabel: "Novo evento", actionPath: "/eventos/novo" }],
  ["/galeria/novo", { title: "Novo item da galeria", subtitle: "Cadastre fotos, albuns, videos e registros visuais do acervo.", actionLabel: "Voltar", actionPath: "/galeria" }],
  ["/galeria/", { title: "Registro da galeria", subtitle: "Consulte detalhes, imagens e edite este item do acervo.", actionLabel: "Voltar", actionPath: "/galeria" }],
  ["/galeria", { title: "Galeria", subtitle: "Organize fotos, memorias e registros visuais do clube.", actionLabel: "Novo item", actionPath: "/galeria/novo" }],
  ["/relatorios", { title: "Relatórios", subtitle: "Analise resultados, histórico, artilharia e indicadores do clube.", actionLabel: "Gerar relatório", actionPath: "/relatorios" }],
  ["/configuracoes/visao-geral", { title: "Visao geral das configuracoes", subtitle: "Revise identidade, acessos, modulos e parametros do clube.", actionLabel: "Permissoes", actionPath: "/configuracoes?aba=profiles" }],
  ["/configuracoes", { title: "Configurações", subtitle: "Ajuste clube, categorias, uniformes, Pix, ferramentas, permissões e auditoria.", actionLabel: "Permissões", actionPath: "/configuracoes?aba=profiles" }],
  ["/uniformes", { title: "Uniformes", subtitle: "Configure time selecionado, temporada, cores, modelos e identidade visual." }],
  ["/create-game", { title: "Cadastrar jogo", subtitle: "Informe data, local, valores e detalhes do compromisso.", actionLabel: "Lançar jogo", actionPath: "/jogos?view=OPERACAO&subView=CADASTRO" }],
  ["/", { title: "Dashboard", subtitle: "Acompanhe operação, finanças, agenda e avisos do clube.", actionLabel: "Novo lançamento", actionPath: "/financeiro?view=OPERACAO&tab=NOVO" }]
];

function getPageChrome(pathname: string, fallbackTitle: string): PageChrome {
  const match = pageChromeByPath.find(([path]) => pathname === path || (path !== "/" && pathname.startsWith(path)));
  return match?.[1] ?? { title: fallbackTitle, subtitle: "Acompanhe as informações deste ambiente." };
}

function getInitialCollapsed() {
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}

function readMenuStyle(): MenuStyle {
  const stored = localStorage.getItem(UI_MENU_STYLE_KEY);
  return stored === "light" || stored === "glass" ? stored : "brand";
}

function readEffectsLevel(): EffectsLevel {
  const value = localStorage.getItem(UI_EFFECTS_KEY);
  return value === "full" || value === "minimal" ? value : "soft";
}

function getRoleHomePath(role: UserRole) {
  if (role === "SUPERADMIN") {
    return "/superadmin";
  }

  if (role === "ATHLETE") {
    return "/atleta";
  }

  if (role === "SPORTS_DIRECTOR") {
    return "/esportes";
  }

  if (role === "ASSOCIATE") {
    return "/associado";
  }

  if (role === "FINANCIAL") {
    return "/financeiro";
  }

  return "/";
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function TenantBlockedView({ user, billing }: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; billing: TenantBillingStatus }) {
  const statusLabel = user.tenantStatus === "CANCELED" ? "Ambiente cancelado" : "Ambiente suspenso";
  const reason = user.tenantSuspendedReason || billing.suspendedReason || "Regularize as pendências comerciais para reativar o acesso.";

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4 py-8">
      <section className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-red-700">{statusLabel}</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">{user.tenantName ?? billing.name ?? "Clube"}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">{reason}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
            <p className="text-xs font-black uppercase text-slate-500">Em aberto</p>
            <p className="mt-1 text-xl font-black text-red-700">{formatCurrency(billing.openAmountCents ?? 0)}</p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[minmax(10rem,1fr)_8rem_8rem] gap-3 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">
            <span>Cobrança</span>
            <span>Vencimento</span>
            <span>Valor</span>
          </div>
          {(billing.charges ?? []).map((charge) => (
            <div key={charge.id} className="grid grid-cols-[minmax(10rem,1fr)_8rem_8rem] gap-3 border-t border-slate-100 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-black text-slate-950">{charge.description}</span>
                <span className="block text-xs font-semibold text-slate-500">{charge.status}</span>
              </span>
              <span className="text-slate-600">{new Date(charge.dueDate).toLocaleDateString("pt-BR")}</span>
              <span className="font-black text-slate-950">{formatCurrency(charge.amountCents)}</span>
            </div>
          ))}
          {billing && billing.charges.length === 0 ? (
            <p className="border-t border-slate-100 px-3 py-4 text-sm font-semibold text-slate-500">Nenhuma cobrança aberta encontrada. Entre em contato com o suporte GestaSports.</p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <a className="rounded-lg bg-[#08255b] px-4 py-2 text-sm font-black text-white" href="mailto:suporte@gestasports.com.br?subject=Regulariza%C3%A7%C3%A3o%20GestaSports">
            Falar com suporte
          </a>
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700" onClick={() => window.location.reload()}>
            Verificar novamente
          </button>
        </div>
      </section>
    </div>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [menuStyle, setMenuStyle] = useState<MenuStyle>(readMenuStyle);
  const [effectsLevel, setEffectsLevel] = useState<EffectsLevel>(readEffectsLevel);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, activeRole, setActiveRole, logout, isAuthenticated, loading } = useAuth();
  const { month, year } = usePeriod();
  const effectiveRoles = useMemo(() => (activeRole ? [activeRole] : user?.roles ?? []), [activeRole, user?.roles]);
  const effectiveModules = useMemo(() => user?.enabledModules ?? [], [user?.enabledModules]);
  const effectiveRole = activeRole ?? user?.role ?? null;
  const visibleItems = useMemo(
    () => getNavigationItemsByRoles(effectiveRoles, effectiveModules),
    [effectiveModules, effectiveRoles]
  );
  const tenantBlocked = Boolean(user?.tenantId && user.tenantStatus && ["SUSPENDED", "CANCELED"].includes(user.tenantStatus) && activeRole !== "SUPERADMIN");
  const tenantBillingQuery = useQuery({
    queryKey: ["tenant-billing-status", user?.tenantId],
    queryFn: () => apiRequest<TenantBillingStatus>("/tenant/billing-status"),
    enabled: tenantBlocked
  });
  const tenantCurrentQuery = useQuery({
    queryKey: ["tenant-current-brand", user?.tenantId, activeRole],
    queryFn: () => apiRequest<CurrentTenant>("/tenant/current", { skipAuth: true }),
    enabled: Boolean(isAuthenticated && user?.tenantId && activeRole !== "SUPERADMIN"),
    retry: false
  });
  const tenantBrandingQuery = useQuery({
    queryKey: ["tenant-branding", user?.tenantId],
    queryFn: () => apiRequest<TenantBrandingSettings>("/tenant/branding"),
    enabled: Boolean(isAuthenticated && user?.tenantId && effectiveRole === "ADMIN"),
    retry: false
  });

  const currentNav = useMemo(
    () => visibleItems.find((item) => item.path === location.pathname || (item.path !== "/" && location.pathname.startsWith(item.path))),
    [location.pathname, visibleItems]
  );
  const blockedModule = useMemo(() => {
    if (!isAuthenticated || effectiveRole === "SUPERADMIN") return undefined;
    const module = moduleForPath(location.pathname);
    if (!module) return undefined;
    return effectiveModules.includes(module) ? undefined : module;
  }, [effectiveModules, effectiveRole, isAuthenticated, location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!blockedModule) return;
    navigate(effectiveRole ? getRoleHomePath(effectiveRole) : "/", { replace: true });
  }, [blockedModule, effectiveRole, navigate]);

  useEffect(() => {
    const onPreferencesChange = () => {
      setMenuStyle(readMenuStyle());
      setEffectsLevel(readEffectsLevel());
    };

    window.addEventListener("gestasports-appearance-preferences", onPreferencesChange);
    window.addEventListener("storage", onPreferencesChange);

    return () => {
      window.removeEventListener("gestasports-appearance-preferences", onPreferencesChange);
      window.removeEventListener("storage", onPreferencesChange);
    };
  }, []);

  useEffect(() => {
    const brand = tenantBrandingQuery.data ?? tenantCurrentQuery.data;
    if (!brand) {
      return;
    }

    if (brand.menuStyle) {
      const ms = brand.menuStyle === "light" || brand.menuStyle === "glass" ? brand.menuStyle : "brand";
      setMenuStyle(ms);
      localStorage.setItem(UI_MENU_STYLE_KEY, ms);
    }

    if (brand.interfaceEffects) {
      setEffectsLevel(brand.interfaceEffects);
      localStorage.setItem(UI_EFFECTS_KEY, brand.interfaceEffects);
    }
  }, [tenantBrandingQuery.data, tenantCurrentQuery.data]);

  useEffect(() => {
    const brand = tenantBrandingQuery.data ?? tenantCurrentQuery.data;
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", brand?.primaryColor ?? "#08255b");
    root.style.setProperty("--brand-menu", brand?.secondaryColor ?? "#08255b");
    root.style.setProperty("--brand-accent", brand?.accentColor ?? "#55ad32");
    document.body.dataset.menuStyle = menuStyle;
    document.body.dataset.effects = effectsLevel;
  }, [effectsLevel, menuStyle, tenantBrandingQuery.data, tenantCurrentQuery.data]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-slate-500">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === "/" && effectiveRole) {
    const roleHomePath = getRoleHomePath(effectiveRole);
    if (roleHomePath !== "/") {
      return <Navigate to={roleHomePath} replace />;
    }
  }

  if (tenantBlocked && user && tenantBillingQuery.data) {
    return <TenantBlockedView user={user} billing={tenantBillingQuery.data} />;
  }

  function toggleCollapsed() {
    setCollapsed((state) => {
      const next = !state;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  function handleActiveRoleChange(role: UserRole) {
    setActiveRole(role);
    navigate(getRoleHomePath(role), { replace: true });
  }

  const fallbackTitle = currentNav?.label === "Painel" ? "Dashboard" : currentNav?.label ?? "Painel do clube";
  const pageChrome = getPageChrome(location.pathname, fallbackTitle);

  return (
    <div className="fl-shell min-h-screen p-0">
      <div className="grid min-h-screen lg:grid-cols-[auto_minmax(0,1fr)]">
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        <main className="min-w-0 flex flex-col px-0 py-0 lg:px-0 xl:px-0">
          <Topbar
            title={pageChrome.title}
            subtitle={pageChrome.subtitle}
            onNotificationsClick={() => navigate("/?focus=avisos")}
            onMenuClick={() => setMobileOpen(true)}
            user={user}
            activeRole={activeRole}
            onActiveRoleChange={handleActiveRoleChange}
            onLogout={logout}
            actionLabel={pageChrome.actionLabel}
            actionPath={pageChrome.actionPath}
          />

          <div className="fl-shell-content min-w-0 flex-1 px-3 pb-5 pt-3 sm:px-5 sm:pt-4 lg:px-6 lg:pb-8 lg:pt-5 xl:px-8">
            <div className="fl-page-content mx-auto w-full max-w-[1600px] min-w-0">
              <Outlet context={{ month, year }} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export const AppShell = AppLayout;
