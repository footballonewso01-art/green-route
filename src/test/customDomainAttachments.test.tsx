import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomDomainAttachments } from "@/components/CustomDomainAttachments";
import { listCustomDomainsForTarget } from "@/lib/customDomains";

vi.mock("@/lib/customDomains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/customDomains")>();
  return { ...actual, listCustomDomainsForTarget: vi.fn() };
});

describe("CustomDomainAttachments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a root custom-domain attachment separately from Linktery primary and alias addresses", async () => {
    vi.mocked(listCustomDomainsForTarget).mockResolvedValue({
      available: true,
      entitled: true,
      enabled: true,
      limit: 10,
      total: 1,
      page: 1,
      has_more: false,
      domains: [{
        id: "domain123456789",
        hostname: "brand.example.com",
        target_type: "link",
        target_id: "link1234567890",
        status: "active",
        hostname_status: "active",
        ssl_status: "active",
        cname: { name: "brand.example.com", value: "domains.linktery.com" },
        ownership: { type: "TXT", name: "_linktery-verification.brand.example.com", value: "proof" },
        ssl_validation: { type: "TXT", name: "", value: "" },
        last_checked_at: "",
        activated_at: "",
        created: "",
        updated: "",
      }],
    });

    render(
      <MemoryRouter>
        <CustomDomainAttachments targetType="link" targetId="link1234567890" />
      </MemoryRouter>,
    );

    expect(await screen.findByText("brand.example.com")).toBeInTheDocument();
    expect(screen.getByText("Root URL")).toBeInTheDocument();
    expect(screen.getByText("HTTPS ready")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage/i })).toHaveAttribute("href", "/dashboard/settings?section=domains");
    expect(listCustomDomainsForTarget).toHaveBeenCalledWith("link", "link1234567890");
  });

  it("refreshes the attachment when the editor regains focus", async () => {
    vi.mocked(listCustomDomainsForTarget).mockResolvedValue({
      available: true,
      entitled: true,
      enabled: true,
      limit: 10,
      total: 0,
      page: 1,
      has_more: false,
      domains: [],
    });

    render(
      <MemoryRouter>
        <CustomDomainAttachments targetType="profile" targetId="profile1234567" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(listCustomDomainsForTarget).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event("focus"));
    await waitFor(() => expect(listCustomDomainsForTarget).toHaveBeenCalledTimes(2));
  });
});
