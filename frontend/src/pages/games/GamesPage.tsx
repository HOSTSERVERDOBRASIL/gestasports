import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleOff,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  Filter,
  Goal,
  Lightbulb,
  MapPin,
  MoreVertical,
  PlusCircle,
  Printer,
  Save,
  Share2,
  ShieldCheck,
  Shirt,
  Shuffle,
  Users,
} from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../services/api";
import { invalidateLineupQueries } from "../../utils/lineupQueries";
import {
  encodeTeamKit,
  parseTeamKit,
  type UniformStyle,
} from "../../utils/teamColors";
import { FullPitchBoard } from "../../components/ui/FullPitchBoard";
import { BenchPlayerCard } from "../../components/ui/KitRenderer";
import { TeamColorCard } from "../../components/ui/TeamColorCard";
import { ParticipacaoPageReal } from "../GameParticipationPage";
import { GameCancelModal } from "./GameCancelModal";
import { GameAgendaCalendar } from "./GameAgendaCalendar";
import { GameAgendaToolbar } from "./GameAgendaToolbar";
import { GameAgendaCard } from "./GameAgendaCard";
import type {
  AthletePosition,
  AthleteProfile,
  Club,
  Competition,
  Game,
  GameLineup,
  GameEventType,
  GameMode,
  GameType,
  GoalkeeperContract,
  GroupSettings,
  Field,
  LineupRole,
  LineupDraft,
  LineupDraftAttempt,
  TenantBrandingSettings,
  Team,
  TeamSide,
} from "../../types/domain";

