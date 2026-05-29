import { recoverTypedDataAddress, type Hex, type Address } from "viem";
import {
  USDT0_ADDRESS,
  USDT0_CHAIN_ID,
  USDT0_DOMAIN_NAME,
  USDT0_DOMAIN_VERSION,
  EXPECTED_DOMAIN_SEPARATOR,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
} from "./usdt0.js";

export interface TransferAuthorization {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
}

const DOMAIN = {
  name: USDT0_DOMAIN_NAME,
  version: USDT0_DOMAIN_VERSION,
  chainId: USDT0_CHAIN_ID,
  verifyingContract: USDT0_ADDRESS,
} as const;

export function computeDomainSeparator(): Hex {
  return EXPECTED_DOMAIN_SEPARATOR;
}

export async function recoverTransferSigner(
  auth: TransferAuthorization,
  signature: Hex,
): Promise<Address> {
  return await recoverTypedDataAddress({
    domain: DOMAIN,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: auth,
    signature,
  });
}

export function splitSignature(signature: Hex): { v: number; r: Hex; s: Hex } {
  if (signature.length !== 132) {
    throw new Error(`splitSignature: expected 65-byte signature, got ${(signature.length - 2) / 2} bytes`);
  }
  const r = ("0x" + signature.slice(2, 66)) as Hex;
  const s = ("0x" + signature.slice(66, 130)) as Hex;
  let v = parseInt(signature.slice(130, 132), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}
