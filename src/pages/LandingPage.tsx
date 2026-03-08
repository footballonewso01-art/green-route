import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, Globe, MousePointer, ExternalLink, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { PlanType, PLAN_RANKS } from "@/lib/plans";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const features = [
  {
    icon: Shield,
    title: "Link Optimization",
    description: "Hide your destination URLs. Protect your campaigns from competitors and prying eyes.",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description: "Track every click with geo, device, and source data. Real-time insights at your fingertips.",
  },
  {
    icon: Zap,
    title: "Smart Routing",
    description: "Route traffic by country, device, or OS. Maximize conversions with intelligent redirects.",
  },
  {
    icon: Globe,
    title: "Custom Domains",
    description: "Use your own domain for branded links. Build trust and increase click-through rates.",
  },
  {
    icon: MousePointer,
    title: "Deeplink",
    description: "Optimized link routing from social apps to the system browser. Smooth transitions for better user experience across devices.",
  },
  {
    icon: UserIcon,
    title: "Link-in-Bio Profiles",
    description: "Create beautiful profile pages with all your links. Complete visual control and customization.",
  },
];

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
    price: "11",
    annualPrice: "9",
    description: "Advanced tools for growing creators",
    popular: true,
    features: [
      { text: "15 Smart Links", icon: "🔗" },
      { text: "Remove Linktery Branding", icon: "✨", tooltip: "Clean links without our branding badge." },
      { text: "Deeplink", icon: "⚡", tooltip: "Smart route optimization: Seamless transition from social apps to system browser." },
      { text: "Advanced Analytics", icon: "📊" },
      { text: "Link Optimization", icon: "🛡️" },
      { text: "Geo Targeting", icon: "🌍" }
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

export default function LandingPage() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(console.error);
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const userPlan = (user as { plan?: PlanType })?.plan;

  // Helper to get avatar URL
  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3.5 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Linktery" className="h-[60px] w-auto mix-blend-screen" />
            <span className="text-[22px] font-extrabold text-foreground tracking-tight">Linktery</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>

            {user ? (
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Dashboard</span>
                <div className="w-8 h-8 rounded-full border border-accent/30 p-0.5 overflow-hidden group-hover:border-accent transition-colors">
                  {getAvatarUrl() ? (
                    <img src={getAvatarUrl()!} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-accent/10 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-accent" />
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Login</Link>
                <Link to="/register" className="btn-primary-glow text-sm !py-2 !px-4 inline-block">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Video (Localized to Hero) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/mainvid.mp4" type="video/mp4" />
          </video>
          {/* Dark gradient overlay for smooth transition to next section */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-8">
            <Zap className="w-3.5 h-3.5" />
            Smart Link Management Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Control Your Traffic.
            <br />
            <span className="gradient-text">Maximize Every Click.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Advanced link management with smart routing, deep linking, and real-time analytics. Built for creators, affiliates, and marketers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#features" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              Learn More
            </a>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 mx-auto max-w-6xl relative animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-3xl" />
            <div className="relative glass-card p-2 rounded-2xl overflow-hidden shadow-glow">
              <img src="/mainstat.png" alt="Linktery Dashboard" className="w-full rounded-xl shadow-2xl" fetchPriority="high" loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" ref={sectionRef} className="py-24 px-6 relative overflow-hidden group">
        {/* Features Video Background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.07] scale-110 group-hover:scale-100 transition-transform duration-[3000ms] ease-out">
          <video
            ref={videoRef}
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/features.mp4" type="video/mp4" />
          </video>
          {/* Gradients to blend with background */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 px-6 relative">
            <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-[1.1]">
              Everything You <span className="gradient-text">Need</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools for modern link management and traffic optimization.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={f.title} className="glass-card-hover p-6 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs mb-4">
              💰 Simple, transparent pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Choose your <span className="gradient-text">growth plan</span>
            </h2>
            <p className="text-muted-foreground text-lg">Start free, upgrade when you're ready.</p>

            {/* Billing Toggle */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3">
              <div className="p-1 rounded-xl bg-surface border border-border flex items-center">
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

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const effectivePlan = userPlan || "creator";
              const isCurrent = !!user && effectivePlan === plan.id;
              const isDowngrade = user && PLAN_RANKS[plan.id as PlanType] < PLAN_RANKS[effectivePlan as PlanType];
              const isDisabled = isCurrent || isDowngrade;

              const shouldHighlight = (effectivePlan === "creator" && plan.id === "pro") || isCurrent;
              const showPopularBadge = plan.id === "pro";

              const isPro = plan.id === "pro";
              const isAgency = plan.id === "agency";

              return (
                <div key={plan.id} className={`relative group transition-all duration-500 hover:translate-y-[-8px] ${isPro ? "hover:scale-[1.05]" : ""}`}>
                  <div className={`glass-card p-8 rounded-2xl relative flex flex-col h-full ${shouldHighlight ? (isAgency ? "shadow-indigo-glow" : "shadow-glow") : ""} ${isPro ? "premium-border" : ""} ${isAgency ? "border-indigo-500/30" : ""}`}>
                    <div className="text-center mb-6">
                      <h3 className={`text-xl font-bold mb-1 ${isPro ? "text-accent" : isAgency ? "text-indigo-400" : "text-foreground"}`}>{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
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

                    {user ? (
                      <button
                        disabled
                        className={`w-full text-center py-4 rounded-2xl font-bold transition-all duration-300 bg-surface-hover border border-white/10 text-muted-foreground cursor-not-allowed opacity-80`}
                      >
                        {isCurrent ? "Your Current Plan" : "Upgrade (Beta)"}
                      </button>
                    ) : (
                      <button
                        disabled
                        className={`w-full text-center py-4 rounded-2xl font-bold transition-all duration-300 bg-surface-hover border border-border text-muted-foreground cursor-not-allowed opacity-80`}
                      >
                        {plan.id === "creator" ? "Get Started" : "Upgrade (Beta)"}
                      </button>
                    )}
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

          {/* Benefits Footer */}
          <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 text-sm text-muted-foreground opacity-80">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold">✓</div>
              30 day money back guarantee
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold">✓</div>
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold">✓</div>
              24/7 support
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-[11px] hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Linktery" className="h-12 w-auto mix-blend-screen grayscale" />
            <span className="text-xl font-bold text-foreground/80 tracking-tight translate-y-[1px]">Linktery</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-accent transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-accent transition-colors">Terms & Conditions</Link>
            <p className="text-sm text-muted-foreground">© 2026 Linktery. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