import {
  DEFAULT_RED_UNIFORM_COLOR,
  DEFAULT_RED_UNIFORM_NAME,
  DEFAULT_WHITE_UNIFORM_COLOR,
  DEFAULT_WHITE_UNIFORM_NAME,
  athletePositionLabels,
  athletePositionText,
  arrivalStatusLabels,
  buildFormationRowsFromAthletes,
  buttonStyles,
  canEnterLineup,
  createDefaultTacticalPlans,
  datePartFromInput,
  dateToInput,
  defaultPlayersPerTeam,
  detectPitchFormation,
  draftPositionDistribution,
  eventTypeLabels,
  firstFilledText,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLongDate,
  gameFlowSteps,
  gameTypeLabels,
  getGameSubViewFromSearch,
  hasAthleteProfile,
  hasId,
  hasLineupAthlete,
  isGoalkeeperAthlete,
  isLineupFieldAthlete,
  lineupsToPitchSlots,
  lineupsToSlotList,
  lineupBlockReason,
  maxDraftAttemptsPerGame,
  minGoalkeepersForDraft,
  normalizedHex,
  persistedPitchFormation,
  pitchFormationSlots,
  pitchPositionOrder,
  readableTextColor,
  recommendFormations,
  setDatePartOnInput,
  setTimePartOnInput,
  shortAthleteName,
  showLegacyGameSections,
  sortAthletesForPitch,
  tacticalFormationTemplates,
  teamCategoryLabels,
  timePartFromInput,
  toCents,
  toDateKey,
  uniformColorHex,
  type GameNotifyResponse,
  type GameSubView,
  type OutletPeriod,
  type PitchFormationKey,
  type TacticalAthlete,
  type TacticalFormationKey,
  type TacticalPlanKey,
  type TacticalPlanState,
} from "./gameLogic";
export function GamesPage() {
  const { month, year } = useOutletContext<OutletPeriod>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [gamesSubView, setGamesSubView] = useState<GameSubView>(
    () => getGameSubViewFromSearch(location.search) ?? "LISTA",
  );
  const currentGamesSubView =
    getGameSubViewFromSearch(location.search) ?? gamesSubView;
  const [typeFilter, setTypeFilter] = useState<"ALL" | GameType>("ALL");
  const [gameStatusFilter, setGameStatusFilter] = useState<
    "ALL" | Game["status"]
  >("ALL");
  const [gameSearch, setGameSearch] = useState("");
  const [showWholeYear, setShowWholeYear] = useState(false);
  const [historyYear, setHistoryYear] = useState(year);
  const [agendaViewMode, setAgendaViewMode] = useState<"LISTA" | "CALENDARIO">(
    "CALENDARIO",
  );
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(
    toDateKey(new Date(year, month - 1, new Date().getDate())),
  );
  const [cancelGameId, setCancelGameId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("Campo impraticável");
  const [cancelNote, setCancelNote] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [gameNotice, setGameNotice] = useState("");
  const [showExtendedOfficials, setShowExtendedOfficials] = useState(false);
  const [showVideoOfficials, setShowVideoOfficials] = useState(false);
  const showLegacyGameForm = false;
  const [selectedPitchSide, setSelectedPitchSide] = useState<"RED" | "WHITE">(
    "RED",
  );
  const [form, setForm] = useState({
    type: "INTERNAL" as GameType,
    gameMode: "INTERNAL_SPLIT" as GameMode,
    clubSide: "HOME" as "HOME" | "AWAY",
    homeClubId: "",
    awayClubId: "",
    homeTeamId: "",
    awayTeamId: "",
    competitionId: "",
    round: "",
    matchNumber: "",
    refereeName: "",
    assistantNames: "",
    assistantOneName: "",
    assistantTwoName: "",
    fourthOfficialName: "",
    reserveAssistantName: "",
    varName: "",
    avarName: "",
    delegateName: "",
    date: dateToInput(new Date()),
    fieldId: "",
    location: "Campo Ribeirão da Ilha",
    address: "",
    cityState: "",
    arrivalTime: "",
    durationMinutes: "90",
    predictedHomeScore: "",
    predictedAwayScore: "",
    championship: "",
    gameValueBRL: "0,00",
    redTeamName: DEFAULT_RED_UNIFORM_NAME,
    whiteTeamName: DEFAULT_WHITE_UNIFORM_NAME,
    redUniformKit: "",
    whiteUniformKit: "",
    redUniformColor: DEFAULT_RED_UNIFORM_COLOR,
    redUniformAccent: "#ffffff",
    redUniformStyle: "SOLID" as UniformStyle,
    whiteUniformColor: DEFAULT_WHITE_UNIFORM_COLOR,
    whiteUniformAccent: DEFAULT_RED_UNIFORM_COLOR,
    whiteUniformStyle: "SOLID" as UniformStyle,
    redScore: "",
    whiteScore: "",
    note: "",
  });
  const [lineupForm, setLineupForm] = useState({
    athleteId: "",
    jerseyNumber: "",
    side: "RED" as TeamSide,
    role: "STARTER" as LineupRole,
    shirtName: DEFAULT_RED_UNIFORM_NAME,
    presence: true,
  });
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [draftGuestForm, setDraftGuestForm] = useState({
    name: "",
    position: "CENTRAL_MIDFIELDER" as AthletePosition,
    rating: 3,
    details: "",
  });
  const [draftCaptains, setDraftCaptains] = useState<{
    RED: string;
    WHITE: string;
  }>({ RED: "", WHITE: "" });
  const [draft, setDraft] = useState<LineupDraft | null>(null);
  const [draftJerseyNumbers, setDraftJerseyNumbers] = useState<
    Record<string, string>
  >({});
  const [manualFormations, setManualFormations] = useState<{
    RED: PitchFormationKey | "AUTO";
    WHITE: PitchFormationKey | "AUTO";
  }>({
    RED: "AUTO",
    WHITE: "AUTO",
  });
  const [eventForm, setEventForm] = useState({
    athleteId: "",
    type: "GOAL" as GameEventType,
    minute: "",
    side: "RED" as TeamSide,
    note: "",
  });
  const [activePlan, setActivePlan] = useState<TacticalPlanKey>("A");
  const [tacticalPlans, setTacticalPlans] = useState<
    Record<TacticalPlanKey, TacticalPlanState>
  >(createDefaultTacticalPlans);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ year: String(historyYear) });
    if (!showWholeYear) {
      params.set("month", String(month));
    }
    if (typeFilter !== "ALL") {
      params.set("type", typeFilter);
    }
    return params.toString();
  }, [historyYear, month, showWholeYear, typeFilter]);

  const gamesQuery = useQuery({
    queryKey: ["sports-games", month, historyYear, showWholeYear, typeFilter],
    queryFn: () => apiRequest<Game[]>(`/sports/games?${queryString}`),
  });

  const athletesQuery = useQuery({
    queryKey: ["athletes", month, historyYear, "game-lineup"],
    queryFn: () =>
      apiRequest<AthleteProfile[]>(
        `/athletes?month=${month}&year=${historyYear}`,
      ),
  });

  const goalkeeperContractsQuery = useQuery({
    queryKey: ["goalkeeper-contracts", "game-lineup"],
    queryFn: () => apiRequest<GoalkeeperContract[]>("/goalkeepers/contracts"),
  });

  const groupSettingsQuery = useQuery({
    queryKey: ["group-settings", "games"],
    queryFn: () => apiRequest<GroupSettings>("/group/settings"),
  });

  const tenantBrandingQuery = useQuery({
    queryKey: ["tenant-branding"],
    queryFn: () => apiRequest<TenantBrandingSettings>("/tenant/branding"),
  });

  const clubsQuery = useQuery({
    queryKey: ["clubs", "game-form"],
    queryFn: () => apiRequest<Club[]>("/clubs"),
  });

  const gameFieldsQuery = useQuery({
    queryKey: ["sports-fields", "game-form"],
    queryFn: () => apiRequest<Field[]>("/sports/fields"),
  });

  const teamsQuery = useQuery({
    queryKey: ["teams", "game-form"],
    queryFn: () => apiRequest<Team[]>("/teams"),
  });

  const competitionsQuery = useQuery({
    queryKey: ["competitions", "game-form"],
    queryFn: () => apiRequest<Competition[]>("/competitions"),
  });

  const groupSettings: GroupSettings = useMemo(
    () =>
      groupSettingsQuery.data ?? {
        id: "fallback-group-settings",
        groupName: "GestaSports",
        organizationType: "ASSOCIACAO",
        foundedAt: null,
        foundationYear: null,
        documentNumber: null,
        phone: null,
        email: null,
        websiteUrl: null,
        address: null,
        addressNumber: null,
        neighborhood: null,
        city: null,
        state: null,
        postalCode: null,
        country: "Brasil",
        history: null,
        playersPerTeam: defaultPlayersPerTeam,
        closedMode: true,
        inviteCode: null,
        uniform1Name: DEFAULT_RED_UNIFORM_NAME,
        uniform1Season: null,
        uniform1Color: DEFAULT_RED_UNIFORM_COLOR,
        uniform1ImageUrl: null,
        uniform2Name: DEFAULT_WHITE_UNIFORM_NAME,
        uniform2Season: null,
        uniform2Color: DEFAULT_WHITE_UNIFORM_COLOR,
        uniform2ImageUrl: null,
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    [groupSettingsQuery.data],
  );
  const playersPerTeam =
    groupSettings.playersPerTeam === 7 ? 7 : defaultPlayersPerTeam;
  const minLinePlayersPerTeam = Math.max(1, playersPerTeam - 1);
  const minLinePlayersForDraft = minLinePlayersPerTeam * 2;
  const clubs = useMemo(
    () => (clubsQuery.data ?? []).filter(hasId),
    [clubsQuery.data],
  );
  const gameFields = useMemo(
    () => (gameFieldsQuery.data ?? []).filter(hasId),
    [gameFieldsQuery.data],
  );
  const teams = useMemo(
    () => (teamsQuery.data ?? []).filter(hasId),
    [teamsQuery.data],
  );
  const competitions = useMemo(
    () => (competitionsQuery.data ?? []).filter(hasId),
    [competitionsQuery.data],
  );
  const internalClubs = clubs.filter((club) => club.type === "INTERNAL");
  const externalClubs = clubs.filter((club) => club.type !== "INTERNAL");
  const homeClubOptions =
    form.clubSide === "HOME"
      ? internalClubs.length > 0
        ? internalClubs
        : clubs
      : externalClubs.length > 0
        ? externalClubs
        : clubs;
  const awayClubOptions =
    form.clubSide === "HOME"
      ? externalClubs.length > 0
        ? externalClubs
        : clubs
      : internalClubs.length > 0
        ? internalClubs
        : clubs;
  const homeTeamOptions = teams.filter(
    (team) => !form.homeClubId || team.clubId === form.homeClubId,
  );
  const awayTeamOptions = teams.filter(
    (team) => !form.awayClubId || team.clubId === form.awayClubId,
  );
  const isExternalGameForm = form.type === "EXTERNAL";
  const selectedField =
    gameFields.find((field) => field.id === form.fieldId) ?? null;

  function fieldDisplayName(field: Field) {
    const place = [field.city, field.state].filter(Boolean).join("/");
    return place ? `${field.name} - ${place}` : field.name;
  }

  function applyGameField(fieldId: string) {
    const field = gameFields.find((item) => item.id === fieldId);
    setForm((prev) => ({
      ...prev,
      fieldId,
      location: field ? field.name : prev.location,
      address: field?.address ?? prev.address,
      cityState: field
        ? [field.city, field.state].filter(Boolean).join(" / ")
        : prev.cityState,
      gameValueBRL:
        field && (!prev.gameValueBRL || prev.gameValueBRL === "0,00")
          ? String((field.defaultCostCents / 100).toFixed(2)).replace(".", ",")
          : prev.gameValueBRL,
    }));
  }

  function applyExternalClubSide(clubSide: "HOME" | "AWAY") {
    const internal =
      internalClubs[0] ??
      clubs.find((club) => club.type === "INTERNAL") ??
      clubs[0];
    const external =
      externalClubs[0] ??
      clubs.find((club) => club.type !== "INTERNAL") ??
      clubs[1] ??
      clubs[0];
    const nextHomeClubId =
      clubSide === "HOME" ? (internal?.id ?? "") : (external?.id ?? "");
    const nextAwayClubId =
      clubSide === "HOME" ? (external?.id ?? "") : (internal?.id ?? "");

    setForm((prev) => ({
      ...prev,
      clubSide,
      homeClubId: nextHomeClubId,
      awayClubId: nextAwayClubId,
      homeTeamId: "",
      awayTeamId: "",
    }));

    if (nextHomeClubId) {
      applyExternalSideIdentity("HOME", nextHomeClubId, "");
    }
    if (nextAwayClubId) {
      applyExternalSideIdentity("AWAY", nextAwayClubId, "");
    }
  }

  function shirtIdentityForSelection(clubId: string, teamId: string) {
    const team = teams.find((item) => item.id === teamId);
    const club = clubs.find((item) => item.id === (team?.clubId || clubId));

    return {
      name:
        team?.shirtName ||
        team?.name ||
        club?.shirtName ||
        club?.shortName ||
        club?.name ||
        "",
      color: team?.shirtColor || club?.shirtColor || "",
      imageUrl: team?.shirtImageUrl || club?.shirtImageUrl || null,
    };
  }

  function shirtIdentityForInternalSide(name: string, side: TeamSide) {
    const normalizedName = name.trim().toLowerCase();
    const internalTeamIds = new Set(internalClubs.map((club) => club.id));
    const sideAliases =
      side === "RED"
        ? ["time a", "camisa a", "uniforme 1", "uniforme a", " a"]
        : ["time b", "camisa b", "uniforme 2", "uniforme b", " b"];
    const matchingTeam = normalizedName
      ? teams.find(
          (team) =>
            internalTeamIds.has(team.clubId) &&
            [team.name, team.shirtName].some(
              (value) => value?.trim().toLowerCase() === normalizedName,
            ),
        )
      : null;
    const sideFallbackTeam = teams.find((team) => {
      const candidate = `${team.name} ${team.shirtName ?? ""}`
        .trim()
        .toLowerCase();
      return (
        internalTeamIds.has(team.clubId) &&
        sideAliases.some((alias) => candidate.includes(alias))
      );
    });
    const configuredInternalTeams = teams.filter(
      (team) =>
        internalTeamIds.has(team.clubId) &&
        (team.shirtImageUrl || team.shirtColor || team.shirtName),
    );
    const sideIndexFallbackTeam =
      configuredInternalTeams[side === "RED" ? 0 : 1] ??
      configuredInternalTeams[0];
    const team = matchingTeam ?? sideFallbackTeam ?? sideIndexFallbackTeam;
    const club =
      clubs.find((item) => item.id === team?.clubId) ??
      internalClubs[side === "RED" ? 0 : 1] ??
      internalClubs[0];

    return {
      name:
        team?.shirtName ||
        team?.name ||
        club?.shirtName ||
        club?.shortName ||
        club?.name ||
        "",
      color: team?.shirtColor || club?.shirtColor || "",
      imageUrl: team?.shirtImageUrl || club?.shirtImageUrl || null,
    };
  }

  function applyExternalSideIdentity(
    side: "HOME" | "AWAY",
    clubId: string,
    teamId = "",
  ) {
    const identity = shirtIdentityForSelection(clubId, teamId);
    const kit = parseTeamKit(
      identity.color ||
        (side === "HOME"
          ? groupSettings.uniform1Color
          : groupSettings.uniform2Color),
      side === "HOME" ? DEFAULT_RED_UNIFORM_COLOR : DEFAULT_WHITE_UNIFORM_COLOR,
    );

    setForm((prev) => ({
      ...prev,
      ...(side === "HOME"
        ? {
            homeClubId: clubId,
            homeTeamId: teamId,
            redTeamName: identity.name || prev.redTeamName,
            redUniformKit:
              identity.color ||
              encodeTeamKit(kit.primary, kit.accent, kit.style, kit),
            redUniformColor: kit.primary,
            redUniformAccent: kit.accent,
            redUniformStyle: kit.style,
          }
        : {
            awayClubId: clubId,
            awayTeamId: teamId,
            whiteTeamName: identity.name || prev.whiteTeamName,
            whiteUniformKit:
              identity.color ||
              encodeTeamKit(kit.primary, kit.accent, kit.style, kit),
            whiteUniformColor: kit.primary,
            whiteUniformAccent: kit.accent,
            whiteUniformStyle: kit.style,
          }),
    }));
  }

  useEffect(() => {
    if (!groupSettings || selectedGameId) {
      return;
    }

    const uniform1Kit = parseTeamKit(
      groupSettings.uniform1Color,
      DEFAULT_RED_UNIFORM_COLOR,
    );
    const uniform2Kit = parseTeamKit(
      groupSettings.uniform2Color,
      DEFAULT_WHITE_UNIFORM_COLOR,
    );
    const uniform1Color = uniform1Kit.primary;
    const uniform2Color = uniform2Kit.primary;

    setForm((prev) => ({
      ...prev,
      redTeamName:
        prev.redTeamName === DEFAULT_RED_UNIFORM_NAME
          ? groupSettings.uniform1Name
          : prev.redTeamName,
      whiteTeamName:
        prev.whiteTeamName === DEFAULT_WHITE_UNIFORM_NAME
          ? groupSettings.uniform2Name
          : prev.whiteTeamName,
      redUniformKit:
        prev.redUniformKit ||
        groupSettings.uniform1Color ||
        encodeTeamKit(
          uniform1Kit.primary,
          uniform1Kit.accent,
          uniform1Kit.style,
          uniform1Kit,
        ),
      whiteUniformKit:
        prev.whiteUniformKit ||
        groupSettings.uniform2Color ||
        encodeTeamKit(
          uniform2Kit.primary,
          uniform2Kit.accent,
          uniform2Kit.style,
          uniform2Kit,
        ),
      redUniformColor:
        prev.redUniformColor === DEFAULT_RED_UNIFORM_COLOR
          ? uniform1Color
          : prev.redUniformColor,
      redUniformAccent:
        prev.redUniformAccent === "#ffffff"
          ? uniform1Kit.accent
          : prev.redUniformAccent,
      redUniformStyle:
        prev.redUniformStyle === "SOLID"
          ? uniform1Kit.style
          : prev.redUniformStyle,
      whiteUniformColor:
        prev.whiteUniformColor === DEFAULT_WHITE_UNIFORM_COLOR
          ? uniform2Color
          : prev.whiteUniformColor,
      whiteUniformAccent:
        prev.whiteUniformAccent === DEFAULT_RED_UNIFORM_COLOR
          ? uniform2Kit.accent
          : prev.whiteUniformAccent,
      whiteUniformStyle:
        prev.whiteUniformStyle === "SOLID"
          ? uniform2Kit.style
          : prev.whiteUniformStyle,
    }));

    setLineupForm((prev) => ({
      ...prev,
      shirtName:
        prev.shirtName === DEFAULT_RED_UNIFORM_NAME
          ? groupSettings.uniform1Name
          : prev.shirtName,
    }));
  }, [groupSettings, selectedGameId]);

  const saveGameMutation = useMutation({
    mutationFn: async (options?: {
      nextStep?: GameSubView;
      notice?: string;
    }) => {
      void options;
      const gameId = selectedGameId;
      const homeIdentity = shirtIdentityForSelection(
        form.homeClubId,
        form.homeTeamId,
      );
      const awayIdentity = shirtIdentityForSelection(
        form.awayClubId,
        form.awayTeamId,
      );
      const redInternalIdentity = shirtIdentityForInternalSide(
        form.redTeamName,
        "RED",
      );
      const whiteInternalIdentity = shirtIdentityForInternalSide(
        form.whiteTeamName,
        "WHITE",
      );
      const homeClub = clubs.find((club) => club.id === form.homeClubId);
      const awayClub = clubs.find((club) => club.id === form.awayClubId);
      const nextRedTeamName = form.redTeamName.trim();
      const nextWhiteTeamName = form.whiteTeamName.trim();
      const internalCrestUrl =
        tenantBrandingQuery.data?.logoUrl ??
        clubs.find((club) => club.type === "INTERNAL" && club.logoUrl)
          ?.logoUrl ??
        null;
      const structuredAssistantNames = [
        form.assistantOneName,
        form.assistantTwoName,
      ]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" / ");
      const created = await apiRequest<Game>(
        gameId ? `/sports/games/${gameId}` : "/sports/games",
        {
          method: gameId ? "PATCH" : "POST",
          body: JSON.stringify({
            type: form.type,
            gameMode:
              form.type === "EXTERNAL" ? form.gameMode : "INTERNAL_SPLIT",
            homeClubId:
              form.type === "EXTERNAL"
                ? form.homeClubId || undefined
                : undefined,
            awayClubId:
              form.type === "EXTERNAL"
                ? form.awayClubId || undefined
                : undefined,
            fieldId: form.fieldId || undefined,
            homeTeamId:
              form.type === "EXTERNAL"
                ? form.homeTeamId || undefined
                : undefined,
            awayTeamId:
              form.type === "EXTERNAL"
                ? form.awayTeamId || undefined
                : undefined,
            competitionId: form.competitionId || undefined,
            round: form.round || undefined,
            matchNumber: form.matchNumber
              ? Number(form.matchNumber)
              : undefined,
            isOfficial:
              form.type === "EXTERNAL" &&
              (form.gameMode === "CHAMPIONSHIP" ||
                form.gameMode === "TOURNAMENT"),
            refereeName: form.refereeName || undefined,
            assistantNames:
              structuredAssistantNames || form.assistantNames || undefined,
            assistantOneName: form.assistantOneName || undefined,
            assistantTwoName: form.assistantTwoName || undefined,
            fourthOfficialName: form.fourthOfficialName || undefined,
            reserveAssistantName: form.reserveAssistantName || undefined,
            varName: form.varName || undefined,
            avarName: form.avarName || undefined,
            delegateName: form.delegateName || undefined,
            date: new Date(form.date).toISOString(),
            location: form.location,
            championship: form.championship || undefined,
            note: form.note || undefined,
            gameValueCents: toCents(form.gameValueBRL) || 0,
            redTeamName:
              nextRedTeamName || groupSettings.uniform1Name || undefined,
            whiteTeamName:
              nextWhiteTeamName || groupSettings.uniform2Name || undefined,
            redUniformColor:
              form.type === "INTERNAL"
                ? firstFilledText(
                    groupSettings.uniform1Color,
                    redInternalIdentity.color,
                    form.redUniformKit,
                    encodeTeamKit(
                      form.redUniformColor,
                      form.redUniformAccent,
                      form.redUniformStyle,
                    ),
                  ) || undefined
                : form.redUniformKit ||
                  encodeTeamKit(
                    form.redUniformColor,
                    form.redUniformAccent,
                    form.redUniformStyle,
                  ),
            whiteUniformColor:
              form.type === "INTERNAL"
                ? firstFilledText(
                    groupSettings.uniform2Color,
                    whiteInternalIdentity.color,
                    form.whiteUniformKit,
                    encodeTeamKit(
                      form.whiteUniformColor,
                      form.whiteUniformAccent,
                      form.whiteUniformStyle,
                    ),
                  ) || undefined
                : form.whiteUniformKit ||
                  encodeTeamKit(
                    form.whiteUniformColor,
                    form.whiteUniformAccent,
                    form.whiteUniformStyle,
                  ),
            redUniformImageUrl:
              form.type === "EXTERNAL"
                ? homeIdentity.imageUrl || undefined
                : firstFilledText(
                    groupSettings.uniform1ImageUrl,
                    redInternalIdentity.imageUrl,
                  ) || undefined,
            whiteUniformImageUrl:
              form.type === "EXTERNAL"
                ? awayIdentity.imageUrl || undefined
                : firstFilledText(
                    groupSettings.uniform2ImageUrl,
                    whiteInternalIdentity.imageUrl,
                  ) || undefined,
            redCrestUrl:
              form.type === "EXTERNAL"
                ? homeClub?.logoUrl || internalCrestUrl || undefined
                : internalCrestUrl || undefined,
            whiteCrestUrl:
              form.type === "EXTERNAL"
                ? awayClub?.logoUrl || undefined
                : internalCrestUrl || undefined,
          }),
        },
      );

      const resultTargetId = gameId ?? created.id;

      if (form.redScore !== "" && form.whiteScore !== "" && resultTargetId) {
        return apiRequest<Game>(`/sports/games/${resultTargetId}/result`, {
          method: "PATCH",
          body: JSON.stringify({
            redScore: Number(form.redScore),
            whiteScore: Number(form.whiteScore),
          }),
        });
      }

      return created;
    },
    onSuccess: (saved, options) => {
      setSelectedGameId(saved.id);
      setForm((prev) => ({
        ...prev,
        championship: "",
        note: "",
        redScore: "",
        whiteScore: "",
      }));
      setGameNotice(
        options?.notice ?? "Jogo registrado. Próxima etapa: agenda.",
      );
      goToGameStep(options?.nextStep ?? "AGENDA", saved);
      void invalidateLineupQueries(queryClient);
    },
  });

  const lineupMutation = useMutation({
    mutationFn: () => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo.");
      }
      const selectedAthlete = athletes.find(
        (athlete) => athlete.id === lineupForm.athleteId,
      );
      if (
        selectedAthlete &&
        isGoalkeeperAthlete(selectedAthlete) &&
        lineupForm.role === "STARTER"
      ) {
        throw new Error(
          `${selectedAthlete.name} é goleiro e só pode entrar como goleiro ou reserva.`,
        );
      }
      if (
        selectedAthlete &&
        !isGoalkeeperAthlete(selectedAthlete) &&
        lineupForm.role === "GOALKEEPER"
      ) {
        throw new Error(
          `${selectedAthlete.name} é jogador de linha e não pode entrar como goleiro.`,
        );
      }
      const jerseyNumber =
        lineupForm.jerseyNumber.trim() === ""
          ? null
          : Number(lineupForm.jerseyNumber);
      const duplicateJersey =
        jerseyNumber !== null
          ? (selectedGame.lineups ?? [])
              .filter(hasLineupAthlete)
              .find(
                (lineup) =>
                  lineup.side === lineupForm.side &&
                  lineup.role !== "ABSENT" &&
                  lineup.jerseyNumber === jerseyNumber &&
                  lineup.athleteId !== lineupForm.athleteId,
              )
          : null;

      if (duplicateJersey) {
        throw new Error(
          `Camisa #${jerseyNumber} já está em uso neste time por ${duplicateJersey.athlete?.name ?? "outro atleta"}.`,
        );
      }

      return apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
        method: "POST",
        body: JSON.stringify({
          athleteId: lineupForm.athleteId,
          side: lineupForm.side,
          role: lineupForm.role,
          presence: lineupForm.presence,
          jerseyNumber,
          ...(lineupForm.shirtName ? { shirtName: lineupForm.shirtName } : {}),
        }),
      });
    },
    onSuccess: () => {
      setSelectedPlayerIds((current) =>
        current.includes(lineupForm.athleteId)
          ? current
          : [...current, lineupForm.athleteId],
      );
      setLineupForm((prev) => ({ ...prev, athleteId: "", jerseyNumber: "" }));
      void invalidateLineupQueries(queryClient);
    },
  });

  const quickJerseyNumberMutation = useMutation({
    mutationFn: ({
      lineup,
      jerseyNumber,
    }: {
      lineup: GameLineup;
      jerseyNumber: number | null;
    }) => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo.");
      }
      const duplicateJersey =
        jerseyNumber !== null
          ? (selectedGame.lineups ?? [])
              .filter(hasLineupAthlete)
              .find(
                (item) =>
                  item.side === lineup.side &&
                  item.role !== "ABSENT" &&
                  item.jerseyNumber === jerseyNumber &&
                  item.athleteId !== lineup.athleteId,
              )
          : null;

      if (duplicateJersey) {
        throw new Error(
          `Camisa #${jerseyNumber} já está em uso neste time por ${duplicateJersey.athlete?.name ?? "outro atleta"}.`,
        );
      }

      return apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
        method: "POST",
        body: JSON.stringify({
          athleteId: lineup.athleteId,
          side: lineup.side,
          role: lineup.role,
          presence: lineup.presence,
          jerseyNumber,
          ...(lineup.tacticalSlot ? { tacticalSlot: lineup.tacticalSlot } : {}),
          ...(lineup.shirtName ? { shirtName: lineup.shirtName } : {}),
        }),
      });
    },
    onSuccess: () => {
      void invalidateLineupQueries(queryClient);
    },
  });

  const goalkeeperPresenceMutation = useMutation({
    mutationFn: (input: { lineup: GameLineup; presence: boolean }) => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo.");
      }

      return apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
        method: "POST",
        body: JSON.stringify({
          athleteId: input.lineup.athleteId,
          side: input.lineup.side,
          role: "GOALKEEPER",
          presence: input.presence,
          ...(input.lineup.jerseyNumber
            ? { jerseyNumber: input.lineup.jerseyNumber }
            : {}),
          ...(input.lineup.tacticalSlot
            ? { tacticalSlot: input.lineup.tacticalSlot }
            : {}),
          ...(input.lineup.shirtName
            ? { shirtName: input.lineup.shirtName }
            : {}),
        }),
      });
    },
    onSuccess: () => {
      void invalidateLineupQueries(queryClient);
    },
  });

  function buildDraftJerseyNumberMap(generated: LineupDraft) {
    const nextNumbers = new Map<string, number>();

    const assignTeam = (
      starters: AthleteProfile[],
      bench: AthleteProfile[] = [],
    ) => {
      const usedNumbers = new Set<number>();
      const allPlayers = [...starters, ...bench];

      for (const athlete of allPlayers) {
        const savedNumber = selectedGameLineupByAthleteId.get(
          athlete.id,
        )?.jerseyNumber;
        if (
          savedNumber !== null &&
          savedNumber !== undefined &&
          !usedNumbers.has(savedNumber)
        ) {
          nextNumbers.set(athlete.id, savedNumber);
          usedNumbers.add(savedNumber);
        }
      }

      const nextAvailable = (startAt: number) => {
        let candidate = startAt;
        while (usedNumbers.has(candidate)) {
          candidate += 1;
        }
        usedNumbers.add(candidate);
        return candidate;
      };

      starters.forEach((athlete, index) => {
        if (!nextNumbers.has(athlete.id)) {
          nextNumbers.set(athlete.id, nextAvailable(index + 1));
        }
      });

      bench.forEach((athlete, index) => {
        if (!nextNumbers.has(athlete.id)) {
          nextNumbers.set(athlete.id, nextAvailable(12 + index));
        }
      });
    };

    assignTeam(sortAthletesForPitch(generated.red), generated.redBench ?? []);
    assignTeam(
      sortAthletesForPitch(generated.white),
      generated.whiteBench ?? [],
    );
    return nextNumbers;
  }

  function draftFromAttempt(attempt: LineupDraftAttempt): LineupDraft {
    return {
      red: attempt.redSnapshot ?? [],
      white: attempt.whiteSnapshot ?? [],
      redBench: attempt.redBenchSnapshot ?? [],
      whiteBench: attempt.whiteBenchSnapshot ?? [],
      blocked: attempt.blockedSnapshot ?? [],
      attemptNumber: attempt.attemptNumber,
      notes: attempt.notes ?? [],
      totals: attempt.totals,
    };
  }

  function selectDraftAttempt(attempt: LineupDraftAttempt) {
    const selectedDraft = draftFromAttempt(attempt);
    setDraft(selectedDraft);
    setDraftJerseyNumbers(
      Object.fromEntries(
        Array.from(buildDraftJerseyNumberMap(selectedDraft)).map(
          ([athleteId, number]) => [athleteId, String(number)],
        ),
      ),
    );
    setGameNotice(
      `Tentativa ${attempt.attemptNumber} selecionada. Confira o campo e aplique no jogo.`,
    );
  }

  const draftMutation = useMutation({
    mutationFn: () => {
      if (!canDraftSelectedRoster) {
        throw new Error(
          `Faltam atletas para sortear: ${selectedLinePlayers}/${minLinePlayersForDraft} linha.`,
        );
      }

      return apiRequest<LineupDraft>("/athletes/lineup-draft", {
        method: "POST",
        body: JSON.stringify({
          month,
          year: historyYear,
          gameId: selectedGame.id,
          athleteIds: effectiveDraftCandidateIds,
          captainRedId: draftCaptains.RED || undefined,
          captainWhiteId: draftCaptains.WHITE || undefined,
          playersPerTeam,
          includeDelinquent: true,
        }),
      });
    },
    onSuccess: (generated) => {
      setDraft(generated);
      setDraftJerseyNumbers(
        Object.fromEntries(
          Array.from(buildDraftJerseyNumberMap(generated)).map(
            ([athleteId, number]) => [athleteId, String(number)],
          ),
        ),
      );
      setGameNotice(
        "Sorteio gerado como prévia. Confira o campo e clique em Aplicar no jogo para gravar.",
      );
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
    },
  });

  const applyDraftMutation = useMutation({
    mutationFn: async (input?: {
      selectedDraft?: LineupDraft;
      jerseyNumbers?: Record<string, string>;
    }) => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo.");
      }

      const generated = input?.selectedDraft ?? draft;

      if (!generated) {
        throw new Error("Faça o sorteio antes de aplicar no jogo.");
      }

      if (
        (generated.red ?? []).length !== playersPerTeam ||
        (generated.white ?? []).length !== playersPerTeam
      ) {
        throw new Error(
          `Para aplicar e registrar o jogo, cada lado precisa ter ${playersPerTeam} atletas em campo. Atual: Time A ${(generated.red ?? []).length}/${playersPerTeam}, Time B ${(generated.white ?? []).length}/${playersPerTeam}.`,
        );
      }

      const jerseyNumbers = input?.jerseyNumbers ?? draftJerseyNumbers;

      const redDraftStarters = sortAthletesForPitch(generated.red);
      const whiteDraftStarters = sortAthletesForPitch(generated.white);

      const entries = [
        ...redDraftStarters.map((athlete, index) => ({
          athlete,
          side: "RED" as TeamSide,
          shirtName: defaultRedUniformName,
          role:
            index === 0 || athlete.position === "GOALKEEPER"
              ? ("GOALKEEPER" as LineupRole)
              : ("STARTER" as LineupRole),
          tacticalSlot: index + 1,
        })),
        ...(generated.redBench ?? []).map((athlete) => ({
          athlete,
          side: "RED" as TeamSide,
          shirtName: defaultRedUniformName,
          role: "RESERVE" as LineupRole,
          tacticalSlot: undefined,
        })),
        ...whiteDraftStarters.map((athlete, index) => ({
          athlete,
          side: "WHITE" as TeamSide,
          shirtName: defaultWhiteUniformName,
          role:
            index === 0 || athlete.position === "GOALKEEPER"
              ? ("GOALKEEPER" as LineupRole)
              : ("STARTER" as LineupRole),
          tacticalSlot: index + 1,
        })),
        ...(generated.whiteBench ?? []).map((athlete) => ({
          athlete,
          side: "WHITE" as TeamSide,
          shirtName: defaultWhiteUniformName,
          role: "RESERVE" as LineupRole,
          tacticalSlot: undefined,
        })),
      ];

      await Promise.all(
        selectedGameLineups.map((lineup) =>
          apiRequest<void>(
            `/sports/games/${selectedGame.id}/lineups/${lineup.id}`,
            {
              method: "DELETE",
            },
          ),
        ),
      );

      await Promise.all(
        entries.map((entry) =>
          apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
            method: "POST",
            body: JSON.stringify({
              athleteId: entry.athlete.id,
              side: entry.side,
              role: entry.role,
              presence: true,
              ...((jerseyNumbers[entry.athlete.id] ?? "").trim()
                ? { jerseyNumber: Number(jerseyNumbers[entry.athlete.id]) }
                : {}),
              ...(entry.tacticalSlot
                ? { tacticalSlot: entry.tacticalSlot }
                : {}),
              shirtName: entry.shirtName,
            }),
          }),
        ),
      );

      const updatedGames = await apiRequest<Game[]>(
        `/sports/games?year=${historyYear}`,
      );
      const updatedGame =
        updatedGames.find((game) => game.id === selectedGame.id) ??
        selectedGame;
      queryClient.setQueryData(
        ["sports-games", month, historyYear, showWholeYear, typeFilter],
        updatedGames,
      );
      queryClient.setQueryData(
        ["sports-games", historyYear, "participation"],
        updatedGames,
      );

      return { generated, updatedGame };
    },
    onSuccess: async ({ generated, updatedGame }) => {
      const generatedIds = [
        ...generated.red,
        ...(generated.redBench ?? []),
        ...generated.white,
        ...(generated.whiteBench ?? []),
      ].map((athlete) => athlete.id);
      setSelectedPlayerIds(generatedIds);
      setDraft(generated);
      setDraftJerseyNumbers(
        Object.fromEntries(
          Array.from(buildDraftJerseyNumberMap(generated)).map(
            ([athleteId, number]) => [athleteId, String(number)],
          ),
        ),
      );
      setGameNotice(
        `Escalação salva a partir da tentativa ${generated.attemptNumber ?? "selecionada"}. Próxima etapa: súmula.`,
      );
      await invalidateLineupQueries(queryClient);
      goToGameStep("EVENTOS", updatedGame);
    },
  });

  const confirmAndApplyDraftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo para sortear.");
      }

      if (!canDraftSelectedRoster) {
        throw new Error(
          `Faltam atletas para sortear: ${selectedLinePlayers}/${minLinePlayersForDraft} linha.`,
        );
      }

      if (!hasValidDraftCaptains) {
        throw new Error(
          "Selecione dois capitães diferentes ou deixe os dois campos vazios.",
        );
      }

      if (hasReachedDraftLimit) {
        throw new Error("Limite de sorteios atingido para este jogo.");
      }

      const generated = await apiRequest<LineupDraft>(
        "/athletes/lineup-draft",
        {
          method: "POST",
          body: JSON.stringify({
            month,
            year: historyYear,
            gameId: selectedGame.id,
            athleteIds: effectiveDraftCandidateIds,
            captainRedId: draftCaptains.RED || undefined,
            captainWhiteId: draftCaptains.WHITE || undefined,
            playersPerTeam,
            includeDelinquent: true,
          }),
        },
      );

      const numberByAthleteId = buildDraftJerseyNumberMap(generated);

      if (
        (generated.red ?? []).length !== playersPerTeam ||
        (generated.white ?? []).length !== playersPerTeam
      ) {
        throw new Error(
          `Para aplicar e registrar o jogo, cada lado precisa ter ${playersPerTeam} atletas em campo. Atual: Time A ${(generated.red ?? []).length}/${playersPerTeam}, Time B ${(generated.white ?? []).length}/${playersPerTeam}.`,
        );
      }

      const redDraftStarters = sortAthletesForPitch(generated.red);
      const whiteDraftStarters = sortAthletesForPitch(generated.white);
      const entries = [
        ...redDraftStarters.map((athlete, index) => ({
          athlete,
          side: "RED" as TeamSide,
          shirtName: defaultRedUniformName,
          role:
            index === 0 || athlete.position === "GOALKEEPER"
              ? ("GOALKEEPER" as LineupRole)
              : ("STARTER" as LineupRole),
          tacticalSlot: index + 1,
        })),
        ...(generated.redBench ?? []).map((athlete) => ({
          athlete,
          side: "RED" as TeamSide,
          shirtName: defaultRedUniformName,
          role: "RESERVE" as LineupRole,
          tacticalSlot: undefined,
        })),
        ...whiteDraftStarters.map((athlete, index) => ({
          athlete,
          side: "WHITE" as TeamSide,
          shirtName: defaultWhiteUniformName,
          role:
            index === 0 || athlete.position === "GOALKEEPER"
              ? ("GOALKEEPER" as LineupRole)
              : ("STARTER" as LineupRole),
          tacticalSlot: index + 1,
        })),
        ...(generated.whiteBench ?? []).map((athlete) => ({
          athlete,
          side: "WHITE" as TeamSide,
          shirtName: defaultWhiteUniformName,
          role: "RESERVE" as LineupRole,
          tacticalSlot: undefined,
        })),
      ];
      const blockedEntries = entries
        .map((entry) => ({
          athlete: entry.athlete,
          reason: lineupBlockReason(entry.athlete),
        }))
        .filter((entry): entry is { athlete: AthleteProfile; reason: string } =>
          Boolean(entry.reason),
        );

      if (blockedEntries.length > 0) {
        throw new Error(
          `Remova da lista para continuar o sorteio: ${blockedEntries
            .map((entry) => `${entry.athlete.name} (${entry.reason})`)
            .join(", ")}.`,
        );
      }

      await Promise.all(
        selectedGameLineups.map((lineup) =>
          apiRequest<void>(
            `/sports/games/${selectedGame.id}/lineups/${lineup.id}`,
            {
              method: "DELETE",
            },
          ),
        ),
      );

      await Promise.all(
        entries.map((entry) =>
          apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
            method: "POST",
            body: JSON.stringify({
              athleteId: entry.athlete.id,
              side: entry.side,
              role: entry.role,
              presence: true,
              jerseyNumber:
                numberByAthleteId.get(entry.athlete.id) ?? undefined,
              ...(entry.tacticalSlot
                ? { tacticalSlot: entry.tacticalSlot }
                : {}),
              shirtName: entry.shirtName,
            }),
          }),
        ),
      );

      return generated;
    },
    onSuccess: (generated) => {
      const generatedIds = [
        ...generated.red,
        ...(generated.redBench ?? []),
        ...generated.white,
        ...(generated.whiteBench ?? []),
      ].map((athlete) => athlete.id);
      setSelectedPlayerIds(generatedIds);
      setDraft(generated);
      setGameNotice("Atletas sorteados e distribuídos nos times.");
      void invalidateLineupQueries(queryClient);
      goToGameStep("ESCALACAO", selectedGame);
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/sports/games/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      setSelectedGameId(null);
      setGameNotice("Jogo cancelado.");
      void invalidateLineupQueries(queryClient);
    },
  });

  const deleteLineupMutation = useMutation({
    mutationFn: ({ gameId, lineupId }: { gameId: string; lineupId: string }) =>
      apiRequest<void>(`/sports/games/${gameId}/lineups/${lineupId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void invalidateLineupQueries(queryClient);
    },
  });

  const saveConfirmationSelectionMutation = useMutation({
    mutationFn: async (selectionIds?: string[]) => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo para salvar a seleção.");
      }

      const selectedSet = new Set(selectionIds ?? selectedPlayerIds);
      const selectedAthletes = athletes.filter(
        (athlete) =>
          selectedSet.has(athlete.id) && isLineupFieldAthlete(athlete),
      );

      if (selectedAthletes.length === 0) {
        throw new Error("Selecione pelo menos um atleta apto para salvar.");
      }

      const selectedGameLineupByAthlete = new Map(
        selectedGameLineups.map((lineup) => [lineup.athleteId, lineup]),
      );
      const pendingLineupsToRemove = selectedGameLineups.filter(
        (lineup) =>
          lineup.role !== "ABSENT" &&
          !lineup.confirmedAt &&
          !selectedSet.has(lineup.athleteId),
      );

      await Promise.all([
        ...pendingLineupsToRemove.map((lineup) =>
          apiRequest<void>(
            `/sports/games/${selectedGame.id}/lineups/${lineup.id}`,
            {
              method: "DELETE",
            },
          ),
        ),
        ...selectedAthletes.map((athlete, index) => {
          const currentLineup = selectedGameLineupByAthlete.get(athlete.id);
          const side =
            currentLineup?.side ?? (index % 2 === 0 ? "RED" : "WHITE");

          return apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
            method: "POST",
            body: JSON.stringify({
              athleteId: athlete.id,
              side,
              role:
                currentLineup && currentLineup.role !== "ABSENT"
                  ? currentLineup.role
                  : "RESERVE",
              presence: true,
              ...(currentLineup?.jerseyNumber !== undefined
                ? { jerseyNumber: currentLineup.jerseyNumber }
                : {}),
              ...(currentLineup?.tacticalSlot !== undefined
                ? { tacticalSlot: currentLineup.tacticalSlot }
                : {}),
              shirtName:
                currentLineup?.shirtName ??
                (side === "RED"
                  ? defaultRedUniformName
                  : defaultWhiteUniformName),
            }),
          });
        }),
      ]);

      return selectedAthletes.length;
    },
    onSuccess: async (savedCount) => {
      setGameNotice(`${savedCount} atleta(s) salvo(s) para este jogo.`);
      await invalidateLineupQueries(queryClient);
    },
  });

  const addDraftGuestMutation = useMutation({
    mutationFn: async () => {
      const name = draftGuestForm.name.trim();
      if (name.length < 2) {
        throw new Error("Informe o nome do convidado.");
      }

      return apiRequest<AthleteProfile>("/athletes", {
        method: "POST",
        body: JSON.stringify({
          name,
          position: draftGuestForm.position,
          linkType: "GUEST",
          status: "ACTIVE",
          rating: draftGuestForm.rating,
          sportsNote: draftGuestForm.details.trim() || undefined,
          guestBillingEnabled: false,
          guestFeeCents: 0,
        }),
      });
    },
    onSuccess: (guest) => {
      setSelectedPlayerIds((current) =>
        current.includes(guest.id) ? current : [...current, guest.id],
      );
      setDraftGuestForm({
        name: "",
        position: "CENTRAL_MIDFIELDER",
        rating: 3,
        details: "",
      });
      setGameNotice(`${guest.name} adicionado ao sorteio como convidado.`);
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
  });

  const saveEventMutation = useMutation({
    mutationFn: () => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo.");
      }

      return apiRequest(`/sports/games/${selectedGame.id}/events`, {
        method: "POST",
        body: JSON.stringify({
          events: [
            {
              athleteId: eventForm.athleteId,
              type: eventForm.type,
              side: eventForm.side,
              ...(eventForm.minute ? { minute: Number(eventForm.minute) } : {}),
              ...(eventForm.note ? { note: eventForm.note } : {}),
            },
          ],
        }),
      });
    },
    onSuccess: () => {
      setEventForm((prev) => ({
        ...prev,
        athleteId: "",
        minute: "",
        note: "",
      }));
      void invalidateLineupQueries(queryClient);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: ({ gameId, eventId }: { gameId: string; eventId: string }) =>
      apiRequest<void>(`/sports/games/${gameId}/events/${eventId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void invalidateLineupQueries(queryClient);
    },
  });

  const applyTacticalPlanMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo.");
      }

      const tacticalAthletes = [
        ...(tacticalRows.goalkeeper ? [tacticalRows.goalkeeper] : []),
        ...tacticalRows.rows
          .flat()
          .filter((athlete): athlete is TacticalAthlete => athlete !== null),
      ];

      const uniqueAthletes = Array.from(
        new Map(
          tacticalAthletes.map((athlete) => [athlete.id, athlete]),
        ).values(),
      );

      const redLineups = selectedGameLineups.filter(
        (lineup) => lineup.side === "RED",
      );
      await Promise.all(
        redLineups.map((lineup) =>
          apiRequest<void>(
            `/sports/games/${selectedGame.id}/lineups/${lineup.id}`,
            { method: "DELETE" },
          ),
        ),
      );

      await Promise.all(
        uniqueAthletes.map((athlete, index) =>
          apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
            method: "POST",
            body: JSON.stringify({
              athleteId: athlete.id,
              side: "RED",
              role:
                athlete.position === "GOALKEEPER" || index === 0
                  ? "GOALKEEPER"
                  : "STARTER",
              presence: true,
              shirtName: defaultRedUniformName,
            }),
          }),
        ),
      );

      return uniqueAthletes;
    },
    onSuccess: (appliedAthletes) => {
      setSelectedPlayerIds((current) => {
        const merged = new Set(current);
        for (const athlete of appliedAthletes) {
          merged.add(athlete.id);
        }
        return Array.from(merged);
      });
      void invalidateLineupQueries(queryClient);
    },
  });

  const saveTacticalPlansMutation = useMutation({
    mutationFn: () => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo.");
      }

      return apiRequest(`/sports/games/${selectedGame.id}/tactical-plans`, {
        method: "PATCH",
        body: JSON.stringify(tacticalPlans),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
    },
  });

  const saveGameFormationMutation = useMutation({
    mutationFn: ({
      side,
      formation,
    }: {
      side: "RED" | "WHITE";
      formation: PitchFormationKey | "AUTO";
    }) => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo.");
      }

      return apiRequest(`/sports/games/${selectedGame.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          [side === "RED" ? "redFormation" : "whiteFormation"]:
            formation === "AUTO" ? null : formation,
        }),
      });
    },
    onSuccess: () => {
      invalidateLineupQueries(queryClient);
      void queryClient.invalidateQueries({ queryKey: ["sports-games"] });
      void queryClient.invalidateQueries({
        queryKey: ["dashboard-tactical-games"],
      });
    },
  });

  const notifyGameMutation = useMutation({
    mutationFn: () => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo.");
      }

      return apiRequest<GameNotifyResponse>(
        `/sports/games/${selectedGame.id}/notify`,
        {
          method: "POST",
          body: JSON.stringify({
            channels: {
              email: true,
              whatsapp: true,
            },
          }),
        },
      );
    },
  });

  const games = useMemo(
    () => (gamesQuery.data ?? []).filter(hasId),
    [gamesQuery.data],
  );
  const athletes = useMemo(
    () => (athletesQuery.data ?? []).filter(hasId),
    [athletesQuery.data],
  );
  const goalkeeperContracts = useMemo(
    () => (goalkeeperContractsQuery.data ?? []).filter(hasId),
    [goalkeeperContractsQuery.data],
  );
  const activeGoalkeeperContracts = goalkeeperContracts.filter(
    (contract) => contract.active,
  );
  const activeGoalkeeperContractAthleteIds = activeGoalkeeperContracts
    .map((contract) => contract.athleteId)
    .filter((athleteId): athleteId is string => Boolean(athleteId));
  const activeGoalkeeperContractAthleteKey =
    activeGoalkeeperContractAthleteIds.join("|");
  useEffect(() => {
    if (activeGoalkeeperContractAthleteKey) {
      void queryClient.invalidateQueries({ queryKey: ["athletes"] });
    }
  }, [activeGoalkeeperContractAthleteKey, queryClient]);
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? null;
  const listedGames = useMemo(() => {
    const searchTerm = gameSearch.trim().toLowerCase();
    return [...games]
      .filter(
        (game) =>
          gameStatusFilter === "ALL" || game.status === gameStatusFilter,
      )
      .filter((game) => {
        if (!searchTerm) {
          return true;
        }
        const searchable = [
          game.location,
          game.championship,
          game.round,
          game.note,
          game.redTeamName,
          game.whiteTeamName,
          game.homeClub?.name,
          game.awayClub?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(searchTerm);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [gameSearch, gameStatusFilter, games]);
  function loadOfficialsFromGame(game: Game) {
    setShowExtendedOfficials(
      Boolean(
        game.fourthOfficialName ||
        game.reserveAssistantName ||
        game.delegateName,
      ),
    );
    setShowVideoOfficials(Boolean(game.varName || game.avarName));
    setForm((prev) => ({
      ...prev,
      refereeName: game.refereeName ?? "",
      assistantNames: game.assistantNames ?? "",
      assistantOneName: game.assistantOneName ?? "",
      assistantTwoName: game.assistantTwoName ?? "",
      fourthOfficialName: game.fourthOfficialName ?? "",
      reserveAssistantName: game.reserveAssistantName ?? "",
      varName: game.varName ?? "",
      avarName: game.avarName ?? "",
      delegateName: game.delegateName ?? "",
    }));
  }

  const saveOfficialsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGame) {
        throw new Error("Selecione um jogo para cadastrar a arbitragem.");
      }
      const structuredAssistantNames = [
        form.assistantOneName,
        form.assistantTwoName,
      ]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" / ");
      return apiRequest<Game>(`/sports/games/${selectedGame.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          refereeName: form.refereeName,
          assistantNames: structuredAssistantNames || form.assistantNames,
          assistantOneName: form.assistantOneName,
          assistantTwoName: form.assistantTwoName,
          fourthOfficialName: form.fourthOfficialName,
          reserveAssistantName: form.reserveAssistantName,
          varName: form.varName,
          avarName: form.avarName,
          delegateName: form.delegateName,
        }),
      });
    },
    onSuccess: (saved) => {
      setSelectedGameId(saved.id);
      loadOfficialsFromGame(saved);
      setGameNotice("Arbitragem salva. Próxima etapa: confirmações.");
      goToGameStep("CONFIRMACOES", saved);
      void invalidateLineupQueries(queryClient);
    },
  });

  useEffect(() => {
    if (!selectedGame) {
      setManualFormations({ RED: "AUTO", WHITE: "AUTO" });
      return;
    }

    setManualFormations({
      RED: persistedPitchFormation(selectedGame.redFormation),
      WHITE: persistedPitchFormation(selectedGame.whiteFormation),
    });
  }, [selectedGame]);

  useEffect(() => {
    if (currentGamesSubView !== "ARBITRAGEM" || !selectedGame) {
      return;
    }

    loadOfficialsFromGame(selectedGame);
  }, [currentGamesSubView, selectedGame]);

  const selectedGameDraftHistory = selectedGame?.draftHistory ?? [];
  const selectedGameLineups = (selectedGame?.lineups ?? []).filter(
    hasLineupAthlete,
  );
  const selectedGameLineupByAthleteId = new Map(
    selectedGameLineups.map((lineup) => [lineup.athleteId, lineup]),
  );
  const selectedGameEvents = selectedGame?.events ?? [];
  const cancelGame = games.find((game) => game.id === cancelGameId) ?? null;

  useEffect(() => {
    if (
      !games.length ||
      ![
        "ARBITRAGEM",
        "CONFIRMACOES",
        "ESCALACAO",
        "TACTICA",
        "EVENTOS",
      ].includes(currentGamesSubView)
    ) {
      return;
    }

    if (selectedGameId && games.some((game) => game.id === selectedGameId)) {
      return;
    }

    const now = Date.now();
    const nextGame =
      games.find((game) => new Date(game.date).getTime() >= now) ?? games[0];
    setSelectedGameId(nextGame.id);
  }, [currentGamesSubView, games, selectedGameId]);

  useEffect(() => {
    setSelectedAgendaDate((current) => {
      const currentMonthKey = `${historyYear}-${String(month).padStart(2, "0")}`;
      return current.startsWith(currentMonthKey)
        ? current
        : `${currentMonthKey}-01`;
    });
  }, [historyYear, month]);

  useEffect(() => {
    if (!selectedGame) {
      return;
    }

    setDraft(null);
    setSelectedPlayerIds(
      (selectedGame.lineups ?? [])
        .filter(hasLineupAthlete)
        .filter((lineup) => lineup.role !== "ABSENT" && lineup.presence)
        .map((lineup) => lineup.athleteId),
    );
  }, [selectedGame]);
  const appliedLineups = selectedGameLineups.filter(
    (lineup) => lineup.role !== "ABSENT",
  );
  const officialFieldLineups = appliedLineups.filter(
    (lineup) => lineup.role === "STARTER" || lineup.role === "GOALKEEPER",
  );
  const hasAppliedLineup = officialFieldLineups.length > 0;
  const lineupRosterByGame = games
    .map((game) => ({
      game,
      lineups: (game.lineups ?? []).filter(
        (lineup) => hasLineupAthlete(lineup) && lineup.role !== "ABSENT",
      ),
    }))
    .filter((item) => item.lineups.length > 0);
  const selectedLineupIds = new Set(
    selectedGameLineups.map((lineup) => lineup.athleteId),
  );
  const athletesAvailable = athletes.filter(
    (athlete) => !selectedLineupIds.has(athlete.id),
  );
  const lineupFormSelectedAthlete = athletes.find(
    (athlete) => athlete.id === lineupForm.athleteId,
  );
  const athletesAvailableForRole = athletesAvailable.filter((athlete) => {
    if (lineupForm.role === "GOALKEEPER") {
      return canEnterLineup(athlete) && isGoalkeeperAthlete(athlete);
    }
    if (lineupForm.role === "STARTER") {
      return isLineupFieldAthlete(athlete);
    }
    return canEnterLineup(athlete);
  });
  const athletesForLineupForm =
    lineupFormSelectedAthlete &&
    !athletesAvailableForRole.some(
      (athlete) => athlete.id === lineupFormSelectedAthlete.id,
    )
      ? [lineupFormSelectedAthlete, ...athletesAvailableForRole]
      : athletesAvailableForRole;
  const athletesInSelectedGame = athletes.filter((athlete) =>
    selectedLineupIds.has(athlete.id),
  );
  const athleteById = new Map(athletes.map((athlete) => [athlete.id, athlete]));
  const confirmedOrManagedAthleteIds = Array.from(
    new Set(
      selectedGameLineups
        .filter((lineup) => {
          const athlete = athleteById.get(lineup.athleteId);
          return lineup.role !== "ABSENT" &&
            lineup.confirmedAt &&
            lineup.presence &&
            athlete
            ? isLineupFieldAthlete(athlete)
            : false;
        })
        .map((lineup) => lineup.athleteId),
    ),
  );
  const confirmedOrManagedAthleteSet = new Set(confirmedOrManagedAthleteIds);
  const outAthleteIds = selectedGameLineups
    .filter(
      (lineup) =>
        lineup.role !== "ABSENT" &&
        lineup.confirmedAt &&
        (!lineup.presence || lineup.arrivalStatus === "UNAVAILABLE"),
    )
    .map((lineup) => lineup.athleteId);
  const pendingConvocationIds = selectedGameLineups
    .filter((lineup) => lineup.role !== "ABSENT" && !lineup.confirmedAt)
    .map((lineup) => lineup.athleteId);
  const unconfirmedAthleteIds = athletes
    .filter(
      (athlete) =>
        isLineupFieldAthlete(athlete) &&
        !confirmedOrManagedAthleteSet.has(athlete.id),
    )
    .map((athlete) => athlete.id);
  const activeDraftFieldAthleteIds = athletes
    .filter(isLineupFieldAthlete)
    .map((athlete) => athlete.id);
  const activeDraftContractedGoalkeeperIds = Array.from(
    new Set([
      ...activeGoalkeeperContractAthleteIds,
      ...athletes
        .filter(
          (athlete) =>
            canEnterLineup(athlete) &&
            athlete.position === "GOALKEEPER" &&
            (athlete.linkType === "CONTRACTED" || athlete.linkType === "GUEST"),
        )
        .map((athlete) => athlete.id),
    ]),
  );
  const hasConfirmedRoster = confirmedOrManagedAthleteIds.length > 0;
  const hasLineupDraftSelection =
    selectedPlayerIds.length > 0 || confirmedOrManagedAthleteIds.length > 0;
  const draftFallbackIds =
    confirmedOrManagedAthleteIds.length > 0
      ? confirmedOrManagedAthleteIds
      : activeDraftFieldAthleteIds;
  const draftCandidateIds =
    selectedPlayerIds.length > 0 ? selectedPlayerIds : draftFallbackIds;
  const draftCandidateFieldCount = athletes.filter(
    (athlete) =>
      draftCandidateIds.includes(athlete.id) && isLineupFieldAthlete(athlete),
  ).length;
  const draftCandidateContractedGoalkeeperCount = athletes.filter(
    (athlete) =>
      draftCandidateIds.includes(athlete.id) &&
      canEnterLineup(athlete) &&
      athlete.position === "GOALKEEPER" &&
      (athlete.linkType === "CONTRACTED" || athlete.linkType === "GUEST"),
  ).length;
  const baseEffectiveDraftCandidateIds =
    draftCandidateFieldCount >= minLinePlayersForDraft &&
    draftCandidateContractedGoalkeeperCount >= minGoalkeepersForDraft
      ? draftCandidateIds
      : hasConfirmedRoster
        ? Array.from(
            new Set([
              ...draftCandidateIds,
              ...activeDraftContractedGoalkeeperIds,
            ]),
          )
        : Array.from(
            new Set([
              ...draftCandidateIds,
              ...activeDraftFieldAthleteIds,
              ...activeDraftContractedGoalkeeperIds,
            ]),
          );
  const effectiveDraftCandidateIds = Array.from(
    new Set([
      ...baseEffectiveDraftCandidateIds,
      ...Object.values(draftCaptains).filter(Boolean),
    ]),
  );
  const draftCandidatePlayers = athletes.filter((athlete) =>
    effectiveDraftCandidateIds.includes(athlete.id),
  );
  const eligibleDraftCandidatePlayers =
    draftCandidatePlayers.filter(canEnterLineup);
  const hasValidDraftCaptains =
    !draftCaptains.RED && !draftCaptains.WHITE
      ? true
      : Boolean(
          draftCaptains.RED &&
          draftCaptains.WHITE &&
          draftCaptains.RED !== draftCaptains.WHITE,
        );
  const lineupRoleOrder: Record<LineupRole, number> = {
    GOALKEEPER: 0,
    STARTER: 1,
    RESERVE: 2,
    ABSENT: 3,
  };
  const lineupPositionOrder = (lineup: GameLineup) =>
    lineup.role === "GOALKEEPER" || lineup.athlete.position === "GOALKEEPER"
      ? 0
      : pitchPositionOrder[lineup.athlete.position];
  const sortLineupsForField = (lineups: GameLineup[]) =>
    lineups.some((lineup) => lineup.tacticalSlot !== null)
      ? lineups
          .slice()
          .sort(
            (a, b) =>
              (a.tacticalSlot ?? 999) - (b.tacticalSlot ?? 999) ||
              lineupRoleOrder[a.role] - lineupRoleOrder[b.role] ||
              lineupPositionOrder(a) - lineupPositionOrder(b) ||
              (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999) ||
              a.athlete.name.localeCompare(b.athlete.name),
          )
      : sortAthletesForPitch(
          lineups.map((lineup) => ({
            name: lineup.athlete.name,
            position: lineup.athlete.position,
            rating: lineup.role === "GOALKEEPER" ? 99 : 3,
            lineup,
          })),
        ).map((item) => item.lineup);
  function splitLineupsByStarterLimit(lineups: GameLineup[]) {
    const sorted = sortLineupsForField(
      lineups.filter((lineup) => lineup.role !== "ABSENT"),
    );
    if (sorted.length <= playersPerTeam) {
      return {
        starters: sorted.map((lineup, index) => ({
          ...lineup,
          role:
            lineup.role === "RESERVE"
              ? index === 0 || isGoalkeeperAthlete(lineup.athlete)
                ? "GOALKEEPER"
                : "STARTER"
              : lineup.role,
          tacticalSlot: lineup.tacticalSlot ?? index + 1,
        })) as GameLineup[],
        reserves: [],
      };
    }

    const explicitStarters = sorted.filter(
      (lineup) => lineup.role === "STARTER" || lineup.role === "GOALKEEPER",
    );
    const starters = (
      explicitStarters.length >= playersPerTeam
        ? explicitStarters.slice(0, playersPerTeam)
        : sorted.slice(0, playersPerTeam)
    ).map((lineup, index) => ({
      ...lineup,
      role:
        lineup.role === "RESERVE"
          ? index === 0 || isGoalkeeperAthlete(lineup.athlete)
            ? "GOALKEEPER"
            : "STARTER"
          : lineup.role,
      tacticalSlot: lineup.tacticalSlot ?? index + 1,
    })) as GameLineup[];
    const starterIds = new Set(starters.map((lineup) => lineup.id));

    return {
      starters,
      reserves: sorted.filter((lineup) => !starterIds.has(lineup.id)),
    };
  }
  const appliedLineupPlayers = appliedLineups
    .slice()
    .sort((a, b) => {
      const sideOrder = a.side.localeCompare(b.side);
      if (sideOrder !== 0) {
        return sideOrder;
      }
      return (
        lineupRoleOrder[a.role] - lineupRoleOrder[b.role] ||
        (a.tacticalSlot ?? 999) - (b.tacticalSlot ?? 999) ||
        a.athlete.name.localeCompare(b.athlete.name)
      );
    })
    .map((lineup) => {
      const profile = athleteById.get(lineup.athleteId);
      return {
        id: lineup.athleteId,
        name: lineup.athlete.name,
        position: profile?.position ?? lineup.athlete.position,
        rating: profile?.rating ?? 3,
      };
    });
  const manualSelectedPlayers = athletes.filter((athlete) =>
    selectedPlayerIds.includes(athlete.id),
  );
  const selectedPlayers =
    appliedLineupPlayers.length > 0
      ? appliedLineupPlayers
      : manualSelectedPlayers;
  const tacticalLineups = appliedLineups
    .filter(
      (lineup) =>
        lineup.side === "RED" &&
        (lineup.role === "STARTER" || lineup.role === "GOALKEEPER"),
    )
    .slice()
    .sort(
      (a, b) =>
        lineupRoleOrder[a.role] - lineupRoleOrder[b.role] ||
        (a.tacticalSlot ?? 999) - (b.tacticalSlot ?? 999) ||
        a.athlete.name.localeCompare(b.athlete.name),
    );
  const tacticalPlayers =
    tacticalLineups.length > 0
      ? tacticalLineups.map((lineup) => {
          const profile = athleteById.get(lineup.athleteId);
          return {
            id: lineup.athleteId,
            name: lineup.athlete.name,
            position: profile?.position ?? lineup.athlete.position,
            rating: profile?.rating ?? 3,
          };
        })
      : selectedPlayers;
  const selectedGoalkeepers = Math.max(
    activeGoalkeeperContracts.length,
    activeDraftContractedGoalkeeperIds.filter((athleteId) =>
      effectiveDraftCandidateIds.includes(athleteId),
    ).length,
  );
  const selectedLinePlayers = eligibleDraftCandidatePlayers.filter(
    (athlete) => athlete.position !== "GOALKEEPER",
  ).length;
  const canDraftLineup =
    activeDraftFieldAthleteIds.length >= minLinePlayersForDraft &&
    selectedGoalkeepers >= minGoalkeepersForDraft;
  const canDraftSelectedRoster =
    selectedLinePlayers >= minLinePlayersForDraft &&
    selectedGoalkeepers >= minGoalkeepersForDraft;
  const selectedGameDraftAttempts = selectedGame?.draftAttempts ?? 0;
  const hasReachedDraftLimit =
    selectedGameDraftAttempts >= maxDraftAttemptsPerGame;
  const activePlanState = tacticalPlans[activePlan];
  const tacticalRows = buildFormationRowsFromAthletes(
    tacticalPlayers,
    activePlanState.formation,
  );
  const recommendedFormations = recommendFormations(tacticalPlayers);
  const defaultRedUniformName =
    groupSettings.uniform1Name ?? DEFAULT_RED_UNIFORM_NAME;
  const defaultWhiteUniformName =
    groupSettings.uniform2Name ?? DEFAULT_WHITE_UNIFORM_NAME;
  const internalTeamNameOptions = [
    {
      key: "TEAM_1",
      label: "Nome do Time 1",
      value: defaultRedUniformName || DEFAULT_RED_UNIFORM_NAME,
    },
    {
      key: "TEAM_2",
      label: "Nome do Time 2",
      value: defaultWhiteUniformName || DEFAULT_WHITE_UNIFORM_NAME,
    },
    ...teams.map((team) => ({
      key: `TEAM_${team.id}`,
      label: team.club?.name ?? "Equipe",
      value: team.name,
    })),
  ];
  function chooseInternalTeamName(side: TeamSide, value: string) {
    setForm((prev) =>
      side === "RED"
        ? {
            ...prev,
            redTeamName: value,
          }
        : {
            ...prev,
            whiteTeamName: value,
          },
    );
  }
  const internalHomeName = form.redTeamName.trim();
  const internalAwayName = form.whiteTeamName.trim();
  const internalTeamsHaveValidNames =
    form.type !== "INTERNAL" ||
    (internalHomeName.length >= 2 &&
      internalAwayName.length >= 2 &&
      internalHomeName.toLowerCase() !== internalAwayName.toLowerCase());
  const redUniformName =
    selectedGame?.redTeamName ||
    defaultRedUniformName ||
    DEFAULT_RED_UNIFORM_NAME;
  const whiteUniformName =
    selectedGame?.whiteTeamName ||
    defaultWhiteUniformName ||
    DEFAULT_WHITE_UNIFORM_NAME;
  const redInternalShirtIdentity =
    selectedGame?.type === "INTERNAL"
      ? shirtIdentityForInternalSide(redUniformName, "RED")
      : null;
  const whiteInternalShirtIdentity =
    selectedGame?.type === "INTERNAL"
      ? shirtIdentityForInternalSide(whiteUniformName, "WHITE")
      : null;
  const defaultRedUniformKit =
    groupSettings.uniform1Color ?? DEFAULT_RED_UNIFORM_COLOR;
  const defaultWhiteUniformKit =
    groupSettings.uniform2Color ?? DEFAULT_WHITE_UNIFORM_COLOR;
  const defaultRedUniformColor = uniformColorHex(
    groupSettings.uniform1Color,
    DEFAULT_RED_UNIFORM_COLOR,
  );
  const defaultWhiteUniformColor = uniformColorHex(
    groupSettings.uniform2Color,
    DEFAULT_WHITE_UNIFORM_COLOR,
  );
  const redUniformKitSource =
    selectedGame?.type === "INTERNAL"
      ? (firstFilledText(
          selectedGame?.redUniformColor,
          redInternalShirtIdentity?.color,
          groupSettings.uniform1Color,
        ) ?? DEFAULT_RED_UNIFORM_COLOR)
      : (firstFilledText(
          selectedGame?.redUniformColor,
          groupSettings.uniform1Color,
        ) ?? DEFAULT_RED_UNIFORM_COLOR);
  const whiteUniformKitSource =
    selectedGame?.type === "INTERNAL"
      ? (firstFilledText(
          selectedGame?.whiteUniformColor,
          whiteInternalShirtIdentity?.color,
          groupSettings.uniform2Color,
        ) ?? DEFAULT_WHITE_UNIFORM_COLOR)
      : (firstFilledText(
          selectedGame?.whiteUniformColor,
          groupSettings.uniform2Color,
        ) ?? DEFAULT_WHITE_UNIFORM_COLOR);
  const redUniformColor = uniformColorHex(
    redUniformKitSource,
    defaultRedUniformColor,
  );
  const whiteUniformColor = uniformColorHex(
    whiteUniformKitSource,
    defaultWhiteUniformColor,
  );
  const redUniformPreviewKit =
    redUniformKitSource || defaultRedUniformKit || redUniformColor;
  const whiteUniformPreviewKit =
    whiteUniformKitSource || defaultWhiteUniformKit || whiteUniformColor;
  const selectedHomeTeam = selectedGame?.homeTeamId
    ? teams.find((team) => team.id === selectedGame.homeTeamId)
    : null;
  const selectedAwayTeam = selectedGame?.awayTeamId
    ? teams.find((team) => team.id === selectedGame.awayTeamId)
    : null;
  const redShirtColor =
    normalizedHex(redUniformColor) ?? defaultRedUniformColor;
  const whiteShirtColor =
    normalizedHex(whiteUniformColor) ?? defaultWhiteUniformColor;
  const redShirtTextColor = readableTextColor(redShirtColor);
  const whiteShirtTextColor = readableTextColor(whiteShirtColor);
  const redUniformImageUrl =
    selectedGame?.type === "EXTERNAL"
      ? firstFilledText(
          selectedGame.redUniformImageUrl,
          selectedHomeTeam?.shirtImageUrl,
          selectedGame.homeClub?.shirtImageUrl,
          groupSettings.uniform1ImageUrl,
        )
      : firstFilledText(
          selectedGame?.redUniformImageUrl,
          redInternalShirtIdentity?.imageUrl,
          groupSettings.uniform1ImageUrl,
        );
  const whiteUniformImageUrl =
    selectedGame?.type === "EXTERNAL"
      ? firstFilledText(
          selectedGame.whiteUniformImageUrl,
          selectedAwayTeam?.shirtImageUrl,
          selectedGame.awayClub?.shirtImageUrl,
          groupSettings.uniform2ImageUrl,
        )
      : firstFilledText(
          selectedGame?.whiteUniformImageUrl,
          whiteInternalShirtIdentity?.imageUrl,
          groupSettings.uniform2ImageUrl,
        );
  const selectedGameSeasonLabel = selectedGame
    ? new Date(selectedGame.date).getFullYear()
    : historyYear;
  const appearanceLogoUrl = tenantBrandingQuery.data?.logoUrl ?? null;
  const registeredInternalClubLogoUrl =
    clubs.find((club) => club.type === "INTERNAL" && club.logoUrl)?.logoUrl ??
    null;
  const internalGameLogoUrl =
    appearanceLogoUrl ?? registeredInternalClubLogoUrl;
  const redClubLogoUrl =
    selectedGame?.redCrestUrl ??
    (selectedGame?.type === "EXTERNAL"
      ? (selectedGame.homeClub?.logoUrl ?? internalGameLogoUrl)
      : internalGameLogoUrl);
  const whiteClubLogoUrl =
    selectedGame?.whiteCrestUrl ??
    (selectedGame?.type === "EXTERNAL"
      ? (selectedGame.awayClub?.logoUrl ?? null)
      : internalGameLogoUrl);
  const redLineupSplit = splitLineupsByStarterLimit(
    selectedGameLineups.filter((lineup) => lineup.side === "RED"),
  );
  const whiteLineupSplit = splitLineupsByStarterLimit(
    selectedGameLineups.filter((lineup) => lineup.side === "WHITE"),
  );
  const redStarterLineups = redLineupSplit.starters;
  const whiteStarterLineups = whiteLineupSplit.starters;
  const redReserveLineups = redLineupSplit.reserves;
  const whiteReserveLineups = whiteLineupSplit.reserves;
  const redLineupOptions = [...redStarterLineups, ...redReserveLineups];
  const whiteLineupOptions = [...whiteStarterLineups, ...whiteReserveLineups];
  const selectedSideLineupOptions =
    selectedPitchSide === "RED" ? redLineupOptions : whiteLineupOptions;
  const goalkeeperContractByAthleteId = new Map(
    activeGoalkeeperContracts
      .filter((contract) => contract.athleteId)
      .map((contract) => [contract.athleteId as string, contract]),
  );
  const selectedGameGoalkeeperLineups = selectedGameLineups.filter(
    (lineup) => lineup.role === "GOALKEEPER",
  );
  const confirmedGoalkeeperCostCents = selectedGameGoalkeeperLineups.reduce(
    (total, lineup) => {
      const contract = goalkeeperContractByAthleteId.get(lineup.athleteId);
      return total + (lineup.presence ? (contract?.monthlyCostCents ?? 0) : 0);
    },
    0,
  );
  const redTeamPlayers = lineupsToPitchSlots(redStarterLineups, playersPerTeam);
  const whiteTeamPlayers = lineupsToPitchSlots(
    whiteStarterLineups,
    playersPerTeam,
  );
  const redBenchPlayers = redReserveLineups.map((lineup) => ({
    id: lineup.athlete.id,
    name: lineup.athlete.name,
    number: lineup.jerseyNumber,
    position: lineup.athlete.position,
  }));
  const whiteBenchPlayers = whiteReserveLineups.map((lineup) => ({
    id: lineup.athlete.id,
    name: lineup.athlete.name,
    number: lineup.jerseyNumber,
    position: lineup.athlete.position,
  }));
  const draftNumberForAthlete = (athleteId: string, fallback: number) => {
    const saved = (draftJerseyNumbers[athleteId] ?? "").trim();
    const parsed = saved ? Number(saved) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const draftRedStarters = draft
    ? sortAthletesForPitch((draft.red ?? []).filter(hasAthleteProfile))
    : [];
  const draftWhiteStarters = draft
    ? sortAthletesForPitch((draft.white ?? []).filter(hasAthleteProfile))
    : [];
  const draftRedPlayers = draftRedStarters.map((athlete, index) => ({
    id: athlete.id,
    name: athlete.name,
    number: draftNumberForAthlete(athlete.id, index + 1),
    position: athlete.position,
  }));
  const draftWhitePlayers = draftWhiteStarters.map((athlete, index) => ({
    id: athlete.id,
    name: athlete.name,
    number: draftNumberForAthlete(athlete.id, index + 1),
    position: athlete.position,
  }));
  const draftRedFieldSlots = Array.from(
    { length: playersPerTeam },
    (_, index) => draftRedPlayers[index] ?? null,
  );
  const draftWhiteFieldSlots = Array.from(
    { length: playersPerTeam },
    (_, index) => draftWhitePlayers[index] ?? null,
  );
  const draftRedBenchPlayers = draft
    ? (draft.redBench ?? [])
        .filter(hasAthleteProfile)
        .map((athlete, index) => ({
          id: athlete.id,
          name: athlete.name,
          number: draftNumberForAthlete(athlete.id, 12 + index),
          position: athlete.position,
        }))
    : [];
  const draftWhiteBenchPlayers = draft
    ? (draft.whiteBench ?? [])
        .filter(hasAthleteProfile)
        .map((athlete, index) => ({
          id: athlete.id,
          name: athlete.name,
          number: draftNumberForAthlete(athlete.id, 12 + index),
          position: athlete.position,
        }))
    : [];
  const isDraftPreviewActive = Boolean(draft);
  const hasRedFieldLineup = redStarterLineups.length > 0;
  const hasWhiteFieldLineup = whiteStarterLineups.length > 0;
  const displayRedTeamPlayers = isDraftPreviewActive
    ? draftRedFieldSlots
    : hasRedFieldLineup
      ? redTeamPlayers
      : [];
  const displayWhiteTeamPlayers = isDraftPreviewActive
    ? draftWhiteFieldSlots
    : hasWhiteFieldLineup
      ? whiteTeamPlayers
      : [];
  const displayRedBenchPlayers = isDraftPreviewActive
    ? draftRedBenchPlayers
    : redBenchPlayers;
  const displayWhiteBenchPlayers = isDraftPreviewActive
    ? draftWhiteBenchPlayers
    : whiteBenchPlayers;
  const autoRedPitchFormation = detectPitchFormation(
    displayRedTeamPlayers.filter(
      (player): player is NonNullable<typeof player> => Boolean(player),
    ),
  );
  const autoWhitePitchFormation = detectPitchFormation(
    displayWhiteTeamPlayers.filter(
      (player): player is NonNullable<typeof player> => Boolean(player),
    ),
  );
  const redPitchFormation =
    manualFormations.RED === "AUTO"
      ? autoRedPitchFormation
      : manualFormations.RED;
  const whitePitchFormation =
    manualFormations.WHITE === "AUTO"
      ? autoWhitePitchFormation
      : manualFormations.WHITE;
  const orderedDisplayRedTeamPlayers = isDraftPreviewActive
    ? draftRedFieldSlots
    : redTeamPlayers;
  const orderedDisplayWhiteTeamPlayers = isDraftPreviewActive
    ? draftWhiteFieldSlots
    : whiteTeamPlayers;
  const orderedRedStarterLineups = lineupsToSlotList(
    redStarterLineups,
    playersPerTeam,
  );
  const orderedWhiteStarterLineups = lineupsToSlotList(
    whiteStarterLineups,
    playersPerTeam,
  );
  const selectedPitchFormation =
    selectedPitchSide === "RED" ? redPitchFormation : whitePitchFormation;
  const selectedPitchPlayers = (
    selectedPitchSide === "RED"
      ? orderedDisplayRedTeamPlayers
      : orderedDisplayWhiteTeamPlayers
  ).filter((player): player is NonNullable<typeof player> => Boolean(player));
  const selectedPitchPlayerCount = selectedPitchPlayers.length;
  const selectedPitchGoalkeeperCount = selectedPitchPlayers.filter(
    (player) => player.position === "GOALKEEPER" || player.position === "BOTH",
  ).length;
  const selectedPitchBenchPlayers =
    selectedPitchSide === "RED"
      ? displayRedBenchPlayers
      : displayWhiteBenchPlayers;
  const redTacticalKitSource =
    redUniformPreviewKit === DEFAULT_RED_UNIFORM_COLOR
      ? "#ffffff"
      : redUniformPreviewKit;
  const whiteTacticalKitSource =
    whiteUniformPreviewKit === DEFAULT_WHITE_UNIFORM_COLOR
      ? "#ffffff"
      : whiteUniformPreviewKit;
  const selectedPitchKitSource =
    selectedPitchSide === "RED" ? redTacticalKitSource : whiteTacticalKitSource;
  const selectedPitchCrestUrl =
    selectedPitchSide === "RED" ? redClubLogoUrl : whiteClubLogoUrl;
  const redGoals = selectedGame?.redScore ?? 0;
  const whiteGoals = selectedGame?.whiteScore ?? 0;
  const goalEventsRed = selectedGameEvents.filter(
    (event) => event.type === "GOAL" && event.side === "RED",
  ).length;
  const goalEventsWhite = selectedGameEvents.filter(
    (event) => event.type === "GOAL" && event.side === "WHITE",
  ).length;
  const cardEvents = selectedGameEvents.filter(
    (event) => event.type === "YELLOW_CARD" || event.type === "RED_CARD",
  ).length;
  const redStarters = selectedGameLineups.filter(
    (lineup) => lineup.side === "RED" && lineup.role !== "ABSENT",
  ).length;
  const adherencePercent =
    tacticalPlayers.length > 0
      ? Math.round((redStarters / tacticalPlayers.length) * 100)
      : 0;
  const nowMs = Date.now();
  const gamesByDate = games
    .slice()
    .sort(
      (first, second) =>
        new Date(first.date).getTime() - new Date(second.date).getTime(),
    );
  const gamesByDay = gamesByDate.reduce((map, game) => {
    const key = toDateKey(game.date);
    const bucket = map.get(key) ?? [];
    bucket.push(game);
    map.set(key, bucket);
    return map;
  }, new Map<string, Game[]>());
  const agendaMonthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(historyYear, month - 1, 1));
  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(historyYear, month - 1, 1);
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date,
        key: toDateKey(date),
        inMonth: date.getMonth() === month - 1,
      };
    });
  }, [historyYear, month]);
  const selectedAgendaGames = gamesByDay.get(selectedAgendaDate) ?? [];
  const agendaListGames =
    agendaViewMode === "CALENDARIO" ? selectedAgendaGames : gamesByDate;
  const upcomingGames = gamesByDate.filter(
    (game) => new Date(game.date).getTime() >= nowMs,
  );
  const nextScheduledGame =
    upcomingGames[0] ?? gamesByDate[gamesByDate.length - 1] ?? null;
  const dashboardGame = selectedGame ?? nextScheduledGame;
  const dashboardLineups = (dashboardGame?.lineups ?? []).filter(
    hasLineupAthlete,
  );
  const dashboardActiveLineups = dashboardLineups.filter(
    (lineup) => lineup.role !== "ABSENT",
  );
  const dashboardConfirmedLineups = dashboardActiveLineups.filter(
    (lineup) => lineup.confirmedAt,
  );
  const dashboardUnavailableLineups = dashboardActiveLineups.filter(
    (lineup) => !lineup.presence || lineup.arrivalStatus === "UNAVAILABLE",
  );
  const dashboardConfirmationPercent =
    dashboardActiveLineups.length > 0
      ? Math.round(
          (dashboardConfirmedLineups.length / dashboardActiveLineups.length) *
            100,
        )
      : 0;
  const dashboardRedPlayers = dashboardActiveLineups.filter(
    (lineup) => lineup.side === "RED",
  ).length;
  const dashboardWhitePlayers = dashboardActiveLineups.filter(
    (lineup) => lineup.side === "WHITE",
  ).length;
  const dashboardLineupReady =
    dashboardRedPlayers >= playersPerTeam &&
    dashboardWhitePlayers >= playersPerTeam;
  const gameStatusChart = [
    {
      name: "Agendados",
      value: games.filter((game) => game.status === "SCHEDULED").length,
      color: "#2563eb",
    },
    {
      name: "Finalizados",
      value: games.filter((game) => game.status === "FINISHED").length,
      color: "#10b981",
    },
    {
      name: "Cancelados",
      value: games.filter((game) => game.status === "CANCELED").length,
      color: "#64748b",
    },
  ].filter((item) => item.value > 0);
  const gameTypeChart = [
    {
      name: "Internos",
      value: games.filter((game) => game.type === "INTERNAL").length,
      color: "#ef3340",
    },
    {
      name: "Externos",
      value: games.filter((game) => game.type === "EXTERNAL").length,
      color: "#2563eb",
    },
  ].filter((item) => item.value > 0);
  const dashboardConfirmationChart = [
    { name: "Confirmados", value: dashboardConfirmedLineups.length, color: "#10b981" },
    {
      name: "Pendentes",
      value: Math.max(
        0,
        dashboardActiveLineups.length -
          dashboardConfirmedLineups.length -
          dashboardUnavailableLineups.length,
      ),
      color: "#f59e0b",
    },
    { name: "Baixas", value: dashboardUnavailableLineups.length, color: "#ef4444" },
  ].filter((item) => item.value > 0);
  const dashboardTeamsChart = [
    { name: "Time A", value: dashboardRedPlayers, color: "#ef3340" },
    { name: "Time B", value: dashboardWhitePlayers, color: "#0f172a" },
  ];
  const gamesWithLineup = games.filter((game) =>
    (game.lineups ?? []).some(
      (lineup) => hasLineupAthlete(lineup) && lineup.role !== "ABSENT",
    ),
  ).length;
  const gamesWithResult = games.filter(
    (game) =>
      (game.redScore !== null && game.whiteScore !== null) ||
      (game.homeScore !== null && game.awayScore !== null),
  ).length;
  const listPeriodStart = showWholeYear
    ? new Date(historyYear, 0, 1)
    : new Date(historyYear, month - 1, 1);
  const listPeriodEnd = showWholeYear
    ? new Date(historyYear, 11, 31)
    : new Date(historyYear, month, 0);
  const listPeriodLabel = `${formatDate(toDateKey(listPeriodStart))} - ${formatDate(toDateKey(listPeriodEnd))}`;
  const tacticalNumberByAthleteId = useMemo(() => {
    const map = new Map<string, number>();
    let next = 2;
    for (const row of [...tacticalRows.rows].reverse()) {
      for (const athlete of row) {
        if (athlete && !map.has(athlete.id)) {
          map.set(athlete.id, next);
          next += 1;
        }
      }
    }
    return map;
  }, [tacticalRows.rows]);

  function escapePrintText(value: string | number | null | undefined) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function gameLineupsBySide(game: Game, side: TeamSide, role?: LineupRole) {
    return sortLineupsForField(
      (game.lineups ?? []).filter(
        (lineup) =>
          hasLineupAthlete(lineup) &&
          lineup.side === side &&
          lineup.role !== "ABSENT" &&
          (!role || lineup.role === role),
      ),
    );
  }

  function gameTeamPrintList(lineups: GameLineup[]) {
    return lineups
      .map((lineup) => {
        const tag =
          lineup.role === "GOALKEEPER"
            ? "GOL"
            : lineup.role === "RESERVE"
              ? "Banco"
              : `P${lineup.tacticalSlot ?? ""}`;
        const number =
          lineup.jerseyNumber !== null ? `#${lineup.jerseyNumber} ` : "";
        return `<li><strong>${escapePrintText(tag)}</strong><span>${escapePrintText(`${number}${lineup.athlete.name}`)}</span></li>`;
      })
      .join("");
  }

  function draftTeamPrintList(
    players: AthleteProfile[] | undefined,
    tagPrefix: string,
  ) {
    return (players ?? [])
      .map((athlete, index) => {
        const tag = tagPrefix === "Banco" ? "Banco" : `P${index + 1}`;
        return `<li><strong>${escapePrintText(tag)}</strong><span>${escapePrintText(`${index + 1} ${athlete.name}`)}</span></li>`;
      })
      .join("");
  }

  function printGameLineup(
    game: Game,
    currentDraft: LineupDraft | null = null,
  ) {
    const redName =
      game.redTeamName || groupSettings.uniform1Name || defaultRedUniformName;
    const whiteName =
      game.whiteTeamName ||
      groupSettings.uniform2Name ||
      defaultWhiteUniformName;
    const hasDraft = Boolean(currentDraft);
    const redPrintSplit = splitLineupsByStarterLimit(
      gameLineupsBySide(game, "RED"),
    );
    const whitePrintSplit = splitLineupsByStarterLimit(
      gameLineupsBySide(game, "WHITE"),
    );
    const redStarters = redPrintSplit.starters;
    const whiteStarters = whitePrintSplit.starters;
    const redReserves = redPrintSplit.reserves;
    const whiteReserves = whitePrintSplit.reserves;
    const redStarterList = hasDraft
      ? draftTeamPrintList(sortAthletesForPitch(currentDraft?.red ?? []), "P")
      : gameTeamPrintList(redStarters);
    const whiteStarterList = hasDraft
      ? draftTeamPrintList(sortAthletesForPitch(currentDraft?.white ?? []), "P")
      : gameTeamPrintList(whiteStarters);
    const redReserveList = hasDraft
      ? draftTeamPrintList(currentDraft.redBench, "Banco")
      : gameTeamPrintList(redReserves);
    const whiteReserveList = hasDraft
      ? draftTeamPrintList(currentDraft.whiteBench, "Banco")
      : gameTeamPrintList(whiteReserves);
    const popup = window.open("", "_blank", "width=960,height=720");

    if (!popup) {
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Escalação - ${escapePrintText(game.location)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; }
            header { border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 18px; }
            h1 { margin: 0; font-size: 26px; }
            .meta { margin-top: 6px; color: #475569; font-size: 14px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
            .team { border: 1px solid #dbe3ee; border-radius: 10px; overflow: hidden; }
            .team h2 { margin: 0; padding: 12px 14px; font-size: 18px; border-bottom: 1px solid #dbe3ee; }
            .body { padding: 12px 14px; }
            h3 { margin: 10px 0 8px; font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: .08em; }
            ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
            li { display: grid; grid-template-columns: 58px 1fr; gap: 8px; padding: 7px 9px; border-radius: 8px; background: #f8fafc; font-size: 13px; }
            li strong { color: #b91c1c; }
            @media print { button { display: none; } body { margin: 18px; } }
          </style>
        </head>
        <body>
          <header>
            <h1>Escalação do jogo</h1>
            <div class="meta">${escapePrintText(formatDateTime(game.date))} - ${escapePrintText(game.location)} - ${hasDraft ? "Sorteio ainda não aplicado ao jogo" : "Escalação aplicada no jogo"}</div>
          </header>
          <main class="grid">
            <section class="team">
              <h2>${escapePrintText(redName)}</h2>
              <div class="body">
                <h3>Titulares</h3>
                <ul>${redStarterList || "<li><strong>-</strong><span>Sem titulares</span></li>"}</ul>
                <h3>Banco</h3>
                <ul>${redReserveList || "<li><strong>-</strong><span>Sem reservas</span></li>"}</ul>
              </div>
            </section>
            <section class="team">
              <h2>${escapePrintText(whiteName)}</h2>
              <div class="body">
                <h3>Titulares</h3>
                <ul>${whiteStarterList || "<li><strong>-</strong><span>Sem titulares</span></li>"}</ul>
                <h3>Banco</h3>
                <ul>${whiteReserveList || "<li><strong>-</strong><span>Sem reservas</span></li>"}</ul>
              </div>
            </section>
          </main>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subViewParam = params.get("subView");
    if (
      subViewParam === "CADASTRO" ||
      subViewParam === "AGENDA" ||
      subViewParam === "ARBITRAGEM" ||
      subViewParam === "CONFIRMACOES" ||
      subViewParam === "ESCALACAO" ||
      subViewParam === "TACTICA" ||
      subViewParam === "EVENTOS"
    ) {
      setGamesSubView((current) =>
        current === subViewParam ? current : subViewParam,
      );
    }
  }, [location.search]);

  useEffect(() => {
    if (!selectedGame) {
      return;
    }

    if (selectedGame?.tacticalPlans) {
      setTacticalPlans({
        A: {
          formation: selectedGame.tacticalPlans.A.formation,
          phase: selectedGame.tacticalPlans.A.phase,
          note: selectedGame.tacticalPlans.A.note,
          substitutions: selectedGame.tacticalPlans.A.substitutions,
        },
        B: {
          formation: selectedGame.tacticalPlans.B.formation,
          phase: selectedGame.tacticalPlans.B.phase,
          note: selectedGame.tacticalPlans.B.note,
          substitutions: selectedGame.tacticalPlans.B.substitutions,
        },
        C: {
          formation: selectedGame.tacticalPlans.C.formation,
          phase: selectedGame.tacticalPlans.C.phase,
          note: selectedGame.tacticalPlans.C.note,
          substitutions: selectedGame.tacticalPlans.C.substitutions,
        },
      });
      return;
    }

    setTacticalPlans(createDefaultTacticalPlans());
  }, [selectedGame]);

  function selectGame(game: Game) {
    setSelectedGameId(game.id);
    setGameNotice("");
    setDraft(null);
    setSelectedPlayerIds(
      (game.lineups ?? [])
        .filter(
          (lineup) => hasLineupAthlete(lineup) && lineup.role !== "ABSENT",
        )
        .map((lineup) => lineup.athleteId),
    );
    setEventForm((prev) => ({
      ...prev,
      athleteId: "",
      side: "RED",
    }));
  }

  function editGame(game: Game) {
    setGameNotice("");
    selectGame(game);
    goToGameStep("CADASTRO", game);
    const redKit = parseTeamKit(
      game.redUniformColor ?? defaultRedUniformColor,
      defaultRedUniformColor,
    );
    const whiteKit = parseTeamKit(
      game.whiteUniformColor ?? defaultWhiteUniformColor,
      defaultWhiteUniformColor,
    );
    setForm({
      type: game.type,
      gameMode:
        game.gameMode ??
        (game.type === "EXTERNAL" ? "EXTERNAL_FRIENDLY" : "INTERNAL_SPLIT"),
      clubSide:
        game.homeClub?.type === "INTERNAL" || game.awayClub?.type !== "INTERNAL"
          ? "HOME"
          : "AWAY",
      homeClubId: game.homeClubId ?? "",
      awayClubId: game.awayClubId ?? "",
      homeTeamId: game.homeTeamId ?? "",
      awayTeamId: game.awayTeamId ?? "",
      competitionId: game.competitionId ?? "",
      round: game.round ?? "",
      matchNumber: game.matchNumber !== null ? String(game.matchNumber) : "",
      refereeName: game.refereeName ?? "",
      assistantNames: game.assistantNames ?? "",
      assistantOneName: game.assistantOneName ?? "",
      assistantTwoName: game.assistantTwoName ?? "",
      fourthOfficialName: game.fourthOfficialName ?? "",
      reserveAssistantName: game.reserveAssistantName ?? "",
      varName: game.varName ?? "",
      avarName: game.avarName ?? "",
      delegateName: game.delegateName ?? "",
      date: dateToInput(new Date(game.date)),
      fieldId: game.fieldId ?? "",
      location: game.location,
      address: selectedField?.address ?? "",
      cityState: game.field
        ? [game.field.city, game.field.state].filter(Boolean).join(" / ")
        : "",
      arrivalTime: "",
      durationMinutes: String(
        game.halfDurationMinutes ? game.halfDurationMinutes * 2 : 90,
      ),
      predictedHomeScore: "",
      predictedAwayScore: "",
      championship: game.championship ?? "",
      gameValueBRL: String((game.gameValueCents / 100).toFixed(2)).replace(
        ".",
        ",",
      ),
      redTeamName: game.redTeamName ?? defaultRedUniformName,
      whiteTeamName: game.whiteTeamName ?? defaultWhiteUniformName,
      redUniformKit:
        game.redUniformColor ??
        encodeTeamKit(redKit.primary, redKit.accent, redKit.style, redKit),
      whiteUniformKit:
        game.whiteUniformColor ??
        encodeTeamKit(
          whiteKit.primary,
          whiteKit.accent,
          whiteKit.style,
          whiteKit,
        ),
      redUniformColor: redKit.primary,
      redUniformAccent: redKit.accent,
      redUniformStyle: redKit.style,
      whiteUniformColor: whiteKit.primary,
      whiteUniformAccent: whiteKit.accent,
      whiteUniformStyle: whiteKit.style,
      redScore: game.redScore !== null ? String(game.redScore) : "",
      whiteScore: game.whiteScore !== null ? String(game.whiteScore) : "",
      note: game.note ?? "",
    });
  }

  function goToGameStep(nextView: GameSubView, game: Game | null = null) {
    if (nextView === "AGENDA") {
      setAgendaViewMode("CALENDARIO");
    }

    if (game) {
      selectGame(game);
      setSelectedAgendaDate(toDateKey(game.date));
    } else if (nextView === "CADASTRO") {
      resetGameForm();
    } else if (!selectedGame && dashboardGame) {
      selectGame(dashboardGame);
      setSelectedAgendaDate(toDateKey(dashboardGame.date));
    }

    setGamesSubView(nextView);
    const params = new URLSearchParams(location.search);
    params.set("view", "OPERACAO");
    params.set("subView", nextView);
    navigate(`/jogos?${params.toString()}`, { replace: true });
  }

  function togglePlayer(id: string) {
    setDraft(null);
    setDraftJerseyNumbers({});
    setSelectedPlayerIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function selectSuggestedAthletes() {
    setDraft(null);
    setDraftJerseyNumbers({});
    setSelectedPlayerIds(draftFallbackIds);
  }

  function selectConfirmedOrManagedAthletes() {
    setDraft(null);
    setDraftJerseyNumbers({});
    setSelectedPlayerIds(confirmedOrManagedAthleteIds);
    setGameNotice(
      confirmedOrManagedAthleteIds.length > 0
        ? `${confirmedOrManagedAthleteIds.length} confirmado(s) selecionado(s).`
        : "Nenhum atleta confirmado para selecionar.",
    );
  }

  function selectUnconfirmedAthletes() {
    setDraft(null);
    setDraftJerseyNumbers({});
    setSelectedPlayerIds(unconfirmedAthleteIds);
  }

  function selectAllEligibleAthletes() {
    const nextIds = Array.from(
      new Set([
        ...activeDraftFieldAthleteIds,
        ...activeDraftContractedGoalkeeperIds,
      ]),
    );
    setDraft(null);
    setDraftJerseyNumbers({});
    setSelectedPlayerIds(nextIds);
    setGameNotice(`${nextIds.length} atleta(s) apto(s) selecionado(s).`);
  }

  async function goToLineupDraftStep() {
    if (!selectedGame) {
      return;
    }

    const nextIds =
      selectedPlayerIds.length > 0
        ? selectedPlayerIds
        : confirmedOrManagedAthleteIds;
    if (nextIds.length === 0) {
      setGameNotice(
        "Selecione pelo menos um atleta antes de ir para a escalação.",
      );
      return;
    }

    setDraft(null);
    setDraftJerseyNumbers({});
    setSelectedPlayerIds(nextIds);
    await saveConfirmationSelectionMutation.mutateAsync(nextIds);
    setGameNotice(
      `${nextIds.length} atleta(s) salvo(s) e prontos para o sorteio.`,
    );
    goToGameStep("ESCALACAO");
  }

  function lineupPayloadForSlot(
    lineup: GameLineup,
    side: TeamSide,
    slotIndex: number,
    role?: LineupRole,
  ) {
    return {
      athleteId: lineup.athleteId,
      side,
      role: role ?? (slotIndex === 0 ? "GOALKEEPER" : "STARTER"),
      presence: lineup.presence,
      tacticalSlot: slotIndex + 1,
      jerseyNumber: lineup.jerseyNumber ?? undefined,
      shirtName:
        lineup.shirtName ??
        (side === "RED" ? redUniformName : whiteUniformName),
    };
  }

  async function persistLineupSlot(
    lineup: GameLineup,
    side: "RED" | "WHITE",
    slotIndex: number,
    role?: LineupRole,
  ) {
    if (!selectedGame) {
      return;
    }

    await apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
      method: "POST",
      body: JSON.stringify(lineupPayloadForSlot(lineup, side, slotIndex, role)),
    });
  }

  async function persistLineupReserve(
    lineup: GameLineup,
    side: "RED" | "WHITE",
  ) {
    if (!selectedGame) {
      return;
    }

    await apiRequest(`/sports/games/${selectedGame.id}/lineups`, {
      method: "POST",
      body: JSON.stringify({
        athleteId: lineup.athleteId,
        side,
        role: "RESERVE",
        presence: lineup.presence,
        tacticalSlot: null,
        jerseyNumber: lineup.jerseyNumber ?? undefined,
        shirtName:
          lineup.shirtName ??
          (side === "RED" ? redUniformName : whiteUniformName),
      }),
    });
  }

  function movePlayerToFieldSlot(
    side: "RED" | "WHITE",
    athleteId: string,
    slotIndex: number,
  ) {
    if (!selectedGame) {
      return;
    }

    const sideStarters =
      side === "RED" ? orderedRedStarterLineups : orderedWhiteStarterLineups;
    const target = selectedGameLineups.find(
      (lineup) => lineup.athleteId === athleteId && lineup.role !== "ABSENT",
    );
    const currentAtSlot = sideStarters[slotIndex];
    if (!target) {
      return;
    }
    const targetIsGoalkeeper = isGoalkeeperAthlete(target.athlete);
    if (
      (slotIndex === 0 && !targetIsGoalkeeper) ||
      (slotIndex > 0 && targetIsGoalkeeper)
    ) {
      setGameNotice(
        slotIndex === 0
          ? "Somente goleiro pode ocupar a posição de goleiro."
          : "Goleiro não pode ocupar posição de linha.",
      );
      return;
    }

    void (async () => {
      const updates: Promise<unknown>[] = [
        persistLineupSlot(target, side, slotIndex),
      ];
      if (currentAtSlot && currentAtSlot.athleteId !== target.athleteId) {
        updates.push(persistLineupReserve(currentAtSlot, side));
      }
      await Promise.all(updates);
      await invalidateLineupQueries(queryClient);
    })();
  }

  function swapFieldSlots(
    side: "RED" | "WHITE",
    fromIndex: number,
    toIndex: number,
  ) {
    const sideStarters =
      side === "RED" ? orderedRedStarterLineups : orderedWhiteStarterLineups;
    const moving = sideStarters[fromIndex];
    const displaced = sideStarters[toIndex];
    if (!moving || fromIndex === toIndex) {
      return;
    }

    void (async () => {
      const updates: Promise<unknown>[] = [
        persistLineupSlot(moving, side, toIndex),
      ];
      if (displaced) {
        updates.push(persistLineupSlot(displaced, side, fromIndex));
      }
      await Promise.all(updates);
      await invalidateLineupQueries(queryClient);
    })();
  }

  function moveFieldPlayerToBench(side: "RED" | "WHITE", slotIndex: number) {
    const sideStarters =
      side === "RED" ? orderedRedStarterLineups : orderedWhiteStarterLineups;
    const lineup = sideStarters[slotIndex];
    if (!lineup) {
      return;
    }

    void (async () => {
      await persistLineupReserve(lineup, side);
      await invalidateLineupQueries(queryClient);
    })();
  }

  function resetGameForm() {
    setSelectedGameId(null);
    setGameNotice("");
    setDraft(null);
    setSelectedPlayerIds([]);
    setForm({
      type: "INTERNAL",
      gameMode: "INTERNAL_SPLIT",
      clubSide: "HOME",
      homeClubId: "",
      awayClubId: "",
      homeTeamId: "",
      awayTeamId: "",
      competitionId: "",
      round: "",
      matchNumber: "",
      refereeName: "",
      assistantNames: "",
      assistantOneName: "",
      assistantTwoName: "",
      fourthOfficialName: "",
      reserveAssistantName: "",
      varName: "",
      avarName: "",
      delegateName: "",
      date: dateToInput(new Date()),
      fieldId: "",
      location: "Campo Ribeirão da Ilha",
      address: "",
      cityState: "",
      arrivalTime: "",
      durationMinutes: "90",
      predictedHomeScore: "",
      predictedAwayScore: "",
      championship: "",
      gameValueBRL: "0,00",
      redTeamName: defaultRedUniformName,
      whiteTeamName: defaultWhiteUniformName,
      redUniformKit:
        groupSettings.uniform1Color ||
        encodeTeamKit(
          parseTeamKit(groupSettings.uniform1Color, DEFAULT_RED_UNIFORM_COLOR)
            .primary,
          parseTeamKit(groupSettings.uniform1Color, DEFAULT_RED_UNIFORM_COLOR)
            .accent,
          parseTeamKit(groupSettings.uniform1Color, DEFAULT_RED_UNIFORM_COLOR)
            .style,
          parseTeamKit(groupSettings.uniform1Color, DEFAULT_RED_UNIFORM_COLOR),
        ),
      whiteUniformKit:
        groupSettings.uniform2Color ||
        encodeTeamKit(
          parseTeamKit(groupSettings.uniform2Color, DEFAULT_WHITE_UNIFORM_COLOR)
            .primary,
          parseTeamKit(groupSettings.uniform2Color, DEFAULT_WHITE_UNIFORM_COLOR)
            .accent,
          parseTeamKit(groupSettings.uniform2Color, DEFAULT_WHITE_UNIFORM_COLOR)
            .style,
          parseTeamKit(
            groupSettings.uniform2Color,
            DEFAULT_WHITE_UNIFORM_COLOR,
          ),
        ),
      redUniformColor: defaultRedUniformColor,
      redUniformAccent: "#ffffff",
      redUniformStyle: "SOLID",
      whiteUniformColor: defaultWhiteUniformColor,
      whiteUniformAccent: DEFAULT_RED_UNIFORM_COLOR,
      whiteUniformStyle: "SOLID",
      redScore: "",
      whiteScore: "",
      note: "",
    });
  }

  function updateActivePlan(patch: Partial<TacticalPlanState>) {
    setTacticalPlans((current) => ({
      ...current,
      [activePlan]: {
        ...current[activePlan],
        ...patch,
      },
    }));
  }

  const visibleGameFlowSteps = gameFlowSteps;

  return (
    <section className="min-w-0 space-y-4">
      {currentGamesSubView !== "LISTA" &&
      currentGamesSubView !== "ARBITRAGEM" &&
      currentGamesSubView !== "TACTICA" ? (
        <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {visibleGameFlowSteps.map((step, index) => {
              const active = currentGamesSubView === step.view;
              const completed =
                visibleGameFlowSteps.findIndex(
                  (item) => item.view === currentGamesSubView,
                ) > index;
              return (
                <button
                  key={step.view}
                  type="button"
                  className={`relative grid min-h-[4.75rem] grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-lg border px-3.5 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 ${
                    active
                      ? "border-slate-300 bg-white text-slate-950 shadow-sm"
                      : completed
                        ? "border-emerald-100 bg-white text-slate-950 shadow-sm"
                        : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-white"
                  }`}
                  onClick={() => goToGameStep(step.view)}
                >
                  <span
                    className={`absolute inset-x-0 top-0 h-1 ${
                      active
                        ? "bg-red-600"
                        : completed
                          ? "bg-emerald-500"
                          : "bg-transparent"
                    }`}
                  />
                  <span
                    className={`grid size-9 place-items-center rounded-full text-sm font-black ${
                      active
                        ? "bg-red-600 text-white shadow-sm"
                        : completed
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-white text-slate-500 ring-1 ring-slate-200"
                    }`}
                  >
                    {completed ? <Check size={16} /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black leading-tight text-slate-950">
                      {step.label}
                    </span>
                    <span className="mt-1 block truncate text-xs font-bold leading-tight text-slate-500">
                      {step.helper}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </article>
      ) : null}

      <article
        className={`min-w-0 space-y-4 ${currentGamesSubView === "LISTA" ? "" : "hidden"}`}
      >
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,0.85fr)_minmax(14rem,1.15fr)_minmax(10rem,0.85fr)_auto] xl:items-end">
          <label className="text-sm font-bold text-slate-600">
            Competição
            <select
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-900 shadow-sm"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "ALL" | GameType)
              }
            >
              <option value="ALL">Todas</option>
              <option value="INTERNAL">Internos</option>
              <option value="EXTERNAL">Externos</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-600">
            Categoria
            <select
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-900 shadow-sm"
              value="ALL"
              onChange={() => undefined}
            >
              <option value="ALL">Todas</option>
              <option value="SUB15">Sub-15</option>
              <option value="ADULTO">Adulto</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-600">
            Temporada
            <select
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-900 shadow-sm"
              value={historyYear}
              onChange={(event) =>
                setHistoryYear(Number(event.target.value) || year)
              }
            >
              {[historyYear - 1, historyYear, historyYear + 1].map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-600">
            Período
            <span className="mt-2 flex h-12 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 shadow-sm">
              <CalendarDays size={16} className="text-slate-500" />
              {listPeriodLabel}
            </span>
          </label>
          <label className="text-sm font-bold text-slate-600">
            Status
            <select
              className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm font-black text-slate-900 shadow-sm"
              value={gameStatusFilter}
              onChange={(event) =>
                setGameStatusFilter(
                  event.target.value as "ALL" | Game["status"],
                )
              }
            >
              <option value="ALL">Todos</option>
              <option value="SCHEDULED">Agendados</option>
              <option value="RUNNING">Ao vivo</option>
              <option value="PAUSED">Pausados</option>
              <option value="FINISHED">Finalizados</option>
              <option value="CANCELED">Cancelados</option>
            </select>
          </label>
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => {
              setTypeFilter("ALL");
              setGameStatusFilter("ALL");
              setShowWholeYear(false);
              setGameSearch("");
            }}
          >
            <Filter size={16} />
            Limpar filtros
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid min-w-[88rem] grid-cols-[8rem_minmax(19rem,1.6fr)_minmax(11rem,0.9fr)_7rem_7.5rem_minmax(11rem,0.95fr)_8.5rem_10rem] items-center bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            <span>Data</span>
            <span>Jogo</span>
            <span>Competição</span>
            <span>Categoria</span>
            <span>Tipo</span>
            <span>Local</span>
            <span>Status</span>
            <span className="text-right">Ações</span>
          </div>
          <div className="divide-y divide-slate-100">
            {gamesQuery.isLoading ? (
              <p className="px-4 py-6 text-sm font-semibold text-slate-500">
                Carregando jogos...
              </p>
            ) : null}
            {!gamesQuery.isLoading && listedGames.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-bold text-slate-600">
                  Nenhum jogo lançado nesse filtro.
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700"
                  onClick={() => goToGameStep("CADASTRO")}
                >
                  Cadastrar primeiro jogo
                </button>
              </div>
            ) : null}
            {listedGames.map((game) => {
              const hasLineup = (game.lineups ?? []).some(
                (lineup) => lineup.role !== "ABSENT",
              );
              const score =
                game.homeScore !== null || game.awayScore !== null
                  ? `${game.homeScore ?? 0} x ${game.awayScore ?? 0}`
                  : game.redScore !== null || game.whiteScore !== null
                    ? `${game.redScore ?? 0} x ${game.whiteScore ?? 0}`
                    : "Sem placar";
              const homeTeam = game.homeTeamId
                ? teams.find((team) => team.id === game.homeTeamId)
                : null;
              const awayTeam = game.awayTeamId
                ? teams.find((team) => team.id === game.awayTeamId)
                : null;
              const internalRedTeam = teams.find((team) =>
                [team.name, team.shirtName].some(
                  (value) => value === game.redTeamName,
                ),
              );
              const category =
                homeTeam?.category ||
                awayTeam?.category ||
                internalRedTeam?.category ||
                null;
              const competitionTitle =
                game.championship ||
                game.round ||
                (game.type === "INTERNAL" ? "Campeonato interno" : "Amistoso");
              const competitionSubtitle =
                game.round ||
                (game.type === "EXTERNAL" ? "Amistoso 2026" : "1ª fase");
              const locationParts = [game.field?.city, game.field?.state]
                .filter(Boolean)
                .join(" - ");
              const typeClass =
                game.type === "INTERNAL"
                  ? "bg-red-50 text-red-700"
                  : "bg-blue-50 text-blue-700";
              const statusClass =
                game.status === "CANCELED"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : game.status === "FINISHED"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : hasLineup
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-blue-100 bg-blue-50 text-blue-700";
              const statusLabel =
                game.status === "CANCELED"
                  ? "Cancelado"
                  : game.status === "FINISHED"
                    ? "Finalizado"
                    : hasLineup
                      ? "Confirmado"
                      : "Agendado";
              const gameHomeName =
                game.type === "INTERNAL"
                  ? (game.redTeamName ?? defaultRedUniformName)
                  : (game.homeClub?.name ?? game.redTeamName ?? "Mandante");
              const gameAwayName =
                game.type === "INTERNAL"
                  ? (game.whiteTeamName ?? defaultWhiteUniformName)
                  : (game.awayClub?.name ?? game.whiteTeamName ?? "Visitante");
              const homeLogoUrl =
                game.type === "INTERNAL"
                  ? game.redCrestUrl
                  : game.homeClub?.logoUrl;
              const awayLogoUrl =
                game.type === "INTERNAL"
                  ? game.whiteCrestUrl
                  : game.awayClub?.logoUrl;
              return (
                <div
                  key={game.id}
                  className="grid min-h-20 min-w-[88rem] grid-cols-[8rem_minmax(19rem,1.6fr)_minmax(11rem,0.9fr)_7rem_7.5rem_minmax(11rem,0.95fr)_8.5rem_10rem] items-center gap-0 px-4 py-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm">
                      <CalendarDays size={14} />
                    </span>
                    <span className="min-w-0">
                      <p className="whitespace-nowrap font-black text-slate-950">
                        {formatDate(game.date)}
                      </p>
                      <p className="whitespace-nowrap text-xs font-semibold text-slate-500">
                        {new Intl.DateTimeFormat("pt-BR", {
                          weekday: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                          .format(new Date(game.date))
                          .replace(".", "")}
                      </p>
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 pr-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50">
                      {homeLogoUrl ? (
                        <img
                          src={homeLogoUrl}
                          alt={gameHomeName}
                          className="size-6 object-contain"
                        />
                      ) : (
                        <ShieldCheck size={16} className="text-slate-700" />
                      )}
                    </span>
                    <p className="min-w-0 flex-1 truncate font-black text-slate-950">
                      {gameHomeName}
                    </p>
                    <span className="shrink-0 text-xs font-black text-slate-400">
                      x
                    </span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50">
                      {awayLogoUrl ? (
                        <img
                          src={awayLogoUrl}
                          alt={gameAwayName}
                          className="size-6 object-contain"
                        />
                      ) : (
                        <ShieldCheck size={16} className="text-red-700" />
                      )}
                    </span>
                    <p className="min-w-0 flex-1 truncate font-black text-slate-950">
                      {gameAwayName}
                    </p>
                    {score !== "Sem placar" ? (
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
                        {score}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">
                      {competitionTitle}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {competitionSubtitle}
                    </p>
                  </div>
                  <span className="font-bold text-slate-700">
                    {category
                      ? (teamCategoryLabels[category] ?? category)
                      : "-"}
                  </span>
                  <span
                    className={`inline-flex h-8 w-fit items-center gap-1.5 self-center whitespace-nowrap rounded-lg border border-current/10 px-2.5 text-xs font-black ${typeClass}`}
                  >
                    <Goal size={13} />
                    {game.type === "INTERNAL" ? "Interno" : "Amistoso"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">
                      {game.location}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {locationParts || game.field?.surface || "Local do jogo"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex h-8 w-fit items-center gap-1.5 self-center whitespace-nowrap rounded-lg border px-2.5 text-xs font-black ${statusClass}`}
                  >
                    <CalendarDays size={13} />
                    {statusLabel}
                  </span>
                  <div className="flex flex-nowrap justify-end gap-1.5">
                    <button
                      type="button"
                      title="Editar jogo"
                      aria-label="Editar jogo"
                      className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                      onClick={() => editGame(game)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      title="Escalação"
                      aria-label="Escalação"
                      className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                      onClick={() => goToGameStep("ESCALACAO", game)}
                    >
                      <Users size={16} />
                    </button>
                    <button
                      type="button"
                      title="Súmula"
                      aria-label="Súmula"
                      className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                      onClick={() => goToGameStep("EVENTOS", game)}
                    >
                      <ClipboardList size={16} />
                    </button>
                    <button
                      type="button"
                      title="Mais ações"
                      aria-label="Mais ações"
                      className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-50"
                    >
                      <MoreVertical size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-600">
              Mostrando {listedGames.length > 0 ? 1 : 0} a {listedGames.length}{" "}
              de {games.length} jogos
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-400"
                aria-label="Página anterior"
              >
                <ChevronRight size={16} className="rotate-180" />
              </button>
              {[1, 2, 3, 4].map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`grid size-9 place-items-center rounded-lg border text-sm font-black ${pageNumber === 1 ? "border-red-600 bg-red-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                aria-label="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.08em] text-red-600">Agenda</p>
                <h2 className="text-lg font-black text-slate-950">Status dos jogos</h2>
              </div>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{games.length} jogos</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={gameStatusChart.length ? gameStatusChart : [{ name: "Sem jogos", value: 1, color: "#e5e7eb" }]} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                  <Bar dataKey="value" name="Jogos" radius={[8, 8, 0, 0]}>
                    {(gameStatusChart.length ? gameStatusChart : [{ name: "Sem jogos", value: 1, color: "#e5e7eb" }]).map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(gameTypeChart.length ? gameTypeChart : [{ name: "Sem tipo", value: 0, color: "#e5e7eb" }]).map((item) => (
                <div key={item.name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <strong className="text-sm font-black text-slate-950">{item.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-700">Operação do jogo</p>
              <h2 className="text-lg font-black text-slate-950">Confirmação e times</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative h-48">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie data={dashboardConfirmationChart.length ? dashboardConfirmationChart : [{ name: "Sem escalação", value: 1, color: "#e5e7eb" }]} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={4}>
                      {(dashboardConfirmationChart.length ? dashboardConfirmationChart : [{ name: "Sem escalação", value: 1, color: "#e5e7eb" }]).map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <strong className="text-lg font-black text-slate-950">{dashboardConfirmationPercent}%</strong>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={dashboardTeamsChart} margin={{ top: 12, right: 8, bottom: 0, left: -18 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#dbe3ee" }} />
                    <Bar dataKey="value" name="Atletas" radius={[8, 8, 0, 0]}>
                      {dashboardTeamsChart.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </article>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              icon: Goal,
              title: "Tipo Interno",
              text: "Jogos entre equipes da mesma organização.",
              className: "bg-red-50 text-red-700",
            },
            {
              icon: ShieldCheck,
              title: "Tipo Externo",
              text: "Jogos contra equipes de outras organizações.",
              className: "bg-blue-50 text-blue-700",
            },
            {
              icon: CalendarDays,
              title: "Status Confirmado",
              text: "Jogo confirmado e programado.",
              className: "bg-emerald-50 text-emerald-700",
            },
            {
              icon: Clock3,
              title: "Status Pendente",
              text: "Jogo aguardando confirmação.",
              className: "bg-amber-50 text-amber-700",
            },
            {
              icon: CircleOff,
              title: "Status Cancelado",
              text: "Jogo cancelado ou suspenso.",
              className: "bg-slate-100 text-slate-600",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-lg ${item.className}`}
                >
                  <Icon size={20} />
                </span>
                <span>
                  <strong className="block text-sm font-black text-slate-950">
                    {item.title}
                  </strong>
                  <span className="mt-1 block text-sm font-semibold leading-5 text-slate-500">
                    {item.text}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </article>

      <article className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <div className="min-w-0 border-b border-slate-200 bg-slate-50 p-4 text-slate-950 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                  Painel de jogos
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {dashboardGame
                    ? dashboardGame.location
                    : "Nenhum jogo no período"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {dashboardGame
                    ? `${formatDateTime(dashboardGame.date)} · ${gameTypeLabels[dashboardGame.type]}`
                    : "Cadastre um jogo para liberar agenda, confirmações e escalação."}
                </p>
              </div>
              {dashboardGame ? (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${new Date(dashboardGame.date).getTime() >= nowMs ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {new Date(dashboardGame.date).getTime() >= nowMs
                    ? "Próximo jogo"
                    : "Último jogo"}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Jogos",
                  value: games.length,
                  helper: showWholeYear
                    ? String(historyYear)
                    : `${String(month).padStart(2, "0")}/${historyYear}`,
                },
                {
                  label: "Próximos",
                  value: upcomingGames.length,
                  helper: "na agenda",
                },
                {
                  label: "Escalados",
                  value: gamesWithLineup,
                  helper: "com times",
                },
                {
                  label: "Súmulas",
                  value: gamesWithResult,
                  helper: "com placar",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                    {item.label}
                  </p>
                  <strong className="mt-1 block text-2xl font-black text-slate-950">
                    {item.value}
                  </strong>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {item.helper}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: "Novo jogo", view: "CADASTRO" as const },
                { label: "Agenda", view: "AGENDA" as const },
                { label: "Arbitragem", view: "ARBITRAGEM" as const },
                { label: "Confirmações", view: "CONFIRMACOES" as const },
                { label: "Escalação", view: "ESCALACAO" as const },
                { label: "Súmula", view: "EVENTOS" as const },
              ].map((item) => (
                <button
                  key={item.view}
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm font-black ${currentGamesSubView === item.view ? "border-red-600 bg-red-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                  onClick={() => {
                    goToGameStep(
                      item.view,
                      item.view !== "CADASTRO" ? dashboardGame : null,
                    );
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Operação do próximo jogo
                </h3>
                <p className="text-sm font-semibold text-slate-500">
                  Confirmação, escalação e pendências em um só lugar.
                </p>
              </div>
              <ShieldCheck
                className={
                  dashboardLineupReady ? "text-emerald-600" : "text-slate-300"
                }
                size={24}
              />
            </div>

            {dashboardGame ? (
              <>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-500">
                      Confirmações
                    </p>
                    <strong className="mt-1 block text-2xl font-black text-slate-950">
                      {dashboardConfirmationPercent}%
                    </strong>
                    <p className="text-xs font-semibold text-slate-500">
                      {dashboardConfirmedLineups.length}/
                      {dashboardActiveLineups.length} responderam
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-500">Times</p>
                    <strong className="mt-1 block text-2xl font-black text-slate-950">
                      {dashboardRedPlayers} x {dashboardWhitePlayers}
                    </strong>
                    <p className="text-xs font-semibold text-slate-500">
                      {dashboardLineupReady
                        ? "Escalação completa"
                        : "Aguardando escalação"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-500">Baixas</p>
                    <strong className="mt-1 block text-2xl font-black text-red-600">
                      {dashboardUnavailableLineups.length}
                    </strong>
                    <p className="text-xs font-semibold text-slate-500">
                      fora ou sem presença
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-red-600"
                    style={{ width: `${dashboardConfirmationPercent}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                    onClick={() => goToGameStep("CONFIRMACOES", dashboardGame)}
                  >
                    <CheckCircle2 size={16} />
                    Ver confirmações
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-black text-white hover:bg-red-700"
                    onClick={() => goToGameStep("ESCALACAO", dashboardGame)}
                  >
                    <Shuffle size={16} />
                    Montar times
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Sem jogo cadastrado para este filtro. Use o atalho Novo jogo
                para iniciar a agenda.
              </div>
            )}
          </div>
        </div>
      </article>

      <div className="space-y-4">
        <div className="space-y-4">
          {currentGamesSubView === "CADASTRO" ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 ring-1 ring-red-100">
                    <CalendarDays size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-slate-950">
                      Dados do jogo
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Preencha as informações principais do jogo.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  onClick={resetGameForm}
                >
                  Novo jogo
                </button>
              </div>

              {gameNotice ? (
                <p className="mx-4 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 sm:mx-5">
                  {gameNotice}
                </p>
              ) : null}

              <form
                className="grid gap-5 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_16rem] sm:px-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveGameMutation.mutateAsync({
                    nextStep: "AGENDA",
                    notice: "Jogo registrado. Próxima etapa: agenda.",
                  });
                }}
              >
                <div className="min-w-0 space-y-6">
                  <section className="space-y-3">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      Informações principais
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="text-sm font-bold text-slate-600">
                        <span className="flex items-center justify-between gap-2">
                          <span>
                            Competição <span className="text-red-600">*</span>
                          </span>
                          <Link
                            className="text-xs font-black text-blue-700 hover:text-blue-900"
                            to="/competicoes"
                          >
                            Nova competição
                          </Link>
                        </span>
                        <select
                          className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                          value={form.competitionId}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              competitionId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione a competição</option>
                          {competitions.map((competition) => (
                            <option key={competition.id} value={competition.id}>
                              {competition.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-bold text-slate-600">
                        Tipo de jogo <span className="text-red-600">*</span>
                        <select
                          className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                          value={form.type}
                          onChange={(event) => {
                            const nextType = event.target.value as GameType;
                            setForm((prev) => ({
                              ...prev,
                              type: nextType,
                              gameMode:
                                nextType === "EXTERNAL"
                                  ? "EXTERNAL_FRIENDLY"
                                  : "INTERNAL_SPLIT",
                              clubSide:
                                nextType === "EXTERNAL"
                                  ? prev.clubSide
                                  : "HOME",
                              homeClubId:
                                nextType === "EXTERNAL"
                                  ? prev.homeClubId ||
                                    homeClubOptions[0]?.id ||
                                    ""
                                  : "",
                              awayClubId:
                                nextType === "EXTERNAL"
                                  ? prev.awayClubId ||
                                    awayClubOptions[0]?.id ||
                                    ""
                                  : "",
                              homeTeamId:
                                nextType === "EXTERNAL" ? prev.homeTeamId : "",
                              awayTeamId:
                                nextType === "EXTERNAL" ? prev.awayTeamId : "",
                              competitionId: prev.competitionId,
                            }));
                          }}
                        >
                          <option value="INTERNAL">Interno</option>
                          <option value="EXTERNAL">Externo</option>
                        </select>
                      </label>
                      <label className="text-sm font-bold text-slate-600">
                        Categoria <span className="text-red-600">*</span>
                        <select
                          className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                          value={form.championship}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              championship: event.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione a categoria</option>
                          <option value="Principal">Principal</option>
                          <option value="Veterano">Veterano</option>
                          <option value="Base">Base</option>
                          <option value="Misto">Misto</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_13rem]">
                      {isExternalGameForm ? (
                        <>
                          <label className="text-sm font-bold text-slate-600">
                            Mandante <span className="text-red-600">*</span>
                            <select
                              className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                              value={form.homeClubId}
                              onChange={(event) =>
                                applyExternalSideIdentity(
                                  "HOME",
                                  event.target.value,
                                  "",
                                )
                              }
                              required
                            >
                              <option value="">
                                Selecione o time mandante
                              </option>
                              {homeClubOptions.map((club) => (
                                <option key={club.id} value={club.id}>
                                  {club.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm font-bold text-slate-600">
                            Visitante <span className="text-red-600">*</span>
                            <select
                              className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                              value={form.awayClubId}
                              onChange={(event) =>
                                applyExternalSideIdentity(
                                  "AWAY",
                                  event.target.value,
                                  "",
                                )
                              }
                              required
                            >
                              <option value="">
                                Selecione o time visitante
                              </option>
                              {awayClubOptions.map((club) => (
                                <option key={club.id} value={club.id}>
                                  {club.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="text-sm font-bold text-slate-600">
                            Mandante <span className="text-red-600">*</span>
                            <input
                              list="internal-home-team-suggestions"
                              className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                              value={form.redTeamName}
                              onChange={(event) =>
                                chooseInternalTeamName(
                                  "RED",
                                  event.target.value,
                                )
                              }
                              placeholder="Ex.: GestaSports Azul"
                              required
                              minLength={2}
                            />
                            <datalist id="internal-home-team-suggestions">
                              {internalTeamNameOptions.map((option) => (
                                <option
                                  key={`home-${option.key}`}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </datalist>
                          </label>
                          <label className="text-sm font-bold text-slate-600">
                            Visitante <span className="text-red-600">*</span>
                            <input
                              list="internal-away-team-suggestions"
                              className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                              value={form.whiteTeamName}
                              onChange={(event) =>
                                chooseInternalTeamName(
                                  "WHITE",
                                  event.target.value,
                                )
                              }
                              placeholder="Ex.: GestaSports Branco"
                              required
                              minLength={2}
                            />
                            <datalist id="internal-away-team-suggestions">
                              {internalTeamNameOptions.map((option) => (
                                <option
                                  key={`away-${option.key}`}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </datalist>
                            {!internalTeamsHaveValidNames ? (
                              <span className="mt-1 block text-xs font-black text-red-600">
                                Mandante e visitante precisam ter nomes
                                diferentes.
                              </span>
                            ) : null}
                          </label>
                        </>
                      )}
                      <label className="text-sm font-bold text-slate-600">
                        Placar previsto{" "}
                        <span className="font-semibold text-slate-400">
                          (opcional)
                        </span>
                        <div className="mt-1 grid h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-center text-sm font-semibold"
                            value={form.predictedHomeScore}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                predictedHomeScore: event.target.value,
                              }))
                            }
                          />
                          <span className="text-xs font-black text-slate-400">
                            x
                          </span>
                          <input
                            type="number"
                            min={0}
                            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-center text-sm font-semibold"
                            value={form.predictedAwayScore}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                predictedAwayScore: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </label>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      <label className="text-sm font-bold text-slate-600">
                        Endereço
                        <input
                          className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold"
                          value={form.address}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              address: event.target.value,
                            }))
                          }
                          placeholder="Informe o endereço do local"
                        />
                      </label>
                      <label className="text-sm font-bold text-slate-600">
                        Cidade / Estado
                        <input
                          className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold"
                          value={form.cityState}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              cityState: event.target.value,
                            }))
                          }
                          placeholder="Informe a cidade / estado"
                        />
                      </label>
                      <label className="text-sm font-bold text-slate-600">
                        Campo cadastrado <span className="text-red-600">*</span>
                        <select
                          className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                          value={form.fieldId}
                          onChange={(event) =>
                            applyGameField(event.target.value)
                          }
                        >
                          <option value="">Selecione o campo / local</option>
                          {gameFields.map((field) => (
                            <option key={field.id} value={field.id}>
                              {fieldDisplayName(field)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block text-sm font-bold text-slate-600">
                      Local/endereço do jogo{" "}
                      <span className="text-red-600">*</span>
                      <div className="relative mt-1">
                        <MapPin
                          size={18}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          className="h-11 w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm font-semibold"
                          value={form.location}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              location: event.target.value,
                            }))
                          }
                          required
                          placeholder="Campo Ribeirão da Ilha"
                        />
                      </div>
                    </label>
                  </section>

                  <section className="space-y-3">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                      Data e horário
                    </p>
                    <div className="grid gap-3 md:grid-cols-4">
                      <label className="text-sm font-bold text-slate-600">
                        Data do jogo <span className="text-red-600">*</span>
                        <div className="relative mt-1">
                          <CalendarDays
                            size={17}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="date"
                            className="h-11 w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm font-semibold"
                            value={datePartFromInput(form.date)}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                date: setDatePartOnInput(
                                  prev.date,
                                  event.target.value,
                                ),
                              }))
                            }
                            required
                          />
                        </div>
                      </label>
                      <label className="text-sm font-bold text-slate-600">
                        Hora <span className="text-red-600">*</span>
                        <div className="relative mt-1">
                          <Clock3
                            size={17}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="time"
                            className="h-11 w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm font-semibold"
                            value={timePartFromInput(form.date)}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                date: setTimePartOnInput(
                                  prev.date,
                                  event.target.value,
                                ),
                              }))
                            }
                            required
                          />
                        </div>
                      </label>
                      <label className="text-sm font-bold text-slate-600">
                        Chegada{" "}
                        <span className="font-semibold text-slate-400">
                          (opcional)
                        </span>
                        <div className="relative mt-1">
                          <Clock3
                            size={17}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            type="time"
                            className="h-11 w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm font-semibold"
                            value={form.arrivalTime}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                arrivalTime: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </label>
                      <label className="text-sm font-bold text-slate-600">
                        Duração{" "}
                        <span className="font-semibold text-slate-400">
                          (opcional)
                        </span>
                        <div className="mt-1 flex h-11 overflow-hidden rounded-lg border border-slate-200">
                          <input
                            type="number"
                            min={1}
                            className="min-w-0 flex-1 px-3 text-sm font-semibold outline-none"
                            value={form.durationMinutes}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                durationMinutes: event.target.value.replace(
                                  /\D/g,
                                  "",
                                ),
                              }))
                            }
                          />
                          <span className="grid w-12 place-items-center bg-slate-50 text-xs font-black text-slate-500">
                            min
                          </span>
                        </div>
                      </label>
                    </div>
                  </section>

                  {isExternalGameForm ? (
                    <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                        Detalhes do jogo externo
                      </p>
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="text-sm font-bold text-slate-600">
                          Nosso clube atua como
                          <select
                            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
                            value={form.clubSide}
                            onChange={(event) =>
                              applyExternalClubSide(
                                event.target.value as "HOME" | "AWAY",
                              )
                            }
                          >
                            <option value="HOME">Mandante</option>
                            <option value="AWAY">Visitante</option>
                          </select>
                        </label>
                        <label className="text-sm font-bold text-slate-600">
                          Tipo da partida
                          <select
                            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
                            value={form.gameMode}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                gameMode: event.target.value as GameMode,
                              }))
                            }
                          >
                            <option value="EXTERNAL_FRIENDLY">
                              Amistoso externo
                            </option>
                            <option value="CHAMPIONSHIP">Campeonato</option>
                            <option value="TOURNAMENT">Torneio</option>
                            <option value="FRIENDLY">Amistoso</option>
                            <option value="TRAINING">Treino</option>
                          </select>
                        </label>
                        <label className="text-sm font-bold text-slate-600">
                          Rodada/fase
                          <input
                            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
                            value={form.round}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                round: event.target.value,
                              }))
                            }
                            placeholder="Ex.: Rodada 1"
                          />
                        </label>
                      </div>
                    </section>
                  ) : null}

                  <section>
                    <label className="block text-sm font-bold text-slate-600">
                      Observações{" "}
                      <span className="font-semibold text-slate-400">
                        (opcional)
                      </span>
                      <textarea
                        className="mt-1 min-h-24 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                        maxLength={300}
                        value={form.note}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            note: event.target.value,
                          }))
                        }
                        placeholder="Informações adicionais sobre o jogo..."
                      />
                    </label>
                    <p className="mt-1 text-right text-xs font-bold text-slate-400">
                      {form.note.length}/300
                    </p>
                  </section>

                  {saveGameMutation.isError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                      {(saveGameMutation.error instanceof Error &&
                        saveGameMutation.error.message) ||
                        "Falha ao salvar jogo."}
                    </p>
                  ) : null}
                </div>

                <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-red-600">
                      <Lightbulb size={18} />
                      <h3 className="text-sm font-black">Dicas</h3>
                    </div>
                    <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                      Preencha corretamente os dados para facilitar as próximas
                      etapas como escalação, súmula e estatísticas.
                    </p>
                    <div className="mt-4 rounded-lg border border-red-100 bg-white p-3">
                      <p className="text-sm font-black text-red-600">
                        Campos obrigatórios
                      </p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                        Os campos com asterisco são obrigatórios.
                      </p>
                    </div>
                  </div>
                </aside>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 lg:col-span-2">
                  <button
                    type="button"
                    className={buttonStyles.secondary}
                    onClick={() => goToGameStep("LISTA")}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      saveGameMutation.isPending ||
                      !form.location.trim() ||
                      !form.date ||
                      !internalTeamsHaveValidNames ||
                      (isExternalGameForm &&
                        (!form.homeClubId || !form.awayClubId))
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {saveGameMutation.isPending
                      ? "Salvando..."
                      : "Salvar e continuar"}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </form>
            </article>
          ) : null}

          {showLegacyGameForm && currentGamesSubView === "CADASTRO" ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    {selectedGameId ? "Editar jogo" : "Lançar jogo"}
                  </h2>
                </div>
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  onClick={resetGameForm}
                >
                  Novo jogo
                </button>
              </div>
              {gameNotice ? (
                <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {gameNotice}
                </p>
              ) : null}

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveGameMutation.mutateAsync({
                    nextStep: "AGENDA",
                    notice: "Jogo registrado. Próxima etapa: agenda.",
                  });
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-600">
                    Tipo
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.type}
                      onChange={(event) => {
                        const nextType = event.target.value as GameType;
                        setForm((prev) => ({
                          ...prev,
                          type: nextType,
                          gameMode:
                            nextType === "EXTERNAL"
                              ? "EXTERNAL_FRIENDLY"
                              : "INTERNAL_SPLIT",
                          clubSide:
                            nextType === "EXTERNAL" ? prev.clubSide : "HOME",
                          homeClubId:
                            nextType === "EXTERNAL"
                              ? prev.homeClubId || homeClubOptions[0]?.id || ""
                              : "",
                          awayClubId:
                            nextType === "EXTERNAL"
                              ? prev.awayClubId || awayClubOptions[0]?.id || ""
                              : "",
                          homeTeamId:
                            nextType === "EXTERNAL" ? prev.homeTeamId : "",
                          awayTeamId:
                            nextType === "EXTERNAL" ? prev.awayTeamId : "",
                          competitionId: prev.competitionId,
                        }));
                      }}
                    >
                      <option value="INTERNAL">Interno</option>
                      <option value="EXTERNAL">Externo</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Data e horário
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.date}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          date: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                {isExternalGameForm ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                      <label className="text-sm font-medium text-slate-600">
                        Nosso clube atua como
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.clubSide}
                          onChange={(event) =>
                            applyExternalClubSide(
                              event.target.value as "HOME" | "AWAY",
                            )
                          }
                        >
                          <option value="HOME">Mandante</option>
                          <option value="AWAY">Visitante</option>
                        </select>
                      </label>
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                        {form.clubSide === "HOME"
                          ? "O nosso clube fica no lado mandante, e o adversário entra como visitante."
                          : "O adversário fica como mandante, e o nosso clube entra como visitante."}
                      </div>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <label className="text-sm font-medium text-slate-600">
                        Tipo da partida
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.gameMode}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              gameMode: event.target.value as GameMode,
                            }))
                          }
                        >
                          <option value="EXTERNAL_FRIENDLY">
                            Amistoso externo
                          </option>
                          <option value="CHAMPIONSHIP">Campeonato</option>
                          <option value="TOURNAMENT">Torneio</option>
                          <option value="FRIENDLY">Amistoso</option>
                          <option value="TRAINING">Treino</option>
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        Clube mandante
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.homeClubId}
                          onChange={(event) =>
                            applyExternalSideIdentity(
                              "HOME",
                              event.target.value,
                              "",
                            )
                          }
                          required
                        >
                          <option value="">Selecionar</option>
                          {homeClubOptions.map((club) => (
                            <option key={club.id} value={club.id}>
                              {club.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        Equipe mandante
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.homeTeamId}
                          onChange={(event) =>
                            applyExternalSideIdentity(
                              "HOME",
                              form.homeClubId,
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Sem equipe</option>
                          {homeTeamOptions.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        Clube visitante
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.awayClubId}
                          onChange={(event) =>
                            applyExternalSideIdentity(
                              "AWAY",
                              event.target.value,
                              "",
                            )
                          }
                          required
                        >
                          <option value="">Selecionar</option>
                          {awayClubOptions.map((club) => (
                            <option key={club.id} value={club.id}>
                              {club.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        Equipe visitante
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.awayTeamId}
                          onChange={(event) =>
                            applyExternalSideIdentity(
                              "AWAY",
                              form.awayClubId,
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Sem equipe</option>
                          {awayTeamOptions.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        Competição
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.competitionId}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              competitionId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Sem competição</option>
                          {competitions.map((competition) => (
                            <option key={competition.id} value={competition.id}>
                              {competition.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <label className="text-sm font-medium text-slate-600">
                        Rodada/fase
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.round}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              round: event.target.value,
                            }))
                          }
                          placeholder="Ex.: Rodada 1"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        Nº jogo
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.matchNumber}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              matchNumber: event.target.value.replace(
                                /\D/g,
                                "",
                              ),
                            }))
                          }
                          placeholder="Opcional"
                        />
                      </label>
                    </div>
                    {clubs.length === 0 ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
                        Cadastre o clube principal e o adversário em Clubes
                        antes de lançar jogo externo.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-[minmax(14rem,0.85fr)_minmax(0,1fr)_10rem]">
                  <label className="text-sm font-medium text-slate-600">
                    Campo cadastrado
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={form.fieldId}
                      onChange={(event) => applyGameField(event.target.value)}
                    >
                      <option value="">Sem campo vinculado</option>
                      {gameFields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {fieldDisplayName(field)}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">
                      O campo é um local único do clube, não uma equipe.
                    </span>
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Local/endereço do jogo
                    <div className="relative mt-1">
                      <MapPin
                        size={18}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3"
                        value={form.location}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            location: event.target.value,
                          }))
                        }
                        required
                        placeholder="Campo Ribeirão da Ilha"
                      />
                    </div>
                    {selectedField?.address ? (
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        {selectedField.address}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Custo do campo
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.gameValueBRL}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          gameValueBRL: event.target.value,
                        }))
                      }
                      placeholder="350,00"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-600">
                    Campeonato
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.championship}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          championship: event.target.value,
                        }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Observações
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.note}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                </div>

                <div className="hidden">
                  <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                    Resultado depois do jogo
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-600">
                      Gols camisa principal
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        value={form.redScore}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            redScore: event.target.value,
                          }))
                        }
                        placeholder="Opcional"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Gols camisa reserva
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                        value={form.whiteScore}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            whiteScore: event.target.value,
                          }))
                        }
                        placeholder="Opcional"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    saveGameMutation.isPending ||
                    !form.location.trim() ||
                    !form.date ||
                    !internalTeamsHaveValidNames ||
                    (isExternalGameForm &&
                      (!form.homeClubId || !form.awayClubId))
                  }
                  className="w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {saveGameMutation.isPending
                    ? "Salvando..."
                    : selectedGameId
                      ? "Salvar jogo"
                      : "Lançar jogo e selecionar"}
                </button>
                {saveGameMutation.isError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {(saveGameMutation.error instanceof Error &&
                      saveGameMutation.error.message) ||
                      "Falha ao salvar jogo."}
                  </p>
                ) : null}
              </form>
            </article>
          ) : null}
        </div>

        <div className="space-y-4">
          {currentGamesSubView === "AGENDA" ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <GameAgendaToolbar
                historyYear={historyYear}
                fallbackYear={year}
                showWholeYear={showWholeYear}
                typeFilter={typeFilter}
                notice={gameNotice}
                onHistoryYearChange={setHistoryYear}
                onShowWholeYearChange={setShowWholeYear}
                onTypeFilterChange={setTypeFilter}
              />

              <div
                className={
                  agendaViewMode === "CALENDARIO"
                    ? "grid gap-4 xl:grid-cols-[minmax(28rem,1.05fr)_minmax(24rem,0.95fr)]"
                    : "space-y-3"
                }
              >
                {agendaViewMode === "CALENDARIO" ? (
                  <GameAgendaCalendar
                    historyYear={historyYear}
                    month={month}
                    monthLabel={agendaMonthLabel}
                    selectedDate={selectedAgendaDate}
                    cells={calendarCells}
                    gamesByDay={gamesByDay}
                    onSelectedDateChange={setSelectedAgendaDate}
                  />
                ) : null}

                <div
                  className={
                    agendaViewMode === "CALENDARIO"
                      ? "min-w-0 rounded-lg border border-slate-200 bg-white p-4"
                      : "space-y-3"
                  }
                >
                  {agendaViewMode === "CALENDARIO" ? (
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-black capitalize text-slate-950">
                          {formatLongDate(selectedAgendaDate)}
                        </h2>
                        <p className="text-sm font-semibold text-slate-600">
                          {selectedAgendaGames.length}{" "}
                          {selectedAgendaGames.length === 1
                            ? "jogo encontrado"
                            : "jogos encontrados"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={buttonStyles.secondary}
                        onClick={() => goToGameStep("LISTA")}
                      >
                        Ver lista completa
                      </button>
                    </div>
                  ) : null}

                  {agendaListGames.map((game) => (
                    <GameAgendaCard
                      key={game.id}
                      game={game}
                      selected={selectedGame?.id === game.id}
                      defaultRedName={defaultRedUniformName}
                      defaultWhiteName={defaultWhiteUniformName}
                      defaultRedColor={defaultRedUniformColor}
                      defaultWhiteColor={defaultWhiteUniformColor}
                      configuredRedName={groupSettings.uniform1Name}
                      configuredWhiteName={groupSettings.uniform2Name}
                      configuredRedColor={groupSettings.uniform1Color}
                      configuredWhiteColor={groupSettings.uniform2Color}
                      internalLogoUrl={internalGameLogoUrl}
                      cancelPending={deleteGameMutation.isPending}
                      resolveInternalShirt={shirtIdentityForInternalSide}
                      splitLineups={splitLineupsByStarterLimit}
                      onConfirmations={(selected) =>
                        goToGameStep("CONFIRMACOES", selected)
                      }
                      onOfficials={(selected) =>
                        goToGameStep("ARBITRAGEM", selected)
                      }
                      onLineup={(selected) =>
                        goToGameStep("ESCALACAO", selected)
                      }
                      onPrint={printGameLineup}
                      onEdit={editGame}
                      onCancel={(selected) => {
                        setCancelGameId(selected.id);
                        setCancelReason("Campo impraticável");
                        setCancelNote("");
                      }}
                    />
                  ))}
                  {agendaViewMode === "CALENDARIO" &&
                  !gamesQuery.isLoading &&
                  agendaListGames.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                      Nenhum jogo nesta data.
                    </p>
                  ) : null}
                </div>
              </div>
              {!gamesQuery.isLoading && games.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nenhum jogo encontrado.
                </p>
              ) : null}
            </article>
          ) : null}

          {currentGamesSubView === "ARBITRAGEM" ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                    Etapa opcional
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    Cadastro de arbitragem
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Use somente quando o jogo tiver árbitro ou equipe de
                    arbitragem definida.
                  </p>
                </div>
                <select
                  className="min-w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                  value={selectedGame?.id ?? ""}
                  onChange={(event) => {
                    const game = games.find(
                      (item) => item.id === event.target.value,
                    );
                    if (game) {
                      selectGame(game);
                      loadOfficialsFromGame(game);
                    }
                  }}
                >
                  <option value="">Selecione um jogo</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {formatDateTime(game.date)} -{" "}
                      {game.redTeamName ?? defaultRedUniformName} x{" "}
                      {game.whiteTeamName ?? defaultWhiteUniformName}
                    </option>
                  ))}
                </select>
              </div>

              {gameNotice ? (
                <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {gameNotice}
                </p>
              ) : null}

              {selectedGame ? (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveOfficialsMutation.mutateAsync();
                  }}
                >
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-950">
                          {selectedGame.redTeamName ?? defaultRedUniformName} x{" "}
                          {selectedGame.whiteTeamName ??
                            defaultWhiteUniformName}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500">
                          {formatDateTime(selectedGame.date)} -{" "}
                          {selectedGame.location}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                        Registro opcional
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <label className="text-sm font-medium text-slate-600">
                      Árbitro principal
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                        value={form.refereeName}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            refereeName: event.target.value,
                          }))
                        }
                        placeholder="Opcional"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Assistente 1
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                        value={form.assistantOneName}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            assistantOneName: event.target.value,
                          }))
                        }
                        placeholder="Opcional"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-600">
                      Assistente 2
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                        value={form.assistantTwoName}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            assistantTwoName: event.target.value,
                          }))
                        }
                        placeholder="Opcional"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <button
                      type="button"
                      className={
                        showExtendedOfficials
                          ? buttonStyles.primary
                          : buttonStyles.secondary
                      }
                      onClick={() =>
                        setShowExtendedOfficials((current) => !current)
                      }
                    >
                      Equipe ampliada
                    </button>
                    <button
                      type="button"
                      className={
                        showVideoOfficials
                          ? buttonStyles.primary
                          : buttonStyles.secondary
                      }
                      onClick={() =>
                        setShowVideoOfficials((current) => !current)
                      }
                    >
                      Arbitragem de vídeo (VAR)
                    </button>
                  </div>

                  {showExtendedOfficials ? (
                    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-3">
                      <label className="text-sm font-medium text-slate-600">
                        Quarto árbitro
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.fourthOfficialName}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              fourthOfficialName: event.target.value,
                            }))
                          }
                          placeholder="Opcional"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        Assistente reserva
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.reserveAssistantName}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              reserveAssistantName: event.target.value,
                            }))
                          }
                          placeholder="Opcional"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        Delegado / representante
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.delegateName}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              delegateName: event.target.value,
                            }))
                          }
                          placeholder="Opcional"
                        />
                      </label>
                    </div>
                  ) : null}

                  {showVideoOfficials ? (
                    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-2">
                      <label className="text-sm font-medium text-slate-600">
                        VAR
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.varName}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              varName: event.target.value,
                            }))
                          }
                          placeholder="Opcional"
                        />
                      </label>
                      <label className="text-sm font-medium text-slate-600">
                        AVAR
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                          value={form.avarName}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              avarName: event.target.value,
                            }))
                          }
                          placeholder="Opcional"
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-500">
                      Sem arbitragem, não é necessário preencher ou salvar esta
                      tela.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={buttonStyles.secondary}
                        onClick={() =>
                          goToGameStep("CONFIRMACOES", selectedGame)
                        }
                      >
                        Seguir sem arbitragem
                      </button>
                      <button
                        type="submit"
                        disabled={saveOfficialsMutation.isPending}
                        className="rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {saveOfficialsMutation.isPending
                          ? "Salvando..."
                          : "Salvar arbitragem"}
                      </button>
                    </div>
                  </div>

                  {saveOfficialsMutation.isError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                      {(saveOfficialsMutation.error instanceof Error &&
                        saveOfficialsMutation.error.message) ||
                        "Falha ao salvar arbitragem."}
                    </p>
                  ) : null}
                </form>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  Selecione ou cadastre um jogo antes de informar a arbitragem.
                </p>
              )}
            </article>
          ) : null}

          {currentGamesSubView === "CONFIRMACOES" && !selectedGame ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Confirmações do jogo
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {gamesQuery.isLoading
                      ? "Carregando jogos..."
                      : "Selecione um jogo para acompanhar confirmações e presença."}
                  </p>
                </div>
                <select
                  className="min-w-64 rounded-lg border border-slate-200 px-3 py-2"
                  value=""
                  onChange={(event) => {
                    const game = games.find(
                      (item) => item.id === event.target.value,
                    );
                    if (game) {
                      selectGame(game);
                    }
                  }}
                >
                  <option value="">Selecione um jogo</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {formatDateTime(game.date)} - {game.location}
                    </option>
                  ))}
                </select>
              </div>
              {!gamesQuery.isLoading && games.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  Nenhum jogo encontrado para o período atual.
                </p>
              ) : null}
            </article>
          ) : null}

          {currentGamesSubView === "CONFIRMACOES" && selectedGame ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Confirmações do jogo
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedGame
                      ? `${formatDateTime(selectedGame.date)} - ${selectedGame.location}`
                      : "Selecione um jogo na agenda para acompanhar quem vai para o sorteio."}
                  </p>
                </div>
                <select
                  className="min-w-64 rounded-lg border border-slate-200 px-3 py-2"
                  value={selectedGameId ?? ""}
                  onChange={(event) => {
                    const game = games.find(
                      (item) => item.id === event.target.value,
                    );
                    if (game) {
                      selectGame(game);
                    }
                  }}
                >
                  <option value="">Selecione um jogo</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {formatDateTime(game.date)} - {game.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-black uppercase text-emerald-700">
                    Confirmados
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-700">
                    {confirmedOrManagedAthleteIds.length}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Pendentes
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-700">
                    {pendingConvocationIds.length}
                  </p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-black uppercase text-red-700">
                    Fora
                  </p>
                  <p className="mt-1 text-2xl font-black text-red-700">
                    {outAthleteIds.length}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-black uppercase text-amber-700">
                    Entram no sorteio
                  </p>
                  <p className="mt-1 text-2xl font-black text-amber-800">
                    {effectiveDraftCandidateIds.length}
                  </p>
                </div>
              </div>

              {gameNotice ? (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {gameNotice}
                </p>
              ) : null}
              {saveConfirmationSelectionMutation.isError ||
              confirmAndApplyDraftMutation.isError ||
              addDraftGuestMutation.isError ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {(saveConfirmationSelectionMutation.error instanceof Error &&
                    saveConfirmationSelectionMutation.error.message) ||
                    (confirmAndApplyDraftMutation.error instanceof Error &&
                      confirmAndApplyDraftMutation.error.message) ||
                    (addDraftGuestMutation.error instanceof Error &&
                      addDraftGuestMutation.error.message) ||
                    "Falha ao salvar seleção."}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  disabled={confirmedOrManagedAthleteIds.length === 0}
                  onClick={selectConfirmedOrManagedAthletes}
                >
                  Usar confirmados
                </button>
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  onClick={selectAllEligibleAthletes}
                >
                  Usar todos de linha aptos
                </button>
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  onClick={() => {
                    setSelectedPlayerIds([]);
                    setDraft(null);
                    setGameNotice("Seleção limpa.");
                  }}
                >
                  Limpar seleção
                </button>
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  disabled={
                    !selectedGame ||
                    selectedPlayerIds.length === 0 ||
                    saveConfirmationSelectionMutation.isPending
                  }
                  onClick={() => {
                    setGameNotice("");
                    void saveConfirmationSelectionMutation.mutateAsync(
                      selectedPlayerIds,
                    );
                  }}
                >
                  {saveConfirmationSelectionMutation.isPending
                    ? "Salvando..."
                    : "Salvar seleção"}
                </button>
                <button
                  type="button"
                  className={buttonStyles.primary}
                  disabled={
                    !selectedGame ||
                    !hasLineupDraftSelection ||
                    saveConfirmationSelectionMutation.isPending
                  }
                  onClick={() => void goToLineupDraftStep()}
                >
                  {saveConfirmationSelectionMutation.isPending
                    ? "Salvando seleção..."
                    : "Salvar e ir para escalação"}
                </button>
              </div>

              <form
                className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(12rem,1fr)_12rem_8rem_minmax(14rem,1fr)_auto] lg:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addDraftGuestMutation.mutateAsync();
                }}
              >
                <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                  Convidado para completar
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900"
                    value={draftGuestForm.name}
                    onChange={(event) =>
                      setDraftGuestForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Nome do convidado"
                  />
                </label>
                <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                  Tipo
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900"
                    value={draftGuestForm.position}
                    onChange={(event) =>
                      setDraftGuestForm((current) => ({
                        ...current,
                        position: event.target.value as AthletePosition,
                      }))
                    }
                  >
                    <option value="CENTRAL_MIDFIELDER">Linha</option>
                    <option value="DEFENDER">Defensor</option>
                    <option value="STRIKER">Atacante</option>
                    <option value="GOALKEEPER">Goleiro</option>
                  </select>
                </label>
                <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                  Nível
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900"
                    value={draftGuestForm.rating}
                    onChange={(event) =>
                      setDraftGuestForm((current) => ({
                        ...current,
                        rating: Number(event.target.value),
                      }))
                    }
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                  Detalhes
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-900"
                    value={draftGuestForm.details}
                    onChange={(event) =>
                      setDraftGuestForm((current) => ({
                        ...current,
                        details: event.target.value,
                      }))
                    }
                    placeholder="Ex.: rápido, joga na zaga, convidado do João"
                  />
                </label>
                <button
                  type="submit"
                  className={buttonStyles.secondary}
                  disabled={addDraftGuestMutation.isPending}
                >
                  {addDraftGuestMutation.isPending
                    ? "Adicionando..."
                    : "Adicionar"}
                </button>
                <p className="text-xs font-semibold text-slate-500 lg:col-span-5">
                  Mínimo para sortear: {minLinePlayersPerTeam} jogadores de
                  linha por time ({minLinePlayersForDraft} no total). Convidados
                  entram antes do sorteio com tipo, nível e detalhes. Números de
                  camisa já informados na partida são preservados.
                </p>
              </form>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {[
                  {
                    title: "Ativos para o sorteio",
                    hint: "Confirmados, adicionados pelo gestor ou selecionados manualmente.",
                    tone: "emerald",
                    players: athletes.filter((athlete) => {
                      if (!isLineupFieldAthlete(athlete)) return false;
                      const lineup = selectedGameLineupByAthleteId.get(
                        athlete.id,
                      );
                      const isOut = Boolean(
                        lineup?.confirmedAt &&
                        (!lineup.presence ||
                          lineup.arrivalStatus === "UNAVAILABLE"),
                      );
                      return (
                        !isOut &&
                        (confirmedOrManagedAthleteSet.has(athlete.id) ||
                          selectedPlayerIds.includes(athlete.id))
                      );
                    }),
                  },
                  {
                    title: "Pendentes e inativos",
                    hint: "Atletas fora do sorteio, pendentes ou sem convocação.",
                    tone: "slate",
                    players: athletes.filter((athlete) => {
                      if (!isLineupFieldAthlete(athlete)) return false;
                      const lineup = selectedGameLineupByAthleteId.get(
                        athlete.id,
                      );
                      const isOut = Boolean(
                        lineup?.confirmedAt &&
                        (!lineup.presence ||
                          lineup.arrivalStatus === "UNAVAILABLE"),
                      );
                      return (
                        isOut ||
                        (!confirmedOrManagedAthleteSet.has(athlete.id) &&
                          !selectedPlayerIds.includes(athlete.id))
                      );
                    }),
                  },
                ].map((group) => (
                  <section
                    key={group.title}
                    className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-950">
                          {group.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                          {group.hint}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${group.tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-white text-slate-600"}`}
                      >
                        {group.players.length}
                      </span>
                    </div>
                    <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full min-w-[34rem] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Atleta</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Resposta</th>
                            <th className="px-3 py-2 text-right">Sorteio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.players.map((athlete) => {
                            const confirmedForGame =
                              confirmedOrManagedAthleteSet.has(athlete.id);
                            const selected = selectedPlayerIds.includes(
                              athlete.id,
                            );
                            const lineup = selectedGameLineupByAthleteId.get(
                              athlete.id,
                            );
                            const isOut = Boolean(
                              lineup?.confirmedAt &&
                              (!lineup.presence ||
                                lineup.arrivalStatus === "UNAVAILABLE"),
                            );
                            const isPending = Boolean(
                              lineup && !lineup.confirmedAt,
                            );
                            const statusLabel = confirmedForGame
                              ? "Confirmado"
                              : isOut
                                ? "Fora"
                                : isPending
                                  ? "Pendente"
                                  : "Não convocado";
                            const statusClass = confirmedForGame
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : isOut
                                ? "border-red-200 bg-red-50 text-red-700"
                                : isPending
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-slate-200 bg-slate-50 text-slate-500";
                            return (
                              <tr
                                key={`confirmation-row-${athlete.id}`}
                                className={
                                  selected ? "bg-red-50/50" : "bg-white"
                                }
                              >
                                <td className="px-3 py-2">
                                  <p className="font-black text-slate-950">
                                    {athlete.name}
                                  </p>
                                  <p className="text-xs font-semibold text-slate-500">
                                    Linha
                                    {lineup?.confirmationNote
                                      ? ` - ${lineup.confirmationNote}`
                                      : ""}
                                  </p>
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusClass}`}
                                  >
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs font-semibold text-slate-500">
                                  {lineup?.arrivalStatus
                                    ? (arrivalStatusLabels[
                                        lineup.arrivalStatus
                                      ] ?? lineup.arrivalStatus)
                                    : "-"}
                                  {lineup?.confirmedAt ? (
                                    <span className="block text-[10px] text-slate-400">
                                      {formatDateTime(lineup.confirmedAt)}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-black ${selected ? "border-red-200 bg-red-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                                    onClick={() => togglePlayer(athlete.id)}
                                  >
                                    {selected ? "Selecionado" : "Selecionar"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {group.players.length === 0 ? (
                        <p className="p-4 text-sm font-semibold text-slate-500">
                          Nenhum atleta nesta lista.
                        </p>
                      ) : null}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          ) : null}

          {currentGamesSubView === "ESCALACAO" ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Escalação do jogo
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedGame
                      ? `${formatDateTime(selectedGame.date)} - ${selectedGame.location}`
                      : "Lance ou selecione um jogo."}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[34rem] sm:flex-row sm:flex-nowrap sm:items-center lg:min-w-[42rem]">
                  <select
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={selectedGame?.id ?? ""}
                    onChange={(event) => {
                      const game = games.find(
                        (item) => item.id === event.target.value,
                      );
                      if (game) {
                        selectGame(game);
                      }
                    }}
                  >
                    <option value="">Selecione um jogo</option>
                    {games.map((game) => (
                      <option key={game.id} value={game.id}>
                        {formatDateTime(game.date)} - {game.location}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`${buttonStyles.secondary} whitespace-nowrap sm:shrink-0`}
                    disabled={!selectedGame}
                    onClick={() => goToGameStep("TACTICA", selectedGame)}
                  >
                    Planejamento tático
                  </button>
                  <button
                    type="button"
                    className={`${buttonStyles.primary} whitespace-nowrap sm:shrink-0`}
                    disabled={!selectedGame}
                    onClick={() => goToGameStep("EVENTOS", selectedGame)}
                  >
                    Próxima etapa: súmula
                  </button>
                </div>
              </div>

              {selectedGame ? (
                <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                        Espelho do jogo
                      </p>
                      <h3 className="mt-1 truncate text-lg font-black text-slate-950">
                        {redUniformName} x {whiteUniformName}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {formatDateTime(selectedGame.date)} -{" "}
                        {selectedGame.location}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                          Placar
                        </p>
                        <strong className="mt-1 block text-lg font-black text-slate-950">
                          {selectedGame.status === "SCHEDULED"
                            ? "Jogo não iniciado"
                            : `${redGoals} x ${whiteGoals}`}
                        </strong>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                          Escalados
                        </p>
                        <strong className="mt-1 block text-lg font-black text-slate-950">
                          {appliedLineups.length}
                        </strong>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                          Sorteios
                        </p>
                        <strong className="mt-1 block text-lg font-black text-slate-950">
                          {selectedGameDraftAttempts}/{maxDraftAttemptsPerGame}
                        </strong>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
                          Eventos
                        </p>
                        <strong className="mt-1 block text-lg font-black text-slate-950">
                          {selectedGameEvents.length}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="hidden">
                <div className="hidden">
                  <p className="text-xs font-semibold text-slate-500">
                    Entram no sorteio
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">
                    {effectiveDraftCandidateIds.length}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {selectedPlayerIds.length > 0
                      ? "Seleção manual"
                      : confirmedOrManagedAthleteIds.length > 0
                        ? "Confirmados e adicionados pelo gestor selecionados automaticamente"
                        : "Atletas ativos selecionados automaticamente para completar"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">
                      {confirmedOrManagedAthleteIds.length} confirmados
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500">
                      {unconfirmedAthleteIds.length} não confirmados
                    </span>
                  </div>
                </div>
                <div className="hidden">
                  <p className="text-xs font-semibold text-slate-500">
                    Jogadores de linha
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold ${selectedLinePlayers >= minLinePlayersForDraft ? "text-emerald-700" : "text-amber-700"}`}
                  >
                    {selectedLinePlayers}/{minLinePlayersForDraft}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    O sistema adapta posições se faltar alguém.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Goleiros reais do sorteio
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold ${selectedGoalkeepers >= minGoalkeepersForDraft ? "text-emerald-700" : "text-amber-700"}`}
                  >
                    {selectedGoalkeepers}/{minGoalkeepersForDraft}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Vêm dos contratos ativos abaixo.
                  </p>
                </div>
              </div>

              <div className="hidden">
                O sorteio escolhe quem começa jogando e quem fica no banco.
                Campo: até {playersPerTeam} atletas por lado, com goleiro
                contratado quando houver. Banco: até 10 reservas para cada lado.
              </div>

              <div className="hidden">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                      Goleiros do sorteio
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Contratos ativos entram automaticamente junto com os
                      atletas de linha.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-700">
                    Custo confirmado:{" "}
                    {formatCurrency(confirmedGoalkeeperCostCents)}
                  </span>
                </div>
                {activeGoalkeeperContracts.length > 0 ? (
                  <div className="mb-3 grid gap-2 md:grid-cols-2">
                    {activeGoalkeeperContracts.map((contract) => (
                      <div
                        key={`keeper-contract-auto-${contract.id}`}
                        className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-black text-slate-950">
                              {contract.keeperName}
                            </p>
                            <p className="text-xs font-semibold text-slate-500">
                              {formatCurrency(contract.monthlyCostCents)} por
                              contrato
                            </p>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">
                            Automático
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    Nenhum goleiro ativo. Ative o contrato na tela de Goleiros
                    para ele entrar automaticamente no sorteio.
                  </p>
                )}
                {selectedGameGoalkeeperLineups.length > 0 ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedGameGoalkeeperLineups.map((lineup) => {
                      const contract = goalkeeperContractByAthleteId.get(
                        lineup.athleteId,
                      );
                      return (
                        <label
                          key={`keeper-confirm-${lineup.id}`}
                          className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                        >
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-black text-slate-950">
                              {contract?.keeperName ?? lineup.athlete.name}
                            </span>
                            <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                              {formatCurrency(contract?.monthlyCostCents ?? 0)}
                            </span>
                          </span>
                          <span className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 font-semibold text-slate-700">
                            Confirmou presença
                            <input
                              type="checkbox"
                              checked={lineup.presence}
                              disabled={goalkeeperPresenceMutation.isPending}
                              onChange={(event) =>
                                void goalkeeperPresenceMutation.mutateAsync({
                                  lineup,
                                  presence: event.target.checked,
                                })
                              }
                            />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Aplique o sorteio para confirmar os goleiros contratados
                    neste jogo.
                  </p>
                )}
              </div>

              <div className="hidden">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                      Convocados no período
                    </p>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                      {lineupRosterByGame.reduce(
                        (total, item) => total + item.lineups.length,
                        0,
                      )}{" "}
                      atletas
                    </span>
                  </div>
                  {lineupRosterByGame.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhum convocado ainda. Faça o sorteio ou ajuste manual.
                    </p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {lineupRosterByGame.map((item) => (
                        <button
                          key={`roster-${item.game.id}`}
                          type="button"
                          className={`rounded-lg border px-3 py-2 text-left ${selectedGameId === item.game.id ? "border-red-300 bg-red-50" : "border-slate-200 bg-white hover:bg-slate-100"}`}
                          onClick={() => selectGame(item.game)}
                        >
                          <p className="text-sm font-bold text-slate-900">
                            {formatDateTime(item.game.date)} -{" "}
                            {item.game.location}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {item.lineups.length} convocado(s)
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                        Goleiros
                      </p>
                      <p
                        className={`mt-1 text-xl font-black ${selectedGoalkeepers >= 2 ? "text-emerald-700" : "text-amber-700"}`}
                      >
                        {selectedGoalkeepers}/2
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                      {formatCurrency(confirmedGoalkeeperCostCents)}
                    </span>
                  </div>
                  {selectedGameGoalkeeperLineups.length > 0 ? (
                    <p className="mt-2 truncate text-xs font-semibold text-slate-500">
                      {selectedGameGoalkeeperLineups
                        .map(
                          (lineup) =>
                            goalkeeperContractByAthleteId.get(lineup.athleteId)
                              ?.keeperName ?? lineup.athlete.name,
                        )
                        .join(" / ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Confirmam ao aplicar o sorteio.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <button
                  type="button"
                  className={`h-full rounded-lg text-left ring-offset-2 transition ${selectedPitchSide === "RED" ? "ring-2 ring-blue-500" : "hover:-translate-y-0.5"}`}
                  onClick={() => setSelectedPitchSide("RED")}
                >
                  <TeamColorCard
                    label=""
                    name={redUniformName}
                    color={redUniformPreviewKit}
                    fallback={DEFAULT_RED_UNIFORM_COLOR}
                    imageUrl={redUniformImageUrl}
                    crestUrl={redClubLogoUrl}
                    formation={redPitchFormation}
                    seasonLabel={selectedGameSeasonLabel}
                  />
                </button>
                <button
                  type="button"
                  className={`h-full rounded-lg text-left ring-offset-2 transition ${selectedPitchSide === "WHITE" ? "ring-2 ring-blue-500" : "hover:-translate-y-0.5"}`}
                  onClick={() => setSelectedPitchSide("WHITE")}
                >
                  <TeamColorCard
                    label=""
                    name={whiteUniformName}
                    color={whiteUniformPreviewKit}
                    fallback={DEFAULT_WHITE_UNIFORM_COLOR}
                    imageUrl={whiteUniformImageUrl}
                    crestUrl={whiteClubLogoUrl}
                    formation={whitePitchFormation}
                    seasonLabel={selectedGameSeasonLabel}
                  />
                </button>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="min-w-56">
                    <p className="truncate text-sm font-black text-slate-900">
                      {isDraftPreviewActive
                        ? `Prévia do sorteio - ${selectedPitchSide === "RED" ? redUniformName : whiteUniformName}`
                        : selectedPitchSide === "RED"
                          ? redUniformName
                          : whiteUniformName}
                    </p>
                    <p className="mt-0.5 whitespace-nowrap text-xs font-semibold text-slate-500">
                      {`${selectedPitchPlayerCount} em campo: ${selectedPitchGoalkeeperCount} goleiro + ${Math.max(0, selectedPitchPlayerCount - selectedPitchGoalkeeperCount)} linha`}
                    </p>
                  </div>
                  <label className="hidden">
                    <span className="shrink-0">Formação</span>
                    <select
                      className="h-9 min-w-[11rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-900"
                      value={
                        selectedPitchSide === "RED"
                          ? manualFormations.RED
                          : manualFormations.WHITE
                      }
                      onChange={(event) => {
                        const value = event.target.value as
                          | PitchFormationKey
                          | "AUTO";
                        setManualFormations((prev) => ({
                          ...prev,
                          [selectedPitchSide]: value,
                        }));
                        void saveGameFormationMutation.mutateAsync({
                          side: selectedPitchSide,
                          formation: value,
                        });
                      }}
                    >
                      <option value="AUTO">
                        Automática ({selectedPitchFormation})
                      </option>
                      {Object.keys(pitchFormationSlots).map((formation) => (
                        <option key={formation} value={formation}>
                          {formation}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="hidden"
                    onClick={() => {
                      setManualFormations((prev) => ({
                        ...prev,
                        [selectedPitchSide]: "AUTO",
                      }));
                      void saveGameFormationMutation.mutateAsync({
                        side: selectedPitchSide,
                        formation: "AUTO",
                      });
                    }}
                  >
                    <CircleOff size={14} />
                    Limpar formação
                  </button>
                </div>
                <div className="grid gap-3">
                  <div className="w-full rounded-lg">
                    <FullPitchBoard
                      redColor={redTacticalKitSource}
                      whiteColor={whiteTacticalKitSource}
                      redPlayers={orderedDisplayRedTeamPlayers}
                      whitePlayers={orderedDisplayWhiteTeamPlayers}
                      redTeamName={redUniformName}
                      whiteTeamName={whiteUniformName}
                      redCrestUrl={redClubLogoUrl}
                      whiteCrestUrl={whiteClubLogoUrl}
                      redBenchPlayers={displayRedBenchPlayers}
                      whiteBenchPlayers={displayWhiteBenchPlayers}
                      redFormation={redPitchFormation}
                      whiteFormation={whitePitchFormation}
                      focusTeam={selectedPitchSide}
                      presentation="tactical"
                      mode={isDraftPreviewActive ? "view" : "edit"}
                      showBench
                      showPlayerNumbers
                      overlayControls={
                        <>
                          <select
                            value={
                              selectedPitchSide === "RED"
                                ? manualFormations.RED
                                : manualFormations.WHITE
                            }
                            onChange={(event) => {
                              const value = event.target.value as
                                | PitchFormationKey
                                | "AUTO";
                              setManualFormations((prev) => ({
                                ...prev,
                                [selectedPitchSide]: value,
                              }));
                              void saveGameFormationMutation.mutateAsync({
                                side: selectedPitchSide,
                                formation: value,
                              });
                            }}
                            className="border border-white/15 bg-emerald-950/90 font-black text-white shadow-lg outline-none"
                            style={{
                              width: "clamp(60px, 7.2vw, 118px)",
                              height: "clamp(25px, 2.8vw, 46px)",
                              padding: "0 clamp(6px, 0.65vw, 11px)",
                              borderRadius: "clamp(6px, 0.55vw, 10px)",
                              fontSize: "clamp(8px,0.7vw,12px)",
                              backgroundColor: "rgba(2,44,34,0.94)",
                              color: "#ffffff",
                            }}
                            aria-label="Formação tática"
                          >
                            <option value="AUTO">
                              {selectedPitchFormation}
                            </option>
                            {Object.keys(pitchFormationSlots).map(
                              (formation) => (
                                <option
                                  key={`pitch-overlay-${formation}`}
                                  value={formation}
                                >
                                  {formation}
                                </option>
                              ),
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              void saveGameFormationMutation.mutateAsync({
                                side: selectedPitchSide,
                                formation:
                                  selectedPitchSide === "RED"
                                    ? manualFormations.RED
                                    : manualFormations.WHITE,
                              })
                            }
                            className="inline-flex items-center justify-center whitespace-nowrap border border-emerald-300/20 font-black text-emerald-50 shadow-lg hover:bg-emerald-600 disabled:opacity-60"
                            style={{
                              width: "clamp(76px, 10.5vw, 172px)",
                              height: "clamp(25px, 2.8vw, 46px)",
                              gap: "clamp(3px, 0.35vw, 7px)",
                              padding: "0 clamp(6px, 0.65vw, 12px)",
                              borderRadius: "clamp(6px, 0.55vw, 10px)",
                              fontSize: "clamp(7px,0.64vw,11px)",
                              backgroundColor: "#087443",
                            }}
                            disabled={saveGameFormationMutation.isPending}
                          >
                            <Save size={14} />
                            Salvar Escalação
                          </button>
                        </>
                      }
                      actionControls={
                        <>
                          {[
                            {
                              label: "Nova Escalação",
                              icon: <PlusCircle size={18} aria-hidden="true" />,
                              onClick: () =>
                                setGameNotice(
                                  "Escalação pronta para ajustes manuais no campo.",
                                ),
                            },
                            {
                              label: "Importar",
                              icon: <Download size={18} aria-hidden="true" />,
                              onClick: () =>
                                setGameNotice(
                                  "Use a lista de atletas para importar para a escalação.",
                                ),
                            },
                            {
                              label: "Compartilhar",
                              icon: <Share2 size={18} aria-hidden="true" />,
                              onClick: () => window.print(),
                            },
                            {
                              label: "Mais Opções",
                              icon: (
                                <MoreVertical size={18} aria-hidden="true" />
                              ),
                              onClick: () =>
                                setShowExtendedOfficials((value) => !value),
                            },
                          ].map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              onClick={action.onClick}
                              className="inline-flex min-w-0 flex-col items-center justify-center border border-white/5 bg-white/5 font-black text-white shadow-sm transition hover:bg-white/10"
                              style={{
                                height: "clamp(46px, 5.6vw, 92px)",
                                gap: "clamp(3px, 0.32vw, 7px)",
                                borderRadius: "clamp(6px, 0.55vw, 10px)",
                                fontSize: "clamp(7px, 0.62vw, 11px)",
                              }}
                            >
                              {action.icon}
                              <span className="max-w-full truncate px-1">
                                {action.label}
                              </span>
                            </button>
                          ))}
                        </>
                      }
                      onPlayerDrop={swapFieldSlots}
                      onAthleteDrop={movePlayerToFieldSlot}
                      onPlayerRemove={moveFieldPlayerToBench}
                      aspectRatio={1644 / 948}
                      className="w-full"
                    />
                  </div>
                  <aside className="hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                          Banco
                        </p>
                        <h3 className="text-sm font-black text-slate-950">
                          {selectedPitchSide === "RED"
                            ? redUniformName
                            : whiteUniformName}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">
                        {selectedPitchBenchPlayers.length} reservas
                      </span>
                    </div>
                    {selectedPitchBenchPlayers.length > 0 ? (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                        {selectedPitchBenchPlayers.map((player, index) => (
                          <BenchPlayerCard
                            key={`side-bench-${selectedPitchSide}-${player.id}-${index}`}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "text/plain",
                                `ATHLETE:${selectedPitchSide}:${player.id}`,
                              );
                            }}
                            kitSource={selectedPitchKitSource}
                            fallbackColor="#ffffff"
                            crestUrl={selectedPitchCrestUrl}
                            name={player.name}
                            position={
                              player.position === "GOALKEEPER"
                                ? "GOL"
                                : player.position
                            }
                            number={player.number ?? index + 12}
                            title="Arraste para uma posição no campo"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-500">
                        Nenhum atleta no banco deste time.
                      </p>
                    )}
                  </aside>
                </div>
                <div className="hidden gap-3 lg:grid-cols-2">
                  {[
                    {
                      side: "RED" as TeamSide,
                      title: redUniformName,
                      color: redShirtColor,
                      options: redLineupOptions,
                    },
                    {
                      side: "WHITE" as TeamSide,
                      title: whiteUniformName,
                      color: whiteShirtColor,
                      options: whiteLineupOptions,
                    },
                  ].map((team) => (
                    <div
                      key={`drag-options-${team.side}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                          <span
                            className="size-3 rounded-full border border-slate-200"
                            style={{ backgroundColor: team.color }}
                          />
                          {team.title}
                        </p>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500">
                          arraste para o campo
                        </span>
                      </div>
                      {team.options.length > 0 ? (
                        <div className="grid gap-2">
                          {team.options.map((lineup) => {
                            const isStarter =
                              lineup.role === "STARTER" ||
                              lineup.role === "GOALKEEPER";
                            return (
                              <div
                                key={`drag-lineup-${lineup.id}`}
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.setData(
                                    "text/plain",
                                    `ATHLETE:${team.side}:${lineup.athleteId}`,
                                  );
                                }}
                                className={`grid cursor-grab grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-3 py-2 text-sm active:cursor-grabbing ${
                                  isStarter
                                    ? "border-emerald-200 bg-white text-slate-900"
                                    : "border-slate-200 bg-white text-slate-700"
                                }`}
                                title="Arraste para uma posição no campo"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-bold">
                                    {lineup.athlete.name}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                                    {
                                      athletePositionLabels[
                                        lineup.athlete.position
                                      ]
                                    }{" "}
                                    - {isStarter ? "em campo" : "banco"}
                                  </span>
                                </span>
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${isStarter ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                                >
                                  {lineup.role === "GOALKEEPER"
                                    ? "GOL"
                                    : isStarter
                                      ? `P${lineup.tacticalSlot ?? ""}`
                                      : "Banco"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Nenhum atleta nesse time ainda.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="hidden">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                      Opções para arrastar -{" "}
                      {selectedPitchSide === "RED"
                        ? redUniformName
                        : whiteUniformName}
                    </p>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500">
                      titular, banco ou adaptado
                    </span>
                  </div>
                  {selectedSideLineupOptions.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedSideLineupOptions.map((lineup) => {
                        const isStarter =
                          lineup.role === "STARTER" ||
                          lineup.role === "GOALKEEPER";
                        return (
                          <div
                            key={`drag-lineup-${lineup.id}`}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                "text/plain",
                                `ATHLETE:${selectedPitchSide}:${lineup.athleteId}`,
                              );
                            }}
                            className={`grid cursor-grab grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-3 py-2 text-sm active:cursor-grabbing ${
                              isStarter
                                ? "border-emerald-200 bg-white text-slate-900"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                            title="Arraste para uma posição no campo"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-bold">
                                {lineup.athlete.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                                {athletePositionLabels[lineup.athlete.position]}{" "}
                                - {isStarter ? "em campo" : "banco"}
                              </span>
                            </span>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${isStarter ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                            >
                              {lineup.role === "GOALKEEPER"
                                ? "GOL"
                                : isStarter
                                  ? `P${lineup.tacticalSlot ?? ""}`
                                  : "Banco"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Nenhum atleta nesse time ainda. Aplique o sorteio ou
                      adicione manualmente.
                    </p>
                  )}
                </div>
              </div>

              <div className="hidden">
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  disabled={confirmedOrManagedAthleteIds.length === 0}
                  onClick={selectConfirmedOrManagedAthletes}
                >
                  Selecionar confirmados ({confirmedOrManagedAthleteIds.length})
                </button>
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  disabled={unconfirmedAthleteIds.length === 0}
                  onClick={selectUnconfirmedAthletes}
                >
                  Selecionar não confirmados ({unconfirmedAthleteIds.length})
                </button>
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  onClick={selectAllEligibleAthletes}
                >
                  Selecionar linha + goleiros (
                  {activeDraftFieldAthleteIds.length +
                    activeDraftContractedGoalkeeperIds.length}
                  )
                </button>
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  onClick={selectSuggestedAthletes}
                >
                  Seleção automática ({draftFallbackIds.length})
                </button>
                <button
                  type="button"
                  className={buttonStyles.secondary}
                  onClick={() => {
                    setSelectedPlayerIds([]);
                    setDraftCaptains({ RED: "", WHITE: "" });
                    setDraft(null);
                  }}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  disabled={!selectedGame || notifyGameMutation.isPending}
                  className={buttonStyles.info}
                  onClick={() => void notifyGameMutation.mutateAsync()}
                >
                  {notifyGameMutation.isPending
                    ? "Enviando aviso..."
                    : "Avisar sobre o jogo"}
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Pronto para o sorteio
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {selectedLinePlayers}/{minLinePlayersForDraft} linha e{" "}
                      {selectedGoalkeepers}/{minGoalkeepersForDraft} goleiros
                      reais.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={
                      !selectedGame ||
                      hasReachedDraftLimit ||
                      draftMutation.isPending ||
                      !canDraftSelectedRoster ||
                      !hasValidDraftCaptains
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    onClick={() => void draftMutation.mutateAsync()}
                  >
                    <Shuffle size={18} />
                    {draftMutation.isPending
                      ? "Sorteando..."
                      : "Sortear atletas"}
                  </button>
                </div>
                {draft ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {[
                      {
                        title: redUniformName,
                        players: sortAthletesForPitch(draft.red),
                        bench: draft.redBench ?? [],
                        color: "red",
                      },
                      {
                        title: whiteUniformName,
                        players: sortAthletesForPitch(draft.white),
                        bench: draft.whiteBench ?? [],
                        color: "slate",
                      },
                    ].map((team) => (
                      <div
                        key={`compact-draft-${team.title}`}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p
                            className={`text-xs font-black uppercase tracking-[0.08em] ${team.color === "red" ? "text-red-700" : "text-slate-700"}`}
                          >
                            {team.title}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                            {team.players.length} titulares /{" "}
                            {team.bench.length} banco
                          </span>
                        </div>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                            Distribuição por posição
                          </p>
                          <div className="mt-2 grid gap-1.5">
                            {draftPositionDistribution([
                              ...team.players,
                              ...team.bench,
                            ]).map((group) => (
                              <div
                                key={`${team.title}-${group.position}`}
                                className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 text-xs"
                              >
                                <span className="font-bold text-slate-700">
                                  {group.label}
                                </span>
                                <span className="min-w-0 truncate text-right font-semibold text-slate-500">
                                  {group.players.length} -{" "}
                                  {group.players
                                    .map((athlete) => athlete.name)
                                    .join(", ")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                          Titulares
                        </p>
                        <ul className="mt-2 grid gap-1.5">
                          {team.players.map((athlete, index) => (
                            <li
                              key={`compact-draft-${team.title}-${athlete.id}`}
                              className="flex items-center gap-2 text-sm font-semibold"
                            >
                              <span
                                className={`grid size-5 place-items-center rounded-full text-[10px] font-black ${athlete.position === "GOALKEEPER" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}
                              >
                                {index + 1}
                              </span>
                              <span
                                className={
                                  athlete.position === "GOALKEEPER"
                                    ? "font-black text-sky-700"
                                    : "text-slate-800"
                                }
                              >
                                {athlete.name}
                              </span>
                              <span className="min-w-0 truncate text-xs font-semibold text-slate-500">
                                {athletePositionText(athlete)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {team.bench.length > 0 ? (
                          <>
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                              Banco
                            </p>
                            <ul className="mt-2 grid gap-1.5">
                              {team.bench.map((athlete, index) => (
                                <li
                                  key={`compact-draft-bench-${team.title}-${athlete.id}`}
                                  className="flex items-center gap-2 text-sm font-semibold"
                                >
                                  <span className="grid size-5 place-items-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                                    B{index + 1}
                                  </span>
                                  <span className="text-slate-800">
                                    {athlete.name}
                                  </span>
                                  <span className="min-w-0 truncate text-xs font-semibold text-slate-500">
                                    {athletePositionText(athlete)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {notifyGameMutation.data ? (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  Avisos enviados: {notifyGameMutation.data.sentEmail}{" "}
                  e-mail(s), {notifyGameMutation.data.sentWhatsapp} WhatsApp.
                  Sem contato: {notifyGameMutation.data.skippedNoContact}.
                </p>
              ) : null}
              {notifyGameMutation.isError ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {(notifyGameMutation.error instanceof Error &&
                    notifyGameMutation.error.message) ||
                    "Falha ao enviar aviso do jogo."}
                </p>
              ) : null}

              {showLegacyGameSections && hasAppliedLineup ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">
                      Escalação sorteada aplicada
                    </p>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-emerald-700">
                      {appliedLineups.length} atletas
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {(["RED", "WHITE"] as TeamSide[]).map((side) => (
                      <div
                        key={`applied-${side}`}
                        className="overflow-hidden rounded-lg border border-emerald-200 bg-white"
                      >
                        <TeamColorCard
                          label={side === "RED" ? "Time A" : "Time B"}
                          name={
                            side === "RED" ? redUniformName : whiteUniformName
                          }
                          color={
                            side === "RED"
                              ? redUniformPreviewKit
                              : whiteUniformPreviewKit
                          }
                          fallback={
                            side === "RED"
                              ? DEFAULT_RED_UNIFORM_COLOR
                              : DEFAULT_WHITE_UNIFORM_COLOR
                          }
                          imageUrl={
                            side === "RED"
                              ? redUniformImageUrl
                              : whiteUniformImageUrl
                          }
                          className="rounded-none border-0 shadow-none"
                        />
                        <div className="p-3">
                          <ul className="mt-2 space-y-2">
                            {sortLineupsForField(
                              appliedLineups.filter(
                                (lineup) => lineup.side === side,
                              ),
                            ).map((lineup) => (
                              <li
                                key={`applied-lineup-${lineup.id}`}
                                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-bold text-slate-900">
                                    {lineup.athlete.name}
                                  </span>
                                  <span className="block truncate text-xs font-semibold text-slate-500">
                                    {
                                      athletePositionLabels[
                                        lineup.athlete.position
                                      ]
                                    }
                                  </span>
                                </span>
                                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                                  {lineup.role === "GOALKEEPER"
                                    ? "GOL"
                                    : lineup.role === "RESERVE"
                                      ? "Banco"
                                      : `P${lineup.tacticalSlot ?? ""}`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="hidden">
                {athletes.map((athlete) => {
                  const alreadyInGame = selectedLineupIds.has(athlete.id);
                  const confirmedForGame = confirmedOrManagedAthleteSet.has(
                    athlete.id,
                  );
                  const eligibleForDraft = canEnterLineup(athlete);
                  const selected = selectedPlayerIds.includes(athlete.id);
                  return (
                    <button
                      key={athlete.id}
                      type="button"
                      disabled={!eligibleForDraft}
                      className={`grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-55 ${
                        selected
                          ? "border-red-300 bg-red-50 text-red-950"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                      onClick={() => togglePlayer(athlete.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {athlete.name}
                        </span>
                        <span className="mt-1 block truncate text-xs font-medium text-slate-500">
                          {athlete.position === "GOALKEEPER"
                            ? athlete.linkType === "CONTRACTED"
                              ? "Goleiro contratado"
                              : "Goleiro"
                            : !eligibleForDraft
                              ? "Inativo ou suspenso"
                              : confirmedForGame
                                ? "Confirmado"
                                : "Não confirmado"}
                          {alreadyInGame ? " - já escalado" : ""}
                        </span>
                      </span>
                      <span
                        className={`grid size-6 place-items-center rounded-full text-xs font-bold ${selected ? "bg-red-600 text-white" : "bg-slate-100 text-slate-400"}`}
                      >
                        {selected ? <Check size={14} /> : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {draftMutation.isError || applyDraftMutation.isError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {(draftMutation.error instanceof Error &&
                    draftMutation.error.message) ||
                    (applyDraftMutation.error instanceof Error &&
                      applyDraftMutation.error.message) ||
                    "Não foi possível sortear os times."}
                </div>
              ) : null}

              {(draft?.notes?.length ?? 0) > 0 ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  {(draft?.notes ?? []).map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              ) : null}

              {selectedGameDraftHistory.length > 0 ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                        Histórico dos sorteios
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Cada tentativa fica registrada para auditoria.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600">
                      {selectedGameDraftHistory.length}/3
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {selectedGameDraftHistory.map((attempt) => (
                      <details
                        key={attempt.id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <summary className="cursor-pointer text-sm font-black text-slate-900">
                          Tentativa {attempt.attemptNumber} ·{" "}
                          {new Date(attempt.createdAt).toLocaleString("pt-BR")}{" "}
                          · {attempt.createdByName ?? "Usuário"}
                        </summary>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                            onClick={() => selectDraftAttempt(attempt)}
                          >
                            Ver no campo
                          </button>
                          <button
                            type="button"
                            disabled={
                              !selectedGame || applyDraftMutation.isPending
                            }
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
                            onClick={() => {
                              const selectedDraft = draftFromAttempt(attempt);
                              const jerseyNumbers = Object.fromEntries(
                                Array.from(
                                  buildDraftJerseyNumberMap(selectedDraft),
                                ).map(([athleteId, number]) => [
                                  athleteId,
                                  String(number),
                                ]),
                              );
                              setDraft(selectedDraft);
                              setDraftJerseyNumbers(jerseyNumbers);
                              void applyDraftMutation.mutateAsync({
                                selectedDraft,
                                jerseyNumbers,
                              });
                            }}
                          >
                            Usar esta tentativa
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {[
                            {
                              title: redUniformName,
                              players: attempt.redSnapshot,
                              bench: attempt.redBenchSnapshot ?? [],
                            },
                            {
                              title: whiteUniformName,
                              players: attempt.whiteSnapshot,
                              bench: attempt.whiteBenchSnapshot ?? [],
                            },
                          ].map((team) => (
                            <div
                              key={`${attempt.id}-${team.title}`}
                              className="rounded-lg border border-slate-200 p-2"
                            >
                              <p className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                                {team.title}
                              </p>
                              <p className="text-xs font-semibold text-slate-700">
                                Titulares:{" "}
                                {team.players
                                  .map((athlete) => athlete.name)
                                  .join(", ")}
                              </p>
                              {team.bench.length > 0 ? (
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  Banco:{" "}
                                  {team.bench
                                    .map((athlete) => athlete.name)
                                    .join(", ")}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {(attempt.blockedSnapshot ?? []).length > 0 ? (
                          <p className="mt-2 text-xs font-semibold text-amber-700">
                            Fora:{" "}
                            {(attempt.blockedSnapshot ?? [])
                              .map((athlete) => athlete.name)
                              .join(", ")}
                          </p>
                        ) : null}
                      </details>
                    ))}
                  </div>
                </div>
              ) : null}

              {!canDraftLineup ? (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  Para sortear, selecione pelo menos {minLinePlayersPerTeam}{" "}
                  jogadores de linha por time e {minGoalkeepersForDraft}{" "}
                  goleiros reais.
                </p>
              ) : null}

              {hasConfirmedRoster && !canDraftSelectedRoster ? (
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  Existem {selectedLinePlayers} jogador(es) de linha e{" "}
                  {selectedGoalkeepers} goleiro(s) reais no sorteio. O mínimo é{" "}
                  {minLinePlayersForDraft} linha e {minGoalkeepersForDraft}{" "}
                  goleiros.
                </p>
              ) : null}

              {!selectedGame ? (
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                  Selecione um jogo para habilitar "Sortear e aplicar no jogo".
                </p>
              ) : null}

              {selectedGame ? (
                <p
                  className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${hasReachedDraftLimit ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                >
                  Sorteios deste jogo: {selectedGameDraftAttempts}/
                  {maxDraftAttemptsPerGame}. Depois disso, use os ajustes
                  manuais para evitar favorecimento.
                </p>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!selectedGame || !hasAppliedLineup}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  onClick={() =>
                    selectedGame && hasAppliedLineup
                      ? printGameLineup(selectedGame)
                      : undefined
                  }
                >
                  <Printer size={18} />
                  {hasAppliedLineup
                    ? "Imprimir escalações"
                    : "Aplique para imprimir"}
                </button>
                <button
                  type="button"
                  disabled={
                    !selectedGame ||
                    !draft ||
                    applyDraftMutation.isPending ||
                    !canDraftSelectedRoster ||
                    !hasValidDraftCaptains
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  onClick={() => void applyDraftMutation.mutateAsync(undefined)}
                >
                  <Check size={18} />
                  {applyDraftMutation.isPending
                    ? "Salvando..."
                    : "Salvar escalação e continuar"}
                </button>
              </div>
            </article>
          ) : null}

          {showLegacyGameSections &&
          currentGamesSubView === "ESCALACAO" &&
          draft ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-lg border border-red-200 bg-white p-4 shadow-sm">
                <h3 className="inline-flex items-center gap-2 font-bold text-red-700">
                  <Shirt size={16} style={{ color: redShirtColor }} />{" "}
                  {redUniformName}
                </h3>
                <div className="hidden">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_22px,transparent_22px,transparent_44px)]" />
                  <div className="absolute inset-2 rounded-md border border-white/45" />
                  <div className="absolute left-1/2 top-2 h-[calc(100%-1rem)] w-px -translate-x-1/2 bg-white/35" />
                  <div className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
                  <div className="absolute left-1/2 top-[0.55rem] h-8 w-24 -translate-x-1/2 rounded-b-md border-x border-b border-white/40" />
                  <div className="absolute left-1/2 bottom-[0.55rem] h-8 w-24 -translate-x-1/2 rounded-t-md border-x border-t border-white/40" />
                  <div className="relative z-10 grid h-full grid-cols-2 gap-2 place-items-center content-center">
                    {draft!.red
                      .slice(0, playersPerTeam)
                      .map((athlete, index) => (
                        <span
                          key={`red-field-${athlete.id}`}
                          className="inline-flex min-w-24 items-center justify-center gap-1 rounded-full border border-white/35 px-2 py-1 text-[10px] font-black"
                          style={{
                            backgroundColor: redShirtColor,
                            color: redShirtTextColor,
                          }}
                        >
                          <span className="grid size-4 place-items-center rounded-full bg-black/25 text-[9px] font-black text-white">
                            {index + 1}
                          </span>
                          {shortAthleteName(athlete.name)}
                        </span>
                      ))}
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {sortAthletesForPitch(draft!.red).map((athlete, index) => (
                    <li
                      key={athlete.id}
                      className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-slate-900"
                    >
                      <span
                        className="grid size-5 place-items-center rounded-full text-[11px] font-black"
                        style={{
                          backgroundColor: redShirtColor,
                          color: redShirtTextColor,
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{athlete.name}</span>
                        <span className="block text-xs font-semibold text-slate-500">
                          {athletePositionLabels[athlete.position]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                {(draft!.redBench ?? []).length > 0 ? (
                  <div className="mt-4 rounded-lg border border-red-100 bg-red-50/50 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-red-700">
                      Banco ({(draft!.redBench ?? []).length}/10)
                    </p>
                    <ul className="mt-2 space-y-2">
                      {(draft!.redBench ?? []).map((athlete, index) => (
                        <li
                          key={`red-bench-${athlete.id}`}
                          className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                        >
                          <span className="grid size-5 place-items-center rounded-full bg-red-100 text-[11px] font-black text-red-700">
                            B{index + 1}
                          </span>
                          {athlete.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
              <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="inline-flex items-center gap-2 font-bold text-slate-700">
                  <Shirt size={16} style={{ color: whiteShirtColor }} />{" "}
                  {whiteUniformName}
                </h3>
                <div className="hidden">
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_22px,transparent_22px,transparent_44px)]" />
                  <div className="absolute inset-2 rounded-md border border-white/45" />
                  <div className="absolute left-1/2 top-2 h-[calc(100%-1rem)] w-px -translate-x-1/2 bg-white/35" />
                  <div className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
                  <div className="absolute left-1/2 top-[0.55rem] h-8 w-24 -translate-x-1/2 rounded-b-md border-x border-b border-white/40" />
                  <div className="absolute left-1/2 bottom-[0.55rem] h-8 w-24 -translate-x-1/2 rounded-t-md border-x border-t border-white/40" />
                  <div className="relative z-10 grid h-full grid-cols-2 gap-2 place-items-center content-center">
                    {draft!.white
                      .slice(0, playersPerTeam)
                      .map((athlete, index) => (
                        <span
                          key={`white-field-${athlete.id}`}
                          className="inline-flex min-w-24 items-center justify-center gap-1 rounded-full border border-white/35 px-2 py-1 text-[10px] font-black"
                          style={{
                            backgroundColor: whiteShirtColor,
                            color: whiteShirtTextColor,
                          }}
                        >
                          <span className="grid size-4 place-items-center rounded-full bg-black/25 text-[9px] font-black text-white">
                            {index + 1}
                          </span>
                          {shortAthleteName(athlete.name)}
                        </span>
                      ))}
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {sortAthletesForPitch(draft!.white).map((athlete, index) => (
                    <li
                      key={athlete.id}
                      className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900"
                    >
                      <span
                        className="grid size-5 place-items-center rounded-full border border-slate-300 text-[11px] font-black"
                        style={{
                          backgroundColor: whiteShirtColor,
                          color: whiteShirtTextColor,
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{athlete.name}</span>
                        <span className="block text-xs font-semibold text-slate-500">
                          {athletePositionLabels[athlete.position]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                {(draft!.whiteBench ?? []).length > 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">
                      Banco ({(draft!.whiteBench ?? []).length}/10)
                    </p>
                    <ul className="mt-2 space-y-2">
                      {(draft!.whiteBench ?? []).map((athlete, index) => (
                        <li
                          key={`white-bench-${athlete.id}`}
                          className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                        >
                          <span className="grid size-5 place-items-center rounded-full bg-slate-200 text-[11px] font-black text-slate-700">
                            B{index + 1}
                          </span>
                          {athlete.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            </div>
          ) : null}

          {currentGamesSubView === "TACTICA" ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-red-600">
                    Modo técnico
                  </p>
                  <h2 className="text-xl font-bold text-slate-950">
                    Estrategia tática para o jogo
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Usa os titulares sorteados do {redUniformName} para montar
                    plano A/B/C, substituições e cenários.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={buttonStyles.secondary}
                    onClick={() => goToGameStep("ESCALACAO", selectedGame)}
                  >
                    Voltar à escalação
                  </button>
                  {(["A", "B", "C"] as TacticalPlanKey[]).map((planKey) => (
                    <button
                      key={planKey}
                      type="button"
                      className={`rounded-lg px-3 py-2 text-sm font-bold ${activePlan === planKey ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
                      onClick={() => setActivePlan(planKey)}
                    >
                      Plano {planKey}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="min-w-0 rounded-lg border border-emerald-200 bg-[#153727] p-3 shadow-[0_22px_34px_rgba(9,28,20,0.35)]">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.09em] text-emerald-100">
                      Campo tático - Plano {activePlan}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] ${
                        activePlanState.phase === "ATAQUE"
                          ? "bg-red-100 text-red-700"
                          : activePlanState.phase === "DEFESA"
                            ? "bg-sky-100 text-sky-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      Fase {activePlanState.phase}
                    </span>
                  </div>

                  <div className="relative min-h-[22rem] overflow-hidden rounded-lg border border-white/35 bg-gradient-to-b from-[#338459] via-[#2a6f4d] to-[#1e5a3d] p-3">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_24px,transparent_24px,transparent_48px)]" />
                    <div className="absolute inset-2 rounded-md border border-white/45" />
                    <div className="absolute left-1/2 top-2 h-[calc(100%-1rem)] w-px -translate-x-1/2 bg-white/35" />
                    <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
                    <div className="absolute left-1/2 top-[0.55rem] h-10 w-28 -translate-x-1/2 rounded-b-md border-x border-b border-white/40" />
                    <div className="absolute left-1/2 bottom-[0.55rem] h-10 w-28 -translate-x-1/2 rounded-t-md border-x border-t border-white/40" />

                    <div className="relative z-10 flex h-full flex-col justify-between gap-2">
                      {[...tacticalRows.rows].reverse().map((row, rowIndex) => (
                        <div
                          key={`tatic-row-${rowIndex}`}
                          className="flex flex-wrap items-center justify-center gap-2"
                        >
                          {row.map((athlete, index) => (
                            <span
                              key={`${rowIndex}-${index}-${athlete.id ?? "empty"}`}
                              className={`inline-flex min-h-8 min-w-24 items-center justify-center gap-1 rounded-full border px-2 text-center text-[10px] font-black ${
                                athlete
                                  ? "border-white/35"
                                  : "border-dashed border-white/25 bg-transparent text-transparent"
                              }`}
                              style={
                                athlete
                                  ? {
                                      backgroundColor: redShirtColor,
                                      color: redShirtTextColor,
                                    }
                                  : undefined
                              }
                            >
                              {athlete ? (
                                <span className="grid size-4 place-items-center rounded-full bg-black/25 text-[9px] font-black text-white">
                                  {tacticalNumberByAthleteId.get(athlete.id)}
                                </span>
                              ) : null}
                              {athlete ? (
                                <Shirt
                                  size={10}
                                  style={{ color: redShirtTextColor }}
                                />
                              ) : null}
                              {athlete ? shortAthleteName(athlete.name) : "_"}
                            </span>
                          ))}
                        </div>
                      ))}
                      <div className="flex justify-center">
                        <span
                          className="inline-flex min-h-8 min-w-24 items-center justify-center gap-1 rounded-full border border-white/35 px-2 text-[10px] font-black"
                          style={{
                            backgroundColor: redShirtColor,
                            color: redShirtTextColor,
                          }}
                        >
                          <span className="grid size-4 place-items-center rounded-full bg-black/25 text-[9px] font-black text-white">
                            1
                          </span>
                          <ShieldCheck size={11} />
                          {tacticalRows.goalkeeper
                            ? shortAthleteName(tacticalRows.goalkeeper.name)
                            : "Goleiro"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Formação
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={activePlanState.formation}
                      onChange={(event) =>
                        updateActivePlan({
                          formation: event.target.value as TacticalFormationKey,
                        })
                      }
                    >
                      {tacticalFormationTemplates.map((formation) => (
                        <option key={formation.key} value={formation.key}>
                          {formation.label} - {formation.profile}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Fase do jogo
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={activePlanState.phase}
                      onChange={(event) =>
                        updateActivePlan({
                          phase: event.target
                            .value as TacticalPlanState["phase"],
                        })
                      }
                    >
                      <option value="ATAQUE">Ataque</option>
                      <option value="EQUILIBRADO">Equilibrado</option>
                      <option value="DEFESA">Defesa</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Plano de substituição
                    <textarea
                      className="mt-1 h-24 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={activePlanState.substitutions}
                      onChange={(event) =>
                        updateActivePlan({ substitutions: event.target.value })
                      }
                      placeholder="Ex.: 2 tempo 15': sai ponta direita, entra meia central."
                    />
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Observações do técnico
                    <textarea
                      className="mt-1 h-24 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={activePlanState.note}
                      onChange={(event) =>
                        updateActivePlan({ note: event.target.value })
                      }
                      placeholder="Pontos de pressao, bola parada, encaixe defensivo."
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Recomendação automática por confirmados
                </p>
                {tacticalPlayers.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Aplique o sorteio no jogo para liberar recomendações de
                    formação.
                  </p>
                ) : (
                  <div className="mt-2 grid gap-2">
                    {recommendedFormations.map((item) => (
                      <button
                        key={item.formation}
                        type="button"
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-100"
                        onClick={() =>
                          updateActivePlan({ formation: item.formation })
                        }
                      >
                        <span>
                          <span className="block text-sm font-bold text-slate-900">
                            #{item.rank} - {item.formation}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {item.reason}
                          </span>
                        </span>
                        <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                          Score {item.score}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setTacticalPlans(createDefaultTacticalPlans())}
                >
                  Resetar planos A/B/C
                </button>
                <button
                  type="button"
                  disabled={
                    !selectedGame ||
                    tacticalPlayers.length < 2 ||
                    applyTacticalPlanMutation.isPending
                  }
                  className="h-11 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  onClick={() => void applyTacticalPlanMutation.mutateAsync()}
                >
                  {applyTacticalPlanMutation.isPending
                    ? "Aplicando plano..."
                    : `Aplicar plano ${activePlan} na escalação`}
                </button>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  disabled={
                    !selectedGame || saveTacticalPlansMutation.isPending
                  }
                  className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  onClick={() => void saveTacticalPlansMutation.mutateAsync()}
                >
                  {saveTacticalPlansMutation.isPending
                    ? "Salvando plano no jogo..."
                    : "Salvar planos do técnico no jogo"}
                </button>
                {saveTacticalPlansMutation.isSuccess ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Planos salvos no jogo.
                  </p>
                ) : null}
                {saveTacticalPlansMutation.isError ? (
                  <p className="mt-2 text-xs font-semibold text-red-700">
                    {(saveTacticalPlansMutation.error instanceof Error &&
                      saveTacticalPlansMutation.error.message) ||
                      "Falha ao salvar planos no jogo."}
                  </p>
                ) : null}
              </div>

              {applyTacticalPlanMutation.isError ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {(applyTacticalPlanMutation.error instanceof Error &&
                    applyTacticalPlanMutation.error.message) ||
                    "Falha ao aplicar o plano tático."}
                </p>
              ) : null}

              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Relatório estratégico pós-jogo
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Placar
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {redGoals} x {whiteGoals}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Aderência ao plano
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {adherencePercent}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Gols por eventos
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      Time A: {goalEventsRed} | Time B: {goalEventsWhite}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-xs font-semibold text-slate-500">
                      Disciplina
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      Cartões registrados: {cardEvents}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Leitura rápida:{" "}
                  {redGoals >= whiteGoals
                    ? "plano competitivo"
                    : "ajuste necessário"}
                  ;
                  {adherencePercent >= 80
                    ? " execução alta"
                    : " execução parcial"}
                  ;
                  {cardEvents <= 2
                    ? " disciplina controlada"
                    : " atenção na disciplina"}
                  .
                </p>
              </div>
            </article>
          ) : null}

          {currentGamesSubView === "ESCALACAO" ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-xl font-bold text-slate-950">
                Escalação sorteada e ajustes
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Escolha o time primeiro, depois selecione o atleta para
                adicionar, editar ou remover.
              </p>
              <form
                className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[12rem_minmax(0,1fr)_8rem_10rem_8rem] lg:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  void lineupMutation.mutateAsync();
                }}
              >
                <label className="text-sm font-medium text-slate-600">
                  Time
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={lineupForm.side}
                    onChange={(event) => {
                      const side = event.target.value as "RED" | "WHITE";
                      setLineupForm((prev) => ({
                        ...prev,
                        athleteId: "",
                        side,
                        shirtName:
                          side === "RED" ? redUniformName : whiteUniformName,
                      }));
                    }}
                  >
                    <option value="RED">{redUniformName}</option>
                    <option value="WHITE">{whiteUniformName}</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-600">
                  Atleta
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={lineupForm.athleteId}
                    onChange={(event) =>
                      setLineupForm((prev) => ({
                        ...prev,
                        athleteId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Selecione o atleta</option>
                    {athletesForLineupForm.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.name}
                        {selectedLineupIds.has(athlete.id)
                          ? " - já escalado"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Nº da camisa
                  <input
                    type="number"
                    min={0}
                    max={999}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={lineupForm.jerseyNumber}
                    onChange={(event) =>
                      setLineupForm((prev) => ({
                        ...prev,
                        jerseyNumber: event.target.value,
                      }))
                    }
                    placeholder="10"
                  />
                </label>
                <label
                  className="hidden text-sm font-medium text-slate-600"
                  aria-hidden="true"
                >
                  Uniforme antigo
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={lineupForm.side}
                    onChange={(event) => {
                      const side = event.target.value as "RED" | "WHITE";
                      setLineupForm((prev) => ({
                        ...prev,
                        side,
                        shirtName:
                          side === "RED" ? redUniformName : whiteUniformName,
                      }));
                    }}
                  >
                    <option value="RED">{redUniformName}</option>
                    <option value="WHITE">{whiteUniformName}</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Função
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={lineupForm.role}
                    onChange={(event) =>
                      setLineupForm((prev) => ({
                        ...prev,
                        role: event.target.value as LineupRole,
                      }))
                    }
                  >
                    <option value="STARTER">Titular</option>
                    <option value="RESERVE">Reserva</option>
                    <option value="GOALKEEPER">Goleiro</option>
                    <option value="ABSENT">Ausente</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={
                    lineupMutation.isPending ||
                    !selectedGame ||
                    !lineupForm.athleteId
                  }
                  className="h-11 rounded-lg bg-slate-950 px-4 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {lineupMutation.isPending
                    ? "Salvando..."
                    : selectedLineupIds.has(lineupForm.athleteId)
                      ? "Salvar ajuste"
                      : "Adicionar"}
                </button>
              </form>

              {lineupMutation.isError ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {(lineupMutation.error instanceof Error &&
                    lineupMutation.error.message) ||
                    "Falha ao adicionar atleta na escalação."}
                </p>
              ) : null}

              {quickJerseyNumberMutation.isError ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {(quickJerseyNumberMutation.error instanceof Error &&
                    quickJerseyNumberMutation.error.message) ||
                    "Falha ao salvar número da camisa."}
                </p>
              ) : null}

              {selectedGameLineups.length > 0 ? (
                <div className="mt-4 rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Lista do{" "}
                      {lineupForm.side === "RED"
                        ? redUniformName
                        : lineupForm.side === "WHITE"
                          ? whiteUniformName
                          : "adversário"}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {
                        selectedGameLineups.filter(
                          (lineup) =>
                            lineup.side === lineupForm.side &&
                            lineup.role !== "ABSENT",
                        ).length
                      }{" "}
                      atletas
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {sortLineupsForField(
                      selectedGameLineups.filter(
                        (lineup) =>
                          lineup.side === lineupForm.side &&
                          lineup.role !== "ABSENT",
                      ),
                    ).map((lineup) => (
                      <li
                        key={lineup.id}
                        className="grid gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-900">
                            {lineup.jerseyNumber !== null
                              ? `#${lineup.jerseyNumber} `
                              : ""}
                            {lineup.athlete.name}
                          </span>
                          <span className="block truncate text-xs font-semibold text-slate-500">
                            {athletePositionLabels[lineup.athlete.position]} -{" "}
                            {lineup.role === "GOALKEEPER"
                              ? "Goleiro"
                              : lineup.role === "RESERVE"
                                ? "Banco"
                                : `Titular P${lineup.tacticalSlot ?? ""}`}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-2">
                          <label className="grid gap-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                            Camisa
                            <input
                              type="number"
                              min={0}
                              max={999}
                              defaultValue={lineup.jerseyNumber ?? ""}
                              disabled={quickJerseyNumberMutation.isPending}
                              className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm font-black text-slate-900 disabled:opacity-60"
                              placeholder="Nº"
                              onBlur={(event) => {
                                const rawValue =
                                  event.currentTarget.value.trim();
                                const nextJerseyNumber =
                                  rawValue === "" ? null : Number(rawValue);
                                if (
                                  nextJerseyNumber === lineup.jerseyNumber ||
                                  Number.isNaN(nextJerseyNumber)
                                ) {
                                  event.currentTarget.value =
                                    lineup.jerseyNumber !== null
                                      ? String(lineup.jerseyNumber)
                                      : "";
                                  return;
                                }
                                void quickJerseyNumberMutation.mutateAsync({
                                  lineup,
                                  jerseyNumber: nextJerseyNumber,
                                });
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  event.currentTarget.blur();
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                              setLineupForm((prev) => ({
                                ...prev,
                                athleteId: lineup.athleteId,
                                side: lineup.side,
                                role: lineup.role,
                                jerseyNumber:
                                  lineup.jerseyNumber !== null
                                    ? String(lineup.jerseyNumber)
                                    : "",
                                shirtName:
                                  lineup.shirtName ??
                                  (lineup.side === "RED"
                                    ? redUniformName
                                    : lineup.side === "WHITE"
                                      ? whiteUniformName
                                      : "Adversário"),
                              }));
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            disabled={deleteLineupMutation.isPending}
                            onClick={() => {
                              if (!selectedGame) {
                                return;
                              }
                              void deleteLineupMutation.mutateAsync({
                                gameId: selectedGame.id,
                                lineupId: lineup.id,
                              });
                            }}
                          >
                            Remover
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {selectedGameLineups.filter(
                    (lineup) =>
                      lineup.side === lineupForm.side &&
                      lineup.role !== "ABSENT",
                  ).length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">
                      Nenhum atleta nesse time. Selecione o atleta acima para
                      adicionar.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          ) : null}

          {currentGamesSubView === "EVENTOS" ? (
            <ParticipacaoPageReal
              embedded
              initialGameId={selectedGameId}
              showPresenceControls={false}
            />
          ) : null}

          {showLegacyGameSections && currentGamesSubView === "EVENTOS" ? (
            <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-xl font-bold text-slate-950">
                Resultado detalhado (gols e eventos)
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Edite jogos antigos: gols, assistências e cartões ficam
                vinculados ao jogo selecionado.
              </p>

              <form
                className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_8rem] lg:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveEventMutation.mutateAsync();
                }}
              >
                <label className="block text-sm font-medium text-slate-600">
                  Atleta
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={eventForm.athleteId}
                    onChange={(event) =>
                      setEventForm((prev) => ({
                        ...prev,
                        athleteId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Selecione</option>
                    {athletesInSelectedGame.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-600">
                  Tipo
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={eventForm.type}
                    onChange={(event) =>
                      setEventForm((prev) => ({
                        ...prev,
                        type: event.target.value as GameEventType,
                      }))
                    }
                  >
                    <option value="GOAL">Gol</option>
                    <option value="ASSIST">Assistência</option>
                    <option value="YELLOW_CARD">Cartão amarelo</option>
                    <option value="RED_CARD">Cartão vermelho</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-600">
                  Minuto
                  <input
                    type="number"
                    min={0}
                    max={130}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={eventForm.minute}
                    onChange={(event) =>
                      setEventForm((prev) => ({
                        ...prev,
                        minute: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                  />
                </label>

                <label className="text-sm font-medium text-slate-600">
                  Lado
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={eventForm.side}
                    onChange={(event) =>
                      setEventForm((prev) => ({
                        ...prev,
                        side: event.target.value as TeamSide,
                      }))
                    }
                  >
                    <option value="RED">{redUniformName}</option>
                    <option value="WHITE">{whiteUniformName}</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-600 lg:col-span-2">
                  Observação
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={eventForm.note}
                    onChange={(event) =>
                      setEventForm((prev) => ({
                        ...prev,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Opcional"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    !selectedGame ||
                    !eventForm.athleteId ||
                    saveEventMutation.isPending
                  }
                  className="h-11 rounded-lg bg-slate-950 px-4 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saveEventMutation.isPending
                    ? "Salvando..."
                    : "Registrar evento"}
                </button>
              </form>

              {saveEventMutation.isError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {(saveEventMutation.error as Error | null).message ||
                    "Falha ao registrar evento."}
                </div>
              ) : null}

              {selectedGameEvents.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {selectedGameEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {eventTypeLabels[event.type]} - {event.athlete.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {event.side ? `Lado ${event.side}` : "Sem lado"}
                          {event.minute !== null ? ` - ${event.minute}'` : ""}
                          {event.note ? ` - ${event.note}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (!selectedGame) {
                            return;
                          }
                          void deleteEventMutation.mutateAsync({
                            gameId: selectedGame.id,
                            eventId: event.id,
                          });
                        }}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Nenhum evento registrado para este jogo.
                </p>
              )}
            </article>
          ) : null}
        </div>
      </div>
      {cancelGame ? (
        <GameCancelModal
          game={cancelGame}
          reason={cancelReason}
          note={cancelNote}
          confirming={deleteGameMutation.isPending}
          secondaryButtonClass={buttonStyles.secondary}
          onClose={() => setCancelGameId(null)}
          onReasonChange={setCancelReason}
          onNoteChange={setCancelNote}
          onConfirm={() => {
            void deleteGameMutation.mutateAsync(cancelGame.id).then(() => {
              setCancelGameId(null);
              setCancelNote("");
              setGameNotice(`Jogo cancelado: ${cancelReason}.`);
            });
          }}
        />
      ) : null}
    </section>
  );
}
