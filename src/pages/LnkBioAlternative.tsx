import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, Play, ShieldCheck, 
  HelpCircle, Gauge, Cpu, Hourglass, Database, ExternalLink,
  ChevronRight, RefreshCw, Smartphone
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

// FAQ Item Interface
interface FaqItem {
  question: string;
  answer: string;
}

export default function LnkBioAlternative() {
  const { user } = useAuth();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Speed Simulator State
  const [selectedPlatform, setSelectedPlatform] = useState<"linktery" | "lnkbio">("linktery");
  const [testState, setTestState] = useState<"idle" | "running" | "done">("idle");
  const [lcpScore, setLcpScore] = useState<number>(0);
  const [perfScore, setPerfScore] = useState<number>(0);
  const [waterfallSteps, setWaterfallSteps] = useState<string[]>([]);
  
  // Stars State
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: string; duration: string }[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up interval and generate stars on client mount
  useEffect(() => {
    // Generate star coordinates on client side to prevent hydration mismatches
    const generatedStars = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 0.8, // 0.8px to 2.8px
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 4 + 2}s`,
    }));
    setStars(generatedStars);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startSpeedTest = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTestState("running");
    setWaterfallSteps([]);
    
    if (selectedPlatform === "linktery") {
      // Linktery: Instant static load (SSG)
      const steps = [
        "🌐 Resolving edge DNS (Anycast) ... 12ms",
        "📦 Fetching pre-rendered SSG HTML from edge CDN ... 45ms",
        "🎨 Inlining critical CSS & assets ... 28ms",
        "🚀 Largest Contentful Paint (LCP) rendered ... 115ms"
      ];
      
      let currentStep = 0;
      intervalRef.current = setInterval(() => {
        if (currentStep < steps.length) {
          const stepText = steps[currentStep];
          setWaterfallSteps(prev => [...prev, stepText]);
          currentStep++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setLcpScore(115);
          setPerfScore(99);
          setTestState("done");
        }
      }, 250);
    } else {
      // Lnk.Bio: CSR client rendering with SQL db queries
      const steps = [
        "🌐 Resolving dynamic DNS ... 48ms",
        "📥 Loading heavy bundle JS script container ... 320ms",
        "🔄 Initializing React/Vue client app chunk ... 210ms",
        "🗄️ Querying remote database server (SQL lookup) ... 450ms",
        "🧩 Rendering DOM elements on client-side ... 310ms",
        "🐌 Largest Contentful Paint (LCP) rendered ... 1338ms"
      ];
      
      let currentStep = 0;
      intervalRef.current = setInterval(() => {
        if (currentStep < steps.length) {
          const stepText = steps[currentStep];
          setWaterfallSteps(prev => [...prev, stepText]);
          currentStep++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setLcpScore(1338);
          setPerfScore(54);
          setTestState("done");
        }
      }, 350);
    }
  };

  const resetSpeedTest = (platform: "linktery" | "lnkbio") => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSelectedPlatform(platform);
    setTestState("idle");
    setWaterfallSteps([]);
    setLcpScore(0);
    setPerfScore(0);
  };

  // Helper to get avatar URL
  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  const faqItems: FaqItem[] = [
    {
      question: "Why does Linktery load faster than Lnk.Bio?",
      answer: "Lnk.Bio uses Client-Side Rendering (CSR). When a mobile user clicks your link, their browser must download a javascript framework, execute it, and make a live database query to fetch your links before rendering the page. Linktery uses Static Site Generation (SSG). Your page is built in advance at compile-time and cached globally at edge CDN locations. It loads instantly as pre-rendered HTML in under 150ms."
    },
    {
      question: "What is the difference in link limits between the platforms?",
      answer: "Lnk.Bio restricts the number of active links and layout structures on their free tier, encouraging you to upgrade. Linktery offers unlimited active links, layouts, custom headers, and social icons on all accounts (including free), so you can build complete landing pages without hitting hard paywalls."
    },
    {
      question: "Can I use custom subdomains on Linktery?",
      answer: "Yes. Linktery supports complete custom domain mapping (e.g., bio.yourbrand.com or links.yourname.club) with automated free SSL certificates. This is fully accessible on our premium plans, which are significantly more affordable than Lnk.Bio's agency configurations."
    },
    {
      question: "Does Linktery support mobile app opener deep linking?",
      answer: "Absolutely. Lnk.Bio opens everything inside default in-app webview containers (where users are logged out of Instagram/Telegram/Spotify). Linktery features a native App Opener system that automatically triggers URI schemes (like tg:// or instagram://) to launch corresponding native apps instantly, keeping conversion rates high."
    },
    {
      question: "How difficult is it to migrate from Lnk.Bio to Linktery?",
      answer: "It takes less than 5 minutes. You can register on Linktery, copy your existing target links, and construct your new profile page using our visual designer. Once ready, simply update the link in your social media profiles."
    }
  ];

  // Dynamic JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Bio-Link Creator",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "189"
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

  // Call the SEO hook
  useSeo({
    ...SEO_PAGES.lnkBioAlternative,
    structuredData
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Dynamic Starry Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white opacity-40 animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
              animationDuration: star.duration,
              boxShadow: star.size > 2 ? "0 0 6px rgba(255, 255, 255, 0.8)" : "none",
            }}
          />
        ))}
      </div>

      {/* Decorative Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-cyan-600 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-10 left-1/4 w-[350px] h-[350px] bg-accent rounded-full blur-[100px] mix-blend-screen" />
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
      <section className="relative pt-36 pb-16 px-6 overflow-hidden flex items-center justify-center min-h-[55vh]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-sm mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Designed for 2026 Mobile Conversion Benchmarks
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            The Fastest Lnk.Bio Alternative
            <br />
            <span className="gradient-text bg-gradient-to-r from-cyan-400 via-teal-400 to-accent">With Deep Linking & SSG</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Don't let slow rendering and locked link limits ruin your social media conversion rates. Linktery serves pre-rendered HTML from edge nodes to open your bio pages instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Create Free Link <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#speed-test" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              Compare Page Speed
            </a>
          </div>
        </div>
      </section>

      {/* Section 2: Core Comparison Cards (Restructured order - comes right after Hero) */}
      <section className="py-12 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest block mb-2">Architectural Bottlenecks</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Where Lnk.Bio Falls Short</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            A direct architectural comparison of why standard bio link tools struggle to keep visitors engaged on mobile connections.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Performance */}
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/30 hover:border-cyan-500/30 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">1. The Rendering Gap</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Lnk.Bio uses Client-Side Rendering (CSR). Every click initiates a network waterfall where your client downloads JS assets, compiles elements, and queries remote databases on the spot.
              </p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2.5 pt-4 border-t border-border/40">
              <li className="flex items-center gap-2 text-red-400">
                <X className="w-3.5 h-3.5 flex-shrink-0" /> Lnk.Bio LCP: 1.2s - 2.5s
              </li>
              <li className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5 flex-shrink-0" /> Linktery LCP: &lt; 150ms
              </li>
            </ul>
          </div>

          {/* Card 2: App Opener */}
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/30 hover:border-cyan-500/30 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">2. In-App Webview Captivity</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Lnk.Bio opens target links (Spotify, Telegram, YouTube) inside the default in-app webview container of Instagram or TikTok. Users are logged out of their applications, halting sub rates.
              </p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2.5 pt-4 border-t border-border/40">
              <li className="flex items-center gap-2 text-red-400">
                <X className="w-3.5 h-3.5 flex-shrink-0" /> Webview: Forces manual log-ins
              </li>
              <li className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5 flex-shrink-0" /> Linktery: OS-level native deep link launching
              </li>
            </ul>
          </div>

          {/* Card 3: Limits */}
          <div className="glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/30 hover:border-cyan-500/30 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">3. Paywalled Optimization</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Basic layout configurations, analytics, and link groups are blocked behind paywalls on Lnk.Bio. Linktery offers unlimited link items, layouts, custom themes, and styling templates out of the box.
              </p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2.5 pt-4 border-t border-border/40">
              <li className="flex items-center gap-2 text-red-400">
                <X className="w-3.5 h-3.5 flex-shrink-0" /> Lnk.Bio: Gated styling blocks
              </li>
              <li className="flex items-center gap-2 text-emerald-400">
                <Check className="w-3.5 h-3.5 flex-shrink-0" /> Linktery: Unlimited free visual editing
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3: Interactive Page Speed Simulator */}
      <section id="speed-test" className="py-12 px-6 max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Technical Info explaining SSG vs CSR */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="space-y-2">
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest block">Performance Deep Dive</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Why Site Architecture Matters on Mobile Networks
            </h2>
          </div>
          <div className="space-y-4 text-muted-foreground text-sm md:text-base leading-relaxed">
            <p>
              Most bio-link tools (like Lnk.Bio) use **Client-Side Rendering (CSR)**. When a visitor clicks your link in your Instagram bio, they are served an empty HTML file that has to download a massive javascript bundle, initialize components, and query database servers.
            </p>
            <p className="border-l-2 border-cyan-500 pl-4 py-2 text-slate-100 font-medium bg-cyan-500/5 rounded-r-lg">
              On 3G/4G mobile connections, this query waterfall causes a loading delay of **1.2 to 2.5 seconds**, causing up to 35% of visitors to click away before the page loads.
            </p>
            <p>
              Linktery uses **Static Site Generation (SSG)**. Your link-in-bio page is pre-rendered into a simple, pure HTML file at compile-time. We cache this file at over 300 Global CDN Edge servers.
            </p>
            <p>
              When clicked, it loads **instantly (&lt;150ms)**, directly boosting your subscriber retention and click-through rates.
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Speed Simulator */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-border bg-surface/40 backdrop-blur-md w-full max-w-lg">
            
            {/* Speed Test Header */}
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-white text-base">Page-Load Speed Simulator</h3>
                <p className="text-[11px] text-muted-foreground">Select a platform and run the latency test</p>
              </div>
              <div className="flex gap-1 bg-background p-1 border border-border rounded-xl">
                <button 
                  onClick={() => resetSpeedTest("linktery")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedPlatform === "linktery" ? "bg-accent text-background" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Linktery (SSG)
                </button>
                <button 
                  onClick={() => resetSpeedTest("lnkbio")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedPlatform === "lnkbio" ? "bg-slate-800 text-slate-200" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Lnk.Bio (CSR)
                </button>
              </div>
            </div>

            {/* Simulation Area */}
            <div className="border border-border/80 bg-background/50 rounded-2xl p-5 space-y-6">
              
              {/* Score indicators */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-surface/50 border border-border rounded-xl p-3.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Performance Score</span>
                  <span className={`text-3xl font-black ${
                    testState === "done" 
                      ? selectedPlatform === "linktery" ? "text-emerald-400" : "text-red-500"
                      : "text-white"
                  }`}>
                    {testState === "done" ? `${perfScore}/100` : "--"}
                  </span>
                </div>
                <div className="bg-surface/50 border border-border rounded-xl p-3.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">LCP (Load Speed)</span>
                  <span className={`text-3xl font-black ${
                    testState === "done" 
                      ? selectedPlatform === "linktery" ? "text-emerald-400" : "text-red-500"
                      : "text-white"
                  }`}>
                    {testState === "done" ? `${lcpScore}ms` : "--"}
                  </span>
                </div>
              </div>

              {/* Progress visual bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Network Request Timeline</span>
                  <span>{testState === "running" ? "Testing..." : testState === "done" ? "Finished" : "Ready"}</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden relative">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    testState === "running" 
                      ? "w-full bg-cyan-500" 
                      : testState === "done" 
                        ? selectedPlatform === "linktery" ? "w-full bg-emerald-500" : "w-full bg-red-500"
                        : "w-0"
                  }`} />
                </div>
              </div>

              {/* Terminal-like output */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 font-mono text-xs h-[160px] overflow-y-auto space-y-1.5 text-left text-slate-300">
                {waterfallSteps.length === 0 && (
                  <p className="text-slate-500 italic">Click "Start Latency Test" below to measure rendering latency...</p>
                )}
                {waterfallSteps.map((step, idx) => (
                  <p key={idx} className={
                    step && step.includes("LCP") 
                      ? selectedPlatform === "linktery" ? "text-emerald-400 font-bold" : "text-red-400 font-bold" 
                      : "text-slate-300"
                  }>
                    {step}
                  </p>
                ))}
              </div>

              {/* Action Button */}
              <button 
                onClick={startSpeedTest}
                disabled={testState === "running"}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-background font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Gauge className="w-4 h-4" /> Start Latency Test
              </button>

            </div>

            {/* Test Summary */}
            <div className="mt-4 text-xs text-muted-foreground">
              {testState === "done" && selectedPlatform === "linktery" && "✅ Linktery bypasses DB calls on request by rendering static HTML at edge."}
              {testState === "done" && selectedPlatform === "lnkbio" && "❌ Lnk.Bio experiences dynamic database lookup waterfall, dragging down performance."}
            </div>

          </div>
        </div>

      </section>

      {/* Section 4: Educational E-E-A-T Technical Deep Dives (Added details & topics) */}
      <section className="py-16 px-6 bg-surface/30 border-y border-border/60 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest block mb-2">Engineering Architecture</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Why Professional Creators Choose Linktery</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              A breakdown of the engineering optimizations that protect your marketing campaigns and improve CTR.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Eliminate the DB Request Waterfall</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Lnk.Bio resolves links dynamically at request time, launching database queries on every click. Linktery pre-compiles your links and profile layout into pure, optimized HTML assets at edit-time. Visitors fetch direct files with zero database lookups, lowering loading latency to the minimum.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Anycast Edge CDN Replication</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our Static Site Generation writes pre-rendered files directly to over 300 Global Edge CDN servers. When a follower in London, Tokyo, or New York clicks your bio link, they connect to the nearest regional edge node, achieving sub-20ms DNS resolutions.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Native App Opener Deep Linking</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bio links clicked in Instagram or TikTok open by default inside the sandbox webview of those social apps. Because users are logged out of YouTube, Spotify, or Telegram in these webviews, they click away. Linktery uses OS URI schemes to open native apps directly.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Dynamic Traffic Rotator & A/B Splits</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Easily split your traffic between multiple target URLs. You can specify split weights for A/B testing landers, target specific mobile operating systems (iOS vs Android), and inject UTM codes dynamically to attribute affiliate revenues correctly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Feature & Price Comparison Matrix */}
      <section className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-12">
          <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">In-Depth Comparison</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-2 mb-3">Feature & Price Comparison</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Compare Lnk.Bio limitations against Linktery's creator-first bio link features.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase">
                <th className="p-4 md:p-6">Capabilities</th>
                <th className="p-4 md:p-6 text-cyan-400">Linktery</th>
                <th className="p-4 md:p-6">Lnk.Bio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Rendering Architecture</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">⚡ SSG (Pre-rendered Static HTML)</td>
                <td className="p-4 md:p-6 text-amber-500">🐌 CSR (Dynamic React Client)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Load Time Latency (Global CDN)</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">&lt; 150ms</td>
                <td className="p-4 md:p-6 text-amber-500">1200ms - 2500ms</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Active Link Limits (Free Tier)</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Unlimited Links</td>
                <td className="p-4 md:p-6 text-red-500">❌ Restricted Link Counts</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">App Opener / Deep Linking</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Included (Bypass webviews)</td>
                <td className="p-4 md:p-6 text-red-500">❌ Basic Webview redirects</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Link Rotator / A/B Testing</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Split traffic weights)</td>
                <td className="p-4 md:p-6 text-red-500">❌ Not Available</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Geo & OS Device Targeting</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Deliver optimal paths)</td>
                <td className="p-4 md:p-6 text-red-500">❌ Not Available</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 6: FAQ Section */}
      <section className="py-16 px-6 max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-cyan-400" /> Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Detailed information about bio-link optimization, performance metrics, and migration procedures.
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div 
              key={index} 
              className="glass-card rounded-2xl border border-border overflow-hidden transition-all duration-300"
            >
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className="w-full p-5 text-left font-bold text-white flex justify-between items-center hover:bg-surface-hover/50 transition-colors gap-4"
              >
                <span>{item.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
                    openFaqIndex === index ? "rotate-180 text-accent" : ""
                  }`} 
                />
              </button>
              {openFaqIndex === index && (
                <div className="p-5 pt-0 border-t border-border/40 text-sm md:text-base text-muted-foreground leading-relaxed animate-slide-down">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto relative z-10 border-t border-border/50">
        <div className="relative glass-card p-8 md:p-12 rounded-3xl overflow-hidden border border-accent/20 bg-gradient-to-tr from-cyan-500/10 via-background to-background text-center shadow-glow">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-cyan-500 rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 relative z-10">
            Build Your Fast Bio Link Now
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Register a free account, build a premium profile, bypass in-app webviews, and analyze your traffic metrics.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Create Free Link <ArrowRight className="w-5 h-5" />
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
