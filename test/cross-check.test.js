import test from "node:test";
import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { hmac } from "@noble/hashes/hmac";
import { sha256, sha512 } from "@noble/hashes/sha2";
import { keccak_256 } from "@noble/hashes/sha3";
import { ripemd160 } from "@noble/hashes/legacy";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bech32 } from "@scure/base";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { buildWalletResult } from "../src/gen.js";

const FIXED_MNEMONIC = "test test test test test test test test test test test junk";

const EXPECTED_ADDRESSES = {
  evm: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  btc: "bc1q4qw42stdzjqs59xvlrlxr8526e3nunw7mp73te",
  sol: "oeYf6KAJkLYhBuR8CiGc6L4D4Xtfepr85fuDgA9kq96",
};

function mnemonicToSeed(mnemonic, passphrase = "") {
  return pbkdf2Sync(
    mnemonic.normalize("NFKD"),
    `mnemonic${passphrase}`.normalize("NFKD"),
    2048,
    64,
    "sha512",
  );
}

function serializeUInt32(index) {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(index >>> 0, 0);
  return out;
}

function parsePath(path) {
  return path.split("/").slice(1).map((segment) => {
    const hardened = segment.endsWith("'");
    const value = Number.parseInt(
      hardened ? segment.slice(0, -1) : segment,
      10,
    );

    if (!Number.isInteger(value)) {
      throw new Error(`Invalid path segment: ${segment}`);
    }

    return hardened ? value + 0x80000000 : value;
  });
}

function bytesToBigInt(bytes) {
  return BigInt(`0x${bytesToHex(bytes)}`);
}

function bigIntTo32Bytes(value) {
  return Buffer.from(value.toString(16).padStart(64, "0"), "hex");
}

function deriveSecp256k1PrivateKey(seed, path) {
  let digest = hmac(sha512, utf8ToBytes("Bitcoin seed"), seed);
  let key = digest.slice(0, 32);
  let chainCode = digest.slice(32);

  for (const index of parsePath(path)) {
    const hardened = index >= 0x80000000;
    const data = hardened
      ? Buffer.concat([Buffer.from([0]), Buffer.from(key), serializeUInt32(index)])
      : Buffer.concat([
        Buffer.from(secp256k1.getPublicKey(key, true)),
        serializeUInt32(index),
      ]);

    digest = hmac(sha512, chainCode, data);

    const left = bytesToBigInt(digest.slice(0, 32));
    const parent = bytesToBigInt(key);
    const order = secp256k1.CURVE.n;

    if (left >= order) {
      throw new Error("Invalid secp256k1 child key");
    }

    const child = (left + parent) % order;
    if (child === 0n) {
      throw new Error("Derived secp256k1 key is zero");
    }

    key = bigIntTo32Bytes(child);
    chainCode = digest.slice(32);
  }

  return Buffer.from(key);
}

function deriveEd25519Slip10Seed(seed, path) {
  let digest = hmac(sha512, utf8ToBytes("ed25519 seed"), seed);
  let key = digest.slice(0, 32);
  let chainCode = digest.slice(32);

  for (const index of parsePath(path)) {
    if (index < 0x80000000) {
      throw new Error("SLIP-0010 ed25519 only supports hardened paths");
    }

    const data = Buffer.concat([
      Buffer.from([0]),
      Buffer.from(key),
      serializeUInt32(index),
    ]);

    digest = hmac(sha512, chainCode, data);
    key = digest.slice(0, 32);
    chainCode = digest.slice(32);
  }

  return Buffer.from(key);
}

function toChecksumAddress(address) {
  const lower = address.toLowerCase();
  const hash = bytesToHex(keccak_256(utf8ToBytes(lower)));
  let output = "0x";

  for (let i = 0; i < lower.length; i += 1) {
    const char = lower[i];
    output += /[a-f]/.test(char) && Number.parseInt(hash[i], 16) >= 8
      ? char.toUpperCase()
      : char;
  }

  return output;
}

function deriveEvmAddress(privateKey) {
  const publicKey = secp256k1.getPublicKey(privateKey, false).slice(1);
  const address = bytesToHex(keccak_256(publicKey).slice(-20));
  return toChecksumAddress(address);
}

function deriveBtcAddress(privateKey) {
  const publicKey = secp256k1.getPublicKey(privateKey, true);
  const witnessProgram = ripemd160(sha256(publicKey));
  return bech32.encode("bc", [0, ...bech32.toWords(witnessProgram)]);
}

function deriveSolAddress(privateSeed) {
  const publicKey = nacl.sign.keyPair.fromSeed(privateSeed).publicKey;
  return bs58.encode(Buffer.from(publicKey));
}

test("independent crypto libraries derive the same addresses for a fixed mnemonic", () => {
  const seed = mnemonicToSeed(FIXED_MNEMONIC);
  const crossChecked = {
    evm: deriveEvmAddress(deriveSecp256k1PrivateKey(seed, "m/44'/60'/0'/0/0")),
    btc: deriveBtcAddress(deriveSecp256k1PrivateKey(seed, "m/84'/0'/0'/0/0")),
    sol: deriveSolAddress(deriveEd25519Slip10Seed(seed, "m/44'/501'/0'/0'")),
  };
  const result = buildWalletResult(FIXED_MNEMONIC);

  assert.deepEqual(crossChecked, EXPECTED_ADDRESSES);
  assert.equal(result.chains.evm.address, crossChecked.evm);
  assert.equal(result.chains.btc.address, crossChecked.btc);
  assert.equal(result.chains.sol.address, crossChecked.sol);
});
