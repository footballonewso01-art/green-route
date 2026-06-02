import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, AlertTriangle, HelpCircle,
  ShieldCheck, Smartphone, ExternalLink, ShoppingBag, CreditCard,
  DollarSign, ShoppingCart, Percent, TrendingUp, RefreshCw, MessageSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function ShopifySmartLinks() {
  const { user } = useAuth();
  
  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Checkout Simulator State
  const [redirectMode, setRedirectMode] = useState<"webview" | "safari">("safari");
  const [checkoutState, setCheckoutState] = useState<"idle" | "loading" | "error" | "faceid" | "success">("idle");
  const [simulatedAov] = useState<number>(49.00);

  // Revenue Calculator State
  const [aov, setAov] = useState<number>(45);
  const [monthlyClicks, setMonthlyClicks] = useState<number>(10000);

  // Calculate Conversions
  // Webview assumes 1.2% checkout conversion due to friction
  // Linktery native browser opens Apple/Google Pay sessions, boosting conversion to 3.8%
  const webviewConversionRate = 0.012;
  const linkteryConversionRate = 0.038;

  const webviewRevenue = Math.round(monthlyClicks * webviewConversionRate * aov);
  const linkteryRevenue = Math.round(monthlyClicks * linkteryConversionRate * aov);
  const recoveredRevenue = linkteryRevenue - webviewRevenue;

  const triggerCheckoutSimulation = () => {
    setCheckoutState("loading");
    
    if (redirectMode === "webview") {
      setTimeout(() => {
        setCheckoutState("error");
      }, 1000);
    } else {
      setTimeout(() => {
        setCheckoutState("faceid");
        // Trigger simulated scanning before completion
        setTimeout(() => {
          setCheckoutState("success");
        }, 1500);
      }, 800);
    }
  };

  const resetCheckoutSimulation = (mode: "webview" | "safari") => {
    setRedirectMode(mode);
    setCheckoutState("idle");
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
      question: "Why do standard bio links kill my store's Shopify sales conversions?",
      answer: "When a potential buyer clicks the link in your Instagram bio, the app opens your Shopify store inside its private in-app webview browser. In this webview, native quick-checkout buttons like Apple Pay, Google Pay, and Shop Pay are completely disabled by mobile OS security policies. Customers are forced to type their 16-digit credit card number and billing address manually, leading to up to an 80% checkout abandonment rate."
    },
    {
      question: "How does Linktery solve the Apple Pay / Google Pay webview issue?",
      answer: "Linktery uses secure mobile OS protocol handlers. When a customer taps your link, Linktery instantly bypasses the Instagram/TikTok in-app browser sandboxes and opens your store directly in the device's native browser (Safari on iOS, Chrome on Android). This restores all native cookies, auto-fills, and native hardware wallets, allowing customers to pay with one-click FaceID."
    },
    {
      question: "Is this compatible with all Shopify themes and apps?",
      answer: "Yes. Because Linktery redirects the visitor to their default device browser, it works seamlessly with all Shopify stores, checkout extensions, custom domains, and native Shopify apps without requiring any coding or theme modifications."
    },
    {
      question: "Does Linktery track add-to-cart or purchase events?",
      answer: "Absolutely. Linktery captures advanced client redirection telemetry, reporting OS types, geographic locations, referrer apps, and provides webhooks to sync redirect data back into your ad pixels and Klaviyo email lists."
    },
    {
      question: "Can I use my custom brand domain for redirects?",
      answer: "Yes, you can configure your own domain (e.g., shop.mybrand.com) for redirects completely free, which preserves branding and increases link CTR."
    }
  ];

  // Dynamic JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Shopify Smart Redirect",
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
          "ratingCount": "310"
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
    ...SEO_PAGES.shopifySmartLinks,
    structuredData
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-accent rounded-full blur-[140px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[120px] mix-blend-screen" />
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

      {/* HERO SECTION WITH OFFSET TYPOGRAPHY */}
      <section className="relative pt-32 pb-8 px-6 max-w-7xl mx-auto z-10 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm font-semibold">
          <ShoppingBag className="w-3.5 h-3.5" />
          Native Mobile Checkouts for Shopify & E-commerce
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-white max-w-5xl mx-auto">
          STOP LOSING SALES TO
          <br />
          <span className="gradient-text">IN-APP WEBVIEWS</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Instagram and TikTok browsers block Apple Pay and Google Pay checkouts. 
          Use Linktery to route shoppers directly to native browsers, activating one-click checkouts and saving sales.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          {user ? (
            <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
              Launch Free E-com Links <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <a href="#calculator" className="px-6 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
            Calculate Recovered Revenue
          </a>
        </div>
      </section>

      {/* STACKED CHECKOUT SIMULATOR - BREAKING HERO SCREEN TRADITIONS */}
      <section className="py-12 px-6 max-w-4xl mx-auto z-10 relative">
        <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] shadow-2xl relative overflow-hidden">
          
          {/* Simulator Settings */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 border-b border-border/60 pb-5">
            <div className="text-left">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block font-mono mb-1">INTERACTIVE DEMONSTRATION</span>
              <h3 className="text-lg font-bold text-white uppercase">Checkout Simulator</h3>
            </div>
            <div className="flex gap-1.5 bg-background p-1 border border-border rounded-xl">
              <button 
                onClick={() => resetCheckoutSimulation("webview")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  redirectMode === "webview" ? "bg-red-600 text-white" : "text-muted-foreground hover:text-white"
                }`}
              >
                In-App Webview (Friction)
              </button>
              <button 
                onClick={() => resetCheckoutSimulation("safari")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  redirectMode === "safari" ? "bg-accent text-background font-black" : "text-muted-foreground hover:text-white"
                }`}
              >
                Linktery (Safari/Chrome)
              </button>
            </div>
          </div>

          {/* Simulator Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Left: Cart Product Card */}
            <div className="md:col-span-5 space-y-4">
              <div className="bg-background/80 border border-border/80 p-5 rounded-2xl space-y-4 text-left">
                <div className="aspect-square bg-surface-hover rounded-xl flex items-center justify-center border border-border/40 relative overflow-hidden group">
                  <ShoppingBag className="w-16 h-16 text-slate-700 animate-pulse" />
                  <span className="absolute top-2 right-2 bg-accent/10 border border-accent/30 text-accent text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    In Stock
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-white text-sm font-extrabold uppercase">Premium Leather Wallet</h4>
                  <p className="text-xs text-muted-foreground">Minimalist RFID-Blocking Edition</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border/40">
                  <span className="text-xs text-slate-500 font-mono">Total Price:</span>
                  <span className="text-lg font-black text-white font-mono">${simulatedAov.toFixed(2)}</span>
                </div>
                <button 
                  onClick={triggerCheckoutSimulation}
                  disabled={checkoutState === "loading" || checkoutState === "faceid" || checkoutState === "success"}
                  className="w-full py-3 bg-black border border-border rounded-xl text-white font-black text-xs uppercase hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Proceed to Checkout
                </button>
              </div>
            </div>

            {/* Right: Phone Chassis simulator screen output */}
            <div className="md:col-span-7 flex justify-center">
              <div className="border-8 border-slate-900 bg-slate-950 p-3 rounded-[36px] w-full max-w-[270px] h-[360px] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                
                {/* Speaker top bar */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-3.5 bg-slate-900 rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-8 h-0.5 bg-slate-800 rounded-full" />
                </div>

                {/* Status Bar */}
                <div className="flex justify-between items-center px-4 pt-1.5 text-[8px] font-mono text-slate-600">
                  <span>09:41 AM</span>
                  <div className="flex gap-1">
                    <span>5G</span>
                    <span>🔋</span>
                  </div>
                </div>

                {/* Simulated Screen */}
                <div className="bg-slate-900 flex-1 rounded-[20px] my-2 overflow-hidden flex flex-col justify-between relative border border-slate-800 p-3">
                  
                  {/* Status: Idle */}
                  {checkoutState === "idle" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
                      <ShoppingCart className="w-10 h-10 text-accent animate-pulse" />
                      <div className="space-y-1">
                        <p className="text-white text-[11px] font-bold uppercase tracking-tight">Active Shopping Session</p>
                        <p className="text-[9px] text-slate-500 leading-normal">
                          {redirectMode === "webview" 
                            ? "Shopper is browsing inside the social media in-app webview container." 
                            : "Shopper is redirected directly to native Safari/Chrome mobile browser."}
                        </p>
                      </div>
                      <button 
                        onClick={triggerCheckoutSimulation}
                        className="py-1.5 px-3 bg-accent text-background font-extrabold rounded-lg text-[9px] uppercase hover:opacity-90 active:scale-95 transition-all"
                      >
                        Simulate Payment Click
                      </button>
                    </div>
                  )}

                  {/* Status: Loading */}
                  {checkoutState === "loading" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      <p className="text-[8px] text-slate-500 font-mono">Initializing Apple Pay session...</p>
                    </div>
                  )}

                  {/* Status: Error (In-App Browser Blocks Pay) */}
                  {checkoutState === "error" && (
                    <div className="flex-1 flex flex-col justify-between bg-slate-950 p-2 border border-red-500/20 rounded-xl animate-scale-up">
                      <div className="flex justify-between items-center text-[7px] text-slate-500 font-mono pb-1 border-b border-slate-900">
                        <span>⚠️ SSL Session Error</span>
                        <X className="w-2.5 h-2.5 cursor-pointer text-slate-400" onClick={() => setCheckoutState("idle")} />
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-1 space-y-2">
                        <div className="w-8 h-8 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-500">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-white text-[9px] font-extrabold uppercase">Payment Blocked</p>
                          <p className="text-[7.5px] text-slate-400 leading-normal">
                            In-app browsers do not support hardware wallets (Apple Pay/Google Pay).
                          </p>
                        </div>
                        <div className="w-full text-left bg-slate-900 border border-slate-800 p-1.5 rounded text-[6.5px] text-slate-500 font-mono">
                          Enter 16 digit card number to pay...
                        </div>
                      </div>
                      <span className="text-[8px] text-red-500 font-black uppercase text-center">
                        80% User Checkout Dropoff
                      </span>
                    </div>
                  )}

                  {/* Status: FaceID Verification */}
                  {checkoutState === "faceid" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 bg-slate-950/80 rounded-xl animate-fade-in">
                      <div className="w-12 h-12 rounded-full border border-accent/40 bg-accent/5 flex items-center justify-center text-accent relative overflow-hidden">
                        <Smartphone className="w-6 h-6 animate-pulse" />
                        <div className="absolute inset-0 border border-accent/30 rounded-full animate-ping" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-white text-[9px] font-extrabold uppercase">Confirm Payment</p>
                        <p className="text-[8px] text-slate-400">Double click side button to authenticate FaceID.</p>
                      </div>
                    </div>
                  )}

                  {/* Status: Success (Safari Works) */}
                  {checkoutState === "success" && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 bg-emerald-950/10 border border-emerald-500/20 rounded-xl animate-scale-up">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-white text-[10px] font-extrabold uppercase">Order Complete</p>
                        <p className="text-[8px] text-emerald-400 font-semibold uppercase">Payment Verified via Apple Pay</p>
                        <p className="text-[7.5px] text-slate-500 leading-normal max-w-[150px] mx-auto">
                          Safari/Chrome opened native wallets instantly. 1-click conversion successful.
                        </p>
                      </div>
                      <button 
                        onClick={() => setCheckoutState("idle")}
                        className="py-1 px-2 border border-slate-700 bg-slate-800 text-slate-300 rounded text-[7px] font-mono hover:text-white"
                      >
                        Simulate Again
                      </button>
                    </div>
                  )}

                </div>

                {/* Home bar bottom */}
                <div className="w-16 h-0.5 bg-slate-800 rounded-full mx-auto" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* DETAILED PROBLEM EXPLANATION: REAL-WORLD CUSTOMER JOURNEY */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-border/45 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">REAL-WORLD SCENARIO</span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mt-2 mb-4 uppercase">
            The Anatomy of a Lost Sale
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Let's look at a real-life example of how standard links in bio drop your store conversions and why shoppers abandon their carts.
          </p>
        </div>

        {/* The Tale of Two Checkouts: Scenario A vs Scenario B */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mb-16">
          
          {/* Scenario A: Friction Webview */}
          <div className="glass-card p-6 md:p-8 border border-red-500/20 bg-red-950/5 rounded-[32px] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-red-500 uppercase font-mono tracking-wider">SCENARIO A</span>
                  <h4 className="text-lg font-bold text-white uppercase">Traditional Bio Link</h4>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                A customer named Anna sees an ad for your apparel store on Instagram and clicks your link in bio:
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex gap-3 text-left">
                  <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">In-App Browser Jail.</strong> The store opens inside Instagram's built-in webview browser. The site looks fine, but Anna is trapped in a sandbox.
                  </p>
                </div>
                <div className="flex gap-3 text-left">
                  <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Missing Checkout Cookies.</strong> Anna hits "Checkout". The fields are completely empty—no saved email, name, or shipping address. Typing manually on mobile is tedious.
                  </p>
                </div>
                <div className="flex gap-3 text-left">
                  <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Blocked Mobile Wallets.</strong> Because it's an in-app browser, native Apple Pay or Google Pay buttons are disabled by OS policies. She sees an error or must use credit card fields.
                  </p>
                </div>
                <div className="flex gap-3 text-left">
                  <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">4</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Cart Abandonment.</strong> The store asks Anna to enter her 16-digit card. Anna is on the subway/couch and doesn't have her physical card. She closes the tab and leaves.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-red-500/10 pt-4 text-center text-xs font-mono text-red-400 font-bold uppercase tracking-wider">
              ⚠️ Result: Sale lost. Minus 80% checkout conversion.
            </div>
          </div>

          {/* Scenario B: Linktery Smart Redirect */}
          <div className="glass-card p-6 md:p-8 border border-emerald-500/20 bg-emerald-950/5 rounded-[32px] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono tracking-wider">SCENARIO B</span>
                  <h4 className="text-lg font-bold text-white uppercase">Linktery Smart Redirect</h4>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                A customer named Anna clicks the Linktery smart link in your profile bio:
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex gap-3 text-left">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Instant Native Escape.</strong> Linktery detects the shopper's device and automatically launches your store inside their native browser (Safari on iOS, Chrome on Android).
                  </p>
                </div>
                <div className="flex gap-3 text-left">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Auto-filled Shipping.</strong> The native browser remembers Anna. Her shipping address, email, and contact details are automatically pre-filled.
                  </p>
                </div>
                <div className="flex gap-3 text-left">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">1-Click Payment wallets.</strong> Because it's a native system browser, Apple Pay, Google Pay, and Shop Pay buttons are fully active and available.
                  </p>
                </div>
                <div className="flex gap-3 text-left">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">4</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Order Complete.</strong> Anna double-clicks her phone's power button to verify FaceID. The transaction is securely completed in less than 3 seconds.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-emerald-500/10 pt-4 text-center text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              🎉 Result: Successful purchase. Up to 216% higher checkout conversion.
            </div>
          </div>

        </div>

        {/* Plain explanation: Why this happens */}
        <div className="glass-card p-6 md:p-10 border border-border/80 bg-surface/20 rounded-[32px] grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left">
          <div className="md:col-span-4 flex flex-col space-y-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white uppercase leading-tight">
              Why does this happen?<br />
              <span className="text-accent">Explaining in plain english</span>
            </h3>
          </div>
          <div className="md:col-span-8 text-sm text-muted-foreground space-y-4 leading-relaxed font-medium">
            <p>
              Social media apps (Instagram, TikTok, Facebook) try to keep you inside their platforms at all costs. To do this, they force all external links to open inside their proprietary in-app webview container (an <strong className="text-white">In-App WebView</strong>).
            </p>
            <p>
              However, these built-in webview browsers are isolated sandboxes. For security reasons, Apple and Google block in-app webviews from accessing native device keys, saved passwords, and hardware payment wallets like <strong className="text-white">Apple Pay</strong> and <strong className="text-white">Google Pay</strong>.
            </p>
            <p>
              This leaves your shoppers with blank cart forms, forcing them to manually type out their credit card details. Linktery solves this by using secure mobile OS URI handshakes to bypass the webview sandboxes and force-open the shopper's native default browser.
            </p>
          </div>
        </div>

      </section>

      {/* REVENUE CALCULATOR - BREAKING STANDARD GRID BOX LAYOUTS */}
      <section id="calculator" className="py-16 px-6 max-w-7xl mx-auto border-t border-border/40 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side: Copy (5 columns) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-xs font-bold text-accent uppercase tracking-widest font-mono">CONVERSION GAIN CALCULATOR</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              CALCULATE YOUR LEAKED REVENUE
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Standard redirect links leave visitors trapped inside Instagram, resulting in low checkout rates. 
              Use the sliders to adjust your stats and see how much revenue is recovered by forcing open native browsers.
            </p>
            <div className="bg-surface/40 border border-border/60 p-5 rounded-2xl space-y-3 font-mono text-xs text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Standard Checkout Rate:</span>
                <span className="text-red-400 font-bold">1.2% (Webview)</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Linktery Checkout Rate:</span>
                <span className="text-emerald-400 font-bold">3.8% (Safari/Chrome)</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-2 border-t border-border/40 leading-normal">
                * Based on comparative Shopify checkout conversion studies showing 1-click wallet presence versus manual cart forms.
              </p>
            </div>
          </div>

          {/* Right Side: Interactive Sliders & Results (7 columns) */}
          <div className="lg:col-span-7">
            <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] space-y-8">
              
              {/* Slider 1: AOV */}
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center text-xs font-bold text-white uppercase font-mono">
                  <span>Average Order Value (AOV)</span>
                  <span className="text-accent text-sm font-black">${aov}</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  value={aov}
                  onChange={(e) => setAov(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>$10</span>
                  <span>$250</span>
                  <span>$500</span>
                </div>
              </div>

              {/* Slider 2: Clicks */}
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center text-xs font-bold text-white uppercase font-mono">
                  <span>Monthly Bio Link Clicks</span>
                  <span className="text-accent text-sm font-black">{monthlyClicks.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="100000" 
                  step="1000"
                  value={monthlyClicks}
                  onChange={(e) => setMonthlyClicks(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>1,000</span>
                  <span>50,000</span>
                  <span>100,000</span>
                </div>
              </div>

              {/* Results Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/40">
                <div className="bg-background/60 border border-border p-4 rounded-2xl text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Webview Sales</span>
                  <span className="text-xl font-bold text-red-400 font-mono">${webviewRevenue.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-600 block mt-1">At 1.2% Conversion</span>
                </div>
                <div className="bg-background/60 border border-border p-4 rounded-2xl text-left">
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block mb-1">Linktery Sales</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">${linkteryRevenue.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-600 block mt-1">At 3.8% Conversion</span>
                </div>
                <div className="bg-accent/5 border border-accent/20 p-4 rounded-2xl text-left shadow-glow-sm relative overflow-hidden">
                  <div className="absolute -right-2 -bottom-2 opacity-5">
                    <TrendingUp className="w-16 h-16 text-accent" />
                  </div>
                  <span className="text-[10px] font-bold text-accent uppercase font-mono block mb-1">Recovered Revenue</span>
                  <span className="text-xl font-black text-white font-mono">${recoveredRevenue.toLocaleString()}</span>
                  <span className="text-[9px] text-accent block mt-1 font-bold">+216% Sales Lift</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* BRAND HIGHLIGHTS: E-COMMERCE COMPARISON MATRIX */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">PLATFORM CAPABILITIES</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1 mb-3">REDIRECTION CAPABILITIES</h2>
          <p className="text-sm text-muted-foreground">
            See how Linktery bypasses sandboxes to preserve shopper intent compared to standard link solutions.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase font-mono">
                <th className="p-4 md:p-6">Checkout Features</th>
                <th className="p-4 md:p-6 text-accent">Linktery Smart Link</th>
                <th className="p-4 md:p-6">Traditional Rotators</th>
                <th className="p-4 md:p-6">Generic Bio Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90 font-medium">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Apple Pay & Google Pay Supported</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Forced native Safari/Chrome)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Stuck in app webview)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Stuck in app webview)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Shop Pay Cookie Persistence</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Uses native browser sessions)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Completely logged out)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Completely logged out)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Pixel & Conversion Analytics</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Fully tracks client redirections)</td>
                <td className="p-4 md:p-6 text-yellow-500">⚠️ Limited click counts</td>
                <td className="p-4 md:p-6 text-yellow-500">⚠️ Basic statistics</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Custom Brand Domains</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Unlimited free subdomains)</td>
                <td className="p-4 md:p-6">Only premium plans</td>
                <td className="p-4 md:p-6">Only premium plans</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 px-6 max-w-3xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 flex items-center justify-center gap-2 uppercase">
            <HelpCircle className="w-8 h-8 text-accent" /> Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm">
            Everything you need to know about setting up smart checkouts and bypassing mobile app webviews.
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

      {/* CTA SECTION */}
      <section className="py-20 px-6 max-w-5xl mx-auto relative z-10">
        <div className="relative glass-card p-8 md:p-12 rounded-3xl overflow-hidden border border-accent/20 bg-gradient-to-tr from-accent/10 via-background to-background text-center shadow-glow">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-accent rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 relative z-10">
            Boost Shopify Sales Instantly
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Create smart URL redirects, activate native credit card wallets, and eliminate checkout drop-offs from your bio links.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-5 h-5" />
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
