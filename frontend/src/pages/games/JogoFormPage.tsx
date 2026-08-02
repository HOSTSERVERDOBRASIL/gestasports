import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { apiRequest } from "../../services/api";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import type { Club, Competition, Field, Game, GameMode, GameType } from "../../types/domain";
import {
  DEFAULT_RED_UNIFORM_NAME,
  DEFAULT_WHITE_UNIFORM_NAME,
  dateToInput, toCents
} from "./gameLogic";


type GameFormState = {
  type: GameType;
  gameMode: GameMode;
  date: string;
  fieldId: string;
  location: string;
  homeClubId: string;
  awayClubId: string;
  homeTeamId: string;
  awayTeamId: string;
  competitionId: string;
  round: string;
  championship: string;
  gameValueBRL: string;
  redTeamName: string;
  whiteTeamName: string;
  refereeName: string;
  note: string;
};

const blank: GameFormState = {
  type: "INTERNAL",
  gameMode: "INTERNAL_SPLIT",
  date: dateToInput(new Date()),
  fieldId: "",
  location: "",
  homeClubId: "",
  awayClubId: "",
  homeTeamId: "",
  awayTeamId: "",
  competitionId: "",
  round: "",
  championship: "",
  gameValueBRL: "0,00",
  redTeamName: DEFAULT_RED_UNIFORM_NAME,
  whiteTeamName: DEFAULT_WHITE_UNIFORM_NAME,
  refereeName: "",
  note: ""
};

const gameModeLabels: Record<GameMode, string> = {
  INTERNAL_SPLIT: "Racha interno",
  FRIENDLY: "Amistoso",
  CHAMPIONSHIP: "Campeonato",
  TOURNAMENT: "Torneio",
  TRAINING: "Treino",
  EXTERNAL_FRIENDLY: "Amistoso externo"
};

