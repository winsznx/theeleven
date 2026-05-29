"use client";

import { useEffect, useRef, useState } from "react";

import { WEB_DEPLOYMENT } from "@/lib/deployment";
import { getAgentRegistrations } from "@/lib/onchain";
import { ELEVEN_PERSONAS } from "@/lib/personas";
import type { PersonaSlug } from "@/components/landing/pitch/PositionGrid";

export interface UseAgentRegistryResult {
  /** Personas whose wallet is on-chain-registered with the factory. */
  registered: PersonaSlug[];
  /** Personas whose wallet has not yet been registered with the factory. */
  unregistered: PersonaSlug[];
  loading: boolean;
}

/**
 * Cross-references the deployment.agents map (static) with on-chain
 * factory.registeredAgents() reads. A persona is "registered" only when:
 *   1. it has a wallet in deployment.agents, AND
 *   2. that wallet returns true from factory.registeredAgents(addr).
 *
 * Pre-deploy (factory null), every persona is "unregistered".
 *
 * Naming note: P21 retired the UI "standby" concept; this hook reports
 * on-chain registration state, NOT UI persona status.
 */
export function useAgentRegistry(): UseAgentRegistryResult {
  const ALL_SLUGS = ELEVEN_PERSONAS.map((p) => p.persona);

  const [registered, setRegistered] = useState<PersonaSlug[]>([]);
  const [loading, setLoading] = useState<boolean>(
    WEB_DEPLOYMENT.factory !== null && WEB_DEPLOYMENT.personaByAgent !== null,
  );
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    if (!WEB_DEPLOYMENT.factory || !WEB_DEPLOYMENT.personaByAgent) {
      setRegistered([]);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { registered: addrs } = await getAgentRegistrations();
        if (!aliveRef.current) return;
        const slugs = addrs
          .map((addr) => WEB_DEPLOYMENT.personaByAgent!.get(addr))
          .filter((s): s is PersonaSlug => Boolean(s));
        setRegistered(slugs);
      } finally {
        if (aliveRef.current) setLoading(false);
      }
    })();
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const registeredSet = new Set(registered);
  const unregistered = ALL_SLUGS.filter((s) => !registeredSet.has(s));

  return { registered, unregistered, loading };
}
