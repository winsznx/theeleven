import { mnemonicToAccount } from "viem/accounts";
import type { HDAccount } from "viem/accounts";
import { AGENT_NAMES, type AgentIndex, type AgentIdentity } from "../types/agent.js";

/**
 * Derive one agent's account at BIP-44 path m/44'/60'/0'/0/{index}.
 * Matches the on-disk derive-agents.ts helper in @regista11/contracts bit-for-bit.
 */
export function deriveAgentAccount(mnemonic: string, index: AgentIndex): HDAccount {
  return mnemonicToAccount(mnemonic, {
    accountIndex: 0,
    changeIndex: 0,
    addressIndex: index,
  });
}

/** Derive all 11 agent identities (addresses only — no private keys leaked). */
export function deriveAllAgents(mnemonic: string): AgentIdentity[] {
  return AGENT_NAMES.map((name, i) => {
    const index = i as AgentIndex;
    return {
      index,
      name,
      address: deriveAgentAccount(mnemonic, index).address,
    };
  });
}
