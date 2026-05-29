"use client";

import { useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { xLayer } from "wagmi/chains";
import { parseUnits, type Address } from "viem";

import { HexCard } from "@/components/landing/HexCard";
import { IUSDT0ABI } from "@/abis/IUSDT0";
import { LEGACY_USDT_ADDRESS, USDT0_DECIMALS } from "@/config/tokens";
import { useUSDT0Balance } from "@/hooks/useUSDT0Balance";
import { useStakeFlow } from "@/hooks/useStakeFlow";

import { LegacyUSDTRejection } from "./LegacyUSDTRejection";
import { StakeAmountInput } from "./StakeAmountInput";
import { StakeReceipt } from "./StakeReceipt";
import { StakeSideSelector, type StakeSide } from "./StakeSideSelector";
import { StakeSubmitButton } from "./StakeSubmitButton";

interface StakeWidgetProps {
  marketAddress: Address;
  overOddsBips: number;
  underOddsBips: number;
  /** When false, the widget renders a "Staking closed" plate with no inputs. */
  marketOpen?: boolean;
  /** Optional human question shown in the success receipt. */
  question?: string;
}

const OKX_DEPOSIT_GUIDE = "https://www.okx.com/help/how-to-deposit-and-withdraw-on-x-layer";

function amountToMicros(value: string): bigint {
  if (!value || value.trim() === "" || value === ".") return 0n;
  try {
    return parseUnits(value, USDT0_DECIMALS);
  } catch {
    return 0n;
  }
}

/**
 * Drop-in replacement for StakeWidgetPlaceholder. Same prop interface
 * (marketAddress + odds) with two optional extras (marketOpen, question).
 *
 * State machine lives in useStakeFlow; this component is a state matcher
 * that picks the right sub-render based on:
 *   - market lifecycle (open or closed)
 *   - wallet connection
 *   - chain match
 *   - balance composition (USDT0, legacy USDT)
 *   - flow.state.kind (idle, signing, submitting, confirming, success, error)
 */
export function StakeWidget({
  marketAddress,
  overOddsBips,
  underOddsBips,
  marketOpen = true,
  question,
}: StakeWidgetProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrongChain = isConnected && chainId !== xLayer.id;

  const [side, setSide] = useState<StakeSide>("OVER");
  const [amountStr, setAmountStr] = useState("10.00");
  const amountMicros = useMemo(() => amountToMicros(amountStr), [amountStr]);

  const { balance: usdt0Balance } = useUSDT0Balance(address ?? null);
  const { data: legacyBalanceRaw } = useReadContract({
    address: LEGACY_USDT_ADDRESS,
    abi: IUSDT0ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) && !wrongChain, refetchInterval: 30_000 },
  });
  const legacyBalance = (legacyBalanceRaw as bigint | undefined) ?? null;

  const flow = useStakeFlow({
    marketAddress,
    side: side === "OVER" ? 1 : 2,
    amountMicros,
  });

  /* ──────────── Branch 1: market closed ──────────── */
  if (!marketOpen) {
    return (
      <HexCard innerClassName="flex flex-col gap-2 p-5" data-stake-branch="closed">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
          Stake
        </span>
        <p className="text-[13px] text-[var(--color-charcoal-text)]">
          Staking closed for this market.
        </p>
      </HexCard>
    );
  }

  /* ──────────── Branch 2: success — show receipt ──────────── */
  if (flow.state.kind === "success") {
    return (
      <StakeReceipt
        txHash={flow.state.txHash}
        side={side}
        amountMicros={amountMicros}
        marketAddress={marketAddress}
        question={question}
        onStakeMore={flow.reset}
      />
    );
  }

  const overCents = Math.round(overOddsBips / 100);
  const underCents = Math.round(underOddsBips / 100);
  const amountLabel = `$${amountStr || "0.00"}`;

  /* ──────────── Branch 3: wallet disconnected ──────────── */
  if (!isConnected) {
    return (
      <HexCard innerClassName="flex flex-col gap-4 p-5" data-stake-branch="disconnected">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
          Stake
        </span>
        <StakeSideSelector
          side={side}
          overCents={overCents}
          underCents={underCents}
          onChange={setSide}
          disabled
        />
        <StakeAmountInput value={amountStr} onChange={setAmountStr} balance={null} disabled />
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <StakeSubmitButton
              state="ready"
              side={side}
              amountLabel="—"
              onClick={openConnectModal}
              // override default label
              aria-label="Connect wallet to stake"
            >
              Connect wallet to stake
            </StakeSubmitButton>
          )}
        </ConnectButton.Custom>
        <p className="text-[11px] text-[var(--color-slate-text)]">
          Powered by USDT0 · EIP-3009 gasless.
        </p>
      </HexCard>
    );
  }

  /* ──────────── Branch 4: wrong chain ──────────── */
  if (wrongChain) {
    return (
      <HexCard innerClassName="flex flex-col gap-4 p-5" data-stake-branch="wrong-chain">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
          Stake
        </span>
        <p className="text-[13px] text-[var(--color-charcoal-text)]">
          You&apos;re on chain {chainId}. Switch to X Layer to stake.
        </p>
        <StakeSubmitButton
          state="ready"
          onClick={() => switchChain({ chainId: xLayer.id })}
        >
          Switch to X Layer
        </StakeSubmitButton>
      </HexCard>
    );
  }

  /* ──────────── Branch 5: legacy USDT, no USDT0 ──────────── */
  if (usdt0Balance === 0n && legacyBalance !== null && legacyBalance > 0n) {
    return <LegacyUSDTRejection legacyBalance={legacyBalance} />;
  }

  /* ──────────── Branch 6: insufficient USDT0 ──────────── */
  const balanceLoaded = usdt0Balance !== null;
  const insufficient =
    balanceLoaded && (usdt0Balance ?? 0n) < amountMicros && amountMicros > 0n;

  /* ──────────── Branch 7+8: ready / signing / submitting / confirming / error ──────────── */
  const buttonState = insufficient ? "insufficient" : flow.state.kind;

  return (
    <HexCard innerClassName="flex flex-col gap-4 p-5" data-stake-branch="ready">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-slate-text)]">
        Stake
      </span>

      <StakeSideSelector
        side={side}
        overCents={overCents}
        underCents={underCents}
        onChange={setSide}
        disabled={flow.state.kind === "signing" || flow.state.kind === "submitting" || flow.state.kind === "confirming"}
      />

      <StakeAmountInput
        value={amountStr}
        onChange={setAmountStr}
        balance={usdt0Balance}
        disabled={flow.state.kind === "signing" || flow.state.kind === "submitting" || flow.state.kind === "confirming"}
      />

      <StakeSubmitButton
        state={buttonState === "idle" ? "ready" : (buttonState as "ready" | "insufficient" | "signing" | "submitting" | "confirming" | "error")}
        side={side}
        amountLabel={amountLabel}
        onClick={() => {
          if (insufficient) {
            window.open(OKX_DEPOSIT_GUIDE, "_blank", "noreferrer");
            return;
          }
          if (flow.state.kind === "error") {
            flow.reset();
            void flow.submit();
            return;
          }
          void flow.submit();
        }}
      />

      {flow.state.kind === "error" ? (
        <p
          role="alert"
          aria-live="polite"
          data-stake-error
          className="rounded-[2px] border border-[var(--color-action-orange)] bg-[var(--color-action-orange)]/10 px-3 py-2 text-[12px] text-[var(--color-charcoal-text)]"
        >
          {flow.state.message}
        </p>
      ) : null}

      <p className="text-[11px] text-[var(--color-slate-text)]">
        Powered by USDT0 · EIP-3009 gasless.
      </p>
    </HexCard>
  );
}
