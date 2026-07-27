import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/theme";

const RESOURCES = [
  {
    id: "cvv",
    title: "CVV - Centro de Valorização da Vida",
    subtitle: "Apoio emocional gratuito, 24h, sigiloso",
    action: "Ligar 188",
    onPress: () => Linking.openURL("tel:188"),
    url: null,
    icon: "call" as const,
    color: "#22C55E",
  },
  {
    id: "chat",
    title: "CVV Chat Online",
    subtitle: "Converse por texto se preferir",
    action: "Abrir chat",
    onPress: () => Linking.openURL("https://www.cvv.org.br/chat/"),
    url: "cvv.org.br/chat",
    icon: "chatbubble" as const,
    color: "#3B82F6",
  },
  {
    id: "gaa",
    title: "Jogadores Anônimos (GA)",
    subtitle: "Grupo de apoio para dependência em jogo",
    action: "Ver reuniões",
    onPress: () => Linking.openURL("https://jogadoresanonimos.com.br/"),
    url: "jogadoresanonimos.com.br",
    icon: "people" as const,
    color: "#F59E0B",
  },
  {
    id: "saude",
    title: "SUS - Ligue 132",
    subtitle: "Rede pública de saúde mental (CAPS)",
    action: "Ligar 132",
    onPress: () => Linking.openURL("tel:132"),
    url: null,
    icon: "medkit" as const,
    color: "#EF4444",
  },
];

const FACTS = [
  {
    title: "As casas de apostas SEMPRE ganham no longo prazo",
    body: "Cada jogo tem uma vantagem matemática (house edge) programada. Você pode ganhar em curto prazo, mas quanto mais joga, mais próximo chega da perda garantida.",
  },
  {
    title: "O vício em apostas é uma doença reconhecida",
    body: "A OMS classifica como transtorno mental (CID-11). Não é falta de força de vontade. Tratamento existe e funciona.",
  },
  {
    title: "Sinais de alerta",
    body: "Apostar mais do que planejou · Mentir sobre quanto joga · Pedir dinheiro emprestado para apostar · Perseguir perdas · Sentir-se irritado ao tentar parar.",
  },
];

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="help-back">
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BUSCAR AJUDA</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.heroBox}>
          <View style={styles.heroIcon}>
            <Ionicons name="heart" size={32} color="#BFDBFE" />
          </View>
          <Text style={styles.heroTitle}>Você não está sozinho</Text>
          <Text style={styles.heroText}>
            O vício em apostas é tratável. Milhões de pessoas em todo o mundo estão em recuperação.
            Este primeiro passo já é um enorme progresso.
          </Text>
        </View>

        <Text style={styles.section}>Ajuda imediata</Text>
        {RESOURCES.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.resourceCard}
            onPress={r.onPress}
            testID={`resource-${r.id}`}
          >
            <View style={[styles.resourceIcon, { backgroundColor: r.color + "22", borderColor: r.color }]}>
              <Ionicons name={r.icon} size={22} color={r.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resourceTitle}>{r.title}</Text>
              <Text style={styles.resourceSub}>{r.subtitle}</Text>
              {r.url && <Text style={styles.resourceUrl}>{r.url}</Text>}
            </View>
            <View style={[styles.resourceAction, { borderColor: r.color }]}>
              <Text style={[styles.resourceActionText, { color: r.color }]}>{r.action}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.section}>Entenda o vício</Text>
        {FACTS.map((f, i) => (
          <View key={i} style={styles.factCard} testID={`fact-${i}`}>
            <Text style={styles.factTitle}>{f.title}</Text>
            <Text style={styles.factBody}>{f.body}</Text>
          </View>
        ))}

        <View style={styles.finalBox}>
          <Text style={styles.finalTitle}>Lembre-se</Text>
          <Text style={styles.finalText}>
            Este app é uma <Text style={{ color: colors.primary, fontWeight: "800" }}>simulação</Text> feita para dar o "rush" das apostas sem consequências reais.
            Se você chegou aqui é porque está buscando mudança. Isso é coragem.
          </Text>
        </View>
      </ScrollView>
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
  heroBox: {
    backgroundColor: "rgba(30,58,138,0.35)",
    borderColor: "rgba(59,130,246,0.5)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  heroIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(191,219,254,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  heroTitle: { color: "#FFF", fontSize: 20, fontWeight: "900", marginBottom: 6 },
  heroText: { color: colors.awarenessText, fontSize: 13, textAlign: "center", lineHeight: 18 },
  section: {
    color: "#FFF", fontSize: 13, fontWeight: "900",
    letterSpacing: 0.5, textTransform: "uppercase",
    marginTop: 22, marginBottom: 8,
  },
  resourceCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  resourceIcon: {
    width: 44, height: 44, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  resourceTitle: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  resourceSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 15 },
  resourceUrl: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  resourceAction: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 4, borderWidth: 1,
  },
  resourceActionText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  factCard: {
    backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 8,
  },
  factTitle: { color: "#FFF", fontSize: 13, fontWeight: "800", marginBottom: 6 },
  factBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  finalBox: {
    marginTop: 22,
    padding: 18,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.4)", borderWidth: 1,
    borderRadius: 10,
  },
  finalTitle: { color: colors.primary, fontWeight: "900", fontSize: 14, marginBottom: 6, letterSpacing: 0.5 },
  finalText: { color: "#FFF", fontSize: 13, lineHeight: 19 },
});
