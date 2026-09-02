import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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
  const sourceFile = ts.createSourceFile(
    configPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const declaration = sourceFile.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((item) => ts.isIdentifier(item.name) && item.name.text === "SEO_PAGES");
  if (!declaration?.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
    throw new Error("SEO_PAGES must be an object literal so release metadata can be validated.");
  }

  const readProperty = (object, propertyName) => {
    const property = object.properties.find((item) => (
      ts.isPropertyAssignment(item) &&
      ((ts.isIdentifier(item.name) && item.name.text === propertyName) ||
        (ts.isStringLiteral(item.name) && item.name.text === propertyName))
    ));
    if (!property || !ts.isPropertyAssignment(property)) return undefined;
    if (ts.isStringLiteralLike(property.initializer)) return property.initializer.text;
    if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
    return undefined;
  };

  return declaration.initializer.properties.flatMap((item) => {
    if (!ts.isPropertyAssignment(item) || !ts.isObjectLiteralExpression(item.initializer)) return [];
    const key = ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)
      ? item.name.text
      : "";
    const canonical = readProperty(item.initializer, "canonical");
    if (!key || typeof canonical !== "string") return [];
    const title = readProperty(item.initializer, "title");
    const description = readProperty(item.initializer, "description");
    if (typeof title !== "string" || typeof description !== "string") {
      throw new Error(`SEO_PAGES.${key} must define literal title and description strings.`);
    }
    return [{
      key,
      route: canonical,
      title,
      description,
      noIndex: readProperty(item.initializer, "noIndex") === true,
    }];
  });
};

export const getSeoPageConfigs = () => {
  const configs = getStaticConfigs();
  const professions = readJson("src/data/professions.json");
  const competitors = readJson("src/data/competitors.json");
  const contentPages = readJson("src/data/seo-content-pages.json");
  const indexableComparisons = new Set(readJson("src/data/indexable-comparisons.json"));

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

  // Preserve every published comparison as a real 200 page, but only expose
  // high-intent pairs to search engines. This prevents 153 near-duplicate
  // pages from diluting stronger alternatives and solution clusters.
  for (let i = 0; i < competitors.length; i += 1) {
    for (let j = i + 1; j < competitors.length; j += 1) {
      const [competitorA, competitorB] = [competitors[i], competitors[j]]
        .sort((a, b) => a.slug.localeCompare(b.slug));
      const routeSlug = `${competitorA.slug}-vs-${competitorB.slug}`;
      configs.push({
        key: `compare_${routeSlug.replace(/-/g, "_")}`,
        route: `/compare/${routeSlug}`,
        title: `${competitorA.name} vs ${competitorB.name}: Features & Pricing | Linktery`,
        description: `Compare ${competitorA.name} vs ${competitorB.name} side-by-side, including published pricing, deep linking, custom domains, transaction fees, and analytics features.`,
        noIndex: !indexableComparisons.has(routeSlug),
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
