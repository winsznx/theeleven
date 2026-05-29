import { describe, it, expect, vi } from "vitest";
import type { Hex, PublicClient, WalletClient } from "viem";

import { signAndSendImpl } from "../../src/skills/okx/okxAgenticWallet.js";
import { TransactionRevertedError } from "../../src/skills/errors.js";

const TX_HASH = "0x1111111111111111111111111111111111111111111111111111111111111111" as Hex;
const TO = "0x000000000000000000000000000000000000c0DE" as const;
const ACCOUNT = { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as `0x${string}` };

interface StubOpts {
  sendTransaction?: ReturnType<typeof vi.fn>;
  waitForTransactionReceipt?: ReturnType<typeof vi.fn>;
  estimateGas?: ReturnType<typeof vi.fn>;
}

function makeStubs(opts: StubOpts = {}) {
  const walletClient = {
    account: ACCOUNT,
    chain: null,
    sendTransaction: opts.sendTransaction ?? vi.fn().mockResolvedValue(TX_HASH),
  } as unknown as WalletClient;
  const publicClient = {
    estimateGas: opts.estimateGas ?? vi.fn().mockResolvedValue(100_000n),
    waitForTransactionReceipt:
      opts.waitForTransactionReceipt ??
      vi.fn().mockResolvedValue({
        status: "success",
        blockNumber: 999n,
        gasUsed: 80_000n,
      }),
  } as unknown as PublicClient;
  return { walletClient, publicClient };
}

const noSleep = () => Promise.resolve();

describe("okxAgenticWallet.signAndSend", () => {
  it("happy path: estimateGas → sendTransaction → waitForReceipt → success receipt", async () => {
    const { walletClient, publicClient } = makeStubs();
    const r = await signAndSendImpl(
      { walletClient, publicClient, to: TO, data: "0xdeadbeef" as Hex },
      noSleep
    );
    expect(r).toEqual({
      txHash: TX_HASH,
      blockNumber: 999n,
      gasUsed: 80_000n,
      status: "success",
    });
  });

  it("throws TransactionRevertedError on receipt.status='reverted'", async () => {
    const { walletClient, publicClient } = makeStubs({
      waitForTransactionReceipt: vi
        .fn()
        .mockResolvedValue({ status: "reverted", blockNumber: 999n, gasUsed: 80_000n }),
    });
    await expect(
      signAndSendImpl({ walletClient, publicClient, to: TO, data: "0xab" as Hex }, noSleep)
    ).rejects.toBeInstanceOf(TransactionRevertedError);
  });

  it("retries on RPC error then succeeds (2 transient fails, then success)", async () => {
    const wait = vi
      .fn()
      .mockRejectedValueOnce(new Error("rpc flake 1"))
      .mockRejectedValueOnce(new Error("rpc flake 2"))
      .mockResolvedValue({ status: "success", blockNumber: 1n, gasUsed: 1n });
    const { walletClient, publicClient } = makeStubs({ waitForTransactionReceipt: wait });
    const r = await signAndSendImpl(
      { walletClient, publicClient, to: TO, data: "0xab" as Hex },
      noSleep
    );
    expect(r.status).toBe("success");
    expect(wait).toHaveBeenCalledTimes(3);
  });

  it("fails after 4 attempts (initial + 3 retries) on persistent RPC errors", async () => {
    const wait = vi.fn().mockRejectedValue(new Error("persistent rpc"));
    const { walletClient, publicClient } = makeStubs({ waitForTransactionReceipt: wait });
    await expect(
      signAndSendImpl({ walletClient, publicClient, to: TO, data: "0xab" as Hex }, noSleep)
    ).rejects.toThrow("persistent rpc");
    expect(wait).toHaveBeenCalledTimes(4);
  });

  it("honors custom gas override (skips estimateGas)", async () => {
    const estimate = vi.fn();
    const send = vi.fn().mockResolvedValue(TX_HASH);
    const { walletClient, publicClient } = makeStubs({
      estimateGas: estimate,
      sendTransaction: send,
    });
    await signAndSendImpl(
      { walletClient, publicClient, to: TO, data: "0xab" as Hex, gas: 250_000n },
      noSleep
    );
    expect(estimate).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ gas: 250_000n }));
  });
});
