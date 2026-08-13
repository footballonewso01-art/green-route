import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("admin overview plan distribution", () => {
  it("groups legacy empty plans into one canonical Creator segment", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const distributionStart = hook.indexOf("// 9. Plan distribution");
    const distributionEnd = hook.indexOf("// 10. Top Creators", distributionStart);
    const distribution = hook.slice(distributionStart, distributionEnd);

    expect(distributionStart).toBeGreaterThan(-1);
    expect(distribution).toContain("lower(trim(coalesce(plan, '')))");
    expect(distribution).toContain("ELSE 'creator' END as plan_id");
    expect(distribution).toContain("GROUP BY plan_id");
    expect(distribution).toContain(
      "ORDER BY CASE plan_id WHEN 'creator' THEN 0 WHEN 'pro' THEN 1 WHEN 'agency' THEN 2",
    );
    expect(distribution).not.toContain(
      "SELECT plan as name, count(*) as value FROM users GROUP BY plan",
    );
  });
});
