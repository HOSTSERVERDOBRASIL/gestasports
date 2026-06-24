import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coins,
  ExternalLink,
  Filter,
  Flag,
  Info,
  LayoutGrid,
  MapPin,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Swords,
  TrendingUp,
  Trophy,
  UserCircle2,
  Users,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../services/api";
import type { AthleteProfile, Competition, Field, Game } from "../types/domain";

type OutletPeriod = {
  month: number;
  year: number;
};

type HubMetric = {
  label: string;
  value: string;
  hint: string;
  path?: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "amber" | "violet" | "slate";
};

type HubRow = {
  title: string;
  description: string;
  path: string;
  status: string;
  filters?: string[];
};

type HubInsight = {
  label: string;
  value: string;
  description: string;
  tone?: HubMetric["tone"];
};

type HubConfig = {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  metrics: HubMetric[];
  insights?: HubInsight[];
  filters: string[];
  rows: HubRow[];
  primaryAction: {
    label: string;
    path: string;
  };
};

function row(title: string, description: string, path: string, filters: string[] = [], status = "Operacional"): HubRow {
  return { title, description, path, status, filters };
}

const hubConfigs: Record<string, HubConfig> = {
  pessoas: {
    eyebrow: "ERP de associação esportiva",
    title: "Pessoas",
    description: "Gestão de associados, atletas, diretoria e comissão técnica com histórico, vínculo financeiro, participação e acervo.",
    icon: <Users size={24} />,
    primaryAction: { label: "Novo associado", path: "/associados?edit=new" },
    metrics: [
      { label: "Cadastros", value: "4 áreas", hint: "Associados, atletas, diretoria e comissão", icon: <LayoutGrid size={24} />, tone: "blue" },
      { label: "Dashboard interno", value: "Ativo", hint: "Perfil individual e histórico", icon: <TrendingUp size={24} />, tone: "green" },
      { label: "Rastreabilidade", value: "Auditoria", hint: "Movimentações preservadas", icon: <MapPin size={24} />, tone: "amber" },
      { label: "Segurança", value: "Confiável", hint: "Dados protegidos e seguros", icon: <ShieldCheck size={24} />, tone: "violet" }
    ],
    insights: [
      { label: "Base cadastral", value: "Associados + atletas", description: "Separe membro pagante, atleta ativo, convidado e diretoria.", tone: "blue" },
      { label: "Gestão atual", value: "Diretoria e comissão", description: "Mantenha cargos e equipe técnica vinculados a pessoas reais.", tone: "green" },
      { label: "Ponto de atenção", value: "Convites", description: "Solicitações pendentes precisam virar associado, atleta ou recusa.", tone: "amber" }
    ],
    filters: ["Situação", "Categoria", "Função", "Vínculo"],
    rows: [
      row("Associados", "Membros da associação, mensalidades, contato e participação.", "/associados", ["Situação", "Vínculo"]),
      row("Atletas", "Elenco, posições, situação médica, estatísticas e perfil.", "/atletas", ["Situação", "Categoria", "Vínculo"]),
      row("Diretoria", "Mandatos, cargos, conquistas e histórico institucional.", "/diretoria", ["Função", "Vínculo"]),
      row("Comissão Técnica", "Funções, equipes, jogos e histórico técnico.", "/comissao-tecnica", ["Função", "Categoria"])
    ]
  },
  agenda: {
    eyebrow: "Programação central",
    title: "Agenda",
    description: "Centraliza jogos, eventos, treinos, reuniões, campos, equipes e adversários em uma rotina cronológica.",
    icon: <CalendarDays size={24} />,
    primaryAction: { label: "Novo evento", path: "/eventos/novo" },
    metrics: [
      { label: "Calendário", value: "Dia/mês", hint: "Visualizações por período", icon: <CalendarDays size={24} />, tone: "blue" },
      { label: "Jogos", value: "Súmula", hint: "Convocação, escalação e eventos", icon: <Trophy size={24} />, tone: "green" },
      { label: "Estrutura", value: "Campos", hint: "Locais, equipes e adversários", icon: <Flag size={24} />, tone: "amber" }
    ],
    insights: [
      { label: "Hoje", value: "Calendário", description: "Eventos e jogos do período ficam concentrados antes da operação.", tone: "blue" },
      { label: "Inscrições", value: "Controle de presença", description: "Use check-in e status para medir adesão aos eventos.", tone: "green" },
      { label: "Estrutura", value: "Campos e equipes", description: "Evite criar jogo sem local, categoria ou adversário definidos.", tone: "amber" }
    ],
    filters: ["Tipo", "Categoria", "Temporada", "Status"],
    rows: [
      row("Calendário", "Eventos sociais, esportivos e reuniões por período.", "/eventos?view=calendario", ["Tipo", "Temporada", "Status"]),
      row("Lista", "Programação cronológica com filtros e ações.", "/eventos?view=lista", ["Tipo", "Temporada", "Status"]),
      row("Jogos", "Cadastro, convocação, escalação, uniforme, súmula e acervo.", "/jogos", ["Tipo", "Categoria", "Temporada", "Status"]),
      row("Campos", "Locais, endereço, capacidade, custo e agenda.", "/campos", ["Categoria"]),
      row("Equipes", "Categorias, temporada, técnico e elenco.", "/clubes?view=equipes", ["Categoria", "Temporada"]),
      row("Adversários", "Clubes externos, contatos e confrontos.", "/adversarios", ["Categoria"])
    ]
  },
  futebol: {
    eyebrow: "Operação esportiva",
    title: "Futebol",
    description: "Painel para acompanhar jogos, competições, campos, equipes, adversários, convocações, escalação e súmula.",
    icon: <Trophy size={24} />,
    primaryAction: { label: "Novo jogo", path: "/jogos?view=OPERACAO&subView=CADASTRO" },
    metrics: [
      { label: "Jogos", value: "Operação", hint: "Cadastro, agenda e histórico", path: "/jogos?view=OPERACAO&subView=LISTA", icon: <Trophy size={24} />, tone: "blue" },
      { label: "Equipe", value: "Escalação", hint: "Convocação e campo", path: "/jogos?view=OPERACAO&subView=ESCALACAO", icon: <Users size={24} />, tone: "green" },
      { label: "Competição", value: "Tabelas", hint: "Torneios e classificação", path: "/competicoes", icon: <BarChart3 size={24} />, tone: "amber" },
      { label: "Estrutura", value: "Campos", hint: "Locais e adversários", path: "/campos", icon: <MapPin size={24} />, tone: "violet" }
    ],
    insights: [
      { label: "Fluxo do jogo", value: "Cadastro -> súmula", description: "Comece pelo jogo e avance para convocação, escalação e eventos.", tone: "blue" },
      { label: "Pré-jogo", value: "Confirmações", description: "Acompanhe presença antes de fechar escalação e campo.", tone: "green" },
      { label: "Pós-jogo", value: "Estatísticas", description: "Súmula preenchida alimenta rankings e acervo automaticamente.", tone: "amber" }
    ],
    filters: ["Competição", "Categoria", "Temporada", "Status"],
    rows: [
      row("Lista de jogos", "Partidas cadastradas com data, local, tipo, status e ações.", "/jogos?view=OPERACAO&subView=LISTA", ["Competição", "Categoria", "Temporada", "Status"]),
      row("Cadastrar jogo", "Criação de jogo interno, externo ou competição.", "/jogos?view=OPERACAO&subView=CADASTRO", ["Competição", "Categoria", "Temporada"]),
      row("Agenda de jogos", "Calendário esportivo do clube por período.", "/jogos?view=OPERACAO&subView=AGENDA", ["Temporada", "Status"]),
      row("Confirmações", "Presença, ausência e resposta dos atletas convocados.", "/jogos?view=OPERACAO&subView=CONFIRMACOES", ["Status", "Categoria"]),
      row("Escalação", "Campo, titulares, reservas e organização visual.", "/jogos?view=OPERACAO&subView=ESCALACAO", ["Categoria", "Status"]),
      row("Súmula", "Gols, cartões, assistências e fechamento da partida.", "/jogos?view=OPERACAO&subView=EVENTOS", ["Competição", "Status"]),
      row("Campos", "Locais, capacidade, custos e disponibilidade.", "/campos", ["Categoria"]),
      row("Competições", "Torneios, participantes, fases e classificação.", "/competicoes", ["Competição", "Temporada"])
    ]
  },
  estatisticas: {
    eyebrow: "Indicadores automáticos",
    title: "Estatísticas",
    description: "Rankings calculados a partir de jogos, súmulas e participações, mantendo o fluxo Jogos -> Estatísticas -> Acervo.",
    icon: <BarChart3 size={24} />,
    primaryAction: { label: "Lançar artilharia", path: "/artilharia?launch=1" },
    metrics: [
      { label: "Gols", value: "Artilharia", hint: "Total, artilheiro e média", icon: <Trophy size={24} />, tone: "blue" },
      { label: "Performance", value: "Rankings", hint: "Assistências, vitórias e presença", icon: <TrendingUp size={24} />, tone: "green" },
      { label: "Disciplina", value: "Cartões", hint: "Advertências e suspensões", icon: <Shield size={24} />, tone: "amber" }
    ],
    insights: [
      { label: "Origem dos dados", value: "Jogos e súmulas", description: "Evite lançar indicador solto quando ele pertence a uma partida.", tone: "blue" },
      { label: "Ranking", value: "Atletas", description: "Gols, assistências e presenças precisam fechar por período.", tone: "green" },
      { label: "Disciplina", value: "Cartões", description: "Suspensões e advertências devem acompanhar o histórico do atleta.", tone: "amber" }
    ],
    filters: ["Mês", "Ano", "Atleta", "Equipe"],
    rows: [
      row("Artilharia", "Gols, jogos, assistências e média por período.", "/artilharia", ["Mês", "Ano", "Atleta", "Equipe"]),
      row("Assistências", "Ranking de assistências e participações em gol.", "/assistencias", ["Mês", "Ano", "Atleta", "Equipe"]),
      row("Participações", "Jogos, presença, vitórias e aproveitamento.", "/participacoes", ["Mês", "Ano", "Atleta", "Equipe"]),
      row("Disciplina", "Cartões, suspensões e fair play.", "/disciplina", ["Mês", "Ano", "Atleta", "Equipe"]),
      row("Confrontos", "Vitórias, empates, derrotas, gols e saldo.", "/confrontos", ["Ano", "Equipe"]),
      row("Goleiros", "Contratos, disponibilidade e custos vinculados aos jogos.", "/goleiros", ["Mês", "Ano", "Atleta"]),
      row("Rankings Gerais", "Visão consolidada de atletas e temporadas.", "/rankings", ["Ano", "Atleta", "Equipe"])
    ]
  },
  memorial: {
    eyebrow: "Patrimônio digital",
    title: "Acervo do Clube",
    description: "Acervo futebolístico da associação, preservando jogos, atletas, títulos, presidentes, diretorias, uniformes, galeria e súmulas.",
    icon: <Trophy size={24} />,
    primaryAction: { label: "Abrir acervo", path: "/memorial" },
    metrics: [
      { label: "Acervo", value: "Histórico", hint: "Temporadas e documentos", icon: <ClipboardList size={24} />, tone: "blue" },
      { label: "Memória", value: "Linha do tempo", hint: "Eventos relevantes", icon: <CalendarDays size={24} />, tone: "green" },
      { label: "Mídia", value: "Galeria", hint: "Fotos e registros visuais", icon: <Camera size={24} />, tone: "amber" }
    ],
    insights: [
      { label: "Lançamento antigo", value: "Fora do fluxo", description: "Jogos, súmulas e camisas antigas podem ser cadastrados diretamente.", tone: "blue" },
      { label: "Vínculos", value: "História conectada", description: "Relacione título, jogo, atleta, documento e galeria quando possível.", tone: "green" },
      { label: "Preservação", value: "Documento + imagem", description: "Prefira registros com arquivo, foto ou descrição completa.", tone: "amber" }
    ],
    filters: ["Ano", "Tipo", "Temporada", "Relacionamento"],
    rows: [
      row("Painel do acervo", "Linha do tempo, temporadas, jogos, rankings, presidentes e camisas antigas.", "/memorial", ["Ano", "Tipo", "Temporada", "Relacionamento"]),
      row("Linha do Tempo", "Fundação, títulos, jogos marcantes e eventos.", "/memorial/linha-do-tempo", ["Ano", "Tipo"]),
      row("Uniformes", "Temporadas, modelos, fotos e uso em jogos.", "/uniformes", ["Ano", "Temporada", "Relacionamento"]),
      row("Galeria", "Álbuns, fotos e relacionamentos com jogos/eventos.", "/galeria", ["Tipo", "Relacionamento"]),
      row("Títulos", "Competições, campanhas, elenco e fotos.", "/memorial/titulos", ["Ano", "Tipo", "Temporada"]),
      row("Presidentes e diretorias", "Mandatos, fotos, conquistas e documentos.", "/memorial/diretorias", ["Ano", "Relacionamento"]),
      row("Camisas históricas", "Uniforme 1 e uniforme 2 por ano/temporada.", "/memorial/uniformes", ["Ano", "Temporada"]),
      row("Súmulas históricas", "Súmulas, documentos e registros.", "/memorial/sumulas", ["Ano", "Tipo", "Relacionamento"])
    ]
  },
  configuracoes: {
    eyebrow: "Administração do ambiente",
    title: "Configurações",
    description: "Dados do clube, categorias, uniformes, Pix, ferramentas, permissões e auditoria.",
    icon: <Settings size={24} />,
    primaryAction: { label: "Permissões", path: "/configuracoes?aba=profiles" },
    metrics: [
      { label: "Clube", value: "Identidade", hint: "Logo, cores e contatos", icon: <Flag size={24} />, tone: "blue" },
      { label: "Acesso", value: "Perfis", hint: "Papéis e permissões", icon: <ShieldCheck size={24} />, tone: "green" },
      { label: "Controle", value: "Auditoria", hint: "Ações e registros", icon: <ClipboardList size={24} />, tone: "amber" }
    ],
    insights: [
      { label: "Identidade", value: "Clube", description: "Logo, cores, nome exibido e contatos devem vir antes dos cadastros.", tone: "blue" },
      { label: "Operação", value: "Categorias", description: "Categorias e uniformes sustentam jogos, atletas e acervo.", tone: "green" },
      { label: "Governança", value: "Permissões", description: "Revise acesso administrativo, financeiro e atleta com frequência.", tone: "amber" }
    ],
    filters: ["Aba", "Perfil", "Integração", "Status"],
    rows: [
      row("Clube", "Nome oficial, nome exibido, escudo, cores e identidade institucional.", "/configuracoes?aba=club", ["Aba", "Status"]),
      row("Categorias", "Categorias, equipes e modalidades.", "/clubes?view=categorias", ["Aba", "Status"]),
      row("Uniformes", "Time selecionado, ano/temporada, cores, modelo e imagem da camisa.", "/configuracoes?aba=uniforms", ["Aba", "Status"]),
      row("Pix", "Chave Pix, recebedor, cidade, vencimento e baixa automática de teste.", "/configuracoes?aba=pix", ["Aba", "Integração", "Status"]),
      row("Ferramentas", "Provedores de pagamento, credenciais, ambiente e webhooks.", "/configuracoes?aba=integrations", ["Aba", "Integração", "Status"]),
      row("Convites", "Modo fechado, código de convite e solicitações de entrada.", "/configuracoes?aba=invite", ["Aba", "Status"]),
      row("Diretoria e funções", "Cargos, perfis de diretoria e privilégios vinculados.", "/configuracoes?aba=board", ["Aba", "Perfil"]),
      row("Permissões", "Evolução dos acessos por usuário, administrador, financeiro e atleta.", "/configuracoes?aba=profiles", ["Aba", "Perfil", "Status"]),
      row("Auditoria", "Usuário, ação, data, hora, IP e registro alterado.", "/configuracoes?aba=audit", ["Aba", "Perfil", "Status"])
    ]
  }
};

