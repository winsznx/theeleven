import type { Logger } from "pino";
import type { Address, Hex, PublicClient, WalletClient } from "viem";

import { TransactionRevertedError } from "../errors.js";

export interface SendTxArgs {
  walletClient: WalletClient;
  publicClient: PublicClient;
  to: Address;
  data: Hex;
  value?: bigint;
  gas?: bigint;
  logger?: Logger;
}

export interface SendTxReceipt {
  txHash: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
  status: "success" | "reverted";
}

const RECEIPT_RETRY_DELAYS_MS = [500, 2_000, 5_000] as const;
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * okx-agentic-wallet skill — sign, send, and wait for a transaction receipt.
 *
 * - Retry policy: 3× on RPC failure during waitForTransactionReceipt only,
 *   exponential 500ms / 2s / 5s. Reverts are NOT retried.
 * - Reverts surface as TransactionRevertedError carrying the receipt.
 */
export async function signAndSend(args: SendTxArgs): Promise<SendTxReceipt> {
  return signAndSendImpl(args, defaultSleep);
}

export async function signAndSendImpl(
  args: SendTxArgs,
  sleep: (ms: number) => Promise<void>
): Promise<SendTxReceipt> {
  const { walletClient, publicClient, to, data, value, gas, logger } = args;
  const account = walletClient.account;
  if (!account) throw new Error("okx-agentic-wallet: walletClient has no account bound");

  const finalGas =
    gas ??
    (await publicClient.estimateGas({
      account: account.address,
      to,
      data,
      value: value ?? 0n,
    }));

  logger?.info({ to, gas: finalGas.toString(), value: (value ?? 0n).toString() }, "okx-agentic-wallet: sending tx");

  const txHash = (await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to,
    data,
    value: value ?? 0n,
    gas: finalGas,
  } as Parameters<WalletClient["sendTransaction"]>[0])) as Hex;

  logger?.info({ txHash }, "okx-agentic-wallet: tx submitted");

  let lastErr: unknown;
  for (let attempt = 0; attempt <= RECEIPT_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });
      const ret: SendTxReceipt = {
        txHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: receipt.status === "success" ? "success" : "reverted",
      };
      if (ret.status === "reverted") {
        throw new TransactionRevertedError({
          txHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed,
        });
      }
      logger?.info({ txHash, blockNumber: ret.blockNumber.toString(), gasUsed: ret.gasUsed.toString() }, "okx-agentic-wallet: tx confirmed");
      return ret;
    } catch (err) {
      if (err instanceof TransactionRevertedError) throw err;
      lastErr = err;
      if (attempt >= RECEIPT_RETRY_DELAYS_MS.length) {
        throw err;
      }
      const delay = RECEIPT_RETRY_DELAYS_MS[attempt]!;
      logger?.warn({ txHash, attempt: attempt + 1, delay }, "okx-agentic-wallet: receipt retry");
      await sleep(delay);
    }
  }
  throw lastErr;
}
