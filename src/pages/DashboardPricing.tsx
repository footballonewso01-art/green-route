import { useState } from "react";
import { Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { PlanType, PLAN_RANKS } from "@/lib/plans";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";

const plans = [
    {
        id: "creator",
        name: "Creator",
        price: "0",
        description: "Perfect for getting started",
        features: [
            { text: "3 Smart Links", icon: "🔗", tooltip: "Create and manage 3 active smart links." },
            { text: "Full Profile Customization", icon: "👤", tooltip: "Avatar, bio, and custom themes now free!" },
            { text: "Geo Targeting", icon: "🌍", tooltip: "Redirect users based on their country for free." },
            { text: "Standard Support", icon: "💬" }
        ],
        buttonText: "Current Plan",
        popular: false
    },
    {
        id: "pro",
        name: "Creator Pro",
        price: "9",
        annualPrice: "7",
        description: "Advanced tools for growing creators",
        features: [
            { text: "10 Smart Links", icon: "🔗" },
            { text: "Remove GreenRoute Branding", icon: "✨", tooltip: "Clean links without our branding badge." },
            { text: "Deep Links (Direct)", icon: "⚡", tooltip: "Bypass intermediate pages for max speed." },
            { text: "Advanced Analytics", icon: "📊" },
            { text: "Link Optimization", icon: "🛡️" },
            { text: "Device Targeting", icon: "📱" }
        ],
        buttonText: "Upgrade to Pro",
        popular: true
    },
    {
        id: "agency",
        name: "Agency",
        price: "29",
        annualPrice: "24",
        description: "For agencies and power users",
        features: [
            { text: "Unlimited Smart Links", icon: "🚀" },
            { text: "Custom Slugs (e.g. /my-link)", icon: "✍️", tooltip: "Choose your own short link handles." },
            { text: "Everything in Creator Pro", icon: "✅" },
            { text: "Priority 24/7 Support", icon: "⚡" },
            { text: "Team Access", icon: "👥" }
        ],
        buttonText: "Upgrade to Agency",
        popular: false
    },
];

export default function DashboardPricing() {
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
    const [loading, setLoading] = useState(false);

    const userPlan = ((user as any)?.plan as PlanType) || "creator";

    const handleUpgrade = async (planId: string) => {
        if (userPlan === planId) return;
        setLoading(true);
        try {
            await pb.collection("users").update(user!.id, { plan: planId });
            toast.success(`Successfully upgraded to ${planId.toUpperCase()}!`);
            await pb.collection("users").authRefresh();
        } catch (e: any) {
            toast.error(e.message || "Failed to upgrade");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Pricing & Checkout</h1>
                <p className="text-muted-foreground text-sm mt-1">Upgrade your account to unlock advanced features</p>
            </div>

            <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
                {/* Decorative background */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="text-center mb-12 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs mb-4">
                        💰 Simple, transparent pricing
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Choose your <span className="gradient-text">growth plan</span>
                    </h2>
                    <p className="text-muted-foreground text-lg mb-8">Start free, upgrade when you're ready.</p>

                    {/* Billing Toggle */}
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="p-1 rounded-xl bg-background border border-border flex items-center">
                            <button
                                onClick={() => setBillingCycle("monthly")}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === "monthly" ? "bg-accent text-accent-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                Monthly
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setBillingCycle("annual")}
                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === "annual" ? "bg-accent text-accent-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    Annual
                                </button>
                                <div className="absolute -top-3 -right-3 px-2 py-0.5 rounded-full bg-green-500 text-[10px] font-bold text-white shadow-xl animate-bounce">
                                    20% OFF
                                </div>
                            </div>
                        </div>
                        {billingCycle === "annual" && (
                            <p className="text-xs font-bold text-green-500 animate-fade-in">
                                ✨ Save up to $60 / year with annual billing
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative z-10">
                    {plans.map((plan) => {
                        const isCurrent = userPlan === plan.id;
                        const isDowngrade = PLAN_RANKS[plan.id as PlanType] < PLAN_RANKS[userPlan as PlanType];
                        const isDisabled = isCurrent || isDowngrade || loading;

                        // Highlight logic: 
                        // If user is Free, highlight "pro" (Most Popular).
                        // If user is Pro or Agency, highlight their "isCurrent" plan instead.
                        const shouldHighlight = (userPlan === "creator" && plan.id === "pro") || isCurrent;
                        const showPopularBadge = (userPlan === "creator" && plan.id === "pro");

                        return (
                            <div key={plan.id} className={`bg-surface/50 backdrop-blur-md border ${shouldHighlight ? "border-accent ring-1 ring-accent/50 shadow-[0_0_30px_-10px_rgba(var(--accent-rgb),0.2)]" : "border-border hover:border-accent/30"} p-8 rounded-3xl relative flex flex-col h-full transition-all duration-300 hover:-translate-y-1`}>
                                {showPopularBadge && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5">
                                        <Zap className="w-3 h-3 fill-current" /> Most Popular
                                    </div>
                                )}
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-6 h-4">{plan.description}</p>
                                    <div className="text-5xl font-extrabold text-foreground mb-1">
                                        ${billingCycle === "annual" && plan.annualPrice ? plan.annualPrice : plan.price}
                                        <span className="text-base font-normal text-muted-foreground ml-1">/mo</span>
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-10 flex-1">
                                    {plan.features.map((f, idx) => (
                                        <li key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <span className="text-lg">{f.icon}</span>
                                            <span className="flex-1">{f.text}</span>
                                            {f.tooltip && (
                                                <Tooltip delayDuration={0}>
                                                    <TooltipTrigger asChild>
                                                        <button type="button" className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[10px] cursor-help opacity-50 hover:opacity-100 hover:border-accent hover:text-accent transition-all">
                                                            i
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-xs text-[10px] leading-relaxed p-2 bg-surface border-border text-foreground shadow-2xl">
                                                        <p>{f.tooltip}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    disabled={isDisabled}
                                    onClick={() => handleUpgrade(plan.id)}
                                    className={`block w-full text-center py-4 rounded-2xl font-bold transition-all duration-300 transform active:scale-95 disabled:cursor-not-allowed ${isCurrent
                                        ? "bg-accent/25 border-transparent ring-2 ring-accent shadow-[0_0_25px_-5px_rgba(var(--accent-rgb),0.6)] opacity-100 pointer-events-none"
                                        : isDowngrade
                                            ? "bg-surface text-muted-foreground pointer-events-none opacity-50"
                                            : plan.popular
                                                ? "btn-primary-glow"
                                                : "bg-surface border border-border text-foreground hover:bg-surface-hover shadow-sm"
                                        }`}
                                >
                                    {isCurrent ? (
                                        <span className="text-white">
                                            Your Current Plan
                                        </span>
                                    ) : isDowngrade ? (
                                        "Downgrade Unavailable"
                                    ) : (
                                        plan.buttonText
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
