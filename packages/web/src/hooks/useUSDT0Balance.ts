"use client";

import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";

import { getUsdt0Balance } from "@/lib/onchain";

const POLL_MS = 15_000;

export function useUSDT0Balance(account: Address | null): {
  balance: bigint | null;
  loading: boolean;
} {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    if (!account) {
      setBalance(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchOnce = async () => {
      try {
        const value = await getUsdt0Balance(account);
        if (aliveRef.current) setBalance(value);
      } catch {
        if (aliveRef.current) setBalance(null);
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    };
    void fetchOnce();
    const id = setInterval(() => void fetchOnce(), POLL_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(id);
    };
  }, [account]);

  return { balance, loading };
}
