import fs from "node:fs";
import path from "node:path";

export const DOMAIN = "https://linktery.com";

const readJson = (relativePath) => {
  const filePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`Required SEO data file is missing: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const getStaticConfigs = () => {
  const configPath = path.join(process.cwd(), "src/lib/seo-config.ts");
  if (!fs.existsSync(configPath)) throw new Error(`SEO config is missing: ${configPath}`);

  const source = fs.readFileSync(configPath, "utf8");
  const configs = [];
  const blockRegex = /(\w+)\s*:\s*\{([^}]+)\}/g;
  let match;

  while ((match = blockRegex.exec(source)) !== null) {
    const content = match[2];
    const canonical = content.match(/canonical\s*:\s*["']([^"']+)["']/)?.[1];
    if (!canonical) continue;

    configs.push({
      key: match[1],
      route: canonical,
      title: content.match(/title\s*:\s*["']([^"']+)["']/)?.[1] || "",
      description: content.match(/description\s*:\s*["']([^"']+)["']/)?.[1] || "",
      noIndex: /noIndex\s*:\s*true/.test(content),
    });
  }

  return configs;
};

export const getSeoPageConfigs = () => {
  const configs = getStaticConfigs();
  const professions = readJson("src/data/professions.json");
  const competitors = readJson("src/data/competitors.json");
  const contentPages = readJson("src/data/seo-content-pages.json");

  for (const page of contentPages) {
    configs.push({
      key: `content_${page.path.replace(/^\//, "").replace(/\//g, "_").replace(/-/g, "_")}`,
      route: page.path,
      title: page.seoTitle,
      description: page.seoDescription,
      noIndex: false,
    });
  }

  for (const profession of professions) {
    configs.push({
      key: `profession_${profession.slug.replace(/-/g, "_")}`,
      route: `/solutions/link-in-bio-for-${profession.slug}`,
      title: profession.seoTitle,
      description: profession.seoDescription,
      noIndex: false,
    });
  }

  // Every competitor in the catalog is an intentional SEO entity. Generate
  // every canonical pair so previously published comparison URLs never fall
  // through to the frontend's static 404 page.
  for (let i = 0; i < competitors.length; i += 1) {
    for (let j = i + 1; j < competitors.length; j += 1) {
      const [competitorA, competitorB] = [competitors[i], competitors[j]]
        .sort((a, b) => a.slug.localeCompare(b.slug));
      const routeSlug = `${competitorA.slug}-vs-${competitorB.slug}`;
      configs.push({
        key: `compare_${routeSlug.replace(/-/g, "_")}`,
        route: `/compare/${routeSlug}`,
        title: `${competitorA.name} vs ${competitorB.name}: Which is Better? (2026) | Linktery`,
        description: `Compare ${competitorA.name} vs ${competitorB.name} side-by-side, including published pricing, deep linking, custom domains, transaction fees, and analytics features.`,
        noIndex: false,
      });
    }
  }

  for (const competitor of competitors) {
    configs.push({
      key: `alternative_${competitor.slug.replace(/-/g, "_")}`,
      route: `/alternatives/${competitor.slug}`,
      title: competitor.alternativeSeoTitle,
      description: competitor.alternativeSeoDescription,
      noIndex: false,
    });
  }

  // Explicit page configs win over programmatic duplicates (for example fitness coaches).
  const uniqueByRoute = new Map();
  for (const config of configs) {
    if (!uniqueByRoute.has(config.route)) uniqueByRoute.set(config.route, config);
  }

  return [...uniqueByRoute.values()];
};
