import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  rainbowWallet,
  coinbaseWallet,
  walletConnectWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { mainnet, xLayer } from "wagmi/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

/**
 * WalletConnect projectId.
 *
 * Strict: in production we require NEXT_PUBLIC_WC_PROJECT_ID to be set.
 * For build/preview without env (and tests/CI), we fall back to a placeholder
 * + warn — the wallet button still renders but the WalletConnect modal
 * won't open. RainbowKit's connectors still work without it; only
 * walletConnectWallet is gated.
 */
const PROJECT_ID =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "regista11-placeholder-projectid";

if (
  typeof window !== "undefined" &&
  PROJECT_ID === "regista11-placeholder-projectid"
) {
  // eslint-disable-next-line no-console
  console.warn(
    "[wagmi] NEXT_PUBLIC_WC_PROJECT_ID is not set; using placeholder. WalletConnect won't open.",
  );
}

// RainbowKit wallets for the browser (regular dApp visitors).
const browserConnectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, coinbaseWallet, rainbowWallet, walletConnectWallet, injectedWallet],
    },
  ],
  {
    appName: "Regista 11",
    projectId: PROJECT_ID,
  },
);

/**
 * Config wires two surfaces:
 *
 *   1. Browser visitors → RainbowKit's standard modal (MetaMask / Coinbase /
 *      Rainbow / WalletConnect / any EIP-1193 injected provider).
 *
 *   2. Inside a Farcaster Mini App host (the user opened /market/<addr>
 *      from a cast embed) → farcasterMiniApp() auto-connects to the user's
 *      Farcaster-linked wallet via the SDK's EIP-1193 provider. No modal,
 *      no wallet selection — `useAccount()` reports them connected on mount
 *      and `useSignTypedData()` routes to the host wallet for the EIP-3009
 *      authorization our facilitator settles.
 *
 * Mini App connector is listed FIRST so wagmi's auto-connect prefers it
 * when the host is reachable; outside Farcaster it's a no-op and the
 * standard RainbowKit modal handles connection like before.
 */
export const wagmiConfig = createConfig({
  connectors: [farcasterMiniApp(), ...browserConnectors],
  chains: [xLayer, mainnet],
  transports: {
    [xLayer.id]: http("https://rpc.xlayer.tech"),
    [mainnet.id]: http(),
  },
  ssr: true,
});
