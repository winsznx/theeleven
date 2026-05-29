import { ExternalLink } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { DisplayHeadline } from "@/components/typography/DisplayHeadline";
import { BracketBackdrop } from "@/components/wc/BracketBackdrop";

interface LayerBadge {
  label: string;
  href?: string;
}

interface Layer {
  name: string;
  description: string;
  badge?: LayerBadge;
}

const LAYERS: Layer[] = [
  {
    name: "User",
    description: "Fan signs an EIP-3009 authorization in their wallet.",
  },
  {
    name: "x402 facilitator",
    description:
      "Submits the authorization on-chain. Hosted at facilitator.regista11.xyz.",
    badge: { label: "Open public good" },
  },
  {
    name: "PropMarketHook",
    description:
      "Custom Uniswap v4 Hook. Commit-reveal markets, dual-pool stake aggregation, resolve via authorized resolver.",
    badge: {
      label: "Hook the Future",
      href: "https://atrium.academy/hook-the-future",
    },
  },
  {
    name: "USDT0 (EIP-3009)",
    description:
      "Tether's omnichain stable on X Layer via LayerZero OFT. Gasless authorizations native.",
    badge: { label: "USDT0 docs", href: "https://docs.usdt0.to" },
  },
  {
    name: "X Layer (chain 196)",
    description:
      "OKX's zkEVM L2. Sub-cent settlement, OKLink explorer.",
    badge: { label: "X Cup", href: "https://www.okx.com/xlayer" },
  },
];

const SIDECAR: Layer = {
  name: "Cross-chain resolution",
  description:
    "Flap WorldCupResolver on BNB Chain provides authorized resolution of tournament match outcomes.",
  badge: { label: "Flap", href: "https://flap.sh" },
};

function Badge({ badge }: { badge: LayerBadge }) {
  const className =
    "inline-flex items-center gap-1 rounded-[2px] border border-[var(--color-steel-gray)] bg-[var(--color-fog-gray)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-charcoal-text)]";
  if (badge.href) {
    return (
      <a
        href={badge.href}
        target="_blank"
        rel="noreferrer"
        className={`${className} transition-colors hover:text-[var(--color-deep-plum)]`}
      >
        {badge.label}
        <ExternalLink className="h-3 w-3" aria-hidden />
      </a>
    );
  }
  return <span className={className}>{badge.label}</span>;
}

function LayerRow({ layer, isLast }: { layer: Layer; isLast: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${
        isLast ? "" : "border-b border-[var(--color-steel-gray)]"
      }`}
    >
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
          Layer
        </span>
        <span className="text-[15px] font-semibold text-[var(--color-deep-plum)]">
          {layer.name}
        </span>
        <p className="text-[13px] leading-[1.5] text-[var(--color-charcoal-text)] sm:max-w-[420px]">
          {layer.description}
        </p>
      </div>
      {layer.badge ? (
        <div className="flex-shrink-0">
          <Badge badge={layer.badge} />
        </div>
      ) : null}
    </div>
  );
}

export function ArchitectureStack() {
  return (
    <section
      id="s6"
      aria-label="The stack"
      className="relative overflow-hidden py-12 md:py-16"
    >
      {/* Tournament-bracket SVG behind the content at 4% opacity. */}
      <BracketBackdrop className="pointer-events-none absolute inset-0 w-full h-full text-[var(--color-deep-plum)]" />

      <Container>
        <div className="relative">
          <div className="mb-10 max-w-3xl">
            <DisplayHeadline variant="display-md" as="h2">
              The stack
            </DisplayHeadline>
            <p className="mt-4 text-[18px] leading-[1.4] text-[var(--color-slate-text)]">
              Three submissions, one protocol. Dual-track infrastructure on X Layer.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div
              className="hex-card bg-[var(--color-steel-gray)] p-px shadow-[var(--shadow-card)]"
              aria-label="Protocol stack layers"
            >
              <div className="hex-card bg-[var(--color-ghost-white)]">
                {LAYERS.map((layer, i) => (
                  <LayerRow
                    key={layer.name}
                    layer={layer}
                    isLast={i === LAYERS.length - 1}
                  />
                ))}
              </div>
            </div>

            <aside
              aria-label="Cross-chain resolver sidecar"
              className="rounded-[12px] border border-[var(--color-steel-gray)] bg-[var(--color-ghost-white)] p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
                  Sidecar
                </span>
                <span className="text-[15px] font-semibold text-[var(--color-deep-plum)]">
                  {SIDECAR.name}
                </span>
                <p className="text-[13px] leading-[1.5] text-[var(--color-charcoal-text)]">
                  {SIDECAR.description}
                </p>
                {SIDECAR.badge ? (
                  <div>
                    <Badge badge={SIDECAR.badge} />
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </Container>
    </section>
  );
}
