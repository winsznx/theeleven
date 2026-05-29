import { describe, it, expect, vi } from "vitest";
import type { PublicClient } from "viem";

import {
  assertChainHealth,
  fetchChainContext,
} from "../../src/skills/okx/okxOnchainGateway.js";
import { WrongChainError } from "../../src/skills/errors.js";

function makeStubPublicClient(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    getChainId: overrides.getChainId ?? vi.fn().mockResolvedValue(196),
    getBlock:
      overrides.getBlock ??
      vi.fn().mockResolvedValue({ number: 123n, timestamp: 1_700_000_000n }),
    getGasPrice: overrides.getGasPrice ?? vi.fn().mockResolvedValue(20_000_000n),
    getTransactionCount: overrides.getTransactionCount ?? vi.fn().mockResolvedValue(5),
  } as unknown as PublicClient;
}

const AGENT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;

describe("okxOnchainGateway.fetchChainContext", () => {
  it("returns a typed bundle with all 5 fields populated", async () => {
    const client = makeStubPublicClient();
    const ctx = await fetchChainContext({ publicClient: client, agentAddress: AGENT });
    expect(ctx).toEqual({
      chainId: 196,
      blockNumber: 123n,
      blockTimestamp: 1_700_000_000n,
      gasPrice: 20_000_000n,
      agentNonce: 5n,
    });
  });

  it("coerces the nonce to bigint regardless of upstream type", async () => {
    const client = makeStubPublicClient({
      getTransactionCount: vi.fn().mockResolvedValue(7),
    });
    const ctx = await fetchChainContext({ publicClient: client, agentAddress: AGENT });
    expect(typeof ctx.agentNonce).toBe("bigint");
    expect(ctx.agentNonce).toBe(7n);
  });
});

describe("okxOnchainGateway.assertChainHealth", () => {
  it("passes when chainId matches", async () => {
    const client = makeStubPublicClient();
    await expect(
      assertChainHealth({ publicClient: client, expectedChainId: 196 })
    ).resolves.toBeUndefined();
  });

  it("throws WrongChainError on mismatch", async () => {
    const client = makeStubPublicClient({
      getChainId: vi.fn().mockResolvedValue(1),
    });
    await expect(
      assertChainHealth({ publicClient: client, expectedChainId: 196 })
    ).rejects.toBeInstanceOf(WrongChainError);
  });
});
