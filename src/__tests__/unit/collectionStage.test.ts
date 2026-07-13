import { CollectionStage } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { collectionStageForPayment } from "../../modules/finance/finance.routes.js";

function daysFromTodayUtc(offsetDays: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
}

describe("collectionStageForPayment", () => {
  it("returns PRE_DUE_3 when due in exactly 3 days", () => {
    expect(collectionStageForPayment({ dueDate: daysFromTodayUtc(3) })).toBe(CollectionStage.PRE_DUE_3);
  });

  it("returns D_PLUS_3 when 3 days overdue", () => {
    expect(collectionStageForPayment({ dueDate: daysFromTodayUtc(-3) })).toBe(CollectionStage.D_PLUS_3);
  });

  it("returns D_PLUS_7 when 7 days overdue", () => {
    expect(collectionStageForPayment({ dueDate: daysFromTodayUtc(-7) })).toBe(CollectionStage.D_PLUS_7);
  });

  it("returns D_PLUS_15 when 15 days overdue", () => {
    expect(collectionStageForPayment({ dueDate: daysFromTodayUtc(-15) })).toBe(CollectionStage.D_PLUS_15);
  });

  it("returns D_PLUS_15 for anything beyond 15 days overdue too", () => {
    expect(collectionStageForPayment({ dueDate: daysFromTodayUtc(-40) })).toBe(CollectionStage.D_PLUS_15);
  });

  it("returns undefined/null for a day that doesn't match any stage", () => {
    expect(collectionStageForPayment({ dueDate: daysFromTodayUtc(1) })).toBeNull();
    expect(collectionStageForPayment({ dueDate: daysFromTodayUtc(0) })).toBeNull();
    expect(collectionStageForPayment({ dueDate: daysFromTodayUtc(-1) })).toBeNull();
    expect(collectionStageForPayment({ dueDate: daysFromTodayUtc(-10) })).toBeNull();
  });
});
