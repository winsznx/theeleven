import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { Address } from "viem";
import type { WebDeployment } from "@/lib/deployment";
import type { MarketRow } from "@/types/market";

const FAKE_FACTORY = "0xdeadbeef1234deadbeef1234deadbeef12345678" as Address;
const REGISTA_WALLET = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Address;

function makeDeployment(factory: Address | null): WebDeployment {
  return {
    chainId: 196,
    network: "xlayer-mainnet",
    factory,
    resolver: null,
    poolManager: "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32" as Address,
    usdt0: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
    deployedAtBlock: factory ? 1n : null,
    deployedAtISO: null,
    agentsByPersona: factory ? { "il-regista": REGISTA_WALLET } : null,
    personaByAgent: factory ? new Map([[REGISTA_WALLET, "il-regista"]]) : null,
    version: "test",
  };
}

let currentDeployment: WebDeployment = makeDeployment(null);
let currentMarkets: { markets: MarketRow[] | null; loading: boolean; error: string | null } = {
  markets: null,
  loading: false,
  error: null,
};

vi.mock("@/hooks/useFactoryDeployment", () => ({
  useFactoryDeployment: () => currentDeployment,
}));
vi.mock("@/hooks/useMarkets", () => ({
  useMarkets: () => ({ ...currentMarkets, refetch: vi.fn() }),
}));

import { PersonaDetailView } from "@/components/dapp/PersonaDetailView";

describe("PersonaDetailView", () => {
  beforeEach(() => {
    currentDeployment = makeDeployment(FAKE_FACTORY);
    currentMarkets = { markets: [], loading: false, error: null };
  });

  it("renders persona name, templates and recent-markets section for every persona", () => {
    // #given a persona slug + factory deployed
    // #when the detail view renders
    render(<PersonaDetailView slug="il-regista" />);
    // #then the persona is identified and the templates are listed
    expect(
      screen.getByRole("heading", { level: 1, name: /il regista/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Clean sheet")).toBeInTheDocument();
    expect(screen.getByText("Possession")).toBeInTheDocument();
    expect(screen.getByText("Corners")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /recent markets/i }),
    ).toBeInTheDocument();
  });

  it("a former-standby persona now renders the same active layout", () => {
    // #given Il Bomber (previously standby in P15-P20)
    // #when the detail view renders
    render(<PersonaDetailView slug="il-bomber" />);
    // #then it has a templates list + recent-markets section, no 'Activates June 11'
    expect(screen.queryByText(/activates june 11/i)).toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: /recent markets/i }),
    ).toBeInTheDocument();
  });

  it("PersonaWalletBadge renders OKLink href when wallet is registered", () => {
    // #given Il Regista with a known on-chain wallet
    // #when the detail view renders
    const { container } = render(<PersonaDetailView slug="il-regista" />);
    // #then the wallet link points at OKLink
    const a = container.querySelector(`a[data-oklink-address="${REGISTA_WALLET}"]`);
    expect(a).not.toBeNull();
    expect(a!.getAttribute("href")).toBe(
      `https://www.oklink.com/x-layer/address/${REGISTA_WALLET}`,
    );
  });

  it("invalid slug short-circuits with 'Persona not found'", () => {
    // #given a non-existent slug
    // #when the detail view renders
    // @ts-expect-error — intentionally bypass slug type for the negative test.
    render(<PersonaDetailView slug="il-fake-nine" />);
    // #then the not-found copy appears
    expect(screen.getByText(/persona not found/i)).toBeInTheDocument();
  });
});
