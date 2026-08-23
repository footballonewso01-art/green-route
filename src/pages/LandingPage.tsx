import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, Globe, MousePointer, User as UserIcon, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { PlanType, PLAN_RANKS } from "@/lib/plans";
import { trackGrowthEvent } from "@/lib/telemetry";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import { reserveStarterProfile } from "@/lib/profileOnboarding";

const features = [
  {
    icon: Shield,
    title: "Link Optimization",
    description: "Secure your destination URLs. Protect your campaigns from redirection hijacking and brand abuse.",
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
      { text: "1 Biolink Profile", icon: "👤", tooltip: "Create 1 public Link-in-Bio profile." },
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
      { text: "3 Biolink Profiles", icon: "👥", tooltip: "Create up to 3 separate Link-in-Bio profiles." },
      { text: "Remove Linktery Branding", icon: "✨", tooltip: "Completely remove the branding badge from your public profile." },
      { text: "Deeplink", icon: "⚡", tooltip: "Bypass in-app social browsers to open your links directly in Safari or Chrome." },
      { text: "Advanced Analytics", icon: "📊", tooltip: "Detailed tracking: clicks over time, countries, referrers, and device types." },
      { text: "Public API Access", icon: "🔌", tooltip: "Create and update links, read profiles, and connect aggregate analytics to your own tools." },
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
      { text: "25 Client Profiles", icon: "👥", tooltip: "Manage up to 25 separate Link-in-Bio profiles for clients or brands." },
      { text: "Tracking Pixels", icon: "🎯", tooltip: "FB, Google, TikTok pixel support." },
      { text: "A/B Testing (Unlimited)", icon: "🧪", tooltip: "Compare multiple link variants simultaneously." },
      { text: "Custom Domains (Unlimited)", icon: "🌐", tooltip: "Run Linktery on your own domains." },
      { text: "Custom Slugs (e.g. /my-link)", icon: "✍️", tooltip: "Choose your own short link handles." },
      { text: "Public API Access", icon: "🔌", tooltip: "API v1 access with higher rate and daily usage limits." },
      { text: "Everything in Creator Pro", icon: "✅" }
    ],
    buttonText: "Upgrade to Agency",
    popular: false
  },
];

