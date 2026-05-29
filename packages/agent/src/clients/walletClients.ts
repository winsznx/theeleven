import { createWalletClient, http, type WalletClient } from "viem";
import type { HDAccount } from "viem/accounts";
import { xLayer } from "viem/chains";
import { INFRA } from "../config/infra.js";
import { AGENT_INDICES, type AgentIndex } from "../types/agent.js";
import { deriveAgentAccount } from "../wallets/AgentWallets.js";

export function makeAgentWalletClient(
  account: HDAccount,
  rpcUrl?: string
): WalletClient {
  return createWalletClient({
    account,
    chain: xLayer,
    transport: http(rpcUrl ?? INFRA.defaultRpcUrl, {
      retryCount: 3,
      timeout: 10_000,
    }),
    pollingInterval: 2_000,
  });
}

export function makeAllAgentWalletClients(
  mnemonic: string,
  rpcUrl?: string
): Map<AgentIndex, WalletClient> {
  const out = new Map<AgentIndex, WalletClient>();
  for (const i of AGENT_INDICES) {
    out.set(i, makeAgentWalletClient(deriveAgentAccount(mnemonic, i), rpcUrl));
  }
  return out;
}
