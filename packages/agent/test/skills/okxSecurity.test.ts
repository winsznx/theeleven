import { describe, it, expect, vi } from "vitest";
import type { PublicClient } from "viem";

import {
  verifyAgentRegistration,
  assertAgentRegistered,
  verifyFactoryCode,
} from "../../src/skills/okx/okxSecurity.js";
import { AgentNotRegisteredError } from "../../src/skills/errors.js";

const FACTORY = "0x0000000000000000000000000000000000000F4C" as const;
const AGENT = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;

function makeStubPublicClient(opts: { isReg?: boolean; code?: `0x${string}` }) {
  return {
    readContract: vi.fn().mockResolvedValue(opts.isReg ?? false),
    getBytecode: vi.fn().mockResolvedValue(opts.code ?? "0x"),
  } as unknown as PublicClient;
}

describe("okxSecurity.verifyAgentRegistration", () => {
  it("returns true when factory.registeredAgents(agent) is true", async () => {
    const client = makeStubPublicClient({ isReg: true });
    const ok = await verifyAgentRegistration({
      publicClient: client,
      factoryAddress: FACTORY,
      agentAddress: AGENT,
    });
    expect(ok).toBe(true);
  });

  it("returns false when not registered", async () => {
    const client = makeStubPublicClient({ isReg: false });
    const ok = await verifyAgentRegistration({
      publicClient: client,
      factoryAddress: FACTORY,
      agentAddress: AGENT,
    });
    expect(ok).toBe(false);
  });
});

describe("okxSecurity.assertAgentRegistered", () => {
  it("throws AgentNotRegisteredError when not registered", async () => {
    const client = makeStubPublicClient({ isReg: false });
    await expect(
      assertAgentRegistered({
        publicClient: client,
        factoryAddress: FACTORY,
        agentAddress: AGENT,
      })
    ).rejects.toBeInstanceOf(AgentNotRegisteredError);
  });
});

describe("okxSecurity.verifyFactoryCode", () => {
  it("returns false when extcodesize=0 (no bytecode at address)", async () => {
    const client = makeStubPublicClient({ code: "0x" });
    const ok = await verifyFactoryCode({ publicClient: client, factoryAddress: FACTORY });
    expect(ok).toBe(false);
  });

  it("returns true when there is real bytecode", async () => {
    const client = makeStubPublicClient({ code: "0x6080604052" });
    const ok = await verifyFactoryCode({ publicClient: client, factoryAddress: FACTORY });
    expect(ok).toBe(true);
  });
});
