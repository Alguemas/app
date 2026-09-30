import { useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { ResponseType, makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";

/**
 * Google browser fallback (Expo Go / web). Only usable when
 * EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set. Do NOT call this hook
 * unless googleAvailable === true, otherwise expo-auth-session crashes
 * on native with an empty clientId.
 */
export function useGoogleBrowserFlow(
  onIdToken: (idToken: string) => Promise<void>,
  onError: (msg: string) => void,
) {
  const [, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    responseType: ResponseType.IdToken,
    scopes: ["openid", "profile", "email"],
    redirectUri: makeRedirectUri({ scheme: "simbet", path: "oauthredirect" }),
  });

  // Fire the exchange whenever a success response arrives.
  const handleResponse = useCallback(async () => {
    if (!response) return;
    if (response.type === "success") {
      const idToken = (response as any).params?.id_token;
      if (idToken) {
        try {
          await onIdToken(idToken);
        } catch (e: any) {
          onError(e?.message || "Falha no login com Google.");
        }
      }
    } else if (response.type === "error") {
      onError("Não foi possível entrar com Google.");
    } else if (response.type === "cancel" || response.type === "dismiss") {
      onError("Login cancelado.");
    }
  }, [response, onIdToken, onError]);

  return { response, promptAsync, handleResponse };
}

export function loadNativeGoogleSignin(): any {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-google-signin/google-signin").GoogleSignin;
  } catch {
    return null;
  }
}

export const googleConfig = {
  webClientId: GOOGLE_WEB_CLIENT_ID,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  isConfigured: GOOGLE_WEB_CLIENT_ID.length > 0,
};
