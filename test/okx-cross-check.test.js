import test from "node:test";
import assert from "node:assert/strict";
import { EthWallet } from "@okxweb3/coin-ethereum";
import { BtcWallet } from "@okxweb3/coin-bitcoin";
import { SolWallet } from "@okxweb3/coin-solana";
import { buildWalletResult } from "../src/gen.js";

const FIXED_MNEMONIC = "test test test test test test test test test test test junk";

const EXPECTED_ADDRESSES = {
  evm: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  btc: "bc1q4qw42stdzjqs59xvlrlxr8526e3nunw7mp73te",
  sol: "oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96",
};

test("OKX wallet SDK derives the same addresses for the fixed mnemonic", async () => {
  const ethWallet = new EthWallet();
  const btcWallet = new BtcWallet();
  const solWallet = new SolWallet();

  const ethPrivateKey = await ethWallet.getDerivedPrivateKey({
    mnemonic: FIXED_MNEMONIC,
    hdPath: "m/44'/60'/0'/0/0",
  });
  const btcPrivateKey = await btcWallet.getDerivedPrivateKey({
    mnemonic: FIXED_MNEMONIC,
    hdPath: "m/84'/0'/0'/0/0",
  });
  const solPrivateKey = await solWallet.getDerivedPrivateKey({
    mnemonic: FIXED_MNEMONIC,
    hdPath: "m/44'/501'/0'/0'",
  });

  const ethAddress = await ethWallet.getNewAddress({ privateKey: ethPrivateKey });
  const btcAddress = await btcWallet.getNewAddress({
    privateKey: btcPrivateKey,
    addressType: "segwit_native",
  });
  const solAddress = await solWallet.getNewAddress({ privateKey: solPrivateKey });

  const result = buildWalletResult(FIXED_MNEMONIC);

  assert.deepEqual(
    {
      evm: ethAddress.address,
      btc: btcAddress.address,
      sol: solAddress.address,
    },
    EXPECTED_ADDRESSES,
  );

  assert.equal(result.chains.evm.address.toLowerCase(), ethAddress.address);
  assert.equal(result.chains.btc.address, btcAddress.address);
  assert.equal(result.chains.sol.address, solAddress.address);
});
