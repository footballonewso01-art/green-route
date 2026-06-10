import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, Shield, Zap, Globe, 
  User as UserIcon, Check, ChevronDown, 
  Sparkles, Layers, HelpCircle,
  ExternalLink, Smartphone, Eye, CheckSquare,
  Instagram, Youtube, ShoppingCart, MessageCircle, Laptop,
  Flame, Paintbrush, Sliders
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function BioLinkTool() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Call the SEO hook with the registered configuration
  useSeo(SEO_PAGES.bioLinkTool);

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Mini Profile Builder state
  const [handle, setHandle] = useState<string>("creative_mind");
  const [activeTheme, setActiveTheme] = useState<"cyber" | "emerald" | "classic">("cyber");
  const [showYoutube, setShowYoutube] = useState<boolean>(true);
  const [showShop, setShowShop] = useState<boolean>(true);
  const [showSpotify, setShowSpotify] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(true);
  
  const [isSimulatingSave, setIsSimulatingSave] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  // Generate URL for registration handover
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulatingSave(true);
    setTimeout(() => {
      setIsSimulatingSave(false);
      setShowRegisterModal(true);
    }, 900);
  };

  const handleModalClose = () => {
    setShowRegisterModal(false);
  };

  const handleRegisterRedirect = () => {
    const params = new URLSearchParams({
      ref: "bio-link-tool",
      username: handle,
      theme: activeTheme,
      yt: showYoutube ? "1" : "0",
      shop: showShop ? "1" : "0",
      spot: showSpotify ? "1" : "0",
      chat: showChat ? "1" : "0"
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
      question: "Why should I use Linktery instead of Linktree or Beacons?",
      answer: "Linktery is built for speed and zero transaction commissions. Legacy platforms take up to a 9% transaction fee on digital product sales under their free plan, or load heavy client scripts that slow down mobile checkouts. Linktery keeps its free plan commission-free (0% fees) and adds App-to-App deep linking, redirecting your users directly to their native mobile apps instead of locked in-app browsers."
    },
    {
      question: "What is the 'Instagram Browser Jail' and how does Linktery solve it?",
      answer: "When a follower clicks your profile link in Instagram, TikTok, or Facebook, the social app loads it in a sandboxed, built-in browser (webview). Because visitors are logged out of external websites inside that webview, they cannot purchase items, subscribe, or follow you easily. Linktery dispatches custom device protocols (e.g., youtube://, spotify://) to trigger the native app directly on the phone, preventing up to 80% user drop-off."
    },
    {
      question: "Can I map my own custom subdomain to my Link-in-Bio profile?",
      answer: "Yes. Mapping your own custom domain (e.g., links.yourname.com) is supported on our Agency plan ($29/mo). It requires setting up a CNAME record in your DNS settings. Custom domains build immediate credibility, increase user trust, and protect your profile links from shared platform bans."
    },
    {
      question: "What monetization checkouts are compatible with Linktery?",
      answer: "Linktery doesn't act as a payment processor, which is how we keep transaction fees at 0%. You simply add your direct high-converting checkouts from Shopify, Gumroad, Lemon Squeezy, Stripe, or Gumroad. We optimize the traffic speed, while you keep 100% of the revenue."
    }
  ];

  // Dynamic JSON-LD Structured Data for FAQPage and SoftwareApplication
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Bio-Link Creator",
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

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f0f2f5] font-sans antialiased relative overflow-hidden">
      {/* Dynamic Schema Injection */}
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} 
      />

      {/* Bauhaus Grid Line overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:6rem_6rem] opacity-30 pointer-events-none z-0" />
      
      {/* Bold Bauhaus color blocks (Purple Ban compliant: Yellow, Cyan, Charcoal) */}
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
                <Link to="/register" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 text-xs font-black py-2.5 px-5 rounded-none border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">Start Free Biolink</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Bauhaus Remix Asymmetric Stack */}
      <section className="relative pt-36 pb-20 px-6 z-10 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none border-2 border-slate-950 bg-[#eab308] text-slate-950 text-xs font-mono font-bold uppercase tracking-wider mb-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <Flame className="w-4 h-4" /> 0% Transaction Fees Always
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 uppercase leading-[0.95]">
          Your Entire Social Brand.<br />
          <span className="bg-[#06b6d4] text-slate-950 px-4 py-1.5 inline-block border-2 border-slate-950 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-2">
            Optimized in One Link.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
          Create premium link-in-bio profiles with full layout control. Integrate external checkout links, bypass social app webviews, and map custom domains with zero platform commissions.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <a href="#builder" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2">
            Open Builder Playground <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#features" className="bg-[#07090e] hover:bg-slate-900 border-2 border-slate-950 text-white font-bold py-4 px-6 rounded-none text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Read Advantages
          </a>
        </div>
      </section>

      {/* Interactive Builder Playground Section */}
      <section id="builder" className="py-20 px-6 border-t-4 border-slate-950 bg-[#0c0f17]/40 z-10 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Left Column: Builder Controls (Bauhaus Style Form) */}
          <div className="lg:col-span-7 flex flex-col justify-between border-2 border-slate-950 bg-[#07090e] p-6 sm:p-8 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="space-y-6">
              <div className="border-b-2 border-slate-950 pb-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#eab308]" /> Mini Profile Builder
                </h2>
                <p className="text-xs text-slate-400 font-medium">Customize your social link setup. Adjust settings to watch the preview update instantly.</p>
              </div>

              {/* Username Handle Input */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-slate-400 uppercase block">Set Profile Handle</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-500 font-mono text-xs">linktery.com/</span>
                  <input 
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                    className="w-full bg-slate-900 border-2 border-slate-950 focus:border-[#eab308] rounded-none py-3.5 pl-28 pr-4 text-xs font-mono outline-none text-white transition-colors"
                  />
                </div>
              </div>

              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-slate-400 uppercase block">Choose Theme Presets</label>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setActiveTheme("cyber")}
                    className={`py-3 text-xs font-bold rounded-none border-2 border-slate-950 flex items-center justify-center gap-1.5 transition-all ${
                      activeTheme === "cyber" 
                        ? "bg-[#eab308] text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" /> Cyber Yellow
                  </button>
                  <button 
                    onClick={() => setActiveTheme("emerald")}
                    className={`py-3 text-xs font-bold rounded-none border-2 border-slate-950 flex items-center justify-center gap-1.5 transition-all ${
                      activeTheme === "emerald" 
                        ? "bg-[#06b6d4] text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Paintbrush className="w-3.5 h-3.5" /> Cyber Teal
                  </button>
                  <button 
                    onClick={() => setActiveTheme("classic")}
                    className={`py-3 text-xs font-bold rounded-none border-2 border-slate-950 flex items-center justify-center gap-1.5 transition-all ${
                      activeTheme === "classic" 
                        ? "bg-white text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" 
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" /> Bauhaus White
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-slate-400 uppercase block">Toggle Profile Buttons</label>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 bg-slate-900 border-2 border-slate-950 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showYoutube}
                      onChange={(e) => setShowYoutube(e.target.checked)}
                      className="w-4 h-4 rounded-none bg-slate-800 border-slate-950 text-[#eab308] accent-[#eab308]"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
                      <Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube Link
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 border-2 border-slate-950 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showShop}
                      onChange={(e) => setShowShop(e.target.checked)}
                      className="w-4 h-4 rounded-none bg-slate-800 border-slate-950 text-[#eab308] accent-[#eab308]"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
                      <ShoppingCart className="w-3.5 h-3.5 text-[#eab308]" /> Digital Shop
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 border-2 border-slate-950 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showSpotify}
                      onChange={(e) => setShowSpotify(e.target.checked)}
                      className="w-4 h-4 rounded-none bg-slate-800 border-slate-950 text-[#eab308] accent-[#eab308]"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
                      <Globe className="w-3.5 h-3.5 text-emerald-500" /> Spotify Link
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-900 border-2 border-slate-950 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showChat}
                      onChange={(e) => setShowChat(e.target.checked)}
                      className="w-4 h-4 rounded-none bg-slate-800 border-slate-950 text-[#eab308] accent-[#eab308]"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase">
                      <MessageCircle className="w-3.5 h-3.5 text-blue-400" /> Consult DM
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-8 border-t-2 border-slate-950 pt-6">
              <button 
                type="submit"
                disabled={isSimulatingSave}
                className="w-full bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
              >
                {isSimulatingSave ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Locking Configuration...
                  </>
                ) : (
                  <>
                    Deploy Profile Live <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Live Mobile Mockup (Visual Preview) */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="w-full max-w-sm border-4 border-slate-950 bg-slate-950 p-2.5 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-none relative">
              
              {/* Dynamic Theme classes mapping */}
              <div className={`min-h-[480px] flex flex-col justify-between p-6 border-2 border-slate-950 ${
                activeTheme === "cyber" 
                  ? "bg-[#0b0f19] text-white" 
                  : activeTheme === "emerald" 
                    ? "bg-[#042f2e] text-white" 
                    : "bg-white text-slate-950"
              }`}>
                {/* Profile Header */}
                <div className="text-center space-y-3">
                  <div className={`w-16 h-16 rounded-none mx-auto border-2 border-slate-950 flex items-center justify-center font-bold ${
                    activeTheme === "classic" ? "bg-slate-900 text-white" : "bg-[#eab308] text-slate-950"
                  }`}>
                    {handle ? handle.slice(0, 2).toUpperCase() : "ME"}
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight">@{handle || "creative_mind"}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Welcome to my Linktery profile</p>
                  </div>
                </div>

                {/* Simulated Links list */}
                <div className="space-y-2.5 my-8 flex-1 flex flex-col justify-center">
                  {showYoutube && (
                    <div className={`p-2.5 border-2 border-slate-950 flex items-center justify-between text-xs font-bold uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      activeTheme === "classic" ? "bg-slate-100 hover:bg-slate-200" : "bg-slate-900/60"
                    }`}>
                      <span className="flex items-center gap-1.5"><Youtube className="w-3.5 h-3.5 text-red-500" /> Watch YouTube Video</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}

                  {showShop && (
                    <div className={`p-2.5 border-2 border-slate-950 flex items-center justify-between text-xs font-bold uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      activeTheme === "classic" ? "bg-slate-100 hover:bg-slate-200" : "bg-slate-900/60"
                    }`}>
                      <span className="flex items-center gap-1.5"><ShoppingCart className="w-3.5 h-3.5 text-[#eab308]" /> Digital Shop</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}

                  {showSpotify && (
                    <div className={`p-2.5 border-2 border-slate-950 flex items-center justify-between text-xs font-bold uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      activeTheme === "classic" ? "bg-slate-100 hover:bg-slate-200" : "bg-slate-900/60"
                    }`}>
                      <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-emerald-500" /> Spotify Playlist</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}

                  {showChat && (
                    <div className={`p-2.5 border-2 border-slate-950 flex items-center justify-between text-xs font-bold uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      activeTheme === "classic" ? "bg-slate-100 hover:bg-slate-200" : "bg-slate-900/60"
                    }`}>
                      <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-blue-400" /> Book Consult DM</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}
                  
                  {!showYoutube && !showShop && !showSpotify && !showChat && (
                    <p className="text-[10px] text-center text-slate-500 italic">Toggle options to populate links...</p>
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

      {/* Feature Value Grid */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#eab308] font-mono text-xs uppercase tracking-wider font-bold">Platform Capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-2 uppercase">
            Designed to Preserve Your Audiences
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3 leading-relaxed">
            Legacy biolink utilities restrict customization and charge transaction fees. Linktery provides edge performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-[#07090e] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-none bg-[#eab308]/10 border-2 border-slate-950 flex items-center justify-center text-[#eab308] mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-md font-black uppercase text-white mb-2">Edge Routing Redirections</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Linktery processes redirections on globally distributed serverless networks in under 15ms. Rapid delivery speeds improve user experience and reduce bounce drop-offs.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#07090e] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-none bg-[#eab308]/10 border-2 border-slate-950 flex items-center justify-center text-[#eab308] mb-4">
              <UserIcon className="w-5 h-5" />
            </div>
            <h3 className="text-md font-black uppercase text-white mb-2">White-Label Customization</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Upload custom avatars, configure button styling, and remove default branding watermarks on our Pro and Agency tiers to present a clean custom profile.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#07090e] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <div className="w-10 h-10 rounded-none bg-[#eab308]/10 border-2 border-slate-950 flex items-center justify-center text-[#eab308] mb-4">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-md font-black uppercase text-white mb-2">CNAME Custom Subdomains</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Map your profile page to your private subdomains (e.g. `bio.yourbrand.com`) using custom DNS records, establishing domain reputation and user trust.
            </p>
          </div>
        </div>
      </section>

      {/* In-App WebView Friction Matrix */}
      <section className="py-20 px-6 max-w-7xl mx-auto z-10 relative border-t-2 border-slate-950">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[#06b6d4] font-mono text-xs uppercase tracking-wider font-bold">WebView Limitations</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-2 uppercase">
            In-App WebView Friction Matrix
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed">
            Understanding how in-app browsers sandbox destination pages. Let's compare limits.
          </p>
        </div>

        <div className="border-2 border-slate-950 rounded-none overflow-hidden bg-slate-950 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-350">
              <thead className="bg-[#0b0f19] border-b-2 border-slate-950 text-[#eab308] font-mono text-[10px] sm:text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 sm:p-5">Social Platform</th>
                  <th className="p-4 sm:p-5">Browser Type</th>
                  <th className="p-4 sm:p-5">Cookie Isolation</th>
                  <th className="p-4 sm:p-5">Credential Status</th>
                  <th className="p-4 sm:p-5 text-right">Drop-off Friction</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-950 font-mono text-[11px] sm:text-xs">
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">Instagram</td>
                  <td className="p-4 sm:p-5">Custom WKWebView</td>
                  <td className="p-4 sm:p-5 text-red-400">Strictly Isolated</td>
                  <td className="p-4 sm:p-5">Logged Out (Web client)</td>
                  <td className="p-4 sm:p-5 text-right text-red-500 font-bold">85% Bounce</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">TikTok</td>
                  <td className="p-4 sm:p-5">Client WebKit Container</td>
                  <td className="p-4 sm:p-5 text-red-400">Strictly Isolated</td>
                  <td className="p-4 sm:p-5">Logged Out (Web client)</td>
                  <td className="p-4 sm:p-5 text-right text-red-500 font-bold">82% Bounce</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">Facebook Mobile</td>
                  <td className="p-4 sm:p-5">In-App WebView</td>
                  <td className="p-4 sm:p-5 text-amber-500">Shared Sandbox</td>
                  <td className="p-4 sm:p-5">Logged Out (Web client)</td>
                  <td className="p-4 sm:p-5 text-right text-amber-500 font-bold">78% Bounce</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-white uppercase">Linktery Redirect</td>
                  <td className="p-4 sm:p-5 text-emerald-400">Device Protocol Handover</td>
                  <td className="p-4 sm:p-5 text-emerald-400">Native Application</td>
                  <td className="p-4 sm:p-5 text-emerald-400">Session Restored</td>
                  <td className="p-4 sm:p-5 text-right text-emerald-400 font-bold">&lt; 5% Bounce</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* WebView Friction & Pain-Solution Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto z-10 relative border-t-2 border-slate-950">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Visual Comparison Box (Left) */}
          <div className="lg:col-span-6 border-2 border-slate-950 bg-slate-950 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
            <div className="bg-[#0b0f19] px-4 py-3 flex items-center justify-between border-b-2 border-slate-950">
              <span className="text-xs font-mono font-bold text-[#eab308]">mobile-browser-routing.log</span>
              <span className="text-[9px] font-mono text-slate-500">VISITOR JOURNEY DIAGRAM</span>
            </div>
            
            <div className="p-6 space-y-6 bg-[#0c0f17]/40 text-left">
              {/* Pain */}
              <div className="border-2 border-red-500/30 bg-red-950/10 p-4 rounded-none space-y-2">
                <span className="text-red-500 font-mono text-[10px] font-bold uppercase tracking-wider block">1. The Pain: In-App Browser Sandbox</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Follower clicks your bio link inside Instagram or TikTok ➡️ Loaded inside the sandboxed social webview ➡️ Browser cookies are blocked ➡️ User is logged out of YouTube/Spotify/Store accounts ➡️ High-friction login screen appears ➡️ **80%+ bounce rate.**
                </p>
              </div>

              {/* Solution */}
              <div className="border-2 border-emerald-500/30 bg-emerald-950/10 p-4 rounded-none space-y-2">
                <span className="text-emerald-500 font-mono text-[10px] font-bold uppercase tracking-wider block">2. The Solution: App-to-App Handover</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Linktery detects the incoming request ➡️ Performs an application protocol handshake ➡️ Bypasses the sandbox webview ➡️ Directs the phone OS to launch the target native app (YouTube, Spotify, etc.) directly ➡️ **Session restored with &lt;5% bounce rate.**
                </p>
              </div>
            </div>

            <div className="bg-[#0b0f19] p-3 text-center border-t-2 border-slate-950 font-mono text-[9px] text-slate-500 uppercase">
              How Linktery preserves conversion rates on mobile links
            </div>
          </div>

          {/* Non-Technical Explanatory Text (Right) */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left">
            <span className="text-[#eab308] font-mono text-xs uppercase tracking-wider font-bold">Conversion Science</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white uppercase leading-none">
              Bypassing the Social Media WebView Jail
            </h2>
            <div className="text-sm text-slate-400 space-y-4 leading-relaxed font-normal">
              <p>
                When you share links in your Instagram, TikTok, or YouTube bio, platforms restrict visitors from opening your website in their default system browser. Instead, they force them into a sandboxed in-app browser viewport.
              </p>
              <p>
                Because in-app browsers isolate cookies, your visitors are logged out of external subscriptions and checkouts. Having to manually re-type credit cards or Google login credentials on a mobile device leads to a massive loss of high-intent buyers.
              </p>
              <p>
                Linktery solves this friction by executing an automatic application protocol handover. We detect the visitor's device parameters on our servers and command the mobile operating system to open target conversion destinations directly inside their native, pre-logged applications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Biolink Terminology Glossary */}
      <section className="py-20 px-6 max-w-7xl mx-auto z-10 relative border-t-2 border-slate-950">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[#06b6d4] font-mono text-xs uppercase tracking-wider font-bold">Technical Vocabulary</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-2 uppercase">
            Biolink Platform Glossary
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed">
            Quick definitions of terms commonly used in conversion optimization and web targeting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <div className="bg-[#07090e] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <h4 className="text-sm font-black text-white uppercase">WebView (In-App Browser)</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              A sandboxed browser viewport rendered inside a mobile application (like Instagram or TikTok). WebViews restrict access to local system cookies, forcing users to manually re-login to external websites.
            </p>
          </div>
          <div className="bg-[#07090e] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <h4 className="text-sm font-black text-white uppercase">URI Scheme (Deep Linking)</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Custom application protocols (e.g. `tg://` or `youtube://`) that trigger mobile operating systems to directly launch installed applications instead of executing browser redirects.
            </p>
          </div>
          <div className="bg-[#07090e] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <h4 className="text-sm font-black text-white uppercase">CNAME Record</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              A type of DNS record that maps an alias subdomain (like `links.domain.com`) to a target domain name. CNAME records allow you to white-label Linktery on your private subdomains.
            </p>
          </div>
          <div className="bg-[#07090e] border-2 border-slate-950 p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <h4 className="text-sm font-black text-white uppercase">Redirection Latency</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              The time delta between clicking a link and the host server dispatching the redirect header. High latency increases page bounce rates, while serverless edge routing keeps it under 15ms.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 max-w-4xl mx-auto z-10 relative border-t-2 border-slate-950">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4 flex items-center justify-center gap-2 uppercase">
            <HelpCircle className="w-8 h-8 text-[#eab308]" /> FAQ & Profile Knowledge
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Essential answers regarding link-in-bio setups, custom themes, and traffic management.
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

      {/* CTA Footer Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="relative border-4 border-slate-950 bg-slate-950/80 p-8 sm:p-12 text-center overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-[#eab308] rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 relative z-10 uppercase tracking-tighter">
            Claim Your Social Biolink Handle
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Reserve your unique Linktery slug today. Customize themes, set up deep linking, and track detailed click conversions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10 max-w-md mx-auto">
            {user ? (
              <Link to="/dashboard" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black py-4 px-6 rounded-none border-2 border-slate-950 text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                Create My Free Page <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link to="/pricing" className="bg-slate-900 border-2 border-slate-950 hover:bg-slate-800 text-slate-300 font-bold py-4 px-6 rounded-none text-xs uppercase tracking-wider transition-colors flex items-center justify-center">
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
              <Sparkles className="w-5 h-5 text-[#eab308]" /> Configuration Ready!
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your custom Link-in-Bio profile theme and configuration have been prepared. Register your free account to publish it live under `linktery.com/{handle}`.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRegisterRedirect}
                className="w-full py-3.5 bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-black text-xs rounded-none border-2 border-slate-950 transition-colors flex items-center justify-center gap-1.5"
              >
                Claim Profile Handle <ExternalLink className="w-3.5 h-3.5" />
              </button>
              
              <button 
                onClick={handleModalClose}
                className="w-full py-3 border-2 border-slate-950 text-slate-400 font-bold text-xs rounded-none hover:bg-slate-900 hover:text-white transition-colors"
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
