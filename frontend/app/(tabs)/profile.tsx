import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "@/src/theme";
import { TopHeader } from "@/src/components/top-header";
import { AdBanner } from "@/src/components/ad-banner";
import { useAuth } from "@/src/contexts/auth-context";
import { api, BetResult } from "@/src/api";

export default function ProfileTab() {
  const { user, logout, token } = useAuth();
  const router = useRouter();
  const [bets, setBets] = useState<BetResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await api.getHistory(token);
        setBets(res.bets);
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const totalStaked = bets.reduce((a, b) => a + b.stake, 0);
  const totalWon = bets.reduce((a, b) => a + b.payout, 0);
  const wins = bets.filter((b) => b.won).length;

  return (
    <View style={styles.container}>
      <TopHeader />
      <AdBanner position="top" testID="profile-ad-top" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* User card */}
        <View style={styles.userCard} testID="profile-user-card">
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || "U"}</Text>
            </View>
          )}
          <Text style={styles.name} testID="profile-name">{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.balanceCard} testID="profile-balance">
            <Ionicons name="cash" size={18} color="#000" />
            <Text style={styles.balanceValue}>{user?.virtual_coins?.toLocaleString("pt-BR")}</Text>
            <Text style={styles.balanceLabel}>moedas virtuais</Text>
          </View>
          <TouchableOpacity style={styles.depositBtn} onPress={() => router.push("/deposit")} testID="profile-deposit">
            <Ionicons name="add-circle" size={18} color="#FFF" />
            <Text style={styles.depositText}>Depositar (simulado)</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{bets.length}</Text>
            <Text style={styles.statLabel}>Apostas</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{wins}</Text>
            <Text style={styles.statLabel}>Vitórias</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.accentRed }]}>-{totalStaked}</Text>
            <Text style={styles.statLabel}>Apostado</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>+{totalWon}</Text>
            <Text style={styles.statLabel}>Recebido</Text>
          </View>
        </View>

        {/* Awareness callout */}
        <TouchableOpacity
          style={styles.awarenessCard}
          onPress={() => router.push("/help")}
          testID="profile-help-card"
        >
          <View style={styles.awarenessIcon}>
            <Ionicons name="hand-left" size={22} color="#BFDBFE" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.awarenessTitle}>Buscar ajuda para vício</Text>
            <Text style={styles.awarenessText}>
              Recursos, contatos e informações confidenciais. 100% gratuito.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#BFDBFE" />
        </TouchableOpacity>

        {/* History */}
        <Text style={styles.sectionTitle}>Histórico de apostas</Text>
        {loading ? (
          <ActivityIndicator style={{ margin: 24 }} color={colors.primary} />
        ) : bets.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma aposta ainda</Text>
          </View>
        ) : (
          bets.map((b) => (
            <View key={b.bet_id} style={styles.betItem} testID={`bet-${b.bet_id}`}>
              <View style={[styles.betIcon, { backgroundColor: b.won ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }]}>
                <Ionicons
                  name={b.won ? "trending-up" : "trending-down"}
                  size={18}
                  color={b.won ? colors.primary : colors.accentRed}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.betLabel} numberOfLines={1}>{b.label || b.game.toUpperCase()}</Text>
                <Text style={styles.betMeta}>
                  {b.game.toUpperCase()} · Aposta {b.stake} · {b.multiplier.toFixed(2)}x
                </Text>
              </View>
              <Text style={[styles.betPayout, { color: b.won ? colors.primary : colors.accentRed }]}>
                {b.won ? `+${b.payout - b.stake}` : `-${b.stake}`}
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} testID="logout-btn">
          <Ionicons name="log-out-outline" size={18} color={colors.accentRed} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </ScrollView>
      <AdBanner position="bottom" testID="profile-ad-bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  userCard: { alignItems: "center", padding: 24, paddingBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: colors.primary },
  avatarFallback: { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFF", fontSize: 30, fontWeight: "900" },
  name: { color: "#FFF", fontSize: 18, fontWeight: "800", marginTop: 10 },
  email: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  balanceCard: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 6, marginTop: 14,
  },
  balanceValue: { color: "#000", fontWeight: "900", fontSize: 22, letterSpacing: -0.5 },
  balanceLabel: { color: "#000", fontSize: 11, fontWeight: "700", opacity: 0.7 },
  depositBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.accentRed,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 6, marginTop: 8,
  },
  depositText: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  stats: {
    flexDirection: "row",
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  statLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 0.3, marginTop: 2, textTransform: "uppercase" },
  awarenessCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    backgroundColor: "rgba(30,58,138,0.35)",
    borderColor: "rgba(59,130,246,0.4)",
    borderWidth: 1,
    borderRadius: 10,
  },
  awarenessIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "rgba(191,219,254,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  awarenessTitle: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  awarenessText: { color: colors.awarenessText, fontSize: 12, marginTop: 2, lineHeight: 16 },
  sectionTitle: { color: "#FFF", fontSize: 14, fontWeight: "900", letterSpacing: 0.5, paddingHorizontal: 16, marginTop: 22, marginBottom: 8, textTransform: "uppercase" },
  empty: { alignItems: "center", padding: 32, gap: 10 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  betItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 6,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  betIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  betLabel: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  betMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  betPayout: { fontSize: 15, fontWeight: "900" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginHorizontal: 16, marginTop: 24,
    paddingVertical: 12,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.4)",
    borderRadius: 8,
  },
  logoutText: { color: colors.accentRed, fontWeight: "800", fontSize: 14 },
});
