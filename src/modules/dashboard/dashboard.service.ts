import { FinancialCategory, FinancialEntryStatus, FinancialEntryType, PaymentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

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
  monthlySeries: Array<{
    month: string;
    revenueCents: number;
    expenseCents: number;
  }>;
  recentAssociates: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
  upcomingMatches: Array<{
    id: string;
    opponent: string;
    location: string;
    startsAt: string;
    costCents: number;
    confirmedCount: number;
  }>;
  nextMatch: {
    id: string;
    opponent: string;
    location: string;
    startsAt: string;
    costCents: number;
    confirmedCount: number;
    pendingCount: number;
    confirmed: Array<{
      id: string;
      name: string;
      photoUrl: string | null;
    }>;
    pending: Array<{
      id: string;
      name: string;
      photoUrl: string | null;
    }>;
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
  alerts: Array<{
    title: string;
    subtitle: string;
  }>;
};

type MonthWindowItem = {
  month: number;
  year: number;
  label: string;
};

type DashboardPerson = {
  id: string;
  name: string;
  photoUrl: string | null;
};

type SportsDashboardData = Pick<DashboardSummary, "upcomingMatches" | "nextMatch" | "presenceRanking">;

type FinancialDashboardData = Pick<
  DashboardSummary,
  | "monthRevenueCents"
  | "monthExpenseCents"
  | "keeperCostCents"
  | "balanceCents"
  | "expenseComposition"
  | "monthlySeries"
  | "recentFinancialEntries"
  | "monthlyFeeAlert"
>;

const shortMonthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function buildMonthWindow(month: number, year: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 6 + index, 1));

    return {
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear(),
      label: shortMonthLabels[date.getUTCMonth()] ?? `M${date.getUTCMonth() + 1}`
    };
  });
}

function monthRange(month: number, year: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1))
  };
}

function gameOpponent(game: {
  type: string;
  championship: string | null;
  redTeamName: string | null;
  whiteTeamName: string | null;
}) {
  if (game.type === "INTERNAL") {
    return `${game.redTeamName || "Time A"} x ${game.whiteTeamName || "Time B"}`;
  }

  return game.championship || "Jogo externo";
}

function mapGamePerson(lineup: { athlete: DashboardPerson | null }) {
  if (!lineup.athlete) {
    return null;
  }

  return {
    id: lineup.athlete.id,
    name: lineup.athlete.name,
    photoUrl: lineup.athlete.photoUrl
  };
}

function mapMatchAttendancePerson(attendance: {
  associate: {
    id: string;
    name: string;
    athlete: {
      photoUrl: string | null;
    } | null;
  };
}) {
  return {
    id: attendance.associate.id,
    name: attendance.associate.name,
    photoUrl: attendance.associate.athlete?.photoUrl ?? null
  };
}

