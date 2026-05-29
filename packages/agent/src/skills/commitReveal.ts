import { randomBytes } from "node:crypto";
import { encodePacked, keccak256, type Address, type Hex } from "viem";

/** Generate a fresh 32-byte salt using crypto-grade randomness. */
export function generateRevealSalt(): Hex {
  const buf = randomBytes(32);
  return `0x${buf.toString("hex")}` as Hex;
}

/**
 * Compute the commit hash exactly as PropMarketHook.reveal recomputes it:
 *   keccak256(abi.encodePacked(revealedParams, salt, agentAddress))
 *
 * Cross-reference: see packages/contracts/src/PropMarketHook.sol::reveal —
 * the recomputedHash check must match this byte-for-byte.
 */
export function computeCommitHash(args: {
  revealedParams: Hex;
  salt: Hex;
  agentAddress: Address;
}): Hex {
  return keccak256(
    encodePacked(
      ["bytes", "bytes32", "address"],
      [args.revealedParams, args.salt, args.agentAddress]
    )
  );
}
