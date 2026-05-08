import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import LinksManager from "./pages/LinksManager";
import CreateLink from "./pages/CreateLink";
import AnalyticsPage from "./pages/AnalyticsPage";
import DashboardProfile from "./pages/DashboardProfile";
import SettingsPage from "./pages/SettingsPage";
import HelpCenter from "./pages/HelpCenter";
import PublicProfile from "./pages/PublicProfile";
import PricingPage from "./pages/PricingPage";
import InterstitialPage from "./pages/InterstitialPage";
import NotFound from "./pages/NotFound";
import BillingPage from "./pages/Billing";
import DashboardPricing from "./pages/DashboardPricing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import { AdminRoute } from "./components/AdminRoute";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserProfile from "./pages/admin/AdminUserProfile";
import AdminLinks from "./pages/admin/AdminLinks";
import AdminPromocodes from "./pages/admin/AdminPromocodes";

import RedirectHandler from "./pages/RedirectHandler";

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
    <Route path="/auth" element={<Navigate to="/login" replace />} />
    <Route path="/open-in-browser" element={<InterstitialPage />} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<DashboardHome />} />
      <Route path="links" element={<LinksManager />} />
      <Route path="links/create" element={<CreateLink />} />
      <Route path="links/edit/:id" element={<CreateLink />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="profile" element={<DashboardProfile />} />
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
    </Route>

    {/* Short Link Redirector - Catch all other usernames/slugs */}
    <Route path="/:username" element={<RedirectHandler />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <DomainGuard />
        <AmbientBackground />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
