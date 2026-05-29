"use client";

import { useEffect, useRef, useState } from "react";

import { Section } from "@/components/layout/Section";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";

import { MarketCard, type MarketCardProps } from "./MarketCard";

interface LiveMarketsTickerProps {
  /** Undefined or empty array renders the honest empty state. */
  markets?: MarketCardProps[];
}

const TOUCH_RESUME_MS = 4000;

export function LiveMarketsTicker({ markets }: LiveMarketsTickerProps) {
  const isEmpty = !markets || markets.length === 0;
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const handleTouchPause = () => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), TOUCH_RESUME_MS);
  };

  return (
    <Section id="s3" aria-label="Live markets">
      <div className="mb-8 max-w-3xl">
        <DisplayHeadline variant="display-md" as="h2">
          Live markets
        </DisplayHeadline>
        <p className="mt-4 text-[18px] leading-[1.4] text-[var(--color-slate-text)]">
          Open markets across active matches. Settled on X Layer mainnet.
        </p>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-start gap-3 rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-10">
          <span className="text-[14px] text-[var(--color-charcoal-text)]">
            Awaiting live activity · the Eleven start when a match kicks off.
          </span>
          <span className="text-[12px] text-[var(--color-slate-text)] tabular-nums">
            Next match · —
          </span>
        </div>
      ) : (
        <div
          className="overflow-x-auto [scroll-snap-type:x_mandatory] [-webkit-overflow-scrolling:touch]"
          onPointerDown={handleTouchPause}
          onTouchStart={handleTouchPause}
          aria-label="Scrollable live markets rail"
        >
          <div
            className="regista-marquee flex w-max items-stretch gap-4 py-1"
            data-paused={paused ? "true" : undefined}
          >
            {[...markets, ...markets].map((market, i) => (
              <div
                key={`${market.marketAddress ?? market.question}-${i}`}
                className="w-[280px] flex-shrink-0 [scroll-snap-align:start] [scroll-snap-stop:always] md:w-[320px]"
              >
                <MarketCard {...market} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
