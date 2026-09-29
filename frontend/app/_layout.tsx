import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/contexts/auth-context";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(tabs)" || segments[0] === "deposit" || segments[0] === "crash" || segments[0] === "slots" || segments[0] === "help" || segments[0] === "stats";
    if (user && !inAuth) {
      router.replace("/(tabs)");
    } else if (!user && inAuth) {
      router.replace("/");
    }
  }, [user, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#061A12" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="deposit" options={{ presentation: "modal" }} />
      <Stack.Screen name="crash" />
      <Stack.Screen name="slots" />
      <Stack.Screen name="help" />
      <Stack.Screen name="stats" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: "#061A12" }}>
        <StatusBar style="light" />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
