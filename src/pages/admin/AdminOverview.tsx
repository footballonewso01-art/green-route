import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { Users, Link as LinkIcon, Activity, TrendingUp, ChevronLeft } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

export default function AdminOverview() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalLinks: 0,
        activeUsers: 0,
        plans: { free: 0, pro: 0, agency: 0 }
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [timeRange]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch totals
            const usersList = await pb.collection("users").getList(1, 1, { requestKey: null });
            const linksList = await pb.collection("links").getList(1, 1, { requestKey: null });

            // Calculate plans breakdown
            let freeCount = 0;
            let proCount = 0;
            let agencyCount = 0;

            // In a real app with 10k+ users, we'd use a custom endpoint or grouped queries.
            // For MVP, we'll fetch up to 1000 users to get stats
            const allUsers = await pb.collection("users").getFullList({ requestKey: null, max: 1000 });

            allUsers.forEach(u => {
                if (u.plan === 'pro') proCount++;
                else if (u.plan === 'agency') agencyCount++;
                else freeCount++;
            });

            setStats({
                totalUsers: usersList.totalItems,
                totalLinks: linksList.totalItems,
                activeUsers: allUsers.length, // approximation
                plans: { free: freeCount, pro: proCount, agency: agencyCount }
            });

            // Generate Chart Data based on timeRange
            const data = [];
            const now = new Date();

            if (timeRange === "24h") {
                for (let i = 23; i >= 0; i--) {
                    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
                    data.push({
                        time: `${d.getHours()}:00`,
                        users: allUsers.filter(u => new Date(u.created).getHours() === d.getHours() && new Date(u.created).getDate() === d.getDate()).length
                    });
                }
            } else if (timeRange === "7d") {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                    data.push({
                        time: d.toLocaleDateString('en-US', { weekday: 'short' }),
                        users: allUsers.filter(u => new Date(u.created).getDate() === d.getDate() && new Date(u.created).getMonth() === d.getMonth()).length
                    });
                }
            } else {
                // 30d
                for (let i = 29; i >= 0; i--) {
                    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                    data.push({
                        time: d.getDate(),
                        users: allUsers.filter(u => new Date(u.created).getDate() === d.getDate() && new Date(u.created).getMonth() === d.getMonth()).length
                    });
                }
            }
            setChartData(data);
        } catch (err) {
            console.error("Failed to fetch admin stats:", err);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
        <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4 relative overflow-hidden group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            </div>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 blur-xl ${color.replace('bg-', 'bg-').split(' ')[0]}`} />
        </div>
    );

    return (
        <div className="space-y-6 pt-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
                        <p className="text-sm text-muted-foreground mt-1">Real-time statistics for Linktery.</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="bg-blue-500/20 text-blue-500" />
                        <StatCard title="Total Links" value={stats.totalLinks} icon={LinkIcon} color="bg-accent/20 text-accent" />
                        <StatCard title="Creator Pro Plans" value={stats.plans.pro} icon={TrendingUp} color="bg-orange-500/20 text-orange-500" />
                        <StatCard title="Agency Plans" value={stats.plans.agency} icon={Activity} color="bg-purple-500/20 text-purple-500" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Chart */}
                        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-foreground">User Registrations</h2>
                                <div className="flex p-1 bg-background border border-border rounded-lg">
                                    {(["24h", "7d", "30d"] as const).map(tr => (
                                        <button
                                            key={tr}
                                            onClick={() => setTimeRange(tr)}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === tr ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            {tr.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                                        <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <RechartsTooltip
                                            contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }}
                                            itemStyle={{ color: '#10b981' }}
                                        />
                                        <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Plan Breakdown */}
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-foreground mb-6">Plan Distribution</h2>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-muted-foreground">Free (Creator)</span>
                                        <span className="font-medium text-foreground">{stats.plans.free}</span>
                                    </div>
                                    <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-500 rounded-full" style={{ width: `${(stats.plans.free / stats.totalUsers) * 100}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-orange-400">Creator Pro</span>
                                        <span className="font-medium text-foreground">{stats.plans.pro}</span>
                                    </div>
                                    <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-400 rounded-full shadow-[0_0_10px_rgba(251,146,60,0.5)]" style={{ width: `${(stats.plans.pro / stats.totalUsers) * 100}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-purple-400">Agency</span>
                                        <span className="font-medium text-foreground">{stats.plans.agency}</span>
                                    </div>
                                    <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-400 rounded-full shadow-[0_0_10px_rgba(192,132,252,0.5)]" style={{ width: `${(stats.plans.agency / stats.totalUsers) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