async function getFinancialDashboardData(month: number, year: number, monthWindow: MonthWindowItem[]): Promise<FinancialDashboardData> {
  const hasFinancialEntries = await prisma.financialEntry.count({
    where: {
      OR: monthWindow.map((period) => ({
        competenceMonth: period.month,
        competenceYear: period.year
      }))
    }
  });

  if (hasFinancialEntries === 0) {
    return getLegacyFinancialDashboardData(month, year, monthWindow);
  }

  const [incomeAgg, expenseAgg, keeperAgg, expenseComposition, recentFinancialEntries, pendingFees, overdueFees, openFeeAmount, monthlySeries] = await Promise.all([
    prisma.financialEntry.aggregate({
      where: {
        competenceMonth: month,
        competenceYear: year,
        type: FinancialEntryType.INCOME,
        status: FinancialEntryStatus.PAID
      },
      _sum: { amountCents: true }
    }),
    prisma.financialEntry.aggregate({
      where: {
        competenceMonth: month,
        competenceYear: year,
        type: FinancialEntryType.EXPENSE,
        status: FinancialEntryStatus.PAID
      },
      _sum: { amountCents: true }
    }),
    prisma.financialEntry.aggregate({
      where: {
        competenceMonth: month,
        competenceYear: year,
        type: FinancialEntryType.EXPENSE,
        category: FinancialCategory.GOALKEEPER_CONTRACT,
        status: FinancialEntryStatus.PAID
      },
      _sum: { amountCents: true }
    }),
    prisma.financialEntry.groupBy({
      by: ["category"],
      where: {
        competenceMonth: month,
        competenceYear: year,
        type: FinancialEntryType.EXPENSE,
        status: FinancialEntryStatus.PAID
      },
      _sum: { amountCents: true }
    }),
    prisma.financialEntry.findMany({
      where: {
        competenceMonth: month,
        competenceYear: year
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 4,
      select: {
        id: true,
        type: true,
        category: true,
        description: true,
        amountCents: true,
        status: true,
        dueDate: true,
        paidAt: true
      }
    }),
    prisma.financialEntry.count({
      where: {
        competenceMonth: month,
        competenceYear: year,
        category: FinancialCategory.MONTHLY_FEE,
        status: FinancialEntryStatus.PENDING
      }
    }),
    prisma.financialEntry.count({
      where: {
        competenceMonth: month,
        competenceYear: year,
        category: FinancialCategory.MONTHLY_FEE,
        status: FinancialEntryStatus.OVERDUE
      }
    }),
    prisma.financialEntry.aggregate({
      where: {
        competenceMonth: month,
        competenceYear: year,
        category: FinancialCategory.MONTHLY_FEE,
        status: { in: [FinancialEntryStatus.PENDING, FinancialEntryStatus.OVERDUE] }
      },
      _sum: { amountCents: true }
    }),
    Promise.all(
      monthWindow.map(async (period) => {
        const [monthRevenue, monthExpense] = await Promise.all([
          prisma.financialEntry.aggregate({
            where: {
              competenceMonth: period.month,
              competenceYear: period.year,
              type: FinancialEntryType.INCOME,
              status: FinancialEntryStatus.PAID
            },
            _sum: { amountCents: true }
          }),
          prisma.financialEntry.aggregate({
            where: {
              competenceMonth: period.month,
              competenceYear: period.year,
              type: FinancialEntryType.EXPENSE,
              status: FinancialEntryStatus.PAID
            },
            _sum: { amountCents: true }
          })
        ]);

        return {
          month: period.label,
          revenueCents: monthRevenue._sum.amountCents ?? 0,
          expenseCents: monthExpense._sum.amountCents ?? 0
        };
      })
    )
  ]);

  const monthRevenueCents = incomeAgg._sum.amountCents ?? 0;
  const monthExpenseCents = expenseAgg._sum.amountCents ?? 0;

  return {
    monthRevenueCents,
    monthExpenseCents,
    keeperCostCents: keeperAgg._sum.amountCents ?? 0,
    balanceCents: monthRevenueCents - monthExpenseCents,
    expenseComposition: expenseComposition.map((item) => ({
      category: item.category,
      totalCents: item._sum.amountCents ?? 0
    })),
    monthlySeries,
    recentFinancialEntries: recentFinancialEntries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      category: entry.category,
      description: entry.description,
      amountCents: entry.amountCents,
      status: entry.status,
      dueDate: entry.dueDate?.toISOString() ?? null,
      paidAt: entry.paidAt?.toISOString() ?? null
    })),
    monthlyFeeAlert: {
      pendingCount: pendingFees,
      lateCount: overdueFees,
      amountCents: openFeeAmount._sum.amountCents ?? 0
    }
  };
}

