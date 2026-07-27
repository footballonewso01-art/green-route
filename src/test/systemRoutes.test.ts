import { describe, expect, it } from "vitest";
import { isSystemRoute } from "@/lib/systemRoutes";

describe("system route namespace policy", () => {
  it("recognizes exact SEO namespaces and their child pages", () => {
    expect(isSystemRoute("/features")).toBe(true);
    expect(isSystemRoute("/features/url-shortener")).toBe(true);
    expect(isSystemRoute("/tools/utm-builder")).toBe(true);
    expect(isSystemRoute("/templates/link-in-bio")).toBe(true);
    expect(isSystemRoute("/guides/what-is-link-management")).toBe(true);
    expect(isSystemRoute("/ref/lt_partner123")).toBe(true);
  });

  it("does not reserve similar single-segment user slugs", () => {
    expect(isSystemRoute("/nasty")).toBe(false);
    expect(isSystemRoute("/features-nasty")).toBe(false);
    expect(isSystemRoute("/pricing-offer")).toBe(false);
    expect(isSystemRoute("/guidescreator")).toBe(false);
  });
});
