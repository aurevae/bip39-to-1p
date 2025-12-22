import bip39 from "bip39";
import { Wallet as EvmWallet } from "ethers";
import { BIP32Factory } from "bip32";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { derivePath as deriveEd25519Path } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import { pathToFileURL } from "url";
import { buildNoteContent, saveToOnePassword } from "./onepassword.js";

const bip32 = BIP32Factory(ecc);

const DEFAULT_WORD_COUNT = 12;
const VALID_WORD_COUNTS = new Set([12, 24]);
const DEFAULT_TITLE = "My Wallet Seed v1";
const DEFAULT_VAULT = "Private";

const EVM_PATH = "m/44'/60'/0'/0/0";
const BTC_PATH = "m/84'/0'/0'/0/0";
const SOL_PATH = "m/44'/501'/0'/0'";

const BTC_TYPE = "P2WPKH (Native SegWit)";
function parseArgs(argv) {
  const options = {
    wordCount: DEFAULT_WORD_COUNT,
    saveTo1Password: false,
    title: DEFAULT_TITLE,
    vault: DEFAULT_VAULT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--save" || arg === "--save-to-1p") {
      options.saveTo1Password = true;
      continue;
    }

    if (arg === "--words" && argv[i + 1]) {
      options.wordCount = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg.startsWith("--words=")) {
      options.wordCount = Number(arg.split("=")[1]);
      continue;
    }

    if (arg === "--title" && argv[i + 1]) {
      options.title = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith("--title=")) {
      options.title = arg.split("=")[1];
      continue;
    }

    if (arg === "--vault" && argv[i + 1]) {
      options.vault = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith("--vault=")) {
      options.vault = arg.split("=")[1];
      continue;
    }
  }

  return options;
}

function getMnemonic(wordCount) {
  if (!VALID_WORD_COUNTS.has(wordCount)) {
    throw new Error("Word count must be 12 or 24");
  }

  const strength = wordCount === 24 ? 256 : 128;
  return bip39.generateMnemonic(strength);
}

function deriveEvmAddress(mnemonic) {
  const wallet = EvmWallet.fromPhrase(mnemonic, EVM_PATH);
  return wallet.address;
}

function deriveBitcoinAddress(seed) {
  const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
  const child = root.derivePath(BTC_PATH);
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network: bitcoin.networks.bitcoin,
  });

  if (!address) {
    throw new Error("Failed to derive BTC address");
  }

  return address;
}

function deriveSolAddress(seed) {
  const { key } = deriveEd25519Path(SOL_PATH, seed.toString("hex"));
  const keypair = Keypair.fromSeed(Buffer.from(key));
  return keypair.publicKey.toBase58();
}

function main() {
  return run();
}

export function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const mnemonic = getMnemonic(args.wordCount);
  const seed = bip39.mnemonicToSeedSync(mnemonic);

  const result = {
    mnemonic,
    chains: {
      evm: {
        path: EVM_PATH,
        address: deriveEvmAddress(mnemonic),
      },
      btc: {
        type: BTC_TYPE,
        path: BTC_PATH,
        address: deriveBitcoinAddress(seed),
      },
      sol: {
        path: SOL_PATH,
        address: deriveSolAddress(seed),
      },
    },
    notes: [
      "Store this item in 1Password. Do NOT share.",
      "If you add a BIP39 passphrase (25th word), store it separately.",
    ],
  };

  let saveError = null;

  if (args.saveTo1Password) {
    const noteContent = buildNoteContent(result, args.title);
    try {
      const saved = saveToOnePassword(
        result,
        noteContent,
        {
          title: args.title,
          vault: args.vault,
        },
      );
      result.onePassword = saved;
    } catch (err) {
      saveError = err;
    }
  }

  console.log(JSON.stringify(result, null, 2));

  if (saveError) {
    const message =
      saveError instanceof Error ? saveError.message : String(saveError);
    throw new Error(`1Password save failed: ${message}`);
  }

  return result;
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
