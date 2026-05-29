import type { Logger } from "pino";
import type { Address, PublicClient } from "viem";
import { WrongChainError } from "../errors.js";

export interface ChainContext {
  chainId: number;
  blockNumber: bigint;
  blockTimestamp: bigint;
  gasPrice: bigint;
  agentNonce: bigint;
}

/**
 * okx-onchain-gateway skill — fetch the current chain context (block, gas,
 * sender nonce) in a single bundle. Mirrors the OKX Onchain OS gateway primitive.
 */
export async function fetchChainContext(args: {
  publicClient: PublicClient;
  agentAddress: Address;
  logger?: Logger;
}): Promise<ChainContext> {
  const { publicClient, agentAddress, logger } = args;

  const [chainId, block, gasPrice, agentNonce] = await Promise.all([
    publicClient.getChainId(),
    publicClient.getBlock({ blockTag: "latest" }),
    publicClient.getGasPrice(),
    publicClient.getTransactionCount({ address: agentAddress, blockTag: "latest" }),
  ]);

  const ctx: ChainContext = {
    chainId,
    blockNumber: block.number,
    blockTimestamp: block.timestamp,
    gasPrice,
    agentNonce: BigInt(agentNonce),
  };
  logger?.debug({ ctx, agentAddress }, "okx-onchain-gateway: context fetched");
  return ctx;
}

/**
 * Assert chainId matches expected; throws WrongChainError otherwise.
 * Use before any state-mutating skill to fail fast on misconfigured RPC.
 */
export async function assertChainHealth(args: {
  publicClient: PublicClient;
  expectedChainId: number;
  logger?: Logger;
}): Promise<void> {
  const actual = await args.publicClient.getChainId();
  if (actual !== args.expectedChainId) {
    throw new WrongChainError({ expected: args.expectedChainId, actual });
  }
  args.logger?.debug({ chainId: actual }, "okx-onchain-gateway: chain healthy");
}
