import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mailFile = process.env.E2E_MAIL_FILE || "/tmp/furniro-e2e-mail.txt";

function portOpen(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

export default async function globalSetup() {
  if (!(await portOpen(2525))) {
    const child = spawn(process.execPath, [path.join(root, "e2e/smtp-sink.mjs")], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, E2E_MAIL_FILE: mailFile, E2E_SMTP_PORT: "2525" },
    });
    child.unref();
  }

  const health = await fetch("http://localhost:5000/");
  if (!health.ok) {
    throw new Error("Backend chưa chạy tại http://localhost:5000");
  }
  const front = await fetch("http://localhost:3000/");
  if (!front.ok) {
    throw new Error("Vite chưa chạy tại http://localhost:3000");
  }

  const products = (await (await fetch("http://localhost:5000/api/products?limit=1")).json()) as {
    pagination?: { total?: number };
  };
  if (!products.pagination || (products.pagination.total ?? 0) < 1) {
    execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/seed-storefront-dev.ts"], {
      cwd: path.resolve(root, "../BACK_END"),
      stdio: "inherit",
    });
  }
}
