import { describe, expect, it } from "vitest";
import { getDashboardBrowserTitle } from "@/lib/browserTitles";
import { SEO_PAGES } from "@/lib/seo-config";

describe("browser title hierarchy", () => {
  it("keeps home and auth tabs short", () => {
    expect(SEO_PAGES.home.title).toBe("Linktery — Link In Bio & Analytics");
    expect(SEO_PAGES.login.title).toBe("Sign in");
    expect(SEO_PAGES.register.title).toBe("Create account");
  });

  it.each([
    ["/dashboard", "Dashboard"],
    ["/dashboard/links", "Links"],
    ["/dashboard/links/create", "Create link"],
    ["/dashboard/links/edit/abc", "Edit link"],
    ["/dashboard/analytics", "Analytics"],
    ["/dashboard/profile", "Profiles"],
    ["/dashboard/profile/profile-1", "Profiles"],
    ["/dashboard/pricing", "Pricing"],
    ["/dashboard/partner", "Partner Overview"],
    ["/dashboard/settings", "Settings"],
    ["/dashboard/help", "Help Center"],
    ["/admin/overview", "Admin Overview"],
    ["/admin/users", "Admin Users"],
    ["/admin/users/user-1", "Admin User"],
    ["/admin/links", "Link Safety"],
    ["/admin/promocodes", "Promocodes"],
    ["/admin/promocodes/promo-1", "Promocode Details"],
  ])("maps %s to %s", (pathname, title) => {
    expect(getDashboardBrowserTitle(pathname)).toBe(title);
  });
});
