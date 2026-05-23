import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, Compass, Award, AlertTriangle, HelpCircle,
  Play, ShoppingBag, Target, HeartCrack, ChevronRight
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

export default function LinktreeAlternative() {
  const { user } = useAuth();
  
  // Call the SEO hook with the registered configuration
  useSeo(SEO_PAGES.linktreeAlternative);

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  // Case Study Tabs State
  const [activeTab, setActiveTab] = useState<"musician" | "ecommerce" | "mediabuyer">("musician");

  // Helper to get avatar URL
  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  const faqItems: FaqItem[] = [
    {
      question: "Which link-in-bio tool has the best free plan in 2026?",
      answer: "Linktery offers a highly competitive free Creator plan featuring full profile customization, device-targeting rules, and 0% transaction fees. Legacy tools like Linktree and Beacons lock custom domains and watermark removal behind paid tiers, whereas Linktery keeps costs flat with a 0% commission structure on all tiers."
    },
    {
      question: "How do I bypass the Instagram and TikTok in-app browser jail?",
      answer: "When users click regular links inside Instagram or TikTok, the apps open them in a sandboxed in-app webview where users are logged out of their native accounts (like YouTube, Spotify, or Amazon). Linktery bypasses this browser jail by using optimized deep-linking protocols that force the visitor's device to launch the native app directly, increasing conversions by up to 40%."
    },
    {
      question: "Can I use my own custom domain for my link profile?",
      answer: "Yes. Linktery supports mapping custom domains to your landing pages on our Agency plan ($29/mo). This includes unlimited links, tracking pixels, and custom slugs, making it perfect for brands and agencies looking to build domain authority and trust."
    },
    {
      question: "What are the main limitations of Linktree's free plan?",
      answer: "Linktree's free plan includes high-contrast brand watermarks, restricts you to basic pre-designed layouts, limits analytics to simple click counts, and prevents you from setting up custom redirects, custom domains, or programmatic routing rules."
    },
    {
      question: "Does Beacons charge transaction fees on sales?",
      answer: "Yes, Beacons charges a 9% transaction fee on digital store purchases under their free tier. Linktery does not act as a direct payment gateway; instead, it routes users directly to your external optimized checkouts (Shopify, Stripe, Gumroad) with zero additional transaction fees."
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
      <section className="relative pt-32 pb-12 px-6 overflow-hidden flex items-center justify-center min-h-[55vh]">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
          <div className="absolute top-10 left-1/4 w-[400px] h-[400px] bg-accent rounded-full blur-[120px] mix-blend-screen animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-emerald-500 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            2026 Industry Comparison & Analysis
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Best Link-in-Bio Tools & 
            <br />
            <span className="gradient-text">Linktree Alternatives for Creators</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Stop losing conversions in sandboxed social media browsers. Compare features, pricing models, deep-linking performance, and customization limits.
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

      {/* Main Structural Layout Wrapper: Side-by-Side Cohesive Sections */}
      <section className="py-8 px-6 max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Philosophical Angle & In-App Webview Warnings (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Philosophical Box */}
          <div className="glass-card p-6 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent relative overflow-hidden group hover:border-accent/40 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <HeartCrack className="w-20 h-20 text-accent" />
            </div>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <HeartCrack className="w-5 h-5 text-accent" /> The Rent-Seeking Model
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Traditional platforms like Linktree build businesses by holding your basic brand identity hostage. Charging creators high commission fees or restricting basic profile customization is an outdated SaaS paradigm.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2.5">
              In 2026, we believe your bio-link profile should represent your brand, which is why we provide full profile design customization for free on our Creator plan, while keeping custom domains (Agency plan) and watermark removal (Pro plan) transparently priced.
            </p>
          </div>

          {/* Webview Warning Box */}
          <div className="glass-card p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 group hover:border-amber-500/35 transition-all duration-300">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> The In-App Browser Jail
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you put a standard URL inside your Instagram, TikTok, or YouTube bio, visitors open it in a sandboxed built-in webview. In this environment, they are <strong>completely logged out</strong> of their YouTube, Spotify, and Amazon accounts. 
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2.5">
              If they try to subscribe, follow, or buy, they must re-enter their passwords—resulting in a <strong>30% to 45% drop in conversions</strong>.
            </p>
          </div>

        </div>

        {/* Right Column: Case Studies & Scenarios with Interactive Tab Selector (7 columns) */}
        <div className="lg:col-span-7 glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/40 backdrop-blur-md self-stretch flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Real-World Case Scenarios</h2>
                <p className="text-xs text-muted-foreground">Select a vertical to see how redirection logic resolves conversion drop-offs</p>
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

            {/* Tab Contents with Transition Effect */}
            <div className="min-h-[160px] flex flex-col justify-center">
              {activeTab === "musician" && (
                <div className="animate-fade-in space-y-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" /> Spotify streams leaking on Instagram ads
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    An artist runs Stories ads pointing to a generic bio link. When users click, they are prompted to log in to Spotify web player inside the Instagram sandboxed browser. **42% of listeners drop off instantly.**
                  </p>
                  <p className="text-sm text-accent/90 bg-accent/5 border border-accent/20 p-3 rounded-xl mt-2 italic">
                    💡 Linktery Solution: Instantly bypasses the webview sandbox, triggering the native Spotify app directly on iOS or Android devices for one-click listening.
                  </p>
                </div>
              )}

              {activeTab === "ecommerce" && (
                <div className="animate-fade-in space-y-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" /> Multi-regional checkouts converting poorly
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A shop sells to UK and US audiences. UK visitors click the bio link but get sent to the USD store. They abandon their carts due to international shipping costs and currency confusion.
                  </p>
                  <p className="text-sm text-accent/90 bg-accent/5 border border-accent/20 p-3 rounded-xl mt-2 italic">
                    💡 Linktery Solution: Evaluates geo IP metadata on click. UK traffic goes to the GBP shop, and US traffic to the USD shop automatically, resulting in a 28% sales boost.
                  </p>
                </div>
              )}

              {activeTab === "mediabuyer" && (
                <div className="animate-fade-in space-y-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" /> Ad attribution issues post iOS 14.5
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A media buyer runs ads to `linktr.ee/mybrand`. Because they don't own the root domain, they cannot verify it in Facebook Business Manager, leading to inaccurate conversion pixel tracking.
                  </p>
                  <p className="text-sm text-accent/90 bg-accent/5 border border-accent/20 p-3 rounded-xl mt-2 italic">
                    💡 Linktery Solution: Linktery supports custom domains (`links.brand.com`) on the Agency plan, giving you verified domain ownership, perfect pixel events tracking, and clean attribution.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 mt-6 flex justify-end">
            <Link to="/register" className="text-xs font-bold text-accent hover:text-white transition-colors flex items-center gap-1 group">
              Test This Redirection Routing <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

      </section>

      {/* Comparison Matrix Section */}
      <section id="comparison" className="py-12 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">2026 Comparison Matrix</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Detailed breakdown of actual feature limits, costs, and routing capabilities across popular link-in-bio services.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase">
                <th className="p-4 md:p-6">Feature Details</th>
                <th className="p-4 md:p-6 text-accent">Linktery (Our Pick)</th>
                <th className="p-4 md:p-6">Linktree</th>
                <th className="p-4 md:p-6">Beacons.ai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Custom Domains</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">Requires Agency ($29/mo)</td>
                <td className="p-4 md:p-6">Requires Pro ($10/mo)</td>
                <td className="p-4 md:p-6">Requires Creator+ ($10/mo)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Branding Watermark</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">Requires Pro ($11/mo)</td>
                <td className="p-4 md:p-6">Locked on Free Tier</td>
                <td className="p-4 md:p-6">Locked on Free Tier</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">App Deep Linking</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">Requires Pro ($11/mo)</td>
                <td className="p-4 md:p-6">Not Supported</td>
                <td className="p-4 md:p-6">Very Limited / Internal Store</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Smart Geolocation Rules</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">Requires Pro ($11/mo)</td>
                <td className="p-4 md:p-6">Not Available</td>
                <td className="p-4 md:p-6">Not Available</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Analytics Resolution</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">Real-Time Telemetry (Referrer, Geo, OS)</td>
                <td className="p-4 md:p-6">Basic clicks (Detailed on Pro)</td>
                <td className="p-4 md:p-6">Basic dashboard metrics</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Transaction Fees</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">0% (Redirects to Stripe/Shopify)</td>
                <td className="p-4 md:p-6">0% - 2% depending on tier</td>
                <td className="p-4 md:p-6 text-red-400">9% on Free tier</td>
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
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Linktery: The Conversion Router</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Linktery is a performance-focused link-in-bio platform engineered specifically to optimize the routing of social media traffic. Instead of serving as a simple index of links, it functions as a lightweight traffic manager. By providing advanced redirection features (such as sending Android users to one app link and iOS users to another) and dynamic telemetry metrics, it ensures creators convert social visibility into business revenue.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-accent" /> Linktery Pros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• **True White-Labeling**: Remove platform watermarks completely on Pro and Agency plans.</li>
                <li>• **No-Jail Deep Linking**: Bypass in-app browser barriers with native deep-linking on Pro and Agency plans.</li>
                <li>• **Custom Domain Mapping**: Map your landing pages to custom domains on the Agency plan to build brand trust.</li>
                <li>• **Device & Geolocation Target Rules**: Send users to localized store domains (Pro/Agency plans).</li>
              </ul>
            </div>
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" /> Linktery Cons
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• No built-in e-commerce billing portal (redirects to Shopify, Stripe, or Gumroad instead).</li>
                <li>• Focuses on conversion performance, which may feel excessive for casual, non-business accounts.</li>
              </ul>
            </div>
          </div>
          <p className="text-sm font-semibold text-accent uppercase tracking-wider">
            Who it is for: Influencers, Affiliate Marketers, Brands, Musicians, and Agencies looking to bypass in-app browser drop-offs.
          </p>
        </div>

        {/* Linktree Analysis */}
        <div className="pt-12 pb-12">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
              <Layers className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Linktree: The Legacy Standard</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-6">
            As the category creator, Linktree is highly recognizable. It provides a simple, standard layout of link rows. However, this familiarity has led to aesthetic exhaustion (with many profiles looking identical), and the platform remains rigid when it comes to customizing layouts. Advanced telemetry features and custom domains are locked behind premium subscription tiers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" /> Linktree Pros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Easy to set up for beginners with zero coding experience.</li>
                <li>• Vast array of integrations with third-party software applications.</li>
                <li>• Familiar mental model for general social media visitors.</li>
              </ul>
            </div>
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" /> Linktree Cons
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• High monthly pricing tiers to remove the Linktree watermark.</li>
                <li>• Does not provide smart routing rules (such as country or operating system redirects).</li>
                <li>• Lacks deep linking, meaning social traffic remains stuck in the in-app browser sandbox.</li>
              </ul>
            </div>
          </div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Who it is for: Casual users or beginners needing a simple, basic index of links with minimal configuration.
          </p>
        </div>

        {/* Beacons Analysis */}
        <div className="pt-12 pb-12">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
              <Compass className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Beacons.ai: The Native Storefront</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Beacons.ai was built with monetization in mind. It allows creators to sell digital products, book memberships, and collect tips directly from their bio-link page. It features an automated AI page builder that pulls from your existing accounts. However, this focus on e-commerce makes the builder complex, and the free tier takes a heavy 9% transaction cut on sales.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" /> Beacons Pros
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Built-in payment processing block for selling digital downloads directly.</li>
                <li>• Interactive email signup forms and newsletter capture blocks.</li>
                <li>• AI-assisted onboarding design engine.</li>
              </ul>
            </div>
            <div className="bg-surface/55 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" /> Beacons Cons
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 9% commission fees on sales unless subscribed to their paid tier ($10+/mo).</li>
                <li>• Page layouts can feel visually cluttered on mobile devices.</li>
                <li>• No advanced geolocation routing systems.</li>
              </ul>
            </div>
          </div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Who it is for: Creators who want to sell digital files, templates, or courses directly without setting up external stores like Shopify.
          </p>
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
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
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
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
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
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
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
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
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

      {/* Target Audiences / Use Cases */}
      <section className="py-16 px-6 max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Structured for Your Niche</h2>
          <p className="text-muted-foreground max-w-md mx-auto text-sm md:text-base">
            See how different professionals leverage Linktery redirection protocols to scale their metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-5 rounded-2xl border border-border hover:border-accent/40 transition-colors">
            <h3 className="font-bold text-white mb-2 text-lg">Social Creators</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Consolidate sponsored placements, custom codes, and external assets in a clean, high-speed bio link.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border hover:border-accent/40 transition-colors">
            <h3 className="font-bold text-white mb-2 text-lg">Affiliate Marketers</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Direct traffic to optimized regional offers based on the visitor's device location, maximizing affiliate commissions.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border hover:border-accent/40 transition-colors">
            <h3 className="font-bold text-white mb-2 text-lg">Musicians & Artists</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ensure clicks to streaming targets launch native music players directly on the mobile device, increasing subscriber rates.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border hover:border-accent/40 transition-colors">
            <h3 className="font-bold text-white mb-2 text-lg">Agencies & Brands</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Configure and manage multiple redirection setups under custom domains with real-time deep analytics dashboards.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 max-w-3xl mx-auto relative z-10 border-t border-border/50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-accent" /> Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Common questions answered by performance marketing specialists.
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
      <section className="py-20 px-6 max-w-5xl mx-auto relative z-10">
        <div className="relative glass-card p-8 md:p-12 rounded-3xl overflow-hidden border border-accent/20 bg-gradient-to-tr from-accent/10 via-background to-background text-center shadow-glow">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-accent rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 relative z-10">
            Boost Your Link Conversion Rates Today
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
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
