import { describe, it, expect } from "vitest";

import {
  TemplateRegistry,
  cleanSheetRemaining,
  cornerCountOver,
  foulsCountOver,
  nextGoalHomeAway,
  possessionOverPct,
  shotsOnTargetOver,
  templateRegistry,
  yellowCardCountOver,
} from "../../src/propositions/index.js";

describe("TemplateRegistry", () => {
  it("registers + retrieves a template by id", () => {
    const r = new TemplateRegistry();
    r.register(cleanSheetRemaining);
    expect(r.get(cleanSheetRemaining.id)?.id).toBe(cleanSheetRemaining.id);
    expect(r.get(("0x" + "00".repeat(32)) as `0x${string}`)).toBeNull();
  });

  it("throws on duplicate id registration", () => {
    const r = new TemplateRegistry();
    r.register(cleanSheetRemaining);
    expect(() => r.register(cleanSheetRemaining)).toThrow(/Duplicate templateId/);
  });

  it("default singleton registry holds all 7 P12 templates with pairwise-distinct ids", () => {
    const all = templateRegistry.all();
    expect(all).toHaveLength(7);
    const ids = new Set(all.map((t) => t.id));
    expect(ids.size).toBe(7);
    for (const t of [
      cleanSheetRemaining,
      possessionOverPct,
      cornerCountOver,
      nextGoalHomeAway,
      shotsOnTargetOver,
      yellowCardCountOver,
      foulsCountOver,
    ]) {
      expect(templateRegistry.get(t.id)?.id).toBe(t.id);
    }
  });
});
