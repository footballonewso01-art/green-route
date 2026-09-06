import fs from "node:fs";
import path from "node:path";
import { DOMAIN, getSeoPageConfigs } from "./seo-routes.mjs";
import { changedUrls, contentFingerprint, submitIndexNow } from "./indexnow-lib.mjs";

const args = process.argv.slice(2);
if (args.some((arg) => !["--submit", "--retry-pending"].includes(arg))) throw new Error("Usage: npm run seo:indexnow -- [--submit] [--retry-pending]");
if (args.includes("--retry-pending") && !args.includes("--submit")) throw new Error("--retry-pending requires --submit");
const root = process.cwd();
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const config = read("scripts/indexnow-config.json");
const release = read("dist-cloudflare/_linktery/release.json");
const journalPath = path.join(root, ".local-security-artifacts/indexnow-receipt.json");
const journal = fs.existsSync(journalPath) ? JSON.parse(fs.readFileSync(journalPath, "utf8")) : { hashes: {} };
const hashes = {};
for (const page of getSeoPageConfigs().filter((page) => !page.noIndex)) {
  const url = page.route === "/" ? DOMAIN : DOMAIN + page.route;
  const file = page.route === "/" ? "dist/landing.html" : `dist${page.route}/index.html`;
  hashes[url] = contentFingerprint(fs.readFileSync(path.join(root, file), "utf8"), url);
}
const previous = args.includes("--retry-pending") && journal.status === "verification_pending" ? journal.previousHashes || {} : journal.hashes;
const urls = changedUrls(hashes, previous || {});
console.log(JSON.stringify({ mode: release.deployEnvironment, action: args.includes("--submit") ? "submit" : "dry-run", changed: urls.length, urls }, null, 2));
if (!args.includes("--submit")) {
  console.log("Dry run only. No network requests or notifications were sent.");
} else {
  const result = await submitIndexNow({ config, hashes, previous: previous || {}, mode: release.deployEnvironment });
  if (result.submitted) {
    fs.mkdirSync(path.dirname(journalPath), { recursive: true });
    fs.writeFileSync(journalPath, JSON.stringify({ ...result, submittedAt: new Date().toISOString(), gitSha: release.gitSha, hashes, previousHashes: previous }, null, 2));
  }
  console.log(JSON.stringify(result));
  console.log("Receipt means notification received, not indexed or ranked. Check Bing Webmaster Tools for search status.");
}
