import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fixtureResponseSchema,
  statisticsResponseSchema,
} from "../../src/matches/schemas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX_DIR = resolve(HERE, "../fixtures/match");

function loadPair(name: string) {
  const raw = JSON.parse(readFileSync(resolve(FIX_DIR, name), "utf8"));
  return raw;
}

describe("recorded fixtures are API-shaped", () => {
  for (const name of ["0-not-started.json", "1-mid-first-half.json", "2-final.json"]) {
    it(`${name} validates against fixture + statistics schemas`, () => {
      const { fixture, statistics } = loadPair(name);
      expect(fixtureResponseSchema.safeParse(fixture).success).toBe(true);
      expect(statisticsResponseSchema.safeParse(statistics).success).toBe(true);
    });
  }
});
