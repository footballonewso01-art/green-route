import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { pb } from "@/lib/pocketbase";

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isValid: boolean;
  isAdmin: boolean;
  signOut: () => void;
  login: (token: string, userData: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
          email: parsed.model.email,
          name: parsed.model.name,
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
    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (model) {
        setUser({
          id: model.id,
          email: model.email,
          name: model.name,
          plan: model.plan,
          role: model.role || 'user',
        });
      } else {
        setUser(null);
      }
    });

    setLoading(false);
    return () => {
      unsubscribe();
    };
  }, []);

  const login = (token: string, userData: any) => {
    pb.authStore.save(token, userData);
    setUser({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      plan: userData.plan,
      role: userData.role || 'user',
    });
  };

  const signOut = () => {
    pb.authStore.clear();
    setUser(null);
  };

  const isValid = Boolean(user && pb.authStore.isValid);
  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <AuthContext.Provider value={{ user, loading, isValid, isAdmin, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
