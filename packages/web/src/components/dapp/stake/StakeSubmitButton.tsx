"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

import { Spinner } from "./Spinner";
import { CheckIcon, ErrorIcon } from "./Icons";

export const stakeButtonVariants = cva(
  "inline-flex w-full items-center justify-center gap-2 font-medium uppercase tracking-wide rounded-[8px] " +
    "transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-orange)] " +
    "disabled:cursor-not-allowed",
  {
    variants: {
      state: {
        ready:
          "bg-[var(--color-action-orange)] text-[var(--color-ghost-white)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]",
        insufficient:
          "bg-[var(--color-steel-gray)] text-[var(--color-slate-text)] cursor-not-allowed",
        signing:
          "bg-[var(--color-deep-plum)] text-[var(--color-ghost-white)] opacity-80",
        submitting:
          "bg-[var(--color-deep-plum)] text-[var(--color-ghost-white)] opacity-80",
        confirming:
          "bg-[var(--color-success-moss)] text-[var(--color-ghost-white)]",
        success:
          "bg-[var(--color-success-moss)] text-[var(--color-ghost-white)] hover:shadow-[var(--shadow-hover)]",
        error:
          "bg-[var(--color-action-orange)] text-[var(--color-ghost-white)] hover:shadow-[var(--shadow-hover)]",
      },
      size: {
        sm: "h-10 px-4 text-xs",
        md: "h-12 px-6 text-sm",
        lg: "h-14 px-8 text-base",
      },
    },
    defaultVariants: { state: "ready", size: "md" },
  },
);

export type StakeButtonState = NonNullable<
  VariantProps<typeof stakeButtonVariants>["state"]
>;

export interface StakeSubmitButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof stakeButtonVariants> {
  /** Computed by the orchestrator from useStakeFlow.state.kind. */
  state: StakeButtonState;
  /** Used to compose the ready-state label ("Stake $X.XX on OVER"). */
  side?: "OVER" | "UNDER";
  /** Pre-formatted dollar string for ready / success labels. */
  amountLabel?: string;
}

function content(
  state: StakeButtonState,
  side: "OVER" | "UNDER" | undefined,
  amountLabel: string | undefined,
): React.ReactNode {
  switch (state) {
    case "ready":
      return `Stake ${amountLabel ?? "$0.00"} on ${side ?? "OVER"}`;
    case "insufficient":
      return "Insufficient USDT0 · Get USDT0 →";
    case "signing":
      return (
        <>
          <Spinner /> Sign in your wallet…
        </>
      );
    case "submitting":
      return (
        <>
          <Spinner /> Submitting…
        </>
      );
    case "confirming":
      return (
        <>
          <Spinner /> Confirming on X Layer…
        </>
      );
    case "success":
      return (
        <>
          <CheckIcon /> Staked · view on OKLink ↗
        </>
      );
    case "error":
      return (
        <>
          <ErrorIcon /> Try again
        </>
      );
  }
}

export const StakeSubmitButton = forwardRef<HTMLButtonElement, StakeSubmitButtonProps>(
  function StakeSubmitButton(
    { state, size = "md", side, amountLabel, className, disabled, children, ...rest },
    ref,
  ) {
    const intrinsicallyDisabled =
      state === "insufficient" ||
      state === "signing" ||
      state === "submitting" ||
      state === "confirming";
    return (
      <button
        ref={ref}
        type="button"
        data-stake-state={state}
        disabled={disabled ?? intrinsicallyDisabled}
        className={cn(stakeButtonVariants({ state, size }), className)}
        {...rest}
      >
        {children ?? content(state, side, amountLabel)}
      </button>
    );
  },
);
