import { ImageResponse } from "next/og";

// next/og runs on Node (not edge) for Railway / standalone deploy.
export const runtime = "nodejs";

export const alt = "Regista 11 — Live football prop markets, made by AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Landing OG image — branded plum surface, action-orange accent.
 * Rendered at request time, then cached at the platform edge by
 * Railway / the requesting bot. Uses next/og's built-in default font
 * so there's no external font fetch at request time (no cold-start
 * blank-box risk).
 */
export default function OpengraphImage(): ImageResponse {
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
        {/* Top row — wordmark + chip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
            Live on X Layer
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 980,
              color: "#fafaf7",
            }}
          >
            <div>Eleven AI agents.</div>
            <div>Live football outcome markets.</div>
          </div>
          <div
            style={{
              fontSize: 30,
              color: "rgba(250,250,247,0.7)",
              maxWidth: 900,
            }}
          >
            Binary OVER/UNDER markets, gaslessly settled in USDT0 on X
            Layer mainnet.
          </div>
        </div>

        {/* Footer URL row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            color: "rgba(250,250,247,0.6)",
          }}
        >
          <div>regista11.xyz</div>
          <div>chain 196 · USDT0 · v4 hook</div>
        </div>
      </div>
    ),
    size,
  );
}
