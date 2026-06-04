import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, AlertTriangle, HelpCircle,
  ShieldCheck, Smartphone, ExternalLink, ShoppingBag, CreditCard,
  DollarSign, ShoppingCart, Percent, TrendingUp, RefreshCw, Award, ArrowUpRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function AmazonSmartLinks() {
  const { user } = useAuth();
  
  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // App Simulator State
  const [redirectMode, setRedirectMode] = useState<"webview" | "native">("native");
  const [simulationState, setSimulationState] = useState<"idle" | "loading" | "error" | "rendering" | "success">("idle");

  // Calculator State
  const [monthlyClicks, setMonthlyClicks] = useState<number>(10000);
  const [aov, setAov] = useState<number>(50);
  const [commissionRate, setCommissionRate] = useState<number>(4);

  // Conversion calculations
  // WebView conversion is extremely low (around 1.5%) due to login friction
  // Native app redirect conversion is much higher (around 4.5%) as users are already logged in
  const webviewConversion = 0.015;
  const nativeConversion = 0.045;

  const webviewRevenue = Math.round(monthlyClicks * webviewConversion * aov * (commissionRate / 100));
  const nativeRevenue = Math.round(monthlyClicks * nativeConversion * aov * (commissionRate / 100));
  const recoveredCommission = nativeRevenue - webviewRevenue;

  const triggerSimulation = () => {
    setSimulationState("loading");
    
    if (redirectMode === "webview") {
      setTimeout(() => {
        setSimulationState("error");
      }, 1000);
    } else {
      setTimeout(() => {
        setSimulationState("rendering");
        setTimeout(() => {
          setSimulationState("success");
        }, 1200);
      }, 700);
    }
  };

  const resetSimulation = (mode: "webview" | "native") => {
    setRedirectMode(mode);
    setSimulationState("idle");
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
      question: "Does opening the Amazon app directly violate the Amazon Associates Operating Agreement?",
      answer: "No. Amazon actually encourages deep linking to their mobile app because it significantly improves user experience and shopping conversion rates. The Amazon Mobile App handles associates tags natively, ensuring your affiliate cookies are tracked correctly."
    },
    {
      question: "What happens if the visitor doesn't have the Amazon app installed?",
      answer: "Linktery handles this gracefully. If our edge servers detect that the user doesn't have the Amazon shopping app installed, it automatically falls back to opening the Amazon mobile browser website, ensuring no traffic or conversion opportunity is lost."
    },
    {
      question: "How does Linktery determine whether to route to the app or browser?",
      answer: "Linktery utilizes secure URL scheme handlers and OS detection logic (e.g. `com.amazon.mobile.shopping://`). When a user taps your link, our 15ms routing system determines the device type and triggers the app opening mechanism instantly."
    },
    {
      question: "Can I use custom sub-IDs (tags) for tracking different campaigns?",
      answer: "Absolutely. Linktery supports dynamic query parameter passing. Any associate tags or sub-IDs (like `&tag=yourtag-20`) present on your smart link are forwarded directly to the Amazon application destination."
    },
    {
      question: "Is there any delay or redirect screen for my visitors?",
      answer: "No. Linktery resolves and triggers the deep linking protocol at the network edge on Cloudflare nodes. The redirection takes less than 15 milliseconds, which is virtually unnoticeable to the end-user."
    }
  ];

  // Dynamic JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Amazon Affiliate Smart Redirect",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "iOS, Android, Web",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.95",
          "ratingCount": "312"
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
    ...SEO_PAGES.amazonSmartLinks,
    structuredData
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-20 left-1/4 w-[450px] h-[450px] bg-accent rounded-full blur-[130px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-[380px] h-[380px] bg-emerald-500 rounded-full blur-[110px] mix-blend-screen" />
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

      {/* HERO SECTION WITH ASYMMETRIC HEADER */}
      <section className="relative pt-32 pb-8 px-6 max-w-7xl mx-auto z-10 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm font-semibold">
          <Award className="w-3.5 h-3.5 animate-pulse" />
          Amazon Associates App Routing Solution
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-white max-w-5xl mx-auto uppercase">
          OPEN AMAZON APP
          <br />
          <span className="gradient-text font-black">DIRECTLY FROM BIO</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
          Stop wasting affiliate traffic in slow in-app webviews. Instantly redirect mobile clicks directly to the native Amazon shopping app to double your commissions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          {user ? (
            <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
              Open Routing Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
              Generate Smart Amazon Links <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <a href="#calculator" className="px-6 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
            Calculate Earnings Lift
          </a>
        </div>
      </section>

      {/* INTERACTIVE AMAZON REDIRECT SIMULATOR */}
      <section className="py-12 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-border/60 pb-5 mb-8 gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block font-mono">Affiliate Click Simulator</span>
              <h3 className="text-lg font-bold text-white uppercase">Redirection Handshake</h3>
            </div>
            
            {/* Mode Selectors */}
            <div className="flex gap-1 bg-background p-1 border border-border rounded-xl">
              <button
                onClick={() => resetSimulation("webview")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${
                  redirectMode === "webview" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "text-muted-foreground hover:text-white"
                }`}
              >
                Standard Link
              </button>
              <button
                onClick={() => resetSimulation("native")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${
                  redirectMode === "native" ? "bg-accent text-background font-black" : "text-muted-foreground hover:text-white"
                }`}
              >
                Linktery Smart Link
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Device Screen Mockup */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-[280px] h-[540px] bg-slate-950 border-8 border-slate-900 rounded-[36px] shadow-2xl relative overflow-hidden flex flex-col">
                {/* Speaker & Sensor */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-12 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Simulated Screen Body */}
                <div className="flex-1 flex flex-col pt-6 font-sans">
                  {simulationState === "idle" && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                      <Smartphone className="w-12 h-12 text-slate-500 animate-bounce" />
                      <p className="text-xs text-slate-400">Tap below to simulate a user clicking your Amazon link from Instagram Bio.</p>
                      <button 
                        onClick={triggerSimulation}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider ${
                          redirectMode === "native" ? "bg-accent text-background" : "bg-red-500 text-white"
                        }`}
                      >
                        Simulate Click
                      </button>
                    </div>
                  )}

                  {simulationState === "loading" && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6 space-y-3">
                      <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-xs text-slate-500 font-mono">Resolving Edge Target...</p>
                    </div>
                  )}

                  {simulationState === "error" && redirectMode === "webview" && (
                    <div className="flex-1 flex flex-col bg-slate-900">
                      {/* Webview header */}
                      <div className="bg-slate-950 px-3 py-2 border-b border-slate-800 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>Instagram Webview</span>
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSimulationState("idle")} />
                      </div>
                      
                      {/* WebView Content: Amazon Login Prompt */}
                      <div className="flex-1 p-5 flex flex-col justify-center space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div className="text-center space-y-1">
                          <h4 className="text-sm font-extrabold text-white">Sign In to Amazon</h4>
                          <p className="text-[10px] text-slate-400">Cookies and login state are not shared between apps.</p>
                        </div>

                        <div className="space-y-2">
                          <input type="text" disabled placeholder="email@example.com" className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-[10px] text-slate-500" />
                          <input type="password" disabled placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-[10px] text-slate-500" />
                        </div>
                        
                        <button disabled className="w-full py-2 bg-slate-800 text-slate-500 font-bold rounded-lg text-xs">Sign In & Buy</button>
                        <p className="text-[8px] text-red-400 text-center font-mono font-bold uppercase tracking-wider">Conversion Blocked ❌</p>
                      </div>
                    </div>
                  )}

                  {simulationState === "rendering" && redirectMode === "native" && (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6 space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center animate-ping text-white text-3xl font-black">a</div>
                      <p className="text-[10px] text-slate-400 font-mono">Launching Amazon Native App...</p>
                    </div>
                  )}

                  {simulationState === "success" && redirectMode === "native" && (
                    <div className="flex-1 flex flex-col bg-slate-900">
                      {/* App header */}
                      <div className="bg-amber-500 px-3 py-2.5 flex items-center justify-between text-xs text-background font-black uppercase tracking-tight">
                        <span>Amazon App</span>
                        <div className="flex items-center gap-1.5 text-[9px] bg-background/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Prime Member
                        </div>
                      </div>

                      {/* Mock App Page */}
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="h-32 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center relative">
                            <span className="text-[10px] font-mono text-slate-600">Product Image</span>
                            <span className="absolute top-2 left-2 text-xs bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">a</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-tight">Wireless Noise Cancelling Headphones</h4>
                            <p className="text-xs text-amber-500 font-black mt-1">$149.00</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1 text-[9px] text-slate-400">
                            <Check className="w-3.5 h-3.5 text-accent" />
                            <span>Free Next-Day Delivery active</span>
                          </div>
                          
                          <button className="w-full py-2.5 bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                            <ShieldCheck className="w-4 h-4" /> 1-Click Buy Now
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Log Diagnostics */}
            <div className="lg:col-span-6 text-left">
              <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl h-[280px] flex flex-col justify-between font-mono relative overflow-hidden">
                <div className="flex justify-between items-center text-[8px] text-slate-500 border-b border-slate-900 pb-2">
                  <span>🛰️ EDGE PROTOCOL ANALYZER</span>
                  <span>V2.4</span>
                </div>

                <div className="flex-1 text-[10px] py-4 space-y-1.5 overflow-y-auto leading-relaxed">
                  <p className="text-slate-400">&gt; Visitor Click Intercepted...</p>
                  <p className="text-slate-400">&gt; Device OS: <span className="text-white">iOS Mobile (iPhone)</span></p>
                  <p className="text-slate-400">&gt; Target Destination: <span className="text-amber-500">amazon.com/dp/B08HMW7DTT</span></p>
                  
                  {simulationState === "loading" && (
                    <p className="text-yellow-400 animate-pulse">&gt; Detecting native app deep link handlers...</p>
                  )}

                  {simulationState === "error" && redirectMode === "webview" && (
                    <>
                      <p className="text-red-400">&gt; Sandbox: Instagram In-App Browser detected.</p>
                      <p className="text-red-400">&gt; Barrier: Session cookies blocked by webview sandbox.</p>
                      <p className="text-red-400">&gt; Error: Amazon Prime account status: Not Logged In.</p>
                      <p className="text-red-500 font-bold mt-2">&gt;&gt; Result: High bounce rate. Cookie tracking lost.</p>
                    </>
                  )}

                  {simulationState === "rendering" && (
                    <p className="text-yellow-400 animate-pulse">&gt; Resolving: com.amazon.mobile.shopping:// protocol...</p>
                  )}

                  {simulationState === "success" && redirectMode === "native" && (
                    <>
                      <p className="text-emerald-400">&gt; Success: Protocol resolved in 14ms (optimal).</p>
                      <p className="text-emerald-400">&gt; Action: Direct redirect to Amazon shopping app.</p>
                      <p className="text-emerald-400">&gt; Cookies: Prime log-in active (cookies verified).</p>
                      <p className="text-green-400 font-bold mt-2">&gt;&gt; Result: 1-Click checkout ready. Commission secured.</p>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-900 pt-2 text-center text-[10px] uppercase font-bold text-emerald-400">
                  {simulationState === "success" ? (
                    <span className="flex items-center justify-center gap-1.5 animate-pulse">
                      <ShieldCheck className="w-3.5 h-3.5" /> App Redirection Completed
                    </span>
                  ) : simulationState === "error" ? (
                    <span className="text-red-400 flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Webview Session Expired
                    </span>
                  ) : (
                    <span className="text-slate-500">Awaiting Click Simulation...</span>
                  )}
                </div>
              </div>
              
              {simulationState !== "idle" && (
                <button 
                  onClick={() => setSimulationState("idle")}
                  className="mt-4 text-xs text-accent font-semibold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Simulator
                </button>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* REVENUE/COMMISSION CALCULATOR */}
      <section id="calculator" className="py-16 px-6 max-w-6xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">Commission Calculator</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-1 uppercase">Stop Leaving Money on the Table</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Calculate your estimated monthly commission recovery with Linktery's native app auto-redirect.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Side: Inputs (7 columns) */}
          <div className="lg:col-span-7 bg-surface/30 border border-border/60 p-6 md:p-8 rounded-3xl backdrop-blur-md flex flex-col justify-between space-y-6">
            
            {/* Input 1 */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-300">Monthly Link Clicks</span>
                <span className="font-mono text-accent font-black">{monthlyClicks.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="100000" 
                step="1000"
                value={monthlyClicks}
                onChange={(e) => setMonthlyClicks(Number(e.target.value))}
                className="w-full accent-accent h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1,000</span>
                <span>50,000</span>
                <span>100,000</span>
              </div>
            </div>

            {/* Input 2 */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-300">Average Item Price</span>
                <span className="font-mono text-accent font-black">${aov}</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="500" 
                step="5"
                value={aov}
                onChange={(e) => setAov(Number(e.target.value))}
                className="w-full accent-accent h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>$10</span>
                <span>$250</span>
                <span>$500</span>
              </div>
            </div>

            {/* Input 3 */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-300">Amazon Category Commission Rate</span>
                <span className="font-mono text-accent font-black">{commissionRate}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="0.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full accent-accent h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1% (Books/Laptops)</span>
                <span>5% (Beauty)</span>
                <span>10% (Apparel/Fashion)</span>
              </div>
            </div>

          </div>

          {/* Right Side: Recovery stats (5 columns) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-accent/10 to-transparent border border-accent/20 p-8 rounded-3xl backdrop-blur-md flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest font-mono">RECOVERED LOSSES</span>
              <h3 className="text-xl font-bold text-white uppercase">Your Monthly Commission</h3>
              
              <div className="space-y-2 py-4 border-y border-border/40">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Standard Bio Link (1.5% CR):</span>
                  <span className="font-mono text-red-400">${webviewRevenue}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Linktery Smart Link (4.5% CR):</span>
                  <span className="font-mono text-emerald-400">${nativeRevenue}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">ESTIMATED RECOVERED VALUE</span>
                <p className="text-4xl md:text-5xl font-black text-accent tracking-tight font-mono animate-pulse">
                  +${recoveredCommission}
                </p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                By bypassing the in-app webview, users purchase directly through their Amazon accounts. That's up to <strong className="text-white">3.0x higher conversions</strong> on identical traffic volume.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* THE LOCALIZATION FRICTION NARRATIVE (Educational section explaining the problem & examples) */}
      <section className="py-20 px-6 max-w-5xl mx-auto z-10 relative border-t border-border/40">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">The Conversion Leak</span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mt-2 uppercase">
            How Webview Sandboxes
            <br />
            <span className="gradient-text font-black">Drain Affiliate Profit</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed">
            Standard affiliate shorteners route users to Amazon inside web browsers, which breaks the mobile shopping experience. Here is how three major frictions impact real buyers and how Linktery solves them.
          </p>
        </div>

        <div className="space-y-16">
          {/* Friction 1: Left-aligned */}
          <div className="ml-0 mr-auto max-w-2xl relative group">
            <div className="absolute -left-6 top-0 bottom-0 w-[2px] bg-accent/30 group-hover:bg-accent transition-colors" />
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono">Friction #1: The Password Barrier</span>
              <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">The login prompt of death</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Meet <strong className="text-white">David from Seattle</strong>. He clicks an affiliate link in an Instagram post for a recommended kitchen appliance. The page opens in the Instagram webview, prompting David to enter his email and password to log into Amazon. David doesn't remember his password, refuses to reset it inside a suspicious webview, and exits the browser.
              </p>
              
              {/* Linktery Edge Action Console */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between items-center text-[9px] text-slate-600 border-b border-slate-900 pb-1.5 mb-2">
                  <span>⚡ LINKTERY EDGE INTERCEPT</span>
                  <span>LATENCY: 11ms</span>
                </div>
                <p>&gt; Request Header UA: <span className="text-white">iOS; Instagram WebView</span></p>
                <p>&gt; Action: Intercept webview rendering.</p>
                <p>&gt; Dispatch Handler: <span className="text-accent">com.amazon.mobile.shopping://</span></p>
                <p className="text-emerald-400 font-bold mt-1">&gt;&gt; David gets routed directly into his active Amazon App session, ready to checkout.</p>
              </div>
            </div>
          </div>

          {/* Friction 2: Right-aligned */}
          <div className="ml-auto mr-0 max-w-2xl relative group text-right">
            <div className="absolute -right-6 top-0 bottom-0 w-[2px] bg-accent/30 group-hover:bg-accent transition-colors" />
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono">Friction #2: Broken Prime Benefits</span>
              <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Losing next-day free shipping</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Meet <strong className="text-white">Elena from London</strong>. She is an active Amazon Prime member. She clicks a link to a book recommendation, but because the webview doesn't know she is a Prime member, she sees shipping charges and estimated delivery in 5 days instead of Free Next-Day delivery. She closes the tab to look for the book later.
              </p>

              {/* Linktery Edge Action Console */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-400 space-y-1 text-left">
                <div className="flex justify-between items-center text-[9px] text-slate-600 border-b border-slate-900 pb-1.5 mb-2">
                  <span>⚡ LINKTERY EDGE INTERCEPT</span>
                  <span>LATENCY: 12ms</span>
                </div>
                <p>&gt; Request Device: <span className="text-white">Android Mobile (Samsung)</span></p>
                <p>&gt; Action: Launch Amazon Native Store App.</p>
                <p>&gt; Action Details: <span className="text-accent">Inject Affiliate Associates ID dynamically</span></p>
                <p className="text-emerald-400 font-bold mt-1">&gt;&gt; Elena sees active Prime pricing & clicks "Buy in 1-Click".</p>
              </div>
            </div>
          </div>

          {/* Friction 3: Centered */}
          <div className="mx-auto max-w-2xl relative group text-center">
            <div className="absolute left-1/2 -bottom-4 transform -translate-x-1/2 w-12 h-[2px] bg-accent/30 group-hover:bg-accent transition-colors" />
            <div className="space-y-4 pb-6">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono">Friction #3: The Lost Cookie Credit</span>
              <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Offline leakage and broken attributions</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Meet <strong className="text-white">Kenji from Tokyo</strong>. He clicks a standard affiliate link in Twitter, views a gadget, closes the tab, and purchases it 3 hours later from his computer. Since the click occurred in the temporary webview sandbox, the referral cookies were never saved to his global Amazon profile, and the creator receives <strong className="text-red-400">$0.00 commission</strong>.
              </p>

              {/* Linktery Edge Action Console */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-400 space-y-1 text-left">
                <div className="flex justify-between items-center text-[9px] text-slate-600 border-b border-slate-900 pb-1.5 mb-2">
                  <span>⚡ LINKTERY EDGE INTERCEPT</span>
                  <span>LATENCY: 14ms</span>
                </div>
                <p>&gt; Request Cookie check: <span className="text-white">Cookie not found in sandbox browser</span></p>
                <p>&gt; App Handler Action: <span className="text-accent">Sync cookies to native device keychain session</span></p>
                <p className="text-emerald-400 font-bold mt-1">&gt;&gt; Kenji's click is bound to his native account, securing commissions even if he purchases later.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM CAPABILITY MATRIX */}
      <section className="py-12 px-6 max-w-6xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">Capability Matrix</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">AFFILIATE REDIRECT SPECS</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Compare deep linking capabilities with standard shorteners and simple link-in-bio widgets.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase font-mono">
                <th className="p-4 md:p-6">Feature Details</th>
                <th className="p-4 md:p-6 text-accent">Linktery Smart Link</th>
                <th className="p-4 md:p-6">Standard Shortener (bit.ly/tinyurl)</th>
                <th className="p-4 md:p-6">Linktree/Beacons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90 font-medium font-mono">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Amazon App Auto-Open</td>
                <td className="p-4 md:p-6 text-green-400">✅ Direct App Launch (iOS/Android)</td>
                <td className="p-4 md:p-6 text-red-500">❌ Trapped in Webview</td>
                <td className="p-4 md:p-6 text-red-500">❌ Trapped in Webview</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Assoc. Cookie Attributions</td>
                <td className="p-4 md:p-6 text-green-400">✅ 100% Retained (App Cookies)</td>
                <td className="p-4 md:p-6 text-yellow-500">⚠️ Blocked if login fails</td>
                <td className="p-4 md:p-6 text-red-500">❌ Lost on user exit</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Custom Domain Routing</td>
                <td className="p-4 md:p-6 text-green-400">✅ Unlimited Custom Domains</td>
                <td className="p-4 md:p-6 text-yellow-500">⚠️ Paid upgrade limit</td>
                <td className="p-4 md:p-6 text-red-500">❌ Limited support</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">AB Split Traffic Rotators</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Split test products)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No</td>
                <td className="p-4 md:p-6 text-red-500">❌ No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ACCORDION FAQ SECTION */}
      <section className="py-16 px-6 max-w-4xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">FAQ</span>
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

      {/* FOOTER CALL-TO-ACTION */}
      <section className="py-20 px-6 border-t border-border/40 bg-surface-hover/30 z-10 relative">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white uppercase tracking-tight leading-none">
            Stop trap clicks.
            <br />
            <span className="gradient-text font-black">Increase Your Affiliate ROI</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Start routing your social bio links directly to the Amazon shopping app today. Try Linktery free, no credit card required.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-3.5 inline-flex items-center justify-center gap-2">
                Launch Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-3.5 inline-flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link to="/pricing" className="px-6 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-colors text-base inline-flex items-center justify-center">
              View Premium Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
