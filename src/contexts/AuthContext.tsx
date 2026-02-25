import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { pb } from "@/lib/pocketbase";
import type { AuthModel } from "pocketbase";

interface AuthContextType {
  user: AuthModel | null;
  isValid: boolean;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isValid: false,
  loading: true,
  signOut: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthModel | null>(pb.authStore.model);
  const [isValid, setIsValid] = useState(pb.authStore.isValid);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (pb.authStore.token && pb.authStore.isValid) {
          // Verify and refresh the session
          await pb.collection('users').authRefresh();
        }
      } catch (error) {
        console.error("Auth refresh failed:", error);
        pb.authStore.clear();
      } finally {
        setUser(pb.authStore.model);
        setIsValid(pb.authStore.isValid);
        setLoading(false);
      }
    };

    initAuth();

    // Listen to auth changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
      setIsValid(pb.authStore.isValid);
    });

    return () => unsubscribe();
  }, []);

  const signOut = () => {
    pb.authStore.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isValid, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
