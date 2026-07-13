import { describe, expect, it } from "vitest";
import { dueDateForCompetence, prorataFeeForJoinDate } from "../../lib/finance.utils.js";

describe("dueDateForCompetence", () => {
  it("uses the given day for a mid-month value", () => {
    const date = dueDateForCompetence(6, 2026, 15);
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(5);
    expect(date.getUTCDate()).toBe(15);
  });

  it("clamps day 31 down to 28 to stay valid in every month", () => {
    const date = dueDateForCompetence(2, 2026, 31);
    expect(date.getUTCDate()).toBe(28);
  });

  it("clamps day 0 or negative up to 1", () => {
    const date = dueDateForCompetence(3, 2026, 0);
    expect(date.getUTCDate()).toBe(1);
  });

  it("handles month 1 and month 12 correctly", () => {
    const jan = dueDateForCompetence(1, 2026, 10);
    expect(jan.getUTCMonth()).toBe(0);
    const dec = dueDateForCompetence(12, 2026, 10);
    expect(dec.getUTCMonth()).toBe(11);
  });
});

describe("prorataFeeForJoinDate", () => {
  it("charges the full fee when joining on the 1st", () => {
    const result = prorataFeeForJoinDate(new Date(Date.UTC(2026, 5, 1)), 6000);
    expect(result.remainingDays).toBe(result.daysInMonth);
    expect(result.prorataFeeCents).toBe(6000);
    expect(result.isProrata).toBe(false);
  });

  it("prorates a mid-month join (June 15 of a 30-day month)", () => {
    const result = prorataFeeForJoinDate(new Date(Date.UTC(2026, 5, 15)), 6000);
    expect(result.daysInMonth).toBe(30);
    expect(result.remainingDays).toBe(16);
    expect(result.prorataFeeCents).toBe(3200);
    expect(result.isProrata).toBe(true);
  });

  it("charges a minimal fee when joining on the last day of the month", () => {
    const result = prorataFeeForJoinDate(new Date(Date.UTC(2026, 3, 30)), 6000);
    expect(result.remainingDays).toBe(1);
    expect(result.prorataFeeCents).toBe(200);
  });

  it("handles February in a leap year (29 days)", () => {
    const result = prorataFeeForJoinDate(new Date(Date.UTC(2028, 1, 15)), 6000);
    expect(result.daysInMonth).toBe(29);
    expect(result.remainingDays).toBe(15);
  });
});
