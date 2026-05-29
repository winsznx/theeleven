import { makePublicClient } from "./clients/publicClient.js";
import { INFRA } from "./config/infra.js";
import { IUSDT0ABI } from "./contracts/abis/index.js";
import { USDT0_ADDRESS, POOL_MANAGER_ADDRESS } from "./contracts/addresses.js";
import { logger } from "./logger.js";

async function main() {
  const client = makePublicClient();

  const chainId = await client.getChainId();
  logger.info({ chainId }, "X Layer RPC reachable");
  if (chainId !== INFRA.chainId) {
    throw new Error(`expected chainId ${INFRA.chainId}, got ${chainId}`);
  }

  const decimals = (await client.readContract({
    address: USDT0_ADDRESS,
    abi: IUSDT0ABI,
    functionName: "balanceOf",
    // burn — we only care that the read returns something type-compatible
    args: ["0x0000000000000000000000000000000000000000"],
  })) as bigint;
  logger.info({ zeroBalance: decimals.toString() }, "USDT0 readable");

  const poolManagerCode = await client.getBytecode({ address: POOL_MANAGER_ADDRESS });
  if (!poolManagerCode || poolManagerCode === "0x") {
    throw new Error("PoolManager has no bytecode");
  }
  logger.info({ codeLength: poolManagerCode.length }, "PoolManager has bytecode");

  logger.info("smoke OK");
}

main().catch((err) => {
  logger.error({ err }, "smoke FAILED");
  process.exit(1);
});
