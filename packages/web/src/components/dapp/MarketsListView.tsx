"use client";

import Link from "next/link";

import { MarketCard } from "@/components/landing/MarketCard";
import { useMarkets } from "@/hooks/useMarkets";
import { useFactoryDeployment } from "@/hooks/useFactoryDeployment";
import { getPersona } from "@/lib/personas";
import { DEPLOY_RUNBOOK_URL } from "@/lib/deployment";
import type { MarketRow, MarketState } from "@/types/market";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

interface MarketsListViewProps {
  status: MarketState | "all";
  persona: PersonaSlug | "all";
  /** Called when the user clears all filters from the empty state. */
  onClearFilters: () => void;
}

function rowToCardProps(row: MarketRow) {
  // NOTE: marketAddress intentionally omitted here — the grid wraps each
  // card in its own <Link>, so MarketCard must NOT self-wrap (avoids nested
  // <a> hydration error).
  const personaMeta = row.agentPersona ? getPersona(row.agentPersona) : null;
  const overBips = Number(
    row.overStakeTotal + row.underStakeTotal === 0n
      ? 5000n
      : (row.overStakeTotal * 10_000n) /
          (row.overStakeTotal + row.underStakeTotal),
  );
  return {
    question: row.humanQuestion ?? "Decoded after reveal",
    personaSlug: (row.agentPersona ?? "il-regista") as PersonaSlug,
    personaName: personaMeta?.name ?? "Unknown agent",
    overOddsBips: overBips,
    underOddsBips: 10_000 - overBips,
    volumeUSDT0: row.overStakeTotal + row.underStakeTotal,
    resolveDeadlineUnix: Number(row.resolveDeadline),
    state: row.state,
    outcome: row.outcome,
  };
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div
      data-empty-state
      className="flex flex-col items-start gap-3 rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-10"
    >
      <span className="text-[14px] font-medium text-[var(--color-charcoal-text)]">
        {title}
      </span>
      <span className="max-w-prose text-[13px] text-[var(--color-slate-text)]">
        {body}
      </span>
      {action ? (
        action.href ? (
          <a
            href={action.href}
            target={action.href.startsWith("http") ? "_blank" : undefined}
            rel={action.href.startsWith("http") ? "noreferrer" : undefined}
            className="text-[13px] font-medium text-[var(--color-deep-plum)] underline-offset-2 hover:underline"
          >
            {action.label} →
          </a>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="text-[13px] font-medium text-[var(--color-deep-plum)] underline-offset-2 hover:underline"
          >
            {action.label} →
          </button>
        )
      ) : null}
    </div>
  );
}

export function MarketsListView({ status, persona, onClearFilters }: MarketsListViewProps) {
  const deployment = useFactoryDeployment();
  const { markets, loading, error } = useMarkets({ status, persona });

  if (!deployment.factory) {
    return (
      <EmptyState
        title="Mainnet deployment in progress."
        body="PropMarketHookFactory is not yet deployed on X Layer. The agent runtime, contracts, and web are all locked — final mainnet broadcast is the last step before submission."
        action={{ label: "View the deploy runbook on GitHub", href: DEPLOY_RUNBOOK_URL }}
      />
    );
  }

  if (error) {
    // Truncate raw RPC error bodies — the X Layer RPC echoes back the
    // full request payload in the message, which floods the UI. Keep
    // the first line / short hint only.
    const friendly = String(error).split("\n")[0]?.slice(0, 140) ?? "RPC read failed";
    return (
      <EmptyState
        title="Unable to load markets."
        body={`${friendly}. Refresh to retry — X Layer RPC may be rate-limited briefly.`}
      />
    );
  }

  if (loading && markets === null) {
    return (
      <div
        data-loading
        className="rounded-[12px] border border-[var(--color-steel-gray)] bg-white/60 px-6 py-10 text-[13px] text-[var(--color-slate-text)]"
      >
        Loading markets from X Layer…
      </div>
    );
  }

  if (!markets || markets.length === 0) {
    const filtersActive = status !== "all" || persona !== "all";
    if (filtersActive) {
      return (
        <EmptyState
          title="No markets match these filters."
          body="Try widening status or persona, or clear filters to see everything."
          action={{ label: "Clear filters", onClick: onClearFilters }}
        />
      );
    }
    return (
      <EmptyState
        title="No markets currently open."
        body="The Eleven activate when a live match kicks off. Markets appear here within seconds of the first commit."
        action={{ label: "Browse the personas", href: "/agents" }}
      />
    );
  }

  return (
    <div
      data-markets-grid
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {markets.map((row) => (
        <Link
          key={row.address}
          href={`/market/${row.address}`}
          className="block focus:outline-none"
          aria-label={`Open market ${row.address}`}
        >
          <MarketCard {...rowToCardProps(row)} />
        </Link>
      ))}
    </div>
  );
}
