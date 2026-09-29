// Icon font loader for Expo apps. Fonts are loaded from a CDN only under
// Expo Go (StoreClient) — that's where the icon .ttf files come back as
// 0 bytes from Metro's asset resolver on Android. Native dev/prod builds
// and web pass an empty map, so useFonts resolves to [true, null]
// immediately via react-native-vector-icons autolinking / web stubs.
// Usage: const [loaded, error] = useIconFonts();

import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";

const IONICONS_VERSION = "13.1.4";

// The font's internal family name → CDN .ttf URL
const iconFontMap = (): Record<string, string> => ({
  Ionicons: `https://cdn.jsdelivr.net/npm/@react-native-vector-icons/ionicons@${IONICONS_VERSION}/fonts/Ionicons.ttf`,
});

export const useIconFonts = (): readonly [boolean, Error | null] =>
  useFonts(
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? iconFontMap()
      : {},
  );
