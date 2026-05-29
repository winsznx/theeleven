"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import type { Address, Hex } from "viem";

import { cleanErrorMessage, isUserRejection } from "@/lib/errors";
import { buildEIP3009TypedData } from "@/lib/eip3009";
import { getPublicClient } from "@/lib/onchain";

export type StakeFlowState =
  | { kind: "idle" }
  | { kind: "signing" }
  | { kind: "submitting" }
  | { kind: "confirming"; txHash: Hex }
  | { kind: "success"; txHash: Hex }
  | { kind: "error"; message: string };

export interface UseStakeFlowArgs {
  marketAddress: Address;
  side: 1 | 2;
  /** Stake amount in 6-decimal USDT0 micros. */
  amountMicros: bigint;
}

export interface UseStakeFlow {
  state: StakeFlowState;
  submit: () => Promise<void>;
  reset: () => void;
}

interface StakeRequestBody {
  market: Address;
  from: Address;
  side: 1 | 2;
  amount: string;
  nonce: Hex;
  validBefore: string;
  signature: Hex;
}

/**
 * Drives the user's stake from "click stake" through "confirmed on chain".
 *
 * Cancellation: every async step checks a `cancelledRef` so an unmount
 * mid-flow doesn't trigger a setState-after-unmount React warning.
 *
 * Error funnel: every caught error flows through cleanErrorMessage. User
 * rejections return to idle (not error) so the UI doesn't shame the user
 * for cancelling a wallet popup.
 */
export function useStakeFlow({
  marketAddress,
  side,
  amountMicros,
}: UseStakeFlowArgs): UseStakeFlow {
  const { address: account } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [state, setState] = useState<StakeFlowState>({ kind: "idle" });
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const reset = useCallback(() => {
    if (cancelledRef.current) return;
    setState({ kind: "idle" });
  }, []);

  const safeSet = useCallback((next: StakeFlowState) => {
    if (cancelledRef.current) return;
    setState(next);
  }, []);

  const submit = useCallback(async () => {
    if (!account) {
      safeSet({ kind: "error", message: "Connect your wallet to stake" });
      return;
    }
    if (amountMicros <= 0n) {
      safeSet({ kind: "error", message: "Stake amount must be greater than zero" });
      return;
    }

    safeSet({ kind: "signing" });

    let signature: Hex;
    let typedData: ReturnType<typeof buildEIP3009TypedData>;
    try {
      typedData = buildEIP3009TypedData({
        from: account,
        to: marketAddress,
        value: amountMicros,
      });
      signature = (await signTypedDataAsync({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      })) as Hex;
    } catch (err) {
      if (isUserRejection(err)) {
        safeSet({ kind: "idle" });
        return;
      }
      safeSet({ kind: "error", message: cleanErrorMessage(err) });
      return;
    }

    if (cancelledRef.current) return;

    safeSet({ kind: "submitting" });

    const requestBody: StakeRequestBody = {
      market: marketAddress,
      from: account,
      side,
      amount: amountMicros.toString(),
      nonce: typedData.message.nonce,
      validBefore: typedData.message.validBefore.toString(),
      signature,
    };

    let txHash: Hex;
    try {
      const response = await fetch("/api/facilitator/stake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (cancelledRef.current) return;

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        safeSet({
          kind: "error",
          message: body.error ?? `Facilitator returned ${response.status}`,
        });
        return;
      }

      const json = (await response.json()) as { txHash?: Hex };
      if (!json.txHash) {
        safeSet({ kind: "error", message: "Facilitator response missing tx hash" });
        return;
      }
      txHash = json.txHash;
    } catch (err) {
      safeSet({ kind: "error", message: cleanErrorMessage(err) });
      return;
    }

    safeSet({ kind: "confirming", txHash });

    try {
      const client = getPublicClient();
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      if (cancelledRef.current) return;

      if (receipt.status === "success") {
        safeSet({ kind: "success", txHash });
      } else {
        safeSet({
          kind: "error",
          message: "Transaction reverted on-chain. Check OKLink for details.",
        });
      }
    } catch (err) {
      safeSet({ kind: "error", message: cleanErrorMessage(err) });
    }
  }, [account, amountMicros, marketAddress, safeSet, side, signTypedDataAsync]);

  return { state, submit, reset };
}
