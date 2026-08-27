import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readWorkspaceFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("profile and link URL controls", () => {
  it("uses the project select treatment for the profile domain picker", () => {
    const dashboard = readWorkspaceFile("src/pages/DashboardProfile.tsx");

    expect(dashboard).toContain('data-profile-domain-select="trigger"');
    expect(dashboard).toContain('data-profile-domain-select="content"');
    expect(dashboard).toContain('<div data-profile-domain-value="true" className="flex min-w-0 flex-1 items-center gap-2.5">');
    expect(dashboard).not.toContain('<span className="flex min-w-0 items-center gap-2.5">\n                      <Globe className="h-4 w-4');
    expect(dashboard).toContain('w-[var(--radix-select-trigger-width)]');
    expect(dashboard).toContain("Primary");
    expect(dashboard).toContain("Alias");
    expect(dashboard).not.toContain('<select\n                  value={domain}');
  });

  it("renders the link domain and custom slug as one aligned compound field", () => {
    const createLink = readWorkspaceFile("src/pages/CreateLink.tsx");
    const controlStart = createLink.indexOf('data-link-slug-control="true"');
    const controlEnd = createLink.indexOf("</div>", controlStart);
    const control = createLink.slice(controlStart, controlEnd);

    expect(control).toContain("overflow-hidden rounded-xl border border-border bg-surface");
    expect(control).toContain("focus-within:border-accent/50");
    expect(control).toContain("flex h-12");
    expect(control).toContain("h-12 min-w-0 flex-1 border-0 bg-transparent");
    expect(control).toContain("bg-gradient-to-b from-transparent via-border to-transparent");
    expect(control).not.toContain("sm:gap-2");
  });
});
