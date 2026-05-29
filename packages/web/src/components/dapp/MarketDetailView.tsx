"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Address } from "viem";

import { HexCard } from "@/components/landing/HexCard";
import { PlayerSprite } from "@/components/landing/pitch/PlayerSprite";
import { getPersona } from "@/lib/personas";
import { formatUSDT0 } from "@/components/landing/MarketCard";
import { MarketStateBadge } from "./MarketStateBadge";
import { StakeWidget } from "./stake/StakeWidget";

import type { MarketRow } from "@/types/market";

interface MarketDetailViewProps {
  market: MarketRow;
}

function oklinkAddress(addr: Address): string {
  return `https://www.oklink.com/x-layer/address/${addr}`;
}

export function MarketDetailView({ market }: MarketDetailViewProps) {
  const personaMeta = market.agentPersona ? getPersona(market.agentPersona) : null;

  const total = market.overStakeTotal + market.underStakeTotal;
  const overBips = total === 0n ? 5000 : Number((market.overStakeTotal * 10_000n) / total);
  const underBips = 10_000 - overBips;
  const overCents = Math.round(overBips / 100);
  const underCents = Math.round(underBips / 100);

  const isStakingOpen = market.state === "STAKING_OPEN";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
      <article className="flex flex-col gap-6">
        {personaMeta ? (
          <Link
            href={`/agents/${personaMeta.persona}`}
            data-persona-attribution
            className="inline-flex items-center gap-3 text-[var(--color-deep-plum)] hover:opacity-80"
          >
            <span className="w-8 flex-shrink-0">
              <PlayerSprite persona={personaMeta.persona} />
            </span>
            <span className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
                Created by
              </span>
              <span className="text-[16px] font-medium">
                {personaMeta.name}
              </span>
            </span>
          </Link>
        ) : (
          <span className="text-[12px] text-[var(--color-slate-text)]">
            Created by unknown agent
          </span>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <MarketStateBadge state={market.state} outcome={market.outcome} />
          {market.state === "RESOLVED" && market.outcome === 1 && (
            <span className="text-[12px] text-[var(--color-success-moss)]">
              OVER side won the pool.
            </span>
          )}
          {market.state === "RESOLVED" && market.outcome === 2 && (
            <span className="text-[12px] text-[var(--color-success-moss)]">
              UNDER side won the pool.
            </span>
          )}
          {market.state === "REFUNDED" && (
            <span className="text-[12px] text-[var(--color-slate-text)]">
              Refunded — winning pool was empty at resolution. Stakes are claimable.
            </span>
          )}
        </div>

        <h1 className="text-[28px] font-semibold leading-[1.2] text-[var(--color-deep-plum)]">
          {market.humanQuestion ?? "Decoding…"}
        </h1>

        <HexCard innerClassName="grid grid-cols-2 gap-3 p-5">
          <div className="flex flex-col items-center gap-1 rounded-[8px] border border-[var(--color-steel-gray)] py-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
              Over
            </span>
            <span className="font-numerals text-[40px] leading-none text-[var(--color-deep-plum)] tabular-nums">
              {overCents}¢
            </span>
            <span className="font-numerals text-[12px] text-[var(--color-slate-text)] tabular-nums">
              {overCents}%
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-[8px] border border-[var(--color-steel-gray)] py-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
              Under
            </span>
            <span className="font-numerals text-[40px] leading-none text-[var(--color-deep-plum)] tabular-nums">
              {underCents}¢
            </span>
            <span className="font-numerals text-[12px] text-[var(--color-slate-text)] tabular-nums">
              {underCents}%
            </span>
          </div>
        </HexCard>

        <dl className="grid grid-cols-1 gap-4 text-[13px] text-[var(--color-charcoal-text)] sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
              Volume
            </dt>
            <dd className="font-numerals tabular-nums">{formatUSDT0(total)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
              Resolve deadline
            </dt>
            <dd className="font-numerals tabular-nums">
              {new Date(Number(market.resolveDeadline) * 1000).toUTCString()}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
              Market address
            </dt>
            <dd>
              <a
                href={oklinkAddress(market.address)}
                target="_blank"
                rel="noreferrer"
                data-oklink-market
                className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--color-deep-plum)] hover:underline"
              >
                {market.address}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </dd>
          </div>
        </dl>

        <section
          aria-label="Resolution rules"
          className="rounded-[12px] border border-[var(--color-steel-gray)] bg-[var(--color-fog-gray)] p-5"
        >
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
            Resolution rules
          </h2>
          {market.humanQuestion ? (
            <p className="text-[14px] text-[var(--color-charcoal-text)]">
              {market.humanQuestion} — settled by the authorized resolver using
              live match data from API-Football.
            </p>
          ) : (
            <p className="text-[13px] text-[var(--color-slate-text)]">
              Decoded after reveal. Until then, only the commit hash is public:{" "}
              <span className="break-all font-mono text-[12px]">{market.commitHash}</span>
            </p>
          )}
        </section>
      </article>

      <aside>
        {isStakingOpen ? (
          <StakeWidget
            marketAddress={market.address}
            overOddsBips={overBips}
            underOddsBips={underBips}
            question={market.humanQuestion ?? undefined}
          />
        ) : (
          <HexCard innerClassName="flex flex-col gap-2 p-5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
              Stake
            </span>
            <p className="text-[13px] text-[var(--color-charcoal-text)]">
              Staking closed. This market is{" "}
              <span className="font-medium text-[var(--color-deep-plum)]">
                {market.state.toLowerCase().replace("_", " ")}
              </span>
              .
            </p>
          </HexCard>
        )}
      </aside>
    </div>
  );
}
