import type { Logger } from "pino";
import type { Address, PublicClient } from "viem";

import { PropMarketHookFactoryABI } from "../../contracts/abis/index.js";
import { AgentNotRegisteredError, FactoryNotDeployedError } from "../errors.js";

/**
 * okx-security skill — verify agent registration on the factory.
 * Returns the on-chain boolean from PropMarketHookFactory.registeredAgents(agent).
 */
export async function verifyAgentRegistration(args: {
  publicClient: PublicClient;
  factoryAddress: Address;
  agentAddress: Address;
  logger?: Logger;
}): Promise<boolean> {
  const isReg = (await args.publicClient.readContract({
    address: args.factoryAddress,
    abi: PropMarketHookFactoryABI,
    functionName: "registeredAgents",
    args: [args.agentAddress],
  })) as boolean;
  args.logger?.debug(
    { agent: args.agentAddress, factory: args.factoryAddress, isRegistered: isReg },
    "okx-security: registration checked"
  );
  return isReg;
}

/** Same as verifyAgentRegistration but throws AgentNotRegisteredError on false. */
export async function assertAgentRegistered(args: {
  publicClient: PublicClient;
  factoryAddress: Address;
  agentAddress: Address;
  logger?: Logger;
}): Promise<void> {
  const ok = await verifyAgentRegistration(args);
  if (!ok) {
    throw new AgentNotRegisteredError({ agent: args.agentAddress, factory: args.factoryAddress });
  }
}

/** Verify the factory address has bytecode — guards against pointing at a zero-code EOA. */
export async function verifyFactoryCode(args: {
  publicClient: PublicClient;
  factoryAddress: Address;
}): Promise<boolean> {
  const code = await args.publicClient.getBytecode({ address: args.factoryAddress });
  return !!code && code !== "0x" && code.length > 2;
}

/** Same as verifyFactoryCode but throws FactoryNotDeployedError on false. */
export async function assertFactoryDeployed(args: {
  publicClient: PublicClient;
  factoryAddress: Address;
}): Promise<void> {
  const ok = await verifyFactoryCode(args);
  if (!ok) throw new FactoryNotDeployedError(args.factoryAddress);
}
