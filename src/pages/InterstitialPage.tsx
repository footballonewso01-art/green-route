import { Chrome } from "lucide-react";

export default function InterstitialPage() {
  const openInChrome = () => {
    window.open(window.location.href, "_system");
  };

  const openInSafari = () => {
    window.location.href = window.location.href;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="glass-card p-8 max-w-sm w-full text-center animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <Chrome className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Open in Your Browser</h1>
        <p className="text-sm text-muted-foreground mb-8">
          For the best experience, please open this link in your default browser.
        </p>
        <div className="space-y-3">
          <button onClick={openInChrome} className="btn-primary-glow w-full">
            Open in Chrome
          </button>
          <button onClick={openInSafari} className="w-full py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200">
            Open in Safari
          </button>
        </div>
      </div>
    </div>
  );
}
