import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isReservedPublicSlug,
  isSystemRoute,
  PUBLIC_RESERVED_SLUGS,
} from "@/lib/systemRoutes";

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

  it("reserves infrastructure routes without blocking similar user slugs", () => {
    expect(isReservedPublicSlug("api")).toBe(true);
    expect(isReservedPublicSlug("assets")).toBe(true);
    expect(isReservedPublicSlug("features")).toBe(true);
    expect(isReservedPublicSlug("api-creator")).toBe(false);
    expect(isReservedPublicSlug("features-nasty")).toBe(false);
  });

  it("keeps the frontend and PocketBase slug policies synchronized", () => {
    const source = readFileSync(
      resolve(process.cwd(), "pocketbase/pb_hooks/utils.js"),
      "utf8",
    );
    const policyBlock = source.match(
      /var SYSTEM_ROUTE_SLUGS = \{([\s\S]*?)\n\};/,
    )?.[1] ?? "";
    const backendSlugs = [...policyBlock.matchAll(/"([^"]+)": true/g)]
      .map((match) => match[1])
      .sort();

    expect(backendSlugs).toEqual([...PUBLIC_RESERVED_SLUGS].sort());
  });
});
