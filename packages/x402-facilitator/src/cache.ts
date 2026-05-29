import type { Address, Hex } from "viem";

const TTL_MS = 10 * 60 * 1000;

interface Entry {
  txHash: Hex;
  expiresAt: number;
}

export class SettlementCache {
  private store = new Map<string, Entry>();

  private key(from: Address, nonce: Hex): string {
    return `${from.toLowerCase()}:${nonce.toLowerCase()}`;
  }

  get(from: Address, nonce: Hex): Hex | undefined {
    const k = this.key(from, nonce);
    const entry = this.store.get(k);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(k);
      return undefined;
    }
    return entry.txHash;
  }

  set(from: Address, nonce: Hex, txHash: Hex): void {
    this.store.set(this.key(from, nonce), {
      txHash,
      expiresAt: Date.now() + TTL_MS,
    });
  }
}
