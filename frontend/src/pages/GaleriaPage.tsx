import { useMemo, useState } from"react";
import { useMutation, useQuery, useQueryClient } from"@tanstack/react-query";
import { apiRequest } from"../services/api";
import type { GalleryAsset } from"../types/domain";

const mediaTypes = [
"ATHLETE_PROFILE",
"GAME",
"CONFRONTATION",
"EVENT",
"FINANCIAL_RECEIPT",
"GENERAL"
] as const;

function mediaTypeLabel(type: GalleryAsset["type"]) {
  const map: Record<GalleryAsset["type"], string> = {
    ATHLETE_PROFILE:"Perfil atleta",
    GAME:"Jogo",
    CONFRONTATION:"Confronto",
    EVENT:"Evento",
    FINANCIAL_RECEIPT:"Comprovante",
    GENERAL:"Geral"
  };

  return map[type];
}

export function GaleriaPage() {
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<"ALL" | GalleryAsset["type"]>("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");

  const [form, setForm] = useState({
    type:"GENERAL" as GalleryAsset["type"],
    url:"",
    title:"",
    year: String(new Date().getUTCFullYear())
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (typeFilter !=="ALL") {
      params.set("type", typeFilter);
    }
    if (yearFilter !=="ALL") {
      params.set("year", yearFilter);
    }
    return params.toString();
  }, [typeFilter, yearFilter]);

  const assetsQuery = useQuery({
    queryKey: ["gallery-assets", typeFilter, yearFilter],
    queryFn: () => apiRequest<GalleryAsset[]>(`/gallery/assets${queryString ? `?${queryString}` : ""}`)
  });

  const createMutation = useMutation({
    mutationFn: (payload: { type: GalleryAsset["type"]; url: string; title: string; year: number }) =>
      apiRequest<GalleryAsset>("/gallery/assets", {
        method:"POST",
        body: JSON.stringify(payload)
      }),
    onSuccess: () => {
      setForm((prev) => ({ ...prev, url:"", title:"" }));
      void queryClient.invalidateQueries({ queryKey: ["gallery-assets"] });
    }
  });
  const assets = assetsQuery.data ?? [];

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/gallery/assets/${id}`, {
        method:"DELETE"
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gallery-assets"] });
    }
  });

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createMutation.mutateAsync({
      type: form.type,
      url: form.url,
      title: form.title || "Imagem da galeria",
      year: form.year ? Number(form.year) : new Date().getUTCFullYear()
    });
  }

  return (
    <section className="min-w-0 space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Galeria historica</h3>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              >
                <option value="ALL">Tipo: Todos</option>
                {mediaTypes.map((type) => (
                  <option key={type} value={type}>
                    {mediaTypeLabel(type)}
                  </option>
                ))}
              </select>

              <input
                value={yearFilter === "ALL" ? "" : yearFilter}
                onChange={(event) => setYearFilter(event.target.value ? event.target.value :"ALL")}
                placeholder="Ano"
                className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <article key={asset.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
                <a href={asset.url} target="_blank" rel="noreferrer">
                  <img src={asset.url} alt={asset.title ?? "Imagem da galeria"} className="h-40 w-full object-cover" loading="lazy" />
                </a>
                <div className="space-y-1 p-3">
                  <p className="truncate text-sm font-semibold text-slate-800">{asset.title ?? "Sem título"}</p>
                  <p className="text-xs text-slate-500">{mediaTypeLabel(asset.type)} {asset.year ? `- ${asset.year}` :""}</p>
                  <button
                    type="button"
                    className="mt-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    onClick={() => removeMutation.mutate(asset.id)}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!assets.length ? <p className="mt-3 text-sm text-slate-500">Nenhum item encontrado na galeria.</p> : null}
        </article>

        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Novo item (URL)</h3>
          <form className="mt-3 space-y-3" onSubmit={(event) => void handleCreate(event)}>
            <label className="block text-sm text-slate-600">
              Tipo
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as GalleryAsset["type"] }))}
              >
                {mediaTypes.map((type) => (
                  <option key={type} value={type}>
                    {mediaTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-600">
              URL da imagem
              <input
                type="url"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="https://..."
              />
            </label>

            <label className="block text-sm text-slate-600">
              Titulo
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </label>

            <label className="block text-sm text-slate-600">
              Ano
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.year}
                onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Salvando..." : "Salvar na galeria"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
