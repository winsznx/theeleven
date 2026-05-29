/**
 * Single user-facing error funnel for the dApp.
 *
 * All caught errors that reach a UI render pass route through here. The
 * goal is to keep raw stack traces, viem internals, fetch typeError quirks,
 * and HTTP machinery out of user-facing copy — readers see one consistent,
 * production-grade voice regardless of which layer failed.
 *
 * Always console.error the raw err so devtools debugging still works.
 */

import { HttpError } from "./http";

/** Known PropMarketHook + USDT0 revert reasons mapped to user copy. */
const KNOWN_REVERTS: Record<string, string> = {
  "PropMarketHook__InvalidAmount": "Stake amount must be greater than zero",
  "PropMarketHook__MarketDeadlinePassed": "Staking has closed for this market",
  "PropMarketHook__InvalidOutcome": "Invalid side — pick OVER or UNDER",
  "USDT0__InsufficientBalance": "Insufficient USDT0 balance",
  "USDT0__InvalidAuthorization": "Authorization signature mismatch — try again",
  "USDT0__AuthorizationExpired": "Signature expired — sign again",
  "USDT0__AuthorizationUsed": "This authorization was already used",
};

interface ViemLikeError {
  name?: string;
  shortMessage?: string;
  message?: string;
  cause?: unknown;
  metaMessages?: string[];
  data?: { errorName?: string };
}

function asViem(err: unknown): ViemLikeError | null {
  if (err && typeof err === "object" && "name" in err) return err as ViemLikeError;
  return null;
}

function findViemErrorName(err: unknown, names: string[]): boolean {
  const v = asViem(err);
  if (!v) return false;
  if (v.name && names.includes(v.name)) return true;
  if (v.cause) return findViemErrorName(v.cause, names);
  return false;
}

/**
 * True if the error represents a wallet user clicking "Reject" on a sign
 * or chain-switch prompt. Useful for state machines that want to return
 * to "idle" instead of showing an angry error toast.
 */
export function isUserRejection(err: unknown): boolean {
  if (!err) return false;
  if (findViemErrorName(err, ["UserRejectedRequestError", "UserRejectedRequest"])) return true;
  const v = asViem(err);
  if (v?.shortMessage && /user rejected/i.test(v.shortMessage)) return true;
  if (v?.message && /user rejected/i.test(v.message)) return true;
  // EIP-1193 standard rejection code
  const code = (err as { code?: number }).code;
  if (code === 4001) return true;
  return false;
}

function extractRevertReason(err: unknown): string | null {
  const v = asViem(err);
  if (!v) return null;
  const fromData = v.data?.errorName;
  if (fromData) return fromData;
  // viem ContractFunctionRevertedError exposes the reason on the cause chain.
  if (v.cause) {
    const inner = extractRevertReason(v.cause);
    if (inner) return inner;
  }
  if (v.shortMessage) {
    const match = /reverted with the following reason:\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(
      v.shortMessage,
    );
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Map any thrown error / rejected promise reason into a user-safe sentence.
 * NEVER returns raw stack traces, viem internals, or fetch typeError text.
 */
export function cleanErrorMessage(err: unknown): string {
  // Side-effect: always preserve the raw err for devtools.
  // eslint-disable-next-line no-console
  console.error("[cleanErrorMessage] raw:", err);

  if (err instanceof HttpError) {
    return err.userMessage;
  }

  if (isUserRejection(err)) {
    return "Signature cancelled";
  }

  if (findViemErrorName(err, ["ChainMismatchError"])) {
    return "Wrong network — switch to X Layer";
  }

  if (findViemErrorName(err, ["InsufficientFundsError"])) {
    return "Relayer out of gas — please report";
  }

  // viem contract reverts come back as ContractFunctionExecutionError →
  // cause: ContractFunctionRevertedError. Reach down for the reason.
  const revert = extractRevertReason(err);
  if (revert) {
    const mapped = KNOWN_REVERTS[revert];
    if (mapped) return mapped;
    return `Transaction reverted: ${revert}`;
  }

  if (findViemErrorName(err, ["TransactionExecutionError"])) {
    const v = asViem(err);
    const short = v?.shortMessage ?? "transaction failed";
    return `Transaction failed: ${short}`;
  }

  // fetch network failures land as TypeError "Failed to fetch"
  if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
    return "Couldn't reach the relayer — check connection";
  }

  return "Something went wrong — try again. (See console for details)";
}
