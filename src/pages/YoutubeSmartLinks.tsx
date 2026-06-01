import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, AlertTriangle, HelpCircle,
  Play, ShieldCheck, Target, Youtube, Smartphone, AppWindow, ExternalLink
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

export default function YoutubeSmartLinks() {
  const { user } = useAuth();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Interactive Simulator State
  const [activeTab, setActiveTab] = useState<"standard" | "smart">("smart");
  const [simulatorState, setSimulatorState] = useState<"idle" | "loading" | "success" | "webview">("idle");
  const [simulatedPlatform, setSimulatedPlatform] = useState<"telegram" | "instagram" | "spotify">("telegram");

  const runSimulation = () => {
    setSimulatorState("loading");
    
    if (activeTab === "standard") {
      setTimeout(() => {
        setSimulatorState("webview"); // Opens slow in-app webview with log-in request
      }, 1200);
    } else {
      setTimeout(() => {
        setSimulatorState("success"); // Opens native app instantly
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
      question: "What is the YouTube in-app browser 'jail' and why does it hurt conversions?",
      answer: "When a viewer clicks any external link in your YouTube video description or comments on mobile, the YouTube app opens it inside its built-in Webview container (the in-app browser) rather than Safari or Chrome. In this webview, the user is completely logged out of all external accounts. If they click to subscribe to your Patreon, join your Telegram channel, or buy from your Shopify store, they must manually type their username, password, and billing info, causing up to 80% of users to drop off immediately."
    },
    {
      question: "How do Linktery Smart Links bypass the in-app webview?",
      answer: "Linktery uses mobile OS URL schemes and native deep-linking protocols. When a user clicks a Linktery short link inside the YouTube app, our edge server quickly detects the visitor's mobile OS and injects a script that triggers the native application protocols (e.g., tg://resolve for Telegram or instagram://user for Instagram). If the native app is installed, the phone is forced to launch it directly, bypassing the webview completely."
    },
    {
      question: "Does this solution work on both iOS (iPhone) and Android devices?",
      answer: "Yes. Our deep-linking logic detects whether the request is originating from an iPhone, iPad, or Android device. It then automatically dispatches the corresponding OS-level URI scheme or falls back to Safari/Chrome browser headers, ensuring the best possible conversion funnel for every single visitor."
    },
    {
      question: "Will YouTube flag or penalize my channel for using Smart Links?",
      answer: "No. YouTube fully permits external links in video descriptions as long as they comply with Community Guidelines (no spam, malware, or phishing). Linktery links resolve to your custom domains or clean redirected pages, keeping your channel fully compliant and safe."
    },
    {
      question: "Can I track exactly how many users opened the native apps?",
      answer: "Absolutely. Linktery provides deep real-time analytics. You can track absolute clicks, geo-locations, device types (iOS vs Android), referrers, and specifically 'deep link fires' — which show exactly how many users successfully bypassed the webview jail to launch native applications."
    }
  ];

  // Dynamic JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery YouTube Smart Link Rotator",
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

  // Call the SEO hook
  useSeo({
    ...SEO_PAGES.youtubeSmartLinks,
    structuredData
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-10 left-1/4 w-[400px] h-[400px] bg-red-600 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-accent rounded-full blur-[100px] mix-blend-screen" />
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-sm mb-6 animate-fade-in">
            <Youtube className="w-4 h-4 text-red-500" />
            In-App Browser Webview Bypass System
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Stop Losing Subscribers from
            <br />
            <span className="gradient-text">YouTube Description Links</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Links in YouTube descriptions open in a slow, logged-out webview. Bypass the in-app browser and open native apps (Telegram, Instagram, Spotify) directly on user devices to double your conversions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Create Smart Links Free <ArrowRight className="w-4 h-4" />
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
        
        {/* Left Side: Text explaining the Webview Jail problem */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="space-y-2">
            <span className="text-accent text-xs font-bold uppercase tracking-widest block">The Webview Jail</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Why Users Drop Off When Clicking Links on YouTube
            </h2>
          </div>
          <div className="space-y-4 text-muted-foreground text-sm md:text-base leading-relaxed">
            <p>
              When a subscriber clicks your link in a YouTube video description, the app opens it in a **built-in browser container (webview)**.
            </p>
            <p>
              In this container, the user is **not logged in** to Instagram, Telegram, Spotify, Patreon, or their email. If they try to subscribe, comment, or buy, they must manually enter their credentials.
            </p>
            <p className="border-l-2 border-red-500 pl-4 py-1.5 text-white font-medium bg-red-500/5">
              Over **80% of users bounce** immediately instead of entering their passwords on a webview.
            </p>
            <p>
              Linktery's **Deep Link engine** detects client platforms in &lt;10ms and redirects the browser request directly to the target app's native URL protocol (e.g. `tg://` or `instagram://`), bypassing the webview completely.
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Mobile Simulator */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-border bg-surface/40 backdrop-blur-md w-full max-w-lg">
            
            {/* Simulation Config Tabs */}
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-white text-base">Select Redirect Method</h3>
                <p className="text-[11px] text-muted-foreground">Toggle to see the difference in user experience</p>
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
              <span className="text-xs font-bold text-muted-foreground uppercase">Target Destination:</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setSimulatedPlatform("telegram"); setSimulatorState("idle"); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${simulatedPlatform === "telegram" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-surface-hover text-muted-foreground"}`}
                >
                  Telegram Channel
                </button>
                <button 
                  onClick={() => { setSimulatedPlatform("instagram"); setSimulatorState("idle"); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${simulatedPlatform === "instagram" ? "bg-pink-600/20 text-pink-400 border border-pink-500/30" : "bg-surface-hover text-muted-foreground"}`}
                >
                  Instagram Bio
                </button>
                <button 
                  onClick={() => { setSimulatedPlatform("spotify"); setSimulatorState("idle"); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${simulatedPlatform === "spotify" ? "bg-green-600/20 text-green-400 border border-green-500/30" : "bg-surface-hover text-muted-foreground"}`}
                >
                  Spotify Podcast
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
                {/* State: Idle / Click Screen */}
                {simulatorState === "idle" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-4">
                    <Youtube className="w-12 h-12 text-red-600 animate-bounce" />
                    <div className="space-y-1">
                      <p className="text-white text-xs font-bold">YouTube Video Description</p>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Click the link below to simulate the user journey on mobile:
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
                      {activeTab === "standard" ? "youtube.com/redirect?link=..." : "linktery.com/yourlink"} <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* State: Loading */}
                {simulatorState === "loading" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center space-y-3">
                    <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 font-mono">Resolving client headers...</p>
                  </div>
                )}

                {/* State: Webview (Failure state for Standard Links) */}
                {simulatorState === "webview" && (
                  <div className="flex-1 flex flex-col justify-between bg-white text-slate-900 p-3 animate-slide-up">
                    {/* Fake Webview browser header */}
                    <div className="border-b border-slate-200 pb-2 mb-2 flex items-center justify-between text-[8px] text-slate-400 font-mono">
                      <span>🔒 in-app-browser-jail.html</span>
                      <X className="w-3 h-3 text-slate-400 cursor-pointer" onClick={() => setSimulatorState("idle")} />
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center p-2 space-y-4">
                      {simulatedPlatform === "telegram" && (
                        <>
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[11px] font-bold text-slate-800">Telegram Channel Web</h4>
                            <p className="text-[9px] text-slate-500">You must be logged in to view channels.</p>
                          </div>
                        </>
                      )}
                      {simulatedPlatform === "instagram" && (
                        <>
                          <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[11px] font-bold text-slate-800">Instagram Web Login</h4>
                            <p className="text-[9px] text-slate-500">Enter password to view user profile.</p>
                          </div>
                        </>
                      )}
                      {simulatedPlatform === "spotify" && (
                        <>
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <Play className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[11px] font-bold text-slate-800">Spotify Web Player</h4>
                            <p className="text-[9px] text-slate-500">Create an account to listen to podcast.</p>
                          </div>
                        </>
                      )}

                      {/* Fake Login Form inputs */}
                      <div className="w-full space-y-1">
                        <div className="w-full h-5 bg-slate-100 border border-slate-200 rounded text-[7px] px-1.5 flex items-center text-slate-400">Username</div>
                        <div className="w-full h-5 bg-slate-100 border border-slate-200 rounded text-[7px] px-1.5 flex items-center text-slate-400">Password</div>
                      </div>
                      <button className="w-full py-1.5 bg-slate-800 text-white font-bold rounded text-[8px]">Log In</button>
                    </div>

                    <div className="border-t border-slate-100 pt-2 text-center text-[7px] text-slate-400">
                      ⚠️ Conversion dropped. 80% bounce risk.
                    </div>
                  </div>
                )}

                {/* State: Success (Deep Link triggers Native App) */}
                {simulatorState === "success" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center bg-slate-950/80 animate-fade-in space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-white text-xs font-bold">Deep Link Executed</p>
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Native App Triggered
                      </p>
                      <p className="text-[9px] text-slate-400 leading-normal">
                        Instantly opened {simulatedPlatform === "telegram" ? "Telegram app" : simulatedPlatform === "instagram" ? "Instagram app" : "Spotify app"} with active user cookies.
                      </p>
                    </div>
                    <button 
                      onClick={() => setSimulatorState("idle")}
                      className="py-1 px-3 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 rounded-md text-[8px] font-bold"
                    >
                      Reset Demo
                    </button>
                  </div>
                )}

              </div>

              {/* Home bar indicators */}
              <div className="w-20 h-1 bg-slate-800 rounded-full mx-auto mb-1" />
            </div>

            {/* Simulated Result Callout */}
            <div className="mt-6 text-center text-xs text-muted-foreground">
              {simulatorState === "idle" && "💡 Click the link in the simulator screen above to test."}
              {simulatorState === "webview" && "❌ The user is logged out of their account on the browser, leading to high bounce rate."}
              {simulatorState === "success" && "✅ Redirect completed directly in the native application. 100% conversion success!"}
            </div>
          </div>
        </div>

      </section>

      {/* Comparison Matrix Section */}
      <section className="py-12 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">Redirect Technology Comparison</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            See how standard bio-link shorteners compare to Linktery's App Deep Linking when clicked inside YouTube descriptions.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase">
                <th className="p-4 md:p-6">Feature comparison</th>
                <th className="p-4 md:p-6 text-accent">Linktery Deep Links</th>
                <th className="p-4 md:p-6">Standard Shorteners</th>
                <th className="p-4 md:p-6">Linktree/Beacons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Bypasses YouTube In-App Webview</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Opens native apps)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Opens webview)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Trapped in webview)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Support Custom domains</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Free mapping)</td>
                <td className="p-4 md:p-6">Only premium plans</td>
                <td className="p-4 md:p-6">Only premium plans</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Dynamic rotators & targeting</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Geo + Device OS)</td>
                <td className="p-4 md:p-6 text-red-500">❌ Not Supported</td>
                <td className="p-4 md:p-6">Limited targeting</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Preserves Active Login Cookies</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Uses device app storage)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Requests log-in)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Requests log-in)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Feature Deep Dive Section */}
      <section className="py-16 px-6 bg-surface/30 border-y border-border/60 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Linktery Deep Linking Safety Suite</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              Why leading creators trust Linktery to optimize their external traffic pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Native App Launching</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automatically redirect users directly into native apps like Telegram, Instagram, YouTube, Spotify, and Patreon. Stop forcing users to log in through built-in browser containers.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Geo & OS Device Targeting</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Deliver optimized paths depending on the device: direct iOS users to Apple Podcasts/Store and Android users to Google Play, optimizing CPA conversion metrics.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Private Subdomains</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Map your own custom subdomain (e.g., links.mychannel.com) directly to your Linktery landing pages to maintain brand presence and bypass domain flags.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0 text-accent">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Detailed Click Telemetry</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Access rich insights showing click triggers, geographical locations, devices, referral pathways, and app launch percentages to optimize marketing strategies.
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
            Everything you need to know about YouTube description deep links and link routing security.
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
            Double Your Description Link Conversions
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Configure smart links, bypass mobile in-app webviews, and route clicks natively today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Create Smart Link Free <ArrowRight className="w-5 h-5" />
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
