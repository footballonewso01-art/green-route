import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/50 py-16 px-6 relative z-10 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8 mb-12">
        <div className="flex flex-col gap-4 text-left">
          <Link to="/" className="flex items-center gap-[11px] hover:opacity-80 transition-opacity w-fit">
            <img src="/logo.webp" alt="Linktery Logo" className="h-12 w-auto mix-blend-screen grayscale" />
            <span className="text-xl font-bold text-foreground/90 tracking-tight">Linktery</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            Professional link-in-bio & smart traffic redirection engine. Optimize mobile social conversions and bypass sandboxed browser walls.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <h4 className="text-xs font-bold text-foreground tracking-wider uppercase">Product</h4>
          <ul className="flex flex-col gap-2.5">
            <li><Link to="/features/url-shortener" className="text-sm text-muted-foreground hover:text-accent transition-colors">URL Shortener</Link></li>
            <li><Link to="/features/link-management" className="text-sm text-muted-foreground hover:text-accent transition-colors">Link Management</Link></li>
            <li><Link to="/features/link-analytics" className="text-sm text-muted-foreground hover:text-accent transition-colors">Link Analytics</Link></li>
            <li><Link to="/features/custom-domains" className="text-sm text-muted-foreground hover:text-accent transition-colors">Custom Domains</Link></li>
          </ul>
        </div>

        <div className="flex flex-col gap-3.5">
          <h4 className="text-xs font-bold text-foreground tracking-wider uppercase">Resources</h4>
          <ul className="flex flex-col gap-2.5">
            <li><Link to="/templates/link-in-bio" className="text-sm text-muted-foreground hover:text-accent transition-colors">Profile Templates</Link></li>
            <li><Link to="/tools/utm-builder" className="text-sm text-muted-foreground hover:text-accent transition-colors">UTM Builder</Link></li>
            <li><Link to="/tools/qr-code-generator" className="text-sm text-muted-foreground hover:text-accent transition-colors">QR Generator</Link></li>
            <li><Link to="/guides/what-is-link-management" className="text-sm text-muted-foreground hover:text-accent transition-colors">Link Management Guide</Link></li>
          </ul>
        </div>

        <div className="flex flex-col gap-3.5">
          <h4 className="text-xs font-bold text-foreground tracking-wider uppercase">Platform</h4>
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
            <li>
              <Link to="/solutions" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Solutions
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
      </div>
    </footer>
  );
}
