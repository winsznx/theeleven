import { encodePacked, getAddress, keccak256, pad, toHex, type Address, type Hex } from "viem";
import { HookMinerExhaustedError } from "./errors.js";

const FLAG_MASK = 0x3fff;

/**
 * Compute the address that CREATE2 would produce.
 *   addr = last 20 bytes of keccak256(0xff || deployer || salt || initCodeHash)
 */
export function computeCreate2Address(args: {
  deployer: Address;
  salt: Hex;
  initCodeHash: Hex;
}): Address {
  const packed = encodePacked(
    ["bytes1", "address", "bytes32", "bytes32"],
    ["0xff", args.deployer, args.salt, args.initCodeHash]
  );
  const hash = keccak256(packed);
  return getAddress(`0x${hash.slice(-40)}`);
}

/**
 * Iterate uint256 salts from 0n until the predicted CREATE2 address satisfies
 * `(addr & 0x3FFF) === targetBitmap`. Throws HookMinerExhaustedError if the
 * iteration budget is exceeded.
 *
 * Performance: ~1/16384 hit probability per iteration for the 14-bit bitmap.
 * Expected wall time: under 2s on a modern machine.
 */
export function mineHookSalt(args: {
  deployer: Address;
  initCodeHash: Hex;
  targetBitmap: number;
  maxIterations?: bigint;
}): { salt: Hex; predicted: Address; iterations: bigint } {
  const target = BigInt(args.targetBitmap & FLAG_MASK);
  const max = args.maxIterations ?? 10_000_000n;

  for (let i = 0n; i < max; i++) {
    const salt = pad(toHex(i), { size: 32 });
    const predicted = computeCreate2Address({
      deployer: args.deployer,
      salt,
      initCodeHash: args.initCodeHash,
    });
    const low14 = BigInt(predicted) & BigInt(FLAG_MASK);
    if (low14 === target) {
      return { salt, predicted, iterations: i + 1n };
    }
  }
  throw new HookMinerExhaustedError({ iterations: max, targetBitmap: args.targetBitmap });
}
