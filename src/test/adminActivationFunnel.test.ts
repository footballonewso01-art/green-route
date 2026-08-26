import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin activation funnel", () => {
  it("uses one account cohort and real assets for every activation milestone", () => {
    const hooks = read("pocketbase/pb_hooks/main.pb.js");
    const funnelQuery = hooks.slice(
      hooks.indexOf("// 6. Acquisition and activation funnel"),
      hooks.indexOf("var funnelPrev"),
    );
    const responseFunnel = hooks.slice(
      hooks.indexOf("// 13. Activation funnel"),
      hooks.indexOf("return c.json(200", hooks.indexOf("// 13. Activation funnel")),
    );

    expect(funnelQuery).toContain("EXISTS (SELECT 1 FROM links l WHERE l.user_id = u.id)");
    expect(funnelQuery).toContain("EXISTS (SELECT 1 FROM public_profiles pp WHERE pp.user_id = u.id)");
    expect(funnelQuery).not.toContain("ge.event_name IN ('link_created','profile_created')");

    expect(responseFunnel).toContain('{ name: "Accounts created"');
    expect(responseFunnel).toContain('{ name: "First asset built"');
    expect(responseFunnel).toContain('{ name: "First real traffic"');
    expect(responseFunnel).not.toContain('{ name: "Landing visitors"');
    expect(responseFunnel).not.toContain('{ name: "Checkout started"');
    expect(responseFunnel).toContain("Math.min(100");
  });

  it("shows acquisition events as context instead of fake funnel steps", () => {
    const overview = read("src/pages/admin/AdminOverview.tsx");

    expect(overview).toContain("% of cohort");
    expect(overview).toContain("Acquisition signals");
    expect(overview).toContain("Visitors can enter signup without using the hero CTA.");
    expect(overview).not.toContain("step.value / conversionEvents[i - 1].value");
  });
});
