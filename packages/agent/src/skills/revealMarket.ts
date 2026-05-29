import type { Logger } from "pino";
import {
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import type { HDAccount } from "viem/accounts";

import { PropMarketHookABI } from "../contracts/abis/index.js";
import { INFRA } from "../config/infra.js";
import { assertChainHealth } from "./okx/okxOnchainGateway.js";
import { signAndSend } from "./okx/okxAgenticWallet.js";

export interface RevealMarketInput {
  agentAccount: HDAccount;
  walletClient: WalletClient;
  publicClient: PublicClient;
  hookAddress: Address;
  revealedParams: Hex;
  revealSalt: Hex;
  logger?: Logger;
}

export interface RevealMarketOutput {
  txHash: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
}

/**
 * Composed write skill: reveal a previously committed market's params.
 *
 * Skill chain (judge-visible):
 *   1) okx-onchain-gateway:  assertChainHealth
 *   2) calldata-build:        encodeFunctionData(reveal, ...)
 *   3) okx-agentic-wallet:   signAndSend
 */
export async function revealMarketSkill(input: RevealMarketInput): Promise<RevealMarketOutput> {
  const {
    walletClient,
    publicClient,
    hookAddress,
    revealedParams,
    revealSalt,
    logger,
  } = input;

  // ---- Skill 1: okx-onchain-gateway ----
  await assertChainHealth({
    publicClient,
    expectedChainId: INFRA.chainId,
    logger,
  });

  // ---- Skill 2: build calldata ----
  const calldata = encodeFunctionData({
    abi: PropMarketHookABI,
    functionName: "reveal",
    args: [revealedParams, revealSalt],
  });

  // ---- Skill 3: okx-agentic-wallet signAndSend ----
  const receipt = await signAndSend({
    walletClient,
    publicClient,
    to: hookAddress,
    data: calldata,
    logger,
  });

  return {
    txHash: receipt.txHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  };
}
