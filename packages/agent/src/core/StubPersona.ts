import type { Hex } from "viem";
import { BaseAgent, type PersonaConfig, type ProposedMarket } from "./BaseAgent.js";

/**
 * P10 placeholder persona — never proposes a market. Used to exercise the
 * orchestration shell (TickLoop + RevealScheduler + AgentDatabase) without
 * triggering any on-chain market creation. P11 swaps in real personas.
 */
export class StubPersona extends BaseAgent {
  readonly config: PersonaConfig = {
    index: 0,
    name: "Il Regista",
    minMinute: 0,
    maxMinute: 90,
    maxMarketsPerMatch: 0,
    defaultMarketWindowMs: 5 * 60 * 1000,
    defaultResolveWindowMs: 15 * 60 * 1000,
  };

  async evaluate(): Promise<ProposedMarket[]> {
    return [];
  }

  async buildRevealedParams(): Promise<Hex> {
    return "0x";
  }
}
