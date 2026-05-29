"use client";

import { FORMATION_4_3_3 } from "../constants";

import { AgentCard } from "./AgentCard";

export function FormationLayout() {
  return (
    <>
      {FORMATION_4_3_3.map((slot) => (
        <AgentCard key={slot.persona} slot={slot} />
      ))}
    </>
  );
}
