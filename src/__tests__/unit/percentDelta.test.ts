import { describe, expect, it } from "vitest";
import { percentDelta } from "../../modules/finance/finance.routes.js";

describe("percentDelta", () => {
  it("returns null when there is no previous value to compare against (avoids divide by zero)", () => {
    expect(percentDelta(100, 0)).toBeNull();
  });

  it("returns 0 when both current and previous are 0", () => {
    expect(percentDelta(0, 0)).toBe(0);
  });

  it("computes a positive percentage increase", () => {
    expect(percentDelta(110, 100)).toBe(10);
  });

  it("computes a negative percentage decrease", () => {
    expect(percentDelta(90, 100)).toBe(-10);
  });

  it("uses the absolute value of previous as the denominator", () => {
    // (-50 - -100) / abs(-100) = 50/100 = +50%: value improved (less negative), so the delta is positive
    expect(percentDelta(-50, -100)).toBe(50);
  });
});
