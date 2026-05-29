import { describe, it, expect } from "vitest";
import { makePublicClient } from "../src/clients/publicClient.js";
import { INFRA } from "../src/config/infra.js";
import { IUSDT0ABI } from "../src/contracts/abis/index.js";
import { USDT0_ADDRESS, POOL_MANAGER_ADDRESS } from "../src/contracts/addresses.js";

const skipNet = process.env.SKIP_NETWORK_TESTS === "1";

describe.skipIf(skipNet)("smoke: X Layer mainnet RPC", () => {
  const client = makePublicClient();

  it("returns chainId 196", async () => {
    const id = await client.getChainId();
    expect(id).toBe(INFRA.chainId);
  });

  it("USDT0 readable: balanceOf(zero) is a bigint", async () => {
    const bal = (await client.readContract({
      address: USDT0_ADDRESS,
      abi: IUSDT0ABI,
      functionName: "balanceOf",
      args: ["0x0000000000000000000000000000000000000000"],
    })) as bigint;
    expect(typeof bal).toBe("bigint");
  });

  it("USDT0 readable: authorizationState(zero, zeroNonce) returns false", async () => {
    const used = (await client.readContract({
      address: USDT0_ADDRESS,
      abi: IUSDT0ABI,
      functionName: "authorizationState",
      args: [
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ],
    })) as boolean;
    expect(used).toBe(false);
  });

  it("PoolManager has bytecode at the expected address", async () => {
    const code = await client.getBytecode({ address: POOL_MANAGER_ADDRESS });
    expect(code).toBeDefined();
    expect(code).not.toBe("0x");
    expect((code as string).length).toBeGreaterThan(2);
  });
});
