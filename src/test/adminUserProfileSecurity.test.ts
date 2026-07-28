import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readWorkspaceFile = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("admin user profile activity", () => {
  it("keeps raw clicks closed and serves bounded admin-only activity", () => {
    const hook = readWorkspaceFile("pocketbase/pb_hooks/main.pb.js");
    const routeStart = hook.indexOf(
      'routerAdd("GET", "/api/admin/users/{id}/activity"',
    );
    const routeEnd = hook.indexOf("// Admin: Update Plan", routeStart);
    const route = hook.slice(routeStart, routeEnd);

    expect(routeStart).toBeGreaterThan(-1);
    expect(route).toContain('admin.get("role") !== "admin"');
    expect(route).toContain("SUM(clicks_count)");
    expect(route).toContain("FROM analytics_daily ad INDEXED BY idx_analytics_daily_link_day");
    expect(route).toContain("FROM links INDEXED BY idx_links_user");
    expect(route).toContain("ad.link_id IN");
    expect(route).toContain("idx_clicks_link_created");
    expect(route).toContain("ORDER BY c.created DESC LIMIT 5");
    expect(route).toContain('perLinkQueries.join(" UNION ALL ")');
  });

  it("does not query the protected clicks collection from the browser", () => {
    const page = readWorkspaceFile("src/pages/admin/AdminUserProfile.tsx");

    expect(page).toContain("/api/admin/users/");
    expect(page).toContain("/activity");
    expect(page).toContain("Promise.allSettled");
    expect(page).not.toContain('pb.collection("clicks")');
  });
});
