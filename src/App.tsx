import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import OnlyFansSolution from "./pages/OnlyFansSolution";
import TelegramSolution from "./pages/TelegramSolution";
import AffiliateSolution from "./pages/AffiliateSolution";
import BioLinkTool from "./pages/BioLinkTool";
import SmartRedirect from "./pages/SmartRedirect";
import DeeplinkGenerator from "./pages/DeeplinkGenerator";
import FitnessCoachSolution from "./pages/FitnessCoachSolution";
import YoutubeSmartLinks from "./pages/YoutubeSmartLinks";
import MusicSmartLinks from "./pages/MusicSmartLinks";
import DigitalProductsSolution from "./pages/DigitalProductsSolution";
import PodcastSmartLinks from "./pages/PodcastSmartLinks";
import ShopifySmartLinks from "./pages/ShopifySmartLinks";
import FanvueSmartLinks from "./pages/FanvueSmartLinks";
import GeoTargetedRedirect from "./pages/GeoTargetedRedirect";
import AmazonSmartLinks from "./pages/AmazonSmartLinks";
import UgcPortfolio from "./pages/UgcPortfolio";
import QrCodeBiolink from "./pages/QrCodeBiolink";
import ProfessionSolutions from "./pages/ProfessionSolutions";
import CompetitorComparison from "./pages/CompetitorComparison";
import CompetitorAlternative from "./pages/CompetitorAlternative";
import SolutionsIndex from "./pages/SolutionsIndex";
import AlternativesIndex from "./pages/AlternativesIndex";
import { AdminRoute } from "./components/AdminRoute";

import RedirectHandler from "./pages/RedirectHandler";

// Lazy loaded pages (non-prerendered, dynamic, or requiring authentication)
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const LinksManager = lazy(() => import("./pages/LinksManager"));
const CreateLink = lazy(() => import("./pages/CreateLink"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DashboardProfile = lazy(() => import("./pages/DashboardProfile"));
const ProfileHub = lazy(() => import("./pages/ProfileHub"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const InterstitialPage = lazy(() => import("./pages/InterstitialPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BillingPage = lazy(() => import("./pages/Billing"));
const DashboardPricing = lazy(() => import("./pages/DashboardPricing"));
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
  
  useEffect(() => {
    const hostname = window.location.hostname;
    const MAIN_DOMAIN = "linktery.com";
    
    // If not main domain, not localhost, and not a vercel preview URL
    if (hostname !== MAIN_DOMAIN && hostname !== 'localhost' && !hostname.includes('vercel.app')) {
      // System paths that should NOT be accessed on alternate domains
      const isSystemPath = location.pathname === '/' || 
                          location.pathname.startsWith('/login') || 
                          location.pathname.startsWith('/register') || 
                          location.pathname.startsWith('/dashboard') || 
                          location.pathname.startsWith('/pricing') || 
                          location.pathname.startsWith('/privacy') || 
                          location.pathname.startsWith('/terms') || 
                          location.pathname.startsWith('/alternatives') || 
                          location.pathname.startsWith('/solutions') || 
                          location.pathname.startsWith('/open-in-browser') || 
                          location.pathname.startsWith('/admin');
                          
      if (isSystemPath) {
        window.location.replace(`https://${MAIN_DOMAIN}${location.pathname}${location.search}`);
      }
    }
  }, [location.pathname, location.search]);

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
    <Route path="/solutions/link-in-bio-for-:professionSlug" element={<ProfessionSolutions />} />
    <Route path="/compare/:comparisonSlug" element={<CompetitorComparison />} />
    <Route path="/auth" element={<Navigate to="/login" replace />} />

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
