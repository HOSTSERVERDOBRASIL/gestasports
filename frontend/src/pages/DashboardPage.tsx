import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BellRing,
  CircleDollarSign,
  Eye,
  EyeOff,
  Megaphone,
  Plus,
  ReceiptText,
  Settings2,
  Shirt,
  Trash2,
  Trophy,
  Users,
  Wallet
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../services/api";
import type { Club, DashboardSummary, Game, GameLineup, GroupSettings, TenantBrandingSettings } from "../types/domain";
import { formatFinancialCategory } from "../utils/financeLabels";
import { useAuth } from "../hooks/useAuth";
import { AthletePortalPage } from "./AthletePortalPage";
import { FullPitchBoard } from "../components/ui/FullPitchBoard";
import { DashboardWidget, DashboardWidgetGrid, EnterpriseStatCard, SoftButton } from "../components/ui/EnterpriseUI";
import { UniformShirtPreview } from "../components/ui/TeamColorCard";
import { readableTeamTextColor } from "../utils/teamColors";
import { useTheme } from "../hooks/useTheme";

type OutletPeriod = {
  month: number;
  year: number;
};

type DashboardPerson = {
  id: string;
  name: string;
  photoUrl: string | null;
};

type DashboardWidgetCode =
  | "next_match"
  | "upcoming_matches"
  | "latest_results"
  | "active_players"
  | "active_associates"
  | "new_associates"
  | "birthday_members"
  | "monthly_revenue"
  | "monthly_expenses"
  | "delinquency"
  | "pending_pix"
  | "monthly_fees"
  | "agenda"
  | "training"
  | "events"
  | "memorial_latest_title"
  | "memorial_photos"
  | "timeline"
  | "alerts"
  | "messages"
  | "attendance";

type DashboardWidgetSize = "S" | "M" | "L" | "XL" | "FULL";
type DashboardLayoutWidget = {
  widget: DashboardWidgetCode;
  size: DashboardWidgetSize;
  hidden?: boolean;
};
type DashboardLayout = {
  rows: DashboardLayoutWidget[][];
};
type DashboardLayoutResponse = {
  scope: "ASSOCIATION";
  catalog: Array<{ code: DashboardWidgetCode }>;
  layout: DashboardLayout;
};

const dashboardWidgetLabels: Record<DashboardWidgetCode, string> = {
  next_match: "Proximo jogo",
  upcoming_matches: "Proximos jogos",
  latest_results: "Ultimos resultados",
  active_players: "Atletas ativos",
  active_associates: "Associados ativos",
  new_associates: "Novos associados",
  birthday_members: "Aniversariantes",
  monthly_revenue: "Receitas",
  monthly_expenses: "Despesas",
  delinquency: "Inadimplencia",
  pending_pix: "PIX pendentes",
  monthly_fees: "Mensalidades",
  agenda: "Agenda",
  training: "Treinos",
  events: "Eventos",
  memorial_latest_title: "Ultimo titulo",
  memorial_photos: "Fotos recentes",
  timeline: "Linha do tempo",
  alerts: "Avisos",
  messages: "Mensagens",
  attendance: "Presenca"
};

const dashboardWidgetSizes: DashboardWidgetSize[] = ["S", "M", "L", "XL", "FULL"];

function hasDashboardPerson(value: unknown): value is DashboardPerson {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "name" in value &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { name?: unknown }).name === "string"
  );
}

const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthLabels = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const financialColors = ["#ef3340", "#30b84a", "#f5b441", "#4b5563"];

function formatCurrency(cents: number) {
  return moneyFormatter.format((cents || 0) / 100);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function shortChartLabel(name: string, maxLength = 12) {
  const trimmed = name.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}.` : trimmed;
}

function personStatusLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Em dia",
    LATE: "Pendente",
    INACTIVE: "Inativo"
  };

  return labels[status] ?? status;
}

function dashboardAlertLink(alert: { title: string; subtitle: string }, index: number) {
  const text = `${alert.title} ${alert.subtitle}`.toLowerCase();
  if (text.includes("inadimplente")) return "/associados?status=LATE";
  if (text.includes("vencimento") || text.includes("cobrar")) return "/financeiro?view=ADMIN";
  if (text.includes("goleiro")) return "/goleiros";
  if (text.includes("solicita")) return "/convites";
  return index % 2 === 0 ? "/financeiro?view=OPERACAO&tab=LANCAMENTOS" : "/relatorios";
}

function dashboardAlertAction(alert: { title: string; subtitle: string }) {
  const text = `${alert.title} ${alert.subtitle}`.toLowerCase();
  if (text.includes("inadimplente")) return "Abrir associados";
  if (text.includes("vencimento") || text.includes("cobrar")) return "Abrir cobrança";
  if (text.includes("goleiro")) return "Abrir goleiros";
  if (text.includes("solicita")) return "Abrir convites";
  return "Abrir detalhe";
}

function readableTextColor(background: string | undefined) {
  return readableTeamTextColor(background);
}

function Avatar({ person, className = "", accentColor = "#ef3340" }: { person: DashboardPerson | null | undefined; className: string; accentColor: string }) {
  const textColor = readableTextColor(accentColor);
  const name = person?.name ?? "?";
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-black ring-2 ring-[#24252d] ${className}`}
      style={{ backgroundColor: accentColor, color: textColor }}
    >
      {person?.photoUrl ? <img src={person.photoUrl} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "dark"
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <article
      className={`min-h-[6.75rem] rounded-lg border p-4 shadow-[0_18px_34px_rgba(3,7,18,0.2)] ${
        tone === "light" ? "border-slate-200 bg-white text-slate-950" : "border-white/8 bg-[#1d1e26] text-white"
      }`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <span className="fl-red-icon-badge grid size-12 place-items-center rounded-full bg-red-600 text-white shadow-[0_12px_22px_rgba(239,51,64,0.28)]">{icon}</span>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`truncate text-sm font-bold ${tone === "light" ? "text-slate-950" : "text-slate-100"}`}>{label}</p>
            <span className="text-xs font-black text-red-500">{hint}</span>
          </div>
          <strong className={`mt-1 block text-4xl font-black leading-none tracking-normal ${tone === "light" ? "text-slate-950" : "text-white"}`}>{value}</strong>
        </div>
      </div>
    </article>
  );
}

type FormationKey =
  | "4-3-3"
  | "4-4-2"
  | "3-5-2"
  | "4-2-3-1"
  | "4-3-1-2"
  | "3-4-3"
  | "3-4-1-2"
  | "4-1-4-1"
  | "4-5-1"
  | "5-3-2"
  | "5-4-1"
  | "4-2-2-2"
  | "3-6-1";

type FormationTemplate = {
  key: FormationKey;
  label: string;
  lines: number[];
  style: string;
};

