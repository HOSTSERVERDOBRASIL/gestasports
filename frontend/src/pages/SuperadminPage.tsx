import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Database,
  ExternalLink,
  Globe2,
  KeyRound,
  Palette,
  Play,
  Plus,
  Rocket,
  Search,
  ServerCog,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Surface } from "../components/ui/AppUI";
import { apiRequest } from "../services/api";
import type { AuditLog, BillingEnforcementResult, MonthlySaaSGenerationResult, OrganizationTenant, PlatformSettings, SaaSChargeType, SaaSPlan, TenantModuleCode, TenantStatus, UserRole } from "../types/domain";

type WorkspacePanel = "OPERATIONS" | "OVERVIEW" | "SITE" | "ACCESS" | "DOMAINS" | "MODULES" | "BILLING";
type ManagementView = "DASHBOARD" | "FINANCE" | "OPERATIONS" | "INFRA" | "CLIENTS" | "NEW" | "AUDIT" | "SETTINGS";
type SettingsTab = "GENERAL" | "CLIENTS" | "DEADLINES" | "BILLING" | "PROVISIONING" | "SECURITY";
type SystemStatusFilter = "ALL" | "ACTIVE" | "DISABLED" | "PENDING";

const statusLabels: Record<TenantStatus, string> = {
  TRIAL: "Teste",
  ACTIVE: "Ativo",
  IMPLEMENTATION: "Implantação",
  SUSPENDED: "Suspenso",
  CANCELED: "Cancelado"
};

const chargeTypeLabels: Record<SaaSChargeType, string> = {
  MONTHLY: "Mensalidade",
  IMPLEMENTATION: "Implantação",
  EXTRA: "Extra"
};

const roleLabels: Record<UserRole, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Administrador",
  SPORTS_DIRECTOR: "Diretor de esportes",
  ASSOCIATE: "Associado",
  FINANCIAL: "Financeiro",
  ATHLETE: "Atleta"
};

