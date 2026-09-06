import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AdminRoute } from "./components/AdminRoute";
import { AppLoadingScreen } from "./components/AppLoadingScreen";
import {
  isCustomPublicHostname,
  isPrimaryWwwDomain,
  isRedirectAliasDomain,
  PRIMARY_DOMAIN,
} from "./lib/siteConfig";
import { isSystemRoute } from "./lib/systemRoutes";

import RedirectHandler from "./pages/RedirectHandler";

// Route-level chunks keep unrelated landing pages out of the initial download.
// The streaming SSR entry waits for these modules during prerendering.
const LandingPage = lazy(() => import("./pages/LandingPage"));
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const SolutionDetailPage = lazy(() => import("./pages/SolutionDetailPage"));
const CompetitorComparison = lazy(() => import("./pages/CompetitorComparison"));
const CompetitorAlternative = lazy(() => import("./pages/CompetitorAlternative"));
const SolutionsIndex = lazy(() => import("./pages/SolutionsIndex"));
const AlternativesIndex = lazy(() => import("./pages/AlternativesIndex"));
const SeoContentPage = lazy(() => import("./pages/SeoContentPage"));
const SeoHubPage = lazy(() => import("./pages/SeoHubPage"));
const UtmBuilder = lazy(() => import("./pages/UtmBuilder"));
const QrCodeGenerator = lazy(() => import("./pages/QrCodeGenerator"));

// Non-indexed, dynamic, or authenticated routes.
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ReferralCapture = lazy(() => import("./pages/ReferralCapture"));
const CampaignRedirect = lazy(() => import("./pages/CampaignRedirect"));
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
const CustomDomainRoot = lazy(() => import("./pages/CustomDomainRoot"));
const BillingPage = lazy(() => import("./pages/Billing"));
const DashboardPricing = lazy(() => import("./pages/DashboardPricing"));
const PartnerOverview = lazy(() => import("./pages/PartnerOverview"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserProfile = lazy(() => import("./pages/admin/AdminUserProfile"));
const AdminLinks = lazy(() => import("./pages/admin/AdminLinks"));
const AdminPromocodes = lazy(() => import("./pages/admin/AdminPromocodes"));
const AdminPromocodeStats = lazy(() => import("./pages/admin/AdminPromocodeStats"));
const AdminCampaigns = lazy(() => import("./pages/admin/AdminCampaigns"));
const AdminCampaignDetails = lazy(() => import("./pages/admin/AdminCampaignDetails"));

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
    return <AppLoadingScreen />;
  }

  if (!user || !isValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const RootRoute = () => typeof window !== "undefined" && isCustomPublicHostname(window.location.hostname)
  ? <CustomDomainRoot />
  : <LandingPage />;

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<RootRoute />} />
    <Route path="/documentation" element={<DocumentationPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/ref/:referralCode" element={<ReferralCapture />} />
    <Route path="/go/:trackingSlug" element={<CampaignRedirect />} />
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/terms" element={<TermsAndConditions />} />
    <Route path="/solutions" element={<SolutionsIndex />} />
    <Route path="/alternatives" element={<AlternativesIndex />} />
    <Route path="/alternatives/:competitorSlug" element={<CompetitorAlternative />} />
    <Route path="/solutions/:solutionPath" element={<SolutionDetailPage />} />
    <Route path="/compare/:comparisonSlug" element={<CompetitorComparison />} />
    <Route path="/features" element={<SeoHubPage kind="feature" />} />
    <Route path="/features/:resourceSlug" element={<SeoContentPage />} />
    <Route path="/templates" element={<SeoHubPage kind="template" />} />
    <Route path="/templates/:resourceSlug" element={<SeoContentPage />} />
    <Route path="/guides" element={<SeoHubPage kind="guide" />} />
    <Route path="/guides/:resourceSlug" element={<SeoContentPage />} />
    <Route path="/tools" element={<SeoHubPage kind="tool" />} />
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
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/admin/overview" replace />} />
        <Route path="overview" element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserProfile />} />
        <Route path="links" element={<AdminLinks />} />
        <Route path="promocodes" element={<AdminPromocodes />} />
        <Route path="promocodes/:id" element={<AdminPromocodeStats />} />
        <Route path="campaigns" element={<AdminCampaigns />} />
        <Route path="campaigns/:id" element={<AdminCampaignDetails />} />
      </Route>
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
        <Suspense fallback={<AppLoadingScreen />}>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

export default App;