const formationTemplates: FormationTemplate[] = [
  { key: "4-3-3", label: "4-3-3", lines: [4, 3, 3], style: "Com pontas" },
  { key: "4-4-2", label: "4-4-2", lines: [4, 4, 2], style: "Sem pontas" },
  { key: "3-5-2", label: "3-5-2", lines: [3, 5, 2], style: "Ala forte" },
  { key: "4-2-3-1", label: "4-2-3-1", lines: [4, 2, 3, 1], style: "Com meia central" },
  { key: "4-3-1-2", label: "4-3-1-2", lines: [4, 3, 1, 2], style: "Sem ponta, 2 atacantes" },
  { key: "3-4-3", label: "3-4-3", lines: [3, 4, 3], style: "Ataque aberto" },
  { key: "3-4-1-2", label: "3-4-1-2", lines: [3, 4, 1, 2], style: "Meia livre" },
  { key: "4-1-4-1", label: "4-1-4-1", lines: [4, 1, 4, 1], style: "Volante fixo" },
  { key: "4-5-1", label: "4-5-1", lines: [4, 5, 1], style: "Meio forte" },
  { key: "5-3-2", label: "5-3-2", lines: [5, 3, 2], style: "Seguro" },
  { key: "5-4-1", label: "5-4-1", lines: [5, 4, 1], style: "Fechado" },
  { key: "4-2-2-2", label: "4-2-2-2", lines: [4, 2, 2, 2], style: "Dois meias" },
  { key: "3-6-1", label: "3-6-1", lines: [3, 6, 1], style: "Povoando meio" }
];

const validFormationKeys = new Set<FormationKey>(formationTemplates.map((formation) => formation.key));

function savedFormation(value: string | null | undefined): FormationKey | null {
  return value && validFormationKeys.has(value as FormationKey) ? (value as FormationKey) : null;
}

function hasRenderableLineup(lineup: GameLineup | null | undefined): lineup is GameLineup {
  return Boolean(lineup?.athlete?.id && lineup.athlete.name && lineup.athlete.position);
}

function sortFieldLineups(lineups: GameLineup[]) {
  return lineups
    .slice()
    .sort((a, b) => (a.tacticalSlot ?? 999) - (b.tacticalSlot ?? 999) || (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) || a.athlete.name.localeCompare(b.athlete.name));
}

function lineupsToPitchSlots(lineups: GameLineup[]) {
  const slots: Array<{ id: string; name: string; number: number | null; position: string } | null> = Array.from({ length: 11 }, () => null);
  const unslotted: GameLineup[] = [];

  for (const lineup of lineups) {
    const player = { id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position };
    const slotIndex = lineup.tacticalSlot !== null ? lineup.tacticalSlot - 1 : lineup.role === "GOALKEEPER" ? 0 : -1;
    if (slotIndex >= 0 && slotIndex < slots.length && !slots[slotIndex]) {
      slots[slotIndex] = player;
    } else {
      unslotted.push(lineup);
    }
  }

  for (const lineup of unslotted) {
    const emptyIndex = slots.findIndex((slot) => slot === null);
    if (emptyIndex === -1) break;
    slots[emptyIndex] = { id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position };
  }

  return slots;
}

function detectPitchFormation(players: Array<{ position: string; [key: string]: unknown } | null>): FormationKey {
  const outfield = players
    .filter((player): player is { position: string; [key: string]: unknown } => player !== null && player.position !== "GOALKEEPER" && player.position !== "BOTH")
    .slice(0, 10);
  const defenders = outfield.filter((player) => ["DEFENDER", "RIGHT_BACK", "LEFT_BACK", "FULLBACK"].includes(player.position ?? "")).length;
  const midfielders = outfield.filter((player) => ["DEFENSIVE_MIDFIELDER", "CENTRAL_MIDFIELDER", "MIDFIELDER", "ATTACKING_MIDFIELDER", "LINE"].includes(player.position ?? "")).length;
  const attackers = outfield.filter((player) => ["RIGHT_WINGER", "LEFT_WINGER", "FORWARD", "STRIKER"].includes(player.position ?? "")).length;
  const attackingMids = outfield.filter((player) => player.position === "ATTACKING_MIDFIELDER").length;
  const defensiveMids = outfield.filter((player) => player.position === "DEFENSIVE_MIDFIELDER").length;
  const wingers = outfield.filter((player) => ["RIGHT_WINGER", "LEFT_WINGER"].includes(player.position ?? "")).length;

  if (defenders >= 5 && midfielders >= 4 && attackers <= 1) return "5-4-1";
  if (defenders >= 5 && attackers >= 2) return "5-3-2";
  if (defenders <= 3 && midfielders >= 6 && attackers <= 1) return "3-6-1";
  if (defenders <= 3 && midfielders >= 4 && attackingMids >= 1 && attackers >= 2) return "3-4-1-2";
  if (defenders <= 3 && midfielders >= 4 && attackers >= 3) return "3-4-3";
  if (defenders <= 3 && midfielders >= 5 && attackers >= 2) return "3-5-2";
  if (defenders >= 4 && midfielders >= 5 && attackers <= 1 && defensiveMids >= 1) return "4-1-4-1";
  if (defenders >= 4 && midfielders >= 5 && attackers <= 1) return "4-5-1";
  if (defenders >= 4 && defensiveMids >= 2 && attackingMids >= 2 && attackers >= 2) return "4-2-2-2";
  if (defenders >= 4 && midfielders >= 5 && attackers <= 2 && wingers >= 2) return "4-2-3-1";
  if (defenders >= 4 && midfielders >= 4 && attackers === 2) return "4-4-2";
  if (defenders >= 4 && midfielders >= 4 && attackers <= 2) return "4-3-1-2";
  return "4-3-3";
}

function flattenDashboardLayout(layout: DashboardLayout) {
  return layout.rows.flat().filter((item) => !item.hidden);
}

function normalizeDashboardLayout(layout: DashboardLayout): DashboardLayout {
  return { rows: layout.rows.map((row) => row.filter(Boolean)).filter((row) => row.length > 0) };
}

