import { describe, it, expect } from "vitest";
import { keccak256, toBytes, type Hex } from "viem";

import {
  buildRevealedParams,
  parseRevealedParams,
  TemplateRegistry,
  templateRegistry,
  cleanSheetRemaining,
  possessionOverPct,
  cornerCountOver,
} from "../../src/propositions/index.js";

describe("encoding", () => {
  it("buildRevealedParams round-trips through parseRevealedParams for all 3 templates", () => {
    const cases = [
      {
        template: cleanSheetRemaining,
        params: { targetTeam: "HOME" as const, windowMinutes: 30, openedAtMinute: 10 },
      },
      {
        template: possessionOverPct,
        params: { targetTeam: "AWAY" as const, thresholdPct: 60, windowMinutes: 10, openedAtMinute: 65 },
      },
      {
        template: cornerCountOver,
        params: {
          targetTeam: "TOTAL" as const,
          thresholdCount: 3,
          windowMinutes: 20,
          openedAtMinute: 30,
          openedAtCornerCount: 4,
        },
      },
    ];

    for (const c of cases) {
      const encoded = buildRevealedParams({ template: c.template, params: c.params });
      expect(encoded).toMatch(/^0x[0-9a-f]+$/);
      const parsed = parseRevealedParams({ encoded, registry: templateRegistry });
      expect(parsed.templateId).toBe(c.template.id);
      expect(parsed.template?.id).toBe(c.template.id);
      expect(parsed.decodedParams).toEqual(c.params);
    }
  });

  it("buildRevealedParams output is valid abi-encoded bytes (≥128 bytes)", () => {
    const encoded = buildRevealedParams({
      template: cleanSheetRemaining,
      params: { targetTeam: "HOME", windowMinutes: 30, openedAtMinute: 10 },
    });
    // bytes32 (32) + offset (32) + length (32) + payload-padded ≥ 128
    expect((encoded.length - 2) / 2).toBeGreaterThanOrEqual(128);
  });

  it("parseRevealedParams returns null template + decodedParams when id is unknown", () => {
    const reg = new TemplateRegistry();
    // Register only cleanSheetRemaining
    reg.register(cleanSheetRemaining);
    const encoded = buildRevealedParams({
      template: possessionOverPct,
      params: { targetTeam: "HOME", thresholdPct: 55, windowMinutes: 10, openedAtMinute: 60 },
    });
    const parsed = parseRevealedParams({ encoded, registry: reg });
    expect(parsed.templateId).toBe(possessionOverPct.id);
    expect(parsed.template).toBeNull();
    expect(parsed.decodedParams).toBeNull();
  });

  it("all 3 template ids are distinct keccak hashes of their canonical names", () => {
    const ids = new Set([cleanSheetRemaining.id, possessionOverPct.id, cornerCountOver.id]);
    expect(ids.size).toBe(3);
    expect(cleanSheetRemaining.id).toBe(keccak256(toBytes("CLEAN_SHEET_REMAINING_v1")) as Hex);
    expect(possessionOverPct.id).toBe(keccak256(toBytes("POSSESSION_OVER_PCT_v1")) as Hex);
    expect(cornerCountOver.id).toBe(keccak256(toBytes("CORNER_COUNT_OVER_v1")) as Hex);
  });
});
