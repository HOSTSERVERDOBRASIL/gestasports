import { AthletePosition } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { teamBalanceScore } from "../../modules/athletes/athletes.routes.js";

type TestPlayer = {
  rating: number;
  technicalBalanceScore?: number | null;
  position: AthletePosition;
  secondaryPositions: AthletePosition[];
  age: number | null;
};

function player(overrides: Partial<TestPlayer>): TestPlayer {
  return {
    rating: 5,
    technicalBalanceScore: null,
    position: AthletePosition.MIDFIELDER,
    secondaryPositions: [],
    age: 25,
    ...overrides
  };
}

describe("teamBalanceScore", () => {
  it("scores 0 for two identical rosters", () => {
    const red = [player({ position: AthletePosition.DEFENDER }), player({ position: AthletePosition.STRIKER })];
    const white = [player({ position: AthletePosition.DEFENDER }), player({ position: AthletePosition.STRIKER })];
    expect(teamBalanceScore(red, white)).toBe(0);
  });

  it("penalizes a large rating gap between teams", () => {
    const red = [player({ rating: 9 }), player({ rating: 9 })];
    const white = [player({ rating: 2 }), player({ rating: 2 })];
    const balanced = [player({ rating: 5 }), player({ rating: 5 })];
    expect(teamBalanceScore(red, white)).toBeGreaterThan(teamBalanceScore(balanced, balanced));
  });

  it("penalizes an uneven number of goalkeepers", () => {
    const red = [player({ position: AthletePosition.GOALKEEPER }), player({ position: AthletePosition.GOALKEEPER })];
    const white = [player({ position: AthletePosition.MIDFIELDER }), player({ position: AthletePosition.MIDFIELDER })];
    expect(teamBalanceScore(red, white)).toBeGreaterThan(0);
  });

  it("penalizes a large average-age gap between teams", () => {
    const red = [player({ age: 45 }), player({ age: 45 })];
    const white = [player({ age: 20 }), player({ age: 20 })];
    const balanced = [player({ age: 25 }), player({ age: 25 })];
    expect(teamBalanceScore(red, white)).toBeGreaterThan(teamBalanceScore(balanced, balanced));
  });

  it("penalizes uneven roster sizes", () => {
    const base = player({});
    const red = [base, base, base];
    const white = [base];
    expect(teamBalanceScore(red, white)).toBeGreaterThan(0);
  });
});
