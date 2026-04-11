import { useState, useEffect, useMemo } from "react";
import { pb } from "@/lib/pocketbase";
import {
    Users, Link as LinkIcon, Activity, TrendingUp, ChevronLeft,
    ArrowUpRight, ArrowDownRight, Zap, Target, MousePointer2,
    AlertCircle, Lightbulb, ShieldCheck, Globe, Clock, History
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from "recharts";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfDay, isAfter, subHours, differenceInDays } from "date-fns";
import { toast } from "sonner";

interface DashboardStats {
    totalUsers: number;
    newUsers24h: number;
    newUsers7d: number;
    dau: number;
    wau?: number;
    mau: number;
    totalLinks: number;
    totalRevenue: number;
    mrr: number;
    arpu: number;
    conversionRate: number;
    churnRate: number;
    avgLinksPerUser?: number;
    totalClicksInPeriod: number;
    trends: {
        users: number;
        revenue: number;
        dau: number;
        conversion: number;
        clicks: number;
    }
}

const COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'];

export default function AdminOverview() {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">("7d");
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        newUsers24h: 0,
        newUsers7d: 0,
        dau: 0,
        mau: 0,
        totalLinks: 0,
        totalRevenue: 0,
        mrr: 0,
        arpu: 0,
        conversionRate: 0,
        churnRate: 0,
        totalClicksInPeriod: 0,
        trends: { users: 0, revenue: 0, dau: 0, conversion: 0, clicks: 0 }
    });

    const [growthData, setGrowthData] = useState<any[]>([]);
    const [planData, setPlanData] = useState<any[]>([]);
    const [trafficData, setTrafficData] = useState<any[]>([]);
    const [topCreators, setTopCreators] = useState<any[]>([]);
    const [dauData, setDauData] = useState<any[]>([]);
    const [conversionEvents, setConversionEvents] = useState<any[]>([]);
    const [pulseEvents, setPulseEvents] = useState<any[]>([]);
    const [systemHealth, setSystemHealth] = useState({
        errorRate: 0,
        avgLatencyp95: 0,
        alerts: [] as string[]
    });

    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRange]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            const daysToFetch = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
            
            const currentPeriodStart = subDays(now, daysToFetch);
            const prevPeriodStart = subDays(now, daysToFetch * 2);
            const sinceDate = format(prevPeriodStart, "yyyy-MM-dd HH:mm:ss");

            // Safe fetch: returns [] on failure so one broken collection doesn't crash the dashboard
            const safeFetch = async (collection: string, opts: any = {}) => {
                try {
                    return await pb.collection(collection).getFullList({ requestKey: null, ...opts });
                } catch (e) {
                    console.warn(`[AdminOverview] Failed to fetch "${collection}":`, e);
                    return [];
                }
            };

            // For clicks: use getList with a cap to avoid fetching 100k+ records via auto-pagination
            const safeClicksFetch = async () => {
                try {
                    const result = await pb.collection("clicks").getList(1, 2000, {
                        sort: "-created",
                        filter: `created > "${sinceDate}"`,
                        requestKey: null
                    });
                    return { items: result.items, totalItems: result.totalItems };
                } catch (e) {
                    console.warn('[AdminOverview] Failed to fetch "clicks":', e);
                    return { items: [], totalItems: 0 };
                }
            };

            const [users, links, billing, clicksResult, analytics, logs] = await Promise.all([
                safeFetch("users", { sort: "-created" }),
                safeFetch("links"),
                safeFetch("billing"),
                safeClicksFetch(),
                safeFetch("analytics_events", { sort: "-created", filter: `created > "${sinceDate}"` }),
                safeFetch("system_logs", { sort: "-created", filter: `created > "${sinceDate}"` })
            ]);

            const clicks = clicksResult.items;

            // Metrics Calculation
            const paidUsers = users.filter(u => u.plan !== 'creator' && u.plan_status === 'active');
            const totalRevenue = billing.filter(b => b.status === 'success').reduce((acc, b) => acc + (b.amount || 0), 0);
            const mrr = paidUsers.reduce((acc, u) => acc + (u.plan === 'pro' ? 9.99 : u.plan === 'agency' ? 29.99 : 0), 0);
            const arpu = paidUsers.length > 0 ? mrr / paidUsers.length : 0;

            const dauUsers = new Set(analytics.filter(e => isAfter(new Date(e.created), subHours(now, 24))).map(e => e.user_id));
            const mauUsers = new Set(analytics.filter(e => isAfter(new Date(e.created), subDays(now, 30))).map(e => e.user_id));

            // Trend helper
            const getTrend = (current: number, previous: number) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            const currentUsers = users.filter(u => isAfter(new Date(u.created), currentPeriodStart));
            const previousUsers = users.filter(u => isAfter(new Date(u.created), prevPeriodStart) && !isAfter(new Date(u.created), currentPeriodStart));

            const currentRev = billing.filter(b => b.status === 'success' && isAfter(new Date(b.created), currentPeriodStart)).reduce((acc, b) => acc + b.amount, 0);
            const previousRev = billing.filter(b => b.status === 'success' && isAfter(new Date(b.created), prevPeriodStart) && !isAfter(new Date(b.created), currentPeriodStart)).reduce((acc, b) => acc + b.amount, 0);

            // Clicks in Period
            const currentClicks = clicks.filter(c => isAfter(new Date(c.created), currentPeriodStart));
            const previousClicks = clicks.filter(c => isAfter(new Date(c.created), prevPeriodStart) && !isAfter(new Date(c.created), currentPeriodStart));

            // Funnel Stats Calculation
            const currentLandingViews = new Set(
                analytics.filter(e => e.event_name === 'landing_pageview' && isAfter(new Date(e.created), currentPeriodStart))
                .map(e => e.metadata?.deviceId || e.id)
            ).size;
            
            const currentSignups = currentUsers.length;
            const currentActiveIds = new Set(analytics.filter(e => isAfter(new Date(e.created), currentPeriodStart) && e.user_id && e.user_id !== '').map(e => e.user_id));
            const currentPaidSignups = currentUsers.filter(u => u.plan !== 'creator' && u.plan_status === 'active').length;

            const convRate = currentLandingViews > 0 ? (currentPaidSignups / currentLandingViews) * 100 : 0;
            const prevLandingViews = new Set(
                analytics.filter(e => e.event_name === 'landing_pageview' && isAfter(new Date(e.created), prevPeriodStart) && !isAfter(new Date(e.created), currentPeriodStart))
                .map(e => e.metadata?.deviceId || e.id)
            ).size;
            const prevPaidSignups = previousUsers.filter(u => u.plan !== 'creator' && u.plan_status === 'active').length;
            const prevConvRate = prevLandingViews > 0 ? (prevPaidSignups / prevLandingViews) * 100 : 0;

            // Churn (30d)
            const cancelledLast30 = billing.filter(b => (b.status === 'refunded' || b.status === 'cancelled') && isAfter(new Date(b.created), subDays(now, 30))).length;
            const churnRate = paidUsers.length > 0 ? (cancelledLast30 / paidUsers.length) * 100 : 0;

            setStats({
                totalUsers: users.length,
                newUsers24h: users.filter(u => isAfter(new Date(u.created), subHours(now, 24))).length,
                newUsers7d: currentUsers.length,
                dau: dauUsers.size,
                mau: mauUsers.size,
                totalLinks: links.length,
                totalRevenue,
                mrr,
                arpu,
                conversionRate: convRate,
                churnRate,
                totalClicksInPeriod: clicksResult.totalItems,
                trends: {
                    users: getTrend(currentUsers.length, previousUsers.length),
                    revenue: getTrend(currentRev, previousRev),
                    dau: getTrend(dauUsers.size, new Set(analytics.filter(e => isAfter(new Date(e.created), subHours(now, 48)) && !isAfter(new Date(e.created), subHours(now, 24))).map(e => e.user_id)).size),
                    conversion: getTrend(convRate, prevConvRate),
                    clicks: getTrend(currentClicks.length, previousClicks.length)
                }
            });

            // Pulse list: Last 10 events
            setPulseEvents(analytics.filter(e => e.event_name !== 'active_session').slice(0, 10));

            // System Health calculation from logs
            const last24h = subHours(now, 24);
            const totalLogs24h = logs.filter(l => isAfter(new Date(l.created), last24h)).length;
            const errorLogs24h = logs.filter(l => l.level === 'error' && isAfter(new Date(l.created), last24h)).length;
            const errorRate = totalLogs24h >= 10 ? (errorLogs24h / totalLogs24h) * 100 : 0;

            // Extract p95 latency if available in metadata/context
            const latencies = logs.filter(l => l.metadata?.latency).map(l => l.metadata.latency);
            const p95Latency = latencies.length > 0 ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0;

            const alerts = [];
            if (errorRate > 10 && totalLogs24h >= 20) alerts.push("High error rate detected ( > 10%). Check logs for API instability.");
            if (dauUsers.size < (mauUsers.size * 0.05)) alerts.push("Low stickiness (DAU/MAU < 5%). Onboarding friction suspected.");
            if (churnRate > 10) alerts.push("Critical churn rate alert. Subscription cancellations have spiked.");

            setSystemHealth({
                errorRate: parseFloat(errorRate.toFixed(2)),
                avgLatencyp95: p95Latency || 0,
                alerts
            });

            // Growth Chart Generation
            const chartPoints = [];
            const chartDaysToFetch = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

            for (let i = chartDaysToFetch - 1; i >= 0; i--) {
                const day = subDays(now, i);
                const dayStr = format(day, timeRange === '24h' ? 'HH:00' : 'MMM dd');

                chartPoints.push({
                    name: dayStr,
                    users: users.filter(u => differenceInDays(now, new Date(u.created)) <= i).length,
                    revenue: billing.filter(b => b.status === 'success' && differenceInDays(now, new Date(b.created)) <= i).reduce((acc, b) => acc + (b.amount || 0), 0)
                });
            }
            setGrowthData(chartPoints);
 
            // DAU Chart Generation (Separate logic for engagement)
            const dauPoints = [];
            for (let i = chartDaysToFetch - 1; i >= 0; i--) {
                const day = subDays(now, i);
                const dayMatch = format(day, "yyyy-MM-dd");
                
                // For 'all' range, we might need a broader check, but usually it's limited to 90 days in chartPoints
                const dailyActive = new Set(
                    analytics.filter(e => e.created.startsWith(dayMatch) && e.user_id && e.user_id !== '')
                             .map(e => e.user_id)
                ).size;

                dauPoints.push({
                    name: format(day, timeRange === '24h' ? 'HH:00' : 'MMM dd'),
                    dau: dailyActive
                });
            }
            setDauData(dauPoints);

            // Plan Pie Chart
            setPlanData([
                { name: 'Creator', value: users.filter(u => u.plan === 'creator').length },
                { name: 'Pro', value: users.filter(u => u.plan === 'pro').length },
                { name: 'Agency', value: users.filter(u => u.plan === 'agency').length },
            ]);

            // Top Users (Traffic Generators)
            const clickCountsByUserId = currentClicks.reduce((acc: Record<string, number>, c: any) => {
                if (c.user_id) acc[c.user_id] = (acc[c.user_id] || 0) + 1;
                return acc;
            }, {});
            
            const topUsers = Object.entries(clickCountsByUserId)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 5)
                .map(([userId, count]) => {
                    const u = users.find(u => u.id === userId);
                    return { id: userId, username: u?.username || 'Unknown', count, plan: u?.plan || 'creator' };
                });
            setTopCreators(topUsers);

            // Traffic Data for period
            const countries: Record<string, number> = {};
            currentClicks.forEach(c => { if (c.country && c.country.trim() !== "") countries[c.country] = (countries[c.country] || 0) + 1; else countries["Unknown"] = (countries["Unknown"] || 0) + 1 });
            setTrafficData(Object.entries(countries).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5));

            // New Funnel Stats: landing -> register -> active -> paid
            setConversionEvents([
                { name: 'Landing Visitors', value: currentLandingViews, color: '#3b82f6' },
                { name: 'Signups', value: currentSignups, color: '#10b981' },
                { name: 'Active Users', value: currentActiveIds.size, color: '#f59e0b' },
                { name: 'Paid Conversions', value: currentPaidSignups, color: '#8b5cf6' },
            ]);

        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
            toast.error("Telemetry failure. Real-time monitoring disrupted.");
        } finally {
            setLoading(false);
        }
    };

    const KPIBadge = ({ label, value, trend, isCurrency = false }: any) => (
        <div className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden group hover:border-accent/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
                {trend !== undefined && trend !== 0 && (
                    <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-accent/10 text-accent' : 'bg-red-500/10 text-red-500'}`}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div className="text-3xl font-black text-white">
                {isCurrency ? `$${value?.toLocaleString()}` : value?.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-2">
                <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full opacity-30" style={{ width: '65%' }} />
                </div>
            </div>
        </div>
    );

    const dynamicInsights = useMemo(() => {
        const list = [];
        if (stats.trends.users > 10) list.push(`Viral growth detected: New signups up ${stats.trends.users}% this period.`);
        if (stats.churnRate > 5) list.push(`Revenue alert: Churn is ${stats.churnRate.toFixed(1)}%.`);
        if (systemHealth.errorRate < 0.5 && systemHealth.avgLatencyp95 < 200) list.push("Infrastructure health is optimal. System scaling cleanly.");
        if (stats.arpu > 0) list.push(`Your Average Revenue Per Paid User (ARPU) is $${stats.arpu.toFixed(2)}.`);
        if (list.length === 0) list.push("Metrics are within expected baseline ranges.", "Monitoring normal user behavior patterns.");
        return list;
    }, [stats, systemHealth]);

    if (loading) return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground animate-pulse font-medium">Synthesizing real-time analytics...</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 py-8 px-4 sm:px-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-surface rounded-xl transition-colors">
                            <ChevronLeft className="w-6 h-6 text-muted-foreground" />
                        </button>
                        <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
                            Business Overview <Zap className="w-8 h-8 text-accent fill-accent/20" />
                        </h1>
                    </div>
                    <p className="text-lg text-muted-foreground ml-11">Live platform telemetry and business unit performance.</p>
                </div>

                <div className="flex p-1.5 bg-surface border border-border rounded-2xl shadow-xl ml-11 md:ml-0">
                    {["24h", "7d", "30d", "all"].map(tr => (
                        <button
                            key={tr}
                            onClick={() => setTimeRange(tr as any)}
                            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${timeRange === tr ? "bg-accent text-black shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-white"}`}
                        >
                            {tr.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Alerts Block */}
            {systemHealth.alerts.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {systemHealth.alerts.map((alert, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in slide-in-from-top-4">
                            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                            <p className="text-red-200 font-medium">{alert}</p>
                            <button className="ml-auto text-xs font-bold text-red-500 hover:underline uppercase">Investigate</button>
                        </div>
                    ))}
                </div>
            )}

            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPIBadge label="Total Users" value={stats.totalUsers} trend={stats.trends.users} />
                <KPIBadge label="Estimated MRR" value={stats.mrr} trend={stats.trends.revenue} isCurrency={true} />
                <KPIBadge label="Total Redirects" value={stats.totalClicksInPeriod} trend={stats.trends.clicks} />
                <KPIBadge label="Active (DAU/MAU)" value={`${stats.dau} / ${stats.mau}`} trend={stats.trends.dau} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Growth Chart */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <TrendingUp className="w-48 h-48 text-accent" />
                        </div>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                Platform Growth <ArrowUpRight className="w-6 h-6 text-accent" />
                            </h2>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                    <div className="w-3 h-3 rounded-full bg-accent" /> Users
                                </span>
                                <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                                    <div className="w-3 h-3 rounded-full bg-purple-500" /> Revenue
                                </span>
                            </div>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growthData}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #333' }}
                                        cursor={{ stroke: '#10b981', strokeWidth: 2 }}
                                    />
                                    <Area dataKey="users" stroke="#10b981" strokeWidth={4} fill="url(#colorUsers)" />
                                    <Area dataKey="revenue" stroke="#8b5cf6" strokeWidth={4} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* DAU Engagement Chart */}
                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                User Engagement (DAU) <Activity className="w-6 h-6 text-accent" />
                            </h2>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" /> Daily Active Users
                                </span>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dauData}>
                                    <defs>
                                        <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #333' }}
                                    />
                                    <Area dataKey="dau" stroke="#3b82f6" strokeWidth={3} fill="url(#colorDau)" activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Funnel & Traffic */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                Acquisition Funnel <Target className="w-5 h-5 text-blue-500" />
                            </h2>
                            <div className="space-y-6">
                                {conversionEvents.map((step, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-muted-foreground">{step.name}</span>
                                            <span className="text-lg font-black">{step.value.toLocaleString()}</span>
                                        </div>
                                        <div className="h-4 w-full bg-background rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${(step.value / (conversionEvents[0].value || 1)) * 100}%`, backgroundColor: step.color }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl flex flex-col">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                Top Creators <Users className="w-5 h-5 text-green-500" />
                            </h2>
                            <div className="space-y-4 flex-1">
                                {topCreators.length > 0 ? topCreators.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center font-bold text-xs text-muted-foreground border border-white/5">
                                                {i + 1}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white tracking-wider text-sm">@{item.username}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{item.plan}</span>
                                            </div>
                                        </div>
                                        <span className="font-medium text-accent">{item.count.toLocaleString()} clicks</span>
                                    </div>
                                )) : (
                                    <p className="text-sm text-muted-foreground text-center py-10 italic">Awaiting traffic data...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Plans, Health, Insights */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Member Distribution */}
                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold mb-8">Member Distribution</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={planData} innerRadius={60} outerRadius={85} paddingAngle={10} dataKey="value">
                                        {planData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 space-y-4">
                            {planData.map((p, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                        <span className="text-sm font-medium text-muted-foreground">{p.name}</span>
                                    </div>
                                    <span className="font-bold text-white">{stats.totalUsers > 0 ? ((p.value / stats.totalUsers) * 100).toFixed(0) : 0}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Health Block */}
                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-3">
                            System Health <ShieldCheck className="w-5 h-5 text-accent" />
                        </h2>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                                    <p className="text-2xl font-black text-white">{systemHealth.errorRate}%</p>
                                </div>
                                <Activity className={`w-8 h-8 ${systemHealth.errorRate > 1 ? 'text-red-500' : 'text-accent'}`} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">p95 Latency</p>
                                    <p className="text-2xl font-black text-white">{systemHealth.avgLatencyp95}ms</p>
                                </div>
                                <Clock className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Smart Insights */}
                    <div className="bg-accent/5 border border-accent/20 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Lightbulb className="w-24 h-24 text-accent" />
                        </div>
                        <h2 className="text-xl font-bold text-accent mb-6 flex items-center gap-3">
                            Smart Insights <ArrowUpRight className="w-5 h-5 text-accent" />
                        </h2>
                        <div className="space-y-4">
                            {dynamicInsights.map((insight, i) => (
                                <p key={i} className="text-sm text-accent/80 font-medium leading-relaxed">
                                    • {insight}
                                </p>
                            ))}
                        </div>
                        <button className="mt-8 w-full py-3 bg-accent text-black font-black rounded-xl text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Generate Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Activity Mini-List */}
            <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        Real-Time Pulse <History className="w-6 h-6 text-accent" />
                    </h2>
                    <button className="text-sm font-bold text-accent hover:underline">View All Logs</button>
                </div>
                <div className="space-y-4">
                    {pulseEvents.length > 0 ? pulseEvents.map((event, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-background/30 rounded-2xl border border-white/5 group hover:border-accent/30 transition-all">
                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-accent" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white uppercase">{event.event_name.replace('_', ' ')} <span className="text-muted-foreground ml-2 text-[10px]">#{event.id}</span></p>
                                <p className="text-xs text-muted-foreground">{format(new Date(event.created), 'HH:mm:ss')} • Event ID: {event.id}</p>
                            </div>
                            <MousePointer2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )) : (
                        <div className="text-center py-10">
                            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-sm text-muted-foreground italic">Heartbeat active. Waiting for system events...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
