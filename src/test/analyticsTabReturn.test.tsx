import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "@/pages/AnalyticsPage";

const mocks = vi.hoisted(() => ({ send: vi.fn(), cancelRequest: vi.fn(), profiles: vi.fn(), toast: vi.fn(), areaChart: vi.fn() }));
vi.mock("@/lib/pocketbase", () => ({ pb: {
  send: mocks.send, cancelRequest: mocks.cancelRequest,
  filter: (_: string, values: { id: string }) => `user_id="${values.id}"`,
  collection: () => ({ getFullList: mocks.profiles }),
} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner", plan: "agency" } }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));
vi.mock("@/components/analytics/WorldTrafficMap", () => ({ default: () => null }));
vi.mock("recharts", () => ({
  ...Object.fromEntries([
    "Area", "XAxis", "YAxis", "CartesianGrid", "Tooltip", "PieChart", "Pie", "Cell",
  ].map(name => [name, () => null])),
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => children,
  AreaChart: (props: { data?: { date: string; clicks: number }[] }) => { mocks.areaChart(props); return null; },
}));

const profileId = "profile00000001";
const snapshot = (fresh = false) => ({
  views: fresh ? 2 : 1, uniqueViews: 1, cardClicks: fresh ? 2 : 1, ctr: 100,
  total: fresh ? 2 : 1, unique: 1,
  cards: [{ profileLinkId: "card", linkId: "link", title: fresh ? "Updated card" : "Original card", clicks: fresh ? 2 : 1, ctr: 100 }],
  countries: [], countryMap: [], referrers: [], devices: [], browsers: [], os: [], trend: [],
});
const mount = async (query = `?profile=${profileId}`) => {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(<MemoryRouter initialEntries={[`/dashboard/analytics${query}`]}><AnalyticsPage /></MemoryRouter>);
  });
  return view;
};
const returnToTab = async () => {
  await act(async () => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(200);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  mocks.profiles.mockResolvedValue([{ id: profileId, name: "Studio", slug: "studio" }]);
  mocks.send.mockImplementation(async (url: string) => url.includes("/recent")
    ? { items: [] } : snapshot(url.includes("refresh=1")));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Analytics tab-return integration", () => {
  it("matches canonical UTC buckets when rendering the last 24 hours", async () => {
    vi.setSystemTime(new Date("2026-09-06T09:30:00Z"));
    mocks.send.mockImplementation(async (url: string) => url.includes("/recent") ? { items: [] } : {
      ...snapshot(), total: 7, unique: 6,
      trend: [{ date: "2026-09-06T08:00:00Z", clicks: 7 }],
    });
    await mount("?link=link00000000001");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "24h" })); });
    const chartCall = [...mocks.areaChart.mock.calls].reverse().find(([props]) => props.data?.length === 24);
    expect(chartCall).toBeDefined();
    expect(chartCall![0].data.reduce((sum: number, point: { clicks: number }) => sum + point.clicks, 0)).toBe(7);
    expect(mocks.send.mock.calls.some(([url]) => String(url).includes("period=24h"))).toBe(true);
  });

  it.each([profileId, "all"])("refreshes %s with the same selected period and bypasses the response cache", async scope => {
    await mount(`?profile=${scope}`);
    expect(screen.getByText("Original card")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "30d" })); });
    const before = mocks.send.mock.calls.length;
    await returnToTab();
    const calls = mocks.send.mock.calls.slice(before);
    expect(calls).toHaveLength(1);
    expect(new URL(calls[0][0], "https://example.invalid").searchParams.get("profileId")).toBe(scope);
    expect(calls[0][0]).toContain("period=30d");
    expect(calls[0][0]).toContain("refresh=1");
    expect(calls[0][1].cache).toBe("no-store");
    expect(screen.getByText("Updated card")).toBeInTheDocument();
    expect(screen.queryByText("Original card")).not.toBeInTheDocument();
  });

  it("refreshes link statistics and recent activity independently", async () => {
    await mount("?link=link00000000001");
    const before = mocks.send.mock.calls.length;
    await returnToTab();
    const urls = mocks.send.mock.calls.slice(before).map(([url]) => url as string);
    expect(urls).toHaveLength(2);
    expect(urls.some(url => url.startsWith("/api/analytics/stats?") && url.includes("refresh=1") && url.includes("linkId=link00000000001"))).toBe(true);
    expect(urls).toContain("/api/analytics/recent?linkId=link00000000001");
  });

  it("queues a return during initial loading instead of cancelling or overlapping requests", async () => {
    let resolve!: (value: ReturnType<typeof snapshot>) => void;
    mocks.send.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    await mount();
    expect(mocks.send).toHaveBeenCalledTimes(1);
    await returnToTab();
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.cancelRequest).not.toHaveBeenCalled();
    await act(async () => { resolve(snapshot()); });
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send.mock.calls[1][0]).toContain("refresh=1");
    expect(screen.getByText("Updated card")).toBeInTheDocument();
  });

  it("keeps the last successful statistics if a background refresh fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await mount();
    mocks.send.mockRejectedValueOnce(new Error("offline"));
    await returnToTab();
    expect(screen.getByText("Original card")).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith("Couldn't refresh analytics. Showing the last loaded data.");
    expect(screen.queryByLabelText("Refreshing analytics")).not.toBeInTheDocument();
  });

  it("stops scheduled refreshes on unmount", async () => {
    const view = await mount();
    const before = mocks.send.mock.calls.length;
    window.dispatchEvent(new Event("focus"));
    view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(mocks.send).toHaveBeenCalledTimes(before);
    expect(mocks.cancelRequest).toHaveBeenCalledWith("analytics-stats");
  });
});
