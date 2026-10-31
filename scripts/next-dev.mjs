#!/usr/bin/env node
// Starts `next dev` on the preferred port, or the next free one if it's taken.
// Usage (from an app folder): node ../../scripts/next-dev.mjs 3000
import { spawn } from "node:child_process";
import net from "node:net";

const preferred = Number(process.argv[2] ?? 3000);
const MAX_TRIES = 50;

function isFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    // No host: binds the dual-stack wildcard, the same address Next listens on.
    server.listen({ port }, () => server.close(() => resolve(true)));
  });
}

async function findPort(start) {
  for (let port = start; port < start + MAX_TRIES; port++) {
    if (await isFree(port)) return port;
  }
  throw new Error(`No free port found between ${start} and ${start + MAX_TRIES - 1}`);
}

const port = await findPort(preferred);
if (port !== preferred) {
  console.log(`\x1b[33m⚠ Port ${preferred} is in use, starting on ${port} instead.\x1b[0m`);
}

const child = spawn("next", ["dev", "-p", String(port)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
