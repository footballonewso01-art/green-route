import { useState, useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, Compass, Award, AlertTriangle, HelpCircle,
  Play, ShoppingBag, Target, HeartCrack, ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import competitorsData from "@/data/competitors.json";
import Footer from "@/components/Footer";

interface CompetitorPricing {
  free: string;
  pro: string;
  customDomains: string;
  watermarkRemoval: string;
  transactionFee: string;
}

interface CompetitorFeatures {
  deepLinking: string;
  geotargeting: string;
  analytics: string;
  customDomains: string;
}

interface Competitor {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  pricing: CompetitorPricing;
  features: CompetitorFeatures;
  pros: string[];
  cons: string[];
  faqAnswer: string;
  alternativeSeoTitle: string;
  alternativeSeoDescription: string;
}

export default function CompetitorAlternative() {
  const { competitorSlug } = useParams<{ competitorSlug: string }>();
  const { user } = useAuth();

  // Find competitor from JSON data
  const competitor = (competitorsData as Competitor[]).find(
    (item) => item.slug === competitorSlug
  );

  const isValid = !!competitor;

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Case Study Tabs State
  const [activeTab, setActiveTab] = useState<"musician" | "ecommerce" | "mediabuyer">("musician");
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: string; duration: string }[]>([]);

  // Generate background stars
  useEffect(() => {
    const generatedStars = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 1.5 + 0.5,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 4 + 2}s`,
    }));
    setStars(generatedStars);
  }, [competitorSlug]);

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  // Build a dynamic alternative reference tool for the table comparison
  // (Pick the first competitor from the database that is not the current one)
  const fallbackCompetitor = (competitorsData as Competitor[]).find(
    (item) => item.slug !== competitorSlug
  ) || competitorsData[0];

  const faqItems = competitor ? [
    {
      question: `Which link-in-bio tool has the best free plan compared to ${competitor.name}?`,
      answer: `Linktery offers a highly competitive free Creator plan featuring full profile customization, A/B split weights, and 0% transaction fees. ${competitor.name} restricts customization or limits key features under their free tier, whereas Linktery keeps core styling features unlocked.`
    },
    {
      question: `How do I bypass the Instagram and TikTok in-app browser jail with a ${competitor.name} alternative?`,
      answer: `When users click links inside Instagram or TikTok bios, they open in sandboxed in-app browsers, where visitors are logged out of native accounts (like Spotify, YouTube, or Amazon). Linktery bypasses this by using optimized deep-linking protocols that force the visitor's device to launch the native app directly, which is not supported natively by ${competitor.name}.`
    },
    {
      question: `Can I connect my own custom domain to a bio link profile?`,
      answer: `Yes. Linktery supports mapping custom subdomains or root domains on the Agency plan ($29/mo), enabling you to host separate client profiles under different domains. ${competitor.name} custom domain price: ${competitor.pricing.customDomains}.`
    },
    {
      question: `Does Linktery charge commission fees on digital store sales?`,
      answer: `No. Unlike some platforms (such as Beacons which takes a 9% cut on free plans), Linktery does not act as a payment gateway. We route visitors directly to your external checkouts (Shopify, Stripe, Gumroad) with zero platform transaction fees on all subscription tiers.`
    }
  ] : [];

  // Dynamic JSON-LD Structured Data
  const structuredData = isValid ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery",
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
  } : undefined;

  // Register SEO configuration dynamically (Rules of Hooks compliant: called unconditionally)
  useSeo({
    title: isValid ? competitor.alternativeSeoTitle : "Best Link-in-Bio Alternatives | Linktery",
    description: isValid ? competitor.alternativeSeoDescription : "Compare link-in-bio alternatives.",
    canonical: isValid ? `/alternatives/${competitor.slug}` : "",
    structuredData
  });

  // Redirect if competitor slug is not in database
  if (!isValid) {
    return <Navigate to="/404" replace />;
  }

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
        <div className="absolute top-10 left-1/4 w-[400px] h-[400px] bg-accent rounded-full blur-[120px] mix-blend-screen animate-pulse" />
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
      <section className="relative pt-32 pb-12 px-6 overflow-hidden flex items-center justify-center min-h-[55vh]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-6 animate-fade-in font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Best {competitor.name} Alternatives & Competitors
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight uppercase">
            Best {competitor.name} <span className="text-accent">Alternative</span> for Creators & Brands
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Avoid conversion leaks in sandboxed mobile webviews. Compare customization options, tracking parameters, and dynamic routing capabilities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Create Your Free Page <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#comparison" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              View Comparison Matrix
            </a>
          </div>
        </div>
      </section>

      {/* Main Structural Layout Wrapper */}
      <section className="py-8 px-6 max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Philosophical Angle & In-App Webview Warnings */}
        <div className="lg:col-span-5 space-y-6 text-left">
          
          {/* Philosophical Box */}
          <div className="glass-card p-6 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent relative overflow-hidden group hover:border-accent/40 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <HeartCrack className="w-20 h-20 text-accent" />
            </div>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2 uppercase font-mono">
              <HeartCrack className="w-5 h-5 text-accent" /> The Rent-Seeking Paradigm
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
              Legacy tools like {competitor.name} build their revenue by restricting your basic brand identity. Demanding subscription upgrades simply to remove a platform watermark or map a custom subdomain limits creator autonomy.
            </p>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed mt-2.5 font-medium">
              With Linktery, we believe your social landing page belongs to you. We provide full theme customization for free on the Creator plan, with custom domain configurations (Agency plan) and watermark removal (Pro plan) transparently priced.
            </p>
          </div>

          {/* Webview Warning Box */}
          <div className="glass-card p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 group hover:border-amber-500/35 transition-all duration-300">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2 uppercase font-mono">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> The In-App Webview Jail
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
              Sharing a standard URL in your social bio traps clicks inside Instagram or TikTok's built-in sandbox browser. Users are prompted to log in again to follow, play, or purchase—ruining up to **40% of visitor conversions**.
            </p>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed mt-2.5 font-medium">
              Linktery bypasses this webview wall on paid plans, triggering installed applications (Spotify, YouTube, Amazon, Telegram) directly to preserve sessions and complete orders.
            </p>
          </div>

        </div>

        {/* Right Column: Case Studies & Scenarios with Interactive Tab Selector */}
        <div className="lg:col-span-7 glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/40 backdrop-blur-md self-stretch flex flex-col justify-between text-left">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Real-World Solutions</h2>
                <p className="text-xs text-muted-foreground">Select a business vertical to see redirection logic in action</p>
              </div>
              <Compass className="w-5 h-5 text-accent animate-spin" style={{ animationDuration: '15s' }} />
            </div>

            {/* Interactive Tab Selectors */}
            <div className="flex flex-wrap gap-2.5 mb-6">
              <button 
                onClick={() => setActiveTab("musician")}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === "musician" 
                    ? "bg-accent text-background shadow-md scale-105" 
                    : "border border-border text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                <Play className="w-3.5 h-3.5" /> Indie Musician
              </button>
              <button 
                onClick={() => setActiveTab("ecommerce")}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === "ecommerce" 
                    ? "bg-accent text-background shadow-md scale-105" 
                    : "border border-border text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> E-commerce Brand
              </button>
              <button 
                onClick={() => setActiveTab("mediabuyer")}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === "mediabuyer" 
                    ? "bg-accent text-background shadow-md scale-105" 
                    : "border border-border text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                <Target className="w-3.5 h-3.5" /> Paid Media Buyer
              </button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[160px] flex flex-col justify-center font-sans">
              {activeTab === "musician" && (
                <div className="animate-fade-in space-y-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" /> Spotify streams leaking in in-app webviews
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    An artist runs Stories ads pointing to a legacy bio link. When users click, they are prompted to log in to Spotify's web player inside the Instagram sandboxed browser. **Over 40% of listeners abandon the stream.**
                  </p>
                  <p className="text-xs md:text-sm text-accent/90 bg-accent/5 border border-accent/20 p-3 rounded-xl mt-2 italic font-mono">
                    💡 Linktery Solution: Bypasses the webview sandbox, triggering the native Spotify app directly on iOS or Android devices for instant listening.
                  </p>
                </div>
              )}

              {activeTab === "ecommerce" && (
                <div className="animate-fade-in space-y-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" /> Fragmented regional store checkouts
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    A shop sells to UK and US audiences. UK visitors click the bio link but get sent to the USD store. They abandon checkout due to currency confusion and high international shipping costs.
                  </p>
                  <p className="text-xs md:text-sm text-accent/90 bg-accent/5 border border-accent/20 p-3 rounded-xl mt-2 italic font-mono">
                    💡 Linktery Solution: Evaluates geo IP data on click. UK traffic goes to the GBP shop, and US traffic to the USD shop automatically, lifting sales by 28%.
                  </p>
                </div>
              )}

              {activeTab === "mediabuyer" && (
                <div className="animate-fade-in space-y-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" /> Ad attribution issues post iOS 14.5
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    A media buyer runs campaigns to a legacy root domain. Because they don't own the domain, they cannot verify it in Facebook Business Manager, breaking pixel conversion attribution.
                  </p>
                  <p className="text-xs md:text-sm text-accent/90 bg-accent/5 border border-accent/20 p-3 rounded-xl mt-2 italic font-mono">
                    💡 Linktery Solution: Linktery supports custom domains (`links.brand.com`) on the Agency plan, giving you verified domain ownership and perfect tracking pixel analytics.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 mt-6 flex justify-end">
            <Link to="/register" className="text-xs font-bold text-accent hover:text-white transition-colors flex items-center gap-1 group font-mono uppercase">
              Start Free Custom Workspace <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

      </section>

      {/* Comparison Matrix Section */}
      <section id="comparison" className="py-12 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-8">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono block mb-2">COMPARISON MATRIX</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white uppercase">Linktery vs {competitor.name}</h2>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-border bg-surface/50 backdrop-blur-md shadow-2xl">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-border bg-slate-900/60 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase font-mono">
                <th className="p-4 md:p-6">Feature Details</th>
                <th className="p-4 md:p-6 text-accent">Linktery (Winner)</th>
                <th className="p-4 md:p-6">{competitor.name} {competitor.emoji}</th>
                <th className="p-4 md:p-6">{fallbackCompetitor.name} {fallbackCompetitor.emoji}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90 font-mono">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Custom Domains pricing</td>
                <td className="p-4 md:p-6 text-green-400 font-bold">✅ Requires Agency ($29/mo)</td>
                <td className="p-4 md:p-6 text-slate-300">{competitor.pricing.customDomains}</td>
                <td className="p-4 md:p-6 text-slate-300">{fallbackCompetitor.pricing.customDomains}</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Watermark Removal</td>
                <td className="p-4 md:p-6 text-green-400 font-bold">✅ Requires Pro ($11/mo)</td>
                <td className="p-4 md:p-6 text-slate-300">{competitor.pricing.watermarkRemoval}</td>
                <td className="p-4 md:p-6 text-slate-300">{fallbackCompetitor.pricing.watermarkRemoval}</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">App Deep Linking</td>
                <td className="p-4 md:p-6 text-green-400 font-bold">✅ Yes (Launch Native Apps)</td>
                <td className="p-4 md:p-6 text-slate-400">{competitor.features.deepLinking}</td>
                <td className="p-4 md:p-6 text-slate-400">{fallbackCompetitor.features.deepLinking}</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Smart Geolocation redirects</td>
                <td className="p-4 md:p-6 text-green-400 font-bold">✅ Yes (Country routing rules)</td>
                <td className="p-4 md:p-6 text-slate-400">{competitor.features.geotargeting}</td>
                <td className="p-4 md:p-6 text-slate-400">{fallbackCompetitor.features.geotargeting}</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Transaction fee rates</td>
                <td className="p-4 md:p-6 text-green-400 font-bold">✅ 0% (All plans)</td>
                <td className="p-4 md:p-6 text-slate-300">{competitor.pricing.transactionFee}</td>
                <td className="p-4 md:p-6 text-slate-300">{fallbackCompetitor.pricing.transactionFee}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Competitor Review Detail Section */}
      <section className="py-12 px-6 max-w-4xl mx-auto relative z-10 divide-y divide-border/60 text-left">
        <div className="pb-12 space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-tight">Linktery: Performance Routing</h2>
          </div>
          <p className="text-slate-300 leading-relaxed font-sans font-medium text-sm md:text-base">
            Linktery is engineered as a performance-driven routing engine. Instead of a simple index profile, it maps your custom domains, evaluates device-targeting rules at the edge CDN layer, and launches native device apps to bypass conversion drops.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-border space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2 uppercase font-mono text-xs md:text-sm">
                <Check className="w-4 h-4 text-accent" /> Linktery Advantages
              </h3>
              <ul className="space-y-2 text-xs md:text-sm text-slate-400 font-sans">
                <li>• **SSG Loading**: Compiles profiles to load in under 150ms.</li>
                <li>• **App launching**: Launch Spotify, YouTube, or Amazon directly on iOS/Android.</li>
                <li>• **Domain Mapping**: Connect custom subdomains on our Agency plan.</li>
                <li>• **0% Commission Cuts**: Keep your product sales revenues clean.</li>
              </ul>
            </div>
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-border space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2 uppercase font-mono text-xs md:text-sm">
                <X className="w-4 h-4 text-red-500" /> Linktery Disadvantages
              </h3>
              <ul className="space-y-2 text-xs md:text-sm text-slate-400 font-sans">
                <li>• Focuses on conversion metrics, which may feel excessive for general personal profiles.</li>
                <li>• Does not act as an integrated billing store (redirects to Stripe/Shopify instead).</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-12 pb-12 space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-border flex items-center justify-center text-slate-400">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-tight">{competitor.name}: Details</h2>
          </div>
          <p className="text-slate-300 leading-relaxed font-sans font-medium text-sm md:text-base">
            {competitor.description} While it is popular and easy to setup, creators looking to maximize e-commerce conversion rates or run targeted campaigns often hit configuration barriers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-border space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2 uppercase font-mono text-xs md:text-sm">
                <Check className="w-4 h-4 text-green-400" /> {competitor.name} Pros
              </h3>
              <ul className="space-y-2 text-xs md:text-sm text-slate-400 font-sans">
                {competitor.pros.map((pro, idx) => (
                  <li key={idx}>• {pro}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-border space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2 uppercase font-mono text-xs md:text-sm">
                <X className="w-4 h-4 text-red-500" /> {competitor.name} Cons
              </h3>
              <ul className="space-y-2 text-xs md:text-sm text-slate-400 font-sans">
                {competitor.cons.map((con, idx) => (
                  <li key={idx}>• {con}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase Grid */}
      <section className="py-16 px-6 bg-surface/20 border-y border-border/50 relative z-10 text-left">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-white uppercase">Linktery Features</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base font-medium">
              Linktery was engineered to provide premium, production-level traffic optimization capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Smart Geolocation Rules</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-sans">
                  Avoid routing visitors to pages they cannot purchase from. Automatically redirect users based on physical country criteria to point UK visitors to GBP sites and US visitors to USD checkouts.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Deep App Launching</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-sans">
                  Bypass the in-app browser drop-off completely. Ensure your link launches native device applications directly (Spotify app for playlists, YouTube app for channel subscriptions) to preserve user login sessions.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Real-Time Telemetry</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-sans">
                  Track dynamic click metadata, visitor locations, operating system distributions, referrers, and conversion goals. Analyze traffic quality instantly to optimize social campaigns.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">Custom Domain Mapping</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-sans">
                  Build immediate brand authority and credibility. Map your profile to a custom subdomain (e.g. bio.yourbrand.com) on our Agency plan, avoiding standard footprint limitations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 max-w-3xl mx-auto relative z-10 text-left">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white uppercase flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-accent" /> FAQ
          </h2>
          <p className="text-muted-foreground text-sm md:text-base font-medium">
            Common questions regarding {competitor.name} alternatives and pricing structures.
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
                <span className="text-sm md:text-base font-sans">{item.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
                    openFaqIndex === index ? "rotate-180 text-accent" : ""
                  }`} 
                />
              </button>
              {openFaqIndex === index && (
                <div className="p-5 pt-0 border-t border-border/40 text-sm text-slate-300 leading-relaxed bg-slate-900/40 font-sans">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto relative z-10 border-t border-border/40">
        <div className="relative glass-card p-8 md:p-12 rounded-3xl overflow-hidden border border-accent/20 bg-gradient-to-tr from-accent/10 via-background to-background text-center shadow-glow">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-accent rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 relative z-10 uppercase tracking-tight">
            Optimize Your Bio Traffic
          </h2>
          <p className="text-base md:text-lg text-slate-300 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed font-sans font-medium">
            Switch to Linktery for advanced geo-redirection, native deep app launching, and 0% transaction fees.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Create Your Free Page <ArrowRight className="w-5 h-5" />
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
