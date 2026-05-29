// Public entry — the named exports below are the stable API surface for
// the @regista11/x402-facilitator npm package.

export {
  XLayerFacilitatorClient,
  type XLayerFacilitatorConfig,
} from "./XLayerFacilitatorClient.js";

export {
  type TransferAuthorization,
  computeDomainSeparator,
  recoverTransferSigner,
  splitSignature,
} from "./eip712.js";

export { SettlementCache } from "./cache.js";

export {
  USDT0_ADDRESS,
  USDT0_CHAIN_ID,
  USDT0_NETWORK,
  USDT0_DOMAIN_NAME,
  USDT0_DOMAIN_VERSION,
  USDT0_DECIMALS,
  USDT0_ABI,
  EXPECTED_DOMAIN_SEPARATOR,
  TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
  RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
} from "./usdt0.js";
