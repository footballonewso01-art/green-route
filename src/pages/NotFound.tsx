import { useEffect } from "react";
import { ArrowRight, ArrowUpRight, Compass, FileText, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import MarketingHeader from "@/components/MarketingHeader";
import { useSeo } from "@/hooks/useSeo";
import styles from "./NotFound.module.css";
import "@/styles/landing-rebrand.css";

const NotFound = () => {
  const location = useLocation();

  useSeo({
    title: "Page Not Found | Linktery",
    description: "This Linktery page could not be found. Return home or continue to product features and documentation.",
    canonical: "/404",
    noIndex: true,
  });

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className={styles.page} data-not-found>
      <MarketingHeader current="system" />
      <main>
        <div className={styles.container}>
          <section className={styles.message} aria-labelledby="not-found-title">
            <p>Page not found</p>
            <h1 id="not-found-title">404</h1>
            <h2>This address doesn’t lead anywhere.</h2>
            <p>The page may have moved, or the address may be incomplete. Start again from a known part of Linktery.</p>
            <Link to="/" className={styles.primary}>Return home<ArrowRight size={17} aria-hidden="true" /></Link>
          </section>

          <aside className={styles.routes} aria-label="Useful destinations">
            <div className={styles.routeTop}><span>Choose a route</span><Compass size={21} strokeWidth={1.7} aria-hidden="true" /></div>
            <Link to="/"><Home size={18} aria-hidden="true" /><span><strong>Home</strong><small>The main Linktery landing page</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link to="/features"><Compass size={18} aria-hidden="true" /><span><strong>Features</strong><small>Profiles, links, routing, and analytics</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
            <Link to="/documentation"><FileText size={18} aria-hidden="true" /><span><strong>Documentation</strong><small>API setup and endpoint reference</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
