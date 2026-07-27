import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/contexts/auth-context";
import { colors } from "@/src/theme";

export default function LoginScreen() {
  const { loginWithGoogle, loading } = useAuth();

  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1762013315117-1c8005ad2b41?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBtYXRjaCUyMG5pZ2h0JTIwc3RhZGl1bXxlbnwwfHx8fDE3ODI1NzYyOTJ8MA&ixlib=rb-4.1.0&q=85" }}
      style={styles.bg}
      testID="login-bg"
    >
      <LinearGradient
        colors={["rgba(6,26,18,0.4)", "rgba(6,26,18,0.95)", "#061A12"]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.top}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoBet}>SIM</Text>
              <Text style={styles.logoBet2}>BET</Text>
            </View>
          </View>
          <Text style={styles.tagline}>APOSTAS SIMULADAS · SEM PERDER DINHEIRO</Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.awarenessTag} testID="awareness-badge">
            <Ionicons name="shield-checkmark" size={14} color="#BFDBFE" />
            <Text style={styles.awarenessText}>Ferramenta para superar o vício em apostas</Text>
          </View>

          <Text style={styles.headline}>Sinta o rush.{"\n"}Sem o risco.</Text>
          <Text style={styles.sub}>
            Apostas esportivas, cassino e crash - tudo com moedas virtuais.
            Nunca é possível depositar ou sacar dinheiro real.
          </Text>

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={loginWithGoogle}
            disabled={loading}
            testID="google-login-button"
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <View style={styles.gIcon}>
                  <Text style={styles.gIconText}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Continuar com Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>
            Ao continuar você recebe{" "}
            <Text style={styles.footerBold}>200 moedas virtuais grátis</Text>
          </Text>
          <Text style={styles.disclaimer}>
            Se você ou alguém próximo tem vício em apostas, ligue 188 (CVV).
          </Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between" },
  top: { alignItems: "center", paddingTop: 20 },
  logoRow: { flexDirection: "row" },
  logoMark: { flexDirection: "row", alignItems: "baseline" },
  logoBet: { color: "#FFF", fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  logoBet2: { color: colors.primary, fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  tagline: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 2, marginTop: 4 },
  bottom: { paddingBottom: 20 },
  awarenessTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(30,58,138,0.55)",
    borderWidth: 1, borderColor: "rgba(59,130,246,0.5)",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, marginBottom: 20,
  },
  awarenessText: { color: "#BFDBFE", fontSize: 11, fontWeight: "700" },
  headline: { color: "#FFF", fontSize: 40, fontWeight: "900", lineHeight: 44, letterSpacing: -1, marginBottom: 12 },
  sub: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 28 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    backgroundColor: "#FFF", paddingVertical: 16, borderRadius: 8,
  },
  gIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#EA4335", alignItems: "center", justifyContent: "center" },
  gIconText: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  googleBtnText: { color: "#000", fontSize: 15, fontWeight: "700" },
  footer: { color: colors.textSecondary, textAlign: "center", fontSize: 12, marginTop: 16 },
  footerBold: { color: colors.primary, fontWeight: "800" },
  disclaimer: { color: colors.textMuted, textAlign: "center", fontSize: 10, marginTop: 12, lineHeight: 14 },
});
