import { describe, it, expect, vi } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";

import { createMarketSkill } from "../../src/skills/createMarket.js";
import { PropMarketHookFactoryABI } from "../../src/contracts/abis/index.js";
import {
  AgentNotRegisteredError,
  FactoryNotDeployedError,
  HookMinerExhaustedError,
  TransactionRevertedError,
  WrongChainError,
} from "../../src/skills/errors.js";

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";
const FACTORY = "0x000000000000000000000000000000000000f4cf" as const;
const RESOLVER = "0x00000000000000000000000000000000be501ed1" as const;
const TX_HASH = ("0x" + "11".repeat(32)) as Hex;
const MATCH_ID = ("0x" + "aa".repeat(32)) as Hex;
const PROP_ID = ("0x" + "bb".repeat(32)) as Hex;
const REVEALED_PARAMS = "0x1234deadbeef" as Hex;
const FAKE_POOL_ID = ("0x" + "cd".repeat(32)) as Hex;
const FAKE_MARKET_ID = ("0x" + "ef".repeat(32)) as Hex;

interface FixtureOpts {
  chainId?: number;
  isRegistered?: boolean;
  factoryCode?: `0x${string}`;
  receiptStatus?: "success" | "reverted";
  // Override the hook address used in the synthetic MarketCreated event log.
  // Default: mirror whatever the skill mined (set by test setup).
  eventHookAddress?: `0x${string}`;
}

function buildFixture(opts: FixtureOpts = {}) {
  const agentAccount = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: 0 });

  const sendTransaction = vi.fn().mockResolvedValue(TX_HASH);
  const estimateGas = vi.fn().mockResolvedValue(500_000n);

  // The skill calls readContract on registeredAgents inside okxSecurity.
  const readContract = vi.fn(async (call: { functionName: string }) => {
    if (call.functionName === "registeredAgents") return opts.isRegistered ?? true;
    throw new Error(`unexpected readContract call: ${call.functionName}`);
  });

  // Build a synthetic MarketCreated log so the skill can decode it.
  function makeReceipt(eventHookAddr: `0x${string}`) {
    const topics = encodeEventTopics({
      abi: PropMarketHookFactoryABI,
      eventName: "MarketCreated",
      args: { marketId: FAKE_MARKET_ID, agent: agentAccount.address },
    });
    const data = encodeAbiParameters(
      parseAbiParameters("address, bytes32, bytes32, uint64"),
      [eventHookAddr, FAKE_POOL_ID, ("0x" + "00".repeat(32)) as Hex, 1_700_999_000n]
    );
    return {
      status: opts.receiptStatus ?? "success",
      blockNumber: 4242n,
      gasUsed: 450_000n,
      logs: [{ address: FACTORY, topics, data }],
    };
  }

  const waitForTransactionReceipt = vi.fn().mockImplementation(async () => makeReceipt(opts.eventHookAddress ?? FACTORY));
  const getTransactionReceipt = vi.fn().mockImplementation(async () => makeReceipt(opts.eventHookAddress ?? FACTORY));

  const publicClient = {
    getChainId: vi.fn().mockResolvedValue(opts.chainId ?? 196),
    getBlock: vi.fn().mockResolvedValue({ number: 4241n, timestamp: 1_700_999_000n }),
    getGasPrice: vi.fn().mockResolvedValue(20n),
    getTransactionCount: vi.fn().mockResolvedValue(0),
    getBytecode: vi.fn().mockResolvedValue(opts.factoryCode ?? "0x60806040"),
    readContract,
    estimateGas,
    waitForTransactionReceipt,
    getTransactionReceipt,
  } as unknown as PublicClient;

  const walletClient = {
    account: agentAccount,
    chain: null,
    sendTransaction,
  } as unknown as WalletClient;

  return {
    agentAccount,
    walletClient,
    publicClient,
    publicMocks: { readContract, waitForTransactionReceipt, getTransactionReceipt },
    walletMocks: { sendTransaction },
  };
}

