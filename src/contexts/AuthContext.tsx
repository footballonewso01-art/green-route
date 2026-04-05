import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { pb } from "@/lib/pocketbase";

interface User {
  id: string;
  collectionId?: string;
  collectionName?: string;
  email: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  theme: string;
  social_links: Record<string, unknown>[];
  custom_theme_bg: string;
  card_color: string;
  username_last_changed: string;
  plan: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isValid: boolean;
  isAdmin: boolean;
  signOut: () => void;
  login: (token: string, userData: Record<string, unknown>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("pocketbase_auth");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        pb.authStore.save(parsed.token, parsed.model);
        return {
          id: parsed.model.id,
          collectionId: parsed.model.collectionId,
          collectionName: parsed.model.collectionName,
          email: parsed.model.email,
          name: parsed.model.name,
          username: parsed.model.username || '',
          bio: parsed.model.bio || '',
          avatar: parsed.model.avatar || '',
          theme: parsed.model.theme || 'minimal-dark',
          social_links: parsed.model.social_links || [],
          custom_theme_bg: parsed.model.custom_theme_bg || '',
          card_color: parsed.model.card_color || '#000000',
          username_last_changed: parsed.model.username_last_changed || '',
          plan: parsed.model.plan,
          role: parsed.model.role || 'user',
        };
      } catch (e) {
        console.error("Failed to parse auth from localStorage:", e);
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Token expiry check: if stored token is no longer valid, force logout
    if (user && !pb.authStore.isValid) {
      console.warn("[Auth] Token expired, forcing logout.");
      pb.authStore.clear();
      localStorage.removeItem("pocketbase_auth");
      setUser(null);
      window.location.href = "/login";
    }

    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (model) {
        const updatedUser = {
          id: model.id,
          collectionId: model.collectionId,
          collectionName: model.collectionName,
          email: model.email,
          name: model.name,
          username: model.username || '',
          bio: model.bio || '',
          avatar: model.avatar || '',
          theme: model.theme || 'minimal-dark',
          social_links: model.social_links || [],
          custom_theme_bg: model.custom_theme_bg || '',
          card_color: model.card_color || '#000000',
          username_last_changed: model.username_last_changed || '',
          plan: model.plan,
          role: model.role || 'user',
        };
        setUser(updatedUser);

        // Ensure localStorage also correctly saves these fields
        const saved = localStorage.getItem("pocketbase_auth");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            parsed.model = { ...parsed.model, collectionId: model.collectionId, collectionName: model.collectionName };
            localStorage.setItem("pocketbase_auth", JSON.stringify(parsed));
          } catch (e) { /* ignore parse error */ }
        }
      } else {
        setUser(null);
      }
    });

    // Periodic token expiry check (every 60 seconds)
    const tokenCheckInterval = setInterval(() => {
      if (pb.authStore.token && !pb.authStore.isValid) {
        console.warn("[Auth] Token expired (periodic check), forcing logout.");
        pb.authStore.clear();
        localStorage.removeItem("pocketbase_auth");
        setUser(null);
        window.location.href = "/login";
      }
    }, 60_000);

    setLoading(false);
    return () => {
      unsubscribe();
      clearInterval(tokenCheckInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1. Session tracking pulse (top-level hook)
  useEffect(() => {
    if (user) {
      const trackSession = async () => {
        try {
          await pb.collection("analytics_events").create({
            event_name: "active_session",
            user_id: user.id,
            metadata: {
              path: window.location.pathname,
              timestamp: new Date().toISOString()
            }
          });
        } catch (e) { /* silent fail */ }
      };
      trackSession();
      const interval = setInterval(trackSession, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // 2. Global Error & Performance logging (top-level hook)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      pb.collection("system_logs").create({
        level: "error",
        message: event.message,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      }).catch(() => { });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      pb.collection("system_logs").create({
        level: "error",
        message: "Unhandled Rejection: " + event.reason,
        context: { reason: event.reason }
      }).catch(() => { });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  const login = (token: string, userData: Record<string, unknown>) => {
    pb.authStore.save(token, userData);
    setUser({
      id: userData.id as string,
      collectionId: userData.collectionId as string,
      collectionName: userData.collectionName as string,
      email: userData.email as string,
      name: userData.name as string,
      username: (userData.username as string) || '',
      bio: (userData.bio as string) || '',
      avatar: (userData.avatar as string) || '',
      theme: (userData.theme as string) || 'minimal-dark',
      social_links: (userData.social_links as Record<string, unknown>[]) || [],
      custom_theme_bg: (userData.custom_theme_bg as string) || '',
      card_color: (userData.card_color as string) || '#000000',
      username_last_changed: (userData.username_last_changed as string) || '',
      plan: userData.plan as string,
      role: (userData.role as string) || 'user',
    });
  };

  const signOut = () => {
    pb.authStore.clear();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const record = await pb.collection('users').authRefresh();
      // authStore.onChange will handle updating the user state
      if (record?.record) {
        localStorage.setItem('pocketbase_auth', JSON.stringify({
          token: pb.authStore.token,
          model: record.record
        }));
      }
    } catch (e) {
      console.error('[Auth] Failed to refresh user:', e);
    }
  };

  const isValid = Boolean(user && pb.authStore.isValid);
  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <AuthContext.Provider value={{ user, loading, isValid, isAdmin, login, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
