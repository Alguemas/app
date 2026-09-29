import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/contexts/auth-context";
import { colors } from "@/src/theme";

export default function LoginScreen() {
  const { loginWithEmail, loginWithGoogle, googleAvailable, authError, clearError } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch {
      // authError já é setado no contexto
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground
      source={{
        uri:
          "https://images.unsplash.com/photo-1762013315117-1c8005ad2b41?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBtYXRjaCUyMG5pZ2h0JTIwc3RhZGl1bXxlbnwwfHx8fDE3ODI1NzYyOTJ8MA&ixlib=rb-4.1.0&q=85",
      }}
      style={styles.bg}
      testID="login-bg"
    >
      <LinearGradient
        colors={["rgba(6,26,18,0.4)", "rgba(6,26,18,0.95)", "#061A12"]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.top}>
                <View style={styles.logoMark}>
                  <Text style={styles.logoBet}>SIM</Text>
                  <Text style={styles.logoBet2}>BET</Text>
                </View>
                <Text style={styles.tagline}>APOSTAS SIMULADAS · SEM PERDER DINHEIRO</Text>
              </View>

              <View style={styles.bottom}>
                <View style={styles.awarenessTag} testID="awareness-badge">
                  <Ionicons name="shield-checkmark" size={14} color="#BFDBFE" />
                  <Text style={styles.awarenessText}>Ferramenta para superar o vício em apostas</Text>
                </View>

                <Text style={styles.headline}>Entre na sua conta</Text>
                <Text style={styles.sub}>
                  Apostas com moedas virtuais. Nunca é possível depositar ou sacar dinheiro real.
                </Text>

                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="login-email-input"
                    style={styles.input}
                    placeholder="E-mail"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (authError) clearError();
                    }}
                    editable={!submitting}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="login-password-input"
                    style={styles.input}
                    placeholder="Senha"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (authError) clearError();
                    }}
                    editable={!submitting}
                  />
                </View>

                {authError ? (
                  <Text style={styles.errorText} testID="login-error">
                    {authError}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleLogin}
                  disabled={submitting}
                  testID="login-submit-button"
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#061A12" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Entrar</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/register")}
                  disabled={submitting}
                  testID="go-to-register"
                  style={styles.registerLink}
                >
                  <Text style={styles.registerText}>
                    Não tem conta? <Text style={styles.registerBold}>Cadastre-se</Text>
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleBtn, (!googleAvailable || submitting) && { opacity: 0.5 }]}
                  onPress={handleGoogle}
                  disabled={submitting || !googleAvailable}
                  testID="google-login-button"
                  activeOpacity={0.85}
                >
                  <View style={styles.gIcon}>
                    <Text style={styles.gIconText}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Continuar com Google</Text>
                </TouchableOpacity>

                {!googleAvailable ? (
                  <Text style={styles.disclaimer}>
                    Google desativado (configure GOOGLE_WEB_CLIENT_ID). Ver MANUAL_APK.md.
                  </Text>
                ) : null}

                <Text style={styles.footer}>
                  Ao criar uma conta você recebe{" "}
                  <Text style={styles.footerBold}>200 moedas virtuais grátis</Text>
                </Text>
                <Text style={styles.disclaimer}>
                  Se você ou alguém próximo tem vício em apostas, ligue 188 (CVV).
                </Text>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "space-between", paddingBottom: 24 },
  top: { alignItems: "center", paddingTop: 20 },
  logoMark: { flexDirection: "row", alignItems: "baseline" },
  logoBet: { color: "#FFF", fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  logoBet2: { color: colors.primary, fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  tagline: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 2, marginTop: 4 },
  bottom: { paddingTop: 32, paddingBottom: 8 },
  awarenessTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(30,58,138,0.55)",
    borderWidth: 1, borderColor: "rgba(59,130,246,0.5)",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, marginBottom: 16,
  },
  awarenessText: { color: "#BFDBFE", fontSize: 11, fontWeight: "700" },
  headline: { color: "#FFF", fontSize: 30, fontWeight: "900", lineHeight: 34, letterSpacing: -0.5, marginBottom: 8 },
  sub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4,
    marginBottom: 12,
  },
  input: { flex: 1, color: "#FFF", fontSize: 15, paddingVertical: 12 },
  errorText: { color: "#FCA5A5", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  primaryBtn: {
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center", marginTop: 4,
  },
  primaryBtnText: { color: "#061A12", fontWeight: "900", fontSize: 15, letterSpacing: 0.3 },
  registerLink: { alignItems: "center", marginTop: 14 },
  registerText: { color: colors.textSecondary, fontSize: 13 },
  registerBold: { color: colors.primary, fontWeight: "800" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    backgroundColor: "#FFF", paddingVertical: 15, borderRadius: 8,
  },
  gIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#EA4335", alignItems: "center", justifyContent: "center" },
  gIconText: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  googleBtnText: { color: "#000", fontSize: 15, fontWeight: "700" },
  footer: { color: colors.textSecondary, textAlign: "center", fontSize: 12, marginTop: 16 },
  footerBold: { color: colors.primary, fontWeight: "800" },
  disclaimer: { color: colors.textMuted, textAlign: "center", fontSize: 10, marginTop: 8, lineHeight: 14 },
});
