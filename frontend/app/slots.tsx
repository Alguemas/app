import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/theme";
import { AdBanner } from "@/src/components/ad-banner";
import { AdInterstitial } from "@/src/components/ad-interstitial";
import { AwarenessModal } from "@/src/components/awareness-modal";
import { useAuth } from "@/src/contexts/auth-context";
import { api } from "@/src/api";

const SYMBOLS = ["🍒", "🍋", "⭐", "💎", "🔔", "7️⃣"];
const STAKES = [10, 25, 50, 100];

function spinReel(): string {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

export default function SlotsScreen() {
  const router = useRouter();
  const { token, user, setBalance } = useAuth();
  const [stake, setStake] = useState(10);
  const [reels, setReels] = useState(["🍒", "🍋", "⭐"]);
  const [spinning, setSpinning] = useState(false);
  const [ad, setAd] = useState<{ open: boolean; payout: number }>({ open: false, payout: 0 });
  const [aware, setAware] = useState(false);
  const [lossStreak, setLossStreak] = useState(0);
  const [lastResult, setLastResult] = useState<null | { won: boolean; payout: number }>(null);

  const spin = async () => {
    if (!token || spinning) return;
    if (stake > (user?.virtual_coins ?? 0)) {
      setAware(true);
      return;
    }
    setSpinning(true);
    setLastResult(null);

    // Animate reels rapidly
    let count = 0;
    const anim = setInterval(() => {
      setReels([spinReel(), spinReel(), spinReel()]);
      count++;
      if (count >= 15) clearInterval(anim);
    }, 60);

    // Determine result (biased toward losing)
    setTimeout(async () => {
      const roll = Math.random();
      let final: string[];
      let multiplier: number;
      if (roll < 0.05) {
        // JACKPOT - all 7s
        final = ["7️⃣", "7️⃣", "7️⃣"];
        multiplier = 20;
      } else if (roll < 0.18) {
        // Three matching
        const s = SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1))];
        final = [s, s, s];
        multiplier = 5;
      } else if (roll < 0.35) {
        // Two matching first
        const s = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        let d = spinReel();
        while (d === s) d = spinReel();
        final = [s, s, d];
        multiplier = 1.5;
      } else {
        final = [spinReel(), spinReel(), spinReel()];
        // Force no match
        while (final[0] === final[1] && final[1] === final[2]) {
          final = [spinReel(), spinReel(), spinReel()];
        }
        multiplier = 0;
      }
      setReels(final);
      try {
        const res = await api.placeBet(token, {
          game: "slots",
          stake,
          multiplier,
          label: `Slots · ${final.join(" ")}`,
        });
        setBalance(res.new_balance);
        setLastResult({ won: res.won, payout: res.payout });
        if (res.won) {
          setLossStreak(0);
          setAd({ open: true, payout: res.payout });
        } else {
          const streak = lossStreak + 1;
          setLossStreak(streak);
          if (streak >= 4) {
            setAware(true);
            setLossStreak(0);
          }
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setSpinning(false);
      }
    }, 950);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SLOTS</Text>
          <View style={styles.balancePill}>
            <Ionicons name="cash" size={14} color="#000" />
            <Text style={styles.balanceText}>{user?.virtual_coins}</Text>
          </View>
        </View>

        <AdBanner position="top" testID="slots-ad-top" />

        <View style={styles.machine} testID="slots-machine">
          <View style={styles.reelsContainer}>
            {reels.map((s, i) => (
              <View key={i} style={styles.reel} testID={`reel-${i}`}>
                <Text style={styles.symbol}>{s}</Text>
              </View>
            ))}
          </View>

          {lastResult && !spinning && (
            <View style={[styles.resultBanner, { backgroundColor: lastResult.won ? colors.primary : colors.accentRed }]}>
              <Text style={styles.resultText}>
                {lastResult.won ? `+${lastResult.payout - stake} MOEDAS!` : "PERDEU"}
              </Text>
            </View>
          )}

          <Text style={styles.hint}>
            3 iguais = 5x · 2 iguais = 1.5x · JACKPOT 7-7-7 = 20x
          </Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.stakeRow}>
            {STAKES.map((s) => (
              <TouchableOpacity
                key={s}
                disabled={spinning}
                style={[
                  styles.stakeChip,
                  stake === s && styles.stakeChipActive,
                  spinning && { opacity: 0.4 },
                ]}
                onPress={() => setStake(s)}
                testID={`slots-stake-${s}`}
              >
                <Text style={[styles.stakeText, stake === s && styles.stakeTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.playBtn, spinning && { opacity: 0.6 }]}
            onPress={spin}
            disabled={spinning}
            testID="slots-spin"
          >
            {spinning ? <ActivityIndicator color="#000" /> : (
              <>
                <Ionicons name="refresh" size={20} color="#000" />
                <Text style={styles.playBtnText}>GIRAR ({stake})</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <AdBanner position="bottom" testID="slots-ad-bottom" />
      </SafeAreaView>

      <AdInterstitial
        visible={ad.open}
        onClose={() => setAd({ open: false, payout: 0 })}
        payout={ad.payout}
      />
      <AwarenessModal visible={aware} onClose={() => setAware(false)} variant="loss" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
  },
  backBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderRadius: 8, backgroundColor: colors.surface,
  },
  headerTitle: { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  balancePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6,
  },
  balanceText: { color: "#000", fontWeight: "900", fontSize: 14 },
  machine: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  reelsContainer: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accentYellow,
  },
  reel: {
    width: 80, height: 100,
    backgroundColor: "#0A0F0C",
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  symbol: { fontSize: 48 },
  resultBanner: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 6, marginTop: 20,
  },
  resultText: { color: "#000", fontWeight: "900", fontSize: 18, letterSpacing: 1 },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 24, textAlign: "center" },
  controls: { padding: 16 },
  stakeRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  stakeChip: {
    flex: 1, height: 44, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  stakeChipActive: { borderColor: colors.primary, backgroundColor: "rgba(34,197,94,0.2)" },
  stakeText: { color: colors.textSecondary, fontSize: 15, fontWeight: "800" },
  stakeTextActive: { color: colors.primary },
  playBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.accentYellow, paddingVertical: 16, borderRadius: 6,
  },
  playBtnText: { color: "#000", fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
});
