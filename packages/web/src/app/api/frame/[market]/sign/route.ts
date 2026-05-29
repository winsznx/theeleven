import "server-only";

import {
  HttpError,
  parseAddress,
  parseFrameAmount,
  parseSide,
} from "@/lib/http";
import { cleanErrorMessage } from "@/lib/errors";
import { buildEIP3009TypedData } from "@/lib/eip3009";
import { getMarketRow } from "@/lib/onchain";
import { WEB_DEPLOYMENT } from "@/lib/deployment";
import { buildFrameTxResponse, bigintReplacer } from "@/lib/frame";

import { makeAuthCacheKey, storePendingAuth } from "../auth-cache";

interface UntrustedData {
  address?: string;
  inputText?: string;
}

interface FrameSignBody {
  untrustedData?: UntrustedData;
  trustedData?: unknown;
}

/**
 * Farcaster Frame v2 `tx` action target.
 *
 * Receives the user's wallet address + inputText from Warpcast, builds the
 * EIP-3009 typed data for USDT0.transferWithAuthorization to the market,
 * caches the (nonce, validBefore) by (user, market, side, amount) so the
 * /submit endpoint can reconstruct the facilitator payload, and returns
 * the typed data inside the Farcaster tx response shape.
 *
 * The wallet then opens, the user signs, and Warpcast POSTs the signature
 * to the button's post_url (/api/frame/[market]/submit?side=N).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ market: string }> },
): Promise<Response> {
  try {
    if (!WEB_DEPLOYMENT.factory) {
      throw new HttpError(503, "Mainnet deployment in progress", "factory address null");
    }

    const { market: rawMarket } = await params;
    const marketAddress = parseAddress(rawMarket, "market");

    const url = new URL(req.url);
    const side = parseSide(url.searchParams.get("side"), "side");

    const body = (await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON body", "JSON parse failed");
    })) as FrameSignBody;

    const inputText = body.untrustedData?.inputText ?? "";
    const amountMicros = parseFrameAmount(inputText, "amount");

    const userAddress = parseAddress(body.untrustedData?.address, "user address");

    const market = await getMarketRow(marketAddress);
    if (!market) {
      throw new HttpError(404, "Market not found", "");
    }
    if (market.state !== "STAKING_OPEN") {
      throw new HttpError(409, "Market not open for staking", `state=${market.state}`);
    }

    const typedData = buildEIP3009TypedData({
      from: userAddress,
      to: marketAddress,
      value: amountMicros,
    });

    storePendingAuth(makeAuthCacheKey(userAddress, marketAddress, side, amountMicros), {
      nonce: typedData.message.nonce,
      validBefore: typedData.message.validBefore,
    });

    // Convert bigint fields to decimal strings for JSON serialization. The
    // wallet receives this via Warpcast's tx flow and treats numeric
    // strings as uint256.
    const serializableTypedData = JSON.parse(
      JSON.stringify(typedData, bigintReplacer),
    ) as {
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
    };

    return Response.json(buildFrameTxResponse(serializableTypedData));
  } catch (err) {
    if (err instanceof HttpError) return err.toResponse();
    // eslint-disable-next-line no-console
    console.error("[/api/frame/.../sign] unexpected:", err);
    return Response.json({ error: cleanErrorMessage(err) }, { status: 500 });
  }
}
