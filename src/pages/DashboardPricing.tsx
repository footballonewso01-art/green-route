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
            { text: "3 Smart Links", icon: "🔗", tooltip: "Includes 3 Smart Links on Free plan." },
            { text: "Full Profile Customization", icon: "👤", tooltip: "Avatar, bio, and custom themes now free." },
            { text: "Device Targeting", icon: "📱", tooltip: "Redirect users by their device type for free." },
            { text: "Security Check", icon: "🛡️", tooltip: "Protective verification page before every redirect." }
        ],
        buttonText: "Start for Free",
        popular: false
    },
    {
        id: "pro",
        name: "Creator Pro",
        price: "9",
        annualPrice: "7",
        description: "Advanced tools for growing creators",
        popular: true,
        features: [
            { text: "15 Smart Links", icon: "🔗" },

            { text: "Remove Linktery Branding", icon: "✨", tooltip: "Clean links without our branding badge." },
            { text: "Deeplinks (Beta)", icon: "⚡", tooltip: "Smart route: Seamless transition from social apps to system browser." },
            { text: "Advanced Analytics", icon: "📊" },
            { text: "Link Optimization", icon: "🛡️" },
            { text: "Geo Targeting", icon: "🌍" },
            { text: "Tracking Pixels", icon: "🎯" }
        ],
        buttonText: "Upgrade to Pro",
    },
    {
        id: "agency",
        name: "Agency",
        price: "29",
        annualPrice: "24",
        description: "For agencies and power users",
        features: [
            { text: "Unlimited Smart Links", icon: "🚀" },
            { text: "A/B Testing (Unlimited)", icon: "🧪", tooltip: "Compare multiple link variants simultaneously." },
            { text: "Custom Domains (Unlimited)", icon: "🌐", tooltip: "Run Linktery on your own domains." },
            { text: "Custom Slugs (e.g. /my-link)", icon: "✍️", tooltip: "Choose your own short link handles." },
            { text: "Everything in Creator Pro", icon: "✅" }
        ],
        buttonText: "Upgrade to Agency",
        popular: false
    },
];

export default function DashboardPricing() {
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
    const [loading, setLoading] = useState(false);

    const userPlan = ((user as { plan?: PlanType })?.plan) || "creator";

    const handleUpgrade = async (planId: string) => {
        if (userPlan === planId) return;
        setLoading(true);
        try {
            // Calculate +30 days if upgrading
            const updateData: Record<string, string> = { plan: planId };
            if (planId !== "creator") {
                const expires = new Date();
                expires.setDate(expires.getDate() + 30);
                updateData.plan_expires_at = expires.toISOString();
            } else {
                updateData.plan_expires_at = ""; // Clear expiration if free
            }

            await pb.collection("users").update(user!.id, updateData);

            // Create billing record
            if (planId !== "creator") {
                await pb.collection("billing").create({
                    user_id: user!.id,
                    plan: planId,
                    amount: planId === "pro" ? 15 : 29,
                    status: "active",
                    payment_method: "Bought"
                });
            }

            toast.success(`Successfully upgraded to ${planId.toUpperCase()}!`);
            await pb.collection("users").authRefresh();
        } catch (e: unknown) {
            toast.error((e as Error).message || "Failed to upgrade");
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

                        const shouldHighlight = (userPlan === "creator" && plan.id === "pro") || isCurrent;
                        const showPopularBadge = plan.id === "pro";

                        const isPro = plan.id === "pro";
                        const isAgency = plan.id === "agency";

                        return (
                            <div key={plan.id} className={`relative group transition-all duration-500 hover:translate-y-[-8px] ${isPro ? "hover:scale-[1.02]" : ""}`}>
                                <div className={`glass-card p-8 rounded-2xl relative flex flex-col h-full ${shouldHighlight ? (isAgency ? "shadow-indigo-glow" : "shadow-glow") : ""} ${isPro ? "premium-border" : ""} ${isAgency ? "border-indigo-500/30" : ""}`}>
                                    <div className="text-center mb-6">
                                        <h3 className={`text-xl font-bold mb-1 ${isPro ? "text-accent" : isAgency ? "text-indigo-400" : "text-foreground"}`}>{plan.name}</h3>
                                        <p className="text-sm text-muted-foreground mb-4 h-10">{plan.description}</p>
                                        <div className="text-4xl font-extrabold text-foreground">
                                            ${billingCycle === "annual" && plan.annualPrice ? plan.annualPrice : plan.price}
                                            <span className="text-base font-normal text-muted-foreground ml-1">/mo</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-4 mb-8 flex-1">
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
                                        className={`block w-full text-center py-4 rounded-2xl font-bold transition-all duration-300 transform active:scale-95 disabled:cursor-not-allowed ${isDisabled
                                            ? (isCurrent ? "bg-surface-hover border border-white/10 text-white cursor-default" : "bg-surface-hover text-muted-foreground pointer-events-none opacity-80")
                                            : (shouldHighlight
                                                ? "btn-primary-glow"
                                                : "bg-surface border border-border text-foreground hover:bg-surface-hover shadow-sm")
                                            }`}
                                    >
                                        {isCurrent ? (
                                            <span className="text-white">Your Current Plan</span>
                                        ) : isDowngrade ? (
                                            "Downgrade Unavailable"
                                        ) : (
                                            "Upgrade Now"
                                        )}
                                    </button>
                                </div>
                                {showPopularBadge && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 glass-badge shimmer z-50">
                                        <Zap className="w-3 h-3 fill-current text-accent" /> Most Popular
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
