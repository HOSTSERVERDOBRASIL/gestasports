export type UserRole = "SUPERADMIN" | "ADMIN" | "SPORTS_DIRECTOR" | "FINANCIAL" | "ASSOCIATE" | "ATHLETE";

export type AssociateSelfSummary = {
  associate: { id: string; name: string; status: AssociateStatus; monthlyFeeCents: number; createdAt: string };
  payments: Array<{ id: string; month: number; year: number; amountCents: number; status: PaymentStatus; dueDate: string; paidAt: string | null }>;
  totals: { paidCents: number; pendingCents: number; lateCount: number };
};

export type AuthUser = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  tenantStatus: TenantStatus | null;
  tenantSuspendedReason: string | null;
  enabledModules: TenantModuleCode[];
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  associate: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: AssociateStatus;
    monthlyFeeCents: number;
    boardRole: BoardRole | null;
    athlete: {
      id: string;
      name: string;
      position: AthletePosition;
      status: AthleteStatus;
      rating: number;
    } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditLog = {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: UserRole | null;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
};

export type BoardRole = {
  id: string;
  name: string;
  description: string | null;
  canAccessAdmin: boolean;
  canAccessFinancial: boolean;
  canAccessAthlete: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AthleteSelfOverview = {
  athlete: {
    id: string;
    name: string;
    position: string;
    status: string;
    rating: number;
    photoUrl: string | null;
    sportsNote: string | null;
    medicalStatus: AthleteMedicalStatus;
    medicalNote: string | null;
    medicalReturnDate: string | null;
    medicalReportedBy: string | null;
    joinedAt: string | null;
  } | null;
  associate: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: AssociateStatus;
    monthlyFeeCents: number;
    joinedAt: string | null;
  };
  period: {
    month: number;
    year: number;
  };
  membership: {
    joinedAt: string;
    tenureMonths: number;
    tenureLabel: string;
    associationJoinedAt: string;
    associationTenureMonths: number;
    associationTenureLabel: string;
    athleteJoinedAt: string | null;
    athleteTenureMonths: number;
    athleteTenureLabel: string | null;
  };
  numbers: {
    gamesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    favoriteShirtNumbers: number[];
  };
  presence: {
    gamesRegistered: number;
    gamesPresent: number;
    absences: number;
    presencePercent: number;
  };
  ranking: {
    goalsRank: number | null;
    assistsRank: number | null;
    fairPlayRank: number | null;
    presenceRank: number | null;
    totalAthletes: number;
    topGoals: Array<{ rank: number; athleteId: string; name: string; value: number }>;
    topAssists: Array<{ rank: number; athleteId: string; name: string; value: number }>;
    topWins: Array<{ rank: number; athleteId: string; name: string; value: number }>;
    topPresence: Array<{ rank: number; athleteId: string; name: string; value: number }>;
  };
  nextGame: {
    gameId: string;
    date: string;
    location: string;
    status: GameStatus;
    side: TeamSide;
    role: LineupRole;
    presence: boolean;
    confirmedAt: string | null;
    arrivalStatus: "ON_TIME" | "LATE" | "NEEDS_RIDE" | "UNAVAILABLE" | null;
    confirmationNote: string | null;
    jerseyNumber: number | null;
    tacticalSlot: number | null;
    redTeamName: string | null;
    whiteTeamName: string | null;
    redUniformColor: string | null;
    whiteUniformColor: string | null;
    lineups: Array<{
      id: string;
      athleteId: string;
      athleteName: string;
      position: AthletePosition;
      side: TeamSide;
      role: LineupRole;
      presence: boolean;
      confirmedAt: string | null;
      arrivalStatus: "ON_TIME" | "LATE" | "NEEDS_RIDE" | "UNAVAILABLE" | null;
      confirmationNote: string | null;
      jerseyNumber: number | null;
      tacticalSlot: number | null;
    }>;
  } | null;
  recentGames: Array<{
    gameId: string;
    date: string;
    location: string;
    side: TeamSide;
    role: LineupRole;
    presence: boolean;
    jerseyNumber: number | null;
    redTeamName: string | null;
    whiteTeamName: string | null;
    redScore: number | null;
    whiteScore: number | null;
    winnerSide: TeamSide | null;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    substitutions: Array<{
      id: string;
      minute: number | null;
      direction: "IN" | "OUT";
      athleteOutName: string;
      athleteInName: string;
    }>;
  }>;
  invite: {
    groupName: string;
    code: string | null;
  };
  evolution: Array<{
    month: number;
    label: string;
    goals: number;
    assists: number;
    registeredGames: number;
    presentGames: number;
    presencePercent: number;
    paidCents: number;
  }>;
  insights: {
    goalParticipations: number;
    goalsPerGame: number;
    adimplenciaPercent: number;
  };
  financeSummary: {
    paidCount: number;
    pendingCount: number;
    lateCount: number;
    paidCentsInYear: number;
  };
  currentPayment: {
    id: string | null;
    status: PaymentStatus;
    amountCents: number;
    dueDate: string;
    paidAt: string | null;
  };
  recentPayments: Array<{
    id: string;
    month: number;
    year: number;
    status: PaymentStatus;
    amountCents: number;
    dueDate: string;
    paidAt: string | null;
  }>;
};

