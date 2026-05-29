"use client";

import { WEB_DEPLOYMENT, type WebDeployment } from "@/lib/deployment";

/**
 * Returns the bundled deployment metadata. Static at runtime — the file is
 * imported at build time and serialized into the client bundle. When Tim
 * runs the mainnet deploy script, sync-abis.mjs copies the updated JSON
 * and the next build picks it up.
 */
export function useFactoryDeployment(): WebDeployment {
  return WEB_DEPLOYMENT;
}
