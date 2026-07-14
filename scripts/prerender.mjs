import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DOMAIN, getSeoPageConfigs } from "./seo-routes.mjs";

const escapeAttribute = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const stripUnverifiedRatings = (value) => {
  if (Array.isArray(value)) return value.map(stripUnverifiedRatings);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "aggregateRating")
      .map(([key, nestedValue]) => [key, stripUnverifiedRatings(nestedValue)])
  );
};

const replaceOrInsertHeadTag = (html, pattern, tag) => (
  pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `  ${tag}\n</head>`)
);

const upsertMeta = (html, attribute, key, content) => {
  const pattern = new RegExp(`<meta\\s+[^>]*${attribute}=["']${key}["'][^>]*>`, "i");
  return replaceOrInsertHeadTag(
    html,
    pattern,
    `<meta ${attribute}="${key}" content="${escapeAttribute(content)}" />`
  );
};

const injectPageJsonLd = (html, seo) => {
  const schemas = [];
  if (seo?.faq?.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: seo.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  if (seo?.structuredData) schemas.push(stripUnverifiedRatings(seo.structuredData));
  if (!schemas.length) return html;

  const scripts = schemas.map((schema) => {
    const json = JSON.stringify(schema).replace(/</g, "\\u003c");
    return `  <script type="application/ld+json" data-page-seo="true">${json}</script>`;
  }).join("\n");
  return html.replace("</head>", `${scripts}\n</head>`);
};

const injectAppRoot = (template, appHtml) => {
  const markerPattern = /<!--app-root-start-->[\s\S]*?<!--app-root-end-->/i;
  if (!markerPattern.test(template)) {
    throw new Error("App root markers are missing from the client template.");
  }
  return template.replace(
    markerPattern,
    `<!--app-root-start--><div id="root" data-prerendered="true">${appHtml}</div><!--app-root-end-->`
  );
};

const writeRoute = (route, html) => {
  const distDir = path.join(process.cwd(), "dist");
  if (route === "/" || route === "") {
    fs.writeFileSync(path.join(distDir, "landing.html"), html, "utf8");
    return;
  }

  const outputDir = path.join(distDir, route.replace(/^\//, ""));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf8");
};

const runPrerender = async () => {
  const serverBundlePath = path.join(process.cwd(), "dist-server", "entry-server.js");
  const templatePath = path.join(process.cwd(), "dist", "index.html");
  if (!fs.existsSync(serverBundlePath)) throw new Error(`Server bundle not found: ${serverBundlePath}`);
  if (!fs.existsSync(templatePath)) throw new Error(`Client template not found: ${templatePath}`);

  const { render } = await import(pathToFileURL(serverBundlePath).href);
  const template = fs.readFileSync(templatePath, "utf8");
  const configs = getSeoPageConfigs().filter((config) => !config.noIndex);
  if (!configs.length) throw new Error("No indexable routes configured for prerendering.");

  const failures = [];
  for (const config of configs) {
    try {
      const renderResult = await render(config.route);
      const appHtml = typeof renderResult === "string" ? renderResult : renderResult.appHtml;
      const seo = typeof renderResult === "string" ? undefined : renderResult.seo;
      if (!appHtml?.includes("<h1")) throw new Error("Rendered page has no H1.");

      const canonicalUrl = config.route === "/" ? DOMAIN : `${DOMAIN}${config.route}`;
      let pageHtml = injectAppRoot(template, appHtml);
      pageHtml = pageHtml.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttribute(config.title)}</title>`);
      pageHtml = upsertMeta(pageHtml, "name", "description", config.description);
      pageHtml = upsertMeta(pageHtml, "property", "og:title", config.title);
      pageHtml = upsertMeta(pageHtml, "property", "og:description", config.description);
      pageHtml = upsertMeta(pageHtml, "property", "og:url", canonicalUrl);
      pageHtml = upsertMeta(pageHtml, "name", "twitter:title", config.title);
      pageHtml = upsertMeta(pageHtml, "name", "twitter:description", config.description);
      pageHtml = upsertMeta(pageHtml, "name", "robots", "index, follow");
      pageHtml = replaceOrInsertHeadTag(
        pageHtml,
        /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
        `<link rel="canonical" href="${escapeAttribute(canonicalUrl)}" />`
      );
      pageHtml = injectPageJsonLd(pageHtml, seo);

      writeRoute(config.route, pageHtml);
      console.log(`Generated ${config.route}`);
    } catch (error) {
      failures.push(`${config.route}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length) {
    throw new Error(`Prerender failed for ${failures.length} route(s):\n${failures.join("\n")}`);
  }
  console.log(`Prerendered ${configs.length} indexable routes.`);
};

try {
  await runPrerender();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  const serverDir = path.join(process.cwd(), "dist-server");
  if (fs.existsSync(serverDir)) fs.rmSync(serverDir, { recursive: true, force: true });
}
