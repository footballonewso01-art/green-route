import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, AlertTriangle, HelpCircle,
  ShieldCheck, Smartphone, ExternalLink, RefreshCw, Eye, EyeOff, ShieldX,
  TrendingUp, Users, Lock, Play, Pause, Network
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function FanvueSmartLinks() {
  const { user } = useAuth();
  
  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Rotator Simulator State
  const [weightFanvue, setWeightFanvue] = useState<number>(60);
  const [weightFansly, setWeightFansly] = useState<number>(30);
  const [weightPatreon, setWeightPatreon] = useState<number>(10);
  
  const [filterBots, setFilterBots] = useState<boolean>(true);
  const [simulatedClicks, setSimulatedClicks] = useState<{ id: number; target: "fanvue" | "fansly" | "patreon" | "safe"; isBot: boolean }[]>([]);
  const [clickCounter, setClickCounter] = useState<number>(0);

  // Ban Shield Simulator State
  const [shieldActive, setShieldActive] = useState<boolean>(true);
  const [banSimulatorState, setBanSimulatorState] = useState<"idle" | "testing" | "flagged" | "passed">("idle");

  // Run Ban Shield Simulation
  const runBanShieldSimulation = () => {
    setBanSimulatorState("testing");
    setTimeout(() => {
      if (shieldActive) {
        setBanSimulatorState("passed");
      } else {
        setBanSimulatorState("flagged");
      }
    }, 1500);
  };

  // Run Rotator Simulation DOT flow
  useEffect(() => {
    const interval = setInterval(() => {
      const isBot = Math.random() < 0.25; // 25% chance of click being a crawler/bot
      let target: "fanvue" | "fansly" | "patreon" | "safe" = "fanvue";

      if (isBot && filterBots) {
        target = "safe";
      } else {
        const rand = Math.random() * 100;
        if (rand < weightFanvue) {
          target = "fanvue";
        } else if (rand < weightFanvue + weightFansly) {
          target = "fansly";
        } else {
          target = "patreon";
        }
      }

      setSimulatedClicks((prev) => [
        ...prev.slice(-8), // Keep last 8 clicks for display
        { id: clickCounter, target, isBot }
      ]);
      setClickCounter((c) => c + 1);
    }, 1400);

    return () => clearInterval(interval);
  }, [weightFanvue, weightFansly, weightPatreon, filterBots, clickCounter]);

  // Handle Weight Balance
  const handleWeightChange = (platform: "fanvue" | "fansly" | "patreon", val: number) => {
    if (platform === "fanvue") {
      setWeightFanvue(val);
      // Redistribute remainder between other two
      const remainder = 100 - val;
      const splitRatio = weightFansly + weightPatreon > 0 ? weightFansly / (weightFansly + weightPatreon) : 0.5;
      setWeightFansly(Math.round(remainder * splitRatio));
      setWeightPatreon(Math.round(remainder * (1 - splitRatio)));
    } else if (platform === "fansly") {
      setWeightFansly(val);
      const remainder = 100 - val;
      const splitRatio = weightFanvue + weightPatreon > 0 ? weightFanvue / (weightFanvue + weightPatreon) : 0.5;
      setWeightFanvue(Math.round(remainder * splitRatio));
      setWeightPatreon(Math.round(remainder * (1 - splitRatio)));
    } else {
      setWeightPatreon(val);
      const remainder = 100 - val;
      const splitRatio = weightFanvue + weightFansly > 0 ? weightFanvue / (weightFanvue + weightFansly) : 0.5;
      setWeightFanvue(Math.round(remainder * splitRatio));
      setWeightFansly(Math.round(remainder * (1 - splitRatio)));
    }
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
      question: "Why do social networks shadowban links to Fanvue or Fansly?",
      answer: "Platforms like Instagram, TikTok, and Meta have extremely strict safety filters against adult, sensitive, or NSFW platforms. When you place a direct link to fanvue.com in your bio, automated bots audit the URL signature, flag the adult domain, and immediately limit your account reach, leading to permanent shadowbans or account suspension."
    },
    {
      question: "How does Linktery's Ban Shield prevent social media flags?",
      answer: "Linktery utilizes dynamic domain signature cloaking. When a crawler bot from Meta or TikTok audits your link, Linktery identifies their server signatures and routes them to a safe, clean, fully-compliant decoy profile. Real human shoppers are instantly routed directly to your Fanvue or Fansly pages, keeping your links completely safe from algorithm triggers."
    },
    {
      question: "What is a Link Rotator and why do AI agencies use it?",
      answer: "A Link Rotator distributes incoming traffic dynamically across multiple destinations based on custom percentage weights. AI agencies managing virtual models use it to scale promotions: distributing traffic across primary Fanvue pages, backup Fansly profiles, and special checkout offers, while ensuring that if one target link goes down, the traffic is automatically redirected to a working page."
    },
    {
      question: "Can I track which social media profile drove the most subscribers?",
      answer: "Yes. Linktery provides deep UTM and referrer attribution tracking. You can see exactly how many clicks originated from specific Reddit threads, Instagram Reels, or TikTok video accounts in real-time on your dashboard."
    },
    {
      question: "Do I need to pay extra for custom domains?",
      answer: "No. Linktery allows you to bind your own custom domains (e.g. bio.myaiinfluencer.com) completely free on all creator accounts. Bind multiple domains to rotate links and spread ban risks."
    }
  ];

  // Dynamic JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery AI Influencer Link Rotator",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "iOS, Android, Web",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.94",
          "ratingCount": "228"
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
    ...SEO_PAGES.fanvueSmartLinks,
    structuredData
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-10 left-1/4 w-[450px] h-[450px] bg-accent rounded-full blur-[130px] mix-blend-screen animate-pulse" style={{ animationDuration: '9s' }} />
        <div className="absolute bottom-10 right-1/3 w-[380px] h-[380px] bg-emerald-500 rounded-full blur-[110px] mix-blend-screen" />
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

      {/* HERO HERO SECTION WITH OFFSETS */}
      <section className="relative pt-32 pb-8 px-6 max-w-7xl mx-auto z-10 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm font-semibold">
          <Network className="w-3.5 h-3.5 animate-spin-slow" />
          Ban-Proof Link Rotator for AI Influencers
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-white max-w-5xl mx-auto uppercase">
          SCALE TRAFFIC FOR
          <br />
          <span className="gradient-text">AI MODEL ACENCIES</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Avoid Instagram adult-link shadowbans. Cloak your Fanvue and Fansly domains, rotate traffic weight dynamically, and filter out crawler bots automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          {user ? (
            <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
              Open Rotator Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
              Create Rotator Link <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <a href="#ban-shield" className="px-6 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
            Test Ban Shield
          </a>
        </div>
      </section>

      {/* INTERACTIVE NODE ROTATOR GRAPH GRAPHICS */}
      <section className="py-10 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-border/60 pb-5 mb-8 gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block font-mono">FLOW SIMULATOR</span>
              <h3 className="text-lg font-bold text-white uppercase">Visual Traffic Rotator</h3>
            </div>
            <div className="flex items-center gap-3 bg-background border border-border p-2 rounded-xl">
              <span className="text-xs text-muted-foreground font-bold">Bot Filter:</span>
              <button 
                onClick={() => setFilterBots(!filterBots)}
                className={`w-12 h-6 rounded-full p-1 transition-all ${filterBots ? "bg-accent" : "bg-slate-800"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all ${filterBots ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Weight Sliders (5 columns) */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <div className="bg-background/85 border border-border/80 p-5 rounded-2xl space-y-6">
                
                {/* Weight: Fanvue */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-white uppercase font-mono">
                    <span className="text-emerald-400">Fanvue Primary</span>
                    <span>{weightFanvue}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={weightFanvue}
                    onChange={(e) => handleWeightChange("fanvue", Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>

                {/* Weight: Fansly */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-white uppercase font-mono">
                    <span className="text-accent">Fansly Backup</span>
                    <span>{weightFansly}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={weightFansly}
                    onChange={(e) => handleWeightChange("fansly", Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>

                {/* Weight: Patreon */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-white uppercase font-mono">
                    <span className="text-slate-400">Decoy / Patreon</span>
                    <span>{weightPatreon}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={weightPatreon}
                    onChange={(e) => handleWeightChange("patreon", Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>

              </div>
              
              <div className="text-xs text-muted-foreground font-mono space-y-2 leading-relaxed">
                <p>💡 <strong className="text-white">Live Node Simulation:</strong> Dots flow from left (Social clicks) through the Linktery rotator node to targets based on weights.</p>
                {filterBots && <p className="text-red-400">🛡️ Crawler bots (Red dots) are auto-detected and filtered into a safe decoy page.</p>}
              </div>
            </div>

            {/* Right: Flow Visualizer Graphics (7 columns) */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="bg-slate-950 border border-slate-800 w-full max-w-[420px] h-[280px] rounded-2xl p-4 relative overflow-hidden flex items-center justify-between">
                
                {/* Traffic Origin Left */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase font-mono mt-1">Bio Click</span>
                </div>

                {/* Rotator Hub Center */}
                <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/35 flex items-center justify-center text-accent relative z-10 animate-pulse">
                  <Network className="w-6 h-6 text-accent animate-spin-slow" />
                  <div className="absolute inset-0 border border-accent/20 rounded-full animate-ping" />
                </div>

                {/* Traffic Outputs Right */}
                <div className="flex flex-col gap-4 z-10 text-left w-[120px]">
                  
                  {/* Target 1: Fanvue */}
                  <div className="bg-slate-900/90 border border-emerald-500/20 p-2 rounded-lg text-left relative overflow-hidden">
                    <span className="text-[9px] font-black text-white uppercase block">Fanvue ({weightFanvue}%)</span>
                    <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${weightFanvue}%` }} />
                    </div>
                  </div>

                  {/* Target 2: Fansly */}
                  <div className="bg-slate-900/90 border border-accent/20 p-2 rounded-lg text-left relative overflow-hidden">
                    <span className="text-[9px] font-black text-white uppercase block">Fansly ({weightFansly}%)</span>
                    <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-accent transition-all duration-300" style={{ width: `${weightFansly}%` }} />
                    </div>
                  </div>

                  {/* Target 3: Decoy Safe */}
                  <div className="bg-slate-900/90 border border-border/80 p-2 rounded-lg text-left relative overflow-hidden">
                    <span className="text-[9px] font-black text-white uppercase block">
                      {filterBots ? "🛡️ Decoy Safe" : `Patreon (${weightPatreon}%)`}
                    </span>
                    <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-slate-500 transition-all duration-300" style={{ width: `${filterBots ? 100 : weightPatreon}%` }} />
                    </div>
                  </div>

                </div>

                {/* Animated Dot Flows using React Simulated list */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                  {simulatedClicks.map((click) => {
                    let pathClass = "";
                    if (click.target === "fanvue") pathClass = "animate-flow-fanvue text-emerald-400";
                    else if (click.target === "fansly") pathClass = "animate-flow-fansly text-accent";
                    else if (click.target === "patreon") pathClass = "animate-flow-patreon text-slate-400";
                    else pathClass = "animate-flow-safe text-red-500";

                    return (
                      <div 
                        key={click.id} 
                        className={`absolute top-[48%] left-[10%] w-2 h-2 rounded-full font-black text-[12px] flex items-center justify-center ${pathClass}`}
                        style={{
                          backgroundColor: click.isBot ? "rgb(239, 68, 68)" : "rgb(52, 211, 153)",
                          boxShadow: click.isBot ? "0 0 10px rgb(239, 68, 68)" : "0 0 10px rgb(52, 211, 153)"
                        }}
                      />
                    );
                  })}
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* BAN SHIELD SANDBOX SIMULATOR */}
      <section id="ban-shield" className="py-16 px-6 max-w-4xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">SECURITY SANDBOX</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">Ban Shield Simulator</h2>
          <p className="text-sm text-muted-foreground">
            Test how algorithms audit your bio link. Direct adult links trigger shadowbans; Linktery shields hide adult domain signatures.
          </p>
        </div>

        <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left Panel: Configuration (5 columns) */}
          <div className="md:col-span-5 space-y-6 text-left">
            <div className="bg-background/80 border border-border/80 p-5 rounded-2xl space-y-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Security Toggle</span>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-bold">Domain Shielding:</span>
                <button 
                  onClick={() => { setShieldActive(!shieldActive); setBanSimulatorState("idle"); }}
                  className={`w-12 h-6 rounded-full p-1 transition-all ${shieldActive ? "bg-accent" : "bg-red-600"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-slate-950 transition-all ${shieldActive ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono leading-normal pt-2 border-t border-border/40 space-y-1">
                <p>Status: <span className={shieldActive ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                  {shieldActive ? "Shield Active (Cloaking)" : "Unprotected (Direct Link)"}
                </span></p>
                <p>Domain: <span className="text-white">{shieldActive ? "links.mybrand.com" : "fanvue.com/myprofile"}</span></p>
              </div>

              <button 
                onClick={runBanShieldSimulation}
                disabled={banSimulatorState === "testing"}
                className="w-full py-3 bg-accent text-background font-black text-xs uppercase rounded-xl hover:opacity-90 active:scale-95 transition-all"
              >
                {banSimulatorState === "testing" ? "Auditing Link..." : "Scan Domain"}
              </button>
            </div>
          </div>

          {/* Right Panel: Crawler Logs Output (7 columns) */}
          <div className="md:col-span-7">
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl h-[220px] flex flex-col justify-between font-mono text-left relative overflow-hidden">
              <div className="flex justify-between items-center text-[8px] text-slate-500 border-b border-slate-900 pb-2">
                <span>🤖 CRAWLER AUDIT CONSOLE</span>
                <span>SECURE SSL</span>
              </div>

              <div className="flex-1 text-[9.5px] py-3 space-y-1 overflow-y-auto leading-relaxed">
                {banSimulatorState === "idle" && (
                  <p className="text-slate-500 animate-pulse">&gt; Ready for scan. Click "Scan Domain" to simulate social app crawler bots.</p>
                )}
                {banSimulatorState === "testing" && (
                  <>
                    <p className="text-slate-400">&gt; Incoming request from MetaAuditorBot/v3.4...</p>
                    <p className="text-slate-400">&gt; Headers: User-Agent: FacebookExternalHit/1.1...</p>
                    <p className="text-yellow-400 animate-pulse">&gt; Analyzing domain registration records...</p>
                  </>
                )}
                {banSimulatorState === "flagged" && (
                  <>
                    <p className="text-slate-400">&gt; Incoming request from MetaAuditorBot/v3.4...</p>
                    <p className="text-slate-400">&gt; Headers: User-Agent: FacebookExternalHit/1.1...</p>
                    <p className="text-red-400">&gt; Flagged domain matching: adult_directory (fanvue.com)</p>
                    <p className="text-red-500 font-extrabold uppercase">&gt; CRITICAL EXCEPTION: Direct adult link. Initiating shadowban flag.</p>
                  </>
                )}
                {banSimulatorState === "passed" && (
                  <>
                    <p className="text-slate-400">&gt; Incoming request from MetaAuditorBot/v3.4...</p>
                    <p className="text-slate-400">&gt; Headers: User-Agent: FacebookExternalHit/1.1...</p>
                    <p className="text-emerald-400">&gt; Target domain checked: clean subdomain signature (mybrand.com)</p>
                    <p className="text-emerald-400">&gt; Bot routed to compliant decoy profile. Signature verified.</p>
                    <p className="text-emerald-400 font-extrabold uppercase">&gt; AUDIT PASSED: Account link safe. Reach unrestricted.</p>
                  </>
                )}
              </div>

              <div className="border-t border-slate-900 pt-2 text-center text-[9px] uppercase font-bold">
                {banSimulatorState === "flagged" && <span className="text-red-500 animate-pulse">❌ Flagged. Link causes shadowban.</span>}
                {banSimulatorState === "passed" && <span className="text-emerald-400 animate-pulse">✅ Safe. Domain signature disguised.</span>}
                {banSimulatorState === "idle" && <span className="text-slate-500">Awaiting scan...</span>}
                {banSimulatorState === "testing" && <span className="text-yellow-400 animate-pulse">Scanning...</span>}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* EDUCATIONAL DETAILED PROBLEM JOURNEY IN ENGLISH */}
      <section className="py-16 px-6 max-w-7xl mx-auto border-t border-border/45 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">CREATOR CASE STUDY</span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mt-2 mb-4 uppercase">
            The Reality of NSFW Promotion
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Let's analyze how standard bio links limit virtual model agencies compared to a secure Linktery routing setup.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mb-16">
          
          {/* Friction Path */}
          <div className="glass-card p-6 md:p-8 border border-red-500/20 bg-red-950/5 rounded-[32px] flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                  <ShieldX className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-red-500 uppercase font-mono tracking-wider">CREATOR PAIN POINT</span>
                  <h4 className="text-lg font-bold text-white uppercase">Direct Bio Link sharing</h4>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                You place a direct link to your Fanvue page in your Instagram or TikTok profile bio:
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex gap-3">
                  <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Adult Domain Auditing.</strong> Crawler bots routinely audit bio links. Direct adult domain signatures (fanvue.com) trigger security flags instantly.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Account Shadowbans.</strong> Meta limits the views and organic reach of profiles linking directly to flagged NSFW destinations, cutting off views to Reels.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-xs font-mono font-bold text-red-500 bg-red-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Zero Link Redirection.</strong> If a Fanvue account or custom link goes down, your bio link goes completely dead, wasting active promo traffic.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-red-500/10 pt-4 text-center text-xs font-mono text-red-400 font-bold uppercase tracking-wider">
              ⚠️ Result: Wasted traffic & account bans.
            </div>
          </div>

          {/* Secure Path */}
          <div className="glass-card p-6 md:p-8 border border-emerald-500/20 bg-emerald-950/5 rounded-[32px] flex flex-col justify-between space-y-6 text-left">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono tracking-wider">LINKTERY ADVANTAGE</span>
                  <h4 className="text-lg font-bold text-white uppercase">Cloaked Subdomain & Rotator</h4>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                You configure a custom subdomain rotator link (e.g. bio.yourmodelname.com):
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex gap-3">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Decoy Redirection.</strong> Moderator bot crawlers are automatically sent to compliant landing pages. Safe and clean signatures are recorded.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Active Split Rotation.</strong> Rotate traffic across multiple profiles (Patreon, Fansly, Fanvue), ensuring a balanced funnel and active backup links.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-white">Organic Reach Protected.</strong> Because your domain shows clean signatures, your Instagram/TikTok accounts retain maximum organic algorithmic push.
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-emerald-500/10 pt-4 text-center text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
              🎉 Result: Maximum reach, active split routing.
            </div>
          </div>

        </div>

        {/* Dynamic Explanation Card */}
        <div className="glass-card p-6 md:p-10 border border-border/80 bg-surface/20 rounded-[32px] grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left">
          <div className="md:col-span-4 flex flex-col space-y-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-white uppercase leading-tight">
              Why do you need<br />
              <span className="text-accent">a link rotator?</span>
            </h3>
          </div>
          <div className="md:col-span-8 text-sm text-muted-foreground space-y-4 leading-relaxed font-medium">
            <p>
              In the AI model space, agencies manage virtual models (models generated by Midjourney/Stable Diffusion) across dozens of promotional social media profiles. Routing all traffic directly to a single Fanvue page creates a single point of failure.
            </p>
            <p>
              By utilizing a **Linktery Rotator**, you can scale. Distribute traffic across your primary Fanvue page, backing it up with alternative Fansly profiles, and routing custom tracking slugs for specific promotion channels (e.g. tracking specific Reddit subreddits or TikTok profiles).
            </p>
          </div>
        </div>

      </section>

      {/* MATRIX COMPARISON TABLE */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">CAPABILITY COMPONENT</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1 mb-3">ROTATOR COMPARISONS</h2>
          <p className="text-sm text-muted-foreground">
            Compare ban-shield and rotators features with standard bio link aggregators.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase font-mono">
                <th className="p-4 md:p-6">Rotator Features</th>
                <th className="p-4 md:p-6 text-accent">Linktery Smart Link</th>
                <th className="p-4 md:p-6">Linktree/Beacons</th>
                <th className="p-4 md:p-6">Traditional Shorteners</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90 font-medium">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Bot & Crawler Decoy Routing</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Redirects bots to safe pages)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Directly audited)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Directly audited)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Multi-Target Rotator Weights</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Custom split percentages)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Single destination only)</td>
                <td className="p-4 md:p-6">Only premium plans</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Referrer UTM Attribution</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Accurately tracks promo traffic)</td>
                <td className="p-4 md:p-6 text-yellow-500">⚠️ Limited stats</td>
                <td className="p-4 md:p-6 text-yellow-500">⚠️ Basic counts</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Custom Subdomain Rotations</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Free domain binding)</td>
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
            Everything you need to know about setting up link rotators, domain cloaking, and protecting your AI model profiles.
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
            Scale Your AI Model Traffic
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Protect accounts from shadowbans, cloak adult links dynamically, and split traffic weights safely across all models.
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
      <Footer />
    </div>
  );
}
