import { cn } from "@/lib/cn";
import type { MarketOutcome, MarketState } from "@/types/market";

interface MarketStateBadgeProps {
  state: MarketState;
  outcome?: MarketOutcome;
  className?: string;
}

interface BadgeStyle {
  label: string;
  dotClass: string;
  textClass: string;
}

function describe(state: MarketState, outcome: MarketOutcome | undefined): BadgeStyle {
  switch (state) {
    case "STAKING_OPEN":
      return {
        label: "Staking open",
        dotClass: "bg-[var(--color-success-moss)]",
        textClass: "text-[var(--color-success-moss)]",
      };
    case "AWAITING_REVEAL":
      return {
        label: "Awaiting reveal",
        dotClass: "bg-[var(--color-action-orange)]",
        textClass: "text-[var(--color-action-orange)]",
      };
    case "RESOLVED":
      return {
        label:
          outcome === 1
            ? "Resolved · OVER won"
            : outcome === 2
              ? "Resolved · UNDER won"
              : "Resolved",
        dotClass: "bg-[var(--color-deep-plum)]",
        textClass: "text-[var(--color-deep-plum)]",
      };
    case "REFUNDED":
      return {
        label: "Refunded",
        dotClass: "bg-[var(--color-slate-text)]",
        textClass: "text-[var(--color-slate-text)]",
      };
  }
}

export function MarketStateBadge({ state, outcome, className }: MarketStateBadgeProps) {
  const style = describe(state, outcome);
  return (
    <span
      data-market-state={state}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        style.textClass,
        className,
      )}
    >
      <span aria-hidden className={cn("inline-block h-1.5 w-1.5 rounded-full", style.dotClass)} />
      {style.label}
    </span>
  );
}
