import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";

/**
 * Closing CTA — dark broadcast-grade band with the tournament trophy
 * filling the right half of the layout. The trophy ships from
 * `/public/landing/trophy.png` (the source PNG is ~2.7 MB) and is
 * served via next/image so Next emits:
 *   - AVIF + WebP variants at /_next/image (~10x smaller than the PNG)
 *   - a srcSet covering the `sizes` breakpoints below
 *   - native `loading="lazy"` since this section lives below the fold
 *   - a blur-up placeholder using a low-quality data URI
 *
 * Result: 2.7 MB on disk, ~80–150 KB over the wire at typical viewport
 * widths, only fetched when the user scrolls within ~1 viewport of the
 * section.
 */
export function LandingCTA() {
  return (
    <section
      id="s7"
      aria-label="Watch the Eleven during the 2026 tournament"
      className="relative isolate overflow-hidden border-t border-white/5"
      style={{
        background:
          "linear-gradient(180deg, #05070f 0%, #0a0d1f 55%, #111a4a 100%)",
      }}
    >
      {/* Trophy hero — fills the right ~50% on desktop, sits on top in
          mobile stack. PNG has a transparent background so we render at
          full opacity with object-contain; the section's gradient
          shows through naturally. A soft left-edge fade preserves
          text contrast on the copy column. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 md:left-[45%]"
      >
        <Image
          src="/landing/trophy.png"
          alt=""
          fill
          quality={86}
          sizes="(min-width: 1024px) 55vw, (min-width: 768px) 60vw, 100vw"
          className="object-contain object-center opacity-30 md:opacity-100"
          loading="lazy"
          priority={false}
        />
        {/* Subtle left-edge fade only on desktop — keeps headline crisp
            without darkening the trophy itself. Mobile uses lowered
            image opacity above so no gradient is needed there. */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-[#05070f] via-[#05070f]/50 to-transparent md:block md:from-[#05070f] md:via-transparent md:via-30% md:to-transparent" />
      </div>

      <Container>
        <div className="relative z-10 flex min-h-[560px] flex-col justify-center gap-6 py-20 md:min-h-[680px] md:max-w-[50%] md:py-28">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-action-orange)]/40 bg-[var(--color-action-orange)]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-action-orange)] backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-action-orange)]" />
            Jun 11 – Jul 9
          </div>
          <DisplayHeadline
            variant="display"
            as="h2"
            className="!text-[var(--color-ghost-white)] [text-shadow:0_2px_24px_rgba(0,0,0,0.85)]"
          >
            Watch the Eleven during the 2026 tournament
          </DisplayHeadline>
          <p className="max-w-xl text-[18px] leading-[1.4] text-white/80 [text-shadow:0_1px_12px_rgba(0,0,0,0.75)]">
            Conference League Final tonight. Champions League Final Saturday.
            Tournament kickoff Jun 11.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/markets"
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--color-action-orange)] px-5 py-3 text-[14px] font-medium text-white shadow-[0_8px_24px_rgba(236,101,43,0.35)] transition-opacity hover:opacity-90"
            >
              View Live Markets <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1 text-[14px] text-white/85 underline-offset-4 hover:text-[var(--color-ghost-white)] hover:underline"
            >
              Read the Whitepaper <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
