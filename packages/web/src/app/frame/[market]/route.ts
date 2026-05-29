import "server-only";

import { HttpError, parseAddress } from "@/lib/http";
import { cleanErrorMessage } from "@/lib/errors";
import { WEB_DEPLOYMENT } from "@/lib/deployment";
import { getMarketRow } from "@/lib/onchain";
import {
  renderClosedMarketFrame,
  renderErrorFrame,
  renderInitialFrame,
} from "@/lib/frame";

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Frames change as odds shift — short cache, not aggressive.
      "cache-control": "public, max-age=30, s-maxage=30",
    },
  });
}

/**
 * Initial GET for a shared market frame. Returns Farcaster Frame v2 HTML
 * with two tx buttons (OVER / UNDER), an amount input, and a fallback
 * <body> link card for non-Farcaster browsers.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ market: string }> },
): Promise<Response> {
  try {
    const { market: rawMarket } = await params;

    if (!WEB_DEPLOYMENT.factory) {
      return htmlResponse(renderErrorFrame(null, "Mainnet deployment in progress"), 503);
    }

    const marketAddress = parseAddress(rawMarket, "market");
    const market = await getMarketRow(marketAddress);
    if (!market) {
      return htmlResponse(renderErrorFrame(null, "Market not found"), 404);
    }

    if (market.state !== "STAKING_OPEN") {
      return htmlResponse(renderClosedMarketFrame(market));
    }

    return htmlResponse(renderInitialFrame(market));
  } catch (err) {
    if (err instanceof HttpError) {
      return htmlResponse(renderErrorFrame(null, err.userMessage), err.status);
    }
    return htmlResponse(renderErrorFrame(null, cleanErrorMessage(err)), 500);
  }
}
