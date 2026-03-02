import { useState, useEffect } from "react";
import { CreditCard, History, ChevronRight, Loader2 } from "lucide-react";
import { PLANS, PlanType } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { pb } from "@/lib/pocketbase";

type BillingRecord = {
    id: string;
    plan: string;
    amount: number;
    status: string;
    payment_method: string;
    created: string;
};

export default function BillingPage() {
    const { user } = useAuth();
    const [currentPlan, setCurrentPlan] = useState<PlanType>("creator");
    const [logs, setLogs] = useState<BillingRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = user as { plan?: PlanType } | null;
        if (u && u.plan) {
            setCurrentPlan(u.plan);
        }
    }, [user]);

    useEffect(() => {
        const fetchBilling = async () => {
            if (!user) return;
            try {
                const result = await pb.collection("billing").getList(1, 50, {
                    filter: `user_id="${user.id}"`,
                    sort: "-created",
                    requestKey: null
                });
                setLogs(result.items as unknown as BillingRecord[]);
            } catch (err: unknown) {
                console.error("Failed to fetch billing records", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBilling();
    }, [user]);

    const activePlanDetails = PLANS[currentPlan] || PLANS.creator;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("ru-RU", {
            year: "numeric", month: "short", day: "numeric"
        });
    };

    const getEndDate = (dateStr: string) => {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + 30);
        return d.toLocaleDateString("ru-RU", {
            year: "numeric", month: "short", day: "numeric"
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Billing History</h1>
                <p className="text-muted-foreground">Manage your subscription status and billing history.</p>
            </div>

            {/* Current Plan Block */}
            <div className="glass-card rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="flex items-start gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex flex-shrink-0 items-center justify-center">
                        <CreditCard className="w-7 h-7 text-accent" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-1">{activePlanDetails.name} Plan</h2>
                        <p className="text-sm text-muted-foreground">
                            ${activePlanDetails.price}/month • Up to {activePlanDetails.limits.links} smart links
                        </p>
                    </div>
                </div>

                <div className="relative z-10 w-full md:w-auto">
                    <Link
                        to="/dashboard/pricing"
                        className="w-full md:w-auto px-6 py-3 rounded-xl bg-background border border-border text-foreground font-medium hover:border-accent hover:text-accent flex items-center justify-center gap-2 transition-all shadow-sm group"
                    >
                        Modify Plan
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* History Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                        <History className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Payment Logs</h3>
                        <p className="text-xs text-muted-foreground">History of charges and plan changes</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-background/50 text-muted-foreground">
                            <tr>
                                <th className="px-6 py-4 font-medium">Plan</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Price</th>
                                <th className="px-6 py-4 font-medium">Method</th>
                                <th className="px-6 py-4 font-medium">Start Date</th>
                                <th className="px-6 py-4 font-medium">End Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-background/30 transition-colors">
                                        <td className="px-6 py-4 text-foreground font-medium capitalize">{log.plan}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${log.status === "active"
                                                ? "bg-green-500/10 text-green-500"
                                                : "bg-red-500/10 text-red-500"
                                                }`}>
                                                {log.status === "active" ? "Активная" : "Не активная"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">${log.amount}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-foreground/5 text-muted-foreground border border-border/50">
                                                {log.payment_method || "Given"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">{formatDate(log.created)}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{getEndDate(log.created)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                        Пока нет истории платежей.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
