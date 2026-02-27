import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { Search, ChevronLeft, ChevronRight, UserX, ShieldAlert, Check } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PLANS, PlanType } from "@/lib/plans";
import { BarChart3, Link as LinkIcon, Edit2, MapPin } from "lucide-react";

type UserRecord = {
    id: string;
    email: string;
    name: string;
    plan: PlanType;
    role: string;
    created: string;
    banned?: boolean;
    stats?: { links: number, clicks: number };
    metrics?: { device: string, country: string };
};

export default function AdminUsers() {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const result = await pb.collection("users").getList(page, 20, {
                sort: "-created",
                filter: search ? `email ~ "${search}" || id ~ "${search}"` : "",
                requestKey: null
            });
            setUsers(result.items as any[]);
            setTotalPages(result.totalPages);
        } catch (err) {
            console.error("Failed to fetch users", err);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, search]);

    const handlePlanChange = async (userId: string, newPlan: string) => {
        try {
            const updateData: any = { plan: newPlan };
            if (newPlan !== "creator") {
                const expires = new Date();
                expires.setDate(expires.getDate() + 30);
                updateData.plan_expires_at = expires.toISOString();
            } else {
                updateData.plan_expires_at = "";
            }

            await pb.collection("users").update(userId, updateData);

            // Create a billing record
            if (newPlan !== "creator") {
                await pb.collection("billing").create({
                    user_id: userId,
                    plan: newPlan,
                    amount: newPlan === "pro" ? 15 : 49,
                    status: "active",
                    payment_method: "Given"
                });
            }

            toast.success("User plan updated successfully");
            setUsers(users.map(u => u.id === userId ? { ...u, plan: newPlan as PlanType } : u));
            if (selectedUser?.id === userId) {
                setSelectedUser({ ...selectedUser, plan: newPlan as PlanType });
            }
        } catch (err) {
            console.error("Failed to update plan", err);
            toast.error("Could not update user plan");
        }
    };

    const handleEditUser = async (user: UserRecord) => {
        setLoading(true);
        try {
            // Fetch stats
            const [linksResult, clicksResult] = await Promise.all([
                pb.collection("links").getList(1, 1, { filter: `user_id="${user.id}"` }),
                pb.collection("clicks").getList(1, 1, { filter: `link_id.user_id="${user.id}"`, sort: "-created" })
            ]);

            // Track country and device
            let device = "Not logged";
            let country = "Unknown";
            if (clicksResult.items.length > 0) {
                const click = clicksResult.items[0];
                country = click.country || "Unknown";
                device = [click.os, click.browser].filter(Boolean).join(" / ") || "Unknown device";
            }

            setSelectedUser({
                ...user,
                stats: { links: linksResult.totalItems, clicks: clicksResult.totalItems },
                metrics: { device, country }
            });
        } catch (e) {
            toast.error("Failed to load user details");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId: string, action: 'ban' | 'delete') => {
        try {
            if (action === 'delete') {
                await pb.collection("users").delete(userId);
                toast.success("User deleted successfully");
                setUsers(users.filter(u => u.id !== userId));
            } else if (action === 'ban') {
                // Requires adding a `banned` boolean field to users collection later if needed.
                // For now, we'll try to update it, and if the schema lacks it, it's ignored or errors.
                await pb.collection("users").update(userId, { banned: true });
                toast.success("User banned");
                fetchUsers();
            }
        } catch (err) {
            console.error(`Failed to ${action} user`, err);
            toast.error(`Could not ${action} user`);
        }
    };

    return (
        <div className="space-y-6 pt-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage all accounts on the platform</p>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search email or ID..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-accent/50 transition-all placeholder:text-muted-foreground"
                    />
                </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-sidebar-accent/30 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role / Plan</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-surface-hover transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{user.email}</span>
                                                <span className="text-xs text-muted-foreground font-mono mt-0.5">ID: {user.id}</span>
                                                <span className="text-xs text-muted-foreground mt-0.5">
                                                    Joined {new Date(user.created).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    {user.role === 'admin' && (
                                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-500">Admin</span>
                                                    )}
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-surface border border-border uppercase">
                                                        {user.plan || "creator"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.banned ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'
                                                }`}>
                                                {user.banned ? <ShieldAlert className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                {user.banned ? 'Banned' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditUser(user)}
                                                    className="p-2 text-muted-foreground hover:bg-accent/10 hover:text-accent rounded-lg transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button className="p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors">
                                                            <UserX className="w-4 h-4" />
                                                        </button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-surface border-border">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-foreground">Delete User Account</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-muted-foreground">
                                                                Are you sure? This action cannot be undone. This will permanently delete
                                                                the user <strong>{user.email}</strong> and all associated links and data.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-background border-border text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-red-500 hover:bg-red-600 text-white"
                                                                onClick={() => handleAction(user.id, 'delete')}
                                                            >
                                                                Delete Permanently
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="p-2 border border-border rounded-lg disabled:opacity-50 text-foreground hover:bg-surface-hover transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className="p-2 border border-border rounded-lg disabled:opacity-50 text-foreground hover:bg-surface-hover transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit User Dialog */}
            {selectedUser && (
                <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                    <DialogContent className="bg-surface border-border sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-foreground text-xl">Edit User</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                View stats and modify subscription status for <strong className="text-foreground">{selectedUser.email}</strong>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-card p-4 rounded-xl">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2"><LinkIcon className="w-4 h-4" /> Links</div>
                                    <div className="text-2xl font-bold text-foreground">{selectedUser.stats?.links || 0}</div>
                                </div>
                                <div className="glass-card p-4 rounded-xl">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2"><BarChart3 className="w-4 h-4" /> Clicks</div>
                                    <div className="text-2xl font-bold text-foreground">{selectedUser.stats?.clicks || 0}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Metrics & Access</h3>
                                <div className="flex items-center justify-between py-2 border-b border-border">
                                    <span className="text-sm text-muted-foreground">Last Country</span>
                                    <span className="text-sm font-medium flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {selectedUser.metrics?.country || "Unknown"}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-border">
                                    <span className="text-sm text-muted-foreground">Known Device</span>
                                    <span className="text-sm font-mono">{selectedUser.metrics?.device || "Not logged"}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Plan Management</h3>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-muted-foreground">Current Plan</span>
                                    <Select defaultValue={selectedUser.plan || 'creator'} onValueChange={(v) => handlePlanChange(selectedUser.id, v)}>
                                        <SelectTrigger className="w-[180px] bg-background border-border">
                                            <SelectValue placeholder="Select plan" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-surface border-border">
                                            <SelectItem value="creator">Free (Creator)</SelectItem>
                                            <SelectItem value="pro">Creator Pro</SelectItem>
                                            <SelectItem value="agency">Agency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
