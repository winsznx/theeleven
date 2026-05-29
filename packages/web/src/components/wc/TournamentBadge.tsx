import { Container } from "@/components/layout/Container";

import { BallGlyph } from "./BallGlyph";

interface CountryChip {
  code: string;
  label: string;
  flag: string; // 2-letter lowercase ISO for flagcdn.com
}

const COUNTRIES: readonly CountryChip[] = [
  { code: "USA", label: "USA", flag: "us" },
  { code: "CAN", label: "CAN", flag: "ca" },
  { code: "MEX", label: "MEX", flag: "mx" },
];

/**
 * Thin horizontal strip ABOVE HeroFold's tactical pitch. Single-line
 * tournament context — generic ball glyph, the date range, and three
 * host-country chips loaded from flagcdn.com (public-domain flag PNGs).
 *
 * IP-safe phrasing: "The 2026 tournament" (NOT "World Cup", NOT "FIFA").
 * Dates and country codes are facts.
 */
export function TournamentBadge() {
  return (
    <div
      data-tournament-badge
      className="border-b border-[var(--color-steel-gray)] bg-[var(--color-fog-gray)]"
    >
      <Container>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-slate-text)]">
          <span className="inline-flex items-center text-[var(--color-deep-plum)]">
            <BallGlyph size={14} />
          </span>
          <span className="text-[var(--color-deep-plum)]">The 2026 tournament</span>
          <span aria-hidden className="opacity-60">·</span>
          <span className="font-mono tabular-nums">Jun 11 – Jul 9</span>
          <span aria-hidden className="opacity-60">·</span>
          {COUNTRIES.map((c, i) => (
            <span
              key={c.code}
              data-country-chip={c.code}
              className="inline-flex items-center gap-1.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://flagcdn.com/16x12/${c.flag}.png`}
                srcSet={`https://flagcdn.com/32x24/${c.flag}.png 2x`}
                width={16}
                height={12}
                alt={`${c.label} flag`}
                loading="lazy"
                className="inline-block"
              />
              <span className="font-mono">{c.label}</span>
              {i < COUNTRIES.length - 1 ? (
                <span aria-hidden className="opacity-60">·</span>
              ) : null}
            </span>
          ))}
        </div>
      </Container>
    </div>
  );
}
