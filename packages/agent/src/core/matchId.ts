import { pad, toHex, type Hex } from "viem";

/**
 * Canonical matchId derivation, locked across P10 + P11:
 *   matchId = bytes32(uint256(apiFootballFixtureId))
 *
 * Example: fixtureId 1145546 → 0x000…000117a8a
 *
 * Both factory.createMarket calldata and downstream proposition resolvers
 * MUST use this same convention to keep on-chain marketId lookups consistent
 * with API-Football's fixture identity.
 */
export function fixtureIdToMatchId(fixtureId: number): Hex {
  if (!Number.isInteger(fixtureId) || fixtureId < 0) {
    throw new Error(`fixtureId must be a non-negative integer, got: ${fixtureId}`);
  }
  return pad(toHex(BigInt(fixtureId)), { size: 32 });
}

export function matchIdToFixtureId(matchId: Hex): number {
  const n = BigInt(matchId);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("matchId exceeds Number.MAX_SAFE_INTEGER — not an API-Football fixtureId");
  }
  return Number(n);
}
