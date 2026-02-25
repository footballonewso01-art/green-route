import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, Globe, Smartphone, Monitor, TabletSmartphone, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";

interface ClickRecord {
  id: string;
  country: string;
  device: string;
  created: string;
}

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const linkId = searchParams.get("link");
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [clicksCount, setClicksCount] = useState(0);
  const [countries, setCountries] = useState<{ name: string; clicks: number; pct: number }[]>([]);
  const [devices, setDevices] = useState<{ name: string; value: number; color: string }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; clicks: number }[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const userId = pb.authStore.model?.id;
        const baseFilter = `link_id.user_id="${userId}"`;
        const filter = linkId ? `link_id="${linkId}" && ${baseFilter}` : baseFilter;

        const records = await pb.collection('clicks').getFullList<ClickRecord>({
          filter,
          sort: '-created',
        });

        setClicksCount(records.length);

        // Process Countries
        const countryMap: Record<string, number> = {};
        records.forEach(r => {
          const c = r.country || "Unknown";
          countryMap[c] = (countryMap[c] || 0) + 1;
        });
        const countryList = Object.entries(countryMap)
          .map(([name, clicks]) => ({ name, clicks, pct: Math.round((clicks / records.length) * 100) }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 5);
        setCountries(countryList);

        // Process Devices
        const deviceMap: Record<string, number> = {};
        records.forEach(r => {
          const d = r.device || "Other";
          deviceMap[d] = (deviceMap[d] || 0) + 1;
        });
        const deviceList = [
          { name: "Mobile", value: Math.round((deviceMap["Mobile"] || 0) / records.length * 100) || 0, color: "hsl(153, 68%, 55%)" },
          { name: "Desktop", value: Math.round((deviceMap["Desktop"] || 0) / records.length * 100) || 0, color: "hsl(155, 70%, 14%)" },
          { name: "Tablet", value: Math.round((deviceMap["Tablet"] || 0) / records.length * 100) || 0, color: "hsl(155, 25%, 35%)" },
        ];
        setDevices(deviceList);

        // Process Trends (Simplified: last 7 days)
        const days: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
        }
        records.forEach(r => {
          const dateStr = new Date(r.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (days[dateStr] !== undefined) days[dateStr]++;
        });
        const trend = Object.entries(days).map(([date, clicks]) => ({ date, clicks })).reverse();
        setTrendData(trend);

      } catch (error: any) {
        toast.error("Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [linkId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {linkId ? "Showing stats for specific link" : "Across all your links"}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border">
          {["24h", "7d", "30d", "90d"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Clicks chart */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Click Trends (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(153, 68%, 55%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(153, 68%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(155, 15%, 16%)" />
            <XAxis dataKey="date" stroke="hsl(150, 8%, 55%)" fontSize={12} />
            <YAxis stroke="hsl(150, 8%, 55%)" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(155, 35%, 9%)", border: "1px solid hsl(155, 15%, 20%)", borderRadius: "12px", color: "hsl(150, 10%, 92%)" }} />
            <Area type="monotone" dataKey="clicks" stroke="hsl(153, 68%, 55%)" fill="url(#analyticsGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-accent" /> Countries</h2>
          <div className="space-y-3">
            {countries.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : countries.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{c.name}</span>
                    <span className="text-muted-foreground">{c.clicks.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{c.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Smartphone className="w-4 h-4 text-accent" /> Devices</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={devices} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {devices.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {devices.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm text-foreground">{d.name}</span>
                  <span className="text-sm text-muted-foreground">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
