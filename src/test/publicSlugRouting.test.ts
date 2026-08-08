import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("public /slug routing contract", () => {
  it("keeps the Vercel hot-fallback rewrite during the Cloudflare migration", () => {
    const vercel = JSON.parse(readWorkspaceFile("vercel.json")) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(vercel.rewrites).toContainEqual({ source: "/:slug", destination: "/index.html" });
  });

  it("keeps Cloudflare on the explicit edge router instead of a catch-all SPA fallback", () => {
    const wrangler = JSON.parse(readWorkspaceFile("wrangler.jsonc")) as {
      main: string;
      assets: { not_found_handling: string };
    };

    expect(wrangler.main).toBe("./cloudflare/worker.ts");
    expect(wrangler.assets.not_found_handling).toBe("none");
  });

  it("keeps SEO namespaces ahead of the public username catch-all", () => {
    const appSource = readWorkspaceFile("src/App.tsx");
    const publicSlugRoute = appSource.indexOf('<Route path="/:username" element={<RedirectHandler />} />');

    expect(publicSlugRoute).toBeGreaterThan(-1);
    for (const route of [
      '<Route path="/documentation"',
      '<Route path="/features/:resourceSlug"',
      '<Route path="/templates/:resourceSlug"',
      '<Route path="/guides/:resourceSlug"',
      '<Route path="/tools/utm-builder"',
      '<Route path="/tools/qr-code-generator"',
    ]) {
      const systemRoute = appSource.indexOf(route);
      expect(systemRoute).toBeGreaterThan(-1);
      expect(systemRoute).toBeLessThan(publicSlugRoute);
    }
  });

  it("continues resolving active links and public profiles in parallel with link priority", () => {
    const handlerSource = readWorkspaceFile("src/pages/RedirectHandler.tsx");

    expect(handlerSource).toContain("Promise.allSettled");
    expect(handlerSource).toContain("pb.collection('links').getFirstListItem");
    expect(handlerSource).toContain("pb.collection('public_profiles').getFirstListItem");
    expect(handlerSource).toContain("if (!link && userProfile)");
    expect(handlerSource).toContain("if (!link && !userProfile)");
  });
});
