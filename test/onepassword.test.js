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
  assert.equal(template.category, "CUSTOM");
  assert.equal(template.category_id, "115");
  assert.deepEqual(template.sections, [{ id: "wallet", label: "Wallet" }]);
  assert.deepEqual(template.fields, [
    {
      id: "notesPlain",
      type: "STRING",
      purpose: "NOTES",
      label: "notesPlain",
      value: notes,
    },
    {
      id: "recoveryPhrase",
      type: "CONCEALED",
      label: "recovery phrase",
      value: result.mnemonic,
    },
    {
      id: "password",
      type: "CONCEALED",
      label: "password",
      value: "",
    },
    {
      id: "walletAddress",
      section: { id: "wallet", label: "Wallet" },
      type: "STRING",
      label: "wallet address",
      value: result.chains.evm.address,
    },
    {
      id: "btcAddress",
      section: { id: "wallet", label: "Wallet" },
      type: "STRING",
      label: "BTC address",
      value: result.chains.btc.address,
    },
    {
      id: "solAddress",
      section: { id: "wallet", label: "Wallet" },
      type: "STRING",
      label: "SOL address",
      value: result.chains.sol.address,
    },
  ]);
});

test("buildCreateArgs carries no mnemonic or notes in process arguments", () => {
  const args = buildCreateArgs("Private");

  assert.deepEqual(args, [
    "item",
    "create",
    "--vault=Private",
    "--format=json",
    "--template=/dev/stdin",
  ]);
  assert.doesNotMatch(args.join(" "), /Recovery phrase|test test|Notes:/);
});
