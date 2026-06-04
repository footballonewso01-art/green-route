import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, Play, ShieldCheck, 
  HelpCircle, ExternalLink, RefreshCw, Smartphone, Award
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function LinkMeAlternative() {
  const { user } = useAuth();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Multi-Profile Simulator State
  const [activeProfile, setActiveProfile] = useState<"personal" | "store" | "newsletter">("personal");
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: string; duration: string }[]>([]);

  // Generate starry background on mount
  useEffect(() => {
    const generatedStars = Array.from({ length: 70 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 1.8 + 0.8, // 0.8px to 2.6px
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 4 + 2}s`,
    }));
    setStars(generatedStars);
  }, []);

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  const profiles = {
    personal: {
      name: "Alex Johnson (Personal)",
      handle: "@alex_creator",
      theme: "bg-slate-900 border-slate-800",
      accent: "bg-accent/15 border-accent/30 text-accent",
      domain: "alex.linktery.sh",
      links: [
        { title: "Watch my YouTube videos", icon: "📺", clicks: "4.2k" },
        { title: "Follow me on Instagram", icon: "📸", clicks: "2.8k" },
        { title: "Read my Daily Blog", icon: "✍️", clicks: "1.1k" }
      ]
    },
    store: {
      name: "Alex Store (Shopify)",
      handle: "@alex_merch",
      theme: "bg-emerald-950/80 border-emerald-900",
      accent: "bg-emerald-400/20 border-emerald-400/40 text-emerald-400",
      domain: "shop.alexbrand.com",
      links: [
        { title: "Shop Premium Headphones (20% Off)", icon: "🎧", clicks: "8.9k" },
        { title: "Buy Wireless Charger Pad", icon: "🔌", clicks: "5.4k" },
        { title: "Shopify Storefront Home", icon: "🛍️", clicks: "3.2k" }
      ]
    },
    newsletter: {
      name: "Alex Newsletter (Substack)",
      handle: "@alex_reads",
      theme: "bg-neutral-900 border-neutral-800",
      accent: "bg-amber-400/20 border-amber-400/40 text-amber-400",
      domain: "newsletter.alex.club",
      links: [
        { title: "Subscribe on Substack (Free)", icon: "✉️", clicks: "12.4k" },
        { title: "Read Latest Article #42", icon: "📄", clicks: "6.1k" },
        { title: "Join Patreon Community", icon: "🧡", clicks: "2.5k" }
      ]
    }
  };

  const faqItems: FaqItem[] = [
    {
      question: "Why is multi-profiling important for creators and agencies?",
      answer: "Most creators run multiple brands (e.g. a personal brand, an e-commerce shop, and a newsletter). Link.me restricts you to exactly one bio-link profile per account. To run separate pages, you are forced to register multiple accounts with different email addresses, log out and log in constantly, and pay separate premium fees. Linktery allows you to create and manage unlimited independent profiles (each with its own links, designs, and custom domains) from a single unified dashboard."
    },
    {
      question: "Can I connect different custom domains to each of my profiles?",
      answer: "Yes! Linktery is built for multi-brand management. You can assign a distinct custom domain or subdomain (e.g. link.myblog.com for Profile A, and shop.mybrand.com for Profile B) to each profile inside your dashboard completely independently."
    },
    {
      question: "How does Linktery compare to Link.me in terms of page load speed?",
      answer: "Link.me queries database servers dynamically on every user click, which creates rendering latency on mobile connections. Linktery compiles your profile pages into static HTML (SSG) in advance, serving pages globally from edge CDN locations in less than 150 milliseconds. This ensures zero bounce rate increases."
    },
    {
      question: "Does Linktery support tracking pixels for all profiles?",
      answer: "Absolutely. You can add separate Facebook Pixels, Google Analytics tags, and TikTok tracking IDs to each profile. All analytics are tracked independently, so data from your personal page doesn't pollute your Shopify store metrics."
    },
    {
      question: "Is there a limit to how many links I can add to each profile?",
      answer: "No. Linktery offers unlimited active links, social icons, and text separators on all plans, including our free Creator tier. We do not gate your content layout behind paywalls."
    }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Multi-Profile Bio Link Creator",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.92",
          "ratingCount": "214"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqItems.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      }
    ]
  };

  useSeo({
    ...SEO_PAGES.linkMeAlternative,
    structuredData
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Starry Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white opacity-30 animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
              animationDuration: star.duration,
              boxShadow: star.size > 2 ? "0 0 5px rgba(255, 255, 255, 0.7)" : "none",
            }}
          />
        ))}
      </div>

      {/* Decorative Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-20 right-1/4 w-[420px] h-[420px] bg-accent rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-20 left-1/4 w-[360px] h-[360px] bg-emerald-500 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3.5 hover:opacity-80 transition-opacity">
            <img src="/logo.webp" alt="Linktery Logo" className="h-[60px] w-auto mix-blend-screen" />
            <span className="text-[22px] font-extrabold text-foreground tracking-tight">Linktery</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>

            {user ? (
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Dashboard</span>
                <div className="w-8 h-8 rounded-full border border-accent/30 p-0.5 overflow-hidden group-hover:border-accent transition-colors">
                  {getAvatarUrl() ? (
                    <img src={getAvatarUrl()!} alt="User avatar" className="w-full h-full rounded-full object-cover" />
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

      {/* Hero Section */}
      <section className="relative pt-36 pb-16 px-6 overflow-hidden flex items-center justify-center min-h-[50vh]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-6 font-semibold">
            <Award className="w-4 h-4" />
            Designed for Multi-Brand Creators & Agencies
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight uppercase">
            The Link.me Alternative
            <br />
            <span className="gradient-text font-black">Built for Multi-Profiling</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Stop registering separate accounts or logging out to edit different brands. Manage unlimited bio-link profiles with independent custom domains from a single dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Create Free Accounts <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#simulator" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              Try Dashboard Simulator
            </a>
          </div>
        </div>
      </section>

      {/* INTERACTIVE MULTI-PROFILE DASHBOARD SIMULATOR */}
      <section id="simulator" className="py-12 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-border/60 pb-5 mb-8 gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block font-mono">WORKSPACE MANAGER</span>
              <h3 className="text-lg font-bold text-white uppercase">Multi-Profile Controller</h3>
            </div>
            
            {/* Active Profile Tabs */}
            <div className="flex flex-wrap gap-1 bg-background p-1 border border-border rounded-xl">
              {(Object.keys(profiles) as Array<keyof typeof profiles>).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveProfile(key)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${
                    activeProfile === key ? "bg-accent text-background font-black" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {key === "personal" ? "Personal" : key === "store" ? "Store / Shopify" : "Substack News"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Mobile Phone Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className={`w-[260px] h-[500px] border-8 border-slate-900 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col p-4 font-sans transition-all duration-300 ${profiles[activeProfile].theme}`}>
                
                {/* Speaker top bar */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-3 bg-slate-900 rounded-b-xl z-20 flex items-center justify-center" />

                {/* Profile Header */}
                <div className="text-center pt-6 space-y-2">
                  <div className="w-14 h-14 rounded-full bg-accent/20 border-2 border-accent/20 mx-auto flex items-center justify-center font-bold text-xl text-white">
                    {profiles[activeProfile].handle.charAt(1).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">{profiles[activeProfile].name}</h4>
                    <p className="text-[9px] text-slate-400 font-mono">{profiles[activeProfile].handle}</p>
                  </div>
                </div>

                {/* Profile Links */}
                <div className="flex-1 mt-6 space-y-3 overflow-y-auto">
                  {profiles[activeProfile].links.map((link, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex items-center gap-2.5 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                    >
                      <span className="text-sm">{link.icon}</span>
                      <span className="text-[10px] font-bold text-white leading-tight flex-1">{link.title}</span>
                      <span className="text-[8px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">{link.clicks}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Brand tag */}
                <div className="text-center text-[8px] text-slate-500 font-mono mt-4">
                  ⚡ powered by Linktery
                </div>

              </div>
            </div>

            {/* Right Column: Simulated Dashboard Admin Controls */}
            <div className="lg:col-span-7 flex flex-col justify-between text-left space-y-6">
              
              <div className="bg-slate-950 border border-slate-900 p-6 rounded-2xl flex-1 flex flex-col justify-between space-y-4">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-b border-slate-900 pb-2">
                    <span>🎛️ PORTAL CONTROLLER</span>
                    <span className="text-accent">CONNECTED</span>
                  </div>

                  <div className="space-y-3 font-mono text-[11px] text-slate-400">
                    <p>&gt; Workspace ID: <span className="text-white">ws_alex_brands_2026</span></p>
                    <p>&gt; Active Subdomain: <span className="text-accent">{profiles[activeProfile].domain}</span></p>
                    
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 mt-2">
                      <div className="flex justify-between text-[10px] font-bold text-white">
                        <span>Profile Integration Configuration</span>
                        <span className="text-emerald-400 font-mono">active</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                        <div>Pixel ID: <span className="text-white">fb_px_2091</span></div>
                        <div>UTM Source: <span className="text-white">ig_bio</span></div>
                        <div>Rotator: <span className="text-white">A/B Split ON</span></div>
                        <div>SSL: <span className="text-emerald-400">verified ✅</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Friction Alert Box */}
                <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase">The Link.me Single Profile Limit</h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                      Link.me registers only 1 profile per account. To run these 3 separate brands (Personal, Shopify Merch, and Substack), Link.me forces you to manage 3 distinct accounts with 3 subscription billing plans. Linktery handles them all under one dashboard.
                    </p>
                  </div>
                </div>

              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="btn-primary-glow text-xs !py-3 flex-1 flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Deploy My Workspace Now
                </Link>
                <a href="#matrix" className="px-5 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-surface-hover text-xs flex items-center justify-center transition-colors">
                  View Matrix Comparison
                </a>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* PROBLEM & SOLUTION DEEP DIVE */}
      <section className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Problem Block */}
          <div className="lg:col-span-5 flex flex-col justify-between p-8 rounded-3xl border border-red-950/60 bg-red-950/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl animate-pulse" />
            <div className="space-y-6">
              <div>
                <span className="text-red-400 text-xs font-bold uppercase tracking-widest font-mono block mb-2">The Real Problem</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">The Single-Profile Trap</h3>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                As a creator or marketer, you don't run just one project. You manage a personal brand, sell merchandise, host a newsletter, promote affiliates, and test new ideas.
              </p>

              <div className="space-y-4 pt-4 border-t border-red-950/40">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">1</div>
                  <p className="text-xs text-slate-300"><strong className="text-white">Account Overload:</strong> You have to register and remember separate email credentials for every single brand page.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">2</div>
                  <p className="text-xs text-slate-300"><strong className="text-white">Constant Logouts:</strong> Updating links on your shop page requires logging out of your personal bio-link page, logging in with shop credentials, making changes, and logging out again.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">3</div>
                  <p className="text-xs text-slate-300"><strong className="text-white">Stacked Expenses:</strong> Link.me charges premium subscriptions separately for every profile to use custom domains or A/B analytics.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-red-950/40 flex items-center gap-2 text-xs text-red-400 font-mono">
              <ShieldAlert className="w-4 h-4" /> Result: Friction, slower updates, and bloated monthly bills.
            </div>
          </div>

          {/* Solution Block */}
          <div className="lg:col-span-7 flex flex-col justify-between p-8 rounded-3xl border border-emerald-500/20 bg-emerald-950/5 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl animate-pulse" />
            <div className="space-y-6">
              <div>
                <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono block mb-2">Our Solution</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">The Multi-Brand Command Center</h3>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                Linktery provides a single unified workspace where all your brands, shops, and side projects coexist under one login, while keeping their public layouts, custom domains, and data completely separate.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-emerald-950/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Unified Console</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Build and control all your bio-links (personal vlogs, shops, portfolios) from one master account. Swap workspaces in 1 click.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Independent Domains</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Connect distinct custom domains (e.g. vlog.com for Profile A, shop.com for Profile B) without buying separate subscription plans.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Isolated Data & Pixels</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Add separate Facebook Pixels, TikTok tags, and Google Analytics to each brand profile. Data stays clean and unpolluted.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Ultra SSG Speed</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Profiles are pre-rendered into lightweight, static HTML files at edge CDN locations, loading globally in under 150ms.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-emerald-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <span className="text-xs text-slate-400 font-mono">Consolidate your brands into a single dashboard.</span>
              <Link to="/register" className="text-xs font-bold text-accent hover:text-white inline-flex items-center gap-1 transition-colors uppercase font-mono">
                Get started for free <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CORE BOTTLENECKS SECTION */}
      <section className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest block mb-2 font-mono">Platform Disruption</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 uppercase">Where Link.me Falls Short</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Why single-profile designs fall short for modern multi-channel creators and e-commerce portfolios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/30 hover:border-accent/30 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">1. Multiple Profile Limits</h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                Link.me is designed for single-purpose creators. If you expand your business into separate brands (e.g. clothing line, personal vlog, online course), you cannot manage them from one dashboard.
              </p>
            </div>
            <ul className="text-[10px] text-slate-400 space-y-2 pt-4 border-t border-border/40 font-mono mt-4">
              <li className="flex items-center gap-1.5 text-red-400">
                <X className="w-3.5 h-3.5 flex-shrink-0" /> Link.me: 1 profile per account login
              </li>
              <li className="flex items-center gap-1.5 text-green-400">
                <Check className="w-3.5 h-3.5 flex-shrink-0" /> Linktery: Multiple profiles per login
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/30 hover:border-accent/30 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">2. Locked Custom Domains</h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                Connecting independent custom domains to different profiles on Link.me requires separate premium plans for each domain. Linktery lets you bind separate domains to separate profiles inside the same plan.
              </p>
            </div>
            <ul className="text-[10px] text-slate-400 space-y-2 pt-4 border-t border-border/40 font-mono mt-4">
              <li className="flex items-center gap-1.5 text-red-400">
                <X className="w-3.5 h-3.5 flex-shrink-0" /> Link.me: Domain paywall per page
              </li>
              <li className="flex items-center gap-1.5 text-green-400">
                <Check className="w-3.5 h-3.5 flex-shrink-0" /> Linktery: Universal domain configuration
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/30 hover:border-accent/30 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">3. Page Loading Speeds</h3>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                Link.me queries remote databases on every click, creating rendering latency on 3G/4G connections. Linktery pre-renders your pages into static HTML (SSG) at edge nodes, loading pages instantly.
              </p>
            </div>
            <ul className="text-[10px] text-slate-400 space-y-2 pt-4 border-t border-border/40 font-mono mt-4">
              <li className="flex items-center gap-1.5 text-red-400">
                <X className="w-3.5 h-3.5 flex-shrink-0" /> Link.me LCP: 1200ms - 2500ms
              </li>
              <li className="flex items-center gap-1.5 text-green-400">
                <Check className="w-3.5 h-3.5 flex-shrink-0" /> Linktery LCP: &lt; 150ms
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* COMPARISON MATRIX */}
      <section id="matrix" className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">Comparison Matrix</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-2 mb-3">Feature-by-Feature Specs</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Compare account limits and multi-profiling features between Linktery and Link.me.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase font-mono">
                <th className="p-4 md:p-6">Feature Details</th>
                <th className="p-4 md:p-6 text-accent">Linktery</th>
                <th className="p-4 md:p-6">Link.me</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90 font-mono">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Multi-Profile Support</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Unlimited under one login)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Strictly 1 profile per account)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Page Load Speed (LCP)</td>
                <td className="p-4 md:p-6 text-green-400">✅ Instant &lt; 150ms (SSG)</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Slow 1.2s - 2.5s (CSR)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">App Opener / Deep Link</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Bypass social webviews)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Trapped in in-app webview)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Split Test Rotators</td>
                <td className="p-4 md:p-6 text-green-400">✅ Included (Split A/B links)</td>
                <td className="p-4 md:p-6 text-red-500">❌ Not Supported</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Independent Domains</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Link domains per profile)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Requires multiple subscriptions)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ACCORDION FAQ SECTION */}
      <section className="py-16 px-6 max-w-4xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">Q&A</span>
          <h2 className="text-3xl font-extrabold text-white mt-1 uppercase">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div 
              key={index}
              className="border border-border/60 bg-surface/20 rounded-2xl overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className="w-full py-5 px-6 flex justify-between items-center text-left text-white font-semibold hover:bg-surface/30 transition-colors gap-4"
              >
                <span className="text-sm md:text-base">{item.question}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${openFaqIndex === index ? "rotate-180" : ""}`} />
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  openFaqIndex === index ? "max-h-[300px] border-t border-border/40" : "max-h-0"
                }`}
              >
                <div className="p-6 text-sm text-slate-300 leading-relaxed bg-surface-hover/20">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto relative z-10 border-t border-border/50">
        <div className="relative glass-card p-8 md:p-12 rounded-3xl overflow-hidden border border-accent/20 bg-gradient-to-tr from-accent/10 via-background to-background text-center shadow-glow animate-pulse">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-accent rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 relative z-10">
            Unify Your Creator Brands
          </h2>
          <p className="text-base md:text-lg text-slate-300 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Stop switching logins. Build multiple public profiles, connect separate domains, and optimize your clicks with Linktery today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            )}
            <Link to="/pricing" className="px-6 py-4 rounded-xl border border-border text-foreground font-semibold hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              View Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center gap-[11px] hover:opacity-80 transition-opacity">
            <img src="/logo.webp" alt="Linktery Logo" className="h-12 w-auto mix-blend-screen grayscale" />
            <span className="text-xl font-bold text-foreground/80 tracking-tight translate-y-[1px]">Linktery</span>
          </Link>
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
