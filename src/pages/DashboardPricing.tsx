import { useState } from "react";
import { Zap, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { PlanType, PLAN_RANKS } from "@/lib/plans";
import { pb } from "@/lib/pocketbase";
import { STRIPE_PRICES } from "@/lib/stripe";
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
            { text: "Security Check", icon: "🛡️", tooltip: "Protective verification page before every redirect." },
            { text: "Domain Choose List", icon: "🌐", tooltip: "Select from a curated pool of domains to host your smart links." }
        ],
        buttonText: "Start for Free",
        popular: false
    },
    {
        id: "pro",
        name: "Creator Pro",
        price: "11",
        annualPrice: "9",
        description: "Advanced tools for growing creators",
        popular: true,
        features: [
            { text: "15 Smart Links", icon: "🔗", tooltip: "Create and manage up to 15 active smart redirect links." },
            { text: "Remove Linktery Branding", icon: "✨", tooltip: "Completely remove the branding badge from your public profile." },
            { text: "Deeplink", icon: "⚡", tooltip: "Bypass in-app social browsers to open your links directly in Safari or Chrome." },
            { text: "Advanced Analytics", icon: "📊", tooltip: "Detailed tracking: clicks over time, countries, referrers, and device types." },
            { text: "Link Optimization", icon: "🛡️", tooltip: "Optimize traffic quality by filtering automated crawlers and verifying visitors." },
            { text: "Geo Targeting", icon: "🌍", tooltip: "Route visitors to different destination URLs based on their country." }
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
            { text: "Tracking Pixels", icon: "🎯", tooltip: "FB, Google, TikTok pixel support." },
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
            if (planId === "creator") {
                // Free plan downgrade logic (could trigger portal to cancel in the future)
                toast.info("Please manage downgrades from your Billing settings.");
                setLoading(false);
                return;
            }

            let priceId = "";
            if (planId === "pro") {
                priceId = billingCycle === "annual" ? STRIPE_PRICES.pro.annual : STRIPE_PRICES.pro.monthly;
            } else if (planId === "agency") {
                priceId = billingCycle === "annual" ? STRIPE_PRICES.agency.annual : STRIPE_PRICES.agency.monthly;
            }

            if (!priceId) throw new Error("Invalid plan selection");

            // Ensure Auth is fully propagated
            if (!pb.authStore.isValid || !pb.authStore.token) {
                throw new Error("You must be logged in to upgrade");
            }

            // Call our new custom PocketBase backend route
            const data = await pb.send("/api/stripe/create-checkout", {
                method: "POST",
                body: { priceId, billingCycle }
            });

            // Redirect to Stripe Checkout
            window.location.assign(data.url);
        } catch (e: unknown) {
            console.error("Upgrade error:", e);
            toast.error((e as Error).message || "Failed to initiate upgrade");
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
                            <div key={plan.id} className={`relative group transition-all duration-500 hover:translate-y-[-10px] flex flex-col ${isPro ? "hover:scale-[1.03]" : ""}`}>
                                {/* Backdrop glowing background blurs */}
                                {isPro && (
                                    <div className="absolute inset-0 bg-accent/10 rounded-[28px] blur-[30px] -z-10 group-hover:bg-accent/15 transition-all duration-500 pointer-events-none" />
                                )}
                                {isAgency && (
                                    <div className="absolute inset-0 bg-indigo-500/5 rounded-[28px] blur-[30px] -z-10 group-hover:bg-indigo-500/10 transition-all duration-500 pointer-events-none" />
                                )}

                                <div className={`glass-card pt-10 px-8 pb-8 rounded-[28px] relative flex flex-col h-full bg-card/60 backdrop-blur-2xl border transition-all duration-500 ${
                                    isPro 
                                        ? "border-accent/40 shadow-glow hover:border-accent/60" 
                                        : isAgency 
                                            ? "border-indigo-500/20 shadow-indigo-glow hover:border-indigo-500/40" 
                                            : "border-white/5 hover:border-white/15"
                                }`}>
                                    
                                    <div className="text-left mb-6">
                                        <h3 className={`text-2xl font-extrabold mb-2 tracking-tight ${
                                            isPro ? "text-accent" : isAgency ? "text-indigo-400" : "text-foreground"
                                        }`}>{plan.name}</h3>
                                        <p className="text-sm text-muted-foreground h-12 leading-relaxed">{plan.description}</p>
                                        
                                        <div className="flex items-baseline mt-5 mb-2 gap-1.5">
                                            <span className="text-5xl font-black text-white tracking-tight">
                                                ${billingCycle === "annual" && plan.annualPrice ? plan.annualPrice : plan.price}
                                            </span>
                                            <span className="text-base font-medium text-muted-foreground">/mo</span>
                                            {billingCycle === "annual" && plan.annualPrice && (
                                                <span className="ml-2 text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    Save 20%
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ul className="space-y-3.5 mb-8 flex-1 text-left">
                                        {plan.features.map((f, idx) => (
                                            <li key={idx} className="flex items-center gap-3 text-sm text-muted-foreground group/feature">
                                                <span className={`w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm flex-shrink-0 transition-all duration-300 ${
                                                    isPro ? "group-hover/feature:bg-accent/10 group-hover/feature:border-accent/30" : isAgency ? "group-hover/feature:bg-indigo-500/10 group-hover/feature:border-indigo-500/30" : "group-hover/feature:bg-white/10"
                                                }`}>
                                                    {f.icon}
                                                </span>
                                                <span className="flex-1 truncate">{f.text}</span>
                                                {f.tooltip && (
                                                    <Tooltip delayDuration={0}>
                                                        <TooltipTrigger asChild>
                                                            <button type="button" className="w-4 h-4 rounded-full border border-muted-foreground/30 flex items-center justify-center text-[10px] cursor-help opacity-40 hover:opacity-100 hover:border-accent hover:text-accent transition-all flex-shrink-0">
                                                                i
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs text-[10px] leading-relaxed p-2 bg-surface border-border text-foreground shadow-2xl z-50">
                                                            <p>{f.tooltip}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => handleUpgrade(plan.id)}
                                        disabled={isDisabled || loading}
                                        className={`w-full text-center py-3.5 rounded-xl font-bold transition-all duration-300 block text-sm transform active:scale-95 ${
                                            isCurrent
                                                ? "bg-surface-hover border border-white/10 text-muted-foreground cursor-not-allowed opacity-80"
                                                : isDowngrade
                                                    ? "bg-surface-hover border border-border text-muted-foreground cursor-not-allowed opacity-60"
                                                    : isPro 
                                                        ? "btn-primary-glow" 
                                                        : isAgency 
                                                            ? "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-indigo-600 hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]" 
                                                            : "border border-border hover:bg-surface-hover text-foreground hover:border-white/20"
                                        }`}
                                    >
                                        {isCurrent ? "Your Current Plan" : isDowngrade ? "Included in Your Plan" : loading ? "Processing..." : plan.buttonText}
                                    </button>
                                </div>
                                
                                {showPopularBadge && (
                                    <div className="absolute -top-3.5 left-6 bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider py-1 px-3.5 rounded-full flex items-center gap-1 shadow-lg shadow-accent/20">
                                        <Zap className="w-3.5 h-3.5 fill-current" /> Most Popular
                                    </div>
                                )}

                                {isAgency && (
                                    <div className="absolute -top-3.5 left-6 bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3.5 rounded-full flex items-center gap-1 shadow-lg shadow-indigo-500/20 animate-fade-in">
                                        <Sparkles className="w-3.5 h-3.5 fill-current" /> Power User
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