export type AthleteSelfCheckoutResponse = {
  payment: {
    id: string;
    status: PaymentStatus;
    amountCents: number;
    dueDate: string;
    paidAt: string | null;
  };
  checkout: {
    txid: string;
    pixCopyPaste: string;
    qrCodeDataUrl: string;
    expiresAt: string;
    autoSettleSeconds: number;
  } | null;
  message: string;
};

export type DashboardSummary = {
  associatesActive: number;
  lateAssociates: number;
  athletesTotal: number;
  athletesReady: number;
  monthRevenueCents: number;
  monthExpenseCents: number;
  keeperCostCents: number;
  balanceCents: number;
  expenseComposition: Array<{ category: string; totalCents: number }>;
  monthlySeries: Array<{ month: string; revenueCents: number; expenseCents: number }>;
  recentAssociates: Array<{ id: string; name: string; status: string; createdAt: string }>;
  upcomingMatches: Array<{ id: string; opponent: string; location: string; startsAt: string; costCents: number; confirmedCount: number }>;
  nextMatch: {
    id: string;
    opponent: string;
    location: string;
    startsAt: string;
    costCents: number;
    confirmedCount: number;
    pendingCount: number;
    confirmed: Array<{ id: string; name: string; photoUrl: string | null }>;
    pending: Array<{ id: string; name: string; photoUrl: string | null }>;
  } | null;
  presenceRanking: Array<{
    id: string;
    name: string;
    status: string;
    photoUrl: string | null;
    confirmedCount: number;
    totalMatches: number;
    presencePercent: number;
  }>;
  recentFinancialEntries: Array<{
    id: string;
    type: string;
    category: string;
    description: string;
    amountCents: number;
    status: string;
    dueDate: string | null;
    paidAt: string | null;
  }>;
  monthlyFeeAlert: {
    pendingCount: number;
    lateCount: number;
    amountCents: number;
  };
  alerts: Array<{ title: string; subtitle: string }>;
};

export type SportsDirectorSummary = Pick<DashboardSummary, "upcomingMatches" | "nextMatch" | "presenceRanking" | "athletesTotal" | "athletesReady">;

export type AthleteAccountOverview = {
  athlete: {
    id: string;
    name: string;
    position: AthletePosition;
    linkType: AthleteLinkType;
    status: AthleteStatus;
    rating: number;
    birthDate: string | null;
    age: number | null;
    ageBucket: string;
    photoUrl: string | null;
    sportsNote: string | null;
    medicalStatus: AthleteMedicalStatus;
    medicalNote: string | null;
    medicalReturnDate: string | null;
    medicalReportedBy: string | null;
    guestBillingEnabled: boolean;
    guestFeeCents: number;
    createdAt: string;
  };
  associate: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: AssociateStatus;
    monthlyFeeCents: number;
  } | null;
  period: {
    month: number;
    year: number;
  };
  numbers: {
    gamesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    favoriteShirtNumbers: number[];
  };
  presence: {
    gamesRegistered: number;
    gamesPresent: number;
    absences: number;
    presencePercent: number;
    rank: number | null;
    totalAthletes: number;
  };
  currentPayment: {
    id: string;
    status: PaymentStatus;
    amountCents: number;
    dueDate: string;
    paidAt: string | null;
  } | null;
  presenceDetails: Array<{
    lineupId: string;
    gameId: string;
    gameLabel: string;
    date: string;
    location: string;
    presence: boolean;
    role: LineupRole;
    side: TeamSide;
    jerseyNumber: number | null;
  }>;
};

export type DisciplineSummary = {
  period?: {
    month: number | null;
    year: number;
  };
  activeSuspensions: number;
  totals: {
    yellow: number;
    red: number;
    suspensions: number;
  };
  ranking: Array<{
    athleteId: string;
    name: string;
    yellowCards: number;
    redCards: number;
    suspensions: number;
    fairPlayScore: number;
  }>;
};

export type ConfrontationSummary = {
  period?: {
    month: number | null;
    year: number;
  };
  matches: number;
  redWins: number;
  whiteWins: number;
  draws: number;
  redGoals: number;
  whiteGoals: number;
  goalDifference: number;
  lastMatch: {
    gameId: string;
    redScore: number;
    whiteScore: number;
    isDraw: boolean;
    winnerSide: "RED" | "WHITE" | "EXTERNAL" | null;
    date: string;
  } | null;
  bestStreak: {
    side: "RED" | "WHITE" | "EXTERNAL";
    wins: number;
  } | null;
  biggestBlowout: {
    gameId: string;
    redScore: number;
    whiteScore: number;
    goalDifference: number;
  } | null;
};

export type Scorer = {
  athleteId: string;
  name: string;
  goals: number;
  assists: number;
  games: number;
  goalAverage: number;
};

export type CompetitionRankingSummary = {
  period: {
    month: number | null;
    year: number;
  };
  scorers: Scorer[];
  wins: Array<{
    athleteId: string;
    name: string;
    games: number;
    wins: number;
    draws: number;
    losses: number;
    winRate: number;
  }>;
  contributions: Array<{
    athleteId: string;
    name: string;
    goals: number;
    assists: number;
    total: number;
  }>;
};

export type AthletePosition =
  | "GOALKEEPER"
  | "DEFENDER"
  | "FULLBACK"
  | "MIDFIELDER"
  | "FORWARD"
  | "LINE"
  | "BOTH"
  | "RIGHT_BACK"
  | "LEFT_BACK"
  | "DEFENSIVE_MIDFIELDER"
  | "CENTRAL_MIDFIELDER"
  | "ATTACKING_MIDFIELDER"
  | "RIGHT_WINGER"
  | "LEFT_WINGER"
  | "STRIKER";
