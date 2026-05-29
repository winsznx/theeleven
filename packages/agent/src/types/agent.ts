import type { Address } from "viem";

export const AGENT_NAMES = [
  "Il Regista",
  "Il Trequartista",
  "Il Mediano",
  "Il Falso Nove",
  "Il Libero",
  "L'Ala",
  "Il Bomber",
  "Il Capitano",
  "Il Numero Dieci",
  "Il Catenaccio",
  "L'Ultimo",
] as const;

export type PersonaName = (typeof AGENT_NAMES)[number];

export type AgentIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const AGENT_INDICES: readonly AgentIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface AgentIdentity {
  index: AgentIndex;
  name: PersonaName;
  address: Address;
}