export function JogoFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);
  const [form, setForm] = useState<GameFormState>(blank);

  const gameQuery = useQuery({
    queryKey: ["game", id],
    queryFn: () => apiRequest<Game>(`/sports/games/${id}`),
    enabled: isEditing
  });

  const clubsQuery = useQuery({
    queryKey: ["clubs", "game-form"],
    queryFn: () => apiRequest<Club[]>("/clubs")
  });

  const fieldsQuery = useQuery({
    queryKey: ["sports-fields", "game-form"],
    queryFn: () => apiRequest<Field[]>("/sports/fields")
  });

  const competitionsQuery = useQuery({
    queryKey: ["competitions", "game-form"],
    queryFn: () => apiRequest<Competition[]>("/competitions")
  });

  useEffect(() => {
    const g = gameQuery.data;
    if (!g) return;
    setForm({
      type: g.type,
      gameMode: g.gameMode,
      date: g.date.slice(0, 16),
      fieldId: g.fieldId ?? "",
      location: g.location,
      homeClubId: g.homeClubId ?? "",
      awayClubId: g.awayClubId ?? "",
      homeTeamId: g.homeTeamId ?? "",
      awayTeamId: g.awayTeamId ?? "",
      competitionId: g.competitionId ?? "",
      round: g.round ?? "",
      championship: g.championship ?? "",
      gameValueBRL: String(((g.gameValueCents || 0) / 100).toFixed(2)).replace(".", ","),
      redTeamName: g.redTeamName ?? DEFAULT_RED_UNIFORM_NAME,
      whiteTeamName: g.whiteTeamName ?? DEFAULT_WHITE_UNIFORM_NAME,
      refereeName: g.refereeName ?? "",
      note: g.note ?? ""
    });
  }, [gameQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest<Game>(isEditing ? `/sports/games/${id}` : "/sports/games", {
        method: isEditing ? "PATCH" : "POST",
        body: JSON.stringify({
          type: form.type,
          gameMode: form.gameMode,
          date: form.date,
          fieldId: form.fieldId || undefined,
          location: form.location,
          homeClubId: form.homeClubId || undefined,
          awayClubId: form.awayClubId || undefined,
          homeTeamId: form.homeTeamId || undefined,
          awayTeamId: form.awayTeamId || undefined,
          competitionId: form.competitionId || undefined,
          round: form.round || undefined,
          championship: form.championship || undefined,
          gameValueCents: toCents(form.gameValueBRL),
          redTeamName: form.redTeamName || undefined,
          whiteTeamName: form.whiteTeamName || undefined,
          refereeName: form.refereeName || undefined,
          note: form.note || undefined
        })
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
      navigate(`/jogos/${saved.id}`);
    }
  });

  const isLoading = isEditing && gameQuery.isLoading;
  const clubs = clubsQuery.data ?? [];
  const fields = fieldsQuery.data ?? [];
  const competitions = competitionsQuery.data ?? [];
  const set = <K extends keyof GameFormState>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Jogos"
        breadcrumbs={[
          { label: "Jogos", href: "/jogos" },
          { label: "Lista", href: "/jogos/lista" },
          ...(isEditing && gameQuery.data ? [{ label: gameQuery.data.awayClub?.name ?? gameQuery.data.homeClub?.name ?? "Jogo", href: `/jogos/${id}` }] : []),
          { label: isEditing ? "Editar" : "Novo jogo" }
        ]}
        title={isEditing ? "Editar jogo" : "Novo jogo"}
        subtitle={isEditing ? "Atualize os dados do jogo." : "Preencha os dados para cadastrar um novo jogo."}
        action={
          <Link
            to={isEditing ? `/jogos/${id}` : "/jogos/lista"}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={14} /> Voltar
          </Link>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void saveMutation.mutateAsync(); }} className="space-y-4">
          <SectionCard title="Dados principais">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-black text-slate-700">
                Tipo de jogo
                <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.type} onChange={set("type")}>
                  <option value="INTERNAL">Interno</option>
                  <option value="EXTERNAL">Externo</option>
                </select>
              </label>

              <label className="block text-sm font-black text-slate-700">
                Modalidade
                <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.gameMode} onChange={set("gameMode")}>
                  {(Object.entries(gameModeLabels) as Array<[GameMode, string]>).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-black text-slate-700">
                Data e hora <span className="text-red-500">*</span>
                <input required type="datetime-local" className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.date} onChange={set("date")} />
              </label>

              <label className="block text-sm font-black text-slate-700">
                Campo
                <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.fieldId} onChange={set("fieldId")}>
                  <option value="">Nenhum campo selecionado</option>
                  {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>

              <label className="block text-sm font-black text-slate-700 sm:col-span-2">
                Local / Endereço
                <input className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" placeholder="Nome do campo, endereço..." value={form.location} onChange={set("location")} />
              </label>
            </div>
          </SectionCard>

          {form.type === "EXTERNAL" && (
            <SectionCard title="Clubes">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-black text-slate-700">
                  Clube mandante
                  <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.homeClubId} onChange={set("homeClubId")}>
                    <option value="">Selecionar clube</option>
                    {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-black text-slate-700">
                  Clube visitante
                  <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.awayClubId} onChange={set("awayClubId")}>
                    <option value="">Selecionar clube</option>
                    {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Times e nomes">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-black text-slate-700">
                Nome do Time A
                <input className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.redTeamName} onChange={set("redTeamName")} />
              </label>
              <label className="block text-sm font-black text-slate-700">
                Nome do Time B
                <input className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.whiteTeamName} onChange={set("whiteTeamName")} />
              </label>
            </div>
          </SectionCard>

          <SectionCard title="Competição e árbitro">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-black text-slate-700">
                Competição
                <select className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" value={form.competitionId} onChange={set("competitionId")}>
                  <option value="">Nenhuma competição</option>
                  {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-black text-slate-700">
                Rodada / Fase
                <input className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" placeholder="Ex: Rodada 3" value={form.round} onChange={set("round")} />
              </label>
              <label className="block text-sm font-black text-slate-700">
                Árbitro
                <input className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" placeholder="Nome do árbitro" value={form.refereeName} onChange={set("refereeName")} />
              </label>
              <label className="block text-sm font-black text-slate-700">
                Custo do jogo (R$)
                <input className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" placeholder="0,00" value={form.gameValueBRL} onChange={set("gameValueBRL")} />
              </label>
              <label className="block text-sm font-black text-slate-700 sm:col-span-2">
                Observações
                <textarea className="mt-1.5 min-h-20 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 focus:border-slate-400 focus:outline-none" placeholder="Informações adicionais..." value={form.note} onChange={set("note")} />
              </label>
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saveMutation.isPending || !form.date}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Save size={14} />
              {saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar jogo"}
            </button>
            <Link
              to={isEditing ? `/jogos/${id}` : "/jogos/lista"}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>
            {saveMutation.isError && (
              <p className="text-sm font-semibold text-red-600">Erro ao salvar. Verifique os dados.</p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
