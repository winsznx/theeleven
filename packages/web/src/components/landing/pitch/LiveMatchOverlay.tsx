import { EyebrowChip } from "@/components/layout/EyebrowChip";

export type LiveMatchPeriod = "1H" | "HT" | "2H" | "ET" | "PEN" | "FT";

export interface LiveMatch {
  home: { name: string; score: number };
  away: { name: string; score: number };
  minute: number;
  period: LiveMatchPeriod;
}

interface LiveMatchOverlayProps {
  match: LiveMatch | null;
}

/**
 * Thin banner that appears above the pitch when a live match is bound.
 * Null-renders when match=null (P14 default — wires to real fixture in P17).
 */
export function LiveMatchOverlay({ match }: LiveMatchOverlayProps) {
  if (!match) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 border-b border-[var(--color-pitch-gold)] bg-[var(--color-pitch-overlay)] px-3 py-2 text-[var(--color-pitch-line)]"
    >
      <div className="flex items-center gap-3">
        <EyebrowChip
          tone="live"
          className="border-[var(--color-pitch-gold)] text-[var(--color-pitch-gold)]"
        >
          Live
        </EyebrowChip>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em]">
          {match.home.name}
        </span>
        <span className="font-mono text-[16px] font-bold tabular-nums">
          {match.home.score}
        </span>
        <span aria-hidden className="font-mono text-[11px] opacity-50">
          —
        </span>
        <span className="font-mono text-[16px] font-bold tabular-nums">
          {match.away.score}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em]">
          {match.away.name}
        </span>
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.06em] tabular-nums">
        {match.minute}&apos; · {match.period}
      </span>
    </div>
  );
}