export type AthleteLinkType = "ASSOCIATE" | "CONTRACTED" | "GUEST";
export type AthleteStatus = "ACTIVE" | "INACTIVE" | "DELINQUENT" | "SUSPENDED";
export type AthleteMedicalStatus = "CLEARED" | "OBSERVATION" | "INJURED" | "TREATMENT";
export type AssociateStatus = "ACTIVE" | "LATE" | "INACTIVE";
export type PaymentStatus = "PAID" | "PENDING" | "LATE";
export type GameType = "INTERNAL" | "EXTERNAL";
export type GameMode = "INTERNAL_SPLIT" | "FRIENDLY" | "CHAMPIONSHIP" | "TOURNAMENT" | "TRAINING" | "EXTERNAL_FRIENDLY";
export type TeamSide = "RED" | "WHITE" | "EXTERNAL";
export type LineupRole = "STARTER" | "RESERVE" | "GOALKEEPER" | "ABSENT";
export type GameStatus = "SCHEDULED" | "RUNNING" | "PAUSED" | "FINISHED" | "CANCELED";
export type GoalkeeperCostModel = "PER_GAME" | "MONTHLY" | "ONE_OFF";
export type GameEventType = "GOAL" | "ASSIST" | "YELLOW_CARD" | "RED_CARD";
export type OrganizationType = "GRUPO_INTERNO" | "CLUBE" | "CLUBE_COM_RACHA_INTERNO" | "LIGA" | "ESCOLINHA";
export type ClubType = "INTERNAL" | "EXTERNAL" | "PARTNER" | "GUEST";
export type ClubStatus = "ACTIVE" | "INACTIVE";
export type TeamCategory = "PRINCIPAL" | "VETERANO" | "SUB_20" | "SUB_17" | "SUB_15" | "FEMININO" | "MISTO";
export type TeamGender = "MALE" | "FEMALE" | "MIXED";
export type TeamStatus = "ACTIVE" | "INACTIVE";
export type CallUpStatus = "CALLED" | "CONFIRMED" | "DECLINED" | "MAYBE" | "ABSENT" | "CUT";
export type CompetitionType = "LEAGUE" | "CUP" | "TOURNAMENT" | "FRIENDLY_SERIES";
export type CompetitionFormat = "PONTOS_CORRIDOS" | "MATA_MATA" | "GRUPOS" | "GRUPOS_E_MATA_MATA" | "JOGO_UNICO" | "IDA_E_VOLTA";
export type CompetitionStatus = "DRAFT" | "ACTIVE" | "FINISHED" | "CANCELED";

export type TacticalFormation =
  | "4-3-3"
  | "4-4-2"
  | "3-5-2"
  | "4-2-3-1"
  | "4-3-1-2"
  | "3-4-3"
  | "3-4-1-2"
  | "4-1-4-1"
  | "4-5-1"
  | "5-3-2"
  | "5-4-1"
  | "4-2-2-2"
  | "3-6-1";

export type TacticalPlan = {
  formation: TacticalFormation;
  phase: "ATAQUE" | "EQUILIBRADO" | "DEFESA";
  note: string;
  substitutions: string;
};

export type TacticalPlans = {
  A: TacticalPlan;
  B: TacticalPlan;
  C: TacticalPlan;
};

export type Associate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: AssociateStatus;
  monthlyFeeCents: number;
  boardRoleId: string | null;
  boardRole: BoardRole | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  athlete: {
    id: string;
    position: AthletePosition;
    status: AthleteStatus;
    rating: number;
  } | null;
};

export type Game = {
  id: string;
  type: GameType;
  gameMode: GameMode;
  date: string;
  location: string;
  championship: string | null;
  homeClubId: string | null;
  awayClubId: string | null;
  fieldId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  competitionId: string | null;
  round: string | null;
  matchNumber: number | null;
  isOfficial: boolean;
  homeScore: number | null;
  awayScore: number | null;
  refereeName: string | null;
  assistantNames: string | null;
  assistantOneName: string | null;
  assistantTwoName: string | null;
  fourthOfficialName: string | null;
  reserveAssistantName: string | null;
  varName: string | null;
  avarName: string | null;
  delegateName: string | null;
  note: string | null;
  gameValueCents: number;
  redTeamName: string | null;
  whiteTeamName: string | null;
  redUniformColor: string | null;
  whiteUniformColor: string | null;
  redUniformImageUrl: string | null;
  whiteUniformImageUrl: string | null;
  redCrestUrl: string | null;
  whiteCrestUrl: string | null;
  redFormation: TacticalFormation | null;
  whiteFormation: TacticalFormation | null;
  status: GameStatus;
  halfDurationMinutes: number;
  breakDurationMinutes: number;
  startedAt: string | null;
  pausedAt: string | null;
  elapsedSeconds: number;
  finishedAt: string | null;
  redScore: number | null;
  whiteScore: number | null;
  winnerSide: TeamSide | null;
  isDraw: boolean;
  tacticalPlans: TacticalPlans | null;
  draftAttempts: number;
  createdAt: string;
  updatedAt: string;
  lineups: GameLineup[];
  events: GameEvent[];
  substitutions: GameSubstitution[];
  draftHistory: LineupDraftAttempt[];
  homeClub: {
    id: string;
    name: string;
    shortName: string | null;
    logoUrl: string | null;
    shirtName: string | null;
    shirtColor: string | null;
    shirtImageUrl: string | null;
    type: ClubType;
  } | null;
  awayClub: {
    id: string;
    name: string;
    shortName: string | null;
    logoUrl: string | null;
    shirtName: string | null;
    shirtColor: string | null;
    shirtImageUrl: string | null;
    type: ClubType;
  } | null;
  field: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    surface: string | null;
    status: FieldStatus;
  } | null;
  _count: {
    lineups: number;
    events: number;
    substitutions: number;
  };
};

