import { PrismaClient, AssociateStatus, ExpenseCategory, PaymentStatus } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    await prisma.attendance.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.goalkeeperContract.deleteMany();
    await prisma.match.deleteMany();
    await prisma.associate.deleteMany();
    const associates = await prisma.associate.createMany({
        data: [
            { name: "Lucas Pereira", status: AssociateStatus.ACTIVE, monthlyFeeCents: 6000 },
            { name: "Gustavo Andrade", status: AssociateStatus.LATE, monthlyFeeCents: 6000 },
            { name: "Thiago Sousa", status: AssociateStatus.ACTIVE, monthlyFeeCents: 6000 },
            { name: "Lucas Rocha", status: AssociateStatus.ACTIVE, monthlyFeeCents: 6000 },
            { name: "Joao Carvalho", status: AssociateStatus.LATE, monthlyFeeCents: 6000 }
        ]
    });
    const allAssociates = await prisma.associate.findMany();
    const currentYear = 2026;
    const currentMonth = 4;
    for (const associate of allAssociates) {
        await prisma.payment.create({
            data: {
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
                description: "Aluguel de campo",
                category: ExpenseCategory.FIELD,
                amountCents: 480000,
                occurredAt: new Date("2026-04-03T12:00:00.000Z")
            },
            {
                description: "Goleiros contratados",
                category: ExpenseCategory.GOALKEEPERS,
                amountCents: 270000,
                occurredAt: new Date("2026-04-06T12:00:00.000Z")
            },
            {
                description: "Arbitragem mensal",
                category: ExpenseCategory.REFEREE,
                amountCents: 250000,
                occurredAt: new Date("2026-04-12T12:00:00.000Z")
            },
            {
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
                keeperName: "Andre Lourenco",
                monthlyCostCents: 90000,
                startedAt: new Date("2026-02-01T00:00:00.000Z"),
                active: true
            },
            {
                keeperName: "Carlos Almeida",
                monthlyCostCents: 90000,
                startedAt: new Date("2026-02-01T00:00:00.000Z"),
                active: true
            },
            {
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
            location: "Campo Ribeirao da Ilha",
            startsAt: new Date("2026-04-26T09:00:00.000Z"),
            costCents: 1000
        }
    });
    const secondMatch = await prisma.match.create({
        data: {
            opponent: "Vila Unidos",
            location: "Campo Ribeirao da Ilha",
            startsAt: new Date("2026-04-30T09:00:00.000Z"),
            costCents: 1000
        }
    });
    await prisma.attendance.createMany({
        data: allAssociates.map((associate, index) => ({
            associateId: associate.id,
            matchId: index % 2 === 0 ? firstMatch.id : secondMatch.id,
            confirmed: index % 3 !== 0
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
