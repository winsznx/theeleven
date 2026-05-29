import type { Hex, Address } from "viem";

import { USDT0_ADDRESS, USDT0_DECIMALS } from "@/config/tokens";
import { getPersona } from "@/lib/personas";
import type { MarketRow } from "@/types/market";

import { DEPLOY_RUNBOOK_URL } from "@/lib/deployment";

/**
 * Farcaster Frame v2 server helpers.
 *
 * No client bundle impact — these are pure string builders + types.
 * The frame surface is entirely server-rendered HTML; Warpcast (and other
 * Farcaster clients) parse the meta tags and orchestrate the wallet flow.
 */

export type FrameAction = "post" | "tx" | "link" | "post_redirect" | "mint";

export interface FrameButton {
  label: string;
  action: FrameAction;
  /** For `tx` and `link`. Omitted for `post`. */
  target?: string;
  /** For `tx`: where Warpcast POSTs after the wallet signs. */
  postUrl?: string;
}

export interface FrameSpec {
  imageUrl: string;
  imageAspectRatio?: "1.91:1" | "1:1";
  inputPlaceholder?: string;
  buttons: FrameButton[];
  /** og:url + the body fallback link target. */
  fallbackUrl?: string;
  /** og:title + the body fallback heading. */
  title: string;
  /** og:description. */
  description?: string;
}

