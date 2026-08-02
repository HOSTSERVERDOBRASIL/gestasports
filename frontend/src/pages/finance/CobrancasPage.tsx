import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertCircle, MessageSquare } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { KpiCard } from "../../components/ui/KpiCard";
import { SectionCard } from "../../components/ui/SectionCard";
import type { CollectionDashboard, MonthlyFeePayment } from "../../types/domain";
import { formatCurrency } from "../../utils/formatters";

type OutletPeriod = { month: number; year: number };

function onlyDigits(v: string | null) {
  return (v ?? "").replace(/\D/g, "");
}

function whatsappUrl(phone: string | null, name: string, month: number, year: number, amountCents: number, dueDate: string) {
  const p = onlyDigits(phone);
  const text = `Olá ${name}, sua mensalidade ${String(month).padStart(2, "0")}/${year} no valor de ${formatCurrency(amountCents)} vence em ${new Intl.DateTimeFormat("pt-BR").format(new Date(dueDate))}. Posso te enviar o PIX?`;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export function CobrancasPage() {
  const { month, year } = useOutletContext<OutletPeriod>();

  const dashboardQuery = useQuery({
    queryKey: ["collection-dashboard", month, year],
    queryFn: () => apiRequest<CollectionDashboard>(`/finance/collection/dashboard?month=${month}&year=${year}`)
  });

  const paymentsQuery = useQuery({
    queryKey: ["monthly-fee-payments", month, year],
    queryFn: () => apiRequest<MonthlyFeePayment[]>(`/finance/monthly-fees?month=${month}&year=${year}&limit=200`)
  });

  const dash = dashboardQuery.data;
  const payments = paymentsQuery.data ?? [];
  const latePayments = payments.filter((p) => p.status === "LATE");
  const pendingPayments = payments.filter((p) => p.status === "PENDING");
  const atRisk = [...latePayments, ...pendingPayments];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Financeiro"
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Cobranças" }]}
        title="Cobranças"
        subtitle={`${atRisk.length} associados para acionar`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Em aberto" value={formatCurrency(dash?.totals?.openCents ?? 0)} icon={AlertCircle} iconClass="bg-amber-50 text-amber-600" />
        <KpiCard label="Em atraso" value={formatCurrency(dash?.totals?.lateCents ?? 0)} icon={AlertCircle} iconClass="bg-red-50 text-red-600" />
        <KpiCard label="Vencendo em breve" value={dash?.totals?.dueSoonCount ?? 0} icon={AlertCircle} iconClass="bg-blue-50 text-blue-600" />
        <KpiCard label="Risco total" value={`${dash?.totals?.riskPercent ?? 0}%`} icon={AlertCircle} iconClass="bg-slate-100 text-slate-600" />
      </div>

      <SectionCard
        title="Fila de cobranças"
        subtitle={`${atRisk.length} associados pendentes`}
        action={
          <Link
            to="/financeiro?area=COBRANCAS"
            className="text-xs font-black text-slate-500 hover:text-slate-700"
          >
            Cobrança em massa →
          </Link>
        }
      >
        {atRisk.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold text-emerald-600">Nenhuma cobrança pendente</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {atRisk.slice(0, 20).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">{p.associateName}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {String(p.month).padStart(2, "0")}/{p.year} · {formatCurrency(p.amountCents)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-black ${
                  p.status === "LATE" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"
                }`}>
                  {p.status === "LATE" ? "Em atraso" : "Pendente"}
                </span>
                {p.phone && (
                  <a
                    href={whatsappUrl(p.phone, p.associateName, p.month, p.year, p.amountCents, p.dueDate)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 rounded px-2 py-1 text-xs font-black text-emerald-600 hover:bg-emerald-50"
                  >
                    <MessageSquare size={12} /> WhatsApp
                  </a>
                )}
              </div>
            ))}
            {atRisk.length > 20 && (
              <p className="px-3 py-2 text-xs font-semibold text-slate-500">
                +{atRisk.length - 20} mais. Use{" "}
                <Link to="/financeiro?area=COBRANCAS" className="font-black text-red-600 hover:underline">
                  Cobranças avançadas
                </Link>{" "}
                para cobrança em massa.
              </p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
