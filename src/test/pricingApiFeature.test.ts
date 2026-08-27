import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPublicProfileFeatureCopy, PLANS } from "@/lib/plans";

const readWorkspaceFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("pricing API feature visibility", () => {
  it.each([
    "src/lib/plans.ts",
    "src/pages/LandingPage.tsx",
    "src/pages/PricingPage.tsx",
    "src/pages/DashboardPricing.tsx",
  ])("shows Public API Access explicitly in Pro and Agency in %s", (path) => {
    const source = readWorkspaceFile(path);
    const creatorStart = source.indexOf('id: "creator"');
    const proStart = source.indexOf('id: "pro"');
    const agencyStart = source.indexOf('id: "agency"');

    expect(creatorStart).toBeGreaterThanOrEqual(0);
    expect(proStart).toBeGreaterThan(creatorStart);
    expect(agencyStart).toBeGreaterThan(proStart);
    expect(source.slice(creatorStart, proStart)).not.toContain("Public API Access");
    expect(source.slice(proStart, agencyStart)).toContain("Public API Access");
    expect(source.slice(agencyStart)).toContain("Public API Access");
  });

  it("keeps the Help Center comparison and pricing metadata aligned", () => {
    expect(readWorkspaceFile("src/pages/HelpCenter.tsx")).toContain(
      ">Public API Access</td>",
    );
    expect(readWorkspaceFile("src/lib/seo-config.ts")).toContain(
      "Creator Pro or Agency for Public API access",
    );
  });
});

describe("pricing Public Profile terminology", () => {
  it("uses one product name for every profile allowance", () => {
    expect(getPublicProfileFeatureCopy(1).text).toBe("1 Public Profile");
    expect(getPublicProfileFeatureCopy(3).text).toBe("3 Public Profiles");
    expect(getPublicProfileFeatureCopy(25).text).toBe("25 Public Profiles");

    expect(PLANS.creator.features.map(({ text }) => text)).toContain("1 Public Profile");
    expect(PLANS.pro.features.map(({ text }) => text)).toContain("3 Public Profiles");
    expect(PLANS.agency.features.map(({ text }) => text)).toContain("25 Public Profiles");
  });

  it.each([
    "src/lib/plans.ts",
    "src/pages/LandingPage.tsx",
    "src/pages/PricingPage.tsx",
    "src/pages/DashboardPricing.tsx",
  ])("does not reintroduce legacy pricing names in %s", (path) => {
    const source = readWorkspaceFile(path);

    expect(source).not.toMatch(/Biolink Profiles?|Client Profiles?|Unlimited Biolink Profiles/i);
  });
});
