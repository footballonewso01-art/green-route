import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router-dom";

const { writeTextMock } = vi.hoisted(() => ({
  writeTextMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/lib/pocketbase", () => ({
  pocketBaseUrl: "https://api.example.test",
  pb: {
    files: {
      getUrl: vi.fn(),
    },
  },
}));

import DocumentationPage from "@/pages/DocumentationPage";

const readWorkspaceFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("public API documentation", () => {
  beforeEach(() => {
    writeTextMock.mockReset();
    writeTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock },
    });
  });

  it("explains the owner-scoped API from first request through analytics", () => {
    render(
      <MemoryRouter>
        <DocumentationPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Linktery API documentation" }))
      .toBeInTheDocument();
    expect(screen.getByText("https://api.linktery.com/v1")).toBeInTheDocument();
    expect(screen.getByText("/links/{id}/analytics?period=30d")).toBeInTheDocument();
    expect(screen.getByText("/profiles/{id}/links")).toBeInTheDocument();
    expect(screen.getByText(/never returns raw click rows/i)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Linktery API limits by plan" })).toBeInTheDocument();

    const documentationLink = screen.getByRole("link", { name: "Documentation" });
    expect(documentationLink).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Open API Access/i }))
      .toHaveAttribute("href", "/dashboard/settings?section=api");
  });

  it("copies the environment-specific API base URL", async () => {
    render(
      <MemoryRouter>
        <DocumentationPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy API base URL" }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("https://api.linktery.com/v1");
    });
    expect(screen.getByRole("button", { name: "Copy API base URL copied" }))
      .toBeInTheDocument();
  });

  it("wires documentation into the landing header and reserves its public slug in the database", () => {
    const landing = readWorkspaceFile("src/pages/LandingPage.tsx");
    const header = readWorkspaceFile("src/components/MarketingHeader.tsx");
    const migration = readWorkspaceFile(
      "pocketbase/pb_migrations/1785715200_reserve_documentation_system_slug.js",
    );

    expect(landing).toContain('<MarketingHeader current="home" />');
    expect(header).toContain('to="/documentation"');
    expect(header).toContain("md:hidden");
    expect(migration).toContain("WHERE lower(slug) = 'documentation'");
    expect(migration).toContain("WHEN lower(NEW.slug) = 'documentation'");
    expect(migration).toContain("Cannot reserve /documentation");
  });

  it("keeps the published plan limits synchronized with the server catalog", () => {
    const page = readWorkspaceFile("src/pages/DocumentationPage.tsx");
    const backend = readWorkspaceFile("pocketbase/pb_hooks/utils.js");

    expect(backend).toContain('"pro": { "links": 15');
    expect(backend).toContain('"apiRatePerMinute": 60');
    expect(backend).toContain('"apiWriteRatePerMinute": 15');
    expect(backend).toContain('"apiAnalyticsRatePerMinute": 20');
    expect(backend).toContain('"apiWriteDailyLimit": 1000');
    expect(backend).toContain('"apiCreateDailyLimit": 100');
    expect(backend).toContain('"agency": { "links": -1');
    expect(backend).toContain('"apiRatePerMinute": 300');
    expect(backend).toContain('"apiWriteRatePerMinute": 60');
    expect(backend).toContain('"apiAnalyticsRatePerMinute": 60');
    expect(backend).toContain('"apiWriteDailyLimit": 10000');
    expect(backend).toContain('"apiCreateDailyLimit": 2000');

    for (const publishedLimit of [
      "60/min", "15/min", "20/min", "100 creates, 1,000 mutations",
      "300/min", "2,000 creates, 10,000 mutations",
    ]) {
      expect(page).toContain(publishedLimit);
    }
  });

  it("publishes only the branded API gateway URL", () => {
    const page = readWorkspaceFile("src/pages/DocumentationPage.tsx");
    const openApi = readWorkspaceFile("docs/openapi-v1.yaml");
    const guide = readWorkspaceFile("docs/public-api-v1.md");

    for (const artifact of [page, openApi, guide]) {
      expect(artifact).not.toContain("greenroute-pb.fly.dev");
      expect(artifact).not.toContain("greenroute-pb-staging.fly.dev");
    }
    expect(openApi).toContain("url: https://api.linktery.com/v1");
    expect(guide).toContain("https://api.linktery.com/v1");
  });
});