export type FieldStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export type Field = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  surface: string | null;
  capacity: number | null;
  defaultCostCents: number;
  status: FieldStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Club = {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  logoUrl: string | null;
  shirtName: string | null;
  shirtColor: string | null;
  shirtImageUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  responsibleName: string | null;
  responsiblePhone: string | null;
  responsibleEmail: string | null;
  type: ClubType;
  status: ClubStatus;
  createdAt: string;
  updatedAt: string;
  teams: Team[];
};

export type Team = {
  id: string;
  clubId: string;
  name: string;
  category: TeamCategory;
  gender: TeamGender;
  status: TeamStatus;
  logoUrl: string | null;
  shirtName: string | null;
  shirtColor: string | null;
  shirtImageUrl: string | null;
  coachName: string | null;
  coachAssociateId: string | null;
  coachAssociate?: Associate | null;
  assistantName: string | null;
  assistantAssociateId: string | null;
  assistantAssociate?: Associate | null;
  createdAt: string;
  updatedAt: string;
  club: Club;
};

export type Competition = {
  id: string;
  name: string;
  seasonId: string | null;
  type: CompetitionType;
  format: CompetitionFormat;
  startDate: string | null;
  endDate: string | null;
  status: CompetitionStatus;
  rules: unknown;
  createdAt: string;
  updatedAt: string;
  teams: Array<{
    id: string;
    teamId: string | null;
    clubId: string | null;
    groupName: string | null;
    points: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    status: "ACTIVE" | "WITHDRAWN";
    team: Team | null;
    club: Club | null;
  }>;
  _count: { games: number; confrontations: number };
};

export type GameCallUp = {
  id: string;
  gameId: string;
  athleteId: string;
  status: CallUpStatus;
  confirmedAt: string | null;
  responseNote: string | null;
  createdAt: string;
  updatedAt: string;
  athlete: {
    id: string;
    name: string;
    position: AthletePosition;
    photoUrl: string | null;
  };
  game: {
    id: string;
    date: string;
    location: string;
    gameMode: GameMode;
    homeScore: number | null;
    awayScore: number | null;
  };
};

export type LineupDraftAttempt = {
  id: string;
  gameId: string;
  attemptNumber: number;
  createdById: string | null;
  createdByName: string | null;
  redSnapshot: AthleteProfile[];
  whiteSnapshot: AthleteProfile[];
  redBenchSnapshot: AthleteProfile[] | null;
  whiteBenchSnapshot: AthleteProfile[] | null;
  blockedSnapshot: AthleteProfile[] | null;
  notes: string[] | null;
  totals: {
    redRating: number;
    whiteRating: number;
    eligible: number;
    blocked: number;
    redBench: number;
    whiteBench: number;
    emergencyGoalkeepers: number;
  };
  createdAt: string;
};

export type PaymentSettings = {
  id: string;
  paymentMode: "MANUAL_PIX" | "PROVIDER";
  paymentProvider: "MANUAL_PIX" | "SICOOB" | "ITAU" | "BANCO_DO_BRASIL" | "BRADESCO" | "CAIXA" | "SANTANDER" | "ASAAS" | "EFI" | "MERCADO_PAGO" | "STRIPE";
  providerEnvironment: "TEST" | "PRODUCTION";
  providerApiKey: string;
  providerClientId: string;
  providerClientSecret: string;
  providerWebhookSecret: string;
  providerWebhookUrl: string;
  autoSettleEnabled: boolean;
  pixKey: string;
  pixReceiverName: string;
  pixCity: string;
  pixAutoSettleSeconds: number;
  monthlyDueDay: number;
};

export type MonthlyFeePayment = {
  id: string;
  associateId: string;
  associateName: string;
  email: string | null;
  phone: string | null;
  associateStatus: AssociateStatus;
  monthlyFeeCents: number;
  month: number;
  year: number;
  amountCents: number;
  dueDate: string;
  paidAt: string | null;
  status: PaymentStatus;
};

export type MonthlyFeeGenerationResult = {
  created: number;
  eligibleAssociates: number;
  dueDay: number;
};

export type CollectionDashboard = {
  month: number;
  year: number;
  totals: {
    openCents: number;
    lateCents: number;
    dueSoonCount: number;
    riskPercent: number;
  };
  segments: {
    current: number;
    d1_7: number;
    d8_30: number;
    d31Plus: number;
  };
  cadence: {
    preDue3: number;
    dPlus3: number;
    dPlus7: number;
    dPlus15: number;
  };
  topDebtors: Array<{
    associateId: string;
    name: string;
    phone: string | null;
    email: string | null;
    amountCents: number;
    maxDelayDays: number;
  }>;
  actionPlan: string[];
};

export type CollectionRunResult = {
  month: number;
  year: number;
  sentEmail: number;
  sentWhatsapp: number;
  skipped: number;
};

