import { describe, expect, it } from "vitest";
import { computeStatsScoreFromCounts } from "../../modules/athletes/athletes.routes.js";

function base() {
  return {
    gamesRegistered: 10,
    gamesPresent: 10,
    confirmations: 10,
    goals: 0,
    assists: 0,
    wins: 0,
    gamesPresentForWinRate: 10,
    yellowCards: 0,
    redCards: 0
  };
}

describe("computeStatsScoreFromCounts", () => {
  it("gives a perfect score for full presence, confirmation, wins, and no cards (goals/assists don't factor into these weights)", () => {
    const result = computeStatsScoreFromCounts({ ...base(), wins: 10 });
    // presence=10*0.24 + confirmation=10*0.16 + contribution=0*0.24 + result=10*0.16 + discipline=10*0.2 = 7.6
    expect(result.presencePercent).toBe(100);
    expect(result.confirmationPercent).toBe(100);
    expect(result.winRate).toBe(100);
    expect(result.statsScore).toBeCloseTo(7.6, 5);
  });

  it("returns 0 for every percentage when a player never played", () => {
    const result = computeStatsScoreFromCounts({
      gamesRegistered: 0,
      gamesPresent: 0,
      confirmations: 0,
      goals: 0,
      assists: 0,
      wins: 0,
      gamesPresentForWinRate: 0,
      yellowCards: 0,
      redCards: 0
    });
    expect(result.presencePercent).toBe(0);
    expect(result.confirmationPercent).toBe(0);
    expect(result.winRate).toBe(0);
    // discipline floor (10) is still counted since there are no cards: only its 0.2 weight applies
    expect(result.statsScore).toBeCloseTo(2, 5);
  });

  it("caps the contribution score at 10 even with many goals/assists", () => {
    const withManyGoals = computeStatsScoreFromCounts({ ...base(), goals: 20, assists: 20 });
    const withFewerGoals = computeStatsScoreFromCounts({ ...base(), goals: 12, assists: 1 });
    expect(withManyGoals.statsScore).toBe(withFewerGoals.statsScore);
  });

  it("weighs a yellow card as -0.7 and a red card as -2.5 on the discipline score (0.2 weight), after rounding to 1 decimal", () => {
    const clean = computeStatsScoreFromCounts(base());
    const oneYellow = computeStatsScoreFromCounts({ ...base(), yellowCards: 1 });
    const oneRed = computeStatsScoreFromCounts({ ...base(), redCards: 1 });
    expect(clean.statsScore).toBe(6.0);
    expect(oneYellow.statsScore).toBe(5.9);
    expect(oneRed.statsScore).toBe(5.5);
    expect(oneRed.statsScore).toBeLessThan(oneYellow.statsScore);
  });

  it("floors the discipline score at 1 no matter how many cards", () => {
    const manyCards = computeStatsScoreFromCounts({ ...base(), yellowCards: 50, redCards: 50 });
    const someCards = computeStatsScoreFromCounts({ ...base(), yellowCards: 20, redCards: 4 });
    // both hit the discipline floor of 1, so their statsScore should be identical
    expect(manyCards.statsScore).toBe(someCards.statsScore);
  });
});
