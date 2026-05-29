import { ExternalLink } from "lucide-react";
import type { Address } from "viem";

import { cn } from "@/lib/cn";

interface PersonaWalletBadgeProps {
  address: Address;
  className?: string;
}

export function PersonaWalletBadge({ address, className }: PersonaWalletBadgeProps) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const href = `https://www.oklink.com/x-layer/address/${address}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-oklink-address={address}
      className={cn(
        "inline-flex items-center gap-2 rounded-[2px] border border-[var(--color-steel-gray)] bg-[var(--color-fog-gray)] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--color-charcoal-text)] hover:text-[var(--color-deep-plum)] tabular-nums",
        className,
      )}
      aria-label={`Open ${address} on OKLink`}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success-moss)]" />
      {short}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}
