import { useState, useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, HelpCircle, 
  Award, AlertTriangle, ArrowLeftRight, TrendingUp
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
  officialPricingUrl?: string;
  reviewedAt?: string;
}

export default function CompetitorComparison() {
  const { comparisonSlug } = useParams<{ comparisonSlug: string }>();
  const { user } = useAuth();

  // Parse slugs from comparisonSlug (e.g., linktree-vs-beacons)
  const parts = comparisonSlug ? comparisonSlug.split("-vs-") : [];
  const slugA = parts[0] || "";
  const slugB = parts[1] || "";

  const competitorA = (competitorsData as Competitor[]).find(c => c.slug === slugA);
  const competitorB = (competitorsData as Competitor[]).find(c => c.slug === slugB);

  const isValid = !!(competitorA && competitorB);
  const canonicalCompetitors = competitorA && competitorB
    ? [competitorA, competitorB].sort((a, b) => a.slug.localeCompare(b.slug))
    : [];
  const canonicalComparisonSlug = canonicalCompetitors.length === 2
    ? `${canonicalCompetitors[0].slug}-vs-${canonicalCompetitors[1].slug}`
    : "";
  const isIndexableComparison = !!(competitorA && competitorB);

  // Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
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
  }, [comparisonSlug]);

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  // Structured schemas
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
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `Which is better: ${competitorA.name} or ${competitorB.name}?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `${competitorA.name} and ${competitorB.name} serve different needs. ${competitorA.name} is best described as: ${competitorA.description}. ${competitorB.name} is described as: ${competitorB.description}. However, for performance marketing and advanced redirections, Linktery offers a faster, more robust solution with zero transaction fees.`
            }
          },
          {
            "@type": "Question",
            "name": `Does ${competitorA.name} or ${competitorB.name} support custom domain mapping?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `${competitorA.name} custom domain requirement: ${competitorA.pricing.customDomains}. ${competitorB.name} custom domain requirement: ${competitorB.pricing.customDomains}. Linktery supports custom subdomains and root domains on the Agency plan ($29/mo) with unlimited landing pages.`
            }
          },
          {
            "@type": "Question",
            "name": `Can I bypass social media in-app browsers with these tools?`,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `Deep-linking support and behavior vary by platform and plan. Compare the current published features from ${competitorA.name} and ${competitorB.name} before choosing. Linktery supports routing into compatible native apps on paid plans.`
            }
          }
        ]
      }
    ]
  } : undefined;

  // Register SEO configuration
  useSeo({
    title: isValid 
      ? `${competitorA.name} vs ${competitorB.name}: Which is Better? (2026) | Linktery`
      : "Competitor Comparison Matrix | Linktery",
    description: isValid
      ? `Compare ${competitorA.name} vs ${competitorB.name} side-by-side. Analyze pricing, deep linking features, custom domain mapping, transaction fees, and pixel integrations.`
      : "Compare industry leading link in bio platforms with Linktery.",
    canonical: isValid ? `/compare/${canonicalComparisonSlug}` : "",
    noIndex: !isIndexableComparison,
    structuredData
  });

  // Redirect to 404 if comparison is invalid
  if (!isValid) {
    return <Navigate to="/404" replace />;
  }

  if (comparisonSlug !== canonicalComparisonSlug) {
    return <Navigate to={`/compare/${canonicalComparisonSlug}`} replace />;
  }

  // FAQ Items array for UI rendering
  const faqItems = [
    {
      question: `Is ${competitorA.name} or ${competitorB.name} cheaper for creators?`,
      answer: `${competitorA.name} charges ${competitorA.pricing.pro} for its professional tier, while ${competitorB.name} pricing stands at ${competitorB.pricing.pro}. Linktery offers a comprehensive Creator plan starting at $0, with transparent watermarks removal on the Pro plan ($11/mo).`
    },
    {
      question: `Why choose Linktery as an alternative to both ${competitorA.name} and ${competitorB.name}?`,
      answer: `Linktery combines link-in-bio pages with traffic routing, native-app deep linking for supported destinations, and click analytics. It does not take a platform commission on sales completed through external checkout providers.`
    },
    {
      question: `How do custom domains compare between ${competitorA.name} and ${competitorB.name}?`,
      answer: `${competitorA.name} custom domain mapping: ${competitorA.pricing.customDomains}. ${competitorB.name} custom domain mapping: ${competitorB.pricing.customDomains}. Linktery supports full custom domain mapping on our Agency plan, allowing you to run separate brands under one account.`
    }
  ];

  const relatedComparisons = (competitorsData as Competitor[])
    .filter((item) => item.slug !== competitorA.slug && item.slug !== competitorB.slug)
    .map((item) => {
      const pair = [competitorA, item].sort((a, b) => a.slug.localeCompare(b.slug));
      return {
        name: `${pair[0].name} vs ${pair[1].name}`,
        href: `/compare/${pair[0].slug}-vs-${pair[1].slug}`,
      };
    });

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

      {/* Ambient Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-24 left-1/4 w-[400px] h-[400px] bg-accent rounded-full blur-[130px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-24 right-1/4 w-[380px] h-[380px] bg-emerald-500 rounded-full blur-[100px] mix-blend-screen" />
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
      <section className="relative pt-36 pb-12 px-6 overflow-hidden flex items-center justify-center min-h-[50vh]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-6 font-semibold">
            <ArrowLeftRight className="w-4 h-4" />
            2026 Industry Comparison Analysis
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight uppercase">
            {competitorA.name} <span className="text-muted-foreground lowercase text-2xl md:text-4xl font-normal px-2">vs</span> {competitorB.name}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Compare published features, pricing limits, analytics, domains, and routing options before choosing the workflow that fits your campaign.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Create Free Linktery Page <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#matrix" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              View Comparison Matrix
            </a>
          </div>
        </div>
      </section>

      {/* Comparison Matrix Table */}
      <section id="matrix" className="py-12 px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center mb-10">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono block mb-2">COMPARISON MATRIX</span>
          <h2 className="text-3xl font-extrabold text-white uppercase tracking-tight">Feature Comparison Details</h2>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-border bg-surface/30 backdrop-blur-md shadow-2xl">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-border bg-slate-900/60 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase font-mono">
                <th className="p-5 md:p-6">Feature</th>
                <th className="p-5 md:p-6 text-accent">Linktery</th>
                <th className="p-5 md:p-6">{competitorA.name} {competitorA.emoji}</th>
                <th className="p-5 md:p-6">{competitorB.name} {competitorB.emoji}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs md:text-sm text-foreground/90 font-mono">
              <tr className="hover:bg-surface-hover/30 transition-colors">
                <td className="p-5 md:p-6 font-semibold text-white font-sans">Free Tier Plan</td>
                <td className="p-5 md:p-6 text-green-400 font-bold">✅ $0 (Full Custom Design)</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorA.pricing.free}</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorB.pricing.free}</td>
              </tr>
              <tr className="hover:bg-surface-hover/30 transition-colors">
                <td className="p-5 md:p-6 font-semibold text-white font-sans">Pro Tier Plan</td>
                <td className="p-5 md:p-6 text-green-400 font-bold">✅ $11/mo</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorA.pricing.pro}</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorB.pricing.pro}</td>
              </tr>
              <tr className="hover:bg-surface-hover/30 transition-colors">
                <td className="p-5 md:p-6 font-semibold text-white font-sans">Custom Domain mapping</td>
                <td className="p-5 md:p-6 text-green-400 font-bold">✅ Requires Agency ($29/mo)</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorA.pricing.customDomains}</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorB.pricing.customDomains}</td>
              </tr>
              <tr className="hover:bg-surface-hover/30 transition-colors">
                <td className="p-5 md:p-6 font-semibold text-white font-sans">Watermark Removal</td>
                <td className="p-5 md:p-6 text-green-400 font-bold">✅ Requires Pro ($11/mo)</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorA.pricing.watermarkRemoval}</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorB.pricing.watermarkRemoval}</td>
              </tr>
              <tr className="hover:bg-surface-hover/30 transition-colors">
                <td className="p-5 md:p-6 font-semibold text-white font-sans">App Deep Linking</td>
                <td className="p-5 md:p-6 text-green-400 font-bold">Compatible app destinations with web fallback</td>
                <td className="p-5 md:p-6 text-slate-400">{competitorA.features.deepLinking}</td>
                <td className="p-5 md:p-6 text-slate-400">{competitorB.features.deepLinking}</td>
              </tr>
              <tr className="hover:bg-surface-hover/30 transition-colors">
                <td className="p-5 md:p-6 font-semibold text-white font-sans">Smart Geotargeting</td>
                <td className="p-5 md:p-6 text-green-400 font-bold">✅ Yes (Route by Country)</td>
                <td className="p-5 md:p-6 text-slate-400">{competitorA.features.geotargeting}</td>
                <td className="p-5 md:p-6 text-slate-400">{competitorB.features.geotargeting}</td>
              </tr>
              <tr className="hover:bg-surface-hover/30 transition-colors">
                <td className="p-5 md:p-6 font-semibold text-white font-sans">Platform transaction fees</td>
                <td className="p-5 md:p-6 text-green-400 font-bold">✅ 0% (All Plans)</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorA.pricing.transactionFee}</td>
                <td className="p-5 md:p-6 text-slate-300">{competitorB.pricing.transactionFee}</td>
              </tr>
              <tr className="hover:bg-surface-hover/30 transition-colors">
                <td className="p-5 md:p-6 font-semibold text-white font-sans">Public page architecture</td>
                <td className="p-5 md:p-6 text-green-400 font-bold">Pre-rendered Linktery marketing pages</td>
                <td className="p-5 md:p-6 text-slate-400">Varies by current published implementation</td>
                <td className="p-5 md:p-6 text-slate-400">Varies by current published implementation</td>
              </tr>
            </tbody>
          </table>
        </div>
        {(competitorA.officialPricingUrl || competitorB.officialPricingUrl) && (
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Source check: {competitorA.officialPricingUrl && <a className="text-accent hover:underline" href={competitorA.officialPricingUrl} target="_blank" rel="noreferrer">{competitorA.name} official pricing</a>}
            {competitorA.officialPricingUrl && competitorB.officialPricingUrl ? " · " : ""}
            {competitorB.officialPricingUrl && <a className="text-accent hover:underline" href={competitorB.officialPricingUrl} target="_blank" rel="noreferrer">{competitorB.name} official pricing</a>}.
            {competitorA.reviewedAt || competitorB.reviewedAt ? ` Reviewed ${competitorA.reviewedAt || competitorB.reviewedAt}.` : ""}
          </p>
        )}
      </section>

      {/* Side-by-Side Pros/Cons Analysis */}
      <section className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Competitor A Details */}
          <div className="glass-card p-8 rounded-[32px] border border-border bg-surface/20 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                <span className="text-3xl">{competitorA.emoji}</span>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest font-mono">PLATFORM ANALYSIS</span>
                  <h3 className="text-2xl font-black text-white uppercase">{competitorA.name}</h3>
                </div>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                {competitorA.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-green-400 uppercase font-mono tracking-wider flex items-center gap-1">
                    <Check className="w-4 h-4" /> Platform Pros
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-400 font-sans">
                    {competitorA.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-green-400 shrink-0">•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-red-400 uppercase font-mono tracking-wider flex items-center gap-1">
                    <X className="w-4 h-4" /> Platform Cons
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-400 font-sans">
                    {competitorA.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-red-400 shrink-0">•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 mt-8 flex justify-between items-center text-xs text-slate-400 font-mono">
              <span>Domain limits:</span>
              <span className="text-white">{competitorA.features.customDomains}</span>
            </div>
          </div>

          {/* Competitor B Details */}
          <div className="glass-card p-8 rounded-[32px] border border-border bg-surface/20 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                <span className="text-3xl">{competitorB.emoji}</span>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest font-mono">PLATFORM ANALYSIS</span>
                  <h3 className="text-2xl font-black text-white uppercase">{competitorB.name}</h3>
                </div>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed font-medium">
                {competitorB.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-green-400 uppercase font-mono tracking-wider flex items-center gap-1">
                    <Check className="w-4 h-4" /> Platform Pros
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-400 font-sans">
                    {competitorB.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-green-400 shrink-0">•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-red-400 uppercase font-mono tracking-wider flex items-center gap-1">
                    <X className="w-4 h-4" /> Platform Cons
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-400 font-sans">
                    {competitorB.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-red-400 shrink-0">•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 mt-8 flex justify-between items-center text-xs text-slate-400 font-mono">
              <span>Domain limits:</span>
              <span className="text-white">{competitorB.features.customDomains}</span>
            </div>
          </div>

        </div>
      </section>

      {/* Why Linktery is the Ultimate Alternative */}
      <section className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="glass-card p-8 md:p-12 border border-emerald-500/20 bg-emerald-950/5 backdrop-blur-md rounded-[32px] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          
          <div className="space-y-4 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-mono font-bold uppercase">
              <TrendingUp className="w-3.5 h-3.5" /> High Performance Solution
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-tight">Why Choose Linktery Instead?</h3>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed font-sans">
              Linktery combines a performance-optimized traffic router with pre-rendered marketing pages. Native-app deep linking can reduce login and navigation friction for supported destinations such as Spotify, YouTube, and Amazon. Actual load time and conversion impact depend on the visitor, network, destination, and campaign setup.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-auto shrink-0">
            <Link to="/register" className="btn-primary-glow text-center text-xs md:text-sm font-bold uppercase tracking-wider py-4 px-6 inline-block">
              Create My Free Page
            </Link>
            <Link to="/pricing" className="px-6 py-4 rounded-xl border border-border text-foreground font-semibold hover:bg-surface-hover text-center text-xs md:text-sm transition-colors">
              View Plans
            </Link>
          </div>

        </div>
      </section>

      {/* Dynamic FAQs */}
      <section className="py-16 px-6 max-w-4xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">Q&A</span>
          <h2 className="text-3xl font-extrabold text-white mt-1 uppercase">Comparison Questions</h2>
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
                <span className="text-sm md:text-base font-sans">{item.question}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${openFaqIndex === index ? "rotate-180" : ""}`} />
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  openFaqIndex === index ? "max-h-[300px] border-t border-border/40" : "max-h-0"
                }`}
              >
                <div className="p-6 text-sm text-slate-300 leading-relaxed bg-slate-900/40">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-6 max-w-4xl mx-auto border-t border-border/40 relative z-10">
        <h2 className="text-2xl font-extrabold text-white uppercase mb-2">Related comparisons</h2>
        <p className="text-sm text-slate-400 mb-6">Pricing and features can change. Verify plan details on each provider's official website before purchasing.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {relatedComparisons.map((comparison) => (
            <Link key={comparison.href} to={comparison.href} className="rounded-xl border border-border bg-surface/30 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-accent/40 hover:text-accent transition-colors">
              {comparison.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
