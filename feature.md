# PRD / Spec：本地生成助记词与多链地址，并保存到 1Password（MVP）

## 1. 背景与目标

### 背景
用户希望自己掌控钱包助记词（BIP39），并在本地生成多链地址。为了方便管理与降低丢失风险，用户希望把助记词与推导出的地址/路径信息保存到 1Password 中。

### MVP 目标
- 在本地（离线优先）生成 BIP39 助记词（默认 24 词）
- 基于同一助记词推导多链地址（MVP：EVM/ETH + BTC + SOL）
- 将以下信息保存到 1Password（先不做密文加密版本）：
  - 助记词（mnemonic）
  - 多链地址（address）
  - 推导路径（derivation paths）
  - 地址类型（例如 BTC SegWit）
  - 创建时间、备注、版本号等元数据

### 非目标（MVP 不做）
- 不做 passkey/PRF 参与的解密恢复流程
- 不做 “密文备份 blob” 方案（后续可升级）
- 不做链上交易/签名/发送资产
- 不做多设备同步与恢复策略（依赖 1Password）

---

## 2. 用户故事

- US1：我想在本地生成一个全新的助记词，并拿到 ETH/BTC/SOL 地址。
- US2：我想把助记词和地址/路径保存进 1Password，方便未来找回。
- US3：我想清楚知道每条链的 derivation path 和 BTC 地址类型，避免未来迁移出错。
- US4：我希望生成过程尽量离线，降低助记词泄露风险。

---

## 3. 安全要求（MVP）

### 基本要求
- 助记词只在本机生成，不上传任何服务器。
- 推荐离线生成（断网 / 干净环境 / Live USB 等）。
- 1Password 条目不可共享（禁止家庭/团队共享此条目）。
- 1Password 主密码强度要足够并开启 2FA（用户侧配置）。

### 风险提示
- 一旦把助记词明文存入 1Password，任何能解锁 1Password 的人都能完全控制资产。
- 不要在不可信设备或装有可疑浏览器扩展的环境里查看/复制助记词。

---

## 4. 功能需求（FR）

### FR1：生成助记词
- 默认生成 24 词（256-bit entropy）。
- 支持配置 12 词（128-bit entropy）。
- 输出助记词（mnemonic）为字符串。

### FR2：推导多链地址（MVP）
#### EVM (ETH)
- Derivation path：`m/44'/60'/0'/0/0`
- 输出：`address`（0x 开头）

#### BTC（主网）
- 默认地址类型：Native SegWit (P2WPKH, bc1q...)
- Derivation path：`m/84'/0'/0'/0/0`
- 输出：`address`（bc1q...）

> 备注：后续可扩展 Taproot（BIP86, bc1p...）与 Legacy（BIP44, 1...）。

#### SOL
- Derivation path：`m/44'/501'/0'/0'`
- 输出：`address`（Base58）

### FR3：输出结构化结果
- 输出一个 JSON（或等价结构）包含：
  - `version`
  - `createdAt`（ISO8601）
  - `mnemonic`
  - `chains`：包含 evm/btc/sol 的 `path`、`address`、以及 btc 的 `type`

### FR4：保存到 1Password（手动版）
- MVP：将 JSON 内容复制粘贴到 1Password 的 Notes 字段。
- 条目标题建议包含版本号：`My Wallet Seed v1`
- Notes 中必须包含：
  - 助记词
  - 各链地址/路径
  - BTC 地址类型
  - 安全提示/备注

> 备注：后续可扩展为自动写入 1Password（op CLI），但 MVP 先手动粘贴。

---

## 5. 命令行工具（实现建议，MVP）

### 技术栈
- Node.js（ESM）
- 依赖建议：
  - `bip39`
  - `ethers`（EVM 地址推导）
  - `bitcoinjs-lib` + `bip32` + `tiny-secp256k1`（BTC）
  - `@solana/web3.js` + `ed25519-hd-key`（SOL）

### CLI 行为
- 命令：`node gen.js`
- 输出：打印 JSON 到 stdout（用户复制到 1Password）

---

## 6. 输出示例（JSON 结构）

```json
{
  "version": "v1",
  "createdAt": "2025-12-22T00:00:00.000Z",
  "mnemonic": "example ... words",
  "chains": {
    "evm": {
      "path": "m/44'/60'/0'/0/0",
      "address": "0x..."
    },
    "btc": {
      "type": "P2WPKH (Native SegWit)",
      "path": "m/84'/0'/0'/0/0",
      "address": "bc1q..."
    },
    "sol": {
      "path": "m/44'/501'/0'/0'",
      "address": "..."
    }
  },
  "notes": [
    "Store this item in 1Password. Do NOT share.",
    "If you add a BIP39 passphrase (25th word), store it separately."
  ]
}
