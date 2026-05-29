import { describe, it, expect, vi } from "vitest";
import type { Hex, PublicClient, WalletClient } from "viem";
import { mnemonicToAccount } from "viem/accounts";

import { resolveMarketSkill } from "../../src/skills/resolveMarket.js";
import { TransactionRevertedError } from "../../src/skills/errors.js";

const RESOLVER_MNEMONIC = "test test test test test test test test test test test junk";
const HOOK = "0x000000000000000000000000000000000000aA80" as const;
const TX_HASH = ("0x" + "33".repeat(32)) as Hex;

function fakeMarketTuple(outcome: number) {
  // 13 fields in PropMarketHook.Market struct order; index 10 is `outcome`.
  return [
    ("0x" + "00".repeat(32)) as Hex, // commitHash
    ("0x" + "00".repeat(32)) as Hex, // revealedParamsHash
    "0x" as Hex, // revealedParams (empty bytes)
    0n, // commitBlock
    0n, // revealDeadline
    0n, // marketDeadline
    0n, // resolveDeadline
    "0x0000000000000000000000000000000000000000" as `0x${string}`, // agent
    0n, // totalYes
    0n, // totalNo
    outcome, // outcome
    true, // revealed
    true, // resolved
  ] as const;
}

function buildFx(opts: { outcomeReadback?: number; status?: "success" | "reverted" } = {}) {
  const resolverAccount = mnemonicToAccount(RESOLVER_MNEMONIC, { addressIndex: 5 });
  const resolverWalletClient = {
    account: resolverAccount,
    chain: null,
    sendTransaction: vi.fn().mockResolvedValue(TX_HASH),
  } as unknown as WalletClient;
  const publicClient = {
    getChainId: vi.fn().mockResolvedValue(196),
    estimateGas: vi.fn().mockResolvedValue(80_000n),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: opts.status ?? "success",
      blockNumber: 7070n,
      gasUsed: 60_000n,
    }),
    readContract: vi.fn().mockResolvedValue(fakeMarketTuple(opts.outcomeReadback ?? 1)),
  } as unknown as PublicClient;
  return { resolverWalletClient, publicClient };
}

describe("resolveMarketSkill", () => {
  it("happy path with outcome=1 reads back finalOutcome=1", async () => {
    const fx = buildFx({ outcomeReadback: 1 });
    const r = await resolveMarketSkill({
      resolverWalletClient: fx.resolverWalletClient,
      publicClient: fx.publicClient,
      hookAddress: HOOK,
      outcome: 1,
    });
    expect(r).toEqual({
      txHash: TX_HASH,
      blockNumber: 7070n,
      gasUsed: 60_000n,
      finalOutcome: 1,
    });
  });

  it("happy path with outcome=2 reads back finalOutcome=2", async () => {
    const fx = buildFx({ outcomeReadback: 2 });
    const r = await resolveMarketSkill({
      resolverWalletClient: fx.resolverWalletClient,
      publicClient: fx.publicClient,
      hookAddress: HOOK,
      outcome: 2,
    });
    expect(r.finalOutcome).toBe(2);
  });

  it("throws TransactionRevertedError on revert", async () => {
    const fx = buildFx({ status: "reverted" });
    await expect(
      resolveMarketSkill({
        resolverWalletClient: fx.resolverWalletClient,
        publicClient: fx.publicClient,
        hookAddress: HOOK,
        outcome: 1,
      })
    ).rejects.toBeInstanceOf(TransactionRevertedError);
  });

  it("returns finalOutcome=3 when contract redirected to refund state", async () => {
    // Edge case: resolver picked outcome=1 but winning pool was empty → contract
    // redirected to outcome=3 (REFUNDED). Skill must surface the actual on-chain value.
    const fx = buildFx({ outcomeReadback: 3 });
    const r = await resolveMarketSkill({
      resolverWalletClient: fx.resolverWalletClient,
      publicClient: fx.publicClient,
      hookAddress: HOOK,
      outcome: 1,
    });
    expect(r.finalOutcome).toBe(3);
  });
});
