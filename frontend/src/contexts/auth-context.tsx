import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";
import { googleConfig, loadNativeGoogleSignin, useGoogleBrowserFlow } from "@/src/hooks/use-google-signin";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SESSION_KEY = "simbet_session_token";

// Lazy native Google Signin module (may be null in Expo Go).
const NativeGoogleSignin: any = loadNativeGoogleSignin();
let nativeSigninConfigured = false;
function ensureNativeConfigured() {
  if (!NativeGoogleSignin || nativeSigninConfigured) return;
  if (!googleConfig.webClientId) return;
  try {
    NativeGoogleSignin.configure({
      webClientId: googleConfig.webClientId,
      offlineAccess: false,
    });
    nativeSigninConfigured = true;
  } catch (e) {
    console.warn("GoogleSignin configure error", e);
  }
}

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
  authError: string;
  clearError: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  googleAvailable: boolean;
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
  if (Platform.OS === "web") return (await storage.getItem<string>(SESSION_KEY, "")) || null;
  return (await storage.secureGet<string>(SESSION_KEY, "")) || null;
}
async function saveToken(t: string) {
  if (Platform.OS === "web") await storage.setItem(SESSION_KEY, t);
  else await storage.secureSet(SESSION_KEY, t);
}
async function clearToken() {
  if (Platform.OS === "web") await storage.removeItem(SESSION_KEY);
  else await storage.secureRemove(SESSION_KEY);
}

function parseError(payload: any, fallback: string): string {
  if (!payload) return fallback;
  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.detail) && payload.detail[0]?.msg) return payload.detail[0].msg;
  return fallback;
}

/**
 * Google browser fallback lives in a child component so `useAuthRequest`
 * only mounts when Google is properly configured. Otherwise the hook
 * crashes silently on Android/Expo Go with an empty clientId.
 */
function GoogleBrowserFlowMount({
  onIdToken,
  onError,
  registerPrompt,
}: {
  onIdToken: (idToken: string) => Promise<void>;
  onError: (msg: string) => void;
  registerPrompt: (fn: (() => Promise<any>) | null) => void;
}) {
  const { response, promptAsync, handleResponse } = useGoogleBrowserFlow(onIdToken, onError);

  useEffect(() => {
    registerPrompt(() => promptAsync());
    return () => registerPrompt(null);
  }, [promptAsync, registerPrompt]);

  useEffect(() => {
    handleResponse();
  }, [response, handleResponse]);

  return null;
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e: any) {
    const msg = e?.message || String(e);
    throw new Error(
      msg.includes("Network request failed")
        ? "Sem conexão com o servidor. Verifique sua internet."
        : `Erro de rede: ${msg}`
    );
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const googleBrowserPromptRef = useRef<null | (() => Promise<any>)>(null);

  const googleAvailable = googleConfig.isConfigured;

  const exchangeGoogleIdToken = useCallback(async (idToken: string) => {
    const res = await safeFetch(`${BACKEND_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(parseError(data, "Falha no login com Google."));
    await saveToken(data.session_token);
    setToken(data.session_token);
    setUser(data.user);
  }, []);

  const fetchMe = useCallback(async (t: string) => {
    try {
      const res = await safeFetch(`${BACKEND_URL}/api/auth/me`, {
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
  }, [fetchMe]);

  const authRequest = useCallback(async (path: string, body: object) => {
    setAuthError("");
    try {
      const res = await safeFetch(`${BACKEND_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = parseError(data, "Falha na autenticação.");
        setAuthError(msg);
        throw new Error(msg);
      }
      await saveToken(data.session_token);
      setToken(data.session_token);
      setUser(data.user);
    } catch (e: any) {
      const msg = e?.message || "Falha na autenticação.";
      setAuthError(msg);
      throw e;
    }
  }, []);

  const loginWithEmail = useCallback(
    (email: string, password: string) => authRequest("/api/auth/login", { email, password }),
    [authRequest]
  );

  const registerWithEmail = useCallback(
    (email: string, password: string, name: string) =>
      authRequest("/api/auth/register", { email, password, name }),
    [authRequest]
  );

  const registerPrompt = useCallback((fn: (() => Promise<any>) | null) => {
    googleBrowserPromptRef.current = fn;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAuthError("");
    if (!googleAvailable) {
      setAuthError("Login com Google não configurado. Ver MANUAL_APK.md.");
      return;
    }
    // Native path (APK / dev build)
    if (Platform.OS !== "web" && NativeGoogleSignin) {
      try {
        ensureNativeConfigured();
        await NativeGoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const result = await NativeGoogleSignin.signIn();
        const idToken =
          result?.data?.idToken ||
          result?.idToken ||
          (await NativeGoogleSignin.getTokens()).idToken;
        if (!idToken) throw new Error("ID token ausente do Google.");
        await exchangeGoogleIdToken(idToken);
        return;
      } catch (e: any) {
        const code = e?.code;
        const msg = String(e?.message || "");
        const notLinked =
          msg.includes("RNGoogleSignin") ||
          msg.includes("TurboModule") ||
          msg.includes("native module") ||
          msg.includes("null is not an object");
        if (!notLinked) {
          if (code === "SIGN_IN_CANCELLED" || code === -5) setAuthError("Login cancelado.");
          else if (code === "PLAY_SERVICES_NOT_AVAILABLE") setAuthError("Google Play Services indisponível.");
          else setAuthError(e?.message || "Falha no login com Google.");
          return;
        }
        // else fall through to browser flow
      }
    }
    // Browser fallback
    if (!googleBrowserPromptRef.current) {
      setAuthError("Login com Google indisponível neste ambiente.");
      return;
    }
    try {
      const r = await googleBrowserPromptRef.current();
      if (r?.type === "cancel" || r?.type === "dismiss") setAuthError("Login cancelado.");
    } catch (e: any) {
      setAuthError(e?.message || "Falha no login com Google.");
    }
  }, [exchangeGoogleIdToken, googleAvailable]);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await safeFetch(`${BACKEND_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    if (Platform.OS !== "web" && NativeGoogleSignin && nativeSigninConfigured) {
      try {
        await NativeGoogleSignin.signOut();
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

  const clearError = useCallback(() => setAuthError(""), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        authError,
        clearError,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        googleAvailable,
        logout,
        refreshUser,
        setBalance,
      }}
    >
      {googleAvailable ? (
        <GoogleBrowserFlowMount
          onIdToken={exchangeGoogleIdToken}
          onError={(msg) => setAuthError(msg)}
          registerPrompt={registerPrompt}
        />
      ) : null}
      {children}
    </AuthContext.Provider>
  );
}
