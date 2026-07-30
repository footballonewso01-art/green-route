import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AdminRoute } from "./components/AdminRoute";
import {
  isPrimaryWwwDomain,
  isRedirectAliasDomain,
  PRIMARY_DOMAIN,
} from "./lib/siteConfig";
import { isSystemRoute } from "./lib/systemRoutes";

import RedirectHandler from "./pages/RedirectHandler";

// Route-level chunks keep unrelated landing pages out of the initial download.
// The streaming SSR entry waits for these modules during prerendering.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const OnlyFansSolution = lazy(() => import("./pages/OnlyFansSolution"));
const TelegramSolution = lazy(() => import("./pages/TelegramSolution"));
const AffiliateSolution = lazy(() => import("./pages/AffiliateSolution"));
const BioLinkTool = lazy(() => import("./pages/BioLinkTool"));
const SmartRedirect = lazy(() => import("./pages/SmartRedirect"));
const DeeplinkGenerator = lazy(() => import("./pages/DeeplinkGenerator"));
const FitnessCoachSolution = lazy(() => import("./pages/FitnessCoachSolution"));
const YoutubeSmartLinks = lazy(() => import("./pages/YoutubeSmartLinks"));
const MusicSmartLinks = lazy(() => import("./pages/MusicSmartLinks"));
const DigitalProductsSolution = lazy(() => import("./pages/DigitalProductsSolution"));
const PodcastSmartLinks = lazy(() => import("./pages/PodcastSmartLinks"));
const ShopifySmartLinks = lazy(() => import("./pages/ShopifySmartLinks"));
const FanvueSmartLinks = lazy(() => import("./pages/FanvueSmartLinks"));
const GeoTargetedRedirect = lazy(() => import("./pages/GeoTargetedRedirect"));
const AmazonSmartLinks = lazy(() => import("./pages/AmazonSmartLinks"));
const UgcPortfolio = lazy(() => import("./pages/UgcPortfolio"));
const QrCodeBiolink = lazy(() => import("./pages/QrCodeBiolink"));
const ProfessionSolutions = lazy(() => import("./pages/ProfessionSolutions"));
const CompetitorComparison = lazy(() => import("./pages/CompetitorComparison"));
const CompetitorAlternative = lazy(() => import("./pages/CompetitorAlternative"));
const SolutionsIndex = lazy(() => import("./pages/SolutionsIndex"));
const AlternativesIndex = lazy(() => import("./pages/AlternativesIndex"));
const SeoContentPage = lazy(() => import("./pages/SeoContentPage"));
const UtmBuilder = lazy(() => import("./pages/UtmBuilder"));
const QrCodeGenerator = lazy(() => import("./pages/QrCodeGenerator"));

