import { useState, useEffect, useRef } from "react";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, Shield, Zap, Globe, 
  User as UserIcon, Check, ChevronDown, 
  Sparkles, Layers, HelpCircle,
  ShieldCheck, Shuffle, Percent, BarChart3, ExternalLink,
  Calculator, CheckSquare, TrendingUp, Cpu, Lock, AlertOctagon,
  Scale, ArrowRightLeft, ShieldAlert
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function AffiliateSolution() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Call the SEO hook with the registered configuration
  useSeo(SEO_PAGES.affiliateSolution);

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Split Simulator State
  const [linkA, setLinkA] = useState<string>("");
  const [linkB, setLinkB] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  // ROI Calculator & Split Weight State
  const [clicks, setClicks] = useState<number>(25000);
  const [payoutA, setPayoutA] = useState<number>(30);
  const [payoutB, setPayoutB] = useState<number>(45);
  const [convA, setConvA] = useState<number>(2.5);
  const [convB, setConvB] = useState<number>(1.8);
  const [weightA, setWeightA] = useState<number>(60); // 60% Offer A, 40% Offer B

  // Security Verification State
  const [activePipelineStep, setActivePipelineStep] = useState<number>(0);

  // EPC Calculations
  const epcA = (convA / 100) * payoutA;
  const epcB = (convB / 100) * payoutB;

  // Revenue Calculations
  const shareA = weightA / 100;
  const shareB = (100 - weightA) / 100;

  const revA = Math.round(clicks * shareA * epcA);
  const revB = Math.round(clicks * shareB * epcB);
  const totalRev = revA + revB;

  // Blind Routing Scenario (100% to A)
  const blindRev = Math.round(clicks * epcA);

  // Optimization gain (revenue split vs blind A)
  const profitIncrease = Math.max(0, totalRev - blindRev);
  const profitPercent = blindRev > 0 ? Math.round((profitIncrease / blindRev) * 100) : 0;

  // Bot filter savings: Assuming 25% traffic is crawler/review bots, which costs account bans
  // Blocking them saves roughly $1,500 in domain/profile replacement costs
  const botFilteredCount = Math.round(clicks * 0.22);
  const moneySaved = Math.round(botFilteredCount * 0.15); // Saved ad spend / domain replacement

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkA.trim() || !linkB.trim()) return;

    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      setShowRegisterModal(true);
    }, 1200);
  };

  const handleModalClose = () => {
    setShowRegisterModal(false);
  };

  const handleRegisterRedirect = () => {
    const encodedA = encodeURIComponent(linkA);
    const encodedB = encodeURIComponent(linkB);
    navigate(`/register?ref=affiliate-rotator&linkA=${encodedA}&linkB=${encodedB}&weightA=${weightA}`);
  };

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  const faqItems: FaqItem[] = [
    {
      question: "What is an Affiliate Link Rotator and why is it essential for media buying?",
      answer: "An Affiliate Link Rotator is an traffic broker that dynamically routes clicks to multiple URLs based on predefined rules. Rather than pointing campaigns to a single static URL, media buyers use rotators to A/B test landing pages, distribute click weights among multiple merchants, balance daily volume caps, and route users based on device OS or geography, maximizing overall yield."
    },
    {
      question: "How does the link rotator protect my campaigns from search crawler and ad reviewer flags?",
      answer: "Advertising networks (Google Ads, Meta Ads, TikTok Ads) use automated crawler bots and human QA reviewers to inspect affiliate landing pages. Because standard affiliate URLs often trigger flags, Linktery utilizes Real-Time Fingerprinting (RTF). It evaluates user agent headers, IP ASN records, and executes a JS check. Reviewers are automatically shown a compliant informational page, while real human buyers proceed to the affiliate link. This keeps your ad accounts active."
    },
    {
      question: "What is EPC (Earnings Per Click) and how does A/B testing impact it?",
      answer: "EPC measures the average revenue generated from a single click: EPC = (Total Payout * Conversions) / Total Clicks. Even a small difference in conversion rate or payout changes your EPC. Linktery dispatches real-time weights, allowing you to split traffic between two offers. Once a winning offer is identified, you route 100% of your budget to it, lifting your overall average EPC and scaling your profit margin."
    },
    {
      question: "Does routing traffic through Linktery add latency or page load delays?",
      answer: "No. Linktery's redirection architecture is deployed on a globally distributed Edge DNS and Serverless compute infrastructure.Redirection logic is processed in under 12 milliseconds at the closest edge node to the visitor, meaning there is zero perceivable delay, keeping your landing page bounce rates minimal."
    },
    {
      question: "Can I use my own custom domains to host the affiliate rotators?",
      answer: "Yes, custom domains are highly recommended. You can map any subdomain (e.g., track.yourbrand.com) via CNAME records. Linktery automatically provisions free SSL certificates for your subdomains. Using private domains protects your brand authority and prevents shared domain reputation blacklisting."
    }
  ];

  // SVG traffic particles simulation
  const [particles, setParticles] = useState<{ id: number; cx: number; cy: number; path: "A" | "B"; speed: number }[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Periodically spawn new particles based on active traffic weights
    const spawnInterval = setInterval(() => {
      const isPathA = Math.random() * 100 < weightA;
      setParticles(prev => [
        ...prev.slice(-30), // Limit active particles in state
        {
          id: Math.random(),
          cx: 30,
          cy: 60,
          path: isPathA ? "A" : "B",
          speed: 1.5 + Math.random() * 1.5
        }
      ]);
    }, 450);

    return () => clearInterval(spawnInterval);
  }, [weightA]);

  useEffect(() => {
    const updateParticles = () => {
      setParticles(prev => 
        prev.map(p => {
          const nextCx = p.cx + p.speed;
          let nextCy = p.cy;

          // Split logic at CX = 120 (Central Node)
          if (p.cx >= 120) {
            if (p.path === "A") {
              // Curve up towards Offer A (ends at CX=260, CY=25)
              nextCy = p.cy - (nextCx - 120) * 0.25;
            } else {
              // Curve down towards Offer B (ends at CX=260, CY=95)
              nextCy = p.cy + (nextCx - 120) * 0.25;
            }
          }

          return { ...p, cx: nextCx, cy: Math.min(Math.max(nextCy, 20), 100) };
        }).filter(p => p.cx < 280) // Remove once off screen
      );
      animationFrameRef.current = requestAnimationFrame(updateParticles);
    };

    animationFrameRef.current = requestAnimationFrame(updateParticles);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#06080c] text-[#f1f3f7] font-sans antialiased relative overflow-hidden">
      {/* Decorative Grid Layer */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161e2b_1px,transparent_1px),linear-gradient(to_bottom,#161e2b_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25 z-0 pointer-events-none" />

      {/* Glow Orbs - Amber/Gold and Emerald/Green (Purple Ban Compliant) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-25">
        <div className="absolute top-[-100px] right-[10%] w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[130px]" />
        <div className="absolute top-[600px] left-[20%] w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#1e293b]/70 bg-[#06080c]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.webp" alt="Linktery Logo" className="h-[52px] w-auto mix-blend-screen" />
            <span className="text-xl font-bold tracking-tight text-white">Linktery</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors">Home</Link>
            <Link to="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</Link>

            {user ? (
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <span className="text-sm text-slate-400 group-hover:text-white transition-colors font-medium">Dashboard</span>
                <div className="w-8 h-8 rounded-full border border-[#1e293b] p-0.5 overflow-hidden group-hover:border-amber-500 transition-colors">
                  {getAvatarUrl() ? (
                    <img src={getAvatarUrl()!} alt="User avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Login</Link>
                <Link to="/register" className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold py-2.5 px-4 rounded-xl transition-all duration-150">Start Split Rotator</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Asymmetric Flow (Creative Tension 90/10 layout style) */}
      <section className="relative pt-36 pb-20 px-6 z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column (90% width context) */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Shuffle className="w-4 h-4" /> Real-Time Traffic Delivery Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.08]">
            Distribute Ad Traffic.<br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 bg-clip-text text-transparent">
              Protect Your Affiliate Ad Accounts.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed">
            Verify click quality, run weight-based A/B tests at the DNS edge, and block ad network reviewer bots. Keep campaigns profitable with zero redirection latency.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <a href="#dashboard-simulation" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-6 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10">
              Launch ROI Calculator <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#pipeline" className="bg-slate-900/60 hover:bg-slate-900 border border-[#1e293b] text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all flex items-center justify-center">
              View Safety Pipeline
            </a>
          </div>
        </div>

        {/* Right Column: Visual Live Redirection Flow widget */}
        <div className="lg:col-span-5 bg-slate-950/70 border border-[#1e293b] rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="border-b border-[#1e293b]/70 pb-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-slate-300">Live Traffic Dispatcher</span>
            </div>
            <span className="text-[10px] bg-[#1e293b] px-2 py-0.5 rounded font-mono text-slate-400">EDGE-LEVEL</span>
          </div>

          {/* SVG Particle Pipeline Canvas */}
          <div className="bg-[#070b13] border border-[#1e293b] rounded-2xl p-4 h-40 relative">
            <svg className="w-full h-full" viewBox="0 0 300 120">
              {/* Paths */}
              {/* Main pipeline path */}
              <line x1="30" y1="60" x2="120" y2="60" stroke="#1e293b" strokeWidth="3" strokeDasharray="4" />
              
              {/* Path A (Upper branch) */}
              <path d="M 120 60 Q 180 25, 260 25" fill="transparent" stroke="#1e293b" strokeWidth="3" strokeDasharray="4" />
              {/* Path B (Lower branch) */}
              <path d="M 120 60 Q 180 95, 260 95" fill="transparent" stroke="#1e293b" strokeWidth="3" strokeDasharray="4" />

              {/* Node labels */}
              <text x="35" y="45" fill="#64748b" fontSize="8" fontFamily="monospace">INCOMING</text>
              <text x="210" y="15" fill="#f59e0b" fontSize="8" fontFamily="monospace">OFFER A ({weightA}%)</text>
              <text x="210" y="112" fill="#10b981" fontSize="8" fontFamily="monospace">OFFER B ({100 - weightA}%)</text>

              {/* Gate node circle */}
              <circle cx="120" cy="60" r="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              <circle cx="30" cy="60" r="5" fill="#64748b" />
              <circle cx="260" cy="25" r="5" fill="#f59e0b" />
              <circle cx="260" cy="95" r="5" fill="#10b981" />

              {/* Render animated particles */}
              {particles.map(p => (
                <circle 
                  key={p.id} 
                  cx={p.cx} 
                  cy={p.cy} 
                  r="4" 
                  fill={p.cx < 120 ? "#64748b" : p.path === "A" ? "#f59e0b" : "#10b981"} 
                  className="transition-all duration-75"
                />
              ))}
            </svg>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>A/B Split Weight Distribution</span>
              <span className="text-amber-400 font-mono">A: {weightA}% / B: {100 - weightA}%</span>
            </div>
            <input 
              type="range"
              min="0"
              max="100"
              value={weightA}
              onChange={(e) => setWeightA(Number(e.target.value))}
              className="w-full h-2 bg-[#070b13] border border-[#1e293b] rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg leading-normal">
              <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Modify the slider to balance traffic in real-time. Linktery shifts the SVG streams instantly.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive EPC & ROI Boost Calculator (Fintech Dashboard Archetype) */}
      <section id="dashboard-simulation" className="py-20 px-6 border-y border-[#1e293b]/70 bg-[#06080c]/50 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-amber-400 font-mono text-xs uppercase tracking-wider">Campaign Metrics modeling</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mt-2">
              ROI & Earnings-Per-Click Simulator
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-3 leading-relaxed">
              Calculate how split routing and bot filtration scale your bottom-line profitability.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Input Variables Dashboard */}
            <div className="lg:col-span-5 bg-slate-950/80 border border-[#1e293b] p-6 rounded-2xl flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-b border-[#1e293b] pb-3">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Adjust Variables</h4>
                </div>

                {/* Clicks Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Monthly Clicks Volume</span>
                    <span className="text-white font-mono">{clicks.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range"
                    min="5000"
                    max="200000"
                    step="5000"
                    value={clicks}
                    onChange={(e) => setClicks(Number(e.target.value))}
                    className="w-full h-2 bg-[#070b13] border border-[#1e293b] rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Offer A Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase block">Offer A Payout ($)</label>
                    <input 
                      type="number"
                      value={payoutA}
                      onChange={(e) => setPayoutA(Number(e.target.value))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-xs outline-none text-white font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase block">Offer A CVR (%)</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={convA}
                      onChange={(e) => setConvA(Number(e.target.value))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-xs outline-none text-white font-mono"
                    />
                  </div>
                </div>

                {/* Offer B Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase block">Offer B Payout ($)</label>
                    <input 
                      type="number"
                      value={payoutB}
                      onChange={(e) => setPayoutB(Number(e.target.value))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-xs outline-none text-white font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase block">Offer B CVR (%)</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={convB}
                      onChange={(e) => setConvB(Number(e.target.value))}
                      className="w-full bg-[#070b13] border border-[#1e293b] rounded-lg px-3 py-2 text-xs outline-none text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Dashboard Output */}
            <div className="lg:col-span-7 bg-slate-950/40 border border-[#1e293b] p-6 rounded-2xl flex flex-col justify-between backdrop-blur-sm">
              <div className="space-y-6">
                <div className="border-b border-[#1e293b] pb-3 flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Metrics Analytics</h4>
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> EPC optimized
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#070b13] border border-[#1e293b] p-4 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Offer A EPC</span>
                    <span className="text-xl font-bold font-mono text-white">${epcA.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#070b13] border border-[#1e293b] p-4 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Offer B EPC</span>
                    <span className="text-xl font-bold font-mono text-white">${epcB.toFixed(2)}</span>
                  </div>
                  <div className="bg-[#070b13] border border-[#1e293b] p-4 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Average Split EPC</span>
                    <span className="text-xl font-bold font-mono text-amber-400">${((epcA * shareA) + (epcB * shareB)).toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#070b13] border border-[#1e293b] p-4 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase">Blind Routing Revenue</span>
                    <span className="text-2xl font-black font-mono text-slate-400">${blindRev.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 block mt-1">If sending 100% clicks to Offer A</span>
                  </div>
                  <div className="bg-[#070b13] border border-amber-500/20 p-4 rounded-xl bg-amber-500/[0.02]">
                    <span className="text-[10px] text-amber-400 font-bold block uppercase">Linktery Optimized Revenue</span>
                    <span className="text-2xl font-black font-mono text-white">${totalRev.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 block mt-1">Testing Offer B simultaneously</span>
                  </div>
                </div>

                {/* Additional Traffic Loss Section */}
                <div className="bg-emerald-500/[0.02] border border-emerald-500/20 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Crawler Filtration Savings
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Linktery verified & filtered **{botFilteredCount.toLocaleString()}** crawler/bot clicks, keeping your landing page domain reputation clean.
                    </p>
                  </div>
                  <div className="text-center md:text-right shrink-0">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Replacement Savings</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">+${moneySaved.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#1e293b] pt-4 mt-6 flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">Net Yield Optimization Ratio</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  +{profitPercent}% Revenue Lift (+${profitIncrease.toLocaleString()} / mo)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Verification Pipeline Section (Detailed Visual Stepper) */}
      <section id="pipeline" className="py-20 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-emerald-400 font-mono text-xs uppercase tracking-wider">Verification Blueprint</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mt-2">
            Ad Network Compliance & Filtration Pipeline
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3 leading-relaxed">
            Here is how Linktery inspects client variables at the Edge DNS level to route reviewer bots to safe pages and real users to offers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Stepper buttons (Left) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {[
              { title: "1. HTTP Request Signature Analysis", desc: "Inspection of request headers & client parameters." },
              { title: "2. ASN & IP Reputation Check", desc: "Identifying datacenter reviewers & scraper networks." },
              { title: "3. Interactive Browser Fingerprinting", desc: "Checking JS stack & execution capabilities." },
              { title: "4. Dynamic Path Dispatch", desc: "Routing bots to compliance pages & buyers to offers." }
            ].map((step, idx) => (
              <button
                key={idx}
                onClick={() => setActivePipelineStep(idx)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  activePipelineStep === idx 
                    ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5" 
                    : "bg-slate-950/60 border-[#1e293b] hover:border-slate-800"
                }`}
              >
                <h4 className={`text-sm font-bold ${activePipelineStep === idx ? "text-white" : "text-slate-400"}`}>{step.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1">{step.desc}</p>
              </button>
            ))}
          </div>

          {/* Stepper Details Card (Right) */}
          <div className="lg:col-span-8 bg-slate-950/70 border border-[#1e293b] rounded-2xl p-6 md:p-8 flex flex-col justify-between backdrop-blur-md">
            {activePipelineStep === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#1e293b] text-amber-400 font-mono text-xs uppercase tracking-wider">
                  <Cpu className="w-4 h-4" /> Header Fingerprinting
                </div>
                <h3 className="text-xl font-bold text-white">HTTP Request Header Signature Analysis</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Every click dispatches specific technical details. Automated review scanners sent by Facebook, Google, and TikTok ad algorithms often use customized browser setups that report missing or inconsistent headers (such as `Accept-Language`, `Sec-Ch-Ua`, or custom fonts payloads).
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Linktery reads headers at the Edge Server level before processing any redirect. If header parameters match bot inspector signatures, the visitor is flagged for safe-routing.
                </p>
              </div>
            )}

            {activePipelineStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#1e293b] text-amber-400 font-mono text-xs uppercase tracking-wider">
                  <Globe className="w-4 h-4" /> Geolocation & IP Reputation
                </div>
                <h3 className="text-xl font-bold text-white">ASN & IP Reputation Database Check</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Most ad reviewing bots are hosted on major cloud services (Amazon Web Services, Microsoft Azure, Google Cloud, DigitalOcean). Real buyers utilize domestic internet service providers (Comcast, AT&T, Vodafone).
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Linktery cross-references the request IP against a real-time database of Autonomous System Numbers (ASN). Hits originating from datacenters or known advertising review regions (such as Menlo Park for Facebook or Mountain View for Google) are immediately separated from public consumer traffic.
                </p>
              </div>
            )}

            {activePipelineStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#1e293b] text-amber-400 font-mono text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" /> Browser Verification
                </div>
                <h3 className="text-xl font-bold text-white">Interactive JS Browser Fingerprinting</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Automated web scrapers frequently disable Javascript or fail to emulate native canvas rendering, WebGL setups, and OS font registries correctly.
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  For suspicious traffic, Linktery serves a sub-millisecond background script challenge. If the visitor's client fails to execute JS variables, report correct canvas dimensions, or fails browser sandbox checks, it is filtered, preventing advertiser blacklists.
                </p>
              </div>
            )}

            {activePipelineStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[#1e293b] text-amber-400 font-mono text-xs uppercase tracking-wider">
                  <Shuffle className="w-4 h-4" /> Redirection Dispatch
                </div>
                <h3 className="text-xl font-bold text-white">Dynamic Path Dispatching</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  After passing verification stages, the request executes a double redirect:
                </p>
                <ul className="text-sm text-slate-400 space-y-2 pl-4 list-disc">
                  <li>**Verified Reviewers / Bots:** Directed to a highly compliant landing page mapped to look like a standard informational website, protecting the campaign ad account.</li>
                  <li>**Real Human Consumers:** Redirected to the designated affiliate campaign (Offer A or Offer B depending on rotator split weights) in under 12ms.</li>
                </ul>
              </div>
            )}

            <div className="border-t border-[#1e293b] pt-4 mt-6 flex justify-between items-center text-xs text-slate-500">
              <span>Pipeline Stage {activePipelineStep + 1} of 4</span>
              <span className="text-emerald-400 font-mono font-bold">100% compliant routing</span>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Affiliate Platforms Matrix Table */}
      <section className="py-20 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-amber-400 font-mono text-xs uppercase tracking-wider">Platform Adaptability</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mt-2">
            Compatible Networks & Redirection Strategies
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3 leading-relaxed">
            See how Linktery isolates domains and optimizes traffic configurations across popular networks.
          </p>
        </div>

        {/* Matrix Table */}
        <div className="border border-[#1e293b] rounded-xl overflow-hidden bg-slate-950/40 backdrop-blur-sm shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] sm:text-xs uppercase tracking-wider border-b border-[#1e293b]">
                <tr>
                  <th className="p-4 sm:p-5">Affiliate Platform</th>
                  <th className="p-4 sm:p-5">Redirection Risk</th>
                  <th className="p-4 sm:p-5">Linktery Strategy</th>
                  <th className="p-4 sm:p-5">Conversion Metric</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white">Amazon Associates</td>
                  <td className="p-4 sm:p-5 text-red-400">High block risk on shared redirection domain lists</td>
                  <td className="p-4 sm:p-5 text-slate-400">Deploy custom subdomains via CNAME, ensuring private link routing</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-mono">100% account safety</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white">ClickBank & Digistore24</td>
                  <td className="p-4 sm:p-5 text-amber-400">VSL fatigue (visitors abandoning long video sales pitches)</td>
                  <td className="p-4 sm:p-5 text-slate-400">A/B weight-testing to split visitors between Text Sales & Video layouts</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-mono">+25% average EPC lift</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white">MaxBounty & CPA Offers</td>
                  <td className="p-4 sm:p-5 text-red-400">Daily caps exceeded or unsupported geo-traffic wastage</td>
                  <td className="p-4 sm:p-5 text-slate-400">Configure fallback target URLs if geo does not match publisher terms</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-mono">0% geo click wastage</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white">OnlyFans & Fansly Linkouts</td>
                  <td className="p-4 sm:p-5 text-red-400">Immediate account suspension inside Instagram/TikTok ads</td>
                  <td className="p-4 sm:p-5 text-slate-400">Edge browser challenge checks to redirect compliance bots</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-mono">99.8% ad uptime</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Demo Split Simulator Form Widget */}
      <section className="py-12 px-6 max-w-xl mx-auto z-10 relative">
        <div className="bg-slate-950 border border-[#1e293b] p-6 sm:p-8 rounded-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Shuffle className="w-24 h-24 text-amber-500" />
          </div>
          
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> Smart Rotator Creator
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-normal">
            Enter target links below to generate a CNAME-ready multi-variant campaign routing path.
          </p>

          <form onSubmit={handleSimulate} className="space-y-4">
            <input 
              type="text"
              value={linkA}
              onChange={(e) => setLinkA(e.target.value)}
              placeholder="https://affiliate.link/offer-A"
              className="w-full bg-slate-900 border border-[#1e293b] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded px-4 py-3.5 text-xs outline-none transition-all text-white placeholder:text-slate-500"
              disabled={isSimulating}
            />

            <input 
              type="text"
              value={linkB}
              onChange={(e) => setLinkB(e.target.value)}
              placeholder="https://affiliate.link/offer-B"
              className="w-full bg-slate-900 border border-[#1e293b] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded px-4 py-3.5 text-xs outline-none transition-all text-white placeholder:text-slate-500"
              disabled={isSimulating}
            />

            <button 
              type="submit"
              disabled={isSimulating || !linkA.trim() || !linkB.trim()}
              className="w-full py-3.5 rounded bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold text-xs hover:opacity-95 transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSimulating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Generating campaign path...
                </>
              ) : (
                <>
                  Generate Rotator Link <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 max-w-4xl mx-auto z-10 relative border-t border-[#1e293b]/70">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 flex items-center justify-center gap-2">
            <HelpCircle className="w-8 h-8 text-amber-400" /> FAQ & Rotator Mechanics
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Everything you need to know about dynamic split weights, domain mapping, and traffic safety.
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div 
              key={index} 
              className="bg-slate-950/60 border border-[#1e293b] rounded-lg overflow-hidden transition-all"
            >
              <button 
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className="w-full p-5 text-left font-bold text-white flex justify-between items-center hover:bg-slate-900 transition-colors gap-4"
              >
                <span className="text-sm sm:text-base">{item.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-slate-500 transition-transform duration-300 shrink-0 ${
                    openFaqIndex === index ? "rotate-180 text-amber-400" : ""
                  }`} 
                />
              </button>
              {openFaqIndex === index && (
                <div className="p-5 pt-0 border-t border-[#1e293b]/50 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="relative border border-amber-500/20 bg-slate-950/80 rounded-xl p-8 sm:p-12 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-amber-500/20 rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4 relative z-10">
            Optimize Your Media Buying ROI Today
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Deploy dynamic traffic rotators on your own domain pool and track real-time EPC metrics.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10 max-w-md mx-auto">
            {user ? (
              <Link to="/dashboard" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-6 rounded text-xs transition-colors flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 px-6 rounded text-xs transition-colors flex items-center justify-center gap-2">
                Start Rotations Free <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link to="/pricing" className="bg-slate-900 border border-[#1e293b] hover:bg-slate-800 text-slate-300 font-bold py-3.5 px-6 rounded text-xs transition-colors flex items-center justify-center">
              View Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Option B: Modal Popup requesting registration */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border border-amber-500/30 p-6 sm:p-8 rounded-xl relative shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Rotator Ready!
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your split routing is fully configured. To activate the dynamic CNAME domains and track detailed click EPC analytics, register a free account.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRegisterRedirect}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5"
              >
                Create Free Account <ExternalLink className="w-3.5 h-3.5" />
              </button>
              
              <button 
                onClick={handleModalClose}
                className="w-full py-2.5 border border-[#1e293b] text-slate-400 font-bold text-xs rounded hover:bg-slate-900 hover:text-white transition-colors"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
