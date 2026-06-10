import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { 
  ArrowRight, BarChart3, Shield, Zap, Globe, 
  User as UserIcon, Check, X, ChevronDown, 
  Sparkles, Layers, ShieldAlert, HelpCircle, 
  ExternalLink, RefreshCw, Smartphone, Award,
  Download, Image, Printer, QrCode
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import { QRCodeSVG } from "qrcode.react";

interface FaqItem {
  question: string;
  answer: string;
}

export default function QrCodeBiolink() {
  const { user } = useAuth();
  
  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // QR Customizer States
  const [qrUrl, setQrUrl] = useState<string>("https://linktery.com/brand_name");
  const [qrColor, setQrColor] = useState<string>("#10b981"); // Emerald accent
  const [includeLogo, setIncludeLogo] = useState<boolean>(true);
  
  // Simulator States
  const [mockupType, setMockupType] = useState<"card" | "menu" | "window">("card");
  const [stars, setStars] = useState<{ id: number; top: string; left: string; size: number; delay: string; duration: string }[]>([]);

  // ROI Calculator States
  const [printVolume, setPrintVolume] = useState<number>(1000);
  const [printCost, setPrintCost] = useState<number>(0.25);
  const [scanRate, setScanRate] = useState<number>(4); // percentage 1% - 20%

  // Generate starry background on mount
  useEffect(() => {
    const generatedStars = Array.from({ length: 65 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 1.6 + 0.8,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 4 + 2}s`,
    }));
    setStars(generatedStars);
  }, []);

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  // Download SVG
  const downloadSVG = () => {
    const svgEl = document.getElementById("linktery-qr-code");
    if (!svgEl) return;
    const svgSerializer = new XMLSerializer();
    const svgString = svgSerializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "linktery-dynamic-qr.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Download PNG
  const downloadPNG = () => {
    const svgEl = document.getElementById("linktery-qr-code");
    if (!svgEl) return;
    const svgSerializer = new XMLSerializer();
    const svgString = svgSerializer.serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const img = window.document.createElement("img");
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx.fillStyle = "#ffffff"; // White background for optimal scan contrast
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 16, 16, 480, 480);
      const url = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "linktery-dynamic-qr.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
  };

  // ROI Calculations
  const calculateTotalCost = () => {
    return (printVolume * printCost).toFixed(2);
  };

  const calculateTotalScans = () => {
    return Math.round(printVolume * (scanRate / 100));
  };

  const calculateCPC = () => {
    const scans = calculateTotalScans();
    if (scans === 0) return "0.00";
    return ((printVolume * printCost) / scans).toFixed(2);
  };

  const faqItems: FaqItem[] = [
    {
      question: "What is the difference between a static and a dynamic QR code?",
      answer: "A static QR code encodes the destination URL directly into the pixel grid. If that URL changes or has a typo, the QR code is broken forever and all printed materials must be thrown away. A dynamic QR code encodes a short redirect link on Linktery. You can change the destination URL in your dashboard at any time instantly without reprinting your flyers, cards, or storefront window decals."
    },
    {
      question: "Are scan tracking analytics and location metrics included?",
      answer: "Yes, every dynamic QR scan is tracked in real-time. Linktery captures scan counts, Geolocation data (country & city), device operating systems, and referral campaign tags, helping you measure physical print campaign ROI."
    },
    {
      question: "Can I customize the look of the QR Code?",
      answer: "Absolutely. With our designer, you can choose custom color palettes, include rounded pixel layouts, and overlay brand logos (like Instagram, TikTok, or your company icon) in the center of the QR grid."
    },
    {
      question: "Do I get dynamic vector formats suitable for printing houses?",
      answer: "Yes. You can download the generated QR Code as an SVG vector file. SVGs can scale to any size (from a tiny business card corner to a massive billboard) without pixelation or scanning degradation."
    },
    {
      question: "Is there a limit to how many times my QR Code can be scanned?",
      answer: "No. Linktery does not rate-limit or paywall QR scan views. Even on our free Creator tier, your dynamic QR codes remain active with unlimited scans."
    }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Linktery Dynamic QR Code Generator",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.94",
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

  useSeo({
    ...SEO_PAGES.qrCodeBiolink,
    structuredData
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Starry Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white opacity-30 animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
              animationDuration: star.duration,
              boxShadow: star.size > 2 ? "0 0 5px rgba(255, 255, 255, 0.7)" : "none",
            }}
          />
        ))}
      </div>

      {/* Decorative Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-20 right-1/4 w-[450px] h-[450px] bg-accent rounded-full blur-[130px] mix-blend-screen animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute bottom-20 left-1/4 w-[380px] h-[380px] bg-emerald-500 rounded-full blur-[100px] mix-blend-screen" />
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
      <section className="relative pt-36 pb-16 px-6 overflow-hidden flex items-center justify-center min-h-[50vh]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent text-sm mb-6 font-semibold">
            <Printer className="w-4 h-4" />
            Print Media Dynamic Integration
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight uppercase">
            Dynamic QR Codes
            <br />
            <span className="gradient-text font-black">For Retail & Business Cards</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
            Generate dynamic vector QR codes. Link to your bio-link profile, track scan analytics in real-time, and update URLs without reprinting.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base inline-flex items-center justify-center gap-2">
                Create Free QR Account <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a href="#designer" className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-surface-hover transition-all duration-200 text-base inline-flex items-center justify-center">
              Try Live QR Designer
            </a>
          </div>
        </div>
      </section>

      {/* DYNAMIC QR CODE GENERATOR WORKSPACE */}
      <section id="designer" className="py-12 px-6 max-w-5xl mx-auto z-10 relative">
        <div className="glass-card p-6 md:p-8 border border-border bg-surface/30 backdrop-blur-md rounded-[32px] shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-border/60 pb-5 mb-8 gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest block font-mono">DOCK CONTROLLER</span>
              <h3 className="text-lg font-bold text-white uppercase">Live QR Customizer</h3>
            </div>
            
            {/* Mockup Type selectors */}
            <div className="flex flex-wrap gap-1 bg-background p-1 border border-border rounded-xl">
              {(["card", "menu", "window"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMockupType(type)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all uppercase ${
                    mockupType === type ? "bg-accent text-background font-black" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {type === "card" ? "Business Card" : type === "menu" ? "Table Tent" : "Store Window"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Column: Customizer inputs */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between space-y-6 text-left">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-b border-slate-900 pb-2">
                  <span>🛠️ CUSTOMIZER CONFIG</span>
                  <span className="text-accent">READY</span>
                </div>

                {/* Input 1: Destination link */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white uppercase font-mono">Dynamic Destination URL</label>
                  <input
                    type="text"
                    value={qrUrl}
                    onChange={(e) => setQrUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-accent font-mono"
                  />
                  <span className="text-[9px] text-slate-500 font-mono">Changes in your dashboard update this target instantly.</span>
                </div>

                {/* Input 2: Color selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white uppercase font-mono">QR Foreground Color</label>
                  <div className="flex gap-2">
                    {[
                      { hex: "#10b981", label: "Emerald" },
                      { hex: "#ffffff", label: "White" },
                      { hex: "#f59e0b", label: "Amber" },
                      { hex: "#ef4444", label: "Red" }
                    ].map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => setQrColor(col.hex)}
                        className={`flex-1 py-2 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                          qrColor === col.hex ? "bg-accent border-accent text-background" : "border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input 3: Logo Overlay toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl mt-2">
                  <span className="text-[10px] font-bold text-white uppercase font-mono">Center Brand Logo</span>
                  <button
                    onClick={() => setIncludeLogo(!includeLogo)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all ${includeLogo ? "bg-accent" : "bg-slate-800"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-background transition-all ${includeLogo ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>

              {/* Action downloads */}
              <div className="flex gap-3 pt-4 border-t border-slate-900">
                <button 
                  onClick={downloadPNG} 
                  className="flex-1 py-3 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download PNG
                </button>
                <button 
                  onClick={downloadSVG} 
                  className="flex-1 py-3 bg-accent text-background font-black rounded-xl text-xs hover:bg-white transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download SVG
                </button>
              </div>

            </div>

            {/* Right Column: Print Mockup Viewport */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              
              {/* Virtual Mockup Display Panel */}
              <div className="bg-slate-950 border border-slate-900 p-8 rounded-2xl flex-1 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                
                {/* Hidden real QR Code SVG we query for download */}
                <div className="hidden">
                  <QRCodeSVG
                    id="linktery-qr-code"
                    value={qrUrl}
                    size={256}
                    bgColor="#ffffff"
                    fgColor={qrColor}
                    level="H"
                    includeMargin={true}
                    imageSettings={includeLogo ? {
                      src: "/logo.webp",
                      x: undefined,
                      y: undefined,
                      height: 48,
                      width: 48,
                      excavate: true,
                    } : undefined}
                  />
                </div>

                {/* 1. Card Mockup */}
                {mockupType === "card" && (
                  <div className="w-[340px] h-[200px] bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden text-left animate-pulse">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-accent/5 rounded-full blur-2xl" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Alex Sterling</h4>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">Global Media Director</p>
                      </div>
                      
                      {/* Rendered custom QR code in frame */}
                      <div className="w-[84px] h-[84px] bg-white p-1 rounded-lg shadow-md shrink-0 flex items-center justify-center">
                        <QRCodeSVG
                          value={qrUrl}
                          size={76}
                          bgColor="#ffffff"
                          fgColor={qrColor}
                          level="H"
                          includeMargin={false}
                          imageSettings={includeLogo ? {
                            src: "/logo.webp",
                            x: undefined,
                            y: undefined,
                            height: 14,
                            width: 14,
                            excavate: true,
                          } : undefined}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-800/80 pt-3">
                      <span className="text-[9px] font-mono text-accent">sterling.media</span>
                      <span className="text-[8px] font-mono text-slate-500">Scan to Connect</span>
                    </div>
                  </div>
                )}

                {/* 2. Menu Mockup */}
                {mockupType === "menu" && (
                  <div className="w-[220px] h-[280px] bg-white border border-slate-300 rounded-t-lg p-5 shadow-2xl flex flex-col justify-between text-neutral-900 relative text-center">
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest font-mono">THE GREEN BISTRO</span>
                      <h4 className="text-xs font-black uppercase text-neutral-800">Scan For Menu</h4>
                    </div>
                    
                    {/* Rendered Custom QR */}
                    <div className="w-[110px] h-[110px] bg-white border border-slate-200 p-1.5 rounded-xl shadow-md mx-auto flex items-center justify-center">
                      <QRCodeSVG
                        value={qrUrl}
                        size={96}
                        bgColor="#ffffff"
                        fgColor={qrColor}
                        level="H"
                        includeMargin={false}
                        imageSettings={includeLogo ? {
                          src: "/logo.webp",
                          x: undefined,
                          y: undefined,
                          height: 18,
                          width: 18,
                          excavate: true,
                        } : undefined}
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[8px] text-neutral-500 font-mono">No physical touch required.</p>
                      <div className="w-10 h-1 bg-emerald-500 mx-auto rounded-full" />
                    </div>
                  </div>
                )}

                {/* 3. Decal Window Mockup */}
                {mockupType === "window" && (
                  <div className="w-[300px] h-[220px] bg-slate-900/40 border border-white/10 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-6 shadow-2xl">
                    {/* Mock glass reflections */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
                    
                    <div className="text-center space-y-4">
                      <span className="text-[9px] font-bold text-accent uppercase tracking-widest font-mono block">WE ARE CLOSED BUT OPEN</span>
                      <div className="flex items-center gap-6 justify-center">
                        <div className="text-left space-y-1 text-white">
                          <h4 className="text-xs font-bold uppercase">Shop Online</h4>
                          <p className="text-[8px] text-slate-300 leading-relaxed font-mono">Scan code to view our Instagram catalogs and active promo discounts.</p>
                        </div>
                        
                        <div className="w-[90px] h-[90px] bg-white p-1 rounded-xl shrink-0 flex items-center justify-center shadow-lg">
                          <QRCodeSVG
                            value={qrUrl}
                            size={82}
                            bgColor="#ffffff"
                            fgColor={qrColor}
                            level="H"
                            includeMargin={false}
                            imageSettings={includeLogo ? {
                              src: "/logo.webp",
                              x: undefined,
                              y: undefined,
                              height: 16,
                              width: 16,
                              excavate: true,
                            } : undefined}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="flex flex-col sm:flex-row gap-3 text-left">
                <div className="flex-1">
                  <span className="text-[9px] text-slate-500 font-mono block uppercase">Scan Destination Redirect</span>
                  <p className="text-xs text-white truncate font-mono mt-1">&gt; {qrUrl}</p>
                </div>
                <Link to="/register" className="btn-primary-glow text-xs !py-3 px-6 flex items-center justify-center gap-1 shrink-0">
                  Deploy Dynamic Portal <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* PRINT ROI CALCULATOR */}
      <section id="calculator" className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono block mb-2">Print Conversion</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3 uppercase">Print ROI Calculator</h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Calculate your dynamic scan rates and compare CPC with target online advertising budgets.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Controls Panel */}
          <div className="lg:col-span-7 bg-surface/20 border border-border p-6 md:p-8 rounded-[24px] space-y-6 text-left">
            <h3 className="text-lg font-bold text-white uppercase font-mono border-b border-border/60 pb-3">Campaign Scale</h3>
            
            {/* Slider 1: Print Volume */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-white">Number of Printed Copies</label>
                <span className="text-accent font-bold font-mono">{printVolume.toLocaleString()} units</span>
              </div>
              <input 
                type="range" 
                min="250" 
                max="25000" 
                step="250"
                value={printVolume}
                onChange={(e) => setPrintVolume(parseInt(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>250</span>
                <span>12,500</span>
                <span>25,000</span>
              </div>
            </div>

            {/* Slider 2: Cost per card */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-white">Printing Cost Per Item</label>
                <span className="text-accent font-bold font-mono">${printCost.toFixed(2)}</span>
              </div>
              <input 
                type="range" 
                min="0.05" 
                max="2.00" 
                step="0.05"
                value={printCost}
                onChange={(e) => setPrintCost(parseFloat(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>$0.05</span>
                <span>$1.00</span>
                <span>$2.00</span>
              </div>
            </div>

            {/* Slider 3: Scan Rate */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <label className="font-semibold text-white">Target Scan Conversion Rate</label>
                <span className="text-accent font-bold font-mono">{scanRate}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="20" 
                step="0.5"
                value={scanRate}
                onChange={(e) => setScanRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1% Scan Rate</span>
                <span>10%</span>
                <span>20% Scan Rate</span>
              </div>
            </div>

          </div>

          {/* Result Panel */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 to-slate-900 border border-border p-6 md:p-8 rounded-[24px] flex flex-col justify-between text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-6">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block mb-1">Cost Per Scan (CPC)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-white font-mono">${calculateCPC()}</span>
                  <span className="text-xs text-slate-400 font-mono">/ scan</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/60 font-mono text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Total Print Budget:</span>
                  <span className="text-white">${calculateTotalCost()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Total Scans:</span>
                  <span className="text-emerald-400 font-bold">{calculateTotalScans()} scans</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Scan Rate:</span>
                  <span className="text-accent font-bold">{scanRate}%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 mt-2 text-[10px] text-slate-400">
                <span className="font-bold text-white uppercase block">Campaign Advice</span>
                <p>• Placing call-to-actions (e.g. "Scan to get 15% off menu") boosts scan rates past 8%.</p>
                <p>• Dynamic QR codes allow you to edit URLs in real-time, protecting this investment from print typos.</p>
              </div>
            </div>

            <div className="mt-8">
              <Link to="/register" className="btn-primary-glow w-full !py-3.5 text-xs flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> Save ROI Pitch & Register
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* STATIC VS DYNAMIC DANGER GRID */}
      <section className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Problem Block */}
          <div className="lg:col-span-5 flex flex-col justify-between p-8 rounded-3xl border border-red-950/60 bg-red-950/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl animate-pulse" />
            <div className="space-y-6">
              <div>
                <span className="text-red-400 text-xs font-bold uppercase tracking-widest font-mono block mb-2">The Static Danger</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">The Reprinting Expense</h3>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                Using traditional, static QR generators binds the code directly to a hardcoded URL. If that URL breaks or changes, your prints are useless.
              </p>

              <div className="space-y-4 pt-4 border-t border-red-950/40">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">1</div>
                  <p className="text-xs text-slate-300"><strong className="text-white">Typos on Print:</strong> A single wrong letter in your URL printed on 5,000 cards makes them completely unscannable.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">2</div>
                  <p className="text-xs text-slate-300"><strong className="text-white">No Link Updates:</strong> If you move your menu from `menu.com` to `domain.com/menu`, you must throw away and reprint all banners.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 font-bold text-xs">3</div>
                  <p className="text-xs text-slate-300"><strong className="text-white">Zero Analytics:</strong> Static codes bypass tracking databases. You will never know how many people scanned your storefront.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-red-950/40 flex items-center gap-2 text-xs text-red-400 font-mono">
              <ShieldAlert className="w-4 h-4" /> Result: Wasted print budget, high friction, and unmeasurable offline campaigns.
            </div>
          </div>

          {/* Solution Block */}
          <div className="lg:col-span-7 flex flex-col justify-between p-8 rounded-3xl border border-emerald-500/20 bg-emerald-950/5 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl animate-pulse" />
            <div className="space-y-6">
              <div>
                <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono block mb-2">Our Solution</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">The Dynamic Portal Control</h3>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                Linktery maps your physical QR codes to a trackable dynamic redirect alias. All printed media remains permanent while destination targets update in seconds.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-emerald-950/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <QrCode className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Dynamic Destination Routing</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Update links dynamically in your dashboard. Repoint your retail menu or promo code link in 5 seconds.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Scan Geolocation Tracker</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Track every scan. Log user device types, country, city, and active time-stamps.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">White-label Domain Styling</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Set custom domains (e.g. `qr.mybrand.com`) to hide Linktery naming, presenting a fully white-labeled URL.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Smart Geolocation Routing</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Redirect scans dynamically based on language or device OS. Open dynamic iOS App Store or Play Store links from one QR code.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-emerald-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <span className="text-xs text-slate-400 font-mono">Secure print investments with dynamic routing.</span>
              <Link to="/register" className="text-xs font-bold text-accent hover:text-white inline-flex items-center gap-1 transition-colors uppercase font-mono">
                Get started for free <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON MATRIX */}
      <section className="py-16 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/40">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">Comparison Matrix</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-2 mb-3">Feature Comparison</h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Compare dynamic tracking features across different QR generation systems.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface/50 backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/80 text-muted-foreground text-xs md:text-sm font-bold tracking-wider uppercase font-mono">
                <th className="p-4 md:p-6">Feature Details</th>
                <th className="p-4 md:p-6 text-accent">Linktery</th>
                <th className="p-4 md:p-6">Traditional QR Tools</th>
                <th className="p-4 md:p-6">Linktree QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs md:text-sm text-foreground/90 font-mono">
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Dynamic Destination Repointing</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Change targets anytime)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Hardcoded target links)</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Biolink destination only)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Vector SVG Formats (DPI Safe)</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Unlimited scaling vector files)</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Paywalled vector downloads</td>
                <td className="p-4 md:p-6 text-red-500">❌ Only PNG/JPG raster files</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Custom Domain mapping (White Label)</td>
                <td className="p-4 md:p-6 text-green-400">✅ Yes (Use your domain alias)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Uses generic domain redirect)</td>
                <td className="p-4 md:p-6 text-red-500">❌ No (Strictly links to Linktree)</td>
              </tr>
              <tr className="hover:bg-surface-hover/40 transition-colors">
                <td className="p-4 md:p-6 font-semibold text-white font-sans">Location & OS Analytics</td>
                <td className="p-4 md:p-6 text-green-400">✅ Included (Real-time tracking)</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ High premium monthly limits</td>
                <td className="p-4 md:p-6 text-amber-500">⚠️ Basic clicks only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 px-6 max-w-4xl mx-auto border-t border-border/40 z-10 relative">
        <div className="text-center mb-12">
          <span className="text-accent text-xs font-bold uppercase tracking-widest font-mono">Q&A</span>
          <h2 className="text-3xl font-extrabold text-white mt-1 uppercase">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div 
              key={index}
              className="border border-border/60 bg-surface/20 rounded-2xl overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className="w-full py-5 px-6 flex justify-between items-center text-left text-white font-semibold hover:bg-surface/30 transition-colors gap-4"
              >
                <span className="text-sm md:text-base">{item.question}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${openFaqIndex === index ? "rotate-180" : ""}`} />
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  openFaqIndex === index ? "max-h-[300px] border-t border-border/40" : "max-h-0"
                }`}
              >
                <div className="p-6 text-sm text-slate-300 leading-relaxed bg-surface-hover/20">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Block */}
      <section className="py-20 px-6 max-w-5xl mx-auto relative z-10 border-t border-border/50">
        <div className="relative glass-card p-8 md:p-12 rounded-3xl overflow-hidden border border-accent/20 bg-gradient-to-tr from-accent/10 via-background to-background text-center shadow-glow animate-pulse">
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-accent rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 relative z-10">
            Secure Your Print Campaigns
          </h2>
          <p className="text-base md:text-lg text-slate-300 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Stop worrying about link typos. Generate dynamic codes, customize center logos, and redirect printed assets instantly with Linktery today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            {user ? (
              <Link to="/dashboard" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link to="/register" className="btn-primary-glow text-base px-8 py-4 inline-flex items-center justify-center gap-2">
                Create Free QR Code <ArrowRight className="w-5 h-5" />
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
