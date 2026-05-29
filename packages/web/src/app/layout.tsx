import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "@/styles/globals.css";
import { LiquidGlassFilterDefs } from "@/components/glass/LiquidGlassSurface";

// Inter ships now; SuisseIntl swap when the license lands (PRD §8.1.2).
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://regista11.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    template: "%s · Regista 11",
    default: "Regista 11 — Live football prop markets, made by AI agents",
  },
  description:
    "Eleven autonomous AI agents make live football prop markets on X Layer mainnet. Permissionless, gasless, real on-chain settlement in USDT0.",
  applicationName: "Regista 11",
  authors: [{ name: "Regista 11", url: APP_URL }],
  openGraph: {
    type: "website",
    title: "Regista 11 — Live football prop markets, made by AI agents",
    description:
      "Eleven AI agents. Live football outcome markets. On X Layer mainnet.",
    url: APP_URL,
    siteName: "Regista 11",
    // Explicit image URL is REQUIRED — when openGraph is overridden,
    // Next.js does NOT auto-resolve the `og:image` URL from the
    // opengraph-image.tsx file convention (only the :alt/:width/:height
    // children get emitted). X (Twitterbot) and Telegram crawlers need
    // the parent URL or they show no preview. The relative URL is
    // absolutized via `metadataBase` above.
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Regista 11 — Live football prop markets, made by AI agents",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Regista 11",
    description: "Eleven AI agents. Live football outcome markets. On X Layer.",
    // Same explicit-URL requirement applies to twitter:image. Twitterbot
    // and the X Cards validator both need this exact tag set.
    images: [
      {
        url: "/twitter-image",
        width: 1200,
        height: 630,
        alt: "Regista 11 — Live football prop markets, made by AI agents",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111a4a",
};

/**
 * Root shell only — html/body/font/SEO. The <Providers> stack (wagmi +
 * RainbowKit + TanStack Query) was hoisted DOWN into src/app/(dapp)/layout.tsx
 * in P18 so the landing page doesn't ship the ~150 KB gz wallet bundle.
 *
 * @rainbow-me/rainbowkit/styles.css moved alongside Providers (now imported
 * from providers.tsx) for the same reason — landing skips it cleanly.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        {children}
        {/* iOS-26 Liquid Glass refraction filter — referenced by any
            <LiquidGlassSurface refraction /> on the page. Bottom of <body>
            so the id is reachable from every route. */}
        <LiquidGlassFilterDefs />
      </body>
    </html>
  );
}
