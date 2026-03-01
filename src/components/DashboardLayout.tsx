import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Link2, BarChart3, User, Settings, Zap, Menu, X, LogOut, CreditCard, Info, Search, Tag, ShieldCheck, HelpCircle, Bell, Share2, ShieldAlert, Users, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PLANS, PlanType } from "@/lib/plans";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  path: string;
  icon: any;
  pro?: boolean;
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
      { title: "Analytics", path: "/dashboard/analytics", icon: BarChart3, pro: true },
      { title: "Profile", path: "/dashboard/profile", icon: User },
    ]
  },
  {
    label: "Account",
    items: [
      { title: "Billing", path: "/dashboard/billing", icon: CreditCard },
      { title: "Pricing", path: "/dashboard/pricing", icon: Tag },
      { title: "Settings", path: "/dashboard/settings", icon: Settings },
    ]
  },
  {
    label: "Support",
    items: [
      { title: "Help Center", path: "#help", icon: HelpCircle, badge: { text: "Soon", color: "bg-orange-500/20 text-orange-400" } },
    ]
  }
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [linksCount, setLinksCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('gr_dismissed_notifs') || '[]'); } catch { return []; }
  });

  const allNotifications = [
    { id: 'welcome', icon: '👋', title: 'Welcome to Linktery!', desc: 'Create your first smart link to get started.', time: 'Just now' }
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
    ]
  };

  const currentNavGroups = isAdmin ? [adminNavGroup, ...navGroups] : navGroups;

  useEffect(() => {
    const fetchUsage = async () => {
      if (!user) return;
      try {
        const result = await pb.collection('links').getList(1, 1, {
          filter: `user_id="${user.id}"`,
          requestKey: null
        });
        setLinksCount(result.totalItems);
      } catch (error: any) {
        if (!error.isAbort) {
          console.error("Failed to fetch usage:", error);
        }
      }
    };
    fetchUsage();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const planId = (user as any)?.plan || "creator";
  const plan = PLANS[planId as PlanType];
  const maxLinks = plan?.limits.links || 0;
  const usagePercentage = maxLinks === -1 ? 0 : Math.min(100, ((linksCount ?? 0) / maxLinks) * 100);
  const usageText = maxLinks === -1 ? "Unlimited Links" : `${linksCount ?? 0} / ${maxLinks} links used`;
  const userInitial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Linktery" className="h-11 w-auto mix-blend-screen" />
            <span className="font-bold text-foreground text-[22px] tracking-tight">Linktery</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <nav className="flex-1 p-4 pt-2 space-y-4 overflow-y-auto no-scrollbar">
          {currentNavGroups.map((group) => {
            const filteredItems = group.items.filter(item =>
              item.title.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1">
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-1">{group.label}</h3>
                <div className="space-y-0.5">
                  {filteredItems.map((item) => {
                    const isActive = location.pathname === item.path;
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
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? "bg-accent/10 text-accent" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4" />
                          {item.title}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.badge.color}`}>
                              {item.badge.text}
                            </span>
                          )}
                          {item.pro && planId === "creator" && (
                            <span className="text-[10px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase tracking-tighter">Pro</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Usage Card in Sidebar */}
        <div className="p-4 mx-4 mb-4 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usage</span>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px] bg-surface border-border">
                  Your plan link limit
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-foreground">{usageText}</span>
              {maxLinks !== -1 && (
                <div className="flex items-center gap-1.5">
                  {usagePercentage >= 80 && (
                    <span className="text-[9px] font-bold text-orange-400 uppercase animate-pulse">Near limit</span>
                  )}
                  <span className="text-muted-foreground">{Math.round(usagePercentage)}%</span>
                </div>
              )}
            </div>
            <div className="h-1.5 w-full bg-sidebar-border rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${usagePercentage > 90 ? "bg-red-500" : "bg-accent"}`}
                style={{ width: `${maxLinks === -1 ? 100 : usagePercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-sidebar-border">
          <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors w-full">
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center px-6 gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-[9px] font-bold text-accent-foreground flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-80 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                      {notifications.length > 0 && (
                        <button onClick={dismissAll} className="text-[10px] text-accent hover:underline font-medium">Clear all</button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">All caught up! 🎉</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="px-4 py-3 hover:bg-surface-hover transition-colors flex items-start gap-3 border-b border-border/50 last:border-0">
                            <span className="text-lg shrink-0 mt-0.5">{n.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{n.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                              <span className="text-[10px] text-muted-foreground/60 mt-1 block">{n.time}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); dismissNotif(n.id); }} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 mr-2">
              <Zap className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold text-accent uppercase tracking-wide">{plan?.name} Plan</span>
            </div>

            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-semibold overflow-hidden border border-accent/20">
              {user?.avatar && user?.collectionId ? (
                <img src={pb.files.getUrl(user as any, user.avatar)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
