import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { ResponseType, makeRedirectUri } from "expo-auth-session";
import { storage } from "@/src/utils/storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
const SESSION_KEY = "simbet_session_token";

WebBrowser.maybeCompleteAuthSession();

// Lazy-load native Google Signin so app doesn't crash in Expo Go
let NativeGoogleSignin: any = null;
let nativeSigninConfigured = false;
try {
  if (Platform.OS !== "web") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeGoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
  }
} catch {
  NativeGoogleSignin = null;
}

function ensureNativeConfigured() {
  if (!NativeGoogleSignin || nativeSigninConfigured) return;
  if (!GOOGLE_WEB_CLIENT_ID) return;
  try {
    NativeGoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
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
async function saveToken(token: string) {
  if (Platform.OS === "web") await storage.setItem(SESSION_KEY, token);
  else await storage.secureSet(SESSION_KEY, token);
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const googleAvailable = GOOGLE_WEB_CLIENT_ID.length > 0;

  // Expo Go / web browser fallback for Google
  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    responseType: ResponseType.IdToken,
    scopes: ["openid", "profile", "email"],
    redirectUri: makeRedirectUri({ scheme: "simbet", path: "oauthredirect" }),
  });

  const exchangeGoogleIdToken = useCallback(async (idToken: string) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
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

  // Handle browser-based Google response
  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === "success") {
      const idToken = (googleResponse as any).params?.id_token;
      if (idToken) {
        setAuthError("");
        exchangeGoogleIdToken(idToken).catch((e) => setAuthError(e.message || "Falha no login com Google."));
      }
    } else if (googleResponse.type === "error") {
      setAuthError("Não foi possível entrar com Google.");
    }
  }, [googleResponse, exchangeGoogleIdToken]);

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
    const res = await fetch(`${BACKEND_URL}${path}`, {
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

  const loginWithGoogle = useCallback(async () => {
    setAuthError("");
    if (!GOOGLE_WEB_CLIENT_ID) {
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
        // Fall back to browser flow only if native module isn't linked (Expo Go)
        const code = e?.code;
        const msg = String(e?.message || "");
        const notLinked =
          msg.includes("RNGoogleSignin") ||
          msg.includes("null") ||
          msg.includes("TurboModule") ||
          msg.includes("native module");
        if (!notLinked) {
          if (code === "SIGN_IN_CANCELLED" || code === -5) {
            setAuthError("Login cancelado.");
          } else if (code === "PLAY_SERVICES_NOT_AVAILABLE") {
            setAuthError("Google Play Services indisponível.");
          } else {
            setAuthError(e?.message || "Falha no login com Google.");
          }
          return;
        }
        // else: try browser fallback below
      }
    }
    // Browser fallback (Expo Go / web)
    try {
      const r = await googlePromptAsync();
      if (r.type !== "success") {
        if (r.type === "cancel" || r.type === "dismiss") setAuthError("Login cancelado.");
      }
    } catch (e: any) {
      setAuthError(e?.message || "Falha no login com Google.");
    }
  }, [exchangeGoogleIdToken, googlePromptAsync]);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
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
      {children}
    </AuthContext.Provider>
  );
}
