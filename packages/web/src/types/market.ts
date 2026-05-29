import type { Address, Hex } from "viem";

import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

export type MarketState = "STAKING_OPEN" | "AWAITING_REVEAL" | "RESOLVED" | "REFUNDED";

/** 0 = unresolved, 1 = OVER won, 2 = UNDER won, 3 = REFUND. */
export type MarketOutcome = 0 | 1 | 2 | 3;

/**
 * Flat row shape consumed by MarketCard, MarketDetailView, list filters, etc.
 * Derived from on-chain reads in src/lib/onchain.ts and may carry null
 * fields when decoding fails or the market is still pre-reveal.
 */
export interface MarketRow {
  address: Address;
  agent: Address;
  /** Persona slug resolved via deployment.agents map; null for unknown agents. */
  agentPersona: PersonaSlug | null;
  commitHash: Hex;
  paymentToken: Address;
  marketDeadline: bigint;
  resolveDeadline: bigint;
  state: MarketState;
  outcome: MarketOutcome;
  overStakeTotal: bigint;
  underStakeTotal: bigint;
  revealedTemplateId: Hex | null;
  revealedParams: Hex | null;
  /** Best-effort decode via lib/templates.ts. Null when templateId is unknown. */
  humanQuestion: string | null;
  blockCreated: bigint;
}
