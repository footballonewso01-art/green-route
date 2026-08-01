import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const workspace = process.cwd();
const port = process.env.LINKTERY_SMOKE_PORT || "8787";
const baseUrl = `http://127.0.0.1:${port}`;
const releaseManifestPath = path.join(
  workspace,
  "dist-cloudflare",
  "_linktery",
  "release.json",
);
if (!fs.existsSync(releaseManifestPath)) {
  throw new Error("Cloudflare release manifest is missing; run a release build first.");
}
const releaseManifest = JSON.parse(
  fs.readFileSync(releaseManifestPath, "utf8"),
);
const deployEnvironment = releaseManifest.deployEnvironment;
if (!["production", "staging"].includes(deployEnvironment)) {
  throw new Error(`Unsupported Cloudflare release environment: ${deployEnvironment}`);
}
const routingMode = process.argv[2] || "primary";
if (!["primary", "alias"].includes(routingMode)) {
  throw new Error(`Unsupported Cloudflare routing mode: ${routingMode}`);
}
if (routingMode === "alias" && deployEnvironment !== "production") {
  throw new Error("Alias smoke tests require a production artifact.");
}
const wranglerCli = path.join(
  workspace,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);
let runtimeOutput = "";

const wranglerEnvironmentArgs =
  routingMode === "alias"
    ? ["--env", "alias"]
    : deployEnvironment === "staging"
      ? ["--env", "staging"]
      : [];
const runtime = spawn(
  process.execPath,
  [
    wranglerCli,
    "dev",
    ...wranglerEnvironmentArgs,
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    port,
  ],
  {
    cwd: workspace,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

for (const stream of [runtime.stdout, runtime.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    runtimeOutput = `${runtimeOutput}${chunk}`.slice(-20_000);
  });
}

async function waitUntilReady() {
  const deadline = Date.now() + 30_000;
  const expectedStatus = routingMode === "alias" ? 308 : 200;
  while (Date.now() < deadline) {
    if (runtime.exitCode !== null) {
      throw new Error(`Wrangler exited before startup.\n${runtimeOutput}`);
    }
    try {
      const response = await fetch(baseUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status === expectedStatus) return;
    } catch {
      // The local port is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Wrangler did not become ready in 30 seconds.\n${runtimeOutput}`);
}

function stopRuntime() {
  if (runtime.exitCode === null && runtime.pid && process.platform === "win32") {
    const termination = spawnSync(
      "taskkill",
      ["/pid", String(runtime.pid), "/T", "/F"],
      {
        stdio: "ignore",
        timeout: 10_000,
        windowsHide: true,
      },
    );
    if (termination.error) {
      runtime.kill();
    }
  } else if (runtime.exitCode === null && runtime.pid) {
    runtime.kill("SIGTERM");
  }

  for (const stream of [runtime.stdout, runtime.stderr]) {
    stream.removeAllListeners("data");
    stream.destroy();
  }
  runtime.unref();
}

try {
  await waitUntilReady();
  const smoke = spawnSync(
    process.execPath,
    [
      routingMode === "alias"
        ? "scripts/smoke-cloudflare-alias.mjs"
        : "scripts/smoke-cloudflare.mjs",
      baseUrl,
      deployEnvironment,
    ],
    {
      cwd: workspace,
      encoding: "utf8",
      stdio: "inherit",
    },
  );
  if (smoke.error) throw smoke.error;
  if (smoke.status !== 0) {
    throw new Error(`HTTP smoke test failed.\n${runtimeOutput}`);
  }
} finally {
  stopRuntime();
}
