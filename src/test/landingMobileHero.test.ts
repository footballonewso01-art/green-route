import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const landing = fs.readFileSync(
  path.join(process.cwd(), "src/pages/LandingPage.tsx"),
  "utf8",
);

describe("landing mobile hero", () => {
  it("keeps the desktop product visual out of the mobile layout", () => {
    expect(landing).toContain("Desktop-only product visual");
    expect(landing).toContain('className="relative hidden w-full justify-center lg:col-span-6 lg:flex');
    expect(landing).toContain('src="/mobila.webp"');
    expect(landing).not.toContain('className="lg:col-span-6 flex justify-center');
  });

  it("uses mobile-safe viewport, spacing, type, and form controls", () => {
    expect(landing).toContain("items-start overflow-hidden px-4 pb-14 pt-28");
    expect(landing).toContain("lg:min-h-[90vh] lg:items-center");
    expect(landing).toContain("text-[clamp(1.85rem,9.6vw,2.25rem)]");
    expect(landing).toContain('aria-label="Choose your Public Profile address"');
    expect(landing).toContain("prefersReducedMotion");
  });
});
