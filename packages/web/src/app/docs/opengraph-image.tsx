import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Regista 11 Docs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Single OG image covering the whole /docs section. */
export default function DocsOpengraphImage(): ImageResponse {
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
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#ec652b",
            }}
          >
            Documentation
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#fafaf7",
            }}
          >
            How Regista 11 works
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(250,250,247,0.7)",
              maxWidth: 900,
            }}
          >
            The eleven, the hook, commit–reveal, gasless USDT0 settlement.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "rgba(250,250,247,0.6)",
          }}
        >
          <div>regista11.xyz/docs</div>
          <div>X Layer mainnet · v4 hook</div>
        </div>
      </div>
    ),
    size,
  );
}
