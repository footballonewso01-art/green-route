import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, User, Award, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import competitorsData from "@/data/competitors.json";
import Footer from "@/components/Footer";

interface CompetitorPricing {
  free: string;
  pro: string;
  customDomains: string;
  watermarkRemoval: string;
  transactionFee: string;
}

interface Competitor {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  pricing: CompetitorPricing;
}

export default function AlternativesIndex() {
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
    ...SEO_PAGES.alternativesIndex
  });

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

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
            Biolink Comparisons Matrix
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight uppercase">
            LINK IN BIO <span className="text-accent">ALTERNATIVES</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            Compare side-by-side specs, pricing tiers, commission cuts, and custom domain options for 14 major competitor platforms vs Linktery.
          </p>
        </div>
      </section>

      {/* Directory Grid */}
      <section className="py-12 px-6 max-w-6xl mx-auto z-10 relative mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(competitorsData as Competitor[]).map((comp, index) => (
            <Link 
              key={index} 
              to={`/alternatives/${comp.slug}`}
              className="glass-card p-6 border border-border bg-surface/20 hover:border-accent/40 hover:bg-surface-hover/10 transition-all duration-300 rounded-2xl flex flex-col justify-between text-left group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-border flex items-center justify-center text-3xl">
                    {comp.emoji}
                  </div>
                  <div className="text-right text-[10px] font-mono uppercase text-slate-500 space-y-0.5">
                    <div>Free: <span className="text-white font-bold">{comp.pricing.free}</span></div>
                    <div>Pro: <span className="text-accent font-bold">{comp.pricing.pro}</span></div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight uppercase group-hover:text-accent transition-colors">
                  {comp.name} Alternative
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-sans font-medium line-clamp-3">
                  {comp.description}
                </p>
              </div>

              <div className="pt-6 border-t border-border/40 mt-6 flex justify-between items-center text-xs">
                <span className="text-[10px] text-red-400/90 font-mono flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> fees: {comp.pricing.transactionFee}
                </span>
                <span className="font-bold text-accent group-hover:text-white flex items-center gap-1 font-mono uppercase transition-colors">
                  Compare <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
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
