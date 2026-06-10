import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Link, useParams, Navigate } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, Play, ShieldCheck, 
  HelpCircle, ExternalLink, RefreshCw, Smartphone, Award
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import professionsData from "@/data/professions.json";

interface MockLink {
  title: string;
  icon: string;
  clicks: string;
}

interface MockStat {
  label: string;
  value: string;
}

interface MockFaq {
  question: string;
  answer: string;
}

interface ProfessionConfig {
  slug: string;
  name: string;
  headline: string;
  subheadline: string;
  cta: string;
  theme: string;
  accent: string;
  avatar: string;
  handle: string;
  links: MockLink[];
  stats: MockStat[];
  problemTitle: string;
  problemDesc: string;
  solutionTitle: string;
  solutionDesc: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  faqs: MockFaq[];
  seoTitle: string;
  seoDescription: string;
}

export default function ProfessionSolutions() {
  const { professionSlug } = useParams<{ professionSlug: string }>();
  const { user } = useAuth();

  // Find configuration for the current slug
  const config = (professionsData as ProfessionConfig[]).find(
    (item) => item.slug === professionSlug
  );

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: string; duration: string }[]>([]);
  const [activeLinkIndex, setActiveLinkIndex] = useState<number | null>(null);

  // Generate starry background on mount
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
  }, [professionSlug]);

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  // Structured schemas
  const structuredData = config ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": `Linktery Bio Link for ${config.name}`,
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
          "ratingCount": "128"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": config.faqs.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      }
    ]
  } : undefined;

  // Register SEO configuration dynamically
  useSeo({
    title: config?.seoTitle || "Link in Bio | Linktery",
    description: config?.seoDescription || "",
    canonical: config ? `/solutions/link-in-bio-for-${config.slug}` : "",
    structuredData
  });

  // If slug is not in database, redirect to 404
  if (!config) {
    return <Navigate to="/404" replace />;
  }

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
        <div className="absolute top-20 left-1/4 w-[450px] h-[450px] bg-accent rounded-full blur-[130px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-20 right-1/4 w-[380px] h-[380px] bg-emerald-500 rounded-full blur-[100px] mix-blend-screen" />
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
            Tailored Solutions for {config.name}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight uppercase">
            {config.headline}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            {config.subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                {config.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#simulator" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              Try Work previewer
            </a>
          </div>
        </div>
      </section>

      {/* INTERACTIVE WORKSPACE PREVIEWER */}
      <section id="simulator" className="py-12 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-border/60 pb-5 mb-8 gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block font-mono">PORTAL SIMULATOR</span>
              <h3 className="text-lg font-bold text-white uppercase">{config.name} Workspace</h3>
            </div>
            
            <div className="text-xs text-slate-400 font-mono">
              Live Mockup Preview
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Phone Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className={`w-[260px] h-[500px] border-8 border-slate-900 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col p-4 font-sans transition-all duration-300 ${config.theme}`}>
                
                {/* Speaker top bar */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-3 bg-slate-900 rounded-b-xl z-20" />

                {/* Profile Header */}
                <div className="text-center pt-6 space-y-2">
                  <div className="w-14 h-14 rounded-full bg-accent/20 border-2 border-accent/20 mx-auto flex items-center justify-center font-bold text-xl text-white">
                    {config.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">{config.name} Profile</h4>
                    <p className="text-[9px] text-slate-400 font-mono">{config.handle}</p>
                  </div>
                </div>

                {/* Profile Links */}
                <div className="flex-1 mt-6 space-y-3 overflow-y-auto pr-1">
                  {config.links.map((link, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setActiveLinkIndex(activeLinkIndex === idx ? null : idx)}
                      className="p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex items-center gap-2.5 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer text-left"
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

            {/* Right Column: Console Details */}
            <div className="lg:col-span-7 flex flex-col justify-between text-left space-y-6">
              
              <div className="bg-slate-950 border border-slate-900 p-6 rounded-2xl flex-1 flex flex-col justify-between space-y-4">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-b border-slate-900 pb-2">
                    <span>🎛️ PORTAL CONTROLLER</span>
                    <span className="text-accent">CONNECTED</span>
                  </div>

                  <div className="space-y-3 font-mono text-[11px] text-slate-400">
                    <p>&gt; Profile Type: <span className="text-white">{config.name}</span></p>
                    <p>&gt; Custom handle: <span className="text-accent">{config.handle}</span></p>
                    
                    {/* Dynamic Metrics Cards */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {config.stats.map((stat, idx) => (
                        <div key={idx} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono block">{stat.label}</span>
                          <p className="text-xs md:text-sm font-extrabold text-white">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 mt-2">
                      <div className="flex justify-between text-[10px] font-bold text-white">
                        <span>Profile Integration Configuration</span>
                        <span className="text-emerald-400 font-mono">active</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                        <div>Pixel ID: <span className="text-white">fb_px_2091</span></div>
                        <div>UTM Source: <span className="text-white">bio_link</span></div>
                        <div>Rotator: <span className="text-white">A/B Split ON</span></div>
                        <div>SSL: <span className="text-emerald-400">verified ✅</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info alert box */}
                <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-white uppercase">Dynamic routing speed advantage</h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                      Linktery compiles your profile into statically pre-rendered (SSG) files, loading pages globally in under 150ms. Visitors review your links instantly without checkout checkout drops or connection delays.
                    </p>
                  </div>
                </div>

              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="btn-primary-glow text-xs !py-3 flex-1 flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Start My {config.name} Workspace
                </Link>
                <a href="#problem" className="px-5 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-surface-hover text-xs flex items-center justify-center transition-colors">
                  Read Solutions Specs
                </a>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* CORE PROBLEM VS SOLUTION DEEP-DIVE */}
      <section id="problem" className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Problem Block */}
          <div className="lg:col-span-5 flex flex-col justify-between p-8 rounded-3xl border border-red-950/60 bg-red-950/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl animate-pulse" />
            <div className="space-y-6">
              <div>
                <span className="text-red-400 text-xs font-bold uppercase tracking-widest font-mono block mb-2">The Real Problem</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{config.problemTitle}</h3>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                {config.problemDesc}
              </p>

              <div className="space-y-4 pt-4 border-t border-red-950/40 font-sans text-xs text-slate-300">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">1</div>
                  <p>{config.bullet1}</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">2</div>
                  <p>{config.bullet2}</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">3</div>
                  <p>{config.bullet3}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-red-950/40 flex items-center gap-2 text-xs text-red-400 font-mono">
              <ShieldAlert className="w-4 h-4" /> Result: Lost client conversions, platform bans, or bloated subscription bills.
            </div>
          </div>

          {/* Solution Block */}
          <div className="lg:col-span-7 flex flex-col justify-between p-8 rounded-3xl border border-emerald-500/20 bg-emerald-950/5 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl animate-pulse" />
            <div className="space-y-6">
              <div>
                <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono block mb-2">Our Solution</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{config.solutionTitle}</h3>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                {config.solutionDesc}
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
                    Build and control all your bio-links (personal pages, storefronts, portfolios) from one master account. Swap workspaces in 1 click.
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
              <span className="text-xs text-slate-400 font-mono">Ready to consolidate your profiles?</span>
              <Link to="/register" className="text-xs font-bold text-accent hover:text-white inline-flex items-center gap-1 transition-colors uppercase font-mono">
                Get started for free <ArrowRight className="w-3 h-3" />
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
            Compare dynamic bio link capabilities between Linktery and other standard tools.
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
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Multi-Profile Dashboard Management</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Unlimited under one login)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Forced separate accounts)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Single profile page only)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Page Load Speed (LCP)</td>
                <td className="p-4 md:p-6 text-green-400">✅ Instant &lt; 150ms (SSG)</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Slow LCP delays (CSR)</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Medium loading speeds</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Pixel Tracking & UTM Analytics</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Facebook, TikTok, Google tags)</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Paywalled on Pro tier</td>
                <td className="p-4 md:p-6 text-red-500">❌ Basic stats only</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Independent Subdomains mapping</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Link personal domain per profile)</td>
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
          {config.faqs.map((item, index) => (
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
            Unify Your Digital Presence
          </h2>
          <p className="text-base md:text-lg text-slate-300 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Consolidate your workspaces, connect independent custom domains, and monitor tracking analytics in real-time with Linktery.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                {config.cta} <ArrowRight className="w-5 h-5" />
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
