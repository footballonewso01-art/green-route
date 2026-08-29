import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CustomDomainRoot from "@/pages/CustomDomainRoot";
import { getPublicCustomDomainTarget } from "@/lib/customDomains";

vi.mock("@/pages/PublicProfile", () => ({ default: ({ slugOverride }: { slugOverride: string }) => <h1>Profile {slugOverride}</h1> }));
vi.mock("@/pages/RedirectHandler", () => ({ default: ({ slugOverride }: { slugOverride: string }) => <h1>Link {slugOverride}</h1> }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("custom-domain visitor recovery", () => {
  it.each(["link", "profile"])("loads a valid %s target through the current hostname", async (type) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ type, id: "asset0000000001", slug: "creator" })));
    vi.stubGlobal("fetch", fetcher);
    render(<CustomDomainRoot />);
    expect(await screen.findByRole("heading", { name: `${type === "link" ? "Link" : "Profile"} creator` })).toBeInTheDocument();
    expect(String(fetcher.mock.calls[0][0])).toBe(`${window.location.origin}/api/public/custom-domain`);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: "omit", cache: "no-store" });
  });

  it("shows an unconnected page only for an actual 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));
    render(<CustomDomainRoot />);
    expect(await screen.findByRole("heading", { name: "This page is not connected." })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("can recover from a temporary outage without claiming the domain is unconnected", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("private origin error", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ type: "profile", id: "asset0000000001", slug: "creator" })));
    vi.stubGlobal("fetch", fetcher);
    render(<CustomDomainRoot />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Profile creator" })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/private origin error/)).not.toBeInTheDocument();
  });

  it.each([null, {}, { type: "profile", id: "asset0000000001", slug: "../admin" }])("rejects malformed successful responses: %j", async (payload) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))));
    await expect(getPublicCustomDomainTarget()).rejects.toMatchObject({ status: 503 });
  });

  it("bounds network waits and classifies timeouts as temporary", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: URL, { signal }: RequestInit) => new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const result = expect(getPublicCustomDomainTarget()).rejects.toMatchObject({ status: 0 });
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
  });
});
