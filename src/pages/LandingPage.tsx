import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Play, Route, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { type PlanType } from "@/lib/plans";
import { trackGrowthEvent } from "@/lib/telemetry";
import { useSeo } from "@/hooks/useSeo";
import { SEO_PAGES } from "@/lib/seo-config";
import Footer from "@/components/Footer";
import MarketingHeader from "@/components/MarketingHeader";
import LandingSocialProof from "@/components/landing/LandingSocialProof";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingTestimonials from "@/components/landing/LandingTestimonials";
import LandingPricing from "@/components/landing/LandingPricing";
import HeroAnalyticsPreview from "@/components/landing/HeroAnalyticsPreview";
import { reserveStarterProfile } from "@/lib/profileOnboarding";
import classicCoverPhone from "@/assets/mobila-classic-cover.webp";
import heroCreatorPortrait from "@/assets/hero-creator-portrait.webp";
import "@/styles/landing-rebrand.css";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usernameInput, setUsernameInput] = useState("");
  const [slugReservationLoading, setSlugReservationLoading] = useState(false);
  const [slugReservationError, setSlugReservationError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useSeo(SEO_PAGES.home);

  const showUser = mounted && !!user;
  const userPlan = (user as { plan?: PlanType })?.plan;

  return (
    <div className="min-h-screen bg-background relative overflow-x-clip">
      <MarketingHeader current="home" />

      <main>
        <section className="landing-rebrand landing-hero" data-linktery-hero>
          <div className="landing-hero__grid">
            <div className="landing-hero__copy landing-fade-up">
              <p className="landing-hero__eyebrow">Links that understand traffic</p>

              <h1 className="landing-hero__headline">
                <span className="landing-hero__headline-line">Make every</span>
                <span className="landing-hero__headline-row">
                  <span className="landing-hero__portrait-pill" aria-hidden="true">
                    <img src={heroCreatorPortrait} alt="" width="116" height="61" decoding="async" />
                  </span>
                  <span>link work</span>
                </span>
                <span className="landing-hero__headline-row">
                  <span>harder.</span>
                  <a className="landing-hero__how" href="#features">
                    <Play aria-hidden="true" size={16} fill="currentColor" />
                    See how
                  </a>
                </span>
              </h1>

              <p className="landing-hero__lede">
                Smart links and Link-in-Bio profiles with routing, analytics, custom domains, and API access — in one workspace.
              </p>

              <div className="landing-hero__actions">
                {showUser ? (
                  <Link to="/dashboard" className="landing-hero__dashboard">
                    Open dashboard <ArrowUpRight aria-hidden="true" size={16} />
                  </Link>
                ) : (
                  <form
                    data-landing-slug-form
                    data-auth-visibility="guest"
                    className="landing-slug-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const slug = usernameInput.trim().toLowerCase();
                      if (!slug || slugReservationLoading) return;
                      setSlugReservationError("");
                      setSlugReservationLoading(true);
                      trackGrowthEvent("landing_cta_clicked", { surface: "hero_profile_slug" });
                      try {
                        await reserveStarterProfile(slug);
                        navigate(`/register?profile=${encodeURIComponent(slug)}`);
                      } catch (error) {
                        setSlugReservationError(error instanceof Error ? error.message : "We couldn't reserve this address.");
                        setSlugReservationLoading(false);
                      }
                    }}
                  >
                    <label className="landing-slug-form__field">
                      <span className="landing-slug-form__prefix" aria-hidden="true">
                        linktery.com/
                      </span>
                      <span className="sr-only">Choose your Public Profile address</span>
                      <input
                        className="landing-slug-form__input"
                        type="text"
                        aria-label="Choose your Public Profile address"
                        value={usernameInput}
                        onChange={(event) => {
                          setSlugReservationError("");
                          setUsernameInput(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64));
                        }}
                        maxLength={64}
                        placeholder="yourname"
                        autoComplete="off"
                      />
                    </label>
                    <button className="landing-slug-form__submit" type="submit" disabled={slugReservationLoading}>
                      {slugReservationLoading ? "Reserving…" : "Start free"}
                      {!slugReservationLoading && <ArrowUpRight aria-hidden="true" size={16} />}
                    </button>
                  </form>
                )}

                <p
                  role={slugReservationError ? "alert" : undefined}
                  aria-live="polite"
                  className={slugReservationError ? "landing-hero__error" : "landing-hero__error landing-hero__error--empty"}
                >
                  {slugReservationError || "No reservation error"}
                </p>

                <a className="landing-hero__secondary" href="#features">
                  Explore the platform <ArrowRight aria-hidden="true" size={16} />
                </a>
              </div>

              <div className="landing-hero__assurances" aria-label="Signup benefits">
                <span><i aria-hidden="true" />Free forever</span>
                <span><i aria-hidden="true" />No credit card</span>
                <span><i aria-hidden="true" />Profile reserved at signup</span>
              </div>

              <div className="landing-hero__bottom">
                <p className="landing-hero__bottom-copy">
                  Built for
                </p>
                <div className="landing-capability-bar" aria-label="Who Linktery is built for">
                  <span>Creators</span>
                  <span>Coaches</span>
                  <span>Marketers</span>
                  <span>Online businesses</span>
                </div>
              </div>
            </div>

            <div className="landing-proof-grid landing-fade-up landing-fade-up--late" data-hero-media-grid>
              <article className="landing-proof-card landing-proof-card--profile" data-video-slot="profile-story">
                <div className="landing-proof-card__top">
                  <span className="landing-proof-card__tag">Link-in-Bio</span>
                  <Link className="landing-proof-card__link" to="/templates" aria-label="Explore Linktery profile templates">
                    <ArrowUpRight aria-hidden="true" size={20} />
                  </Link>
                </div>
                <div className="landing-proof-card__copy">
                  <h2 className="landing-proof-card__title">Your profile becomes the destination.</h2>
                  <p className="landing-proof-card__description">Bring content, offers, and every important link into one branded page.</p>
                </div>
                <img
                  className="landing-proof-card__phone"
                  src={classicCoverPhone}
                  alt="Linktery Classic Cover profile for creator Nora Lane"
                  width="941"
                  height="1672"
                  loading="eager"
                  decoding="async"
                />
              </article>

              <article className="landing-proof-card landing-proof-card--routing" data-video-slot="routing">
                <div className="landing-proof-card__top">
                  <span className="landing-proof-card__tag">Smart routing</span>
                  <a className="landing-proof-card__link" href="#features" aria-label="Learn about Linktery smart routing">
                    <ArrowUpRight aria-hidden="true" size={20} />
                  </a>
                </div>
                <div className="landing-route-map" aria-hidden="true">
                  <span className="landing-route-map__node"><Route size={20} /></span>
                  <span className="landing-route-map__track" />
                  <span className="landing-route-map__node"><Smartphone size={20} /></span>
                </div>
                <div className="landing-proof-card__copy">
                  <h2 className="landing-proof-card__title">Right visitor. Right destination.</h2>
                </div>
              </article>

              <article className="landing-proof-card landing-proof-card--analytics" data-video-slot="analytics">
                <div className="landing-proof-card__top">
                  <span className="landing-proof-card__tag">Analytics</span>
                  <Link className="landing-proof-card__link" to="/login" aria-label="Open Linktery analytics">
                    <ArrowUpRight aria-hidden="true" size={20} />
                  </Link>
                </div>
                <div className="landing-proof-card__copy">
                  <h2 className="landing-proof-card__title">Know what converts.</h2>
                </div>
                <HeroAnalyticsPreview />
              </article>
            </div>
          </div>
        </section>

      <LandingSocialProof />

      {/* Features */}
      <LandingFeatures />

      <LandingTestimonials />

      <LandingPricing authenticated={showUser} currentPlan={userPlan} />
      </main>

      {/* Footer */}
      <Footer variant="landing" />
    </div>
  );
}
