import { useEffect, useMemo, useState } from"react";
import { useMutation, useQuery, useQueryClient } from"@tanstack/react-query";
import { Link, useLocation, useNavigate } from"react-router-dom";
import { Check, Palette, Settings, ShieldCheck, Shuffle, Upload, UserPlus } from"lucide-react";
import { apiRequest } from"../services/api";
import { toast } from "../components/ui/toast-store";
import { useTheme } from "../hooks/useTheme";
import { getTenantBasename } from "../utils/tenantPath";
import { analyzeTeamKitHarmony, encodeTeamKit, parseTeamKit, type CenterBarsVariant, type ShirtStyleDirection, type UniformStyle } from "../utils/teamColors";
import { TeamColorCard } from "../components/ui/TeamColorCard";
import { ShirtConfigurator } from "../components/ui/ShirtConfigurator";
import { AssociatesOverview } from "./associates/AssociatesOverview";
import { AssociateEditor, type AssociateFormState } from "./associates/AssociateEditor";
import { AssociatesList } from "./associates/AssociatesList";
import { AssociateJoinRequests } from "./associates/AssociateJoinRequests";
import { InvitationRequestsList } from "./invitations/InvitationRequestsList";
import { AuditTrail } from "./audit/AuditTrail";
import { GoalkeepersSettingsPanel } from "./goalkeepers/GoalkeepersSettingsPanel";
import { ENTERPRISE_PROFILES, PERMISSION_AREAS, ROLE_LABELS, roleListLabel } from "../security/permissions";
import type {
  Associate,
  AssociateStatus,
  AthleteProfile,
  AthletePosition,
  AthleteStatus,
  BoardRole,
  GroupSettings,
  JoinRequest,
  ManagedUser,
  AuditLog,
  PaymentSettings,
  TenantBrandingSettings,
  UserRole
} from"../types/domain";
import { GamesPage } from "./games/GamesPage";
import {
  DEFAULT_RED_UNIFORM_COLOR,
  DEFAULT_RED_UNIFORM_NAME,
  DEFAULT_WHITE_SLEEVE_COLOR,
  DEFAULT_WHITE_UNIFORM_COLOR,
  DEFAULT_WHITE_UNIFORM_NAME,
  centerBarsOptions,
  directionalStyles,
  shirtFillModeForKit,
  shirtFillOptions,
  stripeStyles,
  uniformColorHex,
  uniformModelOptions,
  type ShirtFillMode
} from "./games/gameUniformHelpers";

const ASSOCIATES_PAGE_SIZE = 10;
const defaultPlayersPerTeam = 11;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format((cents || 0) / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" }).format(new Date(value));
}

const associateStatusHelp: Record<AssociateStatus, { label: string; description: string; badge: string }> = {
  ACTIVE: {
    label: "Ativo",
    description: "Mensalidade em dia e participação liberada.",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  LATE: {
    label: "Atrasado",
    description: "Mensalidade pendente; requer regularização.",
    badge: "bg-amber-50 text-amber-700 border-amber-200"
  },
  INACTIVE: {
    label: "Inativo",
    description: "Cadastro pausado, fora da rotina atual.",
    badge: "bg-slate-100 text-slate-700 border-slate-200"
  }
};

const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: ROLE_LABELS.SUPERADMIN,
  ADMIN: ROLE_LABELS.ADMIN,
  SPORTS_DIRECTOR: ROLE_LABELS.SPORTS_DIRECTOR,
  ASSOCIATE: ROLE_LABELS.ASSOCIATE,
  ATHLETE: ROLE_LABELS.ATHLETE,
  FINANCIAL: ROLE_LABELS.FINANCIAL
};

const athletePositionLabels: Record<AthletePosition, string> = {
  GOALKEEPER:"Goleiro",
  DEFENDER:"Zagueiro",
  FULLBACK:"Lateral",
  MIDFIELDER:"Meia",
  FORWARD:"Atacante",
  LINE:"Linha",
  BOTH:"Goleiro/Linha",
  RIGHT_BACK:"Lateral direito",
  LEFT_BACK:"Lateral esquerdo",
  DEFENSIVE_MIDFIELDER:"Volante",
  CENTRAL_MIDFIELDER:"Meia central",
  ATTACKING_MIDFIELDER:"Meia atacante",
  RIGHT_WINGER:"Ponta direita",
  LEFT_WINGER:"Ponta esquerda",
  STRIKER:"Centroavante"
};

function toCents(value: string) {
  return Math.round(Number(value.replace(/\./g,"").replace(",",".")) * 100);
}

export function AssociadosPageReal() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [editorTarget, setEditorTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AssociateStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<AssociateFormState>({
    name:"",
    email:"",
    phone:"",
    monthlyFeeBRL:"60,00",
    status:"ACTIVE" as AssociateStatus,
    boardRoleId:"",
    joinDate:""
  });

  const associatesQuery = useQuery({
    queryKey: ["associates"],
    queryFn: () => apiRequest<Associate[]>("/associates")
  });

  const joinRequestsQuery = useQuery({
    queryKey: ["group-join-requests", "associates-page"],
    queryFn: () => apiRequest<JoinRequest[]>("/group/join-requests")
  });

  const boardRolesQuery = useQuery({
    queryKey: ["board-roles"],
    queryFn: () => apiRequest<BoardRole[]>("/board-roles")
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: () =>
      apiRequest<Associate & { prorataApplied?: boolean; prorataFeeCents?: number }>(editorTarget && editorTarget !== "new" ? `/associates/${editorTarget}` :"/associates", {
        method: editorTarget && editorTarget !== "new" ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          monthlyFeeCents: toCents(form.monthlyFeeBRL) || 6000,
          status: form.status,
          boardRoleId: form.boardRoleId || undefined,
          ...(!editorTarget || editorTarget === "new" ? { joinDate: form.joinDate || undefined } : {})
        })
      }),
    onSuccess: (response) => {
        setEditorTarget(null);
      setForm({ name:"", email:"", phone:"", monthlyFeeBRL:"60,00", status:"ACTIVE", boardRoleId:"", joinDate:"" });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
      if (response.prorataApplied) {
        toast.info(`Mensalidade do 1º mês gerada com pro-rata: R$ ${(response.prorataFeeCents! / 100).toFixed(2).replace(".", ",")}`);
      }
        navigate("/associados");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (associateId: string) =>
      apiRequest<void>(`/associates/${associateId}`, {
        method:"DELETE"
      }),
    onSuccess: () => {
      if (editorTarget) {
        setEditorTarget(null);
        setForm({ name:"", email:"", phone:"", monthlyFeeBRL:"60,00", status:"ACTIVE", boardRoleId:"", joinDate:"" });
      }
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
    }
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ associateId, status }: { associateId: string; status: AssociateStatus }) =>
      apiRequest<Associate>(`/associates/${associateId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const promoteMutation = useMutation({
    mutationFn: (associate: Associate) =>
      apiRequest<AthleteProfile>("/athletes", {
        method:"POST",
        body: JSON.stringify({
          name: associate.name,
          position:"CENTRAL_MIDFIELDER" as AthletePosition,
          linkType:"ASSOCIATE",
          status: (associate.status ==="ACTIVE" ? "ACTIVE" : "DELINQUENT") as AthleteStatus,
          rating: 3,
          associateId: associate.id
        })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const requestStatusMutation = useMutation({
    mutationFn: ({ request, status }: { request: JoinRequest; status:"APPROVED" |"REJECTED" }) =>
      apiRequest<JoinRequest>(`/group/join-requests/${request.id}/status`, {
        method:"PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-join-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  const updateStatusFilter = (nextStatus: "ALL" | AssociateStatus) => {
    setStatusFilter(nextStatus);

    const params = new URLSearchParams(location.search);
    if (nextStatus === "ALL") {
      params.delete("status");
    } else {
      params.set("status", nextStatus);
    }

    const nextSearch = params.toString();
    navigate(`/associados${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
  };

  const associates = associatesQuery.data ?? [];
  const joinRequests = joinRequestsQuery.data ?? [];
  const pendingJoinRequests = joinRequests.filter((request) => request.status === "PENDING");
  const searchedAssociates = associates.filter((associate) => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    return [associate.name, associate.email ?? "", associate.phone ?? ""].some((value) => value.toLowerCase().includes(normalized));
  });
  const filteredAssociates = searchedAssociates.filter((associate) => statusFilter === "ALL" || associate.status === statusFilter);
  const totalAssociatePages = Math.max(1, Math.ceil(filteredAssociates.length / ASSOCIATES_PAGE_SIZE));
  const normalizedAssociatePage = Math.min(currentPage, totalAssociatePages);
  const associatePageStart = (normalizedAssociatePage - 1) * ASSOCIATES_PAGE_SIZE;
  const associatePageEnd = Math.min(associatePageStart + ASSOCIATES_PAGE_SIZE, filteredAssociates.length);
  const paginatedAssociates = filteredAssociates.slice(associatePageStart, associatePageEnd);
  const active = associates.filter((associate) => associate.status ==="ACTIVE").length;
  const late = associates.filter((associate) => associate.status ==="LATE").length;
  const inactive = associates.filter((associate) => associate.status ==="INACTIVE").length;
  const athletesLinked = associates.filter((associate) => associate.athlete).length;
  const monthlyTotal = associates.reduce((total, associate) => total + associate.monthlyFeeCents, 0);
  const activeMonthlyTotal = associates.filter((associate) => associate.status === "ACTIVE").reduce((total, associate) => total + associate.monthlyFeeCents, 0);
  const lateMonthlyTotal = associates.filter((associate) => associate.status === "LATE").reduce((total, associate) => total + associate.monthlyFeeCents, 0);
  const withoutContact = associates.filter((associate) => !associate.email && !associate.phone).length;
  const withoutAthleteProfile = associates.filter((associate) => !associate.athlete).length;
  const associationHealthPercent = associates.length > 0 ? Math.round((active / associates.length) * 100) : 100;
  const athleteConversionPercent = associates.length > 0 ? Math.round((athletesLinked / associates.length) * 100) : 0;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editParam = params.get("edit");
    setEditorTarget(editParam === "new" || (editParam && editParam.length > 0) ? editParam : null);

    const statusParam = params.get("status");
    if (statusParam === "ALL" || statusParam === "ACTIVE" || statusParam === "LATE" || statusParam === "INACTIVE") {
      setStatusFilter((current) => (current === statusParam ? current : statusParam));
    } else {
      setStatusFilter((current) => (current === "ALL" ? current : "ALL"));
    }
  }, [location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (currentPage > totalAssociatePages) {
      setCurrentPage(totalAssociatePages);
    }
  }, [currentPage, totalAssociatePages]);

  const selectedAssociate = editorTarget && editorTarget !== "new" ? associates.find((associate) => associate.id === editorTarget) ?? null : null;

  return (
    <section className="min-w-0 space-y-4">
      {editorTarget ? (
        <AssociateEditor
          form={form}
          boardRoles={boardRolesQuery.data ?? []}
          editing={Boolean(selectedAssociate)}
          saving={createOrUpdateMutation.isPending}
          onChange={setForm}
          onCancel={() => {
            setEditorTarget(null);
            setForm({ name:"", email:"", phone:"", monthlyFeeBRL:"60,00", status:"ACTIVE", boardRoleId:"", joinDate:"" });
            navigate("/associados");
          }}
          onSubmit={() => void createOrUpdateMutation.mutateAsync()}
        />
      ) : (
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Comunidade</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Associados</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Cadastro, mensalidade, função no clube e vínculo com atleta em uma visão única.</p>
            </div>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white shadow-sm hover:bg-red-700"
              onClick={() => {
                setEditorTarget("new");
                setForm({ name:"", email:"", phone:"", monthlyFeeBRL:"60,00", status:"ACTIVE", boardRoleId:"", joinDate:"" });
                navigate("/associados?edit=new");
              }}
            >
              <UserPlus size={16} />
              Novo associado
            </button>
          </div>

          <AssociatesOverview
            active={active}
            late={late}
            inactive={inactive}
            athletesLinked={athletesLinked}
            associatesTotal={associates.length}
            monthlyTotal={monthlyTotal}
            activeMonthlyTotal={activeMonthlyTotal}
            lateMonthlyTotal={lateMonthlyTotal}
            withoutContact={withoutContact}
            withoutAthleteProfile={withoutAthleteProfile}
            pendingJoinRequests={pendingJoinRequests.length}
            associationHealthPercent={associationHealthPercent}
            athleteConversionPercent={athleteConversionPercent}
            onShowLate={() => updateStatusFilter("LATE")}
            onClearSearch={() => setSearch("")}
          />

          <AssociateJoinRequests
            requests={pendingJoinRequests}
            totalRequests={joinRequests.length}
            updating={requestStatusMutation.isPending}
            onReview={(request, status) => void requestStatusMutation.mutateAsync({ request, status })}
          />

          <AssociatesList
            associates={paginatedAssociates}
            search={search}
            statusFilter={statusFilter}
            statusCounts={{ ACTIVE: active, LATE: late, INACTIVE: inactive }}
            loading={associatesQuery.isLoading}
            actionsPending={quickStatusMutation.isPending || promoteMutation.isPending || deleteMutation.isPending}
            page={normalizedAssociatePage}
            totalPages={totalAssociatePages}
            pageStart={associatePageStart}
            pageEnd={associatePageEnd}
            filteredTotal={filteredAssociates.length}
            pageSize={ASSOCIATES_PAGE_SIZE}
            onSearchChange={setSearch}
            onStatusChange={updateStatusFilter}
            onPageChange={setCurrentPage}
            onStatusUpdate={(associateId, status) => void quickStatusMutation.mutateAsync({ associateId, status })}
            onPromote={(associate) => void promoteMutation.mutateAsync(associate)}
            onEdit={(associate) => {
              setEditorTarget(associate.id);
              setForm({
                name: associate.name,
                email: associate.email ?? "",
                phone: associate.phone ?? "",
                monthlyFeeBRL: String((associate.monthlyFeeCents / 100).toFixed(2)).replace(".", ","),
                status: associate.status,
                boardRoleId: associate.boardRoleId ?? "",
                joinDate: ""
              });
              navigate(`/associados?edit=${associate.id}`);
            }}
            onDelete={(associate) => {
              if (window.confirm(`Deseja excluir o associado ${associate.name}`)) {
                void deleteMutation.mutateAsync(associate.id);
              }
            }}
          />
        </article>
      )}
    </section>
  );
}

