import type { Logger } from "pino";
import type { Account, Address, Hex, PublicClient, WalletClient } from "viem";

import type { AgentIdentity, AgentIndex, PersonaName } from "../types/agent.js";
import type { MatchDelta, MatchSnapshot } from "../matches/types.js";
import type { AgentDatabase } from "./persistence/AgentDatabase.js";

export interface PersonaConfig {
  index: AgentIndex;
  name: PersonaName;
  minMinute: number;
  maxMinute: number;
  maxMarketsPerMatch: number;
  defaultMarketWindowMs: number;
  defaultResolveWindowMs: number;
}

export interface ProposedMarket {
  /** keccak256 of the canonical template name + version (see propositions/types). */
  templateId: Hex;
  /** Template-specific parameter object; encoded by the template's encodeParams. */
  templateParams: unknown;
  marketDeadline: bigint;
  resolveDeadline: bigint;
  rationale: string;
}

export interface BaseAgentArgs {
  identity: AgentIdentity;
  walletClient: WalletClient;
  publicClient: PublicClient;
  factoryAddress: Address;
  resolverAddress: Address;
  db: AgentDatabase;
  parentLogger: Logger;
}

export abstract class BaseAgent {
  readonly identity: AgentIdentity;
  readonly walletClient: WalletClient;
  readonly publicClient: PublicClient;
  readonly factoryAddress: Address;
  readonly resolverAddress: Address;
  readonly db: AgentDatabase;
  readonly logger: Logger;

  abstract readonly config: PersonaConfig;

  constructor(args: BaseAgentArgs) {
    this.identity = args.identity;
    this.walletClient = args.walletClient;
    this.publicClient = args.publicClient;
    this.factoryAddress = args.factoryAddress;
    this.resolverAddress = args.resolverAddress;
    this.db = args.db;
    this.logger = args.parentLogger.child({
      agent: args.identity.name,
      agentIndex: args.identity.index,
    });
  }

  /** Account bound to the walletClient. Needed by skill calls. */
  get walletAccount(): Account {
    const a = this.walletClient.account;
    if (!a) throw new Error(`BaseAgent ${this.identity.name}: walletClient has no account`);
    return a;
  }

  abstract evaluate(args: {
    snapshot: MatchSnapshot;
    recentDeltas: MatchDelta[];
    marketsAlreadyOpenedThisMatch: number;
  }): Promise<ProposedMarket[]>;

  abstract buildRevealedParams(args: {
    proposal: ProposedMarket;
    snapshot: MatchSnapshot;
  }): Promise<Hex>;

  protected inWindow(snapshot: MatchSnapshot): boolean {
    return snapshot.minute >= this.config.minMinute && snapshot.minute <= this.config.maxMinute;
  }

  isInWindow(snapshot: MatchSnapshot): boolean {
    return this.inWindow(snapshot);
  }
}
