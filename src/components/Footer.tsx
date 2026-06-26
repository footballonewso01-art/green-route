import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/50 py-16 px-6 relative z-10 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8 mb-12">
        {/* Column 1: Brand & Slogan (spans 3 columns on large screens) */}
        <div className="flex flex-col gap-4 text-left lg:col-span-3">
          <Link to="/" className="flex items-center gap-[11px] hover:opacity-80 transition-opacity w-fit">
            <img src="/logo.webp" alt="Linktery Logo" className="h-12 w-auto mix-blend-screen grayscale" />
            <span className="text-xl font-bold text-foreground/90 tracking-tight">Linktery</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Professional link-in-bio & smart traffic redirection engine. Optimize mobile social conversions and bypass sandboxed browser walls.
          </p>
        </div>

        {/* Column 4: Platform (aligned with the right margin of the layout, text centered) */}
        <div className="flex flex-col gap-3.5 text-center items-center">
          <h4 className="text-xs font-bold text-foreground tracking-wider uppercase">Platform</h4>
          <ul className="flex flex-col gap-2.5 items-center">
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
            <li>
              <Link to="/solutions" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Guides
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
