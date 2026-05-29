import { mnemonicToAccount, generateMnemonic, english } from "viem/accounts";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const AGENT_NAMES = [
  "Il Regista",
  "Il Trequartista",
  "Il Mediano",
  "Il Falso Nove",
  "Il Libero",
  "L'Ala",
  "Il Bomber",
  "Il Capitano",
  "Il Numero Dieci",
  "Il Catenaccio",
  "L'Ultimo",
] as const;

const CACHE_PATH = resolve(process.cwd(), ".cache/agents.json");

function warnMnemonic(mnemonic: string) {
  const bar = "=".repeat(78);
  process.stdout.write(`\n${bar}\n`);
  process.stdout.write("WARNING — fresh master mnemonic generated. SAVE THIS OFFLINE.\n");
  process.stdout.write("NEVER COMMIT. NEVER SHARE. Treat this string as a master key.\n");
  process.stdout.write("This is the ONLY time it will be printed.\n");
  process.stdout.write(`${bar}\n`);
  process.stdout.write(`MASTER_MNEMONIC="${mnemonic}"\n`);
  process.stdout.write(`${bar}\n\n`);
  process.stdout.write("Copy the line above into your .env (gitignored) before continuing.\n\n");
}

function main() {
  let mnemonic = process.env.MASTER_MNEMONIC;
  if (!mnemonic) {
    mnemonic = generateMnemonic(english, 256); // 24 words
    warnMnemonic(mnemonic);
  }

  const records = AGENT_NAMES.map((name, index) => {
    const account = mnemonicToAccount(mnemonic!, { addressIndex: index });
    return { index, name, address: account.address };
  });

  process.stdout.write("# Paste into .env (gitignored):\n");
  for (const r of records) {
    process.stdout.write(`AGENT_${r.index}_ADDR=${r.address}\n`);
  }
  process.stdout.write("\n");

  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(records, null, 2) + "\n");
  process.stdout.write(`Wrote ${CACHE_PATH}\n`);
}

main();
