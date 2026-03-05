import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import {
    ChevronLeft,
    User,
    BarChart3,
    Link as LinkIcon,
    ShieldAlert,
    CreditCard,
    Settings,
    Check,
    Ban,
    ExternalLink,
    MapPin,
    Smartphone
} from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminUser {
    id: string;
    email: string;
    name: string;
    banned: boolean;
    plan: string;
    plan_expires_at: string;
    created: string;
    internal_notes: string;
    [key: string]: unknown;
}

interface AdminLink {
    id: string;
    user_id: string;
    destination_url: string;
    slug: string;
    active: boolean;
    created: string;
    [key: string]: unknown;
}

interface AdminClick {
    id: string;
    os: string;
    country: string;
    created: string;
    link_id?: { user_id: string };
    [key: string]: unknown;
}

export default function AdminUserProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [user, setUser] = useState<AdminUser | null>(null);
    const [links, setLinks] = useState<AdminLink[]>([]);
    const [clicks, setClicks] = useState<AdminClick[]>([]);
    const [loading, setLoading] = useState(true);
    const [internalNotes, setInternalNotes] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);
    const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
    const [customDays, setCustomDays] = useState("30");
    const [selectedPlan, setSelectedPlan] = useState("creator");
    const [updatingPlan, setUpdatingPlan] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetchUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            // Fetch User
            const userData = await pb.collection("users").getOne<AdminUser>(id as string, { requestKey: null });
            setUser(userData);
            setInternalNotes(userData.internal_notes || "");
            setSelectedPlan(userData.plan || "creator");

            // Fetch Links
            const linksData = await pb.collection("links").getList(1, 50, {
                filter: `user_id="${id}"`,
                sort: "-created",
                requestKey: null
            });
            setLinks(linksData.items as unknown as AdminLink[]);

            // Fetch Clicks
            const clicksData = await pb.collection("clicks").getList(1, 100, {
                filter: `link_id.user_id="${id}"`,
                sort: "-created",
                expand: "link_id",
                requestKey: null
            });
            setClicks(clicksData.items as unknown as AdminClick[]);

            // Generate Chart Data (Last 7 days)
            const data = [];
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                data.push({
                    time: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    clicks: clicksData.items.filter(c => new Date(c.created).getDate() === d.getDate() && new Date(c.created).getMonth() === d.getMonth()).length
                });
            }
            setChartData(data);

        } catch (err) {
            console.error("Failed to load user data:", err);
            toast.error("User not found or error loading data");
            navigate("/admin/users");
        } finally {
            setLoading(false);
        }
    };

    const handleNotesSave = async () => {
        setSavingNotes(true);
        try {
            await pb.collection("users").update(id as string, { internal_notes: internalNotes });
            toast.success("Internal notes saved");
            setUser({ ...user, internal_notes: internalNotes });
        } catch (err) {
            toast.error("Failed to save notes");
        } finally {
            setSavingNotes(false);
        }
    };

    const handleUpdatePlan = async () => {
        setUpdatingPlan(true);
        try {
            const updateData: Record<string, string | null> = { plan: selectedPlan };
            if (selectedPlan !== "creator") {
                const expires = new Date();
                const days = Math.max(1, parseInt(customDays) || 30);
                expires.setDate(expires.getDate() + days);
                updateData.plan_expires_at = expires.toISOString();
            } else {
                updateData.plan_expires_at = null;
            }

            await pb.collection("users").update(id as string, updateData);
            setUser({ ...user, plan: selectedPlan, plan_expires_at: updateData.plan_expires_at });
            toast.success(`Plan updated to ${selectedPlan}`);
        } catch (err) {
            toast.error("Failed to update plan");
        } finally {
            setUpdatingPlan(false);
        }
    };

    const toggleLinkStatus = async (linkId: string, currentStatus: boolean) => {
        try {
            await pb.collection("links").update(linkId, { active: !currentStatus });
            setLinks(links.map(l => l.id === linkId ? { ...l, active: !currentStatus } : l));
            toast.success(currentStatus ? "Link deactivated" : "Link activated");
        } catch (err) {
            toast.error("Could not update link status");
        }
    };

    const toggleUserBan = async () => {
        try {
            const newStatus = !user.banned;
            await pb.collection("users").update(id as string, { banned: newStatus });
            setUser({ ...user, banned: newStatus });
            toast.success(newStatus ? "User has been banned" : "User ban lifted");
        } catch (err) {
            toast.error("Failed to change ban status");
        }
    };

    const requestPasswordReset = async () => {
        try {
            await pb.collection("users").requestPasswordReset(user.email);
            toast.success(`Password reset email sent to ${user.email}`);
        } catch (err) {
            toast.error("Failed to send reset email");
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center pt-20">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const totalClicks = clicks.length; // From our top 100 sample or we could aggregate differently
    const totalLinks = links.length;
    const lastClick = clicks.length > 0 ? clicks[0] : null;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pt-6 pb-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-foreground">{user.name || "Unnamed User"}</h1>
                            {user.banned && (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-500 uppercase tracking-wider">
                                    Banned
                                </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent/20 text-accent uppercase tracking-wider">
                                {user.plan || "Creator"}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            {user.email} <span className="text-border text-xs">•</span> ID: {user.id} <span className="text-border text-xs">•</span> Joined: {new Date(user.created).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={requestPasswordReset}
                        className="px-4 py-2 bg-surface border border-border text-foreground text-sm font-medium rounded-xl hover:bg-surface-hover transition-colors"
                    >
                        Send Password Reset
                    </button>
                    {!user.banned ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="px-4 py-2 bg-red-500/10 text-red-500 text-sm font-medium rounded-xl hover:bg-red-500/20 transition-colors">
                                    Ban User
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-surface border-border">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Ban User Account</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                        This will immediately suspend the user's access to the dashboard. Their short links may also stop working depending on platform rules.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-background border-border text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={toggleUserBan}>
                                        Yes, Ban User
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : (
                        <button
                            onClick={toggleUserBan}
                            className="px-4 py-2 bg-emerald-500/10 text-emerald-500 text-sm font-medium rounded-xl hover:bg-emerald-500/20 transition-colors"
                        >
                            Unban User
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-surface border border-border w-full justify-start rounded-xl p-1 h-auto mb-6">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground py-2 px-4 rounded-lg flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="links" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground py-2 px-4 rounded-lg flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> Links ({totalLinks})
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground py-2 px-4 rounded-lg flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Billing & Notes
                    </TabsTrigger>
                    <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground py-2 px-4 rounded-lg flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> Security
                    </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-muted-foreground">Total Links</h3>
                            <p className="text-3xl font-bold text-foreground mt-2">{totalLinks}</p>
                        </div>
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-muted-foreground">Recent Clicks (Sample)</h3>
                            <p className="text-3xl font-bold text-foreground mt-2">{totalClicks}</p>
                        </div>
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-muted-foreground">Last Known Device</h3>
                            <p className="text-lg font-medium text-foreground mt-2 truncate">
                                {lastClick ? (
                                    <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> {lastClick.os} / {lastClick.country}</span>
                                ) : "No data"}
                            </p>
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-foreground mb-6">Click Activity (7 Days)</h2>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorAdminClicks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                                    <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#10b981' }} />
                                    <Area type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAdminClicks)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </TabsContent>

                {/* LINKS TAB */}
                <TabsContent value="links">
                    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border bg-sidebar-accent/30 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        <th className="px-6 py-4">Link Details</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Created</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {links.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                User has not created any links.
                                            </td>
                                        </tr>
                                    ) : (
                                        links.map((link) => {
                                            const shortUrl = `${window.location.host}/${link.slug}`;
                                            return (
                                                <tr key={link.id} className="hover:bg-surface-hover transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col max-w-[250px] sm:max-w-xs md:max-w-sm">
                                                            <a href={`http://${shortUrl}`} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline flex items-center gap-1.5 truncate">
                                                                {shortUrl}
                                                                <ExternalLink className="w-3 h-3 shrink-0" />
                                                            </a>
                                                            <span className="text-xs text-muted-foreground truncate mt-1" title={link.destination_url}>
                                                                {link.destination_url}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${!link.active ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                            {!link.active ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                            {!link.active ? 'Disabled' : 'Active'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                                        {new Date(link.created).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <button className={`p-2 rounded-lg transition-colors text-sm font-medium border ${link.active ? 'bg-background border-border text-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50' : 'bg-background border-border text-foreground hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/50'}`}>
                                                                    {link.active ? 'Block Link' : 'Unblock'}
                                                                </button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="bg-surface border-border">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-foreground">
                                                                        {link.active ? 'Block malicious link?' : 'Restore link functionality?'}
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-muted-foreground">
                                                                        {link.active ? "If this link violates terms of service, blocking it will immediately show a 404 to visitors." : "Restoring this link will allow visitors to be redirected."}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="bg-background border-border text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction className={link.active ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"} onClick={() => toggleLinkStatus(link.id, link.active)}>
                                                                        Confirm
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* BILLING & NOTES TAB */}
                <TabsContent value="billing" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-accent/20 text-accent rounded-lg">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-foreground">Subscription Management</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Assign Plan</label>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                                <SelectTrigger className="w-full bg-background border-border">
                                                    <SelectValue placeholder="Select plan" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-surface border-border">
                                                    <SelectItem value="creator">Free (Creator)</SelectItem>
                                                    <SelectItem value="pro">Creator Pro</SelectItem>
                                                    <SelectItem value="agency">Agency</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {selectedPlan !== 'creator' && (
                                            <div className="w-24 relative">
                                                <input
                                                    type="number"
                                                    value={customDays}
                                                    onChange={(e) => setCustomDays(e.target.value)}
                                                    min="1"
                                                    className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-accent/50 text-foreground"
                                                    placeholder="Days"
                                                />
                                            </div>
                                        )}
                                        <button
                                            onClick={handleUpdatePlan}
                                            disabled={updatingPlan}
                                            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50"
                                        >
                                            {updatingPlan ? "Wait..." : "Update"}
                                        </button>
                                    </div>
                                </div>

                                {user.plan && user.plan !== 'creator' && (
                                    <div className="p-4 bg-background border border-border rounded-xl flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Plan Expires At</p>
                                            <p className="text-sm font-medium text-foreground">
                                                {user.plan_expires_at ? new Date(user.plan_expires_at).toLocaleDateString() : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/20 text-blue-500 rounded-lg">
                                    <User className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-bold text-foreground">Internal Staff Notes</h2>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4">
                                These notes are only visible to administrators. Use them to track support tickets, refunds, or manual plan assignments.
                            </p>

                            <textarea
                                value={internalNotes}
                                onChange={(e) => setInternalNotes(e.target.value)}
                                placeholder="E.g., Granted Pro plan on 15.02.2025 due to a billing issue..."
                                className="flex-1 w-full min-h-[150px] p-4 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent/50 transition-colors resize-none text-foreground placeholder-muted-foreground"
                            />

                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={handleNotesSave}
                                    disabled={savingNotes || internalNotes === user.internal_notes}
                                    className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                                >
                                    {savingNotes ? "Saving..." : "Save Notes"}
                                </button>
                            </div>
                        </div>

                    </div>
                </TabsContent>

                {/* SECURITY TAB */}
                <TabsContent value="security" className="space-y-6">
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-500/20 text-red-500 rounded-lg">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-foreground">Security Audit & Access</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-foreground">Account Status: {user.banned ? "Banned" : "Active"}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">If banned, the user will be logged out and unable to access the dashboard.</p>
                                </div>
                                <button
                                    onClick={toggleUserBan}
                                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${user.banned ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                                >
                                    {user.banned ? "Remove Ban" : "Ban Account"}
                                </button>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Recent Connection IPs (via Link Clicks)</h3>
                                <div className="space-y-2">
                                    {clicks.slice(0, 5).map((click) => (
                                        <div key={click.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm text-foreground">{click.country || "Unknown Country"}</span>
                                                <span className="text-xs text-muted-foreground hidden sm:inline">- {click.os}</span>
                                            </div>
                                            <span className="text-xs font-mono text-muted-foreground">{new Date(click.created).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {clicks.length === 0 && (
                                        <p className="text-sm text-muted-foreground p-4 bg-background border border-border rounded-lg">No recent link activity to infer IPs from.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </TabsContent>

            </Tabs>
        </div >
    );
}

