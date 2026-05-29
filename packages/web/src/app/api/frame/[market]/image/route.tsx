import { ImageResponse } from "next/og";

import { WEB_DEPLOYMENT } from "@/lib/deployment";
import { getMarketRow } from "@/lib/onchain";
import { getPersona } from "@/lib/personas";
import { getSpriteRects } from "@/lib/sprite-paths";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";
import type { MarketRow } from "@/types/market";

// P22: edge runtime dropped — we deploy via Next.js standalone on Railway,
// not Vercel Edge. next/og's ImageResponse runs on the default Node runtime
// in Next.js 15 without ceremony.

// 3:2 per Farcaster Mini App embed spec (was 1.91:1 under Frames v1).
const W = 1200;
const H = 800;

const COLORS = {
  pitchBg: "#1a2e1a",
  pitchFill: "#2e5c2a",
  pitchLine: "#ffffff",
  ghost: "#ffffff",
  slate: "#9ba39a",
  gold: "#e5b43a",
  successMoss: "#44b48b",
  actionOrange: "#ec652b",
  deepPlum: "#111a4a",
};

function pageHeaders(): HeadersInit {
  return {
    "cache-control": "public, max-age=30, s-maxage=30",
  };
}

function jsxSprite(persona: PersonaSlug, scale = 14) {
  const rects = getSpriteRects(persona);
  const w = 8 * scale;
  const h = 13 * scale;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 8 13"
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
    </svg>
  );
}

function fallbackImage(title: string, subtitle: string) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.pitchBg,
        color: COLORS.ghost,
        padding: 64,
        fontFamily: "system-ui",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 18,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: COLORS.actionOrange,
          fontWeight: 600,
          marginBottom: 24,
        }}
      >
        Regista 11
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: "-1.5px",
          lineHeight: 1.05,
          maxWidth: 900,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 22, color: COLORS.slate, marginTop: 24 }}>{subtitle}</div>
    </div>
  );
}

function marketImage(market: MarketRow) {
  const persona = market.agentPersona ? getPersona(market.agentPersona) : null;
  const personaName = persona?.name ?? "Regista 11 agent";
  const question = market.humanQuestion ?? "Decoding the market — share it back after the agent reveals.";

  const total = market.overStakeTotal + market.underStakeTotal;
  const overPct = total === 0n ? 50 : Number((market.overStakeTotal * 100n) / total);
  const underPct = 100 - overPct;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.pitchBg,
        padding: 56,
        fontFamily: "system-ui",
        color: COLORS.ghost,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {market.agentPersona ? jsxSprite(market.agentPersona, 12) : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 14,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: COLORS.gold,
                fontWeight: 600,
              }}
            >
              Created by
            </span>
            <span style={{ fontSize: 32, fontWeight: 600 }}>{personaName}</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            border: `1px solid ${COLORS.actionOrange}`,
            color: COLORS.actionOrange,
            fontSize: 14,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.actionOrange,
              display: "block",
            }}
          />
          Live · X Layer
        </div>
      </div>

      {/* QUESTION */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flex: 1,
          marginTop: 40,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            maxWidth: 980,
          }}
        >
          {question}
        </div>
      </div>

      {/* PROBABILITY BAR */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: COLORS.slate,
          }}
        >
          <span>
            OVER <span style={{ color: COLORS.ghost, fontWeight: 700 }}>{overPct}¢</span>
          </span>
          <span>
            <span style={{ color: COLORS.ghost, fontWeight: 700 }}>{underPct}¢</span> UNDER
          </span>
        </div>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 14,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${overPct}%`,
              backgroundColor: COLORS.successMoss,
              display: "block",
            }}
          />
          <div
            style={{
              width: `${underPct}%`,
              backgroundColor: COLORS.actionOrange,
              display: "block",
            }}
          />
        </div>
      </div>

      {/* FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 32,
          fontSize: 16,
          color: COLORS.slate,
          letterSpacing: 1,
        }}
      >
        <span>Stake gaslessly with USDT0 · EIP-3009 signature</span>
        <span>regista11.xyz</span>
      </div>
    </div>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ market: string }> },
): Promise<Response> {
  const { market: rawMarket } = await params;

  if (!WEB_DEPLOYMENT.factory) {
    return new ImageResponse(
      fallbackImage("Mainnet deployment in progress", "Frame goes live the moment the factory broadcasts."),
      { width: W, height: H, headers: pageHeaders() },
    );
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(rawMarket)) {
    return new ImageResponse(
      fallbackImage("Invalid market address", "Share a regista11.xyz/frame/0x… link."),
      { width: W, height: H, headers: pageHeaders() },
    );
  }

  let market: MarketRow | null = null;
  try {
    market = await getMarketRow(rawMarket as `0x${string}`);
  } catch {
    market = null;
  }

  if (!market) {
    return new ImageResponse(
      fallbackImage("Market not found", "It may not be deployed yet or the address is wrong."),
      { width: W, height: H, headers: pageHeaders() },
    );
  }

  return new ImageResponse(marketImage(market), {
    width: W,
    height: H,
    headers: pageHeaders(),
  });
}
