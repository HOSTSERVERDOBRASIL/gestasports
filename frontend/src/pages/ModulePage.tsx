type ModulePageProps = {
  title: string;
  description: string;
  chips: string[];
};

export function ModulePage({ title, description, chips }: ModulePageProps) {
  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Módulo</p>
        <h2 className="mt-1 text-2xl font-black leading-tight text-slate-950">{title}</h2>
        <p className="mt-1 max-w-xl text-sm font-semibold text-slate-500">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-base font-black text-slate-950">Backlog de produto</h3>
        </div>
        <ul className="divide-y divide-slate-100 text-sm font-semibold text-slate-600">
          <li className="px-4 py-3">CRUD completo do módulo</li>
          <li className="px-4 py-3">Regras automáticas centralizadas</li>
          <li className="px-4 py-3">Tabelas filtráveis por mês/ano</li>
          <li className="px-4 py-3">Relatórios e exportação</li>
        </ul>
      </div>
    </section>
  );
}
