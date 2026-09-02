import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";

export function AdminRoute() {
    const { user, loading, isAdmin } = useAuth();

    if (loading) {
        return <AppLoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