function DashboardBuilder({
  response,
  saving,
  onSave
}: {
  response: DashboardLayoutResponse | undefined;
  saving: boolean;
  onSave: (layout: DashboardLayout) => void;
}) {
  const layout = response?.layout ?? { rows: [] };
  const catalog = response?.catalog ?? [];
  const usedWidgets = new Set(layout.rows.flat().map((item) => item.widget));
  const availableWidgets = catalog.filter((item) => !usedWidgets.has(item.code));

  function updateWidget(rowIndex: number, widgetIndex: number, next: DashboardLayoutWidget) {
    const rows = layout.rows.map((row, currentRowIndex) =>
      currentRowIndex === rowIndex ? row.map((widget, currentWidgetIndex) => (currentWidgetIndex === widgetIndex ? next : widget)) : row
    );
    onSave(normalizeDashboardLayout({ rows }));
  }

  function removeWidget(rowIndex: number, widgetIndex: number) {
    const rows = layout.rows.map((row, currentRowIndex) => (currentRowIndex === rowIndex ? row.filter((_, currentWidgetIndex) => currentWidgetIndex !== widgetIndex) : row));
    onSave(normalizeDashboardLayout({ rows }));
  }

  function moveWidget(rowIndex: number, widgetIndex: number, direction: -1 | 1) {
    const flat = layout.rows.flat();
    const currentIndex = layout.rows.slice(0, rowIndex).reduce((sum, row) => sum + row.length, 0) + widgetIndex;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= flat.length) return;
    const nextFlat = flat.slice();
    [nextFlat[currentIndex], nextFlat[targetIndex]] = [nextFlat[targetIndex], nextFlat[currentIndex]];
    onSave({ rows: nextFlat.map((widget) => [widget]) });
  }

  function addWidget(code: DashboardWidgetCode) {
    onSave({ rows: [...layout.rows, [{ widget: code, size: "M", hidden: false }]] });
  }

  return (
    <DashboardWidget title="Builder do dashboard" description="Configure widgets por tenant sem HTML ou CSS livre." size="FULL">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-3">
          {layout.rows.flat().map((widget, index) => {
            const rowIndex = layout.rows.findIndex((row) => row.includes(widget));
            const widgetIndex = layout.rows[rowIndex]?.indexOf(widget) ?? 0;
            return (
              <div key={`${widget.widget}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_7rem_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{dashboardWidgetLabels[widget.widget]}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{widget.widget}</p>
                </div>
                <select
                  className="h-10 rounded-lg border-slate-200 bg-white px-2 text-sm font-black"
                  value={widget.size}
                  onChange={(event) => updateWidget(rowIndex, widgetIndex, { ...widget, size: event.target.value as DashboardWidgetSize })}
                >
                  {dashboardWidgetSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700" title="Mover para cima" onClick={() => moveWidget(rowIndex, widgetIndex, -1)}><ArrowUp size={16} /></button>
                  <button type="button" className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700" title="Mover para baixo" onClick={() => moveWidget(rowIndex, widgetIndex, 1)}><ArrowDown size={16} /></button>
                  <button type="button" className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700" title={widget.hidden ? "Mostrar" : "Ocultar"} onClick={() => updateWidget(rowIndex, widgetIndex, { ...widget, hidden: !widget.hidden })}>{widget.hidden ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                  <button type="button" className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-red-700" title="Remover" onClick={() => removeWidget(rowIndex, widgetIndex)}><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
          {layout.rows.flat().length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">Nenhum widget configurado.</p> : null}
          {saving ? <p className="text-xs font-black text-slate-500">Salvando layout...</p> : null}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-black uppercase text-slate-500">Adicionar widget</p>
          <div className="mt-3 grid gap-2">
            {availableWidgets.map((item) => (
              <button key={item.code} type="button" className="inline-flex min-h-10 items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 text-left text-sm font-black text-slate-700 hover:bg-slate-50" onClick={() => addWidget(item.code)}>
                {dashboardWidgetLabels[item.code]}
                <Plus size={15} />
              </button>
            ))}
            {availableWidgets.length === 0 ? <p className="text-sm font-semibold text-slate-500">Todos os widgets ja foram adicionados.</p> : null}
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}

function ConfiguredDashboardWidgets({
  layout,
  data,
  monthLabel
}: {
  layout: DashboardLayout | undefined;
  data: DashboardSummary;
  monthLabel: string;
}) {
  const widgets = layout ? flattenDashboardLayout(layout) : [];
  if (widgets.length === 0) return null;

  function renderWidget(widget: DashboardLayoutWidget) {
    switch (widget.widget) {
      case "next_match":
        return (
          <DashboardWidget key={widget.widget} title="Proximo jogo" description={data.nextMatch ? data.nextMatch.location : "Nenhum jogo agendado"} size={widget.size}>
            {data.nextMatch ? (
              <div className="grid gap-3">
                <strong className="text-2xl font-black text-slate-950">{data.nextMatch.opponent}</strong>
                <p className="text-sm font-semibold text-slate-500">{new Date(data.nextMatch.startsAt).toLocaleString("pt-BR")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <EnterpriseStatCard label="Confirmados" value={data.nextMatch.confirmedCount} helper="presencas" icon={<Users size={18} />} tone="success" />
                  <EnterpriseStatCard label="Pendentes" value={data.nextMatch.pendingCount} helper="aguardando" icon={<BellRing size={18} />} tone="warning" />
                </div>
              </div>
            ) : <p className="text-sm font-semibold text-slate-500">Cadastre um jogo para preencher este widget.</p>}
          </DashboardWidget>
        );
      case "active_players":
        return <EnterpriseStatCard key={widget.widget} label="Atletas ativos" value={data.athletesReady} helper={`${data.athletesTotal} total`} icon={<Shirt size={18} />} tone="success" />;
      case "active_associates":
        return <EnterpriseStatCard key={widget.widget} label="Associados ativos" value={data.associatesActive} helper={`${data.lateAssociates} em atraso`} icon={<Users size={18} />} tone="info" />;
      case "monthly_revenue":
        return <EnterpriseStatCard key={widget.widget} label="Receitas" value={formatCurrency(data.monthRevenueCents)} helper={monthLabel} icon={<Wallet size={18} />} tone="success" />;
      case "monthly_expenses":
        return <EnterpriseStatCard key={widget.widget} label="Despesas" value={formatCurrency(data.monthExpenseCents)} helper={monthLabel} icon={<ReceiptText size={18} />} tone="warning" />;
      case "delinquency":
      case "monthly_fees":
        return <EnterpriseStatCard key={widget.widget} label={dashboardWidgetLabels[widget.widget]} value={data.monthlyFeeAlert.lateCount + data.monthlyFeeAlert.pendingCount} helper={formatCurrency(data.monthlyFeeAlert.amountCents)} icon={<AlertCircle size={18} />} tone="danger" />;
      case "attendance":
        return <EnterpriseStatCard key={widget.widget} label="Presenca" value={`${data.presenceRanking[0]?.presencePercent ?? 0}%`} helper={data.presenceRanking[0]?.name ?? "Sem ranking"} icon={<Trophy size={18} />} tone="info" />;
      case "alerts":
        return (
          <DashboardWidget key={widget.widget} title="Avisos" description={`${data.alerts.length} alerta(s)`} size={widget.size}>
            <div className="space-y-2">
              {data.alerts.slice(0, 3).map((alert) => <p key={alert.title} className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">{alert.title}</p>)}
            </div>
          </DashboardWidget>
        );
      default:
        return (
          <DashboardWidget key={widget.widget} title={dashboardWidgetLabels[widget.widget]} description="Widget preparado para dados do modulo." size={widget.size}>
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500">Dados serao conectados na proxima evolucao deste modulo.</p>
          </DashboardWidget>
        );
    }
  }

  return <DashboardWidgetGrid>{widgets.map(renderWidget)}</DashboardWidgetGrid>;
}

export function DashboardPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const location = useLocation();
  const { user, activeRole } = useAuth();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const effectiveRole = activeRole ?? user?.role ?? null;
  const isAthleteView = effectiveRole === "ATHLETE";
  const canConfigureDashboard = effectiveRole === "ADMIN";
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedPitchSidePreference, setSelectedPitchSidePreference] = useState<"RED" | "WHITE" | null>(null);

  const summary = useQuery({
    queryKey: ["dashboard-summary", month, year],
    queryFn: () => apiRequest<DashboardSummary>(`/dashboard/summary?month=${month}&year=${year}`),
    enabled: !isAthleteView
  });

  const tacticalGamesQuery = useQuery({
    queryKey: ["dashboard-tactical-games", month, year],
    queryFn: () => apiRequest<Game[]>(`/sports/games?month=${month}&year=${year}`),
    enabled: !isAthleteView
  });

  const groupSettingsQuery = useQuery({
    queryKey: ["group-settings", "dashboard"],
    queryFn: () => apiRequest<GroupSettings>("/group/settings"),
    enabled: !isAthleteView
  });

  const tenantBrandingQuery = useQuery({
    queryKey: ["tenant-branding"],
    queryFn: () => apiRequest<TenantBrandingSettings>("/tenant/branding"),
    enabled: !isAthleteView
  });

  const clubsQuery = useQuery({
    queryKey: ["clubs", "dashboard-field"],
    queryFn: () => apiRequest<Club[]>("/clubs"),
    enabled: !isAthleteView
  });

  const dashboardLayoutQuery = useQuery({
    queryKey: ["dashboard-layout", "ASSOCIATION"],
    queryFn: () => apiRequest<DashboardLayoutResponse>("/dashboard/layout"),
    enabled: !isAthleteView
  });

  const dashboardLayoutMutation = useMutation({
    mutationFn: (layout: DashboardLayout) => apiRequest<DashboardLayoutResponse>("/dashboard/layout", { method: "PUT", body: JSON.stringify(layout) }),
    onSuccess: (response) => {
      queryClient.setQueryData(["dashboard-layout", "ASSOCIATION"], response);
    }
  });

  const tacticalGame = useMemo(() => {
    const games = tacticalGamesQuery.data ?? [];
    const nextMatchId = summary.data?.nextMatch?.id;
    if (nextMatchId) {
      const byNextMatch = games.find((game) => game.id === nextMatchId);
      if (byNextMatch) {
        return byNextMatch;
      }
    }

    return games[0] ?? null;
  }, [summary.data?.nextMatch?.id, tacticalGamesQuery.data]);

  const focusAvisos = useMemo(() => new URLSearchParams(location.search).get("focus") === "avisos", [location.search]);

  useEffect(() => {
    setSelectedPitchSidePreference(null);
  }, [tacticalGame?.id]);

  useEffect(() => {
    if (!focusAvisos) {
      return;
    }
    const alerts = document.getElementById("dashboard-avisos");
    alerts?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusAvisos]);

  if (isAthleteView) {
    return <AthletePortalPage />;
  }

  if (summary.isLoading) {
    return <div className="rounded-lg border border-white/10 bg-[#1d1e26] p-6 text-slate-300 shadow-sm">Carregando dashboard...</div>;
  }

  if (summary.isError || !summary.data) {
    return <div className="rounded-lg border border-red-500/30 bg-red-950/50 p-6 text-red-100">Falha ao carregar dashboard.</div>;
  }

  const data = summary.data;
  const dashboardAlerts = (data.alerts ?? []).filter((alert): alert is { title: string; subtitle: string } => Boolean(alert?.title && alert?.subtitle));
  const presenceRanking = (data.presenceRanking ?? []).filter((person): person is DashboardPerson & { status: string; confirmedCount: number; totalMatches: number; presencePercent: number } => hasDashboardPerson(person));
  const recentFinancialEntries = (data.recentFinancialEntries ?? []).filter(Boolean);
  const monthlyBalance = data.balanceCents;
  const financialPie = [
    { name: "Receitas", value: data.monthRevenueCents },
    { name: "Despesas", value: data.monthExpenseCents },
    { name: "Goleiros", value: data.keeperCostCents }
  ].filter((item) => item.value > 0);
  const normalizedFinancialPie = financialPie.length > 0 ? financialPie : [{ name: "Sem movimento", value: 1 }];
  const selectedMonth = monthLabels[month - 1] ?? "Período";
  const collectionOpenCount = data.monthlyFeeAlert.pendingCount + data.monthlyFeeAlert.lateCount;
  const associationHealth = data.associatesActive > 0 ? Math.max(0, Math.round(((data.associatesActive - data.lateAssociates) / data.associatesActive) * 100)) : 100;
  const athleteAvailability = data.athletesTotal > 0 ? Math.round((data.athletesReady / data.athletesTotal) * 100) : 0;
  const financialTrend = (data.monthlySeries ?? []).map((row) => ({
    ...row,
    balanceCents: (row.revenueCents ?? 0) - (row.expenseCents ?? 0)
  }));
  const associatesStatusChart = data.associatesActive > 0
    ? [
        { name: "Em dia", value: Math.max(0, data.associatesActive - data.lateAssociates) },
        { name: "Em atraso", value: data.lateAssociates }
      ].filter((item) => item.value > 0)
    : [{ name: "Sem associados", value: 1 }];
  const athleteReadinessChart = data.athletesTotal > 0
    ? [
        { name: "Aptos", value: data.athletesReady },
        { name: "A regularizar", value: Math.max(0, data.athletesTotal - data.athletesReady) }
      ].filter((item) => item.value > 0)
    : [{ name: "Sem atletas", value: 1 }];
  const presenceChartData = presenceRanking.slice(0, 6).map((person) => ({
    name: shortChartLabel(person.name),
    presenca: person.presencePercent,
    jogos: person.confirmedCount
  }));
  const groupSettings = groupSettingsQuery.data;
  const configuredRedName = groupSettings?.uniform1Name?.trim() || "Time A";
  const configuredWhiteName = groupSettings?.uniform2Name?.trim() || "Time B";
  const configuredRedColor = groupSettings?.uniform1Color?.trim() || "#94a3b8";
  const configuredWhiteColor = groupSettings?.uniform2Color?.trim() || "#cbd5e1";
  
  // Espelhar dados do jogo específico quando disponível
  const redTeamLabel = tacticalGame?.redTeamName?.trim() || configuredRedName || "Time A";
  const whiteTeamLabel = tacticalGame?.whiteTeamName?.trim() || configuredWhiteName || "Time B";
  const redUniformColor = tacticalGame?.redUniformColor?.trim() || configuredRedColor;
  const whiteUniformColor = tacticalGame?.whiteUniformColor?.trim() || configuredWhiteColor;
  const redUniformImageUrl = tacticalGame?.redUniformImageUrl ?? groupSettings?.uniform1ImageUrl ?? null;
  const whiteUniformImageUrl = tacticalGame?.whiteUniformImageUrl ?? groupSettings?.uniform2ImageUrl ?? null;
  const dashboardClubs = clubsQuery.data ?? [];
  const appearanceLogoUrl = tenantBrandingQuery.data?.logoUrl ?? null;
  const registeredInternalClubLogoUrl = dashboardClubs.find((club) => club.type === "INTERNAL" && club.logoUrl)?.logoUrl ?? null;
  const internalGameLogoUrl = appearanceLogoUrl ?? registeredInternalClubLogoUrl;
  const redClubLogoUrl = tacticalGame?.redCrestUrl ?? (tacticalGame?.type === "EXTERNAL" ? (tacticalGame.homeClub?.logoUrl ?? internalGameLogoUrl) : internalGameLogoUrl);
  const whiteClubLogoUrl = tacticalGame?.whiteCrestUrl ?? (tacticalGame?.type === "EXTERNAL" ? (tacticalGame.awayClub?.logoUrl ?? null) : internalGameLogoUrl);
  const tacticalGameSeasonLabel = tacticalGame ? new Date(tacticalGame.date).getFullYear() : year;
  const tacticalLineups = (tacticalGame?.lineups ?? []).filter(hasRenderableLineup);
  const redFieldLineups = sortFieldLineups(tacticalLineups.filter((lineup) => lineup.side === "RED" && (lineup.role === "STARTER" || lineup.role === "GOALKEEPER")));
  const whiteFieldLineups = sortFieldLineups(tacticalLineups.filter((lineup) => lineup.side === "WHITE" && (lineup.role === "STARTER" || lineup.role === "GOALKEEPER")));
  const redReserveLineups = sortFieldLineups(tacticalLineups.filter((lineup) => lineup.side === "RED" && lineup.role === "RESERVE"));
  const whiteReserveLineups = sortFieldLineups(tacticalLineups.filter((lineup) => lineup.side === "WHITE" && lineup.role === "RESERVE"));
  const redPlayers = lineupsToPitchSlots(redFieldLineups);
  const whitePlayers = lineupsToPitchSlots(whiteFieldLineups);
  const hasPitchLineup = redPlayers.some(Boolean) || whitePlayers.some(Boolean);
  const redPitchFormation = savedFormation(tacticalGame?.redFormation) ?? detectPitchFormation(redPlayers);
  const whitePitchFormation = savedFormation(tacticalGame?.whiteFormation) ?? detectPitchFormation(whitePlayers);
  const automaticPitchSide = redPlayers.filter(Boolean).length > 0 || whitePlayers.filter(Boolean).length === 0 ? "RED" : "WHITE";
  const selectedPitchSide = selectedPitchSidePreference ?? automaticPitchSide;
  const selectedPitchFormation = selectedPitchSide === "RED" ? redPitchFormation : whitePitchFormation;
  const selectedFormation = formationTemplates.find((item) => item.key === selectedPitchFormation) ?? formationTemplates[0];
  const redBenchPlayers = redReserveLineups.map((lineup) => ({ id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position }));
  const whiteBenchPlayers = whiteReserveLineups.map((lineup) => ({ id: lineup.athlete.id, name: lineup.athlete.name, number: lineup.jerseyNumber, position: lineup.athlete.position }));
  const redMatchGoals = tacticalGame?.redScore ?? 0;
  const whiteMatchGoals = tacticalGame?.whiteScore ?? 0;
  const hasMatchScore = tacticalGame?.redScore !== null && tacticalGame?.redScore !== undefined && tacticalGame?.whiteScore !== null && tacticalGame?.whiteScore !== undefined;
  const darkTooltip = theme === "dark" || theme === "system";
  const isLightTheme = theme === "light";
  const subtleButtonClass = isLightTheme ?
     "inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-900 shadow-sm hover:bg-slate-50"
    : "inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-black text-slate-100 hover:bg-white/20";
  const tooltipStyle = {
    borderRadius: 10,
    border: darkTooltip ? "1px solid rgba(255,255,255,0.12)" : "1px solid #dbe3ee",
    backgroundColor: darkTooltip ? "rgba(15,23,42,0.96)" : "#f8fbff",
    color: darkTooltip ? "#e2e8f0" : "#0f172a",
    boxShadow: darkTooltip ? "0 14px 28px rgba(2,6,23,0.42)" : "0 10px 24px rgba(15,23,42,0.14)"
  } as const;

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase text-[var(--brand-accent)]">Dashboard configuravel</p>
          <h2 className="text-lg font-black text-slate-950">Widgets da associacao</h2>
        </div>
        {canConfigureDashboard ? (
          <SoftButton onClick={() => setBuilderOpen((current) => !current)}>
            <Settings2 size={16} />
            {builderOpen ? "Fechar builder" : "Configurar widgets"}
          </SoftButton>
        ) : null}
      </div>

      {builderOpen && canConfigureDashboard ? (
        <DashboardBuilder
          response={dashboardLayoutQuery.data}
          saving={dashboardLayoutMutation.isPending}
          onSave={(layout) => void dashboardLayoutMutation.mutateAsync(layout)}
        />
      ) : null}

      {dashboardLayoutMutation.isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">Nao foi possivel salvar o layout do dashboard.</p>
      ) : null}

      <ConfiguredDashboardWidgets layout={dashboardLayoutQuery.data?.layout} data={data} monthLabel={selectedMonth} />

      <div className="hidden">
        <Link to="/associados?view=OPERACAO&status=ACTIVE" className="block transition hover:-translate-y-0.5">
          <MetricCard label="Associados" value={String(data.associatesActive)} hint={`${data.recentAssociates.length} recentes`} icon={<Users size={24} />} />
        </Link>
        <Link to="/atletas?view=OPERACAO&status=ACTIVE" className="block transition hover:-translate-y-0.5">
          <MetricCard label="Atletas Aptos" value={String(data.athletesReady)} hint={`${data.athletesTotal} total`} icon={<Shirt size={24} />} />
        </Link>
        <Link to="/associados?view=OPERACAO&status=LATE" className="block transition hover:-translate-y-0.5">
          <MetricCard label="Inadimplentes" value={String(data.lateAssociates)} hint="atenção" icon={<AlertCircle size={24} />} tone="light" />
        </Link>
        <Link to="/financeiro" className="block transition hover:-translate-y-0.5">
          <MetricCard
            label="Caixa Atual"
            value={formatCurrency(monthlyBalance)}
            hint={monthlyBalance >= 0 ? "positivo" : "negativo"}
            icon={<Wallet size={24} />}
            tone="light"
          />
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Financeiro</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Receitas, despesas e saldo</h2>
            </div>
            <Link to="/financeiro?view=REPORTS" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">
              Relatorios
            </Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={financialTrend} margin={{ top: 12, right: 16, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="dashboard-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#30b84a" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#30b84a" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dashboard-expense-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef3340" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#ef3340" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} tickFormatter={(value) => `${Math.round(Number(value) / 100)}`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} itemStyle={{ color: darkTooltip ? "#e2e8f0" : "#0f172a" }} labelStyle={{ color: darkTooltip ? "#94a3b8" : "#334155" }} />
                <Area type="monotone" dataKey="revenueCents" name="Receitas" stroke="#30b84a" strokeWidth={3} fill="url(#dashboard-revenue-fill)" />
                <Area type="monotone" dataKey="expenseCents" name="Despesas" stroke="#ef3340" strokeWidth={3} fill="url(#dashboard-expense-fill)" />
                <Bar dataKey="balanceCents" name="Saldo" fill="#111827" radius={[4, 4, 0, 0]} opacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.08)] sm:p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Composicao do mes</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{selectedMonth}</h2>
          </div>
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={normalizedFinancialPie} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
                  {normalizedFinancialPie.map((item, index) => (
                    <Cell key={item.name} fill={financialPie.length > 0 ? financialColors[index % financialColors.length] : "#e5e7eb"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} itemStyle={{ color: darkTooltip ? "#e2e8f0" : "#0f172a" }} labelStyle={{ color: darkTooltip ? "#94a3b8" : "#334155" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400">Saldo</p>
                <strong className={`text-lg font-black ${monthlyBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(monthlyBalance)}</strong>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Link to="/financeiro?view=OPERACAO&tab=LANCAMENTOS&type=INCOME" className="rounded-lg bg-emerald-50 px-2 py-2 text-xs font-black text-emerald-700">{formatCurrency(data.monthRevenueCents)}</Link>
            <Link to="/financeiro?view=OPERACAO&tab=LANCAMENTOS&type=EXPENSE" className="rounded-lg bg-red-50 px-2 py-2 text-xs font-black text-red-700">{formatCurrency(data.monthExpenseCents)}</Link>
            <Link to="/financeiro?view=ADMIN" className="rounded-lg bg-slate-100 px-2 py-2 text-xs font-black text-slate-700">{collectionOpenCount} cobrancas</Link>
          </div>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-600">Associados</p>
              <h3 className="text-base font-black text-slate-950">Saude da base</h3>
            </div>
            <strong className="text-2xl font-black text-emerald-600">{associationHealth}%</strong>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={associatesStatusChart} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={4}>
                  {associatesStatusChart.map((item, index) => <Cell key={item.name} fill={index === 0 ? "#30b84a" : "#ef3340"} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-700">Atletas</p>
              <h3 className="text-base font-black text-slate-950">Disponibilidade</h3>
            </div>
            <strong className="text-2xl font-black text-blue-700">{athleteAvailability}%</strong>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={athleteReadinessChart} margin={{ top: 12, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {athleteReadinessChart.map((item, index) => <Cell key={item.name} fill={index === 0 ? "#2563eb" : "#f59e0b"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Presenca</p>
              <h3 className="text-base font-black text-slate-950">Top atletas</h3>
            </div>
            <Link to="/jogos?view=OPERACAO&subView=ESCALACAO" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Escalacao</Link>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={presenceChartData} layout="vertical" margin={{ top: 6, right: 18, bottom: 0, left: 0 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" width={78} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                <Tooltip formatter={(value, name) => name === "presenca" ? `${value}%` : value} contentStyle={tooltipStyle} />
                <Bar dataKey="presenca" name="Presenca" fill="#ef3340" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.08)] sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-slate-950">Gestão da associação</h2>
            <p className="text-sm font-semibold text-slate-500">Indicadores rápidos para diretoria acompanhar operação, caixa e participação.</p>
          </div>
          <Link to="/financeiro?view=REPORTS" className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">
            Ver prestação de contas
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link to="/financeiro?view=ADMIN" className="rounded-lg border border-red-100 bg-red-50 p-3 transition hover:-translate-y-0.5 hover:border-red-200">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-red-700">Cobrança</p>
            <strong className="mt-2 block text-2xl font-black text-red-700">{collectionOpenCount}</strong>
            <span className="mt-1 block text-xs font-bold text-red-600">{formatCurrency(data.monthlyFeeAlert.amountCents)} em aberto</span>
          </Link>
          <Link to="/associados?status=LATE" className="rounded-lg border border-amber-100 bg-amber-50 p-3 transition hover:-translate-y-0.5 hover:border-amber-200">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-amber-700">Saúde associativa</p>
            <strong className="mt-2 block text-2xl font-black text-amber-700">{associationHealth}%</strong>
            <span className="mt-1 block text-xs font-bold text-amber-700">{data.lateAssociates} associado(s) em atraso</span>
          </Link>
          <Link to="/atletas?view=OPERACAO&status=ACTIVE" className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 transition hover:-translate-y-0.5 hover:border-emerald-200">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">Elenco apto</p>
            <strong className="mt-2 block text-2xl font-black text-emerald-700">{athleteAvailability}%</strong>
            <span className="mt-1 block text-xs font-bold text-emerald-700">{data.athletesReady}/{data.athletesTotal} atletas</span>
          </Link>
          <Link to="/jogos?view=OPERACAO&subView=AGENDA" className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:border-slate-300">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Agenda</p>
            <strong className="mt-2 block text-2xl font-black text-slate-950">{data.upcomingMatches.length}</strong>
            <span className="mt-1 block text-xs font-bold text-slate-500">jogo(s) futuro(s)</span>
          </Link>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Foco do periodo</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedMonth}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">O dashboard mostra so o que precisa de decisao rapida. O detalhe fica dentro de cada modulo.</p>
            </div>
            <span className={`rounded-lg px-3 py-2 text-xs font-black ${monthlyBalance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {formatCurrency(monthlyBalance)}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Link to="/financeiro?area=DASHBOARD" className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-white">
              <CircleDollarSign size={22} className="text-emerald-600" />
              <h3 className="mt-3 font-black text-slate-950">Pagamentos</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{collectionOpenCount} cobranca(s) abertas.</p>
            </Link>
            <Link to="/jogos?view=OPERACAO&subView=AGENDA" className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-red-200 hover:bg-white">
              <Trophy size={22} className="text-red-600" />
              <h3 className="mt-3 font-black text-slate-950">Jogos</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{data.upcomingMatches.length} jogo(s) futuro(s).</p>
            </Link>
            <Link to="/atletas" className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white">
              <Users size={22} className="text-blue-700" />
              <h3 className="mt-3 font-black text-slate-950">Atletas</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{data.athletesReady}/{data.athletesTotal} aptos para escala.</p>
            </Link>
          </div>
        </article>

        <article className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-lg bg-red-600 text-white">
              <Megaphone size={24} />
            </span>
            <div>
              <h3 className="font-black text-slate-950">Mensalidade</h3>
              <p className="text-sm font-semibold text-slate-500">{selectedMonth}</p>
            </div>
          </div>
          <strong className="mt-4 block text-3xl font-black text-red-600">{formatCurrency(data.monthlyFeeAlert.amountCents)}</strong>
          <p className="mt-1 text-sm font-semibold text-slate-600">{data.monthlyFeeAlert.lateCount} em atraso, {data.monthlyFeeAlert.pendingCount} pendentes.</p>
          <Link to="/financeiro?area=DASHBOARD" className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-black text-white hover:bg-red-700">
            Abrir cobrancas
          </Link>
        </article>
      </div>

      <article id="dashboard-avisos" className={`rounded-lg border bg-[#1d1e26] p-4 shadow-sm sm:p-5 ${focusAvisos ? "border-red-400/60 ring-2 ring-red-400/45" : "border-white/10"}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-white">Avisos</h3>
          <Link to="/relatorios" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/10">
            Ver relatorios
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {dashboardAlerts.slice(0, 4).map((alert, index) => (
            <Link key={`${alert.title}-${index}`} to={dashboardAlertLink(alert, index)} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/8 bg-white/[0.04] p-3 transition hover:border-red-400/40 hover:bg-white/[0.08]">
              <span className={`grid size-10 place-items-center rounded-full ${index === 0 ? "bg-red-500/15 text-red-300" : "bg-white/8 text-slate-300"}`}>
                {index === 0 ? <BellRing size={18} /> : <ReceiptText size={18} />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{alert.title}</p>
                <p className="truncate text-xs font-semibold text-slate-400">{alert.subtitle}</p>
              </div>
              <span className="hidden rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-black text-slate-200 sm:inline-flex">
                {dashboardAlertAction(alert)}
              </span>
            </Link>
          ))}
        </div>
      </article>

      <div className="hidden">
        <div className="min-w-0 space-y-4">
          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.1)]">
            <div className="border-b border-slate-200 bg-gradient-to-r from-white via-emerald-50/45 to-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-500">Campo funcional</p>
                  <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950">Escalação do próximo jogo</h2>
                  <div className="hidden">
                    <span className="grid size-12 place-items-center rounded-full bg-green-500 text-white shadow-[0_12px_24px_rgba(34,197,94,0.3)]">
                      <Wallet size={24} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-300">Caixa Atual</p>
                      <h2 className="mt-1 text-3xl font-black leading-none text-white sm:text-4xl">{formatCurrency(monthlyBalance)}</h2>
                    </div>
                  </div>
                </div>
                <span className={`hidden rounded-lg px-3 py-2 text-xs font-black ${monthlyBalance >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {monthlyBalance >= 0 ? "+" : ""}
                  {formatCurrency(monthlyBalance)} no período
                </span>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50/70 p-4 sm:p-5">
              <div className="space-y-3">
                <div className="space-y-3">
                  {hasPitchLineup ? (
                  <>
                  <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)_minmax(0,1fr)] sm:items-stretch">
                    <button
                      type="button"
                      aria-pressed={selectedPitchSide === "RED"}
                      title={`Visualizar escalação do ${redTeamLabel}`}
                      className={`grid grid-cols-[3.75rem_minmax(0,1fr)_4.25rem] items-center gap-3 rounded-lg border px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 ${selectedPitchSide === "RED" ? "border-emerald-300 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white"}`}
                      onClick={() => setSelectedPitchSidePreference("RED")}
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden">
                        {redClubLogoUrl ? <img src={redClubLogoUrl} alt="" className="max-h-12 max-w-full object-contain" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Camisa do clube</span>
                        <span className="block truncate text-base font-black text-slate-950">{redTeamLabel}</span>
                        <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] font-black text-slate-600">
                          Formação {redPitchFormation}
                        </span>
                      </span>
                      <span className="grid gap-0.5">
                        <span className="fl-transparent-checker flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200">
                          <span className="scale-[0.42]">
                            <UniformShirtPreview color={redUniformColor} fallback="#94a3b8" imageUrl={redUniformImageUrl} size="small" />
                          </span>
                        </span>
                        <span className="text-center text-[9px] font-black text-slate-500">{tacticalGameSeasonLabel}</span>
                      </span>
                    </button>

                    <div className="grid place-items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Formação</span>
                      {hasMatchScore ? (
                        <div className="mt-1 flex items-center gap-3">
                          <strong className="text-3xl font-black leading-none text-slate-950">{redMatchGoals}</strong>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">{selectedPitchFormation}</span>
                          <strong className="text-3xl font-black leading-none text-slate-950">{whiteMatchGoals}</strong>
                        </div>
                      ) : (
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">{selectedPitchFormation}</span>
                          <strong className="text-xs font-black uppercase tracking-[0.08em] text-slate-800">Jogo não iniciado</strong>
                        </div>
                      )}
                      <span className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-600">{selectedFormation.style}</span>
                    </div>

                    <button
                      type="button"
                      aria-pressed={selectedPitchSide === "WHITE"}
                      title={`Visualizar escalação do ${whiteTeamLabel}`}
                      className={`grid grid-cols-[3.75rem_minmax(0,1fr)_4.25rem] items-center gap-3 rounded-lg border px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 ${selectedPitchSide === "WHITE" ? "border-emerald-300 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white"}`}
                      onClick={() => setSelectedPitchSidePreference("WHITE")}
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden">
                        {whiteClubLogoUrl ? <img src={whiteClubLogoUrl} alt="" className="max-h-12 max-w-full object-contain" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Camisa do clube</span>
                        <span className="block truncate text-base font-black text-slate-950">{whiteTeamLabel}</span>
                        <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[10px] font-black text-slate-600">
                          Formação {whitePitchFormation}
                        </span>
                      </span>
                      <span className="grid gap-0.5">
                        <span className="fl-transparent-checker flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200">
                          <span className="scale-[0.42]">
                            <UniformShirtPreview color={whiteUniformColor} fallback="#cbd5e1" imageUrl={whiteUniformImageUrl} size="small" />
                          </span>
                        </span>
                        <span className="text-center text-[9px] font-black text-slate-500">{tacticalGameSeasonLabel}</span>
                      </span>
                    </button>
                  </div>
                  <FullPitchBoard
                    redColor={redUniformColor}
                    whiteColor={whiteUniformColor}
                    redPlayers={redPlayers}
                    whitePlayers={whitePlayers}
                    redBenchPlayers={redBenchPlayers}
                    whiteBenchPlayers={whiteBenchPlayers}
                    redTeamName={redTeamLabel}
                    whiteTeamName={whiteTeamLabel}
                    redCrestUrl={redClubLogoUrl}
                    whiteCrestUrl={whiteClubLogoUrl}
                    redFormation={redPitchFormation}
                    whiteFormation={whitePitchFormation}
                    focusTeam={selectedPitchSide}
                    mode="view"
                    interactive={false}
                    showBench={false}
                    showPlayerNumbers
                    className="aspect-[1.85] min-h-[18rem] sm:min-h-[22rem] xl:min-h-[26rem] 2xl:min-h-[28rem]"
                  />
                  </>
                  ) : (
                    <div className="grid min-h-[18rem] place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center sm:min-h-[22rem] xl:min-h-[26rem]">
                      <div className="max-w-md">
                        <Shirt size={32} className="mx-auto text-slate-400" />
                        <h3 className="mt-3 text-lg font-black text-slate-950">Campo sem time sorteado</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Quando houver escalação ou sorteio aplicado ao jogo, o campo aparecerá aqui com os atletas posicionados.</p>
                        <Link to="/jogos?view=OPERACAO&subView=ESCALACAO" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-black text-white hover:bg-red-700">
                          Ir para escalação
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </article>

          <article className="relative overflow-hidden rounded-lg border border-red-200 bg-white shadow-[0_18px_42px_rgba(127,29,29,0.18)]">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-red-600" />
            <div className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
              <span className="grid size-14 place-items-center rounded-lg bg-red-600 text-white shadow-[0_14px_28px_rgba(220,38,38,0.28)]">
                <Megaphone size={28} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black leading-tight text-slate-950">Mensalidade {selectedMonth}</h3>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-red-700">Destaque</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {data.monthlyFeeAlert.lateCount} em atraso, {data.monthlyFeeAlert.pendingCount} pendentes neste período.
                </p>
              </div>
              <div className="rounded-lg bg-red-600 px-6 py-4 text-center text-white shadow-[0_14px_28px_rgba(220,38,38,0.24)] sm:min-w-[15rem]">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/75">Em aberto</p>
                <strong className="mt-2 block whitespace-nowrap text-3xl font-black leading-none text-white">{formatCurrency(data.monthlyFeeAlert.amountCents)}</strong>
              </div>
            </div>
          </article>

          <article id="dashboard-avisos" className={`rounded-lg border bg-[#1d1e26] p-4 shadow-[0_18px_42px_rgba(3,7,18,0.24)] sm:p-5 ${focusAvisos ? "border-red-400/60 ring-2 ring-red-400/45" : "border-white/10"}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-white">Avisos</h3>
              <Link to="/relatorios" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-200 hover:bg-white/10">
                Ver todos
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {dashboardAlerts.map((alert, index) => (
                <Link key={`${alert.title}-${index}`} to={dashboardAlertLink(alert, index)} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/8 bg-white/[0.04] p-3 transition hover:-translate-y-0.5 hover:border-red-400/40 hover:bg-white/[0.08]">
                  <span className={`grid size-10 place-items-center rounded-full ${index === 0 ? (isLightTheme ? "bg-red-100 text-red-700" : "bg-red-500/15 text-red-300") : (isLightTheme ? "bg-slate-100 text-slate-700" : "bg-white/8 text-slate-300")}`}>
                    {index === 0 ? <BellRing size={18} /> : <ReceiptText size={18} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{alert.title}</p>
                    <p className="truncate text-xs font-semibold text-slate-400">{alert.subtitle}</p>
                  </div>
                  <span className="hidden rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-black text-slate-200 sm:inline-flex">
                    {dashboardAlertAction(alert)}
                  </span>
                </Link>
              ))}
            </div>
          </article>
        </div>

        <aside className="min-w-0 space-y-4">
          <article className="rounded-lg bg-white p-4 text-slate-950 shadow-[0_20px_44px_rgba(3,7,18,0.18)] sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <Trophy size={28} className="text-amber-500" />
              <h3 className="text-lg font-black">Ranking de Presença</h3>
            </div>

            <ul className="divide-y divide-slate-100">
              {presenceRanking.map((person) => (
                <li key={person.id}>
                  <Link to={`/atletas/${person.id}/perfil`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 transition hover:bg-slate-50">
                  <Avatar person={person} className="size-11 ring-slate-100" accentColor="#ef3340" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{person.name}</p>
                <p className="truncate text-xs font-semibold text-slate-400">{personStatusLabel(person.status)} - {person.confirmedCount}/{person.totalMatches} jogos</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shirt size={18} className="text-red-500" />
                    <strong className="text-lg font-black text-slate-950">{person.presencePercent}%</strong>
                  </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Link to="/jogos?view=OPERACAO&subView=ESCALACAO" className={`mt-4 ${subtleButtonClass} h-11 w-full`}>
              Gerenciar Convocação
            </Link>
          </article>

          <article className="rounded-lg bg-white p-4 text-slate-950 shadow-[0_20px_44px_rgba(3,7,18,0.16)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CircleDollarSign size={20} className="text-green-600" />
                <h3 className="text-base font-black">Situação Financeira</h3>
              </div>
              <Link to="/financeiro" className={`rounded-lg px-3 py-2 text-xs font-black ${isLightTheme ? "bg-slate-100 text-slate-800 hover:bg-slate-200" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                Ver todos
              </Link>
            </div>

            <div className="grid items-center gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[9rem_minmax(0,1fr)]">
              <div className="relative h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={normalizedFinancialPie} dataKey="value" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2}>
                      {normalizedFinancialPie.map((item, index) => (
                        <Cell key={item.name} fill={financialPie.length > 0 ? financialColors[index % financialColors.length] : "#e5e7eb"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} itemStyle={{ color: darkTooltip ? "#e2e8f0" : "#0f172a" }} labelStyle={{ color: darkTooltip ? "#94a3b8" : "#334155" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Saldo</p>
                    <strong className="text-sm font-black">{formatCurrency(data.balanceCents)}</strong>
                  </div>
                </div>
              </div>

              <div className="min-h-36">
                <ResponsiveContainer width="100%" height={144}>
                  <BarChart data={data.monthlySeries} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} itemStyle={{ color: darkTooltip ? "#e2e8f0" : "#0f172a" }} labelStyle={{ color: darkTooltip ? "#94a3b8" : "#334155" }} />
                    <Bar dataKey="revenueCents" name="Receitas" fill="#30b84a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenseCents" name="Despesas" fill="#ef3340" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link to="/financeiro?view=OPERACAO&tab=LANCAMENTOS&type=INCOME" className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">
                Ver histórico de receitas
              </Link>
              <Link to="/financeiro?view=OPERACAO&tab=LANCAMENTOS&type=EXPENSE" className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100">
                Ver histórico de despesas
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
              {data.expenseComposition.slice(0, 4).map((item, index) => (
                <div key={item.category} className="flex min-w-0 items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: financialColors[index % financialColors.length] }} />
                  <span className="truncate">{formatFinancialCategory(item.category)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg bg-white p-4 text-slate-950 shadow-[0_20px_44px_rgba(3,7,18,0.14)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-black">Lançamentos</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400">{selectedMonth}</span>
                <Link to="/financeiro?view=OPERACAO&tab=LANCAMENTOS" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">
                  Ir para financeiro
                </Link>
              </div>
            </div>
            {data.recentFinancialEntries.length > 0 ? (
              <ul className="space-y-3">
              {recentFinancialEntries.map((entry) => (
                  <li key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{entry.description}</p>
                      <p className="truncate text-xs font-semibold text-slate-400">{formatFinancialCategory(entry.category)}</p>
                    </div>
                    <strong className={entry.type === "INCOME" ? "text-sm font-black text-green-600" : "text-sm font-black text-red-600"}>{formatCurrency(entry.amountCents)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Sem lançamentos financeiros para o período.</div>
            )}
          </article>
        </aside>
      </div>
    </section>
  );
}
