import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, AlertTriangle, HelpCircle,
  Play, Pause, ShieldCheck, Smartphone, ExternalLink,
  Mic, Radio, Headphones, Volume2, Search, Share2, Sliders, ShieldX, MessageSquare
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

export default function PodcastSmartLinks() {
  const { user } = useAuth();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Interactive Simulator State
  const [activeTab, setActiveTab] = useState<"standard" | "smart">("smart");
  const [simulatorState, setSimulatorState] = useState<"idle" | "loading" | "success" | "webview">("idle");
  const [simulatedPlatform, setSimulatedPlatform] = useState<"apple" | "spotify" | "overcast">("apple");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const runSimulation = () => {
    setSimulatorState("loading");
    setIsPlaying(false);
    
    if (activeTab === "standard") {
      setTimeout(() => {
        setSimulatorState("webview"); // Opens slow in-app webview
      }, 1200);
    } else {
      setTimeout(() => {
        setSimulatorState("success"); // Opens native app
        setIsPlaying(true);
      }, 800);
    }
  };

  const resetSimulator = (tab: "standard" | "smart") => {
    setActiveTab(tab);
    setSimulatorState("idle");
    setIsPlaying(false);
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
      question: "Why do standard bio links lower my podcast subscriber conversions?",
      answer: "When a listener clicks a link in your Instagram or TikTok bio, the social network opens it inside its private in-app webview browser. In this webview, the user is completely logged out of Apple Podcasts, Spotify, and other audio accounts. Instead of launching the native player, they see a web preview prompting them to sign in, which causes up to 85% of fans to abandon the page."
    },
    {
      question: "How does Linktery launch native podcast applications directly?",
      answer: "Linktery uses mobile OS URI handshakes. When a mobile user clicks your link, our system identifies their operating system (iOS/Android) and executes custom protocols (like pokcast://, spotify://, or podcasts://). This forces their phone to launch the native podcast player app directly with your show already loaded."
    },
    {
      question: "Can I use custom domains for my podcast smart links?",
      answer: "Yes. Linktery permits free custom subdomain mapping (e.g. listen.myweeklyshow.com). Using custom domains keeps your branding intact, increases link trust, and protects your links from shared domain blacklist flags."
    },
    {
      question: "What major podcast directories are supported?",
      answer: "We support deep-linking redirects to Apple Podcasts, Spotify, Google Podcasts, Amazon Music, Overcast, Pocket Casts, Castro, Castbox, and Podchaser."
    },
    {
      question: "Are there tools to track subscriber analytics?",
      answer: "Absolutely. Linktery tracks detailed click events, device operating systems, geographic regions, and deep-link launcher success rates in real-time."
    }
  ];

  // Dynamic JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Podcast Smart Linker",
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
    ...SEO_PAGES.podcastSmartLinks,
    structuredData
  });

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

      {/* ASYMMETRIC HERO SECTION (Simulator is integrated above-the-fold) */}
      <section className="relative pt-32 pb-16 px-6 max-w-7xl mx-auto z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: Headline and Copy (7 columns) */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-2">
            <Mic className="w-3.5 h-3.5 text-accent" />
            Universal Podcast deep linking & routing
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white">
            DIRECT ROUTE TO
            <br />
            <span className="gradient-text">PODCAST APPS</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed font-medium">
            Tired of losing subscribers? Standard social links open checkouts in trapped webviews. Switch to Linktery and route listeners straight to Apple Podcasts or Spotify native applications.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
                Create Podcast Links Free <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#growth-funnel" className="px-6 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              View Growth Funnel
            </a>
          </div>
        </div>

        {/* Right: Phone Simulator (Integrated Above-The-Fold - 5 columns) */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <div className="glass-card p-5 rounded-3xl border border-border bg-surface/30 backdrop-blur-md w-full max-w-[340px]">
            {/* Simulation mode switch */}
            <div className="flex justify-between items-center mb-4 border-b border-border/60 pb-3">
              <span className="text-xs font-bold text-white uppercase font-mono">Redirect Mode</span>
              <div className="flex gap-1 bg-background p-0.5 border border-border rounded-lg">
                <button 
                  onClick={() => resetSimulator("standard")}
                  className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${
                    activeTab === "standard" ? "bg-red-600 text-white" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Standard
                </button>
                <button 
                  onClick={() => resetSimulator("smart")}
                  className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${
                    activeTab === "smart" ? "bg-accent text-background" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Smart
                </button>
              </div>
            </div>

            {/* Target App Platform selector */}
            <div className="flex justify-between items-center gap-2 mb-4 bg-background/50 p-2 rounded-xl border border-border/80">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">App:</span>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => { setSimulatedPlatform("apple"); setSimulatorState("idle"); }}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${simulatedPlatform === "apple" ? "bg-accent/20 text-accent border border-accent/35" : "bg-surface-hover text-muted-foreground"}`}
                >
                  Apple
                </button>
                <button 
                  onClick={() => { setSimulatedPlatform("spotify"); setSimulatorState("idle"); }}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${simulatedPlatform === "spotify" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/35" : "bg-surface-hover text-muted-foreground"}`}
                >
                  Spotify
                </button>
                <button 
                  onClick={() => { setSimulatedPlatform("overcast"); setSimulatorState("idle"); }}
                  className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${simulatedPlatform === "overcast" ? "bg-orange-600/20 text-orange-400 border border-orange-500/35" : "bg-surface-hover text-muted-foreground"}`}
                >
                  Overcast
                </button>
              </div>
            </div>

            {/* Simulator phone chassis */}
            <div className="border-4 border-slate-900 bg-slate-950 p-2.5 rounded-[28px] w-full max-w-[220px] h-[370px] mx-auto shadow-2xl relative overflow-hidden flex flex-col justify-between">
              {/* Speaker & Sensor */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-3 bg-slate-900 rounded-b-lg flex items-center justify-center z-20">
                <div className="w-8 h-0.5 bg-slate-800 rounded-full" />
              </div>

              {/* Status bar */}
              <div className="flex justify-between items-center px-3 pt-1 text-[7px] font-mono text-slate-600">
                <span>09:41 AM</span>
                <span>5G</span>
              </div>

              {/* Interactive Screen Display */}
              <div className="bg-slate-900 flex-1 rounded-[16px] my-2 overflow-hidden flex flex-col justify-between relative border border-slate-800">
                {/* State: Idle */}
                {simulatorState === "idle" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-3 text-center space-y-3">
                    <Radio className="w-8 h-8 text-accent animate-pulse" />
                    <div className="space-y-0.5">
                      <p className="text-white text-[10px] font-bold">New Podcast Episode</p>
                      <p className="text-[8px] text-slate-500">Tap below to test redirection:</p>
                    </div>
                    <button 
                      onClick={runSimulation}
                      className={`w-full py-1.5 px-2 text-[8px] font-bold rounded border flex items-center justify-center gap-1 active:scale-95 transition-transform ${
                        activeTab === "standard" 
                          ? "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700" 
                          : "bg-accent text-background border-accent font-extrabold"
                      }`}
                    >
                      {activeTab === "standard" ? "apple.co/mypodcast" : "linktery.com/podcast"} <ExternalLink className="w-2 h-2" />
                    </button>
                  </div>
                )}

                {/* State: Loading */}
                {simulatorState === "loading" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-3 text-center space-y-2">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-[7px] text-slate-500 font-mono">Routing client headers...</p>
                  </div>
                )}

                {/* State: Webview (Blocked - Standard Links) */}
                {simulatorState === "webview" && (
                  <div className="flex-1 flex flex-col justify-between bg-slate-950 text-slate-200 p-2 animate-slide-up">
                    <div className="border-b border-slate-850 pb-1.5 mb-1.5 flex items-center justify-between text-[6px] text-slate-500 font-mono">
                      <span>🔒 in-app-browser-webview</span>
                      <X className="w-2 h-2 text-slate-500 cursor-pointer" onClick={() => setSimulatorState("idle")} />
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center p-1 space-y-3">
                      <div className="w-7 h-7 bg-red-950/20 border border-red-500/20 rounded-full flex items-center justify-center text-red-400">
                        <ShieldX className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-[9px] font-bold text-slate-100 uppercase">
                          {simulatedPlatform === "apple" ? "Apple Podcasts Web" : simulatedPlatform === "spotify" ? "Spotify Web Player" : "Overcast Web"}
                        </h4>
                        <p className="text-[7px] text-slate-500">Sign in to subscribe and listen to full episode.</p>
                      </div>
                      <div className="w-full h-4 bg-slate-900 border border-slate-800 rounded text-[6px] px-1 flex items-center text-slate-600">Apple ID / Username</div>
                      <button className="w-full py-1 bg-slate-800 text-white font-bold rounded text-[7px]">Log In</button>
                    </div>

                    <div className="border-t border-slate-900 pt-1.5 text-center text-[6px] text-red-500 font-bold uppercase">
                      ⚠️ Lost subscriber. 85% dropoff risk.
                    </div>
                  </div>
                )}

                {/* State: Success (Deep Link triggers Native App) */}
                {simulatorState === "success" && (
                  <div className="flex-1 flex flex-col items-center justify-center p-3 text-center bg-slate-950/80 animate-fade-in space-y-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-white text-[9px] font-bold uppercase">Deep Link Resolves</p>
                      <p className="text-[8px] text-emerald-400 font-bold uppercase">
                        Native Player Launched
                      </p>
                      <p className="text-[7px] text-slate-500 leading-normal">
                        Launched {simulatedPlatform === "apple" ? "Apple Podcasts" : simulatedPlatform === "spotify" ? "Spotify App" : "Overcast App"} directly on device.
                      </p>
                    </div>

                    {/* Audio wave feedback animation */}
                    {isPlaying && (
                      <div className="flex items-end justify-center gap-0.5 h-4 w-full">
                        <div className="w-0.5 bg-emerald-500 animate-[pulse_0.8s_infinite] h-3" />
                        <div className="w-0.5 bg-emerald-400 animate-[pulse_0.6s_infinite] h-4" style={{ animationDelay: '0.2s' }} />
                        <div className="w-0.5 bg-emerald-500 animate-[pulse_1s_infinite] h-2.5 animate-bounce" style={{ animationDelay: '0.4s' }} />
                        <div className="w-0.5 bg-emerald-400 animate-[pulse_0.7s_infinite] h-3.5" style={{ animationDelay: '0.1s' }} />
                      </div>
                    )}

                    <button 
                      onClick={() => setSimulatorState("idle")}
                      className="py-0.5 px-1.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[6px] font-bold"
                    >
                      Reset
                    </button>
                  </div>
                )}

              </div>

              {/* Home bar */}
              <div className="w-14 h-0.5 bg-slate-800 rounded-full mx-auto" />
            </div>

            {/* Visual Callout */}
            <div className="mt-4 text-center text-[11px] text-muted-foreground font-mono">
              {simulatorState === "idle" && "💡 Click the link in the simulator above."}
              {simulatorState === "webview" && "❌ Missing login credentials. Dropoff."}
              {simulatorState === "success" && "✅ Native podcast player opened directly."}
            </div>
          </div>
        </div>

      </section>

      {/* CONTINUOUS NARRATIVE: VISUAL AUDIENCE GROWTH FUNNEL (SVG Funnel Chart) */}
      <section id="growth-funnel" className="py-16 px-6 max-w-7xl mx-auto relative z-10 border-t border-border/45">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-accent text-xs font-bold uppercase tracking-widest">Audience Retention Funnel</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-2 mb-4">
            WHERE ARE YOU LOSING LISTENERS?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Standard bio link shorteners lose up to 85% of traffic between click and play. Linktery repairs the leakage by routing users natively.
          </p>
        </div>

        {/* Asymmetrical layout: Funnel Graphic left, Explanation text right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Funnel SVG Visualization (7 columns) */}
          <div className="lg:col-span-7 flex justify-center items-center">
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-border bg-surface/30 backdrop-blur-md w-full max-w-xl space-y-6">
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase border-b border-border/60 pb-3">
                <span>Traffic Funnel Step</span>
                <span>Standard Link vs Linktery</span>
              </div>

              {/* Step 1: Click */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-white">
                  <span>1. Bio Link Clicks</span>
                  <span>100% (1,000 visitors)</span>
                </div>
                <div className="h-6 bg-slate-900 border border-border/60 rounded-xl relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-accent/40 w-full transition-all duration-500" />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white uppercase">1,000 clicks</span>
                </div>
              </div>

              {/* Step 2: Redirection */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-white">
                  <span>2. Bypassed Webview Jail</span>
                  <span className="text-red-400">15% Standard</span>
                  <span className="text-emerald-400"> / 95% Linktery</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="h-5 bg-slate-900 border border-border/60 rounded-xl relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-red-600/40 w-[15%] transition-all duration-500" />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-300">150 users</span>
                    </div>
                    <span className="text-[10px] text-red-400 block text-left">Standard webview blocks</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-5 bg-slate-900 border border-border/60 rounded-xl relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-emerald-500/40 w-[95%] transition-all duration-500" />
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">950 users</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 block text-left">Linktery native launch</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Action */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-white">
                  <span>3. Active Subscription Play</span>
                  <span className="text-red-400">~150 plays</span>
                  <span className="text-emerald-400"> / ~950 plays</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl text-left">
                    <span className="text-2xl font-black text-white">150</span>
                    <span className="text-[10px] text-muted-foreground block">Actual listens per 1k clicks</span>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl text-left">
                    <span className="text-2xl font-black text-white">950</span>
                    <span className="text-[10px] text-muted-foreground block">Actual listens per 1k clicks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Explanation Text (5 columns) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">The 80% Conversion Leak</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Standard redirect tools fail because they are unaware of mobile environments. If a customer clicks a podcast link on a phone:
            </p>
            <ul className="space-y-3 text-xs text-muted-foreground font-mono">
              <li className="flex items-start gap-2">
                <span className="text-red-500">❌</span>
                They are sent to a slow web-preview of the podcast inside Instagram or TikTok webviews.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">❌</span>
                They are asked to sign in to their Apple ID or Spotify account.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400">✅</span>
                <strong>Linktery bypasses this:</strong> Launches the local podcasts player directly. Listener hits play in one click.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* COHESIVE TESTIMONIALS SECTION (E-E-A-T Signal Boost) */}
      <section className="py-16 px-6 max-w-5xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest">Creator Reviews</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">TRUSTED BY TOP SHOWS</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card p-6 md:p-8 border border-border/80 bg-surface/30 backdrop-blur-md rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "We used to see thousands of clicks on our Instagram bio link, but our subscriber base in Apple Podcasts barely grew. After switching to Linktery, we saw our listener-to-subscriber conversion rate spike by 45% in the first week. The bypass script is magic."
            </p>
            <div className="flex items-center gap-3.5 border-t border-border/40 pt-4 mt-6">
              <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center">
                <Headphones className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left font-mono">
                <h4 className="text-xs font-bold text-white">The Tech Daily Show</h4>
                <p className="text-[10px] text-muted-foreground uppercase">120K monthly downloads</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 md:p-8 border border-border/80 bg-surface/30 backdrop-blur-md rounded-3xl relative overflow-hidden flex flex-col justify-between">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "Promoting a podcast on TikTok is incredibly painful because the in-app browser blocks everything. Linktery deep links force their phones to open the native Spotify App. We added over 12,000 active subscribers last month alone."
            </p>
            <div className="flex items-center gap-3.5 border-t border-border/40 pt-4 mt-6">
              <div className="w-10 h-10 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left font-mono">
                <h4 className="text-xs font-bold text-white">Mindset & Wealth Podcast</h4>
                <p className="text-[10px] text-muted-foreground uppercase">300K monthly downloads</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix Section */}
      <section className="py-12 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 uppercase">REDIRECTION MATRICES</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Compare routing features between Linktery and standard link aggregators.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase">
                <th className="p-4 md:p-6">Feature Comparison</th>
                <th className="p-4 md:p-6 text-accent">Linktery Smart Link</th>
                <th className="p-4 md:p-6">Standard Shorteners</th>
                <th className="p-4 md:p-6">Linktree/Beacons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Bypasses In-App Webviews</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Opens native podcast app)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Opens web player)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Trapped in web player)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Subdomain Mapping</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Free mapping)</td>
                <td className="p-4 md:p-6">Only premium plans</td>
                <td className="p-4 md:p-6">Only premium plans</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Analytics Conversion Telemetry</td>
                <td className="p-4 md:p-6 text-green-400 font-medium">✅ Yes (Geo, Device OS, referrers)</td>
                <td className="p-4 md:p-6 text-red-500">❌ Click count only</td>
                <td className="p-4 md:p-6">Limited stats</td>
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

      {/* FAQ Section */}
      <section className="py-16 px-6 max-w-3xl mx-auto relative z-10 border-t border-border/50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-accent" /> Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Everything you need to know about podcast smart links and redirection bypasses.
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
            Double Your Podcast Subscriber Clicks
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Configure smart links, bypass mobile in-app webviews, and route listeners directly to Apple Podcasts or Spotify.
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
