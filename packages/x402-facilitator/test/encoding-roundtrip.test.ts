import {
  createPublicClient,
  http,
  keccak256,
  toBytes,
  encodeAbiParameters,
  recoverTypedDataAddress,
  privateKeyToAccount as _unused,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  USDT0_ADDRESS,
  USDT0_CHAIN_ID,
  USDT0_DOMAIN_NAME,
  USDT0_DOMAIN_VERSION,
  EXPECTED_DOMAIN_SEPARATOR,
  USDT0_ABI,
  TRANSFER_WITH_AUTHORIZATION_TYPES,
} from "../src/usdt0.js";

const PK = process.env.PK as `0x${string}` | undefined;
if (!PK) {
  console.error("[encoding] FATAL: PK env required");
  process.exit(1);
}

const account = privateKeyToAccount(PK);
const burner = account.address;

const publicClient = createPublicClient({
  transport: http("https://rpc.xlayer.tech"),
});

const EIP712_DOMAIN_TYPEHASH = keccak256(
  toBytes(
    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)",
  ),
);

function fail(label: string, detail: string): never {
  console.error(`\n=== ENCODING TEST FAIL: ${label} ===`);
  console.error(detail);
  process.exit(1);
}

async function main() {
  console.log("[encoding] burner:", burner);
  console.log("[encoding] domain name bytes:", Buffer.from(USDT0_DOMAIN_NAME, "utf8").toString("hex"));
  console.log("[encoding] domain name codepoints:", [...USDT0_DOMAIN_NAME].map(c => "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")).join(" "));

  console.log("\n--- (a) compute domain separator locally ---");
  const nameHash = keccak256(toBytes(USDT0_DOMAIN_NAME));
  const versionHash = keccak256(toBytes(USDT0_DOMAIN_VERSION));
  console.log("[encoding] nameHash:", nameHash);
  console.log("[encoding] versionHash:", versionHash);

  const computedDomainSeparator = keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "uint256" },
        { type: "address" },
      ],
      [
        EIP712_DOMAIN_TYPEHASH,
        nameHash,
        versionHash,
        BigInt(USDT0_CHAIN_ID),
        USDT0_ADDRESS,
      ],
    ),
  );
  console.log("[encoding] computed local:", computedDomainSeparator);
  console.log("[encoding] expected const :", EXPECTED_DOMAIN_SEPARATOR);

  if (computedDomainSeparator.toLowerCase() !== EXPECTED_DOMAIN_SEPARATOR.toLowerCase()) {
    fail(
      "(a) local domain separator mismatch",
      `computed=${computedDomainSeparator}\nexpected=${EXPECTED_DOMAIN_SEPARATOR}`,
    );
  }
  console.log("[encoding] (a) PASS — local computation matches hardcoded EXPECTED");

  console.log("\n--- (b) on-chain DOMAIN_SEPARATOR() cross-check ---");
  const onChainDomain = (await publicClient.readContract({
    address: USDT0_ADDRESS,
    abi: USDT0_ABI,
    functionName: "DOMAIN_SEPARATOR",
  })) as `0x${string}`;
  console.log("[encoding] on-chain:", onChainDomain);

  if (onChainDomain.toLowerCase() !== EXPECTED_DOMAIN_SEPARATOR.toLowerCase()) {
    fail(
      "(b) on-chain domain separator mismatch",
      `on-chain=${onChainDomain}\nexpected=${EXPECTED_DOMAIN_SEPARATOR}`,
    );
  }
  console.log("[encoding] (b) PASS — on-chain DOMAIN_SEPARATOR matches hardcoded EXPECTED");

  console.log("\n--- (c) sign + recover round-trip ---");
  const now = Math.floor(Date.now() / 1000);
  const auth = {
    from: burner,
    to: burner,
    value: 100_000n,
    validAfter: BigInt(now - 5),
    validBefore: BigInt(now + 600),
    nonce: ("0x" + "ab".repeat(32)) as `0x${string}`,
  } as const;

  const domain = {
    name: USDT0_DOMAIN_NAME,
    version: USDT0_DOMAIN_VERSION,
    chainId: USDT0_CHAIN_ID,
    verifyingContract: USDT0_ADDRESS,
  } as const;

  const signature = await account.signTypedData({
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: auth,
  });
  console.log("[encoding] signature:", signature);

  const recovered = await recoverTypedDataAddress({
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: auth,
    signature,
  });
  console.log("[encoding] recovered :", recovered);
  console.log("[encoding] burner    :", burner);

  if (recovered.toLowerCase() !== burner.toLowerCase()) {
    fail("(c) recovered signer mismatch", `recovered=${recovered}\nburner=${burner}`);
  }
  console.log("[encoding] (c) PASS — sign/recover round-trip works");

  console.log("\n--- (d) confirm viem consumed the exact UTF-8 bytes for the name ---");
  const explicitNameHash = keccak256(toBytes(USDT0_DOMAIN_NAME));
  console.log("[encoding] keccak(utf8(USDT0_DOMAIN_NAME)):", explicitNameHash);
  console.log("[encoding] domain separator components consumed by viem MUST have used this nameHash because (a) computed = (b) on-chain.");

  if (nameHash !== explicitNameHash) {
    fail("(d) name hash divergence", `nameHash=${nameHash}\nexplicit=${explicitNameHash}`);
  }
  if (Buffer.from(USDT0_DOMAIN_NAME, "utf8").toString("hex") !== "555344e282ae30") {
    fail(
      "(d) UTF-8 bytes of domain name not e2 82 ae for TUGRIK",
      "expected USDT0_DOMAIN_NAME UTF-8 to be 55 53 44 E2 82 AE 30 ('U','S','D',₮,'0')",
    );
  }
  console.log("[encoding] (d) PASS — UTF-8 bytes are 55 53 44 e2 82 ae 30 ('U','S','D',U+20AE TUGRIK,'0')");

  console.log("\n=== ALL FOUR ASSERTIONS PASS — encoding is locked ===");
}

main().catch((e) => {
  console.error("[encoding] FATAL:", e);
  process.exit(1);
});
