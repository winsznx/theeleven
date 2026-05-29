import { Section } from "@/components/layout/Section";

import { USDT0_DECIMALS } from "@/config/tokens";

export interface StatBarStats {
  totalMarkets: number | null;
  activeAgents: number | null;
  totalVolume: { amount: bigint | null; symbol: "USDT0" };
  liveMatch: { name: string; minute: number } | null;
}

interface StatBarProps {
  stats: StatBarStats;
}

const NULL_GLYPH = "—";

function formatUsdt(amount: bigint): string {
  const whole = amount / 10n ** BigInt(USDT0_DECIMALS);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number(whole),
  );
}

interface StatCellProps {
  label: string;
  value: string;
  subtitle?: string;
  /** Wrap value in a stronger element when truthy; used to assert "real" data. */
  hasData: boolean;
}

function StatCell({ label, value, subtitle, hasData }: StatCellProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-6 md:px-6">
      <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
        {label}
      </span>
      <span
        className={
          "font-numerals text-[32px] leading-none " +
          (hasData
            ? "text-[var(--color-deep-plum)]"
            : "text-[var(--color-steel-gray)]")
        }
      >
        {value}
      </span>
      {subtitle && (
        <span className="text-[12px] text-[var(--color-slate-text)]">{subtitle}</span>
      )}
    </div>
  );
}

/**
 * S2 — four live protocol stats above the fold rhythm. Null-tolerant: any
 * stat without data renders an em-dash + "Awaiting data". No spinners (we're
 * not loading; the value just doesn't exist yet — honesty over busy chrome).
 *
 * Subgraph wires real values in P17; until then the parent passes nulls.
 */
export function StatBar({ stats }: StatBarProps) {
  const cells: StatCellProps[] = [
    {
      label: "Total Markets",
      value: stats.totalMarkets !== null ? stats.totalMarkets.toString() : NULL_GLYPH,
      subtitle: stats.totalMarkets === null ? "Awaiting data" : undefined,
      hasData: stats.totalMarkets !== null,
    },
    {
      label: "Active Agents",
      value: stats.activeAgents !== null ? `${stats.activeAgents}/11` : NULL_GLYPH,
      subtitle: stats.activeAgents === null ? "Awaiting data" : undefined,
      hasData: stats.activeAgents !== null,
    },
    {
      label: `Volume · ${stats.totalVolume.symbol}`,
      value:
        stats.totalVolume.amount !== null
          ? formatUsdt(stats.totalVolume.amount)
          : NULL_GLYPH,
      subtitle: stats.totalVolume.amount === null ? "Awaiting data" : undefined,
      hasData: stats.totalVolume.amount !== null,
    },
    {
      label: "Live Match",
      value: stats.liveMatch ? stats.liveMatch.name : NULL_GLYPH,
      subtitle: stats.liveMatch
        ? `${stats.liveMatch.minute}' in progress`
        : "Awaiting data",
      hasData: stats.liveMatch !== null,
    },
  ];

  return (
    <Section id="s2" aria-label="Live protocol stats">
      <div className="grid grid-cols-1 divide-y divide-[var(--color-steel-gray)] rounded-[12px] border border-[var(--color-steel-gray)] bg-white/60 md:grid-cols-4 md:divide-x md:divide-y-0">
        {cells.map((cell) => (
          <StatCell key={cell.label} {...cell} />
        ))}
      </div>
    </Section>
  );
}
