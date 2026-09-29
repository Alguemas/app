import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors } from "@/src/theme";

// AdMob unit IDs (real IDs will be used in native builds; Expo Go shows placeholder)
// Android App ID: ca-app-pub-9217530735639061~8432409382
// Banner top: ca-app-pub-9217530735639061/7477998903
// Banner bottom: ca-app-pub-9217530735639061/4411449492
// Interstitial: ca-app-pub-9217530735639061/5454892257

type Props = {
  position?: "top" | "bottom";
  testID?: string;
};

export function AdBanner({ position = "bottom", testID }: Props) {
  return (
    <View
      style={[styles.container, position === "top" ? styles.top : styles.bottom]}
      testID={testID || `ad-banner-${position}`}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Anúncio</Text>
      </View>
      <View style={styles.content}>
        <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.text} numberOfLines={1}>
          Google Ads · Espaço reservado {Platform.OS !== "web" ? "(build nativo)" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    width: "100%",
    backgroundColor: "#0A0F0C",
    borderColor: "#1A2B22",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  top: { borderBottomWidth: 1 },
  bottom: { borderTopWidth: 1 },
  badge: {
    backgroundColor: "#233",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  content: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  text: { color: colors.textSecondary, fontSize: 12, flex: 1 },
});
