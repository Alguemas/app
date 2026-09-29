import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme";
import { TopHeader } from "@/src/components/top-header";
import { AdBanner } from "@/src/components/ad-banner";
import { AdInterstitial } from "@/src/components/ad-interstitial";
import { AwarenessModal } from "@/src/components/awareness-modal";
import { api } from "@/src/api";
import { useAuth } from "@/src/contexts/auth-context";
import { bumpPlayCounterAndShouldShowAd } from "@/src/utils/play-counter";

type Match = {
  id: string;
  league: string;
  home: string;
  away: string;
  time: string;
  odds: { home: number; draw: number; away: number };
};

type Selection = { matchId: string; pick: "home" | "draw" | "away"; label: string; odds: number };

const CATEGORIES = ["Todos", "Brasileirão", "Premier League", "La Liga", "NBA", "Libertadores"];
const STAKES = [10, 25, 50, 100];

export default function SportsTab() {
  const { token, setBalance, user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [category, setCategory] = useState("Todos");
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [stake, setStake] = useState(10);
  const [placing, setPlacing] = useState(false);
  const [ad, setAd] = useState<{ open: boolean; payout: number }>({ open: false, payout: 0 });
  const [aware, setAware] = useState<{ open: boolean; variant: "loss" | "win" }>({ open: false, variant: "loss" });
  const [placedCount, setPlacedCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getMatches();
        setMatches(res.matches);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return category === "Todos" ? matches : matches.filter((m) => m.league === category);
  }, [matches, category]);

  const selectionList = Object.values(selections);
  const totalOdds = selectionList.reduce((acc, s) => acc * s.odds, 1);
  const potentialPayout = Math.floor(stake * totalOdds);

  const togglePick = (m: Match, pick: "home" | "draw" | "away") => {
    setSelections((s) => {
      const next = { ...s };
      const label =
        pick === "home" ? m.home : pick === "away" ? m.away : "Empate";
      const odds = m.odds[pick];
      if (next[m.id] && next[m.id].pick === pick) {
        delete next[m.id];
      } else {
        next[m.id] = { matchId: m.id, pick, label: `${m.home} vs ${m.away} · ${label}`, odds };
      }
      return next;
    });
  };

  const placeBet = async () => {
    if (!token || selectionList.length === 0) return;
    if (stake > (user?.virtual_coins ?? 0)) {
      setAware({ open: true, variant: "loss" });
      return;
    }
    setPlacing(true);
    try {
      // Simulate settlement: win chance decreases with more selections & higher odds
      const winChance = 1 / totalOdds * 0.85;
      const won = Math.random() < winChance;
      const multiplier = won ? totalOdds : 0;
      const label = selectionList.map((s) => s.label.split(" · ")[1]).join(" + ");
      const res = await api.placeBet(token, {
        game: "sports",
        stake,
        multiplier,
        label: `Multipla (${selectionList.length}) - ${label}`,
      });
      setBalance(res.new_balance);
      setSelections({});
      setPlacedCount((c) => c + 1);
      const showAd = await bumpPlayCounterAndShouldShowAd();
      if (showAd) {
        setAd({ open: true, payout: res.won ? res.payout : 0 });
      } else if (!res.won && (placedCount + 1) % 3 === 0) {
        setAware({ open: true, variant: "loss" });
      }
    } catch (e: any) {
      console.warn("Bet error", e.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopHeader />
      <AdBanner position="top" testID="sports-ad-top" />

      {/* Categories chip row */}
      <View style={styles.categoriesRow} testID="sports-categories">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
              testID={`chip-${c}`}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: selectionList.length ? 220 : 24 }}>
        {filtered.length === 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        {filtered.map((m) => {
          const sel = selections[m.id];
          return (
            <View key={m.id} style={styles.matchCard} testID={`match-${m.id}`}>
              <View style={styles.matchHeader}>
                <Text style={styles.league}>{m.league}</Text>
                <Text style={styles.time}>{m.time}</Text>
              </View>
              <View style={styles.teams}>
                <Text style={styles.team}>{m.home}</Text>
                <Text style={styles.vs}>vs</Text>
                <Text style={styles.team}>{m.away}</Text>
              </View>
              <View style={styles.oddsRow}>
                <OddsBox
                  label="Casa"
                  odds={m.odds.home}
                  active={sel?.pick === "home"}
                  onPress={() => togglePick(m, "home")}
                  testID={`odds-${m.id}-home`}
                />
                <OddsBox
                  label="Empate"
                  odds={m.odds.draw}
                  active={sel?.pick === "draw"}
                  disabled={m.odds.draw === 0}
                  onPress={() => togglePick(m, "draw")}
                  testID={`odds-${m.id}-draw`}
                />
                <OddsBox
                  label="Fora"
                  odds={m.odds.away}
                  active={sel?.pick === "away"}
                  onPress={() => togglePick(m, "away")}
                  testID={`odds-${m.id}-away`}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bet slip */}
      {selectionList.length > 0 && (
        <View style={styles.betSlip} testID="bet-slip">
          <View style={styles.slipHeader}>
            <Text style={styles.slipTitle}>
              Boletim · {selectionList.length} seleç{selectionList.length > 1 ? "ões" : "ão"}
            </Text>
            <Text style={styles.slipOdds}>Odds: {totalOdds.toFixed(2)}x</Text>
          </View>
          <View style={styles.stakeRow}>
            {STAKES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.stakeChip, stake === s && styles.stakeChipActive]}
                onPress={() => setStake(s)}
                testID={`stake-${s}`}
              >
                <Text style={[styles.stakeText, stake === s && styles.stakeTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.slipFooter}>
            <View>
              <Text style={styles.slipHint}>Aposta {stake} · Ganho possível</Text>
              <Text style={styles.slipPayout}>{potentialPayout} moedas</Text>
            </View>
            <TouchableOpacity
              style={[styles.placeBtn, placing && { opacity: 0.6 }]}
              onPress={placeBet}
              disabled={placing}
              testID="place-bet-btn"
            >
              {placing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.placeBtnText}>APOSTAR</Text>
                  <Ionicons name="arrow-forward" size={16} color="#000" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <AdBanner position="bottom" testID="sports-ad-bottom" />

      <AdInterstitial
        visible={ad.open}
        onClose={() => setAd({ open: false, payout: 0 })}
        payout={ad.payout}
      />
      <AwarenessModal
        visible={aware.open}
        onClose={() => setAware({ ...aware, open: false })}
        variant={aware.variant}
      />
    </View>
  );
}

function OddsBox({ label, odds, active, disabled, onPress, testID }: any) {
  return (
    <TouchableOpacity
      style={[styles.oddsBox, active && styles.oddsBoxActive, disabled && { opacity: 0.35 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      testID={testID}
    >
      <Text style={[styles.oddsLabel, active && { color: "#000" }]}>{label}</Text>
      <Text style={[styles.oddsValue, active && { color: "#000" }]}>
        {odds === 0 ? "-" : odds.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  categoriesRow: {
    height: 56,
    backgroundColor: "#0A0F0C",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: "center",
  },
  chipsContent: { paddingHorizontal: 12, gap: 8, alignItems: "center" },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: "rgba(34,197,94,0.12)" },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  chipTextActive: { color: colors.primary },
  matchCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  league: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  time: { color: colors.accentYellow, fontSize: 11, fontWeight: "700" },
  teams: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 },
  team: { color: "#FFF", fontSize: 15, fontWeight: "700", flex: 1, textAlign: "center" },
  vs: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  oddsRow: { flexDirection: "row", gap: 6 },
  oddsBox: {
    flex: 1,
    height: 52,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  oddsBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  oddsLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  oddsValue: { color: "#FFF", fontSize: 18, fontWeight: "800", marginTop: 2 },
  betSlip: {
    position: "absolute",
    left: 12, right: 12, bottom: 68,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  slipHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  slipTitle: { color: "#FFF", fontWeight: "800", fontSize: 13 },
  slipOdds: { color: colors.primary, fontWeight: "800", fontSize: 13 },
  stakeRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  stakeChip: {
    flex: 1, height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  stakeChipActive: { borderColor: colors.primary, backgroundColor: "rgba(34,197,94,0.15)" },
  stakeText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  stakeTextActive: { color: colors.primary },
  slipFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  slipHint: { color: colors.textSecondary, fontSize: 10, fontWeight: "600" },
  slipPayout: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  placeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 4,
  },
  placeBtnText: { color: "#000", fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
});
