import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/theme";
import { AdBanner } from "@/src/components/ad-banner";
import { useAuth } from "@/src/contexts/auth-context";
import { api, BetResult } from "@/src/api";

const GAME_META: Record<string, { label: string; icon: any; color: string }> = {
  sports: { label: "Esportes", icon: "football", color: "#22C55E" },
  crash: { label: "Crash", icon: "rocket", color: "#EF4444" },
  slots: { label: "Slots", icon: "dice", color: "#F59E0B" },
};

const FILTERS: Array<{ id: "all" | "sports" | "crash" | "slots"; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "sports", label: "Esportes" },
  { id: "crash", label: "Crash" },
  { id: "slots", label: "Slots" },
];

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function StatsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [bets, setBets] = useState<BetResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sports" | "crash" | "slots">("all");

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

  const filtered = useMemo(
    () => (filter === "all" ? bets : bets.filter((b) => b.game === filter)),
    [bets, filter]
  );

  // Global stats (all bets, ignore filter)
  const totalStaked = bets.reduce((a, b) => a + b.stake, 0);
  const totalReceived = bets.reduce((a, b) => a + b.payout, 0);
  const net = totalReceived - totalStaked;
  const wins = bets.filter((b) => b.won).length;
  const losses = bets.length - wins;
  const winRate = bets.length > 0 ? Math.round((wins / bets.length) * 100) : 0;

  // Per-game breakdown
  const perGame = useMemo(() => {
    const out: Record<string, { count: number; staked: number; received: number; wins: number }> = {
      sports: { count: 0, staked: 0, received: 0, wins: 0 },
      crash: { count: 0, staked: 0, received: 0, wins: 0 },
      slots: { count: 0, staked: 0, received: 0, wins: 0 },
    };
    for (const b of bets) {
      const g = out[b.game];
      if (!g) continue;
      g.count += 1;
      g.staked += b.stake;
      g.received += b.payout;
      if (b.won) g.wins += 1;
    }
    return out;
  }, [bets]);

  const biggestWin = useMemo(() => {
    if (bets.length === 0) return null;
    return bets.reduce(
      (best, b) => (b.payout - b.stake > (best.payout - best.stake) ? b : best),
      bets[0]
    );
  }, [bets]);
  const biggestLoss = useMemo(() => {
    const losing = bets.filter((b) => !b.won);
    if (losing.length === 0) return null;
    return losing.reduce((worst, b) => (b.stake > worst.stake ? b : worst), losing[0]);
  }, [bets]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="stats-back">
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ESTATÍSTICAS</Text>
        <View style={{ width: 36 }} />
      </View>

      <AdBanner position="top" testID="stats-ad-top" />

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {loading ? (
          <ActivityIndicator style={{ margin: 60 }} color={colors.primary} />
        ) : bets.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="stats-chart" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma aposta ainda</Text>
            <Text style={styles.emptyText}>
              Faça sua primeira aposta para ver suas estatísticas aqui.
            </Text>
          </View>
        ) : (
          <>
            {/* Big net card */}
            <View
              style={[styles.netCard, { borderColor: net >= 0 ? colors.primary : colors.accentRed }]}
              testID="stats-net-card"
            >
              <Text style={styles.netLabel}>Saldo total do jogo</Text>
              <Text
                style={[styles.netValue, { color: net >= 0 ? colors.primary : colors.accentRed }]}
                testID="stats-net-value"
              >
                {net >= 0 ? "+" : ""}{net.toLocaleString("pt-BR")}
              </Text>
              <Text style={styles.netSub}>
                {net >= 0 ? "Está no lucro (virtual)" : "Está no prejuízo (virtual)"}
              </Text>
              <View style={styles.netMetaRow}>
                <View style={styles.netMeta}>
                  <Text style={[styles.netMetaValue, { color: colors.accentRed }]}>
                    -{totalStaked.toLocaleString("pt-BR")}
                  </Text>
                  <Text style={styles.netMetaLabel}>Apostado</Text>
                </View>
                <View style={styles.netMetaDivider} />
                <View style={styles.netMeta}>
                  <Text style={[styles.netMetaValue, { color: colors.primary }]}>
                    +{totalReceived.toLocaleString("pt-BR")}
                  </Text>
                  <Text style={styles.netMetaLabel}>Recebido</Text>
                </View>
              </View>
            </View>

            {/* Awareness callout when negative */}
            {net < 0 && (
              <View style={styles.awarenessCard}>
                <Ionicons name="information-circle" size={18} color="#BFDBFE" />
                <Text style={styles.awarenessText}>
                  Se este fosse dinheiro real, você teria perdido {Math.abs(net).toLocaleString("pt-BR")} reais.
                  A matemática das casas de apostas é feita para isso.
                </Text>
              </View>
            )}

            {/* Overall stats grid */}
            <View style={styles.statsGrid}>
              <StatBox label="Jogadas" value={bets.length.toString()} />
              <StatBox label="Vitórias" value={wins.toString()} color={colors.primary} />
              <StatBox label="Derrotas" value={losses.toString()} color={colors.accentRed} />
              <StatBox label="Taxa vitórias" value={`${winRate}%`} />
            </View>

            {/* Per-game breakdown */}
            <Text style={styles.section}>Por jogo</Text>
            {Object.entries(perGame).map(([game, s]) => {
              if (s.count === 0) return null;
              const meta = GAME_META[game];
              const gameNet = s.received - s.staked;
              return (
                <View key={game} style={styles.gameCard} testID={`game-stats-${game}`}>
                  <View style={[styles.gameIcon, { backgroundColor: meta.color + "22", borderColor: meta.color }]}>
                    <Ionicons name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gameLabel}>{meta.label}</Text>
                    <Text style={styles.gameMeta}>
                      {s.count} jogadas · {s.wins} vitórias · aposta {s.staked}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.gameNet,
                      { color: gameNet >= 0 ? colors.primary : colors.accentRed },
                    ]}
                  >
                    {gameNet >= 0 ? "+" : ""}{gameNet}
                  </Text>
                </View>
              );
            })}

            {/* Records */}
            {(biggestWin || biggestLoss) && (
              <>
                <Text style={styles.section}>Recordes</Text>
                {biggestWin && biggestWin.won && (
                  <View style={[styles.recordCard, { borderColor: colors.primary }]}>
                    <Ionicons name="trending-up" size={22} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.recordLabel}>Maior ganho</Text>
                      <Text style={styles.recordSub} numberOfLines={1}>
                        {biggestWin.label || biggestWin.game.toUpperCase()} · {biggestWin.multiplier.toFixed(2)}x
                      </Text>
                    </View>
                    <Text style={[styles.recordValue, { color: colors.primary }]}>
                      +{biggestWin.payout - biggestWin.stake}
                    </Text>
                  </View>
                )}
                {biggestLoss && (
                  <View style={[styles.recordCard, { borderColor: colors.accentRed }]}>
                    <Ionicons name="trending-down" size={22} color={colors.accentRed} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.recordLabel}>Maior perda</Text>
                      <Text style={styles.recordSub} numberOfLines={1}>
                        {biggestLoss.label || biggestLoss.game.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.recordValue, { color: colors.accentRed }]}>
                      -{biggestLoss.stake}
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* History with filters */}
            <Text style={styles.section}>Histórico completo</Text>
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
                  onPress={() => setFilter(f.id)}
                  testID={`filter-${f.id}`}
                >
                  <Text
                    style={[styles.filterText, filter === f.id && styles.filterTextActive]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filtered.length === 0 ? (
              <Text style={styles.emptyFilter}>Sem apostas neste filtro.</Text>
            ) : (
              filtered.map((b) => {
                const meta = GAME_META[b.game];
                const delta = b.won ? b.payout - b.stake : -b.stake;
                return (
                  <View key={b.bet_id} style={styles.betItem} testID={`stats-bet-${b.bet_id}`}>
                    <View
                      style={[
                        styles.betIcon,
                        { backgroundColor: meta.color + "22", borderColor: meta.color },
                      ]}
                    >
                      <Ionicons name={meta.icon} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.betLabel} numberOfLines={1}>
                        {b.label || meta.label}
                      </Text>
                      <Text style={styles.betMeta}>
                        {meta.label} · aposta {b.stake} · {b.multiplier.toFixed(2)}x · {formatDate(b.created_at)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.betDelta,
                        { color: delta >= 0 ? colors.primary : colors.accentRed },
                      ]}
                    >
                      {delta >= 0 ? "+" : ""}{delta}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <AdBanner position="bottom" testID="stats-ad-bottom" />
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statBoxValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderRadius: 8, backgroundColor: colors.surface,
  },
  headerTitle: { color: "#FFF", fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  empty: { alignItems: "center", padding: 60, gap: 12 },
  emptyTitle: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  emptyText: { color: colors.textSecondary, fontSize: 13, textAlign: "center" },
  netCard: {
    margin: 16,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  netLabel: {
    color: colors.textSecondary, fontSize: 11, fontWeight: "700",
    letterSpacing: 0.5, textTransform: "uppercase",
  },
  netValue: { fontSize: 42, fontWeight: "900", letterSpacing: -1, marginTop: 4 },
  netSub: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  netMetaRow: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: "100%",
    alignItems: "center",
  },
  netMeta: { flex: 1, alignItems: "center" },
  netMetaValue: { fontSize: 18, fontWeight: "900" },
  netMetaLabel: {
    color: colors.textSecondary, fontSize: 10, fontWeight: "700",
    letterSpacing: 0.3, marginTop: 2, textTransform: "uppercase",
  },
  netMetaDivider: { width: 1, height: 30, backgroundColor: colors.border },
  awarenessCard: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    marginHorizontal: 16, marginBottom: 4,
    padding: 12,
    backgroundColor: "rgba(30,58,138,0.35)",
    borderColor: "rgba(59,130,246,0.4)", borderWidth: 1,
    borderRadius: 8,
  },
  awarenessText: { color: colors.awarenessText, fontSize: 12, flex: 1, lineHeight: 16 },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16, marginTop: 12,
  },
  statBox: {
    width: "48%",
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
  },
  statBoxValue: { color: "#FFF", fontSize: 22, fontWeight: "900" },
  statBoxLabel: {
    color: colors.textSecondary, fontSize: 10, fontWeight: "700",
    letterSpacing: 0.3, marginTop: 4, textTransform: "uppercase",
  },
  section: {
    color: "#FFF", fontSize: 13, fontWeight: "900",
    letterSpacing: 0.5, textTransform: "uppercase",
    paddingHorizontal: 16, marginTop: 24, marginBottom: 8,
  },
  gameCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 6, padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  gameIcon: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  gameLabel: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  gameMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  gameNet: { fontSize: 17, fontWeight: "900" },
  recordCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 8, padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1,
  },
  recordLabel: {
    color: colors.textSecondary, fontSize: 10, fontWeight: "700",
    letterSpacing: 0.5, textTransform: "uppercase",
  },
  recordSub: { color: "#FFF", fontSize: 12, marginTop: 2 },
  recordValue: { fontSize: 18, fontWeight: "900" },
  filterRow: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  filterChip: {
    height: 32, paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  filterChipActive: { borderColor: colors.primary, backgroundColor: "rgba(34,197,94,0.15)" },
  filterText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  filterTextActive: { color: colors.primary },
  emptyFilter: {
    color: colors.textMuted, fontSize: 12, textAlign: "center", padding: 24,
  },
  betItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginTop: 6, padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  betIcon: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  betLabel: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  betMeta: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  betDelta: { fontSize: 14, fontWeight: "900" },
});
