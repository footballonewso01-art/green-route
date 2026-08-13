import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { pb } from "@/lib/pocketbase";
import { claimStoredReferral, getStoredReferral } from "@/lib/affiliate";
import { sendTelemetry } from "@/lib/telemetry";

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
  plan_expires_at?: string;
  online_counter: boolean;
  role?: string;
  promocode_used?: string;
  created?: string;
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
const REFERRAL_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;
const REFERRAL_RETRY_DELAYS_MS = [0, 3_000, 15_000] as const;

function isReferralClaimWindowOpen(created: string | undefined): boolean {
  if (!created) return false;
  const createdAt = Date.parse(created.replace(" ", "T"));
  if (!Number.isFinite(createdAt)) return false;
  const age = Date.now() - createdAt;
  return age >= -5 * 60 * 1000 && age <= REFERRAL_ACCOUNT_WINDOW_MS;
}

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
    if (typeof window === "undefined") return null;
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
          plan_expires_at: parsed.model.plan_expires_at || '',
          online_counter: !!parsed.model.online_counter,
          role: parsed.model.role || 'user',
          promocode_used: parsed.model.promocode_used || '',
          created: parsed.model.created || '',
        };
      } catch (e) {
        console.error("Failed to parse auth from localStorage:", e);
        return null;
      }
    }
    return null;
  });
  // The initial auth snapshot is restored synchronously above. Keeping this
  // flag true until the first effect forced an immediate provider update while
  // prerendered lazy routes were still hydrating, which made React abandon the
  // Suspense boundary on every public SEO page (production error #421).
  const loading = false;
  const referralUserId = user?.id;
  const referralUserCreated = user?.created;

  useEffect(() => {
    // Token expiry check: if stored token is no longer valid, force logout
    if (user && !pb.authStore.isValid) {
      console.warn("[Auth] Token expired, forcing logout.");
      pb.authStore.clear();
      localStorage.removeItem("pocketbase_auth");
      setUser(null);
      window.location.href = "/login";
    }

    // Refresh user data from server on mount (picks up plan changes, etc.)
    if (pb.authStore.isValid && pb.authStore.token) {
      pb.collection('users').authRefresh().then((result) => {
        if (result?.record) {
          localStorage.setItem('pocketbase_auth', JSON.stringify({
            token: pb.authStore.token,
            model: result.record
          }));
        }
      }).catch((err) => {
        // If server explicitly rejects our token (expired/invalid), force logout
        // instead of keeping stale auth state that causes "Unauthorized" on API calls
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) {
          console.warn("[Auth] Server rejected token during refresh, forcing logout.");
          pb.authStore.clear();
          localStorage.removeItem("pocketbase_auth");
          setUser(null);
          window.location.href = "/login";
        }
        // For network errors / timeouts — silent fail, stale data is acceptable
      });
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
          plan_expires_at: model.plan_expires_at || '',
          online_counter: !!model.online_counter,
          role: model.role || 'user',
          promocode_used: model.promocode_used || '',
          created: model.created || '',
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

    return () => {
      unsubscribe();
      clearInterval(tokenCheckInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registration claims immediately, while this recovery path covers a
  // transient API/network failure and OAuth/auth-store timing. The referral is
  // retained until the server confirms it and retries only for new accounts.
  useEffect(() => {
    if (!referralUserId || !pb.authStore.isValid || !isReferralClaimWindowOpen(referralUserCreated)) return;
    if (!getStoredReferral()) return;

    let cancelled = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleAttempt = (delay: number) => {
      if (cancelled) return;
      retryTimer = setTimeout(() => void attemptClaim(), delay);
    };

    const attemptClaim = async () => {
      if (cancelled || !getStoredReferral()) return;
      try {
        const claimed = await claimStoredReferral();
        if (claimed || !getStoredReferral()) return;
      } catch {
        if (!getStoredReferral()) return;
      }

      attempt += 1;
      if (attempt < REFERRAL_RETRY_DELAYS_MS.length) {
        scheduleAttempt(REFERRAL_RETRY_DELAYS_MS[attempt]);
      }
    };

    const retryWhenOnline = () => {
      if (!getStoredReferral()) return;
      if (retryTimer) clearTimeout(retryTimer);
      attempt = 0;
      scheduleAttempt(0);
    };

    scheduleAttempt(REFERRAL_RETRY_DELAYS_MS[0]);
    window.addEventListener("online", retryWhenOnline);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener("online", retryWhenOnline);
    };
  }, [referralUserId, referralUserCreated]);

  // 1. Session tracking pulse (top-level hook)
  useEffect(() => {
    if (user) {
      const trackSession = () => {
        sendTelemetry({ event_name: "active_session", path: window.location.pathname });
      };
      trackSession();
      const interval = setInterval(trackSession, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // 2. Global Error & Performance logging (top-level hook)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      sendTelemetry({
        event_name: "client_error",
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason || "Unhandled rejection"));
      sendTelemetry({
        event_name: "unhandled_rejection",
        message: reason.message,
        stack: reason.stack,
      });
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
      plan_expires_at: (userData.plan_expires_at as string) || '',
      online_counter: !!(userData.online_counter),
      role: (userData.role as string) || 'user',
    });
  };

  const signOut = () => {
    pb.authStore.clear();
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
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
  }, []);

  const isValid = Boolean(user && pb.authStore.isValid);
  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <AuthContext.Provider value={{ user, loading, isValid, isAdmin, login, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
