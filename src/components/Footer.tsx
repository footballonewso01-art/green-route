import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/50 py-16 px-6 relative z-10 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8 mb-12">
        {/* Left Column: Brand & Slogan */}
        <div className="flex flex-col gap-4 text-left">
          <Link to="/" className="flex items-center gap-[11px] hover:opacity-80 transition-opacity w-fit">
            <img src="/logo.webp" alt="Linktery Logo" className="h-12 w-auto mix-blend-screen grayscale" />
            <span className="text-xl font-bold text-foreground/90 tracking-tight">Linktery</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Professional link-in-bio & smart traffic redirection engine. Optimize mobile social conversions and bypass sandboxed browser walls.
          </p>
        </div>

        {/* Column 2: Solutions Index */}
        <div className="flex flex-col gap-3.5 text-left">
          <Link to="/solutions" className="text-xs font-bold text-foreground tracking-widest uppercase font-mono hover:text-accent transition-colors w-fit">
            Solutions
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Bypass webview jails. Explore our index of link routing, deep-linking, rotators, and custom solutions for creators and e-commerce.
          </p>
          <Link to="/solutions" className="text-xs text-accent font-semibold hover:underline flex items-center gap-1 mt-1 font-mono uppercase">
            Browse Solutions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Column 3: Alternatives Index */}
        <div className="flex flex-col gap-3.5 text-left">
          <Link to="/alternatives" className="text-xs font-bold text-foreground tracking-widest uppercase font-mono hover:text-accent transition-colors w-fit">
            Alternatives
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Compare 14 biolink platforms side-by-side. Analyze pricing, platform watermarks, and transaction commission fees.
          </p>
          <Link to="/alternatives" className="text-xs text-accent font-semibold hover:underline flex items-center gap-1 mt-1 font-mono uppercase">
            Compare Platforms <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Column 4: Platform */}
        <div className="flex flex-col gap-3.5 text-left">
          <h4 className="text-xs font-bold text-foreground tracking-widest uppercase font-mono">Platform</h4>
          <ul className="flex flex-col gap-2.5">
            <li>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Pricing Plans
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="max-w-7xl mx-auto border-t border-border/40 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">
          © 2026 Linktery. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground">
          Engineered for edge routing conversions.
        </p>
      </div>
    </footer>
  );
}
