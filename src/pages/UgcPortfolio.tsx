import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, Play, ShieldCheck, 
  HelpCircle, ExternalLink, RefreshCw, Smartphone, Award,
  DollarSign, Clock, Users, Eye, Video
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function UgcPortfolio() {
  const { user } = useAuth();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Showcase state
  const [activeNiche, setActiveNiche] = useState<"beauty" | "tech" | "fitness">("beauty");
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: string; duration: string }[]>([]);

  // Calculator State
  const [videoCount, setVideoCount] = useState<number>(3);
  const [usageMonths, setUsageMonths] = useState<number>(3); // 0, 1, 3, 6, 12
  const [sparkAds, setSparkAds] = useState<boolean>(true);

  // Generate background stars on mount
  useEffect(() => {
    const generatedStars = Array.from({ length: 65 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 1.6 + 0.8,
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

  const niches = {
    beauty: {
      name: "Beauty & Skincare",
      tagline: "High-engagement cosmetic transitions & routines",
      videos: [
        { id: 1, title: "Morning Dewy Skincare Routine", thumbnail: "bg-gradient-to-br from-rose-500/20 to-orange-500/20", views: "84.3K", er: "6.4%", ctr: "3.4%", watchTime: "12.8s" },
        { id: 2, title: "Waterproof Mascara Rain Test", thumbnail: "bg-gradient-to-br from-pink-500/20 to-emerald-500/20", views: "142.1K", er: "8.2%", ctr: "4.8%", watchTime: "14.5s" },
        { id: 3, title: "Vanity Space Organization Hacks", thumbnail: "bg-gradient-to-br from-teal-500/20 to-rose-500/20", views: "62.5K", er: "5.9%", ctr: "2.9%", watchTime: "11.2s" }
      ]
    },
    tech: {
      name: "Tech & Gadgets",
      tagline: "Crisp macro closeups and desk setup ASMR",
      videos: [
        { id: 4, title: "Custom Mechanical Keyboard ASMR", thumbnail: "bg-gradient-to-br from-slate-700/30 to-blue-900/30", views: "210.4K", er: "9.2%", ctr: "5.2%", watchTime: "18.4s" },
        { id: 5, title: "Ultimate Minimal Desk Setup 2026", thumbnail: "bg-gradient-to-br from-neutral-800/30 to-zinc-900/30", views: "98.7K", er: "7.1%", ctr: "3.9%", watchTime: "15.1s" },
        { id: 6, title: "ANC Earbuds: Honest Review Vlog", thumbnail: "bg-gradient-to-br from-indigo-950/20 to-emerald-950/20", views: "128.5K", er: "7.8%", ctr: "4.5%", watchTime: "13.6s" }
      ]
    },
    fitness: {
      name: "Fitness & Lifestyle",
      tagline: "Energizing activewear aesthetics and nutrition prep",
      videos: [
        { id: 7, title: "Full Body Dumbbell Circuit", thumbnail: "bg-gradient-to-br from-amber-500/20 to-red-500/20", views: "75.1K", er: "5.8%", ctr: "3.1%", watchTime: "10.5s" },
        { id: 8, title: "Pre-Workout Green Smoothie Recipe", thumbnail: "bg-gradient-to-br from-emerald-500/20 to-teal-500/20", views: "51.8K", er: "4.9%", ctr: "2.6%", watchTime: "9.8s" },
        { id: 9, title: "Aesthetic Gym Wear Vlog", thumbnail: "bg-gradient-to-br from-cyan-500/20 to-blue-500/20", views: "115.3K", er: "6.7%", ctr: "4.2%", watchTime: "12.1s" }
      ]
    }
  };

  // Calculator Multipliers
  const baseRatePerVideo = 150; // $150 per video base
  const calculateTotalRate = () => {
    const base = videoCount * baseRatePerVideo;
    
    // Usage rights multiplier: 0m = 1x, 1m = 1.1x, 3m = 1.25x, 6m = 1.4x, 12m = 1.6x
    let usageMultiplier = 1;
    if (usageMonths === 1) usageMultiplier = 1.1;
    else if (usageMonths === 3) usageMultiplier = 1.25;
    else if (usageMonths === 6) usageMultiplier = 1.4;
    else if (usageMonths === 12) usageMultiplier = 1.6;

    let total = base * usageMultiplier;
    if (sparkAds) total += (base * 0.15); // Spark ads add +15%

    return Math.round(total);
  };

  const calculateProjectedViews = () => {
    const avgViews = activeNiche === "tech" ? 145000 : activeNiche === "beauty" ? 96000 : 80000;
    return Math.round(avgViews * videoCount).toLocaleString();
  };

  const calculateProjectedClicks = () => {
    const avgCtr = activeNiche === "tech" ? 0.047 : activeNiche === "beauty" ? 0.037 : 0.033;
    const views = activeNiche === "tech" ? 145000 : activeNiche === "beauty" ? 96000 : 80000;
    return Math.round(views * videoCount * avgCtr).toLocaleString();
  };

  const faqItems: FaqItem[] = [
    {
      question: "How do I host video content on my UGC portfolio without slowing it down?",
      answer: "Traditional web builders load heavy MP4 files directly, causing pages to freeze on mobile data. Linktery uses optimized lazy-loading and smart webview players for YouTube, TikTok, and Vimeo embeds, pre-rendering the page layout on the Edge CDN. Your portfolio will load in less than 150 milliseconds globally."
    },
    {
      question: "Can I host my rate cards and package prices dynamically?",
      answer: "Yes! Linktery has an interactive Rate Card module. Instead of sending rigid PDF attachments that get outdated, you can set your rates directly in your dashboard. You can toggle usage rights, bundle deals, and ad whitelisting options, allowing brands to customize orders."
    },
    {
      question: "Can I connect a custom domain like portfolio.myname.com?",
      answer: "Absolutely. Having a professional custom domain makes you stand out to brands. You can link your own subdomain or domain to your portfolio page on all premium plans."
    },
    {
      question: "Can I track which brands are clicking on my portfolio links?",
      answer: "Yes. With our built-in tracker integrations, you can add Facebook, TikTok, and Google Analytics pixels, plus configure UTM campaign parameters. When you pitch a brand via email, you'll know exactly when and where they clicked on your videos."
    },
    {
      question: "Is there a limit to how many videos I can showcase?",
      answer: "No. Linktery offers unlimited video showcase grids and links on all plans. You can organize your content into tabs by category (e.g. Unboxings, ASMR, Hooks, Testimonials) to give brands a structured experience."
    }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery UGC Portfolio Builder",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.95",
          "ratingCount": "186"
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
    ...SEO_PAGES.ugcPortfolio,
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

      {/* Ambient Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-20 left-1/4 w-[450px] h-[450px] bg-accent rounded-full blur-[130px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-20 right-1/4 w-[380px] h-[380px] bg-emerald-500 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* Navigation */}
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
            Empowering UGC Creators & Influencers
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight uppercase">
            Build a UGC Portfolio
            <br />
            <span className="gradient-text font-black">That Brands Can't Ignore</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Embed TikTok and Reels mockups, display video performance statistics, customize dynamic rate cards, and capture brand outreach clicks in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Create Free Portfolio <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#showcase" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              Try Interactive Showcase
            </a>
          </div>
        </div>
      </section>

      {/* INTERACTIVE UGC SHOWCASE SIMULATOR */}
      <section id="showcase" className="py-12 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-border/60 pb-5 mb-8 gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block font-mono">PORTFOLIO VIEWER</span>
              <h3 className="text-lg font-bold text-white uppercase">UGC Niche Showcase</h3>
            </div>
            
            {/* Active Niche Tabs */}
            <div className="flex flex-wrap gap-1 bg-background p-1 border border-border rounded-xl">
              {(Object.keys(niches) as Array<keyof typeof niches>).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveNiche(key);
                    setPlayingVideoId(null);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${
                    activeNiche === key ? "bg-accent text-background font-black" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {niches[key].name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Phone Mockup with Videos */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-[260px] h-[500px] border-8 border-slate-900 bg-neutral-950 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col p-4 font-sans">
                
                {/* Speaker top bar */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-3 bg-slate-900 rounded-b-xl z-20" />

                {/* Profile Header */}
                <div className="text-center pt-4 space-y-1">
                  <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/20 mx-auto flex items-center justify-center font-bold text-lg text-white">
                    U
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Alex (UGC Creator)</h4>
                    <p className="text-[8px] text-slate-400 font-mono">portfolio.linktery.sh/alex_ugc</p>
                  </div>
                </div>

                {/* Mock Video Grid */}
                <div className="flex-1 mt-4 space-y-2 overflow-y-auto pr-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-1">Video Clips</span>
                  {niches[activeNiche].videos.map((vid) => (
                    <div 
                      key={vid.id}
                      onClick={() => setPlayingVideoId(playingVideoId === vid.id ? null : vid.id)}
                      className={`p-2 rounded-xl border border-white/5 bg-white/5 cursor-pointer relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                        playingVideoId === vid.id ? "ring-2 ring-accent" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-14 rounded-lg shrink-0 flex items-center justify-center text-accent relative overflow-hidden ${vid.thumbnail}`}>
                          {playingVideoId === vid.id ? (
                            <span className="absolute inset-0 bg-background/80 flex items-center justify-center text-[10px] font-mono text-accent animate-pulse">PLAY</span>
                          ) : (
                            <Play className="w-4.5 h-4.5 opacity-60 fill-accent" />
                          )}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <h5 className="text-[9px] font-bold text-white truncate">{vid.title}</h5>
                          <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-mono mt-1">
                            <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {vid.views}</span>
                            <span className="text-emerald-400">ER: {vid.er}</span>
                          </div>
                        </div>
                      </div>

                      {/* Playing details drawer */}
                      {playingVideoId === vid.id && (
                        <div className="mt-2 pt-2 border-t border-white/10 text-[8px] text-slate-400 font-mono space-y-1 text-left">
                          <div className="flex justify-between"><span>Watch Time:</span><span className="text-white">{vid.watchTime}</span></div>
                          <div className="flex justify-between"><span>Click-Through Rate:</span><span className="text-accent font-bold">{vid.ctr}</span></div>
                          <div className="flex justify-between"><span>Audience Hook:</span><span className="text-white">Unboxing Transition</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-center text-[8px] text-slate-500 font-mono mt-3">
                  ⚡ powered by Linktery
                </div>

              </div>
            </div>

            {/* Right Column: Portal Details / Interactive Logs */}
            <div className="lg:col-span-7 flex flex-col justify-between text-left space-y-6">
              
              <div className="bg-slate-950 border border-slate-900 p-6 rounded-2xl flex-1 flex flex-col justify-between space-y-6">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-b border-slate-900 pb-2">
                    <span>🎛️ PORTFOLIO METRICS CONSOLE</span>
                    <span className="text-accent">SYNCHRONIZED</span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
                    <p>&gt; Active Niche: <span className="text-white">{niches[activeNiche].name}</span></p>
                    <p>&gt; Focus Area: <span className="text-slate-300">{niches[activeNiche].tagline}</span></p>
                  </div>
                  
                  {/* Dynamic Metrics Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-1">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Avg Views</span>
                      <p className="text-xs md:text-sm font-extrabold text-white">124.5K</p>
                    </div>
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-1">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Engagement</span>
                      <p className="text-xs md:text-sm font-extrabold text-accent">7.4%</p>
                    </div>
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-1">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Click Rate</span>
                      <p className="text-xs md:text-sm font-extrabold text-emerald-400">3.9%</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 mt-2">
                    <div className="flex justify-between text-[10px] font-bold text-white">
                      <span>Brand Delivery Specs</span>
                      <span className="text-emerald-400 font-mono">Active Rate Card</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] pt-1 text-slate-400">
                      <div>Raw Video Delivery: <span className="text-white">48 hours</span></div>
                      <div>Editing / Color grade: <span className="text-white">Included</span></div>
                      <div>Usage Rights: <span className="text-white">Commercial License</span></div>
                      <div>Revision Cycles: <span className="text-white">2 Rounds</span></div>
                    </div>
                  </div>
                </div>

                <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase">Speed & Conversion Advantage</h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                      Traditional site builders overload mobile connection latency with uncompressed video files. Linktery uses Edge-SSG caching, playing showcases dynamically in less than 150ms. Brands review your work instantly without friction.
                    </p>
                  </div>
                </div>

              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="btn-primary-glow text-xs !py-3 flex-1 flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Create My UGC Workspace
                </Link>
                <a href="#calculator" className="px-5 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-surface-hover text-xs flex items-center justify-center transition-colors">
                  Open Rate Card Calculator
                </a>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* DYNAMIC RATE CARD CALCULATOR */}
      <section id="calculator" className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono block mb-2">DYNAMIC PRICING</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 uppercase">UGC Rate Card Builder</h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Simulate your content packages, usage rights multipliers, and Spark Ads toggles to see immediate cost evaluations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Controls Panel */}
          <div className="lg:col-span-7 bg-surface/20 border border-border p-6 md:p-8 rounded-[24px] space-y-6 text-left">
            <h3 className="text-lg font-bold text-white uppercase font-mono border-b border-border/60 pb-3">Package Configuration</h3>
            
            {/* Slider 1: Video count */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-white">Number of Videos</label>
                <span className="text-accent font-bold font-mono">{videoCount} {videoCount === 1 ? "Video" : "Videos"}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={videoCount}
                onChange={(e) => setVideoCount(parseInt(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1 Video</span>
                <span>5 Videos</span>
                <span>10 Videos</span>
              </div>
            </div>

            {/* Slider 2: Usage Rights */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-white">Paid Media Usage Rights</label>
                <span className="text-accent font-bold font-mono">{usageMonths === 0 ? "Organic Only" : `${usageMonths} Months`}</span>
              </div>
              <div className="flex gap-2">
                {[0, 1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setUsageMonths(m)}
                    className={`flex-1 py-2 text-xs font-mono font-bold rounded-lg border transition-all ${
                      usageMonths === m ? "bg-accent border-accent text-background" : "border-border text-slate-400 hover:text-white"
                    }`}
                  >
                    {m === 0 ? "0m" : `${m}m`}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                *Paid media rights allow brands to use your face in TikTok Spark Ads or Instagram Whitelisted campaigns. Organic is free.
              </p>
            </div>

            {/* Switch: Spark Ads */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-900 rounded-xl">
              <div className="space-y-1">
                <span className="text-xs font-bold text-white uppercase font-mono block">Add Spark Ads / Whitelisting Support</span>
                <p className="text-[10px] text-slate-400 leading-relaxed">Boosts video distribution by whitelisting your creator account handle (+15%)</p>
              </div>
              <button
                onClick={() => setSparkAds(!sparkAds)}
                className={`w-12 h-6 rounded-full p-1 transition-all ${sparkAds ? "bg-accent" : "bg-border"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-background transition-all ${sparkAds ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>

          </div>

          {/* Result Panel */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 to-slate-900 border border-border p-6 md:p-8 rounded-[24px] flex flex-col justify-between text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-6">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block mb-1">TOTAL ESTIMATED QUOTE</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-white font-mono">${calculateTotalRate()}</span>
                  <span className="text-xs text-slate-400 font-mono">USD</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/60 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Projections based on:</span>
                  <span className="text-white">{niches[activeNiche].name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Projected Views:</span>
                  <span className="text-emerald-400 font-bold">~ {calculateProjectedViews()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Projected Clicks (CTR):</span>
                  <span className="text-accent font-bold">~ {calculateProjectedClicks()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rights Duration:</span>
                  <span className="text-white">{usageMonths === 0 ? "Organic Only" : `${usageMonths} Months`}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 mt-2 text-[10px] text-slate-400">
                <span className="font-bold text-white uppercase block">Deliverables Summary</span>
                <p>• {videoCount} {videoCount === 1 ? "UGC video clip" : "UGC video clips"} (9:16 high definition)</p>
                <p>• Built-in hook variations, custom voiceovers & scripting</p>
                {usageMonths > 0 && <p>• Active paid ad rights for {usageMonths} months</p>}
                {sparkAds && <p>• Spark Ads Whitelisting authorization code</p>}
              </div>
            </div>

            <div className="mt-8">
              <Link to="/register" className="btn-primary-glow w-full !py-3.5 text-xs flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> Save Pricing & Build Portfolio
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* CORE PROBLEM VS SOLUTION DEEP-DIVE */}
      <section className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Problem Block */}
          <div className="lg:col-span-5 flex flex-col justify-between p-8 rounded-3xl border border-red-950/60 bg-red-950/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl animate-pulse" />
            <div className="space-y-6">
              <div>
                <span className="text-red-400 text-xs font-bold uppercase tracking-widest font-mono block mb-2">The Real Problem</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">The Outdated PDF Pitch</h3>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                Sending brands heavy PDF rate cards or slow web pages to review your UGC videos results in lost opportunities and dropped deals.
              </p>

              <div className="space-y-4 pt-4 border-t border-red-950/40">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">1</div>
                  <p className="text-xs text-slate-300"><strong className="text-white">Static PDF Friction:</strong> PDF attachments are heavy, cannot play videos natively, and quickly get outdated when you update prices.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">2</div>
                  <p className="text-xs text-slate-300"><strong className="text-white">Zero Performance Data:</strong> Brands can't see dynamic engagement rates or click projections, leaving them guessing about conversion metrics.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">3</div>
                  <p className="text-xs text-slate-300"><strong className="text-white">Blind Email Pitching:</strong> You send pitches without knowing when or if the brand manager clicked on your video samples.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-red-950/40 flex items-center gap-2 text-xs text-red-400 font-mono">
              <ShieldAlert className="w-4 h-4" /> Result: Unanswered pitches, lower conversion rates, and lost sponsorships.
            </div>
          </div>

          {/* Solution Block */}
          <div className="lg:col-span-7 flex flex-col justify-between p-8 rounded-3xl border border-emerald-500/20 bg-emerald-950/5 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl animate-pulse" />
            <div className="space-y-6">
              <div>
                <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono block mb-2">Our Solution</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">The Interactive UGC Pitch Center</h3>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                Linktery converts your bio-link into a professional UGC portfolio featuring real-time video playbacks, dynamic price quote requests, and active pitch tracking.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-emerald-950/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Video className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Instant Showcase Grid</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Host and showcase all your TikTok, Reels, and YouTube Shorts clips natively. Let brands play videos directly on mobile in 1 click.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Dynamic Rate Cards</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Allow brands to toggle ad rights, video counts, and Whitelisting to get an immediate cost quote from your landing page.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Detailed Video Stats</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Provide real-time views, average watch times, and estimated click-through-rates (CTR) to prove conversion value.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Active Tracker Pixels</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Add Facebook, TikTok, and custom UTM parameters. Know exactly when brand managers open and play your video files.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-emerald-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <span className="text-xs text-slate-400 font-mono">Ready to elevate your outreach?</span>
              <Link to="/register" className="text-xs font-bold text-accent hover:text-white inline-flex items-center gap-1 transition-colors uppercase font-mono">
                Build My Free Portfolio <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON MATRIX */}
      <section className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">Comparison Matrix</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-2 mb-3">Feature Comparison</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            See how Linktery compares to traditional tools for building UGC portfolios.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase font-mono">
                <th className="p-4 md:p-6">Feature Details</th>
                <th className="p-4 md:p-6 text-accent">Linktery</th>
                <th className="p-4 md:p-6">Linktree</th>
                <th className="p-4 md:p-6">Bento.me</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90 font-mono">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Dynamic Rate Card Builder</td>
                <td className="p-4 md:p-6 text-green-400">✅ Included (Calculate package rates)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Static links only)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Static boxes only)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Native Video Playback Speed</td>
                <td className="p-4 md:p-6 text-green-400">✅ Ultra Fast &lt; 150ms (Edge CDN)</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Slow CSR loading</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Medium loading speeds</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Pixel Tracking & UTM Analytics</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Facebook, TikTok tags)</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Paywalled on Pro tier</td>
                <td className="p-4 md:p-6 text-red-500">❌ Basic stats only</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Custom Subdomain mapping</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Link personal domain)</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Paywalled</td>
                <td className="p-4 md:p-6 text-red-500">❌ Paywalled</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ SECTION */}
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

      {/* CTA Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto relative z-10 border-t border-border/50">
        <div className="relative glass-card p-8 md:p-12 rounded-3xl overflow-hidden border border-accent/20 bg-gradient-to-tr from-accent/10 via-background to-background text-center shadow-glow animate-pulse">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-accent rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 relative z-10">
            Land More UGC Contracts
          </h2>
          <p className="text-base md:text-lg text-slate-300 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Unify your rate cards, showcase high-quality video clips natively, and monitor brand pitching views with Linktery today.
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
      <Footer />
    </div>
  );
}
