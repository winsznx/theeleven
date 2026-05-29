import type { Address, Hex } from "viem";
import type { AgentIndex, PersonaName } from "../../types/agent.js";

export interface NewMarket {
  id: Hex;
  hookAddress: Address;
  agentIndex: AgentIndex;
  agentName: PersonaName;
  fixtureId: number;
  matchId: Hex;
  propositionId: Hex;
  revealedParams: Hex;
  revealSalt: Hex;
  create2Salt: Hex;
  commitHash: Hex;
  marketDeadline: bigint;
  resolveDeadline: bigint;
  createdAtBlock: bigint;
  createdTxHash: Hex;
  scheduledRevealAt: Date;
}

export type MarketStatus =
  | "COMMITTED"
  | "REVEALED"
  | "ACTIVE"
  | "CLOSED"
  | "RESOLVED"
  | "REFUNDED"
  | "FAILED";

export type ActivityEventType =
  | "TICK"
  | "EVAL"
  | "PROPOSE"
  | "CREATE"
  | "REVEAL_SCHEDULED"
  | "REVEAL"
  | "REVEAL_FAILED"
  | "ERROR";

export interface ActivityEntry {
  agentIndex: AgentIndex;
  fixtureId?: number;
  eventType: ActivityEventType;
  marketId?: string;
  metadata: Record<string, unknown>;
}
