import {
  PrismaClient,
  AssociateStatus,
  AthleteLinkType,
  AthletePosition,
  AthleteStatus,
  ExpenseCategory,
  PaymentStatus,
  UserRole,
  JoinRequestStatus
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "1") {
    throw new Error("Seed bloqueado em produção. Defina ALLOW_PRODUCTION_SEED=1 apenas para uma operação planejada.");
  }

  await prisma.mediaAsset.deleteMany();
  await prisma.lineupDraftAttempt.deleteMany();
  await prisma.gameSubstitution.deleteMany();
  await prisma.cardRecord.deleteMany();
  await prisma.gameEvent.deleteMany();
  await prisma.gameCallUp.deleteMany();
  await prisma.gameLineup.deleteMany();
  await prisma.confrontationMatch.deleteMany();
  await prisma.game.deleteMany();
  await prisma.competitionTeam.deleteMany();
  await prisma.confrontation.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.team.deleteMany();
  await prisma.club.deleteMany();
  await prisma.field.deleteMany();
  await prisma.clubEventRegistration.deleteMany();
  await prisma.clubEvent.deleteMany();
  await prisma.athleteTechnicalEvaluation.deleteMany();
  await prisma.suspension.deleteMany();
  await prisma.financialEntry.deleteMany();
  await prisma.collectionActionLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.goalkeeperContract.deleteMany();
  await prisma.match.deleteMany();
  await prisma.season.deleteMany();
  await prisma.joinRequest.deleteMany();
  await prisma.userRoleAssignment.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.groupSettings.deleteMany();
  await prisma.paymentSettings.deleteMany();
  await prisma.athlete.deleteMany();
  await prisma.associate.deleteMany();
  await prisma.boardRole.deleteMany();
  await prisma.presidentTerm.deleteMany();
  await prisma.tenantModule.deleteMany();
  await prisma.saaSCharge.deleteMany();
  await prisma.tenantDomain.deleteMany();
  await prisma.organizationTenant.deleteMany();

  const demoTenant = await prisma.organizationTenant.create({
    data: {
      name: "GestaSports Demo",
      slug: "gestasports-demo",
      contactName: "Admin GestaSports",
      contactEmail: "admin@gestasports.com.br",
      status: "ACTIVE",
      planName: "Cliente piloto",
      monthlyFeeCents: 0,
      implementationFeeCents: 0,
      monthlyDueDay: 10,
      defaultSubdomain: "demo.gestasports.com.br",
      databaseName: "gestasports_demo",
      databaseUrl: process.env.DATABASE_URL,
      provisioningStatus: "READY",
      provisionedAt: new Date(),
      brandName: "GestaSports",
      primaryColor: "#08255b",
      secondaryColor: "#08255b",
      accentColor: "#55ad32",
      notes: "Cliente piloto usado para validar o SaaS GestaSports antes de novos clientes.",
      activatedAt: new Date(),
      domains: {
        create: {
          hostname: "demo.gestasports.com.br",
          type: "SUBDOMAIN",
          status: "VERIFIED",
          expectedCname: "gestasports.com.br",
          verifiedAt: new Date(),
          lastCheckedAt: new Date()
        }
      }
    }
  });

  const associates = await prisma.associate.createMany({
    data: [
      "Lucas Pereira",
      "Gustavo Andrade",
      "Thiago Sousa",
      "Lucas Rocha",
      "Joao Carvalho",
      "Bruno Pacheco",
      "Mateus Oliveira",
      "Rafael Nunes",
      "Diego Martins",
      "Carlos Almeida",
      "Andre Lourenco",
      "Felipe Couto",
      "Vinicius Melo",
      "Rodrigo Tavares",
      "Pedro Henrique",
      "Gabriel Lima",
      "Caio Bernardes",
      "Leandro Vieira",
      "Renato Paixao",
      "Igor Teixeira",
      "Juliano Duarte",
      "Sergio Prado",
      "Fabio Coelho",
      "Leonardo Ramos"
    ].map((name) => ({
      tenantId: demoTenant.id,
      name,
      status: ["Gustavo Andrade", "Joao Carvalho", "Rodrigo Tavares"].includes(name)
        ? AssociateStatus.LATE
        : name === "Fabio Coelho"
          ? AssociateStatus.INACTIVE
          : AssociateStatus.ACTIVE,
      monthlyFeeCents: 6000
    }))
  });

  const allAssociates = await prisma.associate.findMany({ where: { tenantId: demoTenant.id } });
  const lucasAssociate = allAssociates.find((associate) => associate.name === "Lucas Pereira");

  if (!lucasAssociate) {
    throw new Error("Associado Lucas Pereira não encontrado para vínculo de atleta.");
  }

  const demoPassword = process.env.DEMO_USER_PASSWORD ?? "GestaSports@2026";
  const defaultPassword = await bcrypt.hash(demoPassword, 10);

  await prisma.user.createMany({
    data: [
      {
        name: "Superadmin",
        email: "superadmin@gestasports.com",
        passwordHash: defaultPassword,
        role: UserRole.SUPERADMIN
      },
      {
        tenantId: demoTenant.id,
        name: "Admin GestaSports",
        email: "admin@gestasports.com.br",
        passwordHash: defaultPassword,
        role: UserRole.ADMIN
      },
      {
        tenantId: demoTenant.id,
        name: "Financeiro GestaSports",
        email: "financeiro@gestasports.com.br",
        passwordHash: defaultPassword,
        role: UserRole.FINANCIAL
      },
      {
        tenantId: demoTenant.id,
        name: "Atleta GestaSports",
        email: "atleta@gestasports.com.br",
        passwordHash: defaultPassword,
        role: UserRole.ATHLETE,
        associateId: lucasAssociate.id
      }
    ]
  });

  const athleteUser = await prisma.user.findFirst({ where: { tenantId: demoTenant.id, email: "atleta@gestasports.com.br" } });
  if (!athleteUser) {
    throw new Error("Usuário atleta não encontrado para criar solicitações de convidado.");
  }

  await prisma.groupSettings.create({
    data: {
      id: "main",
      tenantId: demoTenant.id,
      groupName: "GestaSports",
      closedMode: true,
      inviteCode: null
    }
  });

  await prisma.joinRequest.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        name: "Mateus Oliveira",
        email: "mateus.oliveira@email.com",
        phone: "48988887777",
        message: "Jogo aos sabados, posso contribuir no financeiro.",
        invitedByAssociateId: lucasAssociate.id,
        invitedByUserId: athleteUser.id,
        status: JoinRequestStatus.PENDING
      },
      {
        tenantId: demoTenant.id,
        name: "Bruno Pacheco",
        email: "bruno.pacheco@email.com",
        phone: "48977776666",
        message: "Quero participar como goleiro fixo.",
        invitedByAssociateId: lucasAssociate.id,
        invitedByUserId: athleteUser.id,
        status: JoinRequestStatus.PENDING
      }
    ]
  });

  const currentYear = 2026;
  const currentMonth = 4;
  const defaultPositions = [
    AthletePosition.GOALKEEPER,
    AthletePosition.DEFENDER,
    AthletePosition.RIGHT_BACK,
    AthletePosition.LEFT_BACK,
    AthletePosition.DEFENSIVE_MIDFIELDER,
    AthletePosition.CENTRAL_MIDFIELDER,
    AthletePosition.ATTACKING_MIDFIELDER,
    AthletePosition.RIGHT_WINGER,
    AthletePosition.LEFT_WINGER,
    AthletePosition.STRIKER
  ];

  for (const [index, associate] of allAssociates.entries()) {
    await prisma.athlete.upsert({
      where: { associateId: associate.id },
      update: {
        name: associate.name,
        status: associate.status === AssociateStatus.LATE ? AthleteStatus.DELINQUENT : AthleteStatus.ACTIVE
      },
      create: {
        tenantId: demoTenant.id,
        name: associate.name,
        position: associate.name.includes("Joao") ? AthletePosition.GOALKEEPER : (defaultPositions[index % defaultPositions.length] as AthletePosition),
        linkType: AthleteLinkType.ASSOCIATE,
        status: associate.status === AssociateStatus.LATE ? AthleteStatus.DELINQUENT : AthleteStatus.ACTIVE,
        rating: associate.name.includes("Lucas") ? 4 : 3,
        associateId: associate.id
      }
    });

    await prisma.payment.create({
      data: {
        tenantId: demoTenant.id,
        associateId: associate.id,
        month: currentMonth,
        year: currentYear,
        amountCents: associate.monthlyFeeCents,
        dueDate: new Date("2026-04-10T00:00:00.000Z"),
        status: associate.status === AssociateStatus.LATE ? PaymentStatus.LATE : PaymentStatus.PAID,
        paidAt: associate.status === AssociateStatus.LATE ? null : new Date("2026-04-08T10:00:00.000Z")
      }
    });
  }

  await prisma.expense.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        description: "Aluguel de campo",
        category: ExpenseCategory.FIELD,
        amountCents: 480000,
        occurredAt: new Date("2026-04-03T12:00:00.000Z")
      },
      {
        tenantId: demoTenant.id,
        description: "Goleiros contratados",
        category: ExpenseCategory.GOALKEEPERS,
        amountCents: 270000,
        occurredAt: new Date("2026-04-06T12:00:00.000Z")
      },
      {
        tenantId: demoTenant.id,
        description: "Arbitragem mensal",
        category: ExpenseCategory.REFEREE,
        amountCents: 250000,
        occurredAt: new Date("2026-04-12T12:00:00.000Z")
      },
      {
        tenantId: demoTenant.id,
        description: "Compra de uniformes",
        category: ExpenseCategory.UNIFORMS,
        amountCents: 205000,
        occurredAt: new Date("2026-04-18T12:00:00.000Z")
      }
    ]
  });

  await prisma.goalkeeperContract.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        keeperName: "Andre Lourenco",
        monthlyCostCents: 90000,
        startedAt: new Date("2026-02-01T00:00:00.000Z"),
        active: true
      },
      {
        tenantId: demoTenant.id,
        keeperName: "Carlos Almeida",
        monthlyCostCents: 90000,
        startedAt: new Date("2026-02-01T00:00:00.000Z"),
        active: true
      },
      {
        tenantId: demoTenant.id,
        keeperName: "Felipe Couto",
        monthlyCostCents: 90000,
        startedAt: new Date("2026-02-01T00:00:00.000Z"),
        active: true
      }
    ]
  });

  const firstMatch = await prisma.match.create({
    data: {
      opponent: "Palmeiras",
      tenantId: demoTenant.id,
      location: "Campo Ribeirao da Ilha",
      startsAt: new Date("2026-06-26T09:00:00.000Z"),
      costCents: 1000
    }
  });

  const secondMatch = await prisma.match.create({
    data: {
      opponent: "Vila Unidos",
      tenantId: demoTenant.id,
      location: "Campo Ribeirao da Ilha",
      startsAt: new Date("2026-06-30T09:00:00.000Z"),
      costCents: 1000
    }
  });

  await prisma.attendance.createMany({
    data: allAssociates.map((associate, index) => ({
      tenantId: demoTenant.id,
      associateId: associate.id,
      matchId: firstMatch.id,
      confirmed: true
    }))
  });

  console.log(`Seed concluido. ${associates.count} associados inseridos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
