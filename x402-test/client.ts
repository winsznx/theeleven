import { x402Client } from "@okxweb3/x402-core/client";
import { x402HTTPClient } from "@okxweb3/x402-core/http";
import { ExactEvmScheme, toClientEvmSigner } from "@okxweb3/x402-evm";
import { privateKeyToAccount } from "viem/accounts";

const PK = process.env.PK as `0x${string}`;
if (!PK) throw new Error("PK env required");

const account = privateKeyToAccount(PK);
const signer = toClientEvmSigner(account);

const coreClient = new x402Client().register(
  "eip155:196",
  new ExactEvmScheme(signer),
);
const client = new x402HTTPClient(coreClient);

const URL = "http://localhost:3402/paid";

async function main() {
  const first = await fetch(URL);
  console.log("[client] first status:", first.status);

  if (first.status !== 402) {
    console.log("[client] unexpected status, body:", await first.text());
    process.exit(1);
  }

  const paymentRequired = client.getPaymentRequiredResponse(
    (name) => first.headers.get(name),
    await first.json(),
  );
  console.log(
    "[client] paymentRequired:",
    JSON.stringify(paymentRequired, null, 2),
  );

  const paymentPayload = await client.createPaymentPayload(paymentRequired);
  console.log("[client] payment payload created, sending paid request...");

  const paid = await fetch(URL, {
    headers: client.encodePaymentSignatureHeader(paymentPayload),
  });
  console.log("[client] paid status:", paid.status);

  const settlement = client.getPaymentSettleResponse((name) =>
    paid.headers.get(name),
  );
  console.log(
    "[client] settlement:",
    JSON.stringify(settlement, null, 2),
  );
  console.log("[client] body:", await paid.text());

  if (settlement?.transaction) {
    console.log("\n=== SUCCESS ===");
    console.log("tx:", settlement.transaction);
    console.log(
      "OKLink:",
      `https://www.oklink.com/xlayer/tx/${settlement.transaction}`,
    );
  }
}

main().catch((e) => {
  console.error("[client] FATAL:", e);
  process.exit(1);
});
