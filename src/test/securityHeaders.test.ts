import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readJson = <T>(relativePath: string): T =>
  JSON.parse(
    fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"),
  ) as T;

describe("frontend security header policy", () => {
  it("keeps the Vercel fallback aligned with the shared edge policy", () => {
    const shared = readJson<Record<string, string>>(
      "config/security-headers.json",
    );
    const vercel = readJson<{
      headers: Array<{
        source: string;
        headers: Array<{ key: string; value: string }>;
      }>;
    }>("vercel.json");
    const fallbackHeaders = Object.fromEntries(
      vercel.headers
        .find((rule) => rule.source === "/(.*)")
        ?.headers.map(({ key, value }) => [key, value]) ?? [],
    );

    expect(fallbackHeaders).toMatchObject(shared);
  });

  it("allows only the external services used by redirect analytics", () => {
    const shared = readJson<Record<string, string>>(
      "config/security-headers.json",
    );
    const csp = shared["Content-Security-Policy"];

    expect(csp).toContain("https://www.googletagmanager.com");
    expect(csp).toContain("https://cloudflare.com");
    expect(csp).toContain("https://api.stripe.com");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
