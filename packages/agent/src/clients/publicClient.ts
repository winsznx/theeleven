import { createPublicClient, http, type PublicClient } from "viem";
import { xLayer } from "viem/chains";
import { INFRA } from "../config/infra.js";

export function makePublicClient(rpcUrl?: string): PublicClient {
  return createPublicClient({
    chain: xLayer,
    transport: http(rpcUrl ?? INFRA.defaultRpcUrl, {
      retryCount: 3,
      timeout: 10_000,
    }),
    pollingInterval: 2_000,
  });
}
