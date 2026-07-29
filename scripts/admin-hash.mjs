#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// npm run admin:hash
//
// Prompts for the admin password (input hidden, never echoed) and prints ONLY
// its bcrypt hash. The password itself never touches disk, argv, env, shell
// history, or any log — it exists in this process's memory for the duration
// of the hash and is gone.
//
// Set the printed value as ADMIN_PASSWORD_HASH in Vercel (Preview and
// Production). Wrap it in single quotes anywhere a shell is involved — bcrypt
// hashes contain `$`.
// ─────────────────────────────────────────────────────────────────────────────
import bcrypt from "bcryptjs";

const COST = 12;

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error("admin:hash needs an interactive terminal (input is hidden)."));
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch) => {
      if (ch === "") {
        // Ctrl-C
        cleanup();
        process.stdout.write("\n");
        process.exit(130);
      } else if (ch === "\r" || ch === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
      } else if (ch === "" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };
    stdin.on("data", onData);
  });
}

const pw = await promptHidden("Admin password (hidden): ");
if (pw.length < 12) {
  console.error("Refusing: use at least 12 characters.");
  process.exit(1);
}
const confirm = await promptHidden("Repeat to confirm     : ");
if (pw !== confirm) {
  console.error("Passwords do not match — nothing printed.");
  process.exit(1);
}

const hash = bcrypt.hashSync(pw, COST);
// Base64, not the raw hash: bcrypt hashes contain `$`, which dotenv-expand
// mangles in .env files even inside single quotes. Base64 survives every
// carrier — Vercel UI, .env files, shells. The app accepts either form.
const encoded = Buffer.from(hash, "utf8").toString("base64");
console.log("\nADMIN_PASSWORD_HASH (base64-wrapped — safe to paste anywhere):\n");
console.log(encoded);
console.log("\nDone. The password itself was not stored anywhere.");
