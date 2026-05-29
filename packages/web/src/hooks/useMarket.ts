"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";

import { getMarketRow } from "@/lib/onchain";
import type { MarketRow } from "@/types/market";
import { WEB_DEPLOYMENT } from "@/lib/deployment";

export interface UseMarketResult {
  market: MarketRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_MS = 12_000;

export function useMarket(address: Address | null): UseMarketResult {
  const [market, setMarket] = useState<MarketRow | null>(null);
  const [loading, setLoading] = useState<boolean>(
    address !== null && WEB_DEPLOYMENT.factory !== null,
  );
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const fetchOnce = useCallback(async () => {
    if (!address || !WEB_DEPLOYMENT.factory) {
      setMarket(null);
      setLoading(false);
      return;
    }
    try {
      const row = await getMarketRow(address);
      if (!aliveRef.current) return;
      setMarket(row);
      setError(null);
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    aliveRef.current = true;
    void fetchOnce();
    const id = setInterval(() => void fetchOnce(), POLL_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(id);
    };
  }, [fetchOnce]);

  return { market, loading, error, refetch: fetchOnce };
}
