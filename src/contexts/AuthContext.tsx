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
  social_links: any;
  custom_theme_bg: string;
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
          } catch (e) { }
        }
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
      collectionId: userData.collectionId,
      collectionName: userData.collectionName,
      email: userData.email,
      name: userData.name,
      username: userData.username || '',
      bio: userData.bio || '',
      avatar: userData.avatar || '',
      theme: userData.theme || 'minimal-dark',
      social_links: userData.social_links || [],
      custom_theme_bg: userData.custom_theme_bg || '',
      username_last_changed: userData.username_last_changed || '',
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
