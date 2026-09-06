import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";

export function isMarketingUrl(value, host = "linktery.com") {
  try {
    const url = new URL(value);
    return url.origin === `https://${host}` && !url.search && !url.hash && !url.username && !url.password &&
      /^(?:\/|\/(?:features|guides|tools|templates|solutions|alternatives|compare)(?:\/[a-z0-9-]+)?|\/(?:pricing|documentation|privacy|terms))$/.test(url.pathname);
  } catch { return false; }
}

export function contentFingerprint(html, url) {
  const document = new JSDOM(html).window.document;
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  if (!canonical || canonical.replace(/\/$/, "") !== url.replace(/\/$/, "")) throw new Error(`Canonical mismatch: ${url}`);
  if (/noindex/i.test(document.querySelector('meta[name="robots"]')?.content || "")) throw new Error(`Non-indexable page: ${url}`);
  const main = document.querySelector("main");
  if (!main || document.querySelectorAll("h1").length !== 1) throw new Error(`Incomplete rendered page: ${url}`);
  main.querySelectorAll("script,style").forEach((element) => element.remove());
  const walker = document.createTreeWalker(main, 4);
  const text = [];
  while (walker.nextNode()) text.push(walker.currentNode.textContent);
  // Ignore bundle names and generated CSS classes. Notify on public content,
  // metadata, linked destinations, image assets and structured-data changes.
  const content = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || "",
    text: text.join(" ").replace(/\s+/g, " ").trim(),
    links: [...main.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
    images: [...main.querySelectorAll("img")].map((img) => [img.getAttribute("src"), img.alt]),
    schema: [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent)),
  };
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export function changedUrls(current, previous, host = "linktery.com") {
  const urls = [...new Set([...Object.keys(current), ...Object.keys(previous)])];
  if (urls.some((url) => !isMarketingUrl(url, host))) throw new Error("IndexNow is limited to canonical marketing URLs");
  return urls.filter((url) => current[url] !== previous[url]);
}

export async function submitIndexNow({ config, hashes, previous = {}, mode, fetchImpl = fetch }) {
  if (mode !== "production") throw new Error("IndexNow submission requires a production release");
  if (config.host !== "linktery.com" || config.endpoint !== "https://api.indexnow.org/indexnow" || !/^[a-f0-9]{32}$/.test(config.key)) throw new Error("Invalid IndexNow configuration");
  const urls = changedUrls(hashes, previous, config.host);
  if (!urls.length) return { status: "unchanged", submitted: 0 };
  if (urls.length > 10000) throw new Error("IndexNow batch exceeds protocol limit");
  const keyLocation = `https://${config.host}/${config.key}.txt`;
  const get = (url) => fetchImpl(url, { redirect: "manual", signal: AbortSignal.timeout(20000), headers: { "User-Agent": "Linktery-IndexNow-Release/1.0" } });
  const key = await get(keyLocation);
  if (key.status !== 200 || (await key.text()).trim() !== config.key) throw new Error("IndexNow key is not deployed on the primary domain");
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, urls.length) }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      const response = await get(url);
      if (hashes[url]) {
        if (response.status !== 200 || /noindex/i.test(response.headers.get("x-robots-tag") || "")) throw new Error(`Live URL is not indexable: ${url}`);
        if (contentFingerprint(await response.text(), url) !== hashes[url]) throw new Error(`Live content differs from release: ${url}`);
      } else {
        // A removed URL may become a genuine error, a canonical redirect, or
        // a retained noindex comparison. A still-indexable live page is stale.
        const retired = [404, 410, 301, 308].includes(response.status) ||
          (response.status === 200 && (/noindex/i.test(response.headers.get("x-robots-tag") || "") ||
            /noindex/i.test(new JSDOM(await response.text()).window.document.querySelector('meta[name="robots"]')?.content || "")));
        if (!retired) throw new Error(`Removed URL is not retired on production: ${url}`);
      }
    }
  }));
  const result = await fetchImpl(config.endpoint, {
    method: "POST", redirect: "manual", signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: config.host, key: config.key, keyLocation, urlList: urls }),
  });
  if (![200, 202].includes(result.status)) throw new Error(`IndexNow returned HTTP ${result.status}; receipt was not advanced`);
  return { status: result.status === 202 ? "verification_pending" : "received", submitted: urls.length };
}
