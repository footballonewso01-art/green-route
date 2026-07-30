import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const workspace = process.cwd();

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: workspace,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed.`);
  }
  return result.stdout.trim();
}

const gitSha = runGit(["rev-parse", "HEAD"]);
const dirtyState = runGit(["status", "--porcelain", "--untracked-files=all"]);
if (dirtyState) {
  throw new Error(
    "Production candidates must be uploaded from a clean committed checkout.",
  );
}

const manifestPath = path.join(
  workspace,
  "dist-cloudflare",
  "_linktery",
  "release.json",
);
if (!fs.existsSync(manifestPath)) {
  throw new Error("Production release manifest is missing; run build:production.");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.deployEnvironment !== "production") {
  throw new Error("Candidate upload requires a production artifact.");
}
if (manifest.gitSha !== gitSha) {
  throw new Error(
    `Candidate artifact was built from ${manifest.gitSha}, not current HEAD ${gitSha}.`,
  );
}

const wranglerCli = path.join(
  workspace,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
);

const wranglerConfig = JSON.parse(
  fs.readFileSync(path.join(workspace, "wrangler.jsonc"), "utf8"),
);
if (
  wranglerConfig.workers_dev !== false ||
  wranglerConfig.preview_urls !== true ||
  Object.hasOwn(wranglerConfig, "routes") ||
  Object.hasOwn(wranglerConfig, "route") ||
  Object.hasOwn(wranglerConfig, "custom_domains")
) {
  throw new Error(
    "Candidate bootstrap requires preview URLs, workers_dev=false, and no production traffic routes.",
  );
}

const deploymentCheck = spawnSync(
  process.execPath,
  [wranglerCli, "deployments", "list", "--env=", "--json"],
  {
    cwd: workspace,
    env: process.env,
    encoding: "utf8",
  },
);
if (deploymentCheck.error) throw deploymentCheck.error;
if (deploymentCheck.status !== 0) {
  const checkOutput = `${deploymentCheck.stdout}\n${deploymentCheck.stderr}`;
  if (!checkOutput.includes("10007")) {
    process.stderr.write(checkOutput);
    throw new Error("Unable to inspect the Cloudflare Worker deployment.");
  }

  console.log(
    "Creating the dormant production Worker without routes or workers.dev traffic.",
  );
  const bootstrap = spawnSync(
    process.execPath,
    [
      wranglerCli,
      "deploy",
      "--env=",
      "--message",
      `Bootstrap production candidate ${gitSha}`,
    ],
    {
      cwd: workspace,
      env: process.env,
      stdio: "inherit",
    },
  );
  if (bootstrap.error) throw bootstrap.error;
  if (bootstrap.status !== 0) {
    throw new Error("Cloudflare candidate bootstrap failed.");
  }
}

const upload = spawnSync(
  process.execPath,
  [
    wranglerCli,
    "versions",
    "upload",
    "--env=",
    "--preview-alias",
    "candidate",
  ],
  {
    cwd: workspace,
    env: process.env,
    stdio: "inherit",
  },
);
if (upload.error) throw upload.error;
if (upload.status !== 0) {
  throw new Error("Cloudflare candidate upload failed.");
}
