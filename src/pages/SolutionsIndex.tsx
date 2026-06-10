import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, Zap, Globe, Smartphone, RefreshCw, BarChart3, 
  ShoppingBag, Music, Play, Radio, Shield, Award, Sparkles, User
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import Footer from "@/components/Footer";

export default function SolutionsIndex() {
  const { user } = useAuth();
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: string; duration: string }[]>([]);

  useEffect(() => {
    const generatedStars = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 1.5 + 0.5,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 4 + 2}s`,
    }));
    setStars(generatedStars);
  }, []);

  useSeo({
    ...SEO_PAGES.solutionsIndex
  });

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  const coreTools = [
    {
      icon: Zap,
      title: "Deeplink Generator",
      desc: "Bypass sandboxed in-app browsers on Instagram/TikTok. Open Spotify, YouTube, or Amazon directly in their native apps.",
      path: "/solutions/deeplink-generator"
    },
    {
      icon: RefreshCw,
      title: "Smart Redirect Engine",
      desc: "Distribute clicks based on A/B weights, device type, or referral filters to maximize monetization metrics.",
      path: "/solutions/smart-link-redirect"
    },
    {
      icon: Globe,
      title: "Geo-Targeted Redirects",
      desc: "Detect visitor geolocation and browser language at the edge to route traffic to localized checkouts and shops.",
      path: "/solutions/geo-targeted-redirect"
    },
    {
      icon: BarChart3,
      title: "CPA Link Rotator",
      desc: "Split traffic by weights across affiliate links. Filter out bots and protect your ad account compliance.",
      path: "/solutions/affiliate-smart-link-rotator"
    },
    {
      icon: Smartphone,
      title: "Dynamic QR Codes",
      desc: "Generate smart QR codes for physical cards or retail that you can edit instantly without reprinting.",
      path: "/solutions/qr-code-biolink"
    }
  ];

  const creatorVerticals = [
    {
      icon: ShoppingBag,
      title: "E-commerce & Shopify",
      desc: "Route social traffic directly to mobile checkout apps preserving credit card auto-fills and Apple Pay sessions.",
      path: "/solutions/shopify-smart-links"
    },
    {
      icon: Music,
      title: "Music Smart Links",
      desc: "Direct listeners directly into Spotify or Apple Music native applications. Launch Album Pre-save campaigns.",
      path: "/solutions/music-smart-links"
    },
    {
      icon: Play,
      title: "YouTube & Telegram",
      desc: "Bypass in-app browser jails and route description links directly into native channels or apps.",
      path: "/solutions/telegram-bio-link"
    },
    {
      icon: Radio,
      title: "Podcast Smart Links",
      desc: "Route listeners directly into native Apple Podcasts or Spotify apps to double subscribe rates.",
      path: "/solutions/podcast-smart-links"
    },
    {
      icon: Shield,
      title: "OnlyFans & Fanvue",
      desc: "Redirection and link cloaking shields to protect creator profiles from social media shadowbans.",
      path: "/solutions/onlyfans-link-in-bio"
    }
  ];

  const professions = [
    { name: "Real Estate Agents", slug: "real-estate-agents", emoji: "🏢" },
    { name: "Fitness Coaches", slug: "fitness-coaches", emoji: "💪" },
    { name: "UGC Creators", slug: "ugc-creators", emoji: "🤳" },
    { name: "Gamers & Streamers", slug: "streamers", emoji: "🎮" },
    { name: "Photographers", slug: "photographers", emoji: "📸" },
    { name: "Authors & Writers", slug: "authors", emoji: "✍️" },
    { name: "Artists & Illustrators", slug: "artists", emoji: "🎨" },
    { name: "Beauty & Fashion", slug: "beauty-influencers", emoji: "💅" }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Starry Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white opacity-20 animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
              animationDuration: star.duration,
            }}
          />
        ))}
      </div>

      {/* Decorative gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-10 left-1/4 w-[400px] h-[400px] bg-accent rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-emerald-500 rounded-full blur-[100px] mix-blend-screen" />
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
                      <User className="w-4 h-4 text-accent" />
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
      <section className="relative pt-32 pb-12 px-6 flex items-center justify-center min-h-[40vh]">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Traffic Optimization & Routing Hub
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight uppercase">
            LINKTERY <span className="text-accent">SOLUTIONS</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            Explore advanced deep linking engines, custom domain redirection systems, and industry layouts built to maximize social conversions.
          </p>
        </div>
      </section>

      {/* 1. Core Routing Tools */}
      <section className="py-12 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-left mb-8 border-b border-border/40 pb-4">
          <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-accent" /> Core Redirection Engines
          </h2>
          <p className="text-xs text-muted-foreground">High-performance dynamic routing utilities for affiliate marketers and creators.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreTools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Link 
                key={index} 
                to={tool.path}
                className="glass-card p-6 border border-border bg-surface/25 backdrop-blur-md rounded-2xl flex flex-col justify-between hover:border-accent/40 group transition-all duration-300 text-left"
              >
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-background transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">{tool.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">{tool.desc}</p>
                </div>
                <div className="pt-6 flex justify-end">
                  <span className="text-xs font-bold text-accent group-hover:text-white flex items-center gap-1 font-mono uppercase">
                    Configure <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 2. Creator Solutions */}
      <section className="py-12 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-left mb-8 border-b border-border/40 pb-4">
          <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-accent" /> Creator & Brand Verticals
          </h2>
          <p className="text-xs text-muted-foreground">Redirection pages tailored for specific integrations to prevent in-app browser drop-offs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creatorVerticals.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Link 
                key={index} 
                to={tool.path}
                className="glass-card p-6 border border-border bg-surface/25 backdrop-blur-md rounded-2xl flex flex-col justify-between hover:border-accent/40 group transition-all duration-300 text-left"
              >
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-background transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">{tool.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">{tool.desc}</p>
                </div>
                <div className="pt-6 flex justify-end">
                  <span className="text-xs font-bold text-accent group-hover:text-white flex items-center gap-1 font-mono uppercase">
                    Learn More <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Industry Specific Biolinks */}
      <section className="py-12 px-6 max-w-6xl mx-auto z-10 relative mb-16">
        <div className="text-left mb-8 border-b border-border/40 pb-4">
          <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-accent" /> Link in Bio for Professions
          </h2>
          <p className="text-xs text-muted-foreground">Custom micro-landing page structures built to align with your business vertical.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {professions.map((prof, index) => (
            <Link 
              key={index} 
              to={`/solutions/link-in-bio-for-${prof.slug}`}
              className="glass-card p-4 border border-border/60 bg-surface/20 hover:border-accent/30 hover:bg-surface-hover/20 transition-all text-left flex items-center gap-3.5 rounded-xl group"
            >
              <span className="text-2xl">{prof.emoji}</span>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-accent transition-colors font-sans">{prof.name}</h3>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Setup Bio</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Reusable Footer */}
      <Footer />
    </div>
  );
}
