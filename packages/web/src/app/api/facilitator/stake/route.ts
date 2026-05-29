import { PropMarketHookABI } from "@/abis/PropMarketHook";
import {
  HttpError,
  parseAddress,
  parseAmount,
  parseHex32,
  parseSide,
  parseSignature,
  parseValidBefore,
} from "@/lib/http";

import { checkAndRecordNonce, getRelayer } from "./relayer";

interface StakeBody {
  market?: unknown;
  from?: unknown;
  side?: unknown;
  amount?: unknown;
  nonce?: unknown;
  validBefore?: unknown;
  signature?: unknown;
}

/**
 * 3-layer validation:
 *   1. JSON parse
 *   2. Per-field structural enforcement via lib/http parsers
 *   3. Domain action (relayer.writeContract)
 *
 * All client-visible errors flow through HttpError.toResponse(); anything
 * else is logged and surfaces as a generic 500 to avoid leaking internals.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON body", "JSON parse failed");
    })) as StakeBody;

    const market = parseAddress(body.market, "market");
    const from = parseAddress(body.from, "from");
    const side = parseSide(body.side, "side");
    const amount = parseAmount(body.amount, "amount");
    const nonce = parseHex32(body.nonce, "nonce");
    const validBefore = parseValidBefore(body.validBefore, "validBefore");
    const { v, r, s } = parseSignature(body.signature, "signature");

    checkAndRecordNonce(nonce);

    const relayer = getRelayer();
    if (!relayer.account) {
      throw new HttpError(503, "Facilitator unavailable", "relayer has no account");
    }

    const txHash = await relayer.writeContract({
      address: market,
      abi: PropMarketHookABI,
      functionName: "stake",
      args: [from, side, amount, 0n, validBefore, nonce, v, r, s],
      account: relayer.account,
      chain: relayer.chain,
    });

    return Response.json({ txHash }, { status: 200 });
  } catch (err) {
    if (err instanceof HttpError) return err.toResponse();
    // eslint-disable-next-line no-console
    console.error("[/api/facilitator/stake] unexpected error", err);
    return Response.json(
      { error: "Internal error — try again" },
      { status: 500 },
    );
  }
}
