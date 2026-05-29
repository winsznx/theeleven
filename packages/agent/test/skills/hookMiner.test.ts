import { describe, it, expect } from "vitest";
import { getAddress, keccak256, type Hex } from "viem";

import { computeCreate2Address, mineHookSalt } from "../../src/skills/hookMiner.js";
import { HookMinerExhaustedError } from "../../src/skills/errors.js";

describe("computeCreate2Address", () => {
  // EIP-1014 Example 0:
  //   deployer = 0x000...000, salt = 0x000...000, init_code = 0x00
  //   keccak256(0x00) = 0xbc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a
  //   expected address = 0x4D1A2e2bB4F88F0250f26Ffff098B0b30B26BF38
  it("matches EIP-1014 example 0 (zero deployer, zero salt, initCode 0x00)", () => {
    const initCodeHash = keccak256("0x00");
    expect(initCodeHash).toBe(
      "0xbc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a"
    );
    const addr = computeCreate2Address({
      deployer: "0x0000000000000000000000000000000000000000",
      salt: "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
      initCodeHash,
    });
    expect(addr).toBe("0x4D1A2e2bB4F88F0250f26Ffff098B0b30B26BF38");
  });

  it("returns checksum-encoded addresses", () => {
    const a = computeCreate2Address({
      deployer: "0x1111111111111111111111111111111111111111",
      salt: "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex,
      initCodeHash: "0x" + "ab".repeat(32) as Hex,
    });
    expect(a).toBe(getAddress(a));
  });
});

describe("mineHookSalt", () => {
  const DEPLOYER = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" as const;
  const INIT_CODE_HASH = ("0x" + "ab".repeat(32)) as Hex;

  it("finds a salt whose predicted address satisfies bitmap 0x2A80", () => {
    const start = Date.now();
    const { salt, predicted, iterations } = mineHookSalt({
      deployer: DEPLOYER,
      initCodeHash: INIT_CODE_HASH,
      targetBitmap: 0x2a80,
    });
    const elapsed = Date.now() - start;
    expect(Number(BigInt(predicted) & 0x3fffn)).toBe(0x2a80);
    expect(salt).toMatch(/^0x[0-9a-f]{64}$/);
    expect(iterations).toBeGreaterThan(0n);
    expect(elapsed).toBeLessThan(5_000);
  });

  it("is deterministic — same inputs → same salt + address", () => {
    const r1 = mineHookSalt({
      deployer: DEPLOYER,
      initCodeHash: INIT_CODE_HASH,
      targetBitmap: 0x2a80,
    });
    const r2 = mineHookSalt({
      deployer: DEPLOYER,
      initCodeHash: INIT_CODE_HASH,
      targetBitmap: 0x2a80,
    });
    expect(r2.salt).toBe(r1.salt);
    expect(r2.predicted).toBe(r1.predicted);
    expect(r2.iterations).toBe(r1.iterations);
  });

  it("throws HookMinerExhaustedError when maxIterations is too small", () => {
    expect(() =>
      mineHookSalt({
        deployer: DEPLOYER,
        initCodeHash: INIT_CODE_HASH,
        targetBitmap: 0x2a80,
        // 5 iterations × 1/16384 hit probability → vanishingly unlikely to find
        maxIterations: 5n,
      })
    ).toThrow(HookMinerExhaustedError);
  });
});
