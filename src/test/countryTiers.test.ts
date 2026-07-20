import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/lib/countries";
import {
  COUNTRY_TIER_PACKS,
  getCountryTierKey,
  getCountryTierPack,
} from "@/lib/countryTiers";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Geo Targeting country tier presets", () => {
  it("places every supported country in exactly one tier", () => {
    const tierCodes = COUNTRY_TIER_PACKS.flatMap((tier) => tier.codes);
    const supportedCodes = COUNTRIES.map((country) => country.code);

    expect(new Set(tierCodes).size).toBe(tierCodes.length);
    expect([...new Set(tierCodes)].sort()).toEqual([...supportedCodes].sort());
  });

  it("keeps stable common market assignments and resolves the full pack", () => {
    expect(getCountryTierKey("US")).toBe("TIER_1");
    expect(getCountryTierKey("PL")).toBe("TIER_2");
    expect(getCountryTierKey("AF")).toBe("TIER_3");
    expect(getCountryTierPack("TIER_1")?.codes).toContain("GB");
    expect(getCountryTierPack("TIER_2")?.codes).toContain("BR");
  });

  it("uses exact country rules before tier fallbacks in both redirect renderers", () => {
    const client = readWorkspaceFile("src/pages/RedirectHandler.tsx");
    const server = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");

    expect(client).toMatch(/rules\[countryCode\][\s\S]*getCountryTierKey\(countryCode\)[\s\S]*rules\[tierKey\]/);
    expect(server).toMatch(/rules\[country\][\s\S]*getCountryTierKey\(country\)[\s\S]*rules\[tierKey\]/);
    expect(server).toContain('utils.toPlainTargetingObject(link.getString("geo_targeting"))');
  });
});
