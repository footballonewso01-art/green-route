import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, AlertTriangle, HelpCircle,
  Play, ShieldCheck, Smartphone, ExternalLink,
  ShoppingBag, CreditCard, Gift, ShieldX, ChevronRight, Apple
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

export default function DigitalProductsSolution() {
  const { user } = useAuth();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Interactive Simulator State
  const [activeTab, setActiveTab] = useState<"standard" | "smart">("smart");
  const [simulatorState, setSimulatorState] = useState<"idle" | "loading" | "success" | "webview">("idle");
  const [simulatedPlatform, setSimulatedPlatform] = useState<"gumroad" | "lemonsqueezy" | "buymeacoffee">("gumroad");

  // Calculator State
  const [monthlyClicks, setMonthlyClicks] = useState<number>(5000);
  const [productPrice, setProductPrice] = useState<number>(29);

  const runSimulation = () => {
    setSimulatorState("loading");
    
    if (activeTab === "standard") {
      setTimeout(() => {
        setSimulatorState("webview"); // Opens slow in-app webview without Apple Pay
      }, 1200);
    } else {
      setTimeout(() => {
        setSimulatorState("success"); // Redirects to system browser with Apple Pay
      }, 800);
    }
  };

  const resetSimulator = (tab: "standard" | "smart") => {
    setActiveTab(tab);
    setSimulatorState("idle");
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
      question: "Why do in-app browsers hurt my digital product sales?",
      answer: "When a user clicks your Gumroad or Lemon Squeezy link inside Instagram or TikTok, the app opens the page in an in-app webview container. This sandboxed browser blocks access to secure hardware APIs, which completely disables Apple Pay and Google Pay. Additionally, users are logged out of their standard browsers, forcing them to manually type credit card credentials, which triggers up to 80% checkout abandonment."
    },
    {
      question: "How does Linktery solve the Apple Pay / Google Pay block?",
      answer: "Linktery uses device-level redirection. When a customer clicks your short link, our servers detect the mobile device and automatically launch the destination checkout directly in their native system browser (Safari for iOS, Chrome for Android). This immediately restores access to secure hardware APIs, making Apple Pay and Google Pay available for instant purchase."
    },
    {
      question: "Will social platforms flag my domain for using Linktery?",
      answer: "No. Linktery operates with high-reputation, secure redirect headers and clean domains. Plus, you can map your own custom subdomain (e.g. shop.yourname.com), isolating your brand reputation and bypassing shared platform flags completely."
    },
    {
      question: "Does this support subscription products and digital downloads?",
      answer: "Yes. It supports any standard web URL checkout, including Gumroad single products, Lemon Squeezy subscription checkouts, Buy Me a Coffee support pages, and Shopify checkouts."
    },
    {
      question: "Can I track exactly where my sales are originating?",
      answer: "Absolutely. Linktery's dashboard provides detailed conversion telemetry. You can track total clicks, geo-locations, devices, and deep-link click triggers in real-time."
    }
  ];

  // Dynamic JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Checkout Redirection Suite",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "iOS, Android, Web",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "194"
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

  // Call the SEO hook
  useSeo({
    ...SEO_PAGES.digitalProductsSmartLinks,
    structuredData
  });

  // Calculator logic
  const standardConversion = 0.03; // ~3% conversion rate in-app due to friction
  const smartConversion = 0.18; // ~18% conversion rate in system browser
  
  const standardSales = Math.round(monthlyClicks * standardConversion);
  const smartSales = Math.round(monthlyClicks * smartConversion);
  const additionalSales = smartSales - standardSales;
  const lostRevenue = Math.round(additionalSales * productPrice);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background Decorative Gradients */}
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-6 animate-fade-in">
            <ShoppingBag className="w-3.5 h-3.5 text-accent" />
            Social E-Commerce Checkout Protection
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Stop Losing Digital Sales.
            <br />
            Enable <span className="gradient-text">One-Click Checkouts</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            In-app browsers inside Instagram & TikTok block Apple Pay and Google Pay. Linktery bypasses these frames, launching checkouts in native browsers where customers can buy instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Maximize Sales Free <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#simulator" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              Watch Interactive Demo
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Mobile Simulator Section */}
      <section id="simulator" className="py-12 px-6 max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Explaining Checkout Friction */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="space-y-2">
            <span className="text-red-500 text-xs font-bold uppercase tracking-widest block">The Checkout friction trap</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Why In-App Webviews Kill Digital Sales
            </h2>
          </div>
          <div className="space-y-4 text-muted-foreground text-sm md:text-base leading-relaxed font-medium">
            <p>
              When a follower clicks your Gumroad, Lemon Squeezy, or Buy Me a Coffee link on Instagram or TikTok, the app opens it inside its private webview.
            </p>
            <p className="border-l-2 border-red-500 pl-4 py-2 text-slate-100 font-medium bg-red-500/5 rounded-r-lg">
              <strong>Disabled Hardware APIs:</strong> These webviews are sandboxed, meaning **Apple Pay & Google Pay are completely disabled**. Your fans must manually type their credit card numbers, billing addresses, and emails.
            </p>
            <p>
              This massive friction causes over 80% of buyers to abandon the purchase.
            </p>
            <p>
              Linktery redirects mobile checkouts directly into native system browsers (Safari for iOS, Chrome for Android) where hardware wallets are active and payment credentials are auto-filled.
            </p>
          </div>
        </div>

        {/* Right Side: Cohesive Phone Simulator */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-border bg-surface/40 backdrop-blur-md w-full max-w-lg">
            
            {/* Simulation Config Tabs */}
            <div className="flex justify-between items-center mb-6 border-b border-border/60 pb-4">
              <div>
                <h3 className="font-bold text-white text-base">Select Redirect Mode</h3>
                <p className="text-[11px] text-muted-foreground">Toggle to compare payment checkouts</p>
              </div>
              <div className="flex gap-1.5 bg-background p-1 border border-border rounded-xl">
                <button 
                  onClick={() => resetSimulator("standard")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "standard" ? "bg-red-600 text-white" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Standard Link
                </button>
                <button 
                  onClick={() => resetSimulator("smart")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === "smart" ? "bg-accent text-background" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Linktery Smart Link
                </button>
              </div>
            </div>

            {/* Target App Platform */}
            <div className="flex items-center gap-3 mb-6 bg-background/50 p-3 rounded-xl border border-border/80">
              <span className="text-xs font-bold text-muted-foreground uppercase">Checkout platform:</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setSimulatedPlatform("gumroad"); setSimulatorState("idle"); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${simulatedPlatform === "gumroad" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-surface-hover text-muted-foreground"}`}
                >
                  Gumroad
                </button>
                <button 
                  onClick={() => { setSimulatedPlatform("lemonsqueezy"); setSimulatorState("idle"); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${simulatedPlatform === "lemonsqueezy" ? "bg-pink-600/20 text-pink-400 border border-pink-500/30" : "bg-surface-hover text-muted-foreground"}`}
                >
                  Lemon Squeezy
                </button>
                <button 
                  onClick={() => { setSimulatedPlatform("buymeacoffee"); setSimulatorState("idle"); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${simulatedPlatform === "buymeacoffee" ? "bg-yellow-600/20 text-yellow-400 border border-yellow-500/30" : "bg-surface-hover text-muted-foreground"}`}
                >
                  Coffee
                </button>
              </div>
            </div>

            {/* Simulator Mobile Screen Container */}
            <div className="border-4 border-slate-900 bg-slate-950 p-3.5 rounded-[32px] w-full max-w-[280px] h-[480px] mx-auto shadow-2xl relative overflow-hidden flex flex-col justify-between">
              {/* Speaker & Sensor */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-900 rounded-b-xl flex items-center justify-center z-20">
                <div className="w-10 h-1 bg-slate-800 rounded-full" />
              </div>

              {/* Status bar */}
              <div className="flex justify-between items-center px-4 pt-1.5 text-[9px] font-mono text-slate-500 z-10">
                <span>09:41 AM</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-4 h-2 bg-slate-700 rounded-sm" />
                </div>
              </div>

              {/* Interactive Screen Display */}
              <div className="bg-slate-900 flex-1 rounded-[22px] m-1 overflow-hidden flex flex-col justify-between relative border border-slate-800">
                {/* State: Idle */}
                {simulatorState === "idle" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4">
                    <ShoppingBag className="w-12 h-12 text-accent animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-white text-xs font-bold">Social Buy Link</p>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Click the checkout URL below to simulate purchase:
                      </p>
                    </div>
                    <button 
                      onClick={runSimulation}
                      className={`w-full py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 ${
                        activeTab === "standard" 
                          ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700" 
                          : "bg-accent text-background border-accent hover:opacity-90 font-extrabold"
                      }`}
                    >
                      {activeTab === "standard" ? "gum.co/yourproduct" : "linktery.com/checkout"} <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* State: Loading */}
                {simulatorState === "loading" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-3">
                    <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 font-mono">Launching secure routing...</p>
                  </div>
                )}

                {/* State: Webview (Missing Apple Pay - Standard Links) */}
                {simulatorState === "webview" && (
                  <div className="flex-1 flex flex-col justify-between bg-slate-950 text-slate-200 p-3 animate-slide-up">
                    {/* Fake Webview browser header */}
                    <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between text-[8px] text-slate-500 font-mono">
                      <span>🔒 in-app-browser-webview</span>
                      <X className="w-3 h-3 text-slate-500 cursor-pointer" onClick={() => setSimulatorState("idle")} />
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center p-2 space-y-4">
                      <div className="w-10 h-10 bg-red-950/20 border border-red-500/20 rounded-full flex items-center justify-center text-red-400">
                        <ShieldX className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-bold text-slate-100 uppercase">
                          {simulatedPlatform === "gumroad" ? "Gumroad Checkout" : simulatedPlatform === "lemonsqueezy" ? "Lemon Squeezy Checkout" : "Buy Me a Coffee"}
                        </h4>
                        <p className="text-[7px] text-red-400 font-bold uppercase tracking-wider">
                          Apple Pay / Google Pay Blocked
                        </p>
                        <p className="text-[8px] text-slate-500">In-app browsers do not support hardware payment APIs.</p>
                      </div>

                      {/* Fake manual card inputs */}
                      <div className="w-full space-y-1">
                        <div className="w-full h-5 bg-slate-900 border border-slate-800 rounded text-[7px] px-1.5 flex items-center text-slate-500">Cardholder name</div>
                        <div className="w-full h-5 bg-slate-900 border border-slate-800 rounded text-[7px] px-1.5 flex items-center text-slate-500">Card number (16 digits)</div>
                        <div className="flex gap-1">
                          <div className="w-1/2 h-5 bg-slate-900 border border-slate-800 rounded text-[7px] px-1.5 flex items-center text-slate-500">Exp. date</div>
                          <div className="w-1/2 h-5 bg-slate-900 border border-slate-800 rounded text-[7px] px-1.5 flex items-center text-slate-500">CVV</div>
                        </div>
                      </div>
                      <button className="w-full py-1.5 bg-slate-800 text-white font-bold rounded text-[8px] uppercase tracking-wider">Pay $29.00</button>
                    </div>

                    <div className="border-t border-slate-900 pt-2 text-center text-[7px] text-red-500 font-bold uppercase tracking-wider">
                      ⚠️ Friction wall. 80% checkout bounce.
                    </div>
                  </div>
                )}

                {/* State: Success (Deep Link triggers Safari/Chrome with active Apple Pay) */}
                {simulatorState === "success" && (
                  <div className="flex-1 flex flex-col justify-between bg-slate-950 text-slate-200 p-3 animate-fade-in">
                    {/* Fake Safari browser header */}
                    <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between text-[8px] text-slate-500 font-mono">
                      <span>🌐 safari.apple.com/secure</span>
                      <X className="w-3 h-3 text-slate-500 cursor-pointer" onClick={() => setSimulatorState("idle")} />
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center p-2 space-y-4">
                      <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-bold text-slate-100 uppercase">
                          {simulatedPlatform === "gumroad" ? "Gumroad Checkout" : simulatedPlatform === "lemonsqueezy" ? "Lemon Squeezy Checkout" : "Buy Me a Coffee"}
                        </h4>
                        <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">
                          Hardware Wallet Active
                        </p>
                      </div>

                      {/* Giant Apple Pay button */}
                      <button className="w-full py-2.5 bg-white text-black font-extrabold rounded-xl text-[10px] flex items-center justify-center gap-1 hover:bg-slate-100 active:scale-95 transition-all">
                        <Apple className="w-3.5 h-3.5 text-black fill-current" /> Pay
                      </button>

                      <div className="text-[7px] text-slate-500 font-mono">
                        Or use auto-filled Chrome/Safari saved cards.
                      </div>
                    </div>

                    <div className="border-t border-slate-900 pt-2 text-center text-[7px] text-emerald-400 font-bold uppercase tracking-wider">
                      ✅ Instant conversion success!
                    </div>
                  </div>
                )}

              </div>

              {/* Home bar */}
              <div className="w-20 h-1 bg-slate-800 rounded-full mx-auto mb-1" />
            </div>

            {/* Simulated Result Label */}
            <div className="mt-6 text-center text-xs text-muted-foreground">
              {simulatorState === "idle" && "💡 Click the link in the simulator screen above to test."}
              {simulatorState === "webview" && "❌ Hardware wallets disabled. Users must manually type credit card credentials."}
              {simulatorState === "success" && "✅ Hardware API active. User can pay instantly via one-click Apple Pay or Google Pay."}
            </div>
          </div>
        </div>

      </section>

      {/* Dynamic Conversions Calculator Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-accent text-xs font-bold uppercase tracking-widest">Revenue Calculator</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-2 mb-4">
            CHECKOUT REVENUE CALCULATOR
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Adjust the click slider and product price to calculate lost sales due to in-app webview friction.
          </p>
        </div>

        <div className="glass-card p-6 md:p-10 rounded-3xl border border-border bg-surface/40 backdrop-blur-md max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Sliders input */}
          <div className="md:col-span-7 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Monthly Click-Throughs:</span>
                <span className="text-xl font-extrabold text-white">{monthlyClicks.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="100000" 
                step="1000"
                value={monthlyClicks} 
                onChange={(e) => setMonthlyClicks(Number(e.target.value))}
                className="w-full h-1 bg-background/80 rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Average Product Price:</span>
                <span className="text-xl font-extrabold text-white">${productPrice}</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="500" 
                step="5"
                value={productPrice} 
                onChange={(e) => setProductPrice(Number(e.target.value))}
                className="w-full h-1 bg-background/80 rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl text-left">
                <span className="text-[11px] text-red-400 font-bold uppercase tracking-wider block">Standard Link Sales</span>
                <span className="text-2xl font-black text-white">{standardSales}</span>
                <span className="text-xs text-muted-foreground block mt-1">~3% conversion rate</span>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl text-left">
                <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider block">Linktery Sales</span>
                <span className="text-2xl font-black text-white">{smartSales}</span>
                <span className="text-xs text-muted-foreground block mt-1">~18% conversion rate</span>
              </div>
            </div>
          </div>

          {/* Results readout */}
          <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-border/60 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center space-y-4 text-center md:text-right">
            <div>
              <span className="text-xs text-red-500 font-bold uppercase tracking-widest block">Additional Sales Recovered</span>
              <span className="text-4xl font-extrabold text-white">+{additionalSales}</span>
            </div>
            <div>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest block">Recovered Monthly Earnings</span>
              <span className="text-3xl font-extrabold text-white">${lostRevenue.toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground block mt-1">Directly added to your payouts</span>
            </div>
          </div>

        </div>
      </section>

      {/* Comparison Matrix Section */}
      <section className="py-12 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Redirection Features Comparison</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            See how standard link tools compare to Linktery's App Deep Linking when hosting digital product checkouts.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase">
                <th className="p-4 md:p-6">Feature comparison</th>
                <th className="p-4 md:p-6 text-accent">Linktery Smart Link</th>
                <th className="p-4 md:p-6">Standard Shorteners</th>
                <th className="p-4 md:p-6">Linktree/Beacons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Bypasses In-App Webview container</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Launches system browser)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Opens in-app browser)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Trapped in webview)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Apple Pay & Google Pay support</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (100% active)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Fully blocked)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Fully blocked)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Private Subdomain Mapping</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Isolated domain reputation)</td>
                <td className="p-4 md:p-6">Premium tiers only</td>
                <td className="p-4 md:p-6">Premium tiers only</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Preserves Saved Autofill details</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Integrates system auto-fill)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Requests manual card typing)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Requests manual card typing)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature Deep Dive Section */}
      <section className="py-16 px-6 bg-surface/30 border-y border-border/60 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Linktery Sales Optimization Suite</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              Why leading Gumroad & Lemon Squeezy sellers optimize their checkout flows with Linktery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Hardware Wallets Restoration</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Open checkouts natively to restore complete access to secure hardware wallet payment structures (Apple Pay and Google Pay), enabling friction-free impulse purchases.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Isolated Domain Reputations</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Avoid shared domain flags and shadowbans on social networks by mapping your own custom subdomains directly to your product checkout pages.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Dynamic Redirections</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Route campaign clicks dynamically by operating systems (iOS vs Android), location regions, or custom weights to deliver optimal purchase pages.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Click Conversion Telemetry</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track total click trigger rates, devices, geo locations, and referral pathways in real-time to analyze your e-commerce conversion funnel.
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
            Detailed security FAQs for digital product sellers, Gumroad merchants, and creator shops.
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
            Double Your E-Commerce Sales Today
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Protect your links, restore Apple Pay & Google Pay checkouts, and boost conversions free.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Maximize Sales Free <ArrowRight className="w-5 h-5" />
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
