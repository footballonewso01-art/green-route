import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Zap, Check, Shield, BarChart3, Globe, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { PlanType, PLAN_RANKS } from "@/lib/plans";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
      { text: "Link Optimization", icon: "🛡️", tooltip: "Hide your destination URLs from bots and competitor scrapers using cloaking." },
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

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  blinkDirection: number;
}

export default function PricingPage() {
  const { user } = useAuth();
  const userPlan = (user as { plan?: PlanType })?.plan;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useSeo(SEO_PAGES.pricing);

  // Background animated stars canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let stars: Star[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      const numStars = Math.floor((canvas.width * canvas.height) / 12000);
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.7 + 0.1,
          speed: Math.random() * 0.05 + 0.01,
          blinkDirection: Math.random() > 0.5 ? 1 : -1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grains/noise overlay manually via canvas for high performance
      ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillRect(x, y, 1, 1);
      }

      stars.forEach((star) => {
        // Soft green glowing stars
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        
        // Blink logic
        star.opacity += star.blinkDirection * 0.005;
        if (star.opacity > 0.8) {
          star.opacity = 0.8;
          star.blinkDirection = -1;
        } else if (star.opacity < 0.1) {
          star.opacity = 0.1;
          star.blinkDirection = 1;
        }

        // Float up slowly
        star.y -= star.speed * 12;
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }

        ctx.fillStyle = `rgba(34, 197, 94, ${star.opacity})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(34, 197, 94, 0.6)";
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      animationId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col justify-center pt-14 pb-20 md:pt-20 md:pb-24">
      {/* Background stars canvas & grid */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none w-full h-full opacity-60" />
      <div className="absolute inset-0 bg-grid-white opacity-[0.03] z-0 pointer-events-none" />

      {/* Decorative Blur Orbs */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[150px] mix-blend-screen pointer-events-none z-0" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[130px] mix-blend-screen pointer-events-none z-0" />

      <section id="pricing" className="relative z-10 px-6 w-full transform -translate-y-[5%]">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 md:mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              Choose Your Growth Engine
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-none">
              Choose your <span className="gradient-text">growth plan</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Start free, upgrade when you're ready. Level up your conversions, domain mapping, and traffic telemetry.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">
            {plans.map((plan) => {
              const effectivePlan = userPlan || "creator";
              const isCurrent = !!user && effectivePlan === plan.id;
              const isDowngrade = user && PLAN_RANKS[plan.id as PlanType] < PLAN_RANKS[effectivePlan as PlanType];
              const isDisabled = isCurrent || isDowngrade;

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
                          ${plan.price}
                        </span>
                        <span className="text-base font-medium text-muted-foreground">/mo</span>
                      </div>
                    </div>

                    <TooltipProvider>
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
                    </TooltipProvider>

                    {user ? (
                      isCurrent ? (
                        <button
                          disabled
                          className="w-full text-center py-3.5 rounded-xl font-bold bg-surface-hover border border-white/10 text-muted-foreground cursor-not-allowed opacity-80 text-sm"
                        >
                          Your Current Plan
                        </button>
                      ) : isDowngrade ? (
                        <button
                          disabled
                          className="w-full text-center py-3.5 rounded-xl font-bold bg-surface-hover border border-border text-muted-foreground cursor-not-allowed opacity-60 text-sm"
                        >
                          Included in Your Plan
                        </button>
                      ) : (
                        <Link
                          to="/dashboard/pricing"
                          className={`w-full text-center py-3.5 rounded-xl font-bold transition-all duration-300 block text-sm transform active:scale-95 ${
                            isPro 
                              ? "btn-primary-glow" 
                              : isAgency 
                                ? "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-indigo-600 hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]" 
                                : "border border-border hover:bg-surface-hover text-foreground hover:border-white/20"
                          }`}
                        >
                          {plan.buttonText}
                        </Link>
                      )
                    ) : (
                      <Link
                        to="/register"
                        className={`w-full text-center py-3.5 rounded-xl font-bold transition-all duration-300 block text-sm transform active:scale-95 ${
                          isPro 
                            ? "btn-primary-glow" 
                            : isAgency 
                              ? "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-indigo-600 hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]" 
                              : "border border-border hover:bg-surface-hover text-foreground hover:border-white/20"
                        }`}
                      >
                        {plan.id === "creator" ? "Get Started" : plan.buttonText}
                      </Link>
                    )}
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
      </section>
    </div>
  );
}