export type CollectionProductivity = {
  month: number;
  year: number;
  byStage: Array<{
    stage: "PRE_DUE_3" | "D_PLUS_3" | "D_PLUS_7" | "D_PLUS_15";
    sent: number;
    recovered: number;
    recoveryRatePercent: number;
  }>;
  totals: {
    sent: number;
    recovered: number;
    recoveryRatePercent: number;
  };
};

export type DirectChargeCheckoutResponse = {
  associate: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  payment: {
    id: string;
    month: number;
    year: number;
    amountCents: number;
    status: PaymentStatus;
    dueDate: string;
    paidAt: string | null;
  };
  checkout: {
    txid: string;
    pixCopyPaste: string;
    qrCodeDataUrl: string;
    expiresAt: string;
    autoSettleSeconds: number;
  };
};

export type MonthlyFeePaymentHistory = {
  associate: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  payments: MonthlyFeePayment[];
};

export type GameLineup = {
  id: string;
  gameId: string;
  athleteId: string;
  side: TeamSide;
  role: LineupRole;
  presence: boolean;
  confirmedAt: string | null;
  arrivalStatus: "ON_TIME" | "LATE" | "NEEDS_RIDE" | "UNAVAILABLE" | null;
  confirmationNote: string | null;
  jerseyNumber: number | null;
  tacticalSlot: number | null;
  shirtName: string | null;
  createdAt: string;
  athlete: {
    id: string;
    name: string;
    position: AthletePosition;
  };
};

export type GameEvent = {
  id: string;
  gameId: string;
  athleteId: string;
  type: GameEventType;
  minute: number | null;
  note: string | null;
  side: TeamSide | null;
  createdAt: string;
  athlete: {
    id: string;
    name: string;
    position: AthletePosition;
  };
};

export type GameSubstitution = {
  id: string;
  gameId: string;
  athleteOutId: string;
  athleteInId: string;
  side: TeamSide | null;
  minute: number | null;
  note: string | null;
  createdAt: string;
  athleteOut: {
    id: string;
    name: string;
    position: AthletePosition;
  };
  athleteIn: {
    id: string;
    name: string;
    position: AthletePosition;
  };
};

export type GoalkeeperContract = {
  id: string;
  keeperName: string;
  monthlyCostCents: number;
  startedAt: string;
  endsAt: string | null;
  active: boolean;
  costModel: GoalkeeperCostModel;
  paymentMethod: string | null;
  note: string | null;
  costCenter: string | null;
  athleteId: string | null;
  createdAt: string;
};

export type GroupSettings = {
  id: string;
  groupName: string;
  organizationType: string;
  foundedAt: string | null;
  foundationYear: number | null;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  address: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  history: string | null;
  playersPerTeam: number;
  closedMode: boolean;
  inviteCode: string | null;
  uniform1Name: string;
  uniform1Season: string | null;
  uniform1Color: string;
  uniform1ImageUrl: string | null;
  uniform2Name: string;
  uniform2Season: string | null;
  uniform2Color: string;
  uniform2ImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JoinRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  invitedByAssociate: {
    name: string;
  };
};

export type AthleteProfile = {
  id: string;
  name: string;
  position: AthletePosition;
  secondaryPositions: AthletePosition[];
  linkType: AthleteLinkType;
  status: AthleteStatus;
  rating: number;
  birthDate: string | null;
  age: number | null;
  ageBucket: string;
  photoUrl: string | null;
  sportsNote: string | null;
  medicalStatus: AthleteMedicalStatus;
  medicalNote: string | null;
  medicalReturnDate: string | null;
  medicalReportedBy: string | null;
  associateId: string | null;
  guestBillingEnabled: boolean;
  guestFeeCents: number;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  associate: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: AssociateStatus;
    monthlyFeeCents: number;
    joinedAt: string | null;
  } | null;
  payment: {
    id: string;
    status: PaymentStatus;
    amountCents: number;
    dueDate: string;
    paidAt: string | null;
  } | null;
  paidThisMonth: boolean;
  amountDueCents: number;
  canPlay: boolean;
};

export type AthleteTechnicalEvaluation = {
  id: string;
  athleteId: string;
  year: number;
  evaluatedById: string | null;
  evaluatedByName: string | null;
  evaluatedByEmail: string | null;
  technicalScore: number;
  tacticalScore: number;
  physicalScore: number;
  defensiveScore: number;
  offensiveScore: number;
  commitmentScore: number;
  disciplineScore: number;
  manualScore: number;
  statsScore: number;
  finalScore: number;
  classification: string;
  justification: string;
  notes: string | null;
  statsSnapshot: AthleteTechnicalEvaluationStats;
  createdAt: string;
};

export type AthleteTechnicalEvaluationStats = {
  gamesRegistered: number;
  gamesPresent: number;
  confirmations: number;
  presencePercent: number;
  confirmationPercent: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  statsScore: number;
};

export type AthleteTechnicalEvaluationSummary = {
  year: number;
  stats: AthleteTechnicalEvaluationStats;
  latest: AthleteTechnicalEvaluation | null;
  history: AthleteTechnicalEvaluation[];
};

export type LineupDraft = {
  red: AthleteProfile[];
  white: AthleteProfile[];
  redBench: AthleteProfile[];
  whiteBench: AthleteProfile[];
  blocked: AthleteProfile[];
  attemptNumber: number | null;
  notes: string[];
  totals: {
    redRating: number;
    whiteRating: number;
    eligible: number;
    blocked: number;
    redBench: number;
    whiteBench: number;
    emergencyGoalkeepers: number;
  };
};

