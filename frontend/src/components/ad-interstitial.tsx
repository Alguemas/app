import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  payout?: number;
};

// Simulates an AdMob interstitial (shown after wins)
export function AdInterstitial({ visible, onClose, payout }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="ad-interstitial"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ANÚNCIO</Text>
          </View>
          <View style={styles.header}>
            <Ionicons name="megaphone" size={22} color={colors.textSecondary} />
            <Text style={styles.provider}>Google AdMob · Interstitial</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              testID="ad-interstitial-close"
              hitSlop={12}
            >
              <Ionicons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Image
              source={{ uri: "https://images.pexels.com/photos/31379653/pexels-photo-31379653.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" }}
              style={styles.image}
            />
            <Text style={styles.title}>Espaço de Anúncio</Text>
            <Text style={styles.subtitle}>
              Em builds nativos, aqui aparecerá seu anúncio intersticial AdMob real.
            </Text>
            <View style={styles.fakeCta}>
              <Text style={styles.ctaText}>SAIBA MAIS</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </View>
          </View>

          {payout !== undefined && (
            <View style={styles.winBanner}>
              <Text style={styles.winText}>+{payout} moedas ganhas!</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onClose}
            testID="ad-interstitial-skip"
          >
            <Text style={styles.skipText}>Fechar anúncio</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", padding: 16 },
  container: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#0A0F0C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A2B22",
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    zIndex: 2,
  },
  badgeText: { color: "#000", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: "#1A2B22" },
  provider: { color: colors.textSecondary, fontSize: 12, flex: 1, marginLeft: 20 },
  closeBtn: { padding: 4 },
  body: { padding: 20, alignItems: "center" },
  image: { width: "100%", height: 160, borderRadius: 8, marginBottom: 16 },
  title: { color: "#FFF", fontSize: 20, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginBottom: 16, lineHeight: 18 },
  fakeCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  ctaText: { color: "#FFF", fontWeight: "800", letterSpacing: 0.5 },
  winBanner: { backgroundColor: colors.primary, paddingVertical: 8, alignItems: "center" },
  winText: { color: "#000", fontWeight: "800", fontSize: 14 },
  skipBtn: { padding: 14, alignItems: "center" },
  skipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
});
