"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";
import { MarketsListView } from "@/components/dapp/MarketsListView";
import { ELEVEN_PERSONAS } from "@/lib/personas";
import type { MarketState } from "@/types/market";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

const STATUS_OPTIONS: Array<{ value: MarketState | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "STAKING_OPEN", label: "Open" },
  { value: "AWAITING_REVEAL", label: "Awaiting reveal" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REFUNDED", label: "Refunded" },
];

function MarketsBody() {
  const router = useRouter();
  const params = useSearchParams();

  const status = (params.get("status") ?? "all") as MarketState | "all";
  const persona = (params.get("persona") ?? "all") as PersonaSlug | "all";

  const setParam = useCallback(
    (key: "status" | "persona", value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value === "all") next.delete(key);
      else next.set(key, value);
      router.replace(`/markets${next.toString() ? `?${next.toString()}` : ""}`);
    },
    [params, router],
  );

  const clear = useCallback(() => router.replace("/markets"), [router]);

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex flex-wrap items-center gap-1 rounded-[8px] border border-[var(--color-steel-gray)] bg-[var(--color-fog-gray)] p-1"
        >
          {STATUS_OPTIONS.map((opt) => {
            const selected = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={selected}
                data-status-filter={opt.value}
                onClick={() => setParam("status", opt.value)}
                className={
                  "rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors " +
                  (selected
                    ? "bg-[var(--color-ghost-white)] text-[var(--color-deep-plum)] shadow-[var(--shadow-card)]"
                    : "text-[var(--color-slate-text)] hover:text-[var(--color-deep-plum)]")
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-[12px]">
          <span className="text-[var(--color-slate-text)] uppercase tracking-[0.12em]">
            Persona
          </span>
          <select
            data-persona-filter
            value={persona}
            onChange={(e) => setParam("persona", e.target.value)}
            className="rounded-[8px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] px-3 py-1.5 text-[13px] text-[var(--color-charcoal-text)]"
          >
            <option value="all">All Eleven</option>
            {ELEVEN_PERSONAS.map((p) => (
              <option key={p.persona} value={p.persona}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <MarketsListView status={status} persona={persona} onClearFilters={clear} />
    </>
  );
}

export default function MarketsPage() {
  return (
    <Container>
      <section className="flex flex-col gap-6 py-10 md:py-14">
        <header className="flex flex-col gap-3">
          <DisplayHeadline variant="display-md" as="h1">
            Live markets
          </DisplayHeadline>
          <p className="max-w-prose text-[16px] text-[var(--color-slate-text)]">
            Open markets across active matches. Real-time on X Layer mainnet.
          </p>
        </header>

        <Suspense
          fallback={
            <p className="text-[13px] text-[var(--color-slate-text)]">
              Loading filters…
            </p>
          }
        >
          <MarketsBody />
        </Suspense>
      </section>
    </Container>
  );
}