export type FinancialEntry = {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string;
  amountCents: number;
  competenceMonth: number;
  competenceYear: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  dueDate: string | null;
  paidAt: string | null;
  associateId: string | null;
  goalkeeperContractId: string | null;
  receiptUrl: string | null;
  costCenter: string | null;
  createdAt: string;
};

export type FinancialSummary = {
  month: number;
  year: number;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  pendingCount: number;
  overdueCount: number;
  byCategory: Array<{
    category: string;
    totalCents: number;
  }>;
};

export type FinancePeriodReportMonth = {
  month: number;
  year: number;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  pendingCents: number;
  overdueCents: number;
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
  totalCount: number;
};

export type FinancePeriodReport = {
  range: "MONTH" | "QUARTER" | "SEMESTER" | "YEAR";
  period: {
    from: { month: number; year: number };
    to: { month: number; year: number };
  };
  totals: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
    pendingCents: number;
    overdueCents: number;
    pendingCount: number;
    overdueCount: number;
    paidCount: number;
    totalCount: number;
  };
  averages: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
  };
  indicators: {
    marginPercent: number;
    expenseRatioPercent: number;
    delinquencyRiskPercent: number;
    incomeDeltaPercent: number | null;
    expenseDeltaPercent: number | null;
    balanceDeltaPercent: number | null;
  };
  highlights: {
    bestMonth: FinancePeriodReportMonth | null;
    worstMonth: FinancePeriodReportMonth | null;
  };
  categories: Array<{
    category: string;
    type: "INCOME" | "EXPENSE";
    totalCents: number;
    count: number;
  }>;
  monthly: FinancePeriodReportMonth[];
};

export type ReportsSummary = {
  period: {
    month: number;
    year: number;
  };
  financial: FinancialSummary;
  topScorer: Scorer | null;
  discipline: {
    yellow: number;
    red: number;
    suspensions: number;
    activeSuspensions: number;
  };
  confrontations: ConfrontationSummary;
};

export type YearComparisonDelta = {
  value: number;
  percent: number | null;
};

export type YearComparisonSnapshot = {
  year: number;
  finance: {
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
    pendingCents: number;
    overdueCents: number;
    paidMonthlyFeesCents: number;
    paidMonthlyFeesCount: number;
  };
  sports: {
    games: number;
    finishedGames: number;
    goals: number;
    lineups: number;
    presences: number;
    draftAttempts: number;
    topScorer: Scorer | null;
    performance: {
      scorers: Scorer[];
      wins: Array<{
        athleteId: string;
        name: string;
        games: number;
        wins: number;
        draws: number;
        losses: number;
        winRate: number;
      }>;
      contributions: Array<{
        athleteId: string;
        name: string;
        goals: number;
        assists: number;
        total: number;
      }>;
      discipline: Array<{
        athleteId: string;
        name: string;
        yellowCards: number;
        redCards: number;
        suspensions: number;
        fairPlayScore: number;
      }>;
    };
    results: Array<{
      id: string;
      date: string;
      location: string;
      status: GameStatus;
      redTeamName: string | null;
      whiteTeamName: string | null;
      redScore: number | null;
      whiteScore: number | null;
      winnerSide: TeamSide | null;
      isDraw: boolean;
      finishedAt: string | null;
    }>;
    discipline: {
      yellow: number;
      red: number;
      suspensions: number;
      activeSuspensions: number;
    };
    confrontations: ConfrontationSummary;
  };
  members: {
    activeAthletes: number;
    createdAthletes: number;
    activeAssociates: number;
    createdAssociates: number;
  };
  audit: {
    actions: number;
  };
  monthly: Array<{
    month: number;
    incomeCents: number;
    expenseCents: number;
    balanceCents: number;
    pendingCents: number;
    overdueCents: number;
    games: number;
    finishedGames: number;
    goals: number;
    presences: number;
  }>;
};

export type YearComparisonReport = {
  current: YearComparisonSnapshot;
  previous: YearComparisonSnapshot;
  deltas: {
    incomeCents: YearComparisonDelta;
    expenseCents: YearComparisonDelta;
    balanceCents: YearComparisonDelta;
    games: YearComparisonDelta;
    goals: YearComparisonDelta;
    presences: YearComparisonDelta;
    activeAthletes: YearComparisonDelta;
    activeAssociates: YearComparisonDelta;
    auditActions: YearComparisonDelta;
  };
};

export type PresidentTerm = {
  id: string;
  name: string;
  startedYear: number;
  endedYear: number | null;
  photoUrl: string | null;
  note: string | null;
  achievements: string | null;
};

