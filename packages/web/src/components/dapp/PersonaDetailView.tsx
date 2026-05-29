"use client";

import Link from "next/link";

import { MarketCard, formatUSDT0 } from "@/components/landing/MarketCard";
import { PlayerSprite } from "@/components/landing/pitch/PlayerSprite";
import { useMarkets } from "@/hooks/useMarkets";
import { useFactoryDeployment } from "@/hooks/useFactoryDeployment";
import { getPersona } from "@/lib/personas";
import { DEPLOY_RUNBOOK_URL } from "@/lib/deployment";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";
import type { MarketRow } from "@/types/market";

import { PersonaWalletBadge } from "./PersonaWalletBadge";

interface PersonaDetailViewProps {
  slug: PersonaSlug;
}

function rowToCardProps(row: MarketRow) {
  const personaMeta = row.agentPersona ? getPersona(row.agentPersona) : null;
  const total = row.overStakeTotal + row.underStakeTotal;
  const overBips = Number(total === 0n ? 5000n : (row.overStakeTotal * 10_000n) / total);
  return {
    question: row.humanQuestion ?? "Decoded after reveal",
    personaSlug: row.agentPersona ?? ("il-regista" as PersonaSlug),
    personaName: personaMeta?.name ?? "Unknown agent",
    overOddsBips: overBips,
    underOddsBips: 10_000 - overBips,
    volumeUSDT0: total,
    resolveDeadlineUnix: Number(row.resolveDeadline),
    marketAddress: row.address,
    state: row.state,
    outcome: row.outcome,
  };
}

export function PersonaDetailView({ slug }: PersonaDetailViewProps) {
  const persona = getPersona(slug);
  const deployment = useFactoryDeployment();
  const wallet = deployment.agentsByPersona?.[slug] ?? null;
  const { markets } = useMarkets({ status: "all", persona: slug });

  if (!persona) {
    return (
      <div
        data-not-found
        className="rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-10"
      >
        <p className="text-[14px] text-[var(--color-charcoal-text)]">
          Persona not found.
        </p>
        <Link
          href="/agents"
          className="mt-2 inline-block text-[13px] text-[var(--color-deep-plum)] hover:underline"
        >
          Back to The Eleven →
        </Link>
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="w-16 flex-shrink-0 sm:w-24" data-sprite-size="96">
          <PlayerSprite persona={slug} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-slate-text)] tabular-nums">
            #{persona.number.toString().padStart(2, "0")}
          </span>
          <h1 className="text-[32px] font-semibold leading-[1.1] text-[var(--color-deep-plum)]">
            {persona.name}
          </h1>
          <p className="text-[16px] text-[var(--color-charcoal-text)]">{persona.role}</p>
          <p className="text-[13px] text-[var(--color-slate-text)]">
            {persona.tacticalPosition}
          </p>
        </div>
      </header>

      {wallet ? (
        <section className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
            On-chain wallet
          </span>
          <PersonaWalletBadge address={wallet} />
        </section>
      ) : (
        <section className="text-[12px] text-[var(--color-slate-text)]">
          Wallet address attaches after mainnet deploy.
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.04em] text-[var(--color-deep-plum)]">
          Market templates
        </h2>
        <ul className="space-y-2 text-[14px] text-[var(--color-charcoal-text)]">
          {persona.templates.map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-[var(--color-deep-plum)]"
              />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.04em] text-[var(--color-deep-plum)]">
          Recent markets
        </h2>
        {!deployment.factory ? (
          <div
            data-empty-state
            className="rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-8"
          >
            <p className="text-[13px] text-[var(--color-charcoal-text)]">
              Mainnet deployment in progress.{" "}
              <a
                href={DEPLOY_RUNBOOK_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-deep-plum)] underline-offset-2 hover:underline"
              >
                Deploy runbook →
              </a>
            </p>
          </div>
        ) : markets === null ? (
          <p className="text-[13px] text-[var(--color-slate-text)]">Loading…</p>
        ) : markets.length === 0 ? (
          <div
            data-empty-state
            className="rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-8"
          >
            <p className="text-[13px] text-[var(--color-charcoal-text)]">
              No open markets right now. {persona.name} fires when a live match
              enters {persona.role.toLowerCase()} territory.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {markets.map((row) => (
              <MarketCard key={row.address} {...rowToCardProps(row)} />
            ))}
            <p className="col-span-full text-[11px] text-[var(--color-slate-text)] tabular-nums">
              Total open volume:{" "}
              {formatUSDT0(
                markets.reduce(
                  (acc, r) => acc + r.overStakeTotal + r.underStakeTotal,
                  0n,
                ),
              )}
            </p>
          </div>
        )}
      </section>
    </article>
  );
}
