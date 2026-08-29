const baseUrl = new URL(process.argv[2] || "https://linktery.com");
const origin = baseUrl.origin;
const userAgent = "Linktery-SEO-Audit/1.0 (+https://linktery.com)";
const failures = [];

const assertCrawlerHintsSignal = (response, label) => {
  if (!response.headers.get("cf-cache-status")) {
    failures.push(`${label}: CF-Cache-Status is missing; Cloudflare Crawler Hints cannot observe cache changes`);
  }
};

const normalizeUrl = (value) => {
  const url = new URL(value);
  url.hash = "";
  if (url.pathname === "/" && !url.search) return url.origin;
  return url.toString();
};

const fetchDocument = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  return { response, body: await response.text() };
};

const extractAttribute = (html, selectorPattern, attribute) => {
  const tag = html.match(selectorPattern)?.[0] || "";
  return tag.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"))?.[1] || "";
};

const robotsUrl = new URL("/robots.txt", origin).toString();
const sitemapUrl = new URL("/sitemap.xml", origin).toString();

let sitemapBody = "";

try {
  const { response, body } = await fetchDocument(robotsUrl);
  if (response.status !== 200) failures.push(`/robots.txt returned ${response.status}`);
  if (!new RegExp(`^Sitemap:\\s*${sitemapUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im").test(body)) {
    failures.push(`/robots.txt does not advertise ${sitemapUrl}`);
  }
} catch (error) {
  failures.push(`/robots.txt request failed: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const { response, body } = await fetchDocument(sitemapUrl);
  sitemapBody = body;
  if (response.status !== 200) failures.push(`/sitemap.xml returned ${response.status}`);
  assertCrawlerHintsSignal(response, "/sitemap.xml");
} catch (error) {
  failures.push(`/sitemap.xml request failed: ${error instanceof Error ? error.message : String(error)}`);
}

const urls = [...sitemapBody.matchAll(/<loc>(.*?)<\/loc>/gi)].map((match) => match[1].trim());
if (!urls.length) failures.push("sitemap.xml contains no URLs");
if (new Set(urls).size !== urls.length) failures.push("sitemap.xml contains duplicate URLs");

for (const url of urls) {
  try {
    if (new URL(url).origin !== origin) failures.push(`${url}: sitemap URL is not on ${origin}`);
  } catch {
    failures.push(`${url}: sitemap URL is invalid`);
  }
}

let cursor = 0;
const auditNext = async () => {
  while (cursor < urls.length) {
    const index = cursor;
    cursor += 1;
    const url = urls[index];

    try {
      const { response, body } = await fetchDocument(url);
      if (response.status !== 200) failures.push(`${url}: returned ${response.status}`);
      if (response.headers.get("location")) failures.push(`${url}: unexpectedly redirects`);
      assertCrawlerHintsSignal(response, url);

      const headerRobots = response.headers.get("x-robots-tag") || "";
      if (/noindex/i.test(headerRobots)) failures.push(`${url}: X-Robots-Tag contains noindex`);

      const robots = extractAttribute(
        body,
        /<meta\s+[^>]*name=["']robots["'][^>]*>/i,
        "content",
      );
      if (!/^index\s*,\s*follow$/i.test(robots)) {
        failures.push(`${url}: meta robots is ${robots || "missing"}`);
      }

      const canonical = extractAttribute(
        body,
        /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
        "href",
      );
      if (!canonical || normalizeUrl(canonical) !== normalizeUrl(url)) {
        failures.push(`${url}: canonical is ${canonical || "missing"}`);
      }
      if (!/<h1(?:\s|>)/i.test(body)) failures.push(`${url}: H1 is missing`);
      if (!body.includes('data-prerendered="true"')) failures.push(`${url}: prerendered markup is missing`);
    } catch (error) {
      failures.push(`${url}: request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

await Promise.all(Array.from({ length: Math.min(12, Math.max(1, urls.length)) }, auditNext));

if (failures.length) {
  console.error(`Live SEO audit failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Live SEO audit passed for ${urls.length} sitemap URLs on ${origin}.`);
