import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@okxweb3/x402-express";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";

const BURNER = process.env.BURNER as `0x${string}`;
if (!BURNER) throw new Error("BURNER env required");

const facilitatorClient = new OKXFacilitatorClient({
  apiKey: process.env.OKX_API_KEY ?? "",
  secretKey: process.env.OKX_SECRET_KEY ?? "",
  passphrase: process.env.OKX_PASSPHRASE ?? "",
});

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:196", new ExactEvmScheme());

const app = express();

app.use(
  paymentMiddleware(
    {
      "GET /paid": {
        accepts: {
          scheme: "exact",
          price: "$0.10",
          network: "eip155:196",
          payTo: BURNER,
        },
        description: "Day 0 x402 KILL CHECK",
      },
    },
    resourceServer,
  ),
);

app.get("/paid", (_req, res) => {
  res.json({ ok: true, msg: "premium content delivered" });
});

const port = 3402;
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