export interface FrameTxResponse {
  chainId: `eip155:${number}`;
  method: "eth_signTypedData_v4";
  params: {
    /** Empty per Farcaster Frame v2 spec for signTypedData. */
    abi: [];
    /** Verifying contract — USDT0 for EIP-3009 sigs. */
    to: Address;
    /** JSON-stringified EIP-712 typed data. */
    data: string;
  };
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

function htmlEscape(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Replacer for JSON.stringify that turns bigints into decimal strings — the
 * format MetaMask + WalletConnect both accept for uint256 fields in
 * eth_signTypedData_v4 typed data.
 */
export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

/** Build the JSON response Warpcast expects from a `tx` action target. */
export function buildFrameTxResponse(typedData: {
  domain: Record<string, unknown>;
  types: Record<string, unknown>;
  primaryType: string;
  message: Record<string, unknown>;
}): FrameTxResponse {
  return {
    chainId: "eip155:196",
    method: "eth_signTypedData_v4",
    params: {
      abi: [],
      to: USDT0_ADDRESS,
      data: JSON.stringify(typedData, bigintReplacer),
    },
  };
}

/* ──────────────────────── HTML renderer ──────────────────────── */

/** The single `fc:miniapp` JSON object the current Mini App spec (May 2026)
 *  expects. One button per embed; clicking it launches the Mini App URL.
 *  Field constraints come from miniapps.farcaster.xyz/docs/specification:
 *    title  ≤ 32 chars
 *    imageUrl ≤ 1024 chars, 3:2 aspect ratio
 *    url    ≤ 1024 chars (defaults to current URL when omitted)
 *    action.type ∈ { "launch_miniapp", "launch_frame" } (launch_frame = legacy alias) */
interface MiniAppEmbed {
  version: "1";
  imageUrl: string;
  button: {
    title: string;
    action: {
      type: "launch_miniapp";
      name: string;
      url: string;
      splashImageUrl?: string;
      splashBackgroundColor?: string;
    };
  };
}

function buildMiniAppEmbed(spec: FrameSpec): MiniAppEmbed {
  // Pick the first button as the launcher — the spec only allows one
  // button per embed (the multi-button Frames-v1 grid is gone). For our
  // OVER/UNDER markets that means the cast surface is a single
  // "Open market" CTA; the actual side selection happens once the user
  // is inside the Mini App / dApp page.
  const primary = spec.buttons[0];
  const launchUrl =
    primary?.action === "link" && primary.target
      ? primary.target
      : spec.fallbackUrl ?? APP_URL;

  const title = primary?.label ?? "Open market";
  return {
    version: "1",
    imageUrl: spec.imageUrl,
    button: {
      // 32-char cap per spec.
      title: title.slice(0, 32),
      action: {
        type: "launch_miniapp",
        name: "Regista 11",
        url: launchUrl,
        splashImageUrl: `${APP_URL}/icon.png`,
        splashBackgroundColor: "#111a4a",
      },
    },
  };
}

/** Serialize a FrameSpec into a complete `<!doctype html>` document. */
export function renderFrameHtml(spec: FrameSpec): string {
  const embedJson = htmlEscape(JSON.stringify(buildMiniAppEmbed(spec)));
  const tags: string[] = [
    // Primary Mini App embed — what current Warpcast/farcaster.xyz reads.
    `<meta name="fc:miniapp" content="${embedJson}" />`,
    // Legacy alias kept for older clients still parsing fc:frame as the
    // same JSON shape (spec explicitly supports it during the transition).
    `<meta name="fc:frame" content="${embedJson}" />`,
    `<meta property="og:image" content="${htmlEscape(spec.imageUrl)}" />`,
    `<meta property="og:title" content="${htmlEscape(spec.title)}" />`,
  ];
  if (spec.description) {
    tags.push(`<meta property="og:description" content="${htmlEscape(spec.description)}" />`);
  }
  if (spec.fallbackUrl) {
    tags.push(`<meta property="og:url" content="${htmlEscape(spec.fallbackUrl)}" />`);
  }

  const body = renderFallbackBody(spec);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${htmlEscape(spec.title)}</title>
${tags.join("\n")}
</head>
<body>${body}</body>
</html>`;
}

function renderFallbackBody(spec: FrameSpec): string {
  const target = spec.fallbackUrl ?? "/";
  return `
<main style="font-family:system-ui,sans-serif;max-width:760px;margin:48px auto;padding:0 24px;color:#111a4a">
  <h1 style="font-size:22px;letter-spacing:-0.4px">${htmlEscape(spec.title)}</h1>
  <p style="color:#7c7f88;font-size:14px;line-height:1.5">
    This page is a Farcaster frame. Open it in a Farcaster client to stake;
    or follow the link to use the dApp.
  </p>
  <img src="${htmlEscape(spec.imageUrl)}" alt="${htmlEscape(spec.title)}" style="width:100%;max-width:600px;border-radius:8px;display:block;margin:24px 0" />
  <a href="${htmlEscape(target)}" style="display:inline-block;background:#ec652b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:500">Open in Regista 11 →</a>
</main>`;
}

/* ──────────────────────── Common frame variants ──────────────────────── */

function imageUrlFor(market: Address): string {
  return `${APP_URL}/api/frame/${market}/image`;
}

function signUrlFor(market: Address, side: 1 | 2): string {
  return `${APP_URL}/api/frame/${market}/sign?side=${side}`;
}

function submitUrlFor(market: Address, side: 1 | 2): string {
  return `${APP_URL}/api/frame/${market}/submit?side=${side}`;
}

function marketFallbackUrl(market: Address): string {
  return `${APP_URL}/market/${market}`;
}

function frameQuestionTitle(market: MarketRow): string {
  const persona = market.agentPersona ? getPersona(market.agentPersona) : null;
  const personaName = persona?.name ?? "Regista 11";
  const question = market.humanQuestion ?? "Live prop market";
  return `${personaName} · ${question}`;
}

export function renderInitialFrame(market: MarketRow): string {
  // Mini App embed spec allows ONE button — the in-cast OVER/UNDER grid
  // from Frames v1 is gone. The button launches the dApp page where the
  // full stake UI lives (wallet connect, side toggle, EIP-3009 sig). The
  // sign/submit API routes stay live for any older clients still using
  // the v1 tx flow but are no longer the primary surface.
  return renderFrameHtml({
    imageUrl: imageUrlFor(market.address),
    title: frameQuestionTitle(market),
    description: "Stake OVER or UNDER · gasless USDT0 on X Layer",
    fallbackUrl: marketFallbackUrl(market.address),
    buttons: [
      {
        label: "Stake on this market",
        action: "link",
        target: marketFallbackUrl(market.address),
      },
    ],
  });
}

export function renderClosedMarketFrame(market: MarketRow): string {
  // Differentiate the headline by where the market actually is in its
  // lifecycle — "staking closed" is vague to a casual viewer, and the
  // Warpcast preview only shows og:title/description so the wording is
  // load-bearing.
  const stateCopy: Record<typeof market.state, { title: string; description: string }> = {
    STAKING_OPEN: {
      title: frameQuestionTitle(market),
      description: "Stake OVER or UNDER · gasless USDT0 on X Layer",
    },
    AWAITING_REVEAL: {
      title: `${frameQuestionTitle(market)} — awaiting reveal`,
      description:
        "Staking window closed. The agent reveals the proposition next; settlement follows automatically.",
    },
    RESOLVED: {
      title: `${frameQuestionTitle(market)} — resolved`,
      description:
        "Market settled on X Layer. View the on-chain resolution and payouts.",
    },
    REFUNDED: {
      title: `${frameQuestionTitle(market)} — refunded`,
      description:
        "Agent missed the reveal window. All stakes were refunded on-chain.",
    },
  };
  const copy = stateCopy[market.state];
  return renderFrameHtml({
    imageUrl: imageUrlFor(market.address),
    title: copy.title,
    description: copy.description,
    fallbackUrl: marketFallbackUrl(market.address),
    buttons: [
      {
        label: "Open market",
        action: "link",
        target: marketFallbackUrl(market.address),
      },
    ],
  });
}

export function renderSuccessFrame(
  market: MarketRow,
  txHash: Hex,
  side: 1 | 2,
  amountMicros: bigint,
): string {
  const sideLabel = side === 1 ? "OVER" : "UNDER";
  const dollars = formatDollarString(amountMicros);
  return renderFrameHtml({
    imageUrl: imageUrlFor(market.address),
    title: `✓ Staked $${dollars} on ${sideLabel}`,
    description: `${frameQuestionTitle(market)} — settled on X Layer`,
    fallbackUrl: marketFallbackUrl(market.address),
    buttons: [
      {
        label: "View tx on OKLink",
        action: "link",
        target: `https://www.oklink.com/x-layer/tx/${txHash}`,
      },
      {
        label: "Open market",
        action: "link",
        target: marketFallbackUrl(market.address),
      },
    ],
  });
}

export function renderErrorFrame(market: MarketRow | null, message: string): string {
  const target = market ? marketFallbackUrl(market.address) : APP_URL;
  const factoryDown = /deployment in progress/i.test(message);
  return renderFrameHtml({
    imageUrl: market
      ? imageUrlFor(market.address)
      : `${APP_URL}/api/frame/0x0000000000000000000000000000000000000000/image`,
    title: factoryDown ? "Mainnet deployment in progress" : `Stake failed — ${message}`,
    description: message,
    fallbackUrl: factoryDown ? DEPLOY_RUNBOOK_URL : target,
    buttons: [
      {
        label: factoryDown ? "View deploy runbook" : "Try again",
        action: factoryDown ? "link" : "post_redirect",
        target: factoryDown ? DEPLOY_RUNBOOK_URL : target,
      },
    ],
  });
}

function formatDollarString(micros: bigint): string {
  const whole = micros / 10n ** BigInt(USDT0_DECIMALS);
  const frac = micros % 10n ** BigInt(USDT0_DECIMALS);
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(USDT0_DECIMALS, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

export const FRAME_APP_URL = APP_URL;
