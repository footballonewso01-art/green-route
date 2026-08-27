import { useEffect, useState } from "react";
import { Menu, User as UserIcon, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";

interface MarketingHeaderProps {
  current?: "home" | "documentation";
}

export default function MarketingHeader({ current = "home" }: MarketingHeaderProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", handleDesktopChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleDesktopChange);
    };
  }, [mobileOpen]);

  const showUser = mounted && Boolean(user);
  const avatarUrl = user?.avatar
    ? pb.files.getUrl(user, user.avatar, { thumb: "100x100" })
    : "";
  const featuresHref = current === "home" ? "#features" : "/#features";
  const pricingHref = current === "home" ? "#pricing" : "/pricing";

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl"
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80 sm:gap-3">
          <img src="/logo.webp" alt="" className="h-10 w-auto mix-blend-screen sm:h-[54px]" />
          <span className="text-xl font-extrabold tracking-tight text-foreground sm:text-[21px]">Linktery</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href={featuresHref} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href={pricingHref} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
          <Link
            to="/documentation"
            aria-current={current === "documentation" ? "page" : undefined}
            className={current === "documentation"
              ? "text-sm font-medium text-accent"
              : "text-sm text-muted-foreground transition-colors hover:text-foreground"}
          >
            Documentation
          </Link>

          {showUser ? (
            <Link to="/dashboard" className="group flex items-center gap-3">
              <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                Dashboard
              </span>
              <div className="h-8 w-8 overflow-hidden rounded-full border border-accent/30 p-0.5 transition-colors group-hover:border-accent">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Account avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-accent/10">
                    <UserIcon className="h-4 w-4 text-accent" />
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Login
              </Link>
              <Link to="/register" className="btn-primary-glow inline-block !px-4 !py-2 text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          {showUser ? (
            <Link
              to="/dashboard"
              aria-label="Open dashboard"
              className="h-9 w-9 overflow-hidden rounded-full border border-accent/30 p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-accent/10">
                  <UserIcon className="h-4 w-4 text-accent" />
                </span>
              )}
            </Link>
          ) : (
            <Link
              to="/register"
              className="btn-primary-glow inline-flex min-h-10 items-center justify-center whitespace-nowrap !rounded-lg !px-3 !py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-sm"
            >
              Start free
            </Link>
          )}
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-marketing-navigation"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-surface/60 text-foreground transition-colors hover:border-accent/40 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-marketing-navigation" className="border-t border-border/50 bg-background/95 shadow-2xl shadow-black/30 md:hidden">
          <div className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:px-6">
            <a
              href={featuresHref}
              onClick={() => setMobileOpen(false)}
              className="inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Features
            </a>
            <a
              href={pricingHref}
              onClick={() => setMobileOpen(false)}
              className="inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Pricing
            </a>
            <Link
              to="/documentation"
              aria-current={current === "documentation" ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className="inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Documentation
            </Link>
            <div className="my-1 h-px bg-border/50" />
            <Link
              to={showUser ? "/dashboard" : "/login"}
              onClick={() => setMobileOpen(false)}
              className="inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {showUser ? "Open Dashboard" : "Login"}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
