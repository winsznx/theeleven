import type { Address } from "viem";

import deploymentJson from "@/data/deployments.json";

import { nameToPersonaSlug } from "./personas";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

interface RawAgent {
  index: number;
  name: string;
  address: string;
}

interface RawDeployment {
  chainId: number;
  network: string;
  deployed?: boolean;
  deployedAt: string | null;
  deployedAtBlock: number | null;
  deployer: string | null;
  resolver: string | null;
  contracts: { PropMarketHookFactory: string | null };
  knownExternal: { poolManager: string; usdt0: string };
  agents: RawAgent[] | null;
  version?: string;
}

const raw = deploymentJson as RawDeployment;

/** Null-tolerant view consumed by hooks + components. */
export interface WebDeployment {
  chainId: number;
  network: string;
  factory: Address | null;
  resolver: Address | null;
  poolManager: Address;
  usdt0: Address;
  deployedAtBlock: bigint | null;
  deployedAtISO: string | null;
  /** Map persona slug → agent wallet (null when undeployed). */
  agentsByPersona: Partial<Record<PersonaSlug, Address>> | null;
  /** Inverse map for fast wallet → persona lookups. */
  personaByAgent: Map<Address, PersonaSlug> | null;
  version: string;
}

function asAddress(value: string | null): Address | null {
  if (!value) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value as Address;
}

function buildAgentMaps(
  agents: RawAgent[] | null,
): {
  byPersona: Partial<Record<PersonaSlug, Address>> | null;
  byAgent: Map<Address, PersonaSlug> | null;
} {
  if (!agents || agents.length === 0) return { byPersona: null, byAgent: null };

  const byPersona: Partial<Record<PersonaSlug, Address>> = {};
  const byAgent = new Map<Address, PersonaSlug>();

  for (const entry of agents) {
    const addr = asAddress(entry.address);
    if (!addr) continue;
    const slug = nameToPersonaSlug(entry.name);
    if (!slug) continue;
    byPersona[slug] = addr;
    byAgent.set(addr, slug);
  }
  return { byPersona, byAgent };
}

const { byPersona, byAgent } = buildAgentMaps(raw.agents);

export const WEB_DEPLOYMENT: WebDeployment = {
  chainId: raw.chainId,
  network: raw.network,
  factory: asAddress(raw.contracts.PropMarketHookFactory),
  resolver: asAddress(raw.resolver),
  poolManager: asAddress(raw.knownExternal.poolManager) ??
    ("0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32" as Address),
  usdt0:
    asAddress(raw.knownExternal.usdt0) ??
    ("0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address),
  deployedAtBlock: raw.deployedAtBlock != null ? BigInt(raw.deployedAtBlock) : null,
  deployedAtISO: raw.deployedAt,
  agentsByPersona: byPersona,
  personaByAgent: byAgent,
  version: raw.version ?? "0.0.0-undeployed",
};

export function isFactoryDeployed(): boolean {
  return WEB_DEPLOYMENT.factory !== null;
}

export const DEPLOY_RUNBOOK_URL =
  "https://github.com/winsznx/theeleven/blob/main/packages/contracts/DEPLOYMENT.md";
