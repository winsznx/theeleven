import type { Address } from "viem";
import { INFRA } from "../config/infra.js";
import { loadDeployment } from "../config/deployment.js";

const deployment = loadDeployment();

export const USDT0_ADDRESS: Address = INFRA.usdt0;
export const POOL_MANAGER_ADDRESS: Address = INFRA.poolManager;

/**
 * Factory address from the on-disk deployment artifact. Throws if accessed
 * before Tim has broadcast (deployments/xlayer-mainnet.json doesn't exist),
 * so downstream code fails loudly at usage time rather than silently with
 * the zero address.
 */
export function getFactoryAddress(): Address {
  if (!deployment) {
    throw new Error(
      "PropMarketHookFactory address unavailable: " +
        "packages/contracts/deployments/xlayer-mainnet.json does not exist. " +
        "Run the mainnet deploy first (see packages/contracts/DEPLOYMENT.md)."
    );
  }
  return deployment.contracts.PropMarketHookFactory;
}

/** Same as getFactoryAddress() but returns null when undeployed, for tolerant callers. */
export function tryGetFactoryAddress(): Address | null {
  return deployment?.contracts.PropMarketHookFactory ?? null;
}
