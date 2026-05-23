import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, Compass, Award, AlertTriangle, HelpCircle,
  Play, ShoppingBag, Target, HeartCrack, ChevronRight, Calculator, RefreshCw
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

export default function BeaconsAlternative() {
  const { user } = useAuth();
  
  // Call the SEO hook with the registered configuration
  useSeo(SEO_PAGES.beaconsAlternative);

  // Calculator State
  const [monthlySales, setMonthlySales] = useState<number>(1500);

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Case Study Tabs State
  const [activeTab, setActiveTab] = useState<"seller" | "influencer" | "brand">("seller");

  // Helper to get avatar URL
  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  // Calculations for Beacons 9% cut
  const beaconsFeeMonthly = Math.round(monthlySales * 0.09);
  const beaconsFeeYearly = beaconsFeeMonthly * 12;
  const linkteryFee = 0;
  const annualSavings = beaconsFeeYearly;

  const faqItems: FaqItem[] = [
    {
      question: "Does Linktery charge transaction fees on digital product sales?",
      answer: "No. Linktery charges a flat 0% transaction fee. Instead of acting as a middleman and hosting a proprietary checkout, Linktery dynamically redirects your visitors straight to your optimized, high-converting checkout links (like Stripe, Shopify, Lemon Squeezy, or Gumroad)."
    },
    {
      question: "Why does Beacons charge a 9% transaction fee on the free plan?",
      answer: "Beacons bundles a native storefront builder directly into their bio-link page. On their free tier, they monetize this by charging a steep 9% cut of all sales. To eliminate this fee, creators must upgrade to their Creator+ subscription plan which costs $10 per month."
    },
    {
      question: "Can I connect my own custom domain to Linktery?",
      answer: "Yes. Linktery supports mapping custom domains to your landing pages on our Agency plan ($29/mo). Beacons and other competitors require upgrading to their premium paid tiers (costing $10/mo or more) to unlock custom domain mapping. With Linktery's Agency tier, you get unlimited links and custom domains, making it perfect for scaling brands."
    },
    {
      question: "How does Linktery solve the Instagram and TikTok in-app browser drop-off?",
      answer: "Normally, clicking a link in a social bio opens an in-app webview where visitors are logged out of external accounts. Linktery solves this by using dynamic mobile deep-linking protocols on our Pro ($11/mo) and Agency ($29/mo) plans. When a user clicks a native app link (like a Spotify playlist or YouTube channel), it bypasses the sandbox and triggers the native app directly on their iOS or Android device, recovering up to 40% of lost conversions."
    },
    {
      question: "Can I migrate my existing Beacons profile to Linktery?",
      answer: "Yes. Setting up Linktery takes less than 5 minutes. You can register a free account, choose a custom layout, add your core redirect buttons, customize your branding style, and instantly point your social bio to your new high-performance profile."
    }
  ];

  // Dynamic JSON-LD Structured Data
  const structuredData = {
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
          "ratingValue": "4.9",
          "ratingCount": "142"
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Dynamic Schema Injection */}
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} 
      />

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
      <section className="relative pt-32 pb-12 px-6 overflow-hidden flex items-center justify-center min-h-[50vh]">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
          <div className="absolute top-10 left-1/4 w-[400px] h-[400px] bg-accent rounded-full blur-[120px] mix-blend-screen animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-emerald-500 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            2026 Comparison: Linktery vs Beacons.ai
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Stop Giving Away 9% of
            <br />
            <span className="gradient-text">Your Digital Product Revenue</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Compare Linktery and Beacons. Discover why choosing a pure, high-speed traffic router with 0% commission fees is the smarter choice for professional digital creators.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Launch Your Free Page <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#matrix" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              Compare Platform Features
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Slider Section: The Commission Loss Calculator */}
      <section className="py-8 px-6 max-w-6xl mx-auto relative z-10">
        <div className="glass-card p-6 md:p-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/10 via-surface/40 to-background/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Calculator className="w-24 h-24 text-emerald-400" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                <Calculator className="w-6 h-6 text-emerald-400" /> The Commission Loss Calculator
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Beacons.ai charges a **9% transaction fee** on their free tier for selling digital downloads, e-books, and coaching. See how much of your hard-earned revenue goes directly to the platform.
              </p>
              
              <div className="pt-6 pb-2">
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="sales-slider" className="text-sm font-semibold text-white">Estimated Monthly Digital Sales</label>
                  <span className="text-xl font-bold text-emerald-400">${monthlySales.toLocaleString()}</span>
                </div>
                <input 
                  id="sales-slider"
                  type="range" 
                  min="100" 
                  max="10000" 
                  step="100"
                  value={monthlySales} 
                  onChange={(e) => setMonthlySales(Number(e.target.value))}
                  className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>$100</span>
                  <span>$5,000</span>
                  <span>$10,000+</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-surface/80 border border-border p-6 rounded-xl space-y-4 relative z-10">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Beacons.ai Monthly Fee (9%):</span>
                  <span className="text-red-400 font-bold">${beaconsFeeMonthly} / mo</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Beacons.ai Yearly Fee (9%):</span>
                  <span className="text-red-400 font-bold">${beaconsFeeYearly.toLocaleString()} / yr</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Linktery Monthly Fee:</span>
                  <span className="text-emerald-400 font-bold">$0.00 / mo</span>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg text-center">
                <p className="text-xs text-emerald-400 uppercase font-extrabold tracking-wider mb-1">Annual Savings with Linktery</p>
                <p className="text-3xl font-black text-white">${annualSavings.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Keep 100% of your earnings using your external checkouts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Structural Layout Wrapper: Side-by-Side Cohesive Sections */}
      <section className="py-8 px-6 max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Pain Points (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Issue 1: 9% Commission */}
          <div className="glass-card p-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/10 to-transparent relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <HeartCrack className="w-20 h-20 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <HeartCrack className="w-5 h-5 text-emerald-400" /> The Middleman Tax
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bundling checkouts directly into your link-in-bio makes it easy to set up, but it comes at a price. Charging a 9% cut of your hard-earned sales on the free plan takes away money that could go back into your content creation or paid ads.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2.5">
              Linktery redirects visitors straight to your own payment providers (like Gumroad, Lemon Squeezy, Shopify, or Stripe) with absolutely **0% fees**. Keep your revenue where it belongs.
            </p>
          </div>

          {/* Issue 2: Page Loading Speed */}
          <div className="glass-card p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 group hover:border-amber-500/35 transition-all duration-300">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Widget Fatigue & Bloat
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Beacons tries to do everything: digital stores, newsletter senders, AI website builders, and media kit tools. This level of feature bloat significantly increases javascript payload sizes on mobile devices.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2.5">
              Every extra second your page takes to load in a social media in-app browser decreases conversion rates by **20%**. Linktery is built purely for lightning-fast routing.
            </p>
          </div>

        </div>

        {/* Right Column: Case Studies / Use Cases (7 columns) */}
        <div className="lg:col-span-7 glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/40 backdrop-blur-md self-stretch flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">How Linktery Optimizes Conversions</h2>
                <p className="text-xs text-muted-foreground">Select a business scenario to see the optimization logic in action</p>
              </div>
              <Compass className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: '15s' }} />
            </div>

            {/* Interactive Tab Selectors */}
            <div className="flex flex-wrap gap-2.5 mb-6">
              <button 
                onClick={() => setActiveTab("seller")}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === "seller" 
                    ? "bg-emerald-500 text-background font-bold shadow-md scale-105" 
                    : "border border-border text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Digital Seller
              </button>
              <button 
                onClick={() => setActiveTab("influencer")}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === "influencer" 
                    ? "bg-emerald-500 text-background font-bold shadow-md scale-105" 
                    : "border border-border text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                <Play className="w-3.5 h-3.5" /> Media Influencer
              </button>
              <button 
                onClick={() => setActiveTab("brand")}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === "brand" 
                    ? "bg-emerald-500 text-background font-bold shadow-md scale-105" 
                    : "border border-border text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                <Target className="w-3.5 h-3.5" /> Agency & Brand
              </button>
            </div>

            {/* Tab Contents with Transition Effect */}
            <div className="min-h-[160px] flex flex-col justify-center">
              {activeTab === "seller" && (
                <div className="animate-fade-in space-y-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Digital downloads & course checkout optimization
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A digital creator selling high-ticket Notion templates ($100 per copy) gets 50 sales a month. Beacons takes a **$450 monthly cut** on their free plan.
                  </p>
                  <p className="text-sm text-emerald-400/90 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl mt-2 italic">
                    💡 Linktery Advantage: Integrates seamlessly with Gumroad, Lemon Squeezy, or Stripe. Keep 100% of your earnings on our free tier with zero middleman commission fees.
                  </p>
                </div>
              )}

              {activeTab === "influencer" && (
                <div className="animate-fade-in space-y-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Streaming and Video platform routing
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    An influencer promotes their new music track or YouTube channel in their bio. When visitors click Beacons links, they get stuck in the Instagram in-app browser and must log in to subscribe or save the track.
                  </p>
                  <p className="text-sm text-emerald-400/90 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl mt-2 italic">
                    💡 Linktery Advantage: Opens the native YouTube or Spotify mobile app directly, instantly bypassing the browser login requirement and recovering up to 40% of lost conversions.
                  </p>
                </div>
              )}

              {activeTab === "brand" && (
                <div className="animate-fade-in space-y-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Custom branding and Domain authority
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A boutique brand wants a fully white-labeled landing page under their own domain (`links.mybrand.com`) to build user trust, reduce bounce rates, and track ad pixels accurately.
                  </p>
                  <p className="text-sm text-emerald-400/90 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl mt-2 italic">
                    💡 Linktery Advantage: Supports unlimited custom domains and custom slugs on the Agency plan, allowing you to run clean white-labeled sites without any extra transaction fees.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 mt-6 flex justify-end">
            <Link to="/register" className="text-xs font-bold text-emerald-400 hover:text-white transition-colors flex items-center gap-1 group">
              Test Digital Checkout Redirection <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

      </section>

      {/* Comparison Matrix Section */}
      <section id="matrix" className="py-12 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Platform Matrix Comparison</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Review detailed features, pricing setups, custom domain configurations, and transaction fees across systems.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase">
                <th className="p-4 md:p-6">Feature Overview</th>
                <th className="p-4 md:p-6 text-emerald-400">Linktery</th>
                <th className="p-4 md:p-6">Beacons.ai</th>
                <th className="p-4 md:p-6">Linktree</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Transaction Commission</td>
                <td className="p-4 md:p-6 text-emerald-400 font-medium">0% (Keep all sales)</td>
                <td className="p-4 md:p-6 text-red-400">9% on Free Tier</td>
                <td className="p-4 md:p-6">0% - 2% (Plan dependent)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Custom Domain Mapping</td>
                <td className="p-4 md:p-6 text-emerald-400 font-medium">Requires Agency ($29/mo)</td>
                <td className="p-4 md:p-6">Requires Creator+ ($10/mo)</td>
                <td className="p-4 md:p-6">Requires Pro ($10/mo)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Page Performance & Speed</td>
                <td className="p-4 md:p-6 text-emerald-400 font-medium">Lightning-Fast (Pure routing)</td>
                <td className="p-4 md:p-6 text-red-400">Slow (Heavy JS payload)</td>
                <td className="p-4 md:p-6">Average load speed</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Watermark-Free Layouts</td>
                <td className="p-4 md:p-6 text-emerald-400 font-medium">Requires Pro ($11/mo)</td>
                <td className="p-4 md:p-6">Requires Creator+ ($10/mo)</td>
                <td className="p-4 md:p-6">Requires Pro ($10/mo)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Deep Link Protocols</td>
                <td className="p-4 md:p-6 text-emerald-400 font-medium">Requires Pro ($11/mo)</td>
                <td className="p-4 md:p-6">Very Limited</td>
                <td className="p-4 md:p-6">Not Supported</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Geotargeting Routing</td>
                <td className="p-4 md:p-6 text-emerald-400 font-medium">Requires Pro ($11/mo)</td>
                <td className="p-4 md:p-6">Not Supported</td>
                <td className="p-4 md:p-6">Not Supported</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Individual Review Deep Dives */}
      <section className="py-12 px-6 max-w-4xl mx-auto relative z-10 divide-y divide-border/60">
        
        {/* Linktery Analysis */}
        <div className="pb-12">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Linktery: Pure Conversion Router</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Linktery is designed specifically to solve social media conversion leaks. It functions as a lightweight, performance-first traffic routing system rather than an all-in-one content database. Because it doesn't process payments directly, it charges zero commission. Instead, it directs visitors straight to optimized external checkouts while offering advanced targeting, custom domains, and white-label branding on our premium plans.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Linktery Pros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• **0% Commission on Sales**: Linktery does not take a percentage of your revenue.</li>
                <li>• **Custom Domains supported**: Map your own domains to build brand authority on the Agency plan.</li>
                <li>• **Bypass Webview restrictions**: Direct application launching on Pro and Agency plans.</li>
                <li>• **Clean White-label customization**: Remove branding watermarks on Pro and Agency plans.</li>
              </ul>
            </div>
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" /> Linktery Cons
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• No built-in payment processing system (requires linking to Shopify, Gumroad, or Stripe).</li>
                <li>• Less focused on blogging or text components, prioritizing high-speed traffic routing.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Beacons Analysis */}
        <div className="pt-12 pb-12">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
              <Compass className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Beacons.ai: Built-in Storefront Builder</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Beacons.ai is an all-in-one bio-link platform centered heavily on built-in creators tools: storefronts, newsletter signup blocks, and media kit builders. It lets you upload digital downloads and collect tips directly from the landing page. While convenient for beginners, it introduces heavy page weight and charges a 9% transaction fee on sales on the free plan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" /> Beacons Pros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Built-in store block makes uploading digital products very simple.</li>
                <li>• Easy integrations with email list tools like Mailchimp.</li>
                <li>• AI-onboarding design engine creates pages quickly.</li>
              </ul>
            </div>
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" /> Beacons Cons
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 9% commission on digital product sales under the free plan.</li>
                <li>• Custom domains and watermark removal locked behind the $10/mo plan.</li>
                <li>• Script weight from multiple heavy widgets can slow down mobile loading.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive: Why Linktery Works */}
      <section className="py-16 px-6 bg-surface/30 border-y border-border/60 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Linktery Architecture and Features</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              Linktery was engineered to provide premium, production-level traffic optimization capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Smart Geolocation Rules</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Avoid routing visitors to pages they cannot purchase from. Automatically redirect users based on physical country criteria to point UK visitors to GBP sites and US visitors to USD checkouts.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Deep App Launching</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bypass the in-app browser drop-off completely. Ensure your link launches native device applications directly (Spotify app for playlists, YouTube app for channel subscriptions) to preserve user login sessions.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Real-Time Telemetry</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track dynamic click metadata, visitor locations, operating system distributions, referrers, and conversion goals. Analyze traffic quality instantly to optimize social campaigns.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Custom Domain Mapping</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Build immediate brand authority and credibility. Map your profile to a custom subdomain (e.g. bio.yourbrand.com) on our Agency plan, avoiding standard footprint limitations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 max-w-3xl mx-auto relative z-10 border-t border-border/50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-emerald-400" /> Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Common questions answered by conversion optimization specialists.
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
                    openFaqIndex === index ? "rotate-180 text-emerald-400" : ""
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
      <section className="py-20 px-6 max-w-5xl mx-auto relative z-10">
        <div className="relative glass-card p-8 md:p-12 rounded-3xl overflow-hidden border border-emerald-500/20 bg-gradient-to-tr from-emerald-950/10 via-background to-background text-center shadow-glow">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-emerald-500 rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 relative z-10">
            Keep 100% of Your Earnings
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Switch to Linktery for lightning-fast routing, advanced deep-linking, and 0% commission fees on all plans.
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
      <footer className="border-t border-border py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center gap-[11px] hover:opacity-80 transition-opacity">
            <img src="/logo.webp" alt="Linktery Logo" className="h-12 w-auto mix-blend-screen grayscale" />
            <span className="text-xl font-bold text-foreground/80 tracking-tight translate-y-[1px]">Linktery</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-emerald-400 transition-colors">Terms & Conditions</Link>
            <p className="text-sm text-muted-foreground">© 2026 Linktery. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
