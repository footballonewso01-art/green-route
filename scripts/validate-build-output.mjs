import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const mode = process.argv[2];
if (!["production", "staging"].includes(mode)) {
  throw new Error("Output validation requires a production or staging mode.");
}

const workspace = process.cwd();
const distDir = path.join(workspace, "dist");
const cloudflareDir = path.join(workspace, "dist-cloudflare");
const expectedBackend =
  mode === "production"
    ? "https://greenroute-pb.fly.dev"
    : "https://greenroute-pb-staging.fly.dev";
const forbiddenMarkers =
  mode === "production"
    ? [
        "http://127.0.0.1:8090",
        "http://localhost:8090",
        "https://greenroute-pb-staging.fly.dev",
      ]
    : [
        "http://127.0.0.1:8090",
        "http://localhost:8090",
        "https://greenroute-pb.fly.dev",
      ];
const failures = [];

function readRequired(relativePath) {
  const absolutePath = path.join(workspace, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath} is missing`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function collectTextFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectTextFiles(absolutePath));
    else if (/\.(?:html|js|css|json|xml|txt)$/i.test(entry.name)) files.push(absolutePath);
  }
  return files;
}

const clientFiles = collectTextFiles(distDir);
const combinedOutput = clientFiles
  .map((filePath) => fs.readFileSync(filePath, "utf8"))
  .join("\n");

if (!combinedOutput.includes(expectedBackend)) {
  failures.push(`built output does not contain the expected backend ${expectedBackend}`);
}
for (const marker of forbiddenMarkers) {
  if (combinedOutput.includes(marker)) {
    failures.push(`built output contains forbidden environment marker ${marker}`);
  }
}

const spaShell = readRequired("dist/index.html");
const landing = readRequired("dist/landing.html");
const notFound = readRequired("dist/404.html");
const cloudflareSpaShell = readRequired("dist-cloudflare/_linktery/app-shell");
const cloudflareLanding = readRequired("dist-cloudflare/_linktery/landing");
const cloudflareNotFound = readRequired("dist-cloudflare/_linktery/not-found");
const cloudflareHeaders = readRequired("dist-cloudflare/_headers");
const releaseManifest = readRequired("dist-cloudflare/_linktery/release.json");

if (!/<meta name="robots" content="noindex, nofollow" \/>/i.test(spaShell)) {
  failures.push("base SPA shell must be noindex, nofollow");
}
if (!/<meta name="robots" content="index, follow" \/>/i.test(landing)) {
  failures.push("prerendered landing page must be index, follow");
}
if (!/<meta name="robots" content="noindex, nofollow" \/>/i.test(notFound)) {
  failures.push("404 artifact must be noindex, nofollow");
}
if (cloudflareSpaShell !== spaShell) failures.push("Cloudflare SPA shell copy is stale");
if (cloudflareLanding !== landing) failures.push("Cloudflare landing copy is stale");
if (cloudflareNotFound !== notFound) failures.push("Cloudflare 404 copy is stale");
if (!cloudflareHeaders.includes("Content-Security-Policy:")) {
  failures.push("Cloudflare security headers are missing");
}
if (
  mode === "staging" &&
  !cloudflareHeaders.includes("X-Robots-Tag: noindex, nofollow")
) {
  failures.push("staging assets must be globally noindex");
}

try {
  const manifest = JSON.parse(releaseManifest);
  if (manifest.deployEnvironment !== mode) {
    failures.push("Cloudflare release manifest has the wrong environment");
  }
} catch {
  failures.push("Cloudflare release manifest is invalid JSON");
}

const allCloudflareFiles = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolutePath);
    else allCloudflareFiles.push(absolutePath);
  }
};
walk(cloudflareDir);
if (allCloudflareFiles.length > 20_000) {
  failures.push(`Cloudflare bundle has ${allCloudflareFiles.length} files; free limit is 20,000`);
}
for (const filePath of allCloudflareFiles) {
  if (fs.statSync(filePath).size > 25 * 1024 * 1024) {
    failures.push(`${path.relative(workspace, filePath)} exceeds Cloudflare's 25 MiB limit`);
  }
}

if (failures.length) {
  console.error(`Build output validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Build output validated for ${mode}: ${allCloudflareFiles.length} Cloudflare files.`,
);
