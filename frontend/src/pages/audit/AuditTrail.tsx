import type { AuditLog, UserRole } from "../../types/domain";

type AuditTrailProps = {
  logs: AuditLog[];
  userCount: number;
  errorCount: number;
  systemActionCount: number;
  loading: boolean;
  onRefresh: () => void;
  getActionLabel: (action: string) => string;
  getRoleLabel: (role: UserRole) => string;
};

export function AuditTrail({
  logs,
  userCount,
  errorCount,
  systemActionCount,
  loading,
  onRefresh,
  getActionLabel,
  getRoleLabel
}: AuditTrailProps) {
  const metrics = [
    { label: "Ações", value: logs.length, helper: "Últimos registros", className: "text-slate-950" },
    { label: "Usuários", value: userCount, helper: "Com atividade", className: "text-red-600" },
    { label: "Falhas", value: errorCount, helper: "Status 400+", className: "text-amber-700" },
    { label: "Sistema", value: systemActionCount, helper: "Ações automáticas", className: "text-slate-700" }
  ];

  return (
    <section className="min-w-0 space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-xs font-bold text-slate-500">{item.label}</p>
              <strong className={`mt-1 block truncate text-2xl font-black ${item.className}`}>{item.value}</strong>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{item.helper}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Trilha de auditoria</h2>
            <p className="text-sm text-slate-500">Registro de ações feitas por admin, atleta, financeiro e sistema.</p>
          </div>
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={onRefresh}>
            Atualizar
          </button>
        </div>

        <div className="grid gap-2">
          {logs.map((log) => (
            <article key={log.id} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">{getActionLabel(log.action)}</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                  {log.userName ?? "Sistema"} · {log.userRole ? getRoleLabel(log.userRole) : "-"} · {log.method} {log.path}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">
                {new Date(log.createdAt).toLocaleString("pt-BR")}
              </span>
            </article>
          ))}
        </div>
        {loading ? <p className="mt-4 text-sm font-semibold text-slate-500">Carregando auditoria...</p> : null}
        {!loading && logs.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">Nenhuma ação registrada ainda.</p> : null}
      </article>
    </section>
  );
}
