import { describe, it, expect } from "vitest";
import { encodePacked, keccak256, type Hex } from "viem";

import { computeCommitHash, generateRevealSalt } from "../../src/skills/commitReveal.js";

describe("generateRevealSalt", () => {
  it("returns a 32-byte 0x-prefixed hex string", () => {
    const s = generateRevealSalt();
    expect(s).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("is collision-free across 1000 iterations", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(generateRevealSalt());
    expect(set.size).toBe(1000);
  });
});

describe("computeCommitHash", () => {
  /**
   * GOLDEN VECTOR — locked in P9. Derivation:
   *   revealedParams = 0xdeadbeefcafebabe                 (8 bytes)
   *   salt           = bytes32(0xa11ce)                   (32 bytes, left-padded)
   *   agentAddress   = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266   (Anvil canonical #0)
   *
   * Packed bytes (60 total):
   *   deadbeefcafebabe
   *   00000000000000000000000000000000000000000000000000000000000a11ce
   *   f39fd6e51aad88f6f4ce6ab8827279cfffb92266
   *
   * Reproduce on the command line:
   *   cast keccak 0xdeadbeefcafebabe00000000000000000000000000000000000000000000000000000000000a11cef39fd6e51aad88f6f4ce6ab8827279cfffb92266
   *   → 0xcc3e56a755d93372aaa11218a285b819f29752c1069f12adbc6dfe920021e117
   */
  it("matches the locked golden vector", () => {
    const out = computeCommitHash({
      revealedParams: "0xdeadbeefcafebabe",
      salt: "0x00000000000000000000000000000000000000000000000000000000000a11ce" as Hex,
      agentAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    });
    expect(out).toBe("0xcc3e56a755d93372aaa11218a285b819f29752c1069f12adbc6dfe920021e117");
  });

  it("matches Solidity's keccak256(abi.encodePacked(bytes, bytes32, address)) reference for arbitrary triples", () => {
    // The contract's recomputedHash recipe is exactly this — reproducing via
    // viem's encodePacked + keccak256 must match. Verifying with 3 triples.
    const triples: Array<{ params: Hex; salt: Hex; agent: `0x${string}` }> = [
      {
        params: "0x",
        salt: ("0x" + "01".repeat(32)) as Hex,
        agent: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      },
      {
        params: "0xfe",
        salt: ("0x" + "ab".repeat(32)) as Hex,
        agent: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      },
      {
        params: "0x" + "11223344".repeat(8) as Hex,
        salt: ("0x" + "00".repeat(31) + "07") as Hex,
        agent: "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
      },
    ];
    for (const t of triples) {
      const fromSkill = computeCommitHash({
        revealedParams: t.params,
        salt: t.salt,
        agentAddress: t.agent,
      });
      const fromInline = keccak256(
        encodePacked(["bytes", "bytes32", "address"], [t.params, t.salt, t.agent])
      );
      expect(fromSkill).toBe(fromInline);
    }
  });
});
