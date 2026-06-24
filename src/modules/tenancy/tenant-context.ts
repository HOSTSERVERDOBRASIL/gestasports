import { AsyncLocalStorage } from "node:async_hooks";

export type TenantContextStore = {
  tenantId: string | null;
  bypassTenant: boolean;
};

export const tenantContext = new AsyncLocalStorage<TenantContextStore>();

export function getTenantContext() {
  return tenantContext.getStore() ?? { tenantId: null, bypassTenant: false };
}

export function setTenantBypass(bypassTenant: boolean) {
  const store = tenantContext.getStore();
  if (store) {
    store.bypassTenant = bypassTenant;
  }
}

export function setTenantContextTenantId(tenantId: string | null) {
  const store = tenantContext.getStore();
  if (store) {
    store.tenantId = tenantId;
  }
}

export const tenantScopedModels = new Set([
  "User",
  "Associate",
  "BoardRole",
  "BoardMemberTerm",
  "PresidentTerm",
  "UniformHistory",
  "Match",
  "Attendance",
  "Payment",
  "CollectionActionLog",
  "Expense",
  "GoalkeeperContract",
  "Season",
  "Athlete",
  "AthleteTechnicalEvaluation",
  "Club",
  "Field",
  "Team",
  "Competition",
  "CompetitionTeam",
  "Confrontation",
  "Game",
  "GameCallUp",
  "GameLineup",
  "GameEvent",
  "GameSubstitution",
  "CardRecord",
  "Suspension",
  "ConfrontationMatch",
  "FinancialEntry",
  "MediaAsset",
  "ArchiveItem",
  "ArchiveAttachment",
  "AuditLog",
  "LineupDraftAttempt",
  "JoinRequest",
  "ClubEvent",
  "ClubEventRegistration",
  "GroupSettings",
  "PaymentSettings"
]);
