import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readLayout = () =>
  readFileSync(resolve(process.cwd(), "src/components/DashboardLayout.tsx"), "utf8");

describe("dashboard Agency upsell", () => {
  it("replaces the usage tracker with a pricing CTA for non-Agency users", () => {
    const layout = readLayout();

    expect(layout).toContain('to="/dashboard/pricing"');
    expect(layout).toContain("Get Agency Plan");
    expect(layout).toContain("Unlock everything");
    expect(layout).toContain("!hasActiveAgency");
    expect(layout).not.toContain("Unlimited Links");
    expect(layout).not.toContain("Your plan link limit");
    expect(layout).not.toContain("collection('links').getList");
  });

  it("treats only a non-expired Agency plan as active", () => {
    const layout = readLayout();

    expect(layout).toContain('planId === "agency"');
    expect(layout).toContain("agencyExpiryMs > Date.now()");
    expect(layout).toContain("agencyExpiryMs === null");
  });
});
