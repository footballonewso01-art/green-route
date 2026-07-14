import fs from "node:fs";
import path from "node:path";
import { DOMAIN, getSeoPageConfigs } from "./seo-routes.mjs";

const configs = getSeoPageConfigs().filter((config) => !config.noIndex);
const failures = [];

for (const config of configs) {
  const outputPath = config.route === "/"
    ? path.join(process.cwd(), "dist", "landing.html")
    : path.join(process.cwd(), "dist", config.route.replace(/^\//, ""), "index.html");

  if (!fs.existsSync(outputPath)) {
    failures.push(`${config.route}: output file is missing`);
    continue;
  }

  const html = fs.readFileSync(outputPath, "utf8");
  const rootContent = html.match(/<div id="root" data-prerendered="true">([\s\S]*?)<\/div><!--app-root-end-->/i)?.[1] || "";
  const canonical = config.route === "/" ? DOMAIN : `${DOMAIN}${config.route}`;

  if (!rootContent) failures.push(`${config.route}: prerendered app root is empty`);
  if (/Loading\.\.\./i.test(rootContent)) failures.push(`${config.route}: loading placeholder leaked into app root`);
  if (!/<h1(?:\s|>)/i.test(rootContent)) failures.push(`${config.route}: H1 is missing`);
  if (!html.includes(`<link rel="canonical" href="${canonical}" />`)) failures.push(`${config.route}: canonical is incorrect`);
  if (!/<meta name="twitter:title" content="[^"]+" \/>/i.test(html)) failures.push(`${config.route}: twitter:title is missing`);
  if (!/<meta name="twitter:description" content="[^"]+" \/>/i.test(html)) failures.push(`${config.route}: twitter:description is missing`);
  if (/aggregateRating/i.test(html)) failures.push(`${config.route}: unverified aggregateRating is present`);
  if (!/<link\s+[^>]*rel=["']stylesheet["'][^>]*>/i.test(html)) failures.push(`${config.route}: external stylesheet is missing`);
  if (Buffer.byteLength(html, "utf8") > 500_000) failures.push(`${config.route}: HTML is unexpectedly larger than 500 KB`);

  const serializedSchemas = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      serializedSchemas.push(JSON.stringify(JSON.parse(match[1])));
    } catch {
      failures.push(`${config.route}: invalid JSON-LD`);
    }
  }
  if (new Set(serializedSchemas).size !== serializedSchemas.length) {
    failures.push(`${config.route}: duplicate JSON-LD schema is present`);
  }
}

const sitemapPath = path.join(process.cwd(), "dist", "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  failures.push("sitemap.xml is missing from dist");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  if (new Set(urls).size !== urls.length) failures.push("sitemap.xml contains duplicate URLs");
  if (urls.length !== configs.length) failures.push(`sitemap.xml has ${urls.length} URLs; expected ${configs.length}`);
  if (/<lastmod>|<changefreq>|<priority>/i.test(sitemap)) failures.push("sitemap.xml contains synthetic freshness or priority fields");
}

if (failures.length) {
  console.error(`SEO build validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO build validation passed for ${configs.length} routes.`);