async function getLegacyFinancialDashboardData(month: number, year: number, monthWindow: MonthWindowItem[]): Promise<FinancialDashboardData> {
  const currentRange = monthRange(month, year);

  const [payments, expenses, keeperContracts, expenseComposition, latePaymentsCount, dueSoonCount, openMonthlyPayments, recentPayments, recentExpenses, monthlySeries] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { month, year, status: PaymentStatus.PAID },
        _sum: { amountCents: true }
      }),
      prisma.expense.aggregate({
        where: {
          occurredAt: currentRange
        },
        _sum: { amountCents: true }
      }),
      prisma.goalkeeperContract.aggregate({
        where: { active: true },
        _sum: { monthlyCostCents: true }
      }),
      prisma.expense.groupBy({
        by: ["category"],
        _sum: { amountCents: true },
        where: {
          occurredAt: currentRange
        }
      }),
      prisma.payment.count({
        where: { month, year, status: PaymentStatus.LATE }
      }),
      prisma.payment.count({
        where: {
          month,
          year,
          status: PaymentStatus.PENDING,
          dueDate: currentRange
        }
      }),
      prisma.payment.aggregate({
        where: {
          month,
          year,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] }
        },
        _sum: { amountCents: true }
      }),
      prisma.payment.findMany({
        where: {
          month,
          year,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.LATE] }
        },
        include: {
          associate: {
            select: {
              name: true
            }
          }
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 4
      }),
      prisma.expense.findMany({
        where: {
          occurredAt: currentRange
        },
        orderBy: { occurredAt: "desc" },
        take: 4
      }),
      Promise.all(
        monthWindow.map(async (period) => {
          const periodRange = monthRange(period.month, period.year);
          const [monthRevenue, monthExpense] = await Promise.all([
            prisma.payment.aggregate({
              where: { year: period.year, month: period.month, status: PaymentStatus.PAID },
              _sum: { amountCents: true }
            }),
            prisma.expense.aggregate({
              where: {
                occurredAt: periodRange
              },
              _sum: { amountCents: true }
            })
          ]);

          return {
            month: period.label,
            revenueCents: monthRevenue._sum.amountCents ?? 0,
            expenseCents: monthExpense._sum.amountCents ?? 0
          };
        })
      )
    ]);

  const monthRevenueCents = payments._sum.amountCents ?? 0;
  const monthExpenseCents = expenses._sum.amountCents ?? 0;
  const legacyEntries = [
    ...recentPayments.map((payment) => ({
      id: payment.id,
      type: FinancialEntryType.INCOME,
      category: FinancialCategory.MONTHLY_FEE,
      description: `Mensalidade - ${payment.associate.name}`,
      amountCents: payment.amountCents,
      status: payment.status === PaymentStatus.LATE ? FinancialEntryStatus.OVERDUE : FinancialEntryStatus.PENDING,
      dueDate: payment.dueDate?.toISOString() ?? null,
      paidAt: payment.paidAt?.toISOString() ?? null,
      sortDate: payment.dueDate ?? payment.createdAt
    })),
    ...recentExpenses.map((expense) => ({
      id: expense.id,
      type: FinancialEntryType.EXPENSE,
      category: expense.category,
      description: expense.description,
      amountCents: expense.amountCents,
      status: FinancialEntryStatus.PAID,
      dueDate: expense.occurredAt?.toISOString() ?? null,
      paidAt: expense.occurredAt?.toISOString() ?? null,
      sortDate: expense.occurredAt ?? expense.createdAt
    }))
  ]
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
    .slice(0, 4);

  return {
    monthRevenueCents,
    monthExpenseCents,
    keeperCostCents: keeperContracts._sum.monthlyCostCents ?? 0,
    balanceCents: monthRevenueCents - monthExpenseCents,
    expenseComposition: expenseComposition.map((item) => ({
      category: item.category,
      totalCents: item._sum.amountCents ?? 0
    })),
    monthlySeries,
    recentFinancialEntries: legacyEntries.map(({ sortDate: _sortDate, ...entry }) => entry),
    monthlyFeeAlert: {
      pendingCount: dueSoonCount,
      lateCount: latePaymentsCount,
      amountCents: openMonthlyPayments._sum.amountCents ?? 0
    }
  };
}

