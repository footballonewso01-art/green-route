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
    wau: number;
    totalLinks: number;
    totalRevenue: number;
    mrr: number;
    conversionRate: number;
    churnRate: number;
    avgLinksPerUser: number;
    trends: {
        users: number;
        revenue: number;
        dau: number;
        conversion: number;
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
        wau: 0,
        totalLinks: 0,
        totalRevenue: 0,
        mrr: 0,
        conversionRate: 0,
        churnRate: 0,
        avgLinksPerUser: 0,
        trends: { users: 0, revenue: 0, dau: 0, conversion: 0 }
    });

    const [growthData, setGrowthData] = useState<any[]>([]);
    const [planData, setPlanData] = useState<any[]>([]);
    const [trafficData, setTrafficData] = useState<any[]>([]);
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
            // 1. Fetch live telemetry
            const sinceDate = format(subDays(new Date(), 90), "yyyy-MM-dd HH:mm:ss");

            const [users, links, billing, clicks, analytics, logs] = await Promise.all([
                pb.collection("users").getFullList({ sort: "-created", requestKey: null }),
                pb.collection("links").getFullList({ requestKey: null }),
                pb.collection("billing").getFullList({ requestKey: null }),
                pb.collection("clicks").getFullList({ requestKey: null }),
                pb.collection("analytics_events").getFullList({ sort: "-created", filter: `created > "${sinceDate}"`, requestKey: null }),
                pb.collection("system_logs").getFullList({ sort: "-created", filter: `created > "${sinceDate}"`, requestKey: null })
            ]);

            const now = new Date();
            const last24h = subHours(now, 24);
            const last7d = subDays(now, 7);
            const prev7d = subDays(now, 14);

            // Metrics Calculation
            const paidUsers = users.filter(u => u.plan !== 'creator' && u.plan_status === 'active');
            const totalRevenue = billing.filter(b => b.status === 'success').reduce((acc, b) => acc + (b.amount || 0), 0);
            const mrr = paidUsers.reduce((acc, u) => acc + (u.plan === 'pro' ? 9.99 : u.plan === 'agency' ? 29.99 : 0), 0);

            // DAU/WAU (distinct users in events)
            const dauUsers = new Set(analytics.filter(e => isAfter(new Date(e.created), last24h)).map(e => e.user_id));
            const wauUsers = new Set(analytics.filter(e => isAfter(new Date(e.created), last7d)).map(e => e.user_id));

            // Previous period activity for trends
            const prevDauUsers = new Set(analytics.filter(e => {
                const d = new Date(e.created);
                return isAfter(d, subHours(now, 48)) && !isAfter(d, last24h);
            }).map(e => e.user_id));

            // Trend helper
            const getTrend = (current: number, previous: number) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            const currentUsers = users.filter(u => isAfter(new Date(u.created), last7d)).length;
            const previousUsers = users.filter(u => isAfter(new Date(u.created), prev7d) && !isAfter(new Date(u.created), last7d)).length;

            const currentRev = billing.filter(b => b.status === 'success' && isAfter(new Date(b.created), last7d)).reduce((acc, b) => acc + b.amount, 0);
            const previousRev = billing.filter(b => b.status === 'success' && isAfter(new Date(b.created), prev7d) && !isAfter(new Date(b.created), last7d)).reduce((acc, b) => acc + b.amount, 0);

            // Churn calculation: cancelled plans in last 30 days
            const cancelledLast30 = billing.filter(b => (b.status === 'refunded' || b.status === 'cancelled') && isAfter(new Date(b.created), subDays(now, 30))).length;
            const churnRate = paidUsers.length > 0 ? (cancelledLast30 / paidUsers.length) * 100 : 0;

            const convRate = users.length > 0 ? (paidUsers.length / users.length) * 100 : 0;
            const prevConvRate = (users.length - currentUsers) > 0 ? ((paidUsers.length - billing.filter(b => isAfter(new Date(b.created), last7d)).length) / (users.length - currentUsers)) * 100 : 0;

            setStats({
                totalUsers: users.length,
                newUsers24h: users.filter(u => isAfter(new Date(u.created), last24h)).length,
                newUsers7d: currentUsers,
                dau: dauUsers.size,
                wau: wauUsers.size,
                totalLinks: links.length,
                totalRevenue,
                mrr,
                conversionRate: convRate,
                churnRate,
                avgLinksPerUser: users.length > 0 ? links.length / users.length : 0,
                trends: {
                    users: getTrend(currentUsers, previousUsers),
                    revenue: getTrend(currentRev, previousRev),
                    dau: getTrend(dauUsers.size, prevDauUsers.size),
                    conversion: getTrend(convRate, prevConvRate)
                }
            });

            // Pulse list: Last 10 events
            setPulseEvents(analytics.filter(e => e.event_name !== 'active_session').slice(0, 10));

            // System Health calculation from logs
            const totalLogs24h = logs.filter(l => isAfter(new Date(l.created), last24h)).length;
            const errorLogs24h = logs.filter(l => l.level === 'error' && isAfter(new Date(l.created), last24h)).length;
            const errorRate = totalLogs24h >= 10 ? (errorLogs24h / totalLogs24h) * 100 : 0;

            // Extract p95 latency if available in metadata/context
            const latencies = logs.filter(l => l.metadata?.latency).map(l => l.metadata.latency);
            const p95Latency = latencies.length > 0 ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0;

            const alerts = [];
            if (errorRate > 10 && totalLogs24h >= 20) alerts.push("High error rate detected ( > 10%). Check logs for API instability.");
            if (dauUsers.size < (wauUsers.size * 0.1)) alerts.push("Low stickiness (DAU/WAU < 10%). Onboarding friction suspected.");
            if (churnRate > 10) alerts.push("Critical churn rate alert. Subscription cancellations have spiked.");

            setSystemHealth({
                errorRate: parseFloat(errorRate.toFixed(2)),
                avgLatencyp95: p95Latency || 0,
                alerts
            });

            // Growth Chart Generation
            const chartPoints = [];
            const daysToFetch = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

            for (let i = daysToFetch - 1; i >= 0; i--) {
                const day = subDays(now, i);
                const dayStr = format(day, timeRange === '24h' ? 'HH:00' : 'MMM dd');

                chartPoints.push({
                    name: dayStr,
                    users: users.filter(u => differenceInDays(now, new Date(u.created)) <= i).length,
                    revenue: billing.filter(b => b.status === 'success' && differenceInDays(now, new Date(b.created)) <= i).reduce((acc, b) => acc + (b.amount || 0), 0)
                });
            }
            setGrowthData(chartPoints);

            // Plan Pie Chart
            setPlanData([
                { name: 'Creator', value: users.filter(u => u.plan === 'creator').length },
                { name: 'Pro', value: users.filter(u => u.plan === 'pro').length },
                { name: 'Agency', value: users.filter(u => u.plan === 'agency').length },
            ]);

            // Traffic Data
            const countries: Record<string, number> = {};
            clicks.forEach(c => { if (c.country) countries[c.country] = (countries[c.country] || 0) + 1 });
            setTrafficData(Object.entries(countries).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5));

            // Funnel Stats
            setConversionEvents([
                { name: 'Visitors', value: clicks.length, color: '#3b82f6' },
                { name: 'Signups', value: users.length, color: '#10b981' },
                { name: 'Active', value: wauUsers.size, color: '#f59e0b' },
                { name: 'Paid', value: paidUsers.length, color: '#8b5cf6' },
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
        if (stats.churnRate > 5) list.push(`Revenue alert: Churn is ${stats.churnRate.toFixed(1)}%. Check retention loops.`);
        if (stats.avgLinksPerUser < 1.5) list.push("Low utilization: Users create < 2 links. Consider educational onboarding.");
        if (systemHealth.errorRate < 0.5 && systemHealth.avgLatencyp95 < 200) list.push("Infrastructure health is optimal. System scaling cleanly.");
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
                <KPIBadge label="Active (DAU/WAU)" value={`${stats.dau} / ${stats.wau}`} trend={stats.trends.dau} />
                <KPIBadge label="Conv. Rate" value={`${stats.conversionRate.toFixed(1)}%`} trend={stats.trends.conversion} />
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
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #333' }}
                                        cursor={{ stroke: '#10b981', strokeWidth: 2 }}
                                    />
                                    <Area dataKey="users" stroke="#10b981" strokeWidth={4} fill="url(#colorUsers)" />
                                    <Area dataKey="revenue" stroke="#8b5cf6" strokeWidth={4} fill="transparent" />
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

                        <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                Top Geographies <Globe className="w-5 h-5 text-purple-500" />
                            </h2>
                            <div className="space-y-4">
                                {trafficData.length > 0 ? trafficData.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center font-bold text-xs text-muted-foreground border border-white/5">
                                                {i + 1}
                                            </div>
                                            <span className="font-bold text-white uppercase tracking-wider text-sm">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-accent">{item.value.toLocaleString()} clicks</span>
                                    </div>
                                )) : (
                                    <p className="text-sm text-muted-foreground text-center py-10 italic">Awaiting international telemetry...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Plans, Health, Insights */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Plan Distribution */}
                    <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold mb-8">Revenue Sources</h2>
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
