import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/theme";
import { AwarenessModal } from "@/src/components/awareness-modal";
import { useAuth } from "@/src/contexts/auth-context";
import { api } from "@/src/api";

const AMOUNTS = [50, 100, 200, 500];

function formatCard(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(" ") || "";
}
function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function DepositScreen() {
  const router = useRouter();
  const { token, user, setBalance } = useAuth();
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [card, setCard] = useState("");
  const [holder, setHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aware, setAware] = useState(false);

  const finalAmount = customAmount ? parseInt(customAmount, 10) || amount : amount;

  const handleSubmit = async () => {
    if (!token || !card || !holder || !expiry || !cvv) return;
    setLoading(true);
    // CRITICAL: card data is NEVER sent to backend. We simulate a delay and just send amount.
    setTimeout(async () => {
      try {
        const res = await api.deposit(token, { amount: finalAmount });
        setBalance(res.virtual_coins);
        // Wipe card data locally (defense-in-depth)
        setCard(""); setHolder(""); setExpiry(""); setCvv("");
        setLoading(false);
        setSuccess(true);
        setTimeout(() => setAware(true), 900);
      } catch (e) {
        setLoading(false);
      }
    }, 1400);
  };

  const canSubmit = card.replace(/\s/g, "").length >= 13 && holder.length > 1 && expiry.length === 5 && cvv.length >= 3 && finalAmount > 0;

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.successBox}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color="#000" />
          </View>
          <Text style={styles.successTitle}>Depósito simulado</Text>
          <Text style={styles.successAmount}>+{finalAmount} moedas</Text>
          <Text style={styles.successSub}>Saldo atualizado: {user?.virtual_coins}</Text>
          <View style={styles.warnBox}>
            <Ionicons name="shield-checkmark" size={16} color="#BFDBFE" />
            <Text style={styles.warnText}>
              Os dados do cartão foram descartados. Nada foi salvo. Nenhuma transação real ocorreu.
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} testID="deposit-close">
            <Text style={styles.closeBtnText}>Voltar ao app</Text>
          </TouchableOpacity>
        </View>
        <AwarenessModal visible={aware} onClose={() => setAware(false)} variant="deposit" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="deposit-back">
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>DEPOSITAR</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Sim warning */}
          <View style={styles.simBanner} testID="deposit-sim-banner">
            <Ionicons name="warning" size={16} color={colors.accentYellow} />
            <Text style={styles.simText}>
              <Text style={{ fontWeight: "800" }}>SIMULAÇÃO.</Text> Nenhuma transação real. Dados do cartão são descartados.
            </Text>
          </View>

          <Text style={styles.label}>Escolha o valor</Text>
          <View style={styles.amountRow}>
            {AMOUNTS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.amountBtn, amount === a && !customAmount && styles.amountBtnActive]}
                onPress={() => { setAmount(a); setCustomAmount(""); }}
                testID={`deposit-amount-${a}`}
              >
                <Text style={styles.amountCurrency}>R$</Text>
                <Text style={[styles.amountValue, amount === a && !customAmount && { color: "#000" }]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.customAmount}
            placeholder="Outro valor"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={customAmount}
            onChangeText={(v) => setCustomAmount(v.replace(/\D/g, "").slice(0, 5))}
            testID="deposit-custom-amount"
          />

          <Text style={[styles.label, { marginTop: 20 }]}>Cartão de crédito</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Número do cartão</Text>
            <TextInput
              style={styles.input}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={card}
              onChangeText={(v) => setCard(formatCard(v))}
              testID="deposit-card-number"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nome no cartão</Text>
            <TextInput
              style={styles.input}
              placeholder="Como impresso no cartão"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              value={holder}
              onChangeText={setHolder}
              testID="deposit-card-holder"
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Validade</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/AA"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={expiry}
                onChangeText={(v) => setExpiry(formatExpiry(v))}
                testID="deposit-expiry"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>CVV</Text>
              <TextInput
                style={styles.input}
                placeholder="000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={cvv}
                onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
                testID="deposit-cvv"
              />
            </View>
          </View>

          <View style={styles.securityRow}>
            <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
            <Text style={styles.securityText}>Este formulário não envia seus dados. Nada é salvo.</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit || loading) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            testID="deposit-submit"
          >
            {loading ? <ActivityIndicator color="#000" /> : (
              <>
                <Ionicons name="lock-closed" size={16} color="#000" />
                <Text style={styles.submitText}>DEPOSITAR R$ {finalAmount}</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Ao apertar "Depositar" você recebe apenas moedas virtuais para uso no app.
            Você não é cobrado em nada. Este app é uma ferramenta contra o vício em apostas.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: colors.surface },
  headerTitle: { color: "#FFF", fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  simBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 10, borderRadius: 6,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.5)", borderWidth: 1,
    marginBottom: 20,
  },
  simText: { color: colors.accentYellow, fontSize: 11, flex: 1, lineHeight: 15 },
  label: { color: "#FFF", fontSize: 13, fontWeight: "800", letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" },
  amountRow: { flexDirection: "row", gap: 8 },
  amountBtn: {
    flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 6, borderWidth: 1, borderColor: colors.border,
  },
  amountBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  amountCurrency: { color: colors.textSecondary, fontSize: 10, fontWeight: "700" },
  amountValue: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  customAmount: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 6, borderWidth: 1, borderColor: colors.border,
    color: "#FFF", padding: 12, fontSize: 14,
  },
  field: { marginTop: 12 },
  fieldRow: { flexDirection: "row", gap: 10 },
  fieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", marginBottom: 6, letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 6, borderWidth: 1, borderColor: colors.border,
    color: "#FFF", padding: 12, fontSize: 14,
  },
  securityRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  securityText: { color: colors.textSecondary, fontSize: 11 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 6, marginTop: 20,
  },
  submitText: { color: "#000", fontWeight: "900", fontSize: 14, letterSpacing: 0.5 },
  disclaimer: { color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 15 },
  successBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  successCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  successTitle: { color: "#FFF", fontSize: 22, fontWeight: "900" },
  successAmount: { color: colors.primary, fontSize: 36, fontWeight: "900", marginTop: 6 },
  successSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  warnBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginTop: 22, padding: 12,
    backgroundColor: "rgba(30,58,138,0.35)",
    borderColor: "rgba(59,130,246,0.4)", borderWidth: 1,
    borderRadius: 8,
  },
  warnText: { color: colors.awarenessText, fontSize: 12, flex: 1, lineHeight: 16 },
  closeBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  closeBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});
