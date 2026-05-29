export type MarketState =
  | "COMMITTED"
  | "REVEALED"
  | "ACTIVE"
  | "CLOSED"
  | "RESOLVED"
  | "REFUNDED";

export type MarketOutcome = 0 | 1 | 2 | 3;

// P10 expansion: PropMarketLib's typed proposition template lands here.
export type PropositionId = string & { readonly __brand: "PropositionId" };
