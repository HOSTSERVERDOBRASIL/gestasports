import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDashboardSummary, getSportsDirectorDashboardSummary } from "./dashboard.service.js";
import { prisma } from "../../lib/prisma.js";

const dashboardQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).default(4),
  year: z.coerce.number().int().min(1980).max(2100).default(2026)
});

const dashboardWidgetCodes = [
  "next_match",
  "upcoming_matches",
  "latest_results",
  "active_players",
  "active_associates",
  "new_associates",
  "birthday_members",
  "monthly_revenue",
  "monthly_expenses",
  "delinquency",
  "pending_pix",
  "monthly_fees",
  "agenda",
  "training",
  "events",
  "memorial_latest_title",
  "memorial_photos",
  "timeline",
  "alerts",
  "messages",
  "attendance"
] as const;

const dashboardWidgetSizeSchema = z.enum(["S", "M", "L", "XL", "FULL"]);
const dashboardWidgetSchema = z.object({
  widget: z.enum(dashboardWidgetCodes),
  size: dashboardWidgetSizeSchema.default("M"),
  hidden: z.boolean().default(false)
});
const dashboardLayoutSchema = z.object({
  rows: z.array(z.array(dashboardWidgetSchema).min(1).max(6)).min(1).max(12)
});

const defaultDashboardLayout = {
  rows: [
    [{ widget: "next_match", size: "FULL", hidden: false }],
    [
      { widget: "active_players", size: "M", hidden: false },
      { widget: "monthly_revenue", size: "M", hidden: false },
      { widget: "attendance", size: "M", hidden: false }
    ],
    [{ widget: "latest_results", size: "L", hidden: false }],
    [
      { widget: "delinquency", size: "M", hidden: false },
      { widget: "alerts", size: "M", hidden: false },
      { widget: "memorial_latest_title", size: "M", hidden: false }
    ]
  ]
} satisfies z.infer<typeof dashboardLayoutSchema>;

type DashboardLayoutRow = {
  id: string;
  scope: string;
  layout: unknown;
};

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/summary", { preHandler: app.authorize(["ADMIN", "FINANCIAL"]) }, async (request) => {
    const query = dashboardQuerySchema.parse(request.query);
    return getDashboardSummary(query.month, query.year);
  });

  app.get("/dashboard/sports-summary", { preHandler: app.authorize(["SPORTS_DIRECTOR", "ADMIN"]) }, async () => {
    return getSportsDirectorDashboardSummary();
  });

  app.get("/dashboard/layout", { preHandler: app.authorize(["ADMIN", "FINANCIAL", "SPORTS_DIRECTOR"]) }, async (request, reply) => {
    const tenantId = request.user.tenantId ?? request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube nao identificado para carregar layout do dashboard." });
    }

    const [saved] = await prisma.$queryRaw<DashboardLayoutRow[]>`
      SELECT "id", "scope", "layout"
      FROM "DashboardLayout"
      WHERE "tenantId" = ${tenantId} AND "scope" = 'ASSOCIATION'
      LIMIT 1
    `;
    const layout = dashboardLayoutSchema.safeParse(saved?.layout);

    return {
      scope: "ASSOCIATION",
      catalog: dashboardWidgetCodes.map((code) => ({ code })),
      layout: layout.success ? layout.data : defaultDashboardLayout
    };
  });

  app.put("/dashboard/layout", { preHandler: app.authorize(["ADMIN"]) }, async (request, reply) => {
    const tenantId = request.user.tenantId ?? request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ message: "Ambiente do clube nao identificado para salvar layout do dashboard." });
    }

    const layout = dashboardLayoutSchema.parse(request.body);
    const layoutId = randomUUID();
    const layoutJson = JSON.stringify(layout);
    const [saved] = await prisma.$queryRaw<DashboardLayoutRow[]>`
      INSERT INTO "DashboardLayout" ("id", "tenantId", "scope", "layout", "createdAt", "updatedAt")
      VALUES (${layoutId}, ${tenantId}, 'ASSOCIATION', ${layoutJson}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tenantId", "scope")
      DO UPDATE SET "layout" = EXCLUDED."layout", "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "id", "scope", "layout"
    `;

    return {
      scope: saved?.scope ?? "ASSOCIATION",
      layout: dashboardLayoutSchema.parse(saved?.layout ?? defaultDashboardLayout)
    };
  });
}
