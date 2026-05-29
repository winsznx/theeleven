import type { ReactElement, SVGAttributes } from "react";

import { Section } from "@/components/layout/Section";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";

interface Step {
  number: string;
  title: string;
  description: string;
  Glyph: (props: SVGAttributes<SVGSVGElement>) => ReactElement;
}

function PitchGlyph(props: SVGAttributes<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden {...props}>
      <rect
        x="10"
        y="20"
        width="60"
        height="40"
        stroke="currentColor"
        strokeWidth="3"
        rx="2"
      />
      <line x1="40" y1="20" x2="40" y2="60" stroke="currentColor" strokeWidth="2" />
      <circle cx="40" cy="40" r="6" stroke="currentColor" strokeWidth="2" />
      <circle cx="25" cy="34" r="3" fill="currentColor" />
      <circle cx="42" cy="46" r="3" fill="currentColor" />
      <circle cx="58" cy="36" r="3" fill="currentColor" />
    </svg>
  );
}

function CommitRevealGlyph(props: SVGAttributes<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden {...props}>
      <rect x="14" y="14" width="52" height="22" fill="currentColor" rx="2" />
      <text
        x="40"
        y="30"
        textAnchor="middle"
        fill="var(--color-ghost-white)"
        fontSize="9"
        fontFamily="monospace"
        fontWeight="600"
      >
        0xC0D3
      </text>
      <rect
        x="14"
        y="44"
        width="52"
        height="22"
        stroke="currentColor"
        strokeWidth="3"
        rx="2"
      />
      <text
        x="40"
        y="60"
        textAnchor="middle"
        fill="currentColor"
        fontSize="9"
        fontFamily="monospace"
        fontWeight="600"
      >
        REVEAL
      </text>
    </svg>
  );
}

function StakeGlyph(props: SVGAttributes<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden {...props}>
      <circle cx="20" cy="40" r="12" stroke="currentColor" strokeWidth="3" />
      <text
        x="20"
        y="45"
        textAnchor="middle"
        fill="currentColor"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="700"
      >
        ₮
      </text>
      <line
        x1="36"
        y1="40"
        x2="52"
        y2="40"
        stroke="currentColor"
        strokeWidth="3"
      />
      <polyline
        points="46,34 52,40 46,46"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 64 28 L 64 46 Q 64 54 56 54 L 54 54"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Agents read the match",
    description:
      "Eleven AI personas track every event in a live football match — possession swings, shot patterns, foul intensity — and decide which prop markets to open.",
    Glyph: PitchGlyph,
  },
  {
    number: "02",
    title: "Commit, then reveal",
    description:
      "Each market is committed on-chain as a hash first. Once staking closes, the agent reveals the exact proposition. Cryptographic anti-frontrun, baked into the Uniswap v4 hook.",
    Glyph: CommitRevealGlyph,
  },
  {
    number: "03",
    title: "Users stake gaslessly",
    description:
      "Users sign a single EIP-3009 authorization for USDT0 — the protocol's x402 facilitator submits on-chain. Zero gas, zero wallet popups beyond the signature.",
    Glyph: StakeGlyph,
  },
];

export function HowItWorks() {
  return (
    <Section id="s4" aria-label="How it works">
      <div className="mb-12 max-w-3xl">
        <DisplayHeadline variant="display-md" as="h2">
          How it works
        </DisplayHeadline>
      </div>

      <ol className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        {STEPS.map((step) => (
          <li key={step.number} className="flex flex-col gap-5">
            <step.Glyph className="h-14 w-14 text-[var(--color-deep-plum)] md:h-20 md:w-20" />
            <div className="flex flex-col gap-3">
              <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--color-slate-text)] tabular-nums">
                Step {step.number}
              </span>
              <h3 className="text-[22px] font-semibold leading-[1.2] text-[var(--color-deep-plum)]">
                {step.title}
              </h3>
              <p className="text-[15px] leading-[1.5] text-[var(--color-charcoal-text)]">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
