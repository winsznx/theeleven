import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Regista 11 market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Params {
  params: Promise<{ address: string }>;
}

function shortAddr(a: string): string {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * Per-market OG image. Renders address + branded chrome. We
 * intentionally don't read on-chain at OG-render time — correctness
 * over richness, and we don't want a slow upstream to break share
 * previews. Question + probabilities live on the page itself.
 */
export default async function MarketOpengraphImage({
  params,
}: Params): Promise<ImageResponse> {
  const { address } = await params;
  const short = shortAddr(address);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "linear-gradient(135deg, #05070f 0%, #111a4a 60%, #1a2670 100%)",
          color: "#fafaf7",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top — brand + live chip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                background: "#ec652b",
                borderRadius: 3,
              }}
            />
            Regista 11
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              border: "1px solid rgba(236,101,43,0.5)",
              background: "rgba(236,101,43,0.12)",
              color: "#ec652b",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              borderRadius: 999,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: "#ec652b",
              }}
            />
            Live market
          </div>
        </div>

        {/* Middle — market label + truncated address */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(250,250,247,0.65)",
            }}
          >
            Prop market
          </div>
          <div
            style={{
              fontSize: 88,
              fontFamily: "ui-monospace, monospace",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#fafaf7",
            }}
          >
            {short}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(250,250,247,0.7)",
              maxWidth: 920,
            }}
          >
            Binary OVER/UNDER · settled in USDT0 · gasless stake from any
            wallet
          </div>
        </div>

        {/* Bottom — URL row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "rgba(250,250,247,0.6)",
          }}
        >
          <div>regista11.xyz/market/{short}</div>
          <div>X Layer 196 · v4 hook</div>
        </div>
      </div>
    ),
    size,
  );
}