const words = [
  { text: "Your Link in Bio", className: "font-sans font-extrabold tracking-tight text-white" },
  { text: "Link Masking Tool", className: "font-mono font-bold tracking-tighter text-white text-[0.78em]" },
  { text: "Smart Redirects", className: "font-sans font-black italic tracking-tighter text-white text-[0.95em]" },
  { text: "Deep Link Router", className: "font-sans font-extrabold tracking-wide text-white text-[0.82em]" },
  { text: "Traffic Analytics", className: "font-sans font-black tracking-tighter text-white" },
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usernameInput, setUsernameInput] = useState("");
  const [slugReservationLoading, setSlugReservationLoading] = useState(false);
  const [slugReservationError, setSlugReservationError] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const [wordIndex, setWordIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    let interval: NodeJS.Timeout;

    const startInterval = () => {
      interval = setInterval(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
      }, 3000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        clearInterval(interval);
        startInterval();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startInterval();

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useSeo(SEO_PAGES.home);

  useEffect(() => {
    const recordPageView = () => {
      try {
        const isTracked = sessionStorage.getItem("landing_viewed");
        if (!isTracked) {
          trackGrowthEvent("landing_pageview", { surface: "landing" });
          sessionStorage.setItem("landing_viewed", "true");
        }
      } catch (e) {
        // Ignored
      }
    };

    const triggerAnalytics = () => {
      cleanup();
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(() => recordPageView());
      } else {
        setTimeout(recordPageView, 1000);
      }
    };

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", triggerAnalytics);
      window.removeEventListener("click", triggerAnalytics);
      window.removeEventListener("touchstart", triggerAnalytics);
    };

    // Backup timer: 5 seconds for non-interactive views
    const timer = window.setTimeout(triggerAnalytics, 5000);

    // Fast trigger on user interaction
    window.addEventListener("scroll", triggerAnalytics, { passive: true });
    window.addEventListener("click", triggerAnalytics, { passive: true });
    window.addEventListener("touchstart", triggerAnalytics, { passive: true });

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

    return () => {
      cleanup();
      observer.disconnect();
    };
  }, []);

  const showUser = mounted && !!user;
  const userPlan = (user as { plan?: PlanType })?.plan;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MarketingHeader current="home" />

      {/* Hero */}
      <section className="relative flex items-start overflow-hidden px-4 pb-14 pt-28 sm:px-6 sm:pb-16 sm:pt-32 lg:min-h-[90vh] lg:items-center lg:pb-20 lg:pt-32">
        {/* Background Video (Localized to Hero) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/mainvid.min.mp4" type="video/mp4" />
          </video>
          {/* Dark gradient overlay for smooth transition to next section */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-0 text-left lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Content */}
          <div className="lg:col-span-6 flex flex-col items-start transform lg:translate-y-[2%]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1.5 text-xs text-accent sm:mb-7 sm:px-4 sm:text-sm">
              <Zap className="w-3.5 h-3.5" />
              Traffic Management Platform
            </div>

            <h1 className="mb-5 w-full text-[clamp(1.85rem,9.6vw,2.25rem)] font-extrabold leading-[1.12] tracking-tight text-foreground sm:mb-7 sm:text-5xl sm:leading-[1.15] lg:text-[70px]">
              <span className="relative block overflow-hidden h-[1.15em] w-full">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={wordIndex}
                    initial={prefersReducedMotion ? false : { y: "150%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { y: "-150%", opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.75, ease: [0.76, 0, 0.24, 1] }}
                    className={`absolute inset-x-0 block whitespace-nowrap ${words[wordIndex].className}`}
                  >
                    {words[wordIndex].text}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="gradient-text block mt-1">Built to Convert.</span>
            </h1>

            <p className="mb-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:mb-8 md:text-[20px]">
              Smart links and Link-in-Bio profiles built to convert social traffic — with routing, analytics, and API access in one platform.
            </p>

            <div className="relative z-20 mb-6 flex w-full max-w-md flex-col items-start gap-4 sm:mb-8">
              {showUser ? (
                <Link to="/dashboard" className="btn-primary-glow text-base sm:text-[20px] inline-flex items-center justify-center gap-2 px-10 py-4.5 rounded-xl font-bold">
                  Open Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const slug = usernameInput.trim().toLowerCase();
                    if (!slug || slugReservationLoading) return;
                    setSlugReservationError("");
                    setSlugReservationLoading(true);
                    trackGrowthEvent("landing_cta_clicked", { surface: "hero_profile_slug" });
                    try {
                      await reserveStarterProfile(slug);
                      navigate(`/register?profile=${encodeURIComponent(slug)}`);
                    } catch (error) {
                      setSlugReservationError(error instanceof Error ? error.message : "We couldn't reserve this address.");
                      setSlugReservationLoading(false);
                    }
                  }}
                  className="flex w-full items-center rounded-full border border-border/60 bg-surface/40 p-1.5 shadow-glow/5 backdrop-blur-xl transition-all duration-300 hover:border-border/80 focus-within:border-accent/40 focus-within:shadow-glow/15"
                >
                  <div className="flex flex-shrink-0 select-none items-center pl-1 pr-0 text-[13px] font-medium text-zinc-300 sm:text-[16.6px]">
                    <img src="/logo.webp" alt="" className="mr-1 h-8 w-auto flex-shrink-0 mix-blend-screen sm:h-10" />
                    <span>linktery.com/</span>
                  </div>
                  <input
                    type="text"
                    aria-label="Choose your Public Profile address"
                    value={usernameInput}
                    onChange={(e) => {
                      setSlugReservationError("");
                      setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64));
                    }}
                    maxLength={64}
                    placeholder="yourname"
                    className="m-0 min-w-0 w-full border-0 bg-transparent p-0 py-2 pl-px pr-1 text-[13px] text-white outline-none placeholder:text-white/30 focus:ring-0 sm:pr-2 sm:text-[16.6px]"
                  />
                  <button
                    type="submit"
                    disabled={slugReservationLoading}
                    className="btn-primary-glow whitespace-nowrap !rounded-full !px-4 !py-2.5 text-xs font-bold transition-transform active:scale-95 sm:!px-6 sm:text-sm"
                  >
                    {slugReservationLoading ? "Reserving…" : "Start for free"}
                  </button>
                </form>
              )}
              {slugReservationError && (
                <p role="alert" className="px-4 text-sm text-red-300">{slugReservationError}</p>
              )}
            </div>

            {/* Bullet points */}
            <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-muted-foreground/80 sm:mb-10 sm:gap-x-4 sm:text-[15.5px]">
              <span className="flex items-center gap-1.5">
                <span className="text-accent">•</span> Free forever
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">•</span> No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">•</span> Profile link reserved at signup
              </span>
            </div>

            {/* Factual product proof — no invented ratings or customer identities. */}
            <div className="grid w-full max-w-xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border/50 bg-border/50">
              {[["01", "Smart routing"], ["02", "Profile analytics"], ["03", "Public API"]].map(([number, label]) => (
                <div key={number} className="bg-background/80 px-3 py-3.5 backdrop-blur-sm sm:px-4">
                  <span className="font-mono text-[10px] font-bold text-accent">{number}</span>
                  <p className="mt-1 text-[11px] font-semibold leading-tight text-foreground/80 sm:text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop-only product visual. Mobile keeps the primary action above the fold. */}
          <div className="relative hidden w-full justify-center lg:col-span-6 lg:flex lg:translate-y-[6%]">
            <div className="relative animate-float w-full max-w-none flex justify-center">
              <picture>
                <source srcSet="/mobila.webp" type="image/webp" />
                <img
                  src="/mobila.webp"
                  alt="Linktery mobile preview"
                  width="1200"
                  height="670"
                  className="transform rotate-3 scale-[1.75] lg:scale-[2.31] lg:translate-x-[17%] w-full h-auto select-none pointer-events-none origin-center z-10"
                  loading="eager"
                />
              </picture>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" ref={sectionRef} className="py-24 px-6 relative overflow-hidden group">
        {/* Features Video Background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.07] scale-110 group-hover:scale-100 transition-transform [transition-duration:3s] ease-out">
          <video
            ref={videoRef}
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/features.min.mp4" type="video/mp4" />
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
                <div key={plan.id} className={`relative group transition-all duration-500 hover:translate-y-[-10px] flex flex-col ${isPro ? "hover:scale-[1.03]" : ""}`}>
                  {/* Backdrop glowing background blurs */}
                  {isPro && (
                    <div className="absolute inset-0 bg-accent/10 rounded-[28px] blur-[30px] -z-10 group-hover:bg-accent/15 transition-all duration-500 pointer-events-none" />
                  )}
                  {isAgency && (
                    <div className="absolute inset-0 bg-cyan-500/5 rounded-[28px] blur-[30px] -z-10 group-hover:bg-cyan-500/10 transition-all duration-500 pointer-events-none" />
                  )}

                  <div className={`glass-card pt-10 px-8 pb-8 rounded-[28px] relative flex flex-col h-full bg-card/60 backdrop-blur-2xl border transition-all duration-500 ${isPro
                    ? "border-accent/40 shadow-glow hover:border-accent/60"
                    : isAgency
                      ? "border-cyan-500/20 shadow-cyan-glow hover:border-cyan-500/40"
                      : "border-white/5 hover:border-white/15"
                    }`}>

                    <div className="text-left mb-6">
                      <h3 className={`text-2xl font-extrabold mb-2 tracking-tight ${isPro ? "text-accent" : isAgency ? "text-cyan-400" : "text-foreground"
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
                          <span className={`w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm flex-shrink-0 transition-all duration-300 ${isPro ? "group-hover/feature:bg-accent/10 group-hover/feature:border-accent/30" : isAgency ? "group-hover/feature:bg-cyan-500/10 group-hover/feature:border-cyan-500/30" : "group-hover/feature:bg-white/10"
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

                    {showUser ? (
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
                          className={`w-full text-center py-3.5 rounded-xl font-bold transition-all duration-300 block text-sm transform active:scale-95 ${isPro
                            ? "btn-primary-glow"
                            : isAgency
                              ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-cyan-600 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
                              : "border border-border hover:bg-surface-hover text-foreground hover:border-white/20"
                            }`}
                        >
                          {plan.buttonText}
                        </Link>
                      )
                    ) : (
                      <Link
                        to="/register"
                        className={`w-full text-center py-3.5 rounded-xl font-bold transition-all duration-300 block text-sm transform active:scale-95 ${isPro
                          ? "btn-primary-glow"
                          : isAgency
                            ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-cyan-600 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
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
                    <div className="absolute -top-3.5 left-6 bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3.5 rounded-full flex items-center gap-1 shadow-lg shadow-cyan-500/20 animate-fade-in">
                      <Sparkles className="w-3.5 h-3.5 fill-current" /> Power User
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
      <Footer />
    </div>
  );
}
