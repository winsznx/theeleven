import { describe, it, expect } from "vitest";

import { PROBABILITY_TWEEN_DURATION_MS } from "@/components/landing/MarketCard";

describe("MarketCard probability tween", () => {
  it("locks the cubic ease-out duration to the 2026 Robinhood/Polymarket 200–300ms window", () => {
    // #given the locked tween duration constant
    // #then it stays inside the 2026 200–300ms ease-out band Grok confirmed
    expect(PROBABILITY_TWEEN_DURATION_MS).toBeGreaterThanOrEqual(200);
    expect(PROBABILITY_TWEEN_DURATION_MS).toBeLessThanOrEqual(300);
    // and specifically 250ms — the value Grok recommended
    expect(PROBABILITY_TWEEN_DURATION_MS).toBe(250);
  });
});
