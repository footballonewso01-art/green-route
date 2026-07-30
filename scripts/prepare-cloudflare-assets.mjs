import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import securityHeaders from "../config/security-headers.json" with { type: "json" };

const mode = process.argv[2];
if (!["production", "staging"].includes(mode)) {
  throw new Error("Cloudflare assets require a production or staging mode.");
}

const workspace = process.cwd();
const sourceDir = path.join(workspace, "dist");
const targetDir = path.join(workspace, "dist-cloudflare");
const relativeTarget = path.relative(path.resolve(workspace), path.resolve(targetDir));
if (!relativeTarget || relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
  throw new Error(`Refusing to replace unsafe Cloudflare output: ${targetDir}`);
}
if (!fs.existsSync(sourceDir)) {
  throw new Error("Client build is missing; run the release build first.");
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

const internalDir = path.join(targetDir, "_linktery");
fs.mkdirSync(internalDir, { recursive: true });

const internalArtifacts = [
  ["index.html", "app-shell"],
  ["landing.html", "landing"],
  ["404.html", "not-found"],
];
for (const [sourceName, targetName] of internalArtifacts) {
  const source = path.join(sourceDir, sourceName);
  if (!fs.existsSync(source)) {
    throw new Error(`Required frontend artifact is missing: ${sourceName}`);
  }
  fs.copyFileSync(source, path.join(internalDir, targetName));
}

const globalHeaders = [
  "/*",
  ...Object.entries(securityHeaders).map(([name, value]) => `  ${name}: ${value}`),
];
if (mode === "staging") {
  globalHeaders.push("  X-Robots-Tag: noindex, nofollow");
}

const headersFile = [
  ...globalHeaders,
  "",
  "/assets/*",
  "  Cache-Control: public, max-age=31536000, immutable",
  "",
  "https://:version.:subdomain.workers.dev/*",
  "  X-Robots-Tag: noindex, nofollow",
  "",
].join("\n");
fs.writeFileSync(path.join(targetDir, "_headers"), headersFile, "utf8");

const gitResult = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: workspace,
  encoding: "utf8",
});
const manifest = {
  schemaVersion: 1,
  deployEnvironment: mode,
  gitSha: gitResult.status === 0 ? gitResult.stdout.trim() : "unknown",
};
fs.writeFileSync(
  path.join(internalDir, "release.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Prepared Cloudflare ${mode} asset bundle in dist-cloudflare.`);
