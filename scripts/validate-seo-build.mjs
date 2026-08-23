import fs from "node:fs";
import path from "node:path";
import { DOMAIN, getSeoPageConfigs } from "./seo-routes.mjs";

const allConfigs = getSeoPageConfigs();
const configs = allConfigs.filter((config) => !config.noIndex);
const failures = [];
const allRoutes = new Set(allConfigs.map((config) => config.route));
const contentPages = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src", "data", "seo-content-pages.json"), "utf8"),
);

const assertUniqueField = (field) => {
  const seen = new Map();
  for (const config of configs) {
    const normalized = String(config[field] || "").trim().toLowerCase();
    if (!normalized) {
      failures.push(`${config.route}: ${field} is empty`);
      continue;
    }
    const previous = seen.get(normalized);
    if (previous) failures.push(`${config.route}: duplicate ${field} also used by ${previous}`);
    else seen.set(normalized, config.route);
  }
};

assertUniqueField("title");
assertUniqueField("description");

for (const page of contentPages) {
  const expectedRoot = page.kind === "feature"
    ? "/features/"
    : page.kind === "template"
      ? "/templates/"
      : page.kind === "tool"
        ? "/tools/"
        : "/guides/";
  if (!page.path.startsWith(expectedRoot)) failures.push(`${page.path}: path does not match kind ${page.kind}`);
  if (!allRoutes.has(page.path)) failures.push(`${page.path}: content page is missing from the SEO route catalog`);

  const words = [
    page.lead,
    ...page.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...section.bullets]),
    ...page.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ].join(" ").trim().split(/\s+/).filter(Boolean).length;
  const minimumWords = page.kind === "tool" ? 180 : 230;
  if (words < minimumWords) failures.push(`${page.path}: only ${words} useful words; expected at least ${minimumWords}`);

  const related = new Set();
  for (const relatedPath of page.related) {
    if (relatedPath === page.path) failures.push(`${page.path}: related links include the page itself`);
    if (related.has(relatedPath)) failures.push(`${page.path}: duplicate related link ${relatedPath}`);
    if (!allRoutes.has(relatedPath)) failures.push(`${page.path}: related link is not a known route: ${relatedPath}`);
    related.add(relatedPath);
  }
}

for (const config of configs) {
  if (/\(20\d{2}\)/.test(config.title)) {
    failures.push(`${config.route}: title contains a hard-coded year without a freshness contract`);
  }
}

for (const config of allConfigs) {
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
  const expectedRobots = config.noIndex ? "noindex, follow" : "index, follow";
  if (!html.includes(`<meta name="robots" content="${expectedRobots}" />`)) {
    failures.push(`${config.route}: robots directive must be ${expectedRobots}`);
  }
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

  if (config.route.startsWith("/compare/")) {
    const pair = config.route.replace("/compare/", "").split("-vs-");
    if (pair.length === 2) {
      const reverseRoute = `/compare/${pair[1]}-vs-${pair[0]}`;
      const reversePath = path.join(process.cwd(), "dist", reverseRoute.replace(/^\//, ""), "index.html");
      if (!fs.existsSync(reversePath)) {
        failures.push(`${reverseRoute}: reverse comparison alias is missing`);
      } else {
        const reverseHtml = fs.readFileSync(reversePath, "utf8");
        if (!/<meta name="robots" content="noindex, follow" \/>/i.test(reverseHtml)) failures.push(`${reverseRoute}: reverse alias must be noindex`);
        if (!reverseHtml.includes(`<link rel="canonical" href="${canonical}" />`)) failures.push(`${reverseRoute}: reverse alias canonical is incorrect`);
        if (!/<meta http-equiv="refresh" content="0;url=https:\/\/linktery\.com\/compare\//i.test(reverseHtml)) failures.push(`${reverseRoute}: reverse alias redirect is missing`);
        if (/type="module"|data-prerendered="true"/i.test(reverseHtml)) failures.push(`${reverseRoute}: reverse alias must not hydrate the React app`);
      }
    }
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
