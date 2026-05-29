import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, Shield, Zap, Globe, 
  User as UserIcon, Check, ChevronDown, 
  Sparkles, Layers, HelpCircle,
  ShieldCheck, Send, MessageSquare, ExternalLink,
  Smartphone, Eye, MousePointerClick, CheckSquare,
  Terminal, Code2, AlertTriangle, Cpu, ArrowDownRight,
  TrendingUp, Lock, RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";

interface FaqItem {
  question: string;
  answer: string;
}

export default function TelegramSolution() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Call the SEO hook with the registered configuration
  useSeo(SEO_PAGES.telegramSolution);

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // WebView Simulator State
  const [simMode, setSimMode] = useState<"webview" | "linktery">("webview");

  // Terminal Simulator State
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isTerminalRunning, setIsTerminalRunning] = useState<boolean>(false);
  const [selectedChannel, setSelectedChannel] = useState<string>("crypto_alpha_signals");
  const [simulationTrigger, setSimulationTrigger] = useState<number>(0);

  // Demo Input State
  const [tgUrl, setTgUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  useEffect(() => {
    setIsTerminalRunning(true);
    setTerminalLogs([]);

    const logs = [
      `[sys] Initializing Linktery Redirection Handover Protocol v2.4.1...`,
      `[sys] Binding request listener for endpoint: /solutions/telegram-bio-link`,
      `[conn] Incoming connection from IP 185.220.101.4...`,
      `[ua] Request Header User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 324.0.0.32.109`,
      `[detect] Sandbox webview detected (Instagram In-App client).`,
      `[detect] Device: iPhone (iOS). Native application Telegram Messenger is available via 'tg://' URI scheme.`,
      `[dns] Domain check: custom link mapped to secure CNAME go.linktery.com`,
      `[action] Bypassing Webview container constraints...`,
      `[protocol] Dispatching App-to-App deep link: tg://resolve?domain=${selectedChannel}`,
      `[redirect] Executing protocol handover... 100% session cookies preserved.`,
      `[sys] Request completed in 14ms. Conversion state: SUCCESS (User logged in natively).`
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setTerminalLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setIsTerminalRunning(false);
      }
    }, 250);

    return () => {
      clearInterval(interval);
      setIsTerminalRunning(false);
    };
  }, [selectedChannel, simulationTrigger]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgUrl.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowRegisterModal(true);
    }, 1100);
  };

  const handleModalClose = () => {
    setShowRegisterModal(false);
  };

  const handleRegisterRedirect = () => {
    const encodedUrl = encodeURIComponent(tgUrl);
    navigate(`/register?ref=telegram-bio&url=${encodedUrl}`);
  };

  const getAvatarUrl = () => {
    if (user?.avatar) {
      return pb.files.getUrl(user, user.avatar, { thumb: '100x100' });
    }
    return null;
  };

  const faqItems: FaqItem[] = [
    {
      question: "Why do standard t.me links result in massive drop-offs on Instagram and TikTok?",
      answer: "When a user clicks a standard t.me link inside social applications (Instagram, TikTok, Facebook), the host platform opens the link in an in-app WebView. Because this WebView does not share local cookies, active sessions, or credentials with the system browser or the installed Telegram app, the user appears logged out on the Web client. They are forced to enter their phone number and confirmation code. 80% to 85% of users abandon the flow at this point."
    },
    {
      question: "What is an App-to-App redirection protocol and how does it work?",
      answer: "App-to-App routing utilizes mobile OS URI schemes. When Linktery detects that a click originates from a mobile social application, it bypasses rendering a standard web page. Instead, it dispatches a header instruction triggering the native operating system's protocol handler, such as 'tg://resolve?domain=name' for Telegram. The phone immediately launches the pre-installed native Telegram app directly to your profile, bypassing web logins entirely."
    },
    {
      question: "Can Linktery protect my custom domains from being blacklisted by social networks?",
      answer: "Yes. Social media algorithms scan external links for suspicious redirection loops. Linktery routes traffic through clean, optimized static landing paths and analyzes incoming user agents. Crawlers and platform validation bots are presented with a static, fully compliant informational page, while real human visitors are redirected natively. This keeps your custom domains safe and maintains high domain authority."
    },
    {
      question: "Does using deep linking affect my traffic analytics?",
      answer: "On the contrary, it improves your analytics. Standard WebView drop-offs make it impossible to track who actually made it to your Telegram channel. Linktery logs the click at the edge level before launching the app, capturing device OS, geographic location, referring platform, and custom UTM parameters, giving you a precise conversion funnel."
    },
    {
      question: "Do I need technical skills or code access to set this up?",
      answer: "No. Linktery abstracts the deep-linking architecture into a simple web dashboard. You just paste your Telegram channel, group, or bot link, map your custom subdomain via CNAME (e.g., join.yourbrand.com), and the platform automatically manages the browser-agent detection and deep-link routing on our global edge network."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f0f2f5] font-sans antialiased relative overflow-hidden">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 z-0 pointer-events-none" />

      {/* Glow Rings (Strictly Cyan/Blue and Emerald/Green) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-[#0088cc]/30 to-emerald-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-[800px] left-[-200px] w-[500px] h-[500px] bg-[#0088cc]/10 rounded-full blur-[140px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#1e293b]/70 bg-[#07090e]/85 backdrop-blur-md">
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
                <div className="w-8 h-8 rounded-md border border-[#1e293b] p-0.5 overflow-hidden group-hover:border-[#0088cc] transition-colors">
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
                <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Login</Link>
                <Link to="/register" className="bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold py-2.5 px-4 rounded transition-all duration-150">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Typographic Stack (No Split Screen) */}
      <section className="relative pt-36 pb-20 px-6 z-10 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-[#0088cc]/30 bg-[#0088cc]/5 text-[#33b3ff] text-[11px] font-mono uppercase tracking-wider mb-8">
          <Cpu className="w-3.5 h-3.5" /> Mobile Deep-Linking Specification
        </div>
        
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-4xl mx-auto leading-[1.1]">
          Bypass In-App Browser Jails.<br />
          <span className="bg-gradient-to-r from-[#33b3ff] via-[#0088cc] to-emerald-400 bg-clip-text text-transparent">
            Convert 80% More Telegram Traffic.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop losing mobile followers to sandboxed WebViews. Linktery uses device-native deep linking protocols to trigger the native Telegram app instantly. Keep user sessions active and maximize your CTR.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <a href="#simulator" className="bg-white hover:bg-slate-100 text-slate-950 font-bold py-3.5 px-6 rounded-md text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5">
            Test Redirection Simulator <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#terminal" className="bg-slate-900/60 hover:bg-slate-900 border border-[#1e293b] text-white font-bold py-3.5 px-6 rounded-md text-sm transition-all flex items-center justify-center">
            View Protocol Code
          </a>
        </div>
      </section>

      {/* Interactive "WebView Jail Simulator" Section */}
      <section id="simulator" className="py-20 px-6 border-y border-[#1e293b]/70 bg-[#07090e]/40 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
              Visualizing the WebView Sandbox Jail
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Standard URLs open inside locked social media browsers. Linktery routes requests through system protocol handovers. Click the modes below to compare user journeys.
            </p>

            <div className="mt-8 inline-flex p-1 bg-slate-950 border border-[#1e293b] rounded-md">
              <button 
                onClick={() => setSimMode("webview")}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded transition-all duration-200 ${simMode === "webview" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "text-slate-400 hover:text-white"}`}
              >
                Standard Link (In-App WebView)
              </button>
              <button 
                onClick={() => setSimMode("linktery")}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded transition-all duration-200 ${simMode === "linktery" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "text-slate-400 hover:text-white"}`}
              >
                Linktery Redirection
              </button>
            </div>
          </div>

          {/* Simulator Screen Mockup */}
          <div className="max-w-md mx-auto bg-slate-950 border border-[#1e293b] rounded-3xl p-3 shadow-2xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1e293b] text-slate-400 px-3 py-0.5 rounded-full text-[10px] font-mono border border-slate-700/50">
              iPhone 15 Pro Mockup
            </div>

            <div className="bg-[#0b0f19] rounded-2xl overflow-hidden border border-[#1e293b] min-h-[500px] flex flex-col justify-between relative">
              {/* Phone Status Bar */}
              <div className="bg-slate-950 px-4 py-2 flex justify-between items-center text-[10px] text-slate-500 font-mono border-b border-[#1e293b]/50">
                <span>9:41 AM</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>5G</span>
                </div>
              </div>

              {simMode === "webview" ? (
                /* WEBVIEW JAIL CONTENT */
                <div className="flex-1 flex flex-col justify-between p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-[#1e293b]">
                      <Lock className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-[11px] text-slate-400 font-mono overflow-hidden text-ellipsis whitespace-nowrap">Instagram In-App Browser (Sandboxed)</span>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded border border-red-500/20 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto text-red-400">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Join Channel t.me/my_channel</h4>
                      <p className="text-xs text-slate-400 leading-normal">
                        To view this channel, you must log in to Telegram Web.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="h-8 bg-slate-900 border border-[#1e293b] rounded px-2 text-[10px] text-slate-500 flex items-center">
                        Phone Number
                      </div>
                      <div className="h-8 bg-slate-900 border border-[#1e293b] rounded px-2 text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Password / Code</span>
                      </div>
                      <button disabled className="w-full h-9 bg-slate-800 text-slate-500 text-xs font-bold rounded cursor-not-allowed">
                        Log In & Join
                      </button>
                    </div>
                  </div>

                  <div className="bg-red-500/5 border border-red-500/10 p-3 rounded text-center">
                    <span className="text-[10px] font-bold text-red-400 block uppercase tracking-wider">Friction Trap</span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      Users don't recall their Telegram passwords inside third-party webviews. 80%+ drop-off.
                    </p>
                  </div>
                </div>
              ) : (
                /* LINKTERY SUCCESS CONTENT */
                <div className="flex-1 flex flex-col justify-between p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-[#1e293b]">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] text-slate-400 font-mono">Linktery Redirection Routing</span>
                    </div>

                    <div className="bg-[#0088cc]/10 p-4 rounded border border-[#0088cc]/20 text-center space-y-3 relative overflow-hidden">
                      <div className="absolute top-1 right-1">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#0088cc]/20 flex items-center justify-center mx-auto text-[#33b3ff]">
                        <Send className="w-5 h-5 translate-x-[-1px] translate-y-[1px]" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Opening Telegram Messenger...</h4>
                      <p className="text-xs text-slate-400 leading-normal">
                        Bypassing sandbox container constraints. launching native client.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded border border-[#1e293b] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">C</div>
                          <span className="text-xs font-bold text-white">Crypto Alpha Signals</span>
                        </div>
                        <span className="text-[9px] text-[#33b3ff] bg-[#0088cc]/10 px-1.5 py-0.5 rounded font-mono">CHANNEL</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Verified daily trading setups, on-chain analytics, and market alpha metrics.
                      </p>
                      <button className="w-full h-8.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow-md shadow-[#0088cc]/20">
                        <Send className="w-3 h-3" /> JOIN CHANNEL
                      </button>
                    </div>
                  </div>

                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded text-center">
                    <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">Zero Friction Flow</span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                      App-to-App link launches native client immediately. Native credentials preserved.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Developer Protocol Blueprint Section (Terminal + Code Interface) */}
      <section id="terminal" className="py-20 px-6 max-w-7xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Side: Technical Wiki Article (E-E-A-T) */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[11px] font-mono uppercase tracking-wider w-fit">
              <Cpu className="w-3.5 h-3.5" /> Technical Specification
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Understanding Custom URI Protocol Resolution
            </h2>
            <div className="text-sm sm:text-base text-slate-400 space-y-4 leading-relaxed font-normal">
              <p>
                Mobile operating systems use registered **URI schemes** to establish communications between applications. Standard browser calls use `http://` or `https://` which redirect requests to web servers.
              </p>
              <p>
                Native mobile applications register unique protocols with the OS Kernel (e.g., `tg://` for Telegram, `whatsapp://` for WhatsApp). When these URIs are triggered, the OS intercepts the request and handles it inside the matching native application wrapper instead of the default browser viewport.
              </p>
              <p>
                Linktery's routing engine acts as a dynamic broker. It intercepts the client, determines the OS environment (iOS, Android, macOS, Windows), checks if the host browser is a sandboxed WebView, and serves a specialized payload executing the URI scheme redirection.
              </p>
            </div>
          </div>

          {/* Right Side: Code Block & Simulated Terminal Console */}
          <div className="lg:col-span-7 flex flex-col justify-between border border-[#1e293b] bg-slate-950/70 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl">
            {/* Terminal Window Header */}
            <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#33b3ff]" />
                <span className="text-xs font-mono font-bold text-slate-300">linktery-redirection-engine.ts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#0088cc]" />
              </div>
            </div>

            {/* Code Body */}
            <div className="p-5 font-mono text-[11px] sm:text-xs text-slate-300 overflow-x-auto bg-slate-950/40 border-b border-[#1e293b]/70">
              <span className="text-slate-500">// Bypasses host client sandboxes using OS protocols</span><br />
              <span className="text-[#33b3ff]">export function</span> <span className="text-amber-300">executeProtocolHandover</span>(userAgent: <span className="text-[#33b3ff]">string</span>, path: <span className="text-[#33b3ff]">string</span>) &#123;<br />
              &nbsp;&nbsp;<span className="text-[#33b3ff]">const</span> device = <span className="text-amber-300">detectMobileOS</span>(userAgent);<br />
              &nbsp;&nbsp;<span className="text-[#33b3ff]">const</span> isWebView = <span className="text-amber-300">checkIsSandboxed</span>(userAgent);<br /><br />
              &nbsp;&nbsp;<span className="text-slate-500">// If mobile client inside webview jail, trigger App-to-App</span><br />
              &nbsp;&nbsp;<span className="text-[#33b3ff]">if</span> (isWebView && (device === <span className="text-emerald-400">"iOS"</span> || device === <span className="text-emerald-400">"Android"</span>)) &#123;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;window.location.replace(<span className="text-emerald-400">`tg://resolve?domain=$&#123;path&#125;`</span>);<br /><br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500">// Fallback to Web client if Telegram is not installed</span><br />
              &nbsp;&nbsp;&nbsp;&nbsp;setTimeout(() =&gt; &#123;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;window.location.replace(<span className="text-emerald-400">`https://t.me/$&#123;path&#125;`</span>);<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&#125;, <span className="text-amber-300">450</span>);<br />
              &nbsp;&nbsp;&#125; <span className="text-[#33b3ff]">else</span> &#123;<br />
              &nbsp;&nbsp;&nbsp;&nbsp;window.location.replace(<span className="text-emerald-400">`https://t.me/$&#123;path&#125;`</span>);<br />
              &nbsp;&nbsp;&#125;<br />
              &#125;
            </div>

            {/* Console Log Outputs */}
            <div className="bg-slate-950 p-5 font-mono text-[11px] text-slate-400 space-y-1.5 flex-1 min-h-[160px] flex flex-col justify-end">
              <div className="border-b border-[#1e293b] pb-2 mb-2 flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold">
                <span>Console Log Monitor</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> active
                </span>
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[120px]">
                {terminalLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    <span className="text-[#33b3ff]">$</span> {log}
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-[#1e293b]/70">
                <select 
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="bg-slate-900 border border-[#1e293b] text-slate-300 text-xs rounded px-2 py-1 outline-none focus:border-[#0088cc]"
                >
                  <option value="crypto_alpha_signals">tg/crypto_alpha_signals</option>
                  <option value="marketing_insider_bot">tg/marketing_insider_bot</option>
                  <option value="private_vip_lounge">tg/private_vip_lounge</option>
                </select>
                
                <button 
                  onClick={() => setSimulationTrigger(prev => prev + 1)}
                  disabled={isTerminalRunning}
                  className="bg-[#0088cc] hover:bg-[#0077b5] text-white text-[11px] font-bold px-3 py-1 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isTerminalRunning ? "animate-spin" : ""}`} /> Simulate Call
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator Funnel Strategies Section */}
      <section className="py-20 px-6 border-t border-[#1e293b]/70 bg-[#07090e]/40 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#33b3ff] font-mono text-xs uppercase tracking-wider">Conversion Blueprints</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mt-2">
              High-Converting Telegram Funnel Architectures
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-3 leading-relaxed">
              Redirecting clicks is just step one. Learn how expert creators set up target pipelines to maximize customer lifetime value.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Strategy 1 */}
            <div className="bg-slate-950 border border-[#1e293b] p-6 rounded-lg flex flex-col justify-between hover:border-[#0088cc]/50 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded bg-[#0088cc]/10 border border-[#0088cc]/20 flex items-center justify-center text-[#33b3ff]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">1. Automated Lead Magnet Bot</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Offer a high-value resource (e.g. trading guide, PDF checklist) in your social bio. Linktery triggers your Telegram Bot natively. The bot auto-delivers the resource and tags the user, starting an automated newsletter.
                </p>
              </div>
              <div className="border-t border-[#1e293b] pt-4 mt-6 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Estimated conversion</span>
                <span className="text-emerald-400 font-bold">+78% subscription rate</span>
              </div>
            </div>

            {/* Strategy 2 */}
            <div className="bg-slate-950 border border-[#1e293b] p-6 rounded-lg flex flex-col justify-between hover:border-[#0088cc]/50 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">2. Private VIP Signals Channel</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Direct users from TikTok Reels or Instagram stories to a closed premium channel. Bypassing the WebView ensures they see the "Request to Join" button inside their native app, which matches their authentic logged-in profile.
                </p>
              </div>
              <div className="border-t border-[#1e293b] pt-4 mt-6 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>User drop-off rate</span>
                <span className="text-emerald-400 font-bold">&lt; 5% total bounce</span>
              </div>
            </div>

            {/* Strategy 3 */}
            <div className="bg-slate-950 border border-[#1e293b] p-6 rounded-lg flex flex-col justify-between hover:border-[#0088cc]/50 transition-colors">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded bg-[#0088cc]/10 border border-[#0088cc]/20 flex items-center justify-center text-[#33b3ff]">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">3. Direct Consultation DM Link</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Sell services, custom coaching, or sponsorships. Linktery routes the user straight to a chat window with your username, pre-populating a custom text message (e.g. "I'm interested in booking a session").
                </p>
              </div>
              <div className="border-t border-[#1e293b] pt-4 mt-6 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Redirection delay</span>
                <span className="text-emerald-400 font-bold">&lt; 15ms routing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Biolink Redirection Generator Tool */}
      <section className="py-20 px-6 max-w-xl mx-auto z-10 relative">
        <div className="bg-slate-950 border border-[#1e293b] p-6 sm:p-8 rounded-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Send className="w-24 h-24 text-[#0088cc]" />
          </div>
          
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#33b3ff]" /> Redirection Optimizer Tool
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-normal">
            Paste your standard Telegram link below to test the optimized App-to-App conversion flow.
          </p>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="relative">
              <input 
                type="text"
                value={tgUrl}
                onChange={(e) => setTgUrl(e.target.value)}
                placeholder="https://t.me/your_channel_name"
                className="w-full bg-slate-900 border border-[#1e293b] focus:border-[#0088cc] focus:ring-1 focus:ring-[#0088cc] rounded px-4 py-3.5 text-xs outline-none transition-all pr-12 text-white placeholder:text-slate-500"
                disabled={isGenerating}
              />
              <div className="absolute right-3.5 top-3.5 flex items-center">
                <Send className="w-4 h-4 text-slate-500" />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isGenerating || !tgUrl.trim()}
              className="w-full py-3.5 rounded bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs transition-all shadow-md shadow-[#0088cc]/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating optimized path...
                </>
              ) : (
                <>
                  Generate & Test Link <ArrowRight className="w-4 h-4" />
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
            <HelpCircle className="w-8 h-8 text-[#33b3ff]" /> FAQ & Redirection Knowledge
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Essential facts about WebView constraints, user retention, and native redirection.
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
                    openFaqIndex === index ? "rotate-180 text-[#33b3ff]" : ""
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
        <div className="relative border border-[#0088cc]/20 bg-slate-950/80 rounded-xl p-8 sm:p-12 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="w-[300px] h-[300px] bg-[#0088cc] rounded-full blur-[80px] -top-10 -left-10 absolute" />
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4 relative z-10">
            Optimize Your Telegram Biolinks Today
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mb-8 relative z-10 leading-relaxed">
            Deploy CNAME subdomains, bypass host sandboxes, and analyze traffic metrics with Linktery.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10 max-w-md mx-auto">
            {user ? (
              <Link to="/dashboard" className="bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold py-3.5 px-6 rounded text-xs transition-colors flex items-center justify-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/register" className="bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold py-3.5 px-6 rounded text-xs transition-colors flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link to="/pricing" className="bg-slate-900 border border-[#1e293b] hover:bg-slate-800 text-slate-300 font-bold py-3.5 px-6 rounded text-xs transition-colors flex items-center justify-center">
              View Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e293b]/70 py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.webp" alt="Linktery Logo" className="h-10 w-auto mix-blend-screen grayscale" />
            <span className="text-md font-bold text-slate-400">Linktery</span>
          </Link>
          <div className="flex flex-wrap justify-center items-center gap-6">
            <Link to="/privacy" className="text-xs text-slate-500 hover:text-[#33b3ff] transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-slate-500 hover:text-[#33b3ff] transition-colors">Terms & Conditions</Link>
            <p className="text-xs text-slate-600">© 2026 Linktery. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Option B: Modal Popup requesting registration */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border border-[#0088cc]/30 p-6 sm:p-8 rounded-xl relative shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#33b3ff]" /> Redirection Ready!
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Your Telegram redirect link has been optimized. To save this configuration, map CNAME subdomains, and track click metrics, register a free account.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleRegisterRedirect}
                className="w-full py-3 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5"
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
