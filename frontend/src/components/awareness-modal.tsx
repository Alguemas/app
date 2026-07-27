import React, { useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  variant?: "loss" | "win" | "long-session" | "deposit";
};

const messages: Record<string, { title: string; body: string }> = {
  loss: {
    title: "Respira. Isto é uma simulação.",
    body: "Se estivesse a jogar a sério, teria perdido dinheiro real. O vício em apostas tem tratamento. Não está sozinho.",
  },
  win: {
    title: "Ganhou moedas virtuais... e agora?",
    body: "As casas de apostas foram desenhadas para te dar pequenas vitórias que puxam para as grandes perdas. A matemática do jogo é sempre contra si.",
  },
  "long-session": {
    title: "Está a jogar há muito tempo",
    body: "Que tal uma pausa? Ligue 188 (CVV) para conversar. É gratuito, sigiloso e disponível 24h.",
  },
  deposit: {
    title: "Foi apenas uma simulação",
    body: "Se este fosse um depósito real, esse dinheiro já não seria seu. Reconhece o padrão? Peça ajuda: 188 (CVV).",
  },
};

export function AwarenessModal({ visible, onClose, variant = "loss" }: Props) {
  const msg = messages[variant];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="awareness-modal"
    >
      <View style={styles.overlay}>
        <View style={styles.card} testID="awareness-card">
          <View style={styles.iconWrap}>
            <Ionicons name="heart" size={28} color="#BFDBFE" />
          </View>
          <Text style={styles.title} testID="awareness-title">{msg.title}</Text>
          <Text style={styles.body}>{msg.body}</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Linking.openURL("tel:188")}
            testID="awareness-call-188"
          >
            <Ionicons name="call" size={18} color="#0B1E3A" />
            <Text style={styles.primaryBtnText}>Ligar 188 (CVV)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onClose}
            testID="awareness-close"
          >
            <Text style={styles.secondaryBtnText}>Continuar jogando</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.awarenessBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.awarenessBorder,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(191,219,254,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  body: {
    color: colors.awarenessText,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#BFDBFE",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: "100%",
    marginBottom: 10,
  },
  primaryBtnText: { color: "#0B1E3A", fontWeight: "800", fontSize: 15 },
  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { color: colors.awarenessText, fontSize: 13, opacity: 0.7 },
});
