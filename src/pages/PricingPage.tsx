import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Zap, Check, Shield, BarChart3, Globe, MousePointer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { PlanType, PLAN_RANKS } from "@/lib/plans";

const plans = [
  {
    id: "creator",
    name: "Creator",
    price: "0",
    description: "Perfect for getting started",
    features: [
      { text: "3 Smart Links", icon: "🔗" },
      { text: "Full Profile Customization", icon: "👤" },
      { text: "Device Targeting", icon: "📱" },
      { text: "Security Check", icon: "🛡️" }
    ],
    popular: false
  },
  {
    id: "pro",
    name: "Creator Pro",
    price: "9",
    description: "Advanced tools for growing creators",
    popular: true,
    features: [
      { text: "15 Smart Links", icon: "🔗" },
      { text: "Remove Linktery Branding", icon: "✨" },
      { text: "Deeplink", icon: "⚡" },
      { text: "Advanced Analytics", icon: "📊" },
      { text: "Link Optimization", icon: "🛡️" },
      { text: "Geo Targeting", icon: "🌍" },
      { text: "Tracking Pixels", icon: "🎯" }
    ],
  },
  {
    id: "agency",
    name: "Agency",
    price: "29",
    description: "For agencies and power users",
    popular: false,
    features: [
      { text: "Unlimited Smart Links", icon: "🚀" },
      { text: "A/B Testing (Unlimited)", icon: "🧪" },
      { text: "Custom Domains (Unlimited)", icon: "🌐" },
      { text: "Custom Slugs (e.g. /my-link)", icon: "✍️" },
      { text: "Everything in Creator Pro", icon: "✅" }
    ],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const userPlan = (user as { plan?: PlanType })?.plan;

  return (
    <div className="min-h-screen bg-background py-20 px-6">
      <section id="pricing" className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Choose your <span className="gradient-text">growth plan</span></h1>
            <p className="text-muted-foreground text-lg">Start free, upgrade when you're ready.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const planId = plan.id as PlanType;
              const isCurrentReal = userPlan === planId;
              const isDowngrade = PLAN_RANKS[planId] < PLAN_RANKS[userPlan || 'creator'];
              const isDisabled = isCurrentReal || isDowngrade;

              const isPro = planId === "pro";
              const isAgency = planId === "agency";

              return (
                <div key={plan.id} className={`relative group transition-all duration-500 hover:translate-y-[-8px] ${isPro ? "hover:scale-[1.05]" : ""}`}>
                  <div className={`glass-card p-8 rounded-2xl relative flex flex-col h-full ${plan.popular ? (isAgency ? "shadow-indigo-glow" : "shadow-glow") : ""} ${isPro ? "premium-border" : ""} ${isAgency ? "border-indigo-500/30" : ""}`}>
                    <h3 className={`text-xl font-bold ${isPro ? "text-accent" : isAgency ? "text-indigo-400" : "text-foreground"}`}>{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    <div className="text-4xl font-extrabold text-foreground mt-4">{plan.price}<span className="text-base font-normal text-muted-foreground ml-1">/mo</span></div>

                    <ul className="mt-8 space-y-3 flex-1">
                      {plan.features.map((f: { text: string; icon?: string; tooltip?: string } | string) => (
                        <li key={typeof f === 'string' ? f : f.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-accent flex-shrink-0" />
                          {typeof f === 'string' ? f : (
                            <>
                              {f.icon && <span role="img" aria-label={f.text} className="mr-1">{f.icon}</span>}
                              {f.text}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={isCurrentReal ? "#" : "/register"}
                      className={`mt-8 block text-center py-3 rounded-xl font-medium transition-all duration-200 transform active:scale-95 ${isDisabled
                        ? (isCurrentReal ? "bg-surface-hover border border-white/10 text-white cursor-default" : "bg-surface-hover text-muted-foreground pointer-events-none opacity-80")
                        : (plan.popular ? "btn-primary-glow" : "border border-border hover:bg-surface-hover text-foreground")
                        }`}
                    >
                      {isCurrentReal ? (
                        <span className="text-white">Your Current Plan</span>
                      ) : isDowngrade ? (
                        "Downgrade Unavailable"
                      ) : (
                        "Get Started"
                      )}
                    </Link>
                  </div>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 glass-badge shimmer z-50">
                      <Zap className="w-3 h-3 fill-current text-accent" /> Most Popular
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
