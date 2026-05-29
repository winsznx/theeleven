"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getAllMarketRows } from "@/lib/onchain";
import type { MarketRow, MarketState } from "@/types/market";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";
import { WEB_DEPLOYMENT } from "@/lib/deployment";

export interface UseMarketsOptions {
  status?: MarketState | "all";
  persona?: PersonaSlug | "all";
}

export interface UseMarketsResult {
  markets: MarketRow[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_MS = 30_000;

export function useMarkets(options: UseMarketsOptions = {}): UseMarketsResult {
  const { status = "all", persona = "all" } = options;
  const [markets, setMarkets] = useState<MarketRow[] | null>(null);
  const [loading, setLoading] = useState<boolean>(WEB_DEPLOYMENT.factory !== null);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const fetchOnce = useCallback(async () => {
    if (!WEB_DEPLOYMENT.factory) {
      setMarkets([]);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      const rows = await getAllMarketRows();
      if (!aliveRef.current) return;
      setMarkets(rows);
      setError(null);
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    void fetchOnce();
    const id = setInterval(() => void fetchOnce(), POLL_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(id);
    };
  }, [fetchOnce]);

  const filtered =
    markets === null
      ? null
      : markets.filter((m) => {
          if (status !== "all" && m.state !== status) return false;
          if (persona !== "all" && m.agentPersona !== persona) return false;
          return true;
        });

  return { markets: filtered, loading, error, refetch: fetchOnce };
}
