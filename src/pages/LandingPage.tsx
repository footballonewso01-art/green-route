import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Shield, Zap, Globe, MousePointer, ExternalLink, User as UserIcon, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { PlanType, PLAN_RANKS } from "@/lib/plans";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

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
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
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
    // Record pageview event anonymously
    try {
      const isTracked = sessionStorage.getItem("landing_viewed");
      if (!isTracked) {
        let deviceId = localStorage.getItem("device_id");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("device_id", deviceId);
        }
        
        pb.collection("analytics_events").create({
          event_name: "landing_pageview",
          metadata: { deviceId, path: "/" }
        }).catch(() => {});
        sessionStorage.setItem("landing_viewed", "true");
      }
    } catch(e) {
      // Ignored
    }

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
            <img src="/logo.webp" alt="Linktery" className="h-[60px] w-auto mix-blend-screen" />
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
            <source src="/mainvid.min.mp4" type="video/mp4" />
          </video>
          {/* Dark gradient overlay for smooth transition to next section */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center text-left">
          {/* Left Column: Content */}
          <div className="lg:col-span-6 flex flex-col items-start transform lg:translate-y-[2%]">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-7">
              <Zap className="w-3.5 h-3.5" />
              Traffic Management Platform
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-[70px] font-extrabold tracking-tight mb-7 leading-[1.15] text-foreground w-full">
              <span className="relative block overflow-hidden h-[1.15em] w-full">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={wordIndex}
                    initial={{ y: "150%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-150%", opacity: 0 }}
                    transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
                    className={`absolute inset-x-0 block whitespace-nowrap ${words[wordIndex].className}`}
                  >
                    {words[wordIndex].text}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="gradient-text block mt-1">Built to Convert.</span>
            </h1>
            
            <p className="text-base md:text-[20px] text-muted-foreground mb-8 max-w-xl leading-relaxed">
              Advanced link management with smart routing. Designed for creators, affiliates, and marketers.
            </p>
            
            <div className="flex flex-col items-start gap-4 mb-8 w-full max-w-md relative z-20">
              {user ? (
                <Link to="/dashboard" className="btn-primary-glow text-base sm:text-[20px] inline-flex items-center justify-center gap-2 px-10 py-4.5 rounded-xl font-bold">
                  Open Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (usernameInput.trim()) {
                      navigate(`/register?username=${usernameInput.trim().toLowerCase()}`);
                    }
                  }}
                  className="w-full flex items-center bg-surface/40 backdrop-blur-xl border border-border/60 hover:border-border/80 focus-within:border-accent/40 rounded-full p-1.5 transition-all duration-300 shadow-glow/5 focus-within:shadow-glow/15"
                >
                  <div className="flex items-center pl-1 pr-0 text-zinc-300 select-none font-medium text-[14.7px] sm:text-[16.6px] flex-shrink-0">
                    <img src="/logo.webp" alt="Logo" className="h-10 w-auto mix-blend-screen mr-1 flex-shrink-0" />
                    <span>linktery.com/</span>
                  </div>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 22))}
                    maxLength={22}
                    placeholder="yourname"
                    className="bg-transparent border-0 p-0 m-0 outline-none focus:ring-0 text-white placeholder:text-white/30 w-full min-w-0 py-2 pl-[1px] text-[14.7px] sm:text-[16.6px] pr-2"
                  />
                  <button
                    type="submit"
                    className="btn-primary-glow !rounded-full !py-2.5 !px-5 sm:!px-6 whitespace-nowrap text-sm font-bold active:scale-95 transition-transform"
                  >
                    Start for free
                  </button>
                </form>
              )}
            </div>

            {/* Bullet points */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15.5px] text-muted-foreground/80 mb-10 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="text-accent">•</span> Free forever
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">•</span> No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">•</span> 30 sec setup
              </span>
            </div>

            {/* Rating social proof widget */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-border/50 pt-9 w-full max-w-xl">
              {/* Overlapping avatars */}
              <div className="flex -space-x-3.5">
                <img
                  className="inline-block h-[44px] w-[44px] rounded-full ring-2 ring-background object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"
                  alt="User avatar 1"
                />
                <img
                  className="inline-block h-[44px] w-[44px] rounded-full ring-2 ring-background object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80"
                  alt="User avatar 2"
                />
                <img
                  className="inline-block h-[44px] w-[44px] rounded-full ring-2 ring-background object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80"
                  alt="User avatar 3"
                />
              </div>
              <div className="flex flex-col items-start justify-center">
                {/* 5 Stars */}
                <div className="flex items-center gap-0.5 text-amber-400 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-[19px] h-[19px] fill-current"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-[14px] md:text-[16px] text-muted-foreground font-medium text-left">
                  Trusted by 95K creators across 350 agencies
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Mobile Screenshot */}
          <div className="lg:col-span-6 flex justify-center relative w-full mt-10 lg:mt-0 transform lg:translate-y-[6%]">
            <div className="relative animate-float w-full max-w-none flex justify-center">
              <img
                src="/mobila.png"
                alt="Linktery mobile preview"
                className="transform rotate-3 scale-[1.75] lg:scale-[2.31] lg:translate-x-[17%] w-full h-auto select-none pointer-events-none origin-center z-10"
                loading="eager"
              />
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
            <img src="/logo.webp" alt="Linktery" className="h-12 w-auto mix-blend-screen grayscale" />
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
