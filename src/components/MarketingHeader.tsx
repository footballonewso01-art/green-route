import { useEffect, useState } from "react";
import { Menu, User as UserIcon, X } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import BrandWordmark from "@/components/BrandWordmark";

interface MarketingHeaderProps {
  current?: "home" | "documentation" | "features" | "pricing" | "templates" | "solutions" | "tools" | "guides" | "alternatives" | "legal" | "system";
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
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
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
  const featuresHref = current === "home" ? "#features" : current === "documentation" ? "/#features" : "/features";
  const pricingHref = current === "home" ? "#pricing" : "/pricing";
  const isLanding = current === "home" || current === "features" || current === "pricing" || current === "documentation" || current === "templates" || current === "solutions" || current === "tools" || current === "guides" || current === "alternatives" || current === "legal" || current === "system";

  return (
    <nav
      className={isLanding
        ? "marketing-header marketing-header--landing fixed z-50"
        : "marketing-header marketing-header--default fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl"}
      aria-label="Primary navigation"
      data-landing-header={isLanding ? "true" : undefined}
    >
      <div className="marketing-header__inner mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="marketing-header__brand flex shrink-0 items-center text-foreground" aria-label="Linktery home">
          <BrandWordmark tone="dark" className="marketing-header__wordmark" />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <a href={featuresHref} aria-current={current === "features" ? "page" : undefined} className="marketing-header__link text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href={pricingHref} aria-current={current === "pricing" ? "page" : undefined} className="marketing-header__link text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </a>
          <Link
            to="/documentation"
            aria-current={current === "documentation" ? "page" : undefined}
            className={current === "documentation"
              ? "marketing-header__link text-sm font-semibold text-accent"
              : "marketing-header__link text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"}
          >
            Documentation
          </Link>

          {showUser ? (
            <Link to="/dashboard" className="group flex items-center gap-3">
              <span className="marketing-header__link text-sm transition-colors">
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
            <span className="contents" data-auth-visibility="guest">
              <Link to="/login" className="marketing-header__login text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                Login
              </Link>
              <Link to="/register" className="marketing-header__cta btn-primary-glow inline-flex min-h-10 items-center !px-4 !py-2 text-sm">
                Get started
              </Link>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
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
              data-auth-visibility="guest"
              className="marketing-header__cta btn-primary-glow inline-flex min-h-10 items-center justify-center whitespace-nowrap !rounded-lg !px-3 !py-2 text-xs focus-visible:outline-none sm:text-sm"
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
            className="marketing-header__menu-trigger inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-surface/60 text-foreground transition-colors hover:border-accent/40 hover:bg-surface focus-visible:outline-none"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-marketing-navigation" className="marketing-header__mobile-menu border-t border-border/50 bg-background/95 lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:px-6">
            <a
              href={featuresHref}
              aria-current={current === "features" ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className="marketing-header__mobile-item inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none"
            >
              Features
            </a>
            <a
              href={pricingHref}
              aria-current={current === "pricing" ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className="marketing-header__mobile-item inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none"
            >
              Pricing
            </a>
            <Link
              to="/documentation"
              aria-current={current === "documentation" ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className="marketing-header__mobile-item inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-visible:outline-none"
            >
              Documentation
            </Link>
            <div className="my-1 h-px bg-border/50" />
            <Link
              to={showUser ? "/dashboard" : "/login"}
              onClick={() => setMobileOpen(false)}
              className="marketing-header__mobile-item inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none"
            >
              {showUser ? "Open Dashboard" : "Login"}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