export type HistoricalArchiveReport = {
  period: {
    fromYear: number;
    toYear: number;
  };
  yearClosures: Array<{
    year: number;
    finance: {
      incomeCents: number;
      expenseCents: number;
      balanceCents: number;
      pendingCents: number;
      overdueCents: number;
    };
    sports: {
      games: number;
      finishedGames: number;
      goals: number;
      presences: number;
    };
  }>;
  allTime: {
    scorers: Array<{
      athleteId: string;
      name: string;
      goals: number;
      assists: number;
      games: number;
      goalAverage: number;
    }>;
    winners: Array<{
      athleteId: string;
      name: string;
      games: number;
      wins: number;
      draws: number;
      losses: number;
      winRate: number;
    }>;
  };
  scoringByYear: Array<{
    year: number;
    topScorers: Scorer[];
  }>;
  winsByYear: Array<{
    year: number;
    topWins: Array<{
      athleteId: string;
      name: string;
      games: number;
      wins: number;
      draws: number;
      losses: number;
      winRate: number;
    }>;
  }>;
  gameResults: Array<{
    year: number;
    games: Array<{
      id: string;
      date: string;
      location: string;
      status: GameStatus;
      championship: string | null;
      gameMode: GameMode;
      isOfficial: boolean;
      redTeamName: string | null;
      whiteTeamName: string | null;
      redScore: number | null;
      whiteScore: number | null;
      winnerSide: TeamSide | null;
      isDraw: boolean;
      finishedAt: string | null;
    }>;
  }>;
  presidents: PresidentTerm[];
  boardTerms: Array<{
    id: string;
    startedYear: number;
    endedYear: number | null;
    note: string | null;
    associate: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      status: AssociateStatus;
      athlete?: {
        photoUrl: string | null;
      } | null;
    };
    boardRole: {
      id: string;
      name: string;
      description: string | null;
      canAccessAdmin: boolean;
      canAccessFinancial: boolean;
      canAccessAthlete: boolean;
    };
  }>;
  uniformHistory: Array<{
    id: string;
    side: string;
    seasonLabel: string;
    seasonYear: number | null;
    name: string;
    color: string;
    imageUrl: string | null;
    note: string | null;
  }>;
};

export type GalleryAsset = {
  id: string;
  type:
    | "ATHLETE_PROFILE"
    | "GAME"
    | "CONFRONTATION"
    | "EVENT"
    | "FINANCIAL_RECEIPT"
    | "GENERAL";
  url: string;
  title: string | null;
  year: number | null;
  athleteId: string | null;
  gameId: string | null;
  confrontationId: string | null;
  uploadedById: string | null;
  createdAt: string;
};

export type ArchiveItemType =
  | "DASHBOARD"
  | "GAME"
  | "ATHLETE"
  | "DIRECTOR"
  | "TITLE"
  | "MATCH_REPORT"
  | "TIMELINE"
  | "SHIRT"
  | "GALLERY"
  | "DOCUMENT"
  | "AWARD"
  | "ASSET"
  | "HALL_OF_FAME";

export type ArchiveItemStatus = "DRAFT" | "PUBLISHED" | "PRIVATE";
export type ArchiveAttachmentType = "IMAGE" | "VIDEO" | "PDF" | "DOCUMENT" | "LINK" | "OTHER";

export type ArchiveAttachment = {
  id: string;
  archiveItemId: string;
  type: ArchiveAttachmentType;
  title: string | null;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
};

export type ArchiveItem = {
  id: string;
  type: ArchiveItemType;
  status: ArchiveItemStatus;
  title: string;
  subtitle: string | null;
  description: string | null;
  year: number | null;
  occurredAt: string | null;
  category: string | null;
  tags: string[];
  coverImageUrl: string | null;
  externalUrl: string | null;
  location: string | null;
  periodLabel: string | null;
  personName: string | null;
  personRole: string | null;
  competition: string | null;
  resultLabel: string | null;
  scoreLabel: string | null;
  assetCode: string | null;
  assetCondition: string | null;
  documentNumber: string | null;
  visibility: string;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  metadata: unknown;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  attachments: ArchiveAttachment[];
};

export type ArchiveItemPayload = {
  type: ArchiveItemType;
  status?: ArchiveItemStatus;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  year?: number | null;
  occurredAt?: string | null;
  category?: string | null;
  tags?: string[];
  coverImageUrl?: string | null;
  externalUrl?: string | null;
  location?: string | null;
  periodLabel?: string | null;
  personName?: string | null;
  personRole?: string | null;
  competition?: string | null;
  resultLabel?: string | null;
  scoreLabel?: string | null;
  assetCode?: string | null;
  assetCondition?: string | null;
  documentNumber?: string | null;
  visibility?: string;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  metadata?: Record<string, unknown> | null;
  attachments?: Array<{
    type?: ArchiveAttachmentType;
    title?: string | null;
    url: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
  }>;
};

export type ClubEventStatus = "DRAFT" | "OPEN" | "CLOSED" | "CANCELED";
export type ClubEventType = "SOCIAL" | "SPORT" | "FUNDRAISING" | "MEETING" | "COMMUNITY" | "OTHER";
export type ClubEventRegistrationStatus = "PENDING" | "CONFIRMED" | "CANCELED" | "CHECKED_IN";

export type ClubEvent = {
  id: string;
  title: string;
  description: string | null;
  type: ClubEventType;
  status: ClubEventStatus;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  registrationEnabled: boolean;
  registrationFeeCents: number;
  expectedRevenueCents: number;
  expectedExpenseCents: number;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClubEventRegistration = {
  id: string;
  eventId: string;
  associateId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: ClubEventRegistrationStatus;
  amountCents: number;
  paidAt: string | null;
  checkedInAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  associate?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
  } | null;
};

