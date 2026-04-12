import test from "node:test";
import assert from "node:assert/strict";
import { buildWalletResult } from "../src/gen.js";
import { buildAssignments, buildNoteContent } from "../src/onepassword.js";

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

test("buildAssignments only saves address fields and leaves metadata in notes", () => {
  const result = buildWalletResult(FIXED_MNEMONIC);
  const notes = buildNoteContent(result, "My Wallet Seed v1");
  const assignments = buildAssignments(result, notes);

  assert.deepEqual(assignments, [
    `Recovery phrase[concealed]=${result.mnemonic}`,
    `EVM.address[text]=${result.chains.evm.address}`,
    `BTC.address[text]=${result.chains.btc.address}`,
    `SOL.address[text]=${result.chains.sol.address}`,
    `notesPlain=${notes}`,
  ]);
});
