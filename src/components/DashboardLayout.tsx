import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { BadgeDollarSign, Building2, LayoutDashboard, Link2, BarChart3, User, Settings, Zap, Menu, X, LogOut, Search, Tag, ShieldCheck, HelpCircle, Bell, Share2, ShieldAlert, Users, Link as LinkIcon, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PLANS, PlanType } from "@/lib/plans";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { useSeo } from "@/hooks/useSeo";
import { getDashboardBrowserTitle } from "@/lib/browserTitles";
import BrandWordmark from "@/components/BrandWordmark";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import "@/styles/dashboard-rebrand.css";

interface NavItem {
  title: string;
  path: string;
  icon: React.ElementType;
  accessTier?: "pro" | "agency";
  badge?: { text: string; color: string };
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { title: "Links", path: "/dashboard/links", icon: Link2 },
      { title: "Analytics", path: "/dashboard/analytics", icon: BarChart3, accessTier: "pro" },
      { title: "Profiles", path: "/dashboard/profile", icon: User },
    ]
  },
  {
    label: "Account",
    items: [
      { title: "Pricing", path: "/dashboard/pricing", icon: Tag },
      { title: "Settings", path: "/dashboard/settings", icon: Settings },
    ]
  },
  {
    label: "Support",
    items: [
      { title: "Help Center", path: "/dashboard/help", icon: HelpCircle },
    ]
  }
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  
  useSeo({ title: getDashboardBrowserTitle(location.pathname), noIndex: true });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [partnerEligible, setPartnerEligible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('gr_dismissed_notifs') || '[]'); } catch { return []; }
  });

  const allNotifications = [
    { id: 'welcome', icon: Link2, title: 'Welcome to Linktery!', desc: 'Create your first smart link to get started.', time: 'Just now' }
  ];

  const notifications = allNotifications.filter(n => !dismissedNotifs.includes(n.id));
  const unreadCount = notifications.length;

  const dismissNotif = (id: string) => {
    const next = [...dismissedNotifs, id];
    setDismissedNotifs(next);
    localStorage.setItem('gr_dismissed_notifs', JSON.stringify(next));
  };

  const dismissAll = () => {
    const next = allNotifications.map(n => n.id);
    setDismissedNotifs(next);
    localStorage.setItem('gr_dismissed_notifs', JSON.stringify(next));
  };

  const adminNavGroup: NavGroup = {
    label: "Admin Panel",
    items: [
      { title: "Overview", path: "/admin/overview", icon: BarChart3, badge: { text: "Admin", color: "bg-red-500/20 text-red-500" } },
      { title: "Users", path: "/admin/users", icon: Users, badge: { text: "Admin", color: "bg-red-500/20 text-red-500" } },
      { title: "Links Safety", path: "/admin/links", icon: LinkIcon, badge: { text: "Admin", color: "bg-red-500/20 text-red-500" } },
      { title: "Promocodes", path: "/admin/promocodes", icon: Zap, badge: { text: "Admin", color: "bg-red-500/20 text-red-500" } },
    ]
  };

  const partnerNavGroups: NavGroup[] = partnerEligible
    ? navGroups.map((group) => group.label === "Main"
      ? {
          ...group,
          items: [
            ...group.items,
            { title: "Partner Overview", path: "/dashboard/partner", icon: BadgeDollarSign },
          ],
        }
      : group)
    : navGroups;
  const currentNavGroups = isAdmin ? [adminNavGroup, ...partnerNavGroups] : partnerNavGroups;

  useEffect(() => {
    if (!user) {
      setPartnerEligible(false);
      return;
    }

    let cancelled = false;
    pb.send("/api/affiliate/status", {
      method: "GET",
      requestKey: null,
    }).then((response) => {
      if (!cancelled) setPartnerEligible(response?.eligible === true);
    }).catch((error: unknown) => {
      if (!(error as { isAbort?: boolean })?.isAbort) {
        console.info("Partner status is unavailable:", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const planId = (user as { plan?: string })?.plan || "creator";
  const plan = PLANS[planId as PlanType];
  const PlanIcon = planId === "agency" ? Building2 : Zap;
  const agencyExpiryMs = user?.plan_expires_at
    ? Date.parse(user.plan_expires_at.replace(" ", "T"))
    : null;
  const hasActiveAgency = planId === "agency" && (
    agencyExpiryMs === null ||
    !Number.isFinite(agencyExpiryMs) ||
    agencyExpiryMs > Date.now()
  );
  const userInitial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  const renderNavigationBody = (scope: "desktop" | "mobile") => (
    <div className="dashboard-sidebar__body">
      <div>
        <Link to="/" className="dashboard-brand" onClick={() => setSidebarOpen(false)}>
          <BrandWordmark tone="light" />
        </Link>
      </div>

      <label className="dashboard-search">
        <span className="sr-only">Search navigation</span>
        <Search className="h-4 w-4" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </label>

      <nav className="dashboard-nav" aria-label={scope === "mobile" ? "Mobile workspace navigation" : undefined}>
        {currentNavGroups.map((group) => {
          const filteredItems = group.items.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredItems.length === 0) return null;
          const labelId = `dashboard-nav-${scope}-${group.label.replace(/\s+/g, "-").toLowerCase()}`;

          return (
            <section key={group.label} className="dashboard-nav__group" aria-labelledby={labelId}>
              <h2 id={labelId} className="dashboard-nav__label">{group.label}</h2>
              <div>
                {filteredItems.map((item) => {
                  const isActive = location.pathname === item.path || (item.path === "/dashboard/profile" && location.pathname.startsWith("/dashboard/profile"));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={(e) => {
                        setSidebarOpen(false);
                        if (item.path === "#") {
                          e.preventDefault();
                          toast.info(`${item.title} is coming soon!`);
                        }
                      }}
                      aria-current={isActive ? "page" : undefined}
                      className="dashboard-nav__link"
                    >
                      <span>
                        <item.icon className="w-4 h-4" aria-hidden="true" />
                        {item.title}
                      </span>
                      <span className="dashboard-nav__badges">
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.badge.color}`}>
                            {item.badge.text}
                          </span>
                        )}
                        {item.accessTier && (
                          (item.accessTier === "pro" && planId === "creator") ||
                          (item.accessTier === "agency" && planId !== "agency")
                        ) && (
                          <span className="dashboard-nav__tier" data-tier={item.accessTier}>
                            {item.accessTier === "pro" ? "Pro" : "Agency"}
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
        {currentNavGroups.every(group => group.items.every(item => !item.title.toLowerCase().includes(searchQuery.toLowerCase()))) && (
          <p className="dashboard-nav__empty">No navigation matches “{searchQuery}”.</p>
        )}
      </nav>

      {!hasActiveAgency && (
        <Link
          to="/dashboard/pricing"
          aria-label="Get Agency Plan — unlock everything"
          className="dashboard-upsell"
          onClick={() => setSidebarOpen(false)}
        >
          <span className="dashboard-upsell__icon">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="dashboard-upsell__copy">
            <strong>Get Agency Plan</strong>
            <small>Unlock everything</small>
          </span>
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}

      <div className="dashboard-sidebar__footer">
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground">
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="dashboard-shell">
      {/* Desktop navigation and the mobile sheet share the same content. */}
      <aside className="dashboard-sidebar" aria-label="Workspace navigation">
        {renderNavigationBody("desktop")}
      </aside>

      {/* Main content */}
      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <button type="button" className="dashboard-mobile-menu" aria-label="Open workspace navigation">
                <Menu aria-hidden="true" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="dashboard-mobile-sheet">
              <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
              <SheetDescription className="sr-only">Navigate Linktery settings, support, account, and workspace tools.</SheetDescription>
              {renderNavigationBody("mobile")}
            </SheetContent>
          </Sheet>
          <div className="dashboard-mobile-brand">
            <Link to="/" className="flex items-center gap-2" aria-label="Linktery home">
              <BrandWordmark tone="light" />
            </Link>
          </div>
          <div className="dashboard-topbar__actions">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="dashboard-icon-button"
                aria-label="Open notifications"
                aria-expanded={notifOpen}
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-[9px] font-bold text-accent-foreground flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="dashboard-notifications absolute right-0 top-12 z-50 overflow-hidden border">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                      {notifications.length > 0 && (
                        <button onClick={dismissAll} className="text-[10px] text-accent hover:underline font-medium">Clear all</button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>
                      ) : (
                        notifications.map(n => {
                          const NotificationIcon = n.icon;
                          return (
                          <div key={n.id} className="px-4 py-3 hover:bg-surface-hover transition-colors flex items-start gap-3 border-b border-border/50 last:border-0">
                            <span className="text-accent shrink-0 mt-0.5" aria-hidden="true"><NotificationIcon className="h-4 w-4" /></span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                              <span className="text-[10px] text-muted-foreground/60 mt-1 block">{n.time}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); dismissNotif(n.id); }} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="dashboard-plan-badge" data-plan={planId} aria-label={`Current plan: ${plan?.name || "Creator"}`}>
              <span className="dashboard-plan-badge__mark" aria-hidden="true">
                <PlanIcon />
              </span>
              <span className="dashboard-plan-badge__label">{plan?.name}</span>
            </div>

            <div className="dashboard-avatar">
              {user?.avatar && user?.collectionId ? (
                <img src={pb.files.getUrl(user as unknown as Record<string, unknown>, user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>

      {/* Floating Bottom Navigation (Mobile Only) */}
      <div className="dashboard-bottom-nav">
        <Link 
          to="/dashboard" 
          aria-label="Dashboard"
          aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
        >
          <LayoutDashboard className="w-5 h-5" />
        </Link>
        <Link 
          to="/dashboard/links" 
          aria-label="Links"
          aria-current={location.pathname === '/dashboard/links' ? 'page' : undefined}
        >
          <Link2 className="w-5 h-5" />
        </Link>
        <Link 
          to="/dashboard/links/create" 
          className="dashboard-bottom-nav__create"
          aria-label="Create link"
        >
          <span className="text-2xl leading-none font-light mb-0.5">+</span>
        </Link>
        <Link 
          to="/dashboard/analytics" 
          aria-label="Analytics"
          aria-current={location.pathname === '/dashboard/analytics' ? 'page' : undefined}
        >
          <BarChart3 className="w-5 h-5" />
        </Link>
        <Link 
          to="/dashboard/profile" 
          aria-label="Profiles"
          aria-current={location.pathname.startsWith('/dashboard/profile') ? 'page' : undefined}
        >
          <User className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
