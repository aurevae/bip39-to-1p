import test from "node:test";
import assert from "node:assert/strict";
import { buildWalletResult } from "../src/gen.js";
import {
  buildCreateArgs,
  buildItemTemplate,
  buildNoteContent,
} from "../src/onepassword.js";

const FIXED_MNEMONIC = "test test test test test test test test test test test junk";

test("buildNoteContent puts path and type metadata into notes", () => {
  const result = buildWalletResult(FIXED_MNEMONIC);
  const notes = buildNoteContent(result, "My Wallet Seed v1");

  assert.match(notes, /- EVM address: 0x/i);
  assert.match(notes, /  path: m\/44'\/60'\/0'\/0\/0/);
  assert.match(notes, /- BTC address: bc1q/i);
  assert.match(notes, /  type: P2WPKH \(Native SegWit\)/);
  assert.match(notes, /  path: m\/84'\/0'\/0'\/0\/0/);
  assert.match(notes, /- SOL address: /);
  assert.match(notes, /  path: m\/44'\/501'\/0'\/0'/);
});

test("buildItemTemplate puts sensitive content in a concealed stdin payload", () => {
  const result = buildWalletResult(FIXED_MNEMONIC);
  const notes = buildNoteContent(result, "My Wallet Seed v1");
  const template = buildItemTemplate(result, notes, "My Wallet Seed v1");

  assert.equal(template.title, "My Wallet Seed v1");
  assert.equal(template.category, "CRYPTO_WALLET");
  assert.deepEqual(template.fields, [
    {
      id: "recoveryPhrase",
      label: "Recovery phrase",
      type: "CONCEALED",
      value: result.mnemonic,
    },
    {
      id: "evmAddress",
      label: "EVM address",
      type: "STRING",
      value: result.chains.evm.address,
    },
    {
      id: "btcAddress",
      label: "BTC address",
      type: "STRING",
      value: result.chains.btc.address,
    },
    {
      id: "solAddress",
      label: "SOL address",
      type: "STRING",
      value: result.chains.sol.address,
    },
    {
      id: "notesPlain",
      label: "notesPlain",
      type: "STRING",
      purpose: "NOTES",
      value: notes,
    },
  ]);
});

test("buildCreateArgs carries no mnemonic or notes in process arguments", () => {
  const args = buildCreateArgs("Private");

  assert.deepEqual(args, [
    "item",
    "create",
    "--category=Crypto Wallet",
    "--vault=Private",
    "--format=json",
    "-",
  ]);
  assert.doesNotMatch(args.join(" "), /Recovery phrase|test test|Notes:/);
});
