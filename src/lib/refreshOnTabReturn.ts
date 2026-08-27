// Refresh on return, not on an interval. Browsers often fire both focus and
// visibilitychange for one return; debounce them and keep at most one follow-up
// while a request is running. Hidden tabs never perform scheduled work.
export function refreshOnTabReturn(refresh: () => void | Promise<void>): () => void {
  const minimumIntervalMs = 10_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastStartedAt = -Infinity;
  let running = false;
  let pending = false;
  let disposed = false;

  const visible = () => document.visibilityState !== "hidden";
  const clearScheduled = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const schedule = () => {
    if (disposed || !visible()) return;
    pending = true;
    if (running || timer !== undefined) return;
    const delay = Math.max(200, lastStartedAt + minimumIntervalMs - Date.now());
    timer = setTimeout(() => {
      timer = undefined;
      if (disposed || !visible()) return;
      pending = false;
      running = true;
      lastStartedAt = Date.now();
      // Callers handle user-facing errors. A failed background refresh must
      // still release the guard and never become an unhandled rejection.
      Promise.resolve().then(refresh).catch(() => {}).finally(() => {
        running = false;
        if (pending && !disposed) schedule();
      });
    }, delay);
  };
  const onVisibilityChange = () => {
    if (visible()) schedule();
    else {
      pending = false;
      clearScheduled();
    }
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) schedule();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", schedule);
  window.addEventListener("pageshow", onPageShow);
  return () => {
    disposed = true;
    pending = false;
    clearScheduled();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", schedule);
    window.removeEventListener("pageshow", onPageShow);
  };
}