export type TenantStatus = "TRIAL" | "ACTIVE" | "IMPLEMENTATION" | "SUSPENDED" | "CANCELED";
export type TenantDomainStatus = "PENDING" | "VERIFIED" | "FAILED";
export type TenantProvisioningStatus = "NOT_STARTED" | "DATABASE_PENDING" | "MIGRATING" | "READY" | "FAILED";
export type SaaSChargeType = "MONTHLY" | "IMPLEMENTATION" | "EXTRA";
export type SaaSChargeStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
export type TenantModuleCode =
  | "ATHLETES"
  | "ASSOCIATES"
  | "CLUBS"
  | "TEAMS"
  | "GAMES"
  | "LINEUPS"
  | "CALLUPS"
  | "COMPETITIONS"
  | "EVENTS"
  | "ATTENDANCE"
  | "RANKINGS"
  | "OFFICIAL_STATS"
  | "FINANCE"
  | "REPORTS"
  | "DOCUMENTS"
  | "COMMUNICATION"
  | "GALLERY"
  | "SETTINGS";

export type TenantModuleCatalogItem = {
  code: TenantModuleCode;
  label: string;
  description: string;
  includedByDefault: boolean;
};

export type SaaSPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyFeeCents: number;
  implementationFeeCents: number;
  monthlyDueDay: number;
  maxUsers: number | null;
  maxAthletes: number | null;
  maxTeams: number | null;
  customDomainAllowed: boolean;
  moduleCodes: TenantModuleCode[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlatformSettings = {
  id: string;
  platformName: string;
  supportEmail: string;
  commercialEmail: string;
  baseDomain: string;
  defaultTrialDays: number;
  defaultImplementationDays: number;
  defaultBillingGraceDays: number;
  defaultMonthlyDueDay: number;
  autoSuspendEnabled: boolean;
  autoReactivateEnabled: boolean;
  requireVerifiedDomain: boolean;
  allowPathAccess: boolean;
  defaultProvisioningMode: "AUTOMATIC" | "MANUAL" | "HYBRID";
  tenantNamingPattern: string;
  auditRetentionDays: number;
  createdAt: string;
  updatedAt: string;
};

export type TenantDomain = {
  id: string;
  tenantId: string;
  hostname: string;
  type: string;
  status: TenantDomainStatus;
  expectedCname: string;
  lastCheckedAt: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaaSCharge = {
  id: string;
  tenantId: string;
  type: SaaSChargeType;
  description: string;
  amountCents: number;
  competenceMonth: number | null;
  competenceYear: number | null;
  dueDate: string;
  paidAt: string | null;
  status: SaaSChargeStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
};

export type OrganizationTenant = {
  id: string;
  planId: string | null;
  name: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: TenantStatus;
  planName: string;
  monthlyFeeCents: number;
  implementationFeeCents: number;
  monthlyDueDay: number;
  defaultSubdomain: string;
  databaseName: string;
  databaseUrl: string | null;
  provisioningStatus: TenantProvisioningStatus;
  provisioningError: string | null;
  provisionedAt: string | null;
  brandName: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  organizationType: OrganizationType;
  mainClubName: string | null;
  mainClubLogoUrl: string | null;
  mainClubPrimaryColor: string | null;
  mainClubSecondaryColor: string | null;
  activeCategories: TeamCategory[];
  usesFinance: boolean;
  usesAssociates: boolean;
  usesExternalGames: boolean;
  usesCompetitions: boolean;
  usesInternalRanking: boolean;
  notes: string | null;
  suspendedReason: string | null;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  domains: TenantDomain[];
  charges: SaaSCharge[];
  users: TenantManagedUser[];
  groupSettings: GroupSettings | null;
  paymentSettings: PaymentSettings | null;
  plan: SaaSPlan | null;
  moduleCatalog: TenantModuleCatalogItem[];
  enabledModules: TenantModuleCode[];
  primaryUrl: string;
  pathUrl: string;
  publicPathUrl: string;
  openAmountCents: number;
  paidAmountCents: number;
  verifiedDomains: number;
  pendingDomains: number;
};

export type MonthlySaaSGenerationResult = {
  month: number;
  year: number;
  eligibleTenants: number;
  created: number;
};

export type BillingEnforcementResult = {
  graceDays: number;
  autoSuspendEnabled: boolean;
  reviewed: number;
  suspended: number;
  affectedTenants: Array<{
    id: string;
    name: string;
    maxDaysOverdue: number;
    openAmountCents: number;
    suspended: boolean;
  }>;
};

export type CurrentTenant = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  hostname: string;
  platformName: string;
  defaultSubdomain: string;
  primaryUrl: string;
  publicPath: string | null;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  organizationType: OrganizationType;
  mainClubName: string | null;
  mainClubLogoUrl: string | null;
  mainClubPrimaryColor: string | null;
  mainClubSecondaryColor: string | null;
  activeCategories: TeamCategory[];
  usesFinance: boolean;
  usesAssociates: boolean;
  usesExternalGames: boolean;
  usesCompetitions: boolean;
  usesInternalRanking: boolean;
  menuStyle: "brand" | "light" | "glass";
  interfaceEffects: "full" | "soft" | "minimal";
  enabledModules: TenantModuleCode[];
};

export type TenantBrandingSettings = {
  id: string;
  name: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  menuStyle: "brand" | "light" | "glass";
  interfaceEffects: "full" | "soft" | "minimal";
};

export type TenantBillingStatus = {
  id: string;
  name: string;
  status: TenantStatus;
  suspendedReason: string | null;
  planName: string;
  monthlyFeeCents: number;
  openAmountCents: number;
  charges: Array<{
    id: string;
    type: SaaSChargeType;
    description: string;
    amountCents: number;
    dueDate: string;
    status: SaaSChargeStatus;
  }>;
};
