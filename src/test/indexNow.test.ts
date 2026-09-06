// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { changedUrls, contentFingerprint, isMarketingUrl, submitIndexNow } from "../../scripts/indexnow-lib.mjs";
import config from "../../scripts/indexnow-config.json";

const url = "https://linktery.com/guides/telegram-link-tracking";
const html = (copy = "Test guide") => `<html><head><title>Guide</title><meta name="description" content="A guide"><meta name="robots" content="index,follow"><link rel="canonical" href="${url}"></head><body><main class="old"><h1>${copy}</h1><p>Body</p></main><script src="/old.js"></script></body></html>`;

describe("IndexNow release notification", () => {
  it("only accepts canonical marketing URLs, never profiles, aliases or staging", () => {
    expect(isMarketingUrl(url)).toBe(true);
    for (const candidate of ["https://linktery.com/sainte", "https://linktery.com/dashboard", "https://linktery.com/guides/a?token=1", "https://linktery.bio/features", "https://test.workers.dev/guides/a"]) expect(isMarketingUrl(candidate)).toBe(false);
    expect(() => changedUrls({ "https://linktery.com/userprofile": "x" }, {})).toThrow();
  });
  it("ignores bundle-only changes but detects body and removed URL changes", () => {
    expect(contentFingerprint(html(), url)).toBe(contentFingerprint(html().replace("old.js", "new.js").replace('class="old"', 'class="new"'), url));
    expect(contentFingerprint(html("Changed"), url)).not.toBe(contentFingerprint(html(), url));
    expect(changedUrls({}, { [url]: "hash" })).toEqual([url]);
    expect(changedUrls({ [url]: "hash" }, { [url]: "hash" })).toEqual([]);
  });
  it("rejects staging before doing any network work", async () => {
    const fetchImpl = vi.fn();
    await expect(submitIndexNow({ config, hashes: { [url]: "x" }, mode: "staging", fetchImpl })).rejects.toThrow("production");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("verifies the key and exact live content before sending one batch", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(config.key))
      .mockResolvedValueOnce(new Response(html()))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const result = await submitIndexNow({ config, hashes: { [url]: contentFingerprint(html(), url) }, mode: "production", fetchImpl });
    expect(result).toEqual({ status: "verification_pending", submitted: 1 });
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body).urlList).toEqual([url]);
  });
  it("does not submit unshipped local edits", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(config.key)).mockResolvedValueOnce(new Response(html("Old content")));
    await expect(submitIndexNow({ config, hashes: { [url]: contentFingerprint(html(), url) }, mode: "production", fetchImpl })).rejects.toThrow("differs");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("leaves failures retryable and accepts a genuine removed URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(config.key)).mockResolvedValueOnce(new Response(null, { status: 404 })).mockResolvedValueOnce(new Response(null, { status: 429 }));
    await expect(submitIndexNow({ config, hashes: {}, previous: { [url]: "old" }, mode: "production", fetchImpl })).rejects.toThrow("429");
  });
});
