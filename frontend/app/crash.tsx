import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/src/theme";
import { AdBanner } from "@/src/components/ad-banner";
import { AdInterstitial } from "@/src/components/ad-interstitial";
import { AwarenessModal } from "@/src/components/awareness-modal";
import { useAuth } from "@/src/contexts/auth-context";
import { api } from "@/src/api";
import { bumpPlayCounterAndShouldShowAd } from "@/src/utils/play-counter";

const STAKES = [10, 25, 50, 100];

type Phase = "idle" | "flying" | "crashed" | "cashed";

export default function CrashScreen() {
  const router = useRouter();
  const { token, user, setBalance } = useAuth();
  const [stake, setStake] = useState(10);
  const [phase, setPhase] = useState<Phase>("idle");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [ad, setAd] = useState<{ open: boolean; payout: number }>({ open: false, payout: 0 });
  const [aware, setAware] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [lossStreak, setLossStreak] = useState(0);
  const raf = useRef<number | null>(null);

  const startRound = async () => {
    if (!token) return;
    if (stake > (user?.virtual_coins ?? 0)) {
      setAware(true);
      return;
    }
    setPlacing(true);
    // Reserve stake up-front - we'll place the actual bet when it crashes or cashes
    setPhase("flying");
    setMultiplier(1.0);
    // Bias toward lower multipliers (house edge simulation)
    const r = Math.random();
    const cp = r < 0.5 ? 1 + Math.random() * 0.8 : 1.5 + Math.random() ** 2 * 8;
    setCrashPoint(Number(cp.toFixed(2)));
    setPlacing(false);
  };

  useEffect(() => {
    if (phase !== "flying") return;
    let start = Date.now();
    const tick = () => {
      const dt = (Date.now() - start) / 1000;
      // Exponential-ish growth
      const m = Math.pow(1.06, dt * 10);
      if (m >= crashPoint) {
        setMultiplier(crashPoint);
        setPhase("crashed");
        settle(0);
        return;
      }
      setMultiplier(Number(m.toFixed(2)));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [phase, crashPoint]);

  const cashOut = () => {
    if (phase !== "flying") return;
    setPhase("cashed");
    settle(multiplier);
  };

  const settle = async (finalMultiplier: number) => {
    if (!token) return;
    try {
      const res = await api.placeBet(token, {
        game: "crash",
        stake,
        multiplier: finalMultiplier,
        label: `Crash · ${finalMultiplier > 0 ? finalMultiplier.toFixed(2) + "x" : "CRASH"}`,
      });
      setBalance(res.new_balance);
      setHistory((h) => [Number(multiplier.toFixed(2)), ...h].slice(0, 8));
      const showAd = await bumpPlayCounterAndShouldShowAd();
      if (showAd) {
        setAd({ open: true, payout: res.won ? res.payout : 0 });
      }
      if (res.won) {
        setLossStreak(0);
      } else {
        const streak = lossStreak + 1;
        setLossStreak(streak);
        if (streak >= 3) {
          setAware(true);
          setLossStreak(0);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const reset = () => {
    setPhase("idle");
    setMultiplier(1.0);
    setCrashPoint(0);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: "https://images.pexels.com/photos/586041/pexels-photo-586041.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" }}
        style={styles.bg}
      >
        <LinearGradient colors={["rgba(6,26,18,0.8)", "rgba(6,26,18,0.95)"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe} edges={["top"]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>CRASH</Text>
            <View style={styles.balancePill}>
              <Ionicons name="cash" size={14} color="#000" />
              <Text style={styles.balanceText}>{user?.virtual_coins}</Text>
            </View>
          </View>

          <AdBanner position="top" testID="crash-ad-top" />

          {/* History */}
          <View style={styles.history}>
            {history.map((h, i) => (
              <View key={i} style={[styles.historyChip, { borderColor: h < 1.5 ? colors.accentRed : colors.primary }]}>
                <Text style={[styles.historyText, { color: h < 1.5 ? colors.accentRed : colors.primary }]}>
                  {h.toFixed(2)}x
                </Text>
              </View>
            ))}
          </View>

          {/* Big multiplier display */}
          <View style={styles.display} testID="crash-display">
            {phase === "idle" && (
              <>
                <Ionicons name="rocket" size={64} color={colors.primary} />
                <Text style={styles.readyText}>PRONTO PARA VOAR</Text>
                <Text style={styles.readyHint}>Escolha o valor e aperte APOSTAR</Text>
              </>
            )}
            {phase === "flying" && (
              <>
                <Text style={styles.multiplier} testID="multiplier-value">
                  {multiplier.toFixed(2)}x
                </Text>
                <Text style={styles.flyingText}>SUBINDO...</Text>
              </>
            )}
            {phase === "crashed" && (
              <>
                <Text style={[styles.multiplier, { color: colors.accentRed }]}>
                  {crashPoint.toFixed(2)}x
                </Text>
                <Text style={[styles.flyingText, { color: colors.accentRed }]}>CRASH!</Text>
              </>
            )}
            {phase === "cashed" && (
              <>
                <Text style={[styles.multiplier, { color: colors.primary }]}>
                  {multiplier.toFixed(2)}x
                </Text>
                <Text style={styles.flyingText}>SACADO! +{Math.floor(stake * multiplier - stake)}</Text>
              </>
            )}
          </View>

          {/* Stake selector */}
          <View style={styles.controls}>
            <View style={styles.stakeRow}>
              {STAKES.map((s) => (
                <TouchableOpacity
                  key={s}
                  disabled={phase === "flying"}
                  style={[
                    styles.stakeChip,
                    stake === s && styles.stakeChipActive,
                    phase === "flying" && { opacity: 0.4 },
                  ]}
                  onPress={() => setStake(s)}
                  testID={`crash-stake-${s}`}
                >
                  <Text style={[styles.stakeText, stake === s && styles.stakeTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {phase === "idle" && (
              <TouchableOpacity style={styles.playBtn} onPress={startRound} disabled={placing} testID="crash-play">
                {placing ? <ActivityIndicator color="#000" /> : (
                  <>
                    <Ionicons name="rocket" size={18} color="#000" />
                    <Text style={styles.playBtnText}>APOSTAR {stake}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {phase === "flying" && (
              <TouchableOpacity style={styles.cashBtn} onPress={cashOut} testID="crash-cashout">
                <Ionicons name="hand-left" size={18} color="#000" />
                <Text style={styles.playBtnText}>SACAR {(stake * multiplier).toFixed(0)}</Text>
              </TouchableOpacity>
            )}
            {(phase === "crashed" || phase === "cashed") && (
              <TouchableOpacity style={styles.playBtn} onPress={reset} testID="crash-play-again">
                <Ionicons name="refresh" size={18} color="#000" />
                <Text style={styles.playBtnText}>NOVA RODADA</Text>
              </TouchableOpacity>
            )}
          </View>

          <AdBanner position="bottom" testID="crash-ad-bottom" />
        </SafeAreaView>
      </ImageBackground>

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
  bg: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "rgba(0,0,0,0.4)" },
  headerTitle: { color: "#FFF", fontSize: 16, fontWeight: "900", letterSpacing: 1 },
  balancePill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6,
  },
  balanceText: { color: "#000", fontWeight: "900", fontSize: 14 },
  history: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, marginTop: 10 },
  historyChip: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  historyText: { fontSize: 11, fontWeight: "800" },
  display: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  multiplier: { color: colors.primary, fontSize: 84, fontWeight: "900", letterSpacing: -2 },
  flyingText: { color: colors.primary, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  readyText: { color: "#FFF", fontSize: 20, fontWeight: "900", letterSpacing: 1, marginTop: 12 },
  readyHint: { color: colors.textSecondary, fontSize: 13 },
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
    backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 6,
  },
  cashBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.accentYellow, paddingVertical: 16, borderRadius: 6,
  },
  playBtnText: { color: "#000", fontWeight: "900", fontSize: 15, letterSpacing: 0.5 },
});
