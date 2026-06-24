import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ListChecks, Plus, Trophy, Users } from "lucide-react";
import { ContentCard, DataTable, EnterpriseStatCard, FilterBar, PageTemplate, StatsGrid } from "../components/ui/EnterpriseUI";
import { apiRequest } from "../services/api";
import type { Competition, CompetitionFormat, CompetitionStatus, Team } from "../types/domain";

const formatLabels: Record<CompetitionFormat, string> = {
  PONTOS_CORRIDOS: "Pontos corridos",
  MATA_MATA: "Mata-mata",
  GRUPOS: "Grupos",
  GRUPOS_E_MATA_MATA: "Grupos + mata-mata",
  JOGO_UNICO: "Jogo único",
  IDA_E_VOLTA: "Ida e volta"
};

const statusLabels: Record<CompetitionStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  FINISHED: "Finalizada",
  CANCELED: "Cancelada"
};

function dateToIso(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : "";
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(value)) : "-";
}

function teamName(team: Competition["teams"][number]) {
  return team.team?.name ?? team.club?.name ?? "Equipe sem vínculo";
}

export function InternalLeaguesPage() {
  const queryClient = useQueryClient();
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");
  const [leagueForm, setLeagueForm] = useState({
    name: "",
    format: "PONTOS_CORRIDOS" as CompetitionFormat,
    startDate: "",
    endDate: ""
  });
  const [teamForm, setTeamForm] = useState({ teamId: "", groupName: "" });

  const competitionsQuery = useQuery({
    queryKey: ["competitions", "internal-leagues"],
    queryFn: () => apiRequest<Competition[]>("/competitions"),
    retry: false
  });

  const teamsQuery = useQuery({
    queryKey: ["teams", "internal-leagues"],
    queryFn: () => apiRequest<Team[]>("/teams"),
    retry: false
  });

  const leagues = useMemo(
    () => (competitionsQuery.data ?? []).filter((competition) => competition.type === "LEAGUE" || competition.type === "TOURNAMENT"),
    [competitionsQuery.data]
  );

  const selectedLeague = leagues.find((league) => league.id === selectedLeagueId) ?? leagues[0];
  const activeLeagues = leagues.filter((league) => league.status === "ACTIVE").length;
  const totalTeams = leagues.reduce((sum, league) => sum + (league.teams?.length ?? 0), 0);
  const totalGames = leagues.reduce((sum, league) => sum + (league._count?.games ?? 0), 0);

  const createLeagueMutation = useMutation({
    mutationFn: () =>
      apiRequest<Competition>("/competitions", {
        method: "POST",
        body: JSON.stringify({
          name: leagueForm.name,
          type: "LEAGUE",
          format: leagueForm.format,
          status: "DRAFT",
          startDate: dateToIso(leagueForm.startDate),
          endDate: dateToIso(leagueForm.endDate),
          rules: { origin: "internal_leagues", scheduling: "manual_or_generated_later" }
        })
      }),
    onSuccess: async (league) => {
      setLeagueForm({ name: "", format: "PONTOS_CORRIDOS", startDate: "", endDate: "" });
      setSelectedLeagueId(league.id);
      await queryClient.invalidateQueries({ queryKey: ["competitions", "internal-leagues"] });
    }
  });

  const addTeamMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/competitions/${selectedLeague?.id}/teams`, {
        method: "POST",
        body: JSON.stringify({ teamId: teamForm.teamId, groupName: teamForm.groupName, status: "ACTIVE" })
      }),
    onSuccess: async () => {
      setTeamForm({ teamId: "", groupName: "" });
      await queryClient.invalidateQueries({ queryKey: ["competitions", "internal-leagues"] });
    }
  });

  const availableTeams = (teamsQuery.data ?? []).filter(
    (team) => !selectedLeague?.teams.some((entry) => entry.teamId === team.id)
  );

  return (
    <PageTemplate
      eyebrow="Futebol"
      title="Ligas Internas"
      description="Organize campeonatos internos com equipes, formato, classificação e vínculo com jogos da temporada."
      actions={
        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-black text-white" onClick={() => document.getElementById("nova-liga-interna")?.scrollIntoView({ behavior: "smooth" })}>
          <Plus size={16} /> Nova liga
        </button>
      }
    >
      <StatsGrid>
        <EnterpriseStatCard label="Ligas ativas" value={activeLeagues} helper={`${leagues.length} cadastrada(s)`} icon={<Trophy size={18} />} />
        <EnterpriseStatCard label="Equipes inscritas" value={totalTeams} helper="participantes vinculados" icon={<Users size={18} />} />
        <EnterpriseStatCard label="Jogos vinculados" value={totalGames} helper="agenda competitiva" icon={<CalendarDays size={18} />} />
        <EnterpriseStatCard label="Formatos" value={new Set(leagues.map((league) => league.format)).size} helper="modelos em uso" icon={<ListChecks size={18} />} />
      </StatsGrid>

      <ContentCard title="Criar liga interna" description="Cadastre a competição primeiro; depois vincule equipes e jogos pelo fluxo de futebol." className="mt-4">
        <form
          id="nova-liga-interna"
          className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_13rem_11rem_11rem_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void createLeagueMutation.mutateAsync();
          }}
        >
          <input className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" placeholder="Nome da liga" value={leagueForm.name} onChange={(event) => setLeagueForm((current) => ({ ...current, name: event.target.value }))} required />
          <select className="h-11 rounded-lg border-slate-200 bg-white px-3 text-sm font-black" value={leagueForm.format} onChange={(event) => setLeagueForm((current) => ({ ...current, format: event.target.value as CompetitionFormat }))}>
            {Object.entries(formatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input type="date" className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" value={leagueForm.startDate} onChange={(event) => setLeagueForm((current) => ({ ...current, startDate: event.target.value }))} />
          <input type="date" className="h-11 rounded-lg border-slate-200 px-3 text-sm font-semibold" value={leagueForm.endDate} onChange={(event) => setLeagueForm((current) => ({ ...current, endDate: event.target.value }))} />
          <button type="submit" disabled={createLeagueMutation.isPending} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-black text-white disabled:opacity-60">
            {createLeagueMutation.isPending ? "Salvando..." : "Criar"}
          </button>
        </form>
      </ContentCard>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <ContentCard title="Ligas cadastradas" description={competitionsQuery.isLoading ? "Carregando ligas..." : `${leagues.length} liga(s) encontrada(s).`}>
          <DataTable
            rows={leagues}
            getRowKey={(league) => league.id}
            emptyTitle="Nenhuma liga interna cadastrada"
            emptyDescription="Crie a primeira liga para organizar campeonatos internos do clube."
            columns={[
              { key: "name", header: "Liga", render: (league) => <button type="button" className="text-left font-black text-slate-950 hover:text-[var(--brand-accent)]" onClick={() => setSelectedLeagueId(league.id)}>{league.name}</button> },
              { key: "format", header: "Formato", render: (league) => formatLabels[league.format] },
              { key: "status", header: "Status", render: (league) => statusLabels[league.status] },
              { key: "teams", header: "Equipes", render: (league) => league.teams.length }
            ]}
          />
        </ContentCard>

        <ContentCard title={selectedLeague ? selectedLeague.name : "Classificação"} description={selectedLeague ? `${formatLabels[selectedLeague.format]} • ${formatDate(selectedLeague.startDate)} a ${formatDate(selectedLeague.endDate)}` : "Selecione uma liga para ver participantes."}>
          {selectedLeague ? (
            <>
              <FilterBar>
                <form
                  className="grid w-full gap-2 md:grid-cols-[minmax(0,1fr)_8rem_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addTeamMutation.mutateAsync();
                  }}
                >
                  <select className="h-10 rounded-lg border-slate-200 bg-white px-3 text-sm font-bold" value={teamForm.teamId} onChange={(event) => setTeamForm((current) => ({ ...current, teamId: event.target.value }))} required>
                    <option value="">Selecionar equipe</option>
                    {availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                  </select>
                  <input className="h-10 rounded-lg border-slate-200 px-3 text-sm font-bold" placeholder="Grupo" value={teamForm.groupName} onChange={(event) => setTeamForm((current) => ({ ...current, groupName: event.target.value }))} />
                  <button type="submit" disabled={addTeamMutation.isPending || !teamForm.teamId} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:opacity-60">Adicionar</button>
                </form>
              </FilterBar>

              <DataTable
                className="mt-3"
                rows={[...selectedLeague.teams].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)}
                getRowKey={(entry) => entry.id}
                emptyTitle="Nenhuma equipe inscrita"
                emptyDescription="Adicione equipes já cadastradas para iniciar a classificação."
                columns={[
                  { key: "team", header: "Equipe", render: (entry) => <span className="font-black text-slate-950">{teamName(entry)}</span> },
                  { key: "group", header: "Grupo", render: (entry) => entry.groupName ?? "-" },
                  { key: "points", header: "Pts", render: (entry) => entry.points, className: "text-right" },
                  { key: "record", header: "Campanha", render: (entry) => `${entry.wins}V ${entry.draws}E ${entry.losses}D` },
                  { key: "goals", header: "GP/GC", render: (entry) => `${entry.goalsFor}/${entry.goalsAgainst}` }
                ]}
              />
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-500">Crie ou selecione uma liga para gerenciar participantes.</p>
          )}
        </ContentCard>
      </div>
    </PageTemplate>
  );
}
