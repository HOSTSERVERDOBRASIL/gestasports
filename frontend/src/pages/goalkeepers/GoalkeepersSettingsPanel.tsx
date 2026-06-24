import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, CircleOff, Goal, Pencil, Search, Trash2 } from "lucide-react";
import { apiRequest } from "../../services/api";
import type { GoalkeeperContract, GoalkeeperCostModel } from "../../types/domain";
import { formatCurrency, formatDate } from "../../utils/formatters";

const costModelLabels: Record<GoalkeeperCostModel, string> = {
  MONTHLY: "Mensal",
  PER_GAME: "Por jogo",
  ONE_OFF: "Avulso"
};

function toCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function GoalkeepersSettingsPanel() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [form, setForm] = useState({
    keeperName:"",
    monthlyCostBRL:"900,00",
    startedAt: new Date().toISOString().slice(0, 10),
    costModel:"MONTHLY" as GoalkeeperCostModel,
    paymentMethod:"",
    costCenter:"Goleiros"
  });
  const editParam = new URLSearchParams(location.search).get("edit");
  const showForm = editParam === "new" || selectedContractId !== null;

  const resetForm = () => {
    setForm({
      keeperName:"",
      monthlyCostBRL:"900,00",
      startedAt: new Date().toISOString().slice(0, 10),
      costModel:"MONTHLY",
      paymentMethod:"",
      costCenter:"Goleiros"
    });
  };

  const closeEditor = () => {
    setSelectedContractId(null);
    resetForm();
    navigate(location.pathname, { replace: true });
  };

  useEffect(() => {
    if (editParam === "new") {
      setSelectedContractId(null);
      resetForm();
    }
  }, [editParam]);

  const contractsQuery = useQuery({
    queryKey: ["goalkeeper-contracts"],
    queryFn: () => apiRequest<GoalkeeperContract[]>("/goalkeepers/contracts")
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest<GoalkeeperContract>(selectedContractId ? `/goalkeepers/contracts/${selectedContractId}` :"/goalkeepers/contracts", {
        method: selectedContractId ? "PATCH" : "POST",
        body: JSON.stringify({
          keeperName: form.keeperName,
          monthlyCostCents: toCents(form.monthlyCostBRL) || 0,
          startedAt: new Date(`${form.startedAt}T00:00:00`).toISOString(),
          costModel: form.costModel,
          paymentMethod: form.paymentMethod,
          costCenter: form.costCenter
        })
      }),
    onSuccess: () => {
      closeEditor();
      void queryClient.invalidateQueries({ queryKey: ["goalkeeper-contracts"] });
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (contract: GoalkeeperContract) =>
      apiRequest<GoalkeeperContract>(`/goalkeepers/contracts/${contract.id}`, {
        method:"PATCH",
        body: JSON.stringify({ active: !contract.active })
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["goalkeeper-contracts"] });
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/goalkeepers/contracts/${id}`, {
        method:"DELETE"
      }),
    onSuccess: () => {
      closeEditor();
      void queryClient.invalidateQueries({ queryKey: ["goalkeeper-contracts"] });
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
    }
  });

  const contracts = contractsQuery.data ?? [];
  const activeContracts = contracts.filter((contract) => contract.active);
  const inactiveContracts = contracts.filter((contract) => !contract.active);
  const activeCost = activeContracts.reduce((total, contract) => total + contract.monthlyCostCents, 0);
  const monthlyRecurringCost = activeContracts
    .filter((contract) => contract.costModel === "MONTHLY")
    .reduce((total, contract) => total + contract.monthlyCostCents, 0);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredContracts = contracts.filter((contract) => {
    const matchesStatus = statusFilter === "ALL" || (statusFilter === "ACTIVE" ? contract.active : !contract.active);
    const matchesSearch = !normalizedSearch || contract.keeperName.toLowerCase().includes(normalizedSearch) || (contract.costCenter ?? "").toLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  const handleEditContract = (contract: GoalkeeperContract) => {
    setSelectedContractId(contract.id);
    setForm({
      keeperName: contract.keeperName,
      monthlyCostBRL: String((contract.monthlyCostCents / 100).toFixed(2)).replace(".", ","),
      startedAt: contract.startedAt.slice(0, 10),
      costModel: contract.costModel,
      paymentMethod: contract.paymentMethod ?? "",
      costCenter: contract.costCenter ?? "Goleiros"
    });
    navigate(`${location.pathname}?edit=${contract.id}`);
  };

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Goal size={18} />
            Ativos
          </p>
          <h2 className="mt-2 text-2xl font-black text-emerald-700">{activeContracts.length}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Entram no sorteio</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-500">Inativos</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{inactiveContracts.length}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Pausados</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-500">Custo ativo</p>
          <h2 className="mt-2 text-2xl font-black text-red-600">{formatCurrency(activeCost)}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Todos modelos</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-500">Mensalidade</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{formatCurrency(monthlyRecurringCost)}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Recorrente no mês</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-500">Contratos</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{contracts.length}</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">Base cadastrada</p>
        </article>
      </div>

      <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Disponibilidade de goleiros</h2>
            <p className="text-sm text-slate-500">{activeContracts.length} goleiro(s) ativo(s) disponível(is) para entrar no sorteio.</p>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700">{contracts.length} total</span>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700">Ativo: entra no sorteio</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700">Inativo: pausado</span>
      </div>

      <section className="mt-5 min-w-0">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Base de goleiros</h2>
          <p className="text-sm text-slate-500">Controle contratos, custos e quais goleiros contratados entram na distribuição dos times.</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <label className="relative min-w-[16rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
              placeholder="Buscar por nome"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <select
            className="min-w-[12rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
          >
            <option value="ALL">Todos status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>
          <button type="button" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 shadow-sm" onClick={() => setStatusFilter("ACTIVE")}>
            {activeContracts.length} ativos
          </button>
          <button type="button" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 shadow-sm" onClick={() => setStatusFilter("INACTIVE")}>
            {inactiveContracts.length} inativos
          </button>
        </div>

        {showForm ? (
          <article className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">{selectedContractId ? "Editar contrato" : "Novo contrato"}</h3>
                <p className="text-sm text-slate-500">O goleiro ativo participa do sorteio e precisa respeitar a divisão por posição.</p>
              </div>
              <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={closeEditor}>
                Fechar
              </button>
            </div>
            <form className="mt-4 grid gap-3 lg:grid-cols-12" onSubmit={(event) => { event.preventDefault(); void saveMutation.mutateAsync(); }}>
              <label className="block text-sm font-medium text-slate-600 lg:col-span-4">
                Nome
                <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" value={form.keeperName} onChange={(event) => setForm((prev) => ({ ...prev, keeperName: event.target.value }))} required />
              </label>
              <label className="block text-sm font-medium text-slate-600 lg:col-span-2">
                Valor (R$)
                <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" value={form.monthlyCostBRL} onChange={(event) => setForm((prev) => ({ ...prev, monthlyCostBRL: event.target.value }))} />
              </label>
              <label className="block text-sm font-medium text-slate-600 lg:col-span-2">
                Início
                <input type="date" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" value={form.startedAt} onChange={(event) => setForm((prev) => ({ ...prev, startedAt: event.target.value }))} />
              </label>
              <label className="block text-sm font-medium text-slate-600 lg:col-span-2">
                Modelo
                <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" value={form.costModel} onChange={(event) => setForm((prev) => ({ ...prev, costModel: event.target.value as GoalkeeperCostModel }))}>
                  <option value="MONTHLY">Mensal</option>
                  <option value="PER_GAME">Por jogo</option>
                  <option value="ONE_OFF">Avulso</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-600 lg:col-span-2">
                Centro de custo
                <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" value={form.costCenter} onChange={(event) => setForm((prev) => ({ ...prev, costCenter: event.target.value }))} />
              </label>
              <div className="flex flex-wrap justify-end gap-2 lg:col-span-12">
                <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50" onClick={closeEditor}>
                  Cancelar
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {saveMutation.isPending ? "Salvando..." : selectedContractId ? "Salvar alterações" : "Cadastrar contrato"}
                </button>
              </div>
            </form>
          </article>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Nome</th>
                <th className="px-3 py-3">Modelo</th>
                <th className="px-3 py-3">Início</th>
                <th className="px-3 py-3">Centro de custo</th>
                <th className="px-3 py-3 text-right">Valor</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-bold text-slate-950">{contract.keeperName}</td>
                  <td className="px-3 py-3 font-semibold text-slate-600">{costModelLabels[contract.costModel]}</td>
                  <td className="px-3 py-3 font-semibold text-slate-600">{formatDate(contract.startedAt)}</td>
                  <td className="px-3 py-3 text-slate-600">{contract.costCenter ?? "Sem centro de custo"}</td>
                  <td className="px-3 py-3 text-right font-black text-slate-950">{formatCurrency(contract.monthlyCostCents)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${contract.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {contract.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        title={contract.active ? "Desativar" : "Ativar"}
                        aria-label={contract.active ? "Desativar contrato" : "Ativar contrato"}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${contract.active ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                        onClick={() => void toggleMutation.mutateAsync(contract)}
                      >
                        {contract.active ? <CircleOff size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                      <button
                        type="button"
                        title="Editar"
                        aria-label="Editar contrato"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        onClick={() => handleEditContract(contract)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        title="Excluir"
                        aria-label="Excluir contrato"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        onClick={() => {
                          const shouldDelete = window.confirm(`Deseja excluir o contrato de ${contract.keeperName}?`);
                          if (shouldDelete) {
                            void deleteMutation.mutateAsync(contract.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!contractsQuery.isLoading && filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                    Nenhum contrato de goleiro encontrado.
                  </td>
                </tr>
              ) : null}
              {contractsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                    Carregando contratos...
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

