import test from "node:test";
import assert from "node:assert/strict";
import bip39 from "bip39";
import {
  buildWalletResult,
  generateMnemonic,
  parseArgs,
  run,
} from "../src/gen.js";

const FIXED_MNEMONIC = "test test test test test test test test test test test junk";

const FIXED_ADDRESSES = {
  evm: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  btc: "bc1q4qw42stdzjqs59xvlrlxr8526e3nunw7mp73te",
  sol: "oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96",
};

async function captureRun(argv) {
  const originalLog = console.log;
  const calls = [];
  console.log = (...args) => {
    calls.push(args.join(" "));
  };

  try {
    const result = await run(argv);
    return {
      result,
      stdout: calls,
    };
  } finally {
    console.log = originalLog;
  }
}

test("generateMnemonic creates a valid 12-word mnemonic by default", () => {
  const mnemonic = generateMnemonic();

  assert.equal(mnemonic.split(" ").length, 12);
  assert.equal(bip39.validateMnemonic(mnemonic), true);
});

test("generateMnemonic creates a valid 24-word mnemonic when requested", () => {
  const mnemonic = generateMnemonic(24);

  assert.equal(mnemonic.split(" ").length, 24);
  assert.equal(bip39.validateMnemonic(mnemonic), true);
});

test("generateMnemonic rejects unsupported word counts", () => {
  assert.throws(
    () => generateMnemonic(18),
    /Word count must be 12 or 24/,
  );
});

test("parseArgs defaults vault to Private when omitted", () => {
  assert.deepEqual(parseArgs(["--save"]), {
    wordCount: 12,
    saveTo1Password: true,
    title: "My Wallet Seed v1",
    vault: "Private",
  });
});

test("parseArgs falls back to Private when vault is blank", () => {
  assert.equal(parseArgs(["--save", "--vault="]).vault, "Private");
  assert.equal(parseArgs(["--save", "--vault", "   "]).vault, "Private");
});

test("buildWalletResult derives the expected EVM, BTC, and SOL addresses", () => {
  const result = buildWalletResult(FIXED_MNEMONIC);

  assert.equal(result.mnemonic, FIXED_MNEMONIC);
  assert.deepEqual(result.chains, {
    evm: {
      path: "m/44'/60'/0'/0/0",
      address: FIXED_ADDRESSES.evm,
    },
    btc: {
      type: "P2WPKH (Native SegWit)",
      path: "m/84'/0'/0'/0/0",
      address: FIXED_ADDRESSES.btc,
    },
    sol: {
      path: "m/44'/501'/0'/0'",
      address: FIXED_ADDRESSES.sol,
    },
  });
});

test("buildWalletResult rejects invalid mnemonics", () => {
  assert.throws(
    () => buildWalletResult("not a valid mnemonic"),
    /Invalid BIP39 mnemonic/,
  );
});

test("run honors --words=24 and prints the same JSON it returns", async () => {
  const { result, stdout } = await captureRun(["--words=24"]);

  assert.equal(result.mnemonic.split(" ").length, 24);
  assert.equal(stdout.length, 1);
  assert.deepEqual(JSON.parse(stdout[0]), result);
});