export function ConvitesPageReal() {
  const queryClient = useQueryClient();
  const [settingsForm, setSettingsForm] = useState<Partial<{
    closedMode: boolean;
    inviteCode: string;
  }>>({});

  const settingsQuery = useQuery({
    queryKey: ["group-settings"],
    queryFn: () => apiRequest<GroupSettings>("/group/settings")
  });

  const requestsQuery = useQuery({
    queryKey: ["group-join-requests"],
    queryFn: () => apiRequest<JoinRequest[]>("/group/join-requests")
  });

  const settings = settingsQuery.data;
  const currentSettingsForm = {
    closedMode: settingsForm.closedMode ?? settings?.closedMode ?? true,
    inviteCode: settingsForm.inviteCode ?? settings?.inviteCode ?? ""
  };
  const inviteBaseUrl = typeof window !== "undefined" ? `${window.location.origin}${getTenantBasename() ?? ""}` : "";
  const inviteLink = currentSettingsForm.inviteCode && inviteBaseUrl ? `${inviteBaseUrl}/convite?codigo=${encodeURIComponent(currentSettingsForm.inviteCode)}` : "";
  const requests = requestsQuery.data ?? [];
  const pending = requests.filter((request) => request.status === "PENDING");
  const approved = requests.filter((request) => request.status === "APPROVED");
  const rejected = requests.filter((request) => request.status === "REJECTED");
  const hasSettingsChanges = settingsQuery.isSuccess && (
    currentSettingsForm.closedMode !== (settings?.closedMode ?? true) ||
    currentSettingsForm.inviteCode !== (settings?.inviteCode ?? "")
  );

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      apiRequest<GroupSettings>("/group/settings", {
        method: "PATCH",
        body: JSON.stringify({
          closedMode: currentSettingsForm.closedMode,
          inviteCode: currentSettingsForm.inviteCode || null
        })
      }),
    onSuccess: (nextSettings) => {
      setSettingsForm({
        closedMode: nextSettings.closedMode,
        inviteCode: nextSettings.inviteCode ?? ""
      });
      queryClient.setQueryData(["group-settings"], nextSettings);
      void queryClient.invalidateQueries({ queryKey: ["group-settings"] });
    }
  });

  const requestStatusMutation = useMutation({
    mutationFn: ({ request, status }: { request: JoinRequest; status: "APPROVED" | "REJECTED" }) =>
      apiRequest<JoinRequest>(`/group/join-requests/${request.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["group-join-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });

  return (
    <section className="min-w-0 space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Pendentes", value: pending.length, helper: "Aguardam análise", className: "text-amber-700" },
            { label: "Aprovados", value: approved.length, helper: "Viraram associados", className: "text-emerald-700" },
            { label: "Rejeitados", value: rejected.length, helper: "Não convertidos", className: "text-slate-700" },
            { label: "Total", value: requests.length, helper: "Histórico de convites", className: "text-slate-950" }
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-bold text-slate-500">{item.label}</p>
              <strong className={`mt-1 block truncate text-2xl font-black ${item.className}`}>{item.value}</strong>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{item.helper}</p>
            </div>
          ))}
        </div>

        <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Link de convite</h2>
              <p className="text-sm text-slate-500">Controle o código público e acompanhe solicitações de entrada.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-700">{currentSettingsForm.closedMode ? "Grupo fechado" : "Grupo aberto"}</span>
          </div>

          <form className="grid gap-3 lg:grid-cols-[12rem_minmax(0,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); void saveSettingsMutation.mutateAsync(); }}>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="size-4 accent-red-600" checked={currentSettingsForm.closedMode} onChange={(event) => setSettingsForm((prev) => ({ ...prev, closedMode: event.target.checked }))} />
              Grupo fechado
            </label>
            <label className="min-w-0 text-sm font-medium text-slate-600">
              Código
              <input className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" value={currentSettingsForm.inviteCode} onChange={(event) => setSettingsForm((prev) => ({ ...prev, inviteCode: event.target.value }))} />
            </label>
            <button type="submit" disabled={!hasSettingsChanges || saveSettingsMutation.isPending} className="self-end rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
              {saveSettingsMutation.isPending ? "Salvando..." : "Salvar convite"}
            </button>
          </form>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={inviteLink} readOnly placeholder="Informe um código de convite" />
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={!inviteLink} onClick={() => void navigator.clipboard.writeText(inviteLink)}>
              Copiar link
            </button>
          </div>
        </section>

        <InvitationRequestsList
          requests={requests}
          pendingCount={pending.length}
          loading={requestsQuery.isLoading}
          updating={requestStatusMutation.isPending}
          onRefresh={() => void requestsQuery.refetch()}
          onReview={(request, status) => void requestStatusMutation.mutateAsync({ request, status })}
        />
      </article>
    </section>
  );
}

const auditRoleLabels: Record<UserRole, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  SPORTS_DIRECTOR: "Diretor de esportes",
  ASSOCIATE: "Associado",
  ATHLETE: "Atleta",
  FINANCIAL: "Financeiro"
};

const auditActionLabels: Record<string, string> = {
  "create:athletes": "Criou/sorteou atleta",
  "update:athletes": "Atualizou atleta",
  "delete:athletes": "Removeu atleta",
  "create:sports": "Criou jogo/escalação/evento",
  "update:sports": "Atualizou jogo/escalação",
  "delete:sports": "Removeu jogo/escalação/evento",
  "create:finance": "Criou cobrança/financeiro",
  "update:finance": "Atualizou financeiro",
  "delete:finance": "Removeu financeiro",
  "create:goalkeepers": "Criou contrato de goleiro",
  "update:goalkeepers": "Atualizou contrato de goleiro",
  "delete:goalkeepers": "Removeu contrato de goleiro",
  "update:group": "Atualizou configurações",
  "create:group": "Criou convite",
  "update:auth": "Atualizou usuário/acesso",
  "create:auth": "Criou usuário",
  "update:athlete": "Atleta confirmou/alterou dados",
  "create:athlete": "Atleta gerou pagamento"
};

function auditActionLabel(action: string) {
  return auditActionLabels[action] ?? action;
}

type ConfiguracoesPageRealProps = {
  initialSection?: "club" | "appearance" | "uniforms" | "team" | "pix" | "billing" | "board" | "profiles" | "audit";
  standaloneUniforms?: boolean;
};

const UI_MENU_STYLE_KEY = "gestasports-ui-menu-style";
const UI_EFFECTS_KEY = "gestasports-ui-effects";
const MAX_BRANDING_LOGO_SIZE = 512;

type MenuStylePreference = "brand" | "light" | "glass";
type EffectsPreference = "full" | "soft" | "minimal";

function readMenuStylePreference(): MenuStylePreference {
  const value = localStorage.getItem(UI_MENU_STYLE_KEY);
  return value === "light" || value === "glass" ? value : "brand";
}

function readEffectsPreference(): EffectsPreference {
  const value = localStorage.getItem(UI_EFFECTS_KEY);
  return value === "full" || value === "minimal" ? value : "soft";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Arquivo de imagem inválido."));
    image.src = dataUrl;
  });
}

async function optimizeLogoDataUrl(file: File) {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const scale = Math.min(1, MAX_BRANDING_LOGO_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível otimizar a imagem.");
  }

  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/png");
}


export function AuditoriaPageReal() {
  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiRequest<AuditLog[]>("/audit-logs?limit=120")
  });

  const logs = auditLogsQuery.data ?? [];
  const errors = logs.filter((log) => log.statusCode >= 400).length;
  const users = new Set(logs.map((log) => log.userEmail).filter(Boolean)).size;
  const systemActions = logs.filter((log) => !log.userName).length;

  return (
    <AuditTrail
      logs={logs}
      userCount={users}
      errorCount={errors}
      systemActionCount={systemActions}
      loading={auditLogsQuery.isLoading}
      onRefresh={() => void auditLogsQuery.refetch()}
      getActionLabel={auditActionLabel}
      getRoleLabel={(role) => auditRoleLabels[role]}
    />
  );
}


export function GoleirosPageReal() {
  return <GoalkeepersSettingsPanel />;
}

export function JogosPageReal() {
  return <GamesPage />;
}

export function ConfiguracoesPageReal({ initialSection = "club", standaloneUniforms = false }: ConfiguracoesPageRealProps = {}) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [configSection, setConfigSection] = useState<"club" | "appearance" | "uniforms" | "team" | "pix" | "billing" | "board" | "profiles" | "audit">(initialSection);
  const [menuStylePreference, setMenuStylePreference] = useState<MenuStylePreference>(readMenuStylePreference);
  const [effectsPreference, setEffectsPreference] = useState<EffectsPreference>(readEffectsPreference);
  const [settingsForm, setSettingsForm] = useState<Partial<{
    groupName: string;
    organizationType: string;
    foundedAt: string;
    foundationYear: string;
    documentNumber: string;
    phone: string;
    email: string;
    websiteUrl: string;
    address: string;
    addressNumber: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    history: string;
    playersPerTeam: string;
    closedMode: boolean;
    inviteCode: string;
    uniform1Name: string;
    uniform1Season: string;
    uniform1Color: string;
    uniform1ImageUrl: string;
    uniform2Name: string;
    uniform2Season: string;
    uniform2Color: string;
    uniform2ImageUrl: string;
  }>>({});
  const [pixSettingsForm, setPixSettingsForm] = useState<Partial<{
    paymentMode: PaymentSettings["paymentMode"];
    paymentProvider: PaymentSettings["paymentProvider"];
    providerEnvironment: PaymentSettings["providerEnvironment"];
    providerApiKey: string;
    providerClientId: string;
    providerClientSecret: string;
    providerWebhookSecret: string;
    providerWebhookUrl: string;
    autoSettleEnabled: boolean;
    pixKey: string;
    pixReceiverName: string;
    pixCity: string;
    pixAutoSettleSeconds: string;
    monthlyDueDay: string;
    lateFeeBRL: string;
    lateFeePercent: string;
  }>>({});
  const [tenantBrandingForm, setTenantBrandingForm] = useState<Partial<{
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl: string;
  }>>({});
  const [tenantLogoStatus, setTenantLogoStatus] = useState("");
  const [boardRoleForm, setBoardRoleForm] = useState({
    name: "",
    description: "",
    canAccessAdmin: false,
    canAccessFinancial: false,
    canAccessAthlete: false,
    isDefault: false
  });

  const settingsQuery = useQuery({
    queryKey: ["group-settings"],
    queryFn: () => apiRequest<GroupSettings>("/group/settings")
  });

  const pixSettingsQuery = useQuery({
    queryKey: ["finance-pix-settings"],
    queryFn: () => apiRequest<PaymentSettings>("/finance/pix-settings")
  });

  const tenantBrandingQuery = useQuery({
    queryKey: ["tenant-branding"],
    queryFn: () => apiRequest<TenantBrandingSettings>("/tenant/branding")
  });

  const boardRolesQuery = useQuery({
    queryKey: ["board-roles"],
    queryFn: () => apiRequest<BoardRole[]>("/board-roles")
  });

  const settings = settingsQuery.data;
  const pixSettings = pixSettingsQuery.data;
  const currentSettingsForm = {
    groupName: settingsForm.groupName ?? settings?.groupName ?? "GestaSports",
    organizationType: settingsForm.organizationType ?? settings?.organizationType ?? "ASSOCIACAO",
    foundedAt: settingsForm.foundedAt ?? (settings?.foundedAt ? settings.foundedAt.slice(0, 10) : ""),
    foundationYear: settingsForm.foundationYear ?? (settings?.foundationYear ? String(settings.foundationYear) : ""),
    documentNumber: settingsForm.documentNumber ?? settings?.documentNumber ?? "",
    phone: settingsForm.phone ?? settings?.phone ?? "",
    email: settingsForm.email ?? settings?.email ?? "",
    websiteUrl: settingsForm.websiteUrl ?? settings?.websiteUrl ?? "",
    address: settingsForm.address ?? settings?.address ?? "",
    addressNumber: settingsForm.addressNumber ?? settings?.addressNumber ?? "",
    neighborhood: settingsForm.neighborhood ?? settings?.neighborhood ?? "",
    city: settingsForm.city ?? settings?.city ?? "",
    state: settingsForm.state ?? settings?.state ?? "",
    postalCode: settingsForm.postalCode ?? settings?.postalCode ?? "",
    country: settingsForm.country ?? settings?.country ?? "Brasil",
    history: settingsForm.history ?? settings?.history ?? "",
    playersPerTeam: settingsForm.playersPerTeam ?? String(settings?.playersPerTeam ?? defaultPlayersPerTeam),
    closedMode: settingsForm.closedMode ?? settings?.closedMode ?? true,
    inviteCode: settingsForm.inviteCode ?? settings?.inviteCode ?? "",
    uniform1Name: settingsForm.uniform1Name ?? settings?.uniform1Name ?? DEFAULT_RED_UNIFORM_NAME,
    uniform1Season: settingsForm.uniform1Season ?? settings?.uniform1Season ?? `${new Date().getFullYear()}`,
    uniform1Color: settingsForm.uniform1Color ?? settings?.uniform1Color ?? DEFAULT_RED_UNIFORM_COLOR,
    uniform1ImageUrl: settingsForm.uniform1ImageUrl ?? settings?.uniform1ImageUrl ?? "",
    uniform2Name: settingsForm.uniform2Name ?? settings?.uniform2Name ?? DEFAULT_WHITE_UNIFORM_NAME,
    uniform2Season: settingsForm.uniform2Season ?? settings?.uniform2Season ?? `${new Date().getFullYear()}`,
    uniform2Color: settingsForm.uniform2Color ?? settings?.uniform2Color ?? DEFAULT_WHITE_UNIFORM_COLOR,
    uniform2ImageUrl: settingsForm.uniform2ImageUrl ?? settings?.uniform2ImageUrl ?? ""
  };
  const uniform1Kit = parseTeamKit(currentSettingsForm.uniform1Color, DEFAULT_RED_UNIFORM_COLOR);
  const parsedUniform2Kit = parseTeamKit(currentSettingsForm.uniform2Color, DEFAULT_WHITE_UNIFORM_COLOR);
  const uniform2Kit = currentSettingsForm.uniform2Color.trim().startsWith("kitj:") ?
     parsedUniform2Kit
    : { ...parsedUniform2Kit, sleeveColor: DEFAULT_WHITE_SLEEVE_COLOR };
  const savedUniform1Kit = parseTeamKit(settings?.uniform1Color, DEFAULT_RED_UNIFORM_COLOR);
  const parsedSavedUniform2Kit = parseTeamKit(settings?.uniform2Color, DEFAULT_WHITE_UNIFORM_COLOR);
  const savedUniform2Kit = (settings?.uniform2Color ?? "").trim().startsWith("kitj:") ?
     parsedSavedUniform2Kit
    : { ...parsedSavedUniform2Kit, sleeveColor: DEFAULT_WHITE_SLEEVE_COLOR };
  const savedSettingsSnapshot = {
    groupName: settings?.groupName ?? "GestaSports",
    organizationType: settings?.organizationType ?? "ASSOCIACAO",
    foundedAt: settings?.foundedAt ? settings.foundedAt.slice(0, 10) : "",
    foundationYear: settings?.foundationYear ? String(settings.foundationYear) : "",
    documentNumber: settings?.documentNumber ?? "",
    phone: settings?.phone ?? "",
    email: settings?.email ?? "",
    websiteUrl: settings?.websiteUrl ?? "",
    address: settings?.address ?? "",
    addressNumber: settings?.addressNumber ?? "",
    neighborhood: settings?.neighborhood ?? "",
    city: settings?.city ?? "",
    state: settings?.state ?? "",
    postalCode: settings?.postalCode ?? "",
    country: settings?.country ?? "Brasil",
    history: settings?.history ?? "",
    playersPerTeam: String(settings?.playersPerTeam ?? defaultPlayersPerTeam),
    closedMode: settings?.closedMode ?? true,
    inviteCode: settings?.inviteCode ?? "",
    uniform1Name: settings?.uniform1Name ?? DEFAULT_RED_UNIFORM_NAME,
    uniform1Season: settings?.uniform1Season ?? `${new Date().getFullYear()}`,
    uniform1Color: encodeTeamKit(savedUniform1Kit.primary, savedUniform1Kit.accent, savedUniform1Kit.style, savedUniform1Kit),
    uniform1ImageUrl: settings?.uniform1ImageUrl ?? "",
    uniform2Name: settings?.uniform2Name ?? DEFAULT_WHITE_UNIFORM_NAME,
    uniform2Season: settings?.uniform2Season ?? `${new Date().getFullYear()}`,
    uniform2Color: encodeTeamKit(savedUniform2Kit.primary, savedUniform2Kit.accent, savedUniform2Kit.style, savedUniform2Kit),
    uniform2ImageUrl: settings?.uniform2ImageUrl ?? ""
  };
  const currentSettingsSnapshot = {
    groupName: currentSettingsForm.groupName,
    organizationType: currentSettingsForm.organizationType,
    foundedAt: currentSettingsForm.foundedAt,
    foundationYear: currentSettingsForm.foundationYear,
    documentNumber: currentSettingsForm.documentNumber,
    phone: currentSettingsForm.phone,
    email: currentSettingsForm.email,
    websiteUrl: currentSettingsForm.websiteUrl,
    address: currentSettingsForm.address,
    addressNumber: currentSettingsForm.addressNumber,
    neighborhood: currentSettingsForm.neighborhood,
    city: currentSettingsForm.city,
    state: currentSettingsForm.state,
    postalCode: currentSettingsForm.postalCode,
    country: currentSettingsForm.country,
    history: currentSettingsForm.history,
    playersPerTeam: currentSettingsForm.playersPerTeam,
    closedMode: currentSettingsForm.closedMode,
    inviteCode: currentSettingsForm.inviteCode,
    uniform1Name: currentSettingsForm.uniform1Name,
    uniform1Season: currentSettingsForm.uniform1Season,
    uniform1Color: encodeTeamKit(uniform1Kit.primary, uniform1Kit.accent, uniform1Kit.style, uniform1Kit),
    uniform1ImageUrl: currentSettingsForm.uniform1ImageUrl,
    uniform2Name: currentSettingsForm.uniform2Name,
    uniform2Season: currentSettingsForm.uniform2Season,
    uniform2Color: encodeTeamKit(uniform2Kit.primary, uniform2Kit.accent, uniform2Kit.style, uniform2Kit),
    uniform2ImageUrl: currentSettingsForm.uniform2ImageUrl
  };
  const hasSettingsChanges = settingsQuery.isSuccess && JSON.stringify(currentSettingsSnapshot) !== JSON.stringify(savedSettingsSnapshot);
  const tenantBranding = tenantBrandingQuery.data;
  const currentTenantBrandingForm = {
    brandName: tenantBrandingForm.brandName ?? tenantBranding?.brandName ?? tenantBranding?.name ?? currentSettingsForm.groupName,
    primaryColor: tenantBrandingForm.primaryColor ?? tenantBranding?.primaryColor ?? "#08255b",
    secondaryColor: tenantBrandingForm.secondaryColor ?? tenantBranding?.secondaryColor ?? "#55ad32",
    accentColor: tenantBrandingForm.accentColor ?? tenantBranding?.accentColor ?? "#7ac943",
    logoUrl: tenantBrandingForm.logoUrl ?? tenantBranding?.logoUrl ?? ""
  };
  const foundationReferenceYear =
    Number(currentSettingsForm.foundationYear) ||
    (currentSettingsForm.foundedAt ? new Date(`${currentSettingsForm.foundedAt}T12:00:00`).getFullYear() : 0);
  const clubAgeYears = foundationReferenceYear > 0 ? Math.max(0, new Date().getFullYear() - foundationReferenceYear) : null;

  useEffect(() => {
    if (!tenantBranding) {
      return;
    }

    setMenuStylePreference(tenantBranding.menuStyle);
    setEffectsPreference(tenantBranding.interfaceEffects);
    localStorage.setItem(UI_MENU_STYLE_KEY, tenantBranding.menuStyle);
    localStorage.setItem(UI_EFFECTS_KEY, tenantBranding.interfaceEffects);
    window.dispatchEvent(new Event("gestasports-appearance-preferences"));
  }, [tenantBranding]);
  const normalizedUniform1Name = currentSettingsForm.uniform1Name.trim().toLowerCase();
  const normalizedUniform2Name = currentSettingsForm.uniform2Name.trim().toLowerCase();
  const hasDuplicateUniformNames = Boolean(normalizedUniform1Name && normalizedUniform1Name === normalizedUniform2Name);
  const currentPixSettingsForm = {
    paymentMode: pixSettingsForm.paymentMode ?? pixSettings?.paymentMode ?? "MANUAL_PIX",
    paymentProvider: pixSettingsForm.paymentProvider ?? pixSettings?.paymentProvider ?? "MANUAL_PIX",
    providerEnvironment: pixSettingsForm.providerEnvironment ?? pixSettings?.providerEnvironment ?? "TEST",
    providerApiKey: pixSettingsForm.providerApiKey ?? pixSettings?.providerApiKey ?? "",
    providerClientId: pixSettingsForm.providerClientId ?? pixSettings?.providerClientId ?? "",
    providerClientSecret: pixSettingsForm.providerClientSecret ?? pixSettings?.providerClientSecret ?? "",
    providerWebhookSecret: pixSettingsForm.providerWebhookSecret ?? pixSettings?.providerWebhookSecret ?? "",
    providerWebhookUrl: pixSettingsForm.providerWebhookUrl ?? pixSettings?.providerWebhookUrl ?? "",
    autoSettleEnabled: pixSettingsForm.autoSettleEnabled ?? pixSettings?.autoSettleEnabled ?? false,
    pixKey: pixSettingsForm.pixKey ?? pixSettings?.pixKey ?? "",
    pixReceiverName: pixSettingsForm.pixReceiverName ?? pixSettings?.pixReceiverName ?? "GestaSports",
    pixCity: pixSettingsForm.pixCity ?? pixSettings?.pixCity ?? "Florianopolis",
    pixAutoSettleSeconds: pixSettingsForm.pixAutoSettleSeconds ?? String(pixSettings?.pixAutoSettleSeconds ?? 20),
    monthlyDueDay: pixSettingsForm.monthlyDueDay ?? String(pixSettings?.monthlyDueDay ?? 10),
    lateFeeBRL: pixSettingsForm.lateFeeBRL ?? String(((pixSettings?.lateFeeCents ?? 0) / 100).toFixed(2)).replace(".", ","),
    lateFeePercent: pixSettingsForm.lateFeePercent ?? String(pixSettings?.lateFeePercent ?? 0)
  };

  function handleUniformImageUpload(field: "uniform1ImageUrl" |"uniform2ImageUrl", file: File | null) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSettingsForm((prev) => ({ ...prev, [field]: String(reader.result ?? "") }));
    };
    reader.readAsDataURL(file);
  }

  async function handleTenantLogoUpload(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setTenantLogoStatus("Selecione um arquivo de imagem.");
      return;
    }

    setTenantLogoStatus("Otimizando logo...");

    try {
      const logoUrl = await optimizeLogoDataUrl(file);
      const sizeInKb = Math.max(1, Math.round((logoUrl.length * 3) / 4 / 1024));
      setTenantBrandingForm((prev) => ({ ...prev, logoUrl }));
      setTenantLogoStatus(`Logo otimizado para salvar (${sizeInKb} KB).`);
    } catch (error) {
      setTenantLogoStatus(error instanceof Error ? error.message : "Falha ao otimizar logo.");
    }
  }

  function applyMenuStylePreference(value: MenuStylePreference) {
    setMenuStylePreference(value);
    localStorage.setItem(UI_MENU_STYLE_KEY, value);
    window.dispatchEvent(new Event("gestasports-appearance-preferences"));
  }

  function applyEffectsPreference(value: EffectsPreference) {
    setEffectsPreference(value);
    localStorage.setItem(UI_EFFECTS_KEY, value);
    window.dispatchEvent(new Event("gestasports-appearance-preferences"));
  }

  function updateSettingsUniform(
    side: "uniform1" | "uniform2",
    patch: Partial<ReturnType<typeof parseTeamKit>>
  ) {
    const current = side === "uniform1" ? uniform1Kit : uniform2Kit;
    const next = {
      ...current,
      ...patch
    };
    setSettingsForm((prev) => ({
      ...prev,
      [`${side}Color`]: encodeTeamKit(next.primary, next.accent, next.style, next)
    }));
  }

  const saveSettingsMutation = useMutation({
    mutationFn: () => {
      if (hasDuplicateUniformNames) {
        throw new Error("Os nomes dos times precisam ser diferentes.");
      }

      return apiRequest<GroupSettings>("/group/settings", {
        method:"PATCH",
        body: JSON.stringify({
          groupName: currentSettingsForm.groupName,
          organizationType: currentSettingsForm.organizationType,
          foundedAt: currentSettingsForm.foundedAt ? new Date(`${currentSettingsForm.foundedAt}T12:00:00`).toISOString() : null,
          foundationYear: currentSettingsForm.foundationYear ? Number(currentSettingsForm.foundationYear) : null,
          documentNumber: currentSettingsForm.documentNumber || null,
          phone: currentSettingsForm.phone || null,
          email: currentSettingsForm.email || null,
          websiteUrl: currentSettingsForm.websiteUrl || null,
          address: currentSettingsForm.address || null,
          addressNumber: currentSettingsForm.addressNumber || null,
          neighborhood: currentSettingsForm.neighborhood || null,
          city: currentSettingsForm.city || null,
          state: currentSettingsForm.state || null,
          postalCode: currentSettingsForm.postalCode || null,
          country: currentSettingsForm.country || null,
          history: currentSettingsForm.history || null,
          playersPerTeam: Number(currentSettingsForm.playersPerTeam) === 7 ? 7 : defaultPlayersPerTeam,
          closedMode: currentSettingsForm.closedMode,
          inviteCode: currentSettingsForm.inviteCode || null,
          uniform1Name: currentSettingsForm.uniform1Name,
          uniform1Season: currentSettingsForm.uniform1Season || null,
          uniform1Color: encodeTeamKit(uniform1Kit.primary, uniform1Kit.accent, uniform1Kit.style, uniform1Kit),
          uniform1ImageUrl: currentSettingsForm.uniform1ImageUrl || null,
          uniform2Name: currentSettingsForm.uniform2Name,
          uniform2Season: currentSettingsForm.uniform2Season || null,
          uniform2Color: encodeTeamKit(uniform2Kit.primary, uniform2Kit.accent, uniform2Kit.style, uniform2Kit),
          uniform2ImageUrl: currentSettingsForm.uniform2ImageUrl || null
        })
      });
    },
    onSuccess: (settings) => {
      setSettingsForm({
        groupName: settings.groupName,
        organizationType: settings.organizationType,
        foundedAt: settings.foundedAt ? settings.foundedAt.slice(0, 10) : "",
        foundationYear: settings.foundationYear ? String(settings.foundationYear) : "",
        documentNumber: settings.documentNumber ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        websiteUrl: settings.websiteUrl ?? "",
        address: settings.address ?? "",
        addressNumber: settings.addressNumber ?? "",
        neighborhood: settings.neighborhood ?? "",
        city: settings.city ?? "",
        state: settings.state ?? "",
        postalCode: settings.postalCode ?? "",
        country: settings.country ?? "Brasil",
        history: settings.history ?? "",
        playersPerTeam: String(settings.playersPerTeam ?? defaultPlayersPerTeam),
        closedMode: settings.closedMode,
        inviteCode: settings.inviteCode ?? "",
        uniform1Name: settings.uniform1Name,
        uniform1Season: settings.uniform1Season ?? "",
        uniform1Color: settings.uniform1Color,
        uniform1ImageUrl: settings.uniform1ImageUrl ?? "",
        uniform2Name: settings.uniform2Name,
        uniform2Season: settings.uniform2Season ?? "",
        uniform2Color: settings.uniform2Color,
        uniform2ImageUrl: settings.uniform2ImageUrl ?? ""
      });
      queryClient.setQueryData(["group-settings"], settings);
      queryClient.setQueryData(["group-settings", "dashboard"], settings);
      void queryClient.invalidateQueries({ queryKey: ["group-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-tactical-games"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
    }
  });

  const saveTenantBrandingMutation = useMutation({
    mutationFn: () =>
      apiRequest<TenantBrandingSettings>("/tenant/branding", {
        method: "PATCH",
        body: JSON.stringify({
          brandName: currentTenantBrandingForm.brandName,
          primaryColor: currentTenantBrandingForm.primaryColor,
          secondaryColor: currentTenantBrandingForm.secondaryColor,
          accentColor: currentTenantBrandingForm.accentColor,
          logoUrl: currentTenantBrandingForm.logoUrl || null,
          menuStyle: menuStylePreference,
          interfaceEffects: effectsPreference
        })
      }),
    onSuccess: (branding) => {
      setTenantBrandingForm({});
      setMenuStylePreference(branding.menuStyle);
      setEffectsPreference(branding.interfaceEffects);
      localStorage.setItem(UI_MENU_STYLE_KEY, branding.menuStyle);
      localStorage.setItem(UI_EFFECTS_KEY, branding.interfaceEffects);
      window.dispatchEvent(new Event("gestasports-appearance-preferences"));
      void queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant-current"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant-current-brand"] });
    }
  });

  const savePixSettingsMutation = useMutation({
    mutationFn: () =>
      apiRequest<PaymentSettings>("/finance/pix-settings", {
        method: "PATCH",
        body: JSON.stringify({
          paymentMode: currentPixSettingsForm.paymentMode,
          paymentProvider: currentPixSettingsForm.paymentProvider,
          providerEnvironment: currentPixSettingsForm.providerEnvironment,
          providerApiKey: currentPixSettingsForm.providerApiKey,
          providerClientId: currentPixSettingsForm.providerClientId,
          providerClientSecret: currentPixSettingsForm.providerClientSecret,
          providerWebhookSecret: currentPixSettingsForm.providerWebhookSecret,
          providerWebhookUrl: currentPixSettingsForm.providerWebhookUrl,
          autoSettleEnabled: currentPixSettingsForm.autoSettleEnabled,
          pixKey: currentPixSettingsForm.pixKey,
          pixReceiverName: currentPixSettingsForm.pixReceiverName,
          pixCity: currentPixSettingsForm.pixCity,
          pixAutoSettleSeconds: Number(currentPixSettingsForm.pixAutoSettleSeconds) || 20,
          monthlyDueDay: Number(currentPixSettingsForm.monthlyDueDay) || 10,
          lateFeeCents: toCents(currentPixSettingsForm.lateFeeBRL) || 0,
          lateFeePercent: Number(currentPixSettingsForm.lateFeePercent) || 0
        })
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["finance-pix-settings"] })
  });

  const configSections = useMemo(
    () =>
      standaloneUniforms ?
         [{ key: "uniforms" as const, label: "Uniformes" }]
        : [
            { key: "club" as const, label: "Clube" },
            { key: "uniforms" as const, label: "Uniformes" },
            { key: "pix" as const, label: "Pagamentos e gateway" },
            { key: "board" as const, label: "Diretoria e funções" },
            { key: "profiles" as const, label: "Permissões" },
            { key: "audit" as const, label: "Auditoria" }
          ],
    [standaloneUniforms]
  );
  const configSectionKeys = useMemo(() => configSections.map((section) => section.key), [configSections]);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("aba");
    if (!standaloneUniforms && tab === "uniforms") {
      setConfigSection("uniforms");
      return;
    }
    if (!standaloneUniforms && tab === "appearance") {
      navigate("/configuracoes?aba=club", { replace: true });
      return;
    }
    if (!standaloneUniforms && tab === "team") {
      navigate("/configuracoes?aba=uniforms", { replace: true });
      return;
    }
    if (!standaloneUniforms && tab === "billing") {
      navigate("/configuracoes?aba=pix", { replace: true });
      return;
    }
    if (!standaloneUniforms && tab === "integrations") {
      navigate("/configuracoes?aba=pix", { replace: true });
      return;
    }
    if (!standaloneUniforms && tab === "invite") {
      navigate("/convites", { replace: true });
      return;
    }
    if (tab && (configSectionKeys as readonly string[]).includes(tab)) {
      setConfigSection(tab as typeof configSection);
    }
  }, [configSectionKeys, location.search, navigate, standaloneUniforms]);

  function changeConfigSection(section: typeof configSection) {
    setConfigSection(section);
    navigate(standaloneUniforms ? "/uniformes" : `/configuracoes?aba=${section}`, { replace: true });
  }
  const usersQuery = useQuery({
    queryKey: ["auth-users"],
    queryFn: () => apiRequest<ManagedUser[]>("/auth/users")
  });
  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiRequest<AuditLog[]>("/audit-logs?limit=120")
  });

  const createBoardRoleMutation = useMutation({
    mutationFn: () =>
      apiRequest<BoardRole>("/board-roles", {
        method: "POST",
        body: JSON.stringify(boardRoleForm)
      }),
    onSuccess: () => {
      setBoardRoleForm({
        name: "",
        description: "",
        canAccessAdmin: false,
        canAccessFinancial: false,
        canAccessAthlete: false,
        isDefault: false
      });
      void queryClient.invalidateQueries({ queryKey: ["board-roles"] });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
    }
  });

  const updateBoardRoleMutation = useMutation({
    mutationFn: ({ role, patch }: { role: BoardRole; patch: Partial<BoardRole> }) =>
      apiRequest<BoardRole>(`/board-roles/${role.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["board-roles"] });
      void queryClient.invalidateQueries({ queryKey: ["associates"] });
    }
  });

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    roleAdmin: false,
    roleSportsDirector: false,
    roleAssociate: false,
    roleAthlete: true,
    roleFinancial: false
  });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userEditForm, setUserEditForm] = useState({
    name: "",
    email: "",
    password: "",
    roleAdmin: false,
    roleSportsDirector: false,
    roleAssociate: false,
    roleAthlete: true,
    roleFinancial: false
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const roles: UserRole[] = [
        ...(userForm.roleAdmin ? ["ADMIN" as const] : []),
        ...(userForm.roleSportsDirector ? ["SPORTS_DIRECTOR" as const] : []),
        ...(userForm.roleAssociate ? ["ASSOCIATE" as const] : []),
        ...(userForm.roleAthlete ? ["ATHLETE" as const] : []),
        ...(userForm.roleFinancial ? ["FINANCIAL" as const] : [])
      ];

      const normalizedRoles = roles.length > 0 ? roles : (["ATHLETE"] as UserRole[]);

      return apiRequest<ManagedUser>("/auth/users", {
        method: "POST",
        body: JSON.stringify({
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          roles: normalizedRoles
        })
      });
    },
    onSuccess: () => {
      setUserForm({
        name: "",
        email: "",
        password: "",
        roleAdmin: false,
        roleSportsDirector: false,
        roleAssociate: false,
        roleAthlete: true,
        roleFinancial: false
      });
      void queryClient.invalidateQueries({ queryKey: ["auth-users"] });
    }
  });

  const updateRolesMutation = useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: UserRole[] }) =>
      apiRequest<ManagedUser>(`/auth/users/${userId}/roles`, {
        method: "PATCH",
        body: JSON.stringify({ roles })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth-users"] });
      void queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, form }: { userId: string; form: typeof userEditForm }) => {
      const roles: UserRole[] = [
        ...(form.roleAdmin ? ["ADMIN" as const] : []),
        ...(form.roleSportsDirector ? ["SPORTS_DIRECTOR" as const] : []),
        ...(form.roleAssociate ? ["ASSOCIATE" as const] : []),
        ...(form.roleAthlete ? ["ATHLETE" as const] : []),
        ...(form.roleFinancial ? ["FINANCIAL" as const] : [])
      ];
      const normalizedRoles = roles.length > 0 ? roles : (["ATHLETE"] as UserRole[]);

      return apiRequest<ManagedUser>(`/auth/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          roles: normalizedRoles
        })
      });
    },
    onSuccess: (updated) => {
      setUserEditForm({
        name: updated.name,
        email: updated.email,
        password: "",
        roleAdmin: updated.roles.includes("ADMIN"),
        roleSportsDirector: updated.roles.includes("SPORTS_DIRECTOR"),
        roleAssociate: updated.roles.includes("ASSOCIATE"),
        roleAthlete: updated.roles.includes("ATHLETE"),
        roleFinancial: updated.roles.includes("FINANCIAL")
      });
      void queryClient.invalidateQueries({ queryKey: ["auth-users"] });
      void queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    }
  });

  function toggleRole(user: ManagedUser, role: UserRole) {
    const next = user.roles.includes(role) ?
       user.roles.filter((currentRole) => currentRole !== role)
      : [...user.roles, role];
    const normalized = next.length > 0 ? next : (["ATHLETE"] as UserRole[]);

    void updateRolesMutation.mutateAsync({ userId: user.id, roles: normalized });
  }

  function openUserDetails(user: ManagedUser) {
    setSelectedUserId((current) => (current === user.id ? null : user.id));
    setUserEditForm({
      name: user.name,
      email: user.email,
      password: "",
      roleAdmin: user.roles.includes("ADMIN"),
      roleSportsDirector: user.roles.includes("SPORTS_DIRECTOR"),
      roleAssociate: user.roles.includes("ASSOCIATE"),
      roleAthlete: user.roles.includes("ATHLETE"),
      roleFinancial: user.roles.includes("FINANCIAL")
    });
  }

  const boardRoles = boardRolesQuery.data ?? [];
  const managedUsers = (usersQuery.data ?? []).filter((user) => user.role !== "SUPERADMIN" && !user.roles.includes("SUPERADMIN"));
  const auditLogs = auditLogsQuery.data ?? [];
  const settingsReadiness = [
    {
      label: "Clube",
      ready: Boolean(currentSettingsForm.groupName.trim() && currentTenantBrandingForm.brandName.trim()),
      detail: currentTenantBrandingForm.brandName || currentSettingsForm.groupName || "Nome pendente"
    },
    {
      label: "Pagamentos e gateway",
      ready: Boolean(currentPixSettingsForm.pixKey.trim() && currentPixSettingsForm.pixReceiverName.trim()),
      detail: currentPixSettingsForm.paymentProvider === "MANUAL_PIX" ? "Pix manual" : currentPixSettingsForm.paymentProvider
    },
    {
      label: "Uniformes",
      ready: Boolean(currentSettingsForm.uniform1Name.trim() && currentSettingsForm.uniform2Name.trim() && !hasDuplicateUniformNames),
      detail: hasDuplicateUniformNames ? "Nomes duplicados" : `${currentSettingsForm.uniform1Season || "-"} / ${currentSettingsForm.uniform2Season || "-"}`
    },
    {
      label: "Diretoria",
      ready: boardRoles.filter((role) => !role.isDefault).length > 0,
      detail: `${boardRoles.filter((role) => !role.isDefault).length} cargo(s)`
    },
    {
      label: "Acessos",
      ready: managedUsers.length > 0,
      detail: `${managedUsers.length} usuário(s)`
    },
    {
      label: "Auditoria",
      ready: auditLogs.length > 0,
      detail: `${auditLogs.length} registro(s)`
    }
  ];
  const settingsReadyCount = settingsReadiness.filter((item) => item.ready).length;

  return (
    <section className="min-w-0 space-y-4">
      {!standaloneUniforms ? (
        <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Gestão do clube</p>
              <h1 className="mt-1 text-xl font-black text-slate-950">Prontidão das configurações</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Resumo do que precisa estar correto para o clube operar jogos, cobranças, acessos e acervo.</p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">{settingsReadyCount}/{settingsReadiness.length} em ordem</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {settingsReadiness.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`rounded-lg border p-3 text-left transition hover:bg-slate-50 ${item.ready ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/70"}`}
                onClick={() => {
                  const target = item.label === "Pagamentos e gateway" ? "pix" : item.label === "Uniformes" ? "uniforms" : item.label === "Diretoria" ? "board" : item.label === "Acessos" ? "profiles" : item.label === "Auditoria" ? "audit" : "club";
                  changeConfigSection(target as typeof configSection);
                }}
              >
                <p className={`text-[10px] font-black uppercase tracking-[0.08em] ${item.ready ? "text-emerald-700" : "text-amber-700"}`}>{item.ready ? "Ok" : "Revisar"}</p>
                <strong className="mt-1 block text-sm font-black text-slate-950">{item.label}</strong>
                <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{item.detail}</span>
              </button>
            ))}
          </div>
        </article>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
      <article className={`min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${configSection === "board" || configSection === "profiles" || configSection === "audit" ? "hidden" : "xl:col-span-2"}`}>
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
          <Settings size={20} />
          {configSections.find((section) => section.key === configSection)?.label ?? "Configurações"}
        </h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (configSection === "club" || configSection === "appearance") {
              void saveTenantBrandingMutation.mutateAsync();
              if (hasSettingsChanges) {
                void saveSettingsMutation.mutateAsync();
              }
              return;
            }
            if (configSection === "pix" || configSection === "billing") {
              void savePixSettingsMutation.mutateAsync();
              return;
            }
            void saveSettingsMutation.mutateAsync();
          }}
        >
          <div className={`rounded-lg border border-slate-200 p-3 ${configSection === "club" || configSection === "appearance" ? "" : "hidden"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">Dados e identidade do clube</h3>
                <p className="text-sm text-slate-500">Configure nome oficial, nome exibido, escudo, cores institucionais e padrão visual do ambiente.</p>
              </div>
              {saveTenantBrandingMutation.isSuccess ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Marca salva</span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-600">
                  Nome exibido no sistema
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={currentTenantBrandingForm.brandName}
                    onChange={(event) => setTenantBrandingForm((prev) => ({ ...prev, brandName: event.target.value }))}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-600">
                  Nome oficial do clube/grupo
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={currentSettingsForm.groupName}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, groupName: event.target.value }))}
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block text-sm font-medium text-slate-600">
                    Tipo institucional
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={currentSettingsForm.organizationType}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, organizationType: event.target.value }))}
                    >
                      <option value="ASSOCIACAO">Associação</option>
                      <option value="CLUBE">Clube</option>
                      <option value="GRUPO_INTERNO">Grupo interno</option>
                      <option value="LIGA">Liga</option>
                      <option value="ESCOLINHA">Escolinha</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    Data de fundação
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={currentSettingsForm.foundedAt}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, foundedAt: event.target.value, foundationYear: event.target.value ? String(new Date(`${event.target.value}T12:00:00`).getFullYear()) : prev.foundationYear }))}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    Ano de formação
                    <input
                      type="number"
                      min={1800}
                      max={2200}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={currentSettingsForm.foundationYear}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, foundationYear: event.target.value }))}
                      placeholder="Ex.: 2020"
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Tempo de formação</p>
                  <strong className="mt-1 block text-2xl font-black text-slate-950">
                    {clubAgeYears !== null ? `${clubAgeYears} ano(s)` : "Não informado"}
                  </strong>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Esse dado aparece no acervo, na apresentação institucional e no onboarding comercial.
                  </p>
                </div>

                <label className="block text-sm font-medium text-slate-600">
                  Formato padrão dos jogos
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={currentSettingsForm.playersPerTeam}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, playersPerTeam: event.target.value }))}
                  >
                    <option value="11">Futebol 11 - 11 titulares por lado</option>
                    <option value="7">Futebol 7 - 7 titulares por lado</option>
                  </select>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    Essa regra define o mínimo do sorteio, o campo da escalação e quando um atleta entra como titular ou banco.
                  </span>
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block text-sm font-medium text-slate-600">
                    CNPJ/Documento
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.documentNumber} onChange={(event) => setSettingsForm((prev) => ({ ...prev, documentNumber: event.target.value }))} placeholder="Opcional" />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    Telefone institucional
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.phone} onChange={(event) => setSettingsForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="(00) 00000-0000" />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    Email institucional
                    <input type="email" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.email} onChange={(event) => setSettingsForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="contato@clube.com" />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem]">
                  <label className="block text-sm font-medium text-slate-600">
                    Endereço
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.address} onChange={(event) => setSettingsForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="Rua, avenida ou sede" />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    Número
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.addressNumber} onChange={(event) => setSettingsForm((prev) => ({ ...prev, addressNumber: event.target.value }))} />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <label className="block text-sm font-medium text-slate-600">
                    Bairro
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.neighborhood} onChange={(event) => setSettingsForm((prev) => ({ ...prev, neighborhood: event.target.value }))} />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    Cidade
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.city} onChange={(event) => setSettingsForm((prev) => ({ ...prev, city: event.target.value }))} />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    UF
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.state} onChange={(event) => setSettingsForm((prev) => ({ ...prev, state: event.target.value.toUpperCase().slice(0, 2) }))} />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    CEP
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.postalCode} onChange={(event) => setSettingsForm((prev) => ({ ...prev, postalCode: event.target.value }))} />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)]">
                  <label className="block text-sm font-medium text-slate-600">
                    País
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.country} onChange={(event) => setSettingsForm((prev) => ({ ...prev, country: event.target.value }))} />
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    Site ou rede principal
                    <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.websiteUrl} onChange={(event) => setSettingsForm((prev) => ({ ...prev, websiteUrl: event.target.value }))} placeholder="https://..." />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-600">
                  História/resumo institucional
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={currentSettingsForm.history}
                    onChange={(event) => setSettingsForm((prev) => ({ ...prev, history: event.target.value }))}
                    placeholder="Conte quando surgiu, finalidade da associação, bairro, conquistas e identidade do grupo."
                  />
                </label>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Upload size={16} />
                    Logo do login e menu interno
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                    <div className="grid h-28 place-items-center bg-transparent p-0">
                      {currentTenantBrandingForm.logoUrl ? (
                        <img src={currentTenantBrandingForm.logoUrl} alt={currentTenantBrandingForm.brandName} className="max-h-24 max-w-full object-contain" />
                      ) : (
                        <Palette size={32} className="text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder="URL ou imagem em base64"
                        value={currentTenantBrandingForm.logoUrl}
                        onChange={(event) => setTenantBrandingForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        onChange={(event) => handleTenantLogoUpload(event.target.files?.[0] ?? null)}
                      />
                      {tenantLogoStatus ? <p className="text-xs font-semibold text-slate-500">{tenantLogoStatus}</p> : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { key: "primaryColor" as const, label: "Cor dos botões" },
                    { key: "secondaryColor" as const, label: "Cor do menu" },
                    { key: "accentColor" as const, label: "Cor de destaque" }
                  ].map((colorField) => (
                    <label key={colorField.key} className="block text-sm font-medium text-slate-600">
                      {colorField.label}
                      <div className="mt-1 flex gap-2">
                        <input
                          type="color"
                          className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1"
                          value={currentTenantBrandingForm[colorField.key]}
                          onChange={(event) => setTenantBrandingForm((prev) => ({ ...prev, [colorField.key]: event.target.value }))}
                        />
                        <input
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
                          value={currentTenantBrandingForm[colorField.key]}
                          onChange={(event) => setTenantBrandingForm((prev) => ({ ...prev, [colorField.key]: event.target.value }))}
                        />
                      </div>
                    </label>
                  ))}
                </div>

                <label className="block text-sm font-medium text-slate-600">
                  Tema visual do usuário
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={theme}
                    onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")}
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                    <option value="system">Seguir sistema</option>
                  </select>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-600">
                    Estilo do menu
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={menuStylePreference}
                      onChange={(event) => applyMenuStylePreference(event.target.value as MenuStylePreference)}
                    >
                      <option value="brand">Marca do clube</option>
                      <option value="light">Claro</option>
                      <option value="glass">Vidro suave</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-600">
                    Efeitos da interface
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={effectsPreference}
                      onChange={(event) => applyEffectsPreference(event.target.value as EffectsPreference)}
                    >
                      <option value="soft">Suaves</option>
                      <option value="full">Completos</option>
                      <option value="minimal">Minimos</option>
                    </select>
                  </label>
                </div>

                <button
                  type="submit"
                  className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: currentTenantBrandingForm.primaryColor }}
                  disabled={saveTenantBrandingMutation.isPending}
                >
                  {saveTenantBrandingMutation.isPending || saveSettingsMutation.isPending ? "Salvando..." : "Salvar dados do clube"}
                </button>
                {saveTenantBrandingMutation.error ? (
                  <p className="text-sm text-red-600">{saveTenantBrandingMutation.error instanceof Error ? saveTenantBrandingMutation.error.message : "Erro ao salvar marca."}</p>
                ) : null}
              </div>

              <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="p-4 text-white" style={{ background: `linear-gradient(145deg, ${currentTenantBrandingForm.secondaryColor}, #111827)` }}>
                  <div className="grid h-20 w-20 place-items-center bg-transparent p-0">
                    {currentTenantBrandingForm.logoUrl ? (
                      <img src={currentTenantBrandingForm.logoUrl} alt="" className="max-h-16 max-w-full object-contain" />
                    ) : (
                      <Palette size={28} className="text-slate-300" />
                    )}
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: currentTenantBrandingForm.accentColor }}>Login do clube</p>
                  <h4 className="mt-1 text-2xl font-black">{currentTenantBrandingForm.brandName}</h4>
                </div>
                <div className="space-y-3 p-4">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-bold uppercase text-slate-500">Menu interno</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="size-8 rounded-lg" style={{ backgroundColor: currentTenantBrandingForm.secondaryColor }} />
                      <span className="text-sm font-bold text-slate-800">{currentTenantBrandingForm.brandName}</span>
                    </div>
                  </div>
                  <button type="button" className="w-full rounded-lg px-3 py-2 text-sm font-bold text-white" style={{ backgroundColor: currentTenantBrandingForm.primaryColor }}>
                    Botão principal
                  </button>
                  <button type="button" className="w-full rounded-lg border px-3 py-2 text-sm font-bold" style={{ borderColor: currentTenantBrandingForm.accentColor, color: currentTenantBrandingForm.primaryColor }}>
                    Ação secundária
                  </button>
                </div>
              </aside>
            </div>
          </div>

          <label className="hidden">
            Nome do clube
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.groupName} onChange={(event) => setSettingsForm((prev) => ({ ...prev, groupName: event.target.value }))} />
          </label>

          <div className={`space-y-4 ${configSection === "uniforms" || configSection === "team" ? "" : "hidden"}`}>
            {standaloneUniforms ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="font-semibold text-slate-950">Personalizador de uniformes</h3>
                <p className="text-sm text-slate-500">Edite modelos, cores, escudo, texto, mangas e acabamentos das camisas do time.</p>
              </div>
            ) : null}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="font-semibold text-slate-950">Uniformes do clube</h3>
              <p className="text-sm text-slate-500">Escolha o time/uniforme usado como padrão, informe a temporada de cadastro e ajuste modelo, cores e imagem.</p>
            </div>
            <div className="grid gap-3">
            {[
              { title: "Camisa do Time A", nameKey: "uniform1Name" as const, seasonKey: "uniform1Season" as const, imageKey: "uniform1ImageUrl" as const, name: currentSettingsForm.uniform1Name, season: currentSettingsForm.uniform1Season, imageUrl: currentSettingsForm.uniform1ImageUrl, kit: uniform1Kit, side: "uniform1" as const, fallback: DEFAULT_RED_UNIFORM_COLOR },
              { title: "Camisa do Time B", nameKey: "uniform2Name" as const, seasonKey: "uniform2Season" as const, imageKey: "uniform2ImageUrl" as const, name: currentSettingsForm.uniform2Name, season: currentSettingsForm.uniform2Season, imageUrl: currentSettingsForm.uniform2ImageUrl, kit: uniform2Kit, side: "uniform2" as const, fallback: DEFAULT_WHITE_UNIFORM_COLOR }
            ].map((uniform) => (
              (() => {
                const showAccent = uniform.kit.colorCount !== "ONE" && uniform.kit.style !== "SOLID";
                const usesCenterBars = uniform.kit.style === "TWO_CENTER_LINES" || uniform.kit.style === "CENTER_BARS_DUO";
                const showTertiary = (usesCenterBars || uniform.kit.colorCount === "TRICOLOR" || uniform.kit.colorCount === "FOUR") && uniform.kit.style !== "SOLID";
                const showQuaternary = uniform.kit.colorCount === "FOUR" && uniform.kit.style !== "SOLID" && (!usesCenterBars || uniform.kit.centerBarsVariant === "TRIPLE");
                const harmony = analyzeTeamKitHarmony(uniform.kit);
                const harmonyClass =
                  harmony.tone === "success" ?
                     "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : harmony.tone === "warning" ?
                       "border-amber-200 bg-amber-50 text-amber-800"
                      : harmony.tone === "danger" ?
                         "border-red-200 bg-red-50 text-red-800"
                        : "border-blue-200 bg-blue-50 text-blue-800";
                return (
              <div key={uniform.side} className="bg-white">
                <div className="grid gap-4 xl:grid-cols-[minmax(440px,1.08fr)_minmax(380px,0.92fr)] xl:items-start">
                <div className="mx-auto w-full min-w-0">
                  <TeamColorCard label={currentSettingsForm.groupName} name={uniform.name} color={encodeTeamKit(uniform.kit.primary, uniform.kit.accent, uniform.kit.style, uniform.kit)} fallback={uniform.fallback} imageUrl={uniform.imageUrl || null} variant="studio" />
                </div>

                <div className="min-w-0 space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.07)] sm:p-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{uniform.title}</h3>
                  <p className="text-xs text-slate-500">Configurador no padrão soccer-jersey.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                  <label className="block text-xs font-medium text-slate-600">
                    Time selecionado
                    <input className={`mt-1 h-9 w-full rounded-lg border px-3 text-sm ${hasDuplicateUniformNames ? "border-red-300 bg-red-50" : "border-slate-200"}`} value={uniform.name} onChange={(event) => setSettingsForm((prev) => ({ ...prev, [uniform.nameKey]: event.target.value }))} />
                  </label>
                  <label className="block text-xs font-medium text-slate-600">
                    Ano/temporada
                    <input
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      value={uniform.season}
                      onChange={(event) => setSettingsForm((prev) => ({ ...prev, [uniform.seasonKey]: event.target.value }))}
                      placeholder={`${new Date().getFullYear()}`}
                    />
                  </label>
                  {hasDuplicateUniformNames ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 sm:col-span-2">
                      Time A e Time B não podem ter o mesmo nome.
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 p-2">
                <h4 className="mb-1.5 text-[11px] font-black uppercase tracking-[0.06em] text-slate-950">Cores e estilo</h4>
                <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="block text-xs font-medium text-slate-600">
                    Preenchimento
                    <select
                      className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold"
                      value={shirtFillModeForKit(uniform.kit)}
                      onChange={(event) => {
                        const nextFill = event.target.value as ShirtFillMode;
                        if (nextFill === "PLAIN") {
                          updateSettingsUniform(uniform.side, { style: "SOLID", colorCount: "ONE", centerBarsVariant: "SPACED" });
                          return;
                        }
                        if (nextFill === "TWO_TONE") {
                          updateSettingsUniform(uniform.side, { style: "HALF_AND_HALF", colorCount: "TWO", centerBarsVariant: "SPACED", shirtStyleDirection: "VERTICAL" });
                          return;
                        }
                        if (nextFill === "TRICOLOR") {
                          updateSettingsUniform(uniform.side, { style: "TWO_CENTER_LINES", colorCount: "TRICOLOR", centerBarsVariant: "SPACED", shirtStyleDirection: "VERTICAL" });
                          return;
                        }
                        if (nextFill === "FOUR_COLORS") {
                          updateSettingsUniform(uniform.side, { style: "CENTER_BARS_DUO", colorCount: "FOUR", centerBarsVariant: "TRIPLE", shirtStyleDirection: "VERTICAL" });
                          return;
                        }
                        updateSettingsUniform(uniform.side, { style: "MESH_PATTERN", colorCount: "TWO", centerBarsVariant: "SPACED" });
                      }}
                    >
                      {shirtFillOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-slate-500">{shirtFillOptions.find((option) => option.value === shirtFillModeForKit(uniform.kit)).description}</span>
                  </label>
                  <label className="block text-xs font-medium text-slate-600">
                    Quantidade de cores
                    <select
                      className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold"
                      value={usesCenterBars && uniform.kit.colorCount === "TWO" ? "TRICOLOR" : uniform.kit.colorCount}
                      onChange={(event) => {
                        const nextColorCount = event.target.value as "ONE" | "TWO" | "TRICOLOR" | "FOUR";
                        updateSettingsUniform(uniform.side, {
                          colorCount: usesCenterBars && nextColorCount === "TWO" ? "TRICOLOR" : nextColorCount,
                          centerBarsVariant: usesCenterBars && nextColorCount !== "FOUR" && uniform.kit.centerBarsVariant === "TRIPLE" ? "SPACED" : uniform.kit.centerBarsVariant
                        });
                      }}
                    >
                      <option value="ONE">1 cor</option>
                      <option value="TWO">2 cores</option>
                      <option value="TRICOLOR">Tricolor</option>
                      <option value="FOUR">4 cores</option>
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-slate-600">
                    Modelo
                    <select
                      className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold"
                      value={uniform.kit.style}
                      onChange={(event) => {
                        const nextStyle = event.target.value as UniformStyle;
                        updateSettingsUniform(uniform.side, {
                          style: nextStyle,
                          colorCount: nextStyle === "SOLID" ? "ONE" : nextStyle === "TWO_CENTER_LINES" || nextStyle === "CENTER_BARS_DUO" ? "TRICOLOR" : uniform.kit.colorCount === "ONE" ? "TWO" : uniform.kit.colorCount,
                          centerBarsVariant: nextStyle === "CENTER_BARS_DUO" ? "JOINED" : nextStyle === "TWO_CENTER_LINES" ? "SPACED" : uniform.kit.centerBarsVariant
                        });
                      }}
                    >
                      {uniformModelOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-slate-500">{uniformModelOptions.find((option) => option.value === uniform.kit.style).description}</span>
                  </label>
                  <label className={`block text-xs font-medium text-slate-600 ${usesCenterBars ? "" : "hidden"}`}>
                    Variação das barras
                    <select
                      className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold"
                      value={uniform.kit.centerBarsVariant}
                      onChange={(event) => {
                        const nextVariant = event.target.value as CenterBarsVariant;
                        updateSettingsUniform(uniform.side, {
                          centerBarsVariant: nextVariant,
                          colorCount: nextVariant === "TRIPLE" ? "FOUR" : "TRICOLOR"
                        });
                      }}
                    >
                      {centerBarsOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-slate-500">{centerBarsOptions.find((option) => option.value === uniform.kit.centerBarsVariant).description}</span>
                  </label>
                  <label className={`block text-xs font-medium text-slate-600 ${directionalStyles.includes(uniform.kit.style) ? "" : "hidden"}`}>
                    Direção do desenho
                    <select
                      className="mt-0.5 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold"
                      value={uniform.kit.shirtStyleDirection}
                      onChange={(event) => updateSettingsUniform(uniform.side, { shirtStyleDirection: event.target.value as ShirtStyleDirection })}
                    >
                      <option value="VERTICAL">Vertical</option>
                      <option value="HORIZONTAL">Horizontal</option>
                      <option value="DIAGONAL_LEFT">Diagonal esquerda</option>
                      <option value="DIAGONAL_RIGHT">Diagonal direita</option>
                    </select>
                    <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-slate-500">Controle de direção do desenho.</span>
                  </label>
                </div>

                <div className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="block min-w-0 text-xs font-medium text-slate-600">
                    <span>
                      Cor 1
                      <span className="block truncate text-[10px] font-semibold leading-tight text-slate-500">Fundo principal</span>
                    </span>
                    <input
                      type="color"
                      className="mt-0.5 h-7 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5"
                      value={uniform.kit.primary}
                      onInput={(event) => updateSettingsUniform(uniform.side, { primary: event.currentTarget.value })}
                      onChange={(event) => updateSettingsUniform(uniform.side, { primary: event.target.value })}
                    />
                  </label>
                  <label className={`block min-w-0 text-xs font-medium text-slate-600 ${showAccent ? "" : "hidden"}`}>
                    <span>
                      Cor 2
                      <span className="block truncate text-[10px] font-semibold leading-tight text-slate-500">{usesCenterBars ? "Barra esquerda" : stripeStyles.includes(uniform.kit.style) ? "Faixa central" : "Cor de destaque"}</span>
                    </span>
                    <input
                      type="color"
                      className="mt-0.5 h-7 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5"
                      value={uniform.kit.accent}
                      onInput={(event) => updateSettingsUniform(uniform.side, { accent: event.currentTarget.value })}
                      onChange={(event) => updateSettingsUniform(uniform.side, { accent: event.target.value })}
                    />
                  </label>
                  <label className={`block min-w-0 text-xs font-medium text-slate-600 ${showTertiary ? "" : "hidden"}`}>
                    <span>
                      Cor 3
                      <span className="block truncate text-[10px] font-semibold leading-tight text-slate-500">{usesCenterBars ? "Barra direita" : stripeStyles.includes(uniform.kit.style) ? "Faixa secundária" : "Cor complementar"}</span>
                    </span>
                    <input
                      type="color"
                      className="mt-0.5 h-7 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5"
                      value={uniform.kit.tertiary}
                      onInput={(event) => updateSettingsUniform(uniform.side, { tertiary: event.currentTarget.value })}
                      onChange={(event) => updateSettingsUniform(uniform.side, { tertiary: event.target.value })}
                    />
                  </label>
                  <label className={`block min-w-0 text-xs font-medium text-slate-600 ${showQuaternary ? "" : "hidden"}`}>
                    <span>
                      Cor 4
                      <span className="block truncate text-[10px] font-semibold leading-tight text-slate-500">Detalhe extra</span>
                    </span>
                    <input
                      type="color"
                      className="mt-0.5 h-7 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5"
                      value={uniform.kit.quaternary}
                      onInput={(event) => updateSettingsUniform(uniform.side, { quaternary: event.currentTarget.value })}
                      onChange={(event) => updateSettingsUniform(uniform.side, { quaternary: event.target.value })}
                    />
                  </label>
                  <label className="block min-w-0 text-xs font-medium text-slate-600">
                    <span>
                      Mangas
                      <span className="block truncate text-[10px] font-semibold leading-tight text-slate-500">{uniform.title.replace("Camisa do ", "")}</span>
                    </span>
                    <input
                      type="color"
                      className="mt-0.5 h-7 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-0.5"
                      value={uniform.kit.sleeveColor}
                      onInput={(event) => updateSettingsUniform(uniform.side, { sleeveColor: event.currentTarget.value })}
                      onChange={(event) => updateSettingsUniform(uniform.side, { sleeveColor: event.target.value })}
                    />
                  </label>
                </div>
                <div className={`mt-2 rounded-lg border p-2 ${harmonyClass}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black">Harmonia das cores: {harmony.status}</p>
                      <p className="mt-0.5 text-[11px] font-semibold leading-tight">{harmony.summary}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {[
                        uniform.kit.primary,
                        uniform.kit.accent,
                        uniform.kit.tertiary,
                        ...(showQuaternary ? [uniform.kit.quaternary] : []),
                        uniform.kit.sleeveColor
                      ].map((swatch, index) => (
                        <span key={`${swatch}-${index}`} className="h-4 w-7 rounded-full border border-white/70 shadow-sm" style={{ backgroundColor: swatch }} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold leading-tight">{harmony.suggestion}</p>
                </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <button
                    type="button"
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                    onClick={() => updateSettingsUniform(uniform.side, {
                      primary: uniform.fallback,
                      accent: "#ffffff",
                      tertiary: "#111827",
                      quaternary: "#111827",
                      collarColor: "#111111",
                      cuffColor: "#111111",
                      hemColor: uniform.fallback,
                      sleeveColor: uniform.side === "uniform2" ? DEFAULT_WHITE_SLEEVE_COLOR : uniform.fallback,
                      colorCount: "TRICOLOR",
                      centerBarsVariant: "SPACED",
                      sleeveMode: "BODY",
                      collarStyle: "ROUND",
                      cuffStyle: "NONE",
                      hemStyle: "NONE",
                      shirtStyleDirection: "VERTICAL",
                      shirtText: "",
                      shirtNumber: "",
                      sponsorFront: "",
                      sponsorBack: "",
                      sponsorSleeve: "",
                      numberColor: "#ffffff"
                    })}
                  >
                    <Shuffle className="mr-2 inline-block" size={16} />
                    Limpar
                  </button>
                  <button type="submit" disabled={!hasSettingsChanges || hasDuplicateUniformNames || saveSettingsMutation.isPending} className="h-11 rounded-lg bg-red-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60">
                    <Check className="mr-2 inline-block" size={16} />
                    Salvar Uniforme
                  </button>
                </div>
                </div>
                </div>
              </div>
                );
              })()
            ))}
            </div>
          </div>

          <div className="hidden">
            <h3 className="font-semibold text-slate-950">Time A</h3>
            <p className="text-sm text-slate-500">Padrão: vermelho</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-600">
                Nome
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.uniform1Name} onChange={(event) => setSettingsForm((prev) => ({ ...prev, uniform1Name: event.target.value }))} />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Cor
                <div className="mt-1 flex items-center gap-2">
                  <input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" value={uniformColorHex(currentSettingsForm.uniform1Color, "#ef3340")} onChange={(event) => setSettingsForm((prev) => ({ ...prev, uniform1Color: event.target.value }))} />
                  <input className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm" value={currentSettingsForm.uniform1Color} onChange={(event) => setSettingsForm((prev) => ({ ...prev, uniform1Color: event.target.value }))} placeholder="#ef3340" />
                </div>
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium text-slate-600">
              Imagem da camisa
              <input type="file" accept="image/*" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" onChange={(event) => handleUniformImageUpload("uniform1ImageUrl", event.target.files?.[0] ?? null)} />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-600">
              URL da imagem
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.uniform1ImageUrl} onChange={(event) => setSettingsForm((prev) => ({ ...prev, uniform1ImageUrl: event.target.value }))} placeholder="https://..." />
            </label>
            {currentSettingsForm.uniform1ImageUrl ? <img src={currentSettingsForm.uniform1ImageUrl} alt="Camisa do Time A" className="mt-3 h-24 w-full rounded-lg border border-slate-200 object-contain" /> : null}
          </div>

          <div className="hidden">
            <h3 className="font-semibold text-slate-950">Time B</h3>
            <p className="text-sm text-slate-500">Padrão: branco</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-600">
                Nome
                <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.uniform2Name} onChange={(event) => setSettingsForm((prev) => ({ ...prev, uniform2Name: event.target.value }))} />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Cor
                <div className="mt-1 flex items-center gap-2">
                  <input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" value={uniformColorHex(currentSettingsForm.uniform2Color, "#ffffff")} onChange={(event) => setSettingsForm((prev) => ({ ...prev, uniform2Color: event.target.value }))} />
                  <input className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm" value={currentSettingsForm.uniform2Color} onChange={(event) => setSettingsForm((prev) => ({ ...prev, uniform2Color: event.target.value }))} placeholder="#ffffff" />
                </div>
              </label>
            </div>
            <label className="mt-3 block text-sm font-medium text-slate-600">
              Imagem da camisa
              <input type="file" accept="image/*" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" onChange={(event) => handleUniformImageUpload("uniform2ImageUrl", event.target.files?.[0] ?? null)} />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-600">
              URL da imagem
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={currentSettingsForm.uniform2ImageUrl} onChange={(event) => setSettingsForm((prev) => ({ ...prev, uniform2ImageUrl: event.target.value }))} placeholder="https://..." />
            </label>
            {currentSettingsForm.uniform2ImageUrl ? <img src={currentSettingsForm.uniform2ImageUrl} alt="Camisa do Time B" className="mt-3 h-24 w-full rounded-lg border border-slate-200 object-contain" /> : null}
          </div>

          <div className="hidden">
            <h3 className="font-semibold text-slate-950">Personalizador de Uniformes</h3>
            <p className="text-sm text-slate-500">Customize os uniformes do seu time com cores, padrões e emblemas</p>
            
            <div className="mt-6 space-y-8">
              <ShirtConfigurator
                side="red"
                config={{
                  name: currentSettingsForm.uniform1Name || DEFAULT_RED_UNIFORM_NAME,
                  color: currentSettingsForm.uniform1Color || "#ef3340",
                  imageUrl: currentSettingsForm.uniform1ImageUrl || ""
                }}
                onChange={(config) => {
                  setSettingsForm((prev) => ({
                    ...prev,
                    uniform1Name: config.name,
                    uniform1Color: config.color,
                    uniform1ImageUrl: config.imageUrl || ""
                  }));
                }}
                label="Time Mandante"
              />
              
              <div className="border-t border-slate-200 pt-8">
                <ShirtConfigurator
                  side="white"
                  config={{
                    name: currentSettingsForm.uniform2Name || DEFAULT_WHITE_UNIFORM_NAME,
                    color: currentSettingsForm.uniform2Color || "#ffffff",
                    imageUrl: currentSettingsForm.uniform2ImageUrl || ""
                  }}
                  onChange={(config) => {
                    setSettingsForm((prev) => ({
                      ...prev,
                      uniform2Name: config.name,
                      uniform2Color: config.color,
                      uniform2ImageUrl: config.imageUrl || ""
                    }));
                  }}
                  label="Time Visitante"
                />
              </div>
            </div>
          </div>

          <div className={`rounded-lg border border-slate-200 p-3 ${configSection === "pix" || configSection === "billing" ? "" : "hidden"}`}>
            <h3 className="font-semibold text-slate-950">Pagamentos e gateway</h3>
            <p className="text-sm text-slate-500">Configure Pix, bancos, gateways, credenciais, ambiente, vencimento e webhooks usados pelo financeiro.</p>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <label className="text-sm font-medium text-slate-600">
                Modo de cobrança
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={currentPixSettingsForm.paymentMode}
                  onChange={(event) => {
                    const paymentMode = event.target.value as PaymentSettings["paymentMode"];
                    setPixSettingsForm((prev) => ({
                      ...prev,
                      paymentMode,
                      paymentProvider: paymentMode === "MANUAL_PIX" ? "MANUAL_PIX" : prev.paymentProvider === "MANUAL_PIX" ? "SICOOB" : prev.paymentProvider
                    }));
                  }}
                >
                  <option value="MANUAL_PIX">Pix manual</option>
                  <option value="PROVIDER">Banco ou gateway</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-600">
                Banco ou gateway
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={currentPixSettingsForm.paymentProvider}
                  onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, paymentProvider: event.target.value as PaymentSettings["paymentProvider"], paymentMode: event.target.value === "MANUAL_PIX" ? "MANUAL_PIX" : "PROVIDER" }))}
                >
                  <option value="MANUAL_PIX">Pix manual</option>
                  <option value="SICOOB">Sicoob / Credisc</option>
                  <option value="ITAU">Itaú</option>
                  <option value="BANCO_DO_BRASIL">Banco do Brasil</option>
                  <option value="BRADESCO">Bradesco</option>
                  <option value="CAIXA">Caixa</option>
                  <option value="SANTANDER">Santander</option>
                  <option value="ASAAS">Asaas</option>
                  <option value="EFI">Efi / Gerencianet</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                  <option value="STRIPE">Stripe</option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["MANUAL_PIX", "Pix manual", "QR local e baixa manual."],
                ["SICOOB", "Sicoob / Credisc", "Banco Pix."],
                ["ITAU", "Itaú", "Banco Pix."],
                ["BANCO_DO_BRASIL", "Banco do Brasil", "Banco Pix."],
                ["BRADESCO", "Bradesco", "Banco Pix."],
                ["CAIXA", "Caixa", "Banco Pix."],
                ["SANTANDER", "Santander", "Banco Pix."],
                ["ASAAS", "Asaas", "Gateway Pix e recorrência."],
                ["EFI", "Efi", "Banco Pix."],
                ["MERCADO_PAGO", "Mercado Pago", "Gateway Pix/cartão."],
                ["STRIPE", "Stripe", "Gateway cartão/checkout."]
              ].map(([provider, title, description]) => (
                <button
                  key={provider}
                  type="button"
                  className={`rounded-lg border p-3 text-left ${currentPixSettingsForm.paymentProvider === provider ? "border-red-300 bg-red-50 text-red-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                  onClick={() => setPixSettingsForm((prev) => ({ ...prev, paymentProvider: provider as PaymentSettings["paymentProvider"], paymentMode: provider === "MANUAL_PIX" ? "MANUAL_PIX" : "PROVIDER" }))}
                >
                  <strong className="block text-sm">{title}</strong>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">{description}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Modo teste: a baixa simulada só ocorre se "Baixa automática de teste" estiver ligada. Em produção, use webhook do provedor.
            </div>

            <label className="mt-3 block text-sm font-medium text-slate-600">
              Chave Pix
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={currentPixSettingsForm.pixKey}
                onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, pixKey: event.target.value }))}
                placeholder="email, telefone ou chave aleatoria"
              />
            </label>

            {currentPixSettingsForm.paymentMode === "PROVIDER" ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-sm font-black text-slate-950">Credenciais de integração</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-600">
                    Ambiente
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={currentPixSettingsForm.providerEnvironment}
                      onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, providerEnvironment: event.target.value as PaymentSettings["providerEnvironment"] }))}
                    >
                      <option value="TEST">Teste / Sandbox</option>
                      <option value="PRODUCTION">Produção</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    API Key / Token
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={currentPixSettingsForm.providerApiKey}
                      onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, providerApiKey: event.target.value }))}
                      placeholder="Token do provedor"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Client ID
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={currentPixSettingsForm.providerClientId}
                      onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, providerClientId: event.target.value }))}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Client Secret
                    <input
                      type="password"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={currentPixSettingsForm.providerClientSecret}
                      onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, providerClientSecret: event.target.value }))}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Webhook secret
                    <input
                      type="password"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={currentPixSettingsForm.providerWebhookSecret}
                      onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, providerWebhookSecret: event.target.value }))}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    URL do webhook
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={currentPixSettingsForm.providerWebhookUrl}
                      onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, providerWebhookUrl: event.target.value }))}
                      placeholder="https://seu-dominio.com/api/webhooks/pagamentos"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-600">
                Recebedor
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={currentPixSettingsForm.pixReceiverName}
                  onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, pixReceiverName: event.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Cidade
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={currentPixSettingsForm.pixCity}
                  onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, pixCity: event.target.value }))}
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-600">
                Dia de vencimento da mensalidade
                <input
                  type="number"
                  min={1}
                  max={28}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={currentPixSettingsForm.monthlyDueDay}
                  onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, monthlyDueDay: event.target.value }))}
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Baixa automática de teste (segundos)
                <input
                  type="number"
                  min={5}
                  max={600}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={currentPixSettingsForm.pixAutoSettleSeconds}
                  onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, pixAutoSettleSeconds: event.target.value }))}
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-600">
                Multa fixa por atraso (R$)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={currentPixSettingsForm.lateFeeBRL}
                  onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, lateFeeBRL: event.target.value }))}
                  placeholder="0,00"
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Multa percentual por atraso (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={currentPixSettingsForm.lateFeePercent}
                  onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, lateFeePercent: event.target.value }))}
                />
              </label>
            </div>

            <label className="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-red-600"
                checked={currentPixSettingsForm.autoSettleEnabled}
                onChange={(event) => setPixSettingsForm((prev) => ({ ...prev, autoSettleEnabled: event.target.checked }))}
              />
              <span>
                Baixa automática de teste
                <span className="block text-xs font-medium text-slate-500">Use somente em homologação. Com provedor real, a baixa deve vir por webhook.</span>
              </span>
            </label>

            <button
              type="button"
              disabled={savePixSettingsMutation.isPending}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={() => void savePixSettingsMutation.mutateAsync()}
            >
              {savePixSettingsMutation.isPending ? "Salvando..." : "Salvar pagamentos e gateway"}
            </button>
          </div>

          {saveSettingsMutation.isError ? (
            <p className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 ${configSection === "club" || configSection === "appearance" || configSection === "uniforms" || configSection === "team" ? "" : "hidden"}`}>
              {(saveSettingsMutation.error instanceof Error && saveSettingsMutation.error.message) || "Falha ao salvar configurações."}
            </p>
          ) : null}

          <button type="submit" disabled={!hasSettingsChanges || saveSettingsMutation.isPending || ((configSection === "uniforms" || configSection === "team") && hasDuplicateUniformNames)} className={`w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60 ${configSection === "uniforms" || configSection === "team" ? "" : "hidden"}`}>
            {saveSettingsMutation.isPending ? "Salvando..." : "Salvar configurações"}
          </button>
        </form>

      </article>

      <article className={`min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-2 ${configSection === "board" || configSection === "profiles" || configSection === "audit" ? "" : "hidden"}`}>
        <div className={configSection === "board" ? "" : "hidden"}>
          <h3 className="text-lg font-bold text-slate-950">Diretoria e funções</h3>
          <p className="mt-1 text-sm text-slate-500">Cadastre cargos como Membro, Presidente e Financeiro, definindo os privilégios que essa função representa.</p>

          <form
            className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
            onSubmit={(event) => {
              event.preventDefault();
              void createBoardRoleMutation.mutateAsync();
            }}
          >
            <label className="text-sm font-medium text-slate-600">
              Nome da função
              <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={boardRoleForm.name} onChange={(event) => setBoardRoleForm((prev) => ({ ...prev, name: event.target.value }))} required />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Descrição
              <textarea className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2" value={boardRoleForm.description} onChange={(event) => setBoardRoleForm((prev) => ({ ...prev, description: event.target.value }))} />
            </label>
            <div className="grid gap-2 sm:grid-cols-4 lg:col-span-2">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={boardRoleForm.canAccessAdmin} onChange={(event) => setBoardRoleForm((prev) => ({ ...prev, canAccessAdmin: event.target.checked }))} />
                Admin
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={boardRoleForm.canAccessFinancial} onChange={(event) => setBoardRoleForm((prev) => ({ ...prev, canAccessFinancial: event.target.checked }))} />
                Financeiro
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={boardRoleForm.canAccessAthlete} onChange={(event) => setBoardRoleForm((prev) => ({ ...prev, canAccessAthlete: event.target.checked }))} />
                Atleta
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={boardRoleForm.isDefault} onChange={(event) => setBoardRoleForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
                Padrão
              </label>
            </div>
            <button type="submit" disabled={createBoardRoleMutation.isPending} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 lg:col-span-2">
              {createBoardRoleMutation.isPending ? "Cadastrando..." : "Cadastrar função"}
            </button>
          </form>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Função</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Financeiro</th>
                    <th className="px-4 py-3">Atleta</th>
                    <th className="px-4 py-3">Padrão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {boardRoles.map((role) => (
                    <tr key={role.id}>
                      <td className="px-4 py-3 font-black text-slate-950">{role.name}</td>
                      <td className="max-w-[24rem] px-4 py-3 font-semibold text-slate-500">{role.description ?? "Sem descrição"}</td>
                      {[
                        { key: "canAccessAdmin" as const, label: "Administrador" },
                        { key: "canAccessFinancial" as const, label: "Financeiro" },
                        { key: "canAccessAthlete" as const, label: "Atleta" }
                      ].map((permission) => (
                        <td key={permission.key} className="px-4 py-3">
                          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                            <input type="checkbox" checked={role[permission.key]} onChange={(event) => void updateBoardRoleMutation.mutateAsync({ role, patch: { [permission.key]: event.target.checked } })} />
                            {permission.label}
                          </label>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        {role.isDefault ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">Padrão</span> : <span className="text-xs font-semibold text-slate-400">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-0 divide-y divide-slate-100 bg-white md:hidden">
              {boardRoles.map((role) => (
                <div key={`mobile-board-role-${role.id}`} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-950">{role.name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{role.description ?? "Sem descrição"}</p>
                    </div>
                    {role.isDefault ? <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">Padrão</span> : null}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {[
                      { key: "canAccessAdmin" as const, label: "Administrador" },
                      { key: "canAccessFinancial" as const, label: "Financeiro" },
                      { key: "canAccessAthlete" as const, label: "Atleta" }
                    ].map((permission) => (
                      <label key={permission.key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                        <input type="checkbox" checked={role[permission.key]} onChange={(event) => void updateBoardRoleMutation.mutateAsync({ role, patch: { [permission.key]: event.target.checked } })} />
                        {permission.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {!boardRolesQuery.isLoading && boardRoles.length === 0 ? <p className="bg-white p-4 text-sm font-semibold text-slate-500">Nenhuma função cadastrada.</p> : null}
          </div>
        </div>

        <div className={configSection === "profiles" ? "" : "hidden"}>
          <h3 className="text-lg font-bold text-slate-950">Usuários e perfis</h3>
          <p className="mt-1 text-sm text-slate-500">Cadastre usuários e delegue acessos de administrador, atleta e financeiro.</p>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck size={18} className="mt-0.5 text-[var(--brand-accent)]" />
                <div>
                  <h4 className="font-black text-slate-950">Perfis empresariais</h4>
                  <p className="text-xs font-semibold leading-5 text-slate-500">Os cargos do clube são traduzidos para papéis técnicos seguros, sem criar acesso livre fora da matriz.</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {ENTERPRISE_PROFILES.map((profile) => (
                  <article key={profile.label} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h5 className="text-sm font-black text-slate-950">{profile.label}</h5>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">{roleListLabel(profile.roles)}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{profile.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-3">
                <h4 className="font-black text-slate-950">Matriz de permissões por módulo</h4>
                <p className="mt-1 text-xs font-semibold text-slate-500">Referência operacional usada por rotas, menu e gestão de usuários.</p>
              </div>
              <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] gap-3 border-b border-slate-100 px-3 py-2 text-[11px] font-black uppercase text-slate-400 lg:grid">
                <span>Área</span>
                <span>Papéis</span>
                <span>Acesso</span>
              </div>
              <div className="divide-y divide-slate-100">
                {PERMISSION_AREAS.map((item) => (
                  <article key={item.area} className="grid gap-2 px-3 py-3 text-sm lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] lg:items-start">
                    <div>
                      <p className="font-black text-slate-950">{item.area}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">{item.examples}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.roles.map((role) => (
                        <span key={`${item.area}-${role}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">{ROLE_LABELS[role]}</span>
                      ))}
                    </div>
                    <p className="text-xs font-bold leading-5 text-slate-600">{item.access}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <form
            className="mt-4 grid gap-3 rounded-lg border border-slate-200 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void createUserMutation.mutateAsync();
            }}
          >
            <label className="text-sm font-medium text-slate-600">
              Nome
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={userForm.name}
                onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={userForm.email}
                onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Senha
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                required
                minLength={6}
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={userForm.roleAdmin}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, roleAdmin: event.target.checked }))}
                />
                Admin
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={userForm.roleSportsDirector} onChange={(event) => setUserForm((prev) => ({ ...prev, roleSportsDirector: event.target.checked }))} />
                Diretor de esportes
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={userForm.roleAssociate} onChange={(event) => setUserForm((prev) => ({ ...prev, roleAssociate: event.target.checked }))} />
                Associado
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={userForm.roleAthlete}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, roleAthlete: event.target.checked }))}
                />
                Atleta
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={userForm.roleFinancial}
                  onChange={(event) => setUserForm((prev) => ({ ...prev, roleFinancial: event.target.checked }))}
                />
                Financeiro
              </label>
            </div>
            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {createUserMutation.isPending ? "Cadastrando..." : "Cadastrar usuário"}
            </button>
          </form>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500 lg:grid">
              <span>Usuário</span>
              <span>Vínculo</span>
              <span>Perfis</span>
              <span className="text-right">Ações</span>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
            {managedUsers.map((user) => (
              <div key={user.id} className="p-3 lg:px-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400 lg:hidden">Vínculo</p>
                    {user.associate ? (
                      <p className="text-sm font-semibold text-slate-600">
                        {user.associate.name}
                        {user.associate.athlete ? <span className="block text-xs text-slate-500">Atleta: {athletePositionLabels[user.associate.athlete.position] ?? user.associate.athlete.position}</span> : null}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-amber-600">Sem associado vinculado</p>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    <p className="w-full text-[10px] font-black uppercase tracking-[0.08em] text-slate-400 lg:hidden">Perfis</p>
                    {user.roles.map((role) => (
                      <span key={`${user.id}-${role}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                        {roleLabels[role] ?? role}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                    {user.associate?.athlete ? (
                      <Link
                        to={`/atletas/${user.associate.athlete.id}/perfil`}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Perfil do atleta
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                      onClick={() => openUserDetails(user)}
                    >
                      {selectedUserId === user.id ? "Fechar detalhes" : "Gerenciar usuário"}
                    </button>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Perfil principal: {roleLabels[user.role] ?? user.role}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={user.roles.includes("ADMIN")}
                      onChange={() => toggleRole(user, "ADMIN")}
                    />
                    Administrador
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input type="checkbox" checked={user.roles.includes("SPORTS_DIRECTOR")} onChange={() => toggleRole(user, "SPORTS_DIRECTOR")} />
                    Diretor de esportes
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input type="checkbox" checked={user.roles.includes("ASSOCIATE")} onChange={() => toggleRole(user, "ASSOCIATE")} />
                    Associado
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={user.roles.includes("ATHLETE")}
                      onChange={() => toggleRole(user, "ATHLETE")}
                    />
                    Atleta
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={user.roles.includes("FINANCIAL")}
                      onChange={() => toggleRole(user, "FINANCIAL")}
                    />
                    Financeiro
                  </label>
                </div>

                {selectedUserId === user.id ? (
                  <form
                    className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void updateUserMutation.mutateAsync({ userId: user.id, form: userEditForm });
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-950">Gestão completa do usuário</h4>
                        <p className="text-sm text-slate-500">Edite dados de acesso, perfis e senha.</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Criado em {formatDate(user.createdAt)}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-medium text-slate-600">
                        Nome
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={userEditForm.name}
                          onChange={(event) => setUserEditForm((prev) => ({ ...prev, name: event.target.value }))}
                          required
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        Email de acesso
                        <input
                          type="email"
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={userEditForm.email}
                          onChange={(event) => setUserEditForm((prev) => ({ ...prev, email: event.target.value }))}
                          required
                        />
                      </label>
                    </div>

                    <label className="text-sm font-medium text-slate-600">
                      Nova senha
                      <input
                        type="password"
                        minLength={6}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                        value={userEditForm.password}
                        onChange={(event) => setUserEditForm((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder="Deixe em branco para manter a senha atual"
                      />
                    </label>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={userEditForm.roleAdmin}
                          onChange={(event) => setUserEditForm((prev) => ({ ...prev, roleAdmin: event.target.checked }))}
                        />
                        Administrador
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input type="checkbox" checked={userEditForm.roleSportsDirector} onChange={(event) => setUserEditForm((prev) => ({ ...prev, roleSportsDirector: event.target.checked }))} />
                        Diretor de esportes
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input type="checkbox" checked={userEditForm.roleAssociate} onChange={(event) => setUserEditForm((prev) => ({ ...prev, roleAssociate: event.target.checked }))} />
                        Associado
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={userEditForm.roleAthlete}
                          onChange={(event) => setUserEditForm((prev) => ({ ...prev, roleAthlete: event.target.checked }))}
                        />
                        Atleta
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={userEditForm.roleFinancial}
                          onChange={(event) => setUserEditForm((prev) => ({ ...prev, roleFinancial: event.target.checked }))}
                        />
                        Financeiro
                      </label>
                    </div>

                    {user.associate ? (
                      <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <span className="block text-xs font-bold uppercase text-slate-400">Associado</span>
                          <strong className="text-slate-900">{user.associate.name}</strong>
                        </div>
                        <div>
                          <span className="block text-xs font-bold uppercase text-slate-400">Status</span>
                          {associateStatusHelp[user.associate.status].label ?? user.associate.status}
                        </div>
                        <div>
                          <span className="block text-xs font-bold uppercase text-slate-400">Mensalidade</span>
                          {formatCurrency(user.associate.monthlyFeeCents)}
                        </div>
                        <div>
                          <span className="block text-xs font-bold uppercase text-slate-400">Telefone</span>
                          {user.associate.phone ?? "-"}
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={updateUserMutation.isPending}
                      className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {updateUserMutation.isPending ? "Salvando..." : "Salvar usuário"}
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
            </div>
            {!usersQuery.isLoading && managedUsers.length === 0 ? <p className="p-4 text-sm font-semibold text-slate-500">Nenhum usuário cadastrado.</p> : null}
          </div>
        </div>

        <div className={configSection === "audit" ? "" : "hidden"}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Auditoria do sistema</h3>
              <p className="mt-1 text-sm text-slate-500">Registro de ações feitas por admin, atleta e financeiro.</p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => void auditLogsQuery.refetch()}
            >
              Atualizar
            </button>
          </div>
          <div className="grid gap-2">
            {(auditLogsQuery.data ?? []).map((log) => (
              <article key={log.id} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-950">{auditActionLabel(log.action)}</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                    {log.userName ? "Usuário" : "Sistema"} · {log.userRole ? auditRoleLabels[log.userRole] : "-"} · {log.method} {log.path}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </span>
              </article>
            ))}
          </div>
          {auditLogsQuery.isLoading ? <p className="text-sm text-slate-500">Carregando auditoria...</p> : null}
                  {!auditLogsQuery.isLoading && (auditLogsQuery.data ?? []).length === 0 ? <p className="text-sm text-slate-500">Nenhuma ação registrada ainda.</p> : null}
        </div>
      </article>
      </div>
    </section>
  );
}
