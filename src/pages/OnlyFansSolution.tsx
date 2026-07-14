import { useState } from "react";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, AlertTriangle, HelpCircle,
  Play, ShieldCheck, Target, HeartCrack, ChevronRight
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

export default function OnlyFansSolution() {
  const { user } = useAuth();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Risk Calculator State
  const [platform, setPlatform] = useState<"instagram" | "tiktok" | "other">("instagram");
  const [customDomain, setCustomDomain] = useState<boolean>(false);
  const [cloaking, setCloaking] = useState<boolean>(false);
  const [riskCalculated, setRiskCalculated] = useState<boolean>(false);
  const [riskPercent, setRiskPercent] = useState<number>(0);
  const [riskLevel, setRiskLevel] = useState<"Needs work" | "Basic" | "Improved" | "Configured">("Needs work");

  const calculateRisk = () => {
    let score = 0;
    if (customDomain && cloaking) {
      score = 100;
    } else if (customDomain && !cloaking) {
      score = 60;
    } else if (!customDomain && cloaking) {
      score = 40;
    }

    setRiskPercent(score);
    if (score === 100) {
      setRiskLevel("Configured");
    } else if (score >= 60) {
      setRiskLevel("Improved");
    } else if (score > 0) {
      setRiskLevel("Basic");
    } else {
      setRiskLevel("Needs work");
    }
    setRiskCalculated(true);
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
      question: "How do I safely share an OnlyFans link on Instagram bio in 2026?",
      answer: "Use a clear, branded link-in-bio page and ensure both the page and its destinations comply with the social platform's current rules. A custom domain can improve brand consistency, but no tool can guarantee protection from moderation or shadowbans."
    },
    {
      question: "What does the traffic-quality filter do?",
      answer: "Linktery's traffic-quality filter evaluates request signals to identify obvious bots and automated abuse. Suspicious automation can be blocked or excluded from analytics. It should not be used to show reviewers a different destination from the one ordinary visitors receive."
    },
    {
      question: "Why do standard link-in-bio tools get banned or flag links?",
      answer: "Popular bio-link platforms (like Linktree or Beacons) host millions of profiles under shared root domains. If some users violate social media guidelines, algorithms will flag the entire domain, causing all links on that platform to trigger warnings or account bans. Using a private custom domain completely isolates your reputation from other creators."
    },
    {
      question: "How does the Instagram in-app browser affect OnlyFans sales?",
      answer: "Instagram's built-in webview keeps users logged out of native apps. If they click to subscribe to your OnlyFans, they must manually enter their passwords and billing data on the web browser. Linktery's Deep Linking bypasses this by forcing the native safari/chrome application to launch on the user's phone, preserving active cookies and user logins to boost subscribe rates."
    },
    {
      question: "Can I use multiple OnlyFans or fans links on my profile?",
      answer: "Yes. Linktery allows you to build custom layout buttons, toggle link visibility, add preset icons, and customize themes to create a clean, organized portal containing links to your OnlyFans, Fansly, X (Twitter), and digital shops."
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

  // Call the SEO hook with the registered configuration and dynamic structured data
  useSeo({
    ...SEO_PAGES.onlyfansSolution,
    structuredData
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">

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
            <ShieldCheck className="w-3.5 h-3.5" />
            Safe Biolink & Traffic Protection System
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            How to Safely Share OnlyFans Links
            <br />
            <span className="gradient-text">on Instagram & TikTok without Ban</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Build a clear branded landing page, reduce in-app browser friction, and organize your creator destinations under a custom domain.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Secure Your Link Free <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#calculator" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              Check Your Setup
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
              <Layers className="w-20 h-20 text-accent" />
            </div>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent" /> The Shared Domain Trap
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you use a generic link-in-bio URL (like `linktr.ee/username`), you are sharing domain reputation with millions of other accounts. If only a few creators post spam or flag-worthy content on that domain, social networks will blacklist the entire root address.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2.5">
              Mapping your own custom domain (for example, `links.mybrand.com`) gives you a consistent brand identity and separates your URL from a shared link-provider hostname. It does not guarantee approval by any social platform.
            </p>
          </div>

          {/* Webview Warning Box */}
          <div className="glass-card p-6 rounded-2xl border border-red-500/20 bg-red-500/5 group hover:border-red-500/35 transition-all duration-300">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" /> Account Suspension Risks
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Social platforms may inspect profile links and destinations against their current policies. Creators should make the landing page purpose clear and keep every destination compliant with the platform where the link is shared.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2.5">
              Linktery's traffic-quality filter can block obvious automated abuse and keep bot traffic out of human analytics. It must not be used to present platform reviewers with a different destination.
            </p>
          </div>
        </div>

        {/* Right Column: Case Studies & Scenarios with Interactive Risk Calculator (7 columns) */}
        <div id="calculator" className="lg:col-span-7 glass-card p-6 md:p-8 rounded-2xl border border-border bg-surface/40 backdrop-blur-md self-stretch flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Biolink Setup Checklist</h2>
                <p className="text-xs text-muted-foreground">Review brand and traffic-quality options. This is not a platform approval guarantee.</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-accent animate-pulse" />
            </div>

            {/* Interactive Form Controls */}
            <div className="space-y-6">
              {/* Platform Selector */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Target Platform</label>
                <div className="flex flex-wrap gap-2.5">
                  <button 
                    onClick={() => { setPlatform("instagram"); setRiskCalculated(false); }}
                    className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 ${
                      platform === "instagram" ? "bg-accent text-background scale-105" : "border border-border text-muted-foreground hover:bg-surface-hover"
                    }`}
                  >
                    Instagram
                  </button>
                  <button 
                    onClick={() => { setPlatform("tiktok"); setRiskCalculated(false); }}
                    className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 ${
                      platform === "tiktok" ? "bg-accent text-background scale-105" : "border border-border text-muted-foreground hover:bg-surface-hover"
                    }`}
                  >
                    TikTok
                  </button>
                  <button 
                    onClick={() => { setPlatform("other"); setRiskCalculated(false); }}
                    className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 ${
                      platform === "other" ? "bg-accent text-background scale-105" : "border border-border text-muted-foreground hover:bg-surface-hover"
                    }`}
                  >
                    Other (X/Twitter, Reddit)
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Custom Domain Mapped?</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">e.g., links.yourname.com</p>
                  </div>
                  <button 
                    onClick={() => { setCustomDomain(!customDomain); setRiskCalculated(false); }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${customDomain ? 'bg-accent' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${customDomain ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Traffic Filter Active?</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Exclude obvious automation</p>
                  </div>
                  <button 
                    onClick={() => { setCloaking(!cloaking); setRiskCalculated(false); }}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${cloaking ? 'bg-accent' : 'bg-border'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${cloaking ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={calculateRisk}
                className="w-full py-3 rounded-xl bg-accent text-background font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent/10"
              >
                Review Setup
              </button>

              {/* Calculator Output */}
              {riskCalculated && (
                <div className="animate-fade-in p-5 rounded-2xl border border-border/80 bg-background/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Setup completeness</p>
                      <h3 className={`text-2xl font-black mt-1 ${
                        riskLevel === "Needs work" ? "text-red-500" :
                        riskLevel === "Basic" ? "text-orange-400" :
                        riskLevel === "Improved" ? "text-amber-300" : "text-emerald-400 font-bold"
                      }`}>
                        {riskLevel} ({riskPercent}%)
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</p>
                      <p className="text-xs text-foreground/90 font-medium mt-1">
                        {riskLevel === "Needs work" && "Add clear branding and review policies"}
                        {riskLevel === "Basic" && "Traffic filtering configured"}
                        {riskLevel === "Improved" && "Custom domain configured"}
                        {riskLevel === "Configured" && "Brand and traffic settings configured"}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {riskLevel === "Needs work" && (
                      <p>
                        Start with a clear landing page, check the destination policies for {platform}, and consider a branded domain. No setup can guarantee moderation outcomes.
                      </p>
                    )}
                    {riskLevel === "Improved" && (
                      <p>
                        Your custom domain improves brand consistency. Enable traffic filtering if you also want obvious automation separated from human analytics.
                      </p>
                    )}
                    {riskLevel === "Basic" && (
                      <p>
                        Automated traffic is separated from human reporting. A custom domain can add stronger brand identity, but platform policies still apply.
                      </p>
                    )}
                    {riskLevel === "Configured" && (
                      <p>
                        Your branded domain and traffic-quality settings are configured. Keep the same policy-compliant destination experience for ordinary visitors and platform reviewers.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 mt-6 flex justify-end">
            <Link to="/register" className="text-xs font-bold text-accent hover:text-white transition-colors flex items-center gap-1 group">
              Get Safe Setup Free <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

      </section>

      {/* Comparison Matrix Section */}
      <section className="py-12 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Biolink Security Features Comparison</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Compare custom-domain, traffic-filtering, and deep-linking options. Social-platform approval is never guaranteed.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase">
                <th className="p-4 md:p-6">Feature comparison</th>
                <th className="p-4 md:p-6 text-accent">Linktery (Our Pick)</th>
                <th className="p-4 md:p-6">Linktree</th>
                <th className="p-4 md:p-6">Beacons.ai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Private Custom Domain Mapping</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Isolated domain reputation)</td>
                <td className="p-4 md:p-6">Requires $10/mo plan</td>
                <td className="p-4 md:p-6">Requires $10/mo plan</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Automated Traffic Filtering</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Pro/Agency tiers)</td>
                <td className="p-4 md:p-6 text-red-500">❌ Not Supported</td>
                <td className="p-4 md:p-6 text-red-500">❌ Not Supported</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">App Deep Linking (webview bypass)</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Pro/Agency tiers)</td>
                <td className="p-4 md:p-6 text-red-500">❌ Not Supported</td>
                <td className="p-4 md:p-6 text-red-500">❌ Not Supported</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Adult Link Support</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Supported & Safe</td>
                <td className="p-4 md:p-6 text-orange-400">⚠️ Strict (often banned)</td>
                <td className="p-4 md:p-6 text-orange-400">⚠️ Medium (often flags links)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature Deep Dive: Why Linktery Works */}
      <section className="py-16 px-6 bg-surface/30 border-y border-border/60 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Linktery Link Safety Suite</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              Why professional creators choose Linktery to route their traffic safely.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Automated Traffic Filtering</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Identify high-confidence automated traffic and exclude it from human analytics or block it. Campaign destinations remain consistent and policy-compliant for legitimate visitors and reviewers.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Custom Domain Protection</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Map your own custom subdomain (e.g., bio.yourname.com) directly to Linktery. This removes you from shared platform footprints, building your own search engine domain reputation and authority.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Native Deep Links</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bypass the conversion-killing in-app webview. Ensure your clicks directly open native phone browsers (Safari/Chrome), preserving active cookies and user logins so they can subscribe instantly.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Real-Time Traffic Telemetry</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track dynamic data points (referrers, geo locations, operating systems, click events) to understand your audience and optimize your marketing budget.
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
            <HelpCircle className="w-8 h-8 text-accent" /> Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Detailed security FAQs for adult creators, influencers, and digital brands.
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
            Secure Your Bio Link Conversion Rates Now
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Move to Linktery for traffic-quality filtering, custom domain branding, and native mobile deep-linking.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Get Secured Setup Free <ArrowRight className="w-5 h-5" />
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