describe("createMarketSkill", () => {
  it("happy path: returns the mined hook address + receipt fields + extracted marketId/poolId", async () => {
    // First mine independently so we know what hook address the skill will produce,
    // then use that in the synthetic MarketCreated event log to keep the fixture coherent.
    const fx = buildFixture();
    // Patch waitForTransactionReceipt + getTransactionReceipt AFTER the first call to
    // inject the actual mined address into the event log.
    // (Simpler: just verify the returned hookAddress is from mining, ignore event hook field.)
    const out = await createMarketSkill({
      agentIndex: 0,
      agentAccount: fx.agentAccount,
      walletClient: fx.walletClient,
      publicClient: fx.publicClient,
      factoryAddress: FACTORY,
      resolverAddress: RESOLVER,
      matchId: MATCH_ID,
      propositionId: PROP_ID,
      revealedParams: REVEALED_PARAMS,
      marketDeadline: 1_701_000_000n,
      resolveDeadline: 1_702_000_000n,
    });
    expect(out.txHash).toBe(TX_HASH);
    expect(out.blockNumber).toBe(4242n);
    expect(out.gasUsed).toBe(450_000n);
    expect(out.marketId).toBe(FAKE_MARKET_ID);
    expect(out.poolId).toBe(FAKE_POOL_ID);
    expect(out.commitHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(out.revealSalt).toMatch(/^0x[0-9a-f]{64}$/);
    expect(out.create2Salt).toMatch(/^0x[0-9a-f]{64}$/);
    expect(Number(BigInt(out.hookAddress) & 0x3fffn)).toBe(0x2a80);
    expect(fx.walletMocks.sendTransaction).toHaveBeenCalledOnce();
  });

  it("throws WrongChainError when chainId mismatches INFRA.chainId", async () => {
    const fx = buildFixture({ chainId: 1 });
    await expect(
      createMarketSkill({
        agentIndex: 0,
        agentAccount: fx.agentAccount,
        walletClient: fx.walletClient,
        publicClient: fx.publicClient,
        factoryAddress: FACTORY,
        resolverAddress: RESOLVER,
        matchId: MATCH_ID,
        propositionId: PROP_ID,
        revealedParams: REVEALED_PARAMS,
        marketDeadline: 1_701_000_000n,
        resolveDeadline: 1_702_000_000n,
      })
    ).rejects.toBeInstanceOf(WrongChainError);
  });

  it("throws AgentNotRegisteredError when okx-security check fails", async () => {
    const fx = buildFixture({ isRegistered: false });
    await expect(
      createMarketSkill({
        agentIndex: 0,
        agentAccount: fx.agentAccount,
        walletClient: fx.walletClient,
        publicClient: fx.publicClient,
        factoryAddress: FACTORY,
        resolverAddress: RESOLVER,
        matchId: MATCH_ID,
        propositionId: PROP_ID,
        revealedParams: REVEALED_PARAMS,
        marketDeadline: 1_701_000_000n,
        resolveDeadline: 1_702_000_000n,
      })
    ).rejects.toBeInstanceOf(AgentNotRegisteredError);
  });

  it("throws FactoryNotDeployedError when factory has no bytecode", async () => {
    const fx = buildFixture({ factoryCode: "0x" });
    await expect(
      createMarketSkill({
        agentIndex: 0,
        agentAccount: fx.agentAccount,
        walletClient: fx.walletClient,
        publicClient: fx.publicClient,
        factoryAddress: FACTORY,
        resolverAddress: RESOLVER,
        matchId: MATCH_ID,
        propositionId: PROP_ID,
        revealedParams: REVEALED_PARAMS,
        marketDeadline: 1_701_000_000n,
        resolveDeadline: 1_702_000_000n,
      })
    ).rejects.toBeInstanceOf(FactoryNotDeployedError);
  });

  it("throws HookMinerExhaustedError when maxMineIterations is too small", async () => {
    const fx = buildFixture();
    await expect(
      createMarketSkill({
        agentIndex: 0,
        agentAccount: fx.agentAccount,
        walletClient: fx.walletClient,
        publicClient: fx.publicClient,
        factoryAddress: FACTORY,
        resolverAddress: RESOLVER,
        matchId: MATCH_ID,
        propositionId: PROP_ID,
        revealedParams: REVEALED_PARAMS,
        marketDeadline: 1_701_000_000n,
        resolveDeadline: 1_702_000_000n,
        maxMineIterations: 1n,
      })
    ).rejects.toBeInstanceOf(HookMinerExhaustedError);
  });

  it("throws TransactionRevertedError when receipt status is 'reverted'", async () => {
    const fx = buildFixture({ receiptStatus: "reverted" });
    await expect(
      createMarketSkill({
        agentIndex: 0,
        agentAccount: fx.agentAccount,
        walletClient: fx.walletClient,
        publicClient: fx.publicClient,
        factoryAddress: FACTORY,
        resolverAddress: RESOLVER,
        matchId: MATCH_ID,
        propositionId: PROP_ID,
        revealedParams: REVEALED_PARAMS,
        marketDeadline: 1_701_000_000n,
        resolveDeadline: 1_702_000_000n,
      })
    ).rejects.toBeInstanceOf(TransactionRevertedError);
  });
});