function iconForTitle(title: string) {
  if (title.includes("Associados")) return <Users size={16} />;
  if (title.includes("Atletas") || title.includes("Goleiros")) return <UserCircle2 size={16} />;
  if (title.includes("Financeiro") || title.includes("Pix")) return <WalletCards size={16} />;
  if (title.includes("Disciplina") || title.includes("Permissões") || title.includes("Diretoria")) return <Shield size={16} />;
  if (title.includes("Campos") || title.includes("Equipe") || title.includes("Clube")) return <Flag size={16} />;
  if (title.includes("Confrontos") || title.includes("Adversários")) return <Swords size={16} />;
  if (title.includes("Galeria")) return <Camera size={16} />;
  if (title.includes("PIX") || title.includes("Receitas") || title.includes("Despesas")) return <Coins size={16} />;
  return <ClipboardList size={16} />;
}

function metricToneClasses(tone: HubMetric["tone"] = "slate") {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    slate: "bg-slate-50 text-slate-700 ring-slate-100"
  };
  return tones[tone];
}

function insightToneClasses(tone: HubMetric["tone"] = "slate") {
  const tones = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-800",
    green: "border-emerald-100 bg-emerald-50/70 text-emerald-800",
    amber: "border-amber-100 bg-amber-50/70 text-amber-800",
    violet: "border-violet-100 bg-violet-50/70 text-violet-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  };
  return tones[tone];
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function shortChartLabel(name: string, maxLength = 12) {
  const trimmed = name.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}.` : trimmed;
}

function formatGameTitle(game: Game) {
  const home = game.homeClub?.shortName || game.homeClub?.name || game.redTeamName || "Time A";
  const away = game.awayClub?.shortName || game.awayClub?.name || game.whiteTeamName || "Time B";
  return `${home} x ${away}`;
}

const gameStatusLabels: Record<Game["status"], string> = {
  SCHEDULED: "Agendado",
  RUNNING: "Em andamento",
  PAUSED: "Pausado",
  FINISHED: "Finalizado",
  CANCELED: "Cancelado"
};

function FootballHubPage({
  config,
  games,
  athletes,
  fields,
  competitions,
  isLoading,
  nextGame,
  visibleRows
}: {
  config: HubConfig;
  games: Game[];
  athletes: AthleteProfile[];
  fields: Field[];
  competitions: Competition[];
  isLoading: boolean;
  nextGame: Game | undefined;
  visibleRows: HubRow[];
}) {
  const scheduledGames = games.filter((game) => game.status === "SCHEDULED");
  const finishedGames = games.filter((game) => game.status === "FINISHED");
  const gamesWithoutField = games.filter((game) => !game.fieldId && game.status !== "CANCELED");
  const gamesWithoutLineup = games.filter((game) => (game._count?.lineups ?? game.lineups?.length ?? 0) === 0 && game.status !== "CANCELED");
  const athletesAbleToPlay = athletes.filter((athlete) => athlete.status === "ACTIVE" && athlete.canPlay);
  const activeFields = fields.filter((field) => field.status === "ACTIVE");
  const activeCompetitions = competitions.filter((competition) => competition.status === "ACTIVE");
  const upcomingGames = scheduledGames
    .filter((game) => new Date(game.date).getTime() >= Date.now())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
  const lastResults = finishedGames
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);
  const footballMetrics = [
    { label: "Jogos no periodo", value: games.length, helper: `${scheduledGames.length} agendado(s), ${finishedGames.length} finalizado(s)`, icon: <Trophy size={24} />, tone: "blue" as const, path: "/jogos?view=OPERACAO&subView=LISTA" },
    { label: "Proximo jogo", value: nextGame ? formatShortDate(nextGame.date) : "Sem agenda", helper: nextGame ? formatGameTitle(nextGame) : "Cadastre uma partida", icon: <CalendarDays size={24} />, tone: "green" as const, path: "/jogos?view=OPERACAO&subView=AGENDA" },
    { label: "Atletas aptos", value: athletesAbleToPlay.length, helper: `${athletes.length} atleta(s) no elenco`, icon: <Users size={24} />, tone: "violet" as const, path: "/atletas" },
    { label: "Campos ativos", value: activeFields.length, helper: `${fields.length} local(is) cadastrados`, icon: <MapPin size={24} />, tone: "amber" as const, path: "/campos" },
    { label: "Competicoes", value: activeCompetitions.length, helper: "em andamento", icon: <BarChart3 size={24} />, tone: "blue" as const, path: "/competicoes" }
  ];
  const footballAlerts = [
    { label: "Jogos sem campo", value: gamesWithoutField.length, description: "Defina local antes de confirmar a agenda.", path: "/jogos?view=OPERACAO&subView=AGENDA" },
    { label: "Jogos sem escalacao", value: gamesWithoutLineup.length, description: "Feche titulares e reservas antes do jogo.", path: "/jogos?view=OPERACAO&subView=ESCALACAO" },
    { label: "Atletas indisponiveis", value: athletes.filter((athlete) => athlete.status === "ACTIVE" && !athlete.canPlay).length, description: "Revise financeiro, suspensao ou condicao medica.", path: "/atletas" },
    { label: "Campos inativos", value: fields.filter((field) => field.status !== "ACTIVE").length, description: "Ajuste manutencao e disponibilidade.", path: "/campos" }
  ];
  const footballFlow = [
    { title: "1. Cadastro", description: "Crie o jogo com data, tipo, campo e competicao.", path: "/jogos?view=OPERACAO&subView=CADASTRO" },
    { title: "2. Confirmacoes", description: "Acompanhe resposta dos atletas e pendencias.", path: "/jogos?view=OPERACAO&subView=CONFIRMACOES" },
    { title: "3. Escalacao", description: "Monte campo, titulares, reservas e uniformes.", path: "/jogos?view=OPERACAO&subView=ESCALACAO" },
    { title: "4. Sumula", description: "Registre gols, assistencias, cartoes e fechamento.", path: "/jogos?view=OPERACAO&subView=EVENTOS" }
  ];
  const gameStatusChart = [
    { name: "Agendados", value: scheduledGames.length, color: "#2563eb" },
    { name: "Finalizados", value: finishedGames.length, color: "#16a34a" },
    { name: "Cancelados", value: games.filter((game) => game.status === "CANCELED").length, color: "#ef4444" },
    { name: "Em andamento", value: games.filter((game) => game.status === "RUNNING" || game.status === "PAUSED").length, color: "#f59e0b" }
  ].filter((item) => item.value > 0);
  const readinessChart = [
    { name: "Aptos", value: athletesAbleToPlay.length, color: "#16a34a" },
    { name: "Indisponiveis", value: Math.max(athletes.length - athletesAbleToPlay.length, 0), color: "#ef4444" }
  ].filter((item) => item.value > 0);
  const fieldStatusChart = [
    { name: "Ativos", value: activeFields.length, color: "#16a34a" },
    { name: "Manutencao", value: fields.filter((field) => field.status === "MAINTENANCE").length, color: "#f59e0b" },
    { name: "Inativos", value: fields.filter((field) => field.status === "INACTIVE").length, color: "#94a3b8" }
  ].filter((item) => item.value > 0);
  const upcomingChart = upcomingGames.map((game) => ({
    game: shortChartLabel(formatGameTitle(game), 14),
    confirmados: game.lineups?.filter((lineup) => lineup.presence).length ?? game._count?.lineups ?? 0,
    custo: Math.round((game.gameValueCents ?? 0) / 100)
  }));

  return (
    <section className="min-w-0 space-y-5">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              {config.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">Painel do futebol</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{config.title}</h2>
              <p className="mt-1 max-w-5xl text-sm font-semibold leading-6 text-slate-500">
                Dashboard operacional para decidir o que fazer primeiro: agenda, confirmacoes, escalacao, sumula, campos e competicoes.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-black text-white shadow-sm hover:bg-blue-800" to={config.primaryAction.path}>
              <Plus size={17} />
              Novo jogo
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50" to="/jogos?view=OPERACAO&subView=LISTA">
              <ClipboardList size={17} />
              Lista de jogos
            </Link>
          </div>
        </div>
      </article>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {footballMetrics.map((metric) => (
          <Link key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md" to={metric.path}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-[0.08em] text-slate-500">{metric.label}</p>
                <strong className="mt-2 block truncate text-2xl font-black text-slate-950">{isLoading ? "..." : metric.value}</strong>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{metric.helper}</p>
              </div>
              <span className={`grid size-11 shrink-0 place-items-center rounded-lg ring-1 ${metricToneClasses(metric.tone)}`}>{metric.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Proximos jogos em leitura visual</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Confirmados e custo previsto por partida.</p>
            </div>
            <Link className="text-sm font-black text-blue-700" to="/jogos?view=OPERACAO&subView=AGENDA">Abrir agenda</Link>
          </div>
          <div className="mt-4 h-72 min-w-0">
            {upcomingChart.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={upcomingChart} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="game" axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#52607a", fontSize: 12, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                  <Bar dataKey="confirmados" name="Confirmados" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="custo" name="Custo R$" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">Sem jogos futuros no periodo</div>
            )}
          </div>
        </article>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Status dos jogos</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center xl:grid-cols-1">
              <div className="h-40 min-w-0">
                {gameStatusChart.length ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0" }} />
                      <Pie data={gameStatusChart} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={3}>
                        {gameStatusChart.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">Sem jogos</div>
                )}
              </div>
              <div className="space-y-2">
                {gameStatusChart.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                    <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                    <span className="text-slate-950">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">Elenco e campos</h2>
            <div className="mt-4 grid gap-4">
              {[
                ...readinessChart.map((item) => ({ ...item, total: athletes.length || 1 })),
                ...fieldStatusChart.map((item) => ({ ...item, total: fields.length || 1 }))
              ].map((item) => (
                <div key={`${item.name}-${item.color}`}>
                  <div className="mb-1 flex items-center justify-between text-sm font-black text-slate-700">
                    <span>{item.name}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((item.value / item.total) * 100))}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Proximos jogos</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Agenda esportiva com o que precisa de acao.</p>
            </div>
            <Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 hover:bg-slate-50" to="/jogos?view=OPERACAO&subView=AGENDA">
              Ver agenda
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
            {upcomingGames.length > 0 ? upcomingGames.map((game) => (
              <div key={game.id} className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[6rem_minmax(0,1fr)_8rem_7rem] md:items-center">
                <span className="font-black text-blue-700">{formatShortDate(game.date)}</span>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{formatGameTitle(game)}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{game.location || game.field?.name || "Campo nao definido"}</p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{gameStatusLabels[game.status]}</span>
                <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-900 hover:bg-slate-50" to="/jogos?view=OPERACAO&subView=ESCALACAO">Operar</Link>
              </div>
            )) : (
              <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">Nenhum jogo futuro no periodo.</div>
            )}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Pendencias</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">O que impede a rotina de jogo de andar.</p>
          <div className="mt-4 grid gap-2">
            {footballAlerts.map((alert) => (
              <Link key={alert.label} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 hover:bg-white" to={alert.path}>
                <span className="grid size-10 place-items-center rounded-lg bg-white text-blue-700 ring-1 ring-blue-100">
                  <strong className="text-sm font-black">{isLoading ? "-" : alert.value}</strong>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-950">{alert.label}</span>
                  <span className="block truncate text-xs font-semibold text-slate-500">{alert.description}</span>
                </span>
                <ChevronRight size={15} className="text-slate-400" />
              </Link>
            ))}
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Fluxo operacional</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {footballFlow.map((item) => (
              <Link key={item.title} className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:bg-slate-50" to={item.path}>
                <p className="text-sm font-black text-blue-700">{item.title}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">{item.description}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Dashboards por item</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Cada item abre sua area com contexto e operacao propria.</p>
            </div>
            <span className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600">{visibleRows.length} itens</span>
          </div>
          <div className="mt-4 grid gap-2">
            {visibleRows.map((row) => (
              <Link key={row.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 hover:bg-white" to={row.path}>
                <span className="grid size-9 place-items-center rounded-lg bg-white text-blue-700 ring-1 ring-blue-100">{iconForTitle(row.title)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-950">{row.title}</span>
                  <span className="block truncate text-xs font-semibold text-slate-500">{row.description}</span>
                </span>
                <ChevronRight size={15} className="text-slate-400" />
              </Link>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Ultimos resultados</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Fechamentos recentes que alimentam estatisticas e acervo.</p>
          </div>
          <Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 hover:bg-slate-50" to="/estatisticas">
            Estatisticas
            <ExternalLink size={14} />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {lastResults.length > 0 ? lastResults.map((game) => (
            <Link key={`result-${game.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4 hover:bg-white" to="/jogos?view=OPERACAO&subView=EVENTOS">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{formatShortDate(game.date)}</p>
              <p className="mt-2 truncate text-sm font-black text-slate-950">{formatGameTitle(game)}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{game.homeScore ?? game.redScore ?? "-"} x {game.awayScore ?? game.whiteScore ?? "-"}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">{game.championship || game.competitionId || "Jogo do clube"}</p>
            </Link>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500 md:col-span-2 xl:col-span-4">Nenhum resultado fechado no periodo.</div>
          )}
        </div>
      </article>
    </section>
  );
}

