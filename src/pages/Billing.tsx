import { useState, useEffect } from "react";
import { CreditCard, History, ChevronRight } from "lucide-react";
import { PLANS, PlanType } from "@/lib/plans";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export default function BillingPage() {
    const { user } = useAuth();
    const [currentPlan, setCurrentPlan] = useState<PlanType>("creator");

    useEffect(() => {
        if (user && (user as any).plan) {
            setCurrentPlan((user as any).plan as PlanType);
        }
    }, [user]);

    const activePlanDetails = PLANS[currentPlan] || PLANS.creator;

    // Placeholder mock logs since there's no payment backend yet
    const logs: any[] = [];

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
                                <th className="px-6 py-4 font-medium">Start Date</th>
                                <th className="px-6 py-4 font-medium">End Date</th>
                                <th className="px-6 py-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {logs.length > 0 ? (
                                logs.map((log, index) => (
                                    <tr key={index} className="hover:bg-background/30 transition-colors">
                                        <td className="px-6 py-4 text-foreground font-medium">{log.plan}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">{log.price}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{log.startDate}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{log.endDate}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-accent hover:underline text-xs font-medium">Receipt</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        No payment history found.
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
