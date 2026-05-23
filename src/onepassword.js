import { spawn } from "child_process";

export function buildNoteContent(result, title) {
  const lines = [
    title,
    "",
    "Chains:",
    `- EVM address: ${result.chains.evm.address}`,
    `  path: ${result.chains.evm.path}`,
    `- BTC address: ${result.chains.btc.address}`,
    `  type: ${result.chains.btc.type}`,
    `  path: ${result.chains.btc.path}`,
    `- SOL address: ${result.chains.sol.address}`,
    `  path: ${result.chains.sol.path}`,
    "",
    "Notes:",
    ...result.notes,
  ];

  return lines.join("\n");
}

export function buildItemTemplate(result, noteContent, title) {
  return {
    title,
    category: "CRYPTO_WALLET",
    fields: [
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
        value: noteContent,
      },
    ],
  };
}

export function buildCreateArgs(vault) {
  return [
    "item",
    "create",
    "--category=Crypto Wallet",
    `--vault=${vault}`,
    "--format=json",
    "-",
  ];
}

function runCommand(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    if (input !== undefined) {
      child.stdin.on("error", (error) => {
        if (error.code !== "EPIPE") {
          reject(error);
        }
      });
      child.stdin.end(input);
    }

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (status) => {
      resolve({
        status,
        stdout,
        stderr,
      });
    });
  });
}

export async function saveToOnePassword(result, noteContent, { title, vault }) {
  const cliCheck = await runCommand("op", ["--version"]);
  if (cliCheck.status !== 0) {
    const message =
      cliCheck.stderr ||
      cliCheck.stdout ||
      "1Password CLI (op) not available or not signed in.";
    throw new Error(message.trim());
  }

  const template = buildItemTemplate(result, noteContent, title);
  const created = await runCommand(
    "op",
    buildCreateArgs(vault),
    JSON.stringify(template),
  );

  if (created.status !== 0) {
    const message =
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
