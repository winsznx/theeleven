import type { Address } from "viem";

/** Canonical USDT0 on X Layer (chain 196). Verified Day 0. */
export const USDT0_ADDRESS: Address = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";

/**
 * Different USDT-named token on X Layer — NOT the one Bybit/OKX wallets bridge.
 * The stake widget MUST refuse to stake against this; downstream code can use
 * this as a detect-and-reject guard.
 */
export const LEGACY_USDT_ADDRESS: Address = "0x1e4a5963abfd975d8c9021ce480b42188849d41d";

export const USDT0_DECIMALS = 6;

/** EIP-712 domain — `name` is "USD₮0" where ₮ is U+20AE TUGRIK SIGN. */
export const USDT0_EIP712_NAME = "USD₮0";
export const USDT0_EIP712_VERSION = "1";