async function getSportsDashboardData(): Promise<SportsDashboardData> {
  const games = await prisma.game.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: 3,
    include: {
      lineups: {
        include: {
          athlete: {
            select: {
              id: true,
              name: true,
              photoUrl: true
            }
          }
        },
        orderBy: [{ side: "asc" }, { jerseyNumber: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (games.length === 0) {
    return getLegacySportsDashboardData();
  }

  const [athletes, totalGames] = await Promise.all([
    prisma.athlete.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        photoUrl: true,
        lineups: {
          select: {
            presence: true,
            role: true
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.game.count()
  ]);

  const nextGame = games[0] ?? null;
  const nextGameLineups = nextGame?.lineups ?? [];
  const confirmedLineups = nextGameLineups.filter((lineup) => lineup.athlete && lineup.presence && lineup.role !== "ABSENT");
  const pendingLineups = nextGameLineups.filter((lineup) => lineup.athlete && !lineup.presence && lineup.role !== "ABSENT");
  const athletesInNextGame = new Set(nextGameLineups.map((lineup) => lineup.athleteId));
  const missingAthletes =
    nextGame === null
      ? []
      : athletes
          .filter((athlete) => athlete.status !== "INACTIVE" && !athletesInNextGame.has(athlete.id))
          .map((athlete) => ({
            id: athlete.id,
            name: athlete.name,
            photoUrl: athlete.photoUrl
          }));

  const presenceRanking = athletes
    .map((athlete) => {
      const confirmedCount = athlete.lineups.filter((lineup) => lineup.presence && lineup.role !== "ABSENT").length;
      const totalForPercent = Math.max(totalGames, athlete.lineups.length, 1);

      return {
        id: athlete.id,
        name: athlete.name,
        status: athlete.status,
        photoUrl: athlete.photoUrl,
        confirmedCount,
        totalMatches: totalForPercent,
        presencePercent: Math.round((confirmedCount / totalForPercent) * 100)
      };
    })
    .sort((a, b) => b.presencePercent - a.presencePercent || b.confirmedCount - a.confirmedCount || a.name.localeCompare(b.name))
    .slice(0, 5);

  return {
    upcomingMatches: games.map((game) => ({
      id: game.id,
      opponent: gameOpponent(game),
      location: game.location,
      startsAt: game.date.toISOString(),
      costCents: game.gameValueCents,
      confirmedCount: game.lineups.filter((lineup) => lineup.presence && lineup.role !== "ABSENT").length
    })),
    nextMatch: nextGame ?
       {
          id: nextGame.id,
          opponent: gameOpponent(nextGame),
          location: nextGame.location,
          startsAt: nextGame.date.toISOString(),
          costCents: nextGame.gameValueCents,
          confirmedCount: confirmedLineups.length,
          pendingCount: pendingLineups.length + missingAthletes.length,
          confirmed: confirmedLineups.slice(0, 8).map(mapGamePerson).filter((person): person is DashboardPerson => Boolean(person)),
          pending: [
            ...pendingLineups.slice(0, 8).map(mapGamePerson).filter((person): person is DashboardPerson => Boolean(person)),
            ...missingAthletes.slice(0, 8)
          ].slice(0, 8)
        }
      : null,
    presenceRanking
  };
}

async function getLegacySportsDashboardData(): Promise<SportsDashboardData> {
  const [upcomingMatches, nextMatch, associatesForPresence, totalMatches] = await Promise.all([
    prisma.match.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
      select: {
        id: true,
        opponent: true,
        location: true,
        startsAt: true,
        costCents: true,
        attendances: {
          where: { confirmed: true },
          select: { id: true }
        }
      }
    }),
    prisma.match.findFirst({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      include: {
        attendances: {
          include: {
            associate: {
              include: {
                athlete: {
                  select: {
                    photoUrl: true
                  }
                }
              }
            }
          }
        }
      }
    }),
    prisma.associate.findMany({
      include: {
        athlete: {
          select: {
            photoUrl: true
          }
        },
        attendances: {
          select: {
            confirmed: true
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.match.count()
  ]);

  const sortedNextAttendances = [...(nextMatch?.attendances ?? [])].sort((a, b) => a.associate.name.localeCompare(b.associate.name));
  const confirmedAttendances = sortedNextAttendances.filter((attendance) => attendance.confirmed);
  const pendingAttendances = sortedNextAttendances.filter((attendance) => !attendance.confirmed);
  const attendedAssociateIds = new Set(sortedNextAttendances.map((attendance) => attendance.associateId));
  const pendingFromMissingAttendances =
    nextMatch === null
      ? []
      : associatesForPresence
          .filter((associate) => associate.status !== "INACTIVE" && !attendedAssociateIds.has(associate.id))
          .map((associate) => ({
            id: associate.id,
            name: associate.name,
            photoUrl: associate.athlete?.photoUrl ?? null
          }));

  const presenceRanking = associatesForPresence
    .map((associate) => {
      const confirmedCount = associate.attendances.filter((attendance) => attendance.confirmed).length;
      const totalForPercent = Math.max(totalMatches, associate.attendances.length, 1);

      return {
        id: associate.id,
        name: associate.name,
        status: associate.status,
        photoUrl: associate.athlete?.photoUrl ?? null,
        confirmedCount,
        totalMatches: totalForPercent,
        presencePercent: Math.round((confirmedCount / totalForPercent) * 100)
      };
    })
    .sort((a, b) => b.presencePercent - a.presencePercent || b.confirmedCount - a.confirmedCount || a.name.localeCompare(b.name))
    .slice(0, 5);

  return {
    upcomingMatches: upcomingMatches.map((match) => ({
      id: match.id,
      opponent: match.opponent,
      location: match.location,
      startsAt: match.startsAt.toISOString(),
      costCents: match.costCents,
      confirmedCount: match.attendances.length
    })),
    nextMatch: nextMatch ?
       {
          id: nextMatch.id,
          opponent: nextMatch.opponent,
          location: nextMatch.location,
          startsAt: nextMatch.startsAt.toISOString(),
          costCents: nextMatch.costCents,
          confirmedCount: confirmedAttendances.length,
          pendingCount: pendingAttendances.length + pendingFromMissingAttendances.length,
          confirmed: confirmedAttendances.slice(0, 8).map(mapMatchAttendancePerson),
          pending: [...pendingAttendances.slice(0, 8).map(mapMatchAttendancePerson), ...pendingFromMissingAttendances.slice(0, 8)].slice(0, 8)
        }
      : null,
    presenceRanking
  };
}

export async function getDashboardSummary(month: number, year: number): Promise<DashboardSummary> {
  const monthWindow = buildMonthWindow(month, year);

  const [
    associatesActive,
    lateAssociates,
    athletes,
    recentAssociates,
    activeKeeperContracts,
    pendingJoinRequests,
    financial,
    sports
  ] = await Promise.all([
    prisma.associate.count({ where: { status: "ACTIVE" } }),
    prisma.associate.count({ where: { status: "LATE" } }),
    prisma.athlete.findMany({
      include: {
        associate: true
      }
    }),
    prisma.associate.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.goalkeeperContract.count({ where: { active: true } }),
    prisma.joinRequest.count({ where: { status: "PENDING" } }),
    getFinancialDashboardData(month, year, monthWindow),
    getSportsDashboardData()
  ]);

  const athletesReady = athletes.filter((athlete) => {
    const blockedByStatus = athlete.status !== "ACTIVE" || athlete.associate?.status === "INACTIVE";

    return !blockedByStatus;
  }).length;

  return {
    associatesActive,
    lateAssociates,
    athletesTotal: athletes.length,
    athletesReady,
    monthRevenueCents: financial.monthRevenueCents,
    monthExpenseCents: financial.monthExpenseCents,
    keeperCostCents: financial.keeperCostCents,
    balanceCents: financial.balanceCents,
    expenseComposition: financial.expenseComposition,
    monthlySeries: financial.monthlySeries,
    recentAssociates: recentAssociates.map((associate) => ({
      id: associate.id,
      name: associate.name,
      status: associate.status,
      createdAt: associate.createdAt.toISOString()
    })),
    upcomingMatches: sports.upcomingMatches,
    nextMatch: sports.nextMatch,
    presenceRanking: sports.presenceRanking,
    recentFinancialEntries: financial.recentFinancialEntries,
    monthlyFeeAlert: financial.monthlyFeeAlert,
    alerts: [
      {
        title: `${financial.monthlyFeeAlert.lateCount} associados inadimplentes`,
        subtitle: "Necessário contato e regularização"
      },
      {
        title: `${financial.monthlyFeeAlert.pendingCount} vencimentos neste mês`,
        subtitle: "Cobrar para manter o caixa em dia"
      },
      {
        title: `${activeKeeperContracts} goleiros contratados`,
        subtitle: "Revisar custo mensal dos contratos"
      },
      {
        title: `${pendingJoinRequests} solicitações aguardando aprovação`,
        subtitle: "Grupo fechado exige triagem dos novos membros"
      }
    ]
  };
}

export async function getSportsDirectorDashboardSummary() {
  const [sports, athletes] = await Promise.all([
    getSportsDashboardData(),
    prisma.athlete.findMany({ select: { status: true, associate: { select: { status: true } } } })
  ]);

  return {
    ...sports,
    athletesTotal: athletes.length,
    athletesReady: athletes.filter((athlete) => athlete.status === "ACTIVE" && athlete.associate?.status !== "INACTIVE").length
  };
}

