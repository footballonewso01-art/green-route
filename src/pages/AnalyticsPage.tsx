import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { BarChart3, Globe, Smartphone, Monitor, TabletSmartphone, Loader2, Lock, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { checkPlan } from "@/lib/plans";

interface ClickRecord {
  id: string;
  country: string;
  device: string;
  os: string;
  browser: string;
  referrer: string;
  is_unique: boolean;
  created: string;
  expand?: { link_id?: { title?: string; slug?: string } };
}

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const linkId = searchParams.get("link");
  const { user } = useAuth();
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [clicksCount, setClicksCount] = useState(0);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [countries, setCountries] = useState<{ name: string; clicks: number; pct: number }[]>([]);
  const [referrers, setReferrers] = useState<{ name: string; clicks: number; pct: number }[]>([]);
  const [devices, setDevices] = useState<{ name: string; value: number; color: string }[]>([]);
  const [browserData, setBrowserData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [osData, setOsData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; clicks: number }[]>([]);
  const [recentActivities, setRecentActivities] = useState<ClickRecord[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>(Array.from({ length: 7 }, () => Array(24).fill(0)));
  const [profileViewsCount, setProfileViewsCount] = useState(0);
  const [hasProfileLinks, setHasProfileLinks] = useState(false);

  const userPlan = (user as { plan?: string })?.plan || "creator";
  const canUseAnalytics = checkPlan(userPlan, "analytics");

  useEffect(() => {
    if (!canUseAnalytics) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const userId = pb.authStore.model?.id;
        let baseFilter = `link_id.user_id="${userId}"`;

        if (period) {
          const d = new Date();
          if (period === "24h") d.setHours(d.getHours() - 24);
          else if (period === "7d") d.setDate(d.getDate() - 7);
          else if (period === "30d") d.setDate(d.getDate() - 30);
          else if (period === "90d") d.setDate(d.getDate() - 90);
          baseFilter += ` && created >= "${d.toISOString()}"`;
        }

        const filter = linkId ? `link_id="${linkId}" && ${baseFilter}` : baseFilter;

        const records = await pb.collection('clicks').getFullList<ClickRecord>({
          filter,
          sort: '-created',
          expand: 'link_id',
        });

        // Also fetch user's profile views and check if they have profile links
        try {
            const userRec = await pb.collection('users').getOne(userId);
            setProfileViewsCount(userRec.profile_views || 0);
            
            const publicLinks = await pb.collection('links').getList(1, 1, {
              filter: `user_id="${userId}" && show_on_profile=true`,
            });
            setHasProfileLinks(publicLinks.totalItems > 0);
        } catch(e) {}

        setClicksCount(records.length);
        setUniqueCount(records.filter(r => r.is_unique).length);
        setRecentActivities(records.slice(0, 5));

        // Process Countries
        const countryMap: Record<string, number> = {};
        records.forEach(r => {
          const c = r.country || "Unknown";
          countryMap[c] = (countryMap[c] || 0) + 1;
        });
        const countryList = Object.entries(countryMap)
          .map(([name, clicks]) => ({ name, clicks, pct: Math.round((clicks / records.length) * 100) }))
          .sort((a, b) => b.clicks - a.clicks);
        setCountries(countryList);

        // Process Referrers
        const refMap: Record<string, number> = {};
        records.forEach(r => {
          const s = r.referrer || "Direct";
          refMap[s] = (refMap[s] || 0) + 1;
        });
        const refList = Object.entries(refMap)
          .map(([name, clicks]) => ({ name, clicks, pct: Math.round((clicks / records.length) * 100) }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 5);
        setReferrers(refList);

        // Process Devices
        const deviceMap: Record<string, number> = {};
        records.forEach(r => {
          const d = r.device || "Other";
          deviceMap[d] = (deviceMap[d] || 0) + 1;
        });
        setDevices([
          { name: "Mobile", value: deviceMap["Mobile"] || 0, color: "hsl(153, 68%, 55%)" },
          { name: "Desktop", value: deviceMap["Desktop"] || 0, color: "hsl(155, 70%, 14%)" },
          { name: "Tablet", value: deviceMap["Tablet"] || 0, color: "hsl(155, 25%, 35%)" },
        ]);

        // Process Browsers
        const browserMap: Record<string, number> = {};
        records.forEach(r => {
          const b = r.browser || "Other";
          browserMap[b] = (browserMap[b] || 0) + 1;
        });
        const browserSlice = Object.entries(browserMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, value], i) => ({
            name,
            value,
            color: i === 0 ? "hsl(153, 68%, 55%)" : i === 1 ? "hsl(155, 35%, 25%)" : "hsl(155, 20%, 40%)"
          }));
        setBrowserData(browserSlice);

        // Process OS
        const osMap: Record<string, number> = {};
        records.forEach(r => {
          const o = r.os || "Other";
          osMap[o] = (osMap[o] || 0) + 1;
        });
        const osSlice = Object.entries(osMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, value], i) => ({
            name,
            value,
            color: i === 0 ? "hsl(153, 68%, 55%)" : i === 1 ? "hsl(155, 35%, 25%)" : "hsl(155, 20%, 40%)"
          }));
        setOsData(osSlice);

        // Process Trends
        const days: Record<string, number> = {};
        const daysToLookBack = period === "24h" ? 1 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
        for (let i = 0; i < daysToLookBack; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
        }
        records.forEach(r => {
          const dateStr = new Date(r.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (days[dateStr] !== undefined) days[dateStr]++;
        });
        setTrendData(Object.entries(days).map(([date, clicks]) => ({ date, clicks })).reverse());

        // Process Heatmap (day of week × hour)
        const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
        records.forEach(r => {
          const d = new Date(r.created);
          heatmap[d.getDay()][d.getHours()]++;
        });
        setHeatmapData(heatmap);

      } catch (error: unknown) {
        toast.error("Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [linkId, period, canUseAnalytics]);

  if (!canUseAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20 relative">
          <BarChart3 className="w-10 h-10 text-accent opacity-50" />
          <Lock className="w-6 h-6 text-foreground absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Advanced Analytics</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Unlock detailed click statistics, geographic data, and device insights with Creator Pro.
          </p>
        </div>
        <Link to="/dashboard/pricing" className="btn-primary-glow px-8 py-3 mt-4">
          Upgrade to Creator Pro
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-32 bg-surface rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-surface rounded animate-pulse" />
          </div>
          <div className="h-10 w-48 bg-surface rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-4 space-y-2">
              <div className="h-3 w-20 bg-surface rounded animate-pulse" />
              <div className="h-7 w-16 bg-surface rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="glass-card p-6 space-y-4">
          <div className="h-5 w-28 bg-surface rounded animate-pulse" />
          <div className="h-[300px] bg-surface rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const COLORS = ["hsl(153, 68%, 55%)", "hsl(155, 35%, 25%)", "hsl(155, 20%, 40%)"];

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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total Clicks</p>
          <div className="text-2xl font-bold">{clicksCount.toLocaleString()}</div>
        </div>
        <div className="glass-card p-4 border-l-accent/30 border-l-2">
          <p className="text-xs text-accent uppercase font-bold tracking-wider mb-1">Unique Visitors</p>
          <div className="text-2xl font-bold">{uniqueCount.toLocaleString()}</div>
        </div>
        {hasProfileLinks && (
          <div className="glass-card p-4 border-l-blue-500/30 border-l-2">
            <p className="text-xs text-blue-500 uppercase font-bold tracking-wider mb-1">Profile Views</p>
            <div className="text-2xl font-bold">{profileViewsCount.toLocaleString()}</div>
          </div>
        )}
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Conversion</p>
          <div className="text-2xl font-bold">100%</div>
        </div>
      </div>

      {/* Clicks chart */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Click Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(153, 68%, 55%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(153, 68%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="hsl(155, 15%, 16%)" />
            <XAxis dataKey="date" stroke="hsl(150, 8%, 55%)" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis stroke="hsl(150, 8%, 55%)" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(155, 35%, 9%)", border: "1px solid hsl(155, 15%, 20%)", borderRadius: "12px" }} />
            <Area type="monotone" dataKey="clicks" stroke="hsl(153, 68%, 55%)" fill="url(#analyticsGradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Countries */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-accent" /> Top Locations</h2>
            {countries.length > 5 && (
               <button 
                 onClick={(e) => {
                   const btn = e.currentTarget;
                   const container = btn.parentElement?.nextElementSibling as HTMLElement;
                   if (container) {
                     const isExpanded = container.style.maxHeight !== '300px';
                     container.style.maxHeight = isExpanded ? '300px' : 'none';
                     container.style.overflowY = isExpanded ? 'hidden' : 'auto';
                     btn.innerText = isExpanded ? 'Show All' : 'Show Less';
                   }
                 }}
                 className="text-xs text-accent hover:underline font-medium"
               >
                 Show All
               </button>
            )}
          </div>
          <div className="space-y-4 transition-all duration-300" style={{ maxHeight: '300px', overflow: 'hidden' }}>
            {countries.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : countries.map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.clicks} clicks</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-accent" /> Traffic Sources</h2>
          <div className="space-y-4">
            {referrers.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : referrers.map((r) => (
              <div key={r.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground font-medium">{r.name}</span>
                  <span className="text-muted-foreground">{r.clicks} clicks</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface border border-border overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Devices Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><Smartphone className="w-4 h-4 text-accent" /> Devices</h3>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clicksCount > 0 ? devices : [{ value: 100 }]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                  {devices.map((d, i) => <Cell key={i} fill={clicksCount > 0 ? d.color : "#1e293b"} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {devices.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /> {d.name}</div>
                <span className="text-muted-foreground">{clicksCount > 0 ? `${Math.round(d.value / clicksCount * 100)}%` : '0%'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Browser Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><Monitor className="w-4 h-4 text-accent" /> Browsers</h3>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clicksCount > 0 ? browserData : [{ value: 100 }]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                  {browserData.map((d, i) => <Cell key={i} fill={clicksCount > 0 ? d.color : "#1e293b"} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {browserData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /> {d.name}</div>
                <span className="text-muted-foreground">{clicksCount > 0 ? `${Math.round(d.value / clicksCount * 100)}%` : '0%'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* OS Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><TabletSmartphone className="w-4 h-4 text-accent" /> OS</h3>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clicksCount > 0 ? osData : [{ value: 100 }]} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                  {osData.map((d, i) => <Cell key={i} fill={clicksCount > 0 ? d.color : "#1e293b"} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {osData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /> {d.name}</div>
                <span className="text-muted-foreground">{clicksCount > 0 ? `${Math.round(d.value / clicksCount * 100)}%` : '0%'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Click Heatmap */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent" /> Activity Heatmap
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Best times for engagement — brighter = more clicks</p>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex ml-12 mb-1">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
                  {h % 3 === 0 ? `${h}:00` : ''}
                </div>
              ))}
            </div>
            {/* Rows */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIdx) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <span className="w-10 text-[10px] text-muted-foreground font-medium text-right pr-2">{day}</span>
                {heatmapData[dayIdx].map((count, h) => {
                  const max = Math.max(...heatmapData.flat(), 1);
                  const intensity = count / max;
                  return (
                    <div
                      key={h}
                      className="flex-1 h-5 rounded-sm transition-colors cursor-pointer group relative"
                      style={{
                        backgroundColor: count === 0
                          ? 'hsl(155, 15%, 10%)'
                          : `hsla(153, 68%, 55%, ${0.15 + intensity * 0.85})`
                      }}
                      title={`${day} ${h}:00 — ${count} clicks`}
                    />
                  );
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground">Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: v === 0 ? 'hsl(155, 15%, 10%)' : `hsla(153, 68%, 55%, ${0.15 + v * 0.85})` }} />
              ))}
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Click Stream */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-accent/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Live Click Stream
          </h3>
          <span className="text-xs text-muted-foreground">Showing latest activity</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface/50 text-muted-foreground uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Link</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Device / OS</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3 text-right">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentActivities.map((r) => (
                <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {new Date(r.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 font-medium text-accent truncate max-w-[150px]" title={r.expand?.link_id?.title || r.expand?.link_id?.slug || '—'}>
                    {r.expand?.link_id?.title || r.expand?.link_id?.slug || '—'}
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">{r.country}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{r.device}</span>
                      <span className="text-muted-foreground">({r.os})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{r.referrer}</td>
                  <td className="px-6 py-4 text-right">
                    {r.is_unique ? (
                      <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">UNIQUE</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">RAW</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentActivities.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No recent activity detected</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
