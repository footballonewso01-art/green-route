import "./AppLoadingScreen.css";

/** Keep this markup in sync with the pre-React fallback in index.html. */
export function AppLoadingScreen() {
  return (
    <div className="app-loading-screen" role="status" aria-live="polite" aria-atomic="true">
      <span className="app-loading-screen__spinner" aria-hidden="true" />
      <p className="app-loading-screen__label">Loading…</p>
    </div>
  );
}