export function ModuleHubPage({ module }: { module: keyof typeof hubConfigs }) {
  const config = hubConfigs[module];
  const { month, year } = useOutletContext<OutletPeriod>();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<string | null>(null);
  const shouldLoadFootballData = module === "futebol";
  const gamesQuery = useQuery({
    queryKey: ["module-hub", "futebol", "games", month, year],
    queryFn: () => apiRequest<Game[]>(`/sports/games?month=${month}&year=${year}`),
    enabled: shouldLoadFootballData
  });
  const athletesQuery = useQuery({
    queryKey: ["module-hub", "futebol", "athletes", month, year],
    queryFn: () => apiRequest<AthleteProfile[]>(`/athletes?month=${month}&year=${year}`),
    enabled: shouldLoadFootballData
  });
  const fieldsQuery = useQuery({
    queryKey: ["module-hub", "futebol", "fields"],
    queryFn: () => apiRequest<Field[]>("/sports/fields"),
    enabled: shouldLoadFootballData
  });
  const competitionsQuery = useQuery({
    queryKey: ["module-hub", "futebol", "competitions"],
    queryFn: () => apiRequest<Competition[]>("/competitions"),
    enabled: shouldLoadFootballData
  });
  const insights = config.insights ?? config.metrics.slice(0, 3).map((metric) => ({
    label: metric.label,
    value: metric.value,
    description: metric.hint,
    tone: metric.tone
  }));
  const visibleRows = useMemo(
    () => appliedFilter ? config.rows.filter((rowItem) => rowItem.filters?.includes(appliedFilter)) : config.rows,
    [appliedFilter, config.rows]
  );
  const mainShortcuts = visibleRows.slice(0, 4);
  const games = gamesQuery.data ?? [];
  const athletes = athletesQuery.data ?? [];
  const fields = fieldsQuery.data ?? [];
  const competitions = competitionsQuery.data ?? [];
  const now = new Date();
  const nextGame = games
    .filter((game) => new Date(game.date).getTime() >= now.getTime() && game.status !== "CANCELED")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const footballInfo = shouldLoadFootballData ? [
    { label: "Jogos no período", value: String(games.length), hint: `${games.filter((game) => game.status === "FINISHED").length} finalizado(s)` },
    { label: "Próximo jogo", value: nextGame ? formatShortDate(nextGame.date) : "Sem agenda", hint: nextGame?.location || nextGame?.field?.name || "Cadastre uma partida" },
    { label: "Atletas ativos", value: String(athletes.filter((athlete) => athlete.status === "ACTIVE").length), hint: `${athletes.length} no elenco filtrado` },
    { label: "Campos ativos", value: String(fields.filter((field) => field.status === "ACTIVE").length), hint: `${fields.length} local(is) cadastrados` },
    { label: "Competições", value: String(competitions.filter((competition) => competition.status === "ACTIVE").length), hint: "ativas agora" }
  ] : [];

  if (shouldLoadFootballData) {
    return (
      <FootballHubPage
        config={config}
        games={games}
        athletes={athletes}
        fields={fields}
        competitions={competitions}
        isLoading={gamesQuery.isLoading || athletesQuery.isLoading || fieldsQuery.isLoading || competitionsQuery.isLoading}
        nextGame={nextGame}
        visibleRows={visibleRows}
      />
    );
  }

  return (
    <section className="min-w-0 space-y-5">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              {config.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-700">{config.eyebrow}</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">Resumo operacional</h2>
              <p className="mt-1 max-w-5xl text-sm font-semibold leading-6 text-slate-500">{config.description}</p>
            </div>
          </div>
          <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-black text-white shadow-sm hover:bg-blue-800" to={config.primaryAction.path}>
            {config.primaryAction.label}
            <Plus size={17} />
          </Link>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => {
          const content = (
            <div className="flex items-center gap-4">
              <span className={`grid size-16 shrink-0 place-items-center rounded-lg ring-1 ${metricToneClasses(metric.tone)}`}>
                {metric.icon ?? <ClipboardList size={24} />}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{metric.label}</p>
                <strong className="mt-1 block truncate text-2xl font-black text-slate-950">{metric.value}</strong>
                <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-500">{metric.hint}</p>
              </div>
              {metric.path ? <ChevronRight size={16} className="ml-auto shrink-0 text-slate-400" /> : null}
            </div>
          );

          return metric.path ? (
            <Link key={metric.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md" to={metric.path}>
              {content}
            </Link>
          ) : (
            <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              {content}
            </article>
          );
        })}
      </div>

      {footballInfo.length > 0 ? (
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {footballInfo.map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">{item.label}</p>
                <strong className="mt-1 block truncate text-xl font-black text-slate-950">{item.value}</strong>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.hint}</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Leitura do módulo</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Indicadores de rotina, pontos de atenção e próximos caminhos.</p>
            </div>
            <span className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-600">{visibleRows.length} áreas</span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {insights.map((insight) => (
              <div key={insight.label} className={`rounded-lg border p-4 ${insightToneClasses(insight.tone)}`}>
                <p className="text-xs font-black uppercase tracking-[0.08em] opacity-80">{insight.label}</p>
                <strong className="mt-2 block text-xl font-black">{insight.value}</strong>
                <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">{insight.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Atalhos principais</h2>
          <div className="mt-4 grid gap-2">
            {mainShortcuts.map((row) => (
              <Link key={`shortcut-${row.title}`} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 hover:bg-white" to={row.path}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-blue-700 ring-1 ring-blue-100">{iconForTitle(row.title)}</span>
                  <span className="truncate">{row.title}</span>
                </span>
                <ChevronRight size={15} className="shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Filter size={18} className="mt-1 shrink-0 text-slate-700" />
            <div>
              <h2 className="text-lg font-black text-slate-950">Filtros principais</h2>
              <p className="text-sm font-semibold text-slate-500">Refine a consulta antes de abrir a área desejada.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.filters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={`inline-flex h-10 items-center rounded-lg border px-4 text-xs font-black shadow-sm ${
                  selectedFilter === filter || appliedFilter === filter ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setSelectedFilter((current) => current === filter ? null : filter)}
              >
                {filter}
              </button>
            ))}
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-black text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!selectedFilter}
              onClick={() => setAppliedFilter(selectedFilter)}
            >
              <Search size={15} />
              Filtrar
            </button>
            {appliedFilter ? (
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => {
                  setSelectedFilter(null);
                  setAppliedFilter(null);
                }}
              >
                Limpar
              </button>
            ) : null}
          </div>
        </div>
        {appliedFilter ? (
          <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
            Filtro aplicado: {appliedFilter}. Mostrando {visibleRows.length} de {config.rows.length} áreas.
          </p>
        ) : null}
      </article>

      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(12rem,1fr)_7rem_6rem] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:grid-cols-[minmax(12rem,1fr)_minmax(16rem,1.3fr)_9rem_7rem]">
          <span>Área</span>
          <span className="hidden md:block">Dashboard interno</span>
          <span>Status</span>
          <span className="text-right">Ações</span>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleRows.map((row) => (
            <div key={row.title} className="grid grid-cols-[minmax(12rem,1fr)_7rem_6rem] items-center gap-3 px-5 py-4 text-sm md:grid-cols-[minmax(12rem,1fr)_minmax(16rem,1.3fr)_9rem_7rem]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  {iconForTitle(row.title)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{row.title}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 md:hidden">{row.description}</p>
                </div>
              </div>
              <p className="hidden truncate text-sm font-semibold text-slate-600 md:block">{row.description}</p>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center text-[11px] font-black text-emerald-700">
                <CheckCircle2 size={13} />
                {row.status}
              </span>
              <Link className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-50" to={row.path}>
                Abrir
                <ChevronRight size={14} />
              </Link>
            </div>
          ))}
          {visibleRows.length === 0 ? (
            <div className="px-5 py-6 text-sm font-semibold text-slate-500">Nenhuma área encontrada para este filtro.</div>
          ) : null}
        </div>
      </article>

      <article className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-blue-900 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-blue-700 ring-1 ring-blue-100">
            <Info size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black">Rotina recomendada</p>
            <p className="text-sm font-semibold text-slate-600">Abra primeiro o painel, trate pendências do módulo e depois avance para o cadastro ou relatório específico.</p>
          </div>
        </div>
        <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 shadow-sm hover:bg-slate-50" to={config.primaryAction.path}>
          Ver guia rápido
          <ExternalLink size={15} />
        </Link>
      </article>
    </section>
  );
}
