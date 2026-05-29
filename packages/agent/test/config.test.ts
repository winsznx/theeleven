import { describe, it, expect } from "vitest";
import { loadDeployment } from "../src/config/deployment.js";
import { INFRA } from "../src/config/infra.js";
import { tryGetFactoryAddress } from "../src/contracts/addresses.js";

const FACTORY = "0x080627e92182cb87911a7e512379ced1ecdd3ab5";

describe("deployment loader", () => {
  it("loads the broadcast artifact at packages/contracts/deployments/xlayer-mainnet.json", () => {
    // #given the protocol is deployed (factory broadcast May 28 2026,
    //        block 61215796, tx 0xd1aac0…799e7c6) so the artifact exists
    // #when the loader reads the default path
    const result = loadDeployment();
    // #then it returns the deployment with the live factory + all 11 agents
    expect(result).not.toBeNull();
    expect(result?.chainId).toBe(196);
    expect(result?.contracts.PropMarketHookFactory.toLowerCase()).toBe(FACTORY);
    expect(result?.agents).toHaveLength(11);
  });

  it("tryGetFactoryAddress returns the deployed factory address", () => {
    // #then the tolerant accessor surfaces the same on-chain factory
    expect(tryGetFactoryAddress()?.toLowerCase()).toBe(FACTORY);
  });

  it("rejects a malformed deployment JSON", () => {
    // Point at any pre-existing JSON that doesn't match the schema.
    const bogusPath = new URL("./wallets.test.ts", import.meta.url).pathname;
    expect(() => loadDeployment(bogusPath)).toThrow();
  });
});

describe("INFRA constants", () => {
  it("locks chainId 196", () => {
    expect(INFRA.chainId).toBe(196);
  });
  it("USDT0 + PoolManager match Day-0 known-good", () => {
    expect(INFRA.usdt0.toLowerCase()).toBe(
      "0x779Ded0c9e1022225f8E0630b35a9b54bE713736".toLowerCase()
    );
    expect(INFRA.poolManager.toLowerCase()).toBe(
      "0x360e68faccca8ca495c1b759fd9eee466db9fb32"
    );
  });
});
