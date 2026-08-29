import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomDomainsSettings } from "@/components/settings/CustomDomainsSettings";

const domainApi = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  verify: vi.fn(),
  remove: vi.fn(),
}));

const collection = vi.hoisted(() => vi.fn());

vi.mock("@/lib/customDomains", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/customDomains")>();
  return {
    ...original,
    listCustomDomains: domainApi.list,
    createCustomDomain: domainApi.create,
    updateCustomDomainTarget: domainApi.update,
    verifyCustomDomain: domainApi.verify,
    deleteCustomDomain: domainApi.remove,
  };
});

vi.mock("@/lib/pocketbase", () => ({
  pb: {
    authStore: { model: { id: "user00000000001" } },
    filter: (template: string) => template,
    collection,
  },
}));

describe("Custom Domains settings UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collection.mockImplementation((name: string) => ({
      getList: vi.fn().mockResolvedValue({ items: name === "public_profiles"
        ? [{ id: "profile00000001", name: "Main profile", slug: "creator", domain: "linktery.com" }]
        : [{ id: "link0000000001", title: "Store", slug: "store", domain: "linktery.com", active: true }] }),
    }));
    domainApi.list.mockResolvedValue({
      available: true,
      entitled: true,
      enabled: true,
      limit: 10,
      total: 1,
      provisioning_limit: 30,
      provisioning_used: 1,
      provisioning_remaining: 29,
      provisioning_resets_at: "2026-09-28T00:00:00Z",
      domains: [{
        id: "domain000000001",
        hostname: "brand.example",
        target_type: "profile",
        target_id: "profile00000001",
        status: "pending",
        hostname_status: "pending",
        ssl_status: "pending",
        ownership_verified: false,
        cname: { name: "brand.example", value: "domains.linktery.com" },
        ownership: { type: "txt", name: "_linktery-verification.brand.example", value: "verify-token" },
        ssl_validation: { type: "txt", name: "", value: "" },
        last_checked_at: "",
        activated_at: "",
        created: "",
        updated: "",
      }],
    });
  });

  it("explains the root-domain outcome and presents the current DNS step", async () => {
    render(<MemoryRouter><CustomDomainsSettings /></MemoryRouter>);

    expect(await screen.findByRole("heading", { name: "Custom Domains" })).toBeInTheDocument();
    expect(screen.getByText(/no \/slug in the public address/i)).toBeInTheDocument();
    expect(screen.getByText("1 / 10 domains")).toBeInTheDocument();
    expect(screen.getByText(/Verified hostname setups: 1 \/ 30/i)).toBeInTheDocument();
    expect(screen.getAllByText("brand.example").length).toBeGreaterThan(0);
    expect(screen.getByText("1 record")).toBeInTheDocument();
    expect(screen.getByText("Ownership")).toBeInTheDocument();
    expect(screen.queryByText("Traffic")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy ownership name/i })).toBeInTheDocument();
    expect(screen.getByText("Need help?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check brand\.example/i })).toHaveTextContent("Check");
    expect(screen.getByText(/some providers can take up to 24 hours/i)).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
  });

  it("shows additional certificate records only when the provider requires them", async () => {
    domainApi.list.mockResolvedValueOnce({
      available: true,
      entitled: true,
      enabled: true,
      limit: 10,
      total: 1,
      provisioning_limit: 30,
      provisioning_used: 1,
      provisioning_remaining: 29,
      provisioning_resets_at: "2026-09-28T00:00:00Z",
      page: 1,
      has_more: false,
      domains: [{
        id: "domain000000001",
        hostname: "brand.example",
        target_type: "profile",
        target_id: "profile00000001",
        target_name: "Main profile",
        status: "pending",
        hostname_status: "ownership_pending",
        ssl_status: "pending_validation",
        ownership_verified: true,
        cname: { name: "brand.example", value: "domains.linktery.com" },
        ownership: { type: "txt", name: "_linktery-verification.brand.example", value: "verify-token" },
        hostname_validation: { type: "txt", name: "_cf-custom-hostname.brand.example", value: "hostname-token" },
        ssl_validations: [{ type: "txt", name: "_acme-challenge.brand.example", value: "certificate-token" }],
        ssl_validation: { type: "txt", name: "_acme-challenge.brand.example", value: "certificate-token" },
        last_checked_at: "",
        activated_at: "",
        created: "",
        updated: "",
      }],
    });

    render(<MemoryRouter><CustomDomainsSettings /></MemoryRouter>);

    expect(await screen.findByText("Finish DNS setup")).toBeInTheDocument();
    expect(screen.getByText("2 records")).toBeInTheDocument();
    expect(screen.getByText("Domain verification")).toBeInTheDocument();
    expect(screen.getByText("HTTPS verification")).toBeInTheDocument();
    expect(screen.queryByText("Traffic")).not.toBeInTheDocument();
    expect(screen.queryByText("Ownership")).not.toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
  });

  it("accepts a pasted URL and turns it into a clear hostname before submission", async () => {
    render(<MemoryRouter><CustomDomainsSettings /></MemoryRouter>);
    const input = await screen.findByPlaceholderText("brand.com");

    fireEvent.change(input, { target: { value: "HTTPS://Shop.Example/path?campaign=1" } });
    fireEvent.blur(input);

    await waitFor(() => expect(input).toHaveValue("shop.example"));
  });

  it("loads destinations only when needed and selects an owned profile", async () => {
    render(<MemoryRouter><CustomDomainsSettings /></MemoryRouter>);
    const picker = await screen.findByRole("combobox", { name: "Choose Public Profile" });
    expect(collection).not.toHaveBeenCalled();
    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole("option", { name: /Main profile/ }));
    expect(picker).toHaveTextContent("Main profile");
    expect(screen.getByRole("button", { name: "Connect domain" })).toBeEnabled();
  });

  it("offers a retry instead of presenting an outage as an empty account", async () => {
    domainApi.list.mockRejectedValueOnce(new Error("offline"));
    render(<MemoryRouter><CustomDomainsSettings /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Custom Domains" })).toBeInTheDocument();
  });
});
