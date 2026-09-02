import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("dashboard visual system", () => {
  it("isolates the new brand palette to the authenticated shell", () => {
    const theme = read("src/styles/dashboard-rebrand.css");
    const tokens = read("tokens.css");
    expect(theme).toContain(":root:has(.dashboard-shell)");
    expect(tokens).toContain("--app-canvas: oklch(12.8% 0.012 158)");
    expect(tokens).toContain("--app-panel: var(--landing-media)");
    expect(theme).not.toMatch(/\.landing-rebrand\s*\{/);
  });

  it("uses the light wordmark without a duplicate sidebar label and preserves the familiar navigation", () => {
    const layout = read("src/components/DashboardLayout.tsx");
    expect(layout).toContain('import BrandWordmark from "@/components/BrandWordmark"');
    expect(layout).toContain('<BrandWordmark tone="light" />');
    expect(layout).not.toContain("linktery-logo-mark.svg");
    expect(layout).not.toContain("<span>Linktery</span>");
    expect(layout).toContain('className="dashboard-sidebar"');
    for (const item of ["Dashboard", "Links", "Analytics", "Profiles", "Pricing", "Settings", "Help Center"]) {
      expect(layout).toContain(`title: "${item}"`);
    }
  });

  it("keeps the complete workspace navigation reachable on mobile", () => {
    const layout = read("src/components/DashboardLayout.tsx");
    const theme = read("src/styles/dashboard-rebrand.css");
    expect(layout).toContain('className="dashboard-mobile-menu"');
    expect(layout).toContain('<SheetContent side="left"');
    expect(layout).toContain('renderNavigationBody("mobile")');
    expect(layout).toContain('aria-label="Profiles"');
    expect(theme).toContain(".dashboard-mobile-sheet");
    expect(theme).toContain(".dashboard-mobile-brand, .dashboard-mobile-menu, .dashboard-bottom-nav { display: none; }");
  });

  it("reacts to compact viewport changes instead of reading window width during render", () => {
    const links = read("src/pages/LinksManager.tsx");
    expect(links).toContain('window.matchMedia("(max-width: 39.99rem)")');
    expect(links).toContain('compactQuery.addEventListener("change", syncViewport)');
    expect(links).not.toContain("window.innerWidth < 640");
  });

  it("migrates deep workspace editors to route-local dashboard surfaces", () => {
    const createLink = read("src/pages/CreateLink.tsx");
    const createLinkStyles = read("src/pages/CreateLink.module.css");
    const profile = read("src/pages/DashboardProfile.tsx");
    const billing = read("src/pages/Billing.tsx");
    expect(createLink).toContain("<DashboardPage");
    expect(createLink).toContain("<DashboardPanel as=\"form\"");
    expect(createLinkStyles).toContain("width: min(100%, 42rem)");
    expect(createLinkStyles).toContain("margin-inline: 0");
    expect(createLinkStyles).not.toContain("margin-inline: auto");
    expect(profile).toContain("<DashboardPage");
    expect(profile).not.toContain("glass-card");
    expect(billing).toContain("<DashboardPage");
    expect(billing).not.toContain("glass-card");
  });

  it("renders Admin inside the same authenticated workspace shell", () => {
    const app = read("src/App.tsx");
    const adminRoute = read("src/components/AdminRoute.tsx");
    expect(app).toContain('<Route path="/admin" element={<AdminRoute />}>');
    expect(app).toContain('<Route element={<DashboardLayout />}>');
    expect(adminRoute).not.toContain("useSeo");
  });

  it("uses short route-aware browser titles throughout the authenticated workspace", () => {
    const layout = read("src/components/DashboardLayout.tsx");
    const titles = read("src/lib/browserTitles.ts");
    expect(layout).toContain("getDashboardBrowserTitle(location.pathname)");
    for (const title of ["Dashboard", "Links", "Analytics", "Profiles", "Partner Overview", "Settings", "Help Center"]) {
      expect(titles).toContain(`return "${title}"`);
    }
    expect(titles).not.toContain("| Linktery");
  });

  it("uses a product preview instead of an empty paid-analytics placeholder", () => {
    const analytics = read("src/pages/AnalyticsPage.tsx");
    const styles = read("src/pages/AnalyticsPage.module.css");
    expect(analytics).toContain("See what drives every click.");
    expect(analytics).toContain("className={styles.lockedPreview}");
    expect(analytics).not.toContain("<DashboardEmptyState");
    expect(styles).toContain("filter: blur(1.6px)");
    expect(styles).toContain("var(--app-panel-sunken)");
  });

  it("keeps the top bar quiet while making plan context and the Agency CTA legible", () => {
    const layout = read("src/components/DashboardLayout.tsx");
    const theme = read("src/styles/dashboard-rebrand.css");
    expect(layout).not.toContain("dashboard-topbar__location");
    expect(layout).not.toContain("<span>Workspace</span>");
    expect(layout).toContain('className="dashboard-plan-badge__mark"');
    expect(layout).toContain('className="dashboard-plan-badge__label"');
    expect(theme).toMatch(/\.dashboard-plan-badge[^}]+height: var\(--app-control-height-sm\)/);
    expect(theme).toMatch(/\.dashboard-plan-badge[^}]+border-radius: var\(--app-radius-pill\)/);
    expect(theme).toMatch(/\.dashboard-plan-badge__label[^}]+translateY\(\.03rem\)/);
    expect(theme).toMatch(/\.dashboard-avatar[^}]+width: 2\.5rem[^}]+height: 2\.5rem/);
    expect(theme).toMatch(/\.dashboard-upsell[^}]+linear-gradient[^}]+box-shadow/);
    expect(theme).not.toMatch(/\.dashboard-upsell\s*\{[^}]+background:\s*var\(--app-accent\)/);
  });

  it("uses one restrained chrome treatment for sidebar access tiers", () => {
    const layout = read("src/components/DashboardLayout.tsx");
    const theme = read("src/styles/dashboard-rebrand.css");
    expect(layout).toContain('accessTier?: "pro" | "agency"');
    expect(layout).toContain('accessTier: "pro"');
    expect(layout).toContain('data-tier={item.accessTier}');
    expect(theme).toContain(".dashboard-nav__tier");
    expect(theme).toContain('.dashboard-nav__tier[data-tier="agency"]');
    expect(theme).toMatch(/\.dashboard-nav__tier[^}]+linear-gradient[^}]+box-shadow/);
  });

  it("uses one credential-field boundary and visual help wayfinding", () => {
    const api = read("src/components/settings/ApiAccessSettings.tsx");
    const apiStyles = read("src/components/settings/ApiAccessSettings.module.css");
    const help = read("src/pages/HelpCenter.tsx");
    expect(api).toContain("className={styles.keyField}");
    expect(apiStyles).toContain(".keyField .keyInput");
    expect(apiStyles).toContain("border: 0");
    expect(help).toContain("function CategoryVisual");
    expect(help).toContain("data-category={cat.id}");
  });

  it("does not show fabricated dashboard change values", () => {
    const home = read("src/pages/DashboardHome.tsx");
    expect(home).not.toContain('change: "+0');
    expect(home).not.toContain("gradient-text");
    expect(home).not.toContain("Account ID");
    const settings = read("src/pages/SettingsPage.tsx");
    expect(settings).toContain("Account ID");
    expect(settings).toContain("{user?.id || \"—\"}");
  });

  it("uses a compact workbench hierarchy with purposeful empty states", () => {
    const home = read("src/pages/DashboardHome.tsx");
    const styles = read("src/pages/DashboardHome.module.css");
    expect(home).toContain("<h1>Dashboard</h1>");
    expect(home).toContain('to="/dashboard/links/create"');
    expect(home).toContain("Traffic will appear here");
    expect(home).toContain("className={styles.metrics}");
    expect(styles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(styles).not.toContain("backdrop-filter");
  });

  it("defines every shell size and contrast token used by responsive route styles", () => {
    const tokens = read("tokens.css");
    const settings = read("src/pages/SettingsPage.module.css");
    expect(tokens).toContain("--app-control-height-sm: 2.25rem");
    expect(tokens).toContain("--app-control-height-lg: 3rem");
    expect(tokens).toContain("--app-rule-strong: var(--app-control-rule)");
    expect(settings).toContain("max-height: calc(100dvh - 13.75rem)");
  });
});
