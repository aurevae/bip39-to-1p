# bip39-to-1p

Local-first CLI to generate a BIP39 mnemonic, derive multi-chain addresses (EVM, BTC SegWit, SOL), and optionally save to 1Password as a Crypto Wallet item.

## Features
- Default 12-word mnemonic (supports 24).
- Derives: EVM `m/44'/60'/0'/0/0`, BTC Native SegWit `m/84'/0'/0'/0/0`, SOL `m/44'/501'/0'/0'`.
- Prints structured JSON to stdout for offline copy-paste.
- Optional 1Password save via `op` CLI using the Crypto Wallet category with dedicated fields (recovery phrase concealed, per-chain address/path, BTC type, notes).

## Requirements
- Node.js 18+ (ESM).
- `op` CLI signed in if using `--save`.

## Quick start
```bash
# install deps
npm install

# generate (default 12 words)
npm start

# 24 words
node index.js --words 24

# save to 1Password (Crypto Wallet item)
node index.js --save --title "My Wallet Seed v1" --vault "Private"
```

## CLI flags
- `--words <12|24>`: mnemonic size (default 12).
- `--save`/`--save-to-1p`: create a 1Password Crypto Wallet item.
- `--title <string>`: 1Password item title (default `My Wallet Seed v1`).
- `--vault <name>`: target vault (default `Private`).

## Output shape (stdout)
```json
{
  "mnemonic": "... 12 or 24 words ...",
  "chains": {
    "evm": { "path": "m/44'/60'/0'/0/0", "address": "0x..." },
    "btc": { "type": "P2WPKH (Native SegWit)", "path": "m/84'/0'/0'/0/0", "address": "bc1q..." },
    "sol": { "path": "m/44'/501'/0'/0'", "address": "..." }
  },
  "notes": [
    "Store this item in 1Password. Do NOT share.",
    "If you add a BIP39 passphrase (25th word), store it separately."
  ]
}
```

## 1Password save details
- Category: Crypto Wallet.
- Fields set:
  - `Recovery phrase` (concealed).
  - EVM/BTC/SOL `address` and `path`; BTC also stores `type`.
  - Notes include the safety reminders above.
- The CLI still prints JSON so you can verify or backfill manually.

## Security checklist
- Run offline for generation if possible.
- Keep `op` logged in only as needed; avoid shared vaults.
- If you add a BIP39 passphrase (25th word), store it separately from the mnemonic.
- Treat stdout and any saved files as sensitive; shred temporary copies.

## Project layout
- `index.js`: CLI entry.
- `src/gen.js`: mnemonic + derivations + CLI args.
- `src/onepassword.js`: 1Password integration (Crypto Wallet fields).
 - `PRD.md`: product spec.

## Development
```bash
npm start              # generate once
node index.js --save   # test 1Password save (requires op)
```

No tests yet; add integration tests before distribution.
