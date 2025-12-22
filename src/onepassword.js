import { spawnSync } from "child_process";

export function buildNoteContent(result, title) {
  const lines = [
    title,
    "",
    "Chains:",
    `- EVM: ${result.chains.evm.address} | ${result.chains.evm.path}`,
    `- BTC (${result.chains.btc.type}): ${result.chains.btc.address} | ${result.chains.btc.path}`,
    `- SOL: ${result.chains.sol.address} | ${result.chains.sol.path}`,
    "",
    "Notes:",
    ...result.notes,
  ];

  return lines.join("\n");
}

function buildAssignments(result, noteContent) {
  const assignments = [
    `Recovery phrase[concealed]=${result.mnemonic}`,
    `EVM.address[text]=${result.chains.evm.address}`,
    `EVM.path[text]=${result.chains.evm.path}`,
    `BTC.address[text]=${result.chains.btc.address}`,
    `BTC.path[text]=${result.chains.btc.path}`,
    `BTC.type[text]=${result.chains.btc.type}`,
    `SOL.address[text]=${result.chains.sol.address}`,
    `SOL.path[text]=${result.chains.sol.path}`,
    `notesPlain=${noteContent}`,
  ];

  return assignments;
}

export function saveToOnePassword(result, noteContent, { title, vault }) {
  const cliCheck = spawnSync("op", ["--version"], { encoding: "utf8" });
  if (cliCheck.error || cliCheck.status !== 0) {
    const message =
      cliCheck.error?.message ||
      cliCheck.stderr ||
      cliCheck.stdout ||
      "1Password CLI (op) not available or not signed in.";
    throw new Error(message.trim());
  }

  const args = [
    "item",
    "create",
    "--category=Crypto Wallet",
    `--title=${title}`,
    `--vault=${vault}`,
    "--format=json",
    ...buildAssignments(result, noteContent),
  ];

  const created = spawnSync("op", args, { encoding: "utf8" });

  if (created.error || created.status !== 0) {
    const message =
      created.error?.message ||
      created.stderr ||
      created.stdout ||
      "Failed to create 1Password item.";
    throw new Error(message.trim());
  }

  let parsed;
  try {
    parsed = JSON.parse(created.stdout);
  } catch {
    throw new Error(
      "1Password CLI responded with non-JSON output; check your op version.",
    );
  }

  return {
    id: parsed.id,
    title: parsed.title ?? title,
    vault: parsed.vault?.name ?? vault,
    url: Array.isArray(parsed.urls) ? parsed.urls[0]?.href : undefined,
  };
}
