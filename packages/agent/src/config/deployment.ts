import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Address } from "viem";

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "must be 0x + 40 hex")
  .transform((s) => s as Address);

const agentEntrySchema = z.object({
  index: z.number().int().min(0).max(10),
  name: z.string().min(1),
  address: addressSchema,
});

const deploymentSchema = z.object({
  chainId: z.literal(196),
  network: z.string(),
  deployedAt: z.string(),
  deployedAtBlock: z.number().int().nonnegative(),
  deployer: addressSchema,
  resolver: addressSchema,
  contracts: z.object({
    PropMarketHookFactory: addressSchema,
  }),
  knownExternal: z.object({
    poolManager: addressSchema,
    usdt0: addressSchema,
  }),
  agents: z.array(agentEntrySchema).length(11),
});

export type Deployment = z.infer<typeof deploymentSchema>;

const HERE = fileURLToPath(new URL(".", import.meta.url));
// packages/agent/src/config/ → ../../../contracts/deployments/xlayer-mainnet.json
const DEFAULT_DEPLOYMENT_PATH = resolve(
  HERE,
  "../../../contracts/deployments/xlayer-mainnet.json"
);

/**
 * Load the deployment artifact written by @regista11/contracts/script/Deploy.s.sol.
 * Returns null if the file doesn't exist yet (pre-broadcast state); throws on
 * schema mismatch (the file exists but is malformed — a real config bug).
 */
export function loadDeployment(path: string = DEFAULT_DEPLOYMENT_PATH): Deployment | null {
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return deploymentSchema.parse(raw);
}
