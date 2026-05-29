import { describe, it, expect, vi } from "vitest";
import type { Hex, PublicClient, WalletClient } from "viem";
import { mnemonicToAccount } from "viem/accounts";

import { revealMarketSkill } from "../../src/skills/revealMarket.js";
import {
  TransactionRevertedError,
  WrongChainError,
} from "../../src/skills/errors.js";

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";
const HOOK = "0x000000000000000000000000000000000000aA80" as const;
const TX_HASH = ("0x" + "22".repeat(32)) as Hex;

interface FxOpts {
  chainId?: number;
  status?: "success" | "reverted";
}

function buildFx(opts: FxOpts = {}) {
  const agentAccount = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: 0 });
  const walletClient = {
    account: agentAccount,
    chain: null,
    sendTransaction: vi.fn().mockResolvedValue(TX_HASH),
  } as unknown as WalletClient;
  const publicClient = {
    getChainId: vi.fn().mockResolvedValue(opts.chainId ?? 196),
    estimateGas: vi.fn().mockResolvedValue(120_000n),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({
      status: opts.status ?? "success",
      blockNumber: 5050n,
      gasUsed: 100_000n,
    }),
  } as unknown as PublicClient;
  return { agentAccount, walletClient, publicClient };
}

describe("revealMarketSkill", () => {
  it("happy path", async () => {
    const fx = buildFx();
    const r = await revealMarketSkill({
      agentAccount: fx.agentAccount,
      walletClient: fx.walletClient,
      publicClient: fx.publicClient,
      hookAddress: HOOK,
      revealedParams: "0xdeadbeef",
      revealSalt: ("0x" + "00".repeat(31) + "01") as Hex,
    });
    expect(r).toEqual({ txHash: TX_HASH, blockNumber: 5050n, gasUsed: 100_000n });
  });

  it("throws WrongChainError on chainId mismatch", async () => {
    const fx = buildFx({ chainId: 1 });
    await expect(
      revealMarketSkill({
        agentAccount: fx.agentAccount,
        walletClient: fx.walletClient,
        publicClient: fx.publicClient,
        hookAddress: HOOK,
        revealedParams: "0xdeadbeef",
        revealSalt: ("0x" + "00".repeat(31) + "01") as Hex,
      })
    ).rejects.toBeInstanceOf(WrongChainError);
  });

  it("throws TransactionRevertedError when on-chain reveal reverts (CommitMismatch etc.)", async () => {
    const fx = buildFx({ status: "reverted" });
    await expect(
      revealMarketSkill({
        agentAccount: fx.agentAccount,
        walletClient: fx.walletClient,
        publicClient: fx.publicClient,
        hookAddress: HOOK,
        revealedParams: "0xdeadbeef",
        revealSalt: ("0x" + "00".repeat(31) + "01") as Hex,
      })
    ).rejects.toBeInstanceOf(TransactionRevertedError);
  });
});
