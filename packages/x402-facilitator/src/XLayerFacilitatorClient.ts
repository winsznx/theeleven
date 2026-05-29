import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { defineChain } from "viem";

import {
  USDT0_ADDRESS,
  USDT0_NETWORK,
  USDT0_ABI,
} from "./usdt0.js";
import { recoverTransferSigner, splitSignature } from "./eip712.js";
import { SettlementCache } from "./cache.js";

const xLayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } },
});

export interface XLayerFacilitatorConfig {
  rpcUrl?: string;
  facilitatorPrivateKey: Hex;
}

interface IncomingAuthorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

interface ExactPayload {
  authorization: IncomingAuthorization;
  signature: string;
}

type VerifyResponse = {
  isValid: boolean;
  invalidReason?: string;
  invalidMessage?: string;
  payer?: string;
  extensions?: Record<string, unknown>;
};

type SettleResponse = {
  success: boolean;
  status?: "pending" | "success" | "timeout";
  errorReason?: string;
  errorMessage?: string;
  payer?: string;
  transaction: string;
  network: string;
  amount?: string;
  extensions?: Record<string, unknown>;
};

type SupportedResponse = {
  kinds: { x402Version: number; scheme: string; network: string; extra?: Record<string, unknown> }[];
  extensions: string[];
  signers: Record<string, string[]>;
};

type SettleStatusResponse = {
  success: boolean;
  status?: "pending" | "success" | "failed";
  errorReason?: string;
  errorMessage?: string;
  payer?: string;
  transaction?: string;
  network?: string;
};

const CLOCK_SKEW_SECONDS = 60;
const SETTLE_TIMEOUT_MS = 30_000;
const RPC_RETRY_DELAYS_MS = [500, 2_000, 5_000];

export class XLayerFacilitatorClient {
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient;
  private readonly account: PrivateKeyAccount;
  private readonly cache = new SettlementCache();