const tenantRoles: UserRole[] = ["ADMIN", "SPORTS_DIRECTOR", "FINANCIAL", "ASSOCIATE", "ATHLETE"];
const planModuleOptions: Array<{ code: TenantModuleCode; label: string }> = [
  { code: "ASSOCIATES", label: "Associados" },
  { code: "ATHLETES", label: "Atletas" },
  { code: "GAMES", label: "Jogos" },
  { code: "EVENTS", label: "Eventos" },
  { code: "LINEUPS", label: "Escalações" },
  { code: "ATTENDANCE", label: "Presenças" },
  { code: "RANKINGS", label: "Rankings" },
  { code: "FINANCE", label: "Financeiro" },
  { code: "REPORTS", label: "Relatórios" },
  { code: "DOCUMENTS", label: "Acervo e documentos" },
  { code: "COMMUNICATION", label: "Comunicação" },
  { code: "GALLERY", label: "Galeria" },
  { code: "SETTINGS", label: "Configurações" }
];
const PLATFORM_NAME = "GestaSports";
const PLATFORM_HOST = "gestasports.com.br";
const PLATFORM_URL = `https://${PLATFORM_HOST}`;
const DASHBOARD_ROW_LIMIT = 5;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function centsFromBRL(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function brlFromCents(cents: number) {
  return cents ? String((cents / 100).toFixed(2)).replace(".", ",") : "";
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function fileToDataUrl(file: File, onLoad: (value: string) => void, onError: (message: string) => void) {
  if (!file.type.startsWith("image/")) {
    onError("Selecione um arquivo de imagem válido.");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    onError("A imagem original deve ter no máximo 20 MB.");
    return;
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.onload = () => {
    const maxDimension = 900;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      URL.revokeObjectURL(objectUrl);
      onError("Não foi possível processar esta imagem.");
      return;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const optimized = canvas.toDataURL("image/webp", 0.86);
    URL.revokeObjectURL(objectUrl);

    if (optimized.length > 2_000_000) {
      onError("O logo continua muito grande após a otimização. Escolha uma imagem menor.");
      return;
    }

    onLoad(optimized);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    onError("Não foi possível abrir esta imagem.");
  };
  image.src = objectUrl;
}

function tenantPublicPath(tenant: OrganizationTenant) {
  return tenant.primaryUrl ?? tenant.publicPathUrl ?? `https://${tenant.defaultSubdomain}`;
}

function tenantPathAccess(tenant: OrganizationTenant) {
  return tenant.pathUrl ?? `${PLATFORM_URL}/${tenant.slug}`;
}

function tenantReadiness(tenant: OrganizationTenant) {
  const checks = [
    { label: "Provisionamento pronto", done: tenant.provisioningStatus === "READY" },
    { label: "Login administrador", done: (tenant.users ?? []).some((user) => user.role === "ADMIN") },
    { label: "Dominio verificado", done: (tenant.verifiedDomains ?? 0) > 0 || (tenant.domains ?? []).some((domain) => domain.status === "VERIFIED") },
    { label: "Marca configurada", done: Boolean(tenant.brandName && tenant.primaryColor && tenant.secondaryColor) },
    { label: "Financeiro inicial", done: Boolean(tenant.paymentSettings) },
    { label: "Contrato SaaS", done: tenant.monthlyFeeCents > 0 || tenant.planName.toLowerCase().includes("piloto") }
  ];
  const completed = checks.filter((check) => check.done).length;

  return {
    checks,
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
    ready: completed === checks.length
  };
}

export function SuperadminPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [managementView, setManagementView] = useState<ManagementView>("DASHBOARD");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("OPERATIONS");
  const [systemStatusFilter, setSystemStatusFilter] = useState<SystemStatusFilter>("ALL");
  const [systemSearch, setSystemSearch] = useState("");
  const [tenantForm, setTenantForm] = useState({
    planId: "",
    name: "",
    slug: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    adminPassword: "",
    planName: "Plano Padrão",
    monthlyFeeBRL: "",
    implementationFeeBRL: "",
    monthlyDueDay: "10",
    databaseUrl: "",
    brandName: "",
    primaryColor: "#08255b",
    secondaryColor: "#55ad32",
    accentColor: "#7ac943",
    logoUrl: "",
    playersPerTeam: "11",
    notes: ""
  });
  const [logoUploadError, setLogoUploadError] = useState("");
  const [brandForm, setBrandForm] = useState({
    brandName: "",
    primaryColor: "#08255b",
    secondaryColor: "#55ad32",
    accentColor: "#7ac943",
    logoUrl: "",
    notes: ""
  });
  const [commercialForm, setCommercialForm] = useState({
    planName: "",
    monthlyFeeBRL: "",
    implementationFeeBRL: "",
    monthlyDueDay: "10"
  });
  const [domainForm, setDomainForm] = useState({ hostname: "" });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    roles: ["ADMIN"] as UserRole[]
  });
  const [chargeForm, setChargeForm] = useState({
    type: "MONTHLY" as SaaSChargeType,
    description: "Mensalidade SaaS",
    amountBRL: "",
    dueDate: todayInput()
  });
  const [billingGraceDays, setBillingGraceDays] = useState("7");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("GENERAL");
  const [settingsForm, setSettingsForm] = useState({
    platformName: "GestaSports",
    supportEmail: "suporte@gestasports.com.br",
    commercialEmail: "comercial@gestasports.com.br",
    baseDomain: "gestasports.com.br",
    defaultTrialDays: "14",
    defaultImplementationDays: "7",
    defaultBillingGraceDays: "7",
    defaultMonthlyDueDay: "10",
    autoSuspendEnabled: true,
    autoReactivateEnabled: true,
    requireVerifiedDomain: false,
    allowPathAccess: true,
    defaultProvisioningMode: "AUTOMATIC" as PlatformSettings["defaultProvisioningMode"],
    tenantNamingPattern: "{slug}",
    auditRetentionDays: "180"
  });
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "Profissional",
    slug: "profissional",
    description: "Gestão completa do clube com financeiro, jogos, rankings e relatórios.",
    monthlyFeeBRL: "199,00",
    implementationFeeBRL: "499,00",
    monthlyDueDay: "10",
    maxUsers: "8",
    maxAthletes: "200",
    maxTeams: "5",
    customDomainAllowed: true,
    active: true,
    moduleCodes: ["ASSOCIATES", "ATHLETES", "GAMES", "LINEUPS", "ATTENDANCE", "RANKINGS", "FINANCE", "REPORTS", "DOCUMENTS", "GALLERY", "SETTINGS"] as TenantModuleCode[]
  });

  const tenantsQuery = useQuery({
    queryKey: ["superadmin-tenants"],
    queryFn: () => apiRequest<OrganizationTenant[]>("/superadmin/tenants")
  });

  const plansQuery = useQuery({
    queryKey: ["superadmin-plans"],
    queryFn: () => apiRequest<SaaSPlan[]>("/superadmin/plans")
  });

  const settingsQuery = useQuery({
    queryKey: ["superadmin-settings"],
    queryFn: () => apiRequest<PlatformSettings>("/superadmin/settings")
  });

  const auditLogsQuery = useQuery({
    queryKey: ["superadmin-audit-logs"],
    queryFn: () => apiRequest<AuditLog[]>("/audit-logs?limit=80"),
    enabled: managementView === "DASHBOARD" || managementView === "FINANCE" || managementView === "AUDIT"
  });

  const tenants = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data]);
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const platformSettings = settingsQuery.data ?? null;
  const auditLogs = auditLogsQuery.data ?? [];
  const filteredSystems = useMemo(
    () => {
      const term = systemSearch.trim().toLowerCase();
      return tenants.filter((tenant) => {
        const statusMatches =
          systemStatusFilter === "ALL" ||
          (systemStatusFilter === "ACTIVE" && (tenant.status === "ACTIVE" || tenant.status === "TRIAL" || tenant.status === "IMPLEMENTATION")) ||
          (systemStatusFilter === "DISABLED" && (tenant.status === "SUSPENDED" || tenant.status === "CANCELED")) ||
          (systemStatusFilter === "PENDING" && !tenantReadiness(tenant).ready);
        if (!statusMatches) return false;
        if (!term) return true;
        return [tenant.name, tenant.slug, tenant.contactEmail, tenant.defaultSubdomain, tenant.databaseName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      });
    },
    [systemSearch, systemStatusFilter, tenants]
  );
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? tenants[0] ?? null,
    [selectedTenantId, tenants]
  );
  const selectedTenantPlan = useMemo(
    () => plans.find((plan) => plan.id === tenantForm.planId) ?? null,
    [plans, tenantForm.planId]
  );

  useEffect(() => {
    if (!platformSettings) return;

    setSettingsForm({
      platformName: platformSettings.platformName,
      supportEmail: platformSettings.supportEmail,
      commercialEmail: platformSettings.commercialEmail,
      baseDomain: platformSettings.baseDomain,
      defaultTrialDays: String(platformSettings.defaultTrialDays),
      defaultImplementationDays: String(platformSettings.defaultImplementationDays),
      defaultBillingGraceDays: String(platformSettings.defaultBillingGraceDays),
      defaultMonthlyDueDay: String(platformSettings.defaultMonthlyDueDay),
      autoSuspendEnabled: platformSettings.autoSuspendEnabled,
      autoReactivateEnabled: platformSettings.autoReactivateEnabled,
      requireVerifiedDomain: platformSettings.requireVerifiedDomain,
      allowPathAccess: platformSettings.allowPathAccess,
      defaultProvisioningMode: platformSettings.defaultProvisioningMode,
      tenantNamingPattern: platformSettings.tenantNamingPattern,
      auditRetentionDays: String(platformSettings.auditRetentionDays)
    });
    setBillingGraceDays(String(platformSettings.defaultBillingGraceDays));
  }, [platformSettings]);

  useEffect(() => {
    if (!selectedTenant) return;

    setBrandForm({
      brandName: selectedTenant.brandName ?? selectedTenant.name,
      primaryColor: selectedTenant.primaryColor,
      secondaryColor: selectedTenant.secondaryColor,
      accentColor: selectedTenant.accentColor,
      logoUrl: selectedTenant.logoUrl ?? "",
      notes: selectedTenant.notes ?? ""
    });
    setCommercialForm({
      planName: selectedTenant.planName,
      monthlyFeeBRL: brlFromCents(selectedTenant.monthlyFeeCents),
      implementationFeeBRL: brlFromCents(selectedTenant.implementationFeeCents),
      monthlyDueDay: String(selectedTenant.monthlyDueDay)
    });
  }, [selectedTenant]);

  const totals = useMemo(
    () => {
      const readiness = tenants.map((tenant) => tenantReadiness(tenant));

      return {
        active: tenants.filter((tenant) => tenant.status === "ACTIVE").length,
        disabled: tenants.filter((tenant) => tenant.status === "SUSPENDED" || tenant.status === "CANCELED").length,
        ready: readiness.filter((item) => item.ready).length,
        attention: readiness.filter((item) => !item.ready).length,
        paying: tenants.filter((tenant) => tenant.monthlyFeeCents > 0 && tenant.status !== "CANCELED").length,
        missingAdmin: tenants.filter((tenant) => !(tenant.users ?? []).some((user) => user.role === "ADMIN")).length,
        missingDomain: tenants.filter((tenant) => !((tenant.verifiedDomains ?? 0) > 0 || (tenant.domains ?? []).some((domain) => domain.status === "VERIFIED"))).length,
        pendingProvision: tenants.filter((tenant) => tenant.provisioningStatus !== "READY").length,
        openCents: tenants.reduce((total, tenant) => total + tenant.openAmountCents, 0),
        monthlyCents: tenants.reduce((total, tenant) => total + tenant.monthlyFeeCents, 0),
        paidCents: tenants.reduce((total, tenant) => total + (tenant.paidAmountCents ?? 0), 0),
        averageTicketCents: tenants.length ? Math.round(tenants.reduce((total, tenant) => total + tenant.monthlyFeeCents, 0) / tenants.length) : 0
      };
    },
    [tenants]
  );

  const revenueByTenant = useMemo(
    () =>
      tenants
        .map((tenant) => ({
          name: tenant.name,
          mensal: Math.round((tenant.monthlyFeeCents || 0) / 100),
          aberto: Math.round((tenant.openAmountCents || 0) / 100)
        }))
        .sort((a, b) => b.mensal - a.mensal)
        .slice(0, 8),
    [tenants]
  );

  const statusChartData = useMemo(
    () => [
      { name: "Ativos", value: totals.active, color: "#55ad32" },
      { name: "Suspensos", value: totals.disabled, color: "#f59e0b" },
      { name: "Pendencias", value: totals.attention, color: "#08255b" }
    ].filter((item) => item.value > 0),
    [totals.active, totals.attention, totals.disabled]
  );

  const healthScore = tenants.length ? Math.round((totals.ready / tenants.length) * 100) : 100;
  const priorityTenants = useMemo(
    () =>
      [...tenants]
        .map((tenant) => ({ tenant, readiness: tenantReadiness(tenant) }))
        .filter(({ readiness, tenant }) => !readiness.ready || tenant.openAmountCents > 0 || tenant.provisioningStatus !== "READY")
        .sort((a, b) => {
          const aRisk = (a.tenant.provisioningStatus !== "READY" ? 40 : 0) + (a.tenant.openAmountCents > 0 ? 30 : 0) + (100 - a.readiness.percent);
          const bRisk = (b.tenant.provisioningStatus !== "READY" ? 40 : 0) + (b.tenant.openAmountCents > 0 ? 30 : 0) + (100 - b.readiness.percent);
          return bRisk - aRisk;
        })
        .slice(0, 6),
    [tenants]
  );

  const defaultSubdomainPreview = tenantForm.slug.trim() ? `${tenantForm.slug.trim().toLowerCase()}.${PLATFORM_HOST}` : `cliente.${PLATFORM_HOST}`;
  const defaultPublicPathPreview = tenantForm.slug.trim() ? `${PLATFORM_URL}/${tenantForm.slug.trim().toLowerCase()}` : `${PLATFORM_URL}/cliente`;

  useEffect(() => {
    const view = searchParams.get("view");
    const filter = searchParams.get("filter");

    if (view === "new") {
      setManagementView("NEW");
      setActivePanel("OVERVIEW");
      return;
    }

    if (view === "dashboard" || view === "overview" || view === "plans" || view === "resources" || view === "templates" || view === "monitoring") {
      setManagementView("DASHBOARD");
      setActivePanel("OVERVIEW");
      return;
    }

    if (view === "finance" || view === "billing") {
      setManagementView("FINANCE");
      setActivePanel("OPERATIONS");
      return;
    }

    if (view === "audit" || view === "logs") {
      setManagementView("AUDIT");
      setActivePanel("OPERATIONS");
      return;
    }

    if (view === "infra" || view === "infrastructure" || view === "global-integrations") {
      setManagementView("INFRA");
      setActivePanel("DOMAINS");
      return;
    }

    if (view === "settings" || view === "configuracoes" || view === "support") {
      setManagementView("SETTINGS");
      setActivePanel("OVERVIEW");
      return;
    }

    if (view === "clients" || view === "operations") {
      setManagementView("OPERATIONS");
      setActivePanel("OPERATIONS");
      if (filter === "active") setSystemStatusFilter("ACTIVE");
      else if (filter === "disabled") setSystemStatusFilter("DISABLED");
      else if (filter === "pending") setSystemStatusFilter("PENDING");
      else setSystemStatusFilter("ALL");
      return;
    }

    if (view === null) {
      setManagementView("DASHBOARD");
      setActivePanel("OVERVIEW");
    }
  }, [searchParams]);

  const createTenantMutation = useMutation({
    mutationFn: () =>
      apiRequest<OrganizationTenant>("/superadmin/tenants", {
        method: "POST",
        body: JSON.stringify({
          planId: tenantForm.planId || undefined,
          name: tenantForm.name,
          slug: tenantForm.slug,
          contactName: tenantForm.contactName,
          contactEmail: tenantForm.contactEmail,
          contactPhone: tenantForm.contactPhone,
          adminPassword: tenantForm.adminPassword,
          planName: tenantForm.planName,
          monthlyFeeCents: centsFromBRL(tenantForm.monthlyFeeBRL),
          implementationFeeCents: centsFromBRL(tenantForm.implementationFeeBRL),
          monthlyDueDay: Number(tenantForm.monthlyDueDay),
          databaseUrl: tenantForm.databaseUrl,
          brandName: tenantForm.brandName,
          primaryColor: tenantForm.primaryColor,
          secondaryColor: tenantForm.secondaryColor,
          accentColor: tenantForm.accentColor,
          logoUrl: tenantForm.logoUrl,
          playersPerTeam: Number(tenantForm.playersPerTeam) === 7 ? 7 : 11,
          notes: tenantForm.notes
        })
      }),
    onSuccess: (tenant) => {
      setSelectedTenantId(tenant.id);
      setManagementView("CLIENTS");
      setActivePanel("OPERATIONS");
      setTenantForm({
        planId: "",
        name: "",
        slug: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        adminPassword: "",
        planName: "Plano Padrão",
        monthlyFeeBRL: "",
        implementationFeeBRL: "",
        monthlyDueDay: "10",
        databaseUrl: "",
        brandName: "",
        primaryColor: "#08255b",
        secondaryColor: "#55ad32",
        accentColor: "#7ac943",
        logoUrl: "",
        playersPerTeam: "11",
        notes: ""
      });
      void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
    }
  });

  const patchTenantMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<OrganizationTenant> }) =>
      apiRequest<OrganizationTenant>(`/superadmin/tenants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      }),
    onSuccess: (tenant) => {
      setSelectedTenantId(tenant.id);
      void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
    }
  });

  const updateModulesMutation = useMutation({
    mutationFn: ({ id, enabledModules }: { id: string; enabledModules: TenantModuleCode[] }) =>
      apiRequest<OrganizationTenant>(`/superadmin/tenants/${id}/modules`, {
        method: "PATCH",
        body: JSON.stringify({ enabledModules })
      }),
    onSuccess: (tenant) => {
      setSelectedTenantId(tenant.id);
      void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
    }
  });

  const savePlanMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: planForm.name,
        slug: planForm.slug,
        description: planForm.description,
        monthlyFeeCents: centsFromBRL(planForm.monthlyFeeBRL),
        implementationFeeCents: centsFromBRL(planForm.implementationFeeBRL),
        monthlyDueDay: Number(planForm.monthlyDueDay) || 10,
        maxUsers: planForm.maxUsers ? Number(planForm.maxUsers) : null,
        maxAthletes: planForm.maxAthletes ? Number(planForm.maxAthletes) : null,
        maxTeams: planForm.maxTeams ? Number(planForm.maxTeams) : null,
        customDomainAllowed: planForm.customDomainAllowed,
        active: planForm.active,
        moduleCodes: planForm.moduleCodes
      };

      return planForm.id ?
         apiRequest<SaaSPlan>(`/superadmin/plans/${planForm.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : apiRequest<SaaSPlan>("/superadmin/plans", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["superadmin-plans"] })
  });

  const applyPlanMutation = useMutation({
    mutationFn: ({ tenantId, planId }: { tenantId: string; planId: string }) =>
      apiRequest<OrganizationTenant>(`/superadmin/tenants/${tenantId}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ planId })
      }),
    onSuccess: (tenant) => {
      setSelectedTenantId(tenant.id);
      void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
    }
  });

  const provisionMutation = useMutation({
    mutationFn: (id: string) => apiRequest<OrganizationTenant>(`/superadmin/tenants/${id}/provision`, { method: "POST" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] })
  });

  const createDomainMutation = useMutation({
    mutationFn: () =>
      apiRequest<OrganizationTenant>(`/superadmin/tenants/${selectedTenant.id}/domains`, {
        method: "POST",
        body: JSON.stringify(domainForm)
      }),
    onSuccess: () => {
      setDomainForm({ hostname: "" });
      void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
    }
  });

  const verifyDomainMutation = useMutation({
    mutationFn: (domainId: string) => apiRequest<OrganizationTenant>(`/superadmin/domains/${domainId}/verify`, { method: "PATCH" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] })
  });

  const createUserMutation = useMutation({
    mutationFn: () =>
      apiRequest<OrganizationTenant>(`/superadmin/tenants/${selectedTenant.id}/users`, {
        method: "POST",
        body: JSON.stringify({
          ...userForm,
          role: userForm.roles[0] ?? "ADMIN"
        })
      }),
    onSuccess: () => {
      setUserForm({ name: "", email: "", password: "", roles: ["ADMIN"] });
      void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
    }
  });

  const createChargeMutation = useMutation({
    mutationFn: () =>
      apiRequest<OrganizationTenant>(`/superadmin/tenants/${selectedTenant.id}/charges`, {
        method: "POST",
        body: JSON.stringify({
          type: chargeForm.type,
          description: chargeForm.description,
          amountCents: centsFromBRL(chargeForm.amountBRL),
          dueDate: new Date(chargeForm.dueDate).toISOString()
        })
      }),
    onSuccess: () => {
      setChargeForm({ type: "MONTHLY", description: "Mensalidade SaaS", amountBRL: "", dueDate: todayInput() });
      void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] });
    }
  });

  const settleChargeMutation = useMutation({
    mutationFn: (chargeId: string) => apiRequest<OrganizationTenant>(`/superadmin/charges/${chargeId}/settle`, { method: "PATCH" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] })
  });

  const generateMonthlyMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      return apiRequest<MonthlySaaSGenerationResult>(`/superadmin/billing/generate-monthly?month=${now.getMonth() + 1}&year=${now.getFullYear()}`, { method: "POST" });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] })
  });

  const enforceDelinquencyMutation = useMutation({
    mutationFn: () => apiRequest<BillingEnforcementResult>(`/superadmin/billing/enforce-delinquency?graceDays=${Number(billingGraceDays) || 7}`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["superadmin-tenants"] })
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () =>
      apiRequest<PlatformSettings>("/superadmin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          platformName: settingsForm.platformName,
          supportEmail: settingsForm.supportEmail,
          commercialEmail: settingsForm.commercialEmail,
          baseDomain: settingsForm.baseDomain,
          defaultTrialDays: Number(settingsForm.defaultTrialDays) || 0,
          defaultImplementationDays: Number(settingsForm.defaultImplementationDays) || 0,
          defaultBillingGraceDays: Number(settingsForm.defaultBillingGraceDays) || 0,
          defaultMonthlyDueDay: Number(settingsForm.defaultMonthlyDueDay) || 10,
          autoSuspendEnabled: settingsForm.autoSuspendEnabled,
          autoReactivateEnabled: settingsForm.autoReactivateEnabled,
          requireVerifiedDomain: settingsForm.requireVerifiedDomain,
          allowPathAccess: settingsForm.allowPathAccess,
          defaultProvisioningMode: settingsForm.defaultProvisioningMode,
          tenantNamingPattern: settingsForm.tenantNamingPattern,
          auditRetentionDays: Number(settingsForm.auditRetentionDays) || 30
        })
      }),
    onSuccess: (settings) => {
      setBillingGraceDays(String(settings.defaultBillingGraceDays));
      void queryClient.invalidateQueries({ queryKey: ["superadmin-settings"] });
    }
  });

  function handleCreateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tenantForm.logoUrl.length > 2_000_000) {
      setLogoUploadError("O logo é muito grande para envio. Escolha uma imagem menor.");
      return;
    }
    createTenantMutation.mutate();
  }

  function handleSaveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;

    void patchTenantMutation.mutateAsync({
      id: selectedTenant.id,
      payload: {
        brandName: brandForm.brandName,
        primaryColor: brandForm.primaryColor,
        secondaryColor: brandForm.secondaryColor,
        accentColor: brandForm.accentColor,
        logoUrl: brandForm.logoUrl,
        notes: brandForm.notes
      }
    });
  }

  function handleSaveCommercial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;

    void patchTenantMutation.mutateAsync({
      id: selectedTenant.id,
      payload: {
        planName: commercialForm.planName,
        monthlyFeeCents: centsFromBRL(commercialForm.monthlyFeeBRL),
        implementationFeeCents: centsFromBRL(commercialForm.implementationFeeBRL),
        monthlyDueDay: Number(commercialForm.monthlyDueDay)
      }
    });
  }

  function handleCreateDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    void createDomainMutation.mutateAsync();
  }

  function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    if (userForm.roles.length === 0) return;
    void createUserMutation.mutateAsync();
  }

  function toggleUserRole(role: UserRole, enabled: boolean) {
    setUserForm((prev) => {
      const nextRoles = enabled
        ? Array.from(new Set([...prev.roles, role]))
        : prev.roles.filter((item) => item !== role);

      return {
        ...prev,
        roles: nextRoles.length > 0 ? nextRoles : prev.roles
      };
    });
  }

  function handleCreateCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenant) return;
    void createChargeMutation.mutateAsync();
  }

  function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void savePlanMutation.mutateAsync();
  }

  function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveSettingsMutation.mutateAsync();
  }

  function editPlan(plan: SaaSPlan) {
    setPlanForm({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? "",
      monthlyFeeBRL: brlFromCents(plan.monthlyFeeCents),
      implementationFeeBRL: brlFromCents(plan.implementationFeeCents),
      monthlyDueDay: String(plan.monthlyDueDay),
      maxUsers: plan.maxUsers ? String(plan.maxUsers) : "",
      maxAthletes: plan.maxAthletes ? String(plan.maxAthletes) : "",
      maxTeams: plan.maxTeams ? String(plan.maxTeams) : "",
      customDomainAllowed: plan.customDomainAllowed,
      active: plan.active,
      moduleCodes: plan.moduleCodes
    });
  }

  function togglePlanModule(code: TenantModuleCode, enabled: boolean) {
    setPlanForm((prev) => ({
      ...prev,
      moduleCodes: enabled ? Array.from(new Set([...prev.moduleCodes, code])) : prev.moduleCodes.filter((item) => item !== code)
    }));
  }

  function setTenantOperationalStatus(tenant: OrganizationTenant, enabled: boolean) {
    void patchTenantMutation.mutateAsync({
      id: tenant.id,
      payload: enabled ?
         { status: "ACTIVE", suspendedReason: "" }
        : { status: "SUSPENDED", suspendedReason: "Sistema desabilitado pelo painel GestaSports" }
    });
  }

  function setTenantModule(tenant: OrganizationTenant, code: TenantModuleCode, enabled: boolean) {
    const nextModules = new Set(tenant.enabledModules ?? []);
    if (enabled) {
      nextModules.add(code);
    } else {
      nextModules.delete(code);
    }

    void updateModulesMutation.mutateAsync({
      id: tenant.id,
      enabledModules: Array.from(nextModules)
    });
  }

  return (
    <section className="space-y-4">
      <Surface padding="md" className="hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <img src="/brand/gestasports-logo-transparent.png" alt="GestaSports" className="h-20 w-44 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-[#55ad32]">{PLATFORM_NAME}</p>
              <h2 className="mt-1 text-2xl font-black text-[#08255b]">Central SaaS de clubes</h2>
              <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">
                Gerencie clientes alugados com subdomínio, site, marca, usuários, cobranças e configurações próprias.
              </p>
            </div>
          </div>
          <a className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700" href={PLATFORM_URL} target="_blank" rel="noreferrer">
            {PLATFORM_HOST}
            <ExternalLink size={14} />
          </a>
        </div>
      </Surface>

      <div className="hidden gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Surface padding="sm">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-slate-500">Receita recorrente</p>
            <strong className="shrink-0 text-lg font-black text-emerald-700">{formatCurrency(totals.monthlyCents)}</strong>
          </div>
        </Surface>
        <Surface padding="sm">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-slate-500">Em aberto</p>
            <strong className="shrink-0 text-lg font-black text-amber-700">{formatCurrency(totals.openCents)}</strong>
          </div>
        </Surface>
        <Surface padding="sm">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-slate-500">Recebido</p>
            <strong className="shrink-0 text-lg font-black text-[#08255b]">{formatCurrency(totals.paidCents)}</strong>
          </div>
        </Surface>
        <Surface padding="sm">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-slate-500">Clientes pagantes</p>
            <strong className="shrink-0 text-lg font-black text-slate-950">{totals.paying}</strong>
          </div>
        </Surface>
        <Surface padding="sm">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <p className="text-xs font-black uppercase text-slate-500">Ticket medio</p>
            <strong className="shrink-0 text-lg font-black text-slate-950">{formatCurrency(totals.averageTicketCents)}</strong>
          </div>
        </Surface>
      </div>

      <div className={managementView === "NEW" ? "space-y-4" : "grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]"}>
        <div className={managementView === "NEW" ? "hidden" : "xl:col-span-2"}>
          <Surface padding="md" className="fl-superadmin-command">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#55ad32]">GestaSports Admin</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Controle SaaS de clientes, planos, billing, infraestrutura e auditoria.</p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#08255b] px-3 py-2 text-sm font-black text-white hover:bg-[#0b2f6f]"
                onClick={() => {
                  setManagementView("NEW");
                  setActivePanel("OVERVIEW");
                }}
              >
                <Plus size={16} />
                Novo cliente
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Dashboard", description: "Visão geral", icon: CircleDollarSign, view: "DASHBOARD" as ManagementView, filter: "ALL" as typeof systemStatusFilter },
                { label: "Clientes", description: "Listar e inserir", icon: Rocket, view: "OPERATIONS" as ManagementView, filter: "ALL" as typeof systemStatusFilter },
                { label: "Infraestrutura", description: "Dominios e bancos", icon: ServerCog, view: "INFRA" as ManagementView, filter: "ALL" as typeof systemStatusFilter },
                { label: "Pendências", description: `${totals.attention} para revisar`, icon: ShieldCheck, view: "OPERATIONS" as ManagementView, filter: "PENDING" as typeof systemStatusFilter },
                { label: "Logs", description: "Auditoria e acessos", icon: ClipboardList, view: "AUDIT" as ManagementView, filter: "ALL" as typeof systemStatusFilter }
              ].map((item) => {
                const Icon = item.icon;
                const active = managementView === item.view && (item.view !== "OPERATIONS" || systemStatusFilter === item.filter);
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`flex min-h-16 w-full min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-left ${active ? "border-[#08255b] bg-[#08255b] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
                    onClick={() => {
                      setManagementView(item.view);
                      setSystemStatusFilter(item.filter);
                      setActivePanel(item.view === "CLIENTS" || item.view === "NEW" ? "OVERVIEW" : "OPERATIONS");
                    }}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{item.label}</span>
                      <span className={`block truncate text-[11px] font-semibold ${active ? "text-white/70" : "text-slate-400"}`}>{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

          </Surface>
        </div>

        {managementView === "NEW" ? (
        <div className="space-y-4">
          {managementView === "NEW" ? (
          <Surface padding="md" className="min-h-[calc(100vh-18rem)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black text-slate-950">Novo cliente</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">Cadastre o clube, defina o acesso principal e prepare o ambiente SaaS em uma tela unica.</p>
              </div>
              <span className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-[#55ad32]">
                <Plus size={18} />
              </span>
            </div>
            <form className="mt-5 grid gap-3 lg:grid-cols-12" onSubmit={handleCreateTenant}>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-6" placeholder="Nome do clube" value={tenantForm.name} onChange={(event) => setTenantForm((prev) => ({ ...prev, name: event.target.value }))} required />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-6" placeholder="slug-do-clube" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Use letras minúsculas, números e hífens entre as palavras." value={tenantForm.slug} onChange={(event) => setTenantForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} required />
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 lg:col-span-12">
                <p>URL principal: <strong className="text-slate-900">https://{defaultSubdomainPreview}</strong></p>
                <p className="mt-1">URL alternativa por caminho: <strong className="text-slate-900">{defaultPublicPathPreview}</strong></p>
              </div>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-4"
                value={tenantForm.planId}
                onChange={(event) => {
                  const plan = plans.find((item) => item.id === event.target.value);
                  setTenantForm((prev) => ({
                    ...prev,
                    planId: event.target.value,
                    planName: plan?.name ?? prev.planName,
                    monthlyFeeBRL: plan ? brlFromCents(plan.monthlyFeeCents) : prev.monthlyFeeBRL,
                    implementationFeeBRL: plan ? brlFromCents(plan.implementationFeeCents) : prev.implementationFeeBRL,
                    monthlyDueDay: plan ? String(plan.monthlyDueDay) : prev.monthlyDueDay
                  }));
                }}
              >
                <option value="">Plano manual</option>
                {plans.filter((plan) => plan.active).map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name} - {formatCurrency(plan.monthlyFeeCents)}/mês</option>
                ))}
              </select>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 lg:col-span-8">
                {selectedTenantPlan ? (
                  <span>{selectedTenantPlan.moduleCodes.length} módulos, {selectedTenantPlan.customDomainAllowed ? "domínio próprio incluso" : "sem domínio próprio"}, limite de {selectedTenantPlan.maxAthletes ?? "ilimitados"} atletas.</span>
                ) : (
                  <span>Contrato manual: informe valores e módulos depois da criação.</span>
                )}
              </div>
              <label className="block text-sm font-semibold text-slate-700 lg:col-span-4">
                Formato esportivo
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal text-slate-900"
                  value={tenantForm.playersPerTeam}
                  onChange={(event) => setTenantForm((prev) => ({ ...prev, playersPerTeam: event.target.value }))}
                >
                  <option value="11">Futebol 11</option>
                  <option value="7">Futebol 7</option>
                </select>
              </label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-4" placeholder="Responsavel pelo admin" value={tenantForm.contactName} onChange={(event) => setTenantForm((prev) => ({ ...prev, contactName: event.target.value }))} />
              <input type="email" className="w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-4" placeholder="email do admin@cliente.com" value={tenantForm.contactEmail} onChange={(event) => setTenantForm((prev) => ({ ...prev, contactEmail: event.target.value }))} required />
              <input type="password" minLength={10} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}" title="Use pelo menos 10 caracteres com letra maiuscula, minuscula e numero." className="w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-2" placeholder="Senha forte inicial" value={tenantForm.adminPassword} onChange={(event) => setTenantForm((prev) => ({ ...prev, adminPassword: event.target.value }))} required />
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-2" placeholder="Telefone" value={tenantForm.contactPhone} onChange={(event) => setTenantForm((prev) => ({ ...prev, contactPhone: event.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-2 lg:col-span-4">
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Mensalidade R$" value={tenantForm.monthlyFeeBRL} onChange={(event) => setTenantForm((prev) => ({ ...prev, monthlyFeeBRL: event.target.value }))} required />
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Implantação R$" value={tenantForm.implementationFeeBRL} onChange={(event) => setTenantForm((prev) => ({ ...prev, implementationFeeBRL: event.target.value }))} />
              </div>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-4" placeholder="Nome da marca do clube" value={tenantForm.brandName} onChange={(event) => setTenantForm((prev) => ({ ...prev, brandName: event.target.value }))} />
              <div className="grid gap-2 sm:grid-cols-3 lg:col-span-4">
                {(["primaryColor", "secondaryColor", "accentColor"] as const).map((field) => (
                  <input key={field} type="color" className="h-10 w-full rounded-lg border border-slate-200" value={tenantForm[field]} onChange={(event) => setTenantForm((prev) => ({ ...prev, [field]: event.target.value }))} />
                ))}
              </div>
              <label className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 lg:col-span-6">
                Logo do cliente
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setLogoUploadError("");
                    fileToDataUrl(
                      file,
                      (logoUrl) => setTenantForm((prev) => ({ ...prev, logoUrl })),
                      setLogoUploadError
                    );
                  }}
                />
                {logoUploadError ? <span className="mt-2 block text-xs font-bold text-red-700">{logoUploadError}</span> : null}
              </label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-6" placeholder="DATABASE_URL separado, se já existir" value={tenantForm.databaseUrl} onChange={(event) => setTenantForm((prev) => ({ ...prev, databaseUrl: event.target.value }))} />
              <textarea className="min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 lg:col-span-12" placeholder="Observações internas" value={tenantForm.notes} onChange={(event) => setTenantForm((prev) => ({ ...prev, notes: event.target.value }))} />
              {createTenantMutation.isError ? (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 lg:col-span-12">
                  {createTenantMutation.error instanceof Error ? createTenantMutation.error.message : "Não foi possível criar o clube."}
                </div>
              ) : null}
              <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#08255b] px-4 py-2.5 font-black text-white hover:bg-[#0b2f6f] disabled:opacity-60 lg:col-span-12" disabled={createTenantMutation.isPending}>
                <Plus size={17} /> Criar cliente, conta e banco
              </button>
            </form>
          </Surface>
          ) : null}

        </div>
        ) : null}

        <div className={managementView === "NEW" ? "xl:col-start-1 xl:row-start-2" : "xl:col-span-2"}>
        {managementView === "NEW" ? (
          <div className="space-y-4">
            <Surface padding="md">
              <h3 className="text-lg font-black text-slate-950">O que o GestaSports cria automaticamente</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  "Conta administradora gravada no banco",
                  "Subdomínio principal e acesso alternativo por caminho",
                  "Banco reservado ou provisionado com o slug",
                  "Configurações de grupo e financeiro",
                  "Marca, cores e logo do cliente",
                  "Checklist operacional de entrega"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">
                    <CheckCircle2 size={16} />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-500">Preview do endereço</p>
                <p className="mt-2 text-sm font-black text-slate-950">https://{defaultSubdomainPreview}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{defaultPublicPathPreview}</p>
              </div>
            </Surface>
          </div>
        ) : managementView === "DASHBOARD" ? (
          <div className="space-y-4">
            <Surface padding="md" className="fl-superadmin-hero">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase text-[#55ad32]">Painel executivo</p>
                  <h3 className="mt-1 text-2xl font-black leading-tight text-slate-950">Fila de decisão da operação</h3>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                    Priorize provisionamento, acesso administrador, domínio e cobrança antes de abrir detalhes de cliente.
                  </p>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Saúde operacional", value: `${healthScore}%`, detail: `${totals.ready}/${tenants.length || 0} prontos`, tone: "text-[#08255b]" },
                      { label: "MRR contratado", value: formatCurrency(totals.monthlyCents), detail: `${totals.paying} pagante(s)`, tone: "text-emerald-700" },
                      { label: "A receber", value: formatCurrency(totals.openCents), detail: "Cobranças abertas", tone: "text-amber-700" },
                      { label: "Risco de entrega", value: totals.attention, detail: `${totals.pendingProvision} banco(s) pendente(s)`, tone: "text-red-700" }
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-black uppercase text-slate-500">{item.label}</p>
                        <p className={`mt-2 text-2xl font-black ${item.tone}`}>{item.value}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Próxima melhor ação</p>
                  <h4 className="mt-2 text-lg font-black text-slate-950">
                    {priorityTenants[0]?.tenant.name ?? "Carteira em ordem"}
                  </h4>
                  <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">
                    {priorityTenants[0]
                      ? `${priorityTenants[0].readiness.completed}/${priorityTenants[0].readiness.total} itens concluídos.`
                      : "Nenhum cliente crítico encontrado agora."}
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#08255b] px-3 py-2 text-sm font-black text-white"
                    onClick={() => {
                      if (priorityTenants[0]) {
                        setSelectedTenantId(priorityTenants[0].tenant.id);
                        setManagementView("CLIENTS");
                        setActivePanel(priorityTenants[0].tenant.provisioningStatus !== "READY" ? "OVERVIEW" : "OPERATIONS");
                      } else {
                        setManagementView("OPERATIONS");
                      }
                    }}
                  >
                    <Rocket size={16} />
                    Abrir prioridade
                  </button>
                </div>
              </div>
            </Surface>
            <Surface padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Dashboard GestaSports</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Visão geral da carteira, implantações e saúde operacional dos clientes.</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-[#08255b] px-3 py-2 text-xs font-black text-white hover:bg-[#0b2f6f]"
                  onClick={() => setManagementView("NEW")}
                >
                  Novo cliente
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "Clientes ativos", value: totals.active, detail: `${tenants.length} na carteira` },
                  { label: "Pendencias", value: totals.attention, detail: "Setup ou dados incompletos" },
                  { label: "Provisionamento", value: totals.pendingProvision, detail: "Ambientes não prontos" },
                  { label: "Sem domínio", value: totals.missingDomain, detail: "DNS pendente" },
                  { label: "Sem admin", value: totals.missingAdmin, detail: "Acesso inicial faltando" }
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-black uppercase text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </Surface>

            <Surface padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-950">Planos SaaS</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Pacotes comerciais com preço, limites e módulos inclusos.</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    setPlanForm({
                      id: "",
                      name: "",
                      slug: "",
                      description: "",
                      monthlyFeeBRL: "",
                      implementationFeeBRL: "",
                      monthlyDueDay: "10",
                      maxUsers: "",
                      maxAthletes: "",
                      maxTeams: "",
                      customDomainAllowed: false,
                      active: true,
                      moduleCodes: ["ASSOCIATES", "ATHLETES", "GAMES", "FINANCE", "SETTINGS"]
                    })
                  }
                >
                  Novo plano
                </button>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[minmax(10rem,1fr)_7rem_7rem_6rem_5rem] gap-3 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">
                    <span>Plano</span>
                    <span>Mensal</span>
                    <span>Implantação</span>
                    <span>Módulos</span>
                    <span>Status</span>
                  </div>
                  {(plans.length > 0 ? plans : []).map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      className="grid w-full grid-cols-[minmax(10rem,1fr)_7rem_7rem_6rem_5rem] gap-3 border-t border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => editPlan(plan)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-black text-slate-950">{plan.name}</span>
                        <span className="block truncate text-xs font-semibold text-slate-500">{plan.description || plan.slug}</span>
                      </span>
                      <span className="text-xs font-black text-slate-700">{formatCurrency(plan.monthlyFeeCents)}</span>
                      <span className="text-xs font-black text-slate-700">{formatCurrency(plan.implementationFeeCents)}</span>
                      <span className="text-xs font-black text-slate-700">{plan.moduleCodes.length}</span>
                      <span className={`text-xs font-black ${plan.active ? "text-emerald-700" : "text-slate-500"}`}>{plan.active ? "Ativo" : "Inativo"}</span>
                    </button>
                  ))}
                  {plans.length === 0 ? (
                    <p className="border-t border-slate-100 px-3 py-4 text-sm font-semibold text-slate-500">Nenhum plano cadastrado ainda.</p>
                  ) : null}
                </div>

                <form className="rounded-lg border border-slate-200 bg-slate-50 p-3" onSubmit={handleSavePlan}>
                  <div className="grid gap-2">
                    <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Nome do plano" value={planForm.name} onChange={(event) => setPlanForm((prev) => ({ ...prev, name: event.target.value }))} required />
                    <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="slug-do-plano" value={planForm.slug} onChange={(event) => setPlanForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} required />
                    <textarea className="min-h-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Descrição comercial" value={planForm.description} onChange={(event) => setPlanForm((prev) => ({ ...prev, description: event.target.value }))} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Mensal R$" value={planForm.monthlyFeeBRL} onChange={(event) => setPlanForm((prev) => ({ ...prev, monthlyFeeBRL: event.target.value }))} />
                      <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Implantação R$" value={planForm.implementationFeeBRL} onChange={(event) => setPlanForm((prev) => ({ ...prev, implementationFeeBRL: event.target.value }))} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Dia" value={planForm.monthlyDueDay} onChange={(event) => setPlanForm((prev) => ({ ...prev, monthlyDueDay: event.target.value.replace(/\D/g, "").slice(0, 2) }))} />
                      <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Usuários" value={planForm.maxUsers} onChange={(event) => setPlanForm((prev) => ({ ...prev, maxUsers: event.target.value.replace(/\D/g, "") }))} />
                      <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Atletas" value={planForm.maxAthletes} onChange={(event) => setPlanForm((prev) => ({ ...prev, maxAthletes: event.target.value.replace(/\D/g, "") }))} />
                      <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold" placeholder="Equipes" value={planForm.maxTeams} onChange={(event) => setPlanForm((prev) => ({ ...prev, maxTeams: event.target.value.replace(/\D/g, "") }))} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                        <input type="checkbox" className="accent-[#55ad32]" checked={planForm.customDomainAllowed} onChange={(event) => setPlanForm((prev) => ({ ...prev, customDomainAllowed: event.target.checked }))} />
                        Domínio próprio
                      </label>
                      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
                        <input type="checkbox" className="accent-[#55ad32]" checked={planForm.active} onChange={(event) => setPlanForm((prev) => ({ ...prev, active: event.target.checked }))} />
                        Plano ativo
                      </label>
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {planModuleOptions.map((module) => (
                        <label key={module.code} className="flex items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-700">
                          <input type="checkbox" className="accent-[#55ad32]" checked={planForm.moduleCodes.includes(module.code)} onChange={(event) => togglePlanModule(module.code, event.target.checked)} />
                          {module.label}
                        </label>
                      ))}
                    </div>
                    <button className="rounded-lg bg-[#08255b] px-3 py-2 text-sm font-black text-white disabled:opacity-60" disabled={savePlanMutation.isPending}>
                      {planForm.id ? "Salvar plano" : "Criar plano"}
                    </button>
                  </div>
                </form>
              </div>
            </Surface>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
              <Surface padding="md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Clientes que precisam de atenção</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Fila operacional para implantação, domínio, acesso e contrato.</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-[#08255b] hover:bg-slate-100"
                    onClick={() => {
                      setManagementView("OPERATIONS");
                      setSystemStatusFilter("PENDING");
                      setActivePanel("OPERATIONS");
                    }}
                  >
                    Abrir clientes
                  </button>
                </div>

                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[minmax(12rem,1fr)_7rem_8rem_7rem] gap-3 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">
                    <span>Cliente</span>
                    <span>Status</span>
                    <span>Setup</span>
                    <span>Dominios</span>
                  </div>
                  {tenants.slice(0, 8).map((tenant) => {
                    const readiness = tenantReadiness(tenant);

                    return (
                      <button
                        key={`dashboard-${tenant.id}`}
                        type="button"
                        className="grid w-full grid-cols-[minmax(12rem,1fr)_7rem_8rem_7rem] gap-3 border-t border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setSelectedTenantId(tenant.id);
                          setManagementView("CLIENTS");
                          setActivePanel("OVERVIEW");
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-black text-slate-950">{tenant.name}</span>
                          <span className="block truncate text-xs font-semibold text-slate-500">{tenant.defaultSubdomain}</span>
                        </span>
                        <span className="text-xs font-black text-slate-600">{statusLabels[tenant.status]}</span>
                        <span className={readiness.ready ? "text-xs font-black text-emerald-700" : "text-xs font-black text-amber-700"}>{readiness.percent}%</span>
                        <span className="text-xs font-black text-slate-600">{tenant.verifiedDomains ?? 0}</span>
                      </button>
                    );
                  })}
                  {tenants.length === 0 ? (
                    <p className="border-t border-slate-100 px-3 py-4 text-sm font-semibold text-slate-500">Nenhum cliente cadastrado ainda.</p>
                  ) : null}
                </div>
              </Surface>

              <Surface padding="md">
                <h3 className="text-lg font-black text-slate-950">Resumo financeiro</h3>
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Receita recorrente</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totals.monthlyCents)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Em aberto</p>
                    <p className="mt-1 text-xl font-black text-amber-700">{formatCurrency(totals.openCents)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-[#08255b] hover:bg-slate-50"
                  onClick={() => setManagementView("FINANCE")}
                >
                  Abrir financeiro
                </button>
              </Surface>
            </div>
          </div>
        ) : managementView === "FINANCE" ? (
          <div className="space-y-4">
            <Surface padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Financeiro GestaSports</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Billing SaaS, receita recorrente, cobranças abertas e recebimentos.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 disabled:opacity-60"
                    disabled={generateMonthlyMutation.isPending}
                    onClick={() => void generateMonthlyMutation.mutateAsync()}
                  >
                    <CircleDollarSign size={16} /> Gerar mensalidades
                  </button>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-600">
                    Carência
                    <input
                      className="w-12 rounded border border-slate-200 px-1.5 py-1 text-center text-xs font-black text-slate-900"
                      value={billingGraceDays}
                      onChange={(event) => setBillingGraceDays(event.target.value.replace(/\D/g, "").slice(0, 2))}
                    />
                    dias
                  </label>
                  <button
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-700 disabled:opacity-60"
                    disabled={enforceDelinquencyMutation.isPending}
                    onClick={() => void enforceDelinquencyMutation.mutateAsync()}
                  >
                    <AlertTriangle size={16} /> Aplicar régua
                  </button>
                </div>
              </div>
              {enforceDelinquencyMutation.data ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  <p>Régua aplicada: {enforceDelinquencyMutation.data.reviewed} cliente(s) revisado(s), {enforceDelinquencyMutation.data.suspended} suspenso(s) após {enforceDelinquencyMutation.data.graceDays} dia(s) de carência.</p>
                  {enforceDelinquencyMutation.data.affectedTenants.length > 0 ? (
                    <div className="mt-2 grid gap-1 md:grid-cols-2">
                      {enforceDelinquencyMutation.data.affectedTenants.slice(0, 6).map((tenant) => (
                        <span key={tenant.id} className="rounded border border-amber-200 bg-white px-2 py-1 text-xs text-slate-700">
                          <strong>{tenant.name}</strong>: {tenant.maxDaysOverdue} dia(s), {formatCurrency(tenant.openAmountCents)}
                          {tenant.suspended ? " - suspenso" : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {generateMonthlyMutation.data ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                  Mensalidades SaaS: {generateMonthlyMutation.data.created} criada(s) de {generateMonthlyMutation.data.eligibleTenants} cliente(s) elegivel(is).
                </div>
              ) : null}

              <div className="hidden">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-black uppercase text-emerald-700">MRR previsto</p>
                  <p className="mt-2 text-2xl font-black text-emerald-800">{formatCurrency(totals.monthlyCents)}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-black uppercase text-amber-700">A receber</p>
                  <p className="mt-2 text-2xl font-black text-amber-800">{formatCurrency(totals.openCents)}</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase text-blue-700">Recebido</p>
                  <p className="mt-2 text-2xl font-black text-blue-900">{formatCurrency(totals.paidCents)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Ticket medio</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(totals.averageTicketCents)}</p>
                </div>
              </div>
            </Surface>

            <div className="hidden">
              <Surface padding="md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Receita por cliente</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Mensalidade prevista e cobranças abertas por sistema alugado.</p>
                  </div>
                  <span className="rounded-full bg-[#55ad32]/15 px-3 py-1 text-xs font-black text-[#08255b]">{revenueByTenant.length} cliente(s)</span>
                </div>
                <div className="mt-4 h-72">
                  {revenueByTenant.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByTenant} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value) * 100)} cursor={{ fill: "#f8fafc" }} />
                        <Bar dataKey="mensal" name="Mensalidade" fill="#08255b" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="aberto" name="Em aberto" fill="#55ad32" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">Cadastre clientes para gerar o gráfico.</div>
                  )}
                </div>
              </Surface>

              <Surface padding="md">
                <h3 className="text-lg font-black text-slate-950">Carteira por status</h3>
                <div className="mt-4 h-56">
                  {statusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={4}>
                          {statusChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">Sem sistemas na carteira.</div>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700">
                      <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>

            <div className="hidden">
              <Surface padding="md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Últimos acessos e ações</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Resumo rápido da trilha de auditoria da plataforma.</p>
                  </div>
                  <button type="button" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700" onClick={() => setManagementView("AUDIT")}>
                    Abrir auditoria
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {auditLogs.slice(0, DASHBOARD_ROW_LIMIT).map((log) => (
                    <div key={log.id} className="grid gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)_4rem]">
                      <span className="text-xs font-semibold text-slate-500">{formatDateTime(log.createdAt)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-slate-950">{log.userName ?? log.userEmail ?? "Sistema"}</span>
                        <span className="block truncate text-xs font-semibold text-slate-500">{log.method} {log.path}</span>
                      </span>
                      <span className={`text-right text-xs font-black ${log.statusCode >= 400 ? "text-amber-700" : "text-emerald-700"}`}>{log.statusCode}</span>
                    </div>
                  ))}
                  {auditLogs.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum log carregado ainda.</p>
                  ) : null}
                  {auditLogs.length > DASHBOARD_ROW_LIMIT ? (
                    <button type="button" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-[#08255b] hover:bg-slate-100" onClick={() => setManagementView("AUDIT")}>
                      Visualizar mais
                    </button>
                  ) : null}
                </div>
              </Surface>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
              <Surface padding="md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Carteira financeira</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Assinaturas, cobranças abertas e situação dos clientes SaaS.</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-[#1D4ED8] hover:bg-slate-100"
                    onClick={() => {
                      setManagementView("OPERATIONS");
                      setSystemStatusFilter("ALL");
                      setActivePanel("OPERATIONS");
                    }}
                  >
                    Abrir clientes
                  </button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {[
                    { label: "Assinaturas ativas", value: String(totals.paying), detail: `${formatCurrency(totals.monthlyCents)} recorrente` },
                    { label: "Cobranças em aberto", value: formatCurrency(totals.openCents), detail: `${totals.attention} pendência(s) operacionais` },
                    { label: "Geração mensal", value: "Manual", detail: "Cria mensalidades do mês atual" },
                    { label: "Recebimentos", value: formatCurrency(totals.paidCents), detail: "Baixas realizadas na carteira" }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-slate-950">{item.label}</span>
                        <span className="block truncate text-xs font-semibold text-slate-500">{item.detail}</span>
                      </span>
                      <strong className="shrink-0 text-sm font-black text-[#08255b]">{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[minmax(12rem,1.5fr)_9rem_9rem_7rem] gap-3 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">
                    <span>Cliente</span>
                    <span>Mensal</span>
                    <span>Aberto</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {[...tenants].sort((a, b) => b.openAmountCents - a.openAmountCents).slice(0, DASHBOARD_ROW_LIMIT).map((tenant) => (
                      <button
                        key={`finance-${tenant.id}`}
                        type="button"
                        className="grid w-full grid-cols-[minmax(12rem,1.5fr)_9rem_9rem_7rem] items-center gap-3 px-3 py-3 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setSelectedTenantId(tenant.id);
                          setManagementView("CLIENTS");
                          setActivePanel("BILLING");
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-black text-slate-950">{tenant.name}</span>
                          <span className="block truncate text-xs font-semibold text-slate-500">{tenant.defaultSubdomain}</span>
                        </span>
                        <span className="font-black text-emerald-700">{formatCurrency(tenant.monthlyFeeCents)}</span>
                        <span className={tenant.openAmountCents > 0 ? "font-black text-amber-700" : "font-black text-slate-500"}>{formatCurrency(tenant.openAmountCents)}</span>
                        <span className={`text-xs font-black ${tenant.status === "SUSPENDED" || tenant.status === "CANCELED" ? "text-red-700" : tenant.openAmountCents > 0 ? "text-amber-700" : "text-slate-600"}`}>
                          {statusLabels[tenant.status]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </Surface>

              <Surface padding="md">
                <h3 className="text-lg font-black text-slate-950">Resumo da carteira</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-500">Clientes ativos</span>
                    <strong className="text-slate-950">{totals.active}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-500">Clientes pagantes</span>
                    <strong className="text-slate-950">{totals.paying}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-500">Sistemas suspensos</span>
                    <strong className="text-slate-950">{totals.disabled}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm font-semibold text-slate-500">Pendencias operacionais</span>
                    <strong className="text-slate-950">{totals.attention}</strong>
                  </div>
                </div>
              </Surface>
            </div>
          </div>
        ) : managementView === "SETTINGS" ? (
          <div className="space-y-4">
            <Surface padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Configurações GestaSports</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Regras centrais da plataforma: clientes, prazos, cobrança, provisionamento, domínios e auditoria.</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#08255b] px-3 py-2 text-sm font-black text-white hover:bg-[#0b2f6f] disabled:opacity-60"
                  disabled={saveSettingsMutation.isPending}
                  onClick={() => void saveSettingsMutation.mutateAsync()}
                >
                  <Settings size={16} />
                  Salvar configurações
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {[
                  { value: "GENERAL", label: "Geral" },
                  { value: "CLIENTS", label: "Clientes" },
                  { value: "DEADLINES", label: "Prazos" },
                  { value: "BILLING", label: "Billing" },
                  { value: "PROVISIONING", label: "Provisionamento" },
                  { value: "SECURITY", label: "Seguranca" }
                ].map((tab) => {
                  const active = settingsTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      className={`min-h-9 rounded-md px-3 text-xs font-black transition ${active ? "bg-[#08255b] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-950"}`}
                      onClick={() => setSettingsTab(tab.value as SettingsTab)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </Surface>

            <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]" onSubmit={handleSaveSettings}>
              <Surface padding="md">
                {settingsTab === "GENERAL" ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Identidade da plataforma</h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Dados institucionais usados no painel administrativo, cobranças e comunicações do SaaS.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Nome da plataforma
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.platformName} onChange={(event) => setSettingsForm((prev) => ({ ...prev, platformName: event.target.value }))} />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Dominio base
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.baseDomain} onChange={(event) => setSettingsForm((prev) => ({ ...prev, baseDomain: event.target.value.toLowerCase().replace(/^https:\/\//, "") }))} />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        E-mail suporte
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.supportEmail} onChange={(event) => setSettingsForm((prev) => ({ ...prev, supportEmail: event.target.value }))} />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        E-mail comercial
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.commercialEmail} onChange={(event) => setSettingsForm((prev) => ({ ...prev, commercialEmail: event.target.value }))} />
                      </label>
                    </div>
                  </div>
                ) : null}

                {settingsTab === "CLIENTS" ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Padrões de cliente</h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Regras aplicadas no cadastro e no acesso publico de cada clube contratado.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Padrão do subdomínio
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.tenantNamingPattern} onChange={(event) => setSettingsForm((prev) => ({ ...prev, tenantNamingPattern: event.target.value }))} />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Vencimento padrão
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.defaultMonthlyDueDay} onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultMonthlyDueDay: event.target.value.replace(/\D/g, "").slice(0, 2) }))} />
                      </label>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
                        Exigir domínio verificado
                        <input type="checkbox" className="size-4 accent-[#55ad32]" checked={settingsForm.requireVerifiedDomain} onChange={(event) => setSettingsForm((prev) => ({ ...prev, requireVerifiedDomain: event.target.checked }))} />
                      </label>
                      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
                        Permitir acesso por caminho
                        <input type="checkbox" className="size-4 accent-[#55ad32]" checked={settingsForm.allowPathAccess} onChange={(event) => setSettingsForm((prev) => ({ ...prev, allowPathAccess: event.target.checked }))} />
                      </label>
                    </div>
                  </div>
                ) : null}

                {settingsTab === "DEADLINES" ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Prazos operacionais</h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Controle de teste, implantação e retenção de auditoria para toda a plataforma.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Teste gratuito
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.defaultTrialDays} onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultTrialDays: event.target.value.replace(/\D/g, "").slice(0, 3) }))} />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Implantação
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.defaultImplementationDays} onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultImplementationDays: event.target.value.replace(/\D/g, "").slice(0, 3) }))} />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Retenção de logs
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.auditRetentionDays} onChange={(event) => setSettingsForm((prev) => ({ ...prev, auditRetentionDays: event.target.value.replace(/\D/g, "").slice(0, 4) }))} />
                      </label>
                    </div>
                  </div>
                ) : null}

                {settingsTab === "BILLING" ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Billing SaaS e bloqueio</h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Regras globais para cobrar mensalidades, suspender inadimplentes e reativar clientes quitados.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Carência para bloqueio
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.defaultBillingGraceDays} onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultBillingGraceDays: event.target.value.replace(/\D/g, "").slice(0, 3) }))} />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Dia padrão da mensalidade
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.defaultMonthlyDueDay} onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultMonthlyDueDay: event.target.value.replace(/\D/g, "").slice(0, 2) }))} />
                      </label>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
                        Suspender automaticamente
                        <input type="checkbox" className="size-4 accent-[#55ad32]" checked={settingsForm.autoSuspendEnabled} onChange={(event) => setSettingsForm((prev) => ({ ...prev, autoSuspendEnabled: event.target.checked }))} />
                      </label>
                      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
                        Reativar após baixa
                        <input type="checkbox" className="size-4 accent-[#55ad32]" checked={settingsForm.autoReactivateEnabled} onChange={(event) => setSettingsForm((prev) => ({ ...prev, autoReactivateEnabled: event.target.checked }))} />
                      </label>
                    </div>
                  </div>
                ) : null}

                {settingsTab === "PROVISIONING" ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Provisionamento</h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Como o GestaSports cria bancos, domínios, acessos e checklist operacional dos clientes.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Modo padrão
                        <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.defaultProvisioningMode} onChange={(event) => setSettingsForm((prev) => ({ ...prev, defaultProvisioningMode: event.target.value as PlatformSettings["defaultProvisioningMode"] }))}>
                          <option value="AUTOMATIC">Automatico</option>
                          <option value="HYBRID">Hibrido</option>
                          <option value="MANUAL">Manual</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Dominio base
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.baseDomain} onChange={(event) => setSettingsForm((prev) => ({ ...prev, baseDomain: event.target.value.toLowerCase().replace(/^https:\/\//, "") }))} />
                      </label>
                    </div>
                  </div>
                ) : null}

                {settingsTab === "SECURITY" ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-950">Seguranca e auditoria</h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Padrões de rastreabilidade e governança para operação enterprise.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        Retenção de auditoria
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.auditRetentionDays} onChange={(event) => setSettingsForm((prev) => ({ ...prev, auditRetentionDays: event.target.value.replace(/\D/g, "").slice(0, 4) }))} />
                      </label>
                      <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                        E-mail de suporte
                        <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900" value={settingsForm.supportEmail} onChange={(event) => setSettingsForm((prev) => ({ ...prev, supportEmail: event.target.value }))} />
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex justify-end">
                  <button className="rounded-lg bg-[#08255b] px-4 py-2 text-sm font-black text-white hover:bg-[#0b2f6f] disabled:opacity-60" disabled={saveSettingsMutation.isPending}>
                    {saveSettingsMutation.isPending ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </Surface>

              <div className="space-y-4">
                <Surface padding="md">
                  <h4 className="text-lg font-black text-slate-950">Resumo ativo</h4>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: "Dominio base", value: settingsForm.baseDomain },
                      { label: "Carência billing", value: `${settingsForm.defaultBillingGraceDays} dia(s)` },
                      { label: "Vencimento padrão", value: `Dia ${settingsForm.defaultMonthlyDueDay}` },
                      { label: "Provisionamento", value: settingsForm.defaultProvisioningMode },
                      { label: "Retenção logs", value: `${settingsForm.auditRetentionDays} dia(s)` }
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-xs font-black uppercase text-slate-500">{item.label}</span>
                        <strong className="truncate text-right text-sm font-black text-slate-950">{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </Surface>

                <Surface padding="md">
                  <h4 className="text-lg font-black text-slate-950">Automações</h4>
                  <div className="mt-3 grid gap-2">
                    <span className={`rounded-lg border px-3 py-2 text-sm font-black ${settingsForm.autoSuspendEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      Bloqueio automatico: {settingsForm.autoSuspendEnabled ? "ligado" : "desligado"}
                    </span>
                    <span className={`rounded-lg border px-3 py-2 text-sm font-black ${settingsForm.autoReactivateEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      Reativação automática: {settingsForm.autoReactivateEnabled ? "ligada" : "desligada"}
                    </span>
                    <span className={`rounded-lg border px-3 py-2 text-sm font-black ${settingsForm.allowPathAccess ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      Acesso por caminho: {settingsForm.allowPathAccess ? "permitido" : "bloqueado"}
                    </span>
                  </div>
                </Surface>
              </div>
            </form>
          </div>
        ) : managementView === "AUDIT" ? (
          <div className="space-y-4">
            <Surface padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Logs de acesso e trilha de auditoria</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Monitore logins, ações administrativas, requisições e eventos sensíveis da GestaSports.</p>
                </div>
                <button type="button" className="flex items-center gap-2 rounded-lg border border-[#55ad32]/30 bg-[#55ad32]/10 px-3 py-2 text-sm font-black text-[#08255b]" onClick={() => void auditLogsQuery.refetch()}>
                  <ClipboardList size={16} /> Atualizar logs
                </button>
              </div>
            </Surface>

            <div className="grid gap-3 md:grid-cols-4">
              <Surface padding="sm">
                <p className="text-xs font-black uppercase text-slate-500">Eventos recentes</p>
                <strong className="mt-2 block text-2xl font-black text-slate-950">{auditLogs.length}</strong>
              </Surface>
              <Surface padding="sm">
                <p className="text-xs font-black uppercase text-slate-500">Ações superadmin</p>
                <strong className="mt-2 block text-2xl font-black text-[#08255b]">{auditLogs.filter((log) => log.userRole === "SUPERADMIN").length}</strong>
              </Surface>
              <Surface padding="sm">
                <p className="text-xs font-black uppercase text-slate-500">Falhas/erros</p>
                <strong className="mt-2 block text-2xl font-black text-amber-700">{auditLogs.filter((log) => log.statusCode >= 400).length}</strong>
              </Surface>
              <Surface padding="sm">
                <p className="text-xs font-black uppercase text-slate-500">Usuários únicos</p>
                <strong className="mt-2 block text-2xl font-black text-[#55ad32]">{new Set(auditLogs.map((log) => log.userEmail).filter(Boolean)).size}</strong>
              </Surface>
            </div>

            <Surface padding="md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-black text-slate-950">Trilha detalhada</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Ultimos 80 registros</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[9rem_minmax(10rem,1.2fr)_5rem_minmax(10rem,1.5fr)_4rem] gap-3 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">
                  <span>Data</span>
                  <span>Usuário</span>
                  <span>Metodo</span>
                  <span>Rota / ação</span>
                  <span>Status</span>
                </div>
                <div className="max-h-[34rem] divide-y divide-slate-100 overflow-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="grid grid-cols-[9rem_minmax(10rem,1.2fr)_5rem_minmax(10rem,1.5fr)_4rem] gap-3 px-3 py-3 text-sm">
                      <span className="text-xs font-semibold text-slate-500">{formatDateTime(log.createdAt)}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-black text-slate-950">{log.userName ?? "Sistema"}</span>
                        <span className="block truncate text-xs font-semibold text-slate-500">{log.userEmail ?? log.userRole ?? "sem usuário"}</span>
                      </span>
                      <span className="text-xs font-black text-[#08255b]">{log.method}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-black text-slate-800">{log.action}</span>
                        <span className="block truncate text-xs font-semibold text-slate-500">{log.path}</span>
                      </span>
                      <span className={`text-xs font-black ${log.statusCode >= 400 ? "text-amber-700" : "text-emerald-700"}`}>{log.statusCode}</span>
                    </div>
                  ))}
                  {auditLogs.length === 0 ? (
                    <p className="p-4 text-sm font-semibold text-slate-500">{auditLogsQuery.isLoading ? "Carregando logs..." : "Nenhum log encontrado."}</p>
                  ) : null}
                </div>
              </div>
            </Surface>
          </div>
        ) : managementView === "OPERATIONS" ? (
          <div className="space-y-4">
            <Surface padding="md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Clientes</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Liste, pesquise e crie workspaces de clientes GestaSports.</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#08255b] px-3 py-2 text-sm font-black text-white hover:bg-[#0b2f6f]"
                  onClick={() => setManagementView("NEW")}
                >
                  <Plus size={16} />
                  Inserir cliente
                </button>
              </div>
              <label className="relative mt-4 block">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15"
                  placeholder="Buscar cliente, slug, domínio, email ou banco"
                  value={systemSearch}
                  onChange={(event) => setSystemSearch(event.target.value)}
                />
              </label>
            </Surface>

            <Surface padding="md">
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[minmax(12rem,1.4fr)_minmax(12rem,1.2fr)_7rem_7rem_12rem] gap-3 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">
                  <span>Cliente</span>
                  <span>URL</span>
                  <span>Plano</span>
                  <span>Status</span>
                  <span className="text-right">Gestão</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredSystems.map((tenant) => (
                    <div key={`client-row-${tenant.id}`} className="grid grid-cols-[minmax(12rem,1.4fr)_minmax(12rem,1.2fr)_7rem_7rem_12rem] items-center gap-3 px-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">{tenant.name}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{tenant.contactEmail ?? tenant.slug}</p>
                      </div>
                      <span className="truncate text-xs font-semibold text-slate-600">{tenant.defaultSubdomain}</span>
                      <span className="truncate text-xs font-black text-slate-700">{tenant.planName}</span>
                      <span className="text-xs font-black text-slate-600">{statusLabels[tenant.status]}</span>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="grid size-8 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Gerenciar cliente" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("OVERVIEW"); }}>
                          <ServerCog size={15} />
                        </button>
                        <button type="button" className="grid size-8 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Marca" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("SITE"); }}>
                          <Palette size={15} />
                        </button>
                        <button type="button" className="grid size-8 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Usuários" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("ACCESS"); }}>
                          <Users size={15} />
                        </button>
                        <a className="grid size-8 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Abrir cliente" href={`${tenantPublicPath(tenant)}/login`} target="_blank" rel="noreferrer">
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </div>
                  ))}
                  {filteredSystems.length === 0 ? (
                    <p className="p-4 text-sm font-semibold text-slate-500">Nenhum cliente encontrado.</p>
                  ) : null}
                </div>
              </div>
            </Surface>
          </div>
        ) : managementView === "INFRA" ? (
          <div className="space-y-4">
            <Surface padding="md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-950">Infraestrutura</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Clientes, domínios, provisionamento, banco de dados e acessos técnicos.</p>
                </div>
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700" onClick={() => setSystemStatusFilter("PENDING")}>
                  <AlertTriangle size={16} />
                  Ver pendências
                </button>
              </div>
            </Surface>

            <Surface padding="md">
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[minmax(12rem,1.3fr)_minmax(12rem,1.2fr)_8rem_8rem_12rem] gap-3 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-500">
                  <span>Cliente</span>
                  <span>Domínio</span>
                  <span>SSL</span>
                  <span>Status</span>
                  <span className="text-right">Gestão</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredSystems.map((tenant) => {
                    const verifiedDomain = (tenant.verifiedDomains ?? 0) > 0 || (tenant.domains ?? []).some((domain) => domain.status === "VERIFIED");
                    return (
                      <div key={`infra-row-${tenant.id}`} className="grid grid-cols-[minmax(12rem,1.3fr)_minmax(12rem,1.2fr)_8rem_8rem_12rem] items-center gap-3 px-3 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">{tenant.name}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{tenant.databaseName}</p>
                        </div>
                        <span className="truncate text-xs font-semibold text-slate-600">{tenant.defaultSubdomain}</span>
                        <span className={`text-xs font-black ${verifiedDomain ? "text-emerald-700" : "text-amber-700"}`}>{verifiedDomain ? "OK" : "Pendente"}</span>
                        <span className="text-xs font-black text-slate-600">{tenant.provisioningStatus}</span>
                        <div className="flex justify-end gap-1">
                          <button type="button" className="grid size-8 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Domínios" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("DOMAINS"); }}>
                            <Globe2 size={15} />
                          </button>
                          <button type="button" className="grid size-8 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Provisionar" onClick={() => void provisionMutation.mutateAsync(tenant.id)}>
                            <Play size={15} />
                          </button>
                          <button type="button" className="grid size-8 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Banco de dados" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("OVERVIEW"); }}>
                            <Database size={15} />
                          </button>
                          <a className="grid size-8 place-items-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" title="Abrir cliente" href={`${tenantPublicPath(tenant)}/login`} target="_blank" rel="noreferrer">
                            <ExternalLink size={15} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                  {filteredSystems.length === 0 ? (
                    <p className="p-4 text-sm font-semibold text-slate-500">Nenhum cliente encontrado.</p>
                  ) : null}
                </div>
              </div>
            </Surface>
          </div>
        ) : selectedTenant ? (
          <div className="space-y-4">
            <Surface padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {selectedTenant.logoUrl ? <img src={selectedTenant.logoUrl} alt="" className="size-14 rounded-lg border border-slate-200 object-contain p-1" /> : null}
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-black text-slate-950">{selectedTenant.name}</h3>
                    <p className="text-sm font-semibold text-slate-500">{selectedTenant.planName} - {statusLabels[selectedTenant.status]} - blueprint GestaSports</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-black text-blue-700" onClick={() => void provisionMutation.mutateAsync(selectedTenant.id)}>
                    <Play size={16} /> Provisionar
                  </button>
                  <button className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700" onClick={() => void patchTenantMutation.mutateAsync({ id: selectedTenant.id, payload: { status: "ACTIVE" } })}>
                    <CheckCircle2 size={16} /> Ativar
                  </button>
                  <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={() => setActivePanel("MODULES")}>
                    <ClipboardList size={16} /> Módulos
                  </button>
                  <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-700" onClick={() => void patchTenantMutation.mutateAsync({ id: selectedTenant.id, payload: { status: "SUSPENDED", suspendedReason: "Mensalidade em atraso" } })}>
                    Suspender
                  </button>
                </div>
              </div>
            </Surface>

            {activePanel === "OPERATIONS" ? (
              <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
                <Surface padding="md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">Entrega do sistema</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Acompanhe se o ambiente do cliente já pode ser configurado e entregue.</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${tenantReadiness(selectedTenant).ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {tenantReadiness(selectedTenant).percent}% pronto
                    </span>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#55ad32]" style={{ width: `${tenantReadiness(selectedTenant).percent}%` }} />
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Status</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{statusLabels[selectedTenant.status]}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Acessos</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{selectedTenant.users.length ?? 0} usuários</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Dominios</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{selectedTenant.verifiedDomains ?? 0} verificados</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Aberto</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{formatCurrency(selectedTenant.openAmountCents)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {tenantReadiness(selectedTenant).checks.map((check) => (
                      <div key={check.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${check.done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                        {check.done ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span className="text-sm font-black">{check.label}</span>
                      </div>
                    ))}
                  </div>

                  {tenantReadiness(selectedTenant).checks.some((check) => !check.done) ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-black uppercase text-amber-700">Pendencias para entrega</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tenantReadiness(selectedTenant).checks.filter((check) => !check.done).map((check) => (
                          <span key={`pending-${check.label}`} className="rounded-full bg-white px-2 py-1 text-xs font-black text-amber-800">
                            {check.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <a className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" href={`https://${selectedTenant.defaultSubdomain}/login`} target="_blank" rel="noreferrer">
                      Login por subdomínio
                      <ExternalLink size={15} />
                    </a>
                    <a className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50" href={`${tenantPublicPath(selectedTenant)}/login`} target="_blank" rel="noreferrer">
                      Login por subpasta
                      <ExternalLink size={15} />
                    </a>
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 p-3">
                    <p className="text-xs font-black uppercase text-slate-500">Fila operacional GestaSports</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[11px] font-black uppercase text-slate-500">Suspensos</p>
                        <p className="mt-1 text-lg font-black text-slate-950">{totals.disabled}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[11px] font-black uppercase text-slate-500">Provisionar</p>
                        <p className="mt-1 text-lg font-black text-slate-950">{totals.pendingProvision}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[11px] font-black uppercase text-slate-500">Sem admin</p>
                        <p className="mt-1 text-lg font-black text-slate-950">{totals.missingAdmin}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-[11px] font-black uppercase text-slate-500">Sem domínio</p>
                        <p className="mt-1 text-lg font-black text-slate-950">{totals.missingDomain}</p>
                      </div>
                    </div>
                  </div>
                </Surface>

                <Surface padding="md">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-slate-950">Controle de sistemas</h3>
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                      {[
                        ["ALL", "Todos"],
                        ["ACTIVE", "Ativos"],
                        ["DISABLED", "Desabilitados"],
                        ["PENDING", "Pendencias"]
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={`rounded-md px-2.5 py-1.5 text-xs font-black ${systemStatusFilter === value ? "bg-white text-[#08255b] shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                          onClick={() => setSystemStatusFilter(value as typeof systemStatusFilter)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="relative mt-3 block">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-[#55ad32] focus:ring-2 focus:ring-[#55ad32]/20"
                      placeholder="Buscar por cliente, slug, domínio, email ou banco"
                      value={systemSearch}
                      onChange={(event) => setSystemSearch(event.target.value)}
                    />
                  </label>
                  <div className="mt-3 space-y-2">
                    {filteredSystems.map((tenant) => {
                      const readiness = tenantReadiness(tenant);
                      const enabled = tenant.status !== "SUSPENDED" && tenant.status !== "CANCELED";
                      return (
                        <div
                          key={`ops-${tenant.id}`}
                          className={`w-full rounded-lg border p-3 text-left ${selectedTenant.id === tenant.id ? "border-[#55ad32] bg-[#55ad32]/10" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => {
                                setSelectedTenantId(tenant.id);
                                setActivePanel("OPERATIONS");
                              }}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className={`size-2.5 shrink-0 rounded-full ${enabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                                <span className="block truncate text-sm font-black text-slate-950">{tenant.name}</span>
                              </span>
                              <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{tenant.defaultSubdomain}</span>
                              <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">{tenantPublicPath(tenant)}</span>
                            </button>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className={`rounded-full px-2 py-1 text-[11px] font-black ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                {enabled ? "Ativo" : "Desabilitado"}
                              </span>
                              <span className={`rounded-full px-2 py-1 text-[11px] font-black ${readiness.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {readiness.completed}/{readiness.total}
                              </span>
                            </div>
                          </div>
                          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full rounded-full bg-[#55ad32]" style={{ width: `${readiness.percent}%` }} />
                          </span>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <span className="text-xs font-semibold text-slate-500">{statusLabels[tenant.status]}</span>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <a className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50" href={`${tenantPublicPath(tenant)}/login`} target="_blank" rel="noreferrer">
                                Abrir
                              </a>
                              <button type="button" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("SITE"); }}>
                                Marca
                              </button>
                              <button type="button" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("ACCESS"); }}>
                                Acessos
                              </button>
                              <button type="button" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("MODULES"); }}>
                                Módulos
                              </button>
                              <button type="button" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("DOMAINS"); }}>
                                Dominios
                              </button>
                              <button type="button" className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => { setSelectedTenantId(tenant.id); setManagementView("CLIENTS"); setActivePanel("BILLING"); }}>
                                Cobrar
                              </button>
                              <button
                                type="button"
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${enabled ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                                onClick={() => setTenantOperationalStatus(tenant, !enabled)}
                                disabled={patchTenantMutation.isPending}
                              >
                                {enabled ? "Desabilitar" : "Habilitar"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredSystems.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhum sistema neste filtro.</p>
                    ) : null}
                  </div>
                </Surface>
              </div>
            ) : null}

            {managementView === "CLIENTS" || activePanel === "OVERVIEW" ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <Surface padding="md">
                  <Database size={20} className="text-blue-700" />
                  <p className="mt-3 text-xs font-black uppercase text-slate-500">Banco do cliente</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900">{selectedTenant.databaseName}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{selectedTenant.provisioningStatus}</p>
                </Surface>
                <Surface padding="md">
                  <Globe2 size={20} className="text-emerald-700" />
                  <p className="mt-3 text-xs font-black uppercase text-slate-500">Site principal</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900">{selectedTenant.defaultSubdomain}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{tenantPathAccess(selectedTenant)}</p>
                </Surface>
                <Surface padding="md">
                  <CircleDollarSign size={20} className="text-amber-700" />
                  <p className="mt-3 text-xs font-black uppercase text-slate-500">Aberto no SaaS</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{formatCurrency(selectedTenant.openAmountCents)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Mensal: {formatCurrency(selectedTenant.monthlyFeeCents)}</p>
                </Surface>
                <Surface padding="md" className="lg:col-span-3">
                  <h3 className="text-lg font-black text-slate-950">Contrato e operação</h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Base replicada</p>
                      <p className="mt-1 text-sm font-black text-slate-900">Modelo GestaSports</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Login próprio</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{selectedTenant.users.length ?? 0} usuários</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Banco reservado</p>
                      <p className="mt-1 truncate text-sm font-black text-slate-900">{selectedTenant.databaseName}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Status técnico</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{selectedTenant.provisioningStatus}</p>
                    </div>
                  </div>
                  <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={handleSaveCommercial}>
                    <select
                      className="rounded-lg border border-slate-200 px-3 py-2 md:col-span-4"
                      value={selectedTenant.planId ?? ""}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        void applyPlanMutation.mutateAsync({ tenantId: selectedTenant.id, planId: event.target.value });
                      }}
                      disabled={applyPlanMutation.isPending}
                    >
                      <option value="">Contrato manual sem plano vinculado</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - {formatCurrency(plan.monthlyFeeCents)}/mês - {plan.moduleCodes.length} módulos
                        </option>
                      ))}
                    </select>
                    <input className="rounded-lg border border-slate-200 px-3 py-2" value={commercialForm.planName} onChange={(event) => setCommercialForm((prev) => ({ ...prev, planName: event.target.value }))} placeholder="Plano" />
                    <input className="rounded-lg border border-slate-200 px-3 py-2" value={commercialForm.monthlyFeeBRL} onChange={(event) => setCommercialForm((prev) => ({ ...prev, monthlyFeeBRL: event.target.value }))} placeholder="Mensalidade R$" />
                    <input className="rounded-lg border border-slate-200 px-3 py-2" value={commercialForm.implementationFeeBRL} onChange={(event) => setCommercialForm((prev) => ({ ...prev, implementationFeeBRL: event.target.value }))} placeholder="Implantação R$" />
                    <input className="rounded-lg border border-slate-200 px-3 py-2" value={commercialForm.monthlyDueDay} onChange={(event) => setCommercialForm((prev) => ({ ...prev, monthlyDueDay: event.target.value }))} placeholder="Vencimento" />
                    <button className="rounded-lg bg-[#08255b] px-3 py-2 font-black text-white md:col-span-4">Salvar contrato</button>
                  </form>
                </Surface>
              </div>
            ) : null}

            {managementView === "CLIENTS" || activePanel === "SITE" ? (
              <Surface padding="md">
                <h3 className="text-lg font-black text-slate-950">Site, logo e cores do cliente</h3>
                <form className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]" onSubmit={handleSaveBrand}>
                  <div className="space-y-3">
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Nome publico da marca" value={brandForm.brandName} onChange={(event) => setBrandForm((prev) => ({ ...prev, brandName: event.target.value }))} />
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(["primaryColor", "secondaryColor", "accentColor"] as const).map((field) => (
                        <input key={field} type="color" className="h-12 w-full rounded-lg border border-slate-200" value={brandForm[field]} onChange={(event) => setBrandForm((prev) => ({ ...prev, [field]: event.target.value }))} />
                      ))}
                    </div>
                    <label className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                      Logo
                      <input type="file" accept="image/*" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setLogoUploadError("");
                        fileToDataUrl(file, (logoUrl) => setBrandForm((prev) => ({ ...prev, logoUrl })), setLogoUploadError);
                      }} />
                      {logoUploadError ? <span className="mt-2 block text-xs font-bold text-red-700">{logoUploadError}</span> : null}
                    </label>
                    <textarea className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Observações internas da implantação" value={brandForm.notes} onChange={(event) => setBrandForm((prev) => ({ ...prev, notes: event.target.value }))} />
                    <button className="rounded-lg bg-[#08255b] px-4 py-2.5 font-black text-white">Salvar site e marca</button>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4" style={{ borderTopColor: brandForm.secondaryColor, borderTopWidth: 6 }}>
                    {brandForm.logoUrl ? <img src={brandForm.logoUrl} alt="" className="mb-4 h-20 w-full object-contain" /> : <Palette className="mb-4 text-slate-400" size={38} />}
                    <p className="text-xs font-black uppercase" style={{ color: brandForm.secondaryColor }}>Preview</p>
                    <h4 className="mt-1 text-xl font-black" style={{ color: brandForm.primaryColor }}>{brandForm.brandName || selectedTenant.name}</h4>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{selectedTenant.defaultSubdomain}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{tenantPathAccess(selectedTenant)}</p>
                    <button type="button" className="mt-4 rounded-lg px-3 py-2 text-sm font-black text-white" style={{ backgroundColor: brandForm.primaryColor }}>Login do clube</button>
                  </div>
                </form>
              </Surface>
            ) : null}

            {managementView === "CLIENTS" || activePanel === "ACCESS" ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <Surface padding="md">
                  <h3 className="text-lg font-black text-slate-950">Usuários do cliente</h3>
                  <div className="mt-3 space-y-2">
                    {(selectedTenant.users ?? []).map((user) => (
                      <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{user.name}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{user.email}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">
                          {(user.roles?.length ? user.roles : [user.role]).map((role) => roleLabels[role]).join(" + ")}
                        </span>
                      </div>
                    ))}
                    {(selectedTenant.users ?? []).length === 0 ? <p className="text-sm font-semibold text-slate-500">Nenhum usuário criado ainda.</p> : null}
                  </div>
                </Surface>
                <Surface padding="md">
                  <div className="flex items-center gap-2">
                    <KeyRound size={18} className="text-[#55ad32]" />
                    <h3 className="text-lg font-black text-slate-950">Novo acesso</h3>
                  </div>
                  <form className="mt-3 space-y-2" onSubmit={handleCreateUser}>
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Nome" value={userForm.name} onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))} required />
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="email@cliente.com" value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} required />
                    <input type="password" className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Senha forte inicial" value={userForm.password} onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))} required />
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-black uppercase text-slate-500">Perfis de acesso</p>
                      <div className="mt-2 grid gap-2">
                        {tenantRoles.map((role) => (
                          <label key={role} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-slate-300"
                              checked={userForm.roles.includes(role)}
                              onChange={(event) => toggleUserRole(role, event.target.checked)}
                            />
                            {roleLabels[role]}
                          </label>
                        ))}
                      </div>
                    </div>
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#08255b] px-3 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={userForm.roles.length === 0}>
                      <ShieldCheck size={16} /> Criar acesso
                    </button>
                  </form>
                </Surface>
              </div>
            ) : null}

            {managementView === "CLIENTS" || activePanel === "MODULES" ? (
              <Surface padding="md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Módulos contratados</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Controle o pacote ativo do clube. Módulos desligados saem do menu do cliente.</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                    <p className="text-xs font-black uppercase text-slate-500">Ativos</p>
                    <p className="text-sm font-black text-slate-950">{selectedTenant.enabledModules.length ?? 0}/{selectedTenant.moduleCatalog.length ?? 0}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(selectedTenant.moduleCatalog ?? []).map((module) => {
                    const enabled = Boolean(selectedTenant.enabledModules.includes(module.code));
                    return (
                      <label
                        key={module.code}
                        className={`flex min-h-28 cursor-pointer flex-col justify-between rounded-lg border p-3 transition ${enabled ? "border-[#55ad32] bg-[#55ad32]/10" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-sm font-black text-slate-950">{module.label}</span>
                            <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500">{module.description}</span>
                          </span>
                          <input
                            type="checkbox"
                            className="mt-1 size-4 accent-[#55ad32]"
                            checked={enabled}
                            disabled={updateModulesMutation.isPending}
                            onChange={(event) => setTenantModule(selectedTenant, module.code, event.target.checked)}
                          />
                        </span>
                        <span className="mt-3 flex items-center justify-between gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{module.code}</span>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-black ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {enabled ? "Disponível" : "Bloqueado"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {(selectedTenant.moduleCatalog ?? []).length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Catálogo de módulos ainda não sincronizado para este cliente.</p>
                ) : null}
              </Surface>
            ) : null}

            {managementView === "CLIENTS" || activePanel === "DOMAINS" ? (
              <Surface padding="md">
                <h3 className="text-lg font-black text-slate-950">Domínios e subdomínios</h3>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-black uppercase text-emerald-700">Subdomínio automático</p>
                    <p className="mt-1 truncate text-sm font-black text-slate-950">{selectedTenant.defaultSubdomain}</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-black uppercase text-blue-700">DNS para domínio próprio</p>
                    <p className="mt-1 truncate text-sm font-black text-slate-950">CNAME www para {selectedTenant.defaultSubdomain}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-black text-slate-950">Como o cliente aponta o domínio dele</p>
                  <div className="mt-2 grid gap-2 text-xs font-semibold text-slate-600 md:grid-cols-3">
                    <span className="rounded border border-slate-200 bg-white px-2 py-1">Tipo: CNAME</span>
                    <span className="rounded border border-slate-200 bg-white px-2 py-1">Nome: www</span>
                    <span className="rounded border border-slate-200 bg-white px-2 py-1">Valor: {selectedTenant.defaultSubdomain}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">Cadastre apenas domínios próprios. O subdomínio gestasports.com.br é gerado automaticamente pelo slug do cliente.</p>
                </div>
                <form className="mt-3 flex gap-2" onSubmit={handleCreateDomain}>
                  <input className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2" placeholder="www.clube.com.br" value={domainForm.hostname} onChange={(event) => setDomainForm({ hostname: event.target.value.toLowerCase() })} required />
                  <button className="rounded-lg bg-slate-950 px-3 py-2 font-black text-white">Adicionar domínio próprio</button>
                </form>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {(selectedTenant.domains ?? []).map((domain) => (
                    <div key={domain.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black text-slate-900">{domain.hostname}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">{domain.status}</span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-500">
                        <span>
                          {domain.type === "SUBDOMAIN" ?
                             "DNS gerenciado automaticamente pela GestaSports"
                            : `DNS: CNAME ${domain.hostname.startsWith("www.") ? "www" : domain.hostname} para ${domain.expectedCname}`}
                        </span>
                        <span>Acesso final: https://{domain.hostname}</span>
                      </div>
                      {domain.status !== "VERIFIED" ? (
                        <button className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700" onClick={() => void verifyDomainMutation.mutateAsync(domain.id)}>
                          Marcar verificado
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Surface>
            ) : null}

            {managementView === "CLIENTS" || activePanel === "BILLING" ? (
              <Surface padding="md">
                <h3 className="text-lg font-black text-slate-950">Cobranças do SaaS</h3>
                <form className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" onSubmit={handleCreateCharge}>
                  <select className="rounded-lg border border-slate-200 px-3 py-2" value={chargeForm.type} onChange={(event) => setChargeForm((prev) => ({ ...prev, type: event.target.value as SaaSChargeType }))}>
                    {Object.entries(chargeTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Valor R$" value={chargeForm.amountBRL} onChange={(event) => setChargeForm((prev) => ({ ...prev, amountBRL: event.target.value }))} required />
                  <input className="rounded-lg border border-slate-200 px-3 py-2 lg:col-span-2" value={chargeForm.description} onChange={(event) => setChargeForm((prev) => ({ ...prev, description: event.target.value }))} required />
                  <input type="date" className="rounded-lg border border-slate-200 px-3 py-2" value={chargeForm.dueDate} onChange={(event) => setChargeForm((prev) => ({ ...prev, dueDate: event.target.value }))} required />
                  <button className="rounded-lg bg-[#08255b] px-3 py-2 font-black text-white sm:col-span-2 lg:col-span-5">Lançar cobrança</button>
                </form>
                <div className="mt-3 space-y-2">
                  {(selectedTenant.charges ?? []).map((charge) => (
                    <div key={charge.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{charge.description}</p>
                        <p className="text-xs font-semibold text-slate-500">{chargeTypeLabels[charge.type]} - {new Date(charge.dueDate).toLocaleDateString("pt-BR")} - {charge.status}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-slate-950">{formatCurrency(charge.amountCents)}</p>
                        {charge.status !== "PAID" ? (
                          <button className="mt-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700" onClick={() => void settleChargeMutation.mutateAsync(charge.id)}>
                            Quitar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            ) : null}
          </div>
        ) : (
          <Surface padding="md">
            <p className="text-sm font-semibold text-slate-500">Crie o primeiro cliente para começar a gerenciar site, acessos, domínios e cobranças.</p>
          </Surface>
        )}
        </div>
      </div>
    </section>
  );
}
