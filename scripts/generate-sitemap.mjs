import fs from "node:fs";
import path from "node:path";
import { DOMAIN, getSeoPageConfigs } from "./seo-routes.mjs";

const escapeXml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const routes = getSeoPageConfigs()
  .filter((config) => !config.noIndex)
  .map((config) => config.route);

if (!routes.length) throw new Error("No indexable routes found for sitemap generation.");

const entries = routes.map((route) => {
  const url = route === "/" ? DOMAIN : `${DOMAIN}${route}`;
  return `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`;
}).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
const distPath = path.join(process.cwd(), "dist", "sitemap.xml");
if (!fs.existsSync(path.dirname(distPath))) {
  throw new Error("Client build output is missing; generate the sitemap after Vite.");
}
fs.writeFileSync(distPath, sitemap, "utf8");

console.log(`Generated sitemap with ${routes.length} unique URLs.`);
