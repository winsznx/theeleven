import { describe, it, expect } from "vitest";
import pino from "pino";
import { mnemonicToAccount } from "viem/accounts";
import type { PublicClient, WalletClient } from "viem";

import {
  PERSONA_REGISTRY,
  PERSONA_SLUGS,
  getPersonaDefinition,
} from "../../src/personas/registry.js";
import { AgentDatabase } from "../../src/core/persistence/AgentDatabase.js";
import { BaseAgent, type BaseAgentArgs } from "../../src/core/BaseAgent.js";
import { expandCliPersona } from "../../src/core/cli.js";
import { createTestDb } from "../core/_helpers.js";

const silentLogger = pino({ level: "silent" });
const ANVIL = "test test test test test test test test test test test junk";

function makeArgs(walletIndex: number, db: AgentDatabase): BaseAgentArgs {
  const account = mnemonicToAccount(ANVIL, { addressIndex: walletIndex });
  return {
    identity: {
      index: walletIndex as 0,
      name: PERSONA_REGISTRY[walletIndex]!.name,
      address: account.address,
    },
    walletClient: { account, chain: null } as unknown as WalletClient,
    publicClient: {} as PublicClient,
    factoryAddress: "0x000000000000000000000000000000000000f4cf",
    resolverAddress: "0x00000000000000000000000000000000be501ed1",
    db,
    parentLogger: silentLogger,
  };
}

describe("PERSONA_REGISTRY", () => {
  it("ships exactly 11 personas with unique slugs", () => {
    // #given the registry
    // #when slugs are extracted
    const slugs = PERSONA_REGISTRY.map((p) => p.slug);
    // #then there are 11, all unique
    expect(slugs).toHaveLength(11);
    expect(new Set(slugs).size).toBe(11);
  });

  it("assigns unique BIP-44 walletIndex 0..10 across the eleven personas", () => {
    // #given the registry
    // #when walletIndexes are extracted
    const indexes = PERSONA_REGISTRY.map((p) => p.walletIndex).sort((a, b) => a - b);
    // #then they form the 0..10 range with no gaps or duplicates
    expect(indexes).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("returns a fresh BaseAgent on each factory() call", () => {
    // #given a test database
    const t = createTestDb();
    const db = new AgentDatabase(t.prisma, silentLogger);
    try {
      for (const def of PERSONA_REGISTRY) {
        // #when factory is invoked twice for the same persona
        const a = def.factory(makeArgs(def.walletIndex, db));
        const b = def.factory(makeArgs(def.walletIndex, db));
        // #then each is its own BaseAgent instance
        expect(a).toBeInstanceOf(BaseAgent);
        expect(b).toBeInstanceOf(BaseAgent);
        expect(a).not.toBe(b);
      }
    } finally {
      void t.cleanup();
    }
  });

  it("each persona declares at least one user-facing templateLabel", () => {
    // #given the registry
    // #then every persona has a non-empty templateLabels array of strings
    for (const def of PERSONA_REGISTRY) {
      expect(def.templateLabels.length).toBeGreaterThan(0);
      for (const label of def.templateLabels) {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });

  it("expandCliPersona('all') yields the full ordered slug list", () => {
    // #given the CLI helper
    // #when expanded
    const expanded = expandCliPersona("all");
    // #then it returns exactly PERSONA_SLUGS
    expect(expanded).toEqual([...PERSONA_SLUGS]);
    expect(expanded.length).toBe(11);
    // and every slug in expansion resolves back to a definition
    for (const slug of expanded) {
      if (slug === "all" || slug === "stub") continue;
      expect(getPersonaDefinition(slug).slug).toBe(slug);
    }
  });
});
