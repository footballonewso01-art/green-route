import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, Shield, Zap, Globe, 
  User as UserIcon, Check, ChevronDown, 
  Sparkles, HelpCircle, ExternalLink, 
  Smartphone as PhoneIcon, Sliders, Flame, 
  Paintbrush, Laptop, ShoppingBag, Calendar, 
  Calculator, CheckCircle2, ChevronRight, X, Play,
  AlertTriangle, Target
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function FitnessCoachSolution() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Call the SEO hook with the registered configuration
  useSeo(SEO_PAGES.fitnessCoachSolution);

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Hydration guard pattern
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simulator & Calculator State
  const [coachName, setCoachName] = useState<string>("coach_alex");
  const [tagline, setTagline] = useState<string>("Personal Trainer & Nutritionist");
  const [activeTheme, setActiveTheme] = useState<"cyber" | "emerald" | "classic">("cyber");
  const [showWorkout, setShowWorkout] = useState<boolean>(true);
  const [showMealPlan, setShowMealPlan] = useState<boolean>(true);
  const [showConsult, setShowConsult] = useState<boolean>(true);
  
  const [monthlySales, setMonthlySales] = useState<number>(2000);
  const [isSimulatingDeploy, setIsSimulatingDeploy] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  // Dynamic calculations (Beacons free tier takes 9% commission)
  const beaconsFeeMonthly = Math.round(monthlySales * 0.09);
  const beaconsFeeYearly = beaconsFeeMonthly * 12;
  const linkteryFee = 0;
  const annualSavings = beaconsFeeYearly;

  const handleSimulateDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulatingDeploy(true);
    setTimeout(() => {
      setIsSimulatingDeploy(false);
      setShowRegisterModal(true);
    }, 900);
  };

  const handleModalClose = () => {
    setShowRegisterModal(false);
  };

  const handleRegisterRedirect = () => {
    const params = new URLSearchParams({
      ref: "fitness-coach-solution",
      username: coachName,
      theme: activeTheme,
      workout: showWorkout ? "1" : "0",
      meal: showMealPlan ? "1" : "0",
      consult: showConsult ? "1" : "0",
      sales: monthlySales.toString()
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
      question: "How does Linktery help personal trainers sell digital workout plans?",
      answer: "Unlike platforms like Beacons that charge a 9% commission fee on digital sales under their free plan, Linktery charges a flat 0% transaction fee. You simply add your direct checkout links (such as Stripe, Shopify, Gumroad, or Lemon Squeezy) to your Linktery biolink page. We route your users at edge speeds, and you keep 100% of your program revenue."
    },
    {
      question: "Can I connect scheduling tools like Calendly and intake forms like Google Forms?",
      answer: "Yes, absolutely. You can easily add button redirects to your Calendly, Acuity Scheduling, Google Forms, or Typeform. With our App Deep Linking feature, we can command the phone to open these links directly in native Safari or Chrome viewports, preserving active user logins and cookies to double your consultation bookings."
    },
    {
      question: "Do I need a separate website if I use Linktery for my fitness business?",
      answer: "No. Linktery serves as your full-fledged mobile storefront and portal. You can map a custom subdomain (e.g. coach.yourname.com) directly to your Linktery profile on our Agency plan, giving your training business a premium, professional domain reputation without the overhead of website hosting."
    },
    {
      question: "How does Linktery handle geolocation and device targeting for coaching?",
      answer: "Linktery enables you to set smart routing rules. If you sell programs in USD to US clients and in GBP to UK clients, you can use the same link in your bio and automatically route users to different checkouts based on their geolocation, preventing conversion drop-offs due to currency friction."
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
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "184"
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

      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 z-0 pointer-events-none" />
      
      {/* Glow Rings (Strictly Yellow/Gold and Teal/Cyan) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-[#eab308]/20 to-[#06b6d4]/20 rounded-full blur-[120px]" />
        <div className="absolute top-[800px] left-[-200px] w-[500px] h-[500px] bg-[#06b6d4]/10 rounded-full blur-[140px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#1e293b]/70 bg-[#07090e]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.webp" alt="Linktery Logo" className="h-[52px] w-auto mix-blend-screen" />
            <span className="text-xl font-bold tracking-tight text-white">Linktery</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">Home</Link>
            <Link to="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">Pricing</Link>

            {user ? (
              <Link to="/dashboard" className="flex items-center gap-3 group">
                <span className="text-sm text-slate-400 group-hover:text-white transition-colors font-medium">Dashboard</span>
                <div className="w-8 h-8 rounded-md border border-[#1e293b] p-0.5 overflow-hidden group-hover:border-[#eab308] transition-colors">
                  {getAvatarUrl() ? (
                    <img src={getAvatarUrl()!} alt="User avatar" className="w-full h-full rounded-sm object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-sm bg-slate-800 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors font-medium">Login</Link>
                <Link to="/register" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 text-xs font-bold py-2.5 px-4 rounded transition-all duration-150">Create Free Biolink</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-16 px-6 z-10 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-[#eab308]/30 bg-[#eab308]/5 text-[#eab308] text-[11px] font-mono uppercase tracking-wider mb-8">
          <Flame className="w-3.5 h-3.5 animate-pulse" /> 0% Transaction Fees For Fitness Sellers
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
          Biolinks Engineered for<br />
          <span className="bg-gradient-to-r from-[#eab308] via-[#06b6d4] to-emerald-400 bg-clip-text text-transparent">
            Fitness Coaches & Nutritionists
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-450 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Create a white-labeled mobile portal. Connect custom domains, bypass sandboxed in-app browsers to double your Calendly bookings, and sell PDF plans with zero middleman commission fees.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <a href="#customizer" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-bold py-3.5 px-6 rounded-md text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#eab308]/5">
            Open Profile Simulator <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#calculator" className="bg-slate-900/60 hover:bg-slate-900 border border-[#1e293b] text-white font-bold py-3.5 px-6 rounded-md text-sm transition-all flex items-center justify-center">
            Calculate Savings
          </a>
        </div>
      </section>

      {/* Interactive Customizer and Phone Preview Section */}
      <section id="customizer" className="py-20 px-6 border-y border-[#1e293b]/70 bg-[#07090e]/40 z-10 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Left Column: Form Settings */}
          <div className="lg:col-span-7 flex flex-col justify-between border border-[#1e293b] bg-slate-950/70 backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl">
            <div className="space-y-6">
              <div className="border-b border-[#1e293b]/70 pb-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#eab308]" /> Profile Configurator
                </h2>
                <p className="text-xs text-slate-400 font-medium">Model your social link configuration below. Preview changes instantly.</p>
              </div>

              {/* Username Handle */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-slate-450 uppercase block">Set Profile Handle</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-500 font-mono text-xs">linktery.com/</span>
                  <input 
                    type="text"
                    value={coachName}
                    onChange={(e) => setCoachName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                    className="w-full bg-slate-900 border border-[#1e293b] focus:border-[#eab308] focus:ring-1 focus:ring-[#eab308] rounded-md py-3 pl-24 pr-4 text-xs font-mono outline-none text-white transition-all"
                  />
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-slate-450 uppercase block">Disciplines / Tagline</label>
                <input 
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-slate-900 border border-[#1e293b] focus:border-[#eab308] focus:ring-1 focus:ring-[#eab308] rounded-md py-3 px-4 text-xs outline-none text-white transition-all font-mono"
                />
              </div>

              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-slate-450 uppercase block">Coaching Page Theme Presets</label>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setActiveTheme("cyber")}
                    className={`py-3 text-xs font-bold rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                      activeTheme === "cyber" 
                        ? "bg-[#eab308]/10 text-[#eab308] border-[#eab308]/30 shadow-md" 
                        : "bg-slate-900/50 text-slate-400 border-[#1e293b] hover:text-white"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" /> Cyber Yellow
                  </button>
                  <button 
                    onClick={() => setActiveTheme("emerald")}
                    className={`py-3 text-xs font-bold rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                      activeTheme === "emerald" 
                        ? "bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/30 shadow-md" 
                        : "bg-slate-900/50 text-slate-400 border-[#1e293b] hover:text-white"
                    }`}
                  >
                    <Paintbrush className="w-3.5 h-3.5" /> Cyber Teal
                  </button>
                  <button 
                    onClick={() => setActiveTheme("classic")}
                    className={`py-3 text-xs font-bold rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                      activeTheme === "classic" 
                        ? "bg-white/10 text-white border-white/20 shadow-md" 
                        : "bg-slate-900/50 text-slate-400 border-[#1e293b] hover:text-white"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" /> Bauhaus White
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-slate-450 uppercase block">Toggle Action buttons</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-[#1e293b] rounded-md cursor-pointer select-none hover:border-slate-700 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={showWorkout}
                      onChange={(e) => setShowWorkout(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-950 text-[#eab308] accent-[#eab308]"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
                      <ShoppingBag className="w-3.5 h-3.5 text-red-400" /> Workout Program
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-[#1e293b] rounded-md cursor-pointer select-none hover:border-slate-700 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={showMealPlan}
                      onChange={(e) => setShowMealPlan(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-950 text-[#eab308] accent-[#eab308]"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" /> Custom Meal Plan
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900/50 border border-[#1e293b] rounded-md cursor-pointer select-none hover:border-slate-700 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={showConsult}
                      onChange={(e) => setShowConsult(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-950 text-[#eab308] accent-[#eab308]"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" /> 1-on-1 Consult
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <form onSubmit={handleSimulateDeploy} className="mt-8 border-t border-[#1e293b]/70 pt-6">
              <button 
                type="submit"
                disabled={isSimulatingDeploy}
                className="w-full bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-bold py-3.5 px-6 rounded-md text-sm transition-all shadow-md shadow-[#eab308]/10 flex items-center justify-center gap-2"
              >
                {isSimulatingDeploy ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Deploying Coaching Profile...
                  </>
                ) : (
                  <>
                    Deploy Page Live <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Live Mobile Mockup */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="w-full max-w-sm border border-[#1e293b] bg-slate-950 p-3 shadow-2xl rounded-3xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1e293b] text-slate-400 px-3 py-0.5 rounded-full text-[10px] font-mono border border-slate-700/50 z-20">
                Live Mobile Preview
              </div>
              
              <div className={`min-h-[480px] flex flex-col justify-between p-6 rounded-2xl border border-[#1e293b]/70 ${
                activeTheme === "cyber" 
                  ? "bg-[#0b0f19] text-white" 
                  : activeTheme === "emerald" 
                    ? "bg-[#042f2e] text-white" 
                    : "bg-white text-slate-950"
              }`}>
                {/* Profile Header */}
                <div className="text-center space-y-3">
                  <div className={`w-14 h-14 rounded-full mx-auto border flex items-center justify-center font-bold text-sm ${
                    activeTheme === "classic" ? "bg-slate-950 border-[#1e293b] text-white" : "bg-[#eab308] border-[#eab308]/20 text-slate-950"
                  }`}>
                    {coachName ? coachName.slice(0, 2).toUpperCase() : "CO"}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold">@{coachName || "coach_alex"}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{tagline || "Personal Trainer & Nutritionist"}</p>
                  </div>
                </div>

                {/* Live mock buttons list */}
                <div className="space-y-2.5 my-8 flex-1 flex flex-col justify-center">
                  {showWorkout && (
                    <div className={`p-2.5 border rounded-lg flex items-center justify-between text-xs font-bold uppercase transition-all ${
                      activeTheme === "classic" 
                        ? "bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200" 
                        : "bg-slate-900/60 border-[#1e293b] text-white"
                    }`}>
                      <span className="flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5 text-red-400" /> Workout Program (PDF)</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}

                  {showMealPlan && (
                    <div className={`p-2.5 border rounded-lg flex items-center justify-between text-xs font-bold uppercase transition-all ${
                      activeTheme === "classic" 
                        ? "bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200" 
                        : "bg-slate-900/60 border-[#1e293b] text-white"
                    }`}>
                      <span className="flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5 text-emerald-400" /> Custom Meal Plan</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}

                  {showConsult && (
                    <div className={`p-2.5 border rounded-lg flex items-center justify-between text-xs font-bold uppercase transition-all ${
                      activeTheme === "classic" 
                        ? "bg-slate-100 border-slate-200 text-slate-900 hover:bg-slate-200" 
                        : "bg-slate-900/60 border-[#1e293b] text-white"
                    }`}>
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-450" /> Book 1-on-1 Consultation</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}
                  
                  {!showWorkout && !showMealPlan && !showConsult && (
                    <p className="text-[10px] text-center text-slate-500 italic">Toggle options to customize your buttons...</p>
                  )}
                </div>

                {/* Footer badge */}
                <div className="text-center pt-3 border-t border-slate-800/40">
                  <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase">Powered by Linktery</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Interactive Savings Calculator */}
      <section id="calculator" className="py-20 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="border border-[#1e293b] bg-slate-950/70 backdrop-blur-md p-6 sm:p-10 shadow-2xl rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Calculator className="w-32 h-32 text-[#06b6d4]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Slider Control */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-[#06b6d4] font-mono text-xs uppercase tracking-wider font-bold">Commission Leak Auditor</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 uppercase tracking-tight">
                  Stop Paying Platform Taxes On Your Programs
                </h2>
                <p className="text-sm text-slate-405 leading-relaxed mt-2 font-normal">
                  Legacy link storefronts (like Beacons.ai) take a **9% transaction cut** on their free plans for digital products. Drag the slider to see how much of your fitness income disappears.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-slate-450 uppercase">Monthly Program & Coaching Sales</span>
                  <span className="text-2xl font-black text-[#eab308] font-mono">${monthlySales.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="15000" 
                  step="500"
                  value={monthlySales} 
                  onChange={(e) => setMonthlySales(Number(e.target.value))}
                  className="w-full h-2 bg-slate-900 border border-[#1e293b] rounded-lg appearance-none cursor-pointer accent-[#eab308]"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>$500</span>
                  <span>$7,500</span>
                  <span>$15,000+</span>
                </div>
              </div>
            </div>

            {/* Calculations Output */}
            <div className="lg:col-span-5 bg-[#0b0f19] border border-[#1e293b] p-6 rounded-xl space-y-4 relative z-10">
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
                  <span className="text-slate-400 uppercase">Beacons Fee (9%):</span>
                  <span className="text-red-500 font-black">${beaconsFeeMonthly} / mo</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
                  <span className="text-slate-400 uppercase">Beacons Annual Fee:</span>
                  <span className="text-red-500 font-black">${beaconsFeeYearly.toLocaleString()} / yr</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
                  <span className="text-slate-400 uppercase">Linktery Fee:</span>
                  <span className="text-emerald-455 font-black">$0.00 / mo</span>
                </div>
              </div>

              <div className="bg-[#eab308]/5 border border-[#eab308]/20 p-5 rounded-lg text-center">
                <span className="text-[10px] font-mono font-bold text-[#eab308] uppercase tracking-wider block mb-1">Annual Linktery Savings</span>
                <span className="text-4xl font-extrabold text-white">${annualSavings.toLocaleString()}</span>
                <span className="text-[9px] text-slate-500 block mt-2 font-mono uppercase">Keep 100% of digital revenues by connecting direct checkouts</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="py-20 px-6 max-w-7xl mx-auto z-10 relative border-t border-[#1e293b]/70">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[#06b6d4] font-mono text-xs uppercase tracking-wider font-bold">Platform Comparison</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mt-2 uppercase">
            Beacons vs Linktery Matrix
          </h2>
          <p className="text-slate-405 text-sm mt-2 leading-relaxed">
            See why professional trainers and nutritionists trust Linktery to route their client checkouts and intake calendars.
          </p>
        </div>

        <div className="border border-[#1e293b] rounded-xl overflow-hidden bg-slate-950/60 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-350">
              <thead className="bg-[#0b0f19] border-b border-[#1e293b] text-[#eab308] font-mono text-[10px] sm:text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 sm:p-5">Feature Breakdown</th>
                  <th className="p-4 sm:p-5 text-emerald-450">Linktery</th>
                  <th className="p-4 sm:p-5">Beacons.ai</th>
                  <th className="p-4 sm:p-5">Linktree</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/75 font-mono text-[11px] sm:text-xs">
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">Transaction fee</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-bold">0% (Flat zero)</td>
                  <td className="p-4 sm:p-5 text-red-400">9% on Free Tier</td>
                  <td className="p-4 sm:p-5 text-slate-450">0% - 2% (Plan dependent)</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">Custom Domain Mappings</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-bold">Supported (Agency plan)</td>
                  <td className="p-4 sm:p-5">Requires Creator+ ($10/mo)</td>
                  <td className="p-4 sm:p-5">Requires Pro ($10/mo)</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">App Deep Linking</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-bold">Bypass WebView (Pro plan)</td>
                  <td className="p-4 sm:p-5 text-slate-450">Not Supported</td>
                  <td className="p-4 sm:p-5 text-slate-450">Not Supported</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">White-Label Avatars</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-bold">Custom layout templates</td>
                  <td className="p-4 sm:p-5">Requires Creator+ ($10/mo)</td>
                  <td className="p-4 sm:p-5">Requires Pro ($10/mo)</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">Intake form redirections</td>
                  <td className="p-4 sm:p-5 text-emerald-400 font-bold">Deep links to Calendly / Google Forms</td>
                  <td className="p-4 sm:p-5 text-amber-500">WebView only (Logged out)</td>
                  <td className="p-4 sm:p-5 text-amber-500">WebView only (Logged out)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Educational Article Section */}
      <section id="article" className="py-20 px-6 max-w-4xl mx-auto z-10 relative border-t border-[#1e293b]/70">
        <article className="prose prose-invert prose-slate max-w-none space-y-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[#eab308] font-mono text-xs uppercase tracking-wider font-bold">Coaching Operations</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2 uppercase tracking-tight">
              How Personal Trainers and Nutritionists Can Double Their Online Bookings & PDF Program Sales
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-3 font-normal leading-normal">
              A detailed guide on eliminating transaction commissions, reducing load speeds, and bypassing in-app browser jails.
            </p>
          </div>

          <div className="space-y-6 text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            <h3 className="text-lg sm:text-xl font-bold text-white uppercase pt-4 border-b border-[#1e293b]/55 pb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> The Conversion Leak: How In-App Browsers Sandbox Your Calendar
            </h3>
            <p>
              If you run social media campaigns on Instagram, TikTok, or YouTube to promote your 1-on-1 coaching consultations, you face a major mobile drop-off barrier: **the in-app browser (WebView)**.
            </p>
            <p>
              When a prospective client clicks the link in your bio, the social app renders your booking calendar (like Calendly or Acuity) or intake questionnaire (like Google Forms or Typeform) inside its own temporary browser frame. Because WebViews isolate cookies, your users are logged out of their Google or Apple accounts. 
            </p>
            <p>
              Having to manually type an email, password, and confirmation code to book a consultation on a mobile device leads to a massive loss of high-intent clients. Up to **70-80% of clicks bounce** before completing the intake.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-white uppercase pt-4 border-b border-[#1e293b]/55 pb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> The Commission Drain: Why 9% Storefront Cuts Stifle Your Margins
            </h3>
            <p>
              Many trainers default to all-in-one link-in-bio storefronts to sell digital workout PDFs, meal plans, or video courses. While convenient to list, platforms like Beacons monetarily penalize creators by taking a steep **9% transaction cut** on free accounts. 
            </p>
            <p>
              If you generate $3,000 in monthly sales, the platform takes **$270 per month** in commission fees. To bypass these fees, you are forced to pay a recurring monthly subscription fee. 
            </p>
            <p>
              Linktery operates differently. We are a pure, high-performance traffic routing engine. We do not process payments; instead, we route your clicks instantly to your own preferred checkouts (such as Stripe, Lemon Squeezy, Shopify, or Gumroad) with **0% transaction fees**. You keep all of your earnings.
            </p>

            <h3 className="text-lg sm:text-xl font-bold text-white uppercase pt-4 border-b border-[#1e293b]/55 pb-2 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#06b6d4]" /> The Linktery Solution: Clean Redirects & Custom Domains
            </h3>
            <p>
              Linktery resolves mobile drop-offs by executing an automatic protocol handshake. On our Pro and Agency tiers, we detect the visitor's device parameters and instruct the phone's operating system to launch target calendars, checkout pages, and forms inside native Safari or Chrome app viewports.
            </p>
            <p>
              This preserves pre-saved credit card tokens, Google credentials, and autofill inputs, shortening your client intake journey to a few taps. Connect your own custom domain (e.g. `coach.yourname.com`) to build direct domain reputation and guarantee your social links never get flagged under shared platform bans.
            </p>
          </div>
        </article>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 max-w-4xl mx-auto z-10 relative border-t border-[#1e293b]/70">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 flex items-center justify-center gap-2 uppercase">
            <HelpCircle className="w-8 h-8 text-[#eab308]" /> FAQ & Coaching Knowledge
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Essential answers regarding digital sales, custom domains, and intake calendars.
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div 
              key={index} 
              className="bg-slate-950/60 border border-[#1e293b] rounded-lg overflow-hidden transition-all shadow-md"
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
                <div className="p-5 pt-0 border-t border-[#1e293b]/50 text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="relative border border-[#eab308]/20 bg-slate-950/80 p-8 sm:p-12 text-center overflow-hidden rounded-xl shadow-2xl">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-[#eab308] rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4 relative z-10 uppercase tracking-tighter">
            Claim Your Social Coaching Biolink
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed font-normal">
            Reserve your unique Linktery handle today. Optimize checkouts, connect custom subdomains, and track client acquisition analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10 max-w-md mx-auto">
            {user ? (
              <Link to="/dashboard" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-bold py-3.5 px-6 rounded text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-bold py-3.5 px-6 rounded text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                Create My Free Page <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link to="/pricing" className="bg-slate-900 border border-[#1e293b] hover:bg-slate-800 text-slate-350 font-bold py-3.5 px-6 rounded text-xs uppercase tracking-wider transition-colors flex items-center justify-center">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e293b]/70 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.webp" alt="Linktery Logo" className="h-10 w-auto mix-blend-screen grayscale" />
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Linktery</span>
          </Link>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <Link to="/privacy" className="text-xs text-slate-500 hover:text-[#eab308] transition-colors font-bold uppercase">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-slate-500 hover:text-[#eab308] transition-colors font-bold uppercase">Terms & Conditions</Link>
            <p className="text-xs text-slate-600 font-mono">© 2026 Linktery. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Deploy handover Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border border-[#eab308]/30 p-6 sm:p-8 rounded-xl relative shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2 uppercase">
              <Sparkles className="w-5 h-5 text-[#eab308]" /> Configuration Ready!
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-normal">
              Your customized fitness coaching bio-link profile has been configured. Register your free account to publish it live under `linktery.com/{coachName}`.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRegisterRedirect}
                className="w-full py-3 bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5"
              >
                Claim Profile Handle <ExternalLink className="w-3.5 h-3.5" />
              </button>
              
              <button 
                onClick={handleModalClose}
                className="w-full py-2.5 border border-[#1e293b] text-slate-400 font-bold text-xs rounded hover:bg-slate-900 hover:text-white transition-colors"
              >
                Close Builder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