// Non-indexed, dynamic, or authenticated routes.
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ReferralCapture = lazy(() => import("./pages/ReferralCapture"));
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const LinksManager = lazy(() => import("./pages/LinksManager"));
const CreateLink = lazy(() => import("./pages/CreateLink"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DashboardProfile = lazy(() => import("./pages/DashboardProfile"));
const ProfileHub = lazy(() => import("./pages/ProfileHub"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const InterstitialPage = lazy(() => import("./pages/InterstitialPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BillingPage = lazy(() => import("./pages/Billing"));
const DashboardPricing = lazy(() => import("./pages/DashboardPricing"));
const PartnerOverview = lazy(() => import("./pages/PartnerOverview"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserProfile = lazy(() => import("./pages/admin/AdminUserProfile"));
const AdminLinks = lazy(() => import("./pages/admin/AdminLinks"));
const AdminPromocodes = lazy(() => import("./pages/admin/AdminPromocodes"));
const AdminPromocodeStats = lazy(() => import("./pages/admin/AdminPromocodeStats"));

const queryClient = new QueryClient();

// Scroll to top on navigation component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Redirects alternate domains to the main domain if they access system pages
function DomainGuard() {
  const location = useLocation();
  const isProductionBuild = import.meta.env.VITE_DEPLOY_ENV === "production";
  
  useEffect(() => {
    // Preview and local builds must stay on their own host. Production builds
    // enforce the canonical host for product/SEO routes on redirect aliases.
    if (!isProductionBuild) return;

    const hostname = window.location.hostname;
    const MAIN_DOMAIN = PRIMARY_DOMAIN;
    
    const mustUsePrimaryHost =
      isPrimaryWwwDomain(hostname) ||
      (isRedirectAliasDomain(hostname) && isSystemRoute(location.pathname));

    if (mustUsePrimaryHost) {
      window.location.replace(`https://${MAIN_DOMAIN}${location.pathname}${location.search}`);
    }
  }, [isProductionBuild, location.pathname, location.search]);

  return null;
}

function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-[0.03] mix-blend-overlay"></div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isValid, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative z-10">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/ref/:referralCode" element={<ReferralCapture />} />
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<TermsAndConditions />} />
    <Route path="/solutions/onlyfans-link-in-bio" element={<OnlyFansSolution />} />
    <Route path="/solutions/telegram-bio-link" element={<TelegramSolution />} />
    <Route path="/solutions/affiliate-smart-link-rotator" element={<AffiliateSolution />} />
    <Route path="/solutions/bio-link-tool" element={<BioLinkTool />} />
    <Route path="/solutions/smart-link-redirect" element={<SmartRedirect />} />
    <Route path="/solutions/deeplink-generator" element={<DeeplinkGenerator />} />
    <Route path="/solutions/link-in-bio-for-fitness-coaches" element={<FitnessCoachSolution />} />
    <Route path="/solutions/youtube-smart-links" element={<YoutubeSmartLinks />} />
    <Route path="/solutions/music-smart-links" element={<MusicSmartLinks />} />
    <Route path="/solutions/digital-product-smart-links" element={<DigitalProductsSolution />} />
    <Route path="/solutions/podcast-smart-links" element={<PodcastSmartLinks />} />
    <Route path="/solutions/shopify-smart-links" element={<ShopifySmartLinks />} />
    <Route path="/solutions/fanvue-ai-models" element={<FanvueSmartLinks />} />
    <Route path="/solutions/geo-targeted-redirect" element={<GeoTargetedRedirect />} />
    <Route path="/solutions/amazon-smart-links" element={<AmazonSmartLinks />} />
    <Route path="/solutions" element={<SolutionsIndex />} />
    <Route path="/alternatives" element={<AlternativesIndex />} />
    <Route path="/alternatives/:competitorSlug" element={<CompetitorAlternative />} />
    <Route path="/solutions/ugc-portfolio" element={<UgcPortfolio />} />
    <Route path="/solutions/qr-code-biolink" element={<QrCodeBiolink />} />
    <Route path="/solutions/:professionPath" element={<ProfessionSolutions />} />
    <Route path="/compare/:comparisonSlug" element={<CompetitorComparison />} />
    <Route path="/features" element={<Navigate to="/features/link-management" replace />} />
    <Route path="/features/:resourceSlug" element={<SeoContentPage />} />
    <Route path="/templates" element={<Navigate to="/templates/link-in-bio" replace />} />
    <Route path="/templates/:resourceSlug" element={<SeoContentPage />} />
    <Route path="/guides" element={<Navigate to="/guides/what-is-link-management" replace />} />
    <Route path="/guides/:resourceSlug" element={<SeoContentPage />} />
    <Route path="/tools" element={<Navigate to="/tools/utm-builder" replace />} />
    <Route path="/tools/utm-builder" element={<UtmBuilder />} />
    <Route path="/tools/qr-code-generator" element={<QrCodeGenerator />} />
    <Route path="/auth" element={<Navigate to="/login" replace />} />
    <Route path="/404" element={<NotFound />} />

    <Route path="/open-in-browser" element={<InterstitialPage />} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<DashboardHome />} />
      <Route path="links" element={<LinksManager />} />
      <Route path="links/create" element={<CreateLink />} />
      <Route path="links/edit/:id" element={<CreateLink />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="profile" element={<ProfileHub />} />
      <Route path="profile/:profileId" element={<DashboardProfile />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="pricing" element={<DashboardPricing />} />
      <Route path="partner" element={<PartnerOverview />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="help" element={<HelpCenter />} />
    </Route>

    <Route path="/admin" element={<AdminRoute />}>
      <Route index element={<Navigate to="/admin/overview" replace />} />
      <Route path="overview" element={<AdminOverview />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="users/:id" element={<AdminUserProfile />} />
      <Route path="links" element={<AdminLinks />} />
      <Route path="promocodes" element={<AdminPromocodes />} />
      <Route path="promocodes/:id" element={<AdminPromocodeStats />} />
    </Route>

    {/* Short Link Redirector - Catch all other usernames/slugs */}
    <Route path="/:username" element={<RedirectHandler />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export const AppContent = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ScrollToTop />
      <DomainGuard />
      <AmbientBackground />
      <AuthProvider>
        <Suspense fallback={
          <div className="min-h-screen bg-background flex items-center justify-center relative z-10">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AppContent />
  </BrowserRouter>
);

export default App;
