import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { storage } from "@/src/utils/storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_KEY = "simbet_session_token";

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  virtual_coins: number;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  token: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setBalance: (v: number) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return (await storage.getItem<string>(SESSION_KEY, "")) || null;
  }
  return (await storage.secureGet<string>(SESSION_KEY, "")) || null;
}

async function saveToken(token: string) {
  if (Platform.OS === "web") {
    await storage.setItem(SESSION_KEY, token);
  } else {
    await storage.secureSet(SESSION_KEY, token);
  }
}

async function clearToken() {
  if (Platform.OS === "web") {
    await storage.removeItem(SESSION_KEY);
  } else {
    await storage.secureRemove(SESSION_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        await clearToken();
        setToken(null);
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch (e) {
      console.warn("fetchMe error", e);
    }
  }, []);

  const processSessionId = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error("Session exchange failed");
      const data = await res.json();
      await saveToken(data.session_token);
      setToken(data.session_token);
      setUser(data.user);
    } catch (e) {
      console.warn("processSessionId error", e);
    }
  }, []);

  // Web: read session_id from URL on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (Platform.OS === "web") {
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        const params = new URLSearchParams(
          hash.startsWith("#") ? hash.slice(1) : search.startsWith("?") ? search.slice(1) : ""
        );
        const sid = params.get("session_id");
        if (sid) {
          await processSessionId(sid);
          window.history.replaceState(null, "", window.location.pathname);
          if (!cancelled) setLoading(false);
          return;
        }
      } else {
        // Mobile cold start
        const initial = await Linking.getInitialURL();
        if (initial) {
          const parsed = Linking.parse(initial);
          const sid = (parsed.queryParams?.session_id as string) || null;
          if (sid) {
            await processSessionId(sid);
            if (!cancelled) setLoading(false);
            return;
          }
        }
      }
      const stored = await getStoredToken();
      if (stored) {
        setToken(stored);
        await fetchMe(stored);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMe, processSessionId]);

  const loginWithGoogle = useCallback(async () => {
    const redirectUrl =
      Platform.OS === "web"
        ? window.location.origin + "/"
        : Linking.createURL("auth");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(
      redirectUrl
    )}`;
    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === "success" && result.url) {
      const parsed = Linking.parse(result.url);
      const sid = (parsed.queryParams?.session_id as string) || null;
      if (sid) await processSessionId(sid);
    }
  }, [processSessionId]);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    await clearToken();
    setToken(null);
    setUser(null);
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (token) await fetchMe(token);
  }, [token, fetchMe]);

  const setBalance = useCallback((v: number) => {
    setUser((u) => (u ? { ...u, virtual_coins: v } : u));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, token, loginWithGoogle, logout, refreshUser, setBalance }}
    >
      {children}
    </AuthContext.Provider>
  );
}
