import "server-only";

import type { Hex } from "viem";

import {
  HttpError,
  parseAddress,
  parseFrameAmount,
  parseHex,
  parseSide,
} from "@/lib/http";
import { cleanErrorMessage } from "@/lib/errors";
import { getMarketRow } from "@/lib/onchain";
import { WEB_DEPLOYMENT } from "@/lib/deployment";
import {
  FRAME_APP_URL,
  renderErrorFrame,
  renderSuccessFrame,
} from "@/lib/frame";

import { makeAuthCacheKey, popPendingAuth } from "../auth-cache";

interface UntrustedData {
  address?: string;
  inputText?: string;
  transactionId?: string;
}

interface FrameSubmitBody {
  untrustedData?: UntrustedData;
  trustedData?: unknown;
  address?: string;
  transactionId?: string;
}

const SIGNATURE_REGEX = /^0x[a-fA-F0-9]{130}$/;

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/**
 * Farcaster Frame v2 `post_url` handler for the stake flow.
 *
 * Inputs from Warpcast:
 *   body.transactionId          = the user's EIP-712 signature
 *   body.address                = the user's wallet address
 *   body.untrustedData.inputText = the dollar amount the user typed
 *   ?side=1|2                    = which pool they tapped
 *
 * Looks up the cached (nonce, validBefore) the /sign endpoint stored
 * for this (user, market, side, amount), then POSTs to the existing
 * P17 facilitator endpoint and renders a success or error frame in
 * response to Warpcast.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ market: string }> },
): Promise<Response> {
  const { market: rawMarket } = await params;

  // Best-effort market for error-frame context — never let this throw past
  // the outer try block.
  let marketForError = null;
  try {
    if (WEB_DEPLOYMENT.factory && /^0x[a-fA-F0-9]{40}$/.test(rawMarket)) {
      marketForError = await getMarketRow(rawMarket as `0x${string}`);
    }
  } catch {
    marketForError = null;
  }

  try {
    if (!WEB_DEPLOYMENT.factory) {
      throw new HttpError(503, "Mainnet deployment in progress", "factory address null");
    }

    const marketAddress = parseAddress(rawMarket, "market");

    const url = new URL(req.url);
    const side = parseSide(url.searchParams.get("side"), "side");

    const body = (await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON body", "JSON parse failed");
    })) as FrameSubmitBody;

    const signature = parseHex(
      body.transactionId ?? body.untrustedData?.transactionId,
      "signature",
      SIGNATURE_REGEX,
    );
    const userAddress = parseAddress(
      body.address ?? body.untrustedData?.address,
      "user address",
    );
    const amountMicros = parseFrameAmount(body.untrustedData?.inputText ?? "", "amount");

    const cached = popPendingAuth(
      makeAuthCacheKey(userAddress, marketAddress, side, amountMicros),
    );
    if (!cached) {
      throw new HttpError(
        409,
        "Authorization expired or not found — try again",
        "auth cache miss",
      );
    }

    const facilitatorBody = {
      market: marketAddress,
      from: userAddress,
      side,
      amount: amountMicros.toString(),
      nonce: cached.nonce,
      validBefore: cached.validBefore.toString(),
      signature,
    };

    const fres = await fetch(`${FRAME_APP_URL}/api/facilitator/stake`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(facilitatorBody),
    });
    if (!fres.ok) {
      const errJson = (await fres.json().catch(() => ({}))) as { error?: string };
      throw new HttpError(
        fres.status,
        errJson.error ?? "Stake failed",
        "facilitator non-2xx",
      );
    }

    const { txHash } = (await fres.json()) as { txHash: Hex };
    if (!marketForError) {
      // Re-read for the success frame (we earlier read it best-effort).
      marketForError = await getMarketRow(marketAddress);
    }
    if (!marketForError) {
      throw new HttpError(500, "Market read failed after stake", "");
    }

    return htmlResponse(renderSuccessFrame(marketForError, txHash, side, amountMicros));
  } catch (err) {
    if (err instanceof HttpError) {
      return htmlResponse(renderErrorFrame(marketForError, err.userMessage), err.status);
    }
    return htmlResponse(renderErrorFrame(marketForError, cleanErrorMessage(err)), 500);
  }
}
