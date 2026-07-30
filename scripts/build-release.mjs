import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const requestedMode = process.argv[2] || "auto";
const mode =
  requestedMode === "auto"
    ? process.env.VERCEL_ENV === "preview"
      ? "staging"
      : "production"
    : requestedMode;

if (!["production", "staging"].includes(mode)) {
  throw new Error("Release mode must be auto, production, or staging.");
}

const workspace = process.cwd();
const viteCli = path.join(workspace, "node_modules", "vite", "bin", "vite.js");

function assertWorkspacePath(targetPath) {
  const resolvedWorkspace = path.resolve(workspace);
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(resolvedWorkspace, resolvedTarget);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to modify an unsafe build path: ${resolvedTarget}`);
  }
}

function removeBuildDirectory(name) {
  const target = path.join(workspace, name);
  assertWorkspacePath(target);
  fs.rmSync(target, { recursive: true, force: true });
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: workspace,
    env,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} ${args.join(" ")} failed.`);
  }
}

function readGitSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: workspace,
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

const releaseSha = readGitSha();
const releaseEnv = {
  ...process.env,
  LINKTERY_BUILD_MODE: mode,
  VITE_DEPLOY_ENV: mode,
  VITE_RELEASE_SHA: releaseSha,
};

console.log(`Building Linktery ${mode} release from ${releaseSha}.`);
run(process.execPath, ["scripts/validate-build-env.mjs", mode], releaseEnv);

for (const directory of ["dist", "dist-server", "dist-cloudflare"]) {
  removeBuildDirectory(directory);
}

run(process.execPath, [viteCli, "build", "--mode", mode], releaseEnv);
run(
  process.execPath,
  [
    viteCli,
    "build",
    "--ssr",
    "src/entry-server.tsx",
    "--outDir",
    "dist-server",
    "--mode",
    mode,
  ],
  releaseEnv,
);
run(process.execPath, ["scripts/prerender.mjs"], releaseEnv);
run(process.execPath, ["scripts/generate-sitemap.mjs"], releaseEnv);
run(process.execPath, ["scripts/validate-seo-build.mjs"], releaseEnv);
run(process.execPath, ["scripts/prepare-cloudflare-assets.mjs", mode], releaseEnv);
run(process.execPath, ["scripts/validate-build-output.mjs", mode], releaseEnv);

console.log(`Linktery ${mode} release artifacts are ready.`);
