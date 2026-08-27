import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshOnTabReturn } from "@/lib/refreshOnTabReturn";

let stop: (() => void) | undefined;
const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
  document.dispatchEvent(new Event("visibilitychange"));
};

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility("visible");
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
});

describe("refresh on tab return", () => {
  it("does not poll, and coalesces visibility + focus into one refresh", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    stop = refreshOnTabReturn(refresh);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).not.toHaveBeenCalled();
    setVisibility("hidden");
    setVisibility("visible");
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("throttles rapid returns, queues one refresh, and drops work when hidden", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    stop = refreshOnTabReturn(refresh);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(200);
    for (let i = 0; i < 10; i++) window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(9999);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("focus"));
    setVisibility("hidden");
    await vi.advanceTimersByTimeAsync(60_000);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(2);
    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("never overlaps running refreshes", async () => {
    let resolve!: () => void;
    const refresh = vi.fn().mockImplementationOnce(() => new Promise<void>(done => { resolve = done; })).mockResolvedValue(undefined);
    stop = refreshOnTabReturn(refresh);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(200);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    resolve();
    await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("cleans up pending work and can recover after a failed refresh", async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    stop = refreshOnTabReturn(refresh);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(200);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("focus"));
    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("refreshes a bfcache restoration but not the initial pageshow", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    stop = refreshOnTabReturn(refresh);
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false }));
    await vi.advanceTimersByTimeAsync(200);
    expect(refresh).not.toHaveBeenCalled();
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
