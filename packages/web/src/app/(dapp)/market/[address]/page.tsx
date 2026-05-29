"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import type { Address } from "viem";

import { Container } from "@/components/layout/Container";
import { MarketDetailView } from "@/components/dapp/MarketDetailView";
import { useMarket } from "@/hooks/useMarket";
import { useFactoryDeployment } from "@/hooks/useFactoryDeployment";
import { DEPLOY_RUNBOOK_URL } from "@/lib/deployment";

interface MarketDetailPageProps {
  params: Promise<{ address: string }>;
}

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export default function MarketDetailPage({ params }: MarketDetailPageProps) {
  const { address: raw } = use(params);
  const deployment = useFactoryDeployment();
  const address: Address | null = isAddress(raw) ? raw : null;
  const { market, loading, error } = useMarket(address);

  return (
    <Container>
      <section className="flex flex-col gap-6 py-10 md:py-14">
        <Link
          href="/markets"
          className="inline-flex items-center gap-1 self-start text-[13px] text-[var(--color-slate-text)] hover:text-[var(--color-deep-plum)]"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden /> All markets
        </Link>

        {!address ? (
          <div className="rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-10">
            <p className="text-[14px] text-[var(--color-charcoal-text)]">
              Market not found. The address {raw} isn&apos;t a valid 0x-prefixed
              40-hex-character string.
            </p>
          </div>
        ) : !deployment.factory ? (
          <div className="rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-10">
            <p className="text-[14px] text-[var(--color-charcoal-text)]">
              Mainnet deployment in progress. Market detail loads after the
              factory broadcasts.
            </p>
            <a
              href={DEPLOY_RUNBOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-[13px] font-medium text-[var(--color-deep-plum)] hover:underline"
            >
              View the deploy runbook on GitHub →
            </a>
          </div>
        ) : loading && market === null ? (
          <p className="text-[13px] text-[var(--color-slate-text)]">
            Loading market state from X Layer…
          </p>
        ) : error ? (
          <div className="rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-10">
            <p className="text-[14px] text-[var(--color-charcoal-text)]">
              Failed to load market: {error}
            </p>
          </div>
        ) : market ? (
          <MarketDetailView market={market} />
        ) : (
          <div className="rounded-[12px] border-2 border-dashed border-[var(--color-steel-gray)] bg-white/60 px-6 py-10">
            <p className="text-[14px] text-[var(--color-charcoal-text)]">
              Market not found at {address}.
            </p>
          </div>
        )}
      </section>
    </Container>
  );
}
