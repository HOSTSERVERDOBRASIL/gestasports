import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, HeartPulse, Trophy, Users, UserPlus
} from "lucide-react";
import { apiRequest } from "../../services/api";
import { KpiCard } from "../../components/ui/KpiCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import type { AthleteProfile, AthleteStatus, AthleteMedicalStatus } from "../../types/domain";

type OutletPeriod = { month: number; year: number };

const statusLabel: Record<AthleteStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  DELINQUENT: "Inadimplente",
  SUSPENDED: "Suspenso"
};

const statusBadge: Record<AthleteStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  DELINQUENT: "bg-red-50 text-red-700",
  SUSPENDED: "bg-amber-50 text-amber-700"
};

const medicalLabel: Record<AthleteMedicalStatus, string> = {
  CLEARED: "Liberado",
  OBSERVATION: "Observação",
  INJURED: "Lesionado",
  TREATMENT: "Em tratamento"
};

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function AtletasDashboardPage() {
  const { month, year } = useOutletContext<OutletPeriod>();

  const athletesQuery = useQuery({
    queryKey: ["athletes", month, year, "game-lineup"],
    queryFn: () => apiRequest<AthleteProfile[]>(`/athletes?month=${month}&year=${year}`)
  });

  const athletes = athletesQuery.data ?? [];
  const active = athletes.filter((a) => a.status === "ACTIVE");
  const inactive = athletes.filter((a) => a.status === "INACTIVE");
  const delinquent = athletes.filter((a) => a.status === "DELINQUENT");
  const suspended = athletes.filter((a) => a.status === "SUSPENDED");
  const injured = athletes.filter((a) => a.medicalStatus !== "CLEARED");
  const goalkeepers = athletes.filter((a) => a.position === "GOALKEEPER");
  const byPosition: Record<string, number> = {};
  for (const a of athletes) {
    byPosition[a.position] = (byPosition[a.position] ?? 0) + 1;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Pessoas"
        title="Dashboard do Elenco"
        subtitle={`${athletes.length} atletas cadastrados`}
        action={
          <Link
            to="/atletas/novo"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700"
          >
            <UserPlus size={16} /> Novo atleta
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total de atletas"
          value={athletes.length}
          icon={Users}
          iconClass="bg-blue-50 text-blue-600"
          href="/atletas/elenco"
        />
        <KpiCard
          label="Ativos"
          value={active.length}
          icon={Activity}
          iconClass="bg-emerald-50 text-emerald-600"
          href="/atletas/elenco?status=ACTIVE"
        />
        <KpiCard
          label="Goleiros"
          value={goalkeepers.length}
          icon={Trophy}
          iconClass="bg-amber-50 text-amber-600"
          href="/goleiros"
        />
        <KpiCard
          label="Com restrição médica"
          value={injured.length}
          icon={HeartPulse}
          iconClass="bg-red-50 text-red-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lista de atletas */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Elenco — destaques"
            action={
              <Link to="/atletas/elenco" className="text-xs font-black text-slate-500 hover:text-slate-700">
                Ver elenco completo →
              </Link>
            }
          >
            {athletesQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : active.length === 0 ? (
              <p className="text-sm font-semibold text-slate-400">Nenhum atleta ativo</p>
            ) : (
              <div className="space-y-1.5">
                {active.slice(0, 8).map((a) => (
                  <Link
                    key={a.id}
                    to={`/atletas/${a.id}/perfil`}
                    className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 hover:bg-slate-100"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-600">
                      {getInitials(a.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-800">{a.name}</p>
                      <p className="text-xs font-semibold text-slate-400">{a.position}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.medicalStatus !== "CLEARED" && (
                        <span className="text-xs font-black text-red-600">{medicalLabel[a.medicalStatus]}</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-black ${statusBadge[a.status]}`}>
                        {statusLabel[a.status]}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Alertas e resumo */}
        <div className="space-y-4">
          {(delinquent.length > 0 || suspended.length > 0 || injured.length > 0) && (
            <SectionCard title="Alertas">
              <div className="space-y-2">
                {delinquent.length > 0 && (
                  <Link
                    to="/atletas/elenco?status=DELINQUENT"
                    className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 hover:bg-red-100"
                  >
                    <AlertTriangle size={14} className="text-red-600" />
                    <p className="text-xs font-black text-red-800">{delinquent.length} inadimplentes</p>
                  </Link>
                )}
                {suspended.length > 0 && (
                  <Link
                    to="/atletas/elenco?status=SUSPENDED"
                    className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 hover:bg-amber-100"
                  >
                    <AlertTriangle size={14} className="text-amber-600" />
                    <p className="text-xs font-black text-amber-800">{suspended.length} suspensos</p>
                  </Link>
                )}
                {injured.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                    <HeartPulse size={14} className="text-blue-600" />
                    <p className="text-xs font-black text-blue-800">{injured.length} com restrição médica</p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Distribuição por status">
            <div className="space-y-2">
              {[
                { label: "Ativos", count: active.length, color: "bg-emerald-500" },
                { label: "Inativos", count: inactive.length, color: "bg-slate-400" },
                { label: "Inadimplentes", count: delinquent.length, color: "bg-red-500" },
                { label: "Suspensos", count: suspended.length, color: "bg-amber-500" }
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-semibold text-slate-600">{label}</span>
                  <div className="flex-1 rounded-full bg-slate-100 h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: athletes.length > 0 ? `${(count / athletes.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-black text-slate-700">{count}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Atalhos */}
      <SectionCard title="Ações rápidas">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Ver elenco", href: "/atletas/elenco", icon: Users, color: "bg-blue-50 text-blue-600" },
            { label: "Novo atleta", href: "/atletas/novo", icon: UserPlus, color: "bg-emerald-50 text-emerald-600" },
            { label: "Goleiros", href: "/goleiros", icon: Trophy, color: "bg-amber-50 text-amber-600" },
            { label: "Estatísticas", href: "/estatisticas", icon: Activity, color: "bg-slate-100 text-slate-600" },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link
              key={href}
              to={href}
              className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-3 text-center hover:border-slate-300 hover:bg-slate-50"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                <Icon size={18} />
              </div>
              <span className="text-xs font-black text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
