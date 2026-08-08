import { useEffect, useState } from "react";
import { BookOpen, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";

interface MarketingHeaderProps {
  current?: "home" | "documentation";
}

export default function MarketingHeader({ current = "home" }: MarketingHeaderProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo.webp" alt="" className="h-[54px] w-auto mix-blend-screen" />
          <span className="text-[21px] font-extrabold tracking-tight text-foreground">Linktery</span>
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

        <div className="flex items-center gap-3 md:hidden">
          {current !== "documentation" && (
            <Link
              to="/documentation"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <BookOpen className="h-4 w-4" />
              Docs
            </Link>
          )}
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
              to="/login"
              className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
