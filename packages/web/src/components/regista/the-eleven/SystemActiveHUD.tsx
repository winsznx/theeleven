"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Top-right HUD overlay on the cinematic stadium scene.
 *
 * Polls /api/status every 15 s (matches the cache TTLs in lib/status.ts:
 * agent /health is 10 s, on-chain is 30 s — 15 s splits the difference)
 * and renders the real persona-online count, NOT a static "11 / 11"
 * claim. Honesty rule: if the agent is unreachable, show "Agent offline"
 * in red instead of falsely advertising green.
 *
 * Adapts to the existing nested response shape from lib/status.ts
 * ({ agent: { status, raw: { personasActive } } }) — does not require
 * extending the /api/status payload, keeping the /status-page consumer
 * (P21) bit-identical.
 *
 * The pulse animation is disabled under prefers-reduced-motion.
 */

type HudState =
  | { kind: "loading" }
  | { kind: "online"; personasActive: number; total: number }
  | { kind: "degraded"; personasActive: number; total: number }
  | { kind: "offline" };

const TOTAL_PERSONAS = 11;
const POLL_INTERVAL_MS = 15_000;

interface AgentRawShape {
  personasActive?: number;
}
interface AgentShape {
  status?: "online" | "offline" | "not-configured";
  raw?: AgentRawShape;
}
interface StatusResponseShape {
  agent?: AgentShape;
}

export function SystemActiveHUD() {
  const [state, setState] = useState<HudState>({ kind: "loading" });
  const cancelledRef = useRef(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    cancelledRef.current = false;

    async function poll() {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as StatusResponseShape;
        if (cancelledRef.current) return;

        const agentStatus = data?.agent?.status;
        const personasActive = Number(data?.agent?.raw?.personasActive ?? 0);
        const agentOnline = agentStatus === "online";

        if (!agentOnline) {
          setState({ kind: "offline" });
        } else if (personasActive >= TOTAL_PERSONAS) {
          setState({
            kind: "online",
            personasActive,
            total: TOTAL_PERSONAS,
          });
        } else {
          setState({
            kind: "degraded",
            personasActive,
            total: TOTAL_PERSONAS,
          });
        }
      } catch {
        if (!cancelledRef.current) setState({ kind: "offline" });
      }
    }

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      window.clearInterval(interval);
    };
  }, []);

  const pulse = reducedMotion ? "" : "animate-pulse";

  return (
    <div
      data-system-active-hud
      data-state={state.kind}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(8,12,24,0.65)] px-3 py-1.5 backdrop-blur-md"
      aria-live="polite"
    >
      {state.kind === "loading" && (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
            System check…
          </span>
        </>
      )}
      {state.kind === "online" && (
        <>
          <span
            className={`h-1.5 w-1.5 rounded-full bg-[var(--color-success-moss)] ${pulse}`}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-success-moss)]">
            System active · {state.personasActive} / {state.total} personas online
          </span>
        </>
      )}
      {state.kind === "degraded" && (
        <>
          <span
            className={`h-1.5 w-1.5 rounded-full bg-[var(--color-action-orange)] ${pulse}`}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-action-orange)]">
            Partial · {state.personasActive} / {state.total} personas
          </span>
        </>
      )}
      {state.kind === "offline" && (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#fca5a5]">
            Agent offline
          </span>
        </>
      )}
    </div>
  );
}
