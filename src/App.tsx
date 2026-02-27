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
import PublicProfile from "./pages/PublicProfile";
import PricingPage from "./pages/PricingPage";
import InterstitialPage from "./pages/InterstitialPage";
import NotFound from "./pages/NotFound";
import BillingPage from "./pages/Billing";
import DashboardPricing from "./pages/DashboardPricing";
import { AdminRoute } from "./components/AdminRoute";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLinks from "./pages/admin/AdminLinks";

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isValid, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    </Route>

    <Route path="/admin" element={<AdminRoute />}>
      <Route index element={<Navigate to="/admin/overview" replace />} />
      <Route path="overview" element={<AdminOverview />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="links" element={<AdminLinks />} />
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
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
