import type { Logger } from "pino";
import {
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";

import { PropMarketHookABI } from "../contracts/abis/index.js";
import { INFRA } from "../config/infra.js";
import { assertChainHealth } from "./okx/okxOnchainGateway.js";
import { signAndSend } from "./okx/okxAgenticWallet.js";

export interface ResolveMarketInput {
  resolverWalletClient: WalletClient;
  publicClient: PublicClient;
  hookAddress: Address;
  outcome: 1 | 2;
  logger?: Logger;
}

export interface ResolveMarketOutput {
  txHash: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
  finalOutcome: number;
}

/**
 * Resolver-only write skill: write the binary outcome to a PropMarketHook.
 *
 * Skill chain (judge-visible):
 *   1) okx-onchain-gateway:  assertChainHealth
 *   2) calldata-build:        encodeFunctionData(resolve, outcome)
 *   3) okx-agentic-wallet:   signAndSend (resolverWallet, not agent wallet)
 *   4) state-readback:        read hook.market() → finalOutcome (index 10)
 */
export async function resolveMarketSkill(input: ResolveMarketInput): Promise<ResolveMarketOutput> {
  const { resolverWalletClient, publicClient, hookAddress, outcome, logger } = input;

  // ---- Skill 1: okx-onchain-gateway ----
  await assertChainHealth({
    publicClient,
    expectedChainId: INFRA.chainId,
    logger,
  });

  // ---- Skill 2: build calldata ----
  const calldata = encodeFunctionData({
    abi: PropMarketHookABI,
    functionName: "resolve",
    args: [outcome],
  });

  // ---- Skill 3: okx-agentic-wallet signAndSend ----
  const receipt = await signAndSend({
    walletClient: resolverWalletClient,
    publicClient,
    to: hookAddress,
    data: calldata,
    logger,
  });

  // ---- Skill 4: state readback — outcome is field index 10 in the Market struct getter ----
  const market = (await publicClient.readContract({
    address: hookAddress,
    abi: PropMarketHookABI,
    functionName: "market",
  })) as readonly [
    Hex, // commitHash
    Hex, // revealedParamsHash
    Hex, // revealedParams
    bigint, // commitBlock
    bigint, // revealDeadline
    bigint, // marketDeadline
    bigint, // resolveDeadline
    Address, // agent
    bigint, // totalYes
    bigint, // totalNo
    number, // outcome
    boolean, // revealed
    boolean // resolved
  ];
  const finalOutcome = Number(market[10]);

  return {
    txHash: receipt.txHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
    finalOutcome,
  };
}
