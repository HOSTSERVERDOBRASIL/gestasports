import { Link } from "react-router-dom";
import { InsightGrid, MetricGrid } from "../../components/ui/AppUI";
import { formatCurrency } from "../../utils/formatters";

type AssociatesOverviewProps = {
  active: number;
  late: number;
  inactive: number;
  athletesLinked: number;
  associatesTotal: number;
  monthlyTotal: number;
  activeMonthlyTotal: number;
  lateMonthlyTotal: number;
  withoutContact: number;
  withoutAthleteProfile: number;
  pendingJoinRequests: number;
  associationHealthPercent: number;
  athleteConversionPercent: number;
  onShowLate: () => void;
  onClearSearch: () => void;
};

export function AssociatesOverview({
  active,
  late,
  inactive,
  athletesLinked,
  associatesTotal,
  monthlyTotal,
  activeMonthlyTotal,
  lateMonthlyTotal,
  withoutContact,
  withoutAthleteProfile,
  pendingJoinRequests,
  associationHealthPercent,
  athleteConversionPercent,
  onShowLate,
  onClearSearch
}: AssociatesOverviewProps) {
  return (
    <>
      <MetricGrid
        items={[
          { label: "Ativos", value: active, helper: "Em dia", className: "text-emerald-700" },
          { label: "Atrasados", value: late, helper: "Pendentes", className: "text-amber-700" },
          { label: "Inativos", value: inactive, helper: "Pausados", className: "text-slate-700" },
          { label: "Em atletas", value: athletesLinked, helper: `${athleteConversionPercent}% conversão`, className: "text-red-600" },
          { label: "Mensalidade", value: formatCurrency(monthlyTotal), helper: "Prevista no mês" }
        ]}
      />

      <InsightGrid
        className="mt-3"
        items={[
          { label: "Saúde da base", value: `${associationHealthPercent}%`, helper: `${active} de ${associatesTotal} ativos`, tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
          { label: "Receita ativa", value: formatCurrency(activeMonthlyTotal), helper: "Associados em dia", tone: "border-blue-200 bg-blue-50 text-blue-800" },
          { label: "Risco em atraso", value: formatCurrency(lateMonthlyTotal), helper: `${late} pendente(s)`, tone: "border-amber-200 bg-amber-50 text-amber-800" },
          { label: "Cadastro incompleto", value: withoutContact, helper: "Sem email e telefone" }
        ]}
      />

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-950">Próximos cuidados</h3>
              <p className="text-xs font-semibold text-slate-500">Leitura rápida para manter a base limpa.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{associatesTotal} cadastros</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <button type="button" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs font-black text-amber-800 hover:bg-amber-100" onClick={onShowLate}>
              Cobrar atrasados <span className="block text-lg">{late}</span>
            </button>
            <button type="button" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-black text-slate-700 hover:bg-slate-100" onClick={onClearSearch}>
              Sem atleta <span className="block text-lg">{withoutAthleteProfile}</span>
            </button>
            <Link to="/convites" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-xs font-black text-red-700 hover:bg-red-100">
              Solicitações <span className="block text-lg">{pendingJoinRequests}</span>
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Conversão para atleta</p>
          <strong className="mt-1 block text-2xl font-black text-slate-950">{athleteConversionPercent}%</strong>
          <div className="mt-3 h-2 rounded-full bg-white">
            <div className="h-2 rounded-full bg-red-600" style={{ width: `${Math.min(100, athleteConversionPercent)}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">{athletesLinked} associado(s) vinculados ao elenco.</p>
        </div>
      </div>
    </>
  );
}
