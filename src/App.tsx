import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

import RedirectHandler from "./pages/RedirectHandler";

const queryClient = new QueryClient();

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
    <Route path="/u/:username" element={<PublicProfile />} />
    <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      <Route index element={<DashboardHome />} />
      <Route path="links" element={<LinksManager />} />
      <Route path="links/create" element={<CreateLink />} />
      <Route path="links/edit/:id" element={<CreateLink />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="profile" element={<DashboardProfile />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    {/* Short Link Redirector - Catch all other slugs */}
    <Route path="/:slug" element={<RedirectHandler />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
