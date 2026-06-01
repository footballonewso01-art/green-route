import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, Shield, Zap, Globe, 
  User as UserIcon, ChevronDown, 
  Sparkles, Layers, HelpCircle,
  ExternalLink, Smartphone, CheckSquare,
  Cpu, Lock, AlertOctagon, Scale, ArrowRightLeft, ShieldAlert,
  Sliders, Layout, Play, Check, Clock, TrendingDown, Terminal
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function SmartRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Visualizer Tab State: "device" | "geo" | "split"
  const [visualizerTab, setVisualizerTab] = useState<"device" | "geo" | "split">("device");
  
  // Interactive variables inside visualizer
  const [selectedDevice, setSelectedDevice] = useState<"ios" | "android">("ios");
  const [selectedGeo, setSelectedGeo] = useState<"us" | "eu">("us");
  const [splitWeightA, setSplitWeightA] = useState<number>(50);
  
  // Latency Calculator State
  const [simulatedLatency, setSimulatedLatency] = useState<number>(280);
  const [cpcValue, setCpcValue] = useState<number>(1.50);
  const [monthlyTraffic, setMonthlyTraffic] = useState<number>(20000);

  const [isTestingLink, setIsTestingLink] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  const handleTestLink = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingLink(true);
    setTimeout(() => {
      setIsTestingLink(false);
      setShowRegisterModal(true);
    }, 950);
  };

  const handleModalClose = () => {
    setShowRegisterModal(false);
  };

  const handleRegisterRedirect = () => {
    const params = new URLSearchParams({
      ref: "smart-link-redirect",
      type: visualizerTab,
      device: selectedDevice,
      geo: selectedGeo,
      weight: splitWeightA.toString()
    });
    navigate(`/register?${params.toString()}`);
  };

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  const faqItems: FaqItem[] = [
    {
      question: "How does smart routing differ from standard link shorteners?",
      answer: "Standard shorteners (like Bitly) use static 301/302 redirects where every visitor goes to the exact same destination URL. Smart routing dynamically inspects the visitor's HTTP request variables (operating system, browser language, country code, referring platform) at the Edge level and dispatches them to different destination URLs based on your custom rules."
    },
    {
      question: "Can I set up A/B split-testing under a CNAME custom subdomain?",
      answer: "Yes. Once you connect your custom subdomain (e.g., track.yourbrand.com) via CNAME records, you can configure A/B split-testing weight rules. Linktery splits the traffic (e.g., 60/40) dynamically at our edge server level, giving you precise conversion yields without shared platform footprint bans."
    },
    {
      question: "Does the routing engine verify traffic quality to protect ad accounts?",
      answer: "Absolutely. Linktery runs request validation checks. We compare incoming IP addresses against known datacenter ASN records (Google, Facebook, TikTok ad crawlers) and verify browser user agent signatures. Crawlers are redirected to compliant informational safety pages, while real human buyers proceed to your affiliate offers, keeping your campaigns running."
    },
    {
      question: "What is the redirection latency on Linktery?",
      answer: "Linktery's routing processing takes less than 12ms. Our serverless edge compute runs globally across multiple data centers, executing redirection logic at the node closest to the visitor. There is zero perceivable latency, ensuring your ad campaigns do not suffer click-to-page bounce losses."
    }
  ];

  // Dynamic JSON-LD Structured Data for FAQPage and SoftwareApplication
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Traffic Redirect Engine",
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

  // Call the SEO hook with the registered configuration and dynamic structured data
  useSeo({
    ...SEO_PAGES.smartRedirect,
    structuredData
  });

  return (
    <div className="min-h-screen bg-[#06080c] text-[#f1f3f7] font-sans antialiased relative overflow-hidden">

      {/* Bauhaus Grid Layout Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161e2b_1px,transparent_1px),linear-gradient(to_bottom,#161e2b_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-25 pointer-events-none z-0" />

      {/* Bold Bauhaus color blocks (Amber/Gold and Emerald/Green) */}
      <div className="absolute top-0 left-0 w-[40vw] h-[40vw] bg-[#06b6d4]/5 rounded-none [clip-path:polygon(0_0,100%_0,0_100%)] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[35vw] h-[35vw] bg-[#eab308]/5 rounded-none [clip-path:polygon(100%_100%,100%_0,0_100%)] pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b-2 border-slate-950 bg-[#06080c]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.webp" alt="Linktery Logo" className="h-[52px] w-auto mix-blend-screen" />
            <span className="text-xl font-black tracking-tighter text-white uppercase">Linktery</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Home</Link>
            <Link to="/pricing" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Pricing</Link>

            {user ? (
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <span className="text-sm font-bold text-slate-400 group-hover:text-white transition-colors">Dashboard</span>
                <div className="w-8 h-8 rounded-none border-2 border-slate-850 p-0.5 overflow-hidden group-hover:border-[#06b6d4] transition-colors">
                  {getAvatarUrl() ? (
                    <img src={getAvatarUrl()!} alt="User avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Login</Link>
                <Link to="/register" className="bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 text-xs font-black py-2.5 px-5 rounded-none border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">Start Routing Traffic</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Bauhaus Remix Style 2 (Asymmetric Grid) */}
      <section className="relative pt-36 pb-20 px-6 z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-slate-950 bg-[#06b6d4] text-slate-950 text-xs font-mono font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <Cpu className="w-4 h-4" /> Edge-Engine Redirection Protocol
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white uppercase leading-[0.98]">
            Route Campaign Clicks.<br />
            <span className="bg-[#eab308] text-slate-950 px-4 py-1.5 inline-block border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-2">
              Optimize Every Impression.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
            Take full control of your advertising links. Route visitors dynamically by operating system, location criteria, or test multiple landing page weights at the serverless Edge DNS.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <a href="#visualizer" className="bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2">
              Configure Targeting Rules <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#pipeline" className="bg-[#06080c] hover:bg-slate-900 border-2 border-slate-950 text-white font-bold py-4 px-6 rounded-none text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              View Safety Controls
            </a>
          </div>
        </div>

        <div className="lg:col-span-5 border-4 border-slate-950 bg-slate-950 p-2 text-center rounded-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <div className="bg-[#0b0f19] border-2 border-slate-950 p-5 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Linktery Core System</span>
              <span className="text-[#06b6d4] font-mono text-[9px] font-bold">READY</span>
            </div>
            <ul className="space-y-2 text-xs font-mono text-slate-400">
              <li className="flex items-center gap-2 text-white"><Check className="w-3.5 h-3.5 text-emerald-400" /> Redirect Processing time: &lt;12ms</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Geo-routing rules: Mapped</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Device redirection: Active</li>
              <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Validation bot scanner: Online</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Interactive Routing Rules Visualizer */}
      <section id="visualizer" className="py-20 px-6 border-t-4 border-slate-950 bg-[#0c0f17]/40 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4 uppercase">
              Routing Rules Visualizer
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Select a routing rule parameter below to simulate visitor dispatch paths in real-time.
            </p>

            {/* Tab Toggles */}
            <div className="mt-8 inline-flex p-1 bg-slate-950 border-2 border-slate-950 rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <button 
                onClick={() => setVisualizerTab("device")}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-none transition-all ${
                  visualizerTab === "device" 
                    ? "bg-[#06b6d4] text-slate-950 border border-slate-950 font-bold" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Device OS Rule
              </button>
              <button 
                onClick={() => setVisualizerTab("geo")}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-none transition-all ${
                  visualizerTab === "geo" 
                    ? "bg-[#eab308] text-slate-950 border border-slate-950 font-bold" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Geo Location Rule
              </button>
              <button 
                onClick={() => setVisualizerTab("split")}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-none transition-all ${
                  visualizerTab === "split" 
                    ? "bg-white text-slate-950 border border-slate-950 font-bold" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                A/B Split Weight
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch max-w-5xl mx-auto">
            {/* Left Column: Interactive Inputs */}
            <div className="lg:col-span-5 bg-slate-950 border-2 border-slate-950 p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
              <div>
                <div className="border-b-2 border-slate-900 pb-3 mb-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Rule Variable Selection</h4>
                </div>

                {visualizerTab === "device" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 leading-normal">
                      Inspect visitor's device. Trigger native mobile app store redirection based on OS.
                    </p>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Simulate Visitor OS</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setSelectedDevice("ios")}
                          className={`py-2 text-xs font-bold border border-slate-800 ${selectedDevice === "ios" ? "bg-white text-slate-950 font-black" : "bg-slate-900 text-slate-400"}`}
                        >
                          iOS Client (iPhone)
                        </button>
                        <button 
                          onClick={() => setSelectedDevice("android")}
                          className={`py-2 text-xs font-bold border border-slate-800 ${selectedDevice === "android" ? "bg-white text-slate-950 font-black" : "bg-slate-900 text-slate-400"}`}
                        >
                          Android Client
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {visualizerTab === "geo" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 leading-normal">
                      Inspect request geographic coordinates. Redirect to country-specific checkouts.
                    </p>
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Simulate Visitor Country</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setSelectedGeo("us")}
                          className={`py-2 text-xs font-bold border border-slate-800 ${selectedGeo === "us" ? "bg-[#eab308] text-slate-950 font-black" : "bg-slate-900 text-slate-400"}`}
                        >
                          United States (US)
                        </button>
                        <button 
                          onClick={() => setSelectedGeo("eu")}
                          className={`py-2 text-xs font-bold border border-slate-800 ${selectedGeo === "eu" ? "bg-[#eab308] text-slate-950 font-black" : "bg-slate-900 text-slate-400"}`}
                        >
                          European Union (EU)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {visualizerTab === "split" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 leading-normal">
                      A/B testing. Distribute incoming traffic weights dynamically between destination pages.
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                        <span>Offer A Weight</span>
                        <span className="text-white font-mono">{splitWeightA}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={splitWeightA}
                        onChange={(e) => setSplitWeightA(Number(e.target.value))}
                        className="w-full h-2 bg-slate-900 border border-slate-800 appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleTestLink} className="pt-6 mt-6 border-t border-slate-900">
                <button 
                  type="submit"
                  disabled={isTestingLink}
                  className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 font-black py-3 text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-1.5"
                >
                  {isTestingLink ? "Connecting..." : "Test Redirect Logic"}
                </button>
              </form>
            </div>

            {/* Right Column: Flow Path Visualization */}
            <div className="lg:col-span-7 bg-[#0b0f19] border-2 border-slate-950 p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center text-xs font-mono text-slate-500 uppercase">
                  <span>Visual Redirection Flow</span>
                  <span className="text-emerald-400">ACTIVE</span>
                </div>

                {/* SVG Visual Flow diagram */}
                <div className="bg-slate-950 border border-slate-900 rounded-none p-4 h-44 relative">
                  <svg className="w-full h-full" viewBox="0 0 280 120">
                    <line x1="30" y1="60" x2="110" y2="60" stroke="#1e293b" strokeWidth="2" strokeDasharray="3" />
                    <path d="M 110 60 Q 170 25, 250 25" fill="transparent" stroke="#1e293b" strokeWidth="2" strokeDasharray="3" />
                    <path d="M 110 60 Q 170 95, 250 95" fill="transparent" stroke="#1e293b" strokeWidth="2" strokeDasharray="3" />

                    <circle cx="30" cy="60" r="5" fill="#64748b" />
                    <circle cx="110" cy="60" r="7" fill="#06b6d4" stroke="#0891b2" strokeWidth="2" />
                    <circle cx="250" cy="25" r="5" fill="#eab308" />
                    <circle cx="250" cy="95" r="5" fill="#10b981" />

                    <text x="35" y="48" fill="#64748b" fontSize="7" fontFamily="monospace">CLICK IN</text>

                    {visualizerTab === "device" && (
                      <>
                        <text x="180" y="16" fill="#eab308" fontSize="8" fontFamily="monospace">App Store (iOS)</text>
                        <text x="180" y="112" fill="#10b981" fontSize="8" fontFamily="monospace">Google Play (Android)</text>
                        
                        {/* Lit path based on selection */}
                        {selectedDevice === "ios" ? (
                          <path d="M 110 60 Q 170 25, 250 25" fill="transparent" stroke="#eab308" strokeWidth="2" className="animate-pulse" />
                        ) : (
                          <path d="M 110 60 Q 170 95, 250 95" fill="transparent" stroke="#10b981" strokeWidth="2" className="animate-pulse" />
                        )}
                      </>
                    )}

                    {visualizerTab === "geo" && (
                      <>
                        <text x="180" y="16" fill="#eab308" fontSize="8" fontFamily="monospace">US Offer ($USD)</text>
                        <text x="180" y="112" fill="#10b981" fontSize="8" fontFamily="monospace">EU Offer (€EUR)</text>
                        
                        {/* Lit path based on selection */}
                        {selectedGeo === "us" ? (
                          <path d="M 110 60 Q 170 25, 250 25" fill="transparent" stroke="#eab308" strokeWidth="2" />
                        ) : (
                          <path d="M 110 60 Q 170 95, 250 95" fill="transparent" stroke="#10b981" strokeWidth="2" />
                        )}
                      </>
                    )}

                    {visualizerTab === "split" && (
                      <>
                        <text x="180" y="16" fill="#eab308" fontSize="8" fontFamily="monospace">Offer A ({splitWeightA}%)</text>
                        <text x="180" y="112" fill="#10b981" fontSize="8" fontFamily="monospace">Offer B ({100 - splitWeightA}%)</text>
                        
                        {splitWeightA > 50 ? (
                          <path d="M 110 60 Q 170 25, 250 25" fill="transparent" stroke="#eab308" strokeWidth="2" />
                        ) : (
                          <path d="M 110 60 Q 170 95, 250 95" fill="transparent" stroke="#10b981" strokeWidth="2" />
                        )}
                      </>
                    )}
                  </svg>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-900 text-xs text-slate-400">
                <span className="font-mono text-[10px] text-slate-500 uppercase block">Selected Routing Target URL:</span>
                <p className="font-mono text-white mt-1 text-[11px] overflow-hidden text-ellipsis whitespace-nowrap">
                  {visualizerTab === "device" 
                    ? selectedDevice === "ios" ? "https://apps.apple.com/us/app/telegram-messenger/id686449807" : "https://play.google.com/store/apps/details?id=org.telegram.messenger"
                    : visualizerTab === "geo"
                      ? selectedGeo === "us" ? "https://mycheckout.com/product-us" : "https://mycheckout.com/product-eu"
                      : `https://mycheckout.com/split-offer-${splitWeightA > 50 ? "A" : "B"}`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Edge Latency Calculator Section */}
      <section className="py-20 px-6 border-t-4 border-slate-950 bg-[#07090e] z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            
            {/* Interactive Calculator Box (Left) */}
            <div className="lg:col-span-7 flex flex-col justify-between border-2 border-slate-950 bg-[#0b0f19] p-6 sm:p-8 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="space-y-6">
                <div className="border-b-2 border-slate-950 pb-4">
                  <span className="text-[#06b6d4] font-mono text-[10px] uppercase tracking-wider font-bold">Interactive Tool</span>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 mt-1">
                    <Clock className="w-5 h-5 text-[#eab308]" /> Redirect Latency Calculator
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Calculate how redirection delays impact conversion rates and advertising budgets.</p>
                </div>

                {/* Range inputs */}
                <div className="space-y-4">
                  {/* Simulated Latency */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono font-bold text-slate-400 uppercase">
                      <span>Simulated Redirection Latency</span>
                      <span className={simulatedLatency < 80 ? "text-emerald-400" : simulatedLatency < 250 ? "text-amber-400" : "text-red-400"}>
                        {simulatedLatency} ms
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="15"
                      max="1000"
                      value={simulatedLatency}
                      onChange={(e) => setSimulatedLatency(Number(e.target.value))}
                      className="w-full h-2 bg-slate-950 border border-slate-900 appearance-none cursor-pointer accent-[#06b6d4]"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>15ms (Linktery Edge)</span>
                      <span>500ms (Cloud Foundry)</span>
                      <span>1000ms (Cold Proxy Proxy)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* CPC */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Cost Per Click (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-500 text-xs">$</span>
                        <input 
                          type="number"
                          step="0.10"
                          min="0.10"
                          max="20"
                          value={cpcValue}
                          onChange={(e) => setCpcValue(Math.max(0.1, Number(e.target.value)))}
                          className="w-full bg-slate-950 border-2 border-slate-950 focus:border-[#06b6d4] rounded-none py-2.5 pl-7 pr-3 text-xs outline-none font-bold text-white transition-colors"
                        />
                      </div>
                    </div>

                    {/* Monthly Click Traffic */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Monthly Click Volume</label>
                      <input 
                        type="number"
                        step="5000"
                        min="1000"
                        max="1000000"
                        value={monthlyTraffic}
                        onChange={(e) => setMonthlyTraffic(Math.max(1000, Number(e.target.value)))}
                        className="w-full bg-slate-950 border-2 border-slate-950 focus:border-[#06b6d4] rounded-none py-2.5 px-3 text-xs outline-none font-bold text-white transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic calculations display */}
              <div className="mt-8 border-t-2 border-slate-950 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 border border-slate-900 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Visitor Drop-off</span>
                  <span className={`text-lg font-black font-mono block mt-1 ${
                    simulatedLatency < 80 ? "text-emerald-400" : simulatedLatency < 250 ? "text-amber-400" : "text-red-400"
                  }`}>
                    {(1.5 + (simulatedLatency / 100) * 2.8).toFixed(1)}%
                  </span>
                </div>
                
                <div className="bg-slate-950 p-4 border border-slate-900 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Bounced Clicks</span>
                  <span className="text-lg font-black font-mono text-white block mt-1">
                    {Math.round(monthlyTraffic * ((1.5 + (simulatedLatency / 100) * 2.8) / 100)).toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-950 p-4 border border-slate-900 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Lost Ad Budget</span>
                  <span className="text-lg font-black font-mono text-red-500 block mt-1">
                    ${(Math.round(monthlyTraffic * ((1.5 + (simulatedLatency / 100) * 2.8) / 100)) * cpcValue).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
              </div>
            </div>

            {/* Explanatory Educational Text (Right) */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
              <span className="text-[#06b6d4] font-mono text-xs uppercase tracking-wider font-bold">The Science of Delay</span>
              <h2 className="text-3xl font-extrabold tracking-tight text-white uppercase leading-none">
                The Engineering Behind Edge Redirect Latency
              </h2>
              <div className="text-sm text-slate-400 space-y-4 leading-relaxed font-normal">
                <p>
                  Every millisecond added to your redirection path triggers visitor bounce. When users click an advertising link on Facebook, TikTok, or Google, they expect instantaneous response. If the DNS routing takes 300ms to resolve and dispatch HTTP headers, up to **8.5% of mobile users** click away before your landing page starts loading.
                </p>
                <p>
                  Traditional redirect proxies route requests through centralized cloud instances (e.g. AWS us-east-1). If your visitor resides in Europe, their request must travel across the Atlantic, execute routing logic, and travel back. This geographic distance adds significant latency.
                </p>
                <p>
                  Linktery solves this by utilizing globally distributed serverless Edge compute. Redirection logic runs on serverless nodes physically closest to the user (e.g. Frankfurt node for European users), completing processing in under **12 milliseconds**. This guarantees minimal click drop-off and prevents ad budget waste.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Safety Cloaking / Bot Filter Section */}
      <section id="pipeline" className="py-20 px-6 border-t-4 border-slate-950 bg-[#0c0f17]/40 z-10 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Bot filtering technical details (Left) */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div>
              <span className="text-[#06b6d4] font-mono text-xs uppercase tracking-wider font-bold">Campaign Protection</span>
              <h2 className="text-3xl font-extrabold tracking-tight text-white mt-2 uppercase">
                How Ad Reviewer Bots Scan URLs
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Ad platform bots (Google, Meta, TikTok) review landing pages using crawler engines. If your campaign redirects visitors, reviewers must see a compliant page, while human buyers proceed to checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#07090e] border-2 border-slate-950 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h4 className="text-xs font-black text-white uppercase mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#06b6d4]" /> ASN Registry Lookup
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Google (AS15169), AWS (AS16509), and Meta (AS32934) operate review scrapers from cloud datacenters. We filter requests originating from these IP registries.
                </p>
              </div>

              <div className="bg-[#07090e] border-2 border-slate-950 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h4 className="text-xs font-black text-white uppercase mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#06b6d4]" /> Browser Canvas Challenge
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Headless browser automation environments lack full canvas rendering capabilities. Background JS challenges test device dimensions and WebGL profiles.
                </p>
              </div>

              <div className="bg-[#07090e] border-2 border-slate-950 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h4 className="text-xs font-black text-white uppercase mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#06b6d4]" /> Spoofed UA Inspection
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Scrapers often inject mismatched User-Agent headers (e.g. mobile Chrome header on a desktop Linux host). We run strict format verification.
                </p>
              </div>

              <div className="bg-[#07090e] border-2 border-slate-950 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h4 className="text-xs font-black text-white uppercase mb-1 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#06b6d4]" /> Dynamic Dispatch
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Reviewers receive a static, 100% compliant informational layout, keeping advertising accounts healthy, while human buyers proceed to checkouts.
                </p>
              </div>
            </div>
          </div>

          {/* Serverless Function Code Window (Right) */}
          <div className="lg:col-span-6 border-2 border-slate-950 bg-slate-950 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div className="bg-[#0b0f19] px-4 py-3 flex items-center justify-between border-b-2 border-slate-950">
              <span className="text-xs font-mono font-bold text-[#06b6d4]">edge-bot-filter.js</span>
              <span className="text-[9px] font-mono text-slate-500">EDGE RUNTIME CODE</span>
            </div>
            
            <div className="p-4 font-mono text-[10px] sm:text-[11px] text-slate-400 overflow-x-auto leading-relaxed bg-slate-950/40 text-left">
              <span className="text-slate-500">// Check datacenter ASN arrays & automation headers</span><br />
              <span className="text-[#06b6d4]">export async function</span> <span className="text-white">onRequest</span>(request) &#123;<br />
              &nbsp;&nbsp;<span className="text-[#06b6d4]">const</span> clientIp = request.headers.get(<span className="text-[#eab308]">"CF-Connecting-IP"</span>);<br />
              &nbsp;&nbsp;<span className="text-[#06b6d4]">const</span> userAgent = request.headers.get(<span className="text-[#eab308]">"User-Agent"</span>);<br />
              &nbsp;&nbsp;<span className="text-[#06b6d4]">const</span> asn = request.cf?.asn;<br />
              <br />
              &nbsp;&nbsp;<span className="text-slate-500">// Block Meta (AS32934), Google (AS15169), AWS (AS16509) review bots</span><br />
              &nbsp;&nbsp;<span className="text-[#06b6d4]">const</span> blockedAsns = [<span className="text-[#eab308]">32934, 15169, 16509</span>];<br />
              &nbsp;&nbsp;<span className="text-[#06b6d4]">if</span> (blockedAsns.includes(asn) || userAgent.includes(<span className="text-[#eab308]">"HeadlessChrome"</span>)) &#123;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500">// Redirect to clean, static informational page</span><br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#06b6d4]">return</span> Response.redirect(<span className="text-[#eab308]">"https://mysite.com/privacy-policy"</span>, 302);<br />
              &nbsp;&nbsp;&#125;<br />
              <br />
              &nbsp;&nbsp;<span className="text-slate-500">// Check browser attributes for headless engines</span><br />
              &nbsp;&nbsp;<span className="text-[#06b6d4]">const</span> isAutomation = userAgent.includes(<span className="text-[#eab308]">"Lighthouse"</span>) || userAgent.includes(<span className="text-[#eab308]">"Googlebot"</span>);<br />
              &nbsp;&nbsp;<span className="text-[#06b6d4]">if</span> (isAutomation) &#123;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#06b6d4]">return</span> Response.redirect(<span className="text-[#eab308]">"https://mysite.com/privacy-policy"</span>, 302);<br />
              &nbsp;&nbsp;&#125;<br />
              <br />
              &nbsp;&nbsp;<span className="text-slate-500">// Real user: Proceed to target conversion link</span><br />
              &nbsp;&nbsp;<span className="text-[#06b6d4]">return</span> Response.redirect(<span className="text-[#eab308]">"https://target-destination.com"</span>, 302);<br />
              &#125;<br />
            </div>
            
            <div className="bg-[#0b0f19] p-3 text-center border-t-2 border-slate-950 font-mono text-[9px] text-slate-500">
              DEPLOYED VIA SERVERLESS FUNCTIONS CLOSEST TO THE CLICK
            </div>
          </div>
        </div>
      </section>

      {/* Redirection Terminology Glossary */}
      <section className="py-20 px-6 max-w-7xl mx-auto z-10 relative border-t-2 border-slate-950">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#06b6d4] font-mono text-xs uppercase tracking-wider font-bold">Technical Vocabulary</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-2 uppercase">
            Redirection & Traffic Glossary
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed">
            Essential terminology for high-volume conversion optimization, traffic routing, and tracking security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <div className="bg-[#06080c] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <h4 className="text-sm font-black text-white uppercase">Autonomous System Number (ASN)</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              A unique identifier assigned to global networks on the Internet. Datacenters (like Google Cloud, AWS, or DigitalOcean) have specific ASNs, which allow tracking platforms to distinguish cloud servers from real residential internet service providers (ISPs).
            </p>
          </div>
          <div className="bg-[#06080c] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <h4 className="text-sm font-black text-white uppercase">A/B Split Weight</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              The percentage distribution of incoming clicks assigned to multiple destination targets. For instance, a 70/30 split weight sends 70% of visitors to Offer A and 30% to Offer B, facilitating conversion testing.
            </p>
          </div>
          <div className="bg-[#06080c] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <h4 className="text-sm font-black text-white uppercase">Subdomain (CNAME) Cloaking</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Mapping a custom domain (e.g. `track.company.com`) via CNAME records to run redirection scripts. Using private custom domains prevents campaign tracking paths from sharing public domain footprints.
            </p>
          </div>
          <div className="bg-[#06080c] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <h4 className="text-sm font-black text-white uppercase">Edge Computing Redirection</h4>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Executing redirect calculations on serverless nodes physically close to the visitor. Edge computing bypasses roundtrip network routing to a central host database, reducing redirection latency to under 12ms.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 max-w-4xl mx-auto z-10 relative border-t-2 border-slate-950">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 flex items-center justify-center gap-2 uppercase">
            <HelpCircle className="w-8 h-8 text-[#06b6d4]" /> FAQ & Redirection Knowledge
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Essential facts about Edge DNS routing, A/B split weights, and traffic protection.
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div 
              key={index} 
              className="bg-slate-950 border-2 border-slate-950 overflow-hidden transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            >
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className="w-full p-5 text-left font-bold text-white flex justify-between items-center hover:bg-slate-900 transition-colors gap-4"
              >
                <span className="text-sm sm:text-base uppercase tracking-tight">{item.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-slate-500 transition-transform duration-300 shrink-0 ${
                    openFaqIndex === index ? "rotate-180 text-[#06b6d4]" : ""
                  }`} 
                />
              </button>
              {openFaqIndex === index && (
                <div className="p-5 pt-0 border-t-2 border-slate-950 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="relative border-4 border-slate-950 bg-slate-950/80 p-8 sm:p-12 text-center overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-[#06b6d4] rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 relative z-10 uppercase tracking-tighter">
            Deploy Smart Links At the Edge
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Create an account to configure weight-based rotators, geolocation targeting, and device OS redirection rules.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10 max-w-md mx-auto">
            {user ? (
              <Link to="/dashboard" className="bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                Configure Smart Links <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link to="/pricing" className="bg-slate-900 border-2 border-slate-950 hover:bg-slate-800 text-slate-300 font-bold py-4 px-6 rounded-none text-xs uppercase tracking-wider transition-colors flex items-center justify-center">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-slate-950 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.webp" alt="Linktery Logo" className="h-10 w-auto mix-blend-screen grayscale" />
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Linktery</span>
          </Link>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <Link to="/privacy" className="text-xs text-slate-500 hover:text-[#06b6d4] transition-colors font-bold uppercase">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-slate-500 hover:text-[#06b6d4] transition-colors font-bold uppercase">Terms & Conditions</Link>
            <p className="text-xs text-slate-600 font-mono">© 2026 Linktery. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Option B: Modal Popup requesting registration */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border-4 border-[#06b6d4]/50 p-6 sm:p-8 rounded-none relative shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2 uppercase">
              <Sparkles className="w-5 h-5 text-[#06b6d4]" /> Config Mapped!
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your traffic routing rules are configured. Register a free account to activate the smart URL and host redirections on your CNAME custom domain.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRegisterRedirect}
                className="w-full py-3.5 bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 font-black text-xs rounded-none border-2 border-slate-950 transition-colors flex items-center justify-center gap-1.5"
              >
                Activate Smart Redirection <ExternalLink className="w-3.5 h-3.5" />
              </button>
              
              <button 
                onClick={handleModalClose}
                className="w-full py-3 border-2 border-slate-950 text-slate-400 font-bold text-xs rounded-none hover:bg-slate-900 hover:text-white transition-colors"
              >
                Close Visualizer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
