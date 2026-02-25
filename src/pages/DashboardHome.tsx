import { useState, useEffect } from "react";
import { BarChart3, Link2, MousePointer, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";

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
        const userId = pb.authStore.model?.id;
        const [links, clicks] = await Promise.all([
          pb.collection('links').getFullList({ filter: `user_id="${userId}"` }),
          pb.collection('clicks').getFullList({ filter: `link_id.user_id="${userId}"`, sort: '-created', limit: 50 })
        ]);

        const activeLinks = links.filter(l => l.active).length;
        const totalClicks = clicks.length;

        setStats({
          totalClicks,
          activeLinks,
          clickRate: links.length > 0 ? Math.round((totalClicks / links.length) * 10) / 10 : 0,
        });

        // Recent clicks
        setRecentClicks(clicks.slice(0, 5).map(c => ({
          slug: links.find(l => l.id === c.link_id)?.slug || "unknown",
          country: c.country || "Unknown",
          device: c.device || "Other",
          time: new Date(c.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })));

        // Trend data (simple last 7 days)
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return { name: days[d.getDay()], clicks: 0, rawDate: d.toDateString() };
        }).reverse();

        clicks.forEach(c => {
          const clickDate = new Date(c.created).toDateString();
          const dayMatch = last7Days.find(d => d.rawDate === clickDate);
          if (dayMatch) dayMatch.clicks++;
        });

        setTrendData(last7Days.map(({ name, clicks }) => ({ name, clicks })));

      } catch (error: any) {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const metrics = [
    { title: "Total Clicks", value: stats.totalClicks.toLocaleString(), change: "+0%", up: true, icon: MousePointer },
    { title: "Active Links", value: stats.activeLinks.toString(), change: "+0", up: true, icon: Link2 },
    { title: "Avg Clicks/Link", value: stats.clickRate.toString(), change: "+0", up: true, icon: TrendingUp },
    { title: "Revenue", value: "$0", change: "+0%", up: true, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your link performance</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.title} className="glass-card p-5">
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
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 glass-card p-6">
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
        </div>

        {/* Recent Clicks */}
        <div className="glass-card p-6">
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
        </div>
      </div>
    </div>
  );
}
