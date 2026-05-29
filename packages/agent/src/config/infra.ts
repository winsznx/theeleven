import type { Address } from "viem";

/** Day-0 known-good infrastructure constants. These do NOT come from env. */
export const INFRA = Object.freeze({
  chainId: 196 as const,
  chainName: "X Layer Mainnet" as const,
  nativeCurrency: Object.freeze({ name: "OKB", symbol: "OKB", decimals: 18 as const }),
  defaultRpcUrl: "https://rpc.xlayer.tech" as const,
  explorerBaseUrl: "https://www.oklink.com/xlayer" as const,
  usdt0: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
  usdt0Decimals: 6 as const,
  poolManager: "0x360e68faccca8ca495c1b759fd9eee466db9fb32" as Address,
});

export type Infra = typeof INFRA;
