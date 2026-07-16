import { useState, useEffect } from "react";
import { Link2, MousePointer, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Plus, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClicks: 0,
    activeLinks: 0,
    clickRate: 0,
  });
  const [trendData, setTrendData] = useState<{ name: string; clicks: number }[]>([]);
  const [recentClicks, setRecentClicks] = useState<{ slug: string; country: string; device: string; time: string }[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await pb.send('/api/dashboard/summary', {
          method: 'GET',
          requestKey: 'dashboard-summary',
        }) as {
          totalClicks?: number;
          activeLinks?: number;
          totalLinks?: number;
          trend?: { day: string; clicks: number }[];
          recent?: { slug: string; country: string; device: string; created: string }[];
        };

        const totalClicks = response.totalClicks || 0;
        const activeLinks = response.activeLinks || 0;
        const totalLinks = response.totalLinks || 0;

        setStats({
          totalClicks,
          activeLinks,
          clickRate: totalLinks > 0 ? Math.round((totalClicks / totalLinks) * 10) / 10 : 0,
        });

        setRecentClicks((response.recent || []).map((click) => ({
          slug: click.slug || "unknown",
          country: (() => {
            const raw = click.country || "Unknown";
            if (raw === "Unknown" || raw.length !== 2) return raw;
            try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(raw) || raw; } catch { return raw; }
          })(),
          device: click.device || "Other",
          time: new Date(click.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })));

        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const trendByDay = new Map((response.trend || []).map((entry) => [entry.day, entry.clicks]));
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() - i);
          const key = d.toISOString().slice(0, 10);
          return { name: days[d.getUTCDay()], clicks: trendByDay.get(key) || 0 };
        }).reverse();
        setTrendData(last7Days);

      } catch (error: unknown) {
        if (!(error as { isAbort?: boolean }).isAbort) {
          toast.error("Failed to load dashboard data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-40 bg-surface rounded-lg animate-pulse" />
          <div className="h-4 w-56 bg-surface rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="flex justify-between">
                <div className="w-9 h-9 rounded-xl bg-surface animate-pulse" />
                <div className="w-12 h-4 bg-surface rounded animate-pulse" />
              </div>
              <div className="h-7 w-20 bg-surface rounded animate-pulse" />
              <div className="h-3 w-24 bg-surface rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 space-y-4">
            <div className="h-5 w-36 bg-surface rounded animate-pulse" />
            <div className="h-[280px] bg-surface rounded-xl animate-pulse" />
          </div>
          <div className="glass-card p-6 space-y-4">
            <div className="h-5 w-28 bg-surface rounded animate-pulse" />
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between py-2">
                <div className="space-y-1.5">
                  <div className="h-4 w-16 bg-surface rounded animate-pulse" />
                  <div className="h-3 w-24 bg-surface rounded animate-pulse" />
                </div>
                <div className="h-3 w-10 bg-surface rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const metrics = [
    { title: "Total Clicks", value: stats.totalClicks.toLocaleString(), change: "+0%", up: true, icon: MousePointer },
    { title: "Active Links", value: stats.activeLinks.toString(), change: "+0", up: true, icon: Link2 },
    { title: "Avg Clicks/Link", value: stats.clickRate.toString(), change: "+0", up: true, icon: TrendingUp },
  ];

  const hour = new Date().getHours();
  const displayName = pb.authStore.model?.name || pb.authStore.model?.username || "Friend";

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Welcome Card */}
      <motion.div variants={itemVariants} className="relative overflow-hidden glass-card px-8 py-5 group">
        {/* Background decorative elements */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors duration-500" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-400">{displayName}</span>!
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground text-sm">ID:</span>
              <code className="px-2 py-0.5 rounded bg-surface border border-border text-xs font-mono">
                {pb.authStore.model?.id}
              </code>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <Link to="/dashboard/profile">
              <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                className="btn-primary-glow flex items-center gap-2 px-6 py-2.5 text-sm shadow-xl shadow-accent/20"
              >
                <Plus className="w-4 h-4" /> Create Link
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>


      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <motion.div variants={itemVariants} key={m.title} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                <m.icon className="w-4 h-4 text-accent" />
              </div>
              <span className={`text-xs font-medium flex items-center gap-0.5 ${m.up ? "text-accent" : "text-destructive"}`}>
                {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {m.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">{m.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.title}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Clicks This Week</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(153, 68%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(153, 68%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(155, 15%, 16%)" />
              <XAxis dataKey="name" stroke="hsl(150, 8%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(150, 8%, 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(155, 35%, 9%)", border: "1px solid hsl(155, 15%, 20%)", borderRadius: "12px", color: "hsl(150, 10%, 92%)" }}
              />
              <Area type="monotone" dataKey="clicks" stroke="hsl(153, 68%, 55%)" fill="url(#clickGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Clicks */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Clicks</h2>
          <div className="space-y-3">
            {recentClicks.length === 0 ? <p className="text-sm text-muted-foreground">No recent clicks</p> : recentClicks.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">/{c.slug}</div>
                  <div className="text-xs text-muted-foreground">{c.country} · {c.device}</div>
                </div>
                <span className="text-xs text-muted-foreground">{c.time}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
