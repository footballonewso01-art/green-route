import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, AlertTriangle, HelpCircle,
  ShieldCheck, Smartphone, ExternalLink, RefreshCw, Eye,
  TrendingUp, Users, Lock, Play, Pause, Compass, MapPin, DollarSign
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

interface TestimonialItem {
  name: string;
  role: string;
  company: string;
  flag: string;
  country: string;
  quote: string;
  metrics: string;
}

export default function GeoTargetedRedirect() {
  const { user } = useAuth();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Geo Simulator State
  const [selectedCountry, setSelectedCountry] = useState<"us" | "de" | "jp" | "br">("us");
  const [diagnosticState, setDiagnosticState] = useState<"idle" | "resolving" | "resolved">("idle");
  const [pingMs, setPingMs] = useState<number>(0);

  const countries = {
    us: {
      name: "United States",
      ip: "104.16.243.12",
      targetUrl: "https://shop.linktery.com/us-en",
      currency: "USD ($)",
      language: "English",
      coords: { x: "25%", y: "35%" }
    },
    de: {
      name: "Germany (Europe)",
      ip: "82.165.132.88",
      targetUrl: "https://shop.linktery.com/eu-de",
      currency: "EUR (€)",
      language: "German (Deutsch)",
      coords: { x: "50%", y: "30%" }
    },
    jp: {
      name: "Japan (Asia)",
      ip: "210.140.10.34",
      targetUrl: "https://shop.linktery.com/jp-ja",
      currency: "JPY (¥)",
      language: "Japanese (日本語)",
      coords: { x: "80%", y: "40%" }
    },
    br: {
      name: "Brazil (South America)",
      ip: "177.100.20.15",
      targetUrl: "https://shop.linktery.com/sa-pt",
      currency: "BRL (R$)",
      language: "Portuguese (Português)",
      coords: { x: "38%", y: "75%" }
    }
  };

  const triggerDiagnostic = (countryKey: "us" | "de" | "jp" | "br") => {
    setSelectedCountry(countryKey);
    setDiagnosticState("resolving");
    setPingMs(Math.round(Math.random() * 45 + 5));

    setTimeout(() => {
      setDiagnosticState("resolved");
    }, 900);
  };

  // Helper to get avatar URL
  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  // Generated Testimonials
  const testimonials: TestimonialItem[] = [
    {
      name: "Sarah Jenkins",
      role: "Global Marketing Director",
      company: "Aura Apparel Group",
      flag: "🇺🇸",
      country: "United States",
      quote: "We were losing thousands of European and Asian visitors by sending them all to our US Shopify store. With Linktery's country routing rules, we automatically detect and route clicks to localized checkouts. Our international sales conversion rate spiked by 42% in under a month.",
      metrics: "+42% International Revenue"
    },
    {
      name: "Hiroshi Tanaka",
      role: "E-commerce Lead",
      company: "Kuro Tech Gear",
      flag: "🇯🇵",
      country: "Japan",
      quote: "Managing separate landing pages for Japan, North America, and Europe used to require complex script adjustments. Linktery handles everything natively. A single link in our global Instagram bio automatically redirects users with localized currencies. Absolute game changer.",
      metrics: "3.2x ROI on Campaign Spend"
    },
    {
      name: "Max Hoffmann",
      role: "Founder",
      company: "Berlin Craft Roasters",
      flag: "🇩🇪",
      country: "Germany",
      quote: "Linktery lets us automatically serve English to non-German speakers in Europe and direct local Germans to our German checkout. The redirection latency is practically non-existent, ensuring zero bounce rate increase.",
      metrics: "-18% Checkout Bounce Rate"
    },
    {
      name: "Camila Silva",
      role: "Digital Campaign Manager",
      company: "Moda Brasil",
      flag: "🇧🇷",
      country: "Brazil",
      quote: "Most redirect rotators fail in South America due to outdated IP databases. Linktery's location detection is incredibly accurate. We track all UTMs by country, allowing us to allocate budget to high-performing regions instantly.",
      metrics: "99.8% Geo-IP Accuracy"
    }
  ];

  const faqItems: FaqItem[] = [
    {
      question: "How does Linktery determine the visitor's country location?",
      answer: "Linktery utilizes a ultra-fast, global Geo-IP database distributed across edge server networks. When a user clicks your link, our edge servers analyze their request IP address and resolve their exact country, region, and city in less than 15 milliseconds, before the redirection handshake begins."
    },
    {
      question: "Can I target traffic based on browser language settings instead of location?",
      answer: "Yes. You can configure routing rules based on the user's browser language settings (e.g. Accept-Language header) or country location, or combine both rules (e.g. redirecting Spanish speakers in the United States to a Spanish checkout page)."
    },
    {
      question: "What happens if a user is using a VPN?",
      answer: "If a user is using a VPN, Linktery resolves their location to the VPN exit node country. However, you can configure a default fallback redirection destination (e.g., your primary global store) to capture any unresolved or edge-case traffic."
    },
    {
      question: "Is this compatible with Shopify Markets and subfolders?",
      answer: "Absolutely. Linktery is fully compatible with Shopify Markets, WooCommerce, custom subdirectories (like shop.com/es-es), and subdomain setups. You simply specify the destination URL rule for each country."
    },
    {
      question: "Can I set up A/B split testing inside country targeting rules?",
      answer: "Yes. Linktery allows you to nest traffic rotators inside geo-targeting rules. For example, you can target US visitors and split-test 50% to Offer A and 50% to Offer B, while sending German visitors directly to your European store."
    }
  ];

  // Dynamic JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Geo-Targeting Smart Redirect",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "iOS, Android, Web",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.92",
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

  useSeo({
    ...SEO_PAGES.geoTargetedRedirect,
    structuredData
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-20 left-1/4 w-[450px] h-[450px] bg-accent rounded-full blur-[130px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-[380px] h-[380px] bg-emerald-500 rounded-full blur-[110px] mix-blend-screen" />
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

      {/* HERO SECTION WITH ASYMMETRIC HEADER */}
      <section className="relative pt-32 pb-8 px-6 max-w-7xl mx-auto z-10 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm font-semibold">
          <Compass className="w-3.5 h-3.5 animate-pulse" />
          Location & Language Traffic Localization
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-white max-w-5xl mx-auto uppercase">
          ROUTE GLOBAL VISITORS
          <br />
          <span className="gradient-text">TO LOCAL PAGES</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
          Stop losing global buyers by sending them to default checkouts. Route click traffic automatically based on visitor country or language.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          {user ? (
            <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
              Open Routing Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2 px-8 py-3.5">
              Create Smart Target Link <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <a href="#testimonials" className="px-6 py-3.5 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
            View Success Stories
          </a>
        </div>
      </section>

      {/* INTERACTIVE GEOLOCATION MAP ROUTER MOCKUP */}
      <section className="py-12 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-border/60 pb-5 mb-8 gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block font-mono">EDGE NETWORK SIMULATOR</span>
              <h3 className="text-lg font-bold text-white uppercase">Geo-IP Redirect Engine</h3>
            </div>
            
            {/* Country Selector Tabs */}
            <div className="flex flex-wrap gap-1 bg-background p-1 border border-border rounded-xl">
              {(Object.keys(countries) as Array<keyof typeof countries>).map((key) => (
                <button
                  key={key}
                  onClick={() => triggerDiagnostic(key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${
                    selectedCountry === key ? "bg-accent text-background font-black" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: World map SVG grid (7 columns) */}
            <div className="lg:col-span-7 flex justify-center relative">
              <div className="relative w-full max-w-[480px] aspect-[16/10] bg-slate-950/80 border border-slate-900 rounded-2xl p-4 overflow-hidden flex items-center justify-center">
                
                {/* Simplified Vector Map outlines */}
                <svg className="w-full h-full opacity-15" viewBox="0 0 1000 600" fill="currentColor">
                  {/* North America */}
                  <path d="M150 150 L200 130 L280 150 L300 220 L250 280 L180 250 Z" />
                  {/* South America */}
                  <path d="M280 340 L340 360 L380 430 L350 520 L300 480 L270 410 Z" />
                  {/* Eurasia */}
                  <path d="M450 150 L550 130 L650 120 L800 140 L880 200 L820 280 L700 290 L520 250 Z" />
                  {/* Africa */}
                  <path d="M480 290 L560 300 L610 380 L580 470 L520 440 L470 360 Z" />
                  {/* Australia */}
                  <path d="M780 420 L860 410 L890 480 L820 500 Z" />
                </svg>

                {/* Country Node Points */}
                {Object.entries(countries).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => triggerDiagnostic(key as "us" | "de" | "jp" | "br")}
                    className="absolute group active:scale-90 transition-transform"
                    style={{ left: item.coords.x, top: item.coords.y }}
                  >
                    <span className={`absolute -inset-2.5 rounded-full ${selectedCountry === key ? "bg-accent/30 animate-ping" : "bg-transparent group-hover:bg-slate-800/30"}`} />
                    <span className={`w-3.5 h-3.5 rounded-full border-2 block ${selectedCountry === key ? "bg-accent border-slate-950 scale-125" : "bg-slate-800 border-slate-700"}`} />
                  </button>
                ))}

                {/* Simulated Ping audit line from selector to target */}
                {diagnosticState === "resolving" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

              </div>
            </div>

            {/* Right Column: Log Diagnostics Card (5 columns) */}
            <div className="lg:col-span-5 text-left">
              <div className="bg-slate-950 border border-slate-850 p-5 rounded-2xl h-[260px] flex flex-col justify-between font-mono relative overflow-hidden">
                <div className="flex justify-between items-center text-[8px] text-slate-500 border-b border-slate-900 pb-2">
                  <span>🛰️ EDGE GEOLOCATION ENGINE</span>
                  <span>SSL v3.1</span>
                </div>

                <div className="flex-1 text-[10px] py-4 space-y-1.5 overflow-y-auto leading-relaxed">
                  <p className="text-slate-400">&gt; Visitor IP Lookup initiated...</p>
                  <p className="text-slate-400">&gt; Client IP: <span className="text-white">{countries[selectedCountry].ip}</span></p>
                  <p className="text-slate-400">&gt; Location Detected: <span className="text-accent">{countries[selectedCountry].name}</span></p>
                  
                  {diagnosticState === "resolving" && (
                    <p className="text-yellow-400 animate-pulse">&gt; Calculating optimal target routing path...</p>
                  )}

                  {diagnosticState === "resolved" && (
                    <>
                      <p className="text-emerald-400">&gt; Edge Latency: {pingMs}ms (optimal)</p>
                      <p className="text-emerald-400">&gt; Detected Language: {countries[selectedCountry].language}</p>
                      <p className="text-emerald-400">&gt; Target Redirect: {countries[selectedCountry].targetUrl}</p>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-900 pt-2 text-center text-[10px] uppercase font-bold text-emerald-400">
                  {diagnosticState === "resolved" ? (
                    <span className="flex items-center justify-center gap-1.5 animate-pulse">
                      <ShieldCheck className="w-3.5 h-3.5" /> Routed to {countries[selectedCountry].currency} Checkout
                    </span>
                  ) : diagnosticState === "resolving" ? (
                    <span className="text-yellow-400 animate-pulse">Resolving IP rules...</span>
                  ) : (
                    <span className="text-slate-500">Awaiting Click Diagnostic...</span>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* THE LOCALIZATION FRICTION NARRATIVE */}
      <section className="py-20 px-6 max-w-5xl mx-auto z-10 relative border-t border-border/40">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">The Localization Friction</span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mt-2 uppercase">
            Why Generic Links
            <br />
            <span className="gradient-text font-black">Kill Global Sales</span>
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed">
            Sending every international click to a single global destination creates severe purchase frictions. Here is how localization barriers affect real shoppers and how Linktery resolves them in milliseconds.
          </p>
        </div>

        <div className="space-y-16">
          {/* Barrier 1: Left-aligned */}
          <div className="ml-0 mr-auto max-w-2xl relative group">
            <div className="absolute -left-6 top-0 bottom-0 w-[2px] bg-accent/30 group-hover:bg-accent transition-colors" />
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono">Friction #1: Language Barrier</span>
              <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Lost in translation</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Meet <strong className="text-white">Anna from Munich</strong>. She clicks an Instagram bio link to buy a custom tech gadget. The landing page is entirely in English. Unsure about technical specifications, regional warranty details, or return policies written in a foreign language, she hesitates and exits.
              </p>
              
              {/* Linktery Edge Action Console */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between items-center text-[9px] text-slate-600 border-b border-slate-900 pb-1.5 mb-2">
                  <span>⚡ LINKTERY EDGE INTERCEPT</span>
                  <span>LATENCY: 12ms</span>
                </div>
                <p>&gt; Request Header Accept-Language: <span className="text-white">de-DE, de;q=0.9</span></p>
                <p>&gt; Match Rule: BrowserLanguage contains "de"</p>
                <p>&gt; Action: <span className="text-accent">Redirect (302) -&gt; shop.com/de-de</span></p>
                <p className="text-emerald-400 font-bold mt-1">&gt;&gt; Anna sees native copy & completes checkout.</p>
              </div>
            </div>
          </div>

          {/* Barrier 2: Right-aligned */}
          <div className="ml-auto mr-0 max-w-2xl relative group text-right">
            <div className="absolute -right-6 top-0 bottom-0 w-[2px] bg-accent/30 group-hover:bg-accent transition-colors" />
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono">Friction #2: Currency Hesitation</span>
              <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">The exchange rate guessing game</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Meet <strong className="text-white">Taro from Tokyo</strong>. He lands on a checkout page showing a price tag of <strong className="text-white">$79 USD</strong>. He has no idea what the exact JPY conversion rate is today and fears hidden international bank transfer fees. He abandons his cart to search for local Japanese alternatives.
              </p>

              {/* Linktery Edge Action Console */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-400 space-y-1 text-left">
                <div className="flex justify-between items-center text-[9px] text-slate-600 border-b border-slate-900 pb-1.5 mb-2">
                  <span>⚡ LINKTERY EDGE INTERCEPT</span>
                  <span>LATENCY: 14ms</span>
                </div>
                <p>&gt; Request IP: <span className="text-white">210.140.10.34 (Tokyo, JP)</span></p>
                <p>&gt; Match Rule: GeoCountry equals "JP"</p>
                <p>&gt; Action: <span className="text-accent">Redirect (302) -&gt; shop.com?currency=JPY</span></p>
                <p className="text-emerald-400 font-bold mt-1">&gt;&gt; Taro pays in Yen (¥) with zero checkout friction.</p>
              </div>
            </div>
          </div>

          {/* Barrier 3: Centered */}
          <div className="mx-auto max-w-2xl relative group text-center">
            <div className="absolute left-1/2 -bottom-4 transform -translate-x-1/2 w-12 h-[2px] bg-accent/30 group-hover:bg-accent transition-colors" />
            <div className="space-y-4 pb-6">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider font-mono">Friction #3: Shipping Blockades</span>
              <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight">Heartbreak at checkout</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Meet <strong className="text-white">Camila from São Paulo</strong>. She spends 20 minutes finding items on a store, enters her email, only to see the error message at checkout: <em className="text-red-400">"We do not ship to Brazil."</em> Frustrated by the wasted time, she vows never to return to the brand.
              </p>

              {/* Linktery Edge Action Console */}
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[11px] text-slate-400 space-y-1 text-left">
                <div className="flex justify-between items-center text-[9px] text-slate-600 border-b border-slate-900 pb-1.5 mb-2">
                  <span>⚡ LINKTERY EDGE INTERCEPT</span>
                  <span>LATENCY: 15ms</span>
                </div>
                <p>&gt; Request IP: <span className="text-white">177.100.20.15 (São Paulo, BR)</span></p>
                <p>&gt; Match Rule: GeoCountry in "South America" / No direct shipping</p>
                <p>&gt; Action: <span className="text-accent">Redirect (302) -&gt; global.store.com/br-partner</span></p>
                <p className="text-emerald-400 font-bold mt-1">&gt;&gt; Camila gets routed to regional distribution partner store.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USER REVIEWS FEATURE GRID (Generated Testimonials) */}
      <section id="testimonials" className="py-16 px-6 max-w-6xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">GLOBAL SUCCESS STORIES</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-1">What Global Brands Say</h2>
          <p className="text-sm text-muted-foreground mt-2">
            See how international store owners and marketers recovered sales with dynamic link localization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((item, index) => (
            <div 
              key={index}
              className="glass-card p-6 md:p-8 border border-border/80 bg-surface/30 backdrop-blur-md rounded-3xl relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.flag}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-tight">{item.name}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono">{item.role}, {item.company}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-accent bg-accent/10 border border-accent/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {item.metrics}
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed italic">
                  "{item.quote}"
                </p>
              </div>
              <div className="border-t border-border/40 pt-4 mt-6 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>Country: {item.country}</span>
                <span>Verified Client ✅</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORM CAPABILITY MATRIX */}
      <section className="py-12 px-6 max-w-6xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">PLATFORM METRICS</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">REDIRECTION SPECS</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Compare location-based targeting capabilities with static link rotators and simple bio-link builders.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase font-mono">
                <th className="p-4 md:p-6">Localization Features</th>
                <th className="p-4 md:p-6 text-accent">Linktery Smart Link</th>
                <th className="p-4 md:p-6">Linktree/Beacons</th>
                <th className="p-4 md:p-6">Traditional Shorteners</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90 font-medium">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">IP-Based Country Redirection</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Resolves at Cloudflare edge)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Single link destination)</td>
                <td className="p-4 md:p-6 text-yellow-500">⚠️ Limited country filters</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Browser Language Auto-Detection</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Checks locale headers)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No</td>
                <td className="p-4 md:p-6 text-red-500">❌ No</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Attribution Tracking by Region</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Logs UTMs by country/city)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Total count only)</td>
                <td className="p-4 md:p-6 text-yellow-500">⚠️ Global stats only</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white">Fallback Default Target Setup</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Catches VPN/Edge traffic)</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes</td>
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
            Everything you need to know about setting up smart checkouts and country-based redirection rules.
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
            Localize Your Click Traffic
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Create smart URL redirects, activate native geo-targeting rules, and double checkouts from your bio links.
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