  constructor(config: XLayerFacilitatorConfig) {
    const transport = http(config.rpcUrl ?? "https://rpc.xlayer.tech");
    this.publicClient = createPublicClient({ chain: xLayer, transport });
    this.account = privateKeyToAccount(config.facilitatorPrivateKey);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: xLayer,
      transport,
    });
  }

  get facilitatorAddress(): Address {
    return this.account.address;
  }

  async getSupported(): Promise<SupportedResponse> {
    return {
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: USDT0_NETWORK,
        },
      ],
      extensions: [],
      signers: { "eip155:*": [this.account.address] },
    };
  }

  async verify(payload: any, requirements: any): Promise<VerifyResponse> {
    return this.verifyInner(payload, requirements);
  }

  async settle(payload: any, requirements: any): Promise<SettleResponse> {
    const exactPayload = payload?.payload as ExactPayload | undefined;
    if (!exactPayload?.authorization || !exactPayload?.signature) {
      return this.failSettle("malformed_payload", "missing authorization or signature", "0x");
    }

    const verifyResult = await this.verifyInner(payload, requirements);
    if (!verifyResult.isValid) {
      return this.failSettle(
        verifyResult.invalidReason ?? "verify_failed",
        verifyResult.invalidMessage ?? "verify_failed",
        "0x",
        verifyResult.payer,
      );
    }

    const auth = exactPayload.authorization;
    const from = getAddress(auth.from) as Address;
    const nonce = auth.nonce as Hex;

    const cached = this.cache.get(from, nonce);
    if (cached) {
      return {
        success: true,
        status: "success",
        transaction: cached,
        network: USDT0_NETWORK,
        payer: from,
        amount: auth.value,
      };
    }

    const { v, r, s } = splitSignature(exactPayload.signature as Hex);

    let lastError: unknown;
    for (let attempt = 0; attempt <= RPC_RETRY_DELAYS_MS.length; attempt++) {
      try {
        const txHash = await this.walletClient.writeContract({
          address: USDT0_ADDRESS,
          abi: USDT0_ABI,
          functionName: "transferWithAuthorization",
          args: [
            from,
            getAddress(auth.to) as Address,
            BigInt(auth.value),
            BigInt(auth.validAfter),
            BigInt(auth.validBefore),
            nonce,
            v,
            r,
            s,
          ],
          chain: xLayer,
          account: this.account,
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: SETTLE_TIMEOUT_MS,
        });

        if (receipt.status !== "success") {
          return this.failSettle(
            "tx_reverted",
            `transferWithAuthorization tx ${txHash} reverted`,
            txHash,
            from,
          );
        }

        this.cache.set(from, nonce, txHash);

        return {
          success: true,
          status: "success",
          transaction: txHash,
          network: USDT0_NETWORK,
          payer: from,
          amount: auth.value,
        };
      } catch (err) {
        lastError = err;
        if (attempt < RPC_RETRY_DELAYS_MS.length) {
          await new Promise((r) => setTimeout(r, RPC_RETRY_DELAYS_MS[attempt]));
          continue;
        }
        return this.failSettle(
          "rpc_error",
          (err as Error)?.message ?? String(err),
          "0x",
          from,
        );
      }
    }

    return this.failSettle("rpc_error", String(lastError), "0x", from);
  }

  async getSettleStatus(txHash: string): Promise<SettleStatusResponse> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({
        hash: txHash as Hex,
      });
      if (receipt.status === "success") {
        return { success: true, status: "success", transaction: txHash, network: USDT0_NETWORK };
      }
      return { success: false, status: "failed", transaction: txHash, network: USDT0_NETWORK };
    } catch {
      return { success: false, status: "pending", transaction: txHash, network: USDT0_NETWORK };
    }
  }

  private async verifyInner(payload: any, requirements: any): Promise<VerifyResponse> {
    const exactPayload = payload?.payload as ExactPayload | undefined;
    if (!exactPayload?.authorization || !exactPayload?.signature) {
      return { isValid: false, invalidReason: "malformed_payload", invalidMessage: "missing authorization or signature" };
    }

    const auth = exactPayload.authorization;
    let from: Address;
    let to: Address;
    try {
      from = getAddress(auth.from) as Address;
      to = getAddress(auth.to) as Address;
    } catch (e) {
      return { isValid: false, invalidReason: "invalid_address", invalidMessage: (e as Error).message };
    }

    let recovered: Address;
    try {
      recovered = await recoverTransferSigner(
        {
          from,
          to,
          value: BigInt(auth.value),
          validAfter: BigInt(auth.validAfter),
          validBefore: BigInt(auth.validBefore),
          nonce: auth.nonce as Hex,
        },
        exactPayload.signature as Hex,
      );
    } catch (e) {
      return { isValid: false, invalidReason: "invalid_signature", invalidMessage: (e as Error).message };
    }

    if (recovered.toLowerCase() !== from.toLowerCase()) {
      return {
        isValid: false,
        invalidReason: "invalid_signature",
        invalidMessage: `recovered ${recovered} != from ${from}`,
        payer: from,
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const validAfter = Number(auth.validAfter);
    const validBefore = Number(auth.validBefore);
    if (now + CLOCK_SKEW_SECONDS < validAfter) {
      return { isValid: false, invalidReason: "invalid_time_window", invalidMessage: `now=${now} validAfter=${validAfter}`, payer: from };
    }
    if (now - CLOCK_SKEW_SECONDS > validBefore) {
      return { isValid: false, invalidReason: "invalid_time_window", invalidMessage: `now=${now} validBefore=${validBefore}`, payer: from };
    }

    if (requirements?.payTo && getAddress(requirements.payTo).toLowerCase() !== to.toLowerCase()) {
      return {
        isValid: false,
        invalidReason: "mismatched_recipient",
        invalidMessage: `auth.to=${to} requirements.payTo=${requirements.payTo}`,
        payer: from,
      };
    }
    if (requirements?.amount && BigInt(auth.value) < BigInt(requirements.amount)) {
      return {
        isValid: false,
        invalidReason: "insufficient_payment",
        invalidMessage: `auth.value=${auth.value} required=${requirements.amount}`,
        payer: from,
      };
    }
    if (requirements?.asset && getAddress(requirements.asset).toLowerCase() !== USDT0_ADDRESS.toLowerCase()) {
      return {
        isValid: false,
        invalidReason: "unsupported_asset",
        invalidMessage: `asset=${requirements.asset} expected=${USDT0_ADDRESS}`,
        payer: from,
      };
    }

    const [balance, nonceUsed] = await Promise.all([
      this.publicClient.readContract({
        address: USDT0_ADDRESS,
        abi: USDT0_ABI,
        functionName: "balanceOf",
        args: [from],
      }) as Promise<bigint>,
      this.publicClient.readContract({
        address: USDT0_ADDRESS,
        abi: USDT0_ABI,
        functionName: "authorizationState",
        args: [from, auth.nonce as Hex],
      }) as Promise<boolean>,
    ]);

    if (balance < BigInt(auth.value)) {
      return {
        isValid: false,
        invalidReason: "insufficient_funds",
        invalidMessage: `balance=${balance} value=${auth.value}`,
        payer: from,
      };
    }
    if (nonceUsed) {
      return {
        isValid: false,
        invalidReason: "nonce_already_used",
        invalidMessage: `nonce ${auth.nonce} already used by ${from}`,
        payer: from,
      };
    }

    return { isValid: true, payer: from };
  }

  private failSettle(
    reason: string,
    message: string,
    txHash: string,
    payer?: string,
  ): SettleResponse {
    return {
      success: false,
      status: "timeout",
      errorReason: reason,
      errorMessage: message,
      transaction: txHash,
      network: USDT0_NETWORK,
      payer,
    };
  }
}
