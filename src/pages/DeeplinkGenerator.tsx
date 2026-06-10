import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, Shield, Zap, Globe, 
  User as UserIcon, Check, ChevronDown, 
  Sparkles, Layers, HelpCircle,
  ExternalLink, Smartphone, Eye, CheckSquare,
  Instagram, Youtube, ShoppingCart, MessageCircle, Laptop,
  Flame, Paintbrush, Sliders, Smartphone as PhoneIcon,
  AlertTriangle, Play, CheckCircle2, ArrowRightLeft, Target
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function DeeplinkGenerator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Call the SEO hook with the registered configuration
  useSeo(SEO_PAGES.deeplinkGenerator);

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Hydration guard pattern
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simulator state
  const [destinationUrl, setDestinationUrl] = useState<string>("https://youtube.com/watch?v=dQw4w9WgXcQ");
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "tiktok" | "youtube" | "telegram" | "onlyfans">("youtube");
  const [activeStep, setActiveStep] = useState<"input" | "generating" | "comparing">("input");
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  const sampleUrls = {
    instagram: "https://instagram.com/p/C7dE2y7oA8P",
    tiktok: "https://tiktok.com/@linktery_hub/video/7374829103984",
    youtube: "https://youtube.com/watch?v=dQw4w9WgXcQ",
    telegram: "https://t.me/linktery_news",
    onlyfans: "https://onlyfans.com/creative_creator"
  };

  const handlePlatformSelect = (platform: "instagram" | "tiktok" | "youtube" | "telegram" | "onlyfans") => {
    setSelectedPlatform(platform);
    setDestinationUrl(sampleUrls[platform]);
    setActiveStep("input");
  };

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationUrl.trim()) return;
    setActiveStep("generating");
    setTimeout(() => {
      setActiveStep("comparing");
    }, 1200);
  };

  const handleCreateRealLink = () => {
    setShowRegisterModal(true);
  };

  const handleModalClose = () => {
    setShowRegisterModal(false);
  };

  const handleRegisterRedirect = () => {
    const params = new URLSearchParams({
      ref: "deeplink-generator",
      url: destinationUrl,
      platform: selectedPlatform
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
      question: "What is a Deep Link (Deeplink)?",
      answer: "A deep link is a smart URL protocol that detects the visitor's operating system (iOS or Android) and launches the targeted native mobile application (like YouTube or Telegram) directly on their device, rather than loading the page in a restricted, sandboxed in-app webview container."
    },
    {
      question: "Why do standard links fail inside Instagram and TikTok?",
      answer: "When a social media follower clicks a link inside your Instagram bio or TikTok video, the platform opens it in a temporary in-app web browser (WebView). Because this WebView operates in isolation from your device's primary system cookies, visitors are logged out of all external accounts. They cannot subscribe, checkout, or interact without manually typing complex login credentials."
    },
    {
      question: "Do my followers need to download any additional software?",
      answer: "No. Linktery deep links interact natively with the built-in URI protocols of iOS and Android. Re-routing happens instantaneously behind the scenes, using applications already installed on your users' phones."
    },
    {
      question: "How do deep links increase conversions and sales?",
      answer: "By opening native applications (such as YouTube or Shopify) where users are already authenticated, the path to a subscription or checkout is minimized to a single tap. Removing the high-friction login barrier routinely improves mobile checkout conversions by 40% to 150%."
    },
    {
      question: "Is using deep links safe for my social media accounts?",
      answer: "Yes, it is completely safe and fully compliant. Linktery uses standard OS routing standards (Universal Links on Apple iOS and App Links on Android) that comply with official mobile development guidelines."
    }
  ];

  // Dynamic JSON-LD Structured Data for FAQPage and SoftwareApplication
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Deeplink Generator",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.95",
          "ratingCount": "218"
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
    <div className="min-h-screen bg-[#07090e] text-[#f0f2f5] font-sans antialiased relative overflow-hidden">
      {/* Dynamic Schema Injection */}
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} 
      />

      {/* Bauhaus Grid Line overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:6rem_6rem] opacity-30 pointer-events-none z-0" />
      
      {/* Bold Bauhaus color blocks (Purple Ban compliant: Yellow, Teal, Charcoal) */}
      <div className="absolute top-0 right-0 w-[45vw] h-[45vw] bg-[#eab308]/5 rounded-none [clip-path:polygon(100%_0,0_0,100%_100%)] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-[#06b6d4]/5 rounded-none [clip-path:polygon(0_100%,0_0,100%_100%)] pointer-events-none z-0" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b-2 border-slate-900 bg-[#07090e]/90 backdrop-blur-md">
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
                <div className="w-8 h-8 rounded-none border-2 border-slate-850 p-0.5 overflow-hidden group-hover:border-[#eab308] transition-colors">
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
                <Link to="/register" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 text-xs font-black py-2.5 px-5 rounded-none border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">Create Free Deeplink</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-16 px-6 z-10 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-slate-950 bg-[#eab308] text-slate-950 text-xs font-mono font-bold uppercase tracking-wider mb-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <Zap className="w-4 h-4" /> Recover Your Mobile Conversions
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-white mb-6 uppercase leading-[0.95]">
          Smart Deeplink Generator.<br />
          <span className="bg-[#06b6d4] text-slate-950 px-4 py-1.5 inline-block border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-2">
            Open Links Directly in Installed Apps
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Route followers from Instagram and TikTok directly into native mobile applications like YouTube, Telegram, and OnlyFans. Eliminate in-app browser lockouts and reduce user drop-offs.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <a href="#simulator" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2">
            Run Deeplink Simulator <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#article" className="bg-[#07090e] hover:bg-slate-900 border-2 border-slate-950 text-white font-bold py-4 px-6 rounded-none text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Read Explanatory Guide
          </a>
        </div>
      </section>

      {/* Simulator Playground Section */}
      <section id="simulator" className="py-16 px-6 border-t-4 border-slate-950 bg-[#0c0f17]/40 z-10 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#06b6d4] font-mono text-xs uppercase tracking-wider font-bold">Interactive Tool</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-2 uppercase">
              Deeplink Simulator
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">
              Select a platform, enter a destination URL, and watch how mobile deep linking optimizes conversions compared to a standard link.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Box: Controls */}
            <div className="lg:col-span-6 flex flex-col justify-between border-2 border-slate-950 bg-[#07090e] p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="border-b-2 border-slate-950 pb-4 mb-6">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#eab308]" /> Configure Redirection
                  </h3>
                </div>

                {/* Platform select buttons */}
                <div className="space-y-3 mb-6">
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase block">Step 1: Select Target Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {(["youtube", "telegram", "instagram", "tiktok", "onlyfans"] as const).map((platform) => (
                      <button
                        key={platform}
                        onClick={() => handlePlatformSelect(platform)}
                        className={`px-4 py-2.5 text-xs font-bold rounded-none border-2 border-slate-950 uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                          selectedPlatform === platform
                            ? "bg-[#eab308] text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            : "bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                      >
                        {platform === "instagram" && <Instagram className="w-3.5 h-3.5" />}
                        {platform === "youtube" && <Youtube className="w-3.5 h-3.5" />}
                        {platform === "telegram" && <Globe className="w-3.5 h-3.5" />}
                        {platform === "tiktok" && <Laptop className="w-3.5 h-3.5" />}
                        {platform === "onlyfans" && <UserIcon className="w-3.5 h-3.5" />}
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input URL */}
                <div className="space-y-3">
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase block">Step 2: Enter Your Target URL</label>
                  <input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => {
                      setDestinationUrl(e.target.value);
                      if (activeStep === "comparing") setActiveStep("input");
                    }}
                    placeholder="https://..."
                    className="w-full bg-slate-900 border-2 border-slate-950 focus:border-[#eab308] rounded-none py-3.5 px-4 text-xs font-mono outline-none text-white transition-colors"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-6 border-t-2 border-slate-950">
                {activeStep === "input" && (
                  <button
                    onClick={handleSimulate}
                    className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                  >
                    Generate Deeplink & Compare Flow <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {activeStep === "generating" && (
                  <div className="w-full bg-slate-900 border-2 border-slate-950 py-4 px-6 text-center text-xs font-mono text-[#eab308] flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-[#eab308] border-t-transparent rounded-full animate-spin" />
                    ANALYZING DEVICE PROTOCOLS...
                  </div>
                )}

                {activeStep === "comparing" && (
                  <div className="space-y-3">
                    <div className="bg-[#0b0f19] border-2 border-emerald-500/30 p-3 text-xs text-emerald-400 font-mono text-center uppercase tracking-wide">
                      ✅ DEEPLINK READY FOR SIMULATION
                    </div>
                    <button
                      onClick={handleCreateRealLink}
                      className="w-full bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                    >
                      Deploy This Deeplink Live Free <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Box: Simulation Graphic */}
            <div className="lg:col-span-6 border-2 border-slate-950 bg-slate-950 p-6 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[400px]">
              <div className="bg-[#0b0f19] -mx-6 -mt-6 px-4 py-3 flex items-center justify-between border-b-2 border-slate-950">
                <span className="text-xs font-mono font-bold text-[#eab308]">deeplink-comparison-simulation.sh</span>
                <span className="text-[9px] font-mono text-slate-500">USER JOURNEY COMPARISON</span>
              </div>

              {activeStep === "input" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
                  <PhoneIcon className="w-12 h-12 text-slate-600 animate-bounce" />
                  <p className="text-xs text-slate-400 max-w-sm">
                    Click the "Generate Deeplink" button to model the traffic flow journey.
                  </p>
                </div>
              )}

              {activeStep === "generating" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
                  <div className="w-10 h-10 border-4 border-[#06b6d4] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono text-slate-400">Building application protocols...</p>
                </div>
              )}

              {activeStep === "comparing" && isMounted && (
                <div className="flex-1 space-y-6 py-4 text-left font-mono text-xs">
                  {/* Option A: WebView Path (Fail) */}
                  <div className="border-2 border-red-500/20 bg-red-950/5 p-4 space-y-3 relative">
                    <div className="absolute top-2 right-2 bg-red-950 text-red-500 border border-red-500/30 px-2 py-0.5 text-[8px] font-black uppercase">
                      Regular Link
                    </div>
                    <span className="text-red-500 text-[10px] font-black uppercase tracking-wider block">Path A: In-App Browser Sandbox</span>
                    
                    <div className="grid grid-cols-12 gap-2 items-center text-[10px] text-slate-400">
                      <div className="col-span-5 text-white font-bold">1. Click inside Social App</div>
                      <div className="col-span-2 text-center text-slate-600">➡️</div>
                      <div className="col-span-5">Instagram / TikTok Webview</div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center text-[10px] text-slate-400">
                      <div className="col-span-5 text-white font-bold">2. Cookie Status</div>
                      <div className="col-span-2 text-center text-slate-600">➡️</div>
                      <div className="col-span-5 text-red-400 font-bold">Logged Out (Cookies Blocked)</div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center text-[10px] text-slate-400">
                      <div className="col-span-5 text-white font-bold">3. Destination interaction</div>
                      <div className="col-span-2 text-center text-slate-600">➡️</div>
                      <div className="col-span-5 text-red-500 font-bold">Requires re-login / password ⚠️</div>
                    </div>

                    <div className="pt-2 border-t border-red-500/10 flex items-center justify-between text-[9px]">
                      <span className="text-slate-500">RESULT: VISITOR BOUNCES</span>
                      <span className="text-red-500 font-black">~80% Drop-off</span>
                    </div>
                  </div>

                  {/* Icon Divider */}
                  <div className="flex justify-center my-2">
                    <ArrowRightLeft className="w-5 h-5 text-slate-600 rotate-90" />
                  </div>

                  {/* Option B: Deep Link Path (Success) */}
                  <div className="border-2 border-emerald-500/30 bg-emerald-950/5 p-4 space-y-3 relative">
                    <div className="absolute top-2 right-2 bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[8px] font-black uppercase">
                      Linktery Deep Link
                    </div>
                    <span className="text-emerald-400 text-[10px] font-black uppercase tracking-wider block">Path B: Native Application Handover</span>
                    
                    <div className="grid grid-cols-12 gap-2 items-center text-[10px] text-slate-400">
                      <div className="col-span-5 text-white font-bold">1. Click inside Social App</div>
                      <div className="col-span-2 text-center text-slate-600">➡️</div>
                      <div className="col-span-5 text-emerald-400 font-bold">Edge redirection (15ms)</div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center text-[10px] text-slate-400">
                      <div className="col-span-5 text-white font-bold">2. Cookie Status</div>
                      <div className="col-span-2 text-center text-slate-600">➡️</div>
                      <div className="col-span-5 text-emerald-400 font-bold">Launches native mobile app</div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center text-[10px] text-slate-400">
                      <div className="col-span-5 text-white font-bold">3. Destination interaction</div>
                      <div className="col-span-2 text-center text-slate-600">➡️</div>
                      <div className="col-span-5 text-emerald-400 font-bold">Pre-authenticated (1-click buy)</div>
                    </div>

                    <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[9px]">
                      <span className="text-slate-500">RESULT: ACTION COMPLETED</span>
                      <span className="text-emerald-400 font-black">&lt;5% Drop-off</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[#0b0f19] -mx-6 -mb-6 p-3 text-center border-t-2 border-slate-950 font-mono text-[9px] text-slate-500 uppercase">
                Simulation based on real mobile routing telemetry
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[#06b6d4] font-mono text-xs uppercase tracking-wider font-bold">Comparative Analysis</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-2 uppercase">
            WebView Sandbox Limitations Matrix
          </h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Compare how sandboxed in-app browsers isolate destinations and how application handovers bypass these limits.
          </p>
        </div>

        <div className="border-2 border-slate-950 rounded-none overflow-hidden bg-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-350">
              <thead className="bg-[#0b0f19] border-b-2 border-slate-950 text-[#eab308] font-mono text-[10px] sm:text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 sm:p-5">Social Platform</th>
                  <th className="p-4 sm:p-5">In-App Browser Type</th>
                  <th className="p-4 sm:p-5">Cookie Sandbox Status</th>
                  <th className="p-4 sm:p-5">Destination Auth Session</th>
                  <th className="p-4 sm:p-5 text-right">Friction Drop-off Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-950 font-mono text-[11px] sm:text-xs">
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">Instagram</td>
                  <td className="p-4 sm:p-5">WKWebView Sandbox</td>
                  <td className="p-4 sm:p-5 text-red-400">Strictly Sandboxed</td>
                  <td className="p-4 sm:p-5">Logged Out (Guest)</td>
                  <td className="p-4 sm:p-5 text-right text-red-500 font-bold">~85% Drop-off</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">TikTok</td>
                  <td className="p-4 sm:p-5">Client WebKit Wrapper</td>
                  <td className="p-4 sm:p-5 text-red-400">Strictly Sandboxed</td>
                  <td className="p-4 sm:p-5">Logged Out (Guest)</td>
                  <td className="p-4 sm:p-5 text-right text-red-500 font-bold">~82% Drop-off</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">YouTube Mobile</td>
                  <td className="p-4 sm:p-5">Custom Web View</td>
                  <td className="p-4 sm:p-5 text-amber-500">Isolated viewport</td>
                  <td className="p-4 sm:p-5">Logged Out (Guest)</td>
                  <td className="p-4 sm:p-5 text-right text-amber-500 font-bold">~75% Drop-off</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-emerald-400 uppercase">Linktery Deep Link</td>
                  <td className="p-4 sm:p-5 text-emerald-400">OS Protocol Handshake</td>
                  <td className="p-4 sm:p-5 text-emerald-400">Native App Container</td>
                  <td className="p-4 sm:p-5 text-emerald-400">Session Authenticated</td>
                  <td className="p-4 sm:p-5 text-right text-emerald-400 font-bold">&lt; 5% Drop-off</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Educational Article Section */}
      <section id="article" className="py-20 px-6 max-w-4xl mx-auto z-10 relative border-t-2 border-slate-950">
        <article className="prose prose-invert prose-slate max-w-none space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[#eab308] font-mono text-xs uppercase tracking-wider font-bold">Educational Guide</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 uppercase tracking-tight">
              What is a Deep Link and Why Your Bio Links Fail on Mobile
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-3">
              A simple explanation of the technology that recovers lost mobile sales and signups.
            </p>
          </div>

          <div className="space-y-6 text-sm sm:text-base text-slate-300 leading-relaxed">
            <h3 className="text-xl font-bold text-white uppercase pt-4 border-b border-slate-900 pb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> The Problem: In-App Browser Isolation (WebView Jail)
            </h3>
            <p>
              You have likely experienced this yourself: scrolling through Instagram or TikTok, clicking a link to purchase a product or follow a Telegram channel, only to find yourself opening the page within the social app's built-in browser (WebView).
            </p>
            <p>
              This built-in browser is a sandboxed environment. It is completely isolated from your device's primary system browser (like Safari or Chrome). The critical issue for businesses and creators is that the visitor is logged out of every external platform inside this temporary viewport.
            </p>
            <p>
              If a user wants to subscribe to your YouTube channel, pledge support on Patreon, or buy a product from your shop, they are forced to manually type their username, remember their password, pass two-factor auth checks, or re-type credit card details. Users on mobile devices rarely complete these high-friction steps. Consequently, they abandon the tab and swipe away, resulting in up to an 80% loss in potential transactions.
            </p>

            <h3 className="text-xl font-bold text-white uppercase pt-4 border-b border-slate-900 pb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> The Solution: How a Deeplink Generator Restores Conversions
            </h3>
            <p>
              A deep link is a routing technology that instructs the mobile operating system. Instead of loading the destination website inside the social app's sandboxed webview, the deep link commands iOS or Android:
              <span className="block my-2 p-3 bg-slate-950 border-l-4 border-[#eab308] font-mono text-xs text-white">
                "Launch this specific link directly inside the native YouTube app!" or "Route this channel link directly to the Telegram mobile client!"
              </span>
            </p>
            <p>
              Because the target application is already installed on the visitor's smartphone and they are already logged in, the transition is seamless. The visitor lands directly on your profile or shop, allowing them to subscribe or check out in a single click using pre-saved sessions and billing methods (like Apple Pay or Google Pay).
            </p>

            <h3 className="text-xl font-bold text-white uppercase pt-4 border-b border-slate-900 pb-2 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#06b6d4]" /> Who Benefits Most from Mobile Deep Links?
            </h3>
            <ul className="list-disc pl-5 space-y-2.5">
              <li>
                <strong>Creators and Influencers:</strong> Route Instagram or TikTok followers to new YouTube videos or Telegram channels without losing users along the way.
              </li>
              <li>
                <strong>E-commerce and Affiliate Marketers:</strong> Direct users straight into native apps of retail platforms (like Amazon, Shopify, or regional marketplaces) or quick checkout forms to recover transactions.
              </li>
              <li>
                <strong>Premium Content Creators (OnlyFans, Patreon):</strong> Eliminate payment drop-offs by keeping checkout cookies active in native browsers and apps.
              </li>
            </ul>

            <h3 className="text-xl font-bold text-white uppercase pt-4 border-b border-slate-900 pb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#eab308]" /> Why Choose Linktery for Deeplinking?
            </h3>
            <p>
              Linktery processes redirects globally on serverless edge networks in under 15ms. In addition to high-speed delivery, we provide granular click analytics filtered by devices and locations, and enforce a strict 0% commission policy on your direct product sales. Create your first link for free today and test deep linking performance in real time.
            </p>
          </div>
        </article>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 max-w-4xl mx-auto z-10 relative border-t-2 border-slate-950">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 flex items-center justify-center gap-2 uppercase">
            <HelpCircle className="w-8 h-8 text-[#eab308]" /> Frequently Asked Questions (FAQ)
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Find answers to common questions about setting up and managing smart mobile deep links.
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
                    openFaqIndex === index ? "rotate-180 text-[#eab308]" : ""
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

      {/* CTA Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="relative border-4 border-slate-950 bg-slate-950/80 p-8 sm:p-12 text-center overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-[#eab308] rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-black text-white mb-4 relative z-10 uppercase tracking-tighter">
            Claim Your Mobile Conversion Advantage
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Register a free Linktery account, set up smart app-to-app routing rules, and capture deep analytics in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10 max-w-md mx-auto">
            {user ? (
              <Link to="/dashboard" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                Create My Free Deeplink <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link to="/pricing" className="bg-slate-900 border-2 border-slate-950 hover:bg-slate-800 text-slate-350 font-bold py-4 px-6 rounded-none text-xs uppercase tracking-wider transition-colors flex items-center justify-center">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Option B: Modal Popup requesting registration */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border-4 border-[#eab308]/50 p-6 sm:p-8 rounded-none relative shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2 uppercase">
              <Sparkles className="w-5 h-5 text-[#eab308]" /> Deeplink Configured!
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your deep link mockup for target URL `{destinationUrl.substring(0, 45)}{destinationUrl.length > 45 ? "..." : ""}` is ready. Register a free account to publish it live.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRegisterRedirect}
                className="w-full py-3.5 bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black text-xs rounded-none border-2 border-slate-950 transition-colors flex items-center justify-center gap-1.5"
              >
                Save Deeplink in My Account <ExternalLink className="w-3.5 h-3.5" />
              </button>
              
              <button 
                onClick={handleModalClose}
                className="w-full py-3 border-2 border-slate-950 text-slate-400 font-bold text-xs rounded-none hover:bg-slate-900 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
