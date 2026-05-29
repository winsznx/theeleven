import express from "express";
import {
  paymentMiddleware,
  x402ResourceServer,
} from "@okxweb3/x402-express";
import { ExactEvmScheme as ExactEvmServerScheme } from "@okxweb3/x402-evm/exact/server";
import { x402Client } from "@okxweb3/x402-core/client";
import { x402HTTPClient } from "@okxweb3/x402-core/http";
import { ExactEvmScheme as ExactEvmClientScheme, toClientEvmSigner } from "@okxweb3/x402-evm";
import { privateKeyToAccount } from "viem/accounts";

import { XLayerFacilitatorClient } from "../src/XLayerFacilitatorClient.js";
import { USDT0_NETWORK } from "../src/usdt0.js";

const PK = process.env.PK as `0x${string}` | undefined;
const BURNER = process.env.BURNER as `0x${string}` | undefined;
if (!PK || !BURNER) {
  console.error("[check3] FATAL: PK and BURNER env required");
  process.exit(1);
}

const PORT = 3403;
const ROUTE = "/paid";
const URL = `http://localhost:${PORT}${ROUTE}`;

async function startServer(): Promise<{ close: () => Promise<void> }> {
  const facilitator = new XLayerFacilitatorClient({
    facilitatorPrivateKey: PK!,
  });
  console.log("[server] facilitator wallet:", facilitator.facilitatorAddress);

  const resourceServer = new x402ResourceServer(facilitator).register(
    USDT0_NETWORK,
    new ExactEvmServerScheme(),
  );

  const app = express();
  app.use(
    paymentMiddleware(
      {
        [`GET ${ROUTE}`]: {
          accepts: {
            scheme: "exact",
            price: "$0.10",
            network: USDT0_NETWORK,
            payTo: BURNER!,
          },
          description: "Day 0 Check #3 KILL CHECK re-run",
        },
      },
      resourceServer,
    ),
  );
  app.get(ROUTE, (_req, res) => res.json({ ok: true, msg: "premium content delivered" }));

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
      resolve({
        close: () =>
          new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

async function runClient(): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  const account = privateKeyToAccount(PK!);
  const signer = toClientEvmSigner(account);
  const coreClient = new x402Client().register(USDT0_NETWORK, new ExactEvmClientScheme(signer));
  const client = new x402HTTPClient(coreClient);

  console.log("[client] making first GET (expect 402)...");
  const first = await fetch(URL);
  console.log("[client] first status:", first.status);
  if (first.status !== 402) {
    return { ok: false, error: `expected 402, got ${first.status}: ${await first.text()}` };
  }

  const required = client.getPaymentRequiredResponse(
    (name) => first.headers.get(name),
    await first.json(),
  );
  console.log("[client] payment required:", JSON.stringify(required, null, 2));

  const payload = await client.createPaymentPayload(required);
  console.log("[client] payload created, sending paid request...");

  const paid = await fetch(URL, {
    headers: client.encodePaymentSignatureHeader(payload),
  });
  console.log("[client] paid status:", paid.status);
  const body = await paid.text();
  console.log("[client] body:", body);

  const settlement = client.getPaymentSettleResponse((name) => paid.headers.get(name));
  console.log("[client] settlement:", JSON.stringify(settlement, null, 2));

  if (settlement?.transaction && settlement.transaction.startsWith("0x") && settlement.transaction.length === 66) {
    return { ok: true, txHash: settlement.transaction };
  }
  return {
    ok: false,
    error: `no valid tx hash in settlement response (status=${paid.status})`,
  };
}

async function main() {
  const { close } = await startServer();
  let result: { ok: boolean; txHash?: string; error?: string };
  try {
    await new Promise((r) => setTimeout(r, 500));
    result = await runClient();
  } catch (e) {
    result = { ok: false, error: `client threw: ${(e as Error).stack ?? e}` };
  } finally {
    await close();
  }

  if (!result.ok) {
    console.error("\n=== CHECK #3 FAIL ===");
    console.error(result.error);
    process.exit(1);
  }

  console.log("\n=== CHECK #3 PASS ===");
  console.log("tx:", result.txHash);
  console.log("OKLink:", `https://www.oklink.com/xlayer/tx/${result.txHash}`);
  process.exit(0);
}

main();
