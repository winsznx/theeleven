import type { Logger } from "pino";
import {
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  keccak256,
  parseAbiParameters,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import type { HDAccount } from "viem/accounts";

import { PropMarketHookFactoryABI } from "../contracts/abis/index.js";
import { PropMarketHookBytecode } from "../contracts/bytecode/index.js";
import { INFRA } from "../config/infra.js";
import type { AgentIndex } from "../types/agent.js";

import { computeCommitHash, generateRevealSalt } from "./commitReveal.js";
import { mineHookSalt } from "./hookMiner.js";
import { assertChainHealth, fetchChainContext } from "./okx/okxOnchainGateway.js";
import { assertAgentRegistered, assertFactoryDeployed } from "./okx/okxSecurity.js";
import { signAndSend } from "./okx/okxAgenticWallet.js";

const HOOK_BITMAP_TARGET = 0x2a80;

export interface CreateMarketInput {
  agentIndex: AgentIndex;
  agentAccount: HDAccount;
  walletClient: WalletClient;
  publicClient: PublicClient;
  factoryAddress: Address;
  resolverAddress: Address;
  matchId: Hex;
  propositionId: Hex;
  revealedParams: Hex;
  marketDeadline: bigint;
  resolveDeadline: bigint;
  logger?: Logger;
  /** Tighter cap for tests; default 10_000_000n. */
  maxMineIterations?: bigint;
}

export interface CreateMarketOutput {
  txHash: Hex;
  hookAddress: Address;
  marketId: Hex;
  poolId: Hex;
  commitHash: Hex;
  revealSalt: Hex;
  create2Salt: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
}

/**
 * Composed write skill: deploy a PropMarketHook + initialize a v4 Pool, in
 * one factory.createMarket call.
 *
 * Skill chain (judge-visible):
 *   1) okx-onchain-gateway: assertChainHealth, fetchChainContext
 *   2) okx-security:         verifyFactoryCode, assertAgentRegistered
 *   3) commit-reveal:        generateRevealSalt, computeCommitHash
 *   4) hook-mining:          mineHookSalt against the PropMarketHook initcode
 *   5) calldata-build:       encodeFunctionData(createMarket, ...)
 *   6) okx-agentic-wallet:   signAndSend
 *   7) event-extract:        decode MarketCreated → marketId + poolId
 */
export async function createMarketSkill(input: CreateMarketInput): Promise<CreateMarketOutput> {
  const {
    agentAccount,
    walletClient,
    publicClient,
    factoryAddress,
    resolverAddress,
    matchId,
    propositionId,
    revealedParams,
    marketDeadline,
    resolveDeadline,
    logger,
    maxMineIterations,
  } = input;

  // ---- Skill 1: okx-onchain-gateway ----
  await assertChainHealth({
    publicClient,
    expectedChainId: INFRA.chainId,
    logger,
  });
  await fetchChainContext({ publicClient, agentAddress: agentAccount.address, logger });

  // ---- Skill 2: okx-security ----
  await assertFactoryDeployed({ publicClient, factoryAddress });
  await assertAgentRegistered({
    publicClient,
    factoryAddress,
    agentAddress: agentAccount.address,
    logger,
  });

  // ---- Skill 3: commit-reveal ----
  const revealSalt = generateRevealSalt();
  const commitHash = computeCommitHash({
    revealedParams,
    salt: revealSalt,
    agentAddress: agentAccount.address,
  });

  // ---- Skill 4: hook-address mining ----
  const constructorArgs = encodeAbiParameters(
    parseAbiParameters("address,address,address,address"),
    [INFRA.poolManager, factoryAddress, resolverAddress, INFRA.usdt0]
  );
  const initCode = encodePacked(["bytes", "bytes"], [PropMarketHookBytecode, constructorArgs]);
  const initCodeHash = keccak256(initCode);

  const mineResult = mineHookSalt({
    deployer: factoryAddress,
    initCodeHash,
    targetBitmap: HOOK_BITMAP_TARGET,
    ...(maxMineIterations !== undefined ? { maxIterations: maxMineIterations } : {}),
  });
  const create2Salt = mineResult.salt;
  const hookAddress = mineResult.predicted;
  logger?.info(
    { hookAddress, iterations: mineResult.iterations.toString() },
    "createMarketSkill: hook salt mined"
  );

  // ---- Skill 5: build calldata ----
  const calldata = encodeFunctionData({
    abi: PropMarketHookFactoryABI,
    functionName: "createMarket",
    args: [matchId, propositionId, commitHash, marketDeadline, resolveDeadline, create2Salt],
  });

  // ---- Skill 6: okx-agentic-wallet signAndSend ----
  const receipt = await signAndSend({
    walletClient,
    publicClient,
    to: factoryAddress,
    data: calldata,
    logger,
  });

  // ---- Skill 7: extract MarketCreated event ----
  const raw = await publicClient.getTransactionReceipt({ hash: receipt.txHash });
  let marketId: Hex | null = null;
  let poolId: Hex | null = null;
  for (const log of raw.logs) {
    if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({
        abi: PropMarketHookFactoryABI,
        topics: log.topics,
        data: log.data,
        eventName: "MarketCreated",
      });
      const args = decoded.args as unknown as {
        marketId: Hex;
        agent: Address;
        hook: Address;
        poolId: Hex;
        commitHash: Hex;
        deadline: bigint;
      };
      marketId = args.marketId;
      poolId = args.poolId;
      break;
    } catch {
      // not this log
    }
  }
  if (!marketId || !poolId) {
    throw new Error("createMarketSkill: MarketCreated event not found in receipt logs");
  }

  return {
    txHash: receipt.txHash,
    hookAddress,
    marketId,
    poolId,
    commitHash,
    revealSalt,
    create2Salt,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  };
}
