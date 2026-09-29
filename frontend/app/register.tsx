import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
import { useRouter, Stack } from "expo-router";
import { useAuth } from "@/src/contexts/auth-context";
import { colors } from "@/src/theme";

export default function RegisterScreen() {
  const { registerWithEmail, authError, clearError } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    setLocalError("");
    if (!name.trim() || !email.trim() || !password) {
      setLocalError("Preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      setLocalError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setLocalError("As senhas não coincidem.");
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await registerWithEmail(email.trim(), password, name.trim());
    } catch {
      // authError já é setado no contexto
    } finally {
      setSubmitting(false);
    }
  };

  const errorMessage = localError || authError;

  return (
    <View style={styles.bg}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#061A12", "#0A2419", "#061A12"]}
        style={StyleSheet.absoluteFill}
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
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                testID="register-back"
              >
                <Ionicons name="chevron-back" size={26} color="#FFF" />
              </TouchableOpacity>

              <View style={styles.top}>
                <Text style={styles.headline}>Criar conta</Text>
                <Text style={styles.sub}>
                  Ganhe <Text style={styles.subBold}>200 moedas virtuais</Text> para começar. Sem depósito real.
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="register-name-input"
                    style={styles.input}
                    placeholder="Nome"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    value={name}
                    onChangeText={(v) => { setName(v); setLocalError(""); if (authError) clearError(); }}
                    editable={!submitting}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="register-email-input"
                    style={styles.input}
                    placeholder="E-mail"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(v) => { setEmail(v); setLocalError(""); if (authError) clearError(); }}
                    editable={!submitting}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="register-password-input"
                    style={styles.input}
                    placeholder="Senha (mín. 6 caracteres)"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={(v) => { setPassword(v); setLocalError(""); if (authError) clearError(); }}
                    editable={!submitting}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    testID="register-confirm-input"
                    style={styles.input}
                    placeholder="Confirmar senha"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={confirm}
                    onChangeText={(v) => { setConfirm(v); setLocalError(""); if (authError) clearError(); }}
                    editable={!submitting}
                  />
                </View>

                {errorMessage ? (
                  <Text style={styles.errorText} testID="register-error">
                    {errorMessage}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleRegister}
                  disabled={submitting}
                  testID="register-submit-button"
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator color="#061A12" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Criar conta</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.replace("/")}
                  disabled={submitting}
                  testID="go-to-login"
                  style={styles.loginLink}
                >
                  <Text style={styles.loginText}>
                    Já tem conta? <Text style={styles.loginBold}>Entrar</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  backBtn: { paddingVertical: 8, alignSelf: "flex-start" },
  top: { paddingTop: 12, paddingBottom: 24 },
  headline: { color: "#FFF", fontSize: 32, fontWeight: "900", letterSpacing: -0.5, marginBottom: 8 },
  sub: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  subBold: { color: colors.primary, fontWeight: "800" },
  form: {},
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
    alignItems: "center", justifyContent: "center", marginTop: 6,
  },
  primaryBtnText: { color: "#061A12", fontWeight: "900", fontSize: 15, letterSpacing: 0.3 },
  loginLink: { alignItems: "center", marginTop: 16 },
  loginText: { color: colors.textSecondary, fontSize: 13 },
  loginBold: { color: colors.primary, fontWeight: "800" },
});
