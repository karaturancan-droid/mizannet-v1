"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: number;
  name: string;
  email: string;
  company?: string;
}

interface Subscription {
  plan: string;
  status: string;
  trial_end: string;
}

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  token: string | null;
  login: (token: string, user: User, subscription: Subscription) => void;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In production, this should point to your live website URL
export const API_URL = "http://localhost:3000/api/v1/desktop";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check local storage for token on mount
    const storedToken = localStorage.getItem("mizannet_token");
    if (storedToken) {
      setToken(storedToken);
      verifyToken(storedToken);
    } else {
      setLoading(false);
      if (pathname !== "/login") {
        router.push("/login");
      }
    }
  }, [pathname]);

  const verifyToken = async (currentToken: string) => {
    try {
      const res = await fetch(`${API_URL}/verify`, {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSubscription(data.subscription);
        
        if (data.subscription.status === 'expired' && data.subscription.plan !== 'lifetime') {
          if (pathname !== "/expired") router.push("/expired");
        } else {
          if (pathname === "/login" || pathname === "/expired") {
            router.push("/");
          }
        }
      } else {
        logout();
      }
    } catch (e) {
      console.error("Sunucuya ulaşılamadı (Offline Mod):", e);
      // OFFLINE FALLBACK: Sunucuya ulaşılamıyorsa, kullanıcının daha önceden login olduğunu kabul et
      // ve Tauri'nin yerel, şifreli lisans kontrol sistemine (license.rs) güven.
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const localStatus: any = await invoke('get_license_status');
        
        // Mock a user just to keep them logged in offline
        setUser({ id: 0, name: "Çevrimdışı Kullanıcı", email: "offline@mizannet.com" });
        setSubscription({
          plan: localStatus.state === 'licensed' ? 'lifetime' : 'trial',
          status: localStatus.state.includes('expired') ? 'expired' : 'active',
          trial_end: localStatus.trial_started_at
        });

        if (localStatus.state === 'trial_expired' || localStatus.state === 'license_expired') {
          if (pathname !== "/expired") router.push("/expired");
        } else {
          if (pathname === "/login" || pathname === "/expired") {
            router.push("/");
          }
        }
      } catch (err) {
        console.error("Local lisans sistemi okunamadı:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string, newUser: User, newSub: Subscription) => {
    localStorage.setItem("mizannet_token", newToken);
    setToken(newToken);
    setUser(newUser);
    setSubscription(newSub);
    
    if (newSub.status === 'expired' && newSub.plan !== 'lifetime') {
      router.push("/expired");
    } else {
      router.push("/");
    }
  };

  const logout = () => {
    localStorage.removeItem("mizannet_token");
    setToken(null);
    setUser(null);
    setSubscription(null);
    router.push("/login");
  };

  const refreshAuth = async () => {
    if (token) await verifyToken(token);
  };

  return (
    <AuthContext.Provider value={{ user, subscription, token, login, logout, refreshAuth, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
