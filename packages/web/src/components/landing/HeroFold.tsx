import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { EyebrowChip } from "@/components/layout/EyebrowChip";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";

import { LiveMatchOverlay } from "./pitch/LiveMatchOverlay";
import { TxHashStrip } from "./pitch/TxHashStrip";
import { TacticalPitchHero } from "./TacticalPitchHero";
import { HeroBackdrop } from "./effects/HeroBackdrop";

/**
 * P22: full-bleed 100vh dark hero with Ballpit backdrop. TopNavBar
 * overlays this hero from the top (fixed/sticky, transparent above-fold)
 * so the Ballpit fills the entire viewport on first load. Content is
 * vertically centered inside the min-h-screen.
 */
export function HeroFold() {
  return (
    <section
      data-hero-fold
      className="relative flex min-h-screen items-center overflow-hidden text-[var(--color-ghost-white)]"
      style={{ background: "linear-gradient(180deg, #0a0d1f 0%, #111a4a 100%)" }}
    >
      {/* z-0 — Ballpit / static gradient backdrop fills the whole viewport */}
      <HeroBackdrop />

      {/* z-5 — radial scrim. Soft dark vignette anchored top-left keeps the
          headline + body copy readable even if a ball drifts behind them. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 25% 38%, rgba(10,13,31,0.72) 0%, rgba(10,13,31,0.42) 45%, transparent 75%)",
        }}
      />

      {/* z-10 — hero content vertically centered, top-padded to clear the nav */}
      <Container>
        <div
          className="relative z-10 grid w-full items-center gap-10 pt-24 pb-12 md:grid-cols-12 md:gap-12 md:pt-28 md:pb-20"
          data-hero-content
        >
          <div className="md:col-span-7">
            <EyebrowChip
              tone="live"
              className="mb-6 border-[var(--color-action-orange)] bg-transparent text-[var(--color-action-orange)]"
            >
              Live now · UEFA Conference League Final
            </EyebrowChip>
            <DisplayHeadline
              variant="display"
              className="!text-[var(--color-ghost-white)] [text-shadow:0_2px_18px_rgba(10,13,31,0.85)]"
            >
              Live football prop markets, made by AI agents.
            </DisplayHeadline>
            <p className="mt-5 max-w-xl text-[18px] leading-[1.4] text-[var(--color-ghost-white)]/90 [text-shadow:0_1px_12px_rgba(10,13,31,0.75)]">
              Eleven autonomous agents create binary markets in real time during
              live matches. Every commit, reveal, and settlement is on X Layer
              mainnet — no testnet, no mocks.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/markets"
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--color-action-orange)] px-5 py-3 text-[14px] font-medium text-white hover:opacity-90"
              >
                View Live Markets <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-1 text-[14px] text-[var(--color-ghost-white)]/85 underline-offset-4 hover:text-[var(--color-ghost-white)] hover:underline"
              >
                Read the Whitepaper <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="md:col-span-5">
            <div className="flex flex-col">
              <LiveMatchOverlay match={null} />
              <TacticalPitchHero />
              <TxHashStrip />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
